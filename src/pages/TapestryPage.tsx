import React, { useState, useEffect, useRef } from 'react';
import { TargetEngine, ENGINE_PROFILES } from '../types/engine';
import {
  AutotileConfig,
  DEFAULT_AUTOTILE_CONFIG,
  getCanonicalTileIndex,
  generateAutotileAtlas,
  generateGodotTileSet,
  generateUnityRuleTileCode
} from '../core/tapestry/autotile';
import { createZipArchive, ZipFileEntry } from '../core/stonecutter/zip';
import { Button } from '../components/ui/Button';
import { NumberInput } from '../components/ui/NumberInput';
import { Accordion } from '../components/ui/Accordion';
import { WorkstationTutorialModal } from '../components/ui/WorkstationTutorialModal';
import { WORKSTATION_TUTORIALS } from '../core/tutorial/tutorialData';
import {
  Grid,
  Paintbrush,
  Eraser,
  RotateCcw,
  Sliders,
  Copy,
  Check,
  Code2,
  Download,
  Eye,
  Sparkles,
  Layers,
  MapPin,
  Trees,
  Castle,
  Cpu,
  HelpCircle
} from 'lucide-react';

interface TapestryPageProps {
  engine: TargetEngine;
  onToast: (msg: string) => void;
}

type ToolMode = 'brush' | 'eraser';

export const TapestryPage: React.FC<TapestryPageProps> = ({
  engine,
  onToast
}) => {
  const [config, setConfig] = useState<AutotileConfig>(DEFAULT_AUTOTILE_CONFIG);
  const [tool, setTool] = useState<ToolMode>('brush');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [assetName, setAssetName] = useState<string>('forest_terrain');
  const [codeTab, setCodeTab] = useState<'godot' | 'unity'>(
    engine === 'unity' ? 'unity' : 'godot'
  );
  const [copied, setCopied] = useState<boolean>(false);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number; tileIdx: number } | null>(null);

  // 2D Boolean Array of solid cells in grid
  const [gridData, setGridData] = useState<boolean[][]>(() => {
    const data: boolean[][] = [];
    for (let y = 0; y < DEFAULT_AUTOTILE_CONFIG.gridRows; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < DEFAULT_AUTOTILE_CONFIG.gridCols; x++) {
        // Initial floating island demo terrain
        const isGround = y >= 9;
        const isPlatform = y === 5 && x >= 4 && x <= 9;
        const isPillar = x >= 13 && x <= 16 && y >= 3;
        row.push(isGround || isPlatform || isPillar);
      }
      data.push(row);
    }
    return data;
  });

  const isMouseDownRef = useRef<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const atlasCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // First-visit tutorial state
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('rgds_tutorial_tapestry_dismissed');
      if (!dismissed) {
        setIsTutorialOpen(true);
        setIsFirstVisit(true);
      }
    } catch {}
  }, []);

  // Sync engine tab
  useEffect(() => {
    if (engine === 'unity') setCodeTab('unity');
    else setCodeTab('godot');
  }, [engine]);

  // Generate / update procedural texture atlas
  useEffect(() => {
    atlasCanvasRef.current = generateAutotileAtlas(config.theme, config.tileSize);
    drawTilemap();
  }, [config.theme, config.tileSize]);

  // Render tilemap to canvas whenever gridData or config changes
  useEffect(() => {
    drawTilemap();
  }, [gridData, showGrid, config]);

  const drawTilemap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ts = config.tileSize;
    const cols = config.gridCols;
    const rows = config.gridRows;

    canvas.width = cols * ts;
    canvas.height = rows * ts;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Deep backdrop
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const atlas = atlasCanvasRef.current;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const isSolid = gridData[y]?.[x] ?? false;
        if (!isSolid) continue;

        // Neighbor lookups
        const n  = y > 0 && gridData[y - 1][x];
        const s  = y < rows - 1 && gridData[y + 1][x];
        const w  = x > 0 && gridData[y][x - 1];
        const e  = x < cols - 1 && gridData[y][x + 1];

        const nw = y > 0 && x > 0 && gridData[y - 1][x - 1];
        const ne = y > 0 && x < cols - 1 && gridData[y - 1][x + 1];
        const sw = y < rows - 1 && x > 0 && gridData[y + 1][x - 1];
        const se = y < rows - 1 && x < cols - 1 && gridData[y + 1][x + 1];

        const tileIndex = getCanonicalTileIndex(n, ne, e, se, s, sw, w, nw);

        if (atlas) {
          const atlasCols = 8;
          const sx = (tileIndex % atlasCols) * ts;
          const sy = Math.floor(tileIndex / atlasCols) * ts;
          ctx.drawImage(atlas, sx, sy, ts, ts, x * ts, y * ts, ts, ts);
        } else {
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(x * ts, y * ts, ts, ts);
        }
      }
    }

    // Grid lines overlay
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= cols; x++) {
        ctx.beginPath();
        ctx.moveTo(x * ts + 0.5, 0);
        ctx.lineTo(x * ts + 0.5, rows * ts);
        ctx.stroke();
      }
      for (let y = 0; y <= rows; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * ts + 0.5);
        ctx.lineTo(cols * ts, y * ts + 0.5);
        ctx.stroke();
      }
    }
  };

  // Canvas Mouse Interactions for painting / carving
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isMouseDownRef.current = true;
    applyPaint(e);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    updateHover(e);
    if (!isMouseDownRef.current) return;
    applyPaint(e);
  };

  const handleCanvasMouseUp = () => {
    isMouseDownRef.current = false;
  };

  const applyPaint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor(((e.clientX - rect.left) * scaleX) / config.tileSize);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / config.tileSize);

    if (x < 0 || x >= config.gridCols || y < 0 || y >= config.gridRows) return;

    const newValue = tool === 'brush';
    if (gridData[y][x] === newValue) return;

    setGridData(prev => {
      const next = prev.map(row => [...row]);
      next[y][x] = newValue;
      return next;
    });
  };

  const updateHover = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor(((e.clientX - rect.left) * scaleX) / config.tileSize);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / config.tileSize);

    if (x >= 0 && x < config.gridCols && y >= 0 && y < config.gridRows) {
      const isSolid = gridData[y]?.[x] ?? false;
      if (isSolid) {
        const n  = y > 0 && !!gridData[y - 1][x];
        const s  = y + 1 < config.gridRows && !!gridData[y + 1][x];
        const w  = x > 0 && !!gridData[y][x - 1];
        const eDir = x + 1 < config.gridCols && !!gridData[y][x + 1];
        const nw = y > 0 && x > 0 && !!gridData[y - 1][x - 1];
        const ne = y > 0 && x + 1 < config.gridCols && !!gridData[y - 1][x + 1];
        const sw = y + 1 < config.gridRows && x > 0 && !!gridData[y + 1][x - 1];
        const se = y + 1 < config.gridRows && x + 1 < config.gridCols && !!gridData[y + 1][x + 1];

        const tileIdx = getCanonicalTileIndex(n, ne, eDir, se, s, sw, w, nw);
        setHoveredCell({ x, y, tileIdx });
      } else {
        setHoveredCell(null);
      }
    } else {
      setHoveredCell(null);
    }
  };

  // Clear Map
  const handleClearMap = () => {
    setGridData(Array(config.gridRows).fill(null).map(() => Array(config.gridCols).fill(false)));
    onToast('Cleared level tilemap');
  };

  // Fill All
  const handleFillAll = () => {
    setGridData(Array(config.gridRows).fill(null).map(() => Array(config.gridCols).fill(true)));
    onToast('Filled entire level tilemap');
  };

  // Export 1-Click Game Jam Bundle (.zip)
  const handleExportZip = async () => {
    const canvas = canvasRef.current;
    const atlas = atlasCanvasRef.current;
    if (!canvas || !atlas) return;

    const mapBlob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/png'));
    const atlasBlob = await new Promise<Blob>(res => atlas.toBlob(b => res(b!), 'image/png'));

    const files: ZipFileEntry[] = [
      { name: `${assetName}_map.png`, data: new Uint8Array(await mapBlob.arrayBuffer()) },
      { name: `${assetName}_tileset.png`, data: new Uint8Array(await atlasBlob.arrayBuffer()) }
    ];

    if (engine === 'godot') {
      const tres = generateGodotTileSet(assetName, config.tileSize);
      files.push({ name: `${assetName}_tileset.tres`, data: tres });
    } else {
      const guide = generateUnityRuleTileCode(assetName);
      files.push({ name: `UNITY_RULETILE_GUIDE.txt`, data: guide });
    }

    const zipBlob = await createZipArchive(files);
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${assetName}_autotile_bundle.zip`;
    a.click();
    URL.revokeObjectURL(url);
    onToast(`Exported ${assetName}_autotile_bundle.zip!`);
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    onToast('Copied tilemap descriptor snippet!');
    setTimeout(() => setCopied(false), 2000);
  };

  const generatedCode = codeTab === 'godot'
    ? generateGodotTileSet(assetName, config.tileSize)
    : generateUnityRuleTileCode(assetName);

  const activeProfile = ENGINE_PROFILES[engine];

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#080a0f] select-none">
      
      {/* Tapestry Sub-Header */}
      <div className="h-11 bg-[#101420] border-b border-[#1e2638] px-4 flex items-center justify-between shrink-0 z-20">
        
        {/* Left: Themes & Tools */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mr-1 flex items-center gap-1">
            <Trees size={12} /> Theme:
          </span>

          <button
            onClick={() => {
              setConfig(prev => ({ ...prev, theme: 'mossy_forest' }));
              setAssetName('forest_terrain');
            }}
            className={`px-2 py-1 rounded-md text-xs font-semibold border transition ${
              config.theme === 'mossy_forest'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-[#141824] hover:bg-[#1f2638] text-slate-300 border-[#1e2638]'
            }`}
          >
            🌲 Mossy Forest
          </button>
          <button
            onClick={() => {
              setConfig(prev => ({ ...prev, theme: 'dungeon_brick' }));
              setAssetName('dungeon_bricks');
            }}
            className={`px-2 py-1 rounded-md text-xs font-semibold border transition ${
              config.theme === 'dungeon_brick'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-[#141824] hover:bg-[#1f2638] text-slate-300 border-[#1e2638]'
            }`}
          >
            🏰 Dungeon Bricks
          </button>
          <button
            onClick={() => {
              setConfig(prev => ({ ...prev, theme: 'scifi_metal' }));
              setAssetName('scifi_platform');
            }}
            className={`px-2 py-1 rounded-md text-xs font-semibold border transition ${
              config.theme === 'scifi_metal'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-[#141824] hover:bg-[#1f2638] text-slate-300 border-[#1e2638]'
            }`}
          >
            🤖 Sci-Fi Plating
          </button>

          <div className="h-4 w-[1px] bg-[#1e2638] mx-1" />

          {/* Paint Tool Toggles */}
          <div className="flex items-center bg-[#141824] border border-[#1e2638] rounded-md p-0.5 text-xs font-semibold">
            <button
              onClick={() => setTool('brush')}
              className={`px-2 py-0.5 rounded transition flex items-center gap-1 ${
                tool === 'brush'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Paintbrush size={11} /> Paint
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`px-2 py-0.5 rounded transition flex items-center gap-1 ${
                tool === 'eraser'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eraser size={11} /> Carve
            </button>
          </div>
        </div>

        {/* Right: Tile Size & Clear */}
        <div className="flex items-center gap-2">
          {/* Tile Size Pills */}
          <div className="flex items-center bg-[#141824] border border-[#1e2638] rounded-md p-0.5 text-[10px] font-mono">
            {[16, 24, 32, 48].map(sz => (
              <button
                key={sz}
                onClick={() => setConfig(prev => ({ ...prev, tileSize: sz }))}
                className={`px-1.5 py-0.5 rounded transition ${
                  config.tileSize === sz
                    ? 'bg-emerald-500/25 text-emerald-300 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sz}px
              </button>
            ))}
          </div>

          {/* Grid Toggle */}
          <button
            onClick={() => setShowGrid(g => !g)}
            className={`text-xs px-2 py-1 rounded border transition flex items-center gap-1 ${
              showGrid
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-[#141824] border-[#1e2638] text-slate-400 hover:text-white'
            }`}
          >
            <Grid size={11} /> Grid
          </button>

          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw size={11} />}
            onClick={handleClearMap}
            title="Clear all painted tiles to start blank"
          >
            Blank
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<HelpCircle size={12} className="text-teal-400" />}
            onClick={() => {
              setIsFirstVisit(false);
              setIsTutorialOpen(true);
            }}
            title="Open Tapestry Walkthrough"
          >
            Tutorial
          </Button>
        </div>
      </div>

      {/* Main 3-Panel Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* LEFT PANEL: AUTOTILE RULE INSPECTOR (280px) */}
        <aside className="w-[280px] bg-[#0c101a] border-r border-[#1e2638] flex flex-col shrink-0 min-h-0 overflow-y-auto">
          
          {/* Header */}
          <div className="p-3 bg-[#0e121d] border-b border-[#1e2638] flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sliders size={13} className="text-emerald-400" />
              <span>3x3 Bitmask Inspector</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25">
              47-Tile Rules
            </span>
          </div>

          {/* Active Hovered Tile Radar */}
          <div className="p-4 border-b border-[#1e2638] flex flex-col items-center space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Hovered Tile Peering
            </span>

            {hoveredCell ? (
              <div className="flex flex-col items-center space-y-2">
                <div className="w-20 h-20 rounded-xl bg-[#080c14] border border-emerald-500/40 p-2 flex flex-col items-center justify-center shadow-lg">
                  <span className="text-[10px] font-mono text-slate-400">Tile Index</span>
                  <span className="text-xl font-bold font-mono text-emerald-400">#{hoveredCell.tileIdx}</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  Coords: ({hoveredCell.x}, {hoveredCell.y})
                </div>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-xl bg-[#080c14] border border-[#1e2638] flex flex-col items-center justify-center text-slate-600 text-xs">
                <span>No Tile</span>
              </div>
            )}
          </div>

          {/* Quick Shape Presets */}
          <div className="p-3 space-y-2 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Quick Level Shapes
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  setGridData(Array(config.gridRows).fill(null).map((_, y) =>
                    Array(config.gridCols).fill(null).map((_, x) => y >= 10 || (y === 6 && x >= 5 && x <= 14))
                  ));
                  onToast('Generated Floating Island layout');
                }}
                className="p-2 rounded bg-[#121622] hover:bg-[#1a2133] border border-[#1e2638] text-xs text-left text-slate-300 transition"
              >
                🏝️ Floating Island
              </button>
              <button
                onClick={() => {
                  setGridData(Array(config.gridRows).fill(null).map((_, y) =>
                    Array(config.gridCols).fill(null).map((_, x) => y === 0 || y === config.gridRows - 1 || x === 0 || x === config.gridCols - 1 || (x % 4 === 0 && y >= 4 && y <= 9))
                  ));
                  onToast('Generated Dungeon Arena layout');
                }}
                className="p-2 rounded bg-[#121622] hover:bg-[#1a2133] border border-[#1e2638] text-xs text-left text-slate-300 transition"
              >
                🏰 Castle Arena
              </button>
              <button
                onClick={handleFillAll}
                className="p-2 rounded bg-[#121622] hover:bg-[#1a2133] border border-[#1e2638] text-xs text-left text-slate-300 transition"
              >
                🧱 Solid Ground
              </button>
              <button
                onClick={handleClearMap}
                className="p-2 rounded bg-[#121622] hover:bg-[#1a2133] border border-[#1e2638] text-xs text-left text-rose-300 transition"
              >
                🗑️ Empty Canvas
              </button>
            </div>
          </div>

        </aside>

        {/* CENTER STAGE: LEVEL SANDBOX VIEWPORT */}
        <main className="flex-1 flex flex-col bg-[#07090e] relative overflow-hidden select-none">
          
          {/* Top Bar Telemetry */}
          <div className="h-10 border-b border-[#1e2638] bg-[#0c101a] px-4 flex items-center justify-between text-xs font-mono text-slate-400">
            <div className="flex items-center gap-3">
              <span>Grid: <strong className="text-white">{config.gridCols} × {config.gridRows} tiles</strong></span>
              <span>•</span>
              <span>Tile Resolution: <strong className="text-emerald-400">{config.tileSize}px</strong></span>
              <span>•</span>
              <span>Active Tool: <strong className={tool === 'brush' ? 'text-emerald-300 uppercase' : 'text-rose-400 uppercase'}>{tool}</strong></span>
            </div>
            <div className="text-[11px] text-slate-500">
              Click &amp; drag cursor to paint or carve terrain live
            </div>
          </div>

          {/* Interactive Canvas Viewport */}
          <div className="flex-1 relative flex items-center justify-center overflow-auto p-8 bg-[#07090f]">
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              className="rounded-xl border border-[#222c42] shadow-2xl block cursor-crosshair transition-transform"
              style={{
                imageRendering: 'pixelated'
              }}
            />
          </div>

        </main>

        {/* RIGHT PANEL: CODE GENERATOR & EXPORTS (310px) */}
        <aside className="w-[310px] bg-[#0c101a] border-l border-[#1e2638] flex flex-col shrink-0 min-h-0 overflow-y-auto">
          
          {/* Header */}
          <div className="p-3 bg-[#0e121d] border-b border-[#1e2638] flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Code2 size={13} className="text-emerald-400" />
              <span>Engine Autotile Setup</span>
            </span>

            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
              {activeProfile.name}
            </span>
          </div>

          {/* Code Tabs */}
          <div className="p-3 border-b border-[#1e2638]">
            <div className="flex items-center bg-[#121622] border border-[#1e2638] rounded-lg p-0.5 text-[11px]">
              <button
                onClick={() => setCodeTab('godot')}
                className={`flex-1 py-1 rounded font-semibold transition ${
                  codeTab === 'godot'
                    ? 'bg-emerald-500/20 text-emerald-300 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Godot 4 TileSet
              </button>
              <button
                onClick={() => setCodeTab('unity')}
                className={`flex-1 py-1 rounded font-semibold transition ${
                  codeTab === 'unity'
                    ? 'bg-emerald-500/20 text-emerald-300 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Unity RuleTile
              </button>
            </div>
          </div>

          {/* Code Box */}
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
                Tileset Asset Name
              </label>
              <input
                type="text"
                value={assetName}
                onChange={e => setAssetName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '_'))}
                className="w-full bg-[#121622] border border-[#1e2638] rounded-md px-2.5 h-7 text-xs font-mono text-white outline-none focus:border-emerald-500"
              />
            </div>

            <Button
              variant="primary"
              size="md"
              className="w-full !h-9 !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-400/30 text-white font-bold"
              icon={<Download size={13} />}
              onClick={handleExportZip}
            >
              Export {assetName}_bundle.zip
            </Button>
          </div>

        </aside>

      </div>

      {/* Tutorial Walkthrough Modal */}
      <WorkstationTutorialModal
        tutorial={WORKSTATION_TUTORIALS.tapestry}
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        isFirstVisitPrompt={isFirstVisit}
      />

    </div>
  );
};
