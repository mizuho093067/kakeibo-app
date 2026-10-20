import { useEffect, useState } from "react";
import ReceiptUploader from "./components/ReceiptUploader.jsx";
import ReceiptReview from "./components/ReceiptReview.jsx";
import ReceiptList from "./components/ReceiptList.jsx";
import CategoryChart from "./components/CategoryChart.jsx";
import CategoryBarChart from "./components/CategoryBarChart.jsx";
import MonthlyChart from "./components/MonthlyChart.jsx";
import { createReceipt, fetchReceipts, migrateLocalReceipts, removeReceipt } from "./storage.js";

function App() {
  // 登録済みのレシート（サーバーから読み込む）
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  // 移行・削除などの結果のお知らせ
  const [notice, setNotice] = useState("");
  // Claude の読み取り結果（確認中のもの）
  const [readResult, setReadResult] = useState(null);
  // 一覧・円グラフの対象月（"all" はすべての期間）
  const [selectedMonth, setSelectedMonth] = useState("all");

  // 初回表示時: 古いブラウザ保存データをサーバーへ移してから、全データを読み込む
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const migrated = await migrateLocalReceipts();
        const data = await fetchReceipts();
        if (ignore) return;
        setReceipts(data);
        if (migrated > 0) setNotice(`ブラウザに保存されていたレシート ${migrated} 件をサーバーに移しました。`);
      } catch (err) {
        if (!ignore) setLoadError(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  // サーバーに保存できてから画面に反映する（失敗したら例外を呼び出し元へ返す）
  async function addReceipt(receipt) {
    const saved = await createReceipt(receipt);
    setReceipts((current) => [...current, saved]);
    setReadResult(null);
  }

  async function deleteReceipt(id) {
    try {
      await removeReceipt(id);
      setReceipts((current) => current.filter((receipt) => receipt.id !== id));
    } catch (err) {
      setNotice(`削除できませんでした: ${err.message}`);
    }
  }

  // データのある月の一覧（新しい順）
  const months = [...new Set(receipts.map((r) => r.date.slice(0, 7)))].sort().reverse();
  // 選んでいた月のレシートをすべて削除した場合は「すべての期間」に戻す
  const activeMonth = months.includes(selectedMonth) ? selectedMonth : "all";
  const filtered =
    activeMonth === "all" ? receipts : receipts.filter((r) => r.date.startsWith(activeMonth));
  const filteredItems = filtered.flatMap((r) => r.items);
  const periodLabel =
    activeMonth === "all"
      ? "すべての期間"
      : `${Number(activeMonth.slice(0, 4))}年${Number(activeMonth.slice(5))}月`;

  return (
    <div className="app">
      <header className="app-header">
        <h1>レシート家計簿</h1>
        <p>レシートを撮影するだけで、AI が自動で家計簿に登録します</p>
      </header>

      {loadError && (
        <p className="error-message">
          データを読み込めませんでした: {loadError}（サーバーを起動してからページを再読み込みしてください）
        </p>
      )}
      {notice && (
        <p className="notice-message">
          {notice}
          <button className="delete-button" onClick={() => setNotice("")} aria-label="お知らせを閉じる">×</button>
        </p>
      )}

      {readResult ? (
        <ReceiptReview
          result={readResult}
          receipts={receipts}
          onSave={addReceipt}
          onCancel={() => setReadResult(null)}
        />
      ) : (
        <ReceiptUploader onRead={setReadResult} />
      )}

      <div className="month-filter">
        <label>
          表示する月
          <select value={activeMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            <option value="all">すべての期間</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {Number(m.slice(0, 4))}年{Number(m.slice(5))}月
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="chart-grid">
        <CategoryChart items={filteredItems} periodLabel={periodLabel} />
        <MonthlyChart receipts={receipts} />
      </div>

      <CategoryBarChart items={filteredItems} periodLabel={periodLabel} />

      {loading ? (
        <p className="status">データを読み込んでいます…</p>
      ) : (
        <ReceiptList receipts={filtered} onDelete={deleteReceipt} />
      )}
    </div>
  );
}

export default App;
