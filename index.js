require('dotenv').config();
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const config = require('./config');
const scanner = require('./scanner');
const engine = require('./engine');

// Importación protegida para evitar que el bot se caiga si falta un archivo
let multiScanner;
try {
    multiScanner = require('./multi_scanner');
} catch (e) {
    console.log("Módulo multi_scanner no detectado.");
}

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- VIGILANTE AUTOMÁTICO (Patrullaje 24/7) ---
async function coreCycle() {
    try {
        const marketData = await scanner.getValidatedPrice();
        if (marketData) {
            // Capa de Aprendizaje: Guardar en Supabase
            await supabase.from('learning_db').insert([{ 
                asset: config.STRATEGY.ASSET, 
                price: marketData.price,
                metadata: { spread: marketData.spread }
            }]);

            // Capa de Acción: Analizar con profundidad histórica
            const analysis = await engine.analyzeWithHistoricalDepth(supabase, marketData.price);
            if (parseInt(analysis.probability) >= 90) {
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
    } catch (err) { console.log("Error en patrullaje:", err.message); }
}
setInterval(coreCycle, config.SYSTEM.POLLING_INTERVAL);

// --- COMANDOS DEL DASHBOARD ---

bot.start((ctx) => {
    ctx.replyWithMarkdown(
        `🎯 *SNIPER V6 ONLINE*\n\n` +
        `🧠 Cerebro: *Superdotado Activo*\n` +
        `🛡️ Lote: ${config.ACCOUNT.LOT_SIZE}\n` +
        `💰 Cuenta: $${config.ACCOUNT.INITIAL_BALANCE}\n\n` +
        `_Usa /aprender para refrescar la memoria histórica._`
    );
});

bot.command('aprender', async (ctx) => {
    ctx.reply("🧠 Absorbiendo datos históricos...");
    try {
        const res = await axios.get(`https://api.kraken.com/0/public/OHLC?pair=${config.STRATEGY.ASSET}&interval=60`);
        const pairKey = Object.keys(res.data.result)[0];
        const points = res.data.result[pairKey].slice(-100).map(item => ({
            asset: config.STRATEGY.ASSET, price: parseFloat(item[4]), metadata: { type: "Inyección Histórica" }
        }));
        await supabase.from('learning_db').insert(points);
        ctx.reply("✅ Conocimiento absorbido. Ahora reconozco Soportes y Resistencias.");
    } catch (e) { ctx.reply("❌ Error: " + e.message); }
});

bot.command('señal', async (ctx) => {
    try {
        const marketData = await scanner.getValidatedPrice();
        if (!marketData) return ctx.reply("❌ Error de mercado.");
        const analysis = await engine.analyzeWithHistoricalDepth(supabase, marketData.price);
        ctx.replyWithMarkdown(
            `🔍 *ANÁLISIS DE PRECISIÓN*\n\n` +
            `💰 Precio: $${analysis.price}\n` +
            `📊 Acción: *${analysis.action}*\n` +
            `🔥 Probabilidad: ${analysis.probability}\n` +
            `📍 Zona: ${analysis.context.zone}\n\n` +
            `🛡️ Lote: ${analysis.risk.lot} | SL: $${analysis.risk.sl}`
        );
    } catch (e) { ctx.reply("❌ Esperando datos... Usa /aprender primero."); }
});

bot.command('mercados', async (ctx) => {
    if (multiScanner) {
        const report = await multiScanner.getFullMarketScan();
        ctx.replyWithMarkdown(report);
    } else {
        ctx.reply("⚠️ Módulo de mercados no configurado.");
    }
});

bot.command('status', (ctx) => {
    ctx.reply(`✅ Sistema OK\nPatrullaje: Activo (5min)\nMemoria: Conectada`);
});

// Lanzamiento con limpieza de sesión para evitar Error 409
bot.launch({ dropPendingUpdates: true });
