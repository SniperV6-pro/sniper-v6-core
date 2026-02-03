const { createClient } = require('@supabase/supabase-js');
const { analyze } = require('./engine');
const { SUPABASE_URL, SUPABASE_KEY, ASSETS } = require('./config');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function backtest() {
  console.log('Iniciando backtest...');
  for (const asset of ASSETS) {
    const { data: prices } = await supabase
      .from('learning_db')
      .select('price, created_at')
      .eq('asset', asset)
      .order('created_at', { ascending: true })
      .limit(100);

    if (!prices || prices.length < 20) continue;

    let wins = 0, losses = 0;
    for (let i = 20; i < prices.length; i++) {
      const currentPrice = prices[i].price;
      const signal = await analyze(supabase, asset, currentPrice, 0);
      if (signal.action === 'ENTRADA') {
        const futurePrice = prices[Math.min(i + 5, prices.length - 1)].price;
        if ((signal.direction === 'COMPRA' && futurePrice > currentPrice) ||
            (signal.direction === 'VENTA' && futurePrice < currentPrice)) {
          wins++;
        } else {
          losses++;
        }
      }
    }
    const winrate = (wins / (wins + losses)) * 100;
    console.log(`${asset}: Wins ${wins}, Losses ${losses}, Winrate ${winrate.toFixed(2)}%`);
  }
}

backtest();
