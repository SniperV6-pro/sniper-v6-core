/**
 * CTIPROV6 - ENGINE DE ANÁLISIS
 * Lógica: Turbo 5 Velas + Anti-Spread + Auto-Cura
 */

const config = require('./config');

let currentCapital = 20;

const engine = {
    setCapital: (amount) => {
        currentCapital = amount;
    },

    analyze: async (supabase, currentPrice, phase, assetId, currentSpread = 0) => {
        try {
            // 1. BLINDAJE: Evita error "undefined" si el activo es nuevo
            if (!assetId || !config.STRATEGY.ASSET_NAMES[assetId]) {
                return { action: "WAIT", probability: 0, price: currentPrice };
            }

            // 2. FILTRO DE SPREAD: Protección contra costos altos
            if (currentSpread > config.STRATEGY.MAX_SPREAD_ALLOWED) {
                return { action: "WAIT", probability: 0, price: currentPrice };
            }

            // 3. RECUPERACIÓN DE DATOS (5 velas para reacción inmediata)
            const { data: history, error } = await supabase
                .from('learning_db')
                .select('price')
                .eq('asset', assetId)
                .order('created_at', { ascending: false })
                .limit(5);

            // 4. LÓGICA DE AUTOCURA: 
            // Si faltan datos, el bot retorna WAIT y guarda en silencio. 
            // Esto elimina el "Error de Calibración" visual en Telegram.
            if (error || !history || history.length < 2) {
                return { action: "WAIT", probability: 0, price: currentPrice };
            }

            const avgPrice = history.reduce((sum, row) => sum + row.price, 0) / history.length;
            const lastPrice = history[0].price;

            let action = "WAIT";
            let probability = 65; 
            let trend = currentPrice > avgPrice ? "ALCISTA" : "BAJISTA";

            if (currentPrice > avgPrice) {
                action = "BUY";
                probability += 20; 
            } else if (currentPrice < avgPrice) {
                action = "SELL";
                probability += 20;
            }

            if ((action === "BUY" && currentPrice > lastPrice) || 
                (action === "SELL" && currentPrice < lastPrice)) {
                probability += 10;
            }

            // 5. GESTIÓN DE RIESGO
            const lot = 0.01; 
            const slDistance = currentPrice * config.STRATEGY.STOP_LOSS_PCT;
            const tpDistance = slDistance * config.STRATEGY.RISK_REWARD_RATIO;

            const sl = action === "BUY" ? (currentPrice - slDistance) : (currentPrice + slDistance);
            const tp = action === "BUY" ? (currentPrice + tpDistance) : (currentPrice - tpDistance);

            return {
                action,
                probability: probability > 99 ? 99 : probability,
                price: parseFloat(currentPrice).toFixed(5),
                context: {
                    trend,
                    avg: parseFloat(avgPrice).toFixed(5),
                    spread: currentSpread || 0,
                    name: config.STRATEGY.ASSET_NAMES[assetId]
                },
                risk: {
                    lot: lot.toFixed(2),
                    sl: parseFloat(sl).toFixed(5),
                    tp: parseFloat(tp).toFixed(5),
                    capital: currentCapital
                }
            };
        } catch (e) {
            return { action: "WAIT", probability: 0, price: currentPrice };
        }
    }
};

module.exports = engine;
            
