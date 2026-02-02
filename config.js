module.exports = {
    STRATEGY: {
        MIN_CONFIDENCE: 70,        // <--- Antes 85. Ahora enviará muchas más señales.
        MIN_VOLATILITY: 0.0005,    // <--- Detectará movimientos más sutiles.
        TREND_THRESHOLD: 0.001,    // <--- Sensibilidad aumentada.
        RISK_REWARD_RATIO: 2,      // <--- Buscamos ganar el doble de lo arriesgado.
        STOP_LOSS_PCT: 0.005,      // 0.5% de margen de pérdida.
        TAKE_PROFIT_PCT: 0.01,     // 1.0% de meta de ganancia.
        RADAR_ASSETS: ['PAXGUSD', 'BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'ADAUSD'],
        ASSET_NAMES: {
            'PAXGUSD': 'ORO (PAXG)',
            'BTCUSD': 'BITCOIN',
            'ETHUSD': 'ETHEREUM',
            'SOLUSD': 'SOLANA',
            'XRPUSD': 'RIPPLE',
            'ADAUSD': 'CARDANO'
        }
    }
};
