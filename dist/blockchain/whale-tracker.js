"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhaleTracker = void 0;
const web3_js_1 = require("@solana/web3.js");
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const KNOWN_PROGRAMS = new Set([
    '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
    '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
    'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX',
    'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
    'FLUXubRmkEi2q6K3Y9kBPg9248ggaZVsoSFhtJHSrm1X',
    'MERLuDFBMmsHnsBPZw2sDQZHvXFMwp8EdjudcU2pgJe',
    'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
    'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
]);
class WhaleTracker {
    constructor() {
        this.connection = new web3_js_1.Connection(config_1.CONFIG.RPC_URL, 'confirmed');
    }
    async getWhaleSnapshot(mint) {
        try {
            const holders = await this.connection.getTokenLargestAccounts(new web3_js_1.PublicKey(mint));
            const accounts = holders.value;
            if (accounts.length === 0) {
                return this.emptySnapshot();
            }
            const totalSupply = accounts.reduce((s, a) => s + (a.uiAmount || 0), 0);
            if (totalSupply === 0)
                return this.emptySnapshot();
            const whales = [];
            for (const acc of accounts.slice(0, 10)) {
                const addr = acc.address.toBase58();
                const pct = (acc.uiAmount || 0) / totalSupply;
                if (pct < 0.005)
                    continue;
                if (KNOWN_PROGRAMS.has(addr))
                    continue;
                let isKnownDex = false;
                let label = '';
                try {
                    const info = await this.connection.getAccountInfo(new web3_js_1.PublicKey(addr));
                    if (info?.owner) {
                        const owner = info.owner.toBase58();
                        if (KNOWN_PROGRAMS.has(owner)) {
                            isKnownDex = true;
                            label = 'DEX/Pool';
                        }
                    }
                }
                catch { }
                const recentBuys = await this.getRecentBuyCount(addr, mint);
                const shortAddr = `${addr.slice(0, 4)}...${addr.slice(-4)}`;
                if (!label) {
                    if (pct > 0.10)
                        label = '🐳 Mega Whale';
                    else if (pct > 0.05)
                        label = '🐋 Whale';
                    else if (pct > 0.01)
                        label = '🐬 Big Fish';
                    else
                        label = '🐟 Holder';
                }
                whales.push({
                    address: addr,
                    shortAddr,
                    holdPct: pct,
                    uiAmount: acc.uiAmount || 0,
                    recentBuys,
                    isKnownDex,
                    label,
                });
                if (whales.filter(w => !w.isKnownDex).length >= 5)
                    break;
            }
            const realWhales = whales.filter(w => !w.isKnownDex);
            const totalWhaleHoldPct = realWhales.reduce((s, w) => s + w.holdPct, 0);
            const activeBuyers = realWhales.filter(w => w.recentBuys > 0).length;
            let signal = 'NEUTRAL';
            let summary = '';
            if (activeBuyers >= 2 && totalWhaleHoldPct > 0.10) {
                signal = 'BULLISH';
                summary = `${activeBuyers} whale aktif beli — sinyal akumulasi kuat`;
            }
            else if (totalWhaleHoldPct > 0.30) {
                signal = 'BEARISH';
                summary = `Konsentrasi tinggi ${(totalWhaleHoldPct * 100).toFixed(0)}% — risiko dump`;
            }
            else {
                summary = `${realWhales.length} whale terdeteksi, pola distribusi normal`;
            }
            return { whales: realWhales, totalWhaleHoldPct, whaleCount: realWhales.length, signal, summary };
        }
        catch (err) {
            console.error('[WhaleTracker] Error:', err.message);
            return this.emptySnapshot();
        }
    }
    async getRecentBuyCount(walletAddr, mint) {
        try {
            const url = `https://api.helius.xyz/v0/addresses/${walletAddr}/transactions?api-key=${config_1.CONFIG.HELIUS_API_KEY}&limit=10&type=SWAP`;
            const res = await axios_1.default.get(url, { timeout: 5000 });
            const txs = res.data || [];
            return txs.filter((tx) => tx.tokenTransfers?.some((t) => t.mint === mint && t.toUserAccount === walletAddr)).length;
        }
        catch {
            return 0;
        }
    }
    formatForTerminal(snapshot) {
        if (snapshot.whales.length === 0)
            return '  🐋 Whale: tidak ada data';
        const signalEmoji = snapshot.signal === 'BULLISH' ? '🟢' : snapshot.signal === 'BEARISH' ? '🔴' : '🟡';
        const lines = [];
        lines.push(`  🐋 Whale Tracker [${signalEmoji} ${snapshot.signal}]: ${snapshot.summary}`);
        for (const w of snapshot.whales.slice(0, 3)) {
            const buyTag = w.recentBuys > 0 ? ` ✅ beli ${w.recentBuys}x baru` : '';
            lines.push(`     ${w.label} ${w.shortAddr} — ${(w.holdPct * 100).toFixed(2)}%${buyTag}`);
        }
        return lines.join('\n');
    }
    formatWhalesForTelegram(snapshot) {
        if (snapshot.whales.length === 0)
            return '';
        const signalEmoji = snapshot.signal === 'BULLISH' ? '🟢' : snapshot.signal === 'BEARISH' ? '🔴' : '🟡';
        const lines = [
            `${signalEmoji} <b>Whale Activity [${snapshot.signal}]:</b> ${snapshot.summary}`,
        ];
        for (const w of snapshot.whales.slice(0, 3)) {
            const buyTag = w.recentBuys > 0 ? ` ✅ beli ${w.recentBuys}x` : '';
            lines.push(`• ${w.label} <code>${w.address}</code> — ${(w.holdPct * 100).toFixed(2)}%${buyTag}`);
        }
        return lines.join('\n');
    }
    emptySnapshot() {
        return { whales: [], totalWhaleHoldPct: 0, whaleCount: 0, signal: 'NEUTRAL', summary: 'data tidak tersedia' };
    }
}
exports.WhaleTracker = WhaleTracker;
