import { CONFIG } from './config';
import { SolanaWallet } from './blockchain/solana-wallet';
import { TradingPipeline } from './analysis/trading-pipeline';
import { BotDetector } from './analysis/bot-detector';
import { ListingScanner } from './listing/listing-scanner';
import { PositionManager } from './risk/position-manager';
import { TelegramAlert } from './alerts/telegram-alert';

// ⚠️ TWITTER REMINDER:
// Siapkan akun Twitter khusus untuk project ini!
// Setelah dapat TWITTER_BEARER_TOKEN → isi di .env

const wallet    = new SolanaWallet();
const pipeline  = new TradingPipeline();
const botCheck  = new BotDetector();
const listing   = new ListingScanner();
const positions = new PositionManager();
const alert     = new TelegramAlert();

let memeLoopRunning = false;
let startBalanceSOL = 0;

async function memeLoop() {
  if (memeLoopRunning) return;
  memeLoopRunning = true;
  try {
    const balance = await wallet.getSOLBalance();
    if (balance < 0.01) { console.log('⚠️ Saldo terlalu rendah'); return; }
    const candidates = await pipeline.runFullPipeline();
    console.log(`[MemeLoop] ${candidates.filter(c => c.shouldBuy).length} lolos filter`);
    for (const token of candidates) {
      if (!token.shouldBuy) continue;
      const { canOpen, sizeSOL } = positions.canOpenNew(balance);
      if (!canOpen) break;
      const botResult = await botCheck.check(token.mint, {
        ...token.dex,
        txCount5m_buys: token.dex?.txCount5m || 0,
        txCount5m_sells: 0
      });
      if (!botResult.isSafe) { console.log(`⚠️ SKIP $${token.symbol}: ${botResult.flags[0]}`); continue; }
      console.log(`✅ BUY $${token.symbol} | Score: ${(token.finalScore * 100).toFixed(0)}% | ${sizeSOL.toFixed(4)} SOL`);
      const buyResult = await wallet.buyToken(token.mint, sizeSOL);
      if (buyResult.success) {
        const tokenBalance = await wallet.getTokenBalance(token.mint);
        positions.open({
          mint: token.mint,
          symbol: token.symbol,
          name: token.name,
          entryPriceUSD: token.dex?.priceUSD || 0,
          amountSOL: sizeSOL,
          tokenAmount: tokenBalance,
          txHash: buyResult.txHash!,
          openedAt: new Date(),
          isListingPlay: false
        });
        await alert.sendBuyAlert(token, sizeSOL, buyResult.txHash);
      }
      await sleep(2000);
    }
    await positions.monitorAll(wallet, alert);
  } catch (err: any) {
    console.error('[MemeLoop] Error:', err.message);
  } finally {
    memeLoopRunning = false;
  }
}

async function listingLoop() {
  try {
    const signals = await listing.scan();
    for (const signal of signals) {
      if (signal.action === 'WATCH') continue;
      if (signal.action === 'ALERT' || !signal.solanaMint) {
        await alert.sendListingAlert(signal);
        continue;
      }
      const balance = await wallet.getSOLBalance();
      const { canOpen, sizeSOL } = positions.canOpenNew(balance);
      if (!canOpen) continue;
      const listingSize = Math.min(sizeSOL * signal.positionMultiplier, 0.3);
      const buyResult = await wallet.buyToken(signal.solanaMint, listingSize);
      if (buyResult.success) {
        const tokenBalance = await wallet.getTokenBalance(signal.solanaMint);
        positions.open({
          mint: signal.solanaMint,
          symbol: signal.symbol,
          name: signal.symbol,
          entryPriceUSD: 0,
          amountSOL: listingSize,
          tokenAmount: tokenBalance,
          txHash: buyResult.txHash!,
          openedAt: new Date(),
          isListingPlay: true
        });
        await alert.sendListingAlert(signal, listingSize, buyResult.txHash);
      }
    }
  } catch (err: any) {
    console.error('[ListingLoop] Error:', err.message);
  }
}

async function hourlyReport() {
  try {
    const balance = await wallet.getSOLBalance();
    const stats = positions.getStats();
    await alert.sendHourlyReport({
      ...stats,
      balanceSOL: balance,
      pnlSOL: balance - startBalanceSOL
    });
  } catch {}
}

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║    SOLANA MEME TRADING BOT v1.0      ║');
  console.log('╚══════════════════════════════════════╝');
  const tgOK = await alert.testConnection();
  if (!tgOK) { console.error('Bot dihentikan — Telegram tidak aktif'); process.exit(1); }
  startBalanceSOL = await wallet.getSOLBalance();
  console.log(`💰 Balance awal: ${startBalanceSOL.toFixed(4)} SOL`);
  if (startBalanceSOL < 0.01) { console.error('❌ Saldo terlalu rendah!'); process.exit(1); }
  await alert.sendStartupMessage(startBalanceSOL);
  memeLoop();
  setInterval(memeLoop, CONFIG.MEME_SCAN_MS);
  listingLoop();
  setInterval(listingLoop, CONFIG.LISTING_SCAN_MS);
  setInterval(hourlyReport, 60 * 60 * 1000);
  console.log('✅ Semua loop aktif!');
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
main().catch(err => { console.error('Fatal:', err); process.exit(1); });
```

