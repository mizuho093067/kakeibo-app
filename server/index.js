import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { readReceipt, ReceiptError } from "./receipt.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Claude が受け付ける画像形式
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// 画像は base64 の JSON で受け取るため、上限を大きめにする
app.use(express.json({ limit: "15mb" }));

// レシート読み取り API
app.post("/api/receipts/read", async (req, res) => {
  const { imageBase64, mediaType } = req.body ?? {};
  if (typeof imageBase64 !== "string" || !imageBase64) {
    return res.status(400).json({ error: "画像が送信されていません。" });
  }
  if (!ALLOWED_TYPES.includes(mediaType)) {
    return res.status(400).json({ error: "JPEG / PNG / WebP / GIF の画像を選んでください。" });
  }

  try {
    const receipt = await readReceipt(imageBase64, mediaType);
    res.json(receipt);
  } catch (err) {
    console.error(err);
    res.status(statusOf(err)).json({ error: messageOf(err) });
  }
});

// エラーの種類に応じた HTTP ステータス
function statusOf(err) {
  if (err instanceof ReceiptError) return 422;
  if (err instanceof Anthropic.RateLimitError) return 429;
  return 500;
}

// エラーの種類に応じた利用者向けメッセージ
function messageOf(err) {
  if (err instanceof ReceiptError) return err.message;
  if (err instanceof Anthropic.AuthenticationError) {
    return "Claude API のキーが正しくありません。.env の ANTHROPIC_API_KEY を確認してください。";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "API の利用制限に達しました。しばらく待ってからお試しください。";
  }
  if (err instanceof Anthropic.BadRequestError) {
    return "画像を処理できませんでした。別の画像でお試しください。";
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return "Claude API に接続できませんでした。ネットワークを確認してください。";
  }
  if (err?.message?.includes("ANTHROPIC_API_KEY") || err?.message?.includes("apiKey")) {
    return "Claude API のキーが設定されていません。.env に ANTHROPIC_API_KEY を設定してください。";
  }
  return "読み取り中にエラーが発生しました。";
}

// 本番用: ビルド済みのフロントエンド（dist/）も配信する
const distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
app.use(express.static(distDir));

app.listen(PORT, () => {
  console.log(`サーバー起動: http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("注意: ANTHROPIC_API_KEY が設定されていません（.env を確認してください）");
  }
});
