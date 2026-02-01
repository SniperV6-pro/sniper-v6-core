const config = require('./config');

class CTIPROV6_Brain {
    constructor() {
        this.currentCapital = config.ACCOUNT.INITIAL_BALANCE;
        this.riskPerTrade = 0.05; 
    }

    setCapital(amount) {
        this.currentCapital = parseFloat(amount);
    }

    async analyze(supabase, currentPrice, phase) {
        try {
            const { data: history } = await supabase
                .from('learning_db')
                .select('price')
                .order('created_at', { ascending: false })
                .limit(10);

            // PROTECCIÓN: Si no hay historial, evitamos que el bot muera
            if (!history || history.length < 5) {
                return {
                    action: "CALIBRANDO",
                    probability: 0,
                    price: currentPrice.toFixed(2),
                    context: { phase, trend: "ESPERANDO DATOS", volatility: "0" },
                    risk: { lot: 0.01, sl_dist: "0", tp_dist: "0", capital_used: this.currentCapital }
                };
            }

            const prices = history.map(h => h.price);
            const volatility = (Math.max(...prices) - Math.min(...prices));
            const dynamicSL = Math.max(0.5, (volatility * 0.3)).toFixed(2); 

            const lastPrice = prices[0];
            const trend = currentPrice > prices[4] ? "ALCISTA" : "BAJISTA";
            
            let action = "ESPERAR";
            let probability = 50;

            if (trend === "BAJISTA" && currentPrice > lastPrice) {
                action = "COMPRA (LONG)";
                probability = phase === "PRE-ALERTA" ? 75 : 92;
            } else if (trend === "ALCISTA" && currentPrice < lastPrice) {
                action = "VENTA (SHORT)";
                probability = phase === "PRE-ALERTA" ? 75 : 92;
            }

            let rawLot = (this.currentCapital * this.riskPerTrade) / 200; 
            let finalLot = Math.max(0.01, parseFloat(rawLot.toFixed(2)));

            return {
                action,
                probability,
                price: currentPrice.toFixed(2),
                context: { phase, trend, volatility: volatility.toFixed(2) },
                risk: {
                    lot: finalLot,
                    sl_dist: dynamicSL,
                    tp_dist: (dynamicSL * 1.5).toFixed(2),
                    capital_used: this.currentCapital
                }
            };
        } catch (e) {
            // RETORNO DE EMERGENCIA: Si algo falla, el bot no se detiene
            return {
                action: "ERROR TÉCNICO",
                probability: 0,
                price: currentPrice.toFixed(2),
                risk: { lot: 0.01, sl_dist: "0", tp_dist: "0", capital_used: this.currentCapital }
            };
        }
    }
}

module.exports = new CTIPROV6_Brain();
