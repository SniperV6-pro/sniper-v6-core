module.exports = {
    SYSTEM: {
        POLLING_INTERVAL: 60000,
        TIMEFRAME: 15,
        VERSION: "CTIPROV6-FINAL-PRO"
    },
    STRATEGY: {
        RADAR_ASSETS: ['PAXGUSD', 'XBTUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'ADAUSD'],
        MIN_CONFIDENCE: 80, // Subimos el filtro a 80% para mayor precisión
        EMA_PERIOD: 200    // Filtro de tendencia profesional
    },
    ACCOUNT: {
        INITIAL_BALANCE: 20,
        RISK_PER_TRADE_PERCENT: 5, // Arriesgamos 5% del capital por trade
        MIN_LOT: 0.01
    }
};
