import { Connection, PublicKey } from '@solana/web3.js';
import { CONFIG } from '../config';

export interface BotCheckResult {
  isSafe: boolean;
  botRiskScore: number;
  flags: string[];
  greenFlags: string[];
}

export class BotDetector {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(CONFIG.RPC_URL, 'confirmed');
  }

  async check(mint: string, dexData: any): Promise<BotCheckResult> {
    const flags: string[] = [];
    const greenFlags: string[] = [];
    let riskScore = 0;

    const buys = dexData.txCount5m_buys || 0;
    const sells = dexData.txCount5m_sells || 0;
    const total = buys + sells;
    if (total > 0) {
      const buyRatio = buys / total;
      if (buyRatio > 0.90) { riskScore += 0.20; flags.push(`Buy ratio ${(buyRatio * 100).toFixed(0)}% — suspek koordinasi`); }
      else if (buyRatio > 0.70) greenFlags.push('Buy/sell ratio sehat');
    }

    const volToLiq = dexData.volumeUSD1h / Math.max(dexData.liquidityUSD, 1);
    if (volToLiq > 20) { riskScore += 0.25; flags.push('Volume/likuiditas ratio ekstrem — kemungkinan wash trade'); }
    else if (volToLiq > 5) riskScore += 0.10;
    else greenFlags.push('Volume/likuiditas ratio normal');

    const holderRisk = await this.checkHolders(mint);
    riskScore += holderRisk.risk;
    flags.push(...holderRisk.flags);
    greenFlags.push(...holderRisk.greenFlags);

    const finalRisk = Math.min(1, riskScore);
    return { isSafe: finalRisk < 0.50 && flags.length <= 1, botRiskScore: finalRisk, flags, greenFlags };
  }

  private async checkHolders(mint: string): Promise<{ risk: number; flags: string[]; greenFlags: string[] }> {
    const flags: string[] = [];
    const greenFlags: string[] = [];
    let risk = 0;
    try {
      const holders = await this.connection.getTokenLargestAccounts(new PublicKey(mint));
      const accounts = holders.value;
      if (accounts.length === 0) return { risk: 0.1, flags, greenFlags };
      const total = accounts.reduce((s, a) => s + (a.uiAmount || 0), 0);
      const top1Pct = total > 0 ? (accounts[0].uiAmount || 0) / total : 0;
      const top5Total = accounts.slice(0, 5).reduce((s, a) => s + (a.uiAmount || 0), 0);
      const top5Pct = total > 0 ? top5Total / total : 0;
      if (top1Pct > 0.30) { risk += 0.30; flags.push(`Wallet terbesar pegang ${(top1Pct * 100).toFixed(0)}% supply`); }
      else if (top1Pct < 0.10) greenFlags.push('Distribusi token merata');
      if (top5Pct > 0.60) { risk += 0.15; flags.push(`Top 5 wallet pegang ${(top5Pct * 100).toFixed(0)}% supply`); }
    } catch {}
    return { risk, flags, greenFlags };
  }
}
