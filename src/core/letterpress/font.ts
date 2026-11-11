/**
 * Letterpress Modern Bitmap Font Generator Engine
 * Rasterizes TTF/OTF and web fonts to packed glyph atlases with
 * Godot 4 FontFile and BMFont (.fnt) descriptor generators.
 */

export interface GlyphMetric {
  char: string;
  code: number;
  x: number;
  y: number;
  width: number;
  height: number;
  xoffset: number;
  yoffset: number;
  xadvance: number;
}

export type FontFillMode = 'solid' | 'gradient';

export interface FontGeneratorConfig {
  fontFamily: string;
  fontSize: number; // in pixels
  characterSet: string;
  padding: number; // padding around each glyph
  strokeWidth: number; // 0 for none, 1-4 for outline
  strokeColor: string;
  fillMode?: FontFillMode;
  fillColor: string;
  fillColor2?: string;
  includeShadow: boolean;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowColor: string;
}

export const ARCADE_PALETTES = [
  { name: 'Gold Coin', top: '#fff176', bottom: '#f57f17' },
  { name: 'Cyber Neon', top: '#00e5ff', bottom: '#2979ff' },
  { name: 'Ruby Fire', top: '#ff5252', bottom: '#b71c1c' },
  { name: 'Emerald Jam', top: '#a7f3d0', bottom: '#059669' },
  { name: 'Violet Dream', top: '#f472b6', bottom: '#7c3aed' },
  { name: 'Pure Snow', top: '#ffffff', bottom: '#94a3b8' }
];

export const CHAR_PRESETS: Record<string, { name: string; chars: string }> = {
  ascii: {
    name: 'Standard ASCII (95 chars)',
    chars: ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~'
  },
  alphanumeric: {
    name: 'Alphanumeric (62 chars)',
    chars: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  },
  hud: {
    name: 'Game HUD & Scores (30 chars)',
    chars: '0123456789/+-xX:.,%HPMPLVL$#'
  },
  uppercase: {
    name: 'Uppercase & Numbers (40 chars)',
    chars: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ .,!?'
  }
};

export const BUILTIN_FONTS = [
  { id: 'monospace', name: 'Monospace (System Pixel/Code)' },
  { id: 'sans-serif', name: 'Clean Sans-Serif' },
  { id: 'serif', name: 'Classic Serif' },
  { id: 'fantasy', name: 'Arcade Fantasy' },
  { id: 'cursive', name: 'Handwritten / Script' }
];

export const DEFAULT_FONT_CONFIG: FontGeneratorConfig = {
  fontFamily: 'monospace',
  fontSize: 28,
  characterSet: CHAR_PRESETS.ascii.chars,
  padding: 4,
  strokeWidth: 2,
  strokeColor: '#000000',
  fillMode: 'solid',
  fillColor: '#ffffff',
  fillColor2: '#94a3b8',
  includeShadow: false,
  shadowOffsetX: 2,
  shadowOffsetY: 2,
  shadowColor: 'rgba(0, 0, 0, 0.7)'
};

export interface PackedAtlasResult {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  metrics: GlyphMetric[];
  lineHeight: number;
  baseLine: number;
}

/**
 * Generate packed glyph atlas and character metrics
 */
export function generateBitmapFontAtlas(
  config: FontGeneratorConfig
): PackedAtlasResult {
  const chars = Array.from(new Set(config.characterSet.split('')));
  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d')!;

  const fontStr = `bold ${config.fontSize}px ${config.fontFamily}`;
  mCtx.font = fontStr;

  // Measure all individual glyphs
  const glyphData: Array<{
    char: string;
    code: number;
    w: number;
    h: number;
    xadvance: number;
    metrics: TextMetrics;
  }> = [];

  const extraPadding = config.strokeWidth * 2 + (config.includeShadow ? Math.max(config.shadowOffsetX, config.shadowOffsetY) : 0);
  const cellPadding = config.padding;

  let maxGlyphH = Math.ceil(config.fontSize * 1.2);

  for (const ch of chars) {
    const tm = mCtx.measureText(ch);
    const w = Math.ceil(Math.max(1, tm.width)) + extraPadding + cellPadding * 2;
    const h = maxGlyphH + extraPadding + cellPadding * 2;
    glyphData.push({
      char: ch,
      code: ch.charCodeAt(0),
      w,
      h,
      xadvance: Math.ceil(tm.width) + (config.strokeWidth > 0 ? config.strokeWidth : 0),
      metrics: tm
    });
  }

  // Calculate atlas dimensions (power of two preference: 256, 512, 1024)
  const totalArea = glyphData.reduce((sum, g) => sum + g.w * g.h, 0);
  let atlasWidth = 256;
  if (totalArea > 256 * 256) atlasWidth = 512;
  if (totalArea > 512 * 512) atlasWidth = 1024;
  if (totalArea > 1024 * 1024) atlasWidth = 2048;

  // Shelf-packing algorithm
  let curX = 0;
  let curY = 0;
  let rowH = 0;

  const placedGlyphs: GlyphMetric[] = [];

  for (const g of glyphData) {
    if (curX + g.w > atlasWidth) {
      curX = 0;
      curY += rowH;
      rowH = 0;
    }

    placedGlyphs.push({
      char: g.char,
      code: g.code,
      x: curX,
      y: curY,
      width: g.w,
      height: g.h,
      xoffset: 0,
      yoffset: 0,
      xadvance: g.xadvance
    });

    curX += g.w;
    if (g.h > rowH) rowH = g.h;
  }

  const atlasHeight = Math.max(128, Math.pow(2, Math.ceil(Math.log2(curY + rowH))));

  // Render to Atlas Canvas
  const atlasCanvas = document.createElement('canvas');
  atlasCanvas.width = atlasWidth;
  atlasCanvas.height = atlasHeight;
  const ctx = atlasCanvas.getContext('2d')!;

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, atlasWidth, atlasHeight);
  ctx.font = fontStr;
  ctx.textBaseline = 'top';

  for (let i = 0; i < placedGlyphs.length; i++) {
    const p = placedGlyphs[i];
    const drawX = p.x + cellPadding + config.strokeWidth;
    const drawY = p.y + cellPadding + config.strokeWidth;

    // Optional Drop Shadow
    if (config.includeShadow) {
      ctx.fillStyle = config.shadowColor;
      ctx.fillText(
        p.char,
        drawX + config.shadowOffsetX,
        drawY + config.shadowOffsetY
      );
    }

    // Outline Stroke
    if (config.strokeWidth > 0) {
      ctx.strokeStyle = config.strokeColor;
      ctx.lineWidth = config.strokeWidth * 2;
      ctx.lineJoin = 'miter';
      ctx.strokeText(p.char, drawX, drawY);
    }

    // Primary Text Fill (Solid or Vertical Linear Gradient)
    if (config.fillMode === 'gradient' && config.fillColor2) {
      const grad = ctx.createLinearGradient(0, drawY, 0, drawY + config.fontSize);
      grad.addColorStop(0, config.fillColor);
      grad.addColorStop(1, config.fillColor2);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = config.fillColor;
    }
    ctx.fillText(p.char, drawX, drawY);
  }

  return {
    canvas: atlasCanvas,
    width: atlasWidth,
    height: atlasHeight,
    metrics: placedGlyphs,
    lineHeight: Math.ceil(config.fontSize * 1.3),
    baseLine: Math.ceil(config.fontSize * 0.9)
  };
}

/**
 * Generate standard BMFont (.fnt text format)
 * Widely supported by Unity TextMeshPro, Godot 4, and game engines.
 */
export function generateBMFontDescriptor(
  atlasResult: PackedAtlasResult,
  fontName: string,
  imageFileName: string,
  fontSize: number
): string {
  const lines: string[] = [];

  // Info line
  lines.push(
    `info face="${fontName}" size=${fontSize} bold=1 italic=0 charset="" unicode=1 stretchH=100 smooth=0 aa=1 padding=0,0,0,0 spacing=1,1 outline=0`
  );

  // Common line
  lines.push(
    `common lineHeight=${atlasResult.lineHeight} base=${atlasResult.baseLine} scaleW=${atlasResult.width} scaleH=${atlasResult.height} pages=1 packed=0 alphaChnl=0 redChnl=0 greenChnl=0 blueChnl=0`
  );

  // Page line
  lines.push(`page id=0 file="${imageFileName}"`);

  // Chars count line
  lines.push(`chars count=${atlasResult.metrics.length}`);

  // Individual glyph lines
  for (const m of atlasResult.metrics) {
    lines.push(
      `char id=${m.code}   x=${m.x}    y=${m.y}    width=${m.width}    height=${m.height}    xoffset=${m.xoffset}   yoffset=${m.yoffset}   xadvance=${m.xadvance}    page=0  chnl=15`
    );
  }

  return lines.join('\n');
}

/**
 * Generate Godot 4 FontFile (.tres) format
 */
export function generateGodotFontResource(
  atlasResult: PackedAtlasResult,
  imageFileName: string
): string {
  return `[gd_resource type="FontFile" format=3]

[resource]
resource_name = "BitmapFont"
atlas_texture = "${imageFileName}"
line_height = ${atlasResult.lineHeight}
ascent = ${atlasResult.baseLine}
`;
}
