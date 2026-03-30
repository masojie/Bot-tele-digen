"use strict";
/**
 * MAIN.TS - Version for monitoring mode
 * Comment out parts that need position-manager and wallet
 */
Object.defineProperty(exports, "__esModule", { value: true });
// Comment out yang bermasalah dulu
// import { PositionManager } from './risk/position-manager';
// import { SolanaWallet } from './blockchain/solana-wallet';
const trading_pipeline_1 = require("./analysis/trading-pipeline");
const bot_detector_1 = require("./analysis/bot-detector");
const listing_scanner_1 = require("./listing/listing-scanner");
const whale_tracker_1 = require("./blockchain/whale-tracker");
// Dummy classes untuk monitoring
class DummyPositionManager {
    canOpenNew() { return { canOpen: true, sizeSOL: 0.05 }; }
    open() { }
    monitorAll() { }
    getStats() { return { totalPositions: 0, pnlSOL: 0, balance: 10 }; }
    async calculateProfit() { return 0; }
}
class DummyWallet {
    async getSOLBalance() { return 10; }
    async buyToken() { return { success: false, txHash: null }; }
    async getTokenBalance() { return 0; }
}
class DummyAlert {
    async testConnection() { return true; }
    async sendBuyAlert() { }
    async sendListingAlert() { }
    async sendHourlyReport() { }
    async sendStartupMessage() { }
}
async function main() {
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║     MONITOR MODE - TradingPipeline Active           ║');
    console.log('║  + BotDetector + WhaleTracker + ListingScanner      ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    const pipeline = new trading_pipeline_1.TradingPipeline();
    const botCheck = new bot_detector_1.BotDetector();
    const whaleTracker = new whale_tracker_1.WhaleTracker();
    const listing = new listing_scanner_1.ListingScanner();
    const positions = new DummyPositionManager();
    const dummyWallet = new DummyWallet();
    const dummyAlert = new DummyAlert();
    console.log('\n✅ Mode monitoring aktif!');
    console.log('📡 Data: DexScreener (via pipeline)');
    console.log('🤖 AI Agents aktif: TradingPipeline, BotDetector, WhaleTracker');
    console.log('⏱️  Scan setiap 60 detik. Tekan Ctrl+C untuk berhenti.\n');
    let scanCount = 0;
    while (true) {
        try {
            scanCount++;
            const now = new Date().toLocaleTimeString();
            console.log(`\n${'='.repeat(60)}`);
            console.log(`[SCAN #${scanCount}] ${now}`);
            console.log(`${'='.repeat(60)}`);
            // Run pipeline
            const candidates = await pipeline.runFullPipeline();
            console.log(`\n🔍 Ditemukan ${candidates.length} token kandidat`);
            for (const token of candidates.slice(0, 8)) {
                console.log(`\n${'─'.repeat(50)}`);
                console.log(`🪙 ${token.symbol} | ${token.name}`);
                console.log(`📋 CA: ${token.mint}`);
                console.log(`💰 Price: $${token.dex?.priceUSD?.toFixed(12) || 'N/A'}`);
                console.log(`💧 Liq: $${(token.dex?.liquidityUSD || 0).toLocaleString()}`);
                console.log(`📈 Vol 1h: $${(token.dex?.volumeUSD1h || 0).toLocaleString()}`);
                console.log(`📊 1h: ${(token.dex?.priceChange1h || 0).toFixed(1)}%`);
                console.log(`🎯 Score: ${((token.finalScore || 0) * 100).toFixed(0)}%`);
                console.log(`✅ Should Buy: ${token.shouldBuy ? 'YES' : 'NO'}`);
                // Bot detector
                const botResult = await botCheck.check(token.mint, {
                    txCount5m_buys: token.dex?.txCount5m || 0,
                    txCount5m_sells: 0,
                });
                console.log(`\n🤖 Bot: ${botResult.activityEmoji} ${botResult.activityType} | ${botResult.activityLabel}`);
                console.log(`   Risk: ${(botResult.botRiskScore * 100).toFixed(0)}% | Safe: ${botResult.isSafe ? '✅' : '❌'}`);
                // Whale tracker
                const whale = await whaleTracker.getWhaleSnapshot(token.mint);
                console.log(`\n🐋 Whale: ${whale.signal} | ${whale.summary}`);
            }
            console.log(`\n⏳ Next scan in 60 seconds...`);
            await new Promise(r => setTimeout(r, 60000));
        }
        catch (err) {
            console.error(`❌ Error: ${err.message}`);
            await new Promise(r => setTimeout(r, 60000));
        }
    }
}
main().catch(console.error);
