require('dotenv').config();

const ASSETS = [
  'PAXGUSD',  // Oro digital, estable
  'BTCUSD',   // Alta volatilidad, líder
  'ETHUSD',   // Seguido de BTC, buen volumen
  'SOLUSD',   // Cripto emergente, rupturas rápidas
  'XRPUSD',   // Volátil, señales frecuentes
  'LTCUSD',   // Estable con oportunidades
  'ADAUSD',   // Cardano, alta liquidez y volatilidad
  'DOTUSD',   // Polkadot, buen para scalping
  'LINKUSD',  // Chainlink, rupturas predecibles
  'UNIUSD'    // Uniswap, volátil con profit potencial
];

const KRAKEN_PAIRS = {
  BTCUSD: 'XXBTZUSD',
  ETHUSD: 'XETHZUSD',
  PAXGUSD: 'PAXGUSD',
  SOLUSD: 'SOLUSD',
  XRPUSD: 'XXRPZUSD',
  LTCUSD: 'XLTCZUSD',
  ADAUSD: 'ADAUSD',
  DOTUSD: 'DOTUSD',
  LINKUSD: 'LINKUSD',
  UNIUSD: 'UNIUSD'
};

const MAX_SPREAD = 100;
const MAX_OPEN_TRADES = 3;
const DAILY_LOSS_LIMIT = 100;
const RSI_PERIOD = 14;
const EMA_PERIOD = 20;

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
