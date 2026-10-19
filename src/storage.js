// レシートデータをブラウザのローカルストレージに保存・読み込みする
const STORAGE_KEY = "kakeibo-app.receipts";

export function loadReceipts() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    // 壊れたデータやストレージが使えない場合は空から始める
    return [];
  }
}

export function saveReceipts(receipts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
  } catch (err) {
    console.error("ローカルストレージへの保存に失敗しました", err);
  }
}
