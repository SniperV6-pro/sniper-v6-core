const tf = require('@tensorflow/tfjs');

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

let mlModel;
async function trainMLModel(historicalData) {
  const inputs = historicalData.map(d => [d.price, d.confidence, d.rsi, d.macd]);
  const outputs = historicalData.map(d => d.win ? 1 : 0);
  const inputTensor = tf.tensor3d([inputs], [1, inputs.length, 4]);
  const outputTensor = tf.tensor2d(outputs, [outputs.length, 1]);

  mlModel = tf.sequential();
  mlModel.add(tf.layers.lstm({ inputShape: [inputs.length, 4], units: 50, returnSequences: false }));
  mlModel.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
  mlModel.compile({ optimizer: 'adam', loss: 'binaryCrossentropy', metrics: ['accuracy'] });

  await mlModel.fit(inputTensor, outputTensor, { epochs: 20 });
}

async function analyze(supabase, asset, currentPrice, spread) {
  try {
    const { data: prices, error } = await supabase
      .from('learning_db')
      .select('price')
      .eq('asset', asset)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    if (prices.length < 20) {
      return { action: 'SILENCE', probability: 0, price: currentPrice, risk: { sl: 0, tp: 0, lot: 0 }, direction: null };
    }

    const priceValues = prices.map(p => p.price);
    const avg = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
    const variance = priceValues.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / priceValues.length;
    const stdDev = Math.sqrt(variance);
    let confidence = Math.max(0, Math.min(100, 100 - (stdDev / avg * 100)));

    const rsi = calculateRSI(priceValues, 14);
    const ema = calculateEMA(priceValues, 20);
    const { macd, signal, histogram } = calculateMACD(priceValues);
    const bb = calculateBollingerBands(priceValues);

    let direction = null;
    if (currentPrice > ema && macd > signal && currentPrice > bb.middle) {
      direction = 'COMPRA';
    } else if (currentPrice < ema && macd < signal && currentPrice < bb.middle) {
      direction = 'VENTA';
    }

    if (direction) {
      if ((direction === 'COMPRA' && rsi < 30) || (direction === 'VENTA' && rsi > 70)) {
        confidence += 15;
      }
    }

    let mlPrediction = 0.5;
    if (mlModel) {
      const prediction = mlModel.predict(tf.tensor3d([[priceValues.slice(-20), confidence, rsi, macd]], [1, 20, 4]));
      mlPrediction = prediction.dataSync()[0];
      confidence = (confidence + mlPrediction * 100) / 2;
    }

    let action = 'WAIT';
    if (spread > 100) {
      action = 'WAIT_SPREAD';
    } else if (confidence > 85 && direction) {
      action = 'ENTRADA';
    } else if (confidence >= 70 && direction) {
      action = 'PRE-ALERTA';
    }

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

module.exports = { analyze, trainMLModel };
