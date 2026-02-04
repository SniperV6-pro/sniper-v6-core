function calculateRSI(prices, period) {
  const gains = [];
  const losses = [];
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }
  const avgGain = gains.reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
  return 100 - (100 / (1 + avgGain / avgLoss));
}

function calculateEMA(prices, period) {
  const multiplier = 2 / (period + 1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  return ema;
}

function calculateMACD(prices) {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;
  const signal = calculateEMA([macd], 9);
  return { macd, signal, histogram: macd - signal };
}

function calculateBollingerBands(prices, period = 20, stdDevMultiplier = 2) {
  const sma = prices.slice(-period).reduce((a, b) => a + b, 0) / period;
  const variance = prices.slice(-period).reduce((sum, p) => sum + Math.pow(p - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  return {
    upper: sma + (stdDevMultiplier * stdDev),
    middle: sma,
    lower: sma - (stdDevMultiplier * stdDev)
  };
}

async function analyze(supabase, asset, currentPrice, spread, ohlcData) {
  try {
    const prices = ohlcData.map(v => parseFloat(v[4]));

    if (prices.length < 20) {
      console.log(`[${asset}] Datos insuficientes: ${prices.length} precios`);
      return { action: 'SILENCE', probability: 0, price: currentPrice, risk: { sl: 0, tp: 0, lot: 0 }, direction: null };
    }

    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    let confidence = Math.max(0, Math.min(100, 100 - (stdDev / avg * 100)));

    const rsi = calculateRSI(prices, 14);
    const ema = calculateEMA(prices, 20);
    const { macd, signal, histogram } = calculateMACD(prices);
    const bb = calculateBollingerBands(prices);

    console.log(`[${asset}] Confianza: ${confidence.toFixed(2)}, RSI: ${rsi.toFixed(2)}, EMA: ${ema.toFixed(2)}, MACD: ${macd.toFixed(2)}, BB Middle: ${bb.middle.toFixed(2)}`);

    // Condiciones más flexibles: Al menos 2 de 3 indicadores coinciden
    let buyScore = 0;
    let sellScore = 0;

    if (currentPrice > ema) buyScore++;
    if (macd > signal) buyScore++;
    if (currentPrice > bb.middle) buyScore++;

    if (currentPrice < ema) sellScore++;
    if (macd < signal) sellScore++;
    if (currentPrice < bb.middle) sellScore++;

    let direction = null;
    if (buyScore >= 2) {
      direction = 'COMPRA';
    } else if (sellScore >= 2) {
      direction = 'VENTA';
    }

    // Boost por RSI extremo
    if (direction) {
      if ((direction === 'COMPRA' && rsi < 35) || (direction === 'VENTA' && rsi > 65)) {
        confidence += 20;  // Más boost
      }
    }

    let action = 'WAIT';
    if (spread > 100) {
      action = 'WAIT_SPREAD';
    } else if (confidence > 70 && direction) {  // Bajado a 70 para entradas
      action = 'ENTRADA';
    } else if (confidence >= 50 && direction) {  // Bajado a 50 para pre-alertas
      action = 'PRE-ALERTA';
    }

    console.log(`[${asset}] Acción: ${action}, Dirección: ${direction || 'N/A'}, Confianza Final: ${confidence.toFixed(2)}, BuyScore: ${buyScore}, SellScore: ${sellScore}`);

    let sl, tp;
    if (direction === 'COMPRA') {
      sl = currentPrice * (1 - stdDev / avg * 1.5);
      tp = currentPrice * (1 + stdDev / avg * 2);
    } else if (direction === 'VENTA') {
      sl = currentPrice * (1 + stdDev / avg * 1.5);
      tp = currentPrice * (1 - stdDev / avg * 2);
    } else {
      sl = 0;
      tp = 0;
    }
    const lot = 1;

    return { action, probability: confidence, price: currentPrice, risk: { sl, tp, lot }, direction };
  } catch (err) {
    console.error(`Error en engine para ${asset}:`, err.message);
    return { action: 'ERROR', probability: 0, price: currentPrice, risk: { sl: 0, tp: 0, lot: 0 }, direction: null };
  }
}

module.exports = { analyze };
