import React, { useState, useEffect, useRef } from 'react';
import { TargetEngine, ENGINE_PROFILES } from '../types/engine';
import {
  ParticleConfig,
  ActiveParticle,
  ParticleShape,
  BlendMode,
  DEFAULT_PARTICLE_CONFIG,
  getParticlePreset,
  spawnParticle,
  updateParticles,
  renderParticles,
  generateGodotParticleCode,
  generateUnityParticleCode
} from '../core/sparkbox/particles';
import { createZipArchive, ZipFileEntry } from '../core/stonecutter/zip';
import { Button } from '../components/ui/Button';
import { NumberInput } from '../components/ui/NumberInput';
import { Accordion } from '../components/ui/Accordion';
import { WorkstationTutorialModal } from '../components/ui/WorkstationTutorialModal';
import { WORKSTATION_TUTORIALS } from '../core/tutorial/tutorialData';
import {
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Copy,
  Check,
  Code2,
  Download,
  Flame,
  Zap,
  Layers,
  Circle,
  Square,
  Asterisk,
  Disc,
  HelpCircle
} from 'lucide-react';

interface SparkboxPageProps {
  engine: TargetEngine;
  onToast: (msg: string) => void;
}

export const SparkboxPage: React.FC<SparkboxPageProps> = ({
  engine,
  onToast
}) => {
  const [config, setConfig] = useState<ParticleConfig>(DEFAULT_PARTICLE_CONFIG);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [emitterPos, setEmitterPos] = useState<{ x: number; y: number }>({ x: 260, y: 240 });
  const [activeCount, setActiveCount] = useState<number>(0);
  const [codeTab, setCodeTab] = useState<'godot' | 'unity'>(
    engine === 'unity' ? 'unity' : 'godot'
  );
  const [copied, setCopied] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<ActiveParticle[]>([]);
  const lastTimeRef = useRef<number | null>(null);
  const spawnTimerRef = useRef<number>(0);
  const isDraggingEmitterRef = useRef<boolean>(false);

  // Sync engine tab
  useEffect(() => {
    if (engine === 'unity') setCodeTab('unity');
    else setCodeTab('godot');
  }, [engine]);

  // Center emitter on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      setEmitterPos({ x: canvas.width / 2, y: canvas.height * 0.65 });
    }
  }, []);

  // First-visit tutorial state
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('rgds_tutorial_sparkbox_dismissed');
      if (!dismissed) {
        setIsTutorialOpen(true);
        setIsFirstVisit(true);
      }
    } catch {}
  }, []);

  const handleBlankWorkspace = () => {
    particlesRef.current = [];
    setConfig({
      name: 'blank_emitter',
      emitterType: 'continuous',
      emissionRate: 20,
      burstCount: 20,
      lifetimeMin: 0.5,
      lifetimeMax: 1.0,
      speedMin: 50,
      speedMax: 100,
      directionAngle: 270,
      spreadAngle: 30,
      gravityX: 0,
      gravityY: 0,
      drag: 0,
      radialAccel: 0,
      startSize: 6,
      endSize: 0,
      shape: 'circle',
      blendMode: 'normal',
      colorStart: '#ffffff',
      alphaStart: 1.0,
      colorMid: '#ffffff',
      alphaMid: 0.5,
      colorEnd: '#ffffff',
      alphaEnd: 0.0
    });
    onToast('Particle simulator reset to blank state.');
  };

  // Trigger Burst
  const triggerBurst = () => {
    const newParticles: ActiveParticle[] = [];
    const count = config.emitterType === 'burst' ? config.burstCount : 40;
    for (let i = 0; i < count; i++) {
      newParticles.push(spawnParticle(emitterPos.x, emitterPos.y, config));
    }
    particlesRef.current.push(...newParticles);
    onToast(`Spawned burst of ${count} particles!`);
  };

  // Keyboard shortcut: Spacebar to trigger burst
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        triggerBurst();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [emitterPos, config]);

  // Main 60 FPS Particle Simulation Loop
  useEffect(() => {
    let animId: number;

    const tick = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }
      const delta = Math.min(0.1, (timestamp - lastTimeRef.current) / 1000);
      lastTimeRef.current = timestamp;

      const canvas = canvasRef.current;
      if (canvas && isPlaying) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Clear with dark stage color
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Continuous Emission
          if (config.emitterType === 'continuous' && config.emissionRate > 0) {
            spawnTimerRef.current += delta;
            const spawnInterval = 1.0 / config.emissionRate;
            while (spawnTimerRef.current >= spawnInterval) {
              particlesRef.current.push(spawnParticle(emitterPos.x, emitterPos.y, config));
              spawnTimerRef.current -= spawnInterval;
            }
          }

          // Update physics
          particlesRef.current = updateParticles(
            particlesRef.current,
            config,
            delta,
            emitterPos.x,
            emitterPos.y
          );

          // Render particles
          renderParticles(ctx, particlesRef.current, config);

          // Render emitter crosshair gizmo
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(emitterPos.x, emitterPos.y, 6, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = config.colorStart;
          ctx.beginPath();
          ctx.arc(emitterPos.x, emitterPos.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          setActiveCount(particlesRef.current.length);
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, config, emitterPos]);

  // Canvas Mouse Interactions for moving Emitter
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingEmitterRef.current = true;
    updateEmitterFromMouse(e);
    if (config.emitterType === 'burst') {
      triggerBurst();
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingEmitterRef.current) return;
    updateEmitterFromMouse(e);
  };

  const handleCanvasMouseUp = () => {
    isDraggingEmitterRef.current = false;
  };

  const updateEmitterFromMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setEmitterPos({
      x: Math.round(x),
      y: Math.round(y)
    });
  };

  // Load Preset
  const handleLoadPreset = (preset: 'flame' | 'explosion' | 'magic_trail' | 'coin_pickup' | 'blood_splatter' | 'smoke') => {
    particlesRef.current = [];
    const p = getParticlePreset(preset);
    setConfig(p);

    const canvas = canvasRef.current;
    if (canvas) {
      if (preset === 'flame' || preset === 'smoke') {
        setEmitterPos({ x: canvas.width / 2, y: canvas.height * 0.75 });
      } else {
        setEmitterPos({ x: canvas.width / 2, y: canvas.height / 2 });
      }
    }

    if (p.emitterType === 'burst') {
      setTimeout(() => triggerBurst(), 50);
    }
    onToast(`Loaded preset: ${p.name}`);
  };

  // Export 1-Click Game Jam Bundle (.zip)
  const handleExportZip = async () => {
    const godotCode = generateGodotParticleCode(config);
    const unityCode = generateUnityParticleCode(config);

    const files: ZipFileEntry[] = [
      { name: `${config.name}_godot.gd`, data: godotCode },
      { name: `${config.name}VFX.cs`, data: unityCode }
    ];

    const zipBlob = await createZipArchive(files);
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name}_vfx_bundle.zip`;
    a.click();
    URL.revokeObjectURL(url);
    onToast(`Exported ${config.name}_vfx_bundle.zip!`);
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    onToast('Copied particle snippet!');
    setTimeout(() => setCopied(false), 2000);
  };

  const generatedCode = codeTab === 'godot'
    ? generateGodotParticleCode(config)
    : generateUnityParticleCode(config);

  const activeProfile = ENGINE_PROFILES[engine];

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#080a0f] select-none">
      
      {/* Sparkbox Sub-Header */}
      <div className="h-11 bg-[#101420] border-b border-[#1e2638] px-4 flex items-center justify-between shrink-0 z-20">
        
        {/* Left: Jam Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mr-1 flex items-center gap-1">
            <Sparkles size={12} /> Presets:
          </span>

          <button
            onClick={() => handleLoadPreset('flame')}
            className={`px-2 py-1 rounded-md text-xs font-semibold border transition ${
              config.name === 'campfire_flame'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-[#141824] hover:bg-[#1f2638] text-slate-300 border-[#1e2638]'
            }`}
          >
            🔥 Campfire
          </button>
          <button
            onClick={() => handleLoadPreset('explosion')}
            className={`px-2 py-1 rounded-md text-xs font-semibold border transition ${
              config.name === 'grenade_explosion'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-[#141824] hover:bg-[#1f2638] text-slate-300 border-[#1e2638]'
            }`}
          >
            💥 Explosion
          </button>
          <button
            onClick={() => handleLoadPreset('magic_trail')}
            className={`px-2 py-1 rounded-md text-xs font-semibold border transition ${
              config.name === 'fairy_sparkles'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-[#141824] hover:bg-[#1f2638] text-slate-300 border-[#1e2638]'
            }`}
          >
            ✨ Magic Dust
          </button>
          <button
            onClick={() => handleLoadPreset('coin_pickup')}
            className={`px-2 py-1 rounded-md text-xs font-semibold border transition ${
              config.name === 'gold_coin_burst'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-[#141824] hover:bg-[#1f2638] text-slate-300 border-[#1e2638]'
            }`}
          >
            🪙 Coin Burst
          </button>
          <button
            onClick={() => handleLoadPreset('blood_splatter')}
            className={`px-2 py-1 rounded-md text-xs font-semibold border transition ${
              config.name === 'impact_splatter'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-[#141824] hover:bg-[#1f2638] text-slate-300 border-[#1e2638]'
            }`}
          >
            🩸 Blood Splatter
          </button>
          <button
            onClick={() => handleLoadPreset('smoke')}
            className={`px-2 py-1 rounded-md text-xs font-semibold border transition ${
              config.name === 'smoke_plume'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-[#141824] hover:bg-[#1f2638] text-slate-300 border-[#1e2638]'
            }`}
          >
            💨 Smoke
          </button>
        </div>

        {/* Right: Simulation Controls */}
        <div className="flex items-center gap-2">
          {/* Trigger Burst Button */}
          <Button
            variant="primary"
            size="sm"
            icon={<Zap size={12} className="text-amber-300" />}
            onClick={triggerBurst}
            className="!bg-amber-600 hover:!bg-amber-500 !border-amber-400/30 text-white font-bold"
            title="Trigger particle burst (Spacebar)"
          >
            Trigger Burst
          </Button>

          {/* Play / Pause Button */}
          <Button
            variant="secondary"
            size="sm"
            icon={isPlaying ? <Pause size={12} /> : <Play size={12} className="text-emerald-400" />}
            onClick={() => setIsPlaying(p => !p)}
            title="Play / Pause simulation"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </Button>

          {/* Clear Button */}
          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw size={12} />}
            onClick={() => {
              particlesRef.current = [];
              setActiveCount(0);
            }}
            title="Clear all active particles"
          >
            Clear
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw size={11} />}
            onClick={handleBlankWorkspace}
            title="Reset particle simulator to blank state"
          >
            Blank
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<HelpCircle size={12} className="text-amber-400" />}
            onClick={() => {
              setIsFirstVisit(false);
              setIsTutorialOpen(true);
            }}
            title="Open Sparkbox Walkthrough"
          >
            Tutorial
          </Button>
        </div>
      </div>

      {/* Main 3-Panel Workstation Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* LEFT PANEL: EMITTER & PHYSICS INSPECTOR (310px) */}
        <aside className="w-[310px] bg-[#0c101a] border-r border-[#1e2638] flex flex-col shrink-0 min-h-0 overflow-y-auto">
          
          {/* Header */}
          <div className="p-3 bg-[#0e121d] border-b border-[#1e2638] flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sliders size={13} className="text-amber-400" />
              <span>Particle Properties</span>
            </span>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">
              {config.blendMode.toUpperCase()}
            </span>
          </div>

          {/* Emission Mode Toggle */}
          <div className="p-3 border-b border-[#1e2638] space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Emitter Mode
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setConfig(prev => ({ ...prev, emitterType: 'continuous' }))}
                className={`py-1 rounded text-xs font-semibold border transition ${
                  config.emitterType === 'continuous'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-[#121622] text-slate-400 hover:text-white border-[#1e2638]'
                }`}
              >
                Continuous Stream
              </button>
              <button
                onClick={() => setConfig(prev => ({ ...prev, emitterType: 'burst' }))}
                className={`py-1 rounded text-xs font-semibold border transition ${
                  config.emitterType === 'burst'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-[#121622] text-slate-400 hover:text-white border-[#1e2638]'
                }`}
              >
                One-Shot Burst
              </button>
            </div>

            {config.emitterType === 'continuous' ? (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Emission Rate</span>
                  <span className="font-mono text-amber-400">{config.emissionRate} / sec</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={250}
                  step={5}
                  value={config.emissionRate}
                  onChange={e => setConfig(prev => ({ ...prev, emissionRate: Number(e.target.value) }))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            ) : (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Burst Particle Count</span>
                  <span className="font-mono text-amber-400">{config.burstCount}</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={200}
                  step={5}
                  value={config.burstCount}
                  onChange={e => setConfig(prev => ({ ...prev, burstCount: Number(e.target.value) }))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Velocity, Angle & Cone Spread */}
          <div className="p-3 border-b border-[#1e2638] space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Trajectory &amp; Cone Angle
            </span>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Direction Angle</span>
                <span className="font-mono text-amber-400">{config.directionAngle}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                step={5}
                value={config.directionAngle}
                onChange={e => setConfig(prev => ({ ...prev, directionAngle: Number(e.target.value) }))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Cone Spread Angle</span>
                <span className="font-mono text-amber-400">{config.spreadAngle}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                step={5}
                value={config.spreadAngle}
                onChange={e => setConfig(prev => ({ ...prev, spreadAngle: Number(e.target.value) }))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <NumberInput
                label="Speed Min"
                value={config.speedMin}
                onChange={v => setConfig(prev => ({ ...prev, speedMin: v }))}
                unit="px/s"
                step={10}
                min={0}
                max={600}
              />
              <NumberInput
                label="Speed Max"
                value={config.speedMax}
                onChange={v => setConfig(prev => ({ ...prev, speedMax: v }))}
                unit="px/s"
                step={10}
                min={0}
                max={800}
              />
            </div>
          </div>

          {/* Physics Forces (Gravity & Drag) */}
          <div className="p-3 border-b border-[#1e2638] space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Physics &amp; Forces
            </span>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Gravity Y (Downward)</span>
                <span className="font-mono text-amber-400">{config.gravityY} px/s²</span>
              </div>
              <input
                type="range"
                min={-150}
                max={400}
                step={10}
                value={config.gravityY}
                onChange={e => setConfig(prev => ({ ...prev, gravityY: Number(e.target.value) }))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Radial Acceleration</span>
                <span className="font-mono text-amber-400">{config.radialAccel} px/s²</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                step={5}
                value={config.radialAccel}
                onChange={e => setConfig(prev => ({ ...prev, radialAccel: Number(e.target.value) }))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Appearance & Color Gradient */}
          <div className="p-3 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Appearance &amp; Shading
            </span>

            {/* Shape Selector */}
            <div className="grid grid-cols-4 gap-1">
              {(
                [
                  { id: 'circle', name: 'Circle', icon: <Circle size={12} /> },
                  { id: 'spark', name: 'Spark', icon: <Asterisk size={12} /> },
                  { id: 'square', name: 'Square', icon: <Square size={12} /> },
                  { id: 'ring', name: 'Ring', icon: <Disc size={12} /> }
                ] as const
              ).map(s => (
                <button
                  key={s.id}
                  onClick={() => setConfig(prev => ({ ...prev, shape: s.id }))}
                  className={`py-1 rounded text-[11px] font-semibold border flex items-center justify-center gap-1 transition ${
                    config.shape === s.id
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                      : 'bg-[#121622] text-slate-400 hover:text-white border-[#1e2638]'
                  }`}
                >
                  {s.icon}
                  <span>{s.name}</span>
                </button>
              ))}
            </div>

            {/* Blend Mode */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                onClick={() => setConfig(prev => ({ ...prev, blendMode: 'additive' }))}
                className={`py-1 rounded text-xs font-semibold border transition ${
                  config.blendMode === 'additive'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-[#121622] text-slate-400 hover:text-white border-[#1e2638]'
                }`}
              >
                Additive (Glow)
              </button>
              <button
                onClick={() => setConfig(prev => ({ ...prev, blendMode: 'normal' }))}
                className={`py-1 rounded text-xs font-semibold border transition ${
                  config.blendMode === 'normal'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-[#121622] text-slate-400 hover:text-white border-[#1e2638]'
                }`}
              >
                Normal (Alpha)
              </button>
            </div>

            {/* Color Gradient Pickers */}
            <div className="grid grid-cols-3 gap-2 text-xs pt-1">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Start</label>
                <div className="flex items-center bg-[#121622] border border-[#1e2638] rounded-md px-1.5 h-7 gap-1.5">
                  <input
                    type="color"
                    value={config.colorStart}
                    onChange={e => setConfig(prev => ({ ...prev, colorStart: e.target.value }))}
                    className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="font-mono text-[10px] text-slate-200 truncate">{config.colorStart}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Mid</label>
                <div className="flex items-center bg-[#121622] border border-[#1e2638] rounded-md px-1.5 h-7 gap-1.5">
                  <input
                    type="color"
                    value={config.colorMid}
                    onChange={e => setConfig(prev => ({ ...prev, colorMid: e.target.value }))}
                    className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="font-mono text-[10px] text-slate-200 truncate">{config.colorMid}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">End</label>
                <div className="flex items-center bg-[#121622] border border-[#1e2638] rounded-md px-1.5 h-7 gap-1.5">
                  <input
                    type="color"
                    value={config.colorEnd}
                    onChange={e => setConfig(prev => ({ ...prev, colorEnd: e.target.value }))}
                    className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="font-mono text-[10px] text-slate-200 truncate">{config.colorEnd}</span>
                </div>
              </div>
            </div>

            {/* Size Ramp */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <NumberInput
                label="Start Size"
                value={config.startSize}
                onChange={v => setConfig(prev => ({ ...prev, startSize: Math.max(1, v) }))}
                unit="px"
                step={1}
                min={1}
                max={50}
              />
              <NumberInput
                label="End Size"
                value={config.endSize}
                onChange={v => setConfig(prev => ({ ...prev, endSize: Math.max(0, v) }))}
                unit="px"
                step={1}
                min={0}
                max={50}
              />
            </div>
          </div>

        </aside>

        {/* CENTER STAGE: PARTICLE SIMULATION CANVAS */}
        <main className="flex-1 flex flex-col bg-[#07090f] relative overflow-hidden select-none">
          
          {/* Top Bar Telemetry */}
          <div className="h-10 border-b border-[#1e2638] bg-[#0c101a] px-4 flex items-center justify-between text-xs font-mono text-slate-400">
            <div className="flex items-center gap-3">
              <span>Effect: <strong className="text-white">{config.name}</strong></span>
              <span>•</span>
              <span>Active Particles: <strong className="text-amber-400">{activeCount}</strong></span>
              <span>•</span>
              <span>Emitter: <strong className="text-slate-300">({emitterPos.x}, {emitterPos.y})</strong></span>
            </div>
            <div className="text-[11px] text-slate-500">
              Click &amp; drag cursor on canvas to guide emitter position
            </div>
          </div>

          {/* Canvas Viewport */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-[#07090e]">
            {/* Grid Backdrop */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: `
                  linear-gradient(to right, #1e2638 1px, transparent 1px),
                  linear-gradient(to bottom, #1e2638 1px, transparent 1px)
                `,
                backgroundSize: '32px 32px',
                backgroundPosition: 'center center'
              }}
            />

            <canvas
              ref={canvasRef}
              width={560}
              height={440}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              className="rounded-xl border border-[#1e2638] bg-[#090c14] shadow-2xl block cursor-crosshair"
            />
          </div>

        </main>

        {/* RIGHT PANEL: CODE GENERATOR & EXPORT HUB (310px) */}
        <aside className="w-[310px] bg-[#0c101a] border-l border-[#1e2638] flex flex-col shrink-0 min-h-0 overflow-y-auto">
          
          {/* Header */}
          <div className="p-3 bg-[#0e121d] border-b border-[#1e2638] flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Code2 size={13} className="text-amber-400" />
              <span>Engine Particle Code</span>
            </span>

            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">
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
                    ? 'bg-amber-500/20 text-amber-300 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Godot 4 CPUParticles2D
              </button>
              <button
                onClick={() => setCodeTab('unity')}
                className={`flex-1 py-1 rounded font-semibold transition ${
                  codeTab === 'unity'
                    ? 'bg-amber-500/20 text-amber-300 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Unity ParticleSystem
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
                VFX Asset Name
              </label>
              <input
                type="text"
                value={config.name}
                onChange={e => setConfig(prev => ({ ...prev, name: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '_') }))}
                className="w-full bg-[#121622] border border-[#1e2638] rounded-md px-2.5 h-7 text-xs font-mono text-white outline-none focus:border-amber-500"
              />
            </div>

            <Button
              variant="primary"
              size="md"
              className="w-full !h-9 !bg-amber-600 hover:!bg-amber-500 !border-amber-400/30 text-white font-bold"
              icon={<Download size={13} />}
              onClick={handleExportZip}
            >
              Export {config.name}_vfx_bundle.zip
            </Button>
          </div>

        </aside>

      </div>

      {/* Tutorial Walkthrough Modal */}
      <WorkstationTutorialModal
        tutorial={WORKSTATION_TUTORIALS.sparkbox}
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        isFirstVisitPrompt={isFirstVisit}
      />

    </div>
  );
};
