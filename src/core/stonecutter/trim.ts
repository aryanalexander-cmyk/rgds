export function computeTrimBounds(imgSource: HTMLImageElement, alphaThreshold: number = 1) {
  const w = imgSource.naturalWidth || imgSource.width;
  const h = imgSource.naturalHeight || imgSource.height;
  if (!w || !h) return { x: 0, y: 0, w: 1, h: 1, trimmed: false };

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { x: 0, y: 0, w, h, trimmed: false };

  ctx.drawImage(imgSource, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha >= alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If completely transparent
  if (maxX < minX || maxY < minY) {
    return { x: 0, y: 0, w, h, trimmed: false };
  }

  const trimW = maxX - minX + 1;
  const trimH = maxY - minY + 1;
  const trimmed = minX > 0 || minY > 0 || trimW < w || trimH < h;

  return { x: minX, y: minY, w: trimW, h: trimH, trimmed };
}
