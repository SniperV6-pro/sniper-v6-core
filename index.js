require('dotenv').config();
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');
const engine = require('./engine');
const express = require('express');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

let radarActivo = true;
let lotajeManual = "0.01";

// --- COMANDO /START ---
bot.start((ctx) => ctx.reply("🎯 Sniper V6 Online. Use /help para ver los comandos de control."));

// --- COMANDO /HELP ---
bot.command('help', (ctx) => {
    ctx.reply(`🛠️ **COMANDOS DE CONTROL**\n\n` +
              `/status - Ver salud del sistema\n` +
              `/aprender - Calibrar los 10 mercados\n` +
              `/lote [valor] - Cambiar lotaje (Ej: /lote 0.02)\n` +
              `/stop - Detener radar (Pánico)\n` +
              `/go - Reanudar radar\n` +
              `/limpiar - Borrar historial viejo de la DB`);
});

// --- COMANDO /LOTE ---
bot.command('lote', (ctx) => {
    const nuevoLote = ctx.message.text.split(' ')[1];
    if (nuevoLote) {
        lotajeManual = nuevoLote;
        ctx.reply(`📏 Lotaje actualizado a: ${lotajeManual}`);
    } else {
        ctx.reply(`Lote actual: ${lotajeManual}. Use /lote [valor] para cambiarlo.`);
    }
});

// --- COMANDO /STOP y /GO ---
bot.command('stop', (ctx) => { radarActivo = false; ctx.reply("🛑 Radar DETENIDO."); });
bot.command('go', (ctx) => { radarActivo = true; ctx.reply("🚀 Radar REANUDADO."); });

// --- COMANDO /APRENDER ---
bot.command('aprender', async (ctx) => {
    const total = config.STRATEGY.RADAR_ASSETS.length;
    await ctx.reply(`🧠 Calibrando ${total} mercados...`);
    for (const asset of config.STRATEGY.RADAR_ASSETS) {
        await supabase.from('learning_db').insert([{ asset, price: 0, created_at: new Date() }]);
    }
    ctx.reply("✅ Mercados listos.");
});

// --- COMANDO /STATUS ---
bot.command('status', (ctx) => {
    ctx.reply(`🛰️ **STATUS**\nRadar: ${radarActivo ? '✅' : '🛑'}\nLote: ${lotajeManual}\nActivos: 10\nSpread Max: ${config.STRATEGY.MAX_SPREAD_ALLOWED}`);
});

// --- COMANDO /LIMPIAR (Mantenimiento) ---
bot.command('limpiar', async (ctx) => {
    const { error } = await supabase.from('learning_db').delete().lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    ctx.reply(error ? "❌ Error al limpiar" : "🧹 Historial antiguo eliminado.");
});

// --- LÓGICA DEL RADAR + PRE-ALERTA ---
async function executarRadar() {
    if (!radarActivo) return;

    for (const assetId of config.STRATEGY.RADAR_ASSETS) {
        try {
            const response = await axios.get(`${process.env.BROKER_URL}/quote?symbol=${assetId}`);
            if (!response.data) continue;
            const { price, spread } = response.data;

            const signal = await engine.analyze(supabase, parseFloat(price), assetId, parseInt(spread));

            // 📢 1. LÓGICA DE PRE-ALERTA (Confianza entre 60% y 69%)
            if (signal.action !== "WAIT" && signal.probability >= 60 && signal.probability < config.STRATEGY.MIN_CONFIDENCE) {
                const preAlerta = `⚠️ **PRE-ALERTA: ${signal.assetName}**\n` +
                                  `El mercado está ganando fuerza ${signal.action}. Esté atento al gráfico.`;
                await bot.telegram.sendMessage(process.env.CHAT_ID, preAlerta, { parse_mode: 'Markdown' });
            }

            // 🎯 2. LÓGICA DE SEÑAL CONFIRMADA (Confianza >= 70%)
            if (signal.action !== "WAIT" && signal.probability >= config.STRATEGY.MIN_CONFIDENCE) {
                const alerta = `🎯 **ENTRADA CONFIRMADA: ${signal.assetName}**\n\n` +
                               `💰 Orden: **${signal.action}**\n` +
                               `🔥 Confianza: ${signal.probability}%\n` +
                               `💵 Precio: ${signal.price}\n\n` +
                               `📏 Lote Sugerido: ${lotajeManual}\n` +
                               `⛔ SL: ${signal.risk.sl}\n` +
                               `✅ TP: ${signal.risk.tp}`;
                await bot.telegram.sendMessage(process.env.CHAT_ID, alerta, { parse_mode: 'Markdown' });
            }

            // Guardar para aprendizaje
            await supabase.from('learning_db').insert([{ asset: assetId, price: parseFloat(price) }]);
        } catch (err) { console.log(`Error en ${assetId}`); }
    }
}

// SERVER EXPRESS
const app = express();
app.get('/', (req, res) => res.send('Sniper V6 Online'));
app.listen(process.env.PORT || 10000);

bot.launch();
setInterval(executarRadar, config.POLLING_INTERVAL);
                
