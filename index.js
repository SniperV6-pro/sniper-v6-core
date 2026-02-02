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
  DAILY_LOSS_LIMIT
} = require('./config');

const app = express();
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const bot = new Telegraf(TELEGRAM_TOKEN);

// Logger con Winston
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

// Estado global
let radarActive = true;
let currentLot = 1;
let dailyPnL = 0;
let lastReportDate = new Date().toDateString();

// Entrenar modelo ML al inicio (simulación con datos históricos)
(async () => {
  const { data: historical } = await supabase.from('trades_history').select('*').limit(100);
  if (historical) await trainMLModel(historical);
})();

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

    // Pausar si límite diario alcanzado
    if (dailyPnL < -DAILY_LOSS_LIMIT) {
      radarActive = false;
      logger.warn('Límite de pérdida diaria alcanzado, radar pausado');
    }
  } catch (err) {
    logger.error('Error verificando trades:', err.message);
  }
}

// Reporte diario
async function sendDailyReport() {
  const today = new Date().toDateString();
  if (today !== lastReportDate) {
    const { data: trades } = await supabase
      .from('trades_history')
      .select('estado')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000));

    const wins = trades.filter(t => t.estado === 'WIN').length;
    const losses = trades.filter(t => t.estado === 'LOSS').length;
    const winrate = total > 0 ? ((wins / (wins + losses)) * 100).toFixed(2) : 0;

    const message = `📊 REPORTE DIARIO:\nWins: ${wins}\nLosses: ${losses}\nWinrate: ${winrate}%\nPnL Diario: ${dailyPnL.toFixed(2)}`;
    await bot.telegram.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown
