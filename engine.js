const config = require('./config');

const engine = {
    analyze: async (supabase, currentPrice, assetId, currentSpread = 0) => {
        try {
            if (!assetId || !config.STRATEGY.ASSET_NAMES[assetId]) return { action: "WAIT", probability: 0 };
            if (currentSpread > config.STRATEGY.MAX_SPREAD_ALLOWED) return { action: "WAIT", probability: 0 };

            const { data: history, error } = await supabase
                .from('learning_db')
                .select('price')
                .eq('asset', assetId)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error || !history || history.length < 5) return { action: "WAIT", probability: 0 };

            const prices = history.map(h => h.price);
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            const lastPrice = prices[0];

            let probability = 60; 
            let action = "WAIT";

            if (currentPrice > avgPrice) {
                action = "BUY";
                probability += 20;
                if (currentPrice > lastPrice) probability += 10;
            } else if (currentPrice < avgPrice) {
                action = "SELL";
                probability += 20;
                if (currentPrice < lastPrice) probability += 10;
            }

            const slDist = currentPrice * config.STRATEGY.STOP_LOSS_PCT;
            const tpDist = slDist * config.STRATEGY.RISK_REWARD_RATIO;

            return {
                action,
                probability: Math.min(probability, 99),
                price: currentPrice.toFixed(5),
                risk: {
                    sl: (action === "BUY" ? currentPrice - slDist : currentPrice + slDist).toFixed(5),
                    tp: (action === "BUY" ? currentPrice + tpDist : currentPrice - tpDist).toFixed(5),
                    lot: "0.01"
                },
                assetName: config.STRATEGY.ASSET_NAMES[assetId]
            };
        } catch (err) { return { action: "WAIT", probability: 0 }; }
    }
};

module.exports = engine;
