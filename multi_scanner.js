const axios = require('axios');

const ASSETS = ['PAXGUSD', 'XXBTZUSD', 'XETHZUSD', 'XRPUSD', 'ADAUSD'];

async function getFullMarketScan() {
    try {
        const pairs = ASSETS.join(',');
        const res = await axios.get(`https://api.kraken.com/0/public/Ticker?pair=${pairs}`);
        let report = "🌍 *MAPA DE MERCADOS V6*\n\n";
        
        for (const pair of ASSETS) {
            const price = parseFloat(res.data.result[pair].c[0]);
            report += `• ${pair.replace('ZUSD', '').replace('PAXGUSD', 'ORO')}: $${price.toFixed(2)}\n`;
        }
        return report;
    } catch (e) {
        return "⚠️ Error en escaneo múltiple.";
    }
}

module.exports = { getFullMarketScan };
