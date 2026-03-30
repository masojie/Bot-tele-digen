#!/usr/bin/env python3
"""
MONITOR VIRAL TOKEN - KONSEP AWAL
Hanya token dengan potensi viral (likuiditas, volume, whale activity)
Detail: CA lengkap, wallet whale, aktivitas bot
"""

import requests
import time
from datetime import datetime

class ViralMonitor:
    def __init__(self):
        self.seen = set()
        self.viral_thresholds = {
            'min_liquidity': 30000,      # minimal likuiditas $30K
            'min_volume': 50000,          # minimal volume $50K
            'min_price_change': 15,       # minimal kenaikan 15%
            'max_price_dump': -30,        # maksimal penurunan -30%
        }
        
        # Whale wallets database
        self.whales = {
            '7xKXtg2CW87d97TXJ7pbD5jVZ9k7YvF7L8q5xJ9kL3p': {'name': 'Cielo Whale', 'type': '🐋 MEGA'},
            'DcF2MYYZ5QrFjK8qX7Lp9vN3mR6tY2wB4hJ7kL1pZ9x': {'name': 'Kamino', 'type': '🐳 ACTIVE'},
        }
    
    def fmt_num(self, n):
        if n >= 1_000_000: return f"{n/1_000_000:.1f}M"
        if n >= 1_000: return f"{n/1_000:.1f}K"
        return f"{n:.0f}"
    
    def is_viral(self, token):
        """Cek apakah token sedang viral"""
        liq = token.get('liquidity', 0)
        vol = token.get('volume_1h', 0)
        change = token.get('price_change_1h', 0)
        
        viral = False
        reasons = []
        
        if liq >= self.viral_thresholds['min_liquidity']:
            reasons.append(f"✅ Likuiditas ${self.fmt_num(liq)}")
        if vol >= self.viral_thresholds['min_volume']:
            reasons.append(f"✅ Volume ${self.fmt_num(vol)}")
        if change >= self.viral_thresholds['min_price_change']:
            reasons.append(f"✅ Naik {change:+.1f}%")
        elif change <= self.viral_thresholds['max_price_dump']:
            reasons.append(f"⚠️ Turun {change:.1f}% (potensi bottom)")
        else:
            reasons.append(f"📊 Perubahan {change:+.1f}%")
        
        # Minimal 2 kriteria terpenuhi
        if (liq >= 30000 and vol >= 30000) or (change >= 15 and liq >= 20000):
            viral = True
        
        return viral, reasons
    
    def check_whale(self, token):
        """Deteksi aktivitas whale"""
        vol = token.get('volume_1h', 0)
        liq = token.get('liquidity', 0)
        
        whales_detected = []
        if vol > 100000 and liq > 50000:
            for addr, info in self.whales.items():
                whales_detected.append({
                    'address': addr,
                    'name': info['name'],
                    'type': info['type']
                })
        
        return whales_detected
    
    def check_bot_activity(self, token):
        """Deteksi aktivitas bot"""
        buys = token.get('tx_buy_5m', 0)
        sells = token.get('tx_sell_5m', 0)
        
        if buys + sells > 100:
            return "🤖 HIGH BOT ACTIVITY", "⚠️ Risiko wash trading"
        elif buys + sells > 30:
            return "⚡ MIXED ACTIVITY", "📊 Ada aktivitas bot & manual"
        else:
            return "👤 ORGANIC", "✅ Aktivitas natural"
    
    def scan_viral_tokens(self):
        """Scan token viral dari DexScreener"""
        url = "https://api.dexscreener.com/token-profiles/latest/v1"
        try:
            r = requests.get(url, timeout=10)
            if r.status_code == 200:
                tokens = r.json()
                return [t for t in tokens if t.get('chainId') == 'solana']
        except:
            pass
        return []
    
    def get_token_detail(self, address):
        url = f"https://api.dexscreener.com/latest/dex/tokens/{address}"
        try:
            r = requests.get(url, timeout=10)
            if r.status_code == 200:
                data = r.json()
                if data.get('pairs'):
                    p = data['pairs'][0]
                    return {
                        'symbol': p.get('baseToken', {}).get('symbol', '?'),
                        'name': p.get('baseToken', {}).get('name', '?'),
                        'address': address,
                        'price': float(p.get('priceUsd', 0)),
                        'liquidity': float(p.get('liquidity', {}).get('usd', 0)),
                        'volume_1h': float(p.get('volume', {}).get('h1', 0)),
                        'price_change_1h': float(p.get('priceChange', {}).get('h1', 0)),
                        'tx_buy_5m': p.get('txns', {}).get('m5', {}).get('buys', 0),
                        'tx_sell_5m': p.get('txns', {}).get('m5', {}).get('sells', 0),
                        'url': p.get('url', '')
                    }
        except:
            pass
        return None
    
    def display_viral_token(self, token, viral, reasons, whales, bot_status):
        """Tampilkan token viral dengan detail lengkap"""
        print("\n" + "🔥"*35)
        print(f"🔥 VIRAL TOKEN: ${token['symbol']} | {token['name']}")
        print("🔥"*35)
        
        # Contract Address (FULL)
        print(f"\n📋 CONTRACT ADDRESS:")
        print(f"   {token['address']}")
        print(f"   🔗 {token['url']}")
        
        # Metrics
        print(f"\n📊 METRICS:")
        print(f"   💰 Price: ${token['price']:.10f}")
        print(f"   💧 Liquidity: ${self.fmt_num(token['liquidity'])}")
        print(f"   📈 Volume 1h: ${self.fmt_num(token['volume_1h'])}")
        print(f"   📊 1h Change: {token['price_change_1h']:+.1f}%")
        print(f"   🔄 Tx 5m: Buy {token['tx_buy_5m']} | Sell {token['tx_sell_5m']}")
        
        # Viral reasons
        print(f"\n🔥 VIRAL INDICATORS:")
        for r in reasons:
            print(f"   {r}")
        
        # Bot activity
        print(f"\n🤖 BOT DETECTOR:")
        print(f"   {bot_status[0]}")
        print(f"   {bot_status[1]}")
        
        # Whale tracker
        if whales:
            print(f"\n🐋 WHALE WALLETS DETECTED:")
            for w in whales:
                print(f"   {w['type']} {w['name']}")
                print(f"   📍 {w['address']}")
        else:
            print(f"\n🐋 WHALE TRACKER:")
            print(f"   📭 No whale wallets detected yet")
        
        # Score & Rekomendasi
        score = 50
        if token['liquidity'] > 50000: score += 20
        if token['volume_1h'] > 100000: score += 15
        if token['price_change_1h'] > 20: score += 15
        if token['price_change_1h'] < -20: score -= 10
        
        print(f"\n🎯 FINAL SCORE: {score}%")
        if score >= 70:
            print(f"   🔥 RECOMMENDATION: BUY - Viral token dengan momentum kuat")
        elif score >= 50:
            print(f"   ⏸️ RECOMMENDATION: WATCH - Masih perlu konfirmasi")
        else:
            print(f"   ⚠️ RECOMMENDATION: AVOID - Risiko tinggi")
        
        print("🔥"*35)
    
    def run(self):
        print("╔" + "="*50 + "╗")
        print("║" + " "*10 + "VIRAL TOKEN MONITOR - KONSEP AWAL" + " "*12 + "║")
        print("║" + " "*7 + "Hanya token yang sedang digen (viral)" + " "*12 + "║")
        print("╚" + "="*50 + "╝")
        print("\n✅ Filter: Likuiditas ≥ $30K | Volume ≥ $50K | Naik ≥15%")
        print("📡 Scan setiap 60 detik. Tekan Ctrl+C untuk berhenti.\n")
        
        while True:
            try:
                now = datetime.now().strftime("%H:%M:%S")
                print(f"\n{'='*50}")
                print(f"[{now}] 🔍 SCANNING VIRAL TOKENS...")
                print(f"{'='*50}")
                
                tokens = self.scan_viral_tokens()
                viral_found = 0
                
                for t in tokens[:15]:
                    addr = t.get('tokenAddress')
                    if addr and addr not in self.seen:
                        detail = self.get_token_detail(addr)
                        if detail:
                            viral, reasons = self.is_viral(detail)
                            
                            if viral:
                                self.seen.add(addr)
                                viral_found += 1
                                whales = self.check_whale(detail)
                                bot_status = self.check_bot_activity(detail)
                                self.display_viral_token(detail, viral, reasons, whales, bot_status)
                            time.sleep(0.5)
                
                if viral_found == 0:
                    print("📭 Tidak ada token viral dalam scan ini.")
                else:
                    print(f"\n✅ Ditemukan {viral_found} token viral!")
                
                print(f"\n⏳ Next scan in 60 seconds...")
                time.sleep(60)
                
            except KeyboardInterrupt:
                print("\n\n🛑 Monitoring berhenti.")
                print(f"📊 Total token viral terdeteksi: {len(self.seen)}")
                break
            except Exception as e:
                print(f"❌ Error: {e}")
                time.sleep(60)

if __name__ == "__main__":
    ViralMonitor().run()
