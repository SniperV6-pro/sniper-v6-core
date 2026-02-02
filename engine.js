const tf = require('@tensorflow/tfjs');  // Para ML básico

// Función para calcular RSI
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

// Función para calcular EMA
function calculateEMA(prices, period) {
  const multiplier = 2 / (period + 1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  return ema;
}

// Modelo ML simple para predecir win/loss (entrenado con datos históricos)
let mlModel;
async function trainMLModel(historicalData) {
  // Simulación: Entrena con precios y resultados previos
  const inputs = historicalData.map(d => [d.price, d.confidence]);
  const outputs = historicalData.map(d => d.win ? 1 : 0);
  const inputTensor = tf.tensor2d(inputs);
  const outputTensor = tf.tensor2d(outputs, [outputs.length, 1]);

  mlModel = tf.sequential();
  mlModel.add(tf.layers.dense({ inputShape: [2], units: 10, activation: 'relu' }));
  mlModel.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
  mlModel.compile({ optimizer: 'adam', loss: 'binaryCrossentropy', metrics: ['accuracy'] });

  await mlModel.fit(inputTensor, outputTensor, { epochs: 10 });
}

async function analyze(supabase, asset, currentPrice, spread) {
  try {
    const { data: prices, error } = await supabase
      .from('learning_db')
      .select('price')
      .eq('asset', asset)
      .order('created_at', { ascending: false })
      .limit(50);  // Más datos para indicadores

    if (error) throw error;

    if (prices.length < 20) {
      return { action: 'SILENCE', probability: 0, price: currentPrice, risk: { sl: 0, tp: 0, lot: 0 }, direction: null };
    }

    const priceValues = prices.map(p => p.price);
    const avg = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
    const variance = priceValues.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / priceValues.length;
    const stdDev = Math.sqrt(variance);
    let confidence = Math.max(0, Math.min(100, 100 - (stdDev / avg * 100)));

    // Indicadores adicionales
    const rsi = calculateRSI(priceValues, 14);
    const ema = calculateEMA(priceValues, 20);

    // Ajuste de confianza con indicadores
    if ((currentPrice > avg && rsi < 30) || (currentPrice < avg && rsi > 70)) {
      confidence += 10;  // Boost si confirma sobreventa/sobrecompra
    }

    // Predicción ML (si modelo entrenado)
    let mlPrediction = 0.5;
    if (mlModel) {
      const prediction = mlModel.predict(tf.tensor2d([[currentPrice, confidence]]));
      mlPrediction = prediction.dataSync()[0];
      confidence = (confidence + mlPrediction * 100) / 2;  // Promedio con ML
    }

    let action = 'WAIT';
    let direction = null;
    if (spread > 100) {
      action = 'WAIT_SPREAD';
    } else if (confidence > 85) {
      action = 'ENTRADA';
      direction = currentPrice > ema ? 'COMPRA' : 'VENTA';  // Usa EMA para dirección
    } else if (confidence >= 70) {
      action = 'PRE-ALERTA';
      direction = currentPrice > ema ? 'COMPRA' : 'VENTA';
    }

    // SL/TP dinámicos basados en volatilidad
    const volatilityFactor = stdDev / avg;
    let sl, tp;
    if (direction === 'COMPRA') {
      sl = currentPrice * (1 - volatilityFactor * 1.5);  // SL más amplio si volátil
      tp = currentPrice * (1 + volatilityFactor * 2);
    } else if (direction === 'VENTA') {
      sl = currentPrice * (1 + volatilityFactor * 1.5);
      tp = currentPrice * (1 - volatilityFactor * 2);
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

module.exports = { analyze, trainMLModel };
