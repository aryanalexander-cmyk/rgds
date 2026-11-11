import React, { useState, useEffect, useRef } from 'react';
import { TargetEngine, ENGINE_PROFILES } from '../types/engine';
import {
  ChannelId,
  TrackerCell,
  TrackerStep,
  TrackerPattern,
  TrackerSong,
  NOTE_NAMES,
  noteToFreq,
  DEFAULT_CHANNELS,
  createEmptyPattern,
  createSongPreset,
  renderSongAudioBuffer,
  generateMidiFileBlob,
  generateGodotChiptuneCode,
  generateUnityChiptuneCode
} from '../core/resonator/tracker';
import { encodeWavBlob } from '../core/hathoria/synth';
import { createZipArchive, ZipFileEntry } from '../core/stonecutter/zip';
import { Button } from '../components/ui/Button';
import { NumberInput } from '../components/ui/NumberInput';
import { Accordion } from '../components/ui/Accordion';
import { WorkstationTutorialModal } from '../components/ui/WorkstationTutorialModal';
import { WORKSTATION_TUTORIALS } from '../core/tutorial/tutorialData';
import {
  Music,
  Play,
  Pause,
  Square,
  RotateCcw,
  Volume2,
  VolumeX,
  Sliders,
  Copy,
  Check,
  Code2,
  Download,
  Sparkles,
  Layers,
  Plus,
  Trash2,
  Radio,
  Activity,
  Headphones,
  HelpCircle
} from 'lucide-react';

interface ResonatorPageProps {
  engine: TargetEngine;
  onToast: (msg: string) => void;
}

export const ResonatorPage: React.FC<ResonatorPageProps> = ({
  engine,
  onToast
}) => {
  const [song, setSong] = useState<TrackerSong>(() => createSongPreset('overworld'));
  const [activePatternId, setActivePatternId] = useState<string>('pat_a');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [selectedCell, setSelectedCell] = useState<{ step: number; ch: ChannelId } | null>(null);
  const [codeTab, setCodeTab] = useState<'godot' | 'unity'>(
    engine === 'unity' ? 'unity' : 'godot'
  );
  const [copied, setCopied] = useState<boolean>(false);

  // Live Audio Engine References
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const stepRef = useRef<number>(0);

  // Sync engine tab
  useEffect(() => {
    if (engine === 'unity') setCodeTab('unity');
    else setCodeTab('godot');
  }, [engine]);

  // First-visit tutorial state
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('rgds_tutorial_resonator_dismissed');
      if (!dismissed) {
        setIsTutorialOpen(true);
        setIsFirstVisit(true);
      }
    } catch {}
  }, []);

  const handleBlankWorkspace = () => {
    setIsPlaying(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const emptyPat = createEmptyPattern('pat_a', 'Pattern 1', 16);
    setSong(prev => ({
      ...prev,
      patternOrder: ['pat_a'],
      patterns: {
        pat_a: emptyPat
      }
    }));
    setActivePatternId('pat_a');
    setCurrentStep(0);
    stepRef.current = 0;
    onToast('Cleared all tracks to blank pattern.');
  };

  // Ensure AudioContext is ready on user gesture
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Play single note sound immediately for auditioning
  const previewNote = (chId: ChannelId, noteStr: string) => {
    if (!noteStr || noteStr === '---' || noteStr === 'OFF') return;
    const ctx = initAudio();
    const freq = noteToFreq(noteStr);
    const ch = song.channels[chId];
    const now = ctx.currentTime;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(ch.volume * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (ch.decay || 0.25));
    gain.connect(ctx.destination);

    if (chId === 'pulse1' || chId === 'pulse2') {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + (ch.decay || 0.25));
    } else if (chId === 'triangle') {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + (ch.decay || 0.35));
    } else if (chId === 'noise') {
      // Noise burst
      const bufferSize = ctx.sampleRate * (ch.decay || 0.12);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.connect(gain);
      noise.start(now);
    }
  };

  // Live Sequencer Playback Loop
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const ctx = initAudio();
    const secondsPerStep = (60 / song.bpm) / 4;
    const stepMs = secondsPerStep * 1000;

    const tick = () => {
      const curP = song.patterns[activePatternId];
      if (!curP) return;

      const sIdx = stepRef.current % curP.length;
      setCurrentStep(sIdx);
      const step = curP.steps[sIdx];

      // Play notes on 4 channels
      const anySolo = Object.values(song.channels).some(c => c.solo);

      (['pulse1', 'pulse2', 'triangle', 'noise'] as ChannelId[]).forEach(chId => {
        const ch = song.channels[chId];
        if (ch.muted || (anySolo && !ch.solo)) return;

        const cell = step[chId];
        if (!cell || cell.note === '---' || cell.note === 'OFF') return;

        const freq = noteToFreq(cell.note);
        if (freq <= 0 && chId !== 'noise') return;

        const now = ctx.currentTime;
        const gain = ctx.createGain();
        const vol = (cell.velocity / 100) * ch.volume * 0.4;
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (ch.decay || 0.25));
        gain.connect(ctx.destination);

        if (chId === 'pulse1' || chId === 'pulse2') {
          const osc = ctx.createOscillator();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now);
          osc.connect(gain);
          osc.start(now);
          osc.stop(now + (ch.decay || 0.25));
        } else if (chId === 'triangle') {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now);
          osc.connect(gain);
          osc.start(now);
          osc.stop(now + (ch.decay || 0.35));
        } else if (chId === 'noise') {
          const bufferSize = Math.floor(ctx.sampleRate * (ch.decay || 0.12));
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          noise.connect(gain);
          noise.start(now);
        }
      });

      stepRef.current = (stepRef.current + 1) % curP.length;
    };

    tick();
    timerRef.current = window.setInterval(tick, stepMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, activePatternId, song.bpm, song.channels, song.patterns]);

  // Load Preset
  const handleLoadPreset = (preset: 'overworld' | 'boss_battle' | 'starry_night') => {
    setIsPlaying(false);
    stepRef.current = 0;
    setCurrentStep(0);
    const newSong = createSongPreset(preset);
    setSong(newSong);
    setActivePatternId('pat_a');
    onToast(`Loaded preset: ${newSong.name}`);
  };

  // Modify Tracker Cell
  const handleCellChange = (stepIdx: number, chId: ChannelId, note: string) => {
    setSong(prev => {
      const pat = prev.patterns[activePatternId];
      if (!pat) return prev;
      const updatedSteps = [...pat.steps];
      const curCell = updatedSteps[stepIdx][chId];
      updatedSteps[stepIdx] = {
        ...updatedSteps[stepIdx],
        [chId]: { ...curCell, note }
      };
      return {
        ...prev,
        patterns: {
          ...prev.patterns,
          [activePatternId]: { ...pat, steps: updatedSteps }
        }
      };
    });
    previewNote(chId, note);
  };

  // Toggle Mute / Solo
  const toggleMute = (chId: ChannelId) => {
    setSong(prev => ({
      ...prev,
      channels: {
        ...prev.channels,
        [chId]: { ...prev.channels[chId], muted: !prev.channels[chId].muted }
      }
    }));
  };

  const toggleSolo = (chId: ChannelId) => {
    setSong(prev => ({
      ...prev,
      channels: {
        ...prev.channels,
        [chId]: { ...prev.channels[chId], solo: !prev.channels[chId].solo }
      }
    }));
  };

  // Export 16-Bit PCM WAV File
  const handleExportWav = async () => {
    const offlineCtx = new OfflineAudioContext(1, 44100 * 10, 44100);
    const audioBuf = renderSongAudioBuffer(offlineCtx, song);
    const wavBlob = encodeWavBlob(audioBuf);

    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${song.name}.wav`;
    a.click();
    URL.revokeObjectURL(url);
    onToast(`Exported ${song.name}.wav!`);
  };

  // Export Standard MIDI (.mid) File
  const handleExportMidi = () => {
    const midiBlob = generateMidiFileBlob(song);
    const url = URL.createObjectURL(midiBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${song.name}.mid`;
    a.click();
    URL.revokeObjectURL(url);
    onToast(`Exported ${song.name}.mid!`);
  };

  // Export 1-Click Game Jam Bundle (.zip)
  const handleExportZip = async () => {
    const offlineCtx = new OfflineAudioContext(1, 44100 * 10, 44100);
    const audioBuf = renderSongAudioBuffer(offlineCtx, song);
    const wavBlob = encodeWavBlob(audioBuf);
    const midiBlob = generateMidiFileBlob(song);

    const files: ZipFileEntry[] = [
      { name: `${song.name}.wav`, data: new Uint8Array(await wavBlob.arrayBuffer()) },
      { name: `${song.name}.mid`, data: new Uint8Array(await midiBlob.arrayBuffer()) }
    ];

    if (engine === 'godot') {
      const code = generateGodotChiptuneCode(song.name, song.bpm);
      files.push({ name: `${song.name}_music.gd`, data: code });
    } else {
      const code = generateUnityChiptuneCode(song.name, song.bpm);
      files.push({ name: `${song.name}MusicPlayer.cs`, data: code });
    }

    const zipBlob = await createZipArchive(files);
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${song.name}_chiptune_bundle.zip`;
    a.click();
    URL.revokeObjectURL(url);
    onToast(`Exported ${song.name}_chiptune_bundle.zip!`);
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    onToast('Copied chiptune code snippet!');
    setTimeout(() => setCopied(false), 2000);
  };

  const currentPattern = song.patterns[activePatternId] || createEmptyPattern('pat_a', 'Pattern A');
  const activeProfile = ENGINE_PROFILES[engine];

  const generatedCode = codeTab === 'godot'
    ? generateGodotChiptuneCode(song.name, song.bpm)
    : generateUnityChiptuneCode(song.name, song.bpm);

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#080a0f] select-none">
      
      {/* Resonator Sub-Header */}
      <div className="h-11 bg-[#101420] border-b border-[#1e2638] px-4 flex items-center justify-between shrink-0 z-20">
        
        {/* Left: Presets & Pattern Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mr-1 flex items-center gap-1">
            <Music size={12} /> Presets:
          </span>

          <button
            onClick={() => handleLoadPreset('overworld')}
            className="px-2 py-1 rounded-md text-xs font-semibold bg-[#141824] hover:bg-[#1f2638] text-slate-200 border border-[#1e2638] transition"
          >
            Overworld Jam
          </button>
          <button
            onClick={() => handleLoadPreset('boss_battle')}
            className="px-2 py-1 rounded-md text-xs font-semibold bg-[#141824] hover:bg-[#1f2638] text-slate-200 border border-[#1e2638] transition"
          >
            Boss Battle
          </button>
          <button
            onClick={() => handleLoadPreset('starry_night')}
            className="px-2 py-1 rounded-md text-xs font-semibold bg-[#141824] hover:bg-[#1f2638] text-slate-200 border border-[#1e2638] transition"
          >
            Cozy Lofi
          </button>

          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw size={11} />}
            onClick={handleBlankWorkspace}
            title="Clear all tracks to blank pattern"
          >
            Blank
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<HelpCircle size={12} className="text-purple-400" />}
            onClick={() => {
              setIsFirstVisit(false);
              setIsTutorialOpen(true);
            }}
            title="Open Resonator Walkthrough"
          >
            Tutorial
          </Button>

          <div className="h-4 w-[1px] bg-[#1e2638] mx-1" />

          {/* Pattern Switcher */}
          <div className="flex items-center bg-[#0a0d14] p-0.5 rounded-lg border border-[#1e2638]">
            {Object.keys(song.patterns).map(pId => (
              <button
                key={pId}
                onClick={() => {
                  setActivePatternId(pId);
                  stepRef.current = 0;
                  setCurrentStep(0);
                }}
                className={`px-2 py-0.5 rounded text-xs font-semibold transition ${
                  activePatternId === pId
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {pId.toUpperCase().replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Transport Controls & Tempo */}
        <div className="flex items-center gap-3">
          
          {/* BPM Input */}
          <div className="flex items-center gap-1.5 bg-[#141824] border border-[#1e2638] rounded-md px-2 py-0.5 text-xs font-mono">
            <span className="text-slate-400 text-[10px] uppercase font-bold">BPM:</span>
            <input
              type="number"
              min={60}
              max={240}
              value={song.bpm}
              onChange={e => setSong(prev => ({ ...prev, bpm: Math.max(40, Number(e.target.value)) }))}
              className="w-10 bg-transparent text-amber-400 font-bold outline-none text-center"
            />
          </div>

          {/* Play / Pause / Stop Buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant={isPlaying ? 'primary' : 'secondary'}
              size="sm"
              icon={isPlaying ? <Pause size={12} /> : <Play size={12} className="text-emerald-400" />}
              onClick={() => {
                initAudio();
                setIsPlaying(p => !p);
              }}
              title="Play / Pause Tracker (Spacebar)"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={<Square size={11} className="text-rose-400" />}
              onClick={() => {
                setIsPlaying(false);
                stepRef.current = 0;
                setCurrentStep(0);
              }}
              title="Stop Tracker"
            >
              Stop
            </Button>
          </div>
        </div>
      </div>

      {/* Main 3-Panel Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* LEFT PANEL: 4-CHANNEL MIXER STRIPS (280px) */}
        <aside className="w-[280px] bg-[#0c101a] border-r border-[#1e2638] flex flex-col shrink-0 min-h-0 overflow-y-auto">
          
          {/* Header */}
          <div className="p-3 bg-[#0e121d] border-b border-[#1e2638] flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sliders size={13} className="text-amber-400" />
              <span>4-Channel Mixer</span>
            </span>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">
              NES RP2A03
            </span>
          </div>

          {/* Channels List */}
          <div className="p-3 space-y-3 flex-1 overflow-y-auto">
            {(['pulse1', 'pulse2', 'triangle', 'noise'] as ChannelId[]).map(chId => {
              const ch = song.channels[chId];
              const isPulse = chId === 'pulse1' || chId === 'pulse2';

              return (
                <div
                  key={chId}
                  className="p-2.5 rounded-xl bg-[#0f131f] border border-[#1e2638] space-y-2"
                >
                  {/* Channel Title & Mute / Solo */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{ch.name}</span>
                    <div className="flex items-center gap-1 text-[10px] font-bold">
                      <button
                        onClick={() => toggleMute(chId)}
                        className={`px-1.5 py-0.5 rounded border transition ${
                          ch.muted
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                            : 'bg-[#141824] text-slate-400 hover:text-white border-[#1e2638]'
                        }`}
                      >
                        Mute
                      </button>
                      <button
                        onClick={() => toggleSolo(chId)}
                        className={`px-1.5 py-0.5 rounded border transition ${
                          ch.solo
                            ? 'bg-amber-500/25 text-amber-300 border-amber-500/60 shadow-sm'
                            : 'bg-[#141824] text-slate-400 hover:text-white border-[#1e2638]'
                        }`}
                      >
                        Solo
                      </button>
                    </div>
                  </div>

                  {/* Volume Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Volume</span>
                      <span className="font-mono text-amber-400">{Math.round(ch.volume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={ch.volume}
                      onChange={e =>
                        setSong(prev => ({
                          ...prev,
                          channels: {
                            ...prev.channels,
                            [chId]: { ...ch, volume: Number(e.target.value) }
                          }
                        }))
                      }
                      className="w-full accent-amber-500 cursor-pointer h-1.5"
                    />
                  </div>

                  {/* Duty Cycle (for Pulse) or Decay */}
                  {isPulse ? (
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">
                        Duty Cycle
                      </label>
                      <div className="grid grid-cols-4 gap-1 text-[10px] font-mono">
                        {[0.125, 0.25, 0.5, 0.75].map(d => (
                          <button
                            key={d}
                            onClick={() =>
                              setSong(prev => ({
                                ...prev,
                                channels: {
                                  ...prev.channels,
                                  [chId]: { ...ch, dutyCycle: d }
                                }
                              }))
                            }
                            className={`py-0.5 rounded border transition ${
                              (ch.dutyCycle || 0.5) === d
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                                : 'bg-[#141824] text-slate-500 hover:text-white border-[#1e2638]'
                            }`}
                          >
                            {Math.round(d * 100)}%
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Decay Time</span>
                        <span className="font-mono text-amber-400">{(ch.decay || 0.25).toFixed(2)}s</span>
                      </div>
                      <input
                        type="range"
                        min={0.05}
                        max={0.8}
                        step={0.02}
                        value={ch.decay || 0.25}
                        onChange={e =>
                          setSong(prev => ({
                            ...prev,
                            channels: {
                              ...prev.channels,
                              [chId]: { ...ch, decay: Number(e.target.value) }
                            }
                          }))
                        }
                        className="w-full accent-amber-500 cursor-pointer h-1.5"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </aside>

        {/* CENTER STAGE: TRACKER MATRIX (16-Step Pattern Sequencer) */}
        <main className="flex-1 flex flex-col bg-[#07090f] relative overflow-hidden select-none">
          
          {/* Tracker Column Headers */}
          <div className="h-9 border-b border-[#1e2638] bg-[#0c101a] px-4 grid grid-cols-5 text-xs font-mono font-bold text-slate-400 items-center">
            <div className="text-center text-slate-500">Step #</div>
            <div className="text-center text-amber-400">Pulse 1 (Lead)</div>
            <div className="text-center text-yellow-400">Pulse 2 (Harm)</div>
            <div className="text-center text-emerald-400">Triangle (Bass)</div>
            <div className="text-center text-rose-400">Noise (Drums)</div>
          </div>

          {/* Tracker Steps List */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
            {currentPattern.steps.map(st => {
              const isActive = st.stepIndex === currentStep && isPlaying;
              const isBeat = st.stepIndex % 4 === 0;

              return (
                <div
                  key={st.stepIndex}
                  className={`grid grid-cols-5 items-center py-1 px-2 rounded-lg border text-xs font-mono transition-colors ${
                    isActive
                      ? 'bg-amber-500/20 border-amber-500/60 shadow-md shadow-amber-950/40 text-white'
                      : isBeat
                      ? 'bg-[#121624] border-[#222a3d] text-slate-200'
                      : 'bg-[#0a0d14] border-[#161d2d] text-slate-400 hover:border-[#20293d]'
                  }`}
                >
                  {/* Step Index Indicator */}
                  <div className="flex items-center justify-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-amber-400 animate-ping' : isBeat ? 'bg-indigo-400' : 'bg-transparent'}`} />
                    <span className="font-bold">{st.stepIndex.toString().padStart(2, '0')}</span>
                  </div>

                  {/* Pulse 1 Cell */}
                  <div className="flex justify-center">
                    <select
                      value={st.pulse1.note}
                      onChange={e => handleCellChange(st.stepIndex, 'pulse1', e.target.value)}
                      className={`bg-transparent border rounded px-1.5 py-0.5 text-xs font-bold outline-none cursor-pointer ${
                        st.pulse1.note !== '---'
                          ? 'border-amber-500/40 text-amber-300 bg-amber-500/10'
                          : 'border-transparent text-slate-500 hover:border-[#222a3d]'
                      }`}
                    >
                      <option value="---" className="bg-[#0e111a] text-slate-500">--- (Rest)</option>
                      <option value="OFF" className="bg-[#0e111a] text-rose-400">OFF (Cut)</option>
                      {[3, 4, 5].flatMap(oct =>
                        NOTE_NAMES.map(n => (
                          <option key={`${n}${oct}`} value={`${n}${oct}`} className="bg-[#0e111a] text-amber-300">
                            {n}{oct}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Pulse 2 Cell */}
                  <div className="flex justify-center">
                    <select
                      value={st.pulse2.note}
                      onChange={e => handleCellChange(st.stepIndex, 'pulse2', e.target.value)}
                      className={`bg-transparent border rounded px-1.5 py-0.5 text-xs font-bold outline-none cursor-pointer ${
                        st.pulse2.note !== '---'
                          ? 'border-yellow-500/40 text-yellow-300 bg-yellow-500/10'
                          : 'border-transparent text-slate-500 hover:border-[#222a3d]'
                      }`}
                    >
                      <option value="---" className="bg-[#0e111a] text-slate-500">--- (Rest)</option>
                      <option value="OFF" className="bg-[#0e111a] text-rose-400">OFF (Cut)</option>
                      {[3, 4, 5].flatMap(oct =>
                        NOTE_NAMES.map(n => (
                          <option key={`${n}${oct}`} value={`${n}${oct}`} className="bg-[#0e111a] text-yellow-300">
                            {n}{oct}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Triangle Cell */}
                  <div className="flex justify-center">
                    <select
                      value={st.triangle.note}
                      onChange={e => handleCellChange(st.stepIndex, 'triangle', e.target.value)}
                      className={`bg-transparent border rounded px-1.5 py-0.5 text-xs font-bold outline-none cursor-pointer ${
                        st.triangle.note !== '---'
                          ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                          : 'border-transparent text-slate-500 hover:border-[#222a3d]'
                      }`}
                    >
                      <option value="---" className="bg-[#0e111a] text-slate-500">--- (Rest)</option>
                      <option value="OFF" className="bg-[#0e111a] text-rose-400">OFF (Cut)</option>
                      {[1, 2, 3].flatMap(oct =>
                        NOTE_NAMES.map(n => (
                          <option key={`${n}${oct}`} value={`${n}${oct}`} className="bg-[#0e111a] text-emerald-300">
                            {n}{oct} (Bass)
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Noise Cell */}
                  <div className="flex justify-center">
                    <select
                      value={st.noise.note}
                      onChange={e => handleCellChange(st.stepIndex, 'noise', e.target.value)}
                      className={`bg-transparent border rounded px-1.5 py-0.5 text-xs font-bold outline-none cursor-pointer ${
                        st.noise.note !== '---'
                          ? 'border-rose-500/40 text-rose-300 bg-rose-500/10'
                          : 'border-transparent text-slate-500 hover:border-[#222a3d]'
                      }`}
                    >
                      <option value="---" className="bg-[#0e111a] text-slate-500">--- (Rest)</option>
                      <option value="OFF" className="bg-[#0e111a] text-rose-400">OFF (Cut)</option>
                      <option value="C-2" className="bg-[#0e111a] text-rose-300">🥁 Kick (C-2)</option>
                      <option value="D-3" className="bg-[#0e111a] text-amber-300">💥 Snare (D-3)</option>
                      <option value="G-4" className="bg-[#0e111a] text-cyan-300">⚡ Hi-Hat (G-4)</option>
                      <option value="A-5" className="bg-[#0e111a] text-purple-300">✨ Crash (A-5)</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Audition Piano Strip at Bottom */}
          <div className="h-14 bg-[#0c101a] border-t border-[#1e2638] px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Headphones size={13} className="text-amber-400" />
              <span className="font-semibold">Audition Lead:</span>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              {['C-4', 'D-4', 'E-4', 'F-4', 'G-4', 'A-4', 'B-4', 'C-5'].map(note => (
                <button
                  key={note}
                  onClick={() => previewNote('pulse1', note)}
                  className="px-2 py-1 rounded bg-[#141824] hover:bg-amber-500/20 hover:text-amber-300 border border-[#1e2638] text-xs font-mono font-bold text-slate-300 transition"
                >
                  {note}
                </button>
              ))}
            </div>
          </div>

        </main>

        {/* RIGHT PANEL: CODE GENERATOR & EXPORTS (310px) */}
        <aside className="w-[310px] bg-[#0c101a] border-l border-[#1e2638] flex flex-col shrink-0 min-h-0 overflow-y-auto">
          
          {/* Header */}
          <div className="p-3 bg-[#0e121d] border-b border-[#1e2638] flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Code2 size={13} className="text-amber-400" />
              <span>Engine Music Controller</span>
            </span>

            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">
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
                    ? 'bg-amber-500/20 text-amber-300 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Godot 4 (.gd)
              </button>
              <button
                onClick={() => setCodeTab('unity')}
                className={`flex-1 py-1 rounded font-semibold transition ${
                  codeTab === 'unity'
                    ? 'bg-amber-500/20 text-amber-300 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Unity C#
              </button>
            </div>
          </div>

          {/* Code Snippet Box */}
          <div className="p-3 flex-1 flex flex-col min-h-0 space-y-2.5">
            <div className="relative flex-1 min-h-[200px] rounded-xl bg-[#07090e] border border-[#1e2638] p-3 font-mono text-[11px] text-slate-300 overflow-auto group">
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

          {/* Export Action Hub */}
          <div className="p-3 mt-auto border-t border-[#1e2638] bg-[#0e121d] space-y-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Song Track Name
              </label>
              <input
                type="text"
                value={song.name}
                onChange={e => setSong(prev => ({ ...prev, name: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '_') }))}
                className="w-full bg-[#121622] border border-[#1e2638] rounded-md px-2.5 h-7 text-xs font-mono text-white outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={12} />}
                onClick={handleExportWav}
              >
                Export .WAV
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={12} />}
                onClick={handleExportMidi}
              >
                Export .MID
              </Button>
            </div>

            <Button
              variant="primary"
              size="md"
              className="w-full !h-9 !bg-amber-600 hover:!bg-amber-500 !border-amber-400/30 text-white font-bold"
              icon={<Download size={13} />}
              onClick={handleExportZip}
            >
              Export {song.name}_bundle.zip
            </Button>
          </div>

        </aside>

      </div>

      {/* Tutorial Walkthrough Modal */}
      <WorkstationTutorialModal
        tutorial={WORKSTATION_TUTORIALS.resonator}
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        isFirstVisitPrompt={isFirstVisit}
      />

    </div>
  );
};
