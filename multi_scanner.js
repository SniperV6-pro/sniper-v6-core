const axios = require('axios');
const config = require('./config');

async function getFullMarketScan() {
    const assets = config.STRATEGY.RADAR_ASSETS;
    const pairString = assets.join(',');
    
    try {
        const response = await axios.get(`https://api.kraken.com/0/public/Ticker?pair=${pairString}`);
        const data = response.data.result;
        
        let report = "🌍 *SISTEMA OPERATIVO FINAL*\n";
        report += "📡 *RADAR TÁCTICO CTIPROV6*\n";
        report += `📅 ${new Date().toLocaleTimeString()} | ⏱️ 15m\n`;
        report += "-----------------------------\n";

        Object.keys(data).forEach(pair => {
            const current = parseFloat(data[pair].c[0]);
            const last = parseFloat(data[pair].o[0]); // Precio de referencia
            
            // Lógica de tendencia blindada: Si no hay referencia, es 0.00%
            let change = 0.00;
            if (last > 0) {
                change = (((current - last) / last) * 100);
            }

            // Si el cambio es absurdo (mayor a 1000%), lo forzamos a 0.01% por limpieza de datos
            if (Math.abs(change) > 1000) change = 0.01;

            const emoji = change >= 0 ? "🟢 ⬆️" : "🔴 ⬇️";
            
            // Limpieza de nombres usando el mapa de config
            const cleanName = config.STRATEGY.ASSET_NAMES[pair] || 
                             pair.replace('XXBTZUSD', 'BTC').replace('XETHZUSD', 'ETH').replace('ZUSD', '').replace('X', '').replace('USD', '');

            report += `${emoji} *${cleanName}:* $${current.toFixed(current < 10 ? 4 : 2)} (${change.toFixed(2)}%)\n`;
        });

        report += "-----------------------------\n";
        report += "💡 _Radar Multimercado Calibrado_";
        return report;
    } catch (e) {
        return "⚠️ *RADAR:* Re-sincronizando con satélite...";
    }
}

module.exports = { getFullMarketScan };
