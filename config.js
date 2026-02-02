require('dotenv').config();

const ASSETS = [
  'PAXGUSD',
  'BTCUSD',
  'ETHUSD',
  'SOLUSD',
  'XRPUSD',
  'EURUSD',
  'GBPUSD',
  'NAS100',
  'US30',
  'LTCUSD'
];

const KRAKEN_PAIRS = {
  BTCUSD: 'XXBTZUSD',
  ETHUSD: 'XETHZUSD',
  PAXGUSD: 'PAXGUSD',
  SOLUSD: 'SOLUSD',
  XRPUSD: 'XXRPZUSD',
  LTCUSD: 'XLTCZUSD',
  EURUSD: 'EURUSD',
  GBPUSD: 'GBPUSD',
  NAS100: 'NAS100',
  US30: 'US30'
};

const MAX_SPREAD = 100;
const MAX_OPEN_TRADES = 3;  // Máximo 3 trades abiertos por activo
const DAILY_LOSS_LIMIT = 100;  // Límite de pérdida diaria en USD (ajusta según lote)
const RSI_PERIOD = 14;  // Período para RSI
const EMA_PERIOD = 20;  // Período para EMA

module.exports = {
  ASSETS,
  KRAKEN_PAIRS,
  MAX_SPREAD,
  MAX_OPEN_TRADES,
  DAILY_LOSS_LIMIT,
  RSI_PERIOD,
  EMA_PERIOD,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_KEY: process.env.SUPABASE_KEY,
  TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN,
  CHAT_ID: process.env.CHAT_ID,
  PORT: process.env.PORT || 10000
};
