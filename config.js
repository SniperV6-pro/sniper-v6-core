/**
 * CTIPROV6 CONFIGURATION - MULTI-RADAR EDITION
 */
module.exports = {
    SYSTEM: {
        POLLING_INTERVAL: 60000,
        TIMEFRAME: 15
    },
    STRATEGY: {
        ASSET: 'PAXGUSD', // Activo principal (Oro)
        RADAR_ASSETS: ['PAXGUSD', 'XBTUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'ADAUSD'],
        MIN_CONFIDENCE: 75 // Solo nos avisa si la probabilidad es alta
    },
    ACCOUNT: {
        INITIAL_BALANCE: 20,
        RISK_PER_TRADE: 2.00,
        LOT_SIZE: 0.01
    }
};
