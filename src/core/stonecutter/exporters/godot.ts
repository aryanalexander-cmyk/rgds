import { SpriteItem, PackerConfig } from '../../../types/stonecutter';

export function generateGodot4Tres(
  sprites: SpriteItem[],
  sheetName: string = 'spritesheet'
): string {
  let output = `[gd_resource type="AtlasTexture" load_steps=2 format=3]\n\n`;
  output += `[ext_resource type="Texture2D" path="res://${sheetName}.png" id="1_atlas"]\n\n`;

  sprites.forEach((sp, idx) => {
    if (!sp.packed) return;
    const cleanName = sp.name.replace(/\.[^/.]+$/, '');
    output += `# Frame: ${cleanName} (Index ${idx})\n`;
    output += `[sub_resource type="AtlasTexture" id="Atlas_${cleanName}"]\n`;
    output += `atlas = ExtResource("1_atlas")\n`;
    output += `region = Rect2(${sp.packed.x}, ${sp.packed.y}, ${sp.packed.w}, ${sp.packed.h})\n`;
    if (sp.trimBounds && sp.trimBounds.trimmed) {
      output += `margin = Rect2(${sp.trimBounds.x}, ${sp.trimBounds.y}, ${sp.width - sp.trimBounds.w}, ${sp.height - sp.trimBounds.h})\n`;
    }
    output += `\n`;
  });

  return output;
}

export function generateGodotSpriteFramesJson(
  sprites: SpriteItem[],
  sheetName: string = 'spritesheet'
): string {
  const frames = sprites.map(sp => ({
    name: sp.name.replace(/\.[^/.]+$/, ''),
    region: {
      x: sp.packed?.x || 0,
      y: sp.packed?.y || 0,
      w: sp.packed?.w || sp.width,
      h: sp.packed?.h || sp.height
    },
    originalSize: { w: sp.width, h: sp.height },
    trimmed: sp.trimBounds?.trimmed || false,
    trimOffset: sp.trimBounds ? { x: sp.trimBounds.x, y: sp.trimBounds.y } : { x: 0, y: 0 }
  }));

  return JSON.stringify({
    generator: "Ristek Game Development Suite — Stonecutter",
    engine: "Godot 4",
    image: `${sheetName}.png`,
    frames
  }, null, 2);
}
