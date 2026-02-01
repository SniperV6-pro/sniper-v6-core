require('dotenv').config();
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const http = require('http'); // Servidor para evitar suspensión de Render
const config = require('./config');
const scanner = require('./scanner');
const brain = require('./engine');
const multiScanner = require('./multi_scanner');
const journal = require('./journal');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- 1. SERVIDOR DE VIDA (Responde a Render y Cron-job) ---
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('CTIPROV6 STATUS: OPERATIVO Y VIGILANDO');
    res.end();
}).listen(process.env.PORT || 3000, () => {
    console.log("🚀 Servidor de vida activo en puerto " + (process.env.PORT || 3000));
});

// --- 2. BUCLE DE RADAR Y SINCRONIZACIÓN ---
async function timeSyncLoop() {
    const now = new Date();
    const min = now.getMinutes();
    const hours = now.getHours();
    
    // Reporte Diario Automático a las 23:55
    if (hours === 23 && min === 55) {
        try {
            const dailySummary = await journal.getDailyReport(supabase);
            bot.telegram.sendMessage(process.env.CHAT_ID, dailySummary, { parse_mode: 'Markdown' });
        } catch (e) { console.error("Error reporte diario:", e.message); }
    }

    // Fases de Scalping: Pre-alerta y Confirmación
    let phase = null;
    if ([13, 28, 43, 58].includes(min)) {
        phase = "PRE-ALERTA";
    } else if ([0, 15, 30, 45].includes(min)) {
        phase = "CONFIRMACIÓN";
    }

    if (phase) {
        console.log(`[${now.toLocaleTimeString()}] Iniciando Radar: ${phase}`);
        
        for (const assetId of config.STRATEGY.RADAR_ASSETS) {
            try {
                const res = await axios.get(`https://api.kraken.com/0/public/Ticker?pair=${assetId}`);
                const resultKey = Object.keys(res.data.result)[0];
                const price = parseFloat(res.data.result[resultKey].c[0]);

                if (phase === "CONFIRMACIÓN") {
                    await supabase.from('learning_db').insert([{ 
                        asset: assetId, 
                        price: price 
                    }]);
                }

                const analysis = await brain.analyze(supabase, price, phase, assetId);
                const assetName = config.STRATEGY.ASSET_NAMES[assetId] || assetId;

                if (analysis.probability >= config.STRATEGY.MIN_CONFIDENCE) {
                    let emoji = phase === "PRE-ALERTA" ? "⚠️" : "🚀";
                    let title = phase === "PRE-ALERTA" ? "PRE-ALERTA (Prepárese)" : "SEÑAL DE ENTRADA";
                    
                    bot.telegram.sendMessage(process.env.CHAT_ID, 
                        `${emoji} *CTIPROV6 PRO: ${assetName}*\n` +
                        `📌 *${title}*\n` +
                        `-----------------------------\n` +
                        `📊 Acción: *${analysis.action}*\n` +
                        `🔥 Confianza: ${analysis.probability}%\n` +
                        `💲 Precio: $${analysis.price}\n` +
                        `📈 Tendencia: ${analysis.context.trend}\n` +
                        `-----------------------------\n` +
                        `🛡️ *LOTE: ${analysis.risk.lot}*\n` +
                        `🛑 SL: $${analysis.risk.sl}\n` +
                        `✅ TP: $${analysis.risk.tp}\n` +
                        `💰 Balance Ref: $${analysis.risk.capital}`,
                        { parse_mode: 'Markdown' }
                    );
                }
            } catch (err) {
                console.error(`Error radar ${assetId}:`, err.message);
            }
        }
    }
}

setInterval(timeSyncLoop, 60000);

// --- 3. COMANDOS DE CONTROL TOTAL ---

bot.start((ctx) => ctx.reply("🎯 CTIPROV6 ULTIMATE ONLINE\nRadar de 6 mercados activo."));

bot.command('testforce', async (ctx) => {
    try {
        const report = await multiScanner.getFullMarketScan();
        ctx.replyWithMarkdown(`✅ *DIAGNÓSTICO CTIPROV6*\n${report}`);
    } catch (e) { ctx.reply("❌ Error en diagnóstico."); }
});

bot.command('capital', (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.reply("⚠️ Uso: /capital [monto]");
    const amount = parseFloat(args[1]);
    if (isNaN(amount)) return ctx.reply("❌ Monto inválido.");
    brain.setCapital(amount);
    ctx.reply(`✅ Capital actualizado a $${amount}. Riesgo recalculado.`);
});

bot.command('aprender', async (ctx) => {
    ctx.reply("🧠 Calibrando memoria de 6 mercados...");
    try {
        for (const assetId of config.STRATEGY.RADAR_ASSETS) {
            const res = await axios.get(`https://api.kraken.com/0/public/OHLC?pair=${assetId}&interval=15`);
            const pairKey = Object.keys(res.data.result)[0];
            const points = res.data.result[pairKey].slice(-20).map(item => ({
                asset: assetId, price: parseFloat(item[4])
            }));
            await supabase.from('learning_db').insert(points);
        }
        ctx.reply("✅ Radar Calibrado al 100%.");
    } catch (e) { ctx.reply("❌ Error en calibración."); }
});

bot.command('mercados', async (ctx) => {
    const report = await multiScanner.getFullMarketScan();
    ctx.replyWithMarkdown(report);
});

bot.command('diario', async (ctx) => {
    const summary = await journal.getDailyReport(supabase);
    ctx.replyWithMarkdown(summary);
});

bot.command('señal', async (ctx) => {
    try {
        const marketData = await scanner.getValidatedPrice();
        const analysis = await brain.analyze(supabase, marketData.price, "MANUAL", "PAXGUSD");
        ctx.replyWithMarkdown(
            `🔍 *ANÁLISIS MANUAL (ORO)*\n` +
            `Acción: ${analysis.action} (${analysis.probability}%)\n` +
            `Lote: ${analysis.risk.lot}\n` +
            `SL: ${analysis.risk.sl} | TP: ${analysis.risk.tp}`
        );
    } catch (e) { ctx.reply("❌ Error en análisis manual."); }
});

bot.launch({ dropPendingUpdates: true });

process.on('unhandledRejection', (reason, promise) => {
    console.error('Rechazo no manejado:', reason);
});
    
