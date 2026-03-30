import {
  Connection,
  Keypair,
  PublicKey,
  VersionedTransaction,
} from '@solana/web3.js';
import { createJupiterApiClient } from '@jup-ag/api';
import bs58 from 'bs58';
import { CONFIG } from '../config';

const SOL_MINT = 'So11111111111111111111111111111111111111112';

export interface SwapResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export class SolanaWallet {
  public connection: Connection;
  public keypair: Keypair;
  private jupiter: any;

  constructor() {
    this.connection = new Connection(CONFIG.RPC_URL, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });
    const secretKey = bs58.decode(CONFIG.WALLET_PRIVATE_KEY);
    this.keypair = Keypair.fromSecretKey(secretKey);
    this.jupiter = createJupiterApiClient();
    console.log(`✅ Wallet: ${this.keypair.publicKey.toBase58().slice(0, 8)}...`);
  }

  async getSOLBalance(): Promise<number> {
    const lamports = await this.connection.getBalance(this.keypair.publicKey);
    return lamports / 1e9;
  }

  async buyToken(mint: string, amountSOL: number): Promise<SwapResult> {
    try {
      const lamports = Math.floor(amountSOL * 1e9);
      const quote = await this.jupiter.quoteGet({
        inputMint: SOL_MINT,
        outputMint: mint,
        amount: lamports,
        slippageBps: CONFIG.SLIPPAGE_BPS,
        onlyDirectRoutes: false,
      });
      if (!quote) return { success: false, error: 'Tidak ada route Jupiter' };
      const swapResp = await this.jupiter.swapPost({
        swapRequest: {
          quoteResponse: quote,
          userPublicKey: this.keypair.publicKey.toBase58(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto',
        },
      });
      const tx = VersionedTransaction.deserialize(
        Buffer.from(swapResp.swapTransaction, 'base64')
      );
      tx.sign([this.keypair]);
      const txHash = await this.connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: true,
        maxRetries: 3,
      });
      await this.connection.confirmTransaction(txHash, 'confirmed');
      return { success: true, txHash };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async sellToken(mint: string, tokenAmount: number): Promise<SwapResult> {
    try {
      const quote = await this.jupiter.quoteGet({
        inputMint: mint,
        outputMint: SOL_MINT,
        amount: Math.floor(tokenAmount),
        slippageBps: CONFIG.SLIPPAGE_BPS + 100,
      });
      if (!quote) return { success: false, error: 'Tidak ada route Jupiter' };
      const swapResp = await this.jupiter.swapPost({
        swapRequest: {
          quoteResponse: quote,
          userPublicKey: this.keypair.publicKey.toBase58(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto',
        },
      });
      const tx = VersionedTransaction.deserialize(
        Buffer.from(swapResp.swapTransaction, 'base64')
      );
      tx.sign([this.keypair]);
      const txHash = await this.connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: true,
        maxRetries: 3,
      });
      await this.connection.confirmTransaction(txHash, 'confirmed');
      return { success: true, txHash };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async getTokenBalance(mint: string): Promise<number> {
    try {
      const accounts = await this.connection.getParsedTokenAccountsByOwner(
        this.keypair.publicKey,
        { mint: new PublicKey(mint) }
      );
      if (accounts.value.length === 0) return 0;
      return accounts.value[0].account.data.parsed.info.tokenAmount.amount;
    } catch {
      return 0;
    }
  }
          }
