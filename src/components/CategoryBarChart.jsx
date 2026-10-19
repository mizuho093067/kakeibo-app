import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from "chart.js";
import { Bar } from "react-chartjs-2";
import { categoryColor, chromeColors, formatYen, useDarkMode } from "../chartTheme.js";
import { categoryTotals } from "../summary.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

// 棒1本あたりの高さ（px）。カテゴリ数に応じてグラフの高さを変える
const ROW_HEIGHT = 36;

// カテゴリ別の支出（横棒グラフ・金額の大きい順）
function CategoryBarChart({ items, periodLabel }) {
  const isDark = useDarkMode();
  const chrome = chromeColors(isDark);

  const totals = categoryTotals(items).sort((a, b) => b.amount - a.amount);

  const data = {
    labels: totals.map((row) => row.category),
    datasets: [
      {
        label: "支出",
        data: totals.map((row) => row.amount),
        // 色は円グラフと同じくカテゴリに固定で結びつける
        backgroundColor: totals.map((row) => categoryColor(row.category, isDark)),
        borderRadius: { topRight: 4, bottomRight: 4 },
        borderSkipped: "left",
        barPercentage: 0.7,
        categoryPercentage: 1,
      },
    ],
  };

  const options = {
    indexAxis: "y", // 横向きの棒グラフにする
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }, // カテゴリ名は縦軸に表示されるので凡例は不要
      tooltip: {
        callbacks: { label: (ctx) => ` 支出: ${formatYen(ctx.parsed.x)}` },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: chrome.grid },
        border: { display: false },
        ticks: { color: chrome.muted, callback: (value) => formatYen(value) },
      },
      y: {
        grid: { display: false },
        border: { color: chrome.baseline },
        ticks: { color: chrome.text },
      },
    },
  };

  return (
    <section className="card category-bar-chart">
      <h2>カテゴリ別の支出ランキング（{periodLabel}）</h2>
      {totals.length === 0 ? (
        <p className="empty">この期間のデータはありません。</p>
      ) : (
        <div className="chart-box" style={{ height: totals.length * ROW_HEIGHT + 40 }}>
          <Bar data={data} options={options} aria-label="カテゴリ別の支出の横棒グラフ" role="img" />
        </div>
      )}
    </section>
  );
}

export default CategoryBarChart;
