/**
 * SNIPER V6-CORE - CONFIGURACIÓN GLOBAL
 * Sin simplificaciones. 10 Mercados + Seguridad.
 */

module.exports = {
    STRATEGY: {
        // --- PARÁMETROS DE INTELIGENCIA ---
        MIN_CONFIDENCE: 70,         // Confianza mínima para alerta
        MIN_VOLATILITY: 0.0001,     // Sensibilidad de movimiento
        TREND_THRESHOLD: 0.0005,    
        
        // --- GESTIÓN DE RIESGO ---
        RISK_REWARD_RATIO: 2.0,     
        STOP_LOSS_PCT: 0.003,       // Protección cuenta $20
        TAKE_PROFIT_PCT: 0.006,     
        
        // --- SEGURIDAD ---
        MAX_SPREAD_ALLOWED: 100,    // Filtro anti-trampa de spread

        // --- ABANICO DE 10 MERCADOS ---
        RADAR_ASSETS: [
            'PAXGUSD', 'BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 
            'EURUSD', 'GBPUSD', 'NAS100', 'US30', 'LTCUSD'
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
    
    // --- CICLOS ---
    POLLING_INTERVAL: 60000 
};
