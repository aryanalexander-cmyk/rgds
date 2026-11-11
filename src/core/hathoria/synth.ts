// Hathoria Core Procedural Audio Synthesizer (Web Audio API + Pure PCM WAV Encoder)

export type WaveType = 'square' | 'sawtooth' | 'sine' | 'triangle' | 'noise';

export interface SynthParams {
  id: string;
  name: string;
  waveType: WaveType;
  
  // Volume & Envelopes (in seconds)
  masterVolume: number;
  attackTime: number;
  sustainTime: number;
  sustainPunch: number;
  decayTime: number;

  // Frequency (in Hz)
  startFrequency: number;
  minFrequencyCutoff: number;
  slide: number;        // Pitch slide (-1 to 1)
  deltaSlide: number;   // Acceleration of slide

  // Vibrato
  vibratoDepth: number;
  vibratoSpeed: number;

  // Retro Effects & Tone Shaping
  changeAmount: number; // Pitch jump amount (arp)
  changeSpeed: number;  // Time until pitch jump
  dutyCycle: number;    // Square wave duty cycle (0.1 to 0.9)
  dutySweep: number;    // Sweep of duty cycle
  bitCrush: number;     // 1 to 16 bit depth (16 = clean, 4 = lofi crunch)
  lowPassCutoff: number;// 200 to 20000 Hz

  // Dual-Voice Sound Layering (Sub-Oscillator)
  subEnabled?: boolean;
  subWaveType?: WaveType;
  subOctave?: number;    // -2, -1, 0, 1
  subDetune?: number;    // -50 to +50 cents
  subMix?: number;       // 0.0 to 1.0
}

export const DEFAULT_SYNTH_PARAMS: SynthParams = {
  id: 'sound_default',
  name: 'pickup_coin',
  waveType: 'square',
  masterVolume: 0.8,
  attackTime: 0.0,
  sustainTime: 0.08,
  sustainPunch: 0.3,
  decayTime: 0.15,
  startFrequency: 880,
  minFrequencyCutoff: 0,
  slide: 0.25,
  deltaSlide: 0.0,
  vibratoDepth: 0.0,
  vibratoSpeed: 0.0,
  changeAmount: 0.0,
  changeSpeed: 0.0,
  dutyCycle: 0.5,
  dutySweep: 0.0,
  bitCrush: 16,
  lowPassCutoff: 20000,
  subEnabled: false,
  subWaveType: 'sine',
  subOctave: -1,
  subDetune: 0,
  subMix: 0.35
};

// 1-Click Game Jam Presets
export function createPreset(type: 'jump' | 'coin' | 'laser' | 'explosion' | 'hurt' | 'powerup' | 'blip' | 'drone'): SynthParams {
  const p = { ...DEFAULT_SYNTH_PARAMS, id: `${type}_${Date.now()}` };

  switch (type) {
    case 'coin':
      p.name = 'pickup_coin';
      p.waveType = 'square';
      p.startFrequency = 740;
      p.sustainTime = 0.09;
      p.decayTime = 0.18;
      p.sustainPunch = 0.4;
      p.changeAmount = 0.4;
      p.changeSpeed = 0.05;
      break;

    case 'jump':
      p.name = 'player_jump';
      p.waveType = 'square';
      p.startFrequency = 240;
      p.sustainTime = 0.06;
      p.decayTime = 0.22;
      p.slide = 0.4;
      p.dutyCycle = 0.45;
      break;

    case 'laser':
      p.name = 'laser_shoot';
      p.waveType = 'sawtooth';
      p.startFrequency = 1200;
      p.sustainTime = 0.04;
      p.decayTime = 0.14;
      p.slide = -0.7;
      p.lowPassCutoff = 14000;
      break;

    case 'explosion':
      p.name = 'explosion_boom';
      p.waveType = 'noise';
      p.startFrequency = 160;
      p.attackTime = 0.01;
      p.sustainTime = 0.15;
      p.decayTime = 0.55;
      p.slide = -0.2;
      p.lowPassCutoff = 4500;
      p.bitCrush = 8;
      break;

    case 'hurt':
      p.name = 'player_hurt';
      p.waveType = 'sawtooth';
      p.startFrequency = 320;
      p.sustainTime = 0.04;
      p.decayTime = 0.18;
      p.slide = -0.4;
      p.bitCrush = 10;
      break;

    case 'powerup':
      p.name = 'powerup_activate';
      p.waveType = 'triangle';
      p.startFrequency = 280;
      p.attackTime = 0.02;
      p.sustainTime = 0.25;
      p.decayTime = 0.3;
      p.slide = 0.45;
      p.vibratoDepth = 0.2;
      p.vibratoSpeed = 12;
      break;

    case 'blip':
      p.name = 'ui_select_blip';
      p.waveType = 'sine';
      p.startFrequency = 640;
      p.sustainTime = 0.02;
      p.decayTime = 0.04;
      p.dutyCycle = 0.5;
      break;

    case 'drone':
      p.name = 'ambient_drone';
      p.waveType = 'triangle';
      p.startFrequency = 90;
      p.attackTime = 0.4;
      p.sustainTime = 1.5;
      p.decayTime = 0.8;
      p.vibratoDepth = 0.15;
      p.vibratoSpeed = 4;
      p.lowPassCutoff = 1200;
      break;
  }

  return p;
}

// Mutate existing parameters slightly to produce variations (e.g. footsteps, impacts)
export function mutateParams(params: SynthParams): SynthParams {
  const p = { ...params, id: `${params.name}_var_${Date.now()}` };
  const r = (amount: number) => (Math.random() * 2 - 1) * amount;

  p.startFrequency = Math.max(40, p.startFrequency * (1 + r(0.12)));
  p.sustainTime = Math.max(0.01, p.sustainTime * (1 + r(0.15)));
  p.decayTime = Math.max(0.01, p.decayTime * (1 + r(0.15)));
  p.slide = Math.max(-1, Math.min(1, p.slide + r(0.1)));
  p.dutyCycle = Math.max(0.1, Math.min(0.9, p.dutyCycle + r(0.08)));
  if (p.bitCrush < 16) {
    p.bitCrush = Math.max(4, Math.min(16, Math.round(p.bitCrush + r(1))));
  }

  return p;
}

// Generate completely randomized, surprise sound effects
export function randomizeParams(): SynthParams {
  const waves: WaveType[] = ['square', 'sawtooth', 'sine', 'triangle', 'noise'];
  const wave = waves[Math.floor(Math.random() * waves.length)];
  const hasSub = Math.random() < 0.35;

  return {
    id: `random_${Date.now()}`,
    name: `fx_${wave}_${Math.floor(Math.random() * 900 + 100)}`,
    waveType: wave,
    masterVolume: 0.8,
    attackTime: Math.random() < 0.2 ? Math.random() * 0.1 : 0,
    sustainTime: Math.random() * 0.2 + 0.02,
    sustainPunch: Math.random() * 0.5,
    decayTime: Math.random() * 0.4 + 0.05,
    startFrequency: Math.random() * 800 + 80,
    minFrequencyCutoff: 0,
    slide: (Math.random() * 2 - 1) * 0.8,
    deltaSlide: (Math.random() * 2 - 1) * 0.1,
    vibratoDepth: Math.random() < 0.3 ? Math.random() * 0.4 : 0,
    vibratoSpeed: Math.random() * 15,
    changeAmount: Math.random() < 0.25 ? (Math.random() * 2 - 1) * 0.5 : 0,
    changeSpeed: Math.random() * 0.1,
    dutyCycle: Math.random() * 0.6 + 0.2,
    dutySweep: (Math.random() * 2 - 1) * 0.2,
    bitCrush: Math.random() < 0.3 ? Math.floor(Math.random() * 6 + 6) : 16,
    lowPassCutoff: Math.random() * 16000 + 4000,
    subEnabled: hasSub,
    subWaveType: waves[Math.floor(Math.random() * waves.length)],
    subOctave: ([-2, -1, 0, 1] as const)[Math.floor(Math.random() * 4)],
    subDetune: (Math.random() * 2 - 1) * 15,
    subMix: Math.random() * 0.4 + 0.15
  };
}

// Synthesize AudioBuffer from parameters
export function renderAudioBuffer(
  audioCtx: AudioContext | OfflineAudioContext,
  params: SynthParams,
  pitchScale: number = 1.0
): AudioBuffer {
  const sampleRate = audioCtx.sampleRate || 44100;
  const attack = Math.max(0.001, params.attackTime);
  const sustain = Math.max(0.01, params.sustainTime);
  const decay = Math.max(0.01, params.decayTime);
  const totalDuration = attack + sustain + decay;
  const totalSamples = Math.ceil(totalDuration * sampleRate);

  const buffer = audioCtx.createBuffer(1, totalSamples, sampleRate);
  const channelData = buffer.getChannelData(0);

  let freq = params.startFrequency * pitchScale;
  let slide = params.slide * 20;
  const deltaSlide = params.deltaSlide * 2;
  let phase = 0;
  let subPhase = 0;
  let duty = params.dutyCycle;

  // Bitcrusher step sizing
  const bits = params.bitCrush || 16;
  const bitSteps = Math.pow(2, bits - 1);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;

    // Amplitude Envelope
    let amp = 0;
    if (t < attack) {
      amp = t / attack;
    } else if (t < attack + sustain) {
      const punchProgress = (t - attack) / sustain;
      amp = 1.0 + (params.sustainPunch * (1.0 - punchProgress));
    } else {
      const decayProgress = (t - (attack + sustain)) / decay;
      amp = Math.max(0, 1.0 - decayProgress);
    }

    // Arpeggio / pitch jump
    let activeFreq = freq;
    if (params.changeAmount !== 0 && t > params.changeSpeed && params.changeSpeed > 0) {
      activeFreq = freq * (1.0 + params.changeAmount);
    }

    // Vibrato
    if (params.vibratoDepth > 0) {
      const vib = Math.sin(t * params.vibratoSpeed * Math.PI * 2) * params.vibratoDepth * 20;
      activeFreq += vib;
    }

    // Apply pitch slide & delta acceleration
    slide += deltaSlide / sampleRate;
    freq = Math.max(20, freq + slide);

    // Phase progression
    phase += (activeFreq / sampleRate) * Math.PI * 2;
    duty = Math.max(0.05, Math.min(0.95, duty + (params.dutySweep / sampleRate)));

    // Generate Primary Waveform Sample
    let sample = 0;
    switch (params.waveType) {
      case 'square':
        sample = (phase % (Math.PI * 2)) < (duty * Math.PI * 2) ? 1.0 : -1.0;
        break;
      case 'sawtooth':
        sample = 1.0 - ((phase % (Math.PI * 2)) / Math.PI);
        break;
      case 'sine':
        sample = Math.sin(phase);
        break;
      case 'triangle': {
        const saw = (phase % (Math.PI * 2)) / (Math.PI * 2);
        sample = 2.0 * Math.abs(2.0 * (saw - Math.floor(saw + 0.5))) - 1.0;
        break;
      }
      case 'noise':
        sample = Math.random() * 2.0 - 1.0;
        break;
    }

    // Dual-Voice Sound Layering (Sub-Oscillator)
    if (params.subEnabled) {
      const subOctave = params.subOctave ?? -1;
      const subDetune = params.subDetune ?? 0;
      const subPitchMultiplier = Math.pow(2, subOctave + subDetune / 1200);
      const subFreq = activeFreq * subPitchMultiplier;
      subPhase += (subFreq / sampleRate) * Math.PI * 2;

      let subSample = 0;
      const subType = params.subWaveType ?? 'sine';
      switch (subType) {
        case 'square':
          subSample = (subPhase % (Math.PI * 2)) < Math.PI ? 1.0 : -1.0;
          break;
        case 'sawtooth':
          subSample = 1.0 - ((subPhase % (Math.PI * 2)) / Math.PI);
          break;
        case 'sine':
          subSample = Math.sin(subPhase);
          break;
        case 'triangle': {
          const saw = (subPhase % (Math.PI * 2)) / (Math.PI * 2);
          subSample = 2.0 * Math.abs(2.0 * (saw - Math.floor(saw + 0.5))) - 1.0;
          break;
        }
        case 'noise':
          subSample = Math.random() * 2.0 - 1.0;
          break;
      }

      const mix = Math.max(0, Math.min(1, params.subMix ?? 0.35));
      sample = sample * (1.0 - mix * 0.4) + subSample * mix;
      sample = Math.max(-1.0, Math.min(1.0, sample));
    }

    // Bitcrusher quantization
    if (bits < 16) {
      sample = Math.round(sample * bitSteps) / bitSteps;
    }

    channelData[i] = sample * amp * params.masterVolume;
  }

  return buffer;
}

// Pure-JS 16-bit PCM WAV Encoder (Zero dependencies, binary Uint8Array)
export function encodeWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);
  const numSamples = channelData.length;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;

  const bufferSize = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF Chunk
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // ChunkSize
  writeString(8, 'WAVE');

  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);          // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);           // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true);  // SampleRate
  view.setUint32(28, byteRate, true);    // ByteRate
  view.setUint16(32, blockAlign, true);  // BlockAlign
  view.setUint16(34, 16, true);          // BitsPerSample (16 bits)

  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);    // Subchunk2Size

  // Write 16-bit PCM audio samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    // Clamp to -1.0 .. 1.0
    const s = Math.max(-1, Math.min(1, channelData[i]));
    // Convert to 16-bit signed integer (-32768 to 32767)
    const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(offset, val, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}
