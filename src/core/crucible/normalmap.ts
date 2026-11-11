/**
 * Crucible Core 2D Normal Map & Dynamic Light Laboratory
 * Client-side Sobel height-to-normal generator and real-time Blinn-Phong 2D lighting testbed.
 * Targets Godot 4 CanvasTexture and Unity URP 2D Lights.
 */

export interface NormalMapConfig {
  strength: number;      // Relief bump intensity (0.5 to 10.0, default: 2.5)
  smoothness: number;    // Pre-filter blur radius (0 = sharp pixel art, 1-3 = smooth, default: 0)
  invertR: boolean;      // Invert Red (X-axis normal)
  invertG: boolean;      // Invert Green (Y-axis normal: false = OpenGL / Godot, true = DirectX / Unity)
  specularPower: number; // Blinn-Phong specular glossiness (4 to 64, default: 16)
  specularGain: number;  // Specular reflection intensity (0.0 to 2.0, default: 0.6)
}

export const DEFAULT_NORMAL_CONFIG: NormalMapConfig = {
  strength: 2.5,
  smoothness: 0,
  invertR: false,
  invertG: false, // Default OpenGL / Godot convention (+Y up)
  specularPower: 16,
  specularGain: 0.6
};

export interface PointLight2D {
  x: number;          // Light X in canvas coords
  y: number;          // Light Y in canvas coords
  z: number;          // Virtual height above canvas (10 to 200, default: 60)
  radius: number;     // Attenuation radius (50 to 500, default: 220)
  color: string;      // Light color hex (e.g. #ffb74d amber torch)
  intensity: number;  // Light intensity (0.2 to 2.0, default: 1.2)
  ambientColor: string; // Ambient baseline color (e.g. #111420)
  ambientIntensity: number; // Ambient brightness (0.05 to 0.6, default: 0.25)
}

export const DEFAULT_POINT_LIGHT: PointLight2D = {
  x: 200,
  y: 180,
  z: 70,
  radius: 260,
  color: '#ffaa33',
  intensity: 1.3,
  ambientColor: '#121626',
  ambientIntensity: 0.22
};

/**
 * Generate a 2D Normal Map from an input ImageData using a Sobel gradient operator.
 */
export function generateNormalMap(
  diffuseData: ImageData,
  config: NormalMapConfig
): ImageData {
  const width = diffuseData.width;
  const height = diffuseData.height;
  const src = diffuseData.data;

  // Step 1: Compute height/luminance map with optional box smoothing
  const heightMap = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const a = src[idx + 3] / 255;
    // Standard perceptual luminance
    const lum = (0.299 * src[idx] + 0.587 * src[idx + 1] + 0.114 * src[idx + 2]) / 255;
    heightMap[i] = lum * a;
  }

  // Optional smoothing filter for non-pixelated textures
  let smoothedHeight = heightMap;
  if (config.smoothness > 0) {
    smoothedHeight = new Float32Array(width * height);
    const rad = Math.min(3, Math.round(config.smoothness));
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let count = 0;
        for (let dy = -rad; dy <= rad; dy++) {
          for (let dx = -rad; dx <= rad; dx++) {
            const nx = Math.max(0, Math.min(width - 1, x + dx));
            const ny = Math.max(0, Math.min(height - 1, y + dy));
            sum += heightMap[ny * width + nx];
            count++;
          }
        }
        smoothedHeight[y * width + x] = sum / count;
      }
    }
  }

  // Step 2: Sobel Operator to compute dx, dy gradients
  const output = new ImageData(width, height);
  const dst = output.data;

  const strength = Math.max(0.1, config.strength);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = src[idx + 3];

      if (alpha === 0) {
        // Transparent pixel -> neutral flat normal (0, 0, 1) = RGB(128, 128, 255)
        dst[idx] = 128;
        dst[idx + 1] = 128;
        dst[idx + 2] = 255;
        dst[idx + 3] = 0;
        continue;
      }

      // 3x3 Neighbor clamping
      const x0 = Math.max(0, x - 1);
      const x1 = Math.min(width - 1, x + 1);
      const y0 = Math.max(0, y - 1);
      const y1 = Math.min(height - 1, y + 1);

      // Sobel kernel sampling
      const tl = smoothedHeight[y0 * width + x0];
      const t  = smoothedHeight[y0 * width + x ];
      const tr = smoothedHeight[y0 * width + x1];
      const l  = smoothedHeight[y  * width + x0];
      const r  = smoothedHeight[y  * width + x1];
      const bl = smoothedHeight[y1 * width + x0];
      const b  = smoothedHeight[y1 * width + x ];
      const br = smoothedHeight[y1 * width + x1];

      // Horizontal and vertical gradients
      // dX = (tr + 2r + br) - (tl + 2l + bl)
      // dY = (bl + 2b + br) - (tl + 2t + tr)
      let dX = (tr + 2 * r + br) - (tl + 2 * l + bl);
      let dY = (bl + 2 * b + br) - (tl + 2 * t + tr);

      if (config.invertR) dX = -dX;
      if (config.invertG) dY = -dY; // Toggle between OpenGL and DirectX Y-direction

      // Normal vector construction
      const nx = -dX * strength;
      const ny = -dY * strength;
      const nz = 1.0;

      // Normalize vector
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
      const normX = nx / len;
      const normY = ny / len;
      const normZ = nz / len;

      // Pack into 8-bit unsigned RGB [0, 255]
      dst[idx]     = Math.max(0, Math.min(255, Math.round((normX * 0.5 + 0.5) * 255)));
      dst[idx + 1] = Math.max(0, Math.min(255, Math.round((normY * 0.5 + 0.5) * 255)));
      dst[idx + 2] = Math.max(0, Math.min(255, Math.round((normZ * 0.5 + 0.5) * 255)));
      dst[idx + 3] = alpha;
    }
  }

  return output;
}

/**
 * Render dynamic 2D lighting onto a destination canvas using Blinn-Phong shading.
 */
export function renderDynamic2DLighting(
  diffuseData: ImageData,
  normalData: ImageData,
  light: PointLight2D,
  config: NormalMapConfig,
  targetCtx: CanvasRenderingContext2D
): void {
  const width = diffuseData.width;
  const height = diffuseData.height;

  const diff = diffuseData.data;
  const norm = normalData.data;

  const output = targetCtx.createImageData(width, height);
  const out = output.data;

  // Parse light colors
  const lColor = hexToRgb(light.color);
  const aColor = hexToRgb(light.ambientColor);

  const lightRadiusSq = light.radius * light.radius;
  const lightZ = Math.max(1, light.z);
  const specularPower = config.specularPower;
  const specularGain = config.specularGain;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = diff[idx + 3];

      if (alpha === 0) {
        out[idx + 3] = 0;
        continue;
      }

      // Diffuse albedo color
      const dr = diff[idx] / 255;
      const dg = diff[idx + 1] / 255;
      const db = diff[idx + 2] / 255;

      // Normal vector unpack from [0, 255] to [-1, 1]
      const nx = (norm[idx] / 255) * 2 - 1;
      const ny = (norm[idx + 1] / 255) * 2 - 1;
      const nz = (norm[idx + 2] / 255) * 2 - 1;

      // Vector from pixel to light source
      const lx = light.x - x;
      const ly = light.y - y;
      const distSq2D = lx * lx + ly * ly;

      // Distance attenuation
      let attenuation = 0;
      if (distSq2D < lightRadiusSq) {
        const dist2D = Math.sqrt(distSq2D);
        const normDist = dist2D / light.radius;
        // Smooth quadratic falloff
        attenuation = Math.max(0, 1 - normDist);
        attenuation = attenuation * attenuation * light.intensity;
      }

      // Normalized Light direction vector in 3D
      const dist3D = Math.sqrt(distSq2D + lightZ * lightZ) || 1.0;
      const lDirX = lx / dist3D;
      const lDirY = ly / dist3D;
      const lDirZ = lightZ / dist3D;

      // Lambertian Diffuse Term: max(0, N dot L)
      const nDotL = Math.max(0, nx * lDirX + ny * lDirY + nz * lDirZ);

      // Blinn-Phong Specular Term
      // View vector is perpendicular to surface: (0, 0, 1)
      // Half-vector H = normalize(L + V)
      const hx = lDirX;
      const hy = lDirY;
      const hz = lDirZ + 1.0;
      const hLen = Math.sqrt(hx * hx + hy * hy + hz * hz) || 1.0;
      const nDotH = Math.max(0, nx * (hx / hLen) + ny * (hy / hLen) + nz * (hz / hLen));
      const spec = Math.pow(nDotH, specularPower) * specularGain;

      // Ambient contribution
      const ambR = (aColor.r / 255) * light.ambientIntensity;
      const ambG = (aColor.g / 255) * light.ambientIntensity;
      const ambB = (aColor.b / 255) * light.ambientIntensity;

      // Light diffuse contribution
      const litR = (lColor.r / 255) * nDotL * attenuation;
      const litG = (lColor.g / 255) * nDotL * attenuation;
      const litB = (lColor.b / 255) * nDotL * attenuation;

      // Specular highlight
      const specLit = spec * attenuation;

      // Final composite color
      const finalR = dr * (ambR + litR) + (lColor.r / 255) * specLit;
      const finalG = dg * (ambG + litG) + (lColor.g / 255) * specLit;
      const finalB = db * (ambB + litB) + (lColor.b / 255) * specLit;

      out[idx]     = Math.min(255, Math.round(finalR * 255));
      out[idx + 1] = Math.min(255, Math.round(finalG * 255));
      out[idx + 2] = Math.min(255, Math.round(finalB * 255));
      out[idx + 3] = alpha;
    }
  }

  targetCtx.putImageData(output, 0, 0);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

/**
 * Procedural demo textures for instant testing in Crucible
 */
export function generateDemoSprite(type: 'stone_wall' | 'cyber_armor' | 'knight_shield'): ImageData {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  if (type === 'stone_wall') {
    // Medieval Cobblestone Dungeon Bricks
    ctx.fillStyle = '#1c1f2b';
    ctx.fillRect(0, 0, size, size);

    const rows = 8;
    const cols = 4;
    const bh = size / rows;
    const bw = size / cols;

    for (let r = 0; r < rows; r++) {
      const offsetX = (r % 2) * (bw / 2);
      for (let c = -1; c <= cols; c++) {
        const x = c * bw + offsetX;
        const y = r * bh;

        // Brick body gradient
        const shade = Math.floor(70 + Math.random() * 35);
        ctx.fillStyle = `rgb(${shade}, ${shade + 8}, ${shade + 18})`;
        ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4);

        // Brick highlights & crevices
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(x + 3, y + 3, bw - 6, 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(x + 3, y + bh - 5, bw - 6, 2);

        // Brick surface noise
        for (let i = 0; i < 24; i++) {
          const px = x + 4 + Math.random() * (bw - 8);
          const py = y + 4 + Math.random() * (bh - 8);
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.18)';
          ctx.fillRect(px, py, 2, 2);
        }
      }
    }
  } else if (type === 'cyber_armor') {
    // Cyberpunk Hex Plating
    ctx.fillStyle = '#101420';
    ctx.fillRect(0, 0, size, size);

    // Beveled armor plates
    const plates = [
      { x: 16, y: 16, w: 104, h: 104 },
      { x: 136, y: 16, w: 104, h: 104 },
      { x: 16, y: 136, w: 104, h: 104 },
      { x: 136, y: 136, w: 104, h: 104 }
    ];

    plates.forEach((p, idx) => {
      // Plate base
      ctx.fillStyle = '#2a344a';
      ctx.fillRect(p.x, p.y, p.w, p.h);

      // Top/Left bevel highlight
      ctx.fillStyle = '#4f6285';
      ctx.fillRect(p.x, p.y, p.w, 4);
      ctx.fillRect(p.x, p.y, 4, p.h);

      // Bottom/Right bevel shadow
      ctx.fillStyle = '#151b27';
      ctx.fillRect(p.x, p.y + p.h - 4, p.w, 4);
      ctx.fillRect(p.x + p.w - 4, p.y, 4, p.h);

      // Center glowing core or circuit
      if (idx === 0 || idx === 3) {
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(p.x + 32, p.y + 32, p.w - 64, 4);
        ctx.fillRect(p.x + 32, p.y + 44, p.w - 64, 4);
      } else {
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(p.x + 40, p.y + 40, 24, 24);
      }

      // Rivets in corners
      ctx.fillStyle = '#7c90b0';
      [[p.x + 8, p.y + 8], [p.x + p.w - 12, p.y + 8], [p.x + 8, p.y + p.h - 12], [p.x + p.w - 12, p.y + p.h - 12]].forEach(([rx, ry]) => {
        ctx.beginPath();
        ctx.arc(rx + 2, ry + 2, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  } else {
    // Knight Royal Crest Shield (with transparency)
    ctx.clearRect(0, 0, size, size);

    // Shield outline path
    ctx.beginPath();
    ctx.moveTo(size / 2, 24);
    ctx.lineTo(size - 36, 44);
    ctx.lineTo(size - 44, 150);
    ctx.quadraticCurveTo(size / 2, size - 24, size / 2, size - 24);
    ctx.quadraticCurveTo(44, 150, 44, 150);
    ctx.lineTo(36, 44);
    ctx.closePath();

    // Shield base
    const grad = ctx.createLinearGradient(0, 24, 0, size - 24);
    grad.addColorStop(0, '#c9962a');
    grad.addColorStop(0.5, '#996d19');
    grad.addColorStop(1, '#523a0b');
    ctx.fillStyle = grad;
    ctx.fill();

    // Outer rim border
    ctx.strokeStyle = '#f3ca65';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Inner heraldic cross
    ctx.fillStyle = '#1c263d';
    ctx.beginPath();
    ctx.arc(size / 2, 120, 48, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(size / 2 - 6, 80, 12, 80);
    ctx.fillRect(size / 2 - 36, 110, 72, 14);

    // Gem in center
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(size / 2, 117, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fee2e2';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  return ctx.getImageData(0, 0, size, size);
}

/**
 * Generate Godot 4 CanvasTexture resource file (.tres)
 */
export function generateGodotCanvasTexture(
  textureName: string,
  specularShininess: number = 0.5
): string {
  return `[gd_resource type="CanvasTexture" format=3 uid="uid://${Math.random().toString(36).substring(2, 12)}"]

[ext_resource type="Texture2D" path="res://${textureName}.png" id="1_diffuse"]
[ext_resource type="Texture2D" path="res://${textureName}_normal.png" id="2_normal"]

[resource]
diffuse_texture = ExtResource("1_diffuse")
normal_texture = ExtResource("2_normal")
specular_shininess = ${specularShininess.toFixed(2)}
`;
}

/**
 * Generate Unity Sprite-Lit Material Guide
 */
export function generateUnityMaterialGuide(textureName: string): string {
  return `// Unity URP 2D Lighting Setup Guide for '${textureName}'
// -------------------------------------------------------------
// 1. Drag '${textureName}.png' and '${textureName}_normal.png' into your Assets folder.
// 2. Select '${textureName}_normal.png' in the Project Inspector:
//    - Texture Type: Normal map
//    - Create from Grayscale: Uncheck (Crucible already exported a true RGB normal map)
//    - Click Apply.
// 3. Create a Material named 'M_${textureName}':
//    - Shader: Universal Render Pipeline / 2D / Sprite-Lit-Default
//    - Base Map: ${textureName}.png
//    - Normal Map: ${textureName}_normal.png
// 4. In your Scene, add a Light 2D (Point Light or Global Light 2D).
//    - Move the Light2D near your sprite to see dynamic bump reflections and shadows!
`;
}
