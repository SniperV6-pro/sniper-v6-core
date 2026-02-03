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
          .update({ estado: status, profit_loss
