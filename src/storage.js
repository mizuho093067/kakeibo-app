// レシートデータをサーバー（data/receipts.json）に保存・読み込みする

// 以前ブラウザの localStorage に保存していたときのキー（移行用）
const LEGACY_STORAGE_KEY = "kakeibo-app.receipts";

// API を呼び出し、エラー時はサーバーのメッセージで例外を投げる
async function request(url, options = {}) {
  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch {
    throw new Error("サーバーに接続できませんでした。バックエンドが起動しているか確認してください。");
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "通信に失敗しました。");
  return data;
}

// 登録済みのレシートをすべて取得する
export function fetchReceipts() {
  return request("/api/receipts");
}

// レシートを1件登録する（サーバーで整えた内容を返す）
export function createReceipt(receipt) {
  return request("/api/receipts", { method: "POST", body: JSON.stringify(receipt) });
}

// レシートを1件削除する
export function removeReceipt(id) {
  return request(`/api/receipts/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// 実行中の移行処理（開発時に React が初回処理を2回呼んでも、移行は1回で済ませる）
let migration = null;

/**
 * localStorage に残っている古いデータをサーバーへ移す
 * 移行に成功したら localStorage から消す。移したレシート数を返す
 */
export function migrateLocalReceipts() {
  migration ??= migrate().catch((err) => {
    migration = null; // 失敗したら次回やり直せるようにする
    throw err;
  });
  return migration;
}

async function migrate() {
  let legacy;
  try {
    legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
  } catch {
    return 0;
  }
  if (!Array.isArray(legacy) || legacy.length === 0) return 0;

  // 同じ ID はサーバー側で飛ばすので、何度実行しても重複しない
  const { added } = await request("/api/receipts/import", {
    method: "POST",
    body: JSON.stringify(legacy),
  });
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // 消せなくても次回の移行で重複は起きないので無視する
  }
  return added;
}
