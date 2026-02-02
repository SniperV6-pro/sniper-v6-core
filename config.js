/**
 * CTIPROV6 - CONFIGURACIÓN GLOBAL PROFESIONAL
 * 10 Mercados + Filtro de Spread + Autonomía
 */

module.exports = {
    STRATEGY: {
        // --- PARÁMETROS DE INTELIGENCIA ---
        MIN_CONFIDENCE: 70,         // Umbral de activación para señales
        MIN_VOLATILITY: 0.0001,     // Sensibilidad para detectar micro-movimientos
        TREND_THRESHOLD: 0.0005,    // Sensibilidad de tendencia
        
        // --- GESTIÓN DE RIESGO ---
        RISK_REWARD_RATIO: 2.0,     // Ganar el doble de lo arriesgado
        STOP_LOSS_PCT: 0.003,       // SL al 0.3% (Protección de cuenta pequeña)
        TAKE_PROFIT_PCT: 0.006,     // TP al 0.6%
        
        // --- SEGURIDAD ANTI-SPREAD ---
        MAX_SPREAD_ALLOWED: 100,    // Si el spread > 100 puntos, la señal se cancela automáticamente

        // --- ABANICO DE 10 MERCADOS (Liquidez y Bajo Spread) ---
        RADAR_ASSETS: [
            'PAXGUSD', // Oro
            'BTCUSD',  // Bitcoin
            'ETHUSD',  // Ethereum
            'SOLUSD',  // Solana
            'XRPUSD',  // Ripple
            'EURUSD',  // Euro/Dolar (Forex)
            'GBPUSD',  // Libra/Dolar (Forex)
            'NAS100',  // Nasdaq (Índices)
            'US30',    // Dow Jones (Índices)
            'LTCUSD'   // Litecoin
        ],
        
        ASSET_NAMES: {
            'PAXGUSD': 'ORO (PAXG)',
            'BTCUSD': 'BITCOIN',
            'ETHUSD': 'ETHEREUM',
            'SOLUSD': 'SOLANA',
            'XRPUSD': 'RIPPLE',
            'EURUSD': 'EURO/DOLAR',
            'GBPUSD': 'LIBRA/DOLAR',
            'NAS100': 'NASDAQ 100',
            'US30': 'DOW JONES',
            'LTCUSD': 'LITECOIN'
        }
    },
    
    // --- TIEMPOS DE RESPUESTA ---
    POLLING_INTERVAL: 60000 // Escaneo cada 60 segundos
};
