const axios = require('axios');

async function getPrice() {
    try {
        const res = await axios.get('https://api.kraken.com/0/public/Ticker?pair=PAXGUSD');
        return parseFloat(res.data.result.PAXGUSD.c[0]);
    } catch (e) {
        console.error("Error en lectura de mercado:", e.message);
        return null;
    }
}

module.exports = { getPrice };
