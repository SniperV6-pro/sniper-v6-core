require('dotenv').config();
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-client');
const config = require('./config');
const engine = require('./engine');
const axios = require('axios'); // Para capturar precios si usas API

// --- INICIALIZACIÓN ---
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Variable para el estado del radar
let radarActivo = true;

// --- FUNCIONES DE SOPORTE (CONEXIÓN AL BROKER) ---
async function obtenerDatosMercado(asset) {
    try {
        // NOTA: Aquí debe ir tu URL o lógica real de captura de datos del MT5/Broker
        // Por ahora, implementamos una estructura segura para el Engine
        const response = await axios.get(`${process.env.BROKER_URL}/quote?symbol=${asset}`);
        return {
            price: parseFloat(response.data.price),
            spread: parseInt(response.data.spread)
        };
    } catch (error) {
        // Si el broker falla para un activo, devolvemos null para que el radar no explote
        return null;
    }
}

// --- COMANDO /APRENDER (AHORA PARA 10 MERCADOS) ---
bot.command('aprender', async (ctx) => {
    const total = config.STRATEGY.RADAR_ASSETS.length;
    await ctx.reply(`🧠 Sniper V6: Iniciando calibración de ${total} mercados...`);

    try {
        for (const asset of config.STRATEGY.RADAR_ASSETS) {
            const data = await obtenerDatosMercado(asset);
            if (data) {
                await supabase.from('learning_db').insert([{ 
                    asset: asset, 
                    price: data.price,
                    created_at: new Date() 
                }]);
            }
        }
        await ctx.reply(`✅ Calibración exitosa. Abanico de ${total} activos sincronizado.`);
    } catch (error) {
        console.error("Error en calibración:", error);
        await ctx.reply("❌ Error en calibración manual. El bot usará el auto-aprendizaje cada minuto.");
    }
});

// --- COMANDO /STATUS ---
bot.command('status', async (ctx) => {
    const total = config.STRATEGY.RADAR_ASSETS.length;
    const lista = config.STRATEGY.RADAR_ASSETS.join(', ');
    await ctx.reply(`🛰️ **ESTADO DEL RADAR**\n\n✅ Mercados Monitoreados: ${total}\n🛡️ Filtro Spread: ${config.STRATEGY.MAX_SPREAD_ALLOWED} pts\n📈 Activos: ${lista}\n🚀 Sistema: Operativo`);
});

// --- EL RADAR (ESCÁNER DINÁMICO) ---
async function ejecutarRadar() {
    if (!radarActivo) return;

    console.log(`[${new Date().toLocaleTimeString()}] Escaneando abanico de 10 mercados...`);

    for (const assetId of config.STRATEGY.RADAR_ASSETS) {
        try {
            const data = await obtenerDatosMercado(assetId);
            
            if (!data) {
                console.log(`⚠️ No se pudo obtener datos de ${assetId}. Saltando...`);
                continue;
            }

            // Llamada al Engine con blindaje
            const analysis = await engine.analyze(
                supabase, 
                data.price, 
                "LIVE", 
                assetId, 
                data.spread
            );

            // Si el Engine da una señal válida (BUY/SELL) y pasa el filtro de confianza
            if (analysis.action !== "WAIT" && analysis.probability >= config.STRATEGY.MIN_CONFIDENCE) {
                const mensaje = `🎯 **SEÑAL CONFIRMADA**\n\n` +
                                `💎 Activo: ${config.STRATEGY.ASSET_NAMES[assetId]}\n` +
                                `💰 Orden: **${analysis.action}**\n` +
                                `🔥 Confianza: ${analysis.probability}%\n` +
                                `💵 Precio: ${analysis.price}\n\n` +
                                `🛡️ **GESTIÓN DE RIESGO**\n` +
                                `📏 Lote: ${analysis.risk.lot}\n` +
                                `⛔ Stop Loss: ${analysis.risk.sl}\n` +
                                `✅ Take Profit: ${analysis.risk.tp}\n\n` +
                                `⚠️ Spread actual: ${data.spread} pts`;

                await bot.telegram.sendMessage(process.env.CHAT_ID, mensaje, { parse_mode: 'Markdown' });
            }

            // Auto-aprendizaje: Guardamos el precio en cada ciclo para la media móvil
            await supabase.from('learning_db').insert([{ 
                asset: assetId, 
                price: data.price 
            }]);

        } catch (error) {
            console.error(`❌ Error analizando ${assetId}:`, error.message);
        }
    }
}

// --- SERVIDOR PARA RENDER (KEEP ALIVE) ---
const express = require('express');
const server = express();
server.get('/', (req, res) => res.send('Sniper V6 Core: Running 10 Markets'));
server.listen(process.env.PORT || 10000, () => console.log('🚀 Server Live'));

// --- LANZAMIENTO ---
bot.launch();
setInterval(ejecutarRadar, config.POLLING_INTERVAL);

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
           
