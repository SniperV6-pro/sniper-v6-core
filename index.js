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

// --- SINCRONIZADOR TEMPORAL (CRONÓMETRO DE VELAS Y REPORTES) ---
async function timeSyncLoop() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // 1. LÓGICA DE REPORTE DIARIO AUTOMÁTICO (23:55 PM)
    if (hours === 23 && minutes === 55) {
        const dailySummary = await journal.getDailyReport(supabase);
        bot.telegram.sendMessage(process.env.CHAT_ID, dailySummary, { parse_mode: 'Markdown' });
    }

    // 2. LÓGICA DE FASES DE SCALPING
    let phase = null;
    if ([13, 28, 43, 58].includes(minutes)) {
        phase = "PRE-ALERTA";
    } else if ([0, 15, 30, 45].includes(minutes)) {
        phase = "CONFIRMACIÓN";
    }

    if (phase) {
        const marketData = await scanner.getValidatedPrice();
        if (marketData) {
            // Aprendizaje vela a vela
            if (phase === "CONFIRMACIÓN") {
                await supabase.from('learning_db').insert([{ 
                    asset: config.STRATEGY.ASSET, price: marketData.price 
                }]);
            }

            const analysis = await brain.analyze(supabase, marketData.price, phase);

            if (analysis.probability >= 70) {
                let emoji = phase === "PRE-ALERTA" ? "⚠️" : "🚀";
                let title = phase === "PRE-ALERTA" ? "PRE-ALERTA (2 min)" : "SEÑAL DE ENTRADA";
                
                bot.telegram.sendMessage(process.env.CHAT_ID, 
                    `${emoji} *CTIPROV6: ${title}*\n` +
                    `-----------------------------\n` +
                    `📊 Acción: *${analysis.action}*\n` +
                    `💲 Precio: $${analysis.price}\n` +
                    `📈 Tendencia: ${analysis.context.trend}\n` +
                    `-----------------------------\n` +
                    `💰 Capital Base: $${analysis.risk.capital_used}\n` +
                    `🛡️ *LOTE: ${analysis.risk.lot}*\n` +
                    `🛑 SL: -${analysis.risk.sl_dist} pts | 🎯 TP: +${analysis.risk.tp_dist} pts`,
                    { parse_mode: 'Markdown' }
                );
            }
        }
    }
}

setInterval(timeSyncLoop, 60000);

// --- COMANDOS DE CONTROL ---

bot.start((ctx) => ctx.reply("🎯 CTIPROV6 Online. Scalping Pro Activado."));

// COMANDO DE PRUEBA FORZADA
bot.command('testforce', async (ctx) => {
    ctx.reply("🧪 Iniciando prueba de estrés del sistema...");
    try {
        const marketData = await scanner.getValidatedPrice();
        if (!marketData) throw new Error("Fallo en Scanner (Kraken)");
        
        const analysis = await brain.analyze(supabase, marketData.price, "TEST-FORZADO");
        
        ctx.replyWithMarkdown(
            `✅ *SISTEMA OPERATIVO*\n\n` +
            `📡 Conexión Kraken: OK ($${marketData.price})\n` +
            `🧠 Cerebro CTIPROV6: OK (Análisis procesado)\n` +
            `🗄️ Base de Datos: OK (Sync Supabase)\n` +
            `🛡️ Gestión de Riesgo: OK (Lote: ${analysis.risk.lot})`
        );
    } catch (e) {
        ctx.reply(`❌ ERROR EN PRUEBA: ${e.message}`);
    }
});

bot.command('capital', (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.reply("⚠️ Uso: /capital [monto]");
    const amount = parseFloat(args[1]);
    if (isNaN(amount)) return ctx.reply("❌ Monto inválido.");
    brain.setCapital(amount);
    ctx.reply(`✅ Capital actualizado a $${amount}.`);
});

bot.command('diario', async (ctx) => {
    const dailySummary = await journal.getDailyReport(supabase);
    ctx.replyWithMarkdown(dailySummary);
});

bot.command('señal', async (ctx) => {
    const marketData = await scanner.getValidatedPrice();
    const analysis = await brain.analyze(supabase, marketData.price, "MANUAL");
    ctx.replyWithMarkdown(`🔍 *ANÁLISIS MANUAL*\nPrecio: $${analysis.price}\nAcción: ${analysis.action}\nLote: ${analysis.risk.lot}`);
});

bot.command('mercados', async (ctx) => {
    const report = await multiScanner.getFullMarketScan();
    ctx.replyWithMarkdown(report);
});

bot.launch({ dropPendingUpdates: true });
                                       
