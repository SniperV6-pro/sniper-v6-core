require('dotenv').config();
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');
const engine = require('./engine');
const express = require('express');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// COMANDO /APRENDER (10 MERCADOS)
bot.command('aprender', async (ctx) => {
    const total = config.STRATEGY.RADAR_ASSETS.length;
    await ctx.reply(`🧠 Sniper V6: Calibrando ${total} mercados de forma masiva...`);
    
    let logs = [];
    for (const asset of config.STRATEGY.RADAR_ASSETS) {
        try {
            await supabase.from('learning_db').insert([{ 
                asset, 
                price: 0, 
                created_at: new Date() 
            }]);
            logs.push(`✅ ${asset}`);
        } catch (e) {
            logs.push(`❌ ${asset}`);
        }
    }
    await ctx.reply(`Calibración finalizada:\n${logs.join('\n')}`);
});

// COMANDO /STATUS
bot.command('status', (ctx) => {
    ctx.reply(`🛰️ **STATUS SNIPER V6**\n\n🎯 Activos: ${config.STRATEGY.RADAR_ASSETS.length}\n🛡️ Spread Max: ${config.STRATEGY.MAX_SPREAD_ALLOWED}\n💼 Cuenta: Operativa\n🚀 Modo: Autónomo`);
});

// RADAR PRINCIPAL
async function scanner() {
    console.log("--- Escaneo en curso ---");
    for (const assetId of config.STRATEGY.RADAR_ASSETS) {
        try {
            // Reemplaza por tu URL real de Broker
            const response = await axios.get(`${process.env.BROKER_URL}/quote?symbol=${assetId}`);
            if (!response.data) continue;

            const { price, spread } = response.data;
            const signal = await engine.analyze(supabase, parseFloat(price), assetId, parseInt(spread));

            if (signal.action !== "WAIT" && signal.action !== "LEARNING" && signal.probability >= config.STRATEGY.MIN_CONFIDENCE) {
                const alerta = `🎯 **SEÑAL CONFIRMADA: ${signal.assetName}**\n\n` +
                               `💰 Orden: **${signal.action}**\n` +
                               `🔥 Confianza: ${signal.probability}%\n` +
                               `💵 Precio: ${signal.price}\n\n` +
                               `🛡️ **GESTIÓN**\n` +
                               `📏 Lote: ${signal.risk.lot}\n` +
                               `⛔ SL: ${signal.risk.sl}\n` +
                               `✅ TP: ${signal.risk.tp}\n\n` +
                               `⚠️ Spread: ${spread} pts`;

                await bot.telegram.sendMessage(process.env.CHAT_ID, alerta, { parse_mode: 'Markdown' });
            }
            
            // Persistencia para el promedio móvil
            await supabase.from('learning_db').insert([{ asset: assetId, price: parseFloat(price) }]);
            
        } catch (error) {
            console.log(`Error en activo ${assetId}: ${error.message}`);
        }
    }
}

// SERVER PARA RENDER
const app = express();
app.get('/', (req, res) => res.send('Sniper V6 Online 🚀'));
const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`Server en puerto ${port}`));

bot.launch();
setInterval(scanner, config.POLLING_INTERVAL);

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
            
