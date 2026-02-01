module.exports = {
    calculateYield: async (supabase) => {
        const { data } = await supabase.from('learning_db').select('price').limit(100);
        if (!data || data.length < 2) return "0.00%";
        
        const initial = data[data.length - 1].price;
        const current = data[0].price;
        const yieldPerc = ((current - initial) / initial) * 100;
        
        return `${yieldPerc.toFixed(2)}%`;
    }
};
