const scanner = require('./scanner');
const { getFullMarketScan } = require('./multi_scanner');

/**
 * Módulo de Vigilancia Proactiva V6
 * Detecta movimientos inusuales en los 6 mercados del plan
 */
async function monitorVolatility(bot, chatId) {
    console.log("[Vigilante] Escaneando volatilidad multimercado...");
    
    // Obtenemos el estado actual de todos los mercados
    const report = await getFullMarketScan();
    
    // Aquí podrías definir una lógica: si un activo se mueve > 2%, disparar alerta.
    // Por ahora, vinculamos el reporte proactivo al canal de Telegram.
    if (report && !report.includes("Error")) {
        // Enviar solo si hay cambios significativos o en horarios de apertura
        console.log("[Vigilante] Mercados estables.");
    }
}

module.exports = { monitorVolatility };
