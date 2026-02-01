const axios = require('axios');

async function getFullMarketScan() {
    const assets = ['PAXGUSD', 'XXBTZUSD', 'XETHZUSD'];
    try {
        const res = await axios.get(`https://api.kraken.com/0/public/Ticker?pair=${assets.join(',')}`);
        let report = "🌍 *MAPA DE MERCADOS V6*\n\n";
        
        Object.keys(res.data.result).forEach(pair => {
            const price = parseFloat(res.data.result[pair].c[0]);
            const name = pair.includes('XBT') ? 'BTC' : pair.includes('PAXG') ? 'ORO' : 'ETH';
            report += `• *${name}*: $${price.toFixed(2)}\n`;
        });
        
        return report;
    } catch (e) {
        return "⚠️ Error al conectar con Kraken.";
    }
}

module.exports = { getFullMarketScan };
