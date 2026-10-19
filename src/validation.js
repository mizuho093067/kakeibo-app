// レシートデータの検証

// レシートの合計金額（商品の金額の合計）
export function receiptTotal(receipt) {
  return receipt.items.reduce((sum, item) => sum + item.price, 0);
}

// 金額が負の値の商品を返す
export function findNegativeItems(items) {
  return items.filter((item) => item.price < 0);
}

/**
 * 同じ日時・合計金額のレシートが登録済みなら、そのレシートを返す（なければ null）
 * 時刻はどちらかが未入力なら日付だけで比べる（時刻のない古いデータにも対応するため）
 */
export function findDuplicateReceipt(receipt, receipts) {
  const total = receiptTotal(receipt);
  return (
    receipts.find(
      (other) =>
        other.id !== receipt.id &&
        other.date === receipt.date &&
        (!other.time || !receipt.time || other.time === receipt.time) &&
        receiptTotal(other) === total
    ) ?? null
  );
}
