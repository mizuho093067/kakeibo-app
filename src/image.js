// 送信サイズを抑えるため、長辺がこのピクセル数を超える画像は縮小する
const MAX_SIZE = 1600;

/**
 * 画像ファイルを縮小し、JPEG の base64 文字列に変換する
 * @param {File} file
 * @returns {Promise<{ imageBase64: string, mediaType: string }>}
 */
export async function fileToBase64Jpeg(file) {
  const bitmap = await loadImage(file);
  const scale = Math.min(1, MAX_SIZE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const ctx = canvas.getContext("2d");
  // 透過 PNG の背景が黒くならないよう白で塗っておく
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  return { imageBase64: dataUrl.split(",")[1], mediaType: "image/jpeg" };
}

// ファイルを画像として読み込む（読めない形式ならエラー）
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("この画像形式は読み込めません。JPEG または PNG の画像を選んでください。"));
    };
    img.src = url;
  });
}
