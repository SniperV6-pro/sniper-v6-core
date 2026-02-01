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
    const min = now.getMinutes();
    
    // Disparadores de Scalping (Minutos exactos)
    let phase = null;
    if ([13, 28, 43, 58].includes(min)) phase = "PRE-ALERTA";
    else if ([0, 15, 30, 45].includes(min)) phase = "CONFIRMACIÓN";

    if (phase) {
        for (const asset of config.STRATEGY.RADAR_ASSETS) {
            try {
                const res = await axios.get(`https://api.kraken.com/0/public/Ticker?pair=${asset}`);
                const price = parseFloat(Object.values(res.data.result)[0].c[0]);
                
                if (phase === "CONFIRMACIÓN") {
                    await supabase.from('learning_db').insert([{ asset: asset, price: price }]);
                }

                const analysis = await brain.analyze(supabase, price, phase, asset);
                const assetName = asset.replace('PAXGUSD', 'ORO').replace('XBTUSD', 'BTC').replace('USD', '');

                if (analysis.probability >= config.STRATEGY.MIN_CONFIDENCE) {
                    bot.telegram.sendMessage(process.env.CHAT_ID, 
                        `🚀 *CTIPROV6 PRO: ${assetName}*\n` +
                        `-----------------------------\n` +
                        `🎯 Señal: *${analysis.action}*\n` +
                        `🔥 Confianza: ${analysis.probability}%\n` +
                        `💰 Precio: $${analysis.price}\n\n` +
                        `🛡️ *ORDEN:* Lote ${analysis.risk.lot}\n` +
                        `🛑 SL: $${analysis.risk.sl}\n` +
                        `✅ TP: $${analysis.risk.tp}\n` +
                        `📈 Tendencia: ${analysis.context.trend}`,
                        { parse_mode: 'Markdown' }
                    );
                }
            } catch (e) { console.log(`Error en radar ${asset}`); }
        }
    }
    // Reporte diario automático
    if (now.getHours() === 23 && min === 55) {
        const report = await journal.getDailyReport(supabase);
        bot.telegram.sendMessage(process.env.CHAT_ID, report, { parse_mode: 'Markdown' });
    }
}

setInterval(timeSyncLoop, 60000);

bot.command('testforce', async (ctx) => {
    ctx.reply("🧪 Test CTIPROV6-PRO en curso...");
    const report = await multiScanner.getFullMarketScan();
    ctx.replyWithMarkdown(`✅ *SISTEMA OPERATIVO FINAL*\n${report}`);
});

bot.command('capital', (ctx) => {
    const amount = parseFloat(ctx.message.text.split(' ')[1]);
    if (!isNaN(amount)) {
        brain.setCapital(amount);
        ctx.reply(`✅ Capital ajustado a $${amount}. Riesgo recalculado.`);
    }
});

bot.command('aprender', async (ctx) => {
    ctx.reply("🧠 Calibrando Multimercado...");
    for (const asset of config.STRATEGY.RADAR_ASSETS) {
        try {
            const res = await axios.get(`https://api.kraken.com/0/public/OHLC?pair=${asset}&interval=15`);
            const data = Object.values(res.data.result)[0].slice(-30).map(d => ({ asset, price: parseFloat(d[4]) }));
            await supabase.from('learning_db').insert(data);
        } catch (e) {}
    }
    ctx.reply("✅ Radar Calibrado.");
});

bot.command('mercados', async (ctx) => ctx.replyWithMarkdown(await multiScanner.getFullMarketScan()));
bot.command('diario', async (ctx) => ctx.replyWithMarkdown(await journal.getDailyReport(supabase)));

bot.launch();
            
