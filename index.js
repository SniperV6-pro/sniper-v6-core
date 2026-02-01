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

// --- SINCRONIZADOR TEMPORAL (RADAR MULTIMERCADO) ---
async function timeSyncLoop() {
    const now = new Date();
    const minutes = now.getMinutes();
    const hours = now.getHours();
    
    // 1. REPORTE DIARIO (23:55)
    if (hours === 23 && minutes === 55) {
        const dailySummary = await journal.getDailyReport(supabase);
        bot.telegram.sendMessage(process.env.CHAT_ID, dailySummary, { parse_mode: 'Markdown' });
    }

    // 2. FASES DE SCALPING (RADAR DE 6 MERCADOS)
    let phase = null;
    if ([13, 28, 43, 58].includes(minutes)) phase = "PRE-ALERTA";
    else if ([0, 15, 30, 45].includes(minutes)) phase = "CONFIRMACIÓN";

    if (phase) {
        console.log(`[${now.toLocaleTimeString()}] Iniciando Radar Global: ${phase}`);
        
        // Barrido secuencial de los 6 activos
        for (const assetId of config.STRATEGY.RADAR_ASSETS) {
            try {
                // Obtenemos precio individual de Kraken para cada uno
                const res = await axios.get(`https://api.kraken.com/0/public/Ticker?pair=${assetId}`);
                const key = Object.keys(res.data.result)[0];
                const price = parseFloat(res.data.result[key].c[0]);

                if (phase === "CONFIRMACIÓN") {
                    await supabase.from('learning_db').insert([{ asset: assetId, price: price }]);
                }

                const analysis = await brain.analyze(supabase, price, phase);
                analysis.assetName = assetId.replace('PAXGUSD', 'ORO').replace('XBTUSD', 'BTC').replace('ETHUSD', 'ETH').replace('USD', '');

                // Solo notificamos si la probabilidad es digna de un profesional
                if (analysis.probability >= config.STRATEGY.MIN_CONFIDENCE) {
                    let emoji = phase === "PRE-ALERTA" ? "⚠️" : "🚀";
                    bot.telegram.sendMessage(process.env.CHAT_ID, 
                        `${emoji} *CTIPROV6 RADAR: ${analysis.assetName}*\n` +
                        `Fase: ${phase} (15m)\n` +
                        `-----------------------------\n` +
                        `📊 Acción: *${analysis.action}*\n` +
                        `🔥 Probabilidad: ${analysis.probability}%\n` +
                        `💲 Precio: $${analysis.price}\n` +
                        `🛡️ Lote: ${analysis.risk.lot} | SL: ${analysis.risk.sl_dist}`,
                        { parse_mode: 'Markdown' }
                    );
                }
            } catch (e) {
                console.log(`Error escaneando ${assetId}:`, e.message);
            }
        }
    }
}

setInterval(timeSyncLoop, 60000);

// --- COMANDOS ---
bot.start((ctx) => ctx.reply("🎯 CTIPROV6 RADAR GLOBAL ONLINE. Patrullando 6 mercados."));

bot.command('testforce', async (ctx) => {
    ctx.reply("🧪 Probando Radar en los 6 mercados...");
    const report = await multiScanner.getFullMarketScan();
    ctx.replyWithMarkdown(`✅ *SISTEMA CONECTADO*\n${report}`);
});

bot.command('capital', (ctx) => {
    const amount = parseFloat(ctx.message.text.split(' ')[1]);
    if (isNaN(amount)) return ctx.reply("⚠️ Uso: /capital 20");
    brain.setCapital(amount);
    ctx.reply(`✅ Capital CTIPROV6 actualizado a $${amount}.`);
});

bot.command('aprender', async (ctx) => {
    ctx.reply("🧠 Calibrando Radar Global (Carga masiva)...");
    for (const assetId of config.STRATEGY.RADAR_ASSETS) {
        try {
            const res = await axios.get(`https://api.kraken.com/0/public/OHLC?pair=${assetId}&interval=15`);
            const key = Object.keys(res.data.result)[0];
            const points = res.data.result[key].slice(-10).map(item => ({
                asset: assetId, price: parseFloat(item[4])
            }));
            await supabase.from('learning_db').insert(points);
        } catch (e) {}
    }
    ctx.reply("✅ Memoria de 6 mercados inyectada.");
});

bot.command('diario', async (ctx) => {
    const summary = await journal.getDailyReport(supabase);
    ctx.replyWithMarkdown(summary);
});

bot.command('mercados', async (ctx) => {
    const report = await multiScanner.getFullMarketScan();
    ctx.replyWithMarkdown(report);
});

bot.launch();
                                         
