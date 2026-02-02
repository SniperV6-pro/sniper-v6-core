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
  // Nota: EURUSD, GBPUSD, NAS100, US30 no tienen pares directos en Kraken; se mapearán igual para intentar consulta, pero se capturará error.
  EURUSD: 'EURUSD',
  GBPUSD: 'GBPUSD',
  NAS100: 'NAS100',
  US30: 'US30'
};

const MAX_SPREAD = 100;

module.exports = {
  ASSETS,
  KRAKEN_PAIRS,
  MAX_SPREAD,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  PORT: process.env.PORT || 10000
};
