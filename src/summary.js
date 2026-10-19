import { CATEGORIES } from "../shared/categories.js";

/**
 * 商品をカテゴリごとに合計する
 * 金額が 0 以下になったカテゴリは除き、CATEGORIES の並び順で返す
 * @returns {{ category: string, amount: number }[]}
 */
export function categoryTotals(items) {
  return CATEGORIES.map((category) => ({
    category,
    amount: items.filter((item) => item.category === category).reduce((sum, item) => sum + item.price, 0),
  })).filter((row) => row.amount > 0);
}
