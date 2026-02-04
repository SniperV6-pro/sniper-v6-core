const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const PORT = process.env.PORT || 10000;
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// Solo BTCUSD por ahora (único compatible con Exness confirmado)
const ASSETS = [
  'BTCUSD'    // Bitcoin - Compatible con Exness
];

// Pares Kraken para los activos
const KRAKEN_PAIRS = {
  'BTCUSD': 'XXBTZUSD'
};

module.exports = {
  SUPABASE_URL,
  SUPABASE_KEY,
  TELEGRAM_TOKEN,
  CHAT_ID,
  PORT,
  ASSETS,
  KRAKEN_PAIRS,
  ALPHA_VANTAGE_API_KEY
};
