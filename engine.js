const config = require('./config');

class TradingEngine {
    /**
     * Analiza la dirección del mercado basada en Capa de Aprendizaje
     */
    async processMarketData(supabase, currentMarketData) {
        const { price } = currentMarketData;

        // Recuperar historial para análisis técnico profundo
        const { data, error } = await supabase
            .from('learning_db')
            .select('price')
            .order('created_at', { ascending: false })
            .limit(config.STRATEGY.LOOKBACK_PERIODS);

        if (error || !data || data.length < 5) {
            return { action: 'INITIALIZING', reason: 'Recolectando datos de mercado...' };
        }

        const priceHistory = data.map(d => d.price);
        const sma = priceHistory.reduce((a, b) => a + b, 0) / priceHistory.length;
        
        // Cálculo de Momentum
        const previousPrice = priceHistory[0];
        const momentum = price - sma;

        // Lógica de Confluencia Sniper V6
        let signal = 'NEUTRAL';
        let probability = 'LOW';

        if (price > sma && price > previousPrice) {
            signal = 'BUY 📈';
            probability = momentum > config.STRATEGY.VOLATILITY_THRESHOLD ? 'HIGH' : 'MEDIUM';
        } else if (price < sma && price < previousPrice) {
            signal = 'SELL 📉';
            probability = Math.abs(momentum) > config.STRATEGY.VOLATILITY_THRESHOLD ? 'HIGH' : 'MEDIUM';
        }

        return {
            asset: config.STRATEGY.ASSET,
            price: price.toFixed(2),
            signal: signal,
            confidence: probability,
            riskManagement: {
                lot: config.ACCOUNT.LOT_SIZE,
                sl: (price + (signal === 'BUY 📈' ? -config.ACCOUNT.RISK_PER_TRADE : config.ACCOUNT.RISK_PER_TRADE)).toFixed(2),
                tp: (price + (signal === 'BUY 📈' ? 3.0 : -3.0)).toFixed(2)
            },
            analysis: {
                sma: sma.toFixed(2),
                deviation: momentum.toFixed(4)
            }
        };
    }
}

module.exports = new TradingEngine();
