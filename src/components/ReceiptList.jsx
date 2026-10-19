import { formatYen } from "../chartTheme.js";

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

  // 新しい日付が上に来るように並べる
  const sorted = [...receipts].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section className="card receipt-list">
      <h2>登録したレシート</h2>
      {sorted.map((receipt) => {
        const total = receipt.items.reduce((sum, item) => sum + item.price, 0);
        return (
          <article key={receipt.id} className="receipt-item">
            <header className="receipt-item-header">
              <div>
                <span className="receipt-date">{receipt.date}</span>
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
