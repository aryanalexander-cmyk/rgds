export type TargetEngine = 'godot' | 'unity' | 'generic';

export interface EngineProfile {
  id: TargetEngine;
  name: string;
  tagline: string;
  atlasFormat: string;
  audioFormat: string;
  tweenSyntax: string;
}

export const ENGINE_PROFILES: Record<TargetEngine, EngineProfile> = {
  godot: {
    id: 'godot',
    name: 'Godot 4',
    tagline: 'AtlasTexture (.tres) + GDScript create_tween()',
    atlasFormat: 'AtlasTexture (.tres)',
    audioFormat: 'AudioStreamPlayer (.ogg/.wav)',
    tweenSyntax: 'create_tween().set_trans().set_ease()'
  },
  unity: {
    id: 'unity',
    name: 'Unity Engine',
    tagline: 'SpriteAtlas JSON + C# DOTween',
    atlasFormat: 'SpriteAtlas (JSON + C# Importer)',
    audioFormat: 'AudioClip (.wav)',
    tweenSyntax: 'transform.DOMove().SetEase()'
  },
  generic: {
    id: 'generic',
    name: 'Generic / Web',
    tagline: 'Standard JSON + PNG + Web Audio',
    atlasFormat: 'JSON (Hash/Array) + PNG',
    audioFormat: 'Standard WAV (16-bit PCM)',
    tweenSyntax: 'Bézier CSS & Math formulas'
  }
};
