import { formatYen } from "../chartTheme.js";
import { receiptTotal } from "../validation.js";

// 登録済みのレシートと商品（商品名・金額・日付）を一覧表示する
function ReceiptList({ receipts, onDelete }) {
  if (receipts.length === 0) {
    return (
      <section className="card receipt-list">
        <h2>登録したレシート</h2>
        <p className="empty">まだレシートがありません。</p>
      </section>
    );
  }

  // 新しい日時が上に来るように並べる（時刻のないものは同じ日の最後）
  const sorted = [...receipts].sort(
    (a, b) => b.date.localeCompare(a.date) || (b.time ?? "").localeCompare(a.time ?? "")
  );

  return (
    <section className="card receipt-list">
      <h2>登録したレシート</h2>
      {sorted.map((receipt) => {
        const total = receiptTotal(receipt);
        return (
          <article key={receipt.id} className="receipt-item">
            <header className="receipt-item-header">
              <div>
                <span className="receipt-date">
                  {receipt.date}
                  {receipt.time && ` ${receipt.time}`}
                </span>
                <span className="receipt-store">{receipt.storeName || "店名なし"}</span>
              </div>
              <div>
                <strong>{formatYen(total)}</strong>
                <button
                  className="delete-button"
                  onClick={() => {
                    if (confirm("このレシートを削除しますか？")) onDelete(receipt.id);
                  }}
                  aria-label="このレシートを削除"
                >
                  ×
                </button>
              </div>
            </header>
            <table className="item-table">
              <tbody>
                {receipt.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td className="item-category">{item.category}</td>
                    <td className="amount">{formatYen(item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        );
      })}
    </section>
  );
}

export default ReceiptList;
