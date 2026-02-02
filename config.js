/**
 * CTIPROV6 - ARCHIVO DE CONFIGURACIÓN GLOBAL
 * Versión: Abanico de 10 Mercados + Seguridad Anti-Spread
 */

module.exports = {
    STRATEGY: {
        // --- PARÁMETROS DE INTELIGENCIA ---
        MIN_CONFIDENCE: 70,         
        MIN_VOLATILITY: 0.0001,     
        TREND_THRESHOLD: 0.0005,    
        
        // --- GESTIÓN DE RIESGO ---
        RISK_REWARD_RATIO: 2.0,     
        STOP_LOSS_PCT: 0.003,       
        TAKE_PROFIT_PCT: 0.006,     
        
        // --- SEGURIDAD ---
        MAX_SPREAD_ALLOWED: 100,    // Filtro para evitar spreads como el de XRP 344

        // --- ABANICO DE 10 MERCADOS (Sincronizados) ---
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
