const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

// Conexión con los secretos que pondremos en Koyeb
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// El cerebro saludando
bot.start((ctx) => {
    ctx.reply('🎯 Sniper V6 - Cerebro Autónomo Activo\n\n✅ Modo: Scalping M5/M15\n💰 Gestión de $20 Protegida');
});

// Mantener el bot despierto
bot.launch();
console.log("Cerebro V6 listo para recibir órdenes.");
