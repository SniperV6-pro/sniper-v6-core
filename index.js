require('dotenv').config();

if (!process.env.SUPABASE_KEY || !process.env.TELEGRAM_TOKEN) {
  throw new Error('ERROR: Faltan variables de entorno en Render');
}

const express = require('express');
const axios = require('axios');
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const { analyze } = require('./engine');
const {
  ASSETS,
  KRAKEN_PAIRS,
  MAX_SPREAD,
  SUPABASE_URL,
  SUPABASE_KEY,
  TELEGRAM_TOKEN,
  CHAT_ID,
  PORT
} = require('./config');

const app = express();
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const bot = new Telegraf(TELEGRAM_TOKEN);

// Estado global
let radarActive = true;
let currentLot = 1; // Lote dinámico

// Función para consultar Kraken y procesar
async function processAssets() {
  if (!radarActive) return;

  for (const asset of ASSETS) {
    try {
      const krakenPair = KRAKEN_PAIRS[asset];
      const response = await axios.get(`https://api.kraken.com/0/public/Ticker?pair=${krakenPair}`);
      const data = response.data.result[krakenPair];

      if (!data) throw new Error('No data from Kraken');

      const ask = parseFloat(data.a[0]);
      const bid = parseFloat(data.b[0]);
      const currentPrice = (ask + bid) / 2;
      const spread = ask - bid;

      // Guardar en Supabase
      await supabase.from('learning_db').insert({ asset, price: currentPrice });

      // Calcular señal
      const signal = await analyze(supabase, asset, currentPrice, spread);
      signal.risk.lot = currentLot; // Aplicar lote dinámico

      // Notificar vía Telegram solo para 'PRE-ALERTA' o 'ENTRADA' (silencio en 'LEARNING' o confianza 0%)
      if (signal.action === 'PRE-ALERTA' || signal.action === 'ENTRADA') {
        const message = `*${signal.action}* en ${asset}\nPrecio: ${signal.price.toFixed(2)}\nConfianza: ${signal.probability.toFixed(2)}%\nSL: ${signal.risk.sl.toFixed(2)}, TP: ${signal.risk.tp.toFixed(2)}, Lote: ${signal.risk.lot}`;
        await bot.telegram.sendMessage(CHAT_ID, message, { parse_mode: 'Markdown' });
      }

      console.log(`Procesado ${asset}: ${signal.action}`);
    } catch (err) {
      console.error(`Error procesando ${asset}: ${err.message}`);
      // Continuar con el siguiente activo sin detener el bucle
    }
  }
}

// Comandos de Telegram
bot.start((ctx) => ctx.reply('Bienvenido a Sniper V6. Usa /help para comandos.'));
bot.help((ctx) => ctx.reply('*Comandos:*\n/start - Iniciar\n/help - Ayuda\n/status - Estado del radar y lote\n/lote [valor] - Cambiar lote\n/stop - Pausar radar\n/go - Reanudar radar\n/aprender - Calibración masiva\n/limpiar - Borrar datos viejos', { parse_mode: 'Markdown' }));
bot.command('status', (ctx) => {
  const status = radarActive ? 'Activo' : 'Pausado';
  ctx.reply(`Radar: ${status}\nLote actual: ${currentLot}`, { parse_mode: 'Markdown' });
});
bot.command('lote', (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args.length > 1) {
    const newLot = parseFloat(args[1]);
    if (!isNaN(newLot) && newLot > 0) {
      currentLot = newLot;
      ctx.reply(`Lote cambiado a ${currentLot}`);
    } else {
      ctx.reply('Valor de lote inválido');
    }
  } else {
    ctx.reply('Uso: /lote [valor]');
  }
});
bot.command('stop', (ctx) => {
  radarActive = false;
  ctx.reply('Radar pausado');
});
bot.command('go', (ctx) => {
  radarActive = true;
  ctx.reply('Radar reanudado');
});
bot.command('aprender', async (ctx) => {
  await processAssets();
  ctx.reply('Calibración masiva completada');
});
bot.command('limpiar', async (ctx) => {
  const { error } = await supabase.from('learning_db').delete().lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // Borrar >30 días
  if (error) {
    ctx.reply('Error limpiando datos');
  } else {
    ctx.reply('Datos viejos borrados');
  }
});

// Servidor Express
app.get('/', (req, res) => res.send('Sniper V6 corriendo'));
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));

// Bucle infinito cada 60s
setInterval(processAssets, 60000);

// Lanzar bot con delay para evitar 409
setTimeout(() => {
  bot.launch();
}, 5000);

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
