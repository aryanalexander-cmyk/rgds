// Pure-JS GIF89a LZW encoder with palette quantization (Zero external dependencies)
export interface GifFramePayload {
  canvas: HTMLCanvasElement;
  delayMs: number;
}

export function encodeGif89a(
  frames: GifFramePayload[],
  width: number,
  height: number,
  useTransparency: boolean = true
): Blob {
  const out: number[] = [];

  function writeByte(b: number) { out.push(b & 0xFF); }
  function writeShort(v: number) { writeByte(v & 0xFF); writeByte((v >> 8) & 0xFF); }
  function writeASCII(s: string) { for (let i = 0; i < s.length; i++) writeByte(s.charCodeAt(i)); }

  // 1. Build Palette (256 colors max)
  const colorMap = new Map<number, number>();
  const palette: number[] = [];

  // Index 255 = reserved transparent color if transparency is on
  if (useTransparency) {
    colorMap.set(0x00000000, 255);
  }

  frames.forEach(frame => {
    const ctx = frame.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const d = ctx.getImageData(0, 0, width, height).data;
    for (let p = 0; p < d.length; p += 4) {
      const a = d[p + 3];
      if (useTransparency && a < 128) continue;
      // Quantize 5-bit color key
      const r = d[p] & 0xF8;
      const g = d[p + 1] & 0xF8;
      const b = d[p + 2] & 0xF8;
      const key = (r << 16) | (g << 8) | b;
      if (!colorMap.has(key) && palette.length < 255 * 3) {
        colorMap.set(key, Math.floor(palette.length / 3));
        palette.push(d[p], d[p + 1], d[p + 2]);
      }
    }
  });

  // Pad palette to 256 colors (768 bytes)
  while (palette.length < 768) {
    palette.push(0, 0, 0);
  }

  function findClosestIndex(r: number, g: number, b: number): number {
    const key = ((r & 0xF8) << 16) | ((g & 0xF8) << 8) | (b & 0xF8);
    if (colorMap.has(key)) return colorMap.get(key)!;

    let bestDist = Infinity;
    let bestIdx = 0;
    for (let i = 0; i < 255; i++) {
      const pr = palette[i * 3];
      const pg = palette[i * 3 + 1];
      const pb = palette[i * 3 + 2];
      const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  // Header
  writeASCII('GIF89a');
  writeShort(width);
  writeShort(height);
  writeByte(0xF7); // Global color table present, 8 bits/pixel
  writeByte(useTransparency ? 255 : 0); // Background color index
  writeByte(0); // Pixel aspect ratio

  // Global Color Table
  for (let i = 0; i < 768; i++) writeByte(palette[i]);

  // Netscape looping extension (infinite loop)
  writeByte(0x21); writeByte(0xFF); writeByte(11);
  writeASCII('NETSCAPE2.0');
  writeByte(3); writeByte(1); writeShort(0); writeByte(0);

  function writeLZW(indices: Uint8Array) {
    const minCodeSize = 8;
    writeByte(minCodeSize);

    const clearCode = 1 << minCodeSize;
    const eoiCode = clearCode + 1;
    let codeSize = minCodeSize + 1;
    let nextCode = eoiCode + 1;
    const dict = new Map<number, number>();

    let bitBuf = 0;
    let bitCount = 0;
    const subBlock: number[] = [];

    const flushSubBlock = () => {
      if (subBlock.length > 0) {
        writeByte(subBlock.length);
        for (let i = 0; i < subBlock.length; i++) writeByte(subBlock[i]);
        subBlock.length = 0;
      }
    };

    const emitCode = (code: number) => {
      bitBuf |= (code << bitCount);
      bitCount += codeSize;
      while (bitCount >= 8) {
        subBlock.push(bitBuf & 0xFF);
        if (subBlock.length === 255) flushSubBlock();
        bitBuf >>= 8;
        bitCount -= 8;
      }
    };

    emitCode(clearCode);
    let prefix = indices[0];

    for (let i = 1; i < indices.length; i++) {
      const suffix = indices[i];
      const key = (prefix << 8) | suffix;
      if (dict.has(key)) {
        prefix = dict.get(key)!;
      } else {
        emitCode(prefix);
        dict.set(key, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) {
          codeSize++;
        } else if (nextCode >= 4096) {
          emitCode(clearCode);
          dict.clear();
          codeSize = minCodeSize + 1;
          nextCode = eoiCode + 1;
        }
        prefix = suffix;
      }
    }

    emitCode(prefix);
    emitCode(eoiCode);
    if (bitCount > 0) subBlock.push(bitBuf & 0xFF);
    flushSubBlock();
    writeByte(0x00); // Block terminator
  }

  const numPixels = width * height;
  const indexedPixels = new Uint8Array(numPixels);

  frames.forEach(frame => {
    const delayCs = Math.max(2, Math.round(frame.delayMs / 10)); // 1/100ths of a second
    writeByte(0x21); // Extension introducer
    writeByte(0xF9); // Graphic control label
    writeByte(4);    // Byte size
    writeByte(useTransparency ? 0x09 : 0x04); // Disposal method (restore background)
    writeShort(delayCs);
    writeByte(useTransparency ? 255 : 0); // Transparent color index
    writeByte(0);

    writeByte(0x2C); // Image descriptor
    writeShort(0); writeShort(0);
    writeShort(width); writeShort(height);
    writeByte(0);

    const ctx = frame.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const d = ctx.getImageData(0, 0, width, height).data;

    for (let p = 0; p < numPixels; p++) {
      const off = p * 4;
      if (useTransparency && d[off + 3] < 128) {
        indexedPixels[p] = 255;
      } else {
        indexedPixels[p] = findClosestIndex(d[off], d[off + 1], d[off + 2]);
      }
    }

    writeLZW(indexedPixels);
  });

  writeByte(0x3B); // GIF trailer
  return new Blob([new Uint8Array(out)], { type: 'image/gif' });
}
