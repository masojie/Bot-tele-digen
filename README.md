# 🤖 Solana Meme Trading Bot

Pipeline lengkap: **Pump.fun → DexScreener → Binance Listing Scout**

---

## 📱 Cara Install di Termux (HP Android)

### STEP 1 — Install Termux
Download Termux dari F-Droid (BUKAN dari Play Store, versi Play Store sudah outdated):
https://f-droid.org/packages/com.termux/

### STEP 2 — Buka Termux, jalankan perintah ini satu per satu

```bash
# Update package
pkg update -y && pkg upgrade -y

# Install Node.js dan tools
pkg install -y nodejs-lts git nano

# Verifikasi (harus muncul v18 ke atas)
node --version
```

### STEP 3 — Copy folder project ke HP

Cara termudah: kirim folder project via Telegram ke HP kamu sendiri,
lalu ekstrak ke folder Termux:

```bash
# Buat folder
mkdir -p ~/solana-bot
cd ~/solana-bot

# Atau clone dari GitHub kalau kamu sudah upload
# git clone https://github.com/username/solana-bot.git .
```

### STEP 4 — Install dependencies

```bash
cd ~/solana-bot
npm install --legacy-peer-deps
```

### STEP 5 — Setup file .env

```bash
cp .env.example .env
nano .env
```

Isi nilai-nilai berikut di dalam nano:

```
RPC_URL=https://mainnet.helius-rpc.com/?api-key=ISI_INI
HELIUS_API_KEY=ISI_INI
WALLET_PRIVATE_KEY=ISI_INI
TELEGRAM_BOT_TOKEN=ISI_INI
TELEGRAM_CHAT_ID=ISI_INI
```

Simpan di nano: tekan `Ctrl+X` → `Y` → `Enter`

### STEP 6 — Build project

```bash
npm run build
```

### STEP 7 — Test koneksi

```bash
# Test Telegram dulu
npm run test-telegram

# Test wallet
npm run test-wallet
```

### STEP 8 — Jalankan bot!

```bash
npm start
```

---

## 🔑 Cara Dapat API Keys

### Helius API (Solana RPC)
1. Buka: https://dev.helius.xyz
2. Daftar gratis
3. Copy API key → isi ke RPC_URL dan HELIUS_API_KEY

### Wallet Private Key
1. Buka Phantom Wallet di HP
2. Settings → Security & Privacy → Export Private Key
3. Masukkan password
4. Copy private key (format base58) → isi ke WALLET_PRIVATE_KEY
⚠️ JANGAN share private key ke siapapun!

### Telegram Bot Token
1. Buka Telegram → cari @BotFather
2. Ketik: /newbot
3. Ikuti instruksi, beri nama bot
4. Copy token → isi ke TELEGRAM_BOT_TOKEN

### Telegram Chat ID
1. Kirim pesan apapun ke bot kamu
2. Buka di browser: https://api.telegram.org/bot<TOKEN>/getUpdates
3. Cari angka setelah `"id":` di bagian `"chat"`
4. Copy angka itu → isi ke TELEGRAM_CHAT_ID

---

## 🏃 Agar Bot Tetap Jalan Saat HP Dikunci

Di Termux, geser dari kiri → pilih "Acquire Wakelock"
Ini mencegah Android mematikan Termux saat layar mati.

Atau gunakan tmux agar session tidak hilang:
```bash
pkg install tmux
tmux new -s bot
npm start
# Untuk detach: Ctrl+B lalu D
# Untuk kembali: tmux attach -t bot
```

---

## 📊 Cara Kerja Pipeline

```
PUMP.FUN
   ↓ (token baru, filter dev hold + reply count)
DEXSCREENER
   ↓ (validasi likuiditas, volume, price change)
BOT DETECTOR
   ↓ (cek wash trading, holder distribusi)
BINANCE ANALYST
   ↓ (score potensi listing: volume, mcap, DEX tier)
DECISION ENGINE
   ↓ (final score >= 60% → BUY)
JUPITER SWAP
   ↓ (eksekusi on-chain)
TELEGRAM ALERT → HP kamu
```

**Paralel — Listing Scout (setiap 5 menit):**
```
BINANCE ALPHA → CEX Volume (Bybit + OKX + Gate + MEXC)
   ↓ (multi-CEX spike = sinyal pre-listing)
FIND SOLANA EQUIVALENT
   ↓
BUY KECIL + ALERT ke Telegram
```

---

## ⚙️ Konfigurasi Risk (di file .env)

| Setting | Default | Keterangan |
|---|---|---|
| MAX_POSITION_SOL | 0.05 | Maks 0.05 SOL per trade |
| MAX_PORTFOLIO_RISK_PCT | 2 | Maks 2% dari balance per trade |
| STOP_LOSS_PCT | 15 | Jual jika rugi 15% |
| TAKE_PROFIT_PCT | 50 | Jual jika untung 50% |
| MAX_OPEN_POSITIONS | 3 | Maks 3 posisi sekaligus |

---

## ⚠️ TWITTER REMINDER

Kamu perlu akun Twitter khusus untuk project ini!
Setelah akun siap:
1. Daftar di: https://developer.twitter.com
2. Buat project baru, ambil Bearer Token
3. Isi TWITTER_BEARER_TOKEN di .env
4. Bot akan otomatis aktifkan Twitter scanner

---

## 🆘 Troubleshooting

**Error: Cannot find module**
```bash
npm install --legacy-peer-deps
npm run build
```

**Error: Insufficient balance**
```
Isi SOL ke wallet kamu dulu minimal 0.1 SOL
```

**Telegram tidak menerima pesan**
```
Pastikan kamu sudah kirim /start ke bot kamu di Telegram
```

**Bot crash setelah beberapa jam**
```bash
# Install pm2 untuk auto-restart
npm install -g pm2
pm2 start dist/main.js --name solana-bot
pm2 save
```
