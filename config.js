/**
 * CTIPROV6 - ARCHIVO DE CONFIGURACIÓN GLOBAL
 * Versión: Modo Crecimiento Turbo (Agresividad Aumentada)
 * Estado: Producción Sincronizada
 */

module.exports = {
    STRATEGY: {
        // --- NIVELES DE FILTRO ---
        MIN_CONFIDENCE: 70,         // Bajado de 85 a 70 para capturar más señales
        MIN_VOLATILITY: 0.0001,     // Sensibilidad extrema para detectar micro-movimientos
        TREND_THRESHOLD: 0.0005,    // Umbral de tendencia reducido para mayor rapidez
        
        // --- GESTIÓN DE RIESGO (Optimizado para cuenta de $20) ---
        RISK_REWARD_RATIO: 2.0,     // Buscamos ganar 2 veces lo arriesgado
        STOP_LOSS_PCT: 0.003,       // SL corto al 0.3% para scalping agresivo
        TAKE_PROFIT_PCT: 0.006,     // TP al 0.6% para cierres rápidos de ganancias
        
        // --- ABANICO DE MERCADOS (Vigilancia Total) ---
        RADAR_ASSETS: [
            'PAXGUSD', // Oro (PAX Gold)
            'BTCUSD',  // Bitcoin
            'ETHUSD',  // Ethereum
            'SOLUSD',  // Solana
            'XRPUSD',  // Ripple
            'ADAUSD'   // Cardano
        ],
        
        // --- DICCIONARIO DE IDENTIFICACIÓN ---
        ASSET_NAMES: {
            'PAXGUSD': 'ORO (PAXG)',
            'BTCUSD': 'BITCOIN',
            'ETHUSD': 'ETHEREUM',
            'SOLUSD': 'SOLANA',
            'XRPUSD': 'RIPPLE',
            'ADAUSD': 'CARDANO'
        }
    },
    
    // --- PARÁMETROS DE SERVIDOR Y RED ---
    POLLING_INTERVAL: 60000,        // Frecuencia de escaneo (1 minuto)
    MAX_RETRIES: 3,                 // Reintentos en caso de error de conexión
    LOG_LEVEL: 'info'               // Nivel de detalle en los logs de Render
};
