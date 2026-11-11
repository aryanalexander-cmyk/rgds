/**
 * Tinkerbox Easing & Tween Engine
 * Pure TypeScript implementation of standard Robert Penner game easings,
 * cubic-Bézier solvers, and trajectory sampling for Godot 4 & Unity.
 */

export type TransitionType =
  | 'linear'
  | 'sine'
  | 'quad'
  | 'cubic'
  | 'quart'
  | 'quint'
  | 'expo'
  | 'circ'
  | 'back'
  | 'elastic'
  | 'bounce'
  | 'custom';

export type EaseDirection = 'out' | 'in' | 'in_out' | 'out_in';

export interface BezierControlPoints {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TweenConfig {
  transition: TransitionType;
  direction: EaseDirection;
  bezier: BezierControlPoints;
  duration: number; // in seconds, e.g. 0.6
  delay: number; // in seconds
  overshoot: number; // For 'back' easing (default: 1.70158)
  amplitude: number; // For 'elastic' easing
  period: number; // For 'elastic' easing
  loopMode: 'once' | 'loop' | 'yoyo';
  speedMultiplier: number;
}

export interface SequenceStep {
  id: string;
  property: 'position:y' | 'position:x' | 'scale' | 'rotation' | 'alpha';
  label: string;
  startValue: number;
  endValue: number;
  duration: number; // in seconds
  transition: TransitionType;
  direction: EaseDirection;
}

export const DEFAULT_SEQUENCE_STEPS: SequenceStep[] = [
  {
    id: 'step_1',
    property: 'scale',
    label: '1. Anticipation Squash',
    startValue: 1.0,
    endValue: 0.8,
    duration: 0.15,
    transition: 'quad',
    direction: 'in'
  },
  {
    id: 'step_2',
    property: 'position:y',
    label: '2. Explosive Jump',
    startValue: 0,
    endValue: 120,
    duration: 0.35,
    transition: 'back',
    direction: 'out'
  },
  {
    id: 'step_3',
    property: 'scale',
    label: '3. Impact Landing Bounce',
    startValue: 0.8,
    endValue: 1.25,
    duration: 0.25,
    transition: 'bounce',
    direction: 'out'
  },
  {
    id: 'step_4',
    property: 'scale',
    label: '4. Settle to Rest',
    startValue: 1.25,
    endValue: 1.0,
    duration: 0.15,
    transition: 'sine',
    direction: 'out'
  }
];

export const DEFAULT_TWEEN_CONFIG: TweenConfig = {
  transition: 'back',
  direction: 'out',
  bezier: { x1: 0.34, y1: 1.56, x2: 0.64, y2: 1.0 },
  duration: 0.6,
  delay: 0,
  overshoot: 1.70158,
  amplitude: 1.0,
  period: 0.3,
  loopMode: 'yoyo',
  speedMultiplier: 1.0
};

// --------------------------------------------------------------------------
// Standard Easing Math (Normalized input t from 0 to 1)
// --------------------------------------------------------------------------

export function evaluateEasing(
  t: number,
  transition: TransitionType,
  direction: EaseDirection,
  bezier: BezierControlPoints = DEFAULT_TWEEN_CONFIG.bezier,
  overshoot = 1.70158
): number {
  const clamped = Math.max(0, Math.min(1, t));

  if (transition === 'custom') {
    return solveCubicBezier(clamped, bezier.x1, bezier.y1, bezier.x2, bezier.y2);
  }

  if (transition === 'linear') {
    return clamped;
  }

  // Base raw "EaseIn" functions
  const baseIn = (x: number): number => {
    switch (transition) {
      case 'sine':
        return 1 - Math.cos((x * Math.PI) / 2);
      case 'quad':
        return x * x;
      case 'cubic':
        return x * x * x;
      case 'quart':
        return x * x * x * x;
      case 'quint':
        return x * x * x * x * x;
      case 'expo':
        return x === 0 ? 0 : Math.pow(2, 10 * (x - 1));
      case 'circ':
        return 1 - Math.sqrt(1 - Math.pow(x, 2));
      case 'back': {
        const c1 = overshoot;
        const c3 = c1 + 1;
        return c3 * x * x * x - c1 * x * x;
      }
      case 'elastic': {
        if (x === 0) return 0;
        if (x === 1) return 1;
        const c4 = (2 * Math.PI) / 3;
        return -Math.pow(2, 10 * x - 10) * Math.sin((x * 10 - 10.75) * c4);
      }
      case 'bounce':
        return 1 - bounceOut(1 - x);
      default:
        return x;
    }
  };

  const baseOut = (x: number): number => {
    switch (transition) {
      case 'sine':
        return Math.sin((x * Math.PI) / 2);
      case 'quad':
        return 1 - (1 - x) * (1 - x);
      case 'cubic':
        return 1 - Math.pow(1 - x, 3);
      case 'quart':
        return 1 - Math.pow(1 - x, 4);
      case 'quint':
        return 1 - Math.pow(1 - x, 5);
      case 'expo':
        return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
      case 'circ':
        return Math.sqrt(1 - Math.pow(x - 1, 2));
      case 'back': {
        const c1 = overshoot;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
      }
      case 'elastic': {
        if (x === 0) return 0;
        if (x === 1) return 1;
        const c4 = (2 * Math.PI) / 3;
        return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
      }
      case 'bounce':
        return bounceOut(x);
      default:
        return x;
    }
  };

  if (direction === 'in') {
    return baseIn(clamped);
  } else if (direction === 'out') {
    return baseOut(clamped);
  } else if (direction === 'in_out') {
    return clamped < 0.5
      ? baseIn(clamped * 2) / 2
      : 1 - baseIn((1 - clamped) * 2) / 2;
  } else {
    // out_in
    return clamped < 0.5
      ? baseOut(clamped * 2) / 2
      : 0.5 + baseIn((clamped - 0.5) * 2) / 2;
  }
}

function bounceOut(x: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (x < 1 / d1) {
    return n1 * x * x;
  } else if (x < 2 / d1) {
    return n1 * (x -= 1.5 / d1) * x + 0.75;
  } else if (x < 2.5 / d1) {
    return n1 * (x -= 2.25 / d1) * x + 0.9375;
  } else {
    return n1 * (x -= 2.625 / d1) * x + 0.984375;
  }
}

// --------------------------------------------------------------------------
// Cubic-Bézier Solver (Newton-Raphson + Bisection fallback)
// --------------------------------------------------------------------------

export function solveCubicBezier(
  targetX: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  if (targetX <= 0) return 0;
  if (targetX >= 1) return 1;

  // Bézier X coordinate at parameter t
  const sampleCurveX = (t: number) => {
    return (
      (1 - 3 * x2 + 3 * x1) * t * t * t +
      (3 * x2 - 6 * x1) * t * t +
      3 * x1 * t
    );
  };

  // Bézier Y coordinate at parameter t
  const sampleCurveY = (t: number) => {
    return (
      (1 - 3 * y2 + 3 * y1) * t * t * t +
      (3 * y2 - 6 * y1) * t * t +
      3 * y1 * t
    );
  };

  // Derivative of X with respect to t
  const sampleCurveDerivativeX = (t: number) => {
    return (
      (3 - 9 * x2 + 9 * x1) * t * t +
      (6 * x2 - 12 * x1) * t +
      3 * x1
    );
  };

  // Newton-Raphson iteration
  let t = targetX;
  for (let i = 0; i < 8; i++) {
    const currentX = sampleCurveX(t) - targetX;
    if (Math.abs(currentX) < 1e-6) {
      return sampleCurveY(t);
    }
    const dX = sampleCurveDerivativeX(t);
    if (Math.abs(dX) < 1e-6) break;
    t -= currentX / dX;
  }

  // Bisection fallback if Newton-Raphson diverges
  let t0 = 0.0;
  let t1 = 1.0;
  t = targetX;

  while (t0 < t1) {
    const currentX = sampleCurveX(t);
    if (Math.abs(currentX - targetX) < 1e-6) {
      return sampleCurveY(t);
    }
    if (targetX > currentX) {
      t0 = t;
    } else {
      t1 = t;
    }
    t = (t1 - t0) * 0.5 + t0;
  }

  return sampleCurveY(t);
}

// --------------------------------------------------------------------------
// Trajectory Sampling (Points for Graph and Velocity Curves)
// --------------------------------------------------------------------------

export interface TrajectoryPoint {
  t: number; // 0..1 normalized time
  v: number; // Eased value (can overshoot < 0 or > 1)
  velocity: number; // First derivative dv/dt
}

export function sampleTrajectory(
  config: TweenConfig,
  samples: number = 100
): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = [];
  const dt = 1.0 / samples;

  for (let i = 0; i <= samples; i++) {
    const t = i * dt;
    const v = evaluateEasing(
      t,
      config.transition,
      config.direction,
      config.bezier,
      config.overshoot
    );

    // Approximate derivative with forward difference
    const nextT = Math.min(1, t + 0.005);
    const nextV = evaluateEasing(
      nextT,
      config.transition,
      config.direction,
      config.bezier,
      config.overshoot
    );
    const velocity = (nextV - v) / (nextT - t);

    points.push({ t, v, velocity });
  }

  return points;
}
