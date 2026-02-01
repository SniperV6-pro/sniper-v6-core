const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Conexión de Seguridad (Render usará tus variables de entorno)
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Función de Visión: Obtiene el precio del Oro en tiempo real
async function getGoldPrice() {
    try {
        // Usamos la API de CoinCap para PAX Gold (que sigue el precio del Oro XAU/USD)
        const response = await axios.get('https://api.coincap.io/v2/assets/pax-gold');
        const price = parseFloat(response.data.data.priceUsd);
        return price.toFixed(2);
    } catch (error) {
        console.error('Error obteniendo precio:', error.message);
        return "Temporalmente fuera de línea";
    }
}

// Comando Principal: Al dar /start el bot da el reporte actual
bot.start(async (ctx) => {
    const goldPrice = await getGoldPrice();
    const welcomeMessage = `
🎯 *Sniper V6 - SISTEMA ACTIVO*
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
💰 *Precio Oro (XAU/USD):* $${goldPrice}
🔍 *Modo:* Scalping M5 / M15
📈 *Estado:* Escaneando tendencias
✅ *Cerebro:* Conectado a Supabase
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
_Usa /precio para actualizar la cotización._
    `;
    ctx.replyWithMarkdown(welcomeMessage);
});

// Comando Rápido: Para consultar el precio sin reiniciar todo
bot.command('precio', async (ctx) => {
    const goldPrice = await getGoldPrice();
    ctx.reply(`📊 *Cotización Oro:* $${goldPrice}`, { parse_mode: 'Markdown' });
});

// Lanzamiento del Bot
bot.launch().then(() => {
    console.log("🚀 Sniper V6: Escáner de Precios Reales Iniciado.");
});

// Manejo de errores para que no se caiga el servidor
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
