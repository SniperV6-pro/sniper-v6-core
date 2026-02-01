require('dotenv').config();
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const config = require('./config');
const scanner = require('./scanner');
const brain = require('./engine'); // CTIPROV6
const multiScanner = require('./multi_scanner');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- SINCRONIZADOR TEMPORAL (CRONÓMETRO DE VELAS) ---
async function timeSyncLoop() {
    const now = new Date();
    const minutes = now.getMinutes();
    
    // Definimos las fases del Scalping
    let phase = null;

    // PRE-ALERTA (2 min antes del cierre: 13, 28, 43, 58)
    if ([13, 28, 43, 58].includes(minutes)) {
        phase = "PRE-ALERTA";
    } 
    // CONFIRMACIÓN (Inicio de vela: 00, 15, 30, 45)
    else if ([0, 15, 30, 45].includes(minutes)) {
        phase = "CONFIRMACIÓN";
    }

    if (phase) {
        console.log(`[${now.toLocaleTimeString()}] Ejecutando fase: ${phase}`);
        const marketData = await scanner.getValidatedPrice();
        
        if (marketData) {
            // Inyectamos el precio para que el cerebro aprenda vela a vela
            if (phase === "CONFIRMACIÓN") {
                await supabase.from('learning_db').insert([{ 
                    asset: config.STRATEGY.ASSET, price: marketData.price 
                }]);
            }

            // Análisis CTIPROV6
            const analysis = await brain.analyze(supabase, marketData.price, phase);

            // Filtro de Calidad: Solo enviamos si hay una probabilidad decente
            if (analysis.probability > 60) {
                let emoji = phase === "PRE-ALERTA" ? "⚠️" : "🚀";
                let title = phase === "PRE-ALERTA" ? "PRE-ALERTA (2 min)" : "SEÑAL DE ENTRADA";
                
                bot.telegram.sendMessage(process.env.CHAT_ID, 
                    `${emoji} *CTIPROV6: ${title}*\n` +
                    `-----------------------------\n` +
                    `📊 Acción: *${analysis.action}*\n` +
                    `💲 Precio: $${analysis.price}\n` +
                    `📉 Tendencia: ${analysis.context.trend}\n` +
                    `-----------------------------\n` +
                    `💰 Capital Base: $${analysis.risk.capital_used}\n` +
                    `🛡️ *LOTE RECOMENDADO: ${analysis.risk.lot}*\n` +
                    `🛑 SL: -${analysis.risk.sl_dist} pts\n` +
                    `🎯 TP: +${analysis.risk.tp_dist} pts`,
                    { parse_mode: 'Markdown' }
                );
            }
        }
    }
}

// Revisamos el reloj cada 60 segundos exactos
setInterval(timeSyncLoop, 60000);

// --- COMANDOS DE CONTROL ---

bot.start((ctx) => ctx.reply("🧠 CTIPROV6 Online. Modo Scalping Sincronizado."));

// COMANDO NUEVO: Ajustar Capital
bot.command('capital', (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.reply("⚠️ Uso: /capital [monto] (Ej: /capital 50)");
    
    const amount = parseFloat(args[1]);
    if (isNaN(amount)) return ctx.reply("❌ Error: Ingresa un número válido.");
    
    brain.setCapital(amount);
    ctx.reply(`✅ Capital actualizado a $${amount}. El cerebro recalculará los lotes.`);
});

bot.command('señal', async (ctx) => {
    const marketData = await scanner.getValidatedPrice();
    const analysis = await brain.analyze(supabase, marketData.price, "MANUAL");
    ctx.replyWithMarkdown(
        `🔍 *ANÁLISIS MANUAL CTIPROV6*\n` +
        `Acción: ${analysis.action} (${analysis.probability}%)\n` +
        `Volatilidad: ${analysis.context.volatility}\n` +
        `Lote sugerido ($${analysis.risk.capital_used}): *${analysis.risk.lot}*`
    );
});

bot.command('aprender', async (ctx) => {
    ctx.reply("🧠 CTIPROV6: Recalibrando con velas de 15min...");
    try {
        const res = await axios.get(`https://api.kraken.com/0/public/OHLC?pair=${config.STRATEGY.ASSET}&interval=15`);
        const pairKey = Object.keys(res.data.result)[0];
        // Tomamos las últimas 50 velas para entender el ritmo actual
        const points = res.data.result[pairKey].slice(-50).map(item => ({
            asset: config.STRATEGY.ASSET, price: parseFloat(item[4])
        }));
        await supabase.from('learning_db').insert(points);
        ctx.reply("✅ Calibración completada.");
    } catch (e) { ctx.reply("❌ Error: " + e.message); }
});

bot.command('mercados', async (ctx) => {
    const report = await multiScanner.getFullMarketScan();
    ctx.replyWithMarkdown(report);
});

bot.launch({ dropPendingUpdates: true });
        
