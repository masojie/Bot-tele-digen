/**
 * MONITOR ONLY - No RPC, No .env
 * Pure monitoring dengan DexScreener
 */

import axios from 'axios';

async function monitor() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     MONITOR ONLY - Solana Meme Token Scanner        ║');
  console.log('║  Data: DexScreener | Real-time | No RPC Required    ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('\n✅ Mode monitoring aktif!');
  console.log('⏱️  Scan setiap 30 detik. Tekan Ctrl+C untuk berhenti.\n');

  let scanCount = 0;
  const seen = new Set();

  while (true) {
    try {
      scanCount++;
      const now = new Date().toLocaleTimeString();
      console.log(`\n${'='.repeat(60)}`);
      console.log(`[SCAN #${scanCount}] ${now}`);
      console.log(`${'='.repeat(60)}`);

      // Ambil token baru dari DexScreener
      const profileRes = await axios.get('https://api.dexscreener.com/token-profiles/latest/v1', { timeout: 10000 });
      const solTokens = profileRes.data.filter((t: any) => t.chainId === 'solana');

      console.log(`\n📦 Token baru di Solana: ${solTokens.length}`);

      for (const token of solTokens.slice(0, 10)) {
        const addr = token.tokenAddress;
        if (seen.has(addr)) continue;
        seen.add(addr);

        try {
          const detailRes = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${addr}`, { timeout: 10000 });
          const pair = detailRes.data.pairs?.[0];
          if (!pair) continue;

          const price = parseFloat(pair.priceUsd || 0);
          const liq = parseFloat(pair.liquidity?.usd || 0);
          const vol1h = parseFloat(pair.volume?.h1 || 0);
          const change1h = parseFloat(pair.priceChange?.h1 || 0);
          const buys = pair.txns?.h1?.buys || 0;
          const sells = pair.txns?.h1?.sells || 0;

          // Hitung score sederhana
          let score = 50;
          if (liq > 50000) score += 20;
          if (vol1h > 50000) score += 15;
          if (change1h > 10) score += 15;
          if (change1h < -10) score -= 15;

          console.log(`\n${'─'.repeat(50)}`);
          console.log(`🪙 ${pair.baseToken?.symbol || '?'} | ${pair.baseToken?.name || '?'}`);
          console.log(`📋 CA: ${addr}`);
          console.log(`💰 Price: $${price.toFixed(12)}`);
          console.log(`💧 Liquidity: $${liq.toLocaleString()}`);
          console.log(`📈 Volume 1h: $${vol1h.toLocaleString()}`);
          console.log(`📊 1h Change: ${change1h > 0 ? '+' : ''}${change1h.toFixed(1)}%`);
          console.log(`🔄 Tx 1h: Buy ${buys} | Sell ${sells}`);
          console.log(`🎯 Score: ${score}% | ${score >= 70 ? '🔥 POTENTIAL' : score >= 50 ? '⏸️ WATCH' : '⚠️ AVOID'}`);

          await new Promise(r => setTimeout(r, 500));
        } catch (e) {}
      }

      console.log(`\n⏳ Next scan in 30 seconds...`);
      await new Promise(r => setTimeout(r, 30000));

    } catch (err: any) {
      console.error(`❌ Error: ${err.message}`);
      await new Promise(r => setTimeout(r, 30000));
    }
  }
}

monitor().catch(console.error);
