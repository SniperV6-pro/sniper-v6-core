require('dotenv').config();
const winston = require('winston');

if (!process.env.SUPABASE_KEY || !process.env.TELEGRAM_TOKEN) {
  throw new Error('ERROR: Faltan variables de entorno en Render');
}

const express = require('express');
const axios = require('axios');
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const { scanMarkets } = require('./scanner');
const { trainMLModel } = require('./engine');
const {
  SUPABASE_URL,
  SUPABASE_KEY,
  TELEGRAM_TOKEN,
  CHAT_ID,
  PORT,
  KRAKEN_PAIRS
} = require('./config');

const app = express();
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const bot = new Telegraf(TELEGRAM_TOKEN);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

let radarActive = true;
let currentLot = 1;
let dailyPnL = 0;
let lastReportDate = new Date().toDateString();

(async () => {
  const { data: historical } = await supabase.from('trades_history').select('*').limit(100);
  if (historical) await trainMLModel(historical);
})();

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

async function checkAndCloseTrades() {
  try {
    const { data: openTrades, error } = await supabase
      .from('trades_history')
      .select('*')
      .eq('estado', 'OPEN');

    if (error) throw error;

    for (const trade of openTrades) {
      const krakenPair = KRAKEN_PAIRS[trade.activo];
      const data = await fetchPriceWithRetry(krakenPair);
      const currentPrice = (parseFloat(data.a[0]) + parseFloat(data.b[0])) / 2;

      let profitLoss = 0;
      let status = 'OPEN';
      if (trade.operacion === 'BUY' && currentPrice >= trade.tp) {
        status = 'WIN';
        profitLoss = (trade.tp - trade.precio_entrada) * currentLot;
      } else if (trade.operacion === 'BUY' && currentPrice <= trade.sl) {
        status = 'LOSS';
        profitLoss = (trade.sl - trade.precio_entrada) * currentLot;
      } else if (trade.operacion === 'SELL' && currentPrice <= trade.tp) {
        status = 'WIN';
        profitLoss = (trade.precio_entrada - trade.tp) * currentLot;
      } else if (trade.operacion === 'SELL' && currentPrice >= trade.sl) {
        status = 'LOSS';
        profitLoss = (trade.precio_entrada - trade.sl) * currentLot;
      }

      // Trailing stops
      if (trade.operacion === 'BUY' && currentPrice > trade.precio_entrada * 1.01) {
        const newSl = currentPrice * 0.995;
        await supabase.from('trades_history').update({ sl: newSl }).eq('id', trade.id);
      }

      if (status !== 'OPEN') {
        await supabase
          .from('trades_history')
          .update({ estado: status, profit_loss: profitLoss, closed_at: new Date() })
          .eq('id', trade.id);

        dailyPnL += profitLoss;
        const result = status === 'WIN' ? '✅ OPERACIÓN GANADA (WIN)' : '❌ OPERACIÓN PERDIDA (LOSS)';
        const message = `${result} en ${trade.activo}\nProfit/Loss: ${profitLoss.toFixed(2)}`;
        await bot.telegram.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });

        logger.info(`Trade cerrado: ${trade.activo}, ${status}, PnL: ${profitLoss}`);
      }
    }
  } catch (err) {
    logger.error('Error verificando trades:', err.message);
  }
}

async function sendDailyReport() {
  const today = new Date().toDateString();
  if (today !== lastReportDate) {
    const { data: trades } = await supabase
      .from('trades_history')
      .select('estado')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000));

    const wins = trades.filter(t => t.estado === 'WIN').length;
    const losses = trades.filter(t => t.estado === 'LOSS').length;
    const total = wins + losses;
    const winrate = total > 0 ? ((wins / total) * 100).toFixed(2) : 0;

    const message = `📊 REPORTE DIARIO:\nWins: ${wins}\nLosses: ${losses}\nWinrate: ${winrate}%\nPnL Diario: ${dailyPnL.toFixed(2)}`;
    await bot.telegram.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
    lastReportDate = today;
    dailyPnL = 0;
  }
}

async function performScan() {
  if (!radarActive) return;
  await scanMarkets(supabase, bot, CHAT_ID, currentLot);
}

bot.start((ctx) => ctx.reply('Bienvenido a Sniper V6 Scalping. Usa /help para comandos.'));
bot.help((ctx) => ctx.reply('*Comandos:*\n/start - Iniciar\n/help - Ayuda\n/status - Estado del radar y lote\n/lote [valor] - Cambiar lote\n/stop - Pausar radar\n/go - Reanudar radar\n/winrate - Estadísticas de winrate últimas 24h\n/balance - Balance acumulado y PnL diario\n/aprender - Calibración masiva\n/limpiar - Borrar datos viejos\n/reset - Resetear PnL diario y reactivar radar', { parse_mode: 'Markdown' }));
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
bot.command('winrate', async (ctx) => {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { data: trades, error } = await supabase
      .from('trades_history')
      .select('estado')
      .gte('created_at', yesterday);

    if (error) throw error;

    const wins = trades.filter(t => t.estado === 'WIN').length;
    const losses = trades.filter(t => t.estado === 'LOSS').length;
    const total = wins + losses;
    const winrate = total > 0 ? ((wins / total) * 100).toFixed(2) : 0;

    ctx.reply(`Winrate últimas 24h: ${wins} ganadas, ${losses} perdidas (${winrate}%)`, { parse_mode: 'Markdown' });
  } catch (err) {
    ctx.reply('Error calculando winrate');
  }
});
bot.command('balance', async (ctx) => {
  try {
    const { data: trades } = await supabase.from('trades_history').select('profit_loss');
    const totalPnL = trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
    ctx.reply(`Balance Acumulado: ${totalPnL.toFixed(2)}\nPnL Diario: ${dailyPnL.toFixed(2)}`, { parse_mode: 'Markdown' });
  } catch (err) {
    ctx.reply('Error obteniendo balance');
  }
});
bot.command('reset', (ctx) => {
  dailyPnL = 0;
  radarActive = true;
  ctx.reply('PnL diario reseteado y radar reactivado.');
});
bot.command('aprender', async (ctx) => {
  await performScan();
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

app.get('/', (req, res) => res.send('Sniper V6 Scalping corriendo'));
app.get('/dashboard', async (req, res) => {
  const { data: trades } = await supabase.from('trades_history').select('*');
  res.json(trades);
});

app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));

setInterval(performScan, 900000);
setInterval(checkAndCloseTrades, 60000);
setInterval(sendDailyReport, 24 * 60 * 60 * 1000);

setTimeout(() => {
  bot.launch();
}, 10000);

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
