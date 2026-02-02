require('dotenv').config();
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-client');
const config = require('./config');
const engine = require('./engine');
const express = require('express');
const axios = require('axios');

// VALIDACIÓN DE ENTORNO
if (!process.env.TELEGRAM_TOKEN || !process.env.SUPABASE_URL) {
    console.error("CRÍTICO: Faltan variables de entorno.");
    process.exit(1);
}

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- COMANDO APRENDER (ROBUSTO) ---
bot.command('aprender', async (ctx) => {
    const total = config.STRATEGY.RADAR_ASSETS.length;
    await ctx.reply(`🧠 Sniper V6: Iniciando calibración profunda de ${total} mercados...`);

    let exitosos = 0;
    for (const asset of config.STRATEGY.RADAR_ASSETS) {
        try {
            // Intentar capturar precio real para inicializar
            const response = await axios.get(`${process.env.BROKER_URL}/quote?symbol=${asset}`).catch(() => null);
            const price = response ? parseFloat(response.data.price) : 0;
            
            const { error } = await supabase.from('learning_db').insert([
                { asset, price, created_at: new Date() }
            ]);
            
            if (!error) exitosos++;
        } catch (e) {
            console.error(`Fallo inicializando ${asset}`);
        }
    }
    await ctx.reply(`✅ Calibración finalizada.\n📈 Mercados activos: ${exitosos}/${total}\n🚀 El radar está en línea.`);
});

// --- COMANDO STATUS ---
bot.command('status', async (ctx) => {
    const uptime = process.uptime();
    const hrs = Math.floor(uptime / 3600);
    ctx.reply(`🛰️ **STATUS SNIPER V6**\n\n⏱️ Uptime: ${hrs}h\n📊 Activos: ${config.STRATEGY.RADAR_ASSETS.length}\n🛡️ Filtro Spread: ${config.STRATEGY.MAX_SPREAD_ALLOWED} pts\n🔑 ID Chat: ${ctx.chat.id}`);
});

// --- CORE: EL RADAR DE ESCANEO ---
async function executarRadar() {
    console.log(`--- Iniciando Barrido: ${new Date().toLocaleTimeString()} ---`);

    for (const assetId of config.STRATEGY.RADAR_ASSETS) {
        try {
            // 1. CAPTURA DE DATOS REALES
            const response = await axios.get(`${process.env.BROKER_URL}/quote?symbol=${assetId}`);
            if (!response.data) continue;

            const { price, spread } = response.data;

            // 2. ANÁLISIS POR EL MOTOR
            const signal = await engine.analyze(supabase, parseFloat(price), assetId, parseInt(spread));

            // 3. ENVÍO DE ALERTAS FILTRADAS
            if (signal.action !== "WAIT" && signal.action !== "LEARNING" && signal.probability >= config.STRATEGY.MIN_CONFIDENCE) {
                const alerta = `🎯 **SEÑAL CONFIRMADA: ${signal.assetName}**\n\n` +
                               `💰 Operación: **${signal.action}**\n` +
                               `🔥 Probabilidad: ${signal.probability}%\n` +
                               `💵 Precio Entrada: ${signal.price}\n\n` +
                               `🛡️ **GESTIÓN DE RIESGO**\n` +
                               `📏 Lote: ${signal.risk.lot}\n` +
                               `⛔ Stop Loss: ${signal.risk.sl}\n` +
                               `✅ Take Profit: ${signal.risk.tp}\n\n` +
                               `⚠️ Spread: ${spread} pts`;

                await bot.telegram.sendMessage(process.env.CHAT_ID, alerta, { parse_mode: 'Markdown' });
            }

            // 4. PERSISTENCIA DE APRENDIZAJE (Indispensable para el Engine)
            await supabase.from('learning_db').insert([{ asset: assetId, price: parseFloat(price) }]);

        } catch (err) {
            console.error(`Error en ciclo para ${assetId}: ${err.message}`);
        }
    }
}

// SERVER DE VIDA PARA RENDER
const app = express();
app.get('/', (req, res) => res.send('Sniper V6 Operational'));
app.listen(process.env.PORT || 10000);

// LANZAMIENTO
bot.launch().then(() => console.log("Telegram Bot conectado."));
setInterval(executarRadar, config.POLLING_INTERVAL);

// CIERRE SEGURO
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
        
