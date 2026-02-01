module.exports = {
    SYSTEM: {
        POLLING_INTERVAL: 60000,
        TIMEFRAME: 15,
        VERSION: "CTIPROV6-ULTIMATE"
    },
    STRATEGY: {
        // Mapeo profesional para evitar errores de nombres en Kraken
        RADAR_ASSETS: ['PAXGUSD', 'XBTUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'ADAUSD'],
        ASSET_NAMES: {
            'PAXGUSD': 'ORO', 'XBTUSD': 'BTC', 'ETHUSD': 'ETH', 
            'SOLUSD': 'SOL', 'XRPUSD': 'XRP', 'ADAUSD': 'ADA'
        },
        MIN_CONFIDENCE: 80
    },
    ACCOUNT: {
        INITIAL_BALANCE: 20,
        RISK_PER_TRADE_PERCENT: 5,
        MIN_LOT: 0.01
    }
};
