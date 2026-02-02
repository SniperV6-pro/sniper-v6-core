const axios = require('axios');
const { analyze } = require('./engine');
const { ASSETS, KRAKEN_PAIRS, MAX_OPEN_TRADES } = require('./config');

// Cache simple para precios (evita lecturas repetidas)
const priceCache = new Map();

async function fetchPriceWithRetry(krakenPair, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(`https://api.kraken.com/0/public/Ticker?pair=${krakenPair}`);
      return response.data.result[krakenPair];
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(res => setTimeout(res, 1000));  // Delay 1s
    }
  }
}

async function scanMarkets(supabase, bot, CHAT_ID, currentLot) {
  for (const asset of ASSETS) {
    try {
      const krakenPair = KRAKEN_PAIRS[asset];
      if (!krakenPair) continue;

      const data = await fetchPriceWithRetry(krakenPair);
      if (!data || !data.a || !data.b) throw new Error('No data from Kraken');

      const ask = parseFloat(data.a[0]);
      const bid = parseFloat(data.b[0]);
      if (isNaN(ask) || isNaN(bid)) throw new Error('Precios inválidos');

      const currentPrice = (ask + bid) / 2;
      const spread = ask - bid;

      // Cache precio
      priceCache.set(asset, currentPrice);

      // Guardar en learning_db
      await supabase.from('learning_db').insert({ asset, price: currentPrice });

      // Verificar máximo trades abiertos
      const { data: openTrades } = await supabase
        .from('trades_history')
        .select('id')
        .eq('estado', 'OPEN')
        .eq('activo', asset);
      if (openTrades.length >= MAX_OPEN_TRADES) continue;  // Saltar si límite alcanzado

      const signal = await analyze(supabase, asset, currentPrice, spread);
      signal.risk.lot = currentLot;

      if (signal.action === 'PRE-ALERTA' && signal.direction) {
        const message = `⚠️ PRE-ALERTA: ${asset} preparándose para ${signal.direction}`;
        await bot.telegram.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
      } else if (signal.action === 'ENTRADA' && signal.direction) {
        await supabase.from('trades_history').insert({
          activo: asset,
          precio_entrada: signal.price,
          operacion: signal.direction,
          tp: signal.risk.tp,
          sl: signal.risk.sl
        });
        const message = `🚀 ENTRADA CONFIRMADA: ${signal.direction}\nACTIVO: ${asset}\nPRECIO ENTRADA: ${signal.price.toFixed(2)}\nSL: ${signal.risk.sl.toFixed(2)}\nTP: ${signal.risk.tp.toFixed(2)}`;
        await bot.telegram.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
      }

      console.log(`Escaneado ${asset}: ${signal.action} ${signal.direction || ''}`);
    } catch (err) {
      console.error(`Error escaneando ${asset}: ${err.message}`);
    }
  }
}

module.exports = { scanMarkets };
