const config = require('./config');

const engine = {
    analyze: async (supabase, currentPrice, assetId, currentSpread = 0) => {
        try {
            if (!assetId || !config.STRATEGY.ASSET_NAMES[assetId]) return { action: "WAIT", probability: 0 };
            
            // Protección de capital por Spread alto
            if (currentSpread > config.STRATEGY.MAX_SPREAD_ALLOWED) {
                return { action: "WAIT_SPREAD", probability: 0, spread: currentSpread };
            }

            const { data: history, error } = await supabase
                .from('learning_db')
                .select('price, created_at')
                .eq('asset', assetId)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error || !history || history.length < 5) {
                return { action: "LEARNING", probability: 0, count: history ? history.length : 0 };
            }

            const prices = history.map(h => h.price);
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            const lastPrice = prices[0];

            let probability = 60; 
            let action = "WAIT";

            // Lógica Alcista
            if (currentPrice > avgPrice) {
                action = "BUY";
                probability += 15;
                if (currentPrice > lastPrice) probability += 10;
            } 
            // Lógica Bajista
            else if (currentPrice < avgPrice) {
                action = "SELL";
                probability += 15;
                if (currentPrice < lastPrice) probability += 10;
            }

            // Gestión de Riesgo
            const slDistance = currentPrice * config.STRATEGY.STOP_LOSS_PCT;
            const tpDistance = slDistance * config.STRATEGY.RISK_REWARD_RATIO;
            
            const sl = action === "BUY" ? (currentPrice - slDistance) : (currentPrice + slDistance);
            const tp = action === "BUY" ? (currentPrice + tpDistance) : (currentPrice - tpDistance);

            return {
                action,
                probability: Math.min(probability, 99),
                price: currentPrice.toFixed(5),
                risk: {
                    sl: sl.toFixed(5),
                    tp: tp.toFixed(5),
                    lot: "0.01"
                },
                assetName: config.STRATEGY.ASSET_NAMES[assetId]
            };
        } catch (err) {
            console.error(`Error Engine: ${err.message}`);
            return { action: "WAIT", probability: 0 };
        }
    }
};

module.exports = engine;
