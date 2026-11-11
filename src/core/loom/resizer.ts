/**
 * Loom Storefront & Capsule Crafter Engine
 * Pure client-side multi-aspect ratio crop generator and zip exporter
 * for Steam, Itch.io, and social storefront requirements.
 */

export type CapsuleCategory = 'steam' | 'itch' | 'social';

export interface CapsulePreset {
  id: string;
  category: CapsuleCategory;
  name: string;
  width: number;
  height: number;
  description: string;
  filename: string;
  safeZoneNote?: string;
}

export interface CapsuleCropState {
  scale: number; // 0.5 to 3.0
  offsetX: number; // -100 to 100 percentage offset
  offsetY: number; // -100 to 100 percentage offset
  enabled: boolean;
}

export interface LogoOverlayState {
  enabled: boolean;
  scale: number; // 0.2 to 2.5
  offsetX: number; // -100 to 100 percentage
  offsetY: number; // -100 to 100 percentage
  opacity: number; // 0 to 1
  shadow: boolean;
}

export const DEFAULT_LOGO_CONFIG: LogoOverlayState = {
  enabled: true,
  scale: 1.0,
  offsetX: 0,
  offsetY: 20, // default slightly below center or near top
  opacity: 1.0,
  shadow: true
};

export const STOREFRONT_PRESETS: CapsulePreset[] = [
  // --- Steam Storefront ---
  {
    id: 'steam_header',
    category: 'steam',
    name: 'Header Capsule',
    width: 460,
    height: 215,
    description: 'Primary capsule shown in search results, sales events, and daily deals.',
    filename: 'steam_header_460x215.png',
    safeZoneNote: 'Keep game title centered. Price tag covers bottom-right corner.'
  },
  {
    id: 'steam_small',
    category: 'steam',
    name: 'Small Capsule',
    width: 231,
    height: 87,
    description: 'Shown in tag lists, wishlists, and recommendation queues.',
    filename: 'steam_small_231x87.png',
    safeZoneNote: 'High contrast logo is crucial at this small scale.'
  },
  {
    id: 'steam_main',
    category: 'steam',
    name: 'Main Capsule',
    width: 616,
    height: 353,
    description: 'Featured prominently on the top carousel of your Steam store page.',
    filename: 'steam_main_616x353.png',
    safeZoneNote: 'Clear focal character artwork with bold branding.'
  },
  {
    id: 'steam_library',
    category: 'steam',
    name: 'Library Box Art (Vertical)',
    width: 600,
    height: 900,
    description: 'Vertical box art in Steam client libraries (2:3 aspect ratio).',
    filename: 'steam_library_600x900.png',
    safeZoneNote: 'Vertical poster layout. Title fits best near top or center.'
  },
  {
    id: 'steam_hero',
    category: 'steam',
    name: 'Page Background Hero',
    width: 1920,
    height: 620,
    description: 'Cinematic wide banner behind your store page headline.',
    filename: 'steam_hero_1920x620.png',
    safeZoneNote: 'Fade to solid dark color at bottom & sides for seamless page blending.'
  },

  // --- Itch.io Storefront ---
  {
    id: 'itch_cover',
    category: 'itch',
    name: 'Game Cover',
    width: 630,
    height: 500,
    description: 'Official standard cover card for browse grids, jams, and creator profiles.',
    filename: 'itch_cover_630x500.png',
    safeZoneNote: 'Standard 1.26:1 ratio. Title and lead art should occupy center 70%.'
  },
  {
    id: 'itch_banner',
    category: 'itch',
    name: 'Store Page Banner',
    width: 960,
    height: 400,
    description: 'Top panoramic header banner on custom itch.io game pages.',
    filename: 'itch_banner_960x400.png',
    safeZoneNote: 'Panoramic art. Subtle dark vignette helps page title readability.'
  },

  // --- Social & Press Kit ---
  {
    id: 'social_og',
    category: 'social',
    name: 'OpenGraph / Twitter Card',
    width: 1200,
    height: 630,
    description: 'Used for Discord embeds, Twitter/X cards, and Facebook shared links.',
    filename: 'social_card_1200x630.png',
    safeZoneNote: 'Standard 1.91:1 social card format. High click-through rate layout.'
  },
  {
    id: 'discord_banner',
    category: 'social',
    name: 'Discord / Community Banner',
    width: 960,
    height: 540,
    description: '16:9 widescreen banner for Discord server headers, itch devlogs, and press kits.',
    filename: 'discord_banner_960x540.png',
    safeZoneNote: 'Keep focal artwork centered. UI overlays may obscure edges.'
  },
  {
    id: 'square_icon',
    category: 'social',
    name: 'Square Icon / Avatar',
    width: 512,
    height: 512,
    description: 'App launcher icon, Discord bot avatar, or Itch.io thumbnail.',
    filename: 'icon_512x512.png',
    safeZoneNote: 'Ensure silhouette is readable when scaled down to 32x32.'
  }
];

export const DEFAULT_CROP_CONFIG: Record<string, CapsuleCropState> = STOREFRONT_PRESETS.reduce(
  (acc, preset) => {
    acc[preset.id] = {
      scale: 1.0,
      offsetX: 0,
      offsetY: 0,
      enabled: true
    };
    return acc;
  },
  {} as Record<string, CapsuleCropState>
);

/**
 * Render a high-resolution cropped version of the source image to a target canvas,
 * with optional floating logo overlay.
 */
export function renderCapsuleToCanvas(
  targetCanvas: HTMLCanvasElement,
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  preset: CapsulePreset,
  crop: CapsuleCropState,
  logoImage?: HTMLImageElement | HTMLCanvasElement | null,
  logoState: LogoOverlayState = DEFAULT_LOGO_CONFIG
) {
  targetCanvas.width = preset.width;
  targetCanvas.height = preset.height;
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, preset.width, preset.height);

  const sw = sourceImage.width;
  const sh = sourceImage.height;
  const tw = preset.width;
  const th = preset.height;

  // Base cover scale (so source completely covers target aspect ratio)
  const baseScale = Math.max(tw / sw, th / sh);
  const userScale = Math.max(0.2, crop.scale);
  const finalScale = baseScale * userScale;

  const renderW = sw * finalScale;
  const renderH = sh * finalScale;

  // Center alignment with user offsets (normalized -100 to 100)
  const maxPanX = Math.max(0, (renderW - tw) / 2);
  const maxPanY = Math.max(0, (renderH - th) / 2);

  const panX = (crop.offsetX / 100) * (maxPanX + tw * 0.4);
  const panY = (crop.offsetY / 100) * (maxPanY + th * 0.4);

  const drawX = (tw - renderW) / 2 + panX;
  const drawY = (th - renderH) / 2 + panY;

  // Dark background in case of zoom out
  ctx.fillStyle = '#0b0e14';
  ctx.fillRect(0, 0, tw, th);

  // 1. Draw base background art
  ctx.drawImage(sourceImage, drawX, drawY, renderW, renderH);

  // 2. Draw floating logo layer if enabled
  if (logoImage && logoState.enabled) {
    const lw = logoImage.width;
    const lh = logoImage.height;

    // Fit logo proportionally (default width ~ 65% of capsule width)
    const baseLogoScale = (tw * 0.65) / lw;
    const finalLogoScale = baseLogoScale * logoState.scale;

    const logoRenderW = lw * finalLogoScale;
    const logoRenderH = lh * finalLogoScale;

    // Logo Pan Offsets
    const logoPanX = (logoState.offsetX / 100) * (tw * 0.4);
    const logoPanY = (logoState.offsetY / 100) * (th * 0.4);

    const logoX = (tw - logoRenderW) / 2 + logoPanX;
    const logoY = (th - logoRenderH) / 2 + logoPanY;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, logoState.opacity));

    // Optional Drop Shadow / Glow
    if (logoState.shadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = Math.max(8, tw * 0.03);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;
    }

    ctx.drawImage(logoImage, logoX, logoY, logoRenderW, logoRenderH);
    ctx.restore();
  }
}

/**
 * Convert canvas to Uint8Array PNG bytes
 */
export async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('Failed to generate PNG blob'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        resolve(new Uint8Array(reader.result as ArrayBuffer));
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    }, 'image/png');
  });
}

/**
 * Procedural Promotional Key Art Generator (High-res 1920x1080 canvas)
 * Creates a gorgeous synthwave/cyberpunk retro game jam promo poster
 */
export function generateDemoKeyArt(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d')!;

  // 1. Deep space backdrop gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGrad.addColorStop(0, '#090514');
  skyGrad.addColorStop(0.4, '#1b0e35');
  skyGrad.addColorStop(0.7, '#481358');
  skyGrad.addColorStop(1, '#ff3b69');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Distant Stars
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 160; i++) {
    const x = (i * 137.5) % canvas.width;
    const y = ((i * 269.3) % (canvas.height * 0.65));
    const r = (i % 3) * 0.8 + 0.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Giant Retro Sun with horizontal stripes
  const sunX = canvas.width * 0.5;
  const sunY = canvas.height * 0.48;
  const sunR = 260;

  const sunGrad = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
  sunGrad.addColorStop(0, '#ffee55');
  sunGrad.addColorStop(0.5, '#ff3b69');
  sunGrad.addColorStop(1, '#660066');

  ctx.save();
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = sunGrad;
  ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);

  // Sun horizontal blind cutouts
  ctx.fillStyle = '#1b0e35';
  for (let y = sunY; y < sunY + sunR; y += 18) {
    const stripeH = 3 + (y - sunY) * 0.05;
    ctx.fillRect(sunX - sunR, y, sunR * 2, stripeH);
  }
  ctx.restore();

  // 4. Synthwave Horizon Grid Floor
  const horizonY = canvas.height * 0.62;
  const floorGrad = ctx.createLinearGradient(0, horizonY, 0, canvas.height);
  floorGrad.addColorStop(0, '#100520');
  floorGrad.addColorStop(1, '#05020a');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, horizonY, canvas.width, canvas.height - horizonY);

  // Perspective vertical lines
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 1.5;
  for (let i = -16; i <= 16; i++) {
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, horizonY);
    const bottomX = canvas.width / 2 + i * 160;
    ctx.lineTo(bottomX, canvas.height);
    ctx.stroke();
  }

  // Horizontal perspective lines
  for (let i = 1; i <= 10; i++) {
    const y = horizonY + Math.pow(i / 10, 2.2) * (canvas.height - horizonY);
    ctx.strokeStyle = `rgba(0, 240, 255, ${0.15 + (i / 10) * 0.65})`;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // 5. Stylized Cyber Hero Silhouette / Crystal in the center
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height * 0.58);

  // Glowing Crystal Poly
  const crystalGrad = ctx.createLinearGradient(-100, -200, 100, 200);
  crystalGrad.addColorStop(0, '#00ffff');
  crystalGrad.addColorStop(0.5, '#b026ff');
  crystalGrad.addColorStop(1, '#ff0077');

  ctx.shadowColor = '#00ffff';
  ctx.shadowBlur = 40;
  ctx.fillStyle = crystalGrad;

  ctx.beginPath();
  ctx.moveTo(0, -180);
  ctx.lineTo(90, -40);
  ctx.lineTo(60, 100);
  ctx.lineTo(0, 150);
  ctx.lineTo(-60, 100);
  ctx.lineTo(-90, -40);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Crystal facets
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -180);
  ctx.lineTo(0, 150);
  ctx.moveTo(-90, -40);
  ctx.lineTo(90, -40);
  ctx.stroke();

  ctx.restore();

  // 6. Bold Title Typography: "VOID KNIGHT"
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Subtitle
  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = '#00f0ff';
  ctx.letterSpacing = '8px';
  ctx.fillText('RISTEK GAME STUDIOS PRESENTS', canvas.width / 2, canvas.height * 0.22);

  // Main Title
  ctx.font = '900 120px sans-serif';
  ctx.shadowColor = '#ff0077';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('VOID RUNNER', canvas.width / 2, canvas.height * 0.32);

  // Title outline
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ff0077';
  ctx.strokeText('VOID RUNNER', canvas.width / 2, canvas.height * 0.32);

  ctx.restore();

  return canvas;
}

/**
 * Generate a standalone transparent game logo canvas for overlay testing
 */
export function generateDemoLogo(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 280;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Subtitle
  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#00f0ff';
  ctx.letterSpacing = '6px';
  ctx.fillText('• RISTEK JAM EDITION •', canvas.width / 2, 60);

  // Main Stylized Title
  ctx.font = '900 96px sans-serif';
  ctx.shadowColor = 'rgba(255, 0, 119, 0.9)';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('VOID RUNNER', canvas.width / 2, 160);

  // Gradient Outline
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#ff0077';
  ctx.strokeText('VOID RUNNER', canvas.width / 2, 160);

  return canvas;
}
