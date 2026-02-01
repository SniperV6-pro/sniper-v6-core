require('dotenv').config();
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const config = require('./config');
const scanner = require('./scanner');
const engine = require('./engine');
const { getFullMarketScan } = require('./multi_scanner');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- VIGILANTE AUTOMÁTICO ---
async function coreCycle() {
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
            );
        }
    }
}
setInterval(coreCycle, config.SYSTEM.POLLING_INTERVAL);

// --- COMANDOS DEL DASHBOARD ---

bot.start((ctx) => {
    ctx.replyWithMarkdown(
        `🎯 *SNIPER V6 ONLINE*\n\n` +
        `🧠 Cerebro: Superdotado Activo\n` +
        `🛡️ Lote: ${config.ACCOUNT.LOT_SIZE}\n\n` +
        `_Usa /aprender si aún no has inyectado los datos._`
    );
});

bot.command('aprender', async (ctx) => {
    ctx.reply("🧠 Iniciando absorción de datos históricos...");
    try {
        const res = await axios.get(`https://api.kraken.com/0/public/OHLC?pair=${config.STRATEGY.ASSET}&interval=60`);
        const historyData = res.data.result[Object.keys(res.data.result)[0]];
        const points = historyData.slice(-100).map(item => ({
            asset: config.STRATEGY.ASSET,
            price: parseFloat(item[4]), 
            metadata: { type: "Inyección Histórica" }
        }));
        await supabase.from('learning_db').insert(points);
        ctx.reply("✅ Conocimiento absorbido con éxito.");
    } catch (e) {
        ctx.reply("❌ Error: " + e.message);
    }
});

bot.command('señal', async (ctx) => {
    const marketData = await scanner.getValidatedPrice();
    if (!marketData) return ctx.reply("❌ Error de conexión.");
    const analysis = await engine.analyzeWithHistoricalDepth(supabase, marketData.price);
    ctx.replyWithMarkdown(
        `🔍 *ANÁLISIS DE PRECISIÓN*\n\n` +
        `💰 Precio Actual: $${analysis.price}\n` +
        `📊 Acción: *${analysis.action}*\n` +
        `🔥 Probabilidad: ${analysis.probability}\n` +
        `📍 Zona: ${analysis.context.zone}\n\n` +
        `🛡️ *GESTIÓN:* Lote ${analysis.risk.lot} | SL: $${analysis.risk.sl}`
    );
});

bot.command('mercados', async (ctx) => {
    try {
        const report = await getFullMarketScan();
        ctx.replyWithMarkdown(report);
    } catch (e) {
        ctx.reply("⚠️ Error en escaneo múltiple: Verifica que multi_scanner.js esté en GitHub.");
    }
});

bot.command('status', (ctx) => {
    ctx.reply(`✅ Sistema OK\nBase: $${config.ACCOUNT.INITIAL_BALANCE}\nLote: ${config.ACCOUNT.LOT_SIZE}`);
});

bot.launch({ dropPendingUpdates: true });
