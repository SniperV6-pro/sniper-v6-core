require('dotenv').config();
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');
const scanner = require('./scanner');
const engine = require('./engine');
const { getFullMarketScan } = require('./multi_scanner');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- CICLO DE TRABAJO AUTÓNOMO (Vigilancia 24/7 cada 5 min) ---
async function coreCycle() {
    console.log(`[${new Date().toLocaleTimeString()}] Ejecutando Ciclo Sniper...`);
    const marketData = await scanner.getValidatedPrice();
    
    if (marketData) {
        // 1. Capa de Aprendizaje (Registro en Supabase)
        await supabase.from('learning_db').insert([{ 
            asset: config.STRATEGY.ASSET, 
            price: marketData.price,
            metadata: { spread: marketData.spread }
        }]);

        // 2. Capa de Acción Proactiva (Alerta si hay Probabilidad Alta)
        const analysis = await engine.analyzeWithHistoricalDepth(supabase, marketData.price);
        if (parseInt(analysis.probability) >= 90) {
            bot.telegram.sendMessage(process.env.CHAT_ID, 
                `🔥 *ALERTA SNIPER PROACTIVA*\n\n` +
                `Acción: *${analysis.action}*\n` +
                `Precio: $${analysis.price}\n` +
                `Zona: ${analysis.context.zone}\n` +
                `Lote: ${analysis.risk.lot}\n` +
                `SL: $${analysis.risk.sl}\n\n` +
                `_Entrada detectada por confluencia estructural._`, { parse_mode: 'Markdown' });
        }
    }
}

// Iniciar el vigilante según el intervalo configurado
setInterval(coreCycle, config.SYSTEM.POLLING_INTERVAL);

// --- DASHBOARD DE COMANDOS (Telegram) ---

bot.start((ctx) => {
    ctx.replyWithMarkdown(
        `🎯 *SNIPER V6 ONLINE*\n\n` +
        `SISTEMA OPERATIVO BAJO PLAN DE $20\n` +
        `--------------------------\n` +
        `🧠 Cerebro: Superdotado Activo\n` +
        `🛡️ Lote: ${config.ACCOUNT.LOT_SIZE}\n\n` +
        `_Usa /aprender para inyectar conocimiento histórico._`
    );
});

// COMANDO: Absorción de 3 años de datos
bot.command('aprender', async (ctx) => {
    ctx.reply("🧠 Iniciando absorción de datos históricos desde la API de Kraken...");
    try {
        const axios = require('axios');
        const res = await axios.get(`https://api.kraken.com/0/public/OHLC?pair=${config.STRATEGY.ASSET}&interval=60`);
        const historyData = res.data.result[config.STRATEGY.ASSET];
        
        const points = historyData.slice(-100).map(item => ({
            asset: config.STRATEGY.ASSET,
            price: parseFloat(item[4]), 
            metadata: { type: "Inyección Histórica Pro" }
        }));

        await supabase.from('learning_db').insert(points);
        ctx.reply("✅ Conocimiento absorbido. El cerebro ahora reconoce suelos y techos históricos.");
    } catch (e) {
        ctx.reply("❌ Error en la absorción: " + e.message);
    }
});

// COMANDO: Análisis Manual
bot.command('señal', async (ctx) => {
    const marketData = await scanner.getValidatedPrice();
    if (!marketData) return ctx.reply("❌ Error de conexión con el mercado.");
    
    const analysis = await engine.analyzeWithHistoricalDepth(supabase, marketData.price);
    ctx.replyWithMarkdown(
        `🔍 *ANÁLISIS DE PRECISIÓN*\n\n` +
        `💰 Precio: $${analysis.price}\n` +
        `📊 Acción: *${analysis.action}*\n` +
        `🔥 Probabilidad: ${analysis.probability}\n` +
        `📍 Zona: ${analysis.context.zone}\n` +
        `🏔️ Rango: [$${analysis.context.low} - $${analysis.context.high}]\n\n` +
        `🛡️ Gestión: Lote ${analysis.risk.lot} | SL: $${analysis.risk.sl}`
    );
});

// COMANDO: Mapa de los 6 mercados del plan
bot.command('mercados', async (ctx) => {
    const report = await getFullMarketScan();
    ctx.replyWithMarkdown(report);
});

bot.command('status', (ctx) => {
    ctx.reply(`✅ Sistema OK\nIntervalo: 5min\nCapa de Aprendizaje: Activa`);
});

// LANZAMIENTO SEGURO
bot.launch({ dropPendingUpdates: true }).then(() => {
    console.log("🚀 Sniper V6: Conexión Única Establecida.");
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
