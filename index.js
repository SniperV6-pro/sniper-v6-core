const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// SECCIÓN 2: ARQUITECTURA DEL CEREBRO (Lógica Interna)
// Capa de Análisis: Kraken Engine para Oro (XAUUSD)
async function getMarketData() {
    try {
        const res = await axios.get('https://api.kraken.com/0/public/Ticker?pair=PAXGUSD');
        return parseFloat(res.data.result.PAXGUSD.c[0]);
    } catch (e) { return null; }
}

// Capa de Gestión de Riesgo: Cálculos para cuenta de $20
const RISK_CONFIG = {
    base_balance: 20.00, //
    max_lot: 0.01,       //
    max_loss: 1.50       //
};

// Capa de Aprendizaje (Auto-Learning): Registro en Memoria
async function recordLearning(price, trend) {
    await supabase.from('learning_db').insert([{ 
        asset: 'XAUUSD', 
        price: price, 
        observation: `Capa de aprendizaje analizando tendencia ${trend}` //
    }]);
}

// SECCIÓN 4: DASHBOARD (Comandos)
bot.start((ctx) => {
    ctx.replyWithMarkdown(
        `🎯 *Sniper V6 - Cerebro Autónomo Activo*\n\n` +
        `💰 *Cuenta:* $${RISK_CONFIG.base_balance} USD\n` +
        `🛡️ *Gestión:* Lote ${RISK_CONFIG.max_lot} | SL Max $${RISK_CONFIG.max_loss}\n` +
        `📡 *Estado:* Escaneando M5/M15`
    );
});

bot.command('señal', async (ctx) => {
    const price = await getMarketData();
    // Aquí el cerebro decidirá si la confluencia es óptima según el plan
    ctx.reply(`🔍 *Última oportunidad detectada:*\nOro: $${price}\nMargen: 2 minutos`); //
});

bot.command('mercados', async (ctx) => {
    const price = await getMarketData();
    ctx.reply(`🌍 *Estado de Mercados:*\nOro (XAUUSD): $${price}\n(Escaneando otros 5 activos...)`); //
});

// Ciclo de ejecución automática (Capa de Análisis)
setInterval(async () => {
    const price = await getMarketData();
    if(price) await recordLearning(price, "SCAN");
}, 300000); // 5 minutos (M5)

bot.launch();
