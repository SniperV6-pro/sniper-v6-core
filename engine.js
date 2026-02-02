const config = require('./config');

let currentCapital = 20; // Capital por defecto configurado por el usuario

const engine = {
    // Permite que el comando /capital actualice el valor en tiempo real
    setCapital: (amount) => {
        currentCapital = amount;
    },

    analyze: async (supabase, currentPrice, phase, assetId) => {
        try {
            // 1. Recuperar historial para calcular media móvil
            const { data: history, error } = await supabase
                .from('learning_db')
                .select('price')
                .eq('asset', assetId)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error || !history || history.length < 2) {
                return { action: "WAIT", probability: 0, price: currentPrice };
            }

            const avgPrice = history.reduce((sum, row) => sum + row.price, 0) / history.length;
            const lastPrice = history[0].price;

            let action = "WAIT";
            let probability = 55; // Base de probabilidad más alta para facilitar disparos
            let trend = "NEUTRAL";

            // 2. Lógica de Dirección (Flexibilizada)
            if (currentPrice > avgPrice) {
                action = "BUY";
                trend = "ALCISTA";
                probability += 20; 
            } else if (currentPrice < avgPrice) {
                action = "SELL";
                trend = "BAJISTA";
                probability += 20;
            }

            // 3. Plus por Impulso (Si el precio actual supera al anterior)
            if ((action === "BUY" && currentPrice > lastPrice) || 
                (action === "SELL" && currentPrice < lastPrice)) {
                probability += 10;
            }

            // 4. Gestión de Riesgo (Calculada sobre el Capital Real)
            // Lote mínimo estándar 0.01 para cuentas pequeñas ($20)
            const lot = 0.01; 
            
            // Cálculo de niveles técnicos (SL y TP)
            const slDistance = currentPrice * config.STRATEGY.STOP_LOSS_PCT;
            const tpDistance = slDistance * config.STRATEGY.RISK_REWARD_RATIO;

            const sl = action === "BUY" ? (currentPrice - slDistance) : (currentPrice + slDistance);
            const tp = action === "BUY" ? (currentPrice + tpDistance) : (currentPrice - tpDistance);

            // Ajuste final de probabilidad para no exceder 99%
            if (probability > 99) probability = 99;

            return {
                action,
                probability,
                price: currentPrice.toFixed(2),
                context: {
                    trend,
                    avg: avgPrice.toFixed(2),
                    diff: (currentPrice - avgPrice).toFixed(2)
                },
                risk: {
                    lot: lot.toFixed(2),
                    sl: sl.toFixed(2),
                    tp: tp.toFixed(2),
                    capital: currentCapital
                }
            };
        } catch (e) {
            console.error("Error en Engine:", e.message);
            return { action: "ERROR", probability: 0, price: currentPrice };
        }
    }
};

module.exports = engine;
