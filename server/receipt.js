import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CATEGORIES } from "../shared/categories.js";

// 使用するモデル（Claude Haiku の最新版）
const MODEL = "claude-haiku-5-5";

// APIキーは環境変数 ANTHROPIC_API_KEY（.env）から自動で読み込まれる
// キー未設定でもサーバー自体は起動できるよう、初回の読み取り時に作成する
let client;
function getClient() {
  client ??= new Anthropic();
  return client;
}

// Claude に返してもらうレシートデータの形
const ReceiptSchema = z.object({
  isReceipt: z.boolean().describe("画像がレシートとして読み取れる場合は true"),
  storeName: z.string().describe("店名。読み取れなければ空文字"),
  date: z.string().describe("購入日（YYYY-MM-DD）。読み取れなければ空文字"),
  time: z.string().describe("購入時刻（24時間表記の HH:MM）。読み取れなければ空文字"),
  items: z.array(
    z.object({
      name: z.string().describe("商品名"),
      price: z.number().int().describe("金額（円・整数）。値引きはマイナス"),
      // SDK が enum 制約を API に送らないため文字列で受け取り、後で一覧外を「その他」に直す
      category: z.string().describe(`商品のカテゴリ（${CATEGORIES.join(" / ")} のいずれか）`),
    })
  ),
  total: z.number().int().describe("レシートに記載された合計金額（円）。なければ 0"),
});

const SYSTEM_PROMPT = `あなたは日本のレシートを読み取って家計簿に登録するアシスタントです。
画像から店名・購入日・購入時刻・商品ごとの名前と金額・合計金額を読み取ってください。

ルール:
- 金額は円単位の整数にする（「¥」「,」などは付けない）。
- 商品の金額は数量を掛けた後の、その行の金額にする。
- 値引き・割引の行は、マイナスの金額の商品として含める（カテゴリは値引き対象の商品に合わせる）。
- 小計・合計・お預かり・お釣り・ポイント・消費税の内訳の行は商品に含めない。
- 日付は YYYY-MM-DD 形式にする。和暦（令和など）は西暦に直す。
- 時刻は 24時間表記の HH:MM 形式にする（例: 午後3時5分 → 15:05）。
- カテゴリは次から選ぶ: ${CATEGORIES.join("、")}
  - 食費: スーパー等で買う食材・お惣菜・お菓子
  - 外食: 飲食店での食事・テイクアウト・カフェ
  - 日用品: 洗剤・ティッシュ・文房具などの消耗品
  - 飲料・嗜好品: 飲み物・お酒・たばこ
- 読み取れない文字は推測しすぎず、分かる範囲で記入する。
- レシートでない画像の場合は isReceipt を false にし、items は空にする。`;

/**
 * レシート画像を Claude で読み取る
 * @param {string} imageBase64 - 画像の base64 文字列（data: の接頭辞なし）
 * @param {string} mediaType - "image/jpeg" などの MIME タイプ
 */
export async function readReceipt(imageBase64, mediaType) {
  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          { type: "text", text: "このレシートの内容を読み取ってください。" },
        ],
      },
    ],
    output_config: {
      effort: "medium",
      format: zodOutputFormat(ReceiptSchema),
    },
  });

  // 安全上の理由で回答が拒否された場合
  if (response.stop_reason === "refusal") {
    throw new ReceiptError("この画像は読み取りできませんでした。別の画像でお試しください。");
  }
  // 出力が途中で切れた場合
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    throw new ReceiptError("読み取り結果を取得できませんでした。もう一度お試しください。");
  }

  const receipt = response.parsed_output;
  if (!receipt.isReceipt || receipt.items.length === 0) {
    throw new ReceiptError("レシートを認識できませんでした。明るい場所で全体が写るように撮影してください。");
  }
  return {
    ...receipt,
    items: receipt.items.map((item) => ({
      ...item,
      category: CATEGORIES.includes(item.category) ? item.category : "その他",
    })),
  };
}

// 利用者に表示してよいエラー（読み取り失敗など）
export class ReceiptError extends Error {}
