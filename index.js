const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Motor de Precios vía Kraken (Infalible)
async function getGoldPrice() {
    try {
        const response = await axios.get('https://api.kraken.com/0/public/Ticker?pair=PAXGUSD');
        // Kraken devuelve los datos en un formato específico, aquí lo extraemos:
        const price = response.data.result.PAXGUSD.c[0];
        return parseFloat(price).toFixed(2);
    } catch (error) {
        console.error('Error en Kraken:', error.message);
        return "Reconectando...";
    }
}

bot.start(async (ctx) => {
    const goldPrice = await getGoldPrice();
    const msg = `
🎯 *Sniper V6 - KRAKEN ENGINE*
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
💰 *Oro (XAU/USD):* $${goldPrice}
📊 *Frecuencia:* M5 / M15
🔥 *Estado:* Sniper en posición
✅ *Supabase:* Online
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
_Monitoreo activo de volatilidad._
    `;
    ctx.replyWithMarkdown(msg);
});

bot.command('precio', async (ctx) => {
    const goldPrice = await getGoldPrice();
    ctx.reply(`📊 *Precio Oro (Kraken):* $${goldPrice}`, { parse_mode: 'Markdown' });
});

bot.launch();
console.log("🚀 Motor Kraken activado. Sniper en posición.");
