const axios = require('axios');
const config = require('./config');

async function getFullMarketScan() {
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
            const openPrice = parseFloat(data[pair].o[0]); 
            
            // CORRECCIÓN MATEMÁTICA: Evitamos divisiones por cero o valores nulos
            let change = "0.00";
            if (openPrice > 0) {
                change = (((currentPrice - openPrice) / openPrice) * 100).toFixed(2);
            }
            
            const trendIcon = parseFloat(change) >= 0 ? "🟢 ⬆️" : "🔴 ⬇️";
            
            // LIMPIEZA DE NOMBRES (Quitamos las 'X' y 'Z' sobrantes de Kraken)
            let name = pair
                .replace('PAXGUSD', 'ORO')
                .replace('XBTUSD', 'BTC')
                .replace('XETHZUSD', 'ETH')
                .replace('XETHUSD', 'ETH')
                .replace('XXRPZUSD', 'XRP')
                .replace('XXRPUSD', 'XRP')
                .replace('ADAUSD', 'ADA')
                .replace('SOLUSD', 'SOL')
                .replace('ZUSD', '')
                .replace('X', ''); // Limpieza final de prefijos

            const priceFormatted = currentPrice.toFixed(currentPrice < 10 ? 4 : 2);

            report += `${trendIcon} *${name}:* $${priceFormatted} (${change}%)\n`;
        });

        report += "-----------------------------\n";
        report += "💡 _Usa /señal para análisis profundo._";
        
        return report;
    } catch (e) {
        return "⚠️ *ERROR DE RADAR:* Sincronizando satélites...";
    }
}

module.exports = { getFullMarketScan };
