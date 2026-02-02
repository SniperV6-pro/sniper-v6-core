const axios = require('axios');
const { analyze } = require('./engine');
const { ASSETS, KRAKEN_PAIRS } = require('./config');

async function scanMarkets(supabase, bot, CHAT_ID, currentLot) {
  for (const asset of ASSETS) {
    try {
      const krakenPair = KRAKEN_PAIRS[asset];
      const response = await axios.get(`https://api.kraken.com/0/public/Ticker?pair=${krakenPair}`);
      const data = response.data.result[krakenPair];

      if (!data) throw new Error('No data from Kraken');

      const ask = parseFloat(data.a[0]);
      const bid = parseFloat(data.b[0]);
      const currentPrice = (ask + bid) / 2;
      const spread = ask - bid;

      // Guardar precio en learning_db
      await supabase.from('learning_db').insert({ asset, price: currentPrice });

      // Analizar señal
      const signal = await analyze(supabase, asset, currentPrice, spread);
      signal.risk.lot = currentLot;

      // Enviar mensajes basados en acción
      if (signal.action === 'PRE-ALERTA' && signal.direction) {
        const message = `⚠️ PRE-ALERTA: ${asset} preparándose para ${signal.direction}`;
        await bot.telegram.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
      } else if (signal.action === 'ENTRADA' && signal.direction) {
        // Registrar en trades_history con nombres en español
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
