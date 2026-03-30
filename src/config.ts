import * as dotenv from "dotenv";
dotenv.config();

function require_env(key: string): string {
  const val = process.env[key];
  if (!val || val === "GANTI_INI") {
    console.error(`\n❌ ERROR: ${key} belum diisi di .env`);
    process.exit(1);
  }
  return val;
}

export const CONFIG = {
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
