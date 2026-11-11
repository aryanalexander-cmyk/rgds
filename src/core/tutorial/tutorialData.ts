import {
  Box,
  Volume2,
  Activity,
  Layers,
  Type,
  Flame,
  Music,
  Zap,
  Grid,
  MessageSquareQuote,
  LucideIcon
} from 'lucide-react';

export interface TutorialStep {
  title: string;
  subtitle: string;
  description: string;
  tip?: string;
  shortcut?: string;
}

export interface WorkstationTutorial {
  toolId: string;
  toolName: string;
  tagline: string;
  color: string;
  icon: LucideIcon;
  steps: TutorialStep[];
}

export const WORKSTATION_TUTORIALS: Record<string, WorkstationTutorial> = {
  stonecutter: {
    toolId: 'stonecutter',
    toolName: 'Stonecutter',
    tagline: '2D Sprite & Texture Atlas Lab',
    color: '#6366f1',
    icon: Box,
    steps: [
      {
        title: 'Step 1: Import & Alpha Slicing',
        subtitle: 'Drag and drop individual sprites or ungridded sheets',
        description: 'Drop multiple PNG files or a raw sprite sheet onto the canvas. Stonecutter uses connected-component BFS flood fill to automatically isolate transparent sprite islands.',
        tip: 'Click "Auto Slice Alpha Islands" on unaligned sheets to detect frames automatically.',
        shortcut: 'Drag & Drop PNGs'
      },
      {
        title: 'Step 2: Border Extrusion & Bleeding',
        subtitle: 'Prevent subpixel texture bleed seams in Godot & Unity',
        description: 'When rendering tilemaps or filtered 2D sprites, neighboring pixels can bleed into each other. Stonecutter duplicates the outer border pixels by 1px to guarantee zero seam artifacts.',
        tip: 'Always keep "1px Border Extrusion" enabled for pixel art games.',
        shortcut: 'Toggle Extrusion'
      },
      {
        title: 'Step 3: 9-Slice & Animation Preview',
        subtitle: 'Test scalable UI boxes and animated frame loops',
        description: 'Drag the horizontal and vertical slice margins to test how buttons and dialog boxes stretch. Use the animation tab to preview multi-frame loops with the GIF89a recorder.',
        tip: 'Adjust playback FPS to preview walk and run cycles at exact game speeds.',
        shortcut: 'Space to Play'
      },
      {
        title: 'Step 4: 1-Click Engine Export',
        subtitle: 'Export ready-to-use Godot 4 and Unity resources',
        description: 'Download a clean .zip containing your optimized spritesheet PNG, Godot 4 AtlasTexture (.tres), or Unity TexturePacker (.json) descriptor ready for your asset folder.',
        tip: 'The active engine selector in the top bar switches the output format automatically.',
        shortcut: 'Click Export Bundle'
      }
    ]
  },

  crucible: {
    toolId: 'crucible',
    toolName: 'Crucible',
    tagline: '2D Normal Map & Dynamic Light Lab',
    color: '#f97316',
    icon: Flame,
    steps: [
      {
        title: 'Step 1: Height to Normal Conversion',
        subtitle: 'Turn flat 2D sprites into 3D dynamic relief maps',
        description: 'Drop in your diffuse sprite. Crucible applies a real-time Sobel gradient operator to generate accurate surface bump normals with adjustable relief depth.',
        tip: 'Increase Relief Strength for rocky textures and decrease it for smooth armor.',
        shortcut: 'Drag Relief Slider'
      },
      {
        title: 'Step 2: OpenGL vs DirectX Orientation',
        subtitle: 'Match Godot and Unity coordinate conventions',
        description: 'Godot 4 and OpenGL expect +Y Up (standard green channel), while DirectX and Unity expect -Y Down (inverted green). Toggle the Y-Axis switch to match your engine.',
        tip: 'If light looks like it comes from the bottom instead of top, flip the Y-Axis.',
        shortcut: 'Toggle Y-Axis'
      },
      {
        title: 'Step 3: 2D Point Light Chamber',
        subtitle: 'Move your cursor to test dynamic point lighting live',
        description: 'Move your mouse across the canvas to simulate a PointLight2D in your game. Adjust light radius, virtual Z-distance, ambient brightness, and Blinn-Phong specular gloss.',
        tip: 'Switch between "Lit Chamber", "Normal Map", and "Split View" to compare results.',
        shortcut: 'Move Mouse on Canvas'
      },
      {
        title: 'Step 4: Engine Drop-In Bundles',
        subtitle: 'Export _normal.png and Godot CanvasTexture (.tres)',
        description: 'Export an engine bundle containing your diffuse sprite, rendered _normal.png map, and a Godot 4 CanvasTexture resource (.tres) or Unity Sprite-Lit material guide.',
        tip: 'In Godot 4, assign the CanvasTexture directly to any Sprite2D or TileMap.',
        shortcut: 'Click Export Bundle'
      }
    ]
  },

  tapestry: {
    toolId: 'tapestry',
    toolName: 'Tapestry',
    tagline: 'Level Tilemap Autotiler & Wang-Tile Lab',
    color: '#14b8a6',
    icon: Grid,
    steps: [
      {
        title: 'Step 1: The 47-Tile Minimal Bitmask',
        subtitle: 'Master 3x3 neighbor blob and Wang autotiling math',
        description: 'Tapestry maps 256 neighbor permutations into the standard 47 canonical tiles used by Godot 4 TileSet terrain peering bits and Unity RuleTile.',
        tip: 'Corners only connect when both flanking cardinal directions are also solid.',
        shortcut: '47-Tile Standard'
      },
      {
        title: 'Step 2: Interactive Sandbox Painting',
        subtitle: 'Left-click to paint terrain, right-click to carve holes',
        description: 'Click and drag on the 20x14 level grid. Watch adjacent tiles automatically re-evaluate their bitmask and connect seamlessly with zero manual tile picking.',
        tip: 'Hold left click and drag to paint rooms, corridors, and floating islands.',
        shortcut: 'Left Click / Right Click'
      },
      {
        title: 'Step 3: Peering Radar Inspector',
        subtitle: 'Hover over any tile to inspect its 8 neighbor flags',
        description: 'Hover your cursor over any painted cell on the map to see the 3x3 radar HUD. It shows exact cardinal and diagonal connection flags and the resolved tile index.',
        tip: 'Use the terrain preset switcher to try Mossy Forest, Dungeon Bricks, and Sci-Fi Plating.',
        shortcut: 'Hover Over Cells'
      },
      {
        title: 'Step 4: Engine TileSet Exports',
        subtitle: 'Export autotile atlas PNG and Godot 4 TileSet (.tres)',
        description: 'Download the bundle to get your 47-tile spritesheet atlas, painted level mockup PNG, and a native Godot 4 TileSet (.tres) or Unity RuleTile C# setup guide.',
        tip: 'Import the .tres directly into Godot 4 and start painting levels immediately.',
        shortcut: 'Click Export Bundle'
      }
    ]
  },

  hathoria: {
    toolId: 'hathoria',
    toolName: 'Hathoria',
    tagline: 'Procedural Audio SFX & Sound Synth',
    color: '#f59e0b',
    icon: Volume2,
    steps: [
      {
        title: 'Step 1: Web Audio Synthesis',
        subtitle: 'Generate retro sound effects with zero audio plugins',
        description: 'Hathoria synthesizes procedural audio in real time using 5 oscillator waveforms (Square, Sawtooth, Sine, Triangle, Noise) and shape envelopes.',
        tip: 'Square waves produce crunchy 8-bit sounds, while noise is ideal for explosions.',
        shortcut: 'Press A-K to Play'
      },
      {
        title: 'Step 2: Sub-Oscillator Layering',
        subtitle: 'Add punch and depth with dual-voice sound synthesis',
        description: 'Enable the secondary Sub-Oscillator to layer extra octave weight (-2 to +1 octaves) and stereo detune chorus for massive boss impacts and laser blasts.',
        tip: 'Set sub-oscillator to -1 octave on Jump sounds for classic arcade punch.',
        shortcut: 'Toggle Sub-Oscillator'
      },
      {
        title: 'Step 3: Mutate & Randomize',
        subtitle: 'Create sound variations in one click',
        description: 'Click Mutate to generate subtle parameter variations of footsteps, sword swings, or gunshots so your game audio never sounds repetitive.',
        tip: 'Click Randomize when you need wild, unexpected sound ideas for game jams.',
        shortcut: 'Click Mutate'
      },
      {
        title: 'Step 4: 16-Bit PCM WAV Export',
        subtitle: 'Export pristine audio loops for Godot and Unity',
        description: 'Download uncompressed 16-bit PCM WAV audio files. Drop them straight into Godot AudioStreamPlayer or Unity AudioSource with zero conversion.',
        tip: 'Use the chromatic audition strip to preview how your sound plays at different pitch levels.',
        shortcut: 'Click Export WAV'
      }
    ]
  },

  resonator: {
    toolId: 'resonator',
    toolName: 'Resonator',
    tagline: 'Chiptune Tracker & 4-Track Music Sequencer',
    color: '#a855f7',
    icon: Music,
    steps: [
      {
        title: 'Step 1: 4-Voice NES Architecture',
        subtitle: 'Authentic retro RP2A03 chiptune sound generation',
        description: 'Resonator features 4 dedicated hardware voice channels: Pulse 1 (Lead melody), Pulse 2 (Harmony), Triangle (Basslines), and Noise (Percussion & snare drums).',
        tip: 'Pulse channels carry the melody, while Triangle provides unmuted bass tones.',
        shortcut: '4 Active Channels'
      },
      {
        title: 'Step 2: 16-Step Tracker Matrix',
        subtitle: 'Click step cells to program notes, velocity, and rests',
        description: 'Click on any step row to pick pitch (C1–B5), set note cuts (OFF), or rests (---). The live playhead highlights notes in real time as the loop plays.',
        tip: 'Use the bottom audition keyboard to test melodic runs before entering them.',
        shortcut: 'Space to Play/Pause'
      },
      {
        title: 'Step 3: Channel Mixer & Duty Cycles',
        subtitle: 'Shape retro timbre with pulse width toggles',
        description: 'Adjust individual channel volume, mute or solo tracks, and switch Pulse duty cycles between 12.5% (thin buzzy), 25% (classic), and 50% (warm square).',
        tip: 'Automate tempo with the BPM slider to match fast arcade or slow dungeon pacing.',
        shortcut: 'Adjust BPM Slider'
      },
      {
        title: 'Step 4: Dual Audio & MIDI Export',
        subtitle: 'Export looping 16-bit WAV and Standard MIDI (.mid)',
        description: 'Resonator renders uncompressed looping WAV audio and generates binary Type 1 Standard MIDI (.mid) files so you can import compositions into any DAW or game engine.',
        tip: 'Bundle includes a Godot 4 AudioStreamPlayer2D script and Unity audio looper.',
        shortcut: 'Click Export Bundle'
      }
    ]
  },

  tinkerbox: {
    toolId: 'tinkerbox',
    toolName: 'Tinkerbox',
    tagline: 'Motion, Easing & Tween Playground',
    color: '#10b981',
    icon: Activity,
    steps: [
      {
        title: 'Step 1: Mathematical Easing Curves',
        subtitle: 'Visual curve manipulation without trial-and-error',
        description: 'Select from 11 easing families (Bounce, Elastic, Back, Quad, Expo, etc.) or drag cubic Bézier control handles on the visual curve canvas.',
        tip: 'The velocity curve overlay shows acceleration and deceleration peaks.',
        shortcut: 'Select Curve Preset'
      },
      {
        title: 'Step 2: Multi-Channel Motion Stage',
        subtitle: 'Test movement across position, scale, rotation, and alpha',
        description: 'Watch 2D actors animate in real time. Toggle squash & stretch scaling, rotational tilts, and opacity fades with trajectory ghosting trails.',
        tip: 'Switch between Knight, Gem, Chest, and Star actors to match your game style.',
        shortcut: 'Space to Replay'
      },
      {
        title: 'Step 3: Chained Sequencer Director',
        subtitle: 'Build multi-step choreography timelines',
        description: 'Add multiple sequential animation steps (e.g. pop up -> rotate -> slam down). Scrub the live timeline bar to inspect each step frame by frame.',
        tip: 'Try presets like "Juicy Pop & Drop" or "Chest Pop-Open" for instant polish.',
        shortcut: 'Scrub Timeline'
      },
      {
        title: 'Step 4: Fluent Engine Code Generation',
        subtitle: 'Drop-in Godot create_tween() and Unity DOTween code',
        description: 'Copy fluent, production-ready code directly into your scripts. Tinkerbox generates native Godot 4 GDScript, Unity C# DOTween, and CSS cubic-bezier strings.',
        tip: 'Switch the target engine in the top header to toggle between GDScript and C#.',
        shortcut: 'Click Copy Code'
      }
    ]
  },

  sparkbox: {
    toolId: 'sparkbox',
    toolName: 'Sparkbox',
    tagline: '2D Particle System & VFX Forge',
    color: '#eab308',
    icon: Zap,
    steps: [
      {
        title: 'Step 1: Real-Time Particle Physics',
        subtitle: 'High-performance canvas simulation running at 60 FPS',
        description: 'Simulate hundreds of particles simultaneously with gravity (X/Y), air drag resistance, angular velocity spin, and directional spread cones.',
        tip: 'Higher air drag creates smoke puffs, while negative gravity creates floating sparks.',
        shortcut: 'Adjust Physics Sliders'
      },
      {
        title: 'Step 2: Additive & Alpha Glow Shading',
        subtitle: 'Toggle blend modes for fire, magic, and smoke',
        description: 'Switch between additive glow blending (lighter) for intense flames, energy lasers, and magic sparkles, or alpha blending for smoke and dust clouds.',
        tip: 'Color ramps smoothly interpolate between start color and burnout color.',
        shortcut: 'Toggle Blend Mode'
      },
      {
        title: 'Step 3: Mouse Emitter & Burst Triggers',
        subtitle: 'Test continuous fountains and explosive bursts',
        description: 'Click and drag anywhere on the canvas to move the particle emitter dynamically. Tap the spacebar to trigger instant explosive bursts.',
        tip: 'Load presets like Grenade Explosion, Campfire Flame, or Coin Burst in 1 click.',
        shortcut: 'Drag Mouse / Spacebar'
      },
      {
        title: 'Step 4: CPUParticles2D & Unity Export',
        subtitle: 'Export ready-to-run Godot and Unity particle systems',
        description: 'Download a complete package containing a Godot 4 CPUParticles2D (.gd) script, Unity ParticleSystem (.cs) component, and particle texture image.',
        tip: 'Attach the exported script to a node in Godot to replicate the simulation exactly.',
        shortcut: 'Click Export Bundle'
      }
    ]
  },

  lexicon: {
    toolId: 'lexicon',
    toolName: 'Lexicon',
    tagline: 'Dialogue & Branching Narrative Studio',
    color: '#8b5cf6',
    icon: MessageSquareQuote,
    steps: [
      {
        title: 'Step 1: Visual Dialogue Node Graph',
        subtitle: 'Create branching story trees with speaker tags',
        description: 'Add dialogue nodes with speaker names, portrait emojis (wizard, cyborg, monarch, etc.), custom accent colors, and dialogue line text.',
        tip: 'Click "Make Starting Node" to set where the conversation begins.',
        shortcut: 'Click "+ Node"'
      },
      {
        title: 'Step 2: Player Response Choices',
        subtitle: 'Link branching options to target nodes or end points',
        description: 'Add choice responses to any node. Direct each choice to another node in your graph or choose "(End Conversation)" to terminate dialogue.',
        tip: 'Nodes with zero choices automatically display an end token (=> END).',
        shortcut: 'Click "Add Choice"'
      },
      {
        title: 'Step 3: Live In-Game VN Previewer',
        subtitle: 'Playtest dialogue flow in an authentic visual novel box',
        description: 'Test your conversation in real time on the right preview pane. Click choices to advance the story and check the conversation history log.',
        tip: 'Click "Reset" at any time to restart the dialogue simulation from the start.',
        shortcut: 'Click Choice Buttons'
      },
      {
        title: 'Step 4: Multi-Engine Script Exporters',
        subtitle: 'Export to Godot Dialogue Manager, Yarn, and Ink',
        description: 'Export into Godot 4 Dialogue Manager (.dialogue), Yarn Spinner (.yarn), Inkle Ink (.ink), and AST JSON, complete with drop-in DialogueRunner scripts.',
        tip: 'Godot Dialogue Manager format is fully compatible with Nathan Hoad\'s addon.',
        shortcut: 'Click Export Bundle'
      }
    ]
  },

  letterpress: {
    toolId: 'letterpress',
    toolName: 'Letterpress',
    tagline: 'Modern Bitmap Font Studio',
    color: '#06b6d4',
    icon: Type,
    steps: [
      {
        title: 'Step 1: Font Ingestion & Character Maps',
        subtitle: 'Rasterize TTF/OTF fonts into crisp pixel glyphs',
        description: 'Drop in any TrueType or OpenType font. Select standard character presets (ASCII 95, Alphanumeric 62, Numbers) or input custom game dialogue strings.',
        tip: 'Use custom character strings to pack only the glyphs your game actually uses.',
        shortcut: 'Select Char Preset'
      },
      {
        title: 'Step 2: 2-Tone Gradient Fills & Outlines',
        subtitle: 'Apply arcade style vertical gradients and drop shadows',
        description: 'Style glyphs with 2-tone vertical linear gradients (Gold Coin, Cyber Neon, Ruby Fire, etc.), stroke outlines for contrast, and drop shadows.',
        tip: 'Stroke outlines guarantee readable text over any 2D background texture.',
        shortcut: 'Select Gradient'
      },
      {
        title: 'Step 3: Atlas Packing & Typewriter Bar',
        subtitle: 'Inspect packed font atlas and test live typing',
        description: 'Glyphs are automatically packed into an efficient shelf texture atlas. Type in the interactive testing bar to test kerning and character spacing live.',
        tip: 'Adjust padding to ensure outline strokes never overlap adjacent glyphs.',
        shortcut: 'Type in Preview Bar'
      },
      {
        title: 'Step 4: BMFont & Godot FontFile Export',
        subtitle: 'Export atlas PNG, .fnt descriptors, and Godot .tres',
        description: 'Download your packed font atlas PNG, standard AngelCode BMFont (.fnt) text descriptors, and native Godot 4 FontFile (.tres) resources in a .zip bundle.',
        tip: 'In Godot 4, load the .tres directly into any Label or RichTextLabel node.',
        shortcut: 'Click Export Bundle'
      }
    ]
  },

  loom: {
    toolId: 'loom',
    toolName: 'Loom',
    tagline: 'Storefront Resizer & Capsule Crafter',
    color: '#f43f5e',
    icon: Layers,
    steps: [
      {
        title: 'Step 1: Master Key Art Ingestion',
        subtitle: 'Upload high-resolution promotional key art',
        description: 'Drop in your master key artwork (recommended 1920x1080 or higher). Loom automatically crops and formats it for Steam, Itch.io, and social media.',
        tip: 'High-contrast promotional art with a clear focal character works best.',
        shortcut: 'Drop Artwork Image'
      },
      {
        title: 'Step 2: Multi-Store Aspect Ratios',
        subtitle: 'Simultaneously format all 9 required storefront sizes',
        description: 'Loom automatically handles Steam Header (460x215), Small (231x87), Main (616x353), Library (600x900), Hero (1920x620), Itch Cover, and Social OG cards.',
        tip: 'Adjust the global zoom and pan sliders to align the focal subject across all cards.',
        shortcut: 'Pan & Zoom Sliders'
      },
      {
        title: 'Step 3: Floating Logo & Safe Zones',
        subtitle: 'Position title logos without obscuring UI overlays',
        description: 'Add an independent floating game title logo. Scale, pan, and shadow it while observing the built-in Steam safe zone guides (price tags, wishlists).',
        tip: 'Keep text out of the bottom 20% to avoid Steam price tag overlap.',
        shortcut: 'Adjust Logo Scale/Pan'
      },
      {
        title: 'Step 4: Batch Capsule ZIP Export',
        subtitle: 'Download all 9 formatted images organized in folders',
        description: 'Click Export Store Bundle to generate a clean .zip containing properly sized and named PNGs organized into steam/, itch/, and social/ subdirectories.',
        tip: 'Upload files directly to Steamworks and Itch.io dashboard without editing.',
        shortcut: 'Click Export All (.zip)'
      }
    ]
  }
};
