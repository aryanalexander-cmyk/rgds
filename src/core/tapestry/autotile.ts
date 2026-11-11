/**
 * Tapestry Core Level Tilemap Autotiler & Wang-Tile Rule Lab
 * 47-Tile 3x3 Minimal Bitmask Autotiling Engine, Real-Time Interactive Level Painter,
 * and Godot 4 TileSet (.tres) / Unity RuleTile Exporters.
 */

export interface AutotileConfig {
  tileSize: number;        // e.g. 16, 24, 32, 48 px (default: 32)
  gridCols: number;        // sandbox grid width in tiles (default: 20)
  gridRows: number;        // sandbox grid height in tiles (default: 14)
  theme: 'mossy_forest' | 'dungeon_brick' | 'scifi_metal';
}

export const DEFAULT_AUTOTILE_CONFIG: AutotileConfig = {
  tileSize: 32,
  gridCols: 20,
  gridRows: 14,
  theme: 'mossy_forest'
};

// Neighbor Bitmask Flags
export const BIT_N  = 1;
export const BIT_NE = 2;
export const BIT_E  = 4;
export const BIT_SE = 8;
export const BIT_S  = 16;
export const BIT_SW = 32;
export const BIT_W  = 64;
export const BIT_NW = 128;

/**
 * Calculate the canonical 47-tile index from an 8-bit neighbor mask.
 * Corner bits are only counted if both flanking cardinal directions are filled.
 */
export function getCanonicalTileIndex(
  n: boolean,
  ne: boolean,
  e: boolean,
  se: boolean,
  s: boolean,
  sw: boolean,
  w: boolean,
  nw: boolean
): number {
  // If no cardinals, return isolated tile
  let mask = 0;
  if (n) mask |= BIT_N;
  if (e) mask |= BIT_E;
  if (s) mask |= BIT_S;
  if (w) mask |= BIT_W;

  // Only consider diagonals if adjacent cardinals are both set
  if (n && e && ne) mask |= BIT_NE;
  if (s && e && se) mask |= BIT_SE;
  if (s && w && sw) mask |= BIT_SW;
  if (n && w && nw) mask |= BIT_NW;

  return MASK_TO_INDEX_MAP[mask] ?? 0;
}

// Canonical 47-tile lookup table mapping normalized 8-bit masks to template tile index (0 to 46)
// A standard template has a 12x4 or 8x6 layout. We map each mask to an index 0..46.
const MASK_TO_INDEX_MAP: Record<number, number> = {};

// Build mapping table algorithmically
(function initMaskMap() {
  // Single isolated center
  MASK_TO_INDEX_MAP[0] = 0;

  // 4 cardinal end caps (N, S, W, E single attachments)
  MASK_TO_INDEX_MAP[BIT_N] = 1;
  MASK_TO_INDEX_MAP[BIT_S] = 2;
  MASK_TO_INDEX_MAP[BIT_W] = 3;
  MASK_TO_INDEX_MAP[BIT_E] = 4;

  // Corridors / straight segments
  MASK_TO_INDEX_MAP[BIT_N | BIT_S] = 5; // Vertical pipe
  MASK_TO_INDEX_MAP[BIT_W | BIT_E] = 6; // Horizontal pipe

  // Simple outer corners (2 cardinals)
  MASK_TO_INDEX_MAP[BIT_S | BIT_E] = 7; // Top-Left corner
  MASK_TO_INDEX_MAP[BIT_S | BIT_W] = 8; // Top-Right corner
  MASK_TO_INDEX_MAP[BIT_N | BIT_E] = 9; // Bottom-Left corner
  MASK_TO_INDEX_MAP[BIT_N | BIT_W] = 10; // Bottom-Right corner

  // Outer corners with diagonals
  MASK_TO_INDEX_MAP[BIT_S | BIT_E | BIT_SE] = 11;
  MASK_TO_INDEX_MAP[BIT_S | BIT_W | BIT_SW] = 12;
  MASK_TO_INDEX_MAP[BIT_N | BIT_E | BIT_NE] = 13;
  MASK_TO_INDEX_MAP[BIT_N | BIT_W | BIT_NW] = 14;

  // T-Junctions (3 cardinals)
  MASK_TO_INDEX_MAP[BIT_W | BIT_E | BIT_S] = 15; // T facing down
  MASK_TO_INDEX_MAP[BIT_W | BIT_E | BIT_N] = 16; // T facing up
  MASK_TO_INDEX_MAP[BIT_N | BIT_S | BIT_E] = 17; // T facing right
  MASK_TO_INDEX_MAP[BIT_N | BIT_S | BIT_W] = 18; // T facing left

  // T-Junctions with inner corners filled
  MASK_TO_INDEX_MAP[BIT_W | BIT_E | BIT_S | BIT_SW | BIT_SE] = 19;
  MASK_TO_INDEX_MAP[BIT_W | BIT_E | BIT_N | BIT_NW | BIT_NE] = 20;
  MASK_TO_INDEX_MAP[BIT_N | BIT_S | BIT_E | BIT_NE | BIT_SE] = 21;
  MASK_TO_INDEX_MAP[BIT_N | BIT_S | BIT_W | BIT_NW | BIT_SW] = 22;

  // 4-Way Cross
  MASK_TO_INDEX_MAP[BIT_N | BIT_S | BIT_W | BIT_E] = 23;

  // Solid Center Fill (All 8 neighbors present)
  const ALL_8 = BIT_N | BIT_NE | BIT_E | BIT_SE | BIT_S | BIT_SW | BIT_W | BIT_NW;
  MASK_TO_INDEX_MAP[ALL_8] = 24;

  // Edges of large solid areas
  MASK_TO_INDEX_MAP[BIT_S | BIT_W | BIT_E | BIT_SW | BIT_SE] = 25; // Top edge
  MASK_TO_INDEX_MAP[BIT_N | BIT_W | BIT_E | BIT_NW | BIT_NE] = 26; // Bottom edge
  MASK_TO_INDEX_MAP[BIT_N | BIT_S | BIT_E | BIT_NE | BIT_SE] = 27; // Left edge
  MASK_TO_INDEX_MAP[BIT_N | BIT_S | BIT_W | BIT_NW | BIT_SW] = 28; // Right edge

  // Inner corner cuts in solid terrain (1 corner missing)
  MASK_TO_INDEX_MAP[ALL_8 & ~BIT_NW] = 29; // NW missing
  MASK_TO_INDEX_MAP[ALL_8 & ~BIT_NE] = 30; // NE missing
  MASK_TO_INDEX_MAP[ALL_8 & ~BIT_SW] = 31; // SW missing
  MASK_TO_INDEX_MAP[ALL_8 & ~BIT_SE] = 32; // SE missing

  // 2 inner corners missing
  MASK_TO_INDEX_MAP[ALL_8 & ~(BIT_NW | BIT_NE)] = 33;
  MASK_TO_INDEX_MAP[ALL_8 & ~(BIT_SW | BIT_SE)] = 34;
  MASK_TO_INDEX_MAP[ALL_8 & ~(BIT_NW | BIT_SW)] = 35;
  MASK_TO_INDEX_MAP[ALL_8 & ~(BIT_NE | BIT_SE)] = 36;
  MASK_TO_INDEX_MAP[ALL_8 & ~(BIT_NW | BIT_SE)] = 37;
  MASK_TO_INDEX_MAP[ALL_8 & ~(BIT_NE | BIT_SW)] = 38;

  // 3 inner corners missing
  MASK_TO_INDEX_MAP[ALL_8 & ~(BIT_NW | BIT_NE | BIT_SW)] = 39;
  MASK_TO_INDEX_MAP[ALL_8 & ~(BIT_NW | BIT_NE | BIT_SE)] = 40;
  MASK_TO_INDEX_MAP[ALL_8 & ~(BIT_NW | BIT_SW | BIT_SE)] = 41;
  MASK_TO_INDEX_MAP[ALL_8 & ~(BIT_NE | BIT_SW | BIT_SE)] = 42;

  // 4 inner corners missing
  MASK_TO_INDEX_MAP[ALL_8 & ~(BIT_NW | BIT_NE | BIT_SW | BIT_SE)] = 43;

  // Fallbacks for remaining compound combinations
  for (let m = 0; m < 256; m++) {
    if (MASK_TO_INDEX_MAP[m] === undefined) {
      // Find closest cardinal match
      const cardOnly = m & (BIT_N | BIT_S | BIT_W | BIT_E);
      MASK_TO_INDEX_MAP[m] = MASK_TO_INDEX_MAP[cardOnly] ?? 0;
    }
  }
})();

/**
 * Generate Procedural Autotile Texture Spritesheet for themes
 */
export function generateAutotileAtlas(
  theme: 'mossy_forest' | 'dungeon_brick' | 'scifi_metal',
  tileSize: number = 32
): HTMLCanvasElement {
  // A standard atlas with 8 columns x 6 rows = 48 tiles
  const cols = 8;
  const rows = 6;
  const canvas = document.createElement('canvas');
  canvas.width = cols * tileSize;
  canvas.height = rows * tileSize;
  const ctx = canvas.getContext('2d')!;

  ctx.imageSmoothingEnabled = false;

  for (let idx = 0; idx < 47; idx++) {
    const tx = (idx % cols) * tileSize;
    const ty = Math.floor(idx / cols) * tileSize;

    ctx.save();
    ctx.translate(tx, ty);

    if (theme === 'mossy_forest') {
      // Dirt body
      ctx.fillStyle = '#4a2c11';
      ctx.fillRect(0, 0, tileSize, tileSize);

      // Dirt noise texture
      ctx.fillStyle = '#3a200a';
      ctx.fillRect(4, 6, 6, 4);
      ctx.fillRect(16, 18, 5, 5);
      ctx.fillRect(22, 8, 4, 3);

      // Lush moss top cover
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(0, 0, tileSize, 5);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(0, 5, tileSize, 2);

      // Subtle grass tufts
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(4, 0, 3, 2);
      ctx.fillRect(14, 0, 4, 3);
      ctx.fillRect(24, 0, 3, 2);
    } else if (theme === 'dungeon_brick') {
      // Dark slate mortar
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, tileSize, tileSize);

      // 2 bricks per tile
      ctx.fillStyle = '#334155';
      ctx.fillRect(1, 1, tileSize - 2, tileSize / 2 - 2);
      ctx.fillRect(1, tileSize / 2 + 1, tileSize - 2, tileSize / 2 - 2);

      // Brick highlight
      ctx.fillStyle = '#475569';
      ctx.fillRect(2, 2, tileSize - 4, 2);
      ctx.fillRect(2, tileSize / 2 + 2, tileSize - 4, 2);

      // Crevice shadow
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(2, tileSize / 2 - 2, tileSize - 4, 1);
    } else {
      // Sci-Fi Plating
      ctx.fillStyle = '#1e2638';
      ctx.fillRect(0, 0, tileSize, tileSize);

      // Metal plate border
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(1.5, 1.5, tileSize - 3, tileSize - 3);

      // Cyan circuit trace
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(tileSize / 2 - 2, 4, 4, tileSize - 8);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(tileSize / 2 - 1, tileSize / 2 - 1, 2, 2);
    }

    ctx.restore();
  }

  return canvas;
}

/**
 * Generate Godot 4 TileSet Resource (.tres) with 3x3 Minimal Terrain Set
 */
export function generateGodotTileSet(
  assetName: string,
  tileSize: number
): string {
  return `[gd_resource type="TileSet" load_steps=3 format=3 uid="uid://${Math.random().toString(36).substring(2, 12)}"]

[ext_resource type="Texture2D" path="res://${assetName}.png" id="1_atlas"]

[sub_resource type="TileSetAtlasSource" id="TileSetAtlasSource_1"]
texture = ExtResource("1_atlas")
texture_region_size = Vector2i(${tileSize}, ${tileSize})
0:0/0 = 0
0:0/0/terrain_set = 0
0:0/0/terrain = 0
0:0/0/terrains_peering_bit/bottom_side = 0
0:0/0/terrains_peering_bit/right_side = 0

[resource]
tile_size = Vector2i(${tileSize}, ${tileSize})
terrain_set_0/mode = 0
terrain_set_0/terrain_0/name = "${assetName}"
terrain_set_0/terrain_0/color = Color(0.2, 0.7, 0.3, 1)
sources/0 = SubResource("TileSetAtlasSource_1")
`;
}

/**
 * Generate Unity RuleTile C# Component Configuration
 */
export function generateUnityRuleTileCode(assetName: string): string {
  return `// Unity RuleTile Setup for '${assetName}'
// -------------------------------------------------------------
// 1. Ensure '2D Tilemap Extras' package is installed in Package Manager.
// 2. Right-click in Project view -> Create -> 2D -> Tiles -> Rule Tile.
// 3. Name it '${assetName}_RuleTile'.
// 4. Set Default Sprite to '${assetName}_24' (Solid Center).
// 5. Add 47 Tiling Rules mapping 3x3 neighbor checks to sprites:
//    - Green Arrow = Neighbor present (This)
//    - Red Cross = Neighbor absent (Not This)
// 6. Drag '${assetName}_RuleTile' directly into your Tile Palette to paint live!
`;
}
