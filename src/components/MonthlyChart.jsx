import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from "chart.js";
import { Bar } from "react-chartjs-2";
import { barColor, chromeColors, formatYen, useDarkMode } from "../chartTheme.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

// 表示する月数の上限（直近の月から数える）
const MAX_MONTHS = 12;

// "2026-10" の翌月 "2026-11" を返す
function nextMonth(month) {
  const [y, m] = month.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

// 月別の支出合計（棒グラフ）
function MonthlyChart({ receipts }) {
  const isDark = useDarkMode();
  const chrome = chromeColors(isDark);

  // 月ごとに合計する
  const totalsByMonth = {};
  for (const receipt of receipts) {
    const month = receipt.date.slice(0, 7);
    const sum = receipt.items.reduce((s, item) => s + item.price, 0);
    totalsByMonth[month] = (totalsByMonth[month] ?? 0) + sum;
  }

  // 最初の月から最後の月まで、データのない月も 0 として並べる
  const months = [];
  const existing = Object.keys(totalsByMonth).sort();
  if (existing.length > 0) {
    for (let m = existing[0]; m <= existing.at(-1); m = nextMonth(m)) months.push(m);
  }
  const shown = months.slice(-MAX_MONTHS);

  const data = {
    labels: shown.map((m) => `${Number(m.slice(0, 4))}年${Number(m.slice(5))}月`),
    datasets: [
      {
        label: "支出",
        data: shown.map((m) => totalsByMonth[m] ?? 0),
        backgroundColor: barColor(isDark),
        borderRadius: { topLeft: 4, topRight: 4 },
        borderSkipped: "bottom",
        maxBarThickness: 40,
      },
    ],
  };

  const options = {
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }, // 系列が1つなので凡例は出さない
      tooltip: {
        callbacks: { label: (ctx) => ` 支出: ${formatYen(ctx.parsed.y)}` },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: chrome.baseline },
        ticks: { color: chrome.text },
      },
      y: {
        beginAtZero: true,
        grid: { color: chrome.grid },
        border: { display: false },
        ticks: { color: chrome.muted, callback: (value) => formatYen(value) },
      },
    },
  };

  return (
    <section className="card monthly-chart">
      <h2>月別の支出</h2>
      {shown.length === 0 ? (
        <p className="empty">まだデータがありません。</p>
      ) : (
        <div className="chart-box bar-box">
          <Bar data={data} options={options} aria-label="月別の支出の棒グラフ" role="img" />
        </div>
      )}
    </section>
  );
}

export default MonthlyChart;
