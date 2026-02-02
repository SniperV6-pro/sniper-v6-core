module.exports = {
    STRATEGY: {
        MIN_CONFIDENCE: 70,
        MIN_VOLATILITY: 0.0001,
        TREND_THRESHOLD: 0.0005,
        RISK_REWARD_RATIO: 2.0,
        STOP_LOSS_PCT: 0.003,
        TAKE_PROFIT_PCT: 0.006,
        MAX_SPREAD_ALLOWED: 100,
        // ABANICO DE 10 MERCADOS REALES
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
    POLLING_INTERVAL: 60000 
};
