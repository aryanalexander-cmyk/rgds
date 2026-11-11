import { SpriteItem, PackerConfig } from '../../types/stonecutter';

export function renderSpritesheetCanvas(
  sprites: SpriteItem[],
  width: number,
  height: number,
  config: PackerConfig
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  const extrude = config.extrude || 0;

  sprites.forEach(sp => {
    if (!sp.packed) return;

    let sx = 0;
    let sy = 0;
    let dw = sp.width;
    let dh = sp.height;

    if (config.trimTransparency && sp.trimBounds && sp.trimBounds.trimmed) {
      sx = sp.trimBounds.x;
      sy = sp.trimBounds.y;
      dw = sp.trimBounds.w;
      dh = sp.trimBounds.h;
    }

    const x = sp.packed.x + extrude;
    const y = sp.packed.y + extrude;

    // Extrude edge pixels outward to prevent subpixel bleeding in Godot/Unity
    if (extrude > 0) {
      // Top edge
      ctx.drawImage(sp.img, sx, sy, dw, 1, x, y - extrude, dw, extrude);
      // Bottom edge
      ctx.drawImage(sp.img, sx, sy + dh - 1, dw, 1, x, y + dh, dw, extrude);
      // Left edge
      ctx.drawImage(sp.img, sx, sy, 1, dh, x - extrude, y, extrude, dh);
      // Right edge
      ctx.drawImage(sp.img, sx + dw - 1, sy, 1, dh, x + dw, y, extrude, dh);
      // Corners
      ctx.drawImage(sp.img, sx, sy, 1, 1, x - extrude, y - extrude, extrude, extrude);
      ctx.drawImage(sp.img, sx + dw - 1, sy, 1, 1, x + dw, y - extrude, extrude, extrude);
      ctx.drawImage(sp.img, sx, sy + dh - 1, 1, 1, x - extrude, y + dh, extrude, extrude);
      ctx.drawImage(sp.img, sx + dw - 1, sy + dh - 1, 1, 1, x + dw, y + dh, extrude, extrude);
    }

    // Main sprite body
    ctx.drawImage(sp.img, sx, sy, dw, dh, x, y, dw, dh);
  });

  return canvas;
}
