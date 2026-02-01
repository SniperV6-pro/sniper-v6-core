const config = require('./config');

class EliteTraderBrain {
    /**
     * PROCESAMIENTO DE ESTRUCTURA HISTÓRICA
     */
    async analyzeWithHistoricalDepth(supabase, currentPrice) {
        // Extraemos los últimos 100 registros de tu "Memoria" en Supabase
        const { data: history } = await supabase.from('learning_db')
            .select('price')
            .order('created_at', { ascending: false })
            .limit(100);

        if (!history || history.length < 20) {
            return { action: "CALIBRANDO 🧠", probability: "0%", context: { zone: "SIN DATOS" } };
        }

        const prices = history.map(h => h.price);
        const high = Math.max(...prices);
        const low = Math.min(...prices);
        const range = high - low;
        
        // Lógica de Acción de Precio (Price Action)
        const isAtSupport = currentPrice <= (low + (range * 0.20));
        const isAtResistance = currentPrice >= (high - (range * 0.20));

        let decision = "WAITING";
        let score = 0;

        if (isAtSupport) {
            decision = "BUY 📈";
            score = 85;
        } else if (isAtResistance) {
            decision = "SELL 📉";
            score = 85;
        }

        return {
            price: currentPrice.toFixed(2),
            action: decision,
            probability: `${score}%`,
            context: {
                high: high.toFixed(2),
                low: low.toFixed(2),
                zone: isAtSupport ? "SOPORTE" : (isAtResistance ? "RESISTENCIA" : "ZONA MEDIA")
            },
            risk: {
                lot: config.ACCOUNT.LOT_SIZE,
                sl: (currentPrice + (decision === 'BUY 📈' ? -config.ACCOUNT.RISK_PER_TRADE : config.ACCOUNT.RISK_PER_TRADE)).toFixed(2)
            }
        };
    }
}

module.exports = new EliteTraderBrain();
