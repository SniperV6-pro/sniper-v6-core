const config = require('./config');

class CTIPROV6_Brain {
    constructor() {
        this.currentCapital = config.ACCOUNT.INITIAL_BALANCE; // Inicia con $20 o lo que diga config
        this.riskPerTrade = 0.05; // 5% de riesgo por operación (Agresivo para cuentas chicas)
    }

    setCapital(amount) {
        this.currentCapital = parseFloat(amount);
    }

    /**
     * Análisis CTIPROV6: Aprende de la volatilidad reciente
     */
    async analyze(supabase, currentPrice, phase) {
        // 1. Obtener memoria de corto plazo (últimas 10 velas de 15min)
        const { data: history } = await supabase
            .from('learning_db')
            .select('price')
            .order('created_at', { ascending: false })
            .limit(10);

        if (!history || history.length < 5) {
            return { action: "CALIBRANDO", probability: 0, context: "Faltan datos" };
        }

        // 2. Auto-Ajuste de Parámetros (Volatilidad)
        const prices = history.map(h => h.price);
        const volatility = (Math.max(...prices) - Math.min(...prices)); // Rango reciente
        
        // Ajuste dinámico del Stop Loss según la fuerza del mercado
        const dynamicSL = (volatility * 0.3).toFixed(2); 

        // 3. Lógica de Entrada (Estrategia de Rebote Scalping)
        const lastPrice = prices[0]; // Precio anterior
        const trend = currentPrice > prices[4] ? "ALCISTA" : "BAJISTA";
        
        let action = "ESPERAR";
        let probability = 50;
        let signalType = "NEUTRO";

        // Detectar reversiones (Soportes/Resistencias dinámicos)
        if (trend === "BAJISTA" && currentPrice > lastPrice) {
            action = "COMPRA (LONG)";
            probability = phase === "PRE-ALERTA" ? 75 : 92; // Sube confianza en confirmación
            signalType = "SOPORTE";
        } else if (trend === "ALCISTA" && currentPrice < lastPrice) {
            action = "VENTA (SHORT)";
            probability = phase === "PRE-ALERTA" ? 75 : 92;
            signalType = "RESISTENCIA";
        }

        // 4. Gestión de Capital Escalable
        // Fórmula: (Capital * Riesgo) / (Distancia SL) = Lotaje (Simplificado para XAUUSD)
        // Nota: Ajustado para micro-lotes mínimos de 0.01
        let rawLot = (this.currentCapital * this.riskPerTrade) / 200; 
        let finalLot = Math.max(0.01, parseFloat(rawLot.toFixed(2)));

        return {
            action,
            probability,
            price: currentPrice.toFixed(2),
            context: {
                phase: phase,
                trend: trend,
                volatility: volatility.toFixed(2)
            },
            risk: {
                lot: finalLot,
                sl_dist: dynamicSL,
                tp_dist: (dynamicSL * 1.5).toFixed(2), // Ratio 1:1.5
                capital_used: this.currentCapital
            }
        };
    }
}

module.exports = new CTIPROV6_Brain();
