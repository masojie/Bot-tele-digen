"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolanaWallet = void 0;
const web3_js_1 = require("@solana/web3.js");
class SolanaWallet {
    constructor() {
        this.connection = new web3_js_1.Connection('https://api.mainnet-beta.solana.com');
    }
    async getSOLBalance() {
        return 999;
    }
    async buyToken(mint, amountSOL) {
        console.log(`[DUMMY] Buy ${amountSOL} SOL of ${mint}`);
        return { success: false, txHash: null };
    }
    async getTokenBalance(mint) {
        return 0;
    }
    async sellToken(mint, amount) {
        return { success: false, txHash: null };
    }
}
exports.SolanaWallet = SolanaWallet;
