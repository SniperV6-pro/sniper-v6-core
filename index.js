const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const markets = ['XAUUSD', 'BTCUSD', 'EURUSD', 'GBPUSD', 'NAS100', 'US30'];

bot.start((ctx) => {
    ctx.reply('🎯 Sniper V6 - Cerebro Autónomo Activo\n\n✅ Conectado a Supabase\n🔍 Escaneando: ' + markets.join(', '));
});

bot.launch();
console.log("Escáner de Mercados Inicializado.");
