const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// --- SECCIÓN 1: MOTOR DE DATOS (PLAN V6) ---
async function fetchPrice() {
    try {
        const res = await axios.get('https://api.kraken.com/0/public/Ticker?pair=PAXGUSD');
        return parseFloat(res.data.result.PAXGUSD.c[0]);
    } catch (e) { return null; }
}

// --- SECCIÓN 2: CAPA DE ANÁLISIS Y SEÑALES ---
bot.command('señal', async (ctx) => {
    const p = await fetchPrice();
    if (!p) return ctx.reply("❌ Error de motor.");
    
    // El bot consulta los últimos 2 registros en Supabase para ver la tendencia
    const { data } = await supabase.from('learning_db').select('price').order('created_at', {ascending: false}).limit(2);
    
    let tendencia = "🔄 NEUTRAL (Esperando M5)";
    if (data && data.length > 1) {
        tendencia = p > data[1].price ? "🟢 COMPRA (Bullish)" : "🔴 VENTA (Bearish)";
    }

    ctx.replyWithMarkdown(`🔍 *SNIPER V6: SEÑAL DE ENTRADA*\n\n💰 Precio: $${p.toFixed(2)}\n📈 Tendencia: *${tendencia}*\n🛡️ Riesgo: 0.01 Lote ($20 Base)\n🛑 Stop Loss: $1.50`);
});

// --- SECCIÓN 3: CAPA DE APRENDIZAJE (RESUMEN) ---
bot.command('resumen', async (ctx) => {
    const { data } = await supabase.from('learning_db').select('*').order('created_at', {ascending: false}).limit(10);
    
    if (!data || data.length === 0) return ctx.reply("📚 Memoria vacía. Escaneando...");

    let m = "📝 *HISTORIAL DE APRENDIZAJE (M5):*\n\n";
    data.forEach(d => {
        m += `• $${d.price} | ${new Date(d.created_at).toLocaleTimeString()}\n`;
    });
    ctx.replyWithMarkdown(m);
});

// --- SECCIÓN 4: AUTOMATIZACIÓN (CEREBRO) ---
setInterval(async () => {
    const p = await fetchPrice();
    if (p) {
        await supabase.from('learning_db').insert([{ asset: 'XAUUSD', price: p }]);
    }
}, 300000); // Registro cada 5 minutos

bot.launch();
console.log("✅ Sniper V6: Motor Render funcionando. Koyeb descartado.");
