/**
 * CTIPROV6 CONFIGURATION MODULE
 * Definición de constantes para Scalping de Alta Precisión
 */

module.exports = {
    // CRDENCIALES Y SISTEMA
    SYSTEM: {
        POLLING_INTERVAL: 60000, // Sincronización base de 60s (El index.js refina esto)
        RETRY_ATTEMPTS: 3,       // Intentos de reconexión si falla internet
        TIMEFRAME: 15            // Operamos en velas de 15 minutos
    },

    // ESTRATEGIA DE TRADING
    STRATEGY: {
        ASSET: 'PAXGUSD',        // Ticker de Kraken para ORO (Paxos Gold)
        PAIR_DISPLAY: 'XAU/USD', // Nombre visual para las alertas
        MIN_CONFIDENCE: 60       // Filtro mínimo para notificar
    },

    // GESTIÓN DE CAPITAL (MONEY MANAGEMENT)
    ACCOUNT: {
        INITIAL_BALANCE: 20,     // Capital base inicial
        RISK_PER_TRADE: 2.00,    // Riesgo máximo en Dólares por operación (ajustable)
        LOT_SIZE: 0.01,          // Lote mínimo de arranque
        LEVERAGE: 100            // Apalancamiento estimado (informativo)
    }
};
