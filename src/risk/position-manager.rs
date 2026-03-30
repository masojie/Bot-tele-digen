import { SolanaWallet } from '../blockchain/solana-wallet';
import { TelegramAlert } from '../alerts/telegram-alert';
import { CONFIG } from '../config';
import axios from 'axios';

export interface Position {
  mint: string;
  symbol: string;
  name: string;
  entryPriceUSD: number;
  amountSOL: number;
  tokenAmount: number;
  txHash: string;
  openedAt: Date;
  isListingPlay: boolean;
}

export interface PositionResult {
  canOpen: boolean;
  reason?: string;
  sizeSOL: number;
}

export class PositionManager {
  private positions: Map<string, Position> = new Map();
  private closedToday: number = 0;
  private winsToday: number = 0;

  canOpenNew(balanceSOL: number): PositionResult {
    if (this.positions.size >= CONFIG.MAX_OPEN_POSITIONS) {
      return { canOpen: false, reason: 'Maks posisi terbuka tercapai', sizeSOL: 0 };
    }
    const byPortfolio = (balanceSOL * CONFIG.MAX_PORTFOLIO_RISK_PCT) / 100;
    const size = Math.min(byPortfolio, CONFIG.MAX_POSITION_SOL);
    if (size < 0.005) {
      return { canOpen: false, reason: 'Saldo terlalu rendah', sizeSOL: 0 };
    }
    return { canOpen: true, sizeSOL: size };
  }

  open(pos: Position) {
    this.positions.set(pos.mint, pos);
    console.log(`📊 OPEN: $${pos.symbol} | ${pos.amountSOL.toFixed(4)} SOL`);
  }

  getAll(): Position[] {
    return Array.from(this.positions.values());
  }

  getCount(): number {
    return this.positions.size;
  }

  async monitorAll(wallet: SolanaWallet, alert: TelegramAlert) {
    for (const [mint, pos] of this.positions) {
      try {
        const currentPrice = await this.getCurrentPrice(mint);
        if (!currentPrice || pos.entryPriceUSD === 0) continue;

        const pnlPct = ((currentPrice - pos.entryPriceUSD) / pos.entryPriceUSD) * 100;
        const heldMinutes = (Date.now() - pos.openedAt.getTime()) / 60000;

        let shouldClose = false;
        let reason: 'STOP_LOSS' | 'TAKE_PROFIT' | 'TIMEOUT' = 'STOP_LOSS';

        if (pnlPct <= -CONFIG.STOP_LOSS_PCT) {
          shouldClose = true; reason = 'STOP_LOSS';
        } else if (pnlPct >= CONFIG.TAKE_PROFIT_PCT) {
          shouldClose = true; reason = 'TAKE_PROFIT';
        } else if (heldMinutes > 240 && pnlPct < 0) {
          shouldClose = true; reason = 'TIMEOUT';
        }

        if (shouldClose) {
          const tokenBal = await wallet.getTokenBalance(mint);
          if (tokenBal > 0) {
            const sellResult = await wallet.sellToken(mint, tokenBal);
            if (sellResult.success) {
              this.positions.delete(mint);
              this.closedToday++;
              if (pnlPct > 0) this.winsToday++;
              await alert.sendExitAlert(pos.symbol, reason, pnlPct, sellResult.txHash);
            }
          } else {
            this.positions.delete(mint);
          }
        }
      } catch (err: any) {
        console.error(`[Monitor] Error ${pos.symbol}:`, err.message);
      }
    }
  }

  async getCurrentPrice(mint: string): Promise<number | null> {
    try {
      const res = await axios.get(
        `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
        { timeout: 5000 }
      );
      const pair = res.data?.pairs?.[0];
      return pair ? parseFloat(pair.priceUsd) : null;
    } catch {
      return null;
    }
  }

  getStats() {
    return {
      openPositions: this.positions.size,
      closedToday: this.closedToday,
      winsToday: this.winsToday,
      winRate: this.closedToday > 0 ? this.winsToday / this.closedToday : 0,
    };
  }
}
```

---
```
✅ config.ts            → src/config.ts
✅ main.ts              → src/main.ts
✅ solana-wallet.ts     → src/blockchain/solana-wallet.ts
✅ position-manager.ts  → src/risk/position-manager.ts
⬜ telegram-alert.ts
⬜ trading-pipeline.ts
⬜ bot-detector.ts
⬜ listing-scanner.ts
⬜ test-wallet.ts
⬜ test-telegram.ts
⬜ .env.example
⬜ install.sh
