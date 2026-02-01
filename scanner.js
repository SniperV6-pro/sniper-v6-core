const axios = require('axios');
const config = require('./config');

/**
 * Módulo de Escaneo de Mercado de Alta Frecuencia
 * Obtiene Precio Real + Spread para validar la entrada.
 */
async function getValidatedPrice() {
    try {
        const pair = config.STRATEGY.ASSET;
        // Solicitamos el Ticker completo a Kraken
        const url = `https://api.kraken.com/0/public/Ticker?pair=${pair}`;
        
        const response = await axios.get(url, { timeout: 5000 });
        
        if (response.data.error && response.data.error.length > 0) {
            console.error("⚠️ Error API Kraken:", response.data.error);
            return null;
        }

        // Kraken devuelve un objeto con clave dinámica (ej: PAXGUSD o XPAXGZUSD)
        const resultKey = Object.keys(response.data.result)[0];
        const data = response.data.result[resultKey];

        // Extracción de Datos Críticos para Scalping
        const currentPrice = parseFloat(data.c[0]); // Precio último cierre
        const bid = parseFloat(data.b[0]);          // Mejor oferta de compra
        const ask = parseFloat(data.a[0]);          // Mejor oferta de venta
        const spread = ask - bid;

        // FILTRO DE PROTECCIÓN:
        // Si el spread es absurdo (ej: mercado volátil o cerrado), el precio no es válido.
        if (isNaN(currentPrice) || spread < 0) return null;

        return {
            price: currentPrice,
            spread: spread.toFixed(2),
            volume: parseFloat(data.v[0]) // Volumen de hoy
        };

    } catch (error) {
        console.error("❌ Fallo en conexión con el mercado:", error.message);
        return null;
    }
}

module.exports = { getValidatedPrice };
