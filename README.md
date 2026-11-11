# RISTEK Game Development Suite (RGDS)

A lightweight, browser-native suite engineered for indie game production. RGDS consolidates 10 specialized workstation applications spanning 2D spritework, autotiling, normal mapping, audio synthesis, particle physics, easing and tweening beziers, dialogue tree creation, and storefront asset creation — all running 100% client-side with tailored exports for **Godot 4**, **Unity**, and **Generic/Web**.

---

## 🏛️ The 10 Workstations

1. **Stonecutter** — 2D Sprite Atlas Lab & Island Slicer (MaxRects bin packing, alpha transparency trimming, 1px bleed extrusion, connected-component island slicing, animation previewer, and pure-JS GIF89a LZW encoder).
2. **Crucible** — 2D Normal Map & Dynamic Light Lab (Sobel operator height-to-normal conversion, invert X/Y axis flipping, interactive canvas lighting simulation, Godot CanvasTexture, and Unity 2D URP Lit Material guides).
3. **Tapestry** — 47-Tile Autotile & Wang Matrix Studio (Canonical Wang bitmask resolution, 3×3 neighbor mapping, Godot 4 TileSet `.tres` with terrain peering bits, and Unity RuleTile setup guides).
4. **Hathoria** — 8-Bit Procedural SFX Synthesizer (Multi-waveform ADSR sound synthesis, pitch sliding, vibrato, bitcrusher, 1-click game presets, parameter mutation, and pure PCM 44.1kHz WAV encoding).
5. **Resonator** — 4-Track Retro Chiptune Tracker (Pulse 1, Pulse 2, Triangle, and Noise channels, ADSR envelope shaping, pattern sequencer, Type 1 Standard MIDI `.mid` export, Godot AudioStreamPlayer2D, and Unity C# audio players).
6. **Tinkerbox** — Easing Curves & Motion Sequencer (Interactive Cubic-Bézier solver, standard easing functions, multi-step squash/stretch sequencer, Godot 4 `create_tween()` GDScript, and Unity DOTween C# code generation).
7. **Sparkbox** — 2D Particle FX Simulator (Real-time particle physics, velocity cones, gravity, drag, radial forces, color/alpha ramps, Godot 4 `CPUParticles2D`, and Unity `ParticleSystem` scripts).
8. **Lexicon** — Branching Dialogue & Quest Graph (Visual node graph editor with speaker avatars, multi-choice branching, Godot 4 Dialogue Manager `.dialogue`, Yarn Spinner `.yarn`, Inkle Ink `.ink`, and standalone GDScript runner).
9. **Letterpress** — Bitmap Font Studio & Atlas Packer (Font rasterization, customizable outlines, shadows, and gradient fills, AngelCode BMFont `.fnt` descriptors, and Godot 4 `FontFile` `.tres` resources).
10. **Loom** — Storefront Resizer & Capsule Crafter (Batch aspect ratio cropper with 10 presets for Steam, itch.io, and Discord, floating logo placement with drop shadows, and 1-click ZIP export).

---

## 🚀 Quickstart & Development

### Prerequisites
- Node.js 18+ and npm (or use the included local portable environment in `.tools/node`).

### Running Locally

```bash
# Optional: if using the bundled tools
export PATH="$(pwd)/.tools/node/bin:$PATH"

# Install dependencies (if cloning fresh)
npm install

# Start Vite development server (http://localhost:5173)
npm run dev

# Run full 10-workstation verification audit
npm run test # or run esbuild on scratch/verify_all_workstations.ts

# Build production bundle (into dist/)
npm run build
```

---

## 🔒 100% Client-Side & Private
All assets, sprites, audio buffers, and dialogue trees are processed purely in local browser memory. No backend servers, zero telemetry, and zero network uploads required.
