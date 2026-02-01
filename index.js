require('dotenv').config();
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const config = require('./config');
const scanner = require('./scanner');
const brain = require('./engine');
const multiScanner = require('./multi_scanner');
const journal = require('./journal');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- SINCRONIZADOR TEMPORAL (RADAR GLOBAL Y GESTIÓN) ---
async function timeSyncLoop() {
    const now = new Date();
    const min = now.getMinutes();
    const hours = now.getHours();
    
    // 1. REPORTE DIARIO AUTOMÁTICO (23:55 PM)
    if (hours === 23 && min === 55) {
        try {
            const dailySummary = await journal.getDailyReport(supabase);
            bot.telegram.sendMessage(process.env.CHAT_ID, dailySummary, { parse_mode: 'Markdown' });
        } catch (e) { console.error("Error en reporte diario:", e.message); }
    }

    // 2. RADAR DE FASES DE SCALPING (6 MERCADOS)
    let phase = null;
    if ([13, 28, 43, 58].includes(min)) {
        phase = "PRE-ALERTA";
    } else if ([0, 15, 30, 45].includes(min)) {
        phase = "CONFIRMACIÓN";
    }

    if (phase) {
        console.log(`[${now.toLocaleTimeString()}] Ejecutando Radar Global: ${phase}`);
        
        for (const assetId of config.STRATEGY.RADAR_ASSETS) {
            try {
                // Obtener precio individual para cada activo del radar
                const res = await axios.get(`https://api.kraken.com/0/public/Ticker?pair=${assetId}`);
                const resultKey = Object.keys(res.data.result)[0];
                const price = parseFloat(res.data.result[resultKey].c[0]);

                // Guardamos en DB para aprendizaje continuo en fase de confirmación
                if (phase === "CONFIRMACIÓN") {
                    await supabase.from('learning_db').insert([{ 
                        asset: assetId, 
                        price: price 
                    }]);
                }

                // El cerebro analiza cada activo
                const analysis = await brain.analyze(supabase, price, phase, assetId);
                
                // Mapeo de nombre para el mensaje
                const assetName = config.STRATEGY.ASSET_NAMES[assetId] || assetId;

                // Solo notificamos si la probabilidad supera el umbral de seguridad
                if (analysis.probability >= config.STRATEGY.MIN_CONFIDENCE) {
                    let emoji = phase === "PRE-ALERTA" ? "⚠️" : "🚀";
                    let title = phase === "PRE-ALERTA" ? "PRE-ALERTA (2 min)" : "SEÑAL DE ENTRADA";
                    
                    bot.telegram.sendMessage(process.env.CHAT_ID, 
                        `${emoji} *CTIPROV6 PRO: ${assetName}*\n` +
                        `📌 *${title}*\n` +
                        `-----------------------------\n` +
                        `📊 Acción: *${analysis.action}*\n` +
                        `🔥 Confianza: ${analysis.probability}%\n` +
                        `💲 Precio: $${analysis.price}\n` +
                        `📈 Tendencia: ${analysis.context.trend}\n` +
                        `-----------------------------\n` +
                        `💰 Capital: $${analysis.risk.capital}\n` +
                        `🛡️ *LOTE: ${analysis.risk.lot}*\n` +
                        `🛑 SL: $${analysis.risk.sl}\n` +
                        `✅ TP: $${analysis.risk.tp}\n\n` +
                        `⏱️ _Vela de 15m - Actúe con profesionalismo._`,
                        { parse_mode: 'Markdown' }
                    );
                }
            } catch (err) {
                console.error(`Error en radar para ${assetId}:`, err.message);
            }
        }
    }
}

// Revisamos el reloj cada minuto exacto
setInterval(timeSyncLoop, 60000);

// --- COMANDOS DE CONTROL TOTAL ---

bot.start((ctx) => {
    ctx.reply("🎯 CTIPROV6 ULTIMATE ONLINE\nRadar Multimercado (6 Activos)\nModo Scalping Profesional Activado.");
});

// TEST DE FUERZA: Diagnóstico completo del sistema
bot.command('testforce', async (ctx) => {
    ctx.reply("🧪 Iniciando diagnóstico de fuerza en 6 mercados...");
    try {
        const report = await multiScanner.getFullMarketScan();
        ctx.replyWithMarkdown(`✅ *SISTEMA OPERATIVO FINAL*\n${report}`);
    } catch (e) {
        ctx.reply("❌ Error en diagnóstico: " + e.message);
    }
});

// GESTIÓN DE CAPITAL: Ajusta el balance para el cálculo de lotaje
bot.command('capital', (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.reply("⚠️ Uso: /capital [monto] (Ej: /capital 50)");
    
    const amount = parseFloat(args[1]);
    if (isNaN(amount)) return ctx.reply("❌ Error: Monto inválido.");
    
    brain.setCapital(amount);
    ctx.reply(`✅ Capital CTIPROV6 actualizado a $${amount}.\nLotes y Riesgo recalculados.`);
});

// APRENDIZAJE: Carga histórica de 6 mercados
bot.command('aprender', async (ctx) => {
    ctx.reply("🧠 Calibrando Radar Global (Cargando datos de 6 mercados)...");
    try {
        for (const assetId of config.STRATEGY.RADAR_ASSETS) {
            const res = await axios.get(`https://api.kraken.com/0/public/OHLC?pair=${assetId}&interval=15`);
            const pairKey = Object.keys(res.data.result)[0];
            const points = res.data.result[pairKey].slice(-20).map(item => ({
                asset: assetId, 
                price: parseFloat(item[4])
            }));
            await supabase.from('learning_db').insert(points);
        }
        ctx.reply("✅ Calibración Multimercado Completada al 100%.");
    } catch (e) {
        ctx.reply("❌ Error en calibración: " + e.message);
    }
});

// BITÁCORA DIARIA: Resumen de rendimiento
bot.command('diario', async (ctx) => {
    try {
        const summary = await journal.getDailyReport(supabase);
        ctx.replyWithMarkdown(summary);
    } catch (e) {
        ctx.reply("❌ Error al obtener bitácora.");
    }
});

// RADAR INSTANTÁNEO: Mapa de precios y tendencias
bot.command('mercados', async (ctx) => {
    try {
        const report = await multiScanner.getFullMarketScan();
        ctx.replyWithMarkdown(report);
    } catch (e) {
        ctx.reply("❌ Error en radar.");
    }
});

// SEÑAL MANUAL: Análisis rápido del Oro
bot.command('señal', async (ctx) => {
    try {
        const marketData = await scanner.getValidatedPrice();
        const analysis = await brain.analyze(supabase, marketData.price, "MANUAL", config.STRATEGY.ASSET);
        ctx.replyWithMarkdown(
            `🔍 *ANÁLISIS MANUAL CTIPROV6*\n` +
            `Activo: ORO (PAXG)\n` +
            `Acción: ${analysis.action} (${analysis.probability}%)\n` +
            `Lote: *${analysis.risk.lot}*\n` +
            `SL: $${analysis.risk.sl} | TP: $${analysis.risk.tp}`
        );
    } catch (e) {
        ctx.reply("❌ Error en análisis manual.");
    }
});

bot.launch({ dropPendingUpdates: true });

// Manejo de errores global para evitar caídas
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
