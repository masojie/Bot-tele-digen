/**
 * MONITOR MODE - Menggunakan logika main.ts
 * Tanpa wallet, tanpa eksekusi, hanya monitoring
 */

import { TradingPipeline } from './analysis/trading-pipeline';
import { BotDetector } from './analysis/bot-detector';
import { ListingScanner } from './listing/listing-scanner';
import { WhaleTracker } from './blockchain/whale-tracker';

// ========== DUMMY CLASS untuk menggantikan fungsi yang butuh wallet ==========
class DummyWallet {
  async getSOLBalance() { return 999; }
  async buyToken() { return { success: false, txHash: null }; }
  async getTokenBalance() { return 0; }
}

class DummyPositionManager {
  canOpenNew() { return { canOpen: false, sizeSOL: 0 }; }
  open() {}
  monitorAll() {}
  getStats() { return { totalPositions: 0, pnlSOL: 0 }; }
}

class DummyAlert {
  async testConnection() { return true; }
  async sendBuyAlert() {}
  async sendListingAlert() {}
  async sendHourlyReport() {}
  async sendStartupMessage() {}
}

// ========== MAIN MONITOR ==========
async function monitorOnly() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     MONITOR MODE - Menggunakan logika main.ts       ║');
  console.log('║  + Multi-Agent AI  + Bot Detector  + Whale Tracker  ║');
  console.log('║  Tanpa wallet, tanpa eksekusi, hanya monitoring     ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  // Inisialisasi komponen AI dari main.ts
  const pipeline = new TradingPipeline();
  const botCheck = new BotDetector();
  const listing = new ListingScanner();
  const whaleTracker = new WhaleTracker();
  
  // Dummy untuk menggantikan fungsi yang butuh wallet
  const dummyWallet = new DummyWallet();
  const dummyPositions = new DummyPositionManager();
  const dummyAlert = new DummyAlert();

  let scanCount = 0;

  console.log('\n✅ Mode monitoring aktif!');
  console.log('📡 AI Agents: TradingPipeline (4 analis) + BotDetector + WhaleTracker');
  console.log('⏱️  Scan setiap 60 detik. Tekan Ctrl+C untuk berhenti.\n');

  while (true) {
    try {
      scanCount++;
      const now = new Date().toLocaleTimeString();
      console.log(`\n${'='.repeat(60)}`);
      console.log(`[SCAN #${scanCount}] ${now}`);
      console.log(`${'='.repeat(60)}`);

      // ========== 1. Jalankan TradingPipeline (4 analis) ==========
      console.log('\n🔍 [TradingPipeline] Menganalisis token baru...');
      const candidates = await pipeline.runFullPipeline();
      console.log(`   📊 Ditemukan ${candidates.length} token kandidat`);

      // ========== 2. Analisis tiap token dengan BotDetector ==========
      for (const token of candidates.slice(0, 10)) {
        console.log(`\n${'─'.repeat(50)}`);
        console.log(`🪙 TOKEN: $${token.symbol} | ${token.name}`);
        console.log(`📋 CA: ${token.mint}`);
        console.log(`💰 Price: $${token.dex?.priceUSD?.toFixed(12) || 'N/A'}`);
        console.log(`💧 Liquidity: $${(token.dex?.liquidityUSD || 0).toLocaleString()}`);
        console.log(`📈 Volume 1h: $${(token.dex?.volumeUSD1h || 0).toLocaleString()}`);
        console.log(`📊 1h Change: ${(token.dex?.priceChange1h || 0).toFixed(1)}%`);
        console.log(`🔄 Final Score: ${((token.finalScore || 0) * 100).toFixed(0)}%`);
        console.log(`🎯 Should Buy: ${token.shouldBuy ? '✅ YES' : '❌ NO'}`);

        // Bot Detector
        const botResult = await botCheck.check(token.mint, {
          ...token.dex,
          txCount5m_buys: token.dex?.txCount5m || 0,
          txCount5m_sells: 0,
        });
        console.log(`\n🤖 [BotDetector]`);
        console.log(`   Activity: ${botResult.activityEmoji} ${botResult.activityType} | ${botResult.activityLabel}`);
        console.log(`   Risk Score: ${(botResult.botRiskScore * 100).toFixed(0)}%`);
        console.log(`   Safe: ${botResult.isSafe ? '✅' : '❌'}`);
        if (botResult.flags.length) {
          console.log(`   Flags: ${botResult.flags.join(', ')}`);
        }

        // Whale Tracker
        const whaleSnap = await whaleTracker.getWhaleSnapshot(token.mint);
        const wLine = whaleTracker.formatForTerminal(whaleSnap);
        console.log(`\n🐋 [WhaleTracker]`);
        console.log(`   Signal: ${whaleSnap.signal === 'BULLISH' ? '🟢' : whaleSnap.signal === 'BEARISH' ? '🔴' : '🟡'} ${whaleSnap.signal}`);
        console.log(`   ${whaleSnap.summary}`);
        if (whaleSnap.whales.length) {
          console.log(`   🐳 Whales detected:`);
          for (const w of whaleSnap.whales.slice(0, 3)) {
            console.log(`      - ${w.label} ${w.shortAddr} (${(w.holdPct * 100).toFixed(1)}%)`);
          }
        }
      }

      // ========== 3. Listing Scanner ==========
      console.log(`\n🔔 [ListingScanner] Memeriksa potensi listing...`);
      const listingSignals = await listing.scan();
      for (const signal of listingSignals) {
        console.log(`   🪙 $${signal.symbol} | Score: ${(signal.score * 100).toFixed(0)}% | Action: ${signal.action}`);
        if (signal.solanaMint) {
          console.log(`      CA: ${signal.solanaMint}`);
        }
      }

      console.log(`\n⏳ Scan berikutnya dalam 60 detik...`);
      await new Promise(resolve => setTimeout(resolve, 60000));

    } catch (err: any) {
      console.error(`❌ Error: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
  }
}

// Jalankan
monitorOnly().catch(console.error);
