import { SpriteItem } from '../../../types/stonecutter';

export function generateUnityMetadata(
  sprites: SpriteItem[],
  sheetName: string = 'spritesheet',
  sheetWidth: number = 512,
  sheetHeight: number = 512
): string {
  const slices = sprites.map((sp, idx) => {
    const cleanName = sp.name.replace(/\.[^/.]+$/, '');
    const px = sp.packed?.x || 0;
    // Unity's texture coordinates have Y=0 at the bottom, so we invert Y for standard rects
    const py = sheetHeight - (sp.packed?.y || 0) - (sp.packed?.h || sp.height);
    const pw = sp.packed?.w || sp.width;
    const ph = sp.packed?.h || sp.height;

    return {
      name: cleanName,
      rect: { x: px, y: py, width: pw, height: ph },
      alignment: 0, // Center
      pivot: { x: 0.5, y: 0.5 },
      border: { x: 0, y: 0, z: 0, w: 0 },
      originalSize: { width: sp.width, height: sp.height }
    };
  });

  return JSON.stringify({
    generator: "Ristek Game Development Suite — Stonecutter",
    target: "Unity SpriteAtlas / Sprite Editor",
    textureName: `${sheetName}.png`,
    width: sheetWidth,
    height: sheetHeight,
    sprites: slices
  }, null, 2);
}

export function generateUnityEditorScript(sheetName: string = 'spritesheet'): string {
  return `// Drop this script inside an "Editor" folder in your Unity project Assets.
// It will automatically slice "${sheetName}.png" using the generated "${sheetName}.json".
#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;
using System.IO;

public class StonecutterImporter : AssetPostprocessor
{
    void OnPreprocessTexture()
    {
        if (assetPath.Contains("${sheetName}.png"))
        {
            TextureImporter importer = (TextureImporter)assetImporter;
            importer.textureType = TextureImporterType.Sprite;
            importer.spriteImportMode = SpriteImportMode.Multiple;
            importer.filterMode = FilterMode.Point; // Crisp pixel art
            importer.textureCompression = TextureImporterCompression.Uncompressed;
        }
    }
}
#endif
`;
}
