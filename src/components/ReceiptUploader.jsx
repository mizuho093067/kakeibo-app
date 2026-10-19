import { useState } from "react";
import { fileToBase64Jpeg } from "../image.js";

// レシート画像を選択し、バックエンド経由で Claude に読み取らせる
function ReceiptUploader({ onRead }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  async function handleChange(e) {
    const file = e.target.files[0];
    // 同じファイルを続けて選べるように入力をリセットしておく
    e.target.value = "";
    if (!file) return;

    setError("");
    setLoading(true);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const body = await fileToBase64Jpeg(file);
      const res = await fetch("/api/receipts/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "読み取りに失敗しました。");
      }
      onRead(data);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "サーバーに接続できませんでした。バックエンドが起動しているか確認してください。"
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card receipt-uploader">
      <h2>レシートを読み込む</h2>
      <label className={`upload-button ${loading ? "disabled" : ""}`}>
        {loading ? "読み取り中…" : "レシート画像を選ぶ"}
        <input type="file" accept="image/*" onChange={handleChange} disabled={loading} hidden />
      </label>
      <p className="hint">スマートフォンではカメラで撮影することもできます。</p>
      {loading && <p className="status">Claude がレシートを読み取っています（数秒〜十数秒かかります）</p>}
      {error && <p className="error-message">{error}</p>}
      {previewUrl && <img className="receipt-preview" src={previewUrl} alt="選択したレシート" />}
    </section>
  );
}

export default ReceiptUploader;
