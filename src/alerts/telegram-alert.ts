import axios from 'axios';
import { CONFIG } from '../config';

export class TelegramAlert {
  private base: string;
  private chatId: string;

  constructor() {
    this.base = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}`;
    this.chatId = CONFIG.TELEGRAM_CHAT_ID;
  }

  async testConnection(): Promise<boolean> {
    try {
      const res = await axios.get(`${this.base}/getMe`, { timeout: 5000 });
      console.log(`✅ Telegram bot aktif: @${res.data.result.username}`);
      return true;
    } catch {
      console.error('❌ Telegram bot gagal — cek TELEGRAM_BOT_TOKEN di .env');
      return false;
    }
  }

  async send(text: string) {
    try {
      await axios.post(`${this.base}/sendMessage`, {
        chat_id: this.chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }, { timeout: 8000 });
    } catch (err: any) {
      console.error('[Alert] Gagal kirim Telegram:', err.message);
    }
  }

  async sendBuyAlert(token: any, posSOL: number, txHash?: string) {
    const bar = this.bar(token.finalScore);
    const binScore = token.binancePotential?.score || 0;
    const actEmoji = token.activityEmoji || '❓';
    const actLabel = token.activityLabel || 'Unknown';

    const whale = token.whaleSnapshot;
    const whaleLines = (whale && whale.whales && whale.whales.length > 0)
      ? `\n🐋 <b>Whale Activity [${whale.signal}]:</b> ${whale.summary}\n` +
        whale.whales.slice(0, 3).map((w: any) => {
          const buyTag = w.recentBuys > 0 ? ` ✅ beli ${w.recentBuys}x` : '';
          return `• ${w.label} <code>${w.address}</code> — ${(w.holdPct * 100).toFixed(2)}%${buyTag}`;
        }).join('\n')
      : '';

    const msg = `
✨ <b>GEM DIBELI OTOMATIS</b>

💎 <b>$${token.symbol}</b> — ${token.name}
📋 CA: <code>${token.mint}</code>
${bar} Score: <b>${(token.finalScore * 100).toFixed(0)}%</b>
${actEmoji} Aktivitas: <b>${actLabel}</b>

📊 <b>Kondisi pasar:</b>
- Likuiditas: <b>$${this.fmt(token.dex.liquidityUSD)}</b>
- Volume 1h: <b>$${this.fmt(token.dex.volumeUSD1h)}</b>
- Pump 5m: <b>${token.dex.priceChange5m > 0 ? '+' : ''}${token.dex.priceChange5m.toFixed(1)}%</b>
- Pump 1h: <b>${token.dex.priceChange1h > 0 ? '+' : ''}${token.dex.priceChange1h.toFixed(1)}%</b>
${whaleLines}
${binScore >= 0.40 ? `🎯 <b>Potensi Binance: ${(binScore * 100).toFixed(0)}%</b>\n${token.binancePotential.narrative}\n` : ''}
💰 Posisi: <b>${posSOL.toFixed(4)} SOL</b>
🛡️ Stop Loss: -${CONFIG.STOP_LOSS_PCT}% | Take Profit: +${CONFIG.TAKE_PROFIT_PCT}%
${txHash ? `\n🔗 <a href="https://solscan.io/tx/${txHash}">Lihat TX di Solscan</a>` : ''}`.trim();
    await this.send(msg);
  }

  async sendListingAlert(signal: any, posSOL?: number, txHash?: string) {
    const emoji = signal.score >= 0.65 ? '🔴' : signal.score >= 0.40 ? '🟡' : '⚪';
    const actionText = signal.action === 'BUY'
      ? `✅ BELI OTOMATIS (${signal.positionMultiplier}x posisi)`
      : '👁 PANTAU — belum beli';

    const whale = signal.whaleSnapshot;
    const whaleLines = (whale && whale.whales && whale.whales.length > 0)
      ? `\n🐋 <b>Whale Activity [${whale.signal}]:</b> ${whale.summary}\n` +
        whale.whales.slice(0, 3).map((w: any) => {
          const buyTag = w.recentBuys > 0 ? ` ✅ beli ${w.recentBuys}x` : '';
          return `• ${w.label} <code>${w.address}</code> — ${(w.holdPct * 100).toFixed(2)}%${buyTag}`;
        }).join('\n')
      : '';

    const caLine = signal.solanaMint ? `📋 CA: <code>${signal.solanaMint}</code>\n` : '';

    const msg = `
${emoji} <b>SINYAL LISTING BINANCE!</b>

💎 Token: <b>$${signal.symbol}</b>
${caLine}📊 Confidence: <b>${(signal.score * 100).toFixed(0)}%</b>

📡 <b>Sinyal terdeteksi:</b>
${signal.sources.map((s: string) => `• ${s}`).join('\n')}

🧠 <b>Analisis:</b>
${signal.narrative}
${whaleLines}
🎯 <b>Aksi bot:</b> ${actionText}
${posSOL ? `💰 Posisi: <b>${posSOL.toFixed(4)} SOL</b>` : ''}
${txHash ? `\n🔗 <a href="https://solscan.io/tx/${txHash}">Lihat TX di Solscan</a>` : ''}

⚠️ <i>Bukan financial advice. DYOR.</i>`.trim();
    await this.send(msg);
  }

  async sendExitAlert(symbol: string, reason: string, pnlPct: number, txHash?: string) {
    const emoji = pnlPct >= 0 ? '🟢' : '🔴';
    const msg = `
${emoji} <b>${reason === 'TAKE_PROFIT' ? 'PROFIT DIAMBIL' : 'POSISI DITUTUP'}</b>

💎 Token: <b>$${symbol}</b>
📈 PnL: <b>${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%</b>
📋 Alasan: ${reason === 'TAKE_PROFIT' ? 'Target profit tercapai' : reason === 'TIMEOUT' ? 'Timeout 4 jam' : 'Stop loss triggered'}
${txHash ? `\n🔗 <a href="https://solscan.io/tx/${txHash}">Lihat TX di Solscan</a>` : ''}`.trim();
    await this.send(msg);
  }

  async sendHourlyReport(stats: any) {
    const wRate = stats.closedToday > 0
      ? ((stats.winsToday / stats.closedToday) * 100).toFixed(0) : '—';
    const msg = `
📊 <b>LAPORAN JAM</b>
🕐 ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB

💼 Posisi terbuka: <b>${stats.openPositions}</b>
🔄 Trade ditutup: <b>${stats.closedToday}</b>
🎯 Win rate: <b>${wRate}%</b>
💰 Balance: <b>${stats.balanceSOL.toFixed(4)} SOL</b>
📈 PnL: <b>${stats.pnlSOL >= 0 ? '+' : ''}${stats.pnlSOL.toFixed(4)} SOL</b>`.trim();
    await this.send(msg);
  }

  async sendStartupMessage(balanceSOL: number) {
    const msg = `
🚀 <b>SOLANA TRADING BOT v2.0 AKTIF</b>

💰 Balance: <b>${balanceSOL.toFixed(4)} SOL</b>
⚙️ Mode: Pump.fun → DexScreener → Binance Scout
🛡️ Stop Loss: ${CONFIG.STOP_LOSS_PCT}% | TP: ${CONFIG.TAKE_PROFIT_PCT}%
📦 Maks posisi: ${CONFIG.MAX_OPEN_POSITIONS}

🆕 <b>Fitur baru:</b>
• 📋 CA ditampilkan di setiap sinyal
• 👤🧠🤖 Klasifikasi aktivitas: Manusia / AI / Bot
• 🐋 Whale tracker — pantau wallet besar yang sudah beli

Pipeline aktif:
- Meme scan: setiap 30 detik
- Listing scan: setiap 5 menit
- Laporan: setiap jam

Bot siap trading! 💪`.trim();
    await this.send(msg);
  }

  private bar(score: number): string {
    const f = Math.round(score * 10);
    return '█'.repeat(f) + '░'.repeat(10 - f);
  }

  private fmt(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toFixed(0);
  }
}
