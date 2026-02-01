const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const { analyzeTrade } = require('./engine');
const { getPrice } = require('./scanner');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Registro de Aprendizaje Autónomo
setInterval(async () => {
    const p = await getPrice();
    if (p) await supabase.from('learning_db').insert([{ asset: 'XAUUSD', price: p }]);
}, 300000);

bot.command('señal', async (ctx) => {
    const analysis = await analyzeTrade(supabase);
    ctx.replyWithMarkdown(`🎯 *SNIPER V6 - SEÑAL*\n\n💰 Precio: $${analysis.price}\n📊 Acción: *${analysis.action}*\n🛡️ Lote: ${analysis.lot}\n🛑 SL: $${analysis.sl}`);
});

bot.launch({ dropPendingUpdates: true });
