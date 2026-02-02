const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_URL, SUPABASE_ANON_KEY } = require('./config');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function calculateSignal(asset, currentPrice, spread) {
  try {
    // Obtener los últimos 10 precios de Supabase
    const { data: prices, error } = await supabase
      .from('learning_db')
      .select('price')
      .eq('asset', asset)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    if (prices.length < 10) {
      return { action: 'LEARNING', probability: 0, price: currentPrice, risk: { sl: 0, tp: 0, lot: 0 } };
    }

    const priceValues = prices.map(p => p.price);
    const avg = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
    const variance = priceValues.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / priceValues.length;
    const stdDev = Math.sqrt(variance);
    const confidence = Math.max(0, Math.min(100, 100 - (stdDev / avg * 100))); // Confianza basada en desviación

    let action = 'WAIT';
    if (spread > 100) {
      action = 'WAIT_SPREAD';
    } else if (confidence >= 70) {
      action = 'ENTRADA';
    } else if (confidence >= 60) {
      action = 'PRE-ALERTA';
    }

    // Riesgo básico: SL -2%, TP +5%, lote dinámico (asumido 1 por defecto, ajustable externamente)
    const sl = currentPrice * 0.98;
    const tp = currentPrice * 1.05;
    const lot = 1; // Dinámico, se ajusta desde index.js

    return { action, probability: confidence, price: currentPrice, risk: { sl, tp, lot } };
  } catch (err) {
    console.error(`Error en engine para ${asset}:`, err.message);
    return { action: 'ERROR', probability: 0, price: currentPrice, risk: { sl: 0, tp: 0, lot: 0 } };
  }
}

module.exports = { calculateSignal };
