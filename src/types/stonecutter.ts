export type PackingAlgorithm = 'maxrects' | 'grid' | 'horizontal' | 'vertical';
export type HeuristicRule = 'auto' | 'bssf' | 'blsf' | 'baf' | 'bl';
export type SortOrder = 'none' | 'maxside' | 'area' | 'height' | 'name' | 'name_desc';

export interface SpriteItem {
  id: string;
  name: string;
  file?: File;
  img: HTMLImageElement;
  width: number;
  height: number;
  trimBounds?: {
    x: number;
    y: number;
    w: number;
    h: number;
    trimmed: boolean;
  };
  packed?: {
    x: number;
    y: number;
    w: number;
    h: number;
    rotated?: boolean;
  };
}

export interface PackerConfig {
  algorithm: PackingAlgorithm;
  heuristic: HeuristicRule;
  sortOrder: SortOrder;
  spacing: number;
  margin: number;
  extrude: number; // 1-2px border extrusion for subpixel bleed prevention
  trimTransparency: boolean;
  alphaThreshold: number;
  powerOfTwo: boolean;
  forceSquare: boolean;
  gridCols: number;
  gridUniform: boolean;
}

export interface PackerResult {
  width: number;
  height: number;
  efficiency: number;
  trimSavedArea: number;
  sprites: SpriteItem[];
}
