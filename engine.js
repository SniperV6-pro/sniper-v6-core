async function analyze(supabase, asset, currentPrice, spread) {
  try {
    // Obtener los últimos 20 precios para análisis de velas de 15 min
    const { data: prices, error } = await supabase
      .from('learning_db')
      .select('price')
      .eq('asset', asset)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    // Sin datos no hay trading: Silencio absoluto si <20 precios
    if (prices.length < 20) {
      return { action: 'SILENCE', probability: 0, price: currentPrice, risk: { sl: 0, tp: 0, lot: 0 }, direction: null };
    }

    const priceValues = prices.map(p => p.price);
    const avg = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
    const variance = priceValues.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / priceValues.length;
    const stdDev = Math.sqrt(variance);
    const confidence = Math.max(0, Math.min(100, 100 - (stdDev / avg * 100))); // Confianza base

    let action = 'WAIT';
    let direction = null;
    if (spread > 100) {
      action = 'WAIT_SPREAD';
    } else if (confidence >= 85) { // Entrada confirmada
      action = 'ENTRADA';
      direction = currentPrice > avg ? 'COMPRA' : 'VENTA';
    } else if (confidence >= 70) { // Pre-alerta
      action = 'PRE-ALERTA';
      direction = currentPrice > avg ? 'COMPRA' : 'VENTA';
    }

    // Riesgo para scalping: SL 1%, TP 2%
    let sl, tp;
    if (direction === 'COMPRA') {
      sl = currentPrice * 0.99; // -1%
      tp = currentPrice * 1.02; // +2%
    } else if (direction === 'VENTA') {
      sl = currentPrice * 1.01; // +1%
      tp = currentPrice * 0.98; // -2%
    } else {
      sl = 0;
      tp = 0;
    }
    const lot = 1; // Ajustable desde index.js

    return { action, probability: confidence, price: currentPrice, risk: { sl, tp, lot }, direction };
  } catch (err) {
    console.error(`Error en engine para ${asset}:`, err.message);
    return { action: 'ERROR', probability: 0, price: currentPrice, risk: { sl: 0, tp: 0, lot: 0 }, direction: null };
  }
}

module.exports = { analyze };
