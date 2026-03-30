import { TradingPipeline } from './analysis/trading-pipeline';
import { BotDetector } from './analysis/bot-detector';
import { WhaleTracker } from './blockchain/whale-tracker';
import { ListingScanner } from './listing/listing-scanner';
import { VectorMemory } from './memory/vector-memory';
import { RLTradingAgent } from './rl/trading-agent';

class DummyPositionManager {
  canOpenNew() { return { canOpen: true, sizeSOL: 0.05 }; }
  async calculateProfit() { return 0; }
  getStats() { return { balance: 10, totalPositions: 0 }; }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     AI TRADING AGENT with MEMORY & RL               ║');
  console.log('║  + TradingPipeline + BotDetector + WhaleTracker     ║');
  console.log('║  + VectorMemory + Reinforcement Learning            ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  const pipeline = new TradingPipeline();
  const botCheck = new BotDetector();
  const whaleTracker = new WhaleTracker();
  const listing = new ListingScanner();
  const positions = new DummyPositionManager();
  
  // Inisialisasi Memory & RL
  const memory = new VectorMemory();
  await memory.init();
  const rlAgent = new RLTradingAgent();

  console.log('\n✅ AI Trading Agent aktif dengan kemampuan BELAJAR!');
  console.log('🧠 VectorMemory: menyimpan pola token & hasil trading');
  console.log('🎯 Reinforcement Learning: belajar dari profit/loss');
  console.log('⏱️  Scan setiap 60 detik\n');

  let scanCount = 0;

  while (true) {
    try {
      scanCount++;
      const now = new Date().toLocaleTimeString();
      console.log(`\n${'='.repeat(60)}`);
      console.log(`[SCAN #${scanCount}] ${now}`);
      console.log(`${'='.repeat(60)}`);

      const candidates = await pipeline.runFullPipeline();
      console.log(`\n🔍 Ditemukan ${candidates.length} token kandidat`);

      for (const token of candidates.slice(0, 8)) {
        // Cari memori token serupa
        const similarTokens = await memory.recallSimilar(token);
        const historicalWinRate = similarTokens.length > 0
          ? similarTokens.filter((t: any) => t.outcome > 0).length / similarTokens.length
          : 0.5;

        // RL decision
        const stateKey = rlAgent.getStateKey(token, positions.getStats());
        const rlAction = rlAgent.getAction(stateKey);

        // Bot detector
        const botResult = await botCheck.check(token.mint, {
          txCount5m_buys: token.dex?.txCount5m || 0,
          txCount5m_sells: 0,
        });

        // Gabungan keputusan
        const shouldBuy = token.shouldBuy && 
                          botResult.isSafe && 
                          historicalWinRate > 0.5 &&
                          rlAction === 0;

        console.log(`\n${'─'.repeat(50)}`);
        console.log(`🪙 ${token.symbol} | ${token.name}`);
        console.log(`📋 CA: ${token.mint}`);
        console.log(`💰 Price: $${token.dex?.priceUSD?.toFixed(12) || 'N/A'}`);
        console.log(`💧 Liq: $${(token.dex?.liquidityUSD || 0).toLocaleString()}`);
        console.log(`📊 1h: ${(token.dex?.priceChange1h || 0).toFixed(1)}%`);
        console.log(`🎯 Score: ${((token.finalScore || 0) * 100).toFixed(0)}%`);
        console.log(`🧠 Memory: ${similarTokens.length} similar patterns | WinRate: ${(historicalWinRate * 100).toFixed(0)}%`);
        console.log(`🤖 RL Action: ${rlAgent.getActionName(rlAction)}`);
        console.log(`✅ Decision: ${shouldBuy ? '🔥 BUY' : '⏸️ HOLD'}`);

        // Simulasi learning (nanti di real trading akan update dengan profit real)
        if (shouldBuy) {
          // Simulasi buy (tanpa eksekusi real)
          setTimeout(async () => {
            const profit = Math.random() * 0.2 - 0.1; // simulasi profit -10% s/d +10%
            await memory.remember(token, { profit });
            const reward = profit > 0 ? 1 : profit < 0 ? -1 : 0;
            const nextStateKey = rlAgent.getStateKey(token, positions.getStats());
            rlAgent.update(stateKey, 0, reward, nextStateKey);
            console.log(`📚 Learning: ${token.symbol} profit ${(profit * 100).toFixed(1)}% | Reward: ${reward}`);
          }, 5000);
        }
      }

      console.log(`\n⏳ Next scan in 60 seconds...`);
      await new Promise(r => setTimeout(r, 60000));

    } catch (err: any) {
      console.error(`❌ Error: ${err.message}`);
      await new Promise(r => setTimeout(r, 60000));
    }
  }
}

main().catch(console.error);
