const { getPrice } = require('./scanner');
const config = require('./config');

async function analyzeTrade(supabase) {
    const currentPrice = await getPrice();
    const { data } = await supabase.from('learning_db')
        .select('price')
        .order('created_at', { ascending: false })
        .limit(3);

    if (!data || data.length < 2) return { action: 'WAIT', price: currentPrice };

    // Lógica de Confluencia M5/M15
    const avgPrice = data.reduce((acc, val) => acc + val.price, 0) / data.length;
    let signal = 'NEUTRAL';

    if (currentPrice > avgPrice) signal = 'BUY 📈';
    if (currentPrice < avgPrice) signal = 'SELL 📉';

    return {
        action: signal,
        price: currentPrice,
        lot: config.RISK.LOT,
        sl: config.RISK.MAX_LOSS
    };
}

module.exports = { analyzeTrade };
