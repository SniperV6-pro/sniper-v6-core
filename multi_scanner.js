const axios = require('axios');

async function getFullMarketScan() {
    // Los 6 mercados del plan maestro
    const assets = ['PAXGUSD', 'XXBTZUSD', 'XETHZUSD', 'XRPUSD', 'ADAUSD', 'SOLUSD'];
    try {
        const res = await axios.get(`https://api.kraken.com/0/public/Ticker?pair=${assets.join(',')}`);
        const data = res.data.result;
        
        let report = "🌍 *MAPA DE MERCADOS V6*\n\n";
        
        Object.keys(data).forEach(pair => {
            const price = parseFloat(data[pair].c[0]);
            let name = pair.replace('XXBTZUSD', 'BTC').replace('PAXGUSD', 'ORO').replace('XETHZUSD', 'ETH').replace('ZUSD', '').replace('USD', '');
            report += `• *${name}*: $${price.toFixed(price < 10 ? 4 : 2)}\n`;
        });
        
        return report;
    } catch (e) {
        return "⚠️ Error al conectar con Kraken para el escaneo múltiple.";
    }
}

module.exports = { getFullMarketScan };
