import React, { useState, useEffect, useRef } from 'react';
import { TargetEngine } from '../../types/engine';
import {
  Shapes,
  Home,
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
  ChevronDown,
  Search,
  Dices,
  Sparkles,
  Command,
  Check,
  X,
  LucideIcon
} from 'lucide-react';

export type ActiveToolView =
  | 'hub'
  | 'stonecutter'
  | 'hathoria'
  | 'tinkerbox'
  | 'loom'
  | 'letterpress'
  | 'crucible'
  | 'resonator'
  | 'sparkbox'
  | 'tapestry'
  | 'lexicon';

export interface ToolDefinition {
  id: ActiveToolView;
  name: string;
  category: 'visual' | 'audio' | 'motion' | 'narrative' | 'core';
  categoryLabel: string;
  tagline: string;
  icon: LucideIcon;
  color: string;
  badge: string;
  exportTag: string;
  shortcut: string;
}

const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    id: 'hub',
    name: 'Hub Overview',
    category: 'core',
    categoryLabel: 'Core Navigation',
    tagline: 'Suite dashboard & Game Jam prompt generator',
    icon: Home,
    color: '#6366f1',
    badge: 'v1.0',
    exportTag: 'Dashboard',
    shortcut: 'H'
  },
  {
    id: 'stonecutter',
    name: 'Stonecutter',
    category: 'visual',
    categoryLabel: 'Visual & 2D Sprites',
    tagline: '2D Sprite & Texture Atlas Lab (MaxRects & Slicing)',
    icon: Box,
    color: '#6366f1',
    badge: 'v1.0',
    exportTag: '.tres / .json',
    shortcut: '1'
  },
  {
    id: 'crucible',
    name: 'Crucible',
    category: 'visual',
    categoryLabel: 'Visual & 2D Sprites',
    tagline: '2D Normal Map & Dynamic Light Lab',
    icon: Flame,
    color: '#f97316',
    badge: 'v1.0',
    exportTag: 'CanvasTexture',
    shortcut: '2'
  },
  {
    id: 'tapestry',
    name: 'Tapestry',
    category: 'visual',
    categoryLabel: 'Visual & 2D Sprites',
    tagline: 'Level Tilemap Autotiler & Wang-Tile Lab',
    icon: Grid,
    color: '#14b8a6',
    badge: 'v1.0',
    exportTag: 'TileSet .tres',
    shortcut: '3'
  },
  {
    id: 'hathoria',
    name: 'Hathoria',
    category: 'audio',
    categoryLabel: 'Audio & Music',
    tagline: 'Procedural Audio SFX & Sub-Oscillator Synth',
    icon: Volume2,
    color: '#f59e0b',
    badge: 'v1.0',
    exportTag: '16-bit .wav',
    shortcut: '4'
  },
  {
    id: 'resonator',
    name: 'Resonator',
    category: 'audio',
    categoryLabel: 'Audio & Music',
    tagline: 'Chiptune Tracker & 4-Track Music Sequencer',
    icon: Music,
    color: '#a855f7',
    badge: 'v1.0',
    exportTag: 'WAV & MIDI .mid',
    shortcut: '5'
  },
  {
    id: 'tinkerbox',
    name: 'Tinkerbox',
    category: 'motion',
    categoryLabel: 'Motion & VFX',
    tagline: 'Motion, Easing & Tween Playground',
    icon: Activity,
    color: '#10b981',
    badge: 'v1.0',
    exportTag: 'create_tween()',
    shortcut: '6'
  },
  {
    id: 'sparkbox',
    name: 'Sparkbox',
    category: 'motion',
    categoryLabel: 'Motion & VFX',
    tagline: '2D Particle System & VFX Forge',
    icon: Zap,
    color: '#eab308',
    badge: 'v1.0',
    exportTag: 'CPUParticles2D',
    shortcut: '7'
  },
  {
    id: 'lexicon',
    name: 'Lexicon',
    category: 'narrative',
    categoryLabel: 'Narrative & UI',
    tagline: 'Dialogue & Branching Narrative Graph Studio',
    icon: MessageSquareQuote,
    color: '#8b5cf6',
    badge: 'v1.0',
    exportTag: '.dialogue / .yarn',
    shortcut: '8'
  },
  {
    id: 'letterpress',
    name: 'Letterpress',
    category: 'narrative',
    categoryLabel: 'Narrative & UI',
    tagline: 'Modern Bitmap Font Studio & Gradient Fills',
    icon: Type,
    color: '#06b6d4',
    badge: 'v1.0',
    exportTag: 'BMFont & .fnt',
    shortcut: '9'
  },
  {
    id: 'loom',
    name: 'Loom',
    category: 'narrative',
    categoryLabel: 'Narrative & UI',
    tagline: 'Storefront Resizer & Capsule Crafter',
    icon: Layers,
    color: '#f43f5e',
    badge: 'v1.0',
    exportTag: 'Steam & Itch',
    shortcut: '0'
  }
];

const JAM_PROMPTS = [
  { theme: 'Cyberpunk Cyber-Underground', mechanic: 'Grappling Hook Only', rest: '1-Bit Black & White' },
  { theme: 'Abyssal Deep Ocean', mechanic: 'Sonar Echolocation', rest: 'Zero UI / Diegetic Audio Only' },
  { theme: 'Temporal Fractures', mechanic: 'Rewind 10 Seconds', rest: 'Single Screen Room' },
  { theme: 'Medieval Alchemy Guild', mechanic: 'Potion Chemistry Reaction', rest: 'Mouse / One-Click Only' },
  { theme: 'Cosmic Dread Citadel', mechanic: 'Sanity Inverts Gravity', rest: '60-Second Speedruns' },
  { theme: 'Solarpunk Overgrowth', mechanic: 'Sunlight Powers Shield', rest: 'No Attack Weapons' },
  { theme: 'Steampunk Train Heist', mechanic: 'Track Switching Puzzles', rest: 'No Jump Key Allowed' }
];

interface HeaderProps {
  activeView: ActiveToolView;
  setActiveView: (view: ActiveToolView) => void;
  engine: TargetEngine;
  setEngine: (engine: TargetEngine) => void;
  onToast: (msg: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  engine,
  setEngine,
  onToast
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentTool = TOOL_DEFINITIONS.find(t => t.id === activeView) || TOOL_DEFINITIONS[0];
  const CurrentIcon = currentTool.icon;

  // Toggle tool dropdown menu
  const toggleMenu = () => {
    setIsMenuOpen(prev => {
      const next = !prev;
      if (next) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else {
        setSearchQuery('');
      }
      return next;
    });
  };

  // Close menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
        setSearchQuery('');
        return;
      }

      // Cmd+K or Ctrl+K opens tool switcher
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleMenu();
        return;
      }

      // Quick number switching when outside inputs
      if (!isInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const found = TOOL_DEFINITIONS.find(t => t.shortcut === e.key || (e.key.toLowerCase() === 'h' && t.id === 'hub'));
        if (found) {
          e.preventDefault();
          setActiveView(found.id);
          setIsMenuOpen(false);
          onToast(`Switched to ${found.name}`);
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen, setActiveView, onToast]);

  // Roll game jam inspiration prompt
  const rollJamPrompt = () => {
    const pick = JAM_PROMPTS[Math.floor(Math.random() * JAM_PROMPTS.length)];
    onToast(`🎲 Jam Idea: ${pick.theme} • ${pick.mechanic} • [${pick.rest}]`);
  };

  // Filter tools based on search query
  const filteredTools = TOOL_DEFINITIONS.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.tagline.toLowerCase().includes(q) ||
      t.exportTag.toLowerCase().includes(q) ||
      t.categoryLabel.toLowerCase().includes(q)
    );
  });

  // Group filtered tools by category
  const categories: { label: string; tools: ToolDefinition[] }[] = [
    { label: 'Core', tools: filteredTools.filter(t => t.category === 'core') },
    { label: 'Visual & 2D Art', tools: filteredTools.filter(t => t.category === 'visual') },
    { label: 'Audio & Music', tools: filteredTools.filter(t => t.category === 'audio') },
    { label: 'Motion & VFX', tools: filteredTools.filter(t => t.category === 'motion') },
    { label: 'Narrative & UI', tools: filteredTools.filter(t => t.category === 'narrative') }
  ].filter(c => c.tools.length > 0);

  return (
    <header className="h-14 ristek-navbar px-3 md:px-5 shrink-0 select-none flex items-center justify-between relative z-50">
      
      {/* ==================================================================== */}
      {/* LEFT: Brand Identity & Active Workstation Switcher                  */}
      {/* ==================================================================== */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Brand Logo / Hub Jump */}
        <div
          onClick={() => {
            setActiveView('hub');
            setIsMenuOpen(false);
          }}
          className="cursor-pointer flex items-center group p-1 -ml-1 rounded-lg hover:bg-white/5 transition-colors"
          title="Return to Hub Dashboard (Press H)"
        >
          <div className="w-8 h-8 rounded-lg bg-[#0e1320] border border-indigo-500/30 flex items-center justify-center p-0.5 shadow-md shadow-indigo-500/20 group-hover:scale-105 group-hover:border-indigo-400/50 transition-all shrink-0 overflow-hidden">
            <img src="/rgds-logo.png" alt="RGDS Logo" className="w-full h-full object-contain drop-shadow" />
          </div>
        </div>

        <div className="h-5 w-[1px] bg-[#1e2638] mx-0.5 hidden sm:block" />

        {/* Active Workstation Dropdown Trigger Button */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={toggleMenu}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all border ${
              isMenuOpen
                ? 'bg-[#182033] border-indigo-500/50 text-white shadow-lg shadow-indigo-500/10'
                : 'bg-[#0f1422] border-[#222b40] text-slate-200 hover:text-white hover:border-[#2f3b58]'
            }`}
            title="Switch Workstation (⌘K)"
          >
            <div
              className="w-5 h-5 rounded flex items-center justify-center"
              style={{ backgroundColor: `${currentTool.color}25`, color: currentTool.color }}
            >
              <CurrentIcon size={13} />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-tight text-white">
                {currentTool.name}
              </span>
              {currentTool.id !== 'hub' && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono hidden md:inline-block">
                  {currentTool.badge}
                </span>
              )}
            </div>

            <ChevronDown
              size={13}
              className={`text-slate-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180 text-indigo-400' : ''}`}
            />
          </button>

          {/* ==================================================================== */}
          {/* FLOATING WORKSTATION COMMAND DRAWER / POPOVER                        */}
          {/* ==================================================================== */}
          {isMenuOpen && (
            <div className="absolute top-full left-0 mt-2 w-80 md:w-96 rounded-2xl bg-[#0b0e17] border border-[#232d44] shadow-2xl p-2.5 text-xs z-50 backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-150">
              
              {/* Search Bar Input */}
              <div className="relative mb-2">
                <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Find workstation (e.g. sprites, sfx, normal, tween)..."
                  className="w-full bg-[#121725] border border-[#1e273c] rounded-xl pl-8 pr-7 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Categorized Tools List */}
              <div className="max-h-[65vh] overflow-y-auto space-y-3 pr-1">
                {categories.map(cat => (
                  <div key={cat.label} className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5">
                      {cat.label}
                    </div>

                    <div className="space-y-0.5">
                      {cat.tools.map(tool => {
                        const IconComponent = tool.icon;
                        const isSelected = activeView === tool.id;

                        return (
                          <div
                            key={tool.id}
                            onClick={() => {
                              setActiveView(tool.id);
                              setIsMenuOpen(false);
                              setSearchQuery('');
                              onToast(`Switched to ${tool.name}`);
                            }}
                            className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-indigo-500/15 border border-indigo-500/40 text-white'
                                : 'hover:bg-[#141b2b] text-slate-300 hover:text-white border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                                style={{ backgroundColor: `${tool.color}20`, color: tool.color, border: `1px solid ${tool.color}40` }}
                              >
                                <IconComponent size={14} />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs truncate">
                                    {tool.name}
                                  </span>
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#182030] text-slate-400 border border-[#222b40]">
                                    {tool.exportTag}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {tool.tagline}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              {isSelected ? (
                                <Check size={14} className="text-indigo-400" />
                              ) : (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#151c2c] text-slate-400 border border-[#212b40]">
                                  {tool.shortcut}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {filteredTools.length === 0 && (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No workstations match "{searchQuery}"
                  </div>
                )}
              </div>

              {/* Drawer Footer Cheat Sheet */}
              <div className="mt-2 pt-2 border-t border-[#1a2336] flex items-center justify-between text-[10px] text-slate-400 px-2 font-mono">
                <span>Navigate: <strong className="text-slate-300">0 - 9, H</strong></span>
                <span>Search: <strong className="text-slate-300">⌘K</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Compact Quick-Switch Icon Ribbon (Visible on wider screens) */}
        <nav className="hidden xl:flex items-center gap-1 ml-1 pl-2 border-l border-[#1e2638]">
          {TOOL_DEFINITIONS.map(tool => {
            const IconComp = tool.icon;
            const isActive = activeView === tool.id;

            return (
              <button
                key={tool.id}
                onClick={() => {
                  setActiveView(tool.id);
                  onToast(`Switched to ${tool.name}`);
                }}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-indigo-500/20 text-white ring-1 ring-indigo-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title={`${tool.name} (${tool.shortcut}): ${tool.tagline}`}
              >
                <IconComp size={13} color={isActive ? tool.color : undefined} />
              </button>
            );
          })}
        </nav>
      </div>

      {/* ==================================================================== */}
      {/* CENTER: Prominent Global Target Engine Segmented Control            */}
      {/* ==================================================================== */}
      <div className="flex items-center justify-center shrink-0 mx-2">
        <div className="flex items-center gap-1 bg-[#0b0e16] border border-[#1e273c] p-1 rounded-xl shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 hidden sm:inline-flex items-center gap-1">
            <Sparkles size={11} className="text-indigo-400" /> Engine:
          </span>

          {/* Godot 4 Profile */}
          <button
            onClick={() => {
              setEngine('godot');
              onToast('Engine profile switched to Godot 4 (.tres / GDScript)');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              engine === 'godot'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
            title="Godot 4.x (.tres, GDScript, CanvasTexture, AudioStream)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <span>Godot 4</span>
          </button>

          {/* Unity Profile */}
          <button
            onClick={() => {
              setEngine('unity');
              onToast('Engine profile switched to Unity (C# / DOTween)');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              engine === 'unity'
                ? 'bg-white/15 text-white border border-white/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
            title="Unity 2022+ (C#, DOTween, SpriteAtlas, RuleTile)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span>Unity</span>
          </button>

          {/* Generic Profile */}
          <button
            onClick={() => {
              setEngine('generic');
              onToast('Engine profile switched to Generic (Raw JSON / PNG)');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              engine === 'generic'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
            title="Generic (Standard PNG, Array JSON, WAV)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Generic</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* RIGHT: Game Jam Inspiration Dice, ⌘K Search, & Offline Status       */}
      {/* ==================================================================== */}
      <div className="flex items-center gap-2 shrink-0">
        
        {/* Quick Jam Prompt Generator */}
        <button
          onClick={rollJamPrompt}
          className="p-1.5 rounded-lg bg-[#0f1422] hover:bg-[#161e33] border border-[#20293d] hover:border-amber-500/40 text-amber-400 transition-colors shadow-sm"
          title="Roll random Game Jam theme & restriction"
        >
          <Dices size={15} />
        </button>

        {/* Command Menu Button */}
        <button
          onClick={toggleMenu}
          className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg bg-[#0f1422] hover:bg-[#161e33] border border-[#20293d] text-slate-400 hover:text-slate-200 text-xs font-mono transition-colors"
          title="Open Workstation Menu (⌘K)"
        >
          <Command size={11} />
          <span>K</span>
        </button>

        {/* 100% Offline / Local Execution Status */}
        <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden lg:inline">100% Local / Offline</span>
        </div>
      </div>

    </header>
  );
};
