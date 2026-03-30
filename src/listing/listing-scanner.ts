import axios from 'axios';

export interface ListingSignal {
  symbol: string;
  solanaMint: string | null;
  score: number;
  sources: string[];
  action: 'BUY' | 'ALERT' | 'WATCH';
  positionMultiplier: number;
  narrative: string;
}

export class ListingScanner {
  private volumeHistory = new Map<string, { volumes: number[] }>();
  private alerted = new Set<string>();

  async scan(): Promise<ListingSignal[]> {
    console.log('[Listing] Scanning CEX volume spikes + Binance Alpha...');
    const [bybit, okx, gate, mexc, alpha] = await Promise.allSettled([
      this.scanBybit(), this.scanOKX(), this.scanGateIO(), this.scanMEXC(), this.checkBinanceAlpha(),
    ]);
    const allSpikes = [
      ...(bybit.status === 'fulfilled' ? bybit.value : []),
      ...(okx.status === 'fulfilled' ? okx.value : []),
      ...(gate.status === 'fulfilled' ? gate.value : []),
      ...(mexc.status === 'fulfilled' ? mexc.value : []),
    ];
    const alphaSymbols = alpha.status === 'fulfilled' ? alpha.value : [];
    const bySymbol = new Map<string, typeof allSpikes>();
    for (const spike of allSpikes) {
      if (!bySymbol.has(spike.symbol)) bySymbol.set(spike.symbol, []);
      bySymbol.get(spike.symbol)!.push(spike);
    }
    const signals: ListingSignal[] = [];
    const allSymbols = new Set([...bySymbol.keys(), ...alphaSymbols]);
    for (const symbol of allSymbols) {
      if (this.alerted.has(symbol)) continue;
      let score = 0;
      const sources: string[] = [];
      const spikes = bySymbol.get(symbol) || [];
      if (alphaSymbols.includes(symbol)) { score += 0.45; sources.push('Binance Alpha terdeteksi'); }
      if (spikes.length >= 3) { score += 0.35; sources.push(`Spike di ${spikes.length} CEX: ${spikes.map(s => s.exchange).join(', ')}`); }
      else if (spikes.length === 2) { score += 0.20; sources.push(`Spike di ${spikes.map(s => s.exchange).join(' & ')}`); }
      else if (spikes.length === 1) { score += 0.10; sources.push(`Spike di ${spikes[0].exchange} (${spikes[0].mult.toFixed(1)}x)`); }
      const mexcSpike = spikes.find(s => s.exchange === 'MEXC');
      if (mexcSpike && mexcSpike.mult > 5) { score += 0.15; sources.push(`MEXC spike ${mexcSpike.mult.toFixed(1)}x (canary Binance)`); }
      if (score < 0.25) continue;
      const solanaMint = await this.findOnSolana(symbol);
      const action: ListingSignal['action'] = score >= 0.55 && solanaMint ? 'BUY' : score >= 0.30 ? 'ALERT' : 'WATCH';
      const mult = score >= 0.70 ? 2.0 : score >= 0.55 ? 1.5 : 1.0;
      const narrative = score >= 0.70
        ? `$${symbol} sinyal listing Binance KUAT: ${sources.join('; ')}. Pola mirip $WIF, $BONK sebelum listing resmi.`
        : `$${symbol} sinyal menengah: ${sources.join('; ')}. Pantau konfirmasi lagi sebelum entry.`;
      signals.push({ symbol, solanaMint, score, sources, action, positionMultiplier: mult, narrative });
      if (action !== 'WATCH') this.alerted.add(symbol);
    }
    return signals.sort((a, b) => b.score - a.score);
  }

  private detectSpike(symbol: string, exchange: string, volume: number, threshold = 3.0) {
    const key = `${exchange}:${symbol}`;
    if (!this.volumeHistory.has(key)) this.volumeHistory.set(key, { volumes: [] });
    const entry = this.volumeHistory.get(key)!;
    entry.volumes.push(volume);
    if (entry.volumes.length > 24) entry.volumes.shift();
    if (entry.volumes.length < 3) return null;
    const avg = entry.volumes.slice(0, -1).reduce((a, b) => a + b, 0) / (entry.volumes.length - 1);
    const mult = volume / Math.max(avg, 1);
    return mult >= threshold && volume > 50_000 ? { symbol, exchange, mult } : null;
  }

  private async scanBybit() {
    try {
      const res = await axios.get('https://api.bybit.com/v5/market/tickers', { params: { category: 'spot' }, timeout: 8000 });
      return (res.data?.result?.list || []).map((t: any) => this.detectSpike(t.symbol.replace('USDT','').replace('USDC',''), 'Bybit', parseFloat(t.volume24h||'0'))).filter(Boolean) as any[];
    } catch { return []; }
  }

  private async scanOKX() {
    try {
      const res = await axios.get('https://www.okx.com/api/v5/market/tickers', { params: { instType: 'SPOT' }, timeout: 8000 });
      return (res.data?.data || []).map((t: any) => this.detectSpike(t.instId.replace('-USDT','').replace('-USDC',''), 'OKX', parseFloat(t.vol24h||'0'))).filter(Boolean) as any[];
    } catch { return []; }
  }

  private async scanGateIO() {
    try {
      const res = await axios.get('https://api.gateio.ws/api/v4/spot/tickers', { timeout: 8000 });
      return (res.data || []).map((t: any) => this.detectSpike(t.currency_pair.replace('_USDT','').replace('_USDC',''), 'Gate.io', parseFloat(t.quote_volume||'0'))).filter(Boolean) as any[];
    } catch { return []; }
  }

  private async scanMEXC() {
    try {
      const res = await axios.get('https://api.mexc.com/api/v3/ticker/24hr', { timeout: 8000 });
      return (res.data || []).map((t: any) => this.detectSpike((t.symbol||'').replace('USDT',''), 'MEXC', parseFloat(t.quoteVolume||'0'))).filter(Boolean) as any[];
    } catch { return []; }
  }

  private async checkBinanceAlpha(): Promise<string[]> {
    try {
      const res = await axios.get('https://www.binance.com/bapi/composite/v1/public/cms/article/list/query', { params: { type: 1, catalogId: 48, pageNo: 1, pageSize: 10 }, timeout: 8000 });
      return (res.data?.data?.catalogs?.[0]?.articles || []).map((a: any) => {
        const m = (a.title||'').match(/Will List (\w+)/i) || (a.title||'').match(/\(([A-Z]{2,10})\)/);
        return m ? m[1].toUpperCase() : null;
      }).filter(Boolean);
    } catch { return []; }
  }

  private async findOnSolana(symbol: string): Promise<string | null> {
    try {
      const res = await axios.get(`https://api.dexscreener.com/latest/dex/search?q=${symbol}`, { timeout: 5000 });
      const pair = (res.data?.pairs || []).find((p: any) => p.chainId === 'solana' && p.baseToken?.symbol?.toUpperCase() === symbol.toUpperCase() && parseFloat(p.liquidity?.usd||'0') > 5000);
      return pair?.baseToken?.address || null;
    } catch { return null; }
  }
                        }
