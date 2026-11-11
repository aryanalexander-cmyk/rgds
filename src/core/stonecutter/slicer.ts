/**
 * Stonecutter Smart Alpha Island Slicer
 * Automatically detects, isolates, and crops disconnected sprite islands
 * from flat images or asset pack sheets using connected-component analysis.
 */

export interface SlicedSpriteItem {
  id: string;
  name: string;
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
  sourceRect: { x: number; y: number; width: number; height: number };
}

export interface SlicerOptions {
  alphaThreshold?: number; // 1 to 255 (default: 15)
  minSize?: number; // minimum width and height to filter out speckles (default: 4)
  padding?: number; // extra padding around slice (default: 0)
  namePrefix?: string; // e.g. "slice"
}

export function sliceAlphaIslands(
  source: HTMLImageElement | HTMLCanvasElement,
  options: SlicerOptions = {}
): SlicedSpriteItem[] {
  const alphaThreshold = options.alphaThreshold ?? 15;
  const minSize = options.minSize ?? 4;
  const namePrefix = options.namePrefix ?? 'slice';

  const width = source.width;
  const height = source.height;

  // Render to offscreen canvas to access raw pixel buffer
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  ctx.drawImage(source, 0, 0);
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 1D visited bit array to minimize memory overhead
  const visited = new Uint8Array(width * height);
  const rawSlices: Array<{ minX: number; minY: number; maxX: number; maxY: number; count: number }> = [];

  // 8-direction neighbor offsets: dx, dy
  const dx = [-1, 0, 1, -1, 1, -1, 0, 1];
  const dy = [-1, -1, -1, 0, 0, 1, 1, 1];

  // Helper queue for Breadth-First Search
  const queueX = new Int32Array(width * height);
  const queueY = new Int32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;

      const alpha = data[idx * 4 + 3];
      if (alpha < alphaThreshold) {
        visited[idx] = 1;
        continue;
      }

      // Found a new unvisited non-transparent island
      let head = 0;
      let tail = 0;
      queueX[tail] = x;
      queueY[tail] = y;
      tail++;
      visited[idx] = 1;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let count = 0;

      while (head < tail) {
        const cx = queueX[head];
        const cy = queueY[head];
        head++;
        count++;

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        for (let dir = 0; dir < 8; dir++) {
          const nx = cx + dx[dir];
          const ny = cy + dy[dir];

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;
            if (!visited[nIdx]) {
              visited[nIdx] = 1;
              if (data[nIdx * 4 + 3] >= alphaThreshold) {
                queueX[tail] = nx;
                queueY[tail] = ny;
                tail++;
              }
            }
          }
        }
      }

      const w = maxX - minX + 1;
      const h = maxY - minY + 1;

      if (w >= minSize && h >= minSize) {
        rawSlices.push({ minX, minY, maxX, maxY, count });
      }
    }
  }

  // Sort slices in reading order: top-to-bottom rows, left-to-right
  // We cluster slices into rows based on vertical proximity
  const sortedSlices = [...rawSlices].sort((a, b) => {
    // If Y difference is small (within 1/3 of average height), sort by X
    const avgH = (a.maxY - a.minY + (b.maxY - b.minY)) / 2;
    if (Math.abs(a.minY - b.minY) < avgH * 0.4) {
      return a.minX - b.minX;
    }
    return a.minY - b.minY;
  });

  // Extract each detected island into its own canvas
  return sortedSlices.map((slice, index) => {
    const sw = slice.maxX - slice.minX + 1;
    const sh = slice.maxY - slice.minY + 1;

    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = sw;
    sliceCanvas.height = sh;
    const sCtx = sliceCanvas.getContext('2d')!;

    sCtx.imageSmoothingEnabled = false;
    sCtx.drawImage(
      source,
      slice.minX,
      slice.minY,
      sw,
      sh,
      0,
      0,
      sw,
      sh
    );

    const padIdx = String(index + 1).padStart(2, '0');
    return {
      id: `slice_${Date.now()}_${index}`,
      name: `${namePrefix}_${padIdx}`,
      width: sw,
      height: sh,
      canvas: sliceCanvas,
      sourceRect: {
        x: slice.minX,
        y: slice.minY,
        width: sw,
        height: sh
      }
    };
  });
}
