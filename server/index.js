import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { readReceipt, ReceiptError } from "./receipt.js";
import {
  addReceipt,
  deleteReceipt,
  importReceipts,
  InvalidReceiptError,
  listReceipts,
  sanitizeReceipt,
} from "./store.js";

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

// 保存データ API の共通エラー処理
function storeHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      if (err instanceof InvalidReceiptError) {
        return res.status(400).json({ error: err.message });
      }
      console.error(err);
      res.status(500).json({ error: "データの保存・読み込みに失敗しました。" });
    }
  };
}

// 登録済みのレシートをすべて取得する
app.get(
  "/api/receipts",
  storeHandler(async (req, res) => {
    res.json(await listReceipts());
  })
);

// レシートを1件登録する
app.post(
  "/api/receipts",
  storeHandler(async (req, res) => {
    const receipt = await addReceipt(sanitizeReceipt(req.body));
    res.status(201).json(receipt);
  })
);

// ブラウザ（localStorage）に残っている古いデータをまとめて取り込む
app.post(
  "/api/receipts/import",
  storeHandler(async (req, res) => {
    if (!Array.isArray(req.body)) {
      throw new InvalidReceiptError("取り込むデータの形式が正しくありません。");
    }
    // 壊れたデータが混ざっていても、正しいものだけ取り込む
    const valid = [];
    for (const input of req.body) {
      try {
        valid.push(sanitizeReceipt(input));
      } catch (err) {
        if (!(err instanceof InvalidReceiptError)) throw err;
      }
    }
    const added = await importReceipts(valid);
    res.json({ added, skipped: req.body.length - valid.length });
  })
);

// レシートを1件削除する
app.delete(
  "/api/receipts/:id",
  storeHandler(async (req, res) => {
    const deleted = await deleteReceipt(req.params.id);
    if (!deleted) return res.status(404).json({ error: "レシートが見つかりません。" });
    res.status(204).end();
  })
);

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

// JSON の形式が壊れている・大きすぎるリクエストには、内部情報を出さずに JSON でエラーを返す
app.use("/api", (err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "送信データの形式が正しくありません。" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "画像のサイズが大きすぎます。" });
  }
  next(err);
});

// 本番用: ビルド済みのフロントエンド（dist/）も配信する
const distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
app.use(express.static(distDir));

app.listen(PORT, () => {
  console.log(`サーバー起動: http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("注意: ANTHROPIC_API_KEY が設定されていません（.env を確認してください）");
  }
});
