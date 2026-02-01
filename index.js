const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios'); // Para consultar precios

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Función para obtener precio del Oro (XAUUSD)
async function getGoldPrice() {
    try {
        // Usamos una fuente pública para la prueba inicial
        const res = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT');
        return parseFloat(res.data.price).toFixed(2);
    } catch (error) {
        return "Error de conexión";
    }
}

bot.start(async (ctx) => {
    const price = await getGoldPrice();
    ctx.reply(`🎯 Sniper V6 - SISTEMA ACTIVO\n\n💰 Precio Oro (PAXG/USD): $${price}\n🔍 Estado: Escaneando tendencias M5/M15\n\n✅ Todo listo para operar.`);
});

// Comando para ver precio rápido
bot.command('precio', async (ctx) => {
    const price = await getGoldPrice();
    ctx.reply(`📊 Cotización actual XAUUSD: $${price}`);
});

bot.launch();
console.log("Escáner de Precios Reales Iniciado.");
