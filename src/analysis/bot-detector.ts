import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';
import { CONFIG } from '../config';

export type ActivityType = 'HUMAN' | 'AI' | 'BOT';

export interface BotCheckResult {
  isSafe: boolean;
  botRiskScore: number;
  flags: string[];
  greenFlags: string[];
  activityType: ActivityType;
  activityLabel: string;
  activityEmoji: string;
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
    let botSignals = 0;
    let aiSignals = 0;

    const buys = dexData.txCount5m_buys || 0;
    const sells = dexData.txCount5m_sells || 0;
    const total = buys + sells;

    if (total > 0) {
      const buyRatio = buys / total;
      if (buyRatio > 0.90) {
        riskScore += 0.25;
        botSignals += 2;
        flags.push(`Buy ratio ${(buyRatio * 100).toFixed(0)}% — koordinasi mencurigakan`);
      } else if (buyRatio > 0.80) {
        riskScore += 0.10;
        aiSignals += 1;
        flags.push(`Buy ratio ${(buyRatio * 100).toFixed(0)}% — kemungkinan algo/AI`);
      } else if (buyRatio > 0.70) {
        greenFlags.push('Buy/sell ratio sehat');
      }
    }

    if (total > 200) {
      botSignals += 1;
      flags.push(`Volume tx 5m sangat tinggi (${total} tx) — kemungkinan bot`);
    } else if (total > 50) {
      aiSignals += 1;
    }

    const volToLiq = (dexData.volumeUSD1h || 0) / Math.max(dexData.liquidityUSD || 1, 1);
    if (volToLiq > 20) {
      riskScore += 0.25;
      botSignals += 2;
      flags.push('Volume/likuiditas ratio ekstrem — kemungkinan wash trade');
    } else if (volToLiq > 5) {
      riskScore += 0.10;
      aiSignals += 1;
    } else {
      greenFlags.push('Volume/likuiditas ratio normal');
    }

    const txInterval = await this.checkTxInterval(mint);
    if (txInterval.isBot) {
      riskScore += 0.20;
      botSignals += 2;
      flags.push(`Interval TX terlalu konsisten (${txInterval.avgMs}ms avg) — bot pattern`);
    } else if (txInterval.isAi) {
      aiSignals += 1;
      flags.push('Pola TX sistematis — kemungkinan algo/AI');
    }

    const holderRisk = await this.checkHolders(mint);
    riskScore += holderRisk.risk;
    flags.push(...holderRisk.flags);
    greenFlags.push(...holderRisk.greenFlags);
    if (holderRisk.risk > 0.20) botSignals += 1;

    const finalRisk = Math.min(1, riskScore);
    const isSafe = finalRisk < 0.50 && flags.length <= 1;

    const activityType = this.classifyActivity(botSignals, aiSignals, finalRisk);
    const { activityLabel, activityEmoji } = this.getActivityDisplay(activityType);

    return { isSafe, botRiskScore: finalRisk, flags, greenFlags, activityType, activityLabel, activityEmoji };
  }

  private classifyActivity(botSignals: number, aiSignals: number, riskScore: number): ActivityType {
    if (botSignals >= 3 || riskScore >= 0.60) return 'BOT';
    if (aiSignals >= 2 || (botSignals >= 1 && aiSignals >= 1)) return 'AI';
    return 'HUMAN';
  }

  private getActivityDisplay(type: ActivityType): { activityLabel: string; activityEmoji: string } {
    switch (type) {
      case 'BOT':
        return { activityLabel: 'BOT', activityEmoji: '🤖' };
      case 'AI':
        return { activityLabel: 'AI/Algo', activityEmoji: '🧠' };
      case 'HUMAN':
        return { activityLabel: 'Manusia', activityEmoji: '👤' };
    }
  }

  private async checkTxInterval(mint: string): Promise<{ isBot: boolean; isAi: boolean; avgMs: number }> {
    try {
      const sigs = await this.connection.getSignaturesForAddress(new PublicKey(mint), { limit: 20 });
      if (sigs.length < 5) return { isBot: false, isAi: false, avgMs: 0 };
      const times = sigs
        .filter(s => s.blockTime)
        .map(s => s.blockTime! * 1000)
        .sort((a, b) => a - b);
      const intervals: number[] = [];
      for (let i = 1; i < times.length; i++) intervals.push(times[i] - times[i - 1]);
      if (intervals.length === 0) return { isBot: false, isAi: false, avgMs: 0 };
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);
      const cv = stdDev / Math.max(avg, 1);
      const isBot = cv < 0.15 && avg < 3000;
      const isAi = cv < 0.35 && avg < 10000 && !isBot;
      return { isBot, isAi, avgMs: Math.round(avg) };
    } catch {
      return { isBot: false, isAi: false, avgMs: 0 };
    }
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
      if (top1Pct > 0.30) {
        risk += 0.30;
        flags.push(`Wallet terbesar pegang ${(top1Pct * 100).toFixed(0)}% supply`);
      } else if (top1Pct < 0.10) {
        greenFlags.push('Distribusi token merata');
      }
      if (top5Pct > 0.60) {
        risk += 0.15;
        flags.push(`Top 5 wallet pegang ${(top5Pct * 100).toFixed(0)}% supply`);
      }
    } catch {}
    return { risk, flags, greenFlags };
  }
        }
