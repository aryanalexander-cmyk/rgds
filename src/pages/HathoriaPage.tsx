import React, { useState, useEffect, useRef } from 'react';
import { TargetEngine, ENGINE_PROFILES } from '../types/engine';
import {
  SynthParams,
  WaveType,
  DEFAULT_SYNTH_PARAMS,
  createPreset,
  mutateParams,
  randomizeParams,
  renderAudioBuffer,
  encodeWavBlob
} from '../core/hathoria/synth';
import { Button } from '../components/ui/Button';
import { NumberInput } from '../components/ui/NumberInput';
import { Accordion } from '../components/ui/Accordion';
import { WorkstationTutorialModal } from '../components/ui/WorkstationTutorialModal';
import { WORKSTATION_TUTORIALS } from '../core/tutorial/tutorialData';
import {
  Volume2,
  Play,
  RotateCcw,
  Sparkles,
  Download,
  Dices,
  Trash2,
  Sliders,
  AudioWaveform,
  Activity,
  Layers,
  Music,
  Check,
  HelpCircle
} from 'lucide-react';

interface HathoriaPageProps {
  engine: TargetEngine;
  onToast: (msg: string) => void;
}

const PIANO_KEYS = [
  { note: 'C', key: 'A', semitone: -9 },
  { note: 'C#', key: 'W', semitone: -8, isBlack: true },
  { note: 'D', key: 'S', semitone: -7 },
  { note: 'D#', key: 'E', semitone: -6, isBlack: true },
  { note: 'E', key: 'D', semitone: -5 },
  { note: 'F', key: 'F', semitone: -4 },
  { note: 'F#', key: 'T', semitone: -3, isBlack: true },
  { note: 'G', key: 'G', semitone: -2 },
  { note: 'G#', key: 'Y', semitone: -1, isBlack: true },
  { note: 'A', key: 'H', semitone: 0 },
  { note: 'A#', key: 'U', semitone: 1, isBlack: true },
  { note: 'B', key: 'J', semitone: 2 },
  { note: 'C2', key: 'K', semitone: 3 }
];

export const HathoriaPage: React.FC<HathoriaPageProps> = ({
  engine,
  onToast
}) => {
  const [params, setParams] = useState<SynthParams>(createPreset('coin'));
  const [soundName, setSoundName] = useState('pickup_coin');
  const [history, setHistory] = useState<SynthParams[]>([createPreset('coin')]);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // First-visit tutorial state
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('rgds_tutorial_hathoria_dismissed');
      if (!dismissed) {
        setIsTutorialOpen(true);
        setIsFirstVisit(true);
      }
    } catch {}
  }, []);

  const handleBlankWorkspace = () => {
    setParams({ ...DEFAULT_SYNTH_PARAMS });
    setSoundName('custom_sfx');
    onToast('Workspace reset to neutral synth state.');
  };

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Play sound at a specific pitch scale
  const playSound = (pitchScale: number = 1.0) => {
    const ctx = getAudioContext();
    const buffer = renderAudioBuffer(ctx, params, pitchScale);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();

    // Trigger visualizer draw
    drawOscilloscope(buffer);
  };

  // Draw waveform onto visualizer canvas
  const drawOscilloscope = (buffer: AudioBuffer) => {
    const canvas = scopeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = buffer.getChannelData(0);
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Draw central grid line
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Draw waveform
    ctx.strokeStyle = '#f59e0b'; // Amber / Gold theme for Hathoria
    ctx.lineWidth = 2;
    ctx.beginPath();

    const sliceWidth = width / data.length;
    let x = 0;

    for (let i = 0; i < data.length; i += Math.max(1, Math.floor(data.length / width))) {
      const v = data[i];
      const y = (0.5 - v * 0.45) * height;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth * Math.max(1, Math.floor(data.length / width));
    }

    ctx.stroke();
  };

  // Redraw when parameters change
  useEffect(() => {
    const ctx = getAudioContext();
    const buffer = renderAudioBuffer(ctx, params, 1.0);
    drawOscilloscope(buffer);
  }, [params]);

  // Handle Preset selection
  const handleLoadPreset = (type: any) => {
    const next = createPreset(type);
    setParams(next);
    setSoundName(next.name);
    setHistory(prev => [next, ...prev.slice(0, 24)]);
    onToast(`Loaded preset: ${type.toUpperCase()}`);
    setTimeout(() => playSound(1.0), 30);
  };

  // Mutate current parameters
  const handleMutate = () => {
    const next = mutateParams(params);
    setParams(next);
    setHistory(prev => [next, ...prev.slice(0, 24)]);
    onToast('Mutated sound parameters (variation generated)!');
    setTimeout(() => playSound(1.0), 30);
  };

  // Randomize all parameters
  const handleRandomize = () => {
    const next = randomizeParams();
    setParams(next);
    setSoundName(next.name);
    setHistory(prev => [next, ...prev.slice(0, 24)]);
    onToast('Generated random sound effect!');
    setTimeout(() => playSound(1.0), 30);
  };

  // Keyboard shortcut listener (Spacebar = Play, A-K = Piano keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        playSound(1.0);
        return;
      }

      const found = PIANO_KEYS.find(k => k.key.toLowerCase() === e.key.toLowerCase());
      if (found) {
        e.preventDefault();
        setActiveKey(found.note);
        const pitchMultiplier = Math.pow(2, found.semitone / 12);
        playSound(pitchMultiplier);
      }
    };

    const handleKeyUp = () => {
      setActiveKey(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [params]);

  // Export 16-bit PCM WAV directly
  const handleExportWav = () => {
    const ctx = getAudioContext();
    const buffer = renderAudioBuffer(ctx, params, 1.0);
    const wavBlob = encodeWavBlob(buffer);
    const cleanName = soundName.trim().replace(/\.[^/.]+$/, '') || 'sound_effect';

    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanName}.wav`;
    a.click();
    URL.revokeObjectURL(url);
    onToast(`Exported "${cleanName}.wav" directly!`);
  };

  const activeProfile = ENGINE_PROFILES[engine];

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#080a0f] select-none">
      
      {/* Hathoria Sub-Header (Presets & Quick Actions) */}
      <div className="h-11 bg-[#101420] border-b border-[#1e2638] px-4 flex items-center justify-between shrink-0 z-20">
        
        {/* Preset Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mr-1 flex items-center gap-1">
            <Sparkles size={11} /> Presets:
          </span>
          {(['coin', 'jump', 'laser', 'explosion', 'hurt', 'powerup', 'blip', 'drone'] as const).map(p => (
            <button
              key={p}
              onClick={() => handleLoadPreset(p)}
              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#141824] hover:bg-[#1f2638] text-slate-200 hover:text-white border border-[#1e2638] transition capitalize"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Mutation & Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw size={11} />}
            onClick={handleBlankWorkspace}
            title="Reset synth parameters to blank neutral state"
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
            title="Open Hathoria Walkthrough"
          >
            Tutorial
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw size={11} className="text-amber-400" />}
            onClick={handleMutate}
            title="Create a slight variation of the current sound (great for repetitive game events like footsteps)"
          >
            Mutate
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Dices size={12} className="text-purple-400" />}
            onClick={handleRandomize}
            title="Roll a completely randomized surprise sound effect"
          >
            Randomize
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Play size={12} className="text-amber-400" />}
            onClick={() => playSound(1.0)}
            title="Play sound effect (Press Spacebar)"
          >
            Play (Space)
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Download size={12} />}
            onClick={handleExportWav}
            className="!bg-amber-600 hover:!bg-amber-500 !border-amber-400/30 text-white font-bold"
          >
            Export .WAV
          </Button>
        </div>
      </div>

      {/* Main 2-Panel Workstation */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* LEFT PANEL: SOUND VAULT & RECENT HISTORY (260px) */}
        <aside className="w-[260px] bg-[#0c101a] border-r border-[#1e2638] flex flex-col shrink-0 min-h-0">
          <div className="px-3 py-2 bg-[#0e121d] border-b border-[#1e2638] flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px] flex items-center gap-1.5">
              <AudioWaveform size={12} className="text-amber-400" />
              <span>Sound History ({history.length})</span>
            </span>
            {history.length > 1 && (
              <button
                onClick={() => {
                  setHistory([params]);
                  onToast('Cleared history vault.');
                }}
                className="text-slate-500 hover:text-rose-400 transition"
                title="Clear history"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {history.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => {
                  setParams(item);
                  setSoundName(item.name);
                  setTimeout(() => playSound(1.0), 30);
                }}
                className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition ${
                  params.id === item.id
                    ? 'bg-amber-500/15 border-amber-500/40 text-white shadow-sm'
                    : 'bg-[#121624] hover:bg-[#171c2b] border-[#1e2638] text-slate-300'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-amber-400">#{history.length - idx}</span>
                    <span>{item.name}</span>
                  </div>
                  <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                    {item.waveType.toUpperCase()} • {(item.attackTime + item.sustainTime + item.decayTime).toFixed(2)}s
                  </div>
                </div>

                <button
                  onClick={e => {
                    e.stopPropagation();
                    setParams(item);
                    setTimeout(() => playSound(1.0), 10);
                  }}
                  className="w-6 h-6 rounded-md hover:bg-white/10 text-slate-400 hover:text-amber-300 flex items-center justify-center transition"
                  title="Play"
                >
                  <Play size={10} />
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* CENTER STAGE: OSCILLOSCOPE + PITCH KEYBOARD */}
        <main className="flex-1 flex flex-col bg-[#080a0f] relative overflow-hidden items-center justify-between p-6">
          
          {/* Top Telemetry Header */}
          <div className="w-full flex items-center justify-between text-xs font-mono text-slate-400">
            <div className="flex items-center gap-3">
              <span>Waveform: <strong className="text-amber-400 capitalize">{params.waveType}</strong></span>
              {params.subEnabled && (
                <>
                  <span>+</span>
                  <span className="text-amber-300 font-semibold">
                    Voice 2: {params.subWaveType ?? 'sine'} ({(params.subOctave ?? -1) > 0 ? `+${params.subOctave}` : (params.subOctave ?? -1)} Oct)
                  </span>
                </>
              )}
              <span>•</span>
              <span>Sample Rate: <strong className="text-white">44,100 Hz</strong></span>
              <span>•</span>
              <span>Duration: <strong className="text-emerald-400">{(params.attackTime + params.sustainTime + params.decayTime).toFixed(2)}s</strong></span>
            </div>
            <div className="text-slate-500 text-[11px]">
              Press <strong className="text-slate-300">Spacebar</strong> to play, or play keys <strong className="text-slate-300">A through K</strong>
            </div>
          </div>

          {/* Oscilloscope Canvas Box */}
          <div className="w-full max-w-2xl h-64 rounded-2xl bg-[#0b0e17] border border-[#212b40] shadow-2xl relative overflow-hidden flex items-center justify-center">
            <canvas
              ref={scopeCanvasRef}
              width={640}
              height={240}
              className="w-full h-full block"
            />
            <div className="absolute top-3 left-4 text-[10px] font-mono text-amber-500/70 tracking-widest uppercase">
              Hathoria Oscilloscope // Real-Time Waveform
            </div>
          </div>

          {/* Interactive Piano Pitch Test Strip */}
          <div className="w-full max-w-2xl bg-[#0c101a] border border-[#1e2638] rounded-2xl p-4 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Music size={13} className="text-amber-400" />
                <span>Playable Pitch Keyboard (Test Across Octaves)</span>
              </span>
              <span className="font-mono text-[11px] text-slate-500">Keyboard shortcuts: A, W, S, E, D, F, T, G...</span>
            </div>

            {/* Keys Strip */}
            <div className="flex items-stretch h-24 rounded-xl overflow-hidden border border-[#1e2638] bg-[#080a0f] relative">
              {PIANO_KEYS.map(k => {
                const isActive = activeKey === k.note;
                const pitchMultiplier = Math.pow(2, k.semitone / 12);

                if (k.isBlack) {
                  return (
                    <button
                      key={k.note}
                      onClick={() => playSound(pitchMultiplier)}
                      className={`w-7 h-14 -mx-3.5 z-10 rounded-b-md transition-colors flex flex-col items-center justify-end pb-1 ${
                        isActive ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/50' : 'bg-[#181d29] hover:bg-[#252d3d] text-slate-400'
                      }`}
                      title={`Note ${k.note} (Key '${k.key}')`}
                    >
                      <span className="text-[9px] font-mono font-bold">{k.key}</span>
                    </button>
                  );
                }

                return (
                  <button
                    key={k.note}
                    onClick={() => playSound(pitchMultiplier)}
                    className={`flex-1 h-full rounded-b transition-colors flex flex-col items-center justify-end pb-1 border-r border-[#1a2133] last:border-r-0 ${
                      isActive ? 'bg-amber-400 text-black' : 'bg-[#0f1422] hover:bg-[#161d30] text-slate-300'
                    }`}
                    title={`Note ${k.note} (Key '${k.key}')`}
                  >
                    <span className="text-[10px] font-bold text-slate-400">{k.note}</span>
                    <span className="text-[9px] font-mono text-slate-500">{k.key}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </main>

        {/* RIGHT INSPECTOR (280px Sound Sculpting Controls) */}
        <aside className="w-[280px] bg-[#0c101a] border-l border-[#1e2638] flex flex-col shrink-0 overflow-y-auto select-none">
          
          {/* Section 1: Waveform Shape */}
          <div className="p-4 border-b border-[#1e2638] space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sliders size={13} className="text-amber-400" />
              <span>Oscillator Waveform</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {(['square', 'sawtooth', 'sine', 'triangle', 'noise'] as WaveType[]).map(w => (
                <button
                  key={w}
                  onClick={() => {
                    setParams(prev => ({ ...prev, waveType: w }));
                    playSound(1.0);
                  }}
                  className={`px-2 py-1.5 rounded-lg text-xs font-semibold capitalize border transition ${
                    params.waveType === w
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                      : 'bg-[#121622] text-slate-400 hover:text-white border-[#1e2638]'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Volume & ADSR Envelopes */}
          <div className="p-4 border-b border-[#1e2638] space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Activity size={13} className="text-amber-400" />
              <span>Volume &amp; Envelopes</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <NumberInput
                label="Attack Time"
                value={Number(params.attackTime.toFixed(3))}
                onChange={v => setParams(prev => ({ ...prev, attackTime: Math.max(0, v) }))}
                unit="s"
                step={0.01}
                min={0}
                max={2}
              />
              <NumberInput
                label="Sustain Time"
                value={Number(params.sustainTime.toFixed(3))}
                onChange={v => setParams(prev => ({ ...prev, sustainTime: Math.max(0.01, v) }))}
                unit="s"
                step={0.01}
                min={0.01}
                max={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <NumberInput
                label="Sustain Punch"
                value={Number(params.sustainPunch.toFixed(2))}
                onChange={v => setParams(prev => ({ ...prev, sustainPunch: Math.max(0, v) }))}
                unit="x"
                step={0.05}
                min={0}
                max={2}
                tooltip="Sharp initial volume punch during sustain"
              />
              <NumberInput
                label="Decay Time"
                value={Number(params.decayTime.toFixed(3))}
                onChange={v => setParams(prev => ({ ...prev, decayTime: Math.max(0.01, v) }))}
                unit="s"
                step={0.01}
                min={0.01}
                max={3}
              />
            </div>
          </div>

          {/* Section 3: Pitch & Slide */}
          <div className="p-4 border-b border-[#1e2638] space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <AudioWaveform size={13} className="text-amber-400" />
              <span>Frequency &amp; Pitch Slide</span>
            </div>

            <NumberInput
              label="Start Frequency"
              value={Math.round(params.startFrequency)}
              onChange={v => setParams(prev => ({ ...prev, startFrequency: Math.max(20, v) }))}
              unit="Hz"
              step={10}
              min={20}
              max={3000}
              highlight={true}
            />

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Pitch Slide (Bend)</span>
                <span className="font-mono text-amber-400">{params.slide.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.05}
                value={params.slide}
                onChange={e => setParams(prev => ({ ...prev, slide: Number(e.target.value) }))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Section 4: Dual-Voice Sound Layering (Sub-Oscillator) */}
          <Accordion
            title="Dual-Voice Sound Layering"
            icon={<Layers size={13} className={params.subEnabled ? 'text-amber-400' : 'text-slate-500'} />}
            defaultOpen={params.subEnabled}
          >
            <div className="space-y-3">
              {/* Voice 2 Toggle */}
              <div className="flex items-center justify-between pb-1 border-b border-[#1e2638]">
                <span className="text-xs font-semibold text-slate-300">Voice 2 Layer</span>
                <button
                  onClick={() => {
                    setParams(prev => ({ ...prev, subEnabled: !prev.subEnabled }));
                    setTimeout(() => playSound(1.0), 30);
                  }}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border transition ${
                    params.subEnabled
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                      : 'bg-[#121622] text-slate-400 hover:text-white border-[#1e2638]'
                  }`}
                >
                  {params.subEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {params.subEnabled && (
                <>
                  {/* Sub-Voice Waveform */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Voice 2 Waveform
                    </label>
                    <div className="grid grid-cols-5 gap-1">
                      {(['square', 'sawtooth', 'sine', 'triangle', 'noise'] as WaveType[]).map(w => (
                        <button
                          key={w}
                          onClick={() => {
                            setParams(prev => ({ ...prev, subWaveType: w }));
                            playSound(1.0);
                          }}
                          className={`py-1 rounded text-[10px] font-semibold capitalize border transition truncate px-0.5 ${
                            (params.subWaveType ?? 'sine') === w
                              ? 'bg-amber-500/25 text-amber-300 border-amber-500/60 shadow-sm'
                              : 'bg-[#121622] text-slate-400 hover:text-white border-[#1e2638]'
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Octave Shift */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Pitch Interval
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { label: '-2 Oct', val: -2 },
                        { label: '-1 Oct', val: -1 },
                        { label: 'Unison', val: 0 },
                        { label: '+1 Oct', val: 1 }
                      ].map(oct => (
                        <button
                          key={oct.val}
                          onClick={() => {
                            setParams(prev => ({ ...prev, subOctave: oct.val }));
                            playSound(1.0);
                          }}
                          className={`py-1 rounded text-[10px] font-mono border transition ${
                            (params.subOctave ?? -1) === oct.val
                              ? 'bg-amber-500/25 text-amber-300 border-amber-500/60 shadow-sm'
                              : 'bg-[#121622] text-slate-400 hover:text-white border-[#1e2638]'
                          }`}
                        >
                          {oct.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Detune (Chorus fatness) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Detune (Chorus Fatness)</span>
                      <span className="font-mono text-amber-400">{Math.round(params.subDetune ?? 0)} cents</span>
                    </div>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      step={1}
                      value={params.subDetune ?? 0}
                      onChange={e => setParams(prev => ({ ...prev, subDetune: Number(e.target.value) }))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  {/* Voice 2 Mix Balance */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Voice 2 Mix Balance</span>
                      <span className="font-mono text-amber-400">{Math.round((params.subMix ?? 0.35) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={params.subMix ?? 0.35}
                      onChange={e => setParams(prev => ({ ...prev, subMix: Number(e.target.value) }))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </>
              )}
            </div>
          </Accordion>

          {/* Section 5: Advanced Tone & Lo-Fi Crunch */}
          <Accordion
            title="Lo-Fi Bitcrusher &amp; Vibrato"
            icon={<Sliders size={13} className="text-slate-500" />}
          >
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Bitcrusher Depth</span>
                <span className="font-mono text-amber-400">{params.bitCrush} Bits</span>
              </div>
              <input
                type="range"
                min={4}
                max={16}
                step={1}
                value={params.bitCrush}
                onChange={e => setParams(prev => ({ ...prev, bitCrush: Number(e.target.value) }))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Vibrato Depth</span>
                <span className="font-mono text-amber-400">{params.vibratoDepth.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={params.vibratoDepth}
                onChange={e => setParams(prev => ({ ...prev, vibratoDepth: Number(e.target.value) }))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {params.waveType === 'square' && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Square Duty Cycle</span>
                  <span className="font-mono text-amber-400">{Math.round(params.dutyCycle * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  value={params.dutyCycle}
                  onChange={e => setParams(prev => ({ ...prev, dutyCycle: Number(e.target.value) }))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            )}
          </Accordion>

          {/* Section 5: Export Hub */}
          <div className="p-4 space-y-2.5 mt-auto border-t border-[#1e2638] bg-[#0e121d]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Export Audio File</span>
              <span className="text-amber-400 font-mono font-semibold">16-bit PCM</span>
            </div>

            {/* Custom Sound Name */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-medium">Filename</label>
              <div className="flex items-center bg-[#121622] border border-[#1e2638] rounded-md px-2 h-7 focus-within:border-amber-500 transition">
                <Volume2 size={12} className="text-slate-500 mr-1.5 shrink-0" />
                <input
                  type="text"
                  value={soundName}
                  onChange={e => setSoundName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '_'))}
                  placeholder="sound_name"
                  className="w-full bg-transparent text-xs font-mono text-slate-100 outline-none"
                />
                <span className="text-[10px] font-mono text-slate-500 shrink-0">.wav</span>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              className="w-full !h-9 !bg-amber-600 hover:!bg-amber-500 !border-amber-400/30 text-white font-bold"
              icon={<Download size={13} />}
              onClick={handleExportWav}
            >
              Export {soundName || 'sound'}.wav
            </Button>
          </div>

        </aside>
      </div>

      {/* Tutorial Walkthrough Modal */}
      <WorkstationTutorialModal
        tutorial={WORKSTATION_TUTORIALS.hathoria}
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        isFirstVisitPrompt={isFirstVisit}
      />

    </div>
  );
};
