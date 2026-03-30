# Di Termux, jalankan ini:

# 1. Install git
pkg install git

# 2. Setup identity git
git config --global user.email "emailkamu@gmail.com"
git config --global user.name "masojie"

# 3. Clone repo
git clone https://github.com/masojie/Bot-tele-digen.git
cd Bot-tele-digen

# 4. Buat semua subfolder src
mkdir -p src/blockchain src/analysis src/listing src/alerts src/risk src/utils

# 5. Sekarang tinggal buat file satu per satu dengan nano
# Contoh:
nano src/config.ts
# (paste isi file, Ctrl+X → Y → Enter)

# 6. Setelah semua file dibuat, push ke GitHub
git add .
git commit -m "Add all source files"
git push
```

Untuk push di Termux, GitHub butuh **Personal Access Token** (bukan password biasa):
```
1. Buka github.com di browser HP
2. Settings → Developer Settings → Personal Access Tokens → Tokens (classic)
3. Generate new token → centang "repo" → Generate
4. Copy token → pakai sebagai password saat git push
```

### Opsi 3 — Pakai GitHub Mobile App
```
1. Download "GitHub" dari Play Store
2. Login akun masojie
3. Buka repo Bot-tele-digen
4. Tap "+" → "Create new file"
5. Buat file satu per satu, paste isi kodenya
