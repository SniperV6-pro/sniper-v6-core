const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// MOTOR DE DATOS
async function fetchPrice() {
    try {
        const res = await axios.get('https://api.kraken.com/0/public/Ticker?pair=PAXGUSD');
        return parseFloat(res.data.result.PAXGUSD.c[0]);
    } catch (e) { return null; }
}

// SECCIÓN DE COMANDOS V6
bot.start((ctx) => ctx.reply("🎯 Sniper V6: Conexión Reestablecida."));

bot.command('señal', async (ctx) => {
    const p = await fetchPrice();
    ctx.replyWithMarkdown(`🔍 *SNIPER V6: SEÑAL*\n💰 Oro: $${p}\n🛡️ Lote: 0.01\n🛑 SL: $1.50`);
});

bot.command('resumen', async (ctx) => {
    const { data } = await supabase.from('learning_db').select('*').order('created_at', {ascending: false}).limit(5);
    let m = "📝 *APRENDIZAJE:* \n";
    data?.forEach(d => m += `• $${d.price}\n`);
    ctx.replyWithMarkdown(m);
});

// REGISTRO AUTOMÁTICO
setInterval(async () => {
    const p = await fetchPrice();
    if (p) await supabase.from('learning_db').insert([{ asset: 'XAUUSD', price: p }]);
}, 300000);

// --- LANZAMIENTO FORZADO (ESTO ELIMINA EL ERROR 409) ---
bot.launch({
    dropPendingUpdates: true 
}).then(() => {
    console.log("🚀 Sniper V6: Sesión limpia y activa.");
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
