import { SpriteItem } from '../../types/stonecutter';

export function createDemoKnightSprites(): Promise<SpriteItem[]> {
  const frames = 8;
  const w = 48;
  const h = 48;
  const promises: Promise<SpriteItem>[] = [];

  for (let i = 0; i < frames; i++) {
    const p = new Promise<SpriteItem>(resolve => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;

      // Draw pixel art character base
      const bob = Math.sin((i / frames) * Math.PI * 2) * 3;
      const legCycle = Math.sin((i / frames) * Math.PI * 2) * 5;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(24, 42, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body (armor)
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(18, 22 + bob, 12, 14);

      // Armor belt / details
      ctx.fillStyle = '#4f46e5';
      ctx.fillRect(18, 30 + bob, 12, 3);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(23, 30 + bob, 3, 3); // Gold buckle

      // Helmet & Visor
      ctx.fillStyle = '#818cf8';
      ctx.fillRect(16, 10 + bob, 16, 12);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(20, 16 + bob, 9, 3); // Eye slot
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(22, 16 + bob, 3, 2); // Blue visor glow

      // Helmet plume
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(22, 6 + bob, 4, 5);

      // Legs / Running cycle
      ctx.fillStyle = '#312e81';
      ctx.fillRect(19, 36 + bob + legCycle, 4, 6);
      ctx.fillRect(25, 36 + bob - legCycle, 4, 6);

      // Sword
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(32, 20 + bob, 3, 14);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(30, 28 + bob, 7, 2); // Crossguard

      const img = new Image();
      img.onload = () => {
        resolve({
          id: `knight_${i + 1}`,
          name: `hero_run_0${i + 1}.png`,
          img,
          width: w,
          height: h,
          trimBounds: {
            x: 14,
            y: Math.max(0, Math.floor(6 + bob)),
            w: 24,
            h: 38,
            trimmed: true
          }
        });
      };
      img.src = canvas.toDataURL('image/png');
    });
    promises.push(p);
  }

  return Promise.all(promises);
}

/**
 * Creates an un-sliced flat spritesheet containing 6 separated sprites
 * on a transparent background, perfect for demonstrating the Reverse Island Slicer.
 */
export function createDemoUncutSheet(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Knight Sprite at (16, 16)
  ctx.fillStyle = '#6366f1';
  ctx.fillRect(20, 26, 16, 18);
  ctx.fillStyle = '#818cf8';
  ctx.fillRect(18, 12, 20, 14);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(22, 18, 12, 3);
  ctx.fillStyle = '#f43f5e';
  ctx.fillRect(26, 6, 4, 6); // Plume

  // 2. Green Slime Monster at (76, 20)
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.ellipse(92, 38, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(86, 30, 4, 4);
  ctx.fillRect(94, 30, 4, 4);
  ctx.fillStyle = '#064e3b';
  ctx.fillRect(88, 32, 2, 2);
  ctx.fillRect(96, 32, 2, 2);

  // 3. Loot Chest at (144, 18)
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(146, 24, 22, 18);
  ctx.fillStyle = '#b45309';
  ctx.fillRect(144, 18, 26, 8); // Lid
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(155, 26, 4, 4); // Buckle

  // 4. Power Star at (206, 18)
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(218, 30, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(214, 26, 4, 4);

  // 5. Health Potion at (32, 74)
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(36, 84, 14, 16);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(40, 78, 6, 6); // Neck
  ctx.fillStyle = '#78350f';
  ctx.fillRect(39, 74, 8, 4); // Cork

  // 6. Magic Ruby Gem at (110, 74)
  ctx.fillStyle = '#e11d48';
  ctx.beginPath();
  ctx.moveTo(122, 74);
  ctx.lineTo(134, 84);
  ctx.lineTo(122, 98);
  ctx.lineTo(110, 84);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fda4af';
  ctx.fillRect(118, 80, 4, 4);

  return canvas;
}
