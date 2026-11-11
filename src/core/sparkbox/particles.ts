/**
 * Sparkbox Core 2D Particle System & VFX Forge
 * High-performance 2D particle simulation engine, real-time Canvas renderer,
 * and Godot 4 CPUParticles2D / Unity ParticleSystem code generators.
 */

export type ParticleShape = 'circle' | 'spark' | 'square' | 'ring';
export type BlendMode = 'normal' | 'additive';
export type EmitterType = 'continuous' | 'burst';

export interface ParticleColorStop {
  offset: number; // 0.0 to 1.0
  color: string;  // Hex color e.g. #ffaa00
  alpha: number;  // 0.0 to 1.0
}

export interface ParticleConfig {
  name: string;
  emitterType: EmitterType;
  emissionRate: number;      // particles/sec for continuous (10 to 500)
  burstCount: number;        // particle count for burst (10 to 300)
  lifetimeMin: number;       // in seconds (0.1 to 3.0)
  lifetimeMax: number;       // in seconds (0.1 to 3.0)
  
  // Velocity & Angle
  speedMin: number;          // pixels/sec
  speedMax: number;
  directionAngle: number;    // in degrees (0 = right, 90 = down, 180 = left, 270 = up)
  spreadAngle: number;       // in degrees (0 to 360, 360 = omnidirectional radial)

  // Forces
  gravityX: number;          // pixels/sec^2
  gravityY: number;          // pixels/sec^2 (positive = downward)
  drag: number;              // 0.0 to 1.0 (air resistance)
  radialAccel: number;       // outward push (+) or inward vortex (-)

  // Size
  startSize: number;         // in pixels
  endSize: number;           // in pixels

  // Appearance & Blending
  shape: ParticleShape;
  blendMode: BlendMode;
  colorStart: string;
  alphaStart: number;
  colorMid: string;
  alphaMid: number;
  colorEnd: string;
  alphaEnd: number;
}

export interface ActiveParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  lifetime: number;
  startSize: number;
  endSize: number;
  rotation: number;
  rotSpeed: number;
}

export const DEFAULT_PARTICLE_CONFIG: ParticleConfig = {
  name: 'campfire_flame',
  emitterType: 'continuous',
  emissionRate: 60,
  burstCount: 50,
  lifetimeMin: 0.6,
  lifetimeMax: 1.2,
  speedMin: 40,
  speedMax: 110,
  directionAngle: 270, // Upward
  spreadAngle: 45,     // 45 degree upward cone
  gravityX: 0,
  gravityY: -40,       // Heat rising buoyancy
  drag: 0.02,
  radialAccel: 0,
  startSize: 14,
  endSize: 2,
  shape: 'circle',
  blendMode: 'additive',
  colorStart: '#ffee55',
  alphaStart: 0.9,
  colorMid: '#ff7700',
  alphaMid: 0.7,
  colorEnd: '#cc1100',
  alphaEnd: 0.0
};

/**
 * 1-Click Game Jam VFX Presets
 */
export function getParticlePreset(preset: 'flame' | 'explosion' | 'magic_trail' | 'coin_pickup' | 'blood_splatter' | 'smoke'): ParticleConfig {
  switch (preset) {
    case 'flame':
      return { ...DEFAULT_PARTICLE_CONFIG };

    case 'explosion':
      return {
        name: 'grenade_explosion',
        emitterType: 'burst',
        emissionRate: 0,
        burstCount: 120,
        lifetimeMin: 0.3,
        lifetimeMax: 0.8,
        speedMin: 120,
        speedMax: 320,
        directionAngle: 0,
        spreadAngle: 360, // Omnidirectional
        gravityX: 0,
        gravityY: 120,    // Falling shrapnel gravity
        drag: 0.08,
        radialAccel: 0,
        startSize: 18,
        endSize: 1,
        shape: 'spark',
        blendMode: 'additive',
        colorStart: '#ffffff',
        alphaStart: 1.0,
        colorMid: '#ffaa00',
        alphaMid: 0.85,
        colorEnd: '#ff2200',
        alphaEnd: 0.0
      };

    case 'magic_trail':
      return {
        name: 'fairy_sparkles',
        emitterType: 'continuous',
        emissionRate: 45,
        burstCount: 30,
        lifetimeMin: 0.8,
        lifetimeMax: 1.8,
        speedMin: 15,
        speedMax: 45,
        directionAngle: 0,
        spreadAngle: 360,
        gravityX: 0,
        gravityY: 15,     // Gentle float down
        drag: 0.01,
        radialAccel: 25,  // Expanding twinkle aura
        startSize: 10,
        endSize: 1,
        shape: 'spark',
        blendMode: 'additive',
        colorStart: '#a5f3fc', // Cyan sparkle
        alphaStart: 0.95,
        colorMid: '#c084fc',   // Purple fairy
        alphaMid: 0.75,
        colorEnd: '#f472b6',   // Soft pink
        alphaEnd: 0.0
      };

    case 'coin_pickup':
      return {
        name: 'gold_coin_burst',
        emitterType: 'burst',
        emissionRate: 0,
        burstCount: 40,
        lifetimeMin: 0.4,
        lifetimeMax: 0.9,
        speedMin: 80,
        speedMax: 200,
        directionAngle: 270, // Upward burst
        spreadAngle: 120,
        gravityX: 0,
        gravityY: 180,       // Coins fall back down
        drag: 0.03,
        radialAccel: 0,
        startSize: 12,
        endSize: 3,
        shape: 'circle',
        blendMode: 'additive',
        colorStart: '#fffbeb',
        alphaStart: 1.0,
        colorMid: '#facc15', // Bright Gold
        alphaMid: 0.9,
        colorEnd: '#ca8a04', // Deep Amber
        alphaEnd: 0.0
      };

    case 'blood_splatter':
      return {
        name: 'impact_splatter',
        emitterType: 'burst',
        emissionRate: 0,
        burstCount: 65,
        lifetimeMin: 0.25,
        lifetimeMax: 0.6,
        speedMin: 100,
        speedMax: 260,
        directionAngle: 315, // Up-left impact spray
        spreadAngle: 75,
        gravityX: 0,
        gravityY: 340,       // Heavy visceral gravity
        drag: 0.05,
        radialAccel: 0,
        startSize: 8,
        endSize: 2,
        shape: 'circle',
        blendMode: 'normal',
        colorStart: '#ef4444',
        alphaStart: 0.95,
        colorMid: '#991b1b',
        alphaMid: 0.85,
        colorEnd: '#450a0a',
        alphaEnd: 0.2
      };

    case 'smoke':
      return {
        name: 'smoke_plume',
        emitterType: 'continuous',
        emissionRate: 30,
        burstCount: 25,
        lifetimeMin: 1.0,
        lifetimeMax: 2.2,
        speedMin: 20,
        speedMax: 60,
        directionAngle: 270,
        spreadAngle: 40,
        gravityX: 10,        // Wind drift
        gravityY: -20,       // Smoke rising
        drag: 0.04,
        radialAccel: 0,
        startSize: 6,
        endSize: 28,         // Puffs expand
        shape: 'circle',
        blendMode: 'normal',
        colorStart: '#334155',
        alphaStart: 0.6,
        colorMid: '#64748b',
        alphaMid: 0.35,
        colorEnd: '#94a3b8',
        alphaEnd: 0.0
      };
  }
}

/**
 * Spawn a single new particle from the emitter position
 */
export function spawnParticle(
  emitterX: number,
  emitterY: number,
  config: ParticleConfig
): ActiveParticle {
  const dirRad = (config.directionAngle * Math.PI) / 180;
  const spreadRad = (config.spreadAngle * Math.PI) / 180;
  const angle = dirRad + (Math.random() - 0.5) * spreadRad;

  const speed = config.speedMin + Math.random() * (config.speedMax - config.speedMin);
  const lifetime = config.lifetimeMin + Math.random() * (config.lifetimeMax - config.lifetimeMin);

  return {
    x: emitterX,
    y: emitterY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    age: 0,
    lifetime,
    startSize: config.startSize,
    endSize: config.endSize,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 6
  };
}

/**
 * Update active particles with physics & lifetime
 */
export function updateParticles(
  particles: ActiveParticle[],
  config: ParticleConfig,
  delta: number,
  emitterX: number,
  emitterY: number
): ActiveParticle[] {
  const alive: ActiveParticle[] = [];

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.age += delta;

    if (p.age >= p.lifetime) continue; // expired

    // Gravity
    p.vx += config.gravityX * delta;
    p.vy += config.gravityY * delta;

    // Air Drag
    if (config.drag > 0) {
      const dragFactor = Math.max(0, 1.0 - config.drag * delta * 10);
      p.vx *= dragFactor;
      p.vy *= dragFactor;
    }

    // Radial Acceleration
    if (config.radialAccel !== 0) {
      const dx = p.x - emitterX;
      const dy = p.y - emitterY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1.0;
      p.vx += (dx / dist) * config.radialAccel * delta;
      p.vy += (dy / dist) * config.radialAccel * delta;
    }

    // Position integration
    p.x += p.vx * delta;
    p.y += p.vy * delta;

    // Rotation
    p.rotation += p.rotSpeed * delta;

    alive.push(p);
  }

  return alive;
}

/**
 * Render active particles onto a CanvasRenderingContext2D
 */
export function renderParticles(
  ctx: CanvasRenderingContext2D,
  particles: ActiveParticle[],
  config: ParticleConfig
): void {
  ctx.save();
  ctx.globalCompositeOperation = config.blendMode === 'additive' ? 'lighter' : 'source-over';

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const progress = Math.min(1.0, Math.max(0.0, p.age / p.lifetime));

    // Size interpolation
    const size = p.startSize + (p.endSize - p.startSize) * progress;
    if (size <= 0.2) continue;

    // Color & Alpha interpolation (Start -> Mid -> End)
    let colorStr: string;
    let alpha: number;

    if (progress < 0.5) {
      const t = progress / 0.5;
      colorStr = lerpColor(config.colorStart, config.colorMid, t);
      alpha = config.alphaStart + (config.alphaMid - config.alphaStart) * t;
    } else {
      const t = (progress - 0.5) / 0.5;
      colorStr = lerpColor(config.colorMid, config.colorEnd, t);
      alpha = config.alphaMid + (config.alphaEnd - config.alphaMid) * t;
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = colorStr;

    if (config.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (config.shape === 'spark') {
      // 4-Point Star
      const half = size / 2;
      const quarter = size / 5;
      ctx.beginPath();
      ctx.moveTo(0, -half);
      ctx.lineTo(quarter, -quarter);
      ctx.lineTo(half, 0);
      ctx.lineTo(quarter, quarter);
      ctx.lineTo(0, half);
      ctx.lineTo(-quarter, quarter);
      ctx.lineTo(-half, 0);
      ctx.lineTo(-quarter, -quarter);
      ctx.closePath();
      ctx.fill();
    } else if (config.shape === 'square') {
      ctx.fillRect(-size / 2, -size / 2, size, size);
    } else if (config.shape === 'ring') {
      ctx.strokeStyle = colorStr;
      ctx.lineWidth = Math.max(1, size / 5);
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  ctx.restore();
}

function lerpColor(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16) || 0;
  const g1 = parseInt(c1.slice(3, 5), 16) || 0;
  const b1 = parseInt(c1.slice(5, 7), 16) || 0;

  const r2 = parseInt(c2.slice(1, 3), 16) || 0;
  const g2 = parseInt(c2.slice(3, 5), 16) || 0;
  const b2 = parseInt(c2.slice(5, 7), 16) || 0;

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Generate Godot 4 CPUParticles2D GDScript Snippet
 */
export function generateGodotParticleCode(config: ParticleConfig): string {
  const isBurst = config.emitterType === 'burst';
  const amount = isBurst ? config.burstCount : Math.max(10, Math.round(config.emissionRate * config.lifetimeMax));

  return `# Godot 4 CPUParticles2D Setup for '${config.name}'
# Attach to or configure a CPUParticles2D node in your scene:
extends CPUParticles2D

func _ready() -> void:
\tamount = ${amount}
\tlifetime = ${((config.lifetimeMin + config.lifetimeMax) / 2).toFixed(2)}
\texplosiveness = ${isBurst ? '1.0' : '0.0'}
\tone_shot = ${isBurst ? 'true' : 'false'}
\temitting = true

\t# Velocity & Cone Direction
\tdirection = Vector2(${Math.cos((config.directionAngle * Math.PI) / 180).toFixed(2)}, ${Math.sin((config.directionAngle * Math.PI) / 180).toFixed(2)})
\tspread = ${config.spreadAngle.toFixed(1)}
\tinitial_velocity_min = ${config.speedMin.toFixed(1)}
\tinitial_velocity_max = ${config.speedMax.toFixed(1)}

\t# Physics & Forces
\tgravity = Vector2(${config.gravityX.toFixed(1)}, ${config.gravityY.toFixed(1)})
\tdamping_min = ${(config.drag * 100).toFixed(1)}
\tdamping_max = ${(config.drag * 100).toFixed(1)}

\t# Scale & Scale Ramp
\tscale_amount_min = ${(config.startSize / 10).toFixed(2)}
\tscale_amount_max = ${(config.startSize / 10).toFixed(2)}

\t# Blending
\t# Set Material to CanvasItemMaterial with Blend Mode = ${config.blendMode === 'additive' ? 'ADD' : 'MIX'}
`;
}

/**
 * Generate Unity C# ParticleSystem Setup Code
 */
export function generateUnityParticleCode(config: ParticleConfig): string {
  const isBurst = config.emitterType === 'burst';

  return `// Unity C# ParticleSystem Setup for '${config.name}'
using UnityEngine;

[RequireComponent(typeof(ParticleSystem))]
public class ${toPascalCase(config.name)}VFX : MonoBehaviour
{
    private void Start()
    {
        var ps = GetComponent<ParticleSystem>();
        var main = ps.main;
        var emission = ps.emission;
        var shape = ps.shape;

        main.startLifetime = new ParticleSystem.MinMaxCurve(${config.lifetimeMin}f, ${config.lifetimeMax}f);
        main.startSpeed = new ParticleSystem.MinMaxCurve(${config.speedMin}f, ${config.speedMax}f);
        main.startSize = new ParticleSystem.MinMaxCurve(${config.startSize}f, ${config.startSize}f);
        main.gravityModifier = ${(config.gravityY / 100).toFixed(2)}f;

        if (${isBurst})
        {
            emission.rateOverTime = 0f;
            emission.SetBursts(new ParticleSystem.Burst[] { new ParticleSystem.Burst(0.0f, ${config.burstCount}) });
        }
        else
        {
            emission.rateOverTime = ${config.emissionRate}f;
        }

        shape.shapeType = ParticleSystemShapeType.Cone;
        shape.angle = ${(config.spreadAngle / 2).toFixed(1)}f;
        shape.radius = 0.1f;
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
