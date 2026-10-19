import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";
import { Pie } from "react-chartjs-2";
import { categoryColor, chromeColors, formatYen, useDarkMode } from "../chartTheme.js";
import { categoryTotals } from "../summary.js";

ChartJS.register(ArcElement, Tooltip);

// カテゴリ別の集計（円グラフ + 集計表）
function CategoryChart({ items, periodLabel }) {
  const isDark = useDarkMode();
  const chrome = chromeColors(isDark);

  // カテゴリごとに金額を合計する（金額が 0 以下のカテゴリは除く）
  const totals = categoryTotals(items);
  const grandTotal = totals.reduce((sum, row) => sum + row.amount, 0);

  const percent = (amount) => (grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0);

  const data = {
    labels: totals.map((row) => row.category),
    datasets: [
      {
        data: totals.map((row) => row.amount),
        backgroundColor: totals.map((row) => categoryColor(row.category, isDark)),
        // 扇形の間に背景色の隙間を入れて見分けやすくする
        borderColor: chrome.surface,
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }, // 凡例は右の集計表で表示する
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${formatYen(ctx.parsed)}（${percent(ctx.parsed)}%）`,
        },
      },
    },
  };

  return (
    <section className="card category-chart">
      <h2>カテゴリ別の支出（{periodLabel}）</h2>
      {totals.length === 0 ? (
        <p className="empty">この期間のデータはありません。</p>
      ) : (
        <div className="category-layout">
          <div className="chart-box pie-box">
            <Pie data={data} options={options} aria-label="カテゴリ別の支出の円グラフ" role="img" />
          </div>
          <table className="summary-table">
            <tbody>
              {totals.map((row) => (
                <tr key={row.category}>
                  <td>
                    <span className="swatch" style={{ background: categoryColor(row.category, isDark) }} />
                    {row.category}
                  </td>
                  <td className="amount">{formatYen(row.amount)}</td>
                  <td className="amount percent">{percent(row.amount)}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>合計</td>
                <td className="amount">{formatYen(grandTotal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}

export default CategoryChart;
