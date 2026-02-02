async function analyze(supabase, asset, currentPrice, spread) {
  try {
    // Obtener los últimos precios de Supabase
    const { data: prices, error } = await supabase
      .from('learning_db')
      .select('price')
      .eq('asset', asset)
      .order('created_at', { ascending: false })
      .limit(20); // Tomamos más para evaluar cantidad

    if (error) throw error;

    if (prices.length < 3) {
      return { action: 'LEARNING', probability: 0, price: currentPrice, risk: { sl: 0, tp: 0, lot: 0 }, direction: null };
    }

    const priceValues = prices.map(p => p.price);
    const avg = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
    const variance = priceValues.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / priceValues.length;
    const stdDev = Math.sqrt(variance);
    let confidence = Math.max(0, Math.min(100, 100 - (stdDev / avg * 100))); // Confianza base

    // Filtro de confianza real basado en cantidad de datos
    if (prices.length >= 3 && prices.length <= 5) {
      confidence = Math.min(confidence, 60);
    } else if (prices.length >= 6 && prices.length <= 10) {
      confidence = Math.min(confidence, 85);
    } else if (prices.length > 15) {
      // Permite 90%+ solo con +15 datos
    } else {
      confidence = Math.min(confidence, 85); // Para 11-14, clamp a 85%
    }

    let action = 'WAIT';
    let direction = null;
    if (spread > 100) {
      action = 'WAIT_SPREAD';
    } else if (confidence >= 70) {
      action = 'ENTRADA';
      // Indicador de dirección
      if (currentPrice > avg) {
        direction = 'COMPRA (BUY)';
      } else {
        direction = 'VENTA (SELL)';
      }
    } else if (confidence >= 60) {
      action = 'PRE-ALERTA';
    }

    // Riesgo ajustado: SL 1%, TP 2%
    let sl, tp;
    if (direction === 'COMPRA (BUY)') {
      sl = currentPrice * 0.99; // -1%
      tp = currentPrice * 1.02; // +2%
    } else if (direction === 'VENTA (SELL)') {
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
