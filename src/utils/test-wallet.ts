import { SolanaWallet } from '../blockchain/solana-wallet';

async function main() {
  console.log('Testing wallet connection...');
  const wallet = new SolanaWallet();
  const balance = await wallet.getSOLBalance();
  console.log(`✅ Balance: ${balance.toFixed(6)} SOL`);
  console.log(`✅ Address: ${wallet.keypair.publicKey.toBase58()}`);
}

main().catch(console.error);
