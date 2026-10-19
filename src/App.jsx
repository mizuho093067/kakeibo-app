import { useEffect, useState } from "react";
import ReceiptUploader from "./components/ReceiptUploader.jsx";
import ReceiptReview from "./components/ReceiptReview.jsx";
import ReceiptList from "./components/ReceiptList.jsx";
import CategoryChart from "./components/CategoryChart.jsx";
import CategoryBarChart from "./components/CategoryBarChart.jsx";
import MonthlyChart from "./components/MonthlyChart.jsx";
import { loadReceipts, saveReceipts } from "./storage.js";

function App() {
  // 登録済みのレシート（初回はローカルストレージから読み込む）
  const [receipts, setReceipts] = useState(loadReceipts);
  // Claude の読み取り結果（確認中のもの）
  const [readResult, setReadResult] = useState(null);
  // 一覧・円グラフの対象月（"all" はすべての期間）
  const [selectedMonth, setSelectedMonth] = useState("all");

  // レシートが変わるたびにローカルストレージへ保存する
  useEffect(() => {
    saveReceipts(receipts);
  }, [receipts]);

  function addReceipt(receipt) {
    setReceipts([...receipts, receipt]);
    setReadResult(null);
  }

  function deleteReceipt(id) {
    setReceipts(receipts.filter((receipt) => receipt.id !== id));
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
          <select value={activeMonth}onChange={(e) => setSelectedMonth(e.target.value)}>
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

      <ReceiptList receipts={filtered} onDelete={deleteReceipt} />
    </div>
  );
}

export default App;
