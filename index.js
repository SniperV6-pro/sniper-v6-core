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

async function timeSyncLoop() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    if (hours === 23 && minutes === 55) {
        const dailySummary = await journal.getDailyReport(supabase);
        bot.telegram.sendMessage(process.env.CHAT_ID, dailySummary, { parse_mode: 'Markdown' });
    }

    let phase = null;
    if ([13, 28, 43, 58].includes(minutes)) phase = "PRE-ALERTA";
    else if ([0, 15, 30, 45].includes(minutes)) phase = "CONFIRMACIÓN";

    if (phase) {
        const marketData = await scanner.getValidatedPrice();
        if (marketData) {
            if (phase === "CONFIRMACIÓN") {
                await supabase.from('learning_db').insert([{ asset: config.STRATEGY.ASSET, price: marketData.price }]);
            }
            const analysis = await brain.analyze(supabase, marketData.price, phase);
            if (analysis.probability >= 70) {
                let emoji = phase === "PRE-ALERTA" ? "⚠️" : "🚀";
                bot.telegram.sendMessage(process.env.CHAT_ID, 
                    `${emoji} *CTIPROV6: ${phase}*\n` +
                    `📊 Acción: *${analysis.action}*\n` +
                    `💲 Precio: $${analysis.price}\n` +
                    `🛡️ Lote: ${analysis.risk.lot} | SL: ${analysis.risk.sl_dist}`,
                    { parse_mode: 'Markdown' }
                );
            }
        }
    }
}

setInterval(timeSyncLoop, 60000);

bot.command('testforce', async (ctx) => {
    ctx.reply("🧪 Iniciando diagnóstico profundo...");
    try {
        const marketData = await scanner.getValidatedPrice();
        if (!marketData) return ctx.reply("❌ Error: No se pudo conectar con Kraken.");
        
        const analysis = await brain.analyze(supabase, marketData.price, "TEST");
        
        ctx.replyWithMarkdown(
            `✅ *DIAGNÓSTICO CTIPROV6*\n\n` +
            `📡 Kraken: Conectado ($${marketData.price})\n` +
            `🧠 Cerebro: ${analysis.action === "CALIBRANDO" ? "Calibrando (Faltan velas)" : "Operativo"}\n` +
            `🛡️ Lote Calculado: ${analysis.risk.lot}\n` +
            `🗄️ Supabase: Conectado`
        );
    } catch (e) {
        ctx.reply(`❌ ERROR CRÍTICO: ${e.message}`);
    }
});

bot.command('capital', (ctx) => {
    const amount = parseFloat(ctx.message.text.split(' ')[1]);
    if (isNaN(amount)) return ctx.reply("⚠️ Uso: /capital 20");
    brain.setCapital(amount);
    ctx.reply(`✅ Capital actualizado a $${amount}.`);
});

bot.command('diario', async (ctx) => {
    const summary = await journal.getDailyReport(supabase);
    ctx.replyWithMarkdown(summary);
});

bot.command('mercados', async (ctx) => {
    const report = await multiScanner.getFullMarketScan();
    ctx.replyWithMarkdown(report);
});

bot.command('aprender', async (ctx) => {
    ctx.reply("🧠 Inyectando memoria de 15min...");
    try {
        const res = await axios.get(`https://api.kraken.com/0/public/OHLC?pair=${config.STRATEGY.ASSET}&interval=15`);
        const pairKey = Object.keys(res.data.result)[0];
        const points = res.data.result[pairKey].slice(-20).map(item => ({
            asset: config.STRATEGY.ASSET, price: parseFloat(item[4])
        }));
        await supabase.from('learning_db').insert(points);
        ctx.reply("✅ Calibración completada.");
    } catch (e) { ctx.reply("❌ Error: " + e.message); }
});

bot.launch();
                    
