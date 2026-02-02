/**
 * CTIPROV6 - ENGINE DE ANÁLISIS AUTÓNOMO
 * Lógica: Sensibilidad Extrema (5 velas) + Anti-Spread
 */

const config = require('./config');

let currentCapital = 20;

const engine = {
    // Permite actualizar el capital dinámicamente
    setCapital: (amount) => {
        currentCapital = amount;
    },

    analyze: async (supabase, currentPrice, phase, assetId, currentSpread = 0) => {
        try {
            // 1. FILTRO DE SPREAD: Si el broker sube el spread (como XRP a 344), bloqueamos la señal
            if (currentSpread > config.STRATEGY.MAX_SPREAD_ALLOWED) {
                console.log(`[Engine] BLOQUEO POR SPREAD: ${assetId} con ${currentSpread} puntos.`);
                return { action: "WAIT_SPREAD", probability: 0, price: currentPrice };
            }

            // 2. OBTENCIÓN DE DATOS HISTÓRICOS (Memoria Ultra-Rápida de 5 velas)
            const { data: history, error } = await supabase
                .from('learning_db')
                .select('price')
                .eq('asset', assetId)
                .order('created_at', { ascending: false })
                .limit(5);

            // 3. AUTONOMÍA DE APRENDIZAJE: Si faltan datos, el bot NO se detiene.
            // Simplemente reporta INITIALIZING y guarda el precio actual para "aprender" solo.
            if (error || !history || history.length < 2) {
                return { 
                    action: "INITIALIZING", 
                    probability: 0, 
                    price: currentPrice,
                    status: "Auto-aprendiendo mercado..." 
                };
            }

            // 4. CÁLCULO DE TENDENCIA DINÁMICA
            const avgPrice = history.reduce((sum, row) => sum + row.price, 0) / history.length;
            const lastPrice = history[0].price;

            let action = "WAIT";
            let probability = 65; // Base agresiva para activar señales rápido
            let trend = currentPrice > avgPrice ? "ALCISTA" : "BAJISTA";

            // Lógica de cruce de precio vs media de 5 periodos
            if (currentPrice > avgPrice) {
                action = "BUY";
                probability += 20; 
            } else if (currentPrice < avgPrice) {
                action = "SELL";
                probability += 20;
            }

            // Bono de confirmación de vela (Lo que ves en MT5)
            if ((action === "BUY" && currentPrice > lastPrice) || 
                (action === "SELL" && currentPrice < lastPrice)) {
                probability += 10;
            }

            // 5. PARÁMETROS DE EJECUCIÓN (Gestión de Riesgo)
            const lot = 0.01; 
            const slDistance = currentPrice * config.STRATEGY.STOP_LOSS_PCT;
            const tpDistance = slDistance * config.STRATEGY.RISK_REWARD_RATIO;

            const sl = action === "BUY" ? (currentPrice - slDistance) : (currentPrice + slDistance);
            const tp = action === "BUY" ? (currentPrice + tpDistance) : (currentPrice - tpDistance);

            // Aseguramos que la probabilidad no exceda el 99%
            if (probability > 99) probability = 99;

            return {
                action,
                probability,
                price: parseFloat(currentPrice).toFixed(5),
                context: {
                    trend,
                    avg: parseFloat(avgPrice).toFixed(5),
                    spread: currentSpread,
                    assetName: config.STRATEGY.ASSET_NAMES[assetId] || assetId
                },
                risk: {
                    lot: lot.toFixed(2),
                    sl: parseFloat(sl).toFixed(5),
                    tp: parseFloat(tp).toFixed(5),
                    capital: currentCapital
                }
            };
        } catch (e) {
            console.error(`[Engine Critical Error] en ${assetId}:`, e.message);
            return { action: "ERROR", probability: 0, price: currentPrice };
        }
    }
};

module.exports = engine;
                                                                         
