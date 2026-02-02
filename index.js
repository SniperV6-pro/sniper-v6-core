require('dotenv').config();

if (!process.env.SUPABASE_KEY || !process.env.TELEGRAM_TOKEN) {
  throw new Error('ERROR: Faltan variables de entorno en Render');
}

const express = require('express');
const axios = require('axios');
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const { analyze } = require('./engine');
const {
  ASSETS,
  KRAKEN_PAIRS,
  MAX_SPREAD,
  SUPABASE_URL,
  SUPABASE_KEY,
  TELEGRAM_TOKEN,
  CHAT_ID,
  PORT
} = require('./config');

const app = express();
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const bot = new Telegraf(TELEGRAM_TOKEN);

// Estado global
let radarActive = true;
let currentLot = 1; // Lote dinámico

// Función para verificar y cerrar trades (PnL)
async function checkAndCloseTrades() {
  try {
    const { data: openTrades, error } = await supabase
      .from('trades_history')
      .select('*')
      .eq('estado', 'abierta');

    if (error) throw error;

    for (const trade of openTrades) {
      // Obtener precio actual del activo
      const krakenPair = KRAKEN_PAIRS[trade.activo];
      const response = await axios.get(`https://api.kraken.com/0/public/Ticker?pair=${krakenPair}`);
      const data = response.data.result[krakenPair];
      const currentPrice = (parseFloat(data.a[0]) + parseFloat(data.b[0])) / 2;

      let profitLoss = 0;
      let status = 'abierta';
      if (trade.tipo === 'buy' && currentPrice >= trade.tp) {
        status = 'cerrada_win';
        profitLoss = (trade.tp - trade.precio_entrada) * currentLot;
      } else if (trade.tipo === 'buy' && currentPrice <= trade.sl) {
        status = 'cerrada_loss';
        profitLoss = (trade.sl - trade.precio_entrada) * currentLot;
      } else if (trade.tipo === 'sell' && currentPrice <= trade.tp) {
        status = 'cerrada_win';
        profitLoss = (trade.precio_entrada - trade.tp) * currentLot;
      } else if (trade.tipo === 'sell' && currentPrice >= trade.sl) {
        status = 'cerrada_loss';
        profitLoss = (trade.precio_entrada - trade.sl) * currentLot;
      }

      if (status !== 'abierta') {
        await supabase
          .from('trades_history')
          .update({ estado: status, profit_loss: profitLoss, closed_at: new Date() })
          .eq('id', trade.id);

        const result = status === 'cerrada_win' ? '✅ GANADA' : '❌ PERDIDA';
        const message = `${result} en ${trade.activo}\nProfit/Loss: ${profitLoss.toFixed(2)}`;
        await bot.telegram.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
      }
    }
  } catch (err) {
    console.error('Error verificando trades:', err.message);
  }
}

// Función para consultar Kraken y procesar (cada 15 min)
async function processAssets() {
  if (!radarActive) return;

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

      // Guardar en Supabase
      await supabase.from('learning_db').insert({ asset, price: currentPrice });

      // Calcular señal
      const signal = await analyze(supabase, asset, currentPrice, spread);
      signal.risk.lot = currentLot;

      // Si hay señal, registrar en trades_history
      if (signal.action === 'ENTRADA' && signal.direction) {
        const tipo = signal.direction.includes('BUY') ? 'buy' : 'sell';
        await supabase.from('trades_history').insert({
          activo: asset,
          tipo,
          precio_entrada: signal.price,
          tp: signal.risk.tp,
          sl: signal.risk.sl
        });

        const message = `ACTIVO: ${asset}\nOPERACIÓN: ${signal.direction}\nPRECIO ENTRADA: ${signal.price.toFixed(2)}\nCONFIANZA: ${signal.probability.toFixed(2)}%\nS/L y T/P: SL ${signal.risk.sl.toFixed(2)}, TP ${signal.risk.tp.toFixed(2)}`;
        await bot.telegram.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
      }

      console.log(`Procesado ${asset}: ${signal.action} ${signal.direction || ''}`);
    } catch (err) {
      console.error(`Error procesando ${asset}: ${err.message}`);
    }
  }
}

// Comandos de Telegram (sin cambios)
bot.start((ctx) => ctx.reply('Bienvenido a Sniper V6. Usa /help para comandos.'));
bot.help((ctx) => ctx.reply('*Comandos:*\n/start - Iniciar\n/help - Ayuda\n/status - Estado del radar y lote\n/lote [valor] - Cambiar lote\n/stop - Pausar radar\n/go - Reanudar radar\n/aprender - Calibración masiva\n/limpiar - Borrar datos viejos', { parse_mode: 'Markdown' }));
bot.command('status', (ctx) => {
  const status = radarActive ? 'Activo' : 'Pausado';
  ctx.reply(`Radar: ${status}\nLote actual: ${currentLot}`, { parse_mode: 'Markdown' });
});
bot.command('lote', (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args.length > 1) {
    const newLot = parseFloat(args[1]);
    if (!isNaN(newLot) && newLot > 0) {
      currentLot = newLot;
      ctx.reply(`Lote cambiado a ${currentLot}`);
    } else {
      ctx.reply('Valor de lote inválido');
    }
  } else {
    ctx.reply('Uso: /lote [valor]');
  }
});
bot.command('stop', (ctx) => {
  radarActive = false;
  ctx.reply('Radar pausado');
});
bot.command('go', (ctx) => {
  radarActive = true;
  ctx.reply('Radar reanudado');
});
bot.command('aprender', async (ctx) => {
  await processAssets();
  ctx.reply('Calibración masiva completada');
});
bot.command('limpiar', async (ctx) => {
  const { error } = await supabase.from('learning_db').delete().lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  if (error) {
    ctx.reply('Error limpiando datos');
  } else {
    ctx.reply('Datos viejos borrados');
  }
});

// Servidor Express
app.get('/', (req, res) => res.send('Sniper V6 corriendo'));
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));

// Bucle de análisis cada 15 minutos (900000 ms)
setInterval(processAssets, 900000);

// Verificación de PnL cada minuto (60000 ms)
setInterval(checkAndCloseTrades, 60000);

// Lanzar bot con delay para evitar 409
setTimeout(() => {
  bot.launch();
}, 5000);

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
