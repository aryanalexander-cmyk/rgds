/**
 * Tinkerbox Multi-Engine Code Generators
 * Generates drop-in GDScript (Godot 4), C# DOTween, LeanTween, and Vanilla Coroutines.
 */

import { TweenConfig, TransitionType, EaseDirection, SequenceStep } from './easing';

export interface TweenPropertyTarget {
  name: string; // e.g. "position:y"
  startValue: number;
  endValue: number;
  godotProp: string;
  unityMethod: string;
  unityField: string;
}

export const TWEEN_PROPERTY_PRESETS: TweenPropertyTarget[] = [
  {
    name: 'Position Y (Jump/Drop)',
    startValue: 0,
    endValue: 120,
    godotProp: 'position:y',
    unityMethod: 'DOMoveY',
    unityField: 'transform.position.y'
  },
  {
    name: 'Position X (Dash/Slide)',
    startValue: 0,
    endValue: 160,
    godotProp: 'position:x',
    unityMethod: 'DOMoveX',
    unityField: 'transform.position.x'
  },
  {
    name: 'Scale (Juicy Punch)',
    startValue: 1.0,
    endValue: 1.35,
    godotProp: 'scale',
    unityMethod: 'DOScale',
    unityField: 'transform.localScale'
  },
  {
    name: 'Rotation (Wobble/Spin)',
    startValue: 0,
    endValue: 360,
    godotProp: 'rotation_degrees',
    unityMethod: 'DORotate',
    unityField: 'transform.eulerAngles'
  },
  {
    name: 'Opacity / Fade',
    startValue: 1.0,
    endValue: 0.0,
    godotProp: 'modulate:a',
    unityMethod: 'DOFade',
    unityField: 'canvasGroup.alpha'
  }
];

// Map transition to Godot 4 Tween.TRANS_*
function getGodotTrans(t: TransitionType): string {
  switch (t) {
    case 'linear': return 'Tween.TRANS_LINEAR';
    case 'sine': return 'Tween.TRANS_SINE';
    case 'quad': return 'Tween.TRANS_QUAD';
    case 'cubic': return 'Tween.TRANS_CUBIC';
    case 'quart': return 'Tween.TRANS_QUART';
    case 'quint': return 'Tween.TRANS_QUINT';
    case 'expo': return 'Tween.TRANS_EXPO';
    case 'circ': return 'Tween.TRANS_CIRC';
    case 'back': return 'Tween.TRANS_BACK';
    case 'elastic': return 'Tween.TRANS_ELASTIC';
    case 'bounce': return 'Tween.TRANS_BOUNCE';
    default: return 'Tween.TRANS_LINEAR';
  }
}

// Map ease direction to Godot 4 Tween.EASE_*
function getGodotEase(d: EaseDirection): string {
  switch (d) {
    case 'in': return 'Tween.EASE_IN';
    case 'out': return 'Tween.EASE_OUT';
    case 'in_out': return 'Tween.EASE_IN_OUT';
    case 'out_in': return 'Tween.EASE_OUT_IN';
    default: return 'Tween.EASE_OUT';
  }
}

// Map to DOTween Ease enum
function getDOTweenEase(t: TransitionType, d: EaseDirection): string {
  if (t === 'linear') return 'Ease.Linear';
  const capT = t.charAt(0).toUpperCase() + t.slice(1);
  if (d === 'out') return `Ease.Out${capT}`;
  if (d === 'in') return `Ease.In${capT}`;
  if (d === 'in_out') return `Ease.InOut${capT}`;
  return `Ease.Out${capT}`;
}

// Map to LeanTween type
function getLeanTweenType(t: TransitionType, d: EaseDirection): string {
  if (t === 'linear') return 'LeanTweenType.linear';
  const capT = t.charAt(0).toUpperCase() + t.slice(1);
  if (d === 'out') return `LeanTweenType.easeOut${capT}`;
  if (d === 'in') return `LeanTweenType.easeIn${capT}`;
  if (d === 'in_out') return `LeanTweenType.easeInOut${capT}`;
  return `LeanTweenType.easeOut${capT}`;
}

/**
 * Generate Godot 4 GDScript create_tween()
 */
export function generateGodotCode(
  config: TweenConfig,
  target: TweenPropertyTarget
): string {
  const isCustom = config.transition === 'custom';
  const trans = getGodotTrans(config.transition);
  const ease = getGodotEase(config.direction);
  const dur = config.duration.toFixed(2);
  const start = target.startValue.toFixed(1);
  const end = target.endValue.toFixed(1);

  if (isCustom) {
    return `# Godot 4 - Custom Cubic-Bézier Tween (Curve2D or normalized eval)
func animate_${target.godotProp.replace(':', '_')}():
    var tween = create_tween()
    # P1=(${config.bezier.x1.toFixed(2)}, ${config.bezier.y1.toFixed(2)}) P2=(${config.bezier.x2.toFixed(2)}, ${config.bezier.y2.toFixed(2)})
    tween.tween_method(
        func(t: float): 
            var eased = _solve_bezier(t, ${config.bezier.x1.toFixed(2)}, ${config.bezier.y1.toFixed(2)}, ${config.bezier.x2.toFixed(2)}, ${config.bezier.y2.toFixed(2)})
            ${target.godotProp} = lerp(${start}, ${end}, eased),
        0.0, 1.0, ${dur}
    )${config.delay > 0 ? `\\n    tween.set_delay(${config.delay.toFixed(2)})` : ''}${config.loopMode === 'yoyo' ? `\\n    tween.set_loops() # Infinite Yoyo/Ping-pong` : config.loopMode === 'loop' ? `\\n    tween.set_loops()` : ''}`;
  }

  let code = `# Godot 4 - create_tween()
func animate_${target.godotProp.replace(':', '_')}():
    var tween = create_tween().set_parallel(false)
    tween.set_trans(${trans}).set_ease(${ease})
`;

  if (config.delay > 0) {
    code += `    tween.tween_interval(${config.delay.toFixed(2)})\n`;
  }

  if (target.godotProp === 'scale') {
    code += `    tween.tween_property(self, "${target.godotProp}", Vector2(${end}, ${end}), ${dur}).from(Vector2(${start}, ${start}))\n`;
  } else {
    code += `    tween.tween_property(self, "${target.godotProp}", ${end}, ${dur}).from(${start})\n`;
  }

  if (config.loopMode === 'yoyo') {
    code += `    # Ping-Pong / Yoyo loop\n`;
    if (target.godotProp === 'scale') {
      code += `    tween.tween_property(self, "${target.godotProp}", Vector2(${start}, ${start}), ${dur})\n`;
    } else {
      code += `    tween.tween_property(self, "${target.godotProp}", ${start}, ${dur})\n`;
    }
    code += `    tween.set_loops() # Repeats indefinitely\n`;
  } else if (config.loopMode === 'loop') {
    code += `    tween.set_loops()\n`;
  }

  return code.trim();
}

/**
 * Generate Unity C# DOTween
 */
export function generateDOTweenCode(
  config: TweenConfig,
  target: TweenPropertyTarget
): string {
  const ease = getDOTweenEase(config.transition, config.direction);
  const dur = `${config.duration.toFixed(2)}f`;
  const end = `${target.endValue.toFixed(1)}f`;
  const delayStr = config.delay > 0 ? `\n        .SetDelay(${config.delay.toFixed(2)}f)` : '';

  let loopStr = '';
  if (config.loopMode === 'yoyo') {
    loopStr = `\n        .SetLoops(-1, LoopType.Yoyo)`;
  } else if (config.loopMode === 'loop') {
    loopStr = `\n        .SetLoops(-1, LoopType.Restart)`;
  }

  if (target.name.includes('Scale')) {
    return `// Unity C# DOTween
public void AnimateScale()
{
    transform.DOScale(${end}, ${dur})
        .From(${target.startValue.toFixed(1)}f)
        .SetEase(${ease})${delayStr}${loopStr}
        .SetAutoKill(false);
}`;
  }

  return `// Unity C# DOTween
public void AnimateProperty()
{
    transform.${target.unityMethod}(${end}, ${dur})
        .From(${target.startValue.toFixed(1)}f)
        .SetEase(${ease})${delayStr}${loopStr}
        .SetAutoKill(false);
}`;
}

/**
 * Generate Unity C# LeanTween
 */
export function generateLeanTweenCode(
  config: TweenConfig,
  target: TweenPropertyTarget
): string {
  const ease = getLeanTweenType(config.transition, config.direction);
  const dur = `${config.duration.toFixed(2)}f`;
  const end = `${target.endValue.toFixed(1)}f`;

  let loopStr = '';
  if (config.loopMode === 'yoyo') {
    loopStr = `.setLoopPingPong()`;
  } else if (config.loopMode === 'loop') {
    loopStr = `.setLoopClamp()`;
  }

  return `// Unity C# LeanTween
public void AnimateProperty()
{
    LeanTween.moveLocalY(gameObject, ${end}, ${dur})
        .setEase(${ease})${config.delay > 0 ? `.setDelay(${config.delay.toFixed(2)}f)` : ''}${loopStr};
}`;
}

/**
 * Generate Vanilla Unity C# Coroutine (No packages required)
 */
export function generateVanillaUnityCode(
  config: TweenConfig,
  target: TweenPropertyTarget
): string {
  const dur = `${config.duration.toFixed(2)}f`;
  return `// Unity Vanilla C# Coroutine (Zero external dependencies)
using System.Collections;
using UnityEngine;

public class PropertyTweener : MonoBehaviour
{
    public IEnumerator AnimateRoutine()
    {
        float elapsed = 0f;
        float duration = ${dur};
        float start = ${target.startValue.toFixed(1)}f;
        float targetVal = ${target.endValue.toFixed(1)}f;

        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float t = Mathf.Clamp01(elapsed / duration);
            // Eased value evaluation
            float eased = Mathf.SmoothStep(start, targetVal, t);
            
            // Apply to transform
            Vector3 pos = transform.localPosition;
            pos.y = eased;
            transform.localPosition = pos;

            yield return null;
        }
    }
}`;
}

/**
 * Generate CSS transition / cubic-bezier
 */
export function generateCssCode(config: TweenConfig): string {
  const dur = Math.round(config.duration * 1000);
  const x1 = config.bezier.x1.toFixed(2);
  const y1 = config.bezier.y1.toFixed(2);
  const x2 = config.bezier.x2.toFixed(2);
  const y2 = config.bezier.y2.toFixed(2);

  return `/* CSS cubic-bezier transition */
.actor-animated {
  transition: transform ${dur}ms cubic-bezier(${x1}, ${y1}, ${x2}, ${y2});
}`;
}

/**
 * Generate Godot 4 chained tween sequence
 */
export function generateGodotSequenceCode(steps: SequenceStep[], loopMode: string): string {
  let code = `# Godot 4 - Chained Tween Sequence
func play_animation_sequence():
    var tween = create_tween().set_parallel(false)
`;

  for (const s of steps) {
    const trans = getGodotTrans(s.transition);
    const ease = getGodotEase(s.direction);
    const dur = s.duration.toFixed(2);
    const val = s.endValue.toFixed(1);

    if (s.property === 'scale') {
      code += `    tween.tween_property(self, "scale", Vector2(${val}, ${val}), ${dur}).set_trans(${trans}).set_ease(${ease})\n`;
    } else {
      code += `    tween.tween_property(self, "${s.property}", ${val}, ${dur}).set_trans(${trans}).set_ease(${ease})\n`;
    }
  }

  if (loopMode === 'loop' || loopMode === 'yoyo') {
    code += `    tween.set_loops() # Repeat indefinitely\n`;
  }

  return code.trim();
}

/**
 * Generate Unity C# DOTween sequence
 */
export function generateDOTweenSequenceCode(steps: SequenceStep[], loopMode: string): string {
  let code = `// Unity C# DOTween Sequence
using DG.Tweening;
using UnityEngine;

public void PlayAnimationSequence()
{
    Sequence seq = DOTween.Sequence();
`;

  for (const s of steps) {
    const ease = getDOTweenEase(s.transition, s.direction);
    const dur = `${s.duration.toFixed(2)}f`;
    const val = `${s.endValue.toFixed(1)}f`;

    if (s.property === 'scale') {
      code += `    seq.Append(transform.DOScale(${val}, ${dur}).SetEase(${ease}));\n`;
    } else if (s.property === 'position:y') {
      code += `    seq.Append(transform.DOMoveY(${val}, ${dur}).SetEase(${ease}));\n`;
    } else if (s.property === 'position:x') {
      code += `    seq.Append(transform.DOMoveX(${val}, ${dur}).SetEase(${ease}));\n`;
    } else if (s.property === 'rotation') {
      code += `    seq.Append(transform.DORotate(new Vector3(0, 0, ${val}), ${dur}).SetEase(${ease}));\n`;
    } else {
      code += `    seq.Append(transform.DOFade(${val}, ${dur}).SetEase(${ease}));\n`;
    }
  }

  if (loopMode === 'yoyo') {
    code += `    seq.SetLoops(-1, LoopType.Yoyo);\n`;
  } else if (loopMode === 'loop') {
    code += `    seq.SetLoops(-1, LoopType.Restart);\n`;
  }

  code += `}`;
  return code.trim();
}
