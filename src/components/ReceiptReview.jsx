import { useState } from "react";
import { CATEGORIES } from "../../shared/categories.js";
import { formatYen } from "../chartTheme.js";
import { findDuplicateReceipt, findNegativeItems, receiptTotal } from "../validation.js";

// 今日の日付（YYYY-MM-DD）
function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 読み取り結果を確認・修正してから登録する
function ReceiptReview({ result, receipts, onSave, onCancel }) {
  const [storeName, setStoreName] = useState(result.storeName);
  // 日付が読み取れなかった場合は今日の日付を入れておく
  const [date, setDate] = useState(/^\d{4}-\d{2}-\d{2}$/.test(result.date) ? result.date : today());
  // 時刻は読み取れなかった場合は空のまま（任意項目）
  const [time, setTime] = useState(/^\d{2}:\d{2}$/.test(result.time) ? result.time : "");
  const [items, setItems] = useState(() =>
    result.items.map((item) => ({ ...item, id: crypto.randomUUID() }))
  );

  // 登録される予定のレシート（商品名が空の行は除く）
  const draft = {
    id: null,
    storeName: storeName.trim(),
    date,
    time,
    items: items.filter((item) => item.name.trim() !== ""),
  };
  const itemTotal = receiptTotal(draft);

  // 検証（どちらも警告のみで、登録は止めない）
  const negativeItems = findNegativeItems(draft.items);
  const duplicate = findDuplicateReceipt(draft, receipts);

  function updateItem(id, changes) {
    setItems(items.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }

  function deleteItem(id) {
    setItems(items.filter((item) => item.id !== id));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (draft.items.length === 0) return;
    if (duplicate && !confirm("同じ日時・合計金額のレシートが既にあります。それでも登録しますか？")) {
      return;
    }
    onSave({ ...draft, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  }

  return (
    <section className="card receipt-review">
      <h2>読み取り結果の確認</h2>
      <p className="hint">内容を確認し、間違いがあれば直してから登録してください。</p>
      <form onSubmit={handleSubmit}>
        <div className="review-header">
          <label>
            店名
            <input value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          </label>
          <label>
            日付
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            時刻（任意）
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>

        <ul className="review-items">
          {items.map((item) => (
            <li key={item.id} className="review-item">
              <input
                className="item-name"
                value={item.name}
                onChange={(e) => updateItem(item.id, { name: e.target.value })}
                aria-label="商品名"
              />
              <input
                className={`item-price ${item.price < 0 ? "negative" : ""}`}
                type="number"
                value={item.price}
                onChange={(e) => updateItem(item.id, { price: Math.round(Number(e.target.value) || 0) })}
                aria-label="金額"
                aria-invalid={item.price < 0}
              />
              <select
                value={item.category}
                onChange={(e) => updateItem(item.id, { category: e.target.value })}
                aria-label="カテゴリ"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button type="button" className="delete-button" onClick={() => deleteItem(item.id)} aria-label="この商品を削除">
                ×
              </button>
            </li>
          ))}
        </ul>

        <p className="review-total">
          商品の合計: <strong>{formatYen(itemTotal)}</strong>
          {result.total > 0 && result.total !== itemTotal && (
            <span className="total-note">（レシートの合計 {formatYen(result.total)} と差があります。税や値引きを確認してください）</span>
          )}
        </p>

        {negativeItems.length > 0 && (
          <div className="warning-message" role="alert">
            <strong>⚠ 金額がマイナスの商品があります</strong>
            <ul>
              {negativeItems.map((item) => (
                <li key={item.id}>
                  {item.name}: {formatYen(item.price)}
                </li>
              ))}
            </ul>
            <p>値引き・割引の行であればそのままで問題ありません。読み取りの誤りなら金額を直してください。</p>
          </div>
        )}

        {duplicate && (
          <div className="warning-message" role="alert">
            <strong>⚠ 重複の可能性があります</strong>
            <p>
              同じ日時・合計金額のレシートが既に登録されています:
              {" "}{duplicate.date}{duplicate.time && ` ${duplicate.time}`}
              {" "}{duplicate.storeName || "店名なし"} {formatYen(receiptTotal(duplicate))}
            </p>
          </div>
        )}

        <div className="review-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>キャンセル</button>
          <button type="submit" className="primary-button">登録する</button>
        </div>
      </form>
    </section>
  );
}

export default ReceiptReview;
