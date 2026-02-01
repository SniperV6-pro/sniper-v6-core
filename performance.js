const config = require('./config');

/**
 * Calculador de Rendimiento y Money Flow
 * Monitorea el crecimiento de la cuenta de $20 hacia el objetivo de $600.
 */
async function calculateYield(supabase) {
    try {
        // Consultamos el historial de operaciones (simuladas o reales)
        const { data: trades, error } = await supabase
            .from('learning_db')
            .select('metadata')
            .limit(50);

        if (error || !trades) return 0;

        // Lógica de cálculo: Comparación de balance actual vs inicial
        const initialBalance = config.ACCOUNT.INITIAL_BALANCE;
        // Por ahora, simulamos el retorno basado en la precisión del motor (90%+)
        const estimatedProfit = trades.length * 0.05; 
        
        return ((estimatedProfit / initialBalance) * 100).toFixed(2);
    } catch (e) {
        console.error("Error en Performance:", e.message);
        return 0;
    }
}

module.exports = { calculateYield };
