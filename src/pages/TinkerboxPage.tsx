import React, { useState, useEffect, useRef } from 'react';
import { TargetEngine, ENGINE_PROFILES } from '../types/engine';
import {
  TweenConfig,
  TransitionType,
  EaseDirection,
  SequenceStep,
  DEFAULT_TWEEN_CONFIG,
  DEFAULT_SEQUENCE_STEPS,
  evaluateEasing,
  sampleTrajectory,
  TrajectoryPoint
} from '../core/tinkerbox/easing';
import {
  TWEEN_PROPERTY_PRESETS,
  TweenPropertyTarget,
  generateGodotCode,
  generateDOTweenCode,
  generateLeanTweenCode,
  generateVanillaUnityCode,
  generateCssCode,
  generateGodotSequenceCode,
  generateDOTweenSequenceCode
} from '../core/tinkerbox/codegen';
import { Button } from '../components/ui/Button';
import { NumberInput } from '../components/ui/NumberInput';
import { Accordion } from '../components/ui/Accordion';
import { WorkstationTutorialModal } from '../components/ui/WorkstationTutorialModal';
import { WORKSTATION_TUTORIALS } from '../core/tutorial/tutorialData';
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Copy,
  Check,
  Code2,
  Sliders,
  Repeat,
  Zap,
  Eye,
  Layers,
  Move,
  Maximize2,
  Plus,
  Trash2,
  Film,
  HelpCircle
} from 'lucide-react';

interface TinkerboxPageProps {
  engine: TargetEngine;
  onToast: (msg: string) => void;
}

type ActorShape = 'knight' | 'gem' | 'box' | 'star' | 'orb';

export const TinkerboxPage: React.FC<TinkerboxPageProps> = ({
  engine,
  onToast
}) => {
  const [workbenchMode, setWorkbenchMode] = useState<'single' | 'sequence'>('single');
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>(DEFAULT_SEQUENCE_STEPS);
  const [config, setConfig] = useState<TweenConfig>(DEFAULT_TWEEN_CONFIG);
  const [activeTarget, setActiveTarget] = useState<TweenPropertyTarget>(TWEEN_PROPERTY_PRESETS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0); // 0 to duration
  const [actorShape, setActorShape] = useState<ActorShape>('knight');
  const [codeTab, setCodeTab] = useState<'godot' | 'dotween' | 'leantween' | 'vanilla' | 'css'>(
    engine === 'godot' ? 'godot' : 'dotween'
  );
  const [copied, setCopied] = useState<boolean>(false);
  const [showVelocity, setShowVelocity] = useState<boolean>(false);
  const [showOnionSkin, setShowOnionSkin] = useState<boolean>(true);

  // Motion channel switches
  const [enableY, setEnableY] = useState<boolean>(true);
  const [enableX, setEnableX] = useState<boolean>(false);
  const [enableScale, setEnableScale] = useState<boolean>(true);
  const [enableRotation, setEnableRotation] = useState<boolean>(false);
  const [enableAlpha, setEnableAlpha] = useState<boolean>(false);

  // Sync tab with global engine profile when engine prop changes
  useEffect(() => {
    if (engine === 'godot') setCodeTab('godot');
    else if (engine === 'unity') setCodeTab('dotween');
  }, [engine]);

  // First-visit tutorial state
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('rgds_tutorial_tinkerbox_dismissed');
      if (!dismissed) {
        setIsTutorialOpen(true);
        setIsFirstVisit(true);
      }
    } catch {}
  }, []);

  const handleBlankWorkspace = () => {
    setSequenceSteps([
      {
        id: 'step_default',
        label: 'Default Step',
        property: 'position:y',
        startValue: 0,
        endValue: 0,
        duration: 0.5,
        transition: 'linear',
        direction: 'in'
      }
    ]);
    setConfig(DEFAULT_TWEEN_CONFIG);
    setCurrentTime(0);
    setIsPlaying(false);
    onToast('Tinkerbox reset to blank linear motion state.');
  };

  // Curve canvas reference
  const curveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingP1 = useRef<boolean>(false);
  const isDraggingP2 = useRef<boolean>(false);

  // Animation loop ref
  const lastTimestampRef = useRef<number | null>(null);
  const playheadDirectionRef = useRef<number>(1); // 1 = forward, -1 = backward (yoyo)

  const totalSequenceDuration = sequenceSteps.reduce((sum, s) => sum + s.duration, 0);
  const effectiveDuration = workbenchMode === 'sequence' ? Math.max(0.01, totalSequenceDuration) : config.duration;

  // --------------------------------------------------------------------------
  // Animation Playback Engine
  // --------------------------------------------------------------------------
  useEffect(() => {
    let animId: number;

    const tick = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }
      const delta = ((timestamp - lastTimestampRef.current) / 1000) * config.speedMultiplier;
      lastTimestampRef.current = timestamp;

      if (isPlaying) {
        setCurrentTime(prev => {
          let next = prev + delta * playheadDirectionRef.current;
          const totalDuration = workbenchMode === 'sequence'
            ? sequenceSteps.reduce((sum, s) => sum + s.duration, 0)
            : config.duration;

          if (next >= totalDuration) {
            if (config.loopMode === 'yoyo') {
              playheadDirectionRef.current = -1;
              return totalDuration;
            } else if (config.loopMode === 'loop') {
              return 0;
            } else {
              setIsPlaying(false);
              return totalDuration;
            }
          } else if (next <= 0) {
            if (config.loopMode === 'yoyo') {
              playheadDirectionRef.current = 1;
              return 0;
            } else {
              return 0;
            }
          }

          return next;
        });
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, config.duration, config.loopMode, config.speedMultiplier, workbenchMode, sequenceSteps]);

  // Normalized time 0..1
  const normalizedTime = config.duration > 0 ? Math.max(0, Math.min(1, currentTime / config.duration)) : 0;
  // Current eased progress value
  const easedProgress = evaluateEasing(
    normalizedTime,
    config.transition,
    config.direction,
    config.bezier,
    config.overshoot
  );

  // --------------------------------------------------------------------------
  // Curve Canvas Rendering (High-DPI Easing Curve + Drag Handles)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const canvas = curveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 28;
    const graphW = width - padding * 2;
    const graphH = height - padding * 2;

    ctx.clearRect(0, 0, width, height);

    // Coordinate grid background
    ctx.strokeStyle = '#182030';
    ctx.lineWidth = 1;

    // Outer bounding box
    ctx.strokeRect(padding, padding, graphW, graphH);

    // Diagonal reference line (Linear 1:1)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding, padding + graphH);
    ctx.lineTo(padding + graphW, padding);
    ctx.stroke();
    ctx.setLineDash([]);

    // Sample trajectory
    const trajectory = sampleTrajectory(config, 80);

    // Draw Velocity Curve if enabled
    if (showVelocity) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      trajectory.forEach((pt, i) => {
        const x = padding + pt.t * graphW;
        // Map velocity (clamp between -2 and 4 for display)
        const vNorm = (pt.velocity + 1) / 4;
        const y = padding + graphH - vNorm * graphH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Draw Easing Curve
    ctx.strokeStyle = '#10b981'; // Emerald
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    trajectory.forEach((pt, i) => {
      const x = padding + pt.t * graphW;
      const y = padding + graphH - pt.v * graphH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill area under curve
    ctx.lineTo(padding + graphW, padding + graphH);
    ctx.lineTo(padding, padding + graphH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padding, 0, padding + graphH);
    grad.addColorStop(0, 'rgba(16, 185, 129, 0.18)');
    grad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw Custom Bézier Control Handles if transition === 'custom'
    if (config.transition === 'custom') {
      const p1x = padding + config.bezier.x1 * graphW;
      const p1y = padding + graphH - config.bezier.y1 * graphH;
      const p2x = padding + config.bezier.x2 * graphW;
      const p2y = padding + graphH - config.bezier.y2 * graphH;

      // Handle lines
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padding, padding + graphH);
      ctx.lineTo(p1x, p1y);
      ctx.moveTo(padding + graphW, padding);
      ctx.lineTo(p2x, p2y);
      ctx.stroke();

      // P1 point
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(p1x, p1y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 2;
      ctx.stroke();

      // P2 point
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.arc(p2x, p2y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e0e7ff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw active animated playhead point along curve
    const currentX = padding + normalizedTime * graphW;
    const currentY = padding + graphH - easedProgress * graphH;

    // Playhead vertical line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(currentX, padding);
    ctx.lineTo(currentX, padding + graphH);
    ctx.stroke();

    // Playhead glowing dot
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(currentX, currentY, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [config, normalizedTime, easedProgress, showVelocity]);

  // --------------------------------------------------------------------------
  // Canvas Mouse Interaction for Bézier Control Points
  // --------------------------------------------------------------------------
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (config.transition !== 'custom') return;
    const canvas = curveCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padding = 28;
    const graphW = canvas.width - padding * 2;
    const graphH = canvas.height - padding * 2;

    const p1x = padding + config.bezier.x1 * graphW;
    const p1y = padding + graphH - config.bezier.y1 * graphH;
    const p2x = padding + config.bezier.x2 * graphW;
    const p2y = padding + graphH - config.bezier.y2 * graphH;

    if (Math.hypot(x - p1x, y - p1y) < 14) {
      isDraggingP1.current = true;
    } else if (Math.hypot(x - p2x, y - p2y) < 14) {
      isDraggingP2.current = true;
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingP1.current && !isDraggingP2.current) return;
    const canvas = curveCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padding = 28;
    const graphW = canvas.width - padding * 2;
    const graphH = canvas.height - padding * 2;

    const normX = Math.max(0, Math.min(1, (x - padding) / graphW));
    const normY = (padding + graphH - y) / graphH;

    if (isDraggingP1.current) {
      setConfig(prev => ({
        ...prev,
        bezier: { ...prev.bezier, x1: Number(normX.toFixed(2)), y1: Number(normY.toFixed(2)) }
      }));
    } else if (isDraggingP2.current) {
      setConfig(prev => ({
        ...prev,
        bezier: { ...prev.bezier, x2: Number(normX.toFixed(2)), y2: Number(normY.toFixed(2)) }
      }));
    }
  };

  const handleCanvasMouseUp = () => {
    isDraggingP1.current = false;
    isDraggingP2.current = false;
  };

  // Keyboard shortcut (Space = Play/Pause)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(p => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Preset Archetypes
  const applyPresetArchetype = (type: string) => {
    switch (type) {
      case 'pop_in':
        setConfig(prev => ({
          ...prev,
          transition: 'back',
          direction: 'out',
          duration: 0.45,
          overshoot: 2.1,
          loopMode: 'yoyo'
        }));
        setEnableScale(true);
        setEnableY(false);
        onToast('Applied Preset: Juicy Pop-In');
        break;
      case 'chest_bounce':
        setConfig(prev => ({
          ...prev,
          transition: 'bounce',
          direction: 'out',
          duration: 0.7,
          loopMode: 'yoyo'
        }));
        setEnableScale(true);
        setEnableY(true);
        onToast('Applied Preset: Chest Open Bounce');
        break;
      case 'smooth_slide':
        setConfig(prev => ({
          ...prev,
          transition: 'cubic',
          direction: 'out',
          duration: 0.35,
          loopMode: 'yoyo'
        }));
        setEnableX(true);
        setEnableY(false);
        onToast('Applied Preset: UI Modal Slide-In');
        break;
      case 'damage_recoil':
        setConfig(prev => ({
          ...prev,
          transition: 'elastic',
          direction: 'out',
          duration: 0.55,
          loopMode: 'once'
        }));
        setEnableRotation(true);
        setEnableScale(true);
        onToast('Applied Preset: Damage Impact Recoil');
        break;
      case 'coin_bob':
        setConfig(prev => ({
          ...prev,
          transition: 'sine',
          direction: 'in_out',
          duration: 0.8,
          loopMode: 'yoyo'
        }));
        setEnableY(true);
        setEnableScale(false);
        onToast('Applied Preset: Floating Coin Bob');
        break;
    }
    setCurrentTime(0);
    setIsPlaying(true);
  };

  // Copy code helper
  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    onToast('Copied engine tween snippet to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddSequenceStep = () => {
    const newStep: SequenceStep = {
      id: `step_${Date.now()}`,
      property: 'scale',
      label: `Step ${sequenceSteps.length + 1}`,
      startValue: 1.0,
      endValue: 1.25,
      duration: 0.25,
      transition: 'quad',
      direction: 'out'
    };
    setSequenceSteps(prev => [...prev, newStep]);
    onToast('Added new chained step');
  };

  const handleDeleteSequenceStep = (id: string) => {
    if (sequenceSteps.length <= 1) {
      onToast('Chained sequencer requires at least 1 step');
      return;
    }
    setSequenceSteps(prev => prev.filter(s => s.id !== id));
  };

  const handleUpdateSequenceStep = (id: string, updates: Partial<SequenceStep>) => {
    setSequenceSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const loadSequencePreset = (presetName: 'pop_drop' | 'chest_open' | 'damage_recoil') => {
    if (presetName === 'pop_drop') {
      setSequenceSteps([
        { id: 's1', property: 'position:y', label: '1. Upward Launch', startValue: 0, endValue: 60, duration: 0.25, transition: 'quad', direction: 'out' },
        { id: 's2', property: 'scale', label: '2. Apex Swell', startValue: 1.0, endValue: 1.35, duration: 0.15, transition: 'back', direction: 'out' },
        { id: 's3', property: 'position:y', label: '3. Ground Impact', startValue: 60, endValue: 0, duration: 0.35, transition: 'bounce', direction: 'out' },
        { id: 's4', property: 'scale', label: '4. Settle Recovery', startValue: 1.35, endValue: 1.0, duration: 0.2, transition: 'elastic', direction: 'out' }
      ]);
      onToast('Loaded "Juicy Pop & Drop" sequence');
    } else if (presetName === 'chest_open') {
      setSequenceSteps([
        { id: 's1', property: 'scale', label: '1. Anticipation Puff', startValue: 1.0, endValue: 1.25, duration: 0.15, transition: 'back', direction: 'out' },
        { id: 's2', property: 'rotation', label: '2. Lid Snap Back', startValue: 0, endValue: -20, duration: 0.1, transition: 'quad', direction: 'out' },
        { id: 's3', property: 'position:y', label: '3. Treasure Rise', startValue: 0, endValue: 45, duration: 0.25, transition: 'back', direction: 'out' },
        { id: 's4', property: 'rotation', label: '4. Lid Rest', startValue: -20, endValue: 0, duration: 0.2, transition: 'bounce', direction: 'out' }
      ]);
      onToast('Loaded "Chest Pop-Open" sequence');
    } else if (presetName === 'damage_recoil') {
      setSequenceSteps([
        { id: 's1', property: 'position:x', label: '1. Heavy Knockback', startValue: 0, endValue: -40, duration: 0.08, transition: 'expo', direction: 'out' },
        { id: 's2', property: 'rotation', label: '2. Flinch Tilt', startValue: 0, endValue: 15, duration: 0.1, transition: 'quad', direction: 'out' },
        { id: 's3', property: 'position:x', label: '3. Elastic Rebound', startValue: -40, endValue: 0, duration: 0.25, transition: 'elastic', direction: 'out' },
        { id: 's4', property: 'alpha', label: '4. Damage Invuln Fade', startValue: 1.0, endValue: 0.25, duration: 0.25, transition: 'quad', direction: 'in' },
        { id: 's5', property: 'alpha', label: '5. Restore Opacity', startValue: 0.25, endValue: 1.0, duration: 0.2, transition: 'quad', direction: 'out' }
      ]);
      onToast('Loaded "Damage Recoil & Fade" sequence');
    }
    setCurrentTime(0);
    setIsPlaying(true);
  };

  let activeStepIndex = 0;
  if (workbenchMode === 'sequence') {
    let acc = 0;
    for (let i = 0; i < sequenceSteps.length; i++) {
      acc += sequenceSteps[i].duration;
      if (currentTime <= acc || i === sequenceSteps.length - 1) {
        activeStepIndex = i;
        break;
      }
    }
  }

  // Compute animated style properties
  let seqY = 0;
  let seqX = 0;
  let seqScale = 1.0;
  let seqRotate = 0;
  let seqAlpha = 1.0;

  if (workbenchMode === 'sequence') {
    let acc = 0;
    for (let i = 0; i < sequenceSteps.length; i++) {
      const step = sequenceSteps[i];
      const dur = Math.max(0.01, step.duration);
      if (currentTime >= acc + dur) {
        if (step.property === 'position:y') seqY = -step.endValue;
        else if (step.property === 'position:x') seqX = step.endValue;
        else if (step.property === 'scale') seqScale = step.endValue;
        else if (step.property === 'rotation') seqRotate = step.endValue;
        else if (step.property === 'alpha') seqAlpha = step.endValue;
      } else if (currentTime >= acc) {
        const norm = (currentTime - acc) / dur;
        const eased = evaluateEasing(norm, step.transition, step.direction);
        const val = step.startValue + (step.endValue - step.startValue) * eased;
        if (step.property === 'position:y') seqY = -val;
        else if (step.property === 'position:x') seqX = val;
        else if (step.property === 'scale') seqScale = val;
        else if (step.property === 'rotation') seqRotate = val;
        else if (step.property === 'alpha') seqAlpha = val;
        break;
      } else {
        break;
      }
      acc += dur;
    }
  }

  const translateY = workbenchMode === 'sequence' ? seqY : (enableY ? -(easedProgress * 110) : 0);
  const translateX = workbenchMode === 'sequence' ? seqX : (enableX ? (easedProgress * 120 - 60) : 0);
  const scale = workbenchMode === 'sequence' ? seqScale : (enableScale ? 1 + (easedProgress - 1) * 0.45 : 1);
  const rotateDeg = workbenchMode === 'sequence' ? seqRotate : (enableRotation ? (easedProgress * 45) : 0);
  const opacity = workbenchMode === 'sequence' ? seqAlpha : (enableAlpha ? Math.max(0.1, 1 - easedProgress * 0.9) : 1);

  // Code snippet string
  const generatedCode = (() => {
    if (workbenchMode === 'sequence') {
      if (codeTab === 'godot') return generateGodotSequenceCode(sequenceSteps, config.loopMode);
      return generateDOTweenSequenceCode(sequenceSteps, config.loopMode);
    }
    switch (codeTab) {
      case 'godot':
        return generateGodotCode(config, activeTarget);
      case 'dotween':
        return generateDOTweenCode(config, activeTarget);
      case 'leantween':
        return generateLeanTweenCode(config, activeTarget);
      case 'vanilla':
        return generateVanillaUnityCode(config, activeTarget);
      case 'css':
        return generateCssCode(config);
      default:
        return '';
    }
  })();

  const activeProfile = ENGINE_PROFILES[engine];

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#080a0f] select-none">
      
      {/* Tinkerbox Sub-Header (Presets & Playback Controls) */}
      <div className="h-11 bg-[#101420] border-b border-[#1e2638] px-4 flex items-center justify-between shrink-0 z-20">
        
        {/* Mode Selector + Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <div className="flex items-center bg-[#0a0d14] p-0.5 rounded-lg border border-[#1e2638] mr-1.5">
            <button
              onClick={() => {
                setWorkbenchMode('single');
                setCurrentTime(0);
              }}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                workbenchMode === 'single'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Single Easing Curve
            </button>
            <button
              onClick={() => {
                setWorkbenchMode('sequence');
                setCurrentTime(0);
              }}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                workbenchMode === 'sequence'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Chained Sequencer ({sequenceSteps.length})
            </button>
          </div>

          {workbenchMode === 'single' && (
            <>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mr-1 flex items-center gap-1">
                <Zap size={11} /> Presets:
              </span>
              <button
                onClick={() => applyPresetArchetype('pop_in')}
                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#141824] hover:bg-[#1f2638] text-slate-200 hover:text-white border border-[#1e2638] transition"
              >
                Juicy Pop-In
              </button>
              <button
                onClick={() => applyPresetArchetype('chest_bounce')}
                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#141824] hover:bg-[#1f2638] text-slate-200 hover:text-white border border-[#1e2638] transition"
              >
                Chest Bounce
              </button>
              <button
                onClick={() => applyPresetArchetype('smooth_slide')}
                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#141824] hover:bg-[#1f2638] text-slate-200 hover:text-white border border-[#1e2638] transition"
              >
                UI Slide
              </button>
              <button
                onClick={() => applyPresetArchetype('damage_recoil')}
                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#141824] hover:bg-[#1f2638] text-slate-200 hover:text-white border border-[#1e2638] transition"
              >
                Damage Impact
              </button>
              <button
                onClick={() => applyPresetArchetype('coin_bob')}
                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#141824] hover:bg-[#1f2638] text-slate-200 hover:text-white border border-[#1e2638] transition"
              >
                Coin Bob
              </button>
            </>
          )}

          {workbenchMode === 'sequence' && (
            <span className="text-[11px] font-mono text-emerald-400 font-semibold px-2">
              Total Duration: {sequenceSteps.reduce((s, st) => s + st.duration, 0).toFixed(2)}s
            </span>
          )}
        </div>

        {/* Playback & Loop Controls */}
        <div className="flex items-center gap-2">
          {/* Speed Pills */}
          <div className="flex items-center bg-[#141824] border border-[#1e2638] rounded-md p-0.5 text-[10px] font-mono">
            {[0.25, 0.5, 1.0, 2.0].map(s => (
              <button
                key={s}
                onClick={() => setConfig(prev => ({ ...prev, speedMultiplier: s }))}
                className={`px-1.5 py-0.5 rounded transition ${
                  config.speedMultiplier === s
                    ? 'bg-emerald-500/25 text-emerald-300 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Loop Mode Toggle */}
          <button
            onClick={() => {
              const modes: Array<'once' | 'loop' | 'yoyo'> = ['yoyo', 'loop', 'once'];
              const next = modes[(modes.indexOf(config.loopMode) + 1) % modes.length];
              setConfig(prev => ({ ...prev, loopMode: next }));
              onToast(`Loop mode set to: ${next.toUpperCase()}`);
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 border transition ${
              config.loopMode === 'yoyo'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-[#141824] border-[#1e2638] text-slate-300 hover:text-white'
            }`}
            title="Toggle Repeat Mode: Yoyo (Ping-Pong) -> Loop -> Once"
          >
            <Repeat size={11} />
            <span className="capitalize">{config.loopMode}</span>
          </button>

          {/* Play / Pause Button */}
          <Button
            variant="secondary"
            size="sm"
            icon={isPlaying ? <Pause size={12} className="text-amber-400" /> : <Play size={12} className="text-emerald-400" />}
            onClick={() => setIsPlaying(p => !p)}
            title="Play / Pause Animation (Press Spacebar)"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </Button>

          {/* Reset Playhead */}
          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw size={12} className="text-slate-400" />}
            onClick={() => {
              setCurrentTime(0);
              setIsPlaying(true);
            }}
            title="Reset animation to start"
          >
            Reset
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw size={11} />}
            onClick={handleBlankWorkspace}
            title="Reset motion sequence to clean blank state"
          >
            Blank
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<HelpCircle size={12} className="text-emerald-400" />}
            onClick={() => {
              setIsFirstVisit(false);
              setIsTutorialOpen(true);
            }}
            title="Open Tinkerbox Walkthrough"
          >
            Tutorial
          </Button>
        </div>
      </div>

      {/* Main 3-Panel Workstation Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* LEFT PANEL: EASING GRAPH (Single) OR SEQUENCE DIRECTOR (Sequence) (320px) */}
        <aside className="w-[320px] bg-[#0c101a] border-r border-[#1e2638] flex flex-col shrink-0 min-h-0 overflow-y-auto">
          {workbenchMode === 'single' ? (
            <>
              {/* Curve Canvas Header */}
              <div className="p-3 bg-[#0e121d] border-b border-[#1e2638] flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Activity size={13} className="text-emerald-400" />
                  <span>Curve Visualizer</span>
                </span>
                <button
                  onClick={() => setShowVelocity(v => !v)}
                  className={`text-[10px] px-2 py-0.5 rounded border transition font-mono ${
                    showVelocity
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-[#141824] text-slate-500 border-[#1e2638] hover:text-slate-300'
                  }`}
                  title="Toggle velocity (derivative dv/dt) curve overlay"
                >
                  Velocity
                </button>
              </div>

              {/* High-DPI Curve Canvas Box */}
              <div className="p-3 border-b border-[#1e2638] bg-[#090c14] flex flex-col items-center">
                <div className="w-[294px] h-[190px] rounded-xl bg-[#07090f] border border-[#1e2638] relative overflow-hidden shadow-inner">
                  <canvas
                    ref={curveCanvasRef}
                    width={294}
                    height={190}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    className="w-full h-full block cursor-crosshair"
                  />
                  <div className="absolute top-2 left-2.5 text-[9px] font-mono text-emerald-500/60 uppercase tracking-widest pointer-events-none">
                    f(t) : {config.transition.toUpperCase()} {config.direction.toUpperCase()}
                  </div>
                </div>
                {config.transition === 'custom' && (
                  <p className="text-[10px] text-sky-400 font-mono mt-1.5 text-center">
                    Drag cyan/purple handles to sculpt Bézier curve
                  </p>
                )}
              </div>

              {/* Easing Direction (In, Out, InOut, OutIn) */}
              <div className="p-3 border-b border-[#1e2638] space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Ease Direction
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {(['out', 'in', 'in_out', 'out_in'] as EaseDirection[]).map(d => (
                    <button
                      key={d}
                      onClick={() => setConfig(prev => ({ ...prev, direction: d }))}
                      className={`py-1 rounded text-xs font-semibold capitalize border transition ${
                        config.direction === d
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                          : 'bg-[#121622] text-slate-400 hover:text-white border-[#1e2638]'
                      }`}
                    >
                      {d.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transition Family Grid */}
              <div className="p-3 border-b border-[#1e2638] space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Transition Function
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      'linear',
                      'sine',
                      'quad',
                      'cubic',
                      'quart',
                      'quint',
                      'expo',
                      'circ',
                      'back',
                      'elastic',
                      'bounce',
                      'custom'
                    ] as TransitionType[]
                  ).map(t => (
                    <button
                      key={t}
                      onClick={() => setConfig(prev => ({ ...prev, transition: t }))}
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold capitalize border transition ${
                        config.transition === t
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                          : 'bg-[#121622] text-slate-400 hover:text-white border-[#1e2638]'
                      }`}
                    >
                      {t === 'custom' ? 'Custom Bézier' : t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fine Tuning Controls (Overshoot / Bézier Control Points) */}
              <div className="p-3 space-y-3">
                {config.transition === 'back' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Back Overshoot (s)</span>
                      <span className="font-mono text-emerald-400">{config.overshoot.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={4.0}
                      step={0.1}
                      value={config.overshoot}
                      onChange={e => setConfig(prev => ({ ...prev, overshoot: Number(e.target.value) }))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>
                )}

                {config.transition === 'custom' && (
                  <div className="space-y-2 font-mono text-xs">
                    <div className="text-[11px] font-bold text-slate-300">Bézier Handles</div>
                    <div className="grid grid-cols-2 gap-2 text-slate-400">
                      <div>
                        P1: ({config.bezier.x1.toFixed(2)}, {config.bezier.y1.toFixed(2)})
                      </div>
                      <div>
                        P2: ({config.bezier.x2.toFixed(2)}, {config.bezier.y2.toFixed(2)})
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <NumberInput
                    label="Duration"
                    value={Number(config.duration.toFixed(2))}
                    onChange={v => setConfig(prev => ({ ...prev, duration: Math.max(0.05, v) }))}
                    unit="s"
                    step={0.05}
                    min={0.05}
                    max={5}
                    highlight={true}
                  />
                  <NumberInput
                    label="Delay"
                    value={Number(config.delay.toFixed(2))}
                    onChange={v => setConfig(prev => ({ ...prev, delay: Math.max(0, v) }))}
                    unit="s"
                    step={0.05}
                    min={0}
                    max={3}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Sequence Director Header */}
              <div className="p-3 bg-[#0e121d] border-b border-[#1e2638] flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Film size={13} className="text-emerald-400" />
                  <span>Sequence Director</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25">
                  {sequenceSteps.length} Steps
                </span>
              </div>

              {/* Choreography Presets */}
              <div className="p-3 border-b border-[#1e2638] space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Choreography Presets
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => loadSequencePreset('pop_drop')}
                    className="px-1.5 py-1 text-[11px] font-medium bg-[#141824] hover:bg-[#1e2638] border border-[#1e2638] text-slate-200 rounded text-center truncate transition"
                    title="Pop & Drop: Elastic scale up, gravity bounce drop"
                  >
                    Pop & Drop
                  </button>
                  <button
                    onClick={() => loadSequencePreset('chest_open')}
                    className="px-1.5 py-1 text-[11px] font-medium bg-[#141824] hover:bg-[#1e2638] border border-[#1e2638] text-slate-200 rounded text-center truncate transition"
                    title="Chest Open: Squash stretch and lid rotation pop"
                  >
                    Chest Open
                  </button>
                  <button
                    onClick={() => loadSequencePreset('damage_recoil')}
                    className="px-1.5 py-1 text-[11px] font-medium bg-[#141824] hover:bg-[#1e2638] border border-[#1e2638] text-slate-200 rounded text-center truncate transition"
                    title="Damage Recoil: Knockback, spin, and hit fade"
                  >
                    Recoil & Hit
                  </button>
                </div>
              </div>

              {/* Steps List */}
              <div className="p-3 space-y-2.5 flex-1 overflow-y-auto">
                {sequenceSteps.map((step, idx) => {
                  const isActive = idx === activeStepIndex && isPlaying;
                  return (
                    <div
                      key={step.id}
                      className={`p-2.5 rounded-xl border transition ${
                        isActive
                          ? 'bg-[#121c24] border-emerald-500/60 shadow-md shadow-emerald-950/40'
                          : 'bg-[#0f131f] border-[#1e2638] hover:border-[#2a344d]'
                      }`}
                    >
                      {/* Step Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono ${
                              isActive ? 'bg-emerald-500 text-black' : 'bg-[#1e2638] text-slate-300'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-slate-200">
                            {step.property === 'position:y'
                              ? 'Vertical (Y)'
                              : step.property === 'position:x'
                              ? 'Horizontal (X)'
                              : step.property === 'scale'
                              ? 'Scale Factor'
                              : step.property === 'rotation'
                              ? 'Rotation (°)'
                              : 'Alpha (Opacity)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteSequenceStep(step.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded transition"
                            title="Delete step"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Property Type Dropdown */}
                      <div className="grid grid-cols-2 gap-1.5 mb-2">
                        <div>
                          <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block mb-0.5">
                            Property
                          </label>
                          <select
                            value={step.property}
                            onChange={e =>
                              handleUpdateSequenceStep(step.id, { property: e.target.value as any })
                            }
                            className="w-full bg-[#0a0d14] border border-[#1e2638] rounded px-1.5 py-1 text-[11px] text-slate-200 outline-none"
                          >
                            <option value="position:y">Position Y (Lift)</option>
                            <option value="position:x">Position X (Slide)</option>
                            <option value="scale">Scale</option>
                            <option value="rotation">Rotation (°)</option>
                            <option value="alpha">Alpha (Opacity)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block mb-0.5">
                            Duration
                          </label>
                          <input
                            type="number"
                            step="0.05"
                            min="0.05"
                            max="5"
                            value={step.duration}
                            onChange={e =>
                              handleUpdateSequenceStep(step.id, {
                                duration: Math.max(0.01, Number(e.target.value))
                              })
                            }
                            className="w-full bg-[#0a0d14] border border-[#1e2638] rounded px-1.5 py-1 text-[11px] font-mono text-emerald-400 outline-none"
                          />
                        </div>
                      </div>

                      {/* Start / End Values */}
                      <div className="grid grid-cols-2 gap-1.5 mb-2">
                        <div>
                          <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block mb-0.5">
                            From
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={step.startValue}
                            onChange={e =>
                              handleUpdateSequenceStep(step.id, { startValue: Number(e.target.value) })
                            }
                            className="w-full bg-[#0a0d14] border border-[#1e2638] rounded px-1.5 py-1 text-[11px] font-mono text-slate-200 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block mb-0.5">
                            To
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={step.endValue}
                            onChange={e =>
                              handleUpdateSequenceStep(step.id, { endValue: Number(e.target.value) })
                            }
                            className="w-full bg-[#0a0d14] border border-[#1e2638] rounded px-1.5 py-1 text-[11px] font-mono text-slate-200 outline-none"
                          />
                        </div>
                      </div>

                      {/* Easing Func & Direction */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <select
                          value={step.transition}
                          onChange={e =>
                            handleUpdateSequenceStep(step.id, {
                              transition: e.target.value as TransitionType
                            })
                          }
                          className="w-full bg-[#0a0d14] border border-[#1e2638] rounded px-1.5 py-1 text-[11px] text-slate-200 outline-none capitalize"
                        >
                          {[
                            'linear',
                            'sine',
                            'quad',
                            'cubic',
                            'quart',
                            'quint',
                            'expo',
                            'circ',
                            'back',
                            'elastic',
                            'bounce'
                          ].map(t => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <select
                          value={step.direction}
                          onChange={e =>
                            handleUpdateSequenceStep(step.id, {
                              direction: e.target.value as EaseDirection
                            })
                          }
                          className="w-full bg-[#0a0d14] border border-[#1e2638] rounded px-1.5 py-1 text-[11px] text-slate-200 outline-none capitalize"
                        >
                          {['out', 'in', 'in_out', 'out_in'].map(d => (
                            <option key={d} value={d}>
                              {d.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}

                {/* Add Step Button */}
                <button
                  onClick={handleAddSequenceStep}
                  className="w-full py-2.5 rounded-xl border border-dashed border-[#232c42] hover:border-emerald-500/50 bg-[#0b0e17] hover:bg-[#121624] text-xs font-semibold text-slate-300 hover:text-emerald-400 flex items-center justify-center gap-1.5 transition"
                >
                  <Plus size={13} />
                  <span>Add Chained Step</span>
                </button>
              </div>
            </>
          )}
        </aside>

        {/* CENTER STAGE: MOTION PLAYGROUND & ACTOR VIEWPORT */}
        <main className="flex-1 flex flex-col bg-[#080a0f] relative overflow-hidden select-none">
          
          {/* Stage Top Bar: Actor Picker & Channel Toggles */}
          <div className="h-10 border-b border-[#1e2638] bg-[#0c101a] px-4 flex items-center justify-between text-xs">
            
            {/* Actor Shape Picker */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Actor:</span>
              {(['knight', 'gem', 'box', 'star', 'orb'] as ActorShape[]).map(s => (
                <button
                  key={s}
                  onClick={() => setActorShape(s)}
                  className={`px-2 py-0.5 rounded text-xs capitalize border transition ${
                    actorShape === s
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-[#141824] text-slate-400 border-[#1e2638] hover:text-white'
                  }`}
                >
                  {s === 'knight' ? '🗡️ Knight' : s === 'gem' ? '💎 Gem' : s === 'box' ? '📦 Chest' : s === 'star' ? '⭐ Star' : '🔘 Orb'}
                </button>
              ))}
            </div>

            {/* Channels & Ghosting */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowOnionSkin(s => !s)}
                className={`text-[11px] px-2 py-0.5 rounded border transition flex items-center gap-1 ${
                  showOnionSkin
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-[#141824] text-slate-500 border-[#1e2638]'
                }`}
                title="Toggle trajectory ghosting / onion skinning"
              >
                <Layers size={11} /> Ghosting
              </button>

              <div className="h-4 w-[1px] bg-[#1e2638] mx-1" />

              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Channels:</span>
              <button
                onClick={() => setEnableY(v => !v)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono border transition ${
                  enableY ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-[#141824] text-slate-500 border-[#1e2638]'
                }`}
              >
                Y-Axis
              </button>
              <button
                onClick={() => setEnableX(v => !v)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono border transition ${
                  enableX ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-[#141824] text-slate-500 border-[#1e2638]'
                }`}
              >
                X-Axis
              </button>
              <button
                onClick={() => setEnableScale(v => !v)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono border transition ${
                  enableScale ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-[#141824] text-slate-500 border-[#1e2638]'
                }`}
              >
                Scale
              </button>
              <button
                onClick={() => setEnableRotation(v => !v)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono border transition ${
                  enableRotation ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-[#141824] text-slate-500 border-[#1e2638]'
                }`}
              >
                Rotate
              </button>
              <button
                onClick={() => setEnableAlpha(v => !v)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono border transition ${
                  enableAlpha ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-[#141824] text-slate-500 border-[#1e2638]'
                }`}
              >
                Alpha
              </button>
            </div>
          </div>

          {/* 2D Canvas Stage */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-[#07090f]">
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

            {/* Stage Ground Horizon Line */}
            <div className="absolute w-3/4 h-[1px] bg-gradient-to-r from-transparent via-[#2b3852] to-transparent top-[62%]" />
            <div className="absolute text-[10px] font-mono text-slate-500 top-[63%] tracking-widest uppercase">
              Rest Floor (Y=0)
            </div>

            {/* Ghost Trajectory / Onion Skinning */}
            {showOnionSkin && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {[0.1, 0.25, 0.45, 0.65, 0.85, 1.0].map((sampleT, i) => {
                  const ghostProgress = evaluateEasing(
                    sampleT,
                    config.transition,
                    config.direction,
                    config.bezier,
                    config.overshoot
                  );
                  const gY = enableY ? -(ghostProgress * 110) : 0;
                  const gX = enableX ? (ghostProgress * 120 - 60) : 0;
                  const gScale = enableScale ? 1 + (ghostProgress - 1) * 0.45 : 1;

                  return (
                    <div
                      key={i}
                      className="absolute w-12 h-12 rounded-xl border border-emerald-400/20 bg-emerald-500/5 flex items-center justify-center text-[10px] font-mono text-emerald-400/40"
                      style={{
                        transform: `translate(${gX}px, ${gY + 40}px) scale(${gScale})`
                      }}
                    >
                      {Math.round(sampleT * 100)}%
                    </div>
                  );
                })}
              </div>
            )}

            {/* Primary Animated Actor */}
            <div
              className="relative z-10 transition-transform duration-75 flex flex-col items-center justify-center"
              style={{
                transform: `translate(${translateX}px, ${translateY + 40}px) scale(${scale}) rotate(${rotateDeg}deg)`,
                opacity: opacity
              }}
            >
              {actorShape === 'knight' ? (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-0.5 shadow-2xl shadow-indigo-500/40 flex items-center justify-center">
                  <div className="w-full h-full rounded-[14px] bg-[#0c101a] flex flex-col items-center justify-center text-2xl">
                    ⚔️
                  </div>
                </div>
              ) : actorShape === 'gem' ? (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-2xl shadow-emerald-500/50 flex items-center justify-center text-2xl">
                  💎
                </div>
              ) : actorShape === 'box' ? (
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-2xl shadow-amber-500/50 flex items-center justify-center text-2xl border border-amber-300/40">
                  📦
                </div>
              ) : actorShape === 'star' ? (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 shadow-2xl shadow-yellow-500/50 flex items-center justify-center text-3xl">
                  ⭐
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 shadow-2xl shadow-cyan-500/50 flex items-center justify-center border-2 border-white/40">
                  <div className="w-4 h-4 rounded-full bg-white shadow" />
                </div>
              )}

              {/* Shadow underneath actor on floor */}
              <div
                className="w-14 h-2.5 rounded-full bg-black/60 blur-[3px] mt-3 transition-transform"
                style={{
                  transform: `scale(${Math.max(0.3, 1 - (translateY / -150))})`,
                  opacity: Math.max(0.1, 1 - (translateY / -120))
                }}
              />
            </div>

            {/* Live Progress HUD */}
            <div className="absolute top-4 left-4 bg-[#0c101a]/85 backdrop-blur border border-[#1e2638] rounded-lg px-3 py-1.5 font-mono text-[11px] text-slate-300 space-y-0.5 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Time:</span>
                <span className="text-white font-bold">
                  {currentTime.toFixed(2)}s / {effectiveDuration.toFixed(2)}s
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">{workbenchMode === 'sequence' ? 'Active Step:' : 'Value:'}</span>
                <span className="text-emerald-400 font-bold">
                  {workbenchMode === 'sequence'
                    ? `Step ${activeStepIndex + 1} (${sequenceSteps[activeStepIndex]?.property || 'end'})`
                    : easedProgress.toFixed(3)}
                </span>
              </div>
            </div>

          </div>

          {/* Bottom Scrubbable Timeline */}
          <div className="h-12 bg-[#0c101a] border-t border-[#1e2638] px-4 flex items-center gap-3 shrink-0">
            <span className="text-[10px] font-mono text-slate-400 shrink-0">0.0s</span>
            <input
              type="range"
              min={0}
              max={effectiveDuration}
              step={0.01}
              value={currentTime}
              onChange={e => {
                setCurrentTime(Number(e.target.value));
                setIsPlaying(false);
              }}
              className="flex-1 accent-emerald-500 cursor-pointer h-1.5 bg-[#171c2b] rounded-lg"
            />
            <span className="text-[10px] font-mono text-emerald-400 font-bold shrink-0">
              {effectiveDuration.toFixed(2)}s
            </span>
          </div>

        </main>

        {/* RIGHT PANEL: INSPECTOR & ENGINE CODE GENERATOR (320px) */}
        <aside className="w-[320px] bg-[#0c101a] border-l border-[#1e2638] flex flex-col shrink-0 min-h-0 overflow-y-auto">
          
          {workbenchMode === 'single' ? (
            <>
              {/* Target Preset Selector */}
              <div className="p-3 bg-[#0e121d] border-b border-[#1e2638] space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Sliders size={13} className="text-emerald-400" />
                  <span>Target Property</span>
                </span>

                <select
                  value={activeTarget.name}
                  onChange={e => {
                    const found = TWEEN_PROPERTY_PRESETS.find(p => p.name === e.target.value);
                    if (found) setActiveTarget(found);
                  }}
                  className="w-full bg-[#121622] border border-[#1e2638] rounded-md px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500"
                >
                  {TWEEN_PROPERTY_PRESETS.map(p => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Property Bounds Config */}
              <div className="p-3 border-b border-[#1e2638] space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <NumberInput
                    label="Start Value"
                    value={activeTarget.startValue}
                    onChange={v => setActiveTarget(prev => ({ ...prev, startValue: v }))}
                    step={0.1}
                  />
                  <NumberInput
                    label="End Value"
                    value={activeTarget.endValue}
                    onChange={v => setActiveTarget(prev => ({ ...prev, endValue: v }))}
                    step={0.1}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="p-3 bg-[#0e121d] border-b border-[#1e2638] space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles size={13} />
                <span>Chained Tween Queue</span>
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Generates a sequential choreography block using Godot 4 <code className="text-emerald-300 font-mono">create_tween()</code> or Unity <code className="text-emerald-300 font-mono">DOTween.Sequence()</code>.
              </p>
            </div>
          )}

          {/* Engine Code Export Section */}
          <div className="p-3 flex-1 flex flex-col min-h-0 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Code2 size={13} className="text-emerald-400" />
                <span>Engine Code</span>
              </span>

              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                {activeProfile.name}
              </span>
            </div>

            {/* Code Engine Tabs */}
            <div className="flex items-center bg-[#121622] border border-[#1e2638] rounded-lg p-0.5 text-[11px]">
              <button
                onClick={() => setCodeTab('godot')}
                className={`flex-1 py-1 rounded font-semibold transition ${
                  codeTab === 'godot'
                    ? 'bg-emerald-500/20 text-emerald-300 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Godot 4
              </button>
              <button
                onClick={() => setCodeTab('dotween')}
                className={`flex-1 py-1 rounded font-semibold transition ${
                  codeTab === 'dotween'
                    ? 'bg-emerald-500/20 text-emerald-300 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                DOTween (C#)
              </button>
              {workbenchMode === 'single' && (
                <>
                  <button
                    onClick={() => setCodeTab('leantween')}
                    className={`flex-1 py-1 rounded font-semibold transition ${
                      codeTab === 'leantween'
                        ? 'bg-emerald-500/20 text-emerald-300 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    LeanTween
                  </button>
                  <button
                    onClick={() => setCodeTab('vanilla')}
                    className={`flex-1 py-1 rounded font-semibold transition ${
                      codeTab === 'vanilla'
                        ? 'bg-emerald-500/20 text-emerald-300 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Vanilla C#
                  </button>
                </>
              )}
            </div>

            {/* Code Box */}
            <div className="relative flex-1 min-h-[220px] rounded-xl bg-[#07090e] border border-[#1e2638] p-3 font-mono text-[11px] text-slate-300 overflow-auto group">
              <pre className="whitespace-pre-wrap leading-relaxed select-text">
                {generatedCode}
              </pre>

              <button
                onClick={() => handleCopyCode(generatedCode)}
                className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-md bg-[#161c2c] hover:bg-[#20293f] border border-[#232c42] text-xs text-slate-200 hover:text-white flex items-center gap-1.5 transition shadow"
                title="Copy Code to Clipboard"
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

            {/* 1-Click Primary Copy Action Button */}
            <Button
              variant="primary"
              size="md"
              className="w-full !h-9 !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-400/30 text-white font-bold"
              icon={copied ? <Check size={13} /> : <Copy size={13} />}
              onClick={() => handleCopyCode(generatedCode)}
            >
              {copied ? 'Copied Code to Clipboard!' : `Copy ${codeTab.toUpperCase()} Snippet`}
            </Button>
          </div>

        </aside>

      </div>

      {/* Tutorial Walkthrough Modal */}
      <WorkstationTutorialModal
        tutorial={WORKSTATION_TUTORIALS.tinkerbox}
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        isFirstVisitPrompt={isFirstVisit}
      />

    </div>
  );
};
