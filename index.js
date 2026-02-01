const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

let lastPrice = null;

// Motor Kraken - Precisión XAU/USD
async function getGoldPrice() {
    try {
        const response = await axios.get('https://api.kraken.com/0/public/Ticker?pair=PAXGUSD');
        return parseFloat(response.data.result.PAXGUSD.c[0]);
    } catch (error) {
        return null;
    }
}

// EL PLAN: Monitor Autónomo cada 5 minutos (M5)
async function scanMarket() {
    const currentPrice = await getGoldPrice();
    if (!currentPrice) return;

    // 1. Guardar en Supabase para el historial de aprendizaje
    await supabase.from('learning_db').insert([{ 
        asset: 'XAUUSD', 
        price: currentPrice, 
        timestamp: new Date() 
    }]);

    // 2. Lógica de Alerta por Volatilidad (Scalping)
    if (lastPrice) {
        const diff = Math.abs(currentPrice - lastPrice);
        if (diff >= 5) { // Alerta si se mueve $5 o más
            const emoji = currentPrice > lastPrice ? '🚀' : '🔻';
            bot.telegram.sendMessage(process.env.CHAT_ID || 'TU_CHAT_ID', 
                `⚠️ *ALERTA DE VOLATILIDAD*\n\nInstrumento: Oro (XAU/USD)\nPrecio Actual: $${currentPrice.toFixed(2)}\nCambio: ${emoji} $${diff.toFixed(2)}\n\n_Estrategia M5 activa. Revisa gráficas._`, 
                { parse_mode: 'Markdown' }
            );
        }
    }
    lastPrice = currentPrice;
}

// Ejecutar escáner cada 5 minutos
setInterval(scanMarket, 300000);

bot.start((ctx) => {
    ctx.reply('🎯 Sniper V6 - Ejecutando Plan Maestro\n\n✅ Monitor M5/M15 Iniciado\n✅ Registro en Supabase Activo\n\nEl sistema te avisará de movimientos bruscos automáticamente.');
});

bot.launch();
console.log("🔥 Plan Maestro en marcha: Escáner M5 activado.");
