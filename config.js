/**
 * CTIPROV6 - CONFIGURACIÓN GLOBAL PROFESIONAL
 * Versión: Abanico de 10 Mercados + Seguridad Anti-Spread
 */

module.exports = {
    STRATEGY: {
        // --- SENSIBILIDAD ---
        MIN_CONFIDENCE: 70,         // Probabilidad mínima para disparar alerta
        MIN_VOLATILITY: 0.0001,     // Sensibilidad para detectar movimientos lentos
        TREND_THRESHOLD: 0.0005,    
        
        // --- GESTIÓN DE RIESGO (Cuenta $20) ---
        RISK_REWARD_RATIO: 2.0,     
        STOP_LOSS_PCT: 0.003,       // SL ajustado al 0.3%
        TAKE_PROFIT_PCT: 0.006,     // TP al 0.6%
        
        // --- SEGURIDAD ---
        MAX_SPREAD_ALLOWED: 100,    // Bloqueo si el spread > 100 (Protección contra XRP alto)

        // --- ABANICO DE 10 MERCADOS ---
        RADAR_ASSETS: [
            'PAXGUSD', // Oro
            'BTCUSD',  // Bitcoin
            'ETHUSD',  // Ethereum
            'SOLUSD',  // Solana
            'XRPUSD',  // Ripple
            'EURUSD',  // Euro/Dólar
            'GBPUSD',  // Libra/Dólar
            'NAS100',  // Nasdaq
            'US30',    // Dow Jones
            'LTCUSD'   // Litecoin
        ],
        
        ASSET_NAMES: {
            'PAXGUSD': 'ORO (PAXG)',
            'BTCUSD': 'BITCOIN',
            'ETHUSD': 'ETHEREUM',
            'SOLANA': 'SOLANA',
            'XRPUSD': 'RIPPLE',
            'EURUSD': 'EURO/DOLAR',
            'GBPUSD': 'LIBRA/DOLAR',
            'NAS100': 'NASDAQ 100',
            'US30': 'DOW JONES',
            'LTCUSD': 'LITECOIN'
        }
    },
    
    // --- CICLOS ---
    POLLING_INTERVAL: 60000 // Escaneo cada 1 minuto
};
