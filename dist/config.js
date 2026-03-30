"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG = void 0;
const dotenv = __importStar(require("dotenv"));
dotenv.config();
function require_env(key) {
    const val = process.env[key];
    if (!val || val === "GANTI_INI") {
        console.error(`\n❌ ERROR: ${key} belum diisi di .env`);
        process.exit(1);
    }
    return val;
}
exports.CONFIG = {
    RPC_URL: require_env("RPC_URL"),
    HELIUS_API_KEY: require_env("HELIUS_API_KEY"),
    WALLET_PRIVATE_KEY: require_env("WALLET_PRIVATE_KEY"),
    TELEGRAM_BOT_TOKEN: require_env("TELEGRAM_BOT_TOKEN"),
    TELEGRAM_CHAT_ID: require_env("TELEGRAM_CHAT_ID"),
    MAX_POSITION_SOL: parseFloat(process.env.MAX_POSITION_SOL || "0.05"),
    MAX_PORTFOLIO_RISK_PCT: parseFloat(process.env.MAX_PORTFOLIO_RISK_PCT || "2"),
    STOP_LOSS_PCT: parseFloat(process.env.STOP_LOSS_PCT || "15"),
    TAKE_PROFIT_PCT: parseFloat(process.env.TAKE_PROFIT_PCT || "50"),
    MAX_OPEN_POSITIONS: parseInt(process.env.MAX_OPEN_POSITIONS || "3"),
    MEME_SCAN_MS: parseInt(process.env.MEME_SCAN_INTERVAL_SEC || "30") * 1000,
    LISTING_SCAN_MS: parseInt(process.env.LISTING_SCAN_INTERVAL_MIN || "5") * 60 * 1000,
    SLIPPAGE_BPS: 300,
    TWITTER_BEARER_TOKEN: process.env.TWITTER_BEARER_TOKEN || "",
};
