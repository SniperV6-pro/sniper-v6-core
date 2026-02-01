const axios = require('axios');
const config = require('./config');

/**
 * RADAR MULTIMERCADO CTIPROV6 - V6.5
 * Proporciona una visión táctica de los 6 activos en tiempo real.
 */
async function getFullMarketScan() {
    // Usamos los activos definidos en la configuración centralizada
    const assets = config.STRATEGY.RADAR_ASSETS;
    const pairString = assets.join(',');
    
    try {
        const response = await axios.get(`https://api.kraken.com/0/public/Ticker?pair=${pairString}`, { timeout: 5000 });
        const data = response.data.result;
        
        let report = "🌍 *RADAR TÁCTICO CTIPROV6*\n";
        report += `📅 ${new Date().toLocaleTimeString()} | ⏱️ 15m\n`;
        report += "-----------------------------\n";

        Object.keys(data).forEach(pair => {
            const currentPrice = parseFloat(data[pair].c[0]);
            const openPrice = parseFloat(data[pair].o[0]); // Precio de apertura de hoy
            const high = parseFloat(data[pair].h[0]);
            const low = parseFloat(data[pair].l[0]);
            
            // Cálculo de Tendencia Diaria
            const change = (((currentPrice - openPrice) / openPrice) * 100).toFixed(2);
            const trendIcon = change >= 0 ? "🟢 ⬆️" : "🔴 ⬇️";
            
            // Etiquetado limpio
            let name = pair.replace('PAXGUSD', 'ORO').replace('XBTUSD', 'BTC').replace('ETHUSD', 'ETH').replace('ZUSD', '').replace('USD', '');
            if(name === "XXBT") name = "BTC"; // Ajuste para ticker interno de Kraken

            // Formateo de decimales según el precio (Sats vs Gold/BTC)
            const priceFormatted = currentPrice.toFixed(currentPrice < 10 ? 4 : 2);

            report += `${trendIcon} *${name}:* $${priceFormatted} (${change}%)\n`;
        });

        report += "-----------------------------\n";
        report += "💡 _Usa /señal para análisis profundo._";
        
        return report;
    } catch (e) {
        console.error("Error en Radar MultiScanner:", e.message);
        return "⚠️ *ERROR DE RADAR:* No se pudo sincronizar con el satélite de precios.";
    }
}

module.exports = { getFullMarketScan };
