const axios = require('axios');
const { analyze } = require('./engine');
const { ASSETS, KRAKEN_PAIRS, ALPHA_VANTAGE_API_KEY } = require('./config');
const sentiment = require('sentiment');

const priceCache = new Map();
const analyzer = new sentiment();

async function fetchOHLC(krakenPair, interval = 1, count = 50) {
  // Obtiene velas OHLC de 1 minuto (últimas 50)
  const response = await axios.get(`https://api.kraken.com/0/public/OHLC?pair=${krakenPair}&interval=${interval}&since=${Math.floor(Date.now() / 1000) - (count * 60)}`);
  return response.data.result[krakenPair].slice(-count); // Últimas 50 velas
}

async function scanMarkets(supabase, bot, CHAT_ID, currentLot) {
  for (const asset of ASSETS) {
    try {
      const krakenPair = KRAKEN_PAIRS[asset];
      if (!krakenPair) continue;

      // Obtiene velas de 1 minuto
      const ohlcData = await fetchOHLC(krakenPair, 1, 50);
      if (!ohlcData || ohlcData.length < 20) continue;

      // Usa el precio de cierre de la última vela de 1 minuto
      const currentPrice = parseFloat(ohlcData[ohlcData.length - 1][4]); // Close price

      priceCache.set(asset, currentPrice);

      // Guarda precio en learning_db para análisis histórico
      await supabase.from('learning_db').insert({ asset, price: currentPrice });

      const { data: openTrades } = await supabase
        .from('trades_history')
        .select('id')
        .eq('estado', 'OPEN')
        .eq('activo', asset);
      if (openTrades.length >= 3) continue;

      // Análisis de sentimiento (opcional)
      const newsResponse = await axios.get(`https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${asset}&apikey=${ALPHA_VANTAGE_API_KEY}`);
      const score = newsResponse.data.feed ? analyzer.analyze(newsResponse.data.feed[0].title).score : 0;
      if (score < -0.5) continue;

      // Pasa velas de 1 minuto a analyze
      const signal = await analyze(supabase, asset, currentPrice, 0, ohlcData); // Agrega ohlcData como parámetro
      signal.risk.lot = currentLot;

      if (signal.action === 'PRE-ALERTA' && signal.direction) {
        const message = `⚠️ PRE-ALERTA (1min analysis, entrada en 15min): ${asset} preparándose para ${signal.direction}`;
        await bot.telegram.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
      } else if (signal.action === 'ENTRADA' && signal.direction) {
        await supabase.from('trades_history').insert({
          activo: asset,
          precio_entrada: signal.price,
          operacion: signal.direction,
          tp: signal.risk.tp,
          sl: signal.risk.sl
        });
        const message = `🚀 ENTRADA CONFIRMADA (1min analysis, opera en 15min): ${signal.direction}\nACTIVO: ${asset}\nPRECIO ENTRADA: ${signal.price.toFixed(2)}\nSL: ${signal.risk.sl.toFixed(2)}\nTP: ${signal.risk.tp.toFixed(2)}`;
        await bot.telegram.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
      }

      console.log(`Escaneado ${asset}: ${signal.action} ${signal.direction || ''}`);
    } catch (err) {
      console.error(`Error escaneando ${asset}: ${err.message}`);
    }
  }
}

module.exports = { scanMarkets };
