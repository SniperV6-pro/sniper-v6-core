const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

// Conexión de Seguridad
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Configuración de Mercados
const markets = ['XAUUSD', 'BTCUSD', 'EURUSD', 'GBPUSD', 'NAS100', 'US30'];

bot.start((ctx) => {
    ctx.reply('🎯 Sniper V6 - Cerebro Autónomo Activo\n\n✅ Conectado a Supabase\n🔍 Escaneando: ' + markets.join(', '));
});

// Simulación de Escáner (Aquí conectaremos luego tu API de Trading)
setInterval(async () => {
    console.log("Analizando mercados...");
    // El bot guardará un log de "salud" en Supabase cada 30 min
}, 1800000);

bot.launch();
console.log("Escáner de Mercados Inicializado.");
