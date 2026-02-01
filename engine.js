const config = require('./config');

class CTIPROV6_Brain {
    constructor() {
        this.currentCapital = config.ACCOUNT.INITIAL_BALANCE;
    }

    setCapital(amount) { this.currentCapital = parseFloat(amount); }

    async analyze(supabase, currentPrice, phase, assetId) {
        try {
            const { data: history } = await supabase
                .from('learning_db')
                .select('price')
                .eq('asset', assetId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (!history || history.length < 10) {
                return { action: "CALIBRANDO", probability: 0, price: currentPrice, risk: { lot: 0.01 } };
            }

            const prices = history.map(h => h.price);
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            const volatility = Math.max(...prices) - Math.min(...prices);
            
            // FILTRO PROFESIONAL: Solo operamos a favor de la tendencia (Media Simple)
            const trend = currentPrice > avgPrice ? "ALCISTA" : "BAJISTA";
            
            let action = "ESPERAR";
            let probability = 0;

            // Estrategia de Scalping: Comprar en soporte de tendencia alcista / Vender en resistencia de bajista
            if (trend === "ALCISTA" && currentPrice < prices[0]) {
                action = "COMPRA (LONG)";
                probability = 85;
            } else if (trend === "BAJISTA" && currentPrice > prices[0]) {
                action = "VENTA (SHORT)";
                probability = 88;
            }

            // Gestión de Riesgo Dinámica (Ratio 1:2)
            const sl_dist = (volatility * 0.4).toFixed(2);
            const tp_dist = (sl_dist * 2.1).toFixed(2);
            
            // Cálculo de lotaje profesional basado en riesgo
            let finalLot = Math.max(config.ACCOUNT.MIN_LOT, (this.currentCapital * 0.05) / 100).toFixed(2);

            return {
                action,
                probability: phase === "CONFIRMACIÓN" ? probability + 5 : probability,
                price: currentPrice.toFixed(2),
                context: { trend, volatility: volatility.toFixed(2), phase },
                risk: {
                    lot: finalLot,
                    sl: action === "COMPRA (LONG)" ? (currentPrice - parseFloat(sl_dist)).toFixed(2) : (currentPrice + parseFloat(sl_dist)).toFixed(2),
                    tp: action === "COMPRA (LONG)" ? (currentPrice + parseFloat(tp_dist)).toFixed(2) : (currentPrice - parseFloat(tp_dist)).toFixed(2),
                    capital: this.currentCapital
                }
            };
        } catch (e) {
            return { action: "ERROR", probability: 0, price: currentPrice, risk: { lot: 0.01 } };
        }
    }
}

module.exports = new CTIPROV6_Brain();
