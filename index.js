require('dotenv').config();
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');
const scanner = require('./scanner');
const engine = require('./engine');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- CICLO DE TRABAJO AUTÓNOMO (24/7) ---
async function coreCycle() {
    console.log(`[${new Date().toLocaleTimeString()}] Iniciando escaneo de ciclo...`);
    const marketData = await scanner.getValidatedPrice();
    
    if (marketData) {
        // Guardar en Supabase (Capa de Aprendizaje)
        await supabase.from('learning_db').insert([{ 
            asset: config.STRATEGY.ASSET, 
            price: marketData.price,
            metadata: { spread: marketData.spread }
        }]);

        // Análisis proactivo (Alertar si la confianza es ALTA)
        const analysis = await engine.processMarketData(supabase, marketData);
        if (analysis.confidence === 'HIGH') {
            bot.telegram.sendMessage(process.env.CHAT_ID, 
                `🔥 *ALERTA SNIPER ALTA PROBABILIDAD*\n\n` +
                `Acción: ${analysis.signal}\n` +
                `Precio: $${analysis.price}\n` +
                `SL: $${analysis.riskManagement.sl}\n` +
                `Lote: ${analysis.riskManagement.lot}\n\n` +
                `_Confluencia detectada por desviación SMA._`, { parse_mode: 'Markdown' });
        }
    }
}

// Ejecución periódica según config
setInterval(coreCycle, config.SYSTEM.POLLING_INTERVAL);

// --- INTERFAZ DE COMANDOS ---
bot.start((ctx) => {
    ctx.replyWithMarkdown(
        `🎯 *SNIPER V6 ONLINE*\n\n` +
        `SISTEMA OPERATIVO BAJO PLAN DE $20\n` +
        `--------------------------\n` +
        `• Activo: ${config.STRATEGY.ASSET}\n` +
        `• Lote: ${config.ACCOUNT.LOT_SIZE}\n` +
        `• Estrategia: SMA Momentum\n\n` +
        `_Usa /señal para análisis manual o /status para diagnóstico._`
    );
});

bot.command('señal', async (ctx) => {
    const marketData = await scanner.getValidatedPrice();
    if (!marketData) return ctx.reply("❌ Error al conectar con Kraken.");
    
    const analysis = await engine.processMarketData(supabase, marketData);
    ctx.replyWithMarkdown(
        `🔍 *ANÁLISIS DE MERCADO*\n\n` +
        `💰 Precio: $${analysis.price}\n` +
        `📊 Señal: *${analysis.signal}*\n` +
        `💪 Confianza: ${analysis.confidence}\n` +
        `🛡️ Gestión: Lote ${analysis.riskManagement.lot} | SL $${analysis.riskManagement.sl}\n` +
        `📈 TP Sugerido: $${analysis.riskManagement.tp}`
    );
});

bot.command('status', (ctx) => {
    ctx.reply(`✅ Sistema OK\nIntervalo: ${config.SYSTEM.POLLING_INTERVAL/60000}min\nBase: $${config.ACCOUNT.INITIAL_BALANCE}`);
});

bot.launch({ dropPendingUpdates: true });
console.log("🚀 Sniper V6 Arquitectura Industrial Iniciada");

// 1. Importar los nuevos módulos al inicio
const { getFullMarketScan } = require('./multi_scanner');
const { calculateYield } = require('./performance');

// 2. Agregar el comando de Mercados Completo
bot.command('mercados', async (ctx) => {
    const report = await getFullMarketScan();
    ctx.replyWithMarkdown(report);
});

// 3. Agregar el comando de Rendimiento (Money Flow)
bot.command('rendimiento', async (ctx) => {
    const p = await calculateYield(supabase);
    ctx.replyWithMarkdown(`📈 *RENDIMIENTO DEL SISTEMA*\n\nVariación detectada: ${p}\nEstado de cuenta: $${config.ACCOUNT.INITIAL_BALANCE} USD`);
});

// --- LANZAMIENTO SEGURO Y EXCLUSIVO ---
bot.launch({ 
    dropPendingUpdates: true // 💡 Esto elimina mensajes viejos y fuerza la desconexión de otros servidores
}).then(() => {
    console.log("🚀 Sniper V6: Conexión Única y Segura Establecida.");
}).catch((err) => {
    console.error("❌ Fallo crítico al iniciar sesión:", err.message);
});

// Manejo de cierre profesional de procesos
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
        
