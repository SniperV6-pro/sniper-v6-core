require('dotenv').config();

if (!process.env.SUPABASE_KEY || !process.env.TELEGRAM_TOKEN) {
  throw new Error('ERROR: Faltan variables de entorno en Render');
}

const express = require('express');
const axios = require('axios'); // Librería axios incluida
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const { scanMarkets } = require('./scanner');
const {
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

// Función para verificar y cerrar trades (PnL cada minuto)
async function checkAndCloseTrades() {
  try {
    const { data: openTrades, error } = await supabase
      .from('trades_history')
      .select('*')
      .eq('estado', 'OPEN');

    if (error) throw error;

    for (const trade of openTrades) {
      // Obtener precio actual del activo
      const krakenPair = KRAKEN_PAIRS[trade.activo]; // Asumiendo KRAKEN_PAIRS disponible
      const response = await axios.get(`https://api.kraken.com/0/public/Ticker?pair=${krakenPair}`);
      const data = response.data.result[krakenPair];
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

      if (status !== 'OPEN') {
        await supabase
          .from('trades_history')
          .update({ estado: status, profit_loss: profitLoss, closed_at: new Date() })
          .eq('id', trade.id);

        const result = status === 'WIN' ? '✅ OPERACIÓN GANADA (WIN)' : '❌ OPERACIÓN PERDIDA (LOSS)';
        const message = `${result} en ${trade.activo}\nProfit/Loss: ${profitLoss.toFixed(2)}`;
        await bot.telegram.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
      }
    }
  } catch (err) {
    console.error('Error verificando trades:', err.message);
  }
}

// Función de escaneo cada 15 minutos
async function performScan() {
  if (!radarActive) return;
  await scanMarkets(supabase, bot, CHAT_ID, currentLot);
}

// Comandos de Telegram
bot.start((ctx) => ctx.reply('Bienvenido a Sniper V6 Scalping. Usa /help para comandos.'));
bot.help((ctx) => ctx.reply('*Comandos:*\n/start - Iniciar\n/help - Ayuda\n/status - Estado del radar y lote\n/lote [valor] - Cambiar lote\n/stop - Pausar radar\n/go - Reanudar radar\n/winrate - Estadísticas de winrate últimas 24h\n/aprender - Calibración masiva\n/limpiar - Borrar datos viejos', { parse_mode: 'Markdown' }));
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

// Servidor Express
app.get('/', (req, res) => res.send('Sniper V6 Scalping corriendo'));
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));

// Bucle de escaneo cada 15 minutos (900000 ms)
setInterval(performScan, 900000);

// Verificación de PnL cada minuto (60000 ms)
setInterval(checkAndCloseTrades, 60000);

// Lanzar bot con retraso de 10 segundos para evitar 409
setTimeout(() => {
  bot.launch();
}, 10000);

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
