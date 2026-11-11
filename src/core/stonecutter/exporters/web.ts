import { SpriteItem } from '../../../types/stonecutter';

export function generateCssKeyframes(
  sprites: SpriteItem[],
  sheetName: string = 'spritesheet',
  sheetWidth: number = 512,
  sheetHeight: number = 512
): string {
  let css = `/* Modern CSS Spritesheet Classes & Keyframes */\n`;
  css += `.${sheetName}-sprite {\n`;
  css += `  display: inline-block;\n`;
  css += `  background-image: url('${sheetName}.png');\n`;
  css += `  background-repeat: no-repeat;\n`;
  css += `  image-rendering: pixelated;\n`;
  css += `}\n\n`;

  sprites.forEach(sp => {
    if (!sp.packed) return;
    const clean = sp.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    css += `.${sheetName}-${clean} {\n`;
    css += `  width: ${sp.packed.w}px;\n`;
    css += `  height: ${sp.packed.h}px;\n`;
    css += `  background-position: -${sp.packed.x}px -${sp.packed.y}px;\n`;
    css += `}\n`;
  });

  return css;
}

export function generateJsonHash(
  sprites: SpriteItem[],
  sheetName: string = 'spritesheet',
  sheetWidth: number = 512,
  sheetHeight: number = 512
): string {
  const frames: Record<string, any> = {};

  sprites.forEach(sp => {
    if (!sp.packed) return;
    frames[sp.name] = {
      frame: { x: sp.packed.x, y: sp.packed.y, w: sp.packed.w, h: sp.packed.h },
      rotated: false,
      trimmed: sp.trimBounds?.trimmed || false,
      spriteSourceSize: {
        x: sp.trimBounds?.x || 0,
        y: sp.trimBounds?.y || 0,
        w: sp.packed.w,
        h: sp.packed.h
      },
      sourceSize: { w: sp.width, h: sp.height }
    };
  });

  return JSON.stringify({
    frames,
    meta: {
      app: "Ristek Game Development Suite — Stonecutter",
      version: "1.0",
      image: `${sheetName}.png`,
      format: "RGBA8888",
      size: { w: sheetWidth, h: sheetHeight },
      scale: "1"
    }
  }, null, 2);
}
