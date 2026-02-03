const axios = require('axios');
const { analyze } = require('./engine');
const { ASSETS, KRAKEN_PAIRS, ALPHA_VANTAGE_API_KEY } = require('./config');
const sentiment = require('sentiment');

const priceCache = new Map();
const analyzer = new sentiment();

async function fetchPriceWithRetry(krakenPair, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(`https://api.kraken.com/0/public/Ticker?pair=${krakenPair}`);
      return response.data.result[krakenPair];
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(res => setTimeout(res, 1000));
    }
  }
}

async function scanMarkets(supabase, bot, CHAT_ID, currentLot) {
  for (const asset of ASSETS) {
    try {
      const krakenPair = KRAKEN_PAIRS[asset];
      if (!krakenPair) continue;

      const data = await fetchPriceWithRetry(krakenPair);
      if (!data) continue;

      const ask = parseFloat(data.a[0]);
      const bid = parseFloat(data.b[0]);
      if (isNaN(ask) || isNaN(bid)) continue;

      const currentPrice = (ask + bid) / 2;
      const spread = ask - bid;

      priceCache.set(asset, currentPrice);

      await supabase.from('learning_db').insert({ asset, price: currentPrice });

      const { data: openTrades } = await supabase
        .from('trades_history')
        .select('id')
        .eq('estado', 'OPEN')
        .eq('activo', asset);
      if (openTrades.length >= 3) continue;

      // Análisis de sentimiento
      const newsResponse = await axios.get(`https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${asset}&apikey=${ALPHA_VANTAGE_API_KEY}`);
      const score = newsResponse.data.feed ? analyzer.analyze(newsResponse.data.feed[0].title).score : 0;
      if (score < -0.5) continue; // Evita si negativo

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
