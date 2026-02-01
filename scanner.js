const axios = require('axios');
const config = require('./config');

class MarketScanner {
    constructor() {
        this.pair = config.STRATEGY.ASSET;
        this.apiUrl = `https://api.kraken.com/0/public/Ticker?pair=${this.pair}`;
    }

    async getValidatedPrice() {
        let attempts = 0;
        while (attempts < config.SYSTEM.RETRY_ATTEMPTS) {
            try {
                const response = await axios.get(this.apiUrl, { timeout: 5000 });
                const data = response.data;

                if (data.error && data.error.length > 0) throw new Error(data.error[0]);

                const price = parseFloat(data.result[this.pair].c[0]);
                if (isNaN(price)) throw new Error("Precio no numérico detectado");

                return {
                    price,
                    timestamp: new Date().toISOString(),
                    spread: parseFloat(data.result[this.pair].a[0]) - parseFloat(data.result[this.pair].b[0])
                };
            } catch (error) {
                attempts++;
                console.error(`[Scanner] Intento ${attempts} fallido: ${error.message}`);
                if (attempts >= config.SYSTEM.RETRY_ATTEMPTS) return null;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
}

module.exports = new MarketScanner();
