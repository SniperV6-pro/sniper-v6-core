/**
 * SNIPER V6 - CONFIGURACIÓN CORE
 * Gestión de Riesgo y Parámetros de Mercado
 */
module.exports = {
    ACCOUNT: {
        BASE_CURRENCY: 'USD',
        INITIAL_BALANCE: 20.00,
        RISK_PER_TRADE: 1.50, // Stop Loss máximo en USD
        LOT_SIZE: 0.01
    },
    STRATEGY: {
        ASSET: 'PAXGUSD',
        TIMEFRAME: 'M5',
        LOOKBACK_PERIODS: 14, // Para cálculos de Media Móvil y RSI
        VOLATILITY_THRESHOLD: 0.85 // Sensibilidad de cambio de tendencia
    },
    SYSTEM: {
        POLLING_INTERVAL: 300000, // 5 minutos
        RETRY_ATTEMPTS: 3,
        LOG_LEVEL: 'DEBUG'
    }
};
