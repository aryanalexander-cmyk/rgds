import { SpriteItem, PackerConfig, PackerResult } from '../../types/stonecutter';

interface FreeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

export function runPackingEngine(
  inputSprites: SpriteItem[],
  config: PackerConfig
): PackerResult {
  if (inputSprites.length === 0) {
    return { width: 0, height: 0, efficiency: 0, trimSavedArea: 0, sprites: [] };
  }

  // Calculate active dimensions (considering trim)
  const items = inputSprites.map(sp => {
    let dw = sp.width;
    let dh = sp.height;
    if (config.trimTransparency && sp.trimBounds && sp.trimBounds.trimmed) {
      dw = sp.trimBounds.w;
      dh = sp.trimBounds.h;
    }
    // Add extrusion padding
    dw += config.extrude * 2;
    dh += config.extrude * 2;
    return {
      sprite: sp,
      w: dw,
      h: dh,
      area: dw * dh,
      maxSide: Math.max(dw, dh)
    };
  });

  // Calculate Trim Saved Area
  let rawArea = 0;
  let trimmedActiveArea = 0;
  inputSprites.forEach(sp => {
    rawArea += sp.width * sp.height;
    if (config.trimTransparency && sp.trimBounds) {
      trimmedActiveArea += sp.trimBounds.w * sp.trimBounds.h;
    } else {
      trimmedActiveArea += sp.width * sp.height;
    }
  });
  const trimSavedArea = rawArea > 0 ? Math.max(0, 1 - trimmedActiveArea / rawArea) : 0;

  // Sort sprites
  const sorted = [...items];
  if (config.sortOrder === 'maxside') {
    sorted.sort((a, b) => b.maxSide - a.maxSide || b.area - a.area);
  } else if (config.sortOrder === 'area') {
    sorted.sort((a, b) => b.area - a.area || b.maxSide - a.maxSide);
  } else if (config.sortOrder === 'height') {
    sorted.sort((a, b) => b.h - a.h || b.w - a.w);
  } else if (config.sortOrder === 'name') {
    sorted.sort((a, b) => a.sprite.name.localeCompare(b.sprite.name, undefined, { numeric: true, sensitivity: 'base' }));
  } else if (config.sortOrder === 'name_desc') {
    sorted.sort((a, b) => b.sprite.name.localeCompare(a.sprite.name, undefined, { numeric: true, sensitivity: 'base' }));
  }
  // If config.sortOrder === 'none', retains input list order!

  const spacing = config.spacing;
  const margin = config.margin;

  // Algorithm 1: Horizontal Strip
  if (config.algorithm === 'horizontal') {
    let curX = margin;
    let maxH = 0;
    sorted.forEach(item => {
      item.sprite.packed = {
        x: curX,
        y: margin,
        w: item.w,
        h: item.h
      };
      curX += item.w + spacing;
      if (item.h > maxH) maxH = item.h;
    });
    let finalW = curX - spacing + margin;
    let finalH = maxH + margin * 2;
    if (config.powerOfTwo) {
      finalW = nextPowerOfTwo(finalW);
      finalH = nextPowerOfTwo(finalH);
    }
    if (config.forceSquare) {
      const sq = Math.max(finalW, finalH);
      finalW = sq;
      finalH = sq;
    }
    return {
      width: finalW,
      height: finalH,
      efficiency: (trimmedActiveArea / (finalW * finalH || 1)),
      trimSavedArea,
      sprites: inputSprites
    };
  }

  // Algorithm 2: Vertical Strip
  if (config.algorithm === 'vertical') {
    let curY = margin;
    let maxW = 0;
    sorted.forEach(item => {
      item.sprite.packed = {
        x: margin,
        y: curY,
        w: item.w,
        h: item.h
      };
      curY += item.h + spacing;
      if (item.w > maxW) maxW = item.w;
    });
    let finalW = maxW + margin * 2;
    let finalH = curY - spacing + margin;
    if (config.powerOfTwo) {
      finalW = nextPowerOfTwo(finalW);
      finalH = nextPowerOfTwo(finalH);
    }
    if (config.forceSquare) {
      const sq = Math.max(finalW, finalH);
      finalW = sq;
      finalH = sq;
    }
    return {
      width: finalW,
      height: finalH,
      efficiency: (trimmedActiveArea / (finalW * finalH || 1)),
      trimSavedArea,
      sprites: inputSprites
    };
  }

  // Algorithm 3: Grid / Fixed Columns
  if (config.algorithm === 'grid') {
    const cols = Math.max(1, config.gridCols || 4);
    const rows = Math.ceil(sorted.length / cols);

    let finalW = 0;
    let finalH = 0;

    if (config.gridUniform !== false) {
      // Uniform Cell Size (Max W × Max H) with auto-centering
      let cellW = 1;
      let cellH = 1;
      sorted.forEach(item => {
        if (item.w > cellW) cellW = item.w;
        if (item.h > cellH) cellH = item.h;
      });

      sorted.forEach((item, idx) => {
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        const cellX = margin + c * (cellW + spacing);
        const cellY = margin + r * (cellH + spacing);
        const offsetX = Math.floor((cellW - item.w) / 2);
        const offsetY = Math.floor((cellH - item.h) / 2);

        item.sprite.packed = {
          x: cellX + offsetX,
          y: cellY + offsetY,
          w: item.w,
          h: item.h
        };
      });

      finalW = margin * 2 + cols * cellW + Math.max(0, cols - 1) * spacing;
      finalH = margin * 2 + rows * cellH + Math.max(0, rows - 1) * spacing;
    } else {
      // Non-uniform grid (variable height per row and variable width per column)
      let curY = margin;
      let maxRowW = 1;
      for (let r = 0; r < rows; r++) {
        let curX = margin;
        let rowH = 1;
        const rowItems = sorted.slice(r * cols, (r + 1) * cols);
        rowItems.forEach((item, cIdx) => {
          item.sprite.packed = {
            x: curX,
            y: curY,
            w: item.w,
            h: item.h
          };
          curX += item.w + (cIdx < rowItems.length - 1 ? spacing : 0);
          if (item.h > rowH) rowH = item.h;
        });
        if (curX + margin > maxRowW) maxRowW = curX + margin;
        curY += rowH + (r < rows - 1 ? spacing : 0);
      }
      finalW = maxRowW;
      finalH = curY + margin;
    }

    if (config.powerOfTwo) {
      finalW = nextPowerOfTwo(finalW);
      finalH = nextPowerOfTwo(finalH);
    }
    if (config.forceSquare) {
      const sq = Math.max(finalW, finalH);
      finalW = sq;
      finalH = sq;
    }

    return {
      width: finalW,
      height: finalH,
      efficiency: (trimmedActiveArea / (finalW * finalH || 1)),
      trimSavedArea,
      sprites: inputSprites
    };
  }

  // Algorithm 4: Default MaxRects Bin Packing
  const totalSpriteArea = sorted.reduce((sum, item) => sum + item.area, 0);
  let estDim = Math.max(64, Math.ceil(Math.sqrt(totalSpriteArea * 1.25)));
  let sheetW = config.powerOfTwo ? nextPowerOfTwo(estDim) : estDim;
  let sheetH = sheetW;

  let packedSuccessfully = false;

  while (!packedSuccessfully && sheetW <= 8192 && sheetH <= 8192) {
    const freeRects: FreeRect[] = [
      { x: margin, y: margin, w: sheetW - margin * 2, h: sheetH - margin * 2 }
    ];

    let allFit = true;

    for (const item of sorted) {
      const requiredW = item.w + spacing;
      const requiredH = item.h + spacing;

      let bestIdx = -1;
      let bestShortSide = Infinity;
      let bestLongSide = Infinity;
      let bestArea = Infinity;

      for (let i = 0; i < freeRects.length; i++) {
        const fr = freeRects[i];
        if (fr.w >= item.w && fr.h >= item.h) {
          const leftoverW = fr.w - item.w;
          const leftoverH = fr.h - item.h;
          const shortSide = Math.min(leftoverW, leftoverH);
          const longSide = Math.max(leftoverW, leftoverH);
          const area = fr.w * fr.h - item.w * item.h;

          if (config.heuristic === 'bssf' && shortSide < bestShortSide) {
            bestShortSide = shortSide;
            bestIdx = i;
          } else if (config.heuristic === 'blsf' && longSide < bestLongSide) {
            bestLongSide = longSide;
            bestIdx = i;
          } else if (config.heuristic === 'baf' && area < bestArea) {
            bestArea = area;
            bestIdx = i;
          } else if (config.heuristic === 'auto' || config.heuristic === 'bl') {
            if (shortSide < bestShortSide) {
              bestShortSide = shortSide;
              bestIdx = i;
            }
          }
        }
      }

      if (bestIdx === -1) {
        allFit = false;
        break;
      }

      const targetRect = freeRects[bestIdx];
      const packedX = targetRect.x;
      const packedY = targetRect.y;

      item.sprite.packed = {
        x: packedX,
        y: packedY,
        w: item.w,
        h: item.h
      };

      // Split intersecting free rectangles
      const usedRect = { x: packedX, y: packedY, w: requiredW, h: requiredH };
      const newFreeRects: FreeRect[] = [];

      for (const fr of freeRects) {
        // Check intersection
        if (
          usedRect.x < fr.x + fr.w &&
          usedRect.x + usedRect.w > fr.x &&
          usedRect.y < fr.y + fr.h &&
          usedRect.y + usedRect.h > fr.y
        ) {
          // Generate up to 4 subdivisions
          if (usedRect.x > fr.x && usedRect.x < fr.x + fr.w) {
            newFreeRects.push({ x: fr.x, y: fr.y, w: usedRect.x - fr.x, h: fr.h });
          }
          if (usedRect.x + usedRect.w < fr.x + fr.w) {
            newFreeRects.push({
              x: usedRect.x + usedRect.w,
              y: fr.y,
              w: fr.x + fr.w - (usedRect.x + usedRect.w),
              h: fr.h
            });
          }
          if (usedRect.y > fr.y && usedRect.y < fr.y + fr.h) {
            newFreeRects.push({ x: fr.x, y: fr.y, w: fr.w, h: usedRect.y - fr.y });
          }
          if (usedRect.y + usedRect.h < fr.y + fr.h) {
            newFreeRects.push({
              x: fr.x,
              y: usedRect.y + usedRect.h,
              w: fr.w,
              h: fr.y + fr.h - (usedRect.y + usedRect.h)
            });
          }
        } else {
          newFreeRects.push(fr);
        }
      }

      // Filter redundant sub-rectangles
      freeRects.length = 0;
      for (let i = 0; i < newFreeRects.length; i++) {
        let isContained = false;
        const a = newFreeRects[i];
        for (let j = 0; j < newFreeRects.length; j++) {
          if (i === j) continue;
          const b = newFreeRects[j];
          if (a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h) {
            isContained = true;
            break;
          }
        }
        if (!isContained && a.w > 0 && a.h > 0) {
          freeRects.push(a);
        }
      }
    }

    if (allFit) {
      packedSuccessfully = true;
    } else {
      // Expand atlas
      if (sheetW <= sheetH) {
        sheetW = config.powerOfTwo ? sheetW * 2 : Math.round(sheetW * 1.3);
      } else {
        sheetH = config.powerOfTwo ? sheetH * 2 : Math.round(sheetH * 1.3);
      }
      if (config.forceSquare) {
        const mx = Math.max(sheetW, sheetH);
        sheetW = mx;
        sheetH = mx;
      }
    }
  }

  // Calculate tight bounding box if not forced POT/Square
  let maxRight = 0;
  let maxBottom = 0;
  sorted.forEach(item => {
    if (item.sprite.packed) {
      const r = item.sprite.packed.x + item.sprite.packed.w;
      const b = item.sprite.packed.y + item.sprite.packed.h;
      if (r > maxRight) maxRight = r;
      if (b > maxBottom) maxBottom = b;
    }
  });

  let finalWidth = maxRight + margin;
  let finalHeight = maxBottom + margin;

  if (config.powerOfTwo) {
    finalWidth = nextPowerOfTwo(finalWidth);
    finalHeight = nextPowerOfTwo(finalHeight);
  }
  if (config.forceSquare) {
    const sq = Math.max(finalWidth, finalHeight);
    finalWidth = sq;
    finalHeight = sq;
  }

  const occupiedArea = sorted.reduce((sum, item) => sum + item.area, 0);
  const efficiency = finalWidth * finalHeight > 0 ? (occupiedArea / (finalWidth * finalHeight)) : 0;

  return {
    width: finalWidth,
    height: finalHeight,
    efficiency,
    trimSavedArea,
    sprites: inputSprites
  };
}
