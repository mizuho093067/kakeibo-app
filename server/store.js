import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORIES } from "../shared/categories.js";

// レシートデータの保存先（data/ フォルダは .gitignore で除外）
// 環境変数 DATA_DIR で変更できる（テスト時に本物のデータを汚さないため）
const DATA_DIR =
  process.env.DATA_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data");
const DATA_FILE = path.join(DATA_DIR, "receipts.json");

// 書き込みが同時に走ってデータが壊れないよう、処理を1つずつ順番に実行する
let queue = Promise.resolve();
function serialize(task) {
  const result = queue.then(task);
  queue = result.catch(() => {});
  return result;
}

// ファイルから全レシートを読み込む（ファイルがなければ空）
async function readAll() {
  try {
    const data = JSON.parse(await readFile(DATA_FILE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

// 全レシートをファイルに書き込む
// 一時ファイルに書いてから置き換えることで、途中で止まってもファイルが壊れないようにする
async function writeAll(receipts) {
  await mkdir(DATA_DIR, { recursive: true });
  const tmpFile = `${DATA_FILE}.tmp`;
  await writeFile(tmpFile, JSON.stringify(receipts, null, 2), "utf8");
  await rename(tmpFile, DATA_FILE);
}

// 入力が正しくないときのエラー（利用者に表示してよい）
export class InvalidReceiptError extends Error {}

/**
 * 送られてきたレシートを検証し、保存する形に整える
 * 正しくない場合は InvalidReceiptError を投げる
 */
export function sanitizeReceipt(input) {
  const fail = (message) => {
    throw new InvalidReceiptError(message);
  };
  if (typeof input !== "object" || input === null) fail("レシートの形式が正しくありません。");
  if (typeof input.id !== "string" || !input.id) fail("レシートの ID がありません。");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) fail("日付の形式が正しくありません。");
  const time = input.time ?? "";
  if (time !== "" && !/^\d{2}:\d{2}$/.test(time)) fail("時刻の形式が正しくありません。");
  if (!Array.isArray(input.items) || input.items.length === 0) fail("商品がありません。");

  const items = input.items.map((item) => {
    if (typeof item?.name !== "string" || !item.name.trim()) fail("商品名がありません。");
    if (!Number.isInteger(item.price)) fail("金額は整数で入力してください。");
    return {
      id: typeof item.id === "string" && item.id ? item.id : crypto.randomUUID(),
      name: item.name.trim(),
      price: item.price,
      category: CATEGORIES.includes(item.category) ? item.category : "その他",
    };
  });

  return {
    id: input.id,
    storeName: typeof input.storeName === "string" ? input.storeName.trim() : "",
    date: input.date,
    time,
    items,
    createdAt: typeof input.createdAt === "string" ? input.createdAt : new Date().toISOString(),
  };
}

// 全レシートを取得する
export function listReceipts() {
  return serialize(readAll);
}

// レシートを1件追加する（同じ ID が既にあれば追加しない）
export function addReceipt(receipt) {
  return serialize(async () => {
    const receipts = await readAll();
    if (!receipts.some((r) => r.id === receipt.id)) {
      receipts.push(receipt);
      await writeAll(receipts);
    }
    return receipt;
  });
}

// 複数のレシートをまとめて追加する（ブラウザの古いデータの移行用。同じ ID は飛ばす）
export function importReceipts(newReceipts) {
  return serialize(async () => {
    const receipts = await readAll();
    const ids = new Set(receipts.map((r) => r.id));
    const added = newReceipts.filter((r) => !ids.has(r.id));
    if (added.length > 0) {
      await writeAll([...receipts, ...added]);
    }
    return added.length;
  });
}

// レシートを1件削除する（削除できたら true）
export function deleteReceipt(id) {
  return serialize(async () => {
    const receipts = await readAll();
    const remaining = receipts.filter((r) => r.id !== id);
    if (remaining.length === receipts.length) return false;
    await writeAll(remaining);
    return true;
  });
}
