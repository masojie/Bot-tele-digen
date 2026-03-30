"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradingPipeline = void 0;
const axios_1 = __importDefault(require("axios"));
const whale_tracker_1 = require("../blockchain/whale-tracker");
class TradingPipeline {
    constructor() {
        this.scannedMints = new Set();
        this.whaleTracker = new whale_tracker_1.WhaleTracker();
    }
    async fetchPumpFunTokens() {
        try {
            const response = await axios_1.default.get('https://frontend-api.pump.fun/coins', {
                params: { offset: 0, limit: 50, sort: 'last_trade_timestamp', order: 'DESC', includeNsfw: false },
                headers: { 'Accept': 'application/json' },
                timeout: 8000,
            });
            const coins = response.data || [];
            const fresh = [];
            for (const coin of coins) {
                if (this.scannedMints.has(coin.mint))
                    continue;
                this.scannedMints.add(coin.mint);
                if (this.scannedMints.size > 2000) {
                    const first = this.scannedMints.values().next().value;
                    this.scannedMints.delete(first);
                }
                fresh.push({
                    mint: coin.mint,
                    symbol: coin.symbol || '???',
                    name: coin.name || '',
                    createdAt: new Date(coin.created_timestamp || Date.now()),
                    pumpProgress: coin.virtual_sol_reserves ? Math.min(100, (coin.virtual_sol_reserves / 85) * 100) : 0,
                    marketCapUSD: coin.usd_market_cap || 0,
                    replyCount: coin.reply_count || 0,
                    devHoldPct: coin.top_holder_pct || 0,
                });
            }
            return fresh;
        }
        catch (err) {
            console.error('[PumpFun] Fetch gagal:', err.message);
            return [];
        }
    }
    async validateOnDexScreener(mint) {
        try {
            await this.sleep(300);
            const res = await axios_1.default.get(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, { timeout: 6000 });
            const pairs = res.data?.pairs || [];
            const solanaPairs = pairs.filter((p) => p.chainId === 'solana');
            if (solanaPairs.length === 0)
                return null;
            const best = solanaPairs.sort((a, b) => parseFloat(b.volume?.h24 || '0') - parseFloat(a.volume?.h24 || '0'))[0];
            return {
                priceUSD: parseFloat(best.priceUsd || '0'),
                liquidityUSD: parseFloat(best.liquidity?.usd || '0'),
                volumeUSD1h: parseFloat(best.volume?.h1 || '0'),
                volumeUSD24h: parseFloat(best.volume?.h24 || '0'),
                priceChange5m: parseFloat(best.priceChange?.m5 || '0'),
                priceChange1h: parseFloat(best.priceChange?.h1 || '0'),
                txCount5m: parseInt(best.txns?.m5?.buys || '0') + parseInt(best.txns?.m5?.sells || '0'),
                pairAddress: best.pairAddress,
                dexId: best.dexId,
            };
        }
        catch {
            return null;
        }
    }
    analyzeBinancePotential(token, dex) {
        let score = 0;
        const signals = [];
        if ((token.replyCount || 0) > 100) {
            score += 0.10;
            signals.push('Komunitas aktif (100+ reply)');
        }
        if ((token.replyCount || 0) > 500) {
            score += 0.10;
            signals.push('Viral di pump.fun (500+ reply)');
        }
        if (dex.liquidityUSD > 100000) {
            score += 0.15;
            signals.push(`Likuiditas kuat ($${this.fmt(dex.liquidityUSD)})`);
        }
        if (dex.liquidityUSD > 500000) {
            score += 0.10;
            signals.push('Likuiditas sangat tinggi (>$500k)');
        }
        if (dex.volumeUSD24h > 1000000) {
            score += 0.15;
            signals.push(`Volume 24h tinggi ($${this.fmt(dex.volumeUSD24h)})`);
        }
        if (dex.volumeUSD24h > 5000000) {
            score += 0.15;
            signals.push('Volume 24h SANGAT tinggi (>$5M)');
        }
        const mcap = token.marketCapUSD || 0;
        if (mcap >= 5000000 && mcap <= 500000000) {
            score += 0.10;
            signals.push(`Market cap dalam range Binance ($${this.fmt(mcap)})`);
        }
        if (dex.priceChange1h > 20 && dex.priceChange1h < 200) {
            score += 0.08;
            signals.push('Momentum 1h sehat (20-200%)');
        }
        if (dex.dexId === 'raydium') {
            score += 0.07;
            signals.push('Listed di Raydium (DEX tier-1 Solana)');
        }
        if ((token.devHoldPct || 0) < 0.05) {
            score += 0.10;
            signals.push('Dev hold rendah (<5%) — distribusi baik');
        }
        if ((token.devHoldPct || 0) > 0.15) {
            score -= 0.20;
            signals.push('⚠️ Dev hold tinggi — rug risk');
        }
        if (dex.liquidityUSD < 10000)
            score -= 0.30;
        score = Math.max(0, Math.min(1, score));
        const risk = score >= 0.60 ? 'LOW' : score >= 0.35 ? 'MEDIUM' : 'HIGH';
        const narrative = this.buildNarrative(token, dex, score, signals);
        return { score, signals, risk, narrative };
    }
    buildNarrative(token, dex, score, signals) {
        const top = signals.slice(0, 3).join(', ');
        if (score >= 0.60)
            return `$${token.symbol} profil kuat untuk listing Binance: ${top}. Volume $${this.fmt(dex.volumeUSD24h)}/24h dan likuiditas $${this.fmt(dex.liquidityUSD)} menunjukkan demand organik.`;
        if (score >= 0.35)
            return `$${token.symbol} punya sinyal positif (${top}) namun belum cukup kuat. Pantau jika volume meningkat.`;
        return `$${token.symbol} belum memenuhi kriteria listing Binance. Likuiditas dan volume perlu berkembang lebih jauh.`;
    }
    async runFullPipeline() {
        console.log('\n[Pipeline] Pump.fun → DexScreener → Binance Analysis...');
        const rawTokens = await this.fetchPumpFunTokens();
        console.log(`[Pipeline] ${rawTokens.length} token baru dari pump.fun`);
        const candidates = [];
        for (const raw of rawTokens) {
            if (!raw.mint)
                continue;
            if ((raw.devHoldPct || 0) > 0.20)
                continue;
            if ((raw.replyCount || 0) < 3)
                continue;
            const dex = await this.validateOnDexScreener(raw.mint);
            if (!dex)
                continue;
            if (dex.liquidityUSD < 8000)
                continue;
            if (dex.volumeUSD1h < 500)
                continue;
            if (dex.priceChange1h > 500)
                continue;
            const binancePotential = this.analyzeBinancePotential(raw, dex);
            const communityScore = Math.min(1, (raw.replyCount || 0) / 200);
            const dexScore = Math.min(1, dex.liquidityUSD / 50000) * 0.4 +
                Math.min(1, dex.volumeUSD1h / 10000) * 0.3 +
                (dex.priceChange5m > 0 && dex.priceChange5m < 100 ? 0.3 : 0);
            const finalScore = dexScore * 0.50 + communityScore * 0.20 + binancePotential.score * 0.30;
            const shouldBuy = finalScore >= 0.60 && binancePotential.risk !== 'HIGH';
            const whaleSnapshot = await this.whaleTracker.getWhaleSnapshot(raw.mint);
            candidates.push({ ...raw, dex, binancePotential, finalScore, shouldBuy, whaleSnapshot });
        }
        return candidates.sort((a, b) => b.finalScore - a.finalScore);
    }
    getWhaleTracker() {
        return this.whaleTracker;
    }
    async analyzeMissedOpportunity(mint) {
        try {
            const dex = await this.validateOnDexScreener(mint);
            if (!dex)
                return 'Data tidak tersedia untuk coin ini.';
            const lines = [
                `📊 ANALISIS COIN YANG TERLEWAT`,
                ``,
                `Kondisi saat ini:`,
                `• Harga: $${dex.priceUSD.toFixed(8)}`,
                `• Likuiditas: $${this.fmt(dex.liquidityUSD)}`,
                `• Volume 24h: $${this.fmt(dex.volumeUSD24h)}`,
                `• Perubahan 1h: ${dex.priceChange1h > 0 ? '+' : ''}${dex.priceChange1h.toFixed(1)}%`,
                ``,
                `Kemungkinan kenapa coin ini pump:`,
            ];
            if (dex.volumeUSD24h > 5000000)
                lines.push(`• Volume $${this.fmt(dex.volumeUSD24h)} sangat tinggi`);
            if (dex.priceChange1h > 100)
                lines.push(`• Pump ${dex.priceChange1h.toFixed(0)}% dalam 1 jam — ada katalis kuat`);
            if (dex.liquidityUSD > 200000)
                lines.push(`• Likuiditas $${this.fmt(dex.liquidityUSD)} — investor besar masuk`);
            if (dex.txCount5m > 100)
                lines.push(`• ${dex.txCount5m} transaksi dalam 5 menit — FOMO aktif`);
            lines.push(``, `Pelajaran: Bot akan mendeteksi sinyal ini lebih awal di scan berikutnya.`);
            return lines.join('\n');
        }
        catch {
            return 'Gagal menganalisis coin yang terlewat.';
        }
    }
    fmt(n) {
        if (n >= 1000000)
            return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000)
            return (n / 1000).toFixed(1) + 'K';
        return n.toFixed(0);
    }
    sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}
exports.TradingPipeline = TradingPipeline;
