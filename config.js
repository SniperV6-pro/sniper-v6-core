module.exports = {
    RISK: {
        BALANCE: 20.00, // Cuenta base del plan
        LOT: 0.01,       // Lote máximo permitido
        MAX_LOSS: 1.50   // SL máximo basado en pérdida permitida
    },
    MARKET: {
        PAIR: 'PAXGUSD', // Oro para lectura real
        INTERVAL: 300000 // Escaneo M5
    }
};
