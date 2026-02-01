require('dotenv').config();
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const config = require('./config');
const scanner = require('./scanner');
const engine = require('./engine');
const multiScanner = require('./multi_scanner');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- PATRULLAJE SNIPER (ALERTA ANTICIPADA) ---
async function coreCycle() {
    try {
        const marketData = await scanner.getValidatedPrice();
        if (marketData) {
            await supabase.from('learning_db').insert([{ 
                asset: config.STRATEGY.ASSET, 
                price: marketData.price 
            }]);

            const analysis = await engine.analyzeWithHistoricalDepth(supabase, marketData.price);
            
            // ALERTA 2 MINUTOS ANTES: Si la probabilidad sube de 90% enviamos el "Gatillo"
            if (parseInt(analysis.probability) >= 90) {
                bot.telegram.sendMessage(process.env.CHAT_ID, 
                    `🚨 *ALERTA SNIPER: PREPARAR ENTRADA*\n` +
                    `⚠️ _Anticipación de 2 min detectada_\n\n` +
                    `Acción: *${analysis.action}*\n` +
                    `Precio: $${analysis.price}\n` +
                    `Zona: ${analysis.context.zone}\n\n` +
                    `🛡️ *GESTIÓN:* Lote ${analysis.risk.lot} | SL: $${analysis.risk.sl}\n` +
                    `⏱️ _Abre Exness ahora y prepara el lote._`, 
                    { parse_mode: 'Markdown' }
                );
            }
        }
    } catch (err) { console.log("Error en ciclo:", err.message); }
}
setInterval(coreCycle, 60000); // Bajamos a 1 min para mayor precisión en Scalping

// --- COMANDOS ---
bot.start((ctx) => ctx.reply("🎯 Sniper V6 Online - Scalping Mode"));

bot.command('aprender', async (ctx) => {
    ctx.reply("🧠 Absorbiendo conocimiento...");
    try {
        const res = await axios.get(`https://api.kraken.com/0/public/OHLC?pair=${config.STRATEGY.ASSET}&interval=15`);
        const pairKey = Object.keys(res.data.result)[0];
        const points = res.data.result[pairKey].slice(-50).map(item => ({
            asset: config.STRATEGY.ASSET, price: parseFloat(item[4])
        }));
        await supabase.from('learning_db').insert(points);
        ctx.reply("✅ Conocimiento de Scalping inyectado.");
    } catch (e) { ctx.reply("❌ Error: " + e.message); }
});

bot.command('señal', async (ctx) => {
    try {
        const marketData = await scanner.getValidatedPrice();
        const analysis = await engine.analyzeWithHistoricalDepth(supabase, marketData.price);
        ctx.replyWithMarkdown(`🔍 *ANÁLISIS INSTANTÁNEO*\n💰 Precio: $${analysis.price}\n📊 Acción: *${analysis.action}*\n🔥 Confianza: ${analysis.probability}\n📍 Zona: ${analysis.context.zone}\n🛡️ SL: $${analysis.risk.sl}`);
    } catch (e) { ctx.reply("❌ El cerebro está procesando, intenta en 10 segundos."); }
});

bot.command('mercados', async (ctx) => {
    const report = await multiScanner.getFullMarketScan();
    ctx.replyWithMarkdown(report);
});

bot.launch({ dropPendingUpdates: true });
        `🔍 *ANÁLISIS DE PRECISIÓN*\n\n` +
        `💰 Precio: $${analysis.price}\n` +
        `📊 Acción: *${analysis.action}*\n` +
        `🔥 Probabilidad: ${analysis.probability}\n` +
        `📍 Zona: ${analysis.context.zone}\n\n` +
        `🛡️ Lote: ${analysis.risk.lot} | SL: $${analysis.risk.sl}`
    );
});

bot.command('mercados', async (ctx) => {
    const report = await multiScanner.getFullMarketScan();
    ctx.replyWithMarkdown(report);
});

bot.command('status', (ctx) => {
    ctx.reply(`✅ Sistema OK\nPatrullaje: Activo\nMemoria: Conectada`);
});

bot.launch({ dropPendingUpdates: true });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
