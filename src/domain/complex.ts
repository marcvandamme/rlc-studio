import type { Complex } from './types';

export const ZERO: Complex = { re: 0, im: 0 };

export function complex(re: number, im = 0): Complex {
  return { re, im };
}

export function add(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

export function sub(a: Complex, b: Complex): Complex {
  return { re: a.re - b.re, im: a.im - b.im };
}

export function mul(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

export function scale(a: Complex, k: number): Complex {
  return { re: a.re * k, im: a.im * k };
}

export function abs(a: Complex): number {
  return Math.hypot(a.re, a.im);
}

export function argRad(a: Complex): number {
  return Math.atan2(a.im, a.re);
}

export function argDeg(a: Complex): number {
  return (Math.atan2(a.im, a.re) * 180) / Math.PI;
}

export function reciprocal(a: Complex): Complex {
  const denominator = a.re * a.re + a.im * a.im;
  if (denominator === 0) {
    return { re: Infinity, im: 0 };
  }
  return { re: a.re / denominator, im: -a.im / denominator };
}

export function divide(a: Complex, b: Complex): Complex {
  return mul(a, reciprocal(b));
}

export function fromPolar(magnitude: number, angleRad: number): Complex {
  return {
    re: magnitude * Math.cos(angleRad),
    im: magnitude * Math.sin(angleRad),
  };
}

/** Normalize an angle in degrees to the interval (-180, 180]. */
export function normalizeDeg(angle: number): number {
  let result = angle % 360;
  if (result <= -180) result += 360;
  if (result > 180) result -= 360;
  return result;
}
