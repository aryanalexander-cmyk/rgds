import React, { useState, useEffect, useRef } from 'react';
import { TargetEngine, ENGINE_PROFILES } from '../types/engine';
import {
  CapsulePreset,
  CapsuleCropState,
  CapsuleCategory,
  LogoOverlayState,
  DEFAULT_LOGO_CONFIG,
  STOREFRONT_PRESETS,
  DEFAULT_CROP_CONFIG,
  renderCapsuleToCanvas,
  canvasToPngBytes,
  generateDemoKeyArt,
  generateDemoLogo
} from '../core/loom/resizer';
import { createZipArchive, ZipFileEntry } from '../core/stonecutter/zip';
import { Button } from '../components/ui/Button';
import { NumberInput } from '../components/ui/NumberInput';
import { WorkstationTutorialModal } from '../components/ui/WorkstationTutorialModal';
import { WORKSTATION_TUTORIALS } from '../core/tutorial/tutorialData';
import {
  Layers,
  Upload,
  Download,
  Sparkles,
  Sliders,
  ZoomIn,
  Move,
  Check,
  CheckSquare,
  Square,
  ShieldAlert,
  RotateCcw,
  FileArchive,
  Eye,
  Info,
  Maximize2,
  Image as ImageIcon,
  Type,
  HelpCircle
} from 'lucide-react';

interface LoomPageProps {
  engine: TargetEngine;
  onToast: (msg: string) => void;
}

export const LoomPage: React.FC<LoomPageProps> = ({
  engine,
  onToast
}) => {
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | HTMLCanvasElement | null>(null);
  const [sourceName, setSourceName] = useState<string>('void_runner');
  const [logoImage, setLogoImage] = useState<HTMLImageElement | HTMLCanvasElement | null>(null);
  const [logoState, setLogoState] = useState<LogoOverlayState>(DEFAULT_LOGO_CONFIG);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'art' | 'logo'>('art');

  const [crops, setCrops] = useState<Record<string, CapsuleCropState>>(DEFAULT_CROP_CONFIG);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('steam_header');
  const [categoryFilter, setCategoryFilter] = useState<'all' | CapsuleCategory>('all');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showSafeZones, setShowSafeZones] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const inspectorCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize with demo artwork and demo logo on first load
  useEffect(() => {
    const demoArt = generateDemoKeyArt();
    setSourceImage(demoArt);
    const demoLogo = generateDemoLogo();
    setLogoImage(demoLogo);
    setSourceName('void_runner');
  }, []);

  // First-visit tutorial state
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('rgds_tutorial_loom_dismissed');
      if (!dismissed) {
        setIsTutorialOpen(true);
        setIsFirstVisit(true);
      }
    } catch {}
  }, []);

  const handleBlankWorkspace = () => {
    // Blank dark canvas for artwork
    const c = document.createElement('canvas');
    c.width = 1920;
    c.height = 1080;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0e121d';
      ctx.fillRect(0, 0, 1920, 1080);
      const img = new Image();
      img.onload = () => {
        setSourceImage(img);
        setLogoImage(null);
        setSourceName('blank_capsule');
        onToast('Loom workspace reset to blank canvas.');
      };
      img.src = c.toDataURL();
    }
  };

  // Filter presets based on active category
  const filteredPresets = STOREFRONT_PRESETS.filter(
    p => categoryFilter === 'all' || p.category === categoryFilter
  );

  const activePreset = STOREFRONT_PRESETS.find(p => p.id === selectedPresetId) || STOREFRONT_PRESETS[0];
  const activeCrop = crops[activePreset.id] || { scale: 1.0, offsetX: 0, offsetY: 0, enabled: true };

  // Update crop setting for a specific preset
  const updateCrop = (presetId: string, partial: Partial<CapsuleCropState>) => {
    setCrops(prev => ({
      ...prev,
      [presetId]: {
        ...prev[presetId],
        ...partial
      }
    }));
  };

  // Redraw active inspector canvas whenever sourceImage, logo, or activeCrop changes
  useEffect(() => {
    if (!sourceImage || !inspectorCanvasRef.current) return;
    renderCapsuleToCanvas(inspectorCanvasRef.current, sourceImage, activePreset, activeCrop, logoImage, logoState);
  }, [sourceImage, activePreset, activeCrop, logoImage, logoState]);

  // Handle artwork image upload from disk
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      setSourceImage(img);
      const clean = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      setSourceName(clean || 'game_capsule');
      URL.revokeObjectURL(url);
      onToast(`Loaded artwork: ${file.name} (${img.width}x${img.height})`);
    };
    img.src = url;
  };

  // Handle logo upload from disk
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      setLogoImage(img);
      setLogoState(prev => ({ ...prev, enabled: true }));
      URL.revokeObjectURL(url);
      onToast(`Loaded floating logo: ${file.name}`);
    };
    img.src = url;
  };

  // Drag and drop handler
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      setSourceImage(img);
      const clean = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      setSourceName(clean || 'game_capsule');
      URL.revokeObjectURL(url);
      onToast(`Loaded artwork: ${file.name} (${img.width}x${img.height})`);
    };
    img.src = url;
  };

  // Load procedural demo artwork
  const handleLoadDemo = () => {
    const demo = generateDemoKeyArt();
    setSourceImage(demo);
    const demoLogo = generateDemoLogo();
    setLogoImage(demoLogo);
    setSourceName('void_runner');
    onToast('Loaded demo key art and floating title logo!');
  };

  // Single capsule PNG export
  const handleExportSingle = async (preset: CapsulePreset) => {
    if (!sourceImage) return;
    const tempCanvas = document.createElement('canvas');
    const crop = crops[preset.id] || { scale: 1.0, offsetX: 0, offsetY: 0, enabled: true };
    renderCapsuleToCanvas(tempCanvas, sourceImage, preset, crop, logoImage, logoState);

    const blob = await new Promise<Blob | null>(res => tempCanvas.toBlob(res, 'image/png'));
    if (!blob) return;

    const fileName = `${sourceName}_${preset.filename}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    onToast(`Downloaded: ${fileName}`);
  };

  // Batch Export all enabled capsules into a structured ZIP
  const handleExportBatchZip = async () => {
    if (!sourceImage) return;
    setIsExporting(true);
    onToast('Rendering capsules for ZIP export...');

    try {
      const enabledPresets = STOREFRONT_PRESETS.filter(p => crops[p.id]?.enabled !== false);
      if (enabledPresets.length === 0) {
        onToast('No capsules selected for export!');
        setIsExporting(false);
        return;
      }

      const zipEntries: ZipFileEntry[] = [];
      const tempCanvas = document.createElement('canvas');

      for (const preset of enabledPresets) {
        const crop = crops[preset.id] || { scale: 1.0, offsetX: 0, offsetY: 0, enabled: true };
        renderCapsuleToCanvas(tempCanvas, sourceImage, preset, crop, logoImage, logoState);
        const pngBytes = await canvasToPngBytes(tempCanvas);

        // Subfolder by storefront category
        const subfolder = preset.category;
        const filePath = `${subfolder}/${sourceName}_${preset.filename}`;

        zipEntries.push({
          name: filePath,
          data: pngBytes
        });
      }

      // Add README with storefront requirements
      const readmeText = `# Storefront Capsules & Assets
Generated with Ristek Game Development Suite - Loom
Artwork: ${sourceName}
Floating Logo: ${logoState.enabled ? 'Included' : 'Disabled'}
Total Assets: ${zipEntries.length}

## Included Storefront Sizes:
${enabledPresets.map(p => `- [${p.category.toUpperCase()}] ${p.name}: ${p.width}x${p.height}px (${p.filename})`).join('\n')}

Drop these images directly into your Steamworks backend or Itch.io game edit page.
`;
      zipEntries.push({
        name: 'README.txt',
        data: readmeText
      });

      const zipBlob = createZipArchive(zipEntries);
      const zipFileName = `${sourceName}_storefront_capsules.zip`;

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = zipFileName;
      a.click();
      URL.revokeObjectURL(url);

      onToast(`Successfully exported ${enabledPresets.length} capsules in ${zipFileName}!`);
    } catch (err) {
      console.error(err);
      onToast('Error generating ZIP archive.');
    } finally {
      setIsExporting(false);
    }
  };

  // Quick alignment helpers
  const alignFocal = (ox: number, oy: number) => {
    updateCrop(activePreset.id, { offsetX: ox, offsetY: oy });
  };

  const activeProfile = ENGINE_PROFILES[engine];

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#080a0f] select-none"
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={logoInputRef}
        type="file"
        accept="image/png,image/webp"
        className="hidden"
        onChange={handleLogoFileChange}
      />

      {/* Loom Sub-Header (Category Filters & Actions) */}
      <div className="h-11 bg-[#101420] border-b border-[#1e2638] px-4 flex items-center justify-between shrink-0 z-20">
        
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 mr-1 flex items-center gap-1">
            <Layers size={11} /> Filters:
          </span>
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition ${
              categoryFilter === 'all'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                : 'bg-[#141824] border-[#1e2638] text-slate-300 hover:text-white'
            }`}
          >
            All Sizes ({STOREFRONT_PRESETS.length})
          </button>
          <button
            onClick={() => setCategoryFilter('steam')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition ${
              categoryFilter === 'steam'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                : 'bg-[#141824] border-[#1e2638] text-slate-300 hover:text-white'
            }`}
          >
            Steam (5)
          </button>
          <button
            onClick={() => setCategoryFilter('itch')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition ${
              categoryFilter === 'itch'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                : 'bg-[#141824] border-[#1e2638] text-slate-300 hover:text-white'
            }`}
          >
            Itch.io (2)
          </button>
          <button
            onClick={() => setCategoryFilter('social')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition ${
              categoryFilter === 'social'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                : 'bg-[#141824] border-[#1e2638] text-slate-300 hover:text-white'
            }`}
          >
            Social &amp; Press (2)
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Sparkles size={11} className="text-amber-400" />}
            onClick={handleLoadDemo}
            title="Load demo promotional key art & logo"
          >
            Load Demo
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw size={11} />}
            onClick={handleBlankWorkspace}
            title="Reset artwork and logo to blank canvas"
          >
            Blank
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<HelpCircle size={12} className="text-rose-400" />}
            onClick={() => {
              setIsFirstVisit(false);
              setIsTutorialOpen(true);
            }}
            title="Open Loom Walkthrough"
          >
            Tutorial
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Upload size={12} className="text-rose-400" />}
            onClick={() => fileInputRef.current?.click()}
            title="Upload custom key art (PNG, JPG, WebP)"
          >
            Upload Art
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Type size={12} className="text-sky-400" />}
            onClick={() => logoInputRef.current?.click()}
            title="Upload a transparent game title logo PNG"
          >
            Upload Logo
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<FileArchive size={12} />}
            onClick={handleExportBatchZip}
            disabled={isExporting}
            className="!bg-rose-600 hover:!bg-rose-500 !border-rose-400/30 text-white font-bold"
          >
            {isExporting ? 'Packing ZIP...' : 'Export All (.zip)'}
          </Button>
        </div>
      </div>

      {/* Main 2-Panel Workstation Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* LEFT PANEL: FOCAL CROPPING & LOGO INSPECTOR (340px) */}
        <aside className="w-[340px] bg-[#0c101a] border-r border-[#1e2638] flex flex-col shrink-0 min-h-0 overflow-y-auto">
          
          {/* Header */}
          <div className="p-3 bg-[#0e121d] border-b border-[#1e2638] flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sliders size={13} className="text-rose-400" />
              <span>Capsule Inspector</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 uppercase">
              {activePreset.category}
            </span>
          </div>

          {/* Active Preset Metadata */}
          <div className="p-3 border-b border-[#1e2638] space-y-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">{activePreset.name}</h4>
              <span className="text-xs font-mono text-emerald-400 font-semibold">
                {activePreset.width} × {activePreset.height} px
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {activePreset.description}
            </p>
          </div>

          {/* Canvas Viewport Box with Safe Zone Overlay */}
          <div className="p-3 border-b border-[#1e2638] bg-[#07090f] flex flex-col items-center">
            <div className="w-full h-48 rounded-xl bg-[#090d16] border border-[#1e2638] relative overflow-hidden flex items-center justify-center shadow-inner group">
              <canvas
                ref={inspectorCanvasRef}
                className="max-w-full max-h-full object-contain block shadow-lg rounded"
              />

              {/* Safe Zone / Overlay Guides */}
              {showSafeZones && (
                <div className="absolute inset-0 pointer-events-none border border-rose-500/30 m-3 rounded flex flex-col justify-between p-1.5">
                  <div className="text-[9px] font-mono text-rose-400/80 bg-black/60 px-1 py-0.5 rounded self-start">
                    SAFE TITLE ZONE
                  </div>
                  {activePreset.id === 'steam_header' && (
                    <div className="text-[8px] font-mono text-amber-300/80 bg-amber-500/20 border border-amber-500/30 px-1 py-0.5 rounded self-end">
                      STEAM PRICE OVERLAY
                    </div>
                  )}
                </div>
              )}
            </div>

            {activePreset.safeZoneNote && (
              <div className="mt-2 text-[10px] text-slate-400 flex items-start gap-1.5 font-mono">
                <Info size={11} className="text-amber-400 shrink-0 mt-0.5" />
                <span>{activePreset.safeZoneNote}</span>
              </div>
            )}
          </div>

          {/* Layer Selector Tabs (Background Artwork vs Floating Logo) */}
          <div className="p-3 border-b border-[#1e2638] pb-0">
            <div className="flex items-center bg-[#121622] border border-[#1e2638] rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setActiveInspectorTab('art')}
                className={`flex-1 py-1 rounded font-semibold transition flex items-center justify-center gap-1.5 ${
                  activeInspectorTab === 'art'
                    ? 'bg-rose-500/20 text-rose-300 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ImageIcon size={12} />
                <span>Background Art</span>
              </button>
              <button
                onClick={() => setActiveInspectorTab('logo')}
                className={`flex-1 py-1 rounded font-semibold transition flex items-center justify-center gap-1.5 ${
                  activeInspectorTab === 'logo'
                    ? 'bg-sky-500/20 text-sky-300 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Type size={12} />
                <span>Title Logo {logoState.enabled ? '✓' : '(Off)'}</span>
              </button>
            </div>
          </div>

          {/* TAB 1: BACKGROUND ARTWORK CONTROLS */}
          {activeInspectorTab === 'art' && (
            <div className="p-3 border-b border-[#1e2638] space-y-3">
              {/* Scale Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <ZoomIn size={12} className="text-rose-400" />
                    <span>Artwork Scale</span>
                  </span>
                  <span className="font-mono text-rose-400">{Math.round(activeCrop.scale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2.5}
                  step={0.05}
                  value={activeCrop.scale}
                  onChange={e => updateCrop(activePreset.id, { scale: Number(e.target.value) })}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>

              {/* Horizontal Pan */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Move size={12} className="text-slate-400" />
                    <span>Pan X</span>
                  </span>
                  <span className="font-mono text-slate-300">{activeCrop.offsetX}%</span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  step={2}
                  value={activeCrop.offsetX}
                  onChange={e => updateCrop(activePreset.id, { offsetX: Number(e.target.value) })}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>

              {/* Vertical Pan */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Move size={12} className="text-slate-400" />
                    <span>Pan Y</span>
                  </span>
                  <span className="font-mono text-slate-300">{activeCrop.offsetY}%</span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  step={2}
                  value={activeCrop.offsetY}
                  onChange={e => updateCrop(activePreset.id, { offsetY: Number(e.target.value) })}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>

              {/* Quick Alignment Pills */}
              <div className="pt-1 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Quick Align:</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => alignFocal(0, 0)}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#141824] hover:bg-[#1f2638] text-slate-300 border border-[#1e2638]"
                  >
                    Center
                  </button>
                  <button
                    onClick={() => alignFocal(0, -35)}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#141824] hover:bg-[#1f2638] text-slate-300 border border-[#1e2638]"
                  >
                    Top
                  </button>
                  <button
                    onClick={() => alignFocal(0, 35)}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#141824] hover:bg-[#1f2638] text-slate-300 border border-[#1e2638]"
                  >
                    Bottom
                  </button>
                  <button
                    onClick={() => updateCrop(activePreset.id, { scale: 1.0, offsetX: 0, offsetY: 0 })}
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#141824] hover:bg-[#1f2638] text-rose-400 border border-[#1e2638]"
                    title="Reset Crop to Default"
                  >
                    <RotateCcw size={10} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FLOATING LOGO LAYER CONTROLS */}
          {activeInspectorTab === 'logo' && (
            <div className="p-3 border-b border-[#1e2638] space-y-3">
              {/* Logo Visibility Switch */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Logo Layer Enabled</span>
                <button
                  onClick={() => setLogoState(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`px-2.5 py-0.5 rounded text-xs font-bold border transition ${
                    logoState.enabled
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                      : 'bg-[#141824] text-slate-500 border-[#1e2638]'
                  }`}
                >
                  {logoState.enabled ? 'ACTIVE' : 'MUTED'}
                </button>
              </div>

              {/* Logo Scale */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Logo Size</span>
                  <span className="font-mono text-sky-400">{Math.round(logoState.scale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={2.0}
                  step={0.05}
                  value={logoState.scale}
                  onChange={e => setLogoState(prev => ({ ...prev, scale: Number(e.target.value) }))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Logo Horizontal Position */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Logo Position X</span>
                  <span className="font-mono text-slate-300">{logoState.offsetX}%</span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  step={2}
                  value={logoState.offsetX}
                  onChange={e => setLogoState(prev => ({ ...prev, offsetX: Number(e.target.value) }))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Logo Vertical Position */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Logo Position Y</span>
                  <span className="font-mono text-slate-300">{logoState.offsetY}%</span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  step={2}
                  value={logoState.offsetY}
                  onChange={e => setLogoState(prev => ({ ...prev, offsetY: Number(e.target.value) }))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Logo Options */}
              <div className="pt-1 flex items-center justify-between text-xs">
                <button
                  onClick={() => setLogoState(prev => ({ ...prev, shadow: !prev.shadow }))}
                  className={`px-2 py-1 rounded text-xs border transition flex items-center gap-1 ${
                    logoState.shadow
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                      : 'bg-[#141824] text-slate-500 border-[#1e2638]'
                  }`}
                >
                  <ShieldAlert size={11} /> Backdrop Shadow
                </button>

                <button
                  onClick={() => setLogoState(DEFAULT_LOGO_CONFIG)}
                  className="px-2 py-1 rounded text-xs bg-[#141824] hover:bg-[#1f2638] text-slate-400 border border-[#1e2638]"
                >
                  Reset Logo
                </button>
              </div>
            </div>
          )}

          {/* Export Single Capsule */}
          <div className="p-3 space-y-2 mt-auto border-t border-[#1e2638] bg-[#0e121d]">
            <Button
              variant="primary"
              size="md"
              className="w-full !h-9 !bg-rose-600 hover:!bg-rose-500 !border-rose-400/30 text-white font-bold"
              icon={<Download size={13} />}
              onClick={() => handleExportSingle(activePreset)}
            >
              Export {activePreset.name} (.png)
            </Button>
          </div>

        </aside>

        {/* RIGHT STAGE: CAPSULE GALLERY & MULTI-VIEWPORT FILMSTRIP */}
        <main className="flex-1 flex flex-col bg-[#080a0f] relative overflow-y-auto p-5 space-y-4">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Capsule Gallery</span>
                <span className="text-xs font-mono text-slate-400 font-normal">
                  ({filteredPresets.length} presets shown)
                </span>
                {logoState.enabled && logoImage && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                    + Floating Logo
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Click any capsule card to edit its focal point crop or toggle inclusion in the batch ZIP
              </p>
            </div>

            {/* Batch Name Input */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[#121622] border border-[#1e2638] rounded-md px-2.5 h-8">
                <span className="text-[11px] text-slate-500 mr-2 font-mono">Filename:</span>
                <input
                  type="text"
                  value={sourceName}
                  onChange={e => setSourceName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '_'))}
                  className="bg-transparent text-xs font-mono text-white outline-none w-32"
                />
                <span className="text-[10px] font-mono text-rose-400 shrink-0">_capsules.zip</span>
              </div>
            </div>
          </div>

          {/* Grid of Preset Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-12">
            {filteredPresets.map(preset => {
              const isSelected = preset.id === activePreset.id;
              const crop = crops[preset.id] || { scale: 1.0, offsetX: 0, offsetY: 0, enabled: true };

              return (
                <CapsuleCard
                  key={preset.id}
                  preset={preset}
                  crop={crop}
                  sourceImage={sourceImage}
                  logoImage={logoImage}
                  logoState={logoState}
                  isSelected={isSelected}
                  onSelect={() => setSelectedPresetId(preset.id)}
                  onToggleEnabled={() => updateCrop(preset.id, { enabled: !crop.enabled })}
                  onExport={() => handleExportSingle(preset)}
                />
              );
            })}
          </div>

        </main>

      </div>

      {/* Tutorial Walkthrough Modal */}
      <WorkstationTutorialModal
        tutorial={WORKSTATION_TUTORIALS.loom}
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        isFirstVisitPrompt={isFirstVisit}
      />

    </div>
  );
};

// --------------------------------------------------------------------------
// Sub-Component: Capsule Card with Live Canvas Preview
// --------------------------------------------------------------------------
interface CapsuleCardProps {
  preset: CapsulePreset;
  crop: CapsuleCropState;
  sourceImage: HTMLImageElement | HTMLCanvasElement | null;
  logoImage: HTMLImageElement | HTMLCanvasElement | null;
  logoState: LogoOverlayState;
  isSelected: boolean;
  onSelect: () => void;
  onToggleEnabled: () => void;
  onExport: () => void;
}

const CapsuleCard: React.FC<CapsuleCardProps> = ({
  preset,
  crop,
  sourceImage,
  logoImage,
  logoState,
  isSelected,
  onSelect,
  onToggleEnabled,
  onExport
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!sourceImage || !canvasRef.current) return;
    renderCapsuleToCanvas(canvasRef.current, sourceImage, preset, crop, logoImage, logoState);
  }, [sourceImage, preset, crop, logoImage, logoState]);

  return (
    <div
      onClick={onSelect}
      className={`rounded-2xl border p-4 flex flex-col justify-between transition-all duration-150 cursor-pointer shadow-lg ${
        isSelected
          ? 'bg-rose-500/10 border-rose-500/50 shadow-rose-500/10'
          : crop.enabled
          ? 'bg-[#0e121d] hover:bg-[#121724] border-[#1e2638] text-slate-300'
          : 'bg-[#090b12] border-[#161d2b] opacity-60'
      }`}
    >
      <div className="space-y-3">
        {/* Top Header: Title, Category Badge, Checkbox */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={e => {
                e.stopPropagation();
                onToggleEnabled();
              }}
              className="text-slate-400 hover:text-white transition"
              title={crop.enabled ? 'Enabled in batch ZIP' : 'Excluded from batch ZIP'}
            >
              {crop.enabled ? (
                <CheckSquare size={16} className="text-rose-400" />
              ) : (
                <Square size={16} className="text-slate-600" />
              )}
            </button>
            <h4 className="text-xs font-bold text-white truncate">{preset.name}</h4>
          </div>

          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161c2b] text-slate-300 border border-[#222a3d] uppercase">
            {preset.category}
          </span>
        </div>

        {/* Live Canvas Preview Frame */}
        <div className="w-full h-36 rounded-xl bg-[#06080e] border border-[#1a2133] relative overflow-hidden flex items-center justify-center shadow-inner group">
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full object-contain block shadow-md rounded"
          />

          {/* Hover Overlay Hint */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5 bg-rose-600/90 px-3 py-1.5 rounded-lg shadow">
              <Sliders size={12} /> Edit Focal Crop
            </span>
          </div>
        </div>

        {/* Dimensions & Description */}
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-400">Dimensions:</span>
          <span className="text-emerald-400 font-bold">{preset.width} × {preset.height} px</span>
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="pt-3 mt-3 border-t border-[#182030] flex items-center justify-between">
        <span className="text-[10px] font-mono text-slate-500 truncate max-w-[150px]">
          {preset.filename}
        </span>

        <button
          onClick={e => {
            e.stopPropagation();
            onExport();
          }}
          className="px-2.5 py-1 rounded-md bg-[#161c2c] hover:bg-rose-600 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1 transition"
          title={`Download ${preset.filename}`}
        >
          <Download size={11} />
          <span>PNG</span>
        </button>
      </div>
    </div>
  );
};

