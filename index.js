const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// SECCIÓN 1: MOTOR KRAKEN (ANÁLISIS)
async function getMarketData() {
    try {
        const res = await axios.get('https://api.kraken.com/0/public/Ticker?pair=PAXGUSD');
        return parseFloat(res.data.result.PAXGUSD.c[0]);
    } catch (e) { return null; }
}

// SECCIÓN 2: GESTIÓN DE RIESGO (PLAN $20)
const RISK = { balance: 20, lot: 0.01, sl: 1.5 }; //

// SECCIÓN 3: CAPA DE SEÑALES INTELIGENTES
bot.command('señal', async (ctx) => {
    const p = await getMarketData();
    // Consultamos los últimos 2 registros en Supabase para ver la tendencia real
    const { data } = await supabase.from('learning_db').select('price').order('created_at', {ascending: false}).limit(2);
    
    let tendencia = "🔄 ANALIZANDO M5...";
    if (data && data.length > 1) {
        tendencia = p > data[1].price ? "🟢 COMPRA (Bullish)" : "🔴 VENTA (Bearish)";
    }

    ctx.replyWithMarkdown(
        `🔍 *SNIPER V6: SEÑAL DETECTADA*\n\n` +
        `💰 Precio: $${p.toFixed(2)}\n` +
        `📈 Tendencia: *${tendencia}*\n` +
        `🛡️ Gestión: Lote ${RISK.lot} | SL $${RISK.sl}\n\n` +
        `_Margen de entrada: 2 minutos_` //
    );
});

// SECCIÓN 4: RESUMEN DE APRENDIZAJE (LOG DE NOTIFICACIONES)
bot.command('resumen', async (ctx) => {
    const { data } = await supabase.from('learning_db').select('*').order('created_at', {ascending: false}).limit(10);
    if (!data || data.length === 0) return ctx.reply("📚 Mi memoria está despertando...");

    let m = "📝 *RESUMEN DE APRENDIZAJE:*\n\n";
    data.forEach(d => {
        m += `• $${d.price} | ${new Date(d.created_at).toLocaleTimeString()}\n`;
    });
    ctx.replyWithMarkdown(m);
});

// HEARTBEAT: Registro automático cada 5 minutos
setInterval(async () => {
    const p = await getMarketData();
    if (p) await supabase.from('learning_db').insert([{ asset: 'XAUUSD', price: p }]);
}, 300000);

bot.start((ctx) => {
    ctx.replyWithMarkdown(`🎯 *Sniper V6 Activo*\n\nCuenta: $${RISK.balance}\nEstado: Patrullando Oro`);
});

bot.launch();
