const config = require('./config');
let currentCapital = 20;

const engine = {
    setCapital: (amount) => { currentCapital = amount; },

    analyze: async (supabase, currentPrice, phase, assetId, currentSpread = 0) => {
        try {
            // Blindaje contra activos no configurados
            if (!assetId || !config.STRATEGY.ASSET_NAMES[assetId]) {
                return { action: "WAIT", probability: 0, price: currentPrice };
            }

            // Filtro de spread
            if (currentSpread > config.STRATEGY.MAX_SPREAD_ALLOWED) {
                return { action: "WAIT", probability: 0, price: currentPrice };
            }

            const { data: history, error } = await supabase
                .from('learning_db')
                .select('price')
                .eq('asset', assetId)
                .order('created_at', { ascending: false })
                .limit(5);

            // Si no hay datos, retorna WAIT en lugar de error para que el scanner aprenda solo
            if (error || !history || history.length < 2) {
                return { action: "WAIT", probability: 0, price: currentPrice };
            }

            const avgPrice = history.reduce((sum, row) => sum + row.price, 0) / history.length;
            const lastPrice = history[0].price;

            let action = "WAIT";
            let probability = 65;
            let trend = currentPrice > avgPrice ? "ALCISTA" : "BAJISTA";

            if (currentPrice > avgPrice) { action = "BUY"; probability += 20; }
            else if (currentPrice < avgPrice) { action = "SELL"; probability += 20; }

            if ((action === "BUY" && currentPrice > lastPrice) || 
                (action === "SELL" && currentPrice < lastPrice)) {
                probability += 10;
            }

            const slDistance = currentPrice * config.STRATEGY.STOP_LOSS_PCT;
            const tpDistance = slDistance * config.STRATEGY.RISK_REWARD_RATIO;

            return {
                action,
                probability: probability > 99 ? 99 : probability,
                price: parseFloat(currentPrice).toFixed(5),
                context: { trend, avg: parseFloat(avgPrice).toFixed(5), spread: currentSpread, name: config.STRATEGY.ASSET_NAMES[assetId] },
                risk: {
                    lot: "0.01",
                    sl: (action === "BUY" ? currentPrice - slDistance : currentPrice + slDistance).toFixed(5),
                    tp: (action === "BUY" ? currentPrice + tpDistance : currentPrice - tpDistance).toFixed(5),
                    capital: currentCapital
                }
            };
        } catch (e) {
            return { action: "WAIT", probability: 0, price: currentPrice };
        }
    }
};

module.exports = engine;
