/**
 * Resonator Core Chiptune Tracker & 4-Track Music Sequencer
 * 4-Voice Retro Audio Engine (Pulse 1, Pulse 2, Triangle, Noise)
 * Real-time Web Audio Synthesizer, Offline PCM WAV Renderer, and Binary MIDI (.mid) Exporter.
 */

export type ChannelId = 'pulse1' | 'pulse2' | 'triangle' | 'noise';

export interface ChannelConfig {
  id: ChannelId;
  name: string;
  volume: number; // 0.0 to 1.0
  muted: boolean;
  solo: boolean;
  dutyCycle?: number; // 0.125, 0.25, 0.5, 0.75 for pulse
  decay?: number;     // note decay time
}

export interface TrackerCell {
  note: string;       // e.g. "C-4", "D#4", "---" (empty), "OFF" (note stop)
  octave?: number;
  velocity: number;   // 0 to 100 (percentage)
}

export interface TrackerStep {
  stepIndex: number;
  pulse1: TrackerCell;
  pulse2: TrackerCell;
  triangle: TrackerCell;
  noise: TrackerCell;
}

export interface TrackerPattern {
  id: string;
  name: string;
  length: number; // 16 or 32 steps
  steps: TrackerStep[];
}

export interface TrackerSong {
  name: string;
  bpm: number;
  patternOrder: string[]; // sequence of pattern IDs, e.g. ["A", "A", "B", "A"]
  patterns: Record<string, TrackerPattern>;
  channels: Record<ChannelId, ChannelConfig>;
}

export const NOTE_NAMES = ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-'];

/**
 * Convert note string (e.g. "C-4", "A#3") to Frequency in Hz
 */
export function noteToFreq(noteStr: string): number {
  if (!noteStr || noteStr === '---' || noteStr === 'OFF') return 0;
  const name = noteStr.slice(0, 2);
  const octave = parseInt(noteStr.slice(2), 10);
  const noteIdx = NOTE_NAMES.indexOf(name);
  if (noteIdx === -1 || isNaN(octave)) return 0;

  // MIDI note number: C0 = 12, A4 = 69
  const midiNote = (octave + 1) * 12 + noteIdx;
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

/**
 * Convert note string to MIDI note number (e.g. "C-4" -> 60)
 */
export function noteToMidiNumber(noteStr: string): number {
  if (!noteStr || noteStr === '---' || noteStr === 'OFF') return 0;
  const name = noteStr.slice(0, 2);
  const octave = parseInt(noteStr.slice(2), 10);
  const noteIdx = NOTE_NAMES.indexOf(name);
  if (noteIdx === -1 || isNaN(octave)) return 0;
  return (octave + 1) * 12 + noteIdx;
}

export const DEFAULT_CHANNELS: Record<ChannelId, ChannelConfig> = {
  pulse1: {
    id: 'pulse1',
    name: 'Pulse 1 (Lead)',
    volume: 0.8,
    muted: false,
    solo: false,
    dutyCycle: 0.5,
    decay: 0.25
  },
  pulse2: {
    id: 'pulse2',
    name: 'Pulse 2 (Harmony)',
    volume: 0.7,
    muted: false,
    solo: false,
    dutyCycle: 0.25,
    decay: 0.22
  },
  triangle: {
    id: 'triangle',
    name: 'Triangle (Bass)',
    volume: 0.9,
    muted: false,
    solo: false,
    decay: 0.35
  },
  noise: {
    id: 'noise',
    name: 'Noise (Drums)',
    volume: 0.65,
    muted: false,
    solo: false,
    decay: 0.12
  }
};

/**
 * Creates an empty pattern with N steps
 */
export function createEmptyPattern(id: string, name: string, length: number = 16): TrackerPattern {
  const steps: TrackerStep[] = [];
  for (let i = 0; i < length; i++) {
    steps.push({
      stepIndex: i,
      pulse1: { note: '---', velocity: 80 },
      pulse2: { note: '---', velocity: 70 },
      triangle: { note: '---', velocity: 90 },
      noise: { note: '---', velocity: 60 }
    });
  }
  return { id, name, length, steps };
}

/**
 * 1-Click Game Jam Song Presets
 */
export function createSongPreset(preset: 'overworld' | 'boss_battle' | 'starry_night'): TrackerSong {
  const channels = JSON.parse(JSON.stringify(DEFAULT_CHANNELS));

  if (preset === 'overworld') {
    // Upbeat 8-bit platformer anthem (Key: C Major, 136 BPM)
    const patA = createEmptyPattern('pat_a', 'Pattern A (Main Theme)', 16);
    // Pulse 1 Lead
    patA.steps[0].pulse1 = { note: 'E-4', velocity: 85 };
    patA.steps[2].pulse1 = { note: 'E-4', velocity: 80 };
    patA.steps[4].pulse1 = { note: 'E-4', velocity: 85 };
    patA.steps[6].pulse1 = { note: 'C-4', velocity: 80 };
    patA.steps[8].pulse1 = { note: 'E-4', velocity: 90 };
    patA.steps[12].pulse1 = { note: 'G-4', velocity: 95 };

    // Pulse 2 Arpeggio Fill
    patA.steps[0].pulse2 = { note: 'C-4', velocity: 70 };
    patA.steps[4].pulse2 = { note: 'G-3', velocity: 65 };
    patA.steps[8].pulse2 = { note: 'C-4', velocity: 70 };
    patA.steps[12].pulse2 = { note: 'E-4', velocity: 75 };

    // Triangle Walking Bass
    patA.steps[0].triangle = { note: 'C-3', velocity: 90 };
    patA.steps[4].triangle = { note: 'G-2', velocity: 85 };
    patA.steps[8].triangle = { note: 'C-3', velocity: 90 };
    patA.steps[12].triangle = { note: 'G-2', velocity: 85 };

    // Noise Drums (Kick on 0, 8, Snare on 4, 12, Hi-Hat on evens)
    patA.steps[0].noise = { note: 'C-2', velocity: 90 };  // Kick
    patA.steps[2].noise = { note: 'G-4', velocity: 50 };  // Hat
    patA.steps[4].noise = { note: 'D-3', velocity: 80 };  // Snare
    patA.steps[6].noise = { note: 'G-4', velocity: 50 };  // Hat
    patA.steps[8].noise = { note: 'C-2', velocity: 90 };  // Kick
    patA.steps[10].noise = { note: 'G-4', velocity: 50 }; // Hat
    patA.steps[12].noise = { note: 'D-3', velocity: 85 }; // Snare
    patA.steps[14].noise = { note: 'G-4', velocity: 60 }; // Hat

    const patB = createEmptyPattern('pat_b', 'Pattern B (Resolution)', 16);
    patB.steps[0].pulse1 = { note: 'C-4', velocity: 85 };
    patB.steps[4].pulse1 = { note: 'G-3', velocity: 80 };
    patB.steps[8].pulse1 = { note: 'E-3', velocity: 80 };
    patB.steps[12].pulse1 = { note: 'A-3', velocity: 90 };

    patB.steps[0].triangle = { note: 'A-2', velocity: 90 };
    patB.steps[4].triangle = { note: 'E-2', velocity: 85 };
    patB.steps[8].triangle = { note: 'F-2', velocity: 90 };
    patB.steps[12].triangle = { note: 'G-2', velocity: 95 };

    patB.steps[0].noise = { note: 'C-2', velocity: 90 };
    patB.steps[4].noise = { note: 'D-3', velocity: 80 };
    patB.steps[8].noise = { note: 'C-2', velocity: 90 };
    patB.steps[12].noise = { note: 'D-3', velocity: 85 };

    return {
      name: 'super_platformer_loop',
      bpm: 136,
      patternOrder: ['pat_a', 'pat_a', 'pat_b', 'pat_a'],
      patterns: { pat_a: patA, pat_b: patB },
      channels
    };
  } else if (preset === 'boss_battle') {
    // Fast Driving Cyberpunk Boss Battle (D Minor, 150 BPM)
    const patA = createEmptyPattern('pat_a', 'Boss Aggro (Pattern A)', 16);
    patA.steps[0].pulse1 = { note: 'D-4', velocity: 95 };
    patA.steps[2].pulse1 = { note: 'F-4', velocity: 85 };
    patA.steps[4].pulse1 = { note: 'A-4', velocity: 90 };
    patA.steps[6].pulse1 = { note: 'D-5', velocity: 100 };
    patA.steps[8].pulse1 = { note: 'C#5', velocity: 95 };
    patA.steps[10].pulse1 = { note: 'A-4', velocity: 85 };
    patA.steps[12].pulse1 = { note: 'F-4', velocity: 90 };
    patA.steps[14].pulse1 = { note: 'E-4', velocity: 85 };

    // 16th-note driving bass
    for (let i = 0; i < 16; i += 2) {
      patA.steps[i].triangle = { note: 'D-2', velocity: 90 };
      patA.steps[i + 1].triangle = { note: 'D-3', velocity: 75 };
    }

    // Heavy four-on-the-floor industrial beat
    for (let i = 0; i < 16; i++) {
      if (i % 4 === 0) patA.steps[i].noise = { note: 'C-2', velocity: 100 }; // Heavy Kick
      else if (i % 4 === 2) patA.steps[i].noise = { note: 'D-3', velocity: 95 }; // Heavy Snare
      else patA.steps[i].noise = { note: 'G-4', velocity: 65 }; // Metal Hat
    }

    return {
      name: 'cyber_boss_showdown',
      bpm: 150,
      patternOrder: ['pat_a', 'pat_a'],
      patterns: { pat_a: patA },
      channels
    };
  } else {
    // Starry Night / Cozy Lofi Inn (F Major, 88 BPM)
    const patA = createEmptyPattern('pat_a', 'Peaceful Night (Pattern A)', 16);
    patA.steps[0].pulse1 = { note: 'A-4', velocity: 75 };
    patA.steps[4].pulse1 = { note: 'C-5', velocity: 70 };
    patA.steps[8].pulse1 = { note: 'F-4', velocity: 80 };
    patA.steps[12].pulse1 = { note: 'G-4', velocity: 75 };

    patA.steps[0].pulse2 = { note: 'F-3', velocity: 60 };
    patA.steps[8].pulse2 = { note: 'C-4', velocity: 60 };

    patA.steps[0].triangle = { note: 'F-2', velocity: 80 };
    patA.steps[6].triangle = { note: 'C-3', velocity: 70 };
    patA.steps[8].triangle = { note: 'D-2', velocity: 80 };
    patA.steps[14].triangle = { note: 'A-2', velocity: 70 };

    // Gentle brushes & rim clicks
    patA.steps[4].noise = { note: 'G-4', velocity: 45 };
    patA.steps[12].noise = { note: 'G-4', velocity: 50 };

    return {
      name: 'starlight_tavern_inn',
      bpm: 88,
      patternOrder: ['pat_a'],
      patterns: { pat_a: patA },
      channels
    };
  }
}

/**
 * Pure 16-Bit PCM WAV AudioBuffer Synthesizer (Zero dependencies, offline rendering)
 */
export function renderSongAudioBuffer(
  audioCtx: AudioContext | OfflineAudioContext,
  song: TrackerSong
): AudioBuffer {
  const sampleRate = audioCtx.sampleRate || 44100;
  const secondsPerStep = (60 / song.bpm) / 4; // 16th note step duration

  // Calculate total steps across pattern sequence
  let totalSteps = 0;
  for (const patId of song.patternOrder) {
    const pat = song.patterns[patId];
    if (pat) totalSteps += pat.length;
  }
  if (totalSteps === 0) totalSteps = 16;

  const totalDuration = totalSteps * secondsPerStep + 0.3; // with release tail
  const totalSamples = Math.ceil(totalDuration * sampleRate);

  const buffer = audioCtx.createBuffer(1, totalSamples, sampleRate);
  const out = buffer.getChannelData(0);

  // Synthesize track by track
  const anySolo = Object.values(song.channels).some(c => c.solo);

  let currentStepGlobal = 0;

  for (const patId of song.patternOrder) {
    const pat = song.patterns[patId];
    if (!pat) continue;

    for (let sIdx = 0; sIdx < pat.length; sIdx++) {
      const step = pat.steps[sIdx];
      const stepStartSec = currentStepGlobal * secondsPerStep;
      const stepStartSample = Math.floor(stepStartSec * sampleRate);

      // Render 4 channels for this step
      (['pulse1', 'pulse2', 'triangle', 'noise'] as ChannelId[]).forEach(chId => {
        const ch = song.channels[chId];
        if (ch.muted || (anySolo && !ch.solo)) return;

        const cell = step[chId];
        if (!cell || cell.note === '---' || cell.note === 'OFF') return;

        const freq = noteToFreq(cell.note);
        if (freq <= 0 && chId !== 'noise') return;

        const noteDur = Math.max(0.05, (ch.decay || 0.25));
        const noteSamples = Math.min(totalSamples - stepStartSample, Math.ceil(noteDur * sampleRate));
        const cellVol = (cell.velocity / 100) * ch.volume * 0.35;

        let phase = 0;
        const duty = ch.dutyCycle || 0.5;

        for (let i = 0; i < noteSamples; i++) {
          const samplePos = stepStartSample + i;
          if (samplePos >= totalSamples) break;

          const tNorm = i / noteSamples;
          // Standard ADSR exponential decay
          const env = Math.max(0, 1.0 - Math.pow(tNorm, 0.7));

          let val = 0;
          if (chId === 'pulse1' || chId === 'pulse2') {
            phase += (freq / sampleRate) * Math.PI * 2;
            val = (phase % (Math.PI * 2)) < (duty * Math.PI * 2) ? 1.0 : -1.0;
          } else if (chId === 'triangle') {
            phase += (freq / sampleRate) * Math.PI * 2;
            const saw = (phase % (Math.PI * 2)) / (Math.PI * 2);
            val = 2.0 * Math.abs(2.0 * (saw - Math.floor(saw + 0.5))) - 1.0;
          } else if (chId === 'noise') {
            // Pitched retro noise
            val = Math.random() * 2.0 - 1.0;
          }

          out[samplePos] += val * env * cellVol;
        }
      });

      currentStepGlobal++;
    }
  }

  // Master Limiter / soft-clipping pass
  for (let i = 0; i < totalSamples; i++) {
    out[i] = Math.max(-0.95, Math.min(0.95, out[i]));
  }

  return buffer;
}

/**
 * Pure binary Standard MIDI File (.mid) Exporter (Type 1 multi-track format)
 */
export function generateMidiFileBlob(song: TrackerSong): Blob {
  const ticksPerQuarterNote = 96; // Standard resolution
  const ticksPer16th = ticksPerQuarterNote / 4; // 24 ticks per step

  const numTracks = 4;
  const chunks: Uint8Array[] = [];

  // 1. Header Chunk: MThd (14 bytes)
  // Format: 1, NumTracks: 4 + 1 tempo track = 5 tracks, Division: 96
  const totalTracks = 5;
  const header = new Uint8Array([
    0x4D, 0x54, 0x68, 0x64, // "MThd"
    0x00, 0x00, 0x00, 0x06, // Chunk length: 6
    0x00, 0x01,             // Format 1 (multi-track synchronous)
    0x00, totalTracks,      // Number of tracks
    (ticksPerQuarterNote >> 8) & 0xFF, ticksPerQuarterNote & 0xFF
  ]);
  chunks.push(header);

  // 2. Tempo Track (Track 0)
  const tempoTrackEvents: number[] = [];
  // Set tempo: Microseconds per quarter note = 60,000,000 / BPM
  const uspqr = Math.round(60000000 / song.bpm);
  // Delta 0, Meta event 0x51 (Set Tempo), Length 3
  tempoTrackEvents.push(0x00, 0xFF, 0x51, 0x03, (uspqr >> 16) & 0xFF, (uspqr >> 8) & 0xFF, uspqr & 0xFF);
  // End of track: delta 0, FF 2F 00
  tempoTrackEvents.push(0x00, 0xFF, 0x2F, 0x00);
  chunks.push(createTrackChunk(tempoTrackEvents));

  // 3. Channels 1 to 4 Tracks
  const channelList: ChannelId[] = ['pulse1', 'pulse2', 'triangle', 'noise'];

  channelList.forEach((chId, chIdx) => {
    const events: number[] = [];
    const midiChannel = chIdx === 3 ? 9 : chIdx; // Channel 10 (0x09) for drums

    let accumulatedDelta = 0;

    for (const patId of song.patternOrder) {
      const pat = song.patterns[patId];
      if (!pat) continue;

      for (let sIdx = 0; sIdx < pat.length; sIdx++) {
        const cell = pat.steps[sIdx][chId];

        if (cell && cell.note !== '---' && cell.note !== 'OFF') {
          const midiPitch = chId === 'noise' ? 38 : noteToMidiNumber(cell.note);
          const vel = Math.round((cell.velocity / 100) * 127);

          // Note ON
          writeVarLength(events, accumulatedDelta);
          events.push(0x90 | midiChannel, midiPitch, vel);

          // Note OFF after 1 step (24 ticks)
          writeVarLength(events, ticksPer16th);
          events.push(0x80 | midiChannel, midiPitch, 0x00);

          accumulatedDelta = 0;
        } else {
          accumulatedDelta += ticksPer16th;
        }
      }
    }

    // End of track
    writeVarLength(events, accumulatedDelta);
    events.push(0xFF, 0x2F, 0x00);

    chunks.push(createTrackChunk(events));
  });

  // Combine chunks into single ArrayBuffer Blob
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const fileBytes = new Uint8Array(totalLength);
  let offset = 0;
  for (const c of chunks) {
    fileBytes.set(c, offset);
    offset += c.length;
  }

  return new Blob([fileBytes], { type: 'audio/midi' });
}

function createTrackChunk(events: number[]): Uint8Array {
  const len = events.length;
  const chunk = new Uint8Array(8 + len);
  chunk[0] = 0x4D; // M
  chunk[1] = 0x54; // T
  chunk[2] = 0x72; // r
  chunk[3] = 0x6B; // k
  chunk[4] = (len >> 24) & 0xFF;
  chunk[5] = (len >> 16) & 0xFF;
  chunk[6] = (len >> 8) & 0xFF;
  chunk[7] = len & 0xFF;
  chunk.set(events, 8);
  return chunk;
}

function writeVarLength(arr: number[], value: number): void {
  let buffer = value & 0x7F;
  while ((value >>= 7)) {
    buffer <<= 8;
    buffer |= ((value & 0x7F) | 0x80);
  }
  while (true) {
    arr.push(buffer & 0xFF);
    if (buffer & 0x80) buffer >>= 8;
    else break;
  }
}

/**
 * Generate Godot 4 GDScript Chiptune Loop Controller
 */
export function generateGodotChiptuneCode(songName: string, bpm: number): string {
  return `# Godot 4 Chiptune Music Controller for '${songName}'
extends AudioStreamPlayer2D

@export var bpm: float = ${bpm}.0
@export var autoplay_loop: bool = true

func _ready() -> void:
\tstream = preload("res://${songName}.wav")
\tbus = &"Music"
\tif autoplay_loop:
\t\tplay()

func set_tempo_multiplier(speed: float) -> void:
\tpitch_scale = speed
`;
}

/**
 * Generate Unity C# AudioSource Looper
 */
export function generateUnityChiptuneCode(songName: string, bpm: number): string {
  return `// Unity Chiptune Audio Controller for '${songName}'
using UnityEngine;

[RequireComponent(typeof(AudioSource))]
public class ${toPascalCase(songName)}MusicPlayer : MonoBehaviour
{
    [SerializeField] private AudioClip chiptuneClip;
    [SerializeField] private float bpm = ${bpm}f;
    private AudioSource audioSource;

    private void Awake()
    {
        audioSource = GetComponent<AudioSource>();
        audioSource.clip = chiptuneClip;
        audioSource.loop = true;
        audioSource.playOnAwake = true;
        audioSource.Play();
    }

    public void SetPitch(float pitch)
    {
        audioSource.pitch = Mathf.Clamp(pitch, 0.5f, 2.0f);
    }
}
`;
}

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}
