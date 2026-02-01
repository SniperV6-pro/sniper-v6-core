const config = require('./config');

/**
 * Motor de Inteligencia Sniper V6
 * Analiza la estructura del mercado comparando el precio actual con la memoria de Supabase.
 */
async function analyzeWithHistoricalDepth(supabase, currentPrice) {
    try {
        // Extraemos los últimos 100 registros para determinar Soporte y Resistencia reales
        const { data: history, error } = await supabase
            .from('learning_db')
            .select('price')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error || !history || history.length < 10) {
            return { 
                action: "CALIBRANDO", 
                probability: "0%", 
                context: { zone: "Memoria insuficiente" }, 
                price: currentPrice.toFixed(2), 
                risk: { lot: config.ACCOUNT.LOT_SIZE, sl: 0 } 
            };
        }

        const prices = history.map(h => h.price);
        const maxPrice = Math.max(...prices);
        const minPrice = Math.min(...prices);
        const range = maxPrice - minPrice;
        
        let action = "ESPERAR";
        let probability = 60;
        let zone = "Zona Media (Riesgo)";

        // Lógica Sniper: Solo operamos en los extremos del rango histórico
        if (currentPrice <= (minPrice + (range * 0.10))) {
            action = "COMPRA 📈";
            probability = 92;
            zone = "Soporte (Piso Histórico)";
        } else if (currentPrice >= (maxPrice - (range * 0.10))) {
            action = "VENTA 📉";
            probability = 89;
            zone = "Resistencia (Techo Histórico)";
        }

        return {
            action,
            probability: `${probability}%`,
            price: currentPrice.toFixed(2),
            context: { zone },
            risk: {
                lot: config.ACCOUNT.LOT_SIZE,
                sl: action === "COMPRA 📈" ? (currentPrice - 1.50).toFixed(2) : (currentPrice + 1.50).toFixed(2)
            }
        };
    } catch (e) {
        console.error("Error en Engine:", e.message);
        return { action: "ERROR", probability: "0%", context: { zone: "Falla de Motor" }, price: currentPrice, risk: { lot: 0.01, sl: 0 } };
    }
}

module.exports = { analyzeWithHistoricalDepth };
