require('dotenv').config();
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const config = require('./config');
const scanner = require('./scanner');
const engine = require('./engine');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- VIGILANTE AUTOMÁTICO ---
async function coreCycle() {
    try {
        const marketData = await scanner.getValidatedPrice();
        if (marketData) {
            await supabase.from('learning_db').insert([{ 
                asset: config.STRATEGY.ASSET, 
                price: marketData.price,
                metadata: { spread: marketData.spread }
            }]);

            const analysis = await engine.analyzeWithHistoricalDepth(supabase, marketData.price);
            if (parseInt(analysis.probability) >= 85) {
                bot.telegram.sendMessage(process.env.CHAT_ID, 
                    `🔥 *ALERTA SNIPER PROACTIVA*\n\n` +
                    `Acción: *${analysis.action}*\n` +
                    `Precio: $${analysis.price}\n` +
                    `Zona: ${analysis.context.zone}\n\n` +
                    `🛡️ *GESTIÓN:* Lote ${analysis.risk.lot} | SL: $${analysis.risk.sl}`, 
                    { parse_mode: 'Markdown' }
                ).catch(e => console.log("Error enviando alerta:", e.message));
            }
        }
    } catch (err) { console.log("Error en ciclo:", err.message); }
}
setInterval(coreCycle, config.SYSTEM.POLLING_INTERVAL);

// --- COMANDOS ---
bot.start((ctx) => {
    ctx.replyWithMarkdown(`🎯 *SNIPER V6 ONLINE*\n🧠 Cerebro: Activo\n🛡️ Lote: ${config.ACCOUNT.LOT_SIZE}`);
});

bot.command('aprender', async (ctx) => {
    ctx.reply("🧠 Absorbiendo datos históricos...");
    try {
        const res = await axios.get(`https://api.kraken.com/0/public/OHLC?pair=${config.STRATEGY.ASSET}&interval=60`);
        const pairKey = Object.keys(res.data.result)[0];
        const points = res.data.result[pairKey].slice(-100).map(item => ({
            asset: config.STRATEGY.ASSET,
            price: parseFloat(item[4]), 
            metadata: { type: "Inyección Histórica" }
        }));
        await supabase.from('learning_db').insert(points);
        ctx.reply("✅ Conocimiento absorbido con éxito.");
    } catch (e) { ctx.reply("❌ Error: " + e.message); }
});

bot.command('señal', async (ctx) => {
    const marketData = await scanner.getValidatedPrice();
    if (!marketData) return ctx.reply("❌ Error de mercado.");
    const analysis = await engine.analyzeWithHistoricalDepth(supabase, marketData.price);
    ctx.replyWithMarkdown(`🔍 *ANÁLISIS*\n💰 Precio: $${analysis.price}\n📊 Acción: *${analysis.action}*\n🔥 Probabilidad: ${analysis.probability}\n📍 Zona: ${analysis.context.zone}`);
});

bot.command('status', (ctx) => {
    ctx.reply(`✅ Sistema OK\nBase: $${config.ACCOUNT.INITIAL_BALANCE}`);
});

// --- LANZAMIENTO SEGURO (SOLUCIONA EL ERROR 409) ---
bot.launch({ dropPendingUpdates: true }).then(() => {
    console.log("🚀 Sniper V6: Conexión única establecida.");
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
