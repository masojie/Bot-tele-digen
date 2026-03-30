import { TelegramAlert } from '../alerts/telegram-alert';

async function main() {
  const alert = new TelegramAlert();
  const ok = await alert.testConnection();
  if (ok) {
    await alert.send('✅ Test pesan dari Solana Trading Bot — koneksi berhasil!');
    console.log('Pesan test terkirim ke Telegram kamu!');
  }
}

main().catch(console.error);
