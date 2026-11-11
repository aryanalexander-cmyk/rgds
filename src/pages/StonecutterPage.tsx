import React, { useState, useEffect, useRef } from 'react';
import { TargetEngine, ENGINE_PROFILES } from '../types/engine';
import { SpriteItem, PackerConfig, PackerResult } from '../types/stonecutter';
import { runPackingEngine } from '../core/stonecutter/maxrects';
import { renderSpritesheetCanvas } from '../core/stonecutter/extrusion';
import { computeTrimBounds } from '../core/stonecutter/trim';
import { createDemoKnightSprites, createDemoUncutSheet } from '../core/stonecutter/demos';
import { sliceAlphaIslands, SlicedSpriteItem } from '../core/stonecutter/slicer';
import { encodeGif89a } from '../core/stonecutter/gif';
import { generateGodot4Tres, generateGodotSpriteFramesJson } from '../core/stonecutter/exporters/godot';
import { generateUnityMetadata, generateUnityEditorScript } from '../core/stonecutter/exporters/unity';
import { generateCssKeyframes, generateJsonHash } from '../core/stonecutter/exporters/web';
import { createZipArchive, ZipFileEntry } from '../core/stonecutter/zip';
import { Button } from '../components/ui/Button';
import { NumberInput } from '../components/ui/NumberInput';
import { Toggle } from '../components/ui/Toggle';
import { Accordion } from '../components/ui/Accordion';
import { WorkstationTutorialModal } from '../components/ui/WorkstationTutorialModal';
import { WORKSTATION_TUTORIALS } from '../core/tutorial/tutorialData';
import {
  TableCellsMerge,
  Scissors,
  Film,
  Minus,
  Plus,
  Play,
  Pause,
  Download,
  Image as ImageIcon,
  Sliders,
  Settings,
  Trash2,
  Upload,
  Sparkles,
  Maximize2,
  FileCode,
  FileImage,
  FolderArchive,
  Grid,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ArrowUpDown,
  ArrowDownAZ,
  X,
  RotateCcw,
  HelpCircle,
  SkipBack,
  SkipForward,
  Check,
  Loader2
} from 'lucide-react';

interface StonecutterPageProps {
  engine: TargetEngine;
  onToast: (msg: string) => void;
}

export const StonecutterPage: React.FC<StonecutterPageProps> = ({
  engine,
  onToast
}) => {
  const [sprites, setSprites] = useState<SpriteItem[]>([]);
  const [sheetName, setSheetName] = useState('spritesheet');
  const [config, setConfig] = useState<PackerConfig>({
    algorithm: 'maxrects',
    heuristic: 'auto',
    sortOrder: 'maxside',
    spacing: 2,
    margin: 2,
    extrude: 1, // 1px default extrusion for Godot & Unity
    trimTransparency: true,
    alphaThreshold: 1,
    powerOfTwo: false,
    forceSquare: false,
    gridCols: 4,
    gridUniform: true
  });

  const [packerResult, setPackerResult] = useState<PackerResult>({
    width: 0,
    height: 0,
    efficiency: 0,
    trimSavedArea: 0,
    sprites: []
  });

  const [zoom, setZoom] = useState(1.0);
  const [showBounds, setShowBounds] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showAnimDrawer, setShowAnimDrawer] = useState(false);
  const [animPlaying, setAnimPlaying] = useState(true);
  const [animFrameIdx, setAnimFrameIdx] = useState(0);
  const [animFps, setAnimFps] = useState(12);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const slicerInputRef = useRef<HTMLInputElement | null>(null);

  // Reverse Island Slicer State
  const [showSlicerModal, setShowSlicerModal] = useState(false);
  const [slicerThreshold, setSlicerThreshold] = useState(15);
  const [slicerMinSize, setSlicerMinSize] = useState(4);
  const [isSlicing, setIsSlicing] = useState(false);
  const [detectedSlices, setDetectedSlices] = useState<SlicedSpriteItem[] | null>(null);
  const [slicerSourceName, setSlicerSourceName] = useState<string>('spritesheet');

  // GIF Studio State
  const [showGifModal, setShowGifModal] = useState(false);
  const [gifFps, setGifFps] = useState(12);
  const [gifTransparent, setGifTransparent] = useState(true);
  const [gifPlaying, setGifPlaying] = useState(true);
  const [gifFrameIdx, setGifFrameIdx] = useState(0);
  const [isEncodingGif, setIsEncodingGif] = useState(false);
  const gifCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // GIF playback loop for GIF Studio
  useEffect(() => {
    if (!showGifModal || !gifPlaying || sprites.length === 0) return;
    const interval = setInterval(() => {
      setGifFrameIdx(prev => (prev + 1) % sprites.length);
    }, 1000 / gifFps);
    return () => clearInterval(interval);
  }, [showGifModal, gifPlaying, gifFps, sprites]);

  // Render GIF Studio active frame
  useEffect(() => {
    if (!showGifModal || !gifCanvasRef.current || sprites.length === 0) return;
    const currentSprite = sprites[gifFrameIdx];
    if (!currentSprite) return;
    const canvas = gifCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const maxWidth = Math.max(...sprites.map(s => s.width), 32);
    const maxHeight = Math.max(...sprites.map(s => s.height), 32);

    canvas.width = maxWidth;
    canvas.height = maxHeight;

    if (gifTransparent) {
      ctx.clearRect(0, 0, maxWidth, maxHeight);
    } else {
      ctx.fillStyle = '#080a10';
      ctx.fillRect(0, 0, maxWidth, maxHeight);
    }

    const ox = Math.floor((maxWidth - currentSprite.width) / 2);
    const oy = Math.floor((maxHeight - currentSprite.height) / 2);
    ctx.drawImage(currentSprite.img, ox, oy);
  }, [showGifModal, gifFrameIdx, gifTransparent, sprites]);

  // Load Hero Knight demo sprites on initial mount
  useEffect(() => {
    createDemoKnightSprites().then(demoSprites => {
      setSprites(demoSprites);
    });
  }, []);

  // First-visit tutorial state
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('rgds_tutorial_stonecutter_dismissed');
      if (!dismissed) {
        setIsTutorialOpen(true);
        setIsFirstVisit(true);
      }
    } catch {}
  }, []);

  const handleBlankWorkspace = () => {
    setSprites([]);
    setPackerResult({
      width: 0,
      height: 0,
      efficiency: 0,
      trimSavedArea: 0,
      sprites: []
    });
    setSheetName('spritesheet');
    onToast('Workspace cleared. Ready for new sprites.');
  };

  // Re-pack whenever sprites or config changes
  useEffect(() => {
    if (sprites.length === 0) {
      setPackerResult({ width: 0, height: 0, efficiency: 0, trimSavedArea: 0, sprites: [] });
      return;
    }
    const res = runPackingEngine(sprites, config);
    setPackerResult(res);
  }, [sprites, config]);

  // Render main spritesheet canvas
  useEffect(() => {
    if (!canvasRef.current || packerResult.width === 0 || packerResult.height === 0) return;
    const rendered = renderSpritesheetCanvas(sprites, packerResult.width, packerResult.height, config);
    const targetCtx = canvasRef.current.getContext('2d');
    if (!targetCtx) return;

    canvasRef.current.width = packerResult.width;
    canvasRef.current.height = packerResult.height;
    targetCtx.clearRect(0, 0, packerResult.width, packerResult.height);
    targetCtx.drawImage(rendered, 0, 0);

    // Draw bounds guides if enabled
    if (showBounds) {
      targetCtx.strokeStyle = 'rgba(99, 102, 241, 0.45)';
      targetCtx.lineWidth = 1;
      sprites.forEach(sp => {
        if (sp.packed) {
          targetCtx.strokeRect(sp.packed.x + 0.5, sp.packed.y + 0.5, sp.packed.w - 1, sp.packed.h - 1);
        }
      });
    }

    // Draw visual grid overlay if enabled
    if (showGrid) {
      targetCtx.strokeStyle = 'rgba(56, 189, 248, 0.35)'; // Cyan grid line
      targetCtx.lineWidth = 1;

      if (config.algorithm === 'grid') {
        const cols = Math.max(1, config.gridCols || 4);
        let maxW = 1, maxH = 1;
        sprites.forEach(sp => {
          if (sp.width > maxW) maxW = sp.width;
          if (sp.height > maxH) maxH = sp.height;
        });
        const cellW = maxW + config.extrude * 2;
        const cellH = maxH + config.extrude * 2;
        const spacing = config.spacing;
        const margin = config.margin;
        const rows = Math.ceil(sprites.length / cols);

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const gx = margin + c * (cellW + spacing);
            const gy = margin + r * (cellH + spacing);
            targetCtx.strokeRect(gx + 0.5, gy + 0.5, cellW - 1, cellH - 1);
          }
        }
      } else {
        // Draw standard subtle grid lines across atlas
        const gridSize = 32;
        targetCtx.beginPath();
        for (let x = 0; x <= packerResult.width; x += gridSize) {
          targetCtx.moveTo(x + 0.5, 0);
          targetCtx.lineTo(x + 0.5, packerResult.height);
        }
        for (let y = 0; y <= packerResult.height; y += gridSize) {
          targetCtx.moveTo(0, y + 0.5);
          targetCtx.lineTo(packerResult.width, y + 0.5);
        }
        targetCtx.stroke();
      }
    }
  }, [packerResult, showBounds, showGrid, config]);

  // Animation playback tick loop
  useEffect(() => {
    if (!animPlaying || sprites.length === 0) return;
    const interval = setInterval(() => {
      setAnimFrameIdx(prev => (prev + 1) % sprites.length);
    }, 1000 / animFps);
    return () => clearInterval(interval);
  }, [animPlaying, animFps, sprites]);

  // Render active animation frame
  useEffect(() => {
    if (!animCanvasRef.current || sprites.length === 0) return;
    const currentSprite = sprites[animFrameIdx];
    if (!currentSprite) return;

    const ctx = animCanvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 64, 64);

    const scale = Math.min(56 / currentSprite.width, 56 / currentSprite.height);
    const ox = (64 - currentSprite.width * scale) / 2;
    const oy = (64 - currentSprite.height * scale) / 2;
    ctx.drawImage(currentSprite.img, ox, oy, currentSprite.width * scale, currentSprite.height * scale);
  }, [animFrameIdx, sprites]);

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const promises = files.map(file => {
      return new Promise<SpriteItem>(resolve => {
        const img = new Image();
        img.onload = () => {
          const trim = computeTrimBounds(img, config.alphaThreshold);
          resolve({
            id: `${file.name}_${Date.now()}_${Math.random()}`,
            name: file.name,
            file,
            img,
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height,
            trimBounds: trim
          });
        };
        img.src = URL.createObjectURL(file);
      });
    });

    Promise.all(promises).then(newItems => {
      setSprites(prev => [...prev, ...newItems]);
      onToast(`Loaded ${newItems.length} sprites into Stonecutter!`);
    });
  };

  // Process slicing from an image source
  const processSlicing = (source: HTMLImageElement | HTMLCanvasElement, filename: string) => {
    setIsSlicing(true);
    const cleanBase = filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    setSlicerSourceName(cleanBase);
    
    // Execute connected-component island detection
    const slices = sliceAlphaIslands(source, {
      alphaThreshold: slicerThreshold,
      minSize: slicerMinSize,
      namePrefix: cleanBase
    });

    setIsSlicing(false);

    if (slices.length === 0) {
      setDetectedSlices(null);
      onToast('No separated sprite islands detected. Try lowering the threshold or checking transparency.');
      return;
    }

    setDetectedSlices(slices);
    onToast(`Detected ${slices.length} sprite islands from "${filename}"!`);
  };

  // Download sliced sprites as ZIP directly
  const handleDownloadSlicedZip = async () => {
    if (!detectedSlices || detectedSlices.length === 0) return;
    onToast(`Packaging ${detectedSlices.length} sliced sprites into ZIP archive...`);

    const entries: ZipFileEntry[] = [];
    for (const s of detectedSlices) {
      const blob = await new Promise<Blob | null>(res => s.canvas.toBlob(res, 'image/png'));
      if (blob) {
        const buffer = await blob.arrayBuffer();
        entries.push({
          name: `${s.name}.png`,
          data: new Uint8Array(buffer)
        });
      }
    }

    const zipBlob = createZipArchive(entries);
    downloadBlob(zipBlob, `${slicerSourceName}_sliced_sprites.zip`);
    onToast(`Exported ${entries.length} sliced sprites as "${slicerSourceName}_sliced_sprites.zip"!`);
  };

  // Import sliced sprites into Stonecutter's Atlas Packer
  const handleImportSlicesToPacker = async () => {
    if (!detectedSlices || detectedSlices.length === 0) return;
    
    const newSprites = await Promise.all(
      detectedSlices.map(s => {
        return new Promise<SpriteItem>(resolve => {
          const itemImg = new Image();
          itemImg.onload = () => {
            resolve({
              id: s.id,
              name: `${s.name}.png`,
              img: itemImg,
              width: s.width,
              height: s.height
            });
          };
          itemImg.src = s.canvas.toDataURL('image/png');
        });
      })
    );

    setSprites(newSprites);
    setSheetName(`${slicerSourceName}_repacked`);
    setConfig(c => ({ ...c, sortOrder: 'none' }));
    setShowSlicerModal(false);
    setDetectedSlices(null);
    onToast(`Loaded ${newSprites.length} sliced sprites into Atlas Packer!`);
  };

  // Download ZIP and also load into packer
  const handleImportAndDownloadBoth = async () => {
    await handleDownloadSlicedZip();
    await handleImportSlicesToPacker();
  };

  // Export all current workspace sprites as individual PNGs in a ZIP
  const handleExportIndividualSpritesZip = async () => {
    if (sprites.length === 0) {
      onToast('Load at least one sprite to export!');
      return;
    }
    const cleanName = sheetName.trim().replace(/\.[^/.]+$/, '') || 'sprites';
    onToast(`Archiving ${sprites.length} individual sprites into ZIP...`);

    const fileEntries: ZipFileEntry[] = [];
    for (let i = 0; i < sprites.length; i++) {
      const s = sprites[i];
      const canvas = document.createElement('canvas');
      canvas.width = s.width;
      canvas.height = s.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(s.img, 0, 0);
        const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
        if (blob) {
          const buffer = await blob.arrayBuffer();
          const fname = s.name.endsWith('.png') ? s.name : `${s.name}.png`;
          fileEntries.push({
            name: fname,
            data: new Uint8Array(buffer)
          });
        }
      }
    }

    const zipBlob = createZipArchive(fileEntries);
    downloadBlob(zipBlob, `${cleanName}_individual_sprites.zip`);
    onToast(`Exported ${fileEntries.length} individual sprite PNGs as "${cleanName}_individual_sprites.zip"!`);
  };

  // Download a single individual sprite PNG directly
  const handleDownloadSingleSprite = (sprite: SpriteItem) => {
    const canvas = document.createElement('canvas');
    canvas.width = sprite.width;
    canvas.height = sprite.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite.img, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      downloadBlob(blob, sprite.name.endsWith('.png') ? sprite.name : `${sprite.name}.png`);
      onToast(`Downloaded individual sprite "${sprite.name}"!`);
    }, 'image/png');
  };

  // Export animated GIF89a file
  const handleExportGif = async () => {
    if (sprites.length === 0) {
      onToast('Load at least one sprite frame to record a GIF!');
      return;
    }
    try {
      setIsEncodingGif(true);
      onToast('Encoding pure-JS GIF89a animation with LZW compression...');

      const maxWidth = Math.max(...sprites.map(s => s.width));
      const maxHeight = Math.max(...sprites.map(s => s.height));
      const targetFps = showGifModal ? gifFps : animFps;
      const delayMs = Math.max(20, Math.round(1000 / targetFps));

      const frames = sprites.map(s => {
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = maxWidth;
        frameCanvas.height = maxHeight;
        const ctx = frameCanvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;

        if (showGifModal ? !gifTransparent : false) {
          ctx.fillStyle = '#080a10';
          ctx.fillRect(0, 0, maxWidth, maxHeight);
        } else {
          ctx.clearRect(0, 0, maxWidth, maxHeight);
        }

        const ox = Math.floor((maxWidth - s.width) / 2);
        const oy = Math.floor((maxHeight - s.height) / 2);
        ctx.drawImage(s.img, ox, oy);

        return {
          canvas: frameCanvas,
          delayMs
        };
      });

      const gifBlob = encodeGif89a(frames, maxWidth, maxHeight, showGifModal ? gifTransparent : true);
      const cleanName = sheetName.trim().replace(/\.[^/.]+$/, '') || 'animation';
      downloadBlob(gifBlob, `${cleanName}.gif`);
      onToast(`Exported "${cleanName}.gif" (${frames.length} frames @ ${targetFps} FPS)!`);
    } catch (err: any) {
      onToast(`GIF export failed: ${err?.message || 'Encoding error'}`);
    } finally {
      setIsEncodingGif(false);
    }
  };

  // Export horizontal sprite strip PNG
  const handleExportSpriteStrip = () => {
    if (sprites.length === 0) return;
    const maxWidth = Math.max(...sprites.map(s => s.width));
    const maxHeight = Math.max(...sprites.map(s => s.height));
    const totalWidth = maxWidth * sprites.length;

    const stripCanvas = document.createElement('canvas');
    stripCanvas.width = totalWidth;
    stripCanvas.height = maxHeight;
    const ctx = stripCanvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, totalWidth, maxHeight);

    sprites.forEach((s, idx) => {
      const ox = idx * maxWidth + Math.floor((maxWidth - s.width) / 2);
      const oy = Math.floor((maxHeight - s.height) / 2);
      ctx.drawImage(s.img, ox, oy);
    });

    stripCanvas.toBlob(blob => {
      if (!blob) return;
      const cleanName = sheetName.trim().replace(/\.[^/.]+$/, '') || 'animation';
      downloadBlob(blob, `${cleanName}_strip.png`);
      onToast(`Exported "${cleanName}_strip.png" (${sprites.length} frames)!`);
    }, 'image/png');
  };

  // Handle uploaded flat sheet file
  const handleSliceFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      processSlicing(img, file.name);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // Slice built-in demo sheet
  const handleSliceDemo = () => {
    const demoCanvas = createDemoUncutSheet();
    processSlicing(demoCanvas, 'demo_atlas');
  };

  // Reorder / Arrange Sprites
  const moveSprite = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= sprites.length) return;
    setSprites(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    // Set packing sort order to 'none' so the packing reflects this exact order!
    setConfig(c => ({ ...c, sortOrder: 'none' }));
  };

  const moveToFront = (index: number) => {
    if (index === 0) return;
    moveSprite(index, 0);
    onToast(`Moved #${index + 1} to front (Manual pack order active)`);
  };

  const reverseSprites = () => {
    setSprites(prev => [...prev].reverse());
    setConfig(c => ({ ...c, sortOrder: 'none' }));
    onToast('Reversed sprite order (Manual pack order active)');
  };

  const sortSpritesByName = (ascending: boolean = true) => {
    setSprites(prev => [...prev].sort((a, b) =>
      ascending
        ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        : b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' })
    ));
    setConfig(c => ({ ...c, sortOrder: 'none' }));
    onToast(`Sorted sprites ${ascending ? 'A–Z' : 'Z–A'} (Natural order)`);
  };

  // Direct Transparent PNG Export (No ZIP, immediate file drop)
  const handleDownloadPNG = () => {
    if (sprites.length === 0) {
      onToast('Load at least one sprite to export!');
      return;
    }
    const cleanName = (sheetName.trim().replace(/\.[^/.]+$/, '')) || 'spritesheet';
    const canvas = renderSpritesheetCanvas(sprites, packerResult.width, packerResult.height, config);
    canvas.toBlob(blob => {
      if (blob) {
        downloadBlob(blob, `${cleanName}.png`);
        onToast(`Downloaded "${cleanName}.png" directly!`);
      }
    }, 'image/png');
  };

  // 1-Click Engine Bundle (.ZIP) Export
  const handleExportBundle = () => {
    if (sprites.length === 0) {
      onToast('Load at least one sprite to export!');
      return;
    }

    const cleanName = (sheetName.trim().replace(/\.[^/.]+$/, '')) || 'spritesheet';
    const canvas = renderSpritesheetCanvas(sprites, packerResult.width, packerResult.height, config);

    canvas.toBlob(blob => {
      if (!blob) return;

      if (engine === 'godot') {
        const tres = generateGodot4Tres(sprites, cleanName);
        const json = generateGodotSpriteFramesJson(sprites, cleanName);

        blob.arrayBuffer().then(buf => {
          const zip = createZipArchive([
            { name: `${cleanName}.png`, data: new Uint8Array(buf) },
            { name: `${cleanName}.tres`, data: tres },
            { name: `${cleanName}_frames.json`, data: json }
          ]);
          downloadBlob(zip, `${cleanName}_godot4.zip`);
          onToast(`Exported Godot 4 bundle (${cleanName}.png + .tres)!`);
        });
      } else if (engine === 'unity') {
        const meta = generateUnityMetadata(sprites, cleanName, packerResult.width, packerResult.height);
        const cs = generateUnityEditorScript(cleanName);

        blob.arrayBuffer().then(buf => {
          const zip = createZipArchive([
            { name: `${cleanName}.png`, data: new Uint8Array(buf) },
            { name: `${cleanName}.json`, data: meta },
            { name: `StonecutterImporter.cs`, data: cs }
          ]);
          downloadBlob(zip, `${cleanName}_unity.zip`);
          onToast(`Exported Unity bundle (${cleanName}.png + SpriteAtlas JSON)!`);
        });
      } else {
        const hash = generateJsonHash(sprites, cleanName, packerResult.width, packerResult.height);
        const css = generateCssKeyframes(sprites, cleanName, packerResult.width, packerResult.height);

        blob.arrayBuffer().then(buf => {
          const zip = createZipArchive([
            { name: `${cleanName}.png`, data: new Uint8Array(buf) },
            { name: `${cleanName}.json`, data: hash },
            { name: `${cleanName}.css`, data: css }
          ]);
          downloadBlob(zip, `${cleanName}_atlas.zip`);
          onToast(`Exported web bundle (${cleanName}.png + JSON + CSS)!`);
        });
      }
    }, 'image/png');
  };

  const downloadBlob = (b: Blob, filename: string) => {
    const url = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeProfile = ENGINE_PROFILES[engine];

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#080a0f]">
      
      {/* Stonecutter Sub-Header */}
      <div className="h-11 bg-[#101420] border-b border-[#1e2638] px-4 flex items-center justify-between shrink-0 z-20 select-none">
        {/* Mode Switcher + Sheet Name */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#0a0d14] p-1 rounded-lg border border-[#1e2638]">
            <button className="px-3 py-1 rounded-md text-xs font-semibold bg-indigo-600 text-white flex items-center gap-1.5 shadow-sm">
              <TableCellsMerge size={12} />
              <span>Atlas Packer</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30 text-indigo-100">
                {sprites.length}
              </span>
            </button>
            <button
              onClick={() => {
                setShowSlicerModal(true);
                setDetectedSlices(null);
              }}
              className="px-2.5 py-1 rounded-md text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-colors flex items-center gap-1.5"
              title="Auto-detect and slice sprite islands from a flat image"
            >
              <Scissors size={12} className="text-indigo-400" />
              <span>Reverse Slicer</span>
            </button>
            <button
              onClick={() => setShowGifModal(true)}
              className="px-2.5 py-1 rounded-md text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-colors flex items-center gap-1.5"
              title="Open GIF Studio - Record animated GIF89a loop from sprites"
            >
              <Film size={12} className="text-indigo-400" />
              <span>GIF Studio</span>
            </button>
          </div>

          {/* Editable Sheet Name Field */}
          <div className="hidden lg:flex items-center bg-[#0a0d14] border border-[#1e2638] rounded-lg px-2 h-7 focus-within:border-indigo-500 transition">
            <FileImage size={12} className="text-slate-500 mr-1.5" />
            <input
              type="text"
              value={sheetName}
              onChange={e => setSheetName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '_'))}
              placeholder="spritesheet"
              className="bg-transparent text-xs font-mono text-slate-100 w-24 focus:outline-none"
              title="Output filename for exported PNG and metadata"
            />
            <span className="text-[10px] font-mono text-slate-500">.png</span>
          </div>
        </div>

        {/* Viewport Zoom & Guide Controls */}
        <div className="flex items-center gap-1 bg-[#0a0d14] border border-[#1e2638] px-2 py-0.5 rounded-lg text-xs">
          <button
            onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
            className="w-6 h-6 rounded hover:bg-white/10 text-slate-300 flex items-center justify-center transition"
            title="Zoom Out"
          >
            <Minus size={12} />
          </button>
          <span className="font-mono text-slate-200 w-12 text-center text-[11px] font-semibold">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(4.0, z + 0.25))}
            className="w-6 h-6 rounded hover:bg-white/10 text-slate-300 flex items-center justify-center transition"
            title="Zoom In"
          >
            <Plus size={12} />
          </button>
          <button
            onClick={() => setZoom(1.0)}
            className="px-1.5 py-0.5 rounded hover:bg-white/10 text-slate-400 text-[10px] font-mono font-medium"
          >
            1:1
          </button>
          <div className="h-3 w-[1px] bg-[#1e2638] mx-1" />
          <button
            onClick={() => setShowBounds(!showBounds)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
              showBounds ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Sprite Bounding Boxes"
          >
            Bounds
          </button>
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
              showGrid ? 'bg-sky-500/25 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Canvas Grid Lines"
          >
            Grid
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw size={11} />}
            onClick={handleBlankWorkspace}
            title="Clear all sprites to start blank"
          >
            Blank
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<HelpCircle size={12} className="text-indigo-400" />}
            onClick={() => {
              setIsFirstVisit(false);
              setIsTutorialOpen(true);
            }}
            title="Open Stonecutter Walkthrough"
          >
            Tutorial
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Play size={11} className="text-indigo-400" />}
            onClick={() => setShowAnimDrawer(!showAnimDrawer)}
          >
            Animation Drawer
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<ImageIcon size={12} className="text-emerald-400" />}
            onClick={handleDownloadPNG}
            title={`Download ${sheetName || 'spritesheet'}.png directly (No ZIP)`}
          >
            Export PNG
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<FolderArchive size={12} className="text-amber-400" />}
            onClick={handleExportIndividualSpritesZip}
            title="Download all individual sprite frames as separate PNGs in a ZIP"
          >
            Sprites (ZIP)
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Download size={12} />}
            onClick={handleExportBundle}
            title={`Download complete ${activeProfile.name} bundle with metadata in a ZIP`}
          >
            {activeProfile.name} Bundle (.zip)
          </Button>
        </div>
      </div>

      {/* Main 2-Panel Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* LEFT ASSET TRAY (260px) */}
        <aside className="w-[260px] bg-[#0c101a] border-r border-[#1e2638] flex flex-col shrink-0 min-h-0">
          {/* Dropzone / Upload button */}
          <div className="p-3 border-b border-[#1e2638]">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png,image/webp,image/gif"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border border-dashed border-indigo-500/40 bg-indigo-950/20 hover:bg-indigo-950/30 p-3 text-center cursor-pointer transition group"
            >
              <div className="text-xs font-bold text-indigo-300 flex items-center justify-center gap-1.5 group-hover:scale-105 transition-transform">
                <Upload size={14} />
                <span>Drop PNG Sprites</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">or click to browse files</div>
            </div>
          </div>

          {/* List Header & Sorting Actions */}
          <div className="px-3 py-2 bg-[#0e121d] border-b border-[#1e2638] flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] flex items-center gap-1.5">
              <ImageIcon size={12} className="text-indigo-400" />
              <span>Frames ({sprites.length})</span>
            </span>

            {/* Quick Arrangement Actions */}
            <div className="flex items-center gap-1">
              {sprites.length > 1 && (
                <>
                  <button
                    onClick={() => sortSpritesByName(true)}
                    className="p-1 rounded bg-[#171c2b] hover:bg-[#20273c] text-slate-300 hover:text-white transition"
                    title="Sort Alphabetically A–Z"
                  >
                    <ArrowDownAZ size={12} />
                  </button>
                  <button
                    onClick={reverseSprites}
                    className="p-1 rounded bg-[#171c2b] hover:bg-[#20273c] text-slate-300 hover:text-white transition"
                    title="Reverse Order"
                  >
                    <ArrowUpDown size={12} />
                  </button>
                </>
              )}

              {sprites.length > 0 && (
                <button
                  onClick={handleExportIndividualSpritesZip}
                  className="p-1 rounded bg-[#171c2b] hover:bg-[#20273c] text-amber-300 hover:text-amber-200 transition"
                  title="Download All Sprites as ZIP"
                >
                  <FolderArchive size={12} />
                </button>
              )}

              <button
                onClick={() => {
                  createDemoKnightSprites().then(demoSprites => {
                    setSprites(demoSprites);
                    onToast('Loaded Hero Knight demo sequence!');
                  });
                }}
                className="text-[10px] text-indigo-300 hover:text-white font-medium flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20"
                title="Reset to 8-frame Hero Knight animation"
              >
                <Sparkles size={10} />
                <span>Demo</span>
              </button>

              {sprites.length > 0 && (
                <button
                  onClick={() => {
                    setSprites([]);
                    onToast('Cleared all sprites.');
                  }}
                  className="p-1 text-slate-500 hover:text-rose-400 transition"
                  title="Clear all"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Sprites List with Reordering */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sprites.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No sprites added yet. Drop PNG files or click Demo above.
              </div>
            ) : (
              sprites.map((sp, idx) => (
                <div
                  key={sp.id}
                  className="flex items-center gap-1.5 p-1.5 rounded-lg bg-[#121624] hover:bg-[#171c2b] border border-[#1e2638] text-slate-200 text-xs transition group"
                >
                  {/* Order Number Badge */}
                  <span className="font-mono text-[10px] text-slate-500 w-4 text-center shrink-0">
                    #{idx + 1}
                  </span>

                  <div className="w-8 h-8 rounded bg-[#0a0d14] checker-dark flex items-center justify-center border border-slate-700/80 shrink-0 overflow-hidden">
                    <img src={sp.img.src} alt={sp.name} className="max-w-full max-h-full pixelated" />
                  </div>

                  <div className="flex-1 min-w-0 pr-1">
                    <div className="font-medium truncate text-xs">{sp.name}</div>
                    <div className="font-mono text-[10px] text-slate-400">
                      {sp.width}×{sp.height} px
                      {sp.trimBounds?.trimmed && (
                        <span className="text-emerald-400 ml-1">
                          ({sp.trimBounds.w}×{sp.trimBounds.h})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Reordering & Action Controls */}
                  <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition shrink-0">
                    <button
                      onClick={() => moveSprite(idx, idx - 1)}
                      disabled={idx === 0}
                      className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
                      title="Move Up"
                    >
                      <ChevronUp size={11} />
                    </button>
                    <button
                      onClick={() => moveSprite(idx, idx + 1)}
                      disabled={idx === sprites.length - 1}
                      className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
                      title="Move Down"
                    >
                      <ChevronDown size={11} />
                    </button>
                    <button
                      onClick={() => moveToFront(idx)}
                      disabled={idx === 0}
                      className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-indigo-300 disabled:opacity-20 disabled:hover:bg-transparent"
                      title="Move to Front (1st Position)"
                    >
                      <ChevronsUp size={11} />
                    </button>
                    <button
                      onClick={() => handleDownloadSingleSprite(sp)}
                      className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-emerald-300 transition"
                      title={`Download "${sp.name}" PNG`}
                    >
                      <Download size={11} />
                    </button>
                    <button
                      onClick={() => {
                        setSprites(prev => prev.filter(s => s.id !== sp.id));
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400 transition"
                      title="Remove sprite"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* CENTER VIEWPORT (Spacious Canvas) */}
        <main className="flex-1 flex flex-col bg-[#080a0f] relative overflow-hidden items-center justify-center p-6">
          <div
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            className="checker-dark border border-[#2d3852] rounded shadow-2xl transition-transform duration-75 relative"
          >
            <canvas ref={canvasRef} className="block pixelated" />
          </div>

          {/* Floating Telemetry Badge */}
          <div className="absolute bottom-4 left-4 bg-[#0e111a]/95 backdrop-blur-md border border-[#1e2638] rounded-xl px-3.5 py-1.5 flex items-center gap-3 text-xs font-mono shadow-2xl">
            <span className="text-slate-400">
              Atlas: <strong className="text-white">{packerResult.width}×{packerResult.height} px</strong>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">
              Efficiency: <strong className="text-emerald-400">{(packerResult.efficiency * 100).toFixed(1)}%</strong>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">
              Bleed Extrude: <strong className="text-indigo-300">{config.extrude} px</strong>
            </span>
          </div>

          {/* Slide-Up Animation Drawer (Floating, no permanent screen clutter!) */}
          {showAnimDrawer && (
            <div className="absolute bottom-0 inset-x-0 bg-[#0e111a]/98 backdrop-blur-md border-t border-[#1e2638] p-3 shadow-2xl z-20 flex items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-[#141824] checker-dark border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                  <canvas ref={animCanvasRef} width={64} height={64} className="pixelated" />
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Live Animation Playback</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                      Frame {animFrameIdx + 1}/{sprites.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant={animPlaying ? 'secondary' : 'primary'}
                      size="sm"
                      icon={animPlaying ? <Pause size={11} /> : <Play size={11} />}
                      onClick={() => setAnimPlaying(!animPlaying)}
                    >
                      {animPlaying ? 'Pause' : 'Play'}
                    </Button>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-mono">Speed:</span>
                      <input
                        type="range"
                        min={1}
                        max={60}
                        value={animFps}
                        onChange={e => setAnimFps(Number(e.target.value))}
                        className="w-24 accent-indigo-500 cursor-pointer"
                      />
                      <span className="text-[11px] font-mono text-indigo-300 font-semibold w-10">
                        {animFps} FPS
                      </span>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      icon={isEncodingGif ? <Loader2 size={11} className="animate-spin text-indigo-400" /> : <Film size={11} className="text-indigo-400" />}
                      onClick={handleExportGif}
                      disabled={isEncodingGif || sprites.length === 0}
                      title="Encode and download animated GIF89a loop"
                    >
                      {isEncodingGif ? 'Recording...' : 'Export GIF'}
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Maximize2 size={11} />}
                      onClick={() => setShowGifModal(true)}
                      title="Open full GIF Studio with options & scrubber"
                    >
                      GIF Studio
                    </Button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowAnimDrawer(false)}
                className="w-7 h-7 rounded-lg bg-[#171c2b] hover:bg-[#20273c] text-slate-400 hover:text-white flex items-center justify-center text-xs transition"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </main>

        {/* RIGHT INSPECTOR (280px Focused Settings) */}
        <aside className="w-[280px] bg-[#0c101a] border-l border-[#1e2638] flex flex-col shrink-0 overflow-y-auto select-none">
          
          {/* Section 1: Everyday Essentials */}
          <div className="p-4 border-b border-[#1e2638] space-y-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sliders size={13} className="text-indigo-400" />
              <span>Essential Packing</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-medium">Packing Algorithm</label>
              <select
                value={config.algorithm}
                onChange={e => setConfig(prev => ({ ...prev, algorithm: e.target.value as any }))}
                className="w-full bg-[#121622] border border-[#1e2638] rounded-md px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
              >
                <option value="maxrects">MaxRects (Optimal Area)</option>
                <option value="grid">Grid / Fixed Columns</option>
                <option value="horizontal">Horizontal Strip (1 Row)</option>
                <option value="vertical">Vertical Strip (1 Col)</option>
              </select>
            </div>

            {/* Grid Manipulation Sub-Panel */}
            {config.algorithm === 'grid' && (
              <div className="p-2.5 rounded-lg bg-[#121624] border border-indigo-500/30 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs font-semibold text-indigo-300">
                  <span className="flex items-center gap-1.5">
                    <Grid size={12} />
                    <span>Grid Layout</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {config.gridCols}c × {Math.ceil(sprites.length / (config.gridCols || 1))}r
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span>Columns Count</span>
                    <span className="font-mono text-indigo-300 font-bold">{config.gridCols} cols</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={Math.max(8, sprites.length)}
                    value={config.gridCols}
                    onChange={e => setConfig(prev => ({ ...prev, gridCols: Math.max(1, Number(e.target.value)) }))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                <Toggle
                  label="Uniform Cell Size"
                  sublabel="Equal max W×H with sprite auto-centering"
                  checked={config.gridUniform}
                  onChange={chk => setConfig(prev => ({ ...prev, gridUniform: chk }))}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <NumberInput
                label="Padding"
                value={config.spacing}
                onChange={v => setConfig(prev => ({ ...prev, spacing: v }))}
                unit="px"
                min={0}
                max={64}
                tooltip="Pixel gap between adjacent sprites"
              />

              <NumberInput
                label="Border Extrude"
                value={config.extrude}
                onChange={v => setConfig(prev => ({ ...prev, extrude: v }))}
                unit="px"
                min={0}
                max={16}
                highlight={true}
                tooltip="Repeats edge pixels outward to eliminate subpixel texture filtering seams in Godot & Unity"
              />
            </div>

            {/* Trim Transparency Toggle */}
            <div className="pt-1">
              <Toggle
                label="Trim Transparency"
                sublabel="Crops empty alpha & preserves offsets"
                checked={config.trimTransparency}
                onChange={chk => setConfig(prev => ({ ...prev, trimTransparency: chk }))}
              />
            </div>
          </div>

          {/* Section 2: Collapsible "Advanced" Drawer */}
          <Accordion
            title="Advanced Packing Rules"
            icon={<Settings size={13} className="text-slate-500" />}
          >
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400">Packing Sort Order</label>
              <select
                value={config.sortOrder}
                onChange={e => setConfig(prev => ({ ...prev, sortOrder: e.target.value as any }))}
                className="w-full bg-[#121622] border border-[#1e2638] rounded-md px-2 py-1 text-xs text-slate-300 outline-none"
              >
                <option value="none">Manual / Tray Order (Preserve Sequence)</option>
                <option value="maxside">Max Side Descending (MaxRects Optimal)</option>
                <option value="area">Area Descending</option>
                <option value="name">Filename A–Z (Natural)</option>
                <option value="name_desc">Filename Z–A</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400">MaxRects Heuristic</label>
              <select
                value={config.heuristic}
                onChange={e => setConfig(prev => ({ ...prev, heuristic: e.target.value as any }))}
                className="w-full bg-[#121622] border border-[#1e2638] rounded-md px-2 py-1 text-xs text-slate-300 outline-none"
              >
                <option value="auto">Auto Best Fit</option>
                <option value="bssf">Best Short Side Fit (BSSF)</option>
                <option value="blsf">Best Long Side Fit (BLSF)</option>
                <option value="baf">Best Area Fit (BAF)</option>
              </select>
            </div>

            <div className="pt-1">
              <Toggle
                label="Power-of-Two (POT)"
                sublabel="128, 256, 512, 1024, 2048..."
                checked={config.powerOfTwo}
                onChange={chk => setConfig(prev => ({ ...prev, powerOfTwo: chk }))}
              />
            </div>

            <div className="pt-1">
              <Toggle
                label="Force Square"
                sublabel="Width equals Height (1:1)"
                checked={config.forceSquare}
                onChange={chk => setConfig(prev => ({ ...prev, forceSquare: chk }))}
              />
            </div>
          </Accordion>

          {/* Section 3: Engine-First Export Hub */}
          <div className="p-4 space-y-2.5 mt-auto border-t border-[#1e2638] bg-[#0e121d]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Export Settings</span>
              <span className="text-indigo-400 font-mono font-semibold">{activeProfile.name}</span>
            </div>

            {/* Custom Sheet Name Field */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-medium">Sheet Filename</label>
              <div className="flex items-center bg-[#121622] border border-[#1e2638] rounded-md px-2 h-7 focus-within:border-indigo-500 transition">
                <FileImage size={12} className="text-slate-500 mr-1.5 shrink-0" />
                <input
                  type="text"
                  value={sheetName}
                  onChange={e => setSheetName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '_'))}
                  placeholder="spritesheet"
                  className="w-full bg-transparent text-xs font-mono text-slate-100 outline-none"
                  title="Output filename for PNG and metadata"
                />
                <span className="text-[10px] font-mono text-slate-500 shrink-0">.png</span>
              </div>
            </div>

            {/* Direct PNG Export (No ZIP, immediate file drop!) */}
            <Button
              variant="primary"
              size="md"
              className="w-full !h-9 font-bold"
              icon={<Download size={13} />}
              onClick={handleDownloadPNG}
            >
              Export {sheetName || 'spritesheet'}.png
            </Button>

            {/* Full Engine ZIP Bundle Export */}
            <Button
              variant="secondary"
              size="sm"
              className="w-full text-xs"
              icon={<FolderArchive size={12} className="text-indigo-400" />}
              onClick={handleExportBundle}
              title={`Download ${sheetName || 'spritesheet'} + ${activeProfile.atlasFormat} in a .zip`}
            >
              Export {activeProfile.name} Bundle (.zip)
            </Button>
          </div>

        </aside>
      </div>

      {/* Hidden File Input for Reverse Slicer */}
      <input
        ref={slicerInputRef}
        type="file"
        accept="image/png,image/webp"
        className="hidden"
        onChange={handleSliceFileInput}
      />

      {/* Reverse Island Slicer Modal */}
      {showSlicerModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0e121d] border border-[#212b40] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#1e2638] flex items-center justify-between bg-[#121624]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Scissors size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Reverse Island Slicer</h3>
                  <p className="text-[11px] text-slate-400">
                    Auto-detect and extract individual sprite islands from a flat spritesheet
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSlicerModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            {detectedSlices ? (
              <div className="p-5 space-y-4 text-xs">
                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <Check size={16} className="text-emerald-400" />
                    <div>
                      <div className="font-bold text-white">
                        Extracted {detectedSlices.length} Sprite Islands
                      </div>
                      <div className="text-[11px] text-emerald-300/80">
                        From "{slicerSourceName}"
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setDetectedSlices(null)}
                    className="text-[11px] text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-[#161c2c] hover:bg-[#20283e] border border-slate-700/50 transition"
                  >
                    Slice Another
                  </button>
                </div>

                {/* Slices Thumbnail Grid */}
                <div className="max-h-56 overflow-y-auto p-2.5 rounded-xl bg-[#0a0d16] border border-[#1e2638] grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {detectedSlices.map((slice, i) => (
                    <div
                      key={slice.id}
                      className="flex flex-col items-center p-2 rounded-lg bg-[#111624] border border-[#1e2638]"
                    >
                      <div className="w-14 h-14 rounded bg-[#080b12] checker-dark border border-slate-700/60 flex items-center justify-center overflow-hidden mb-1.5 shadow-inner">
                        <img
                          src={slice.canvas.toDataURL()}
                          alt={slice.name}
                          className="max-w-full max-h-full pixelated"
                        />
                      </div>
                      <span className="font-mono text-[10px] text-slate-300 truncate w-full text-center font-medium">
                        #{i + 1}
                      </span>
                      <span className="font-mono text-[9px] text-indigo-400">
                        {slice.width}×{slice.height} px
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-[#111624] rounded-xl border border-[#1e2638] space-y-2">
                  <div className="text-[11px] font-semibold text-slate-300">Choose What To Do Next:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="justify-center text-xs"
                      icon={<FolderArchive size={12} />}
                      onClick={handleDownloadSlicedZip}
                      title="Download each sliced sprite island as an individual PNG inside a ZIP"
                    >
                      Download ZIP
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="justify-center text-xs"
                      icon={<TableCellsMerge size={12} />}
                      onClick={handleImportSlicesToPacker}
                      title="Import all sliced sprites into the Stonecutter Atlas Packer"
                    >
                      Open in Packer
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="justify-center text-xs"
                      icon={<Download size={12} />}
                      onClick={handleImportAndDownloadBoth}
                      title="Download the ZIP and also open them in the Atlas Packer"
                    >
                      Do Both
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4 text-xs">
                {/* Drop / Upload Zone */}
                <div
                  onClick={() => slicerInputRef.current?.click()}
                  className="border-2 border-dashed border-[#242f47] hover:border-indigo-500/60 rounded-xl p-6 bg-[#0a0d16] hover:bg-[#0d111c] cursor-pointer flex flex-col items-center justify-center text-center transition group space-y-2"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                    <Upload size={18} />
                  </div>
                  <div>
                    <span className="font-bold text-white text-sm">Click to upload flat spritesheet</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">PNG or WebP with transparent background</p>
                  </div>
                </div>

                {/* Threshold & Min Size Settings */}
                <div className="grid grid-cols-2 gap-3 bg-[#0a0d16] border border-[#1e2638] rounded-xl p-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-300">
                      <span>Alpha Cutoff</span>
                      <span className="font-mono text-indigo-400">{slicerThreshold} / 255</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={100}
                      value={slicerThreshold}
                      onChange={e => setSlicerThreshold(Number(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-500">Pixels with alpha ≥ this value are counted</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-300">
                      <span>Min Island Size</span>
                      <span className="font-mono text-indigo-400">{slicerMinSize} px</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={32}
                      value={slicerMinSize}
                      onChange={e => setSlicerMinSize(Number(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-500">Filters out stray 1-pixel artifacts</p>
                  </div>
                </div>

                {/* Demo Slicing Option */}
                <div className="flex items-center justify-between bg-[#121624] border border-[#1e2638] rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-400" />
                    <span className="text-slate-300">Want to test without a file?</span>
                  </div>
                  <button
                    onClick={handleSliceDemo}
                    disabled={isSlicing}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition"
                  >
                    ⚡ Slice Demo Sheet (6 Sprites)
                  </button>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[#1e2638] bg-[#0c0f18] flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowSlicerModal(false)}
              >
                {detectedSlices ? 'Close' : 'Cancel'}
              </Button>
              {!detectedSlices && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Upload size={12} />}
                  onClick={() => slicerInputRef.current?.click()}
                  disabled={isSlicing}
                >
                  {isSlicing ? 'Analyzing Pixels...' : 'Choose File to Slice'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GIF Studio Modal */}
      {showGifModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0e121d] border border-[#212b40] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#1e2638] flex items-center justify-between bg-[#121624]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Film size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>GIF Studio</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                      GIF89a LZW
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Record pure client-side animated GIFs with transparent background or solid matte
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGifModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5">
              {sprites.length === 0 ? (
                <div className="p-8 text-center space-y-3 bg-[#0a0d16] rounded-xl border border-[#1e2638]">
                  <Film size={28} className="mx-auto text-slate-600" />
                  <div className="text-sm font-semibold text-slate-300">No Sprite Frames Loaded</div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Load multi-frame sprites or slice a sheet first to record an animated GIF loop.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Sparkles size={12} />}
                    onClick={() => {
                      createDemoKnightSprites().then(demoSprites => {
                        setSprites(demoSprites);
                        onToast('Loaded Hero Knight demo sequence!');
                      });
                    }}
                  >
                    ⚡ Load Hero Knight Demo Frames
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Left: Interactive Canvas Preview & Scrubber */}
                  <div className="space-y-3 flex flex-col items-center">
                    <div className="w-full aspect-square max-w-[240px] rounded-xl bg-[#090b12] checker-dark border border-slate-700/80 flex items-center justify-center p-3 overflow-hidden shadow-inner relative">
                      <canvas
                        ref={gifCanvasRef}
                        className="pixelated max-w-full max-h-full object-contain"
                        style={{
                          transform: 'scale(1.5)',
                          imageRendering: 'pixelated'
                        }}
                      />
                      <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[10px] font-mono bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-slate-300">
                        <span>Frame {gifFrameIdx + 1}/{sprites.length}</span>
                        <span className="text-indigo-300">{Math.round(1000 / gifFps)} ms</span>
                      </div>
                    </div>

                    {/* Transport Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setGifFrameIdx(0)}
                        className="p-1.5 rounded bg-[#171c2b] hover:bg-[#20273c] text-slate-300 hover:text-white transition"
                        title="First Frame"
                      >
                        <SkipBack size={13} />
                      </button>
                      <button
                        onClick={() => setGifFrameIdx(prev => (prev - 1 + sprites.length) % sprites.length)}
                        className="p-1.5 rounded bg-[#171c2b] hover:bg-[#20273c] text-slate-300 hover:text-white transition"
                        title="Previous Frame"
                      >
                        <ChevronDown size={13} className="rotate-90" />
                      </button>
                      <Button
                        variant={gifPlaying ? 'secondary' : 'primary'}
                        size="sm"
                        icon={gifPlaying ? <Pause size={12} /> : <Play size={12} />}
                        onClick={() => setGifPlaying(!gifPlaying)}
                      >
                        {gifPlaying ? 'Pause' : 'Play'}
                      </Button>
                      <button
                        onClick={() => setGifFrameIdx(prev => (prev + 1) % sprites.length)}
                        className="p-1.5 rounded bg-[#171c2b] hover:bg-[#20273c] text-slate-300 hover:text-white transition"
                        title="Next Frame"
                      >
                        <ChevronDown size={13} className="-rotate-90" />
                      </button>
                      <button
                        onClick={() => setGifFrameIdx(sprites.length - 1)}
                        className="p-1.5 rounded bg-[#171c2b] hover:bg-[#20273c] text-slate-300 hover:text-white transition"
                        title="Last Frame"
                      >
                        <SkipForward size={13} />
                      </button>
                    </div>

                    {/* Scrubber slider */}
                    <div className="w-full max-w-[240px] space-y-1">
                      <input
                        type="range"
                        min={0}
                        max={sprites.length - 1}
                        value={gifFrameIdx}
                        onChange={e => {
                          setGifPlaying(false);
                          setGifFrameIdx(Number(e.target.value));
                        }}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Right: Studio Settings & Export Actions */}
                  <div className="space-y-4 flex flex-col justify-between">
                    <div className="space-y-3.5 bg-[#0a0d16] border border-[#1e2638] rounded-xl p-3.5">
                      {/* FPS Speed Slider */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-300 font-medium">Animation Speed</span>
                          <span className="font-mono text-indigo-400 font-bold">{gifFps} FPS</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={30}
                          value={gifFps}
                          onChange={e => setGifFps(Number(e.target.value))}
                          className="w-full accent-indigo-500 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>Slow (1 FPS)</span>
                          <span>Fast (30 FPS)</span>
                        </div>
                      </div>

                      {/* Transparency Toggle */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#1e2638]">
                        <div>
                          <div className="text-xs font-medium text-slate-200">Transparent Background</div>
                          <div className="text-[10px] text-slate-500">Preserves PNG alpha channels in GIF89a</div>
                        </div>
                        <Toggle
                          checked={gifTransparent}
                          onChange={setGifTransparent}
                        />
                      </div>

                      {/* Dimensions info */}
                      <div className="pt-2 border-t border-[#1e2638] flex justify-between text-xs text-slate-400">
                        <span>Max Resolution:</span>
                        <span className="font-mono text-slate-200">
                          {Math.max(...sprites.map(s => s.width), 0)} × {Math.max(...sprites.map(s => s.height), 0)} px
                        </span>
                      </div>

                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Total Frames:</span>
                        <span className="font-mono text-indigo-300 font-bold">{sprites.length} frames</span>
                      </div>
                    </div>

                    {/* Export Actions */}
                    <div className="space-y-2">
                      <Button
                        variant="primary"
                        className="w-full justify-center"
                        icon={isEncodingGif ? <Loader2 size={13} className="animate-spin" /> : <Film size={13} />}
                        onClick={handleExportGif}
                        disabled={isEncodingGif || sprites.length === 0}
                      >
                        {isEncodingGif ? 'Encoding GIF89a...' : 'Download Animated GIF (.gif)'}
                      </Button>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full justify-center text-[11px]"
                          icon={<ImageIcon size={11} />}
                          onClick={handleExportSpriteStrip}
                          disabled={sprites.length === 0}
                          title="Export continuous horizontal strip PNG"
                        >
                          Sprite Strip PNG
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full justify-center text-[11px]"
                          icon={<FolderArchive size={11} />}
                          onClick={handleExportIndividualSpritesZip}
                          disabled={sprites.length === 0}
                          title="Download all frames as individual PNG files in ZIP"
                        >
                          Frames (ZIP)
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[#1e2638] bg-[#0c0f18] flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5 font-mono">
                <Sparkles size={11} className="text-amber-400" />
                <span>100% Client-Side In-Memory Encoding</span>
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowGifModal(false)}
              >
                Close Studio
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Walkthrough Modal */}
      <WorkstationTutorialModal
        tutorial={WORKSTATION_TUTORIALS.stonecutter}
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        isFirstVisitPrompt={isFirstVisit}
      />

    </div>
  );
};
