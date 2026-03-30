"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const solana_wallet_1 = require("../blockchain/solana-wallet");
async function main() {
    console.log('Testing wallet connection...');
    const wallet = new solana_wallet_1.SolanaWallet();
    const balance = await wallet.getSOLBalance();
    console.log(`✅ Balance: ${balance.toFixed(6)} SOL`);
    console.log(`✅ Address: ${wallet.keypair.publicKey.toBase58()}`);
}
main().catch(console.error);
