# CLAUDE.md

このファイルは、Claude Code がこのリポジトリで作業する際のガイドです。

## プロジェクト概要

- **プロジェクト名**: kakeibo-app
- **内容**: レシート読み込み家計簿アプリ（レシート画像を Claude API で読み取り、カテゴリ別・月別に集計する）
- **技術スタック**: React 19 / Vite 8 / Chart.js（react-chartjs-2）/ Node.js 24 + Express 5 / Claude API（`@anthropic-ai/sdk`）

## 技術スタック

| 分類 | 使用技術 | 補足 |
| --- | --- | --- |
| フロントエンド | React 19 + Vite 8 | 関数コンポーネント + Hooks、JavaScript（JSX） |
| グラフ | Chart.js + react-chartjs-2 | カテゴリ別の円グラフ・月別の棒グラフ |
| バックエンド | Node.js 24 + Express 5 | Claude API を呼ぶのはバックエンドだけ |
| AI | Claude API（モデル: `claude-haiku-5-5`） | 構造化出力（zod）でレシート内容を JSON で受け取る |
| データ保存 | ブラウザの localStorage | キー: `kakeibo-app.receipts` |

- 外部ライブラリは必要になるまで追加しない。追加する場合は理由をユーザーに説明してから入れる。
- モデルは「Claude Haiku の最新版」を使う方針。新しい Haiku が出たら `server/receipt.js` の `MODEL` を更新する。

## GitHubリポジトリ

https://github.com/mizuho093067/kakeibo-app

## コミュニケーション

- 返答は**必ず日本語**で行うこと。
- コード内のコメントも日本語で記述する。

## Git運用ルール

- **コードを変更するたびに、必ずコミットして GitHub にプッシュすること。**
  - 1つの作業（機能追加・修正など）が終わったら、まとめて放置せずにその都度プッシュする。
  - 手順:
    ```
    git add <変更したファイル>
    git commit -m "変更内容の説明"
    git push origin main
    ```
- ブランチは `main` を使用する。
- コミットメッセージは**日本語**で、何を変更したかが分かるように簡潔に書く。
  - 例: `支出の入力フォームを追加`、`月別合計の計算ミスを修正`
- プッシュに失敗した場合は、エラー内容を報告し、強制プッシュ（`--force`）は行わないこと。
- 不要なファイル（テスト用の一時ファイルなど）はコミットしない。

## ファイル構成

```
kakeibo-app/
├── CLAUDE.md                   # このファイル
├── .env.example                # 環境変数のひな形（.env にコピーして使う）
├── index.html                  # エントリーポイントの HTML
├── package.json                # 依存パッケージとスクリプト
├── vite.config.js              # Vite の設定（/api をバックエンドへ転送）
├── shared/
│   └── categories.js           # カテゴリ一覧（フロント・バック共通）
├── server/
│   ├── index.js                # Express サーバー（API とビルド済み画面の配信）
│   └── receipt.js              # Claude API でレシートを読み取る処理
└── src/
    ├── main.jsx                # React の起動処理
    ├── App.jsx                 # 状態管理（レシートの追加・削除・保存、月の絞り込み）
    ├── App.css                 # スタイル（ライト / ダークモード対応）
    ├── storage.js              # localStorage への保存・読み込み
    ├── image.js                # 画像の縮小と base64 変換
    ├── validation.js           # 検証（負の金額・重複レシート）と合計金額の計算
    ├── chartTheme.js           # グラフの色・ダークモード判定・金額の表示形式
    └── components/
        ├── ReceiptUploader.jsx # レシート画像の選択と読み取り
        ├── ReceiptReview.jsx   # 読み取り結果の確認・修正・登録
        ├── ReceiptList.jsx     # 登録したレシートの一覧
        ├── CategoryChart.jsx   # カテゴリ別の円グラフと集計表
        └── MonthlyChart.jsx    # 月別の棒グラフ
```

- ファイルを追加・削除したら、この構成図も更新する。

## 開発・実行方法

- 初回のみ `npm install` で依存パッケージをインストールする。
- `.env.example` を `.env` にコピーし、`ANTHROPIC_API_KEY` に Claude API のキーを設定する。
- `npm run dev` でバックエンド（http://localhost:3001）とフロントエンド（http://localhost:5173）を同時に起動し、http://localhost:5173 を開く。
- 本番と同じ形での確認は `npm run build` → `npm start` → http://localhost:3001 。
- コードを変更したら、プッシュ前に `npm run build` が通ることを確認する。

## セキュリティ（APIキーの扱い）

- **APIキーは `.env` だけに書き、絶対にコミットしない**（`.gitignore` で除外済み）。
- Claude API はバックエンド（`server/`）からのみ呼ぶ。フロントエンドのコードに APIキーや Anthropic SDK を入れない。
- フロントエンドは `/api/receipts/read` に画像を送るだけにする。

## コーディング規約

- JavaScript は `const` / `let` を使用し、`var` は使わない。
- 変数名・関数名はキャメルケース（例: `addReceipt`, `itemTotal`）。
- レシートの合計金額は `validation.js` の `receiptTotal()` を使い、同じ計算を各所に書かない。
- コンポーネントはパスカルケースで `src/components/` に1ファイル1コンポーネント。イベント用 props は `on` + 動詞、内部のイベント処理は `handle` + イベント名。
- state は直接書き換えず、新しい配列・オブジェクトを作って更新する。
- 金額は整数（円単位）で扱い、小数による計算誤差を避ける。値引きはマイナスの金額の商品として扱う。
- カテゴリを増やす・変える場合は `shared/categories.js` だけを編集する（グラフの色はこの並び順で決まる。9番目以降は灰色）。

```js
// 保存データ（レシート）の例
const receipts = [
  {
    id: "…",                 // crypto.randomUUID() で生成
    storeName: "〇〇スーパー",
    date: "2026-10-20",      // YYYY-MM-DD 形式
    time: "15:05",           // HH:MM（24時間）。不明なら ""、古いデータには無い
    items: [
      { id: "…", name: "牛乳", price: 238, category: "食費" }  // price は円（整数）
    ],
    createdAt: "2026-10-20T10:00:00.000Z"
  }
];
```

## 主な機能

- レシート画像をアップロードすると、Claude API で店名・日付・商品名・金額・カテゴリを読み取る
- 読み取り結果を確認・修正してから登録する
- 登録前の検証（警告のみで登録は止めない。ロジックは `src/validation.js`）
  - 金額がマイナスの商品があれば警告する（値引きの行は正常なので、エラーにはしない）
  - 同じ日時・合計金額のレシートが登録済みなら重複警告を出し、登録時に確認ダイアログを出す（時刻はどちらかが未入力なら日付だけで比べる）
- 登録したレシートと商品を一覧表示・削除する
- カテゴリ別の円グラフと集計表、月別の棒グラフを表示する（月で絞り込み可）
- データは localStorage に保存し、再読み込みしても残る

## 注意事項

- スマートフォンでも見やすいレスポンシブデザインにする。
- 保存データの形式を変える場合は、保存済みの古いデータも読めるように配慮する。
- Claude API の呼び出しは料金がかかるため、テストで何度も呼ぶ場合はユーザーに確認する。
