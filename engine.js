const config = require('./config');

async function analyzeWithHistoricalDepth(supabase, currentPrice) {
    try {
        // 1. Extraer los últimos 100 puntos de la memoria (Supabase)
        const { data: history } = await supabase
            .from('learning_db')
            .select('price')
            .order('created_at', { ascending: false })
            .limit(100);

        if (!history || history.length < 10) {
            return { action: "ESPERAR", probability: "50%", context: { zone: "Sin Datos" }, price: currentPrice, risk: { lot: 0.01, sl: 0 } };
        }

        const prices = history.map(h => h.price);
        const maxPrice = Math.max(...prices);
        const minPrice = Math.min(...prices);
        
        // 2. Lógica de Reacción (Soportes y Resistencias)
        let action = "NEUTRAL";
        let probability = 60;
        let zone = "Rango Medio";

        if (currentPrice <= minPrice * 1.001) {
            action = "COMPRA";
            probability = 92;
            zone = "Soporte Histórico (Piso)";
        } else if (currentPrice >= maxPrice * 0.999) {
            action = "VENTA";
            probability = 89;
            zone = "Resistencia Histórica (Techo)";
        }

        return {
            action,
            probability: `${probability}%`,
            price: currentPrice.toFixed(2),
            context: { zone },
            risk: {
                lot: config.ACCOUNT.LOT_SIZE,
                sl: action === "COMPRA" ? (currentPrice - 1.50).toFixed(2) : (currentPrice + 1.50).toFixed(2)
            }
        };
    } catch (e) {
        return { action: "ERROR", probability: "0%", context: { zone: "Falla de Motor" }, price: currentPrice, risk: { lot: 0.01, sl: 0 } };
    }
}

module.exports = { analyzeWithHistoricalDepth };
