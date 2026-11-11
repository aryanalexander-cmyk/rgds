import React, { useState, useMemo } from 'react';
import { TargetEngine, ENGINE_PROFILES } from '../types/engine';
import { Button } from '../components/ui/Button';
import {
  Box,
  Volume2,
  Activity,
  Layers,
  Type,
  Flame,
  Music,
  Zap,
  Grid,
  MessageSquareQuote,
  Search,
  ArrowRight,
  Sparkles,
  Info,
  X,
  LucideIcon
} from 'lucide-react';

interface HubPageProps {
  onOpenStonecutter: () => void;
  onOpenHathoria: () => void;
  onOpenTinkerbox: () => void;
  onOpenLoom: () => void;
  onOpenLetterpress: () => void;
  onOpenCrucible: () => void;
  onOpenResonator: () => void;
  onOpenSparkbox: () => void;
  onOpenTapestry: () => void;
  onOpenLexicon: () => void;
  engine: TargetEngine;
  onToast: (msg: string) => void;
}

interface WorkstationItem {
  id: string;
  name: string;
  category: 'visual' | 'audio' | 'motion' | 'narrative';
  icon: LucideIcon;
  color: string;
  accentBorder: string;
  tagline: string;
  description: string;
  tags: string[];
  godotExport: string;
  unityExport: string;
  genericExport: string;
  onOpen: () => void;
  shortcut: string;
}

export const HubPage: React.FC<HubPageProps> = ({
  onOpenStonecutter,
  onOpenHathoria,
  onOpenTinkerbox,
  onOpenLoom,
  onOpenLetterpress,
  onOpenCrucible,
  onOpenResonator,
  onOpenSparkbox,
  onOpenTapestry,
  onOpenLexicon,
  engine
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'visual' | 'audio' | 'motion' | 'narrative'>('all');
  const [showWriteup, setShowWriteup] = useState(() => {
    try {
      return localStorage.getItem('rgds_hide_hub_writeup') !== 'true';
    } catch {
      return true;
    }
  });

  const handleDismissWriteup = () => {
    setShowWriteup(false);
    try {
      localStorage.setItem('rgds_hide_hub_writeup', 'true');
    } catch {}
  };

  const activeProfile = ENGINE_PROFILES[engine];

  const workstations: WorkstationItem[] = useMemo(() => [
    {
      id: 'stonecutter',
      name: 'Stonecutter',
      category: 'visual',
      icon: Box,
      color: '#6366f1',
      accentBorder: 'hover:border-indigo-500/50',
      tagline: '2D Sprite & Texture Atlas Lab',
      description: 'MaxRects packing, 1px border extrusion to eliminate subpixel seams, alpha island slicing, 9-slice previewer, and GIF recorder.',
      tags: ['MaxRects', 'Extrusion', 'Alpha Slicer', '9-Slice', 'GIF89a'],
      godotExport: 'AtlasTexture (.tres)',
      unityExport: 'TexturePacker (.json)',
      genericExport: 'Atlas (.png + .json)',
      onOpen: onOpenStonecutter,
      shortcut: '1'
    },
    {
      id: 'crucible',
      name: 'Crucible',
      category: 'visual',
      icon: Flame,
      color: '#f97316',
      accentBorder: 'hover:border-orange-500/50',
      tagline: '2D Normal Map & Dynamic Light Lab',
      description: 'Sobel relief bump normal maps with interactive PointLight2D cursor testing, Blinn-Phong highlights, and OpenGL/DirectX toggles.',
      tags: ['Sobel Filter', 'PointLight2D', 'Blinn-Phong', 'Normals'],
      godotExport: 'CanvasTexture (.tres)',
      unityExport: 'Sprite-Lit Material',
      genericExport: '_normal.png',
      onOpen: onOpenCrucible,
      shortcut: '2'
    },
    {
      id: 'tapestry',
      name: 'Tapestry',
      category: 'visual',
      icon: Grid,
      color: '#14b8a6',
      accentBorder: 'hover:border-teal-500/50',
      tagline: 'Tilemap Autotiler & Wang-Tile Lab',
      description: 'Canonical 47-tile 3x3 minimal bitmask autotiler with live level painting & carving, peering radar inspector, and terrain generators.',
      tags: ['47-Tile Bitmask', 'Wang Rules', 'Live Painting', 'Peering Radar'],
      godotExport: 'TileSet (.tres)',
      unityExport: 'RuleTile (.cs)',
      genericExport: 'Tileset Atlas (.png)',
      onOpen: onOpenTapestry,
      shortcut: '3'
    },
    {
      id: 'hathoria',
      name: 'Hathoria',
      category: 'audio',
      icon: Volume2,
      color: '#f59e0b',
      accentBorder: 'hover:border-amber-500/50',
      tagline: 'Procedural Audio SFX & Sound Synth',
      description: 'Web Audio sound synthesizer with dual-voice sub-oscillator layering, 8 sound presets, chromatic audition strip, and mutate controls.',
      tags: ['Sub-Oscillator', '8 Presets', 'Mutate/Randomize', '16-bit PCM'],
      godotExport: 'AudioStreamPlayer (.wav)',
      unityExport: 'AudioClip (.wav)',
      genericExport: 'WAV Loop',
      onOpen: onOpenHathoria,
      shortcut: '4'
    },
    {
      id: 'resonator',
      name: 'Resonator',
      category: 'audio',
      icon: Music,
      color: '#a855f7',
      accentBorder: 'hover:border-purple-500/50',
      tagline: 'Chiptune Tracker & 4-Track Sequencer',
      description: 'NES RP2A03 4-voice tracker (Pulse 1, Pulse 2, Triangle, Noise drums) with 16-step matrix, mixer controls, and binary Standard MIDI writer.',
      tags: ['4-Voice NES 2A03', '16-Step Matrix', 'Binary MIDI .mid', 'Offline WAV'],
      godotExport: 'MusicPlayer (.gd)',
      unityExport: 'AudioLooper (.cs)',
      genericExport: '.wav + .mid Type 1',
      onOpen: onOpenResonator,
      shortcut: '5'
    },
    {
      id: 'tinkerbox',
      name: 'Tinkerbox',
      category: 'motion',
      icon: Activity,
      color: '#10b981',
      accentBorder: 'hover:border-emerald-500/50',
      tagline: 'Motion, Easing & Tween Playground',
      description: 'Interactive cubic Bézier curves, 11 easing families, chained sequence director with live timeline scrubber, and Godot/Unity code gen.',
      tags: ['Bézier Curves', 'Sequencer Director', 'Ghosting', 'DOTween'],
      godotExport: 'create_tween() (GDScript)',
      unityExport: 'DOTween.Sequence()',
      genericExport: 'CSS cubic-bezier',
      onOpen: onOpenTinkerbox,
      shortcut: '6'
    },
    {
      id: 'sparkbox',
      name: 'Sparkbox',
      category: 'motion',
      icon: Zap,
      color: '#eab308',
      accentBorder: 'hover:border-amber-500/50',
      tagline: '2D Particle System & VFX Forge',
      description: 'Physics particle simulator with gravity, air drag, and angular velocity. Additive glow shading, mouse emitter, and burst triggers.',
      tags: ['Additive Glow', 'Physics Sim', 'Mouse Emitter', 'Burst Trigger'],
      godotExport: 'CPUParticles2D (.gd)',
      unityExport: 'ParticleSystem (.cs)',
      genericExport: 'VFX Config (.json)',
      onOpen: onOpenSparkbox,
      shortcut: '7'
    },
    {
      id: 'lexicon',
      name: 'Lexicon',
      category: 'narrative',
      icon: MessageSquareQuote,
      color: '#8b5cf6',
      accentBorder: 'hover:border-violet-500/50',
      tagline: 'Dialogue & Branching Narrative Studio',
      description: 'Visual node graph narrative editor with speaker tags, live visual novel previewer, and drop-in exports for Godot Dialogue Manager, Yarn, and Ink.',
      tags: ['Node Graph', 'Live VN Preview', 'Dialogue Manager', 'Yarn & Ink'],
      godotExport: 'Dialogue Manager (.dialogue)',
      unityExport: 'Yarn Spinner (.yarn)',
      genericExport: 'Ink (.ink) & AST JSON',
      onOpen: onOpenLexicon,
      shortcut: '8'
    },
    {
      id: 'letterpress',
      name: 'Letterpress',
      category: 'narrative',
      icon: Type,
      color: '#06b6d4',
      accentBorder: 'hover:border-cyan-500/50',
      tagline: 'Modern Bitmap Font Studio',
      description: 'TTF/OTF font rasterizer with 2-tone gradient fills (6 arcade presets), outline strokes, drop shadows, packed glyph atlas, and typewriter test bar.',
      tags: ['2-Tone Gradients', 'Glyph Atlas', 'BMFont .fnt', 'Godot FontFile'],
      godotExport: 'FontFile (.tres)',
      unityExport: 'TextMeshPro / .fnt',
      genericExport: 'Atlas (.png + .fnt)',
      onOpen: onOpenLetterpress,
      shortcut: '9'
    },
    {
      id: 'loom',
      name: 'Loom',
      category: 'narrative',
      icon: Layers,
      color: '#f43f5e',
      accentBorder: 'hover:border-rose-500/50',
      tagline: 'Storefront Resizer & Capsule Crafter',
      description: 'Multi-aspect ratio crop generator for Steam (Header, Small, Main, Library, Hero), Itch.io (Cover, Banner), and Social cards with floating logo layer.',
      tags: ['Steam Capsules', 'Itch.io Covers', 'Floating Logo', 'Safe Zones'],
      godotExport: 'Store Bundle (.zip)',
      unityExport: 'Store Bundle (.zip)',
      genericExport: '9 Store Sizes (.zip)',
      onOpen: onOpenLoom,
      shortcut: '0'
    }
  ], [
    onOpenStonecutter,
    onOpenCrucible,
    onOpenTapestry,
    onOpenHathoria,
    onOpenResonator,
    onOpenTinkerbox,
    onOpenSparkbox,
    onOpenLexicon,
    onOpenLetterpress,
    onOpenLoom
  ]);

  const filteredWorkstations = useMemo(() => {
    return workstations.filter(item => {
      const matchCategory = activeCategory === 'all' || item.category === activeCategory;
      if (!matchCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.tagline.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some(t => t.toLowerCase().includes(q))
      );
    });
  }, [workstations, activeCategory, searchQuery]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#080a10] text-slate-100 p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      
      {/* Clean Top Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1b2234]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              Workstations
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#161d2d] text-slate-400 border border-[#222b40]">
              10 Tools
            </span>
            {!showWriteup && (
              <button
                onClick={() => {
                  setShowWriteup(true);
                  try { localStorage.removeItem('rgds_hide_hub_writeup'); } catch {}
                }}
                className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 ml-2 transition"
                title="Show project overview"
              >
                <Info size={12} className="text-indigo-400" />
                <span>About RGDS</span>
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Client-side game development tools with direct <span className="text-indigo-400 font-medium">{activeProfile.name}</span> exports.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter workstations..."
            className="w-full bg-[#0d111b] border border-[#1e273c] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Project Overview Writeup (Small, Clean & Unobtrusive) */}
      {showWriteup && (
        <div className="rounded-xl bg-[#0c101a] border border-[#1a2233] p-4 text-xs text-slate-400 leading-relaxed flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-150">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200 text-xs tracking-tight flex items-center gap-1.5">
                <Sparkles size={13} className="text-indigo-400" />
                About the RISTEK Game Development Suite
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                RGDS
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Built for <strong className="text-slate-300 font-medium">RISTEK's Game Development SIG</strong>, RGDS is a lightweight, browser-native suite engineered for indie game production. It consolidates 10 specialized workstation applications - spanning 2D spritework, autotiling, normal mapping, audio synthesis, particle physics, easing and tweening beziers, dialogue tree creation, and storefront asset creation - all running 100% client-side with tailored exports for <span className="text-slate-200 font-medium">Godot 4</span> and <span className="text-slate-200 font-medium">Unity</span>, along with generic exports.
            </p>
          </div>

          <button
            onClick={handleDismissWriteup}
            className="w-7 h-7 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300 flex items-center justify-center transition shrink-0 self-start"
            title="Dismiss overview"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            activeCategory === 'all'
              ? 'bg-[#1e2538] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          All (10)
        </button>

        <button
          onClick={() => setActiveCategory('visual')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            activeCategory === 'visual'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          2D Art &amp; Sprites (3)
        </button>

        <button
          onClick={() => setActiveCategory('audio')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            activeCategory === 'audio'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Audio &amp; Music (2)
        </button>

        <button
          onClick={() => setActiveCategory('motion')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            activeCategory === 'motion'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Motion &amp; VFX (2)
        </button>

        <button
          onClick={() => setActiveCategory('narrative')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            activeCategory === 'narrative'
              ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Narrative &amp; UI (3)
        </button>
      </div>

      {/* Clean Workstations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWorkstations.map(tool => {
          const IconComponent = tool.icon;
          const exportText = engine === 'godot' ? tool.godotExport : engine === 'unity' ? tool.unityExport : tool.genericExport;

          return (
            <div
              key={tool.id}
              className={`rounded-xl bg-[#0c0f17] border border-[#1b2234] ${tool.accentBorder} p-4 flex flex-col justify-between transition-all duration-150 shadow-sm hover:shadow-md`}
            >
              <div className="space-y-3">
                {/* Header: Icon, Name, Shortcut */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${tool.color}18`, color: tool.color, border: `1px solid ${tool.color}35` }}
                    >
                      <IconComponent size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        {tool.name}
                      </h3>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {tool.tagline}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#131826] text-slate-400 border border-[#1f273c]">
                    {tool.shortcut}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-400 leading-relaxed">
                  {tool.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {tool.tags.map(tag => (
                    <span
                      key={tag}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#101420] text-slate-400 border border-[#1a2133]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom: Export Format & Open Button */}
              <div className="pt-3 mt-4 border-t border-[#171e2e] flex items-center justify-between">
                <div className="text-[10px] font-mono text-slate-400 truncate max-w-[170px]">
                  Export: <span className="text-slate-300 font-medium">{exportText}</span>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  icon={<ArrowRight size={12} />}
                  onClick={tool.onOpen}
                  className="font-semibold !py-1 !px-2.5 text-xs"
                >
                  Open
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredWorkstations.length === 0 && (
        <div className="p-8 text-center text-slate-400 text-xs bg-[#0b0e16] rounded-xl border border-dashed border-[#1e273c]">
          No workstations match "{searchQuery}".
        </div>
      )}

      {/* Minimal Footer */}
      <div className="pt-4 border-t border-[#151c2b] flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <span>RISTEK Game Development Suite v1.0.0</span>
        <div className="flex items-center gap-4">
          <span>Shortcuts: <strong className="text-slate-300">0 - 9</strong></span>
          <span>Command Menu: <strong className="text-slate-300">⌘K</strong></span>
        </div>
      </div>

    </div>
  );
};
