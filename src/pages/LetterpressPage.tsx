import React, { useState, useEffect, useRef } from 'react';
import { TargetEngine, ENGINE_PROFILES } from '../types/engine';
import {
  FontGeneratorConfig,
  FontFillMode,
  DEFAULT_FONT_CONFIG,
  CHAR_PRESETS,
  BUILTIN_FONTS,
  ARCADE_PALETTES,
  PackedAtlasResult,
  generateBitmapFontAtlas,
  generateBMFontDescriptor,
  generateGodotFontResource
} from '../core/letterpress/font';
import { createZipArchive, ZipFileEntry } from '../core/stonecutter/zip';
import { Button } from '../components/ui/Button';
import { NumberInput } from '../components/ui/NumberInput';
import { Accordion } from '../components/ui/Accordion';
import { WorkstationTutorialModal } from '../components/ui/WorkstationTutorialModal';
import { WORKSTATION_TUTORIALS } from '../core/tutorial/tutorialData';
import {
  Type,
  Upload,
  Download,
  Copy,
  Check,
  Code2,
  Sliders,
  Eye,
  FileArchive,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Layers,
  Palette,
  RotateCcw,
  HelpCircle
} from 'lucide-react';

interface LetterpressPageProps {
  engine: TargetEngine;
  onToast: (msg: string) => void;
}

export const LetterpressPage: React.FC<LetterpressPageProps> = ({
  engine,
  onToast
}) => {
  const [config, setConfig] = useState<FontGeneratorConfig>(DEFAULT_FONT_CONFIG);
  const [fontName, setFontName] = useState<string>('pixel_font');
  const [testText, setTestText] = useState<string>('GAME OVER! HIGH SCORE: 99,420 PTS');
  const [activeTab, setActiveTab] = useState<'bmfont' | 'godot' | 'json'>(
    engine === 'godot' ? 'godot' : 'bmfont'
  );
  const [copied, setCopied] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showBounds, setShowBounds] = useState<boolean>(true);
  const [atlasResult, setAtlasResult] = useState<PackedAtlasResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync tab with global engine profile when engine prop changes
  useEffect(() => {
    if (engine === 'godot') setActiveTab('godot');
    else setActiveTab('bmfont');
  }, [engine]);

  // Regenerate atlas when config changes
  useEffect(() => {
    const res = generateBitmapFontAtlas(config);
    setAtlasResult(res);
  }, [config]);

  // Draw atlas to visible viewport canvas
  useEffect(() => {
    if (!atlasResult || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = atlasResult.width;
    canvas.height = atlasResult.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(atlasResult.canvas, 0, 0);

    // Draw cell bounds overlay if enabled
    if (showBounds) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)'; // Sky blue
      ctx.lineWidth = 1;
      for (const m of atlasResult.metrics) {
        ctx.strokeRect(m.x + 0.5, m.y + 0.5, m.width, m.height);
      }
    }
  }, [atlasResult, showBounds]);

  // First-visit tutorial state
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('rgds_tutorial_letterpress_dismissed');
      if (!dismissed) {
        setIsTutorialOpen(true);
        setIsFirstVisit(true);
      }
    } catch {}
  }, []);

  const handleBlankWorkspace = () => {
    setConfig(prev => ({
      ...prev,
      characters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      fontSize: 24,
      strokeWidth: 0,
      shadowBlur: 0
    }));
    setTestText('');
    onToast('Font studio reset to blank slate.');
  };

  // Custom TTF/OTF upload handler
  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const customFamily = `Custom_${file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '')}`;
    const reader = new FileReader();
    reader.onload = () => {
      const font = new FontFace(customFamily, reader.result as ArrayBuffer);
      font.load().then(loadedFont => {
        document.fonts.add(loadedFont);
        setConfig(prev => ({ ...prev, fontFamily: customFamily }));
        setFontName(file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_'));
        onToast(`Loaded custom font: ${file.name}`);
      });
    };
    reader.readAsArrayBuffer(file);
  };

  // Export single PNG
  const handleExportPng = () => {
    if (!atlasResult) return;
    const url = atlasResult.canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fontName}.png`;
    a.click();
    onToast(`Exported ${fontName}.png directly!`);
  };

  // Export full ZIP bundle
  const handleExportZip = async () => {
    if (!atlasResult) return;
    onToast('Packing font atlas & descriptors...');

    const imgFileName = `${fontName}.png`;
    const bmfontDesc = generateBMFontDescriptor(atlasResult, fontName, imgFileName, config.fontSize);
    const godotDesc = generateGodotFontResource(atlasResult, imgFileName);
    const jsonDesc = JSON.stringify(
      {
        font: fontName,
        size: config.fontSize,
        lineHeight: atlasResult.lineHeight,
        baseLine: atlasResult.baseLine,
        atlasWidth: atlasResult.width,
        atlasHeight: atlasResult.height,
        characters: atlasResult.metrics
      },
      null,
      2
    );

    // Convert canvas to PNG bytes
    const pngBlob = await new Promise<Blob | null>(res => atlasResult.canvas.toBlob(res, 'image/png'));
    if (!pngBlob) return;
    const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());

    const zipFiles: ZipFileEntry[] = [
      { name: imgFileName, data: pngBytes },
      { name: `${fontName}.fnt`, data: bmfontDesc },
      { name: `${fontName}.tres`, data: godotDesc },
      { name: `${fontName}.json`, data: jsonDesc }
    ];

    const zipBlob = createZipArchive(zipFiles);
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fontName}_font_bundle.zip`;
    a.click();
    URL.revokeObjectURL(url);
    onToast(`Exported ${fontName}_font_bundle.zip with BMFont & Godot 4 .tres!`);
  };

  // Copy code snippet
  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    onToast('Copied font descriptor to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Active descriptor text
  const descriptorText = (() => {
    if (!atlasResult) return '';
    const imgName = `${fontName}.png`;
    switch (activeTab) {
      case 'bmfont':
        return generateBMFontDescriptor(atlasResult, fontName, imgName, config.fontSize);
      case 'godot':
        return generateGodotFontResource(atlasResult, imgName);
      case 'json':
        return JSON.stringify(
          {
            font: fontName,
            size: config.fontSize,
            lineHeight: atlasResult.lineHeight,
            characters: atlasResult.metrics
          },
          null,
          2
        );
      default:
        return '';
    }
  })();

  const activeProfile = ENGINE_PROFILES[engine];

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#080a0f] select-none">
      
      {/* Hidden Font Upload Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ttf,.otf,.woff,.woff2"
        className="hidden"
        onChange={handleFontUpload}
      />

      {/* Letterpress Sub-Header */}
      <div className="h-11 bg-[#101420] border-b border-[#1e2638] px-4 flex items-center justify-between shrink-0 z-20">
        
        {/* Builtin Font Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 mr-1 flex items-center gap-1">
            <Sparkles size={11} /> Fonts:
          </span>
          {BUILTIN_FONTS.map(f => (
            <button
              key={f.id}
              onClick={() => {
                setConfig(prev => ({ ...prev, fontFamily: f.id }));
                setFontName(f.id);
                onToast(`Selected font family: ${f.name}`);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition ${
                config.fontFamily === f.id
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                  : 'bg-[#141824] border-[#1e2638] text-slate-300 hover:text-white'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Upload size={12} className="text-cyan-400" />}
            onClick={() => fileInputRef.current?.click()}
            title="Upload custom .TTF or .OTF font file"
          >
            Import .TTF / .OTF
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw size={11} />}
            onClick={handleBlankWorkspace}
            title="Reset font configuration to blank slate"
          >
            Blank
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<HelpCircle size={12} className="text-cyan-400" />}
            onClick={() => {
              setIsFirstVisit(false);
              setIsTutorialOpen(true);
            }}
            title="Open Letterpress Walkthrough"
          >
            Tutorial
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Download size={12} className="text-slate-300" />}
            onClick={handleExportPng}
            title="Export font atlas PNG directly"
          >
            Export .PNG
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<FileArchive size={12} />}
            onClick={handleExportZip}
            className="!bg-cyan-600 hover:!bg-cyan-500 !border-cyan-400/30 text-white font-bold"
          >
            Export Bundle (.zip)
          </Button>
        </div>
      </div>

      {/* Main 3-Panel Workstation Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* LEFT PANEL: FONT SCULPTOR & STYLING (300px) */}
        <aside className="w-[300px] bg-[#0c101a] border-r border-[#1e2638] flex flex-col shrink-0 min-h-0 overflow-y-auto">
          
          {/* Header */}
          <div className="p-3 bg-[#0e121d] border-b border-[#1e2638] flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sliders size={13} className="text-cyan-400" />
              <span>Glyph &amp; Outline Styling</span>
            </span>
            <span className="text-[10px] font-mono text-cyan-400 font-bold">
              {config.fontSize}px
            </span>
          </div>

          {/* Size & Padding */}
          <div className="p-3 border-b border-[#1e2638] space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <NumberInput
                label="Font Size"
                value={config.fontSize}
                onChange={v => setConfig(prev => ({ ...prev, fontSize: Math.max(8, v) }))}
                unit="px"
                step={2}
                min={8}
                max={96}
                highlight={true}
              />
              <NumberInput
                label="Padding"
                value={config.padding}
                onChange={v => setConfig(prev => ({ ...prev, padding: Math.max(0, v) }))}
                unit="px"
                step={1}
                min={0}
                max={16}
              />
            </div>
          </div>

          {/* Outline / Stroke & Fill */}
          <div className="p-3 border-b border-[#1e2638] space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Outline Stroke</span>
                <span className="font-mono text-cyan-400">{config.strokeWidth} px</span>
              </div>
              <input
                type="range"
                min={0}
                max={6}
                step={1}
                value={config.strokeWidth}
                onChange={e => setConfig(prev => ({ ...prev, strokeWidth: Number(e.target.value) }))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            {/* Fill Mode Toggle */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Glyph Fill Style
              </label>
              <div className="flex items-center bg-[#101420] p-0.5 rounded-lg border border-[#1e2638]">
                <button
                  onClick={() => setConfig(prev => ({ ...prev, fillMode: 'solid' }))}
                  className={`flex-1 py-1 rounded text-xs font-semibold transition ${
                    config.fillMode !== 'gradient'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Solid Color
                </button>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, fillMode: 'gradient' }))}
                  className={`flex-1 py-1 rounded text-xs font-semibold transition ${
                    config.fillMode === 'gradient'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  2-Tone Gradient
                </button>
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {config.fillMode === 'gradient' ? 'Top Fill' : 'Text Fill'}
                </label>
                <div className="flex items-center bg-[#121622] border border-[#1e2638] rounded-md px-2 h-7 gap-2">
                  <input
                    type="color"
                    value={config.fillColor}
                    onChange={e => setConfig(prev => ({ ...prev, fillColor: e.target.value }))}
                    className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="font-mono text-[11px] text-slate-200">{config.fillColor}</span>
                </div>
              </div>

              {config.fillMode === 'gradient' ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Bottom Fill
                  </label>
                  <div className="flex items-center bg-[#121622] border border-[#1e2638] rounded-md px-2 h-7 gap-2">
                    <input
                      type="color"
                      value={config.fillColor2 || '#94a3b8'}
                      onChange={e => setConfig(prev => ({ ...prev, fillColor2: e.target.value }))}
                      className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span className="font-mono text-[11px] text-slate-200">{config.fillColor2 || '#94a3b8'}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Outline
                  </label>
                  <div className="flex items-center bg-[#121622] border border-[#1e2638] rounded-md px-2 h-7 gap-2">
                    <input
                      type="color"
                      value={config.strokeColor}
                      onChange={e => setConfig(prev => ({ ...prev, strokeColor: e.target.value }))}
                      className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span className="font-mono text-[11px] text-slate-200">{config.strokeColor}</span>
                  </div>
                </div>
              )}
            </div>

            {config.fillMode === 'gradient' && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Outline Color
                  </label>
                  <div className="flex items-center bg-[#121622] border border-[#1e2638] rounded-md px-2 h-7 gap-2">
                    <input
                      type="color"
                      value={config.strokeColor}
                      onChange={e => setConfig(prev => ({ ...prev, strokeColor: e.target.value }))}
                      className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span className="font-mono text-[11px] text-slate-200">{config.strokeColor}</span>
                  </div>
                </div>

                {/* Arcade Gradient Presets */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                    <Palette size={11} /> Arcade Palettes:
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {ARCADE_PALETTES.map(p => (
                      <button
                        key={p.name}
                        onClick={() => {
                          setConfig(prev => ({ ...prev, fillMode: 'gradient', fillColor: p.top, fillColor2: p.bottom }));
                          onToast(`Applied palette: ${p.name}`);
                        }}
                        className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-[#121622] hover:bg-[#1a2133] border border-[#1e2638] text-[10px] font-medium text-slate-300 transition"
                      >
                        <div
                          className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                          style={{ background: `linear-gradient(to bottom, ${p.top}, ${p.bottom})` }}
                        />
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Drop Shadow Controls */}
            <div className="pt-2 border-t border-[#1e2638] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Drop Shadow</span>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, includeShadow: !prev.includeShadow }))}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                    config.includeShadow
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                      : 'bg-[#121622] text-slate-400 hover:text-white border-[#1e2638]'
                  }`}
                >
                  {config.includeShadow ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {config.includeShadow && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Offset X/Y</span>
                      <span className="font-mono text-cyan-400">{config.shadowOffsetX}px</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={8}
                      step={1}
                      value={config.shadowOffsetX}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setConfig(prev => ({ ...prev, shadowOffsetX: val, shadowOffsetY: val }));
                      }}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block">Shadow Color</label>
                    <div className="flex items-center bg-[#121622] border border-[#1e2638] rounded-md px-2 h-7 gap-2">
                      <input
                        type="color"
                        value={config.shadowColor.startsWith('#') ? config.shadowColor : '#000000'}
                        onChange={e => setConfig(prev => ({ ...prev, shadowColor: e.target.value }))}
                        className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                      />
                      <span className="font-mono text-[10px] text-slate-300 truncate">{config.shadowColor}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Character Set Selection */}
          <div className="p-3 space-y-2 flex-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Character Set Preset
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(CHAR_PRESETS).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => {
                    setConfig(prev => ({ ...prev, characterSet: val.chars }));
                    onToast(`Loaded charset: ${val.name}`);
                  }}
                  className={`px-2 py-1 rounded text-xs text-left border transition truncate ${
                    config.characterSet === val.chars
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                      : 'bg-[#121622] text-slate-400 hover:text-white border-[#1e2638]'
                  }`}
                  title={val.name}
                >
                  {val.name.split(' (')[0]}
                </button>
              ))}
            </div>

            {/* Custom Characters Textarea */}
            <div className="pt-2 space-y-1">
              <label className="text-[10px] text-slate-400">
                Custom Characters ({Array.from(new Set(config.characterSet.split(''))).length} unique)
              </label>
              <textarea
                value={config.characterSet}
                onChange={e => setConfig(prev => ({ ...prev, characterSet: e.target.value }))}
                rows={3}
                className="w-full bg-[#121622] border border-[#1e2638] rounded-md p-2 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500 resize-none"
              />
            </div>
          </div>

          {/* Export Name */}
          <div className="p-3 mt-auto border-t border-[#1e2638] bg-[#0e121d] space-y-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Font Asset Name
              </label>
              <div className="flex items-center bg-[#121622] border border-[#1e2638] rounded-md px-2 h-7 focus-within:border-cyan-500">
                <Type size={12} className="text-slate-500 mr-1.5 shrink-0" />
                <input
                  type="text"
                  value={fontName}
                  onChange={e => setFontName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '_'))}
                  className="w-full bg-transparent text-xs font-mono text-white outline-none"
                />
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              className="w-full !h-9 !bg-cyan-600 hover:!bg-cyan-500 !border-cyan-400/30 text-white font-bold"
              icon={<Download size={13} />}
              onClick={handleExportZip}
            >
              Export {fontName}_bundle.zip
            </Button>
          </div>

        </aside>

        {/* CENTER STAGE: ATLAS VIEWPORT & LIVE TYPEWRITER */}
        <main className="flex-1 flex flex-col bg-[#080a0f] relative overflow-hidden select-none">
          
          {/* Viewport Top Bar */}
          <div className="h-10 border-b border-[#1e2638] bg-[#0c101a] px-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
              {atlasResult && (
                <>
                  <span>Atlas: <strong className="text-white">{atlasResult.width} × {atlasResult.height} px</strong></span>
                  <span>•</span>
                  <span>Glyphs: <strong className="text-cyan-400">{atlasResult.metrics.length}</strong></span>
                  <span>•</span>
                  <span>Line Height: <strong className="text-emerald-400">{atlasResult.lineHeight} px</strong></span>
                </>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBounds(b => !b)}
                className={`px-2 py-0.5 rounded text-[11px] border transition flex items-center gap-1 ${
                  showBounds
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-[#141824] text-slate-500 border-[#1e2638]'
                }`}
              >
                <Layers size={11} /> Bounds
              </button>

              <div className="flex items-center bg-[#141824] border border-[#1e2638] rounded-md p-0.5 text-[10px] font-mono">
                {[1, 2, 4].map(z => (
                  <button
                    key={z}
                    onClick={() => setZoomLevel(z)}
                    className={`px-2 py-0.5 rounded transition ${
                      zoomLevel === z
                        ? 'bg-cyan-500/25 text-cyan-300 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {z}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Atlas Canvas Stage */}
          <div className="flex-1 relative flex items-center justify-center overflow-auto p-6 bg-[#07090f]">
            {/* Checkerboard Pattern */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: `
                  linear-gradient(45deg, #222a3d 25%, transparent 25%),
                  linear-gradient(-45deg, #222a3d 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, #222a3d 75%),
                  linear-gradient(-45deg, transparent 75%, #222a3d 75%)
                `,
                backgroundSize: '24px 24px',
                backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px'
              }}
            />

            <canvas
              ref={canvasRef}
              className="shadow-2xl border border-[#1e2638] rounded-lg transition-transform block"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
                imageRendering: 'pixelated'
              }}
            />
          </div>

          {/* Bottom Live Typewriter Testbench */}
          <div className="h-28 bg-[#0c101a] border-t border-[#1e2638] p-3 flex flex-col justify-between shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Type size={12} className="text-cyan-400" />
                <span>Live In-Game Typewriter Test</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Type anything to test glyph alignment &amp; spacing
              </span>
            </div>

            <input
              type="text"
              value={testText}
              onChange={e => setTestText(e.target.value)}
              className="bg-[#121622] border border-[#1e2638] rounded-md px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-cyan-500"
              placeholder="Type test text here..."
            />

            {/* Rendered Live Preview with Current Font Styling */}
            <div
              className="truncate text-base font-bold px-1 select-text"
              style={{
                fontFamily: config.fontFamily,
                backgroundImage:
                  config.fillMode === 'gradient' && config.fillColor2
                    ? `linear-gradient(to bottom, ${config.fillColor}, ${config.fillColor2})`
                    : undefined,
                WebkitBackgroundClip: config.fillMode === 'gradient' ? 'text' : undefined,
                WebkitTextFillColor: config.fillMode === 'gradient' ? 'transparent' : undefined,
                color: config.fillMode === 'gradient' ? undefined : config.fillColor,
                WebkitTextStroke:
                  config.strokeWidth > 0 ? `${config.strokeWidth}px ${config.strokeColor}` : undefined,
                textShadow: config.includeShadow
                  ? `${config.shadowOffsetX}px ${config.shadowOffsetY}px 0px ${config.shadowColor}`
                  : undefined
              }}
            >
              {testText || 'Empty text'}
            </div>
          </div>

        </main>

        {/* RIGHT PANEL: DESCRIPTORS & METADATA (300px) */}
        <aside className="w-[300px] bg-[#0c101a] border-l border-[#1e2638] flex flex-col shrink-0 min-h-0 overflow-y-auto">
          
          <div className="p-3 bg-[#0e121d] border-b border-[#1e2638] flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Code2 size={13} className="text-cyan-400" />
              <span>Descriptor Export</span>
            </span>

            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
              {activeProfile.name}
            </span>
          </div>

          {/* Engine Tabs */}
          <div className="p-3 border-b border-[#1e2638]">
            <div className="flex items-center bg-[#121622] border border-[#1e2638] rounded-lg p-0.5 text-[11px]">
              <button
                onClick={() => setActiveTab('bmfont')}
                className={`flex-1 py-1 rounded font-semibold transition ${
                  activeTab === 'bmfont'
                    ? 'bg-cyan-500/20 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                BMFont (.fnt)
              </button>
              <button
                onClick={() => setActiveTab('godot')}
                className={`flex-1 py-1 rounded font-semibold transition ${
                  activeTab === 'godot'
                    ? 'bg-cyan-500/20 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Godot 4 (.tres)
              </button>
              <button
                onClick={() => setActiveTab('json')}
                className={`flex-1 py-1 rounded font-semibold transition ${
                  activeTab === 'json'
                    ? 'bg-cyan-500/20 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                JSON
              </button>
            </div>
          </div>

          {/* Code View */}
          <div className="p-3 flex-1 flex flex-col min-h-0 space-y-2">
            <div className="relative flex-1 min-h-[260px] rounded-xl bg-[#07090e] border border-[#1e2638] p-3 font-mono text-[10px] text-slate-300 overflow-auto group">
              <pre className="whitespace-pre-wrap leading-relaxed select-text">
                {descriptorText}
              </pre>

              <button
                onClick={() => handleCopyCode(descriptorText)}
                className="absolute top-2.5 right-2.5 px-2 py-1 rounded-md bg-[#161c2c] hover:bg-[#20293f] border border-[#232c42] text-xs text-slate-200 hover:text-white flex items-center gap-1.5 transition shadow"
                title="Copy Descriptor to Clipboard"
              >
                {copied ? (
                  <>
                    <Check size={12} className="text-emerald-400" />
                    <span className="text-emerald-300">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <Button
              variant="primary"
              size="md"
              className="w-full !h-9 !bg-cyan-600 hover:!bg-cyan-500 !border-cyan-400/30 text-white font-bold"
              icon={copied ? <Check size={13} /> : <Copy size={13} />}
              onClick={() => handleCopyCode(descriptorText)}
            >
              {copied ? 'Copied to Clipboard!' : `Copy ${activeTab.toUpperCase()} Descriptor`}
            </Button>
          </div>

        </aside>

      </div>

      {/* Tutorial Walkthrough Modal */}
      <WorkstationTutorialModal
        tutorial={WORKSTATION_TUTORIALS.letterpress}
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        isFirstVisitPrompt={isFirstVisit}
      />

    </div>
  );
};
