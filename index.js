require('dotenv').config();
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js'); // Corregido
const config = require('./config');
const engine = require('./engine');
const express = require('express');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

bot.command('aprender', async (ctx) => {
    const total = config.STRATEGY.RADAR_ASSETS.length;
    await ctx.reply(`🧠 Sniper V6: Calibrando ${total} mercados...`);
    for (const asset of config.STRATEGY.RADAR_ASSETS) {
        try {
            await supabase.from('learning_db').insert([{ asset, price: 0, created_at: new Date() }]);
        } catch (e) { console.error(e); }
    }
    await ctx.reply(`✅ Calibración finalizada en 10 mercados.`);
});

async function executarRadar() {
    for (const assetId of config.STRATEGY.RADAR_ASSETS) {
        try {
            const response = await axios.get(`${process.env.BROKER_URL}/quote?symbol=${assetId}`);
            if (!response.data) continue;
            const { price, spread } = response.data;

            const signal = await engine.analyze(supabase, parseFloat(price), assetId, parseInt(spread));

            if (signal.action !== "WAIT" && signal.probability >= config.STRATEGY.MIN_CONFIDENCE) {
                const alerta = `🎯 **SEÑAL: ${signal.assetName}**\n💰 Orden: **${signal.action}**\n🔥 Confianza: ${signal.probability}%\n🛡️ SL: ${signal.risk.sl} | TP: ${signal.risk.tp}`;
                await bot.telegram.sendMessage(process.env.CHAT_ID, alerta, { parse_mode: 'Markdown' });
            }
            await supabase.from('learning_db').insert([{ asset: assetId, price: parseFloat(price) }]);
        } catch (err) { console.log(`Error en ${assetId}`); }
    }
}

const app = express();
app.get('/', (req, res) => res.send('Sniper V6 Online'));
app.listen(process.env.PORT || 10000);

bot.launch();
setInterval(executarRadar, config.POLLING_INTERVAL);
console.log("🚀 Sniper V6 Core: Desplegado y Operativo.");
