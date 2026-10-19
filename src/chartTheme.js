import { useEffect, useState } from "react";
import { CATEGORIES } from "../shared/categories.js";

// カテゴリ別の色（ライト / ダーク）。色覚の違いでも見分けやすい順に並べてある。
// 色は順位ではなくカテゴリに固定で結びつける（絞り込んでも色が変わらない）
const SERIES_LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
const SERIES_DARK = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];
// 「その他」は目立たない灰色にする
const OTHER_COLOR = "#898781";

// グラフの軸・文字などの色
const CHROME = {
  light: { surface: "#fcfcfb", text: "#52514e", muted: "#898781", grid: "#e1e0d9", baseline: "#c3c2b7" },
  dark: { surface: "#1a1a19", text: "#c3c2b7", muted: "#898781", grid: "#2c2c2a", baseline: "#383835" },
};

export function categoryColor(category, isDark) {
  const index = CATEGORIES.indexOf(category);
  const series = isDark ? SERIES_DARK : SERIES_LIGHT;
  return index >= 0 && index < series.length ? series[index] : OTHER_COLOR;
}

export function chromeColors(isDark) {
  return isDark ? CHROME.dark : CHROME.light;
}

export function barColor(isDark) {
  return isDark ? SERIES_DARK[0] : SERIES_LIGHT[0];
}

// OS のダークモード設定を監視するフック
export function useDarkMode() {
  const query = "(prefers-color-scheme: dark)";
  const [isDark, setIsDark] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const handleChange = (e) => setIsDark(e.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return isDark;
}

// 金額を「¥1,234」の形にする
export function formatYen(amount) {
  return `¥${amount.toLocaleString("ja-JP")}`;
}
