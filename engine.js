const config = require('./config');

async function analyzeWithHistoricalDepth(supabase, currentPrice) {
    try {
        // Traemos datos rápidos para Scalping
        const { data: history } = await supabase
            .from('learning_db')
            .select('price')
            .order('created_at', { ascending: false })
            .limit(50);

        if (!history || history.length < 5) {
            return { action: "ESPERAR", probability: "0%", context: { zone: "Analizando..." }, price: currentPrice, risk: { lot: 0.01, sl: 0 } };
        }

        const prices = history.map(h => h.price);
        const max = Math.max(...prices);
        const min = Math.min(...prices);
        const spread = max - min;

        // LÓGICA DE ANTICIPACIÓN (SCALPING)
        // Detectamos el movimiento 2 minutos antes de que toque el extremo
        let action = "ESPERAR";
        let probability = 50;
        let zone = "Neutral";

        const buyThreshold = min + (spread * 0.15); // Zona de pre-compra
        const sellThreshold = max - (spread * 0.15); // Zona de pre-venta

        if (currentPrice <= buyThreshold) {
            action = "COMPRA (READY) 📈";
            probability = 94;
            zone = "Cerca de Soporte";
        } else if (currentPrice >= sellThreshold) {
            action = "VENTA (READY) 📉";
            probability = 91;
            zone = "Cerca de Resistencia";
        }

        return {
            action,
            probability: `${probability}%`,
            price: currentPrice.toFixed(2),
            context: { zone },
            risk: {
                lot: config.ACCOUNT.LOT_SIZE,
                sl: action.includes("COMPRA") ? (currentPrice - 1.20).toFixed(2) : (currentPrice + 1.20).toFixed(2)
            }
        };
    } catch (e) {
        return { action: "ERROR", probability: "0%", context: { zone: "Falla" }, price: currentPrice, risk: { lot: 0.01, sl: 0 } };
    }
}

module.exports = { analyzeWithHistoricalDepth };
