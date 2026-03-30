"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const telegram_alert_1 = require("../alerts/telegram-alert");
async function main() {
    const alert = new telegram_alert_1.TelegramAlert();
    const ok = await alert.testConnection();
    if (ok) {
        await alert.send('✅ Test pesan dari Solana Trading Bot — koneksi berhasil!');
        console.log('Pesan test terkirim ke Telegram kamu!');
    }
}
main().catch(console.error);
