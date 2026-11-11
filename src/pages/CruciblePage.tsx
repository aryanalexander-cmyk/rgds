import React, { useState, useEffect, useRef } from 'react';
import { TargetEngine, ENGINE_PROFILES } from '../types/engine';
import {
  NormalMapConfig,
  PointLight2D,
  DEFAULT_NORMAL_CONFIG,
  DEFAULT_POINT_LIGHT,
  generateNormalMap,
  renderDynamic2DLighting,
  generateDemoSprite,
  generateGodotCanvasTexture,
  generateUnityMaterialGuide
} from '../core/crucible/normalmap';
import { createZipArchive, ZipFileEntry } from '../core/stonecutter/zip';
import { Button } from '../components/ui/Button';
import { NumberInput } from '../components/ui/NumberInput';
import { Accordion } from '../components/ui/Accordion';
import { WorkstationTutorialModal } from '../components/ui/WorkstationTutorialModal';
import { WORKSTATION_TUTORIALS } from '../core/tutorial/tutorialData';
import {
  Flame,
  Sun,
  Eye,
  Sliders,
  Download,
  Copy,
  Check,
  Code2,
  Upload,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Layers,
  Split,
  Lightbulb,
  RotateCcw,
  HelpCircle
} from 'lucide-react';

interface CruciblePageProps {
  engine: TargetEngine;
  onToast: (msg: string) => void;
}

type ViewMode = 'lit' | 'normal' | 'split';

export const CruciblePage: React.FC<CruciblePageProps> = ({
  engine,
  onToast
}) => {
  const [config, setConfig] = useState<NormalMapConfig>(DEFAULT_NORMAL_CONFIG);
  const [light, setLight] = useState<PointLight2D>(DEFAULT_POINT_LIGHT);
  const [viewMode, setViewMode] = useState<ViewMode>('lit');
  const [assetName, setAssetName] = useState<string>('dungeon_stone');
  const [zoomLevel, setZoomLevel] = useState<number>(1.5);
  const [codeTab, setCodeTab] = useState<'godot' | 'unity'>(
    engine === 'unity' ? 'unity' : 'godot'
  );
  const [copied, setCopied] = useState<boolean>(false);
  const [isDraggingLight, setIsDraggingLight] = useState<boolean>(false);

  // Source Diffuse ImageData & Computed Normal Map ImageData
  const [diffuseData, setDiffuseData] = useState<ImageData | null>(null);
  const [normalData, setNormalData] = useState<ImageData | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync engine tab
  useEffect(() => {
    if (engine === 'unity') setCodeTab('unity');
    else setCodeTab('godot');
  }, [engine]);

  // Initial load: create demo sprite
  useEffect(() => {
    loadDemo('stone_wall', 'dungeon_stone');
  }, []);

  const loadDemo = (type: 'stone_wall' | 'cyber_armor' | 'knight_shield', name: string) => {
    const imgData = generateDemoSprite(type);
    setDiffuseData(imgData);
    setAssetName(name);
    // Center light
    setLight(prev => ({
      ...prev,
      x: imgData.width / 2,
      y: imgData.height / 2
    }));
  };

  // First-visit tutorial state
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('rgds_tutorial_crucible_dismissed');
      if (!dismissed) {
        setIsTutorialOpen(true);
        setIsFirstVisit(true);
      }
    } catch {}
  }, []);

  const handleBlankWorkspace = () => {
    // Create blank transparent 64x64 sprite
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 64, 64);
      const blankData = ctx.getImageData(0, 0, 64, 64);
      setDiffuseData(blankData);
      setAssetName('blank_sprite');
      onToast('Crucible canvas cleared to blank slate.');
    }
  };

  // Recompute Normal Map when diffuseData or normal config changes
  useEffect(() => {
    if (!diffuseData) return;
    const nData = generateNormalMap(diffuseData, config);
    setNormalData(nData);
  }, [diffuseData, config]);

  // Render to viewport canvas
  useEffect(() => {
    if (!canvasRef.current || !diffuseData || !normalData) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (viewMode === 'lit') {
      canvas.width = diffuseData.width;
      canvas.height = diffuseData.height;
      renderDynamic2DLighting(diffuseData, normalData, light, config, ctx);

      // Draw light cursor beacon gizmo
      ctx.save();
      ctx.strokeStyle = light.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(light.x, light.y, 6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(light.x, light.y, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Outer radius indicator
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

    } else if (viewMode === 'normal') {
      canvas.width = normalData.width;
      canvas.height = normalData.height;
      ctx.putImageData(normalData, 0, 0);
    } else if (viewMode === 'split') {
      canvas.width = diffuseData.width * 2;
      canvas.height = diffuseData.height;
      ctx.putImageData(diffuseData, 0, 0);
      ctx.putImageData(normalData, diffuseData.width, 0);

      // Dividing line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(diffuseData.width, 0);
      ctx.lineTo(diffuseData.width, diffuseData.height);
      ctx.stroke();
    }
  }, [diffuseData, normalData, light, config, viewMode]);

  // Canvas mouse interactions for dragging 2D light
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (viewMode !== 'lit') return;
    setIsDraggingLight(true);
    updateLightPosition(e);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingLight || viewMode !== 'lit') return;
    updateLightPosition(e);
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingLight(false);
  };

  const updateLightPosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setLight(prev => ({
      ...prev,
      x: Math.round(x),
      y: Math.round(y)
    }));
  };

  // Custom User Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, img.width, img.height);
        setDiffuseData(data);
        const base = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
        setAssetName(base);
        setLight(prev => ({ ...prev, x: img.width / 2, y: img.height / 2 }));
        onToast(`Loaded sprite: ${file.name} (${img.width}x${img.height})`);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Export Normal Map PNG Directly
  const handleExportNormalPng = () => {
    if (!normalData) return;
    const c = document.createElement('canvas');
    c.width = normalData.width;
    c.height = normalData.height;
    const ctx = c.getContext('2d')!;
    ctx.putImageData(normalData, 0, 0);

    const url = c.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${assetName}_normal.png`;
    a.click();
    onToast(`Exported ${assetName}_normal.png!`);
  };

  // Export 1-Click Engine ZIP Package
  const handleExportZip = async () => {
    if (!diffuseData || !normalData) return;

    // Canvas to Blob helper
    const makePngBytes = async (data: ImageData): Promise<Uint8Array> => {
      const c = document.createElement('canvas');
      c.width = data.width;
      c.height = data.height;
      const ctx = c.getContext('2d')!;
      ctx.putImageData(data, 0, 0);
      const blob = await new Promise<Blob>(resolve => c.toBlob(b => resolve(b!), 'image/png'));
      return new Uint8Array(await blob.arrayBuffer());
    };

    const diffuseBytes = await makePngBytes(diffuseData);
    const normalBytes = await makePngBytes(normalData);

    const files: ZipFileEntry[] = [
      { name: `${assetName}.png`, data: diffuseBytes },
      { name: `${assetName}_normal.png`, data: normalBytes }
    ];

    if (engine === 'godot') {
      const tres = generateGodotCanvasTexture(assetName, 0.5);
      files.push({ name: `${assetName}_texture.tres`, data: tres });
    } else {
      const guide = generateUnityMaterialGuide(assetName);
      files.push({ name: `UNITY_LIGHTING_GUIDE.txt`, data: guide });
    }

    const zipBlob = await createZipArchive(files);
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${assetName}_2d_lit_bundle.zip`;
    a.click();
    URL.revokeObjectURL(url);
    onToast(`Exported ${assetName}_2d_lit_bundle.zip!`);
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    onToast('Copied descriptor to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const generatedCode = codeTab === 'godot'
    ? generateGodotCanvasTexture(assetName, 0.5)
    : generateUnityMaterialGuide(assetName);

  const activeProfile = ENGINE_PROFILES[engine];

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#080a0f] select-none">
      
      {/* Crucible Sub-Header */}
      <div className="h-11 bg-[#101420] border-b border-[#1e2638] px-4 flex items-center justify-between shrink-0 z-20">
        
        {/* Left: Demo Sprites & Upload */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400 mr-1 flex items-center gap-1">
            <Flame size={12} /> Presets:
          </span>

          <button
            onClick={() => loadDemo('stone_wall', 'dungeon_stone')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition ${
              assetName === 'dungeon_stone'
                ? 'bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-sm'
                : 'bg-[#141824] hover:bg-[#1f2638] text-slate-300 border-[#1e2638]'
            }`}
          >
            Dungeon Wall
          </button>
          <button
            onClick={() => loadDemo('cyber_armor', 'cyber_plate')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition ${
              assetName === 'cyber_plate'
                ? 'bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-sm'
                : 'bg-[#141824] hover:bg-[#1f2638] text-slate-300 border-[#1e2638]'
            }`}
          >
            Cyber Armor
          </button>
          <button
            onClick={() => loadDemo('knight_shield', 'royal_shield')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition ${
              assetName === 'royal_shield'
                ? 'bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-sm'
                : 'bg-[#141824] hover:bg-[#1f2638] text-slate-300 border-[#1e2638]'
            }`}
          >
            Knight Shield
          </button>

          <div className="h-4 w-[1px] bg-[#1e2638] mx-1" />

          {/* Custom Upload Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
          />
          <Button
            variant="secondary"
            size="sm"
            icon={<Upload size={12} />}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload Sprite
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw size={11} />}
            onClick={handleBlankWorkspace}
            title="Reset to blank canvas"
          >
            Blank
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<HelpCircle size={12} className="text-orange-400" />}
            onClick={() => {
              setIsFirstVisit(false);
              setIsTutorialOpen(true);
            }}
            title="Open Crucible Walkthrough"
          >
            Tutorial
          </Button>
        </div>

        {/* Right: View Mode Toggle & Zoom */}
        <div className="flex items-center gap-2">
          {/* Light Color Swatches */}
          <div className="flex items-center bg-[#141824] border border-[#1e2638] rounded-md p-0.5 gap-1">
            {[
              { name: 'Torch', hex: '#ffaa33' },
              { name: 'Cyber Cyan', hex: '#00e5ff' },
              { name: 'Neon Red', hex: '#ff1744' },
              { name: 'Pure White', hex: '#ffffff' }
            ].map(col => (
              <button
                key={col.hex}
                onClick={() => setLight(prev => ({ ...prev, color: col.hex }))}
                className="w-4 h-4 rounded-full border border-white/20 transition hover:scale-110"
                style={{ backgroundColor: col.hex }}
                title={`${col.name} Light (${col.hex})`}
              />
            ))}
          </div>

          {/* View Mode Pills */}
          <div className="flex items-center bg-[#141824] border border-[#1e2638] rounded-md p-0.5 text-xs font-semibold">
            <button
              onClick={() => setViewMode('lit')}
              className={`px-2 py-0.5 rounded transition flex items-center gap-1 ${
                viewMode === 'lit'
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sun size={11} /> 2D Lit
            </button>
            <button
              onClick={() => setViewMode('normal')}
              className={`px-2 py-0.5 rounded transition flex items-center gap-1 ${
                viewMode === 'normal'
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye size={11} /> Normal Map
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-2 py-0.5 rounded transition flex items-center gap-1 ${
                viewMode === 'split'
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Split size={11} /> Split
            </button>
          </div>

          {/* Zoom Buttons */}
          <div className="flex items-center bg-[#141824] border border-[#1e2638] rounded-md p-0.5 text-[10px] font-mono">
            {[1.0, 1.5, 2.0].map(z => (
              <button
                key={z}
                onClick={() => setZoomLevel(z)}
                className={`px-1.5 py-0.5 rounded transition ${
                  zoomLevel === z
                    ? 'bg-orange-500/25 text-orange-300 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {z}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main 3-Panel Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* LEFT PANEL: NORMAL MAP PARAMETERS & LIGHT CONTROLS (310px) */}
        <aside className="w-[310px] bg-[#0c101a] border-r border-[#1e2638] flex flex-col shrink-0 min-h-0 overflow-y-auto">
          
          {/* Header */}
          <div className="p-3 bg-[#0e121d] border-b border-[#1e2638] flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sliders size={13} className="text-orange-400" />
              <span>Normal Map Sculptor</span>
            </span>
            <span className="text-[10px] font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/25">
              Sobel Filter
            </span>
          </div>

          {/* Relief & Bump Tuning */}
          <div className="p-3 border-b border-[#1e2638] space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Relief Bump Strength</span>
                <span className="font-mono text-orange-400">{config.strength.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={10.0}
                step={0.2}
                value={config.strength}
                onChange={e => setConfig(prev => ({ ...prev, strength: Number(e.target.value) }))}
                className="w-full accent-orange-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Pre-Blur Smoothness</span>
                <span className="font-mono text-orange-400">
                  {config.smoothness === 0 ? '0 (Pixel Art)' : `${config.smoothness} px`}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={3}
                step={1}
                value={config.smoothness}
                onChange={e => setConfig(prev => ({ ...prev, smoothness: Number(e.target.value) }))}
                className="w-full accent-orange-500 cursor-pointer"
              />
            </div>

            {/* Y-Axis / Green Inversion Switcher (Godot vs Unity) */}
            <div className="pt-1 space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Normal Vector Orientation
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setConfig(prev => ({ ...prev, invertG: false }))}
                  className={`p-1.5 rounded-lg text-[11px] text-left border transition ${
                    !config.invertG
                      ? 'bg-orange-500/20 text-orange-300 border-orange-500/50 shadow-sm'
                      : 'bg-[#121622] text-slate-400 hover:text-white border-[#1e2638]'
                  }`}
                >
                  <div className="font-semibold">OpenGL / Godot</div>
                  <div className="text-[9px] text-slate-500 font-mono">+Y Up (Default)</div>
                </button>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, invertG: true }))}
                  className={`p-1.5 rounded-lg text-[11px] text-left border transition ${
                    config.invertG
                      ? 'bg-orange-500/20 text-orange-300 border-orange-500/50 shadow-sm'
                      : 'bg-[#121622] text-slate-400 hover:text-white border-[#1e2638]'
                  }`}
                >
                  <div className="font-semibold">DirectX / Unity</div>
                  <div className="text-[9px] text-slate-500 font-mono">-Y Inverted</div>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Light 2D Parameters */}
          <div className="p-3 border-b border-[#1e2638] space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sun size={13} className="text-amber-400" />
              <span>PointLight2D Chamber</span>
            </span>

            {/* Light Color */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Light Color</label>
                <div className="flex items-center bg-[#121622] border border-[#1e2638] rounded-md px-2 h-7 gap-2">
                  <input
                    type="color"
                    value={light.color}
                    onChange={e => setLight(prev => ({ ...prev, color: e.target.value }))}
                    className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="font-mono text-[11px] text-slate-200">{light.color}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Ambient Color</label>
                <div className="flex items-center bg-[#121622] border border-[#1e2638] rounded-md px-2 h-7 gap-2">
                  <input
                    type="color"
                    value={light.ambientColor}
                    onChange={e => setLight(prev => ({ ...prev, ambientColor: e.target.value }))}
                    className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="font-mono text-[11px] text-slate-200">{light.ambientColor}</span>
                </div>
              </div>
            </div>

            {/* Light Radius */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Light Attenuation Radius</span>
                <span className="font-mono text-orange-400">{light.radius}px</span>
              </div>
              <input
                type="range"
                min={80}
                max={450}
                step={10}
                value={light.radius}
                onChange={e => setLight(prev => ({ ...prev, radius: Number(e.target.value) }))}
                className="w-full accent-orange-500 cursor-pointer"
              />
            </div>

            {/* Light Height (Z) */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Virtual Height (Z-Distance)</span>
                <span className="font-mono text-orange-400">{light.z}px</span>
              </div>
              <input
                type="range"
                min={15}
                max={150}
                step={5}
                value={light.z}
                onChange={e => setLight(prev => ({ ...prev, z: Number(e.target.value) }))}
                className="w-full accent-orange-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Specular Blinn-Phong Highlights */}
          <Accordion
            title="Blinn-Phong Specular Highlights"
            icon={<Sparkles size={13} className="text-orange-400" />}
            defaultOpen={true}
          >
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Shininess (Gloss)</span>
                  <span className="font-mono text-orange-400">{config.specularPower}</span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={64}
                  step={2}
                  value={config.specularPower}
                  onChange={e => setConfig(prev => ({ ...prev, specularPower: Number(e.target.value) }))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Specular Gain</span>
                  <span className="font-mono text-orange-400">{config.specularGain.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={0.0}
                  max={2.0}
                  step={0.1}
                  value={config.specularGain}
                  onChange={e => setConfig(prev => ({ ...prev, specularGain: Number(e.target.value) }))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>
            </div>
          </Accordion>

        </aside>

        {/* CENTER STAGE: VIEWPORT CANVASES & LIGHT CHAMBER */}
        <main className="flex-1 flex flex-col bg-[#07090e] relative overflow-hidden select-none">
          
          {/* Viewport Top Bar */}
          <div className="h-10 border-b border-[#1e2638] bg-[#0c101a] px-4 flex items-center justify-between text-xs font-mono text-slate-400">
            {diffuseData && (
              <div className="flex items-center gap-3">
                <span>Asset: <strong className="text-white">{assetName}.png</strong></span>
                <span>•</span>
                <span>Dimensions: <strong className="text-orange-400">{diffuseData.width} × {diffuseData.height} px</strong></span>
                <span>•</span>
                <span>Light Pos: <strong className="text-amber-400">({light.x}, {light.y})</strong></span>
              </div>
            )}
            <div className="text-[11px] text-slate-500">
              {viewMode === 'lit' ? 'Click and drag cursor on canvas to guide the 2D light source' : 'Inspecting generated normal map'}
            </div>
          </div>

          {/* Interactive Canvas Stage */}
          <div className="flex-1 relative flex items-center justify-center overflow-auto p-8 bg-[#07090f]">
            {/* Dark Checkerboard */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: `
                  linear-gradient(45deg, #1e2638 25%, transparent 25%),
                  linear-gradient(-45deg, #1e2638 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, #1e2638 75%),
                  linear-gradient(-45deg, transparent 75%, #1e2638 75%)
                `,
                backgroundSize: '24px 24px',
                backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px'
              }}
            />

            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              className="shadow-2xl border border-[#222c42] rounded-xl transition-transform block cursor-crosshair"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
                imageRendering: 'pixelated'
              }}
            />
          </div>

        </main>

        {/* RIGHT PANEL: CODE GENERATOR & 1-CLICK EXPORTS (310px) */}
        <aside className="w-[310px] bg-[#0c101a] border-l border-[#1e2638] flex flex-col shrink-0 min-h-0 overflow-y-auto">
          
          {/* Header */}
          <div className="p-3 bg-[#0e121d] border-b border-[#1e2638] flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Code2 size={13} className="text-orange-400" />
              <span>Engine Material Setup</span>
            </span>

            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/25">
              {activeProfile.name}
            </span>
          </div>

          {/* Tabs */}
          <div className="p-3 border-b border-[#1e2638]">
            <div className="flex items-center bg-[#121622] border border-[#1e2638] rounded-lg p-0.5 text-[11px]">
              <button
                onClick={() => setCodeTab('godot')}
                className={`flex-1 py-1 rounded font-semibold transition ${
                  codeTab === 'godot'
                    ? 'bg-orange-500/20 text-orange-300 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Godot 4 CanvasTexture
              </button>
              <button
                onClick={() => setCodeTab('unity')}
                className={`flex-1 py-1 rounded font-semibold transition ${
                  codeTab === 'unity'
                    ? 'bg-orange-500/20 text-orange-300 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Unity Sprite-Lit
              </button>
            </div>
          </div>

          {/* Code Snippet Box */}
          <div className="p-3 flex-1 flex flex-col min-h-0 space-y-2.5">
            <div className="relative flex-1 min-h-[220px] rounded-xl bg-[#07090e] border border-[#1e2638] p-3 font-mono text-[11px] text-slate-300 overflow-auto group">
              <pre className="whitespace-pre-wrap leading-relaxed select-text">
                {generatedCode}
              </pre>

              <button
                onClick={() => handleCopyCode(generatedCode)}
                className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-md bg-[#161c2c] hover:bg-[#20293f] border border-[#232c42] text-xs text-slate-200 hover:text-white flex items-center gap-1.5 transition shadow"
                title="Copy to Clipboard"
              >
                {copied ? (
                  <>
                    <Check size={12} className="text-emerald-400" />
                    <span className="text-emerald-300">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Export Action Section */}
          <div className="p-3 mt-auto border-t border-[#1e2638] bg-[#0e121d] space-y-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Asset Prefix
              </label>
              <input
                type="text"
                value={assetName}
                onChange={e => setAssetName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '_'))}
                className="w-full bg-[#121622] border border-[#1e2638] rounded-md px-2.5 h-7 text-xs font-mono text-white outline-none focus:border-orange-500"
              />
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              icon={<Download size={12} />}
              onClick={handleExportNormalPng}
            >
              Export {assetName}_normal.png Only
            </Button>

            <Button
              variant="primary"
              size="md"
              className="w-full !h-9 !bg-orange-600 hover:!bg-orange-500 !border-orange-400/30 text-white font-bold"
              icon={<Download size={13} />}
              onClick={handleExportZip}
            >
              Export {assetName}_2d_lit_bundle.zip
            </Button>
          </div>

        </aside>

      </div>

      {/* Tutorial Walkthrough Modal */}
      <WorkstationTutorialModal
        tutorial={WORKSTATION_TUTORIALS.crucible}
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        isFirstVisitPrompt={isFirstVisit}
      />

    </div>
  );
};
