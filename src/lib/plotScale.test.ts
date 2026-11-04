import { describe, expect, it } from 'vitest';
import { niceStep, plotScale } from './plotScale';

describe('niceStep', () => {
  it('returns a tidy step at least as large as the raw request', () => {
    const cases = [0.13, 1.1, 2.2, 2.6, 3.3, 4.9, 5.1, 7.7, 11, 23, 56, 120, 830, 1.1e-4];
    for (const raw of cases) {
      const step = niceStep(raw);
      expect(step).toBeGreaterThanOrEqual(raw);
      expect(Number.isFinite(step)).toBe(true);
      expect(step / 10 ** Math.floor(Math.log10(step))).toBeCloseTo(
        [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(
          (candidate) => candidate >= step / 10 ** Math.floor(Math.log10(step)) - 1e-12,
        ) ?? 10,
        9,
      );
    }
  });

  it('handles invalid and tiny inputs safely', () => {
    expect(niceStep(0)).toBe(1);
    expect(niceStep(-5)).toBe(1);
    expect(niceStep(Number.NaN)).toBe(1);
    expect(niceStep(Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe('plotScale', () => {
  it('keeps the reference 241 V phasor close to the plot edge', () => {
    const scale = plotScale(249.967, 5);
    expect(scale.step).toBe(60);
    expect(scale.max).toBe(300);
    expect(249.967 / scale.max).toBeGreaterThan(0.8);
    expect(249.967 / scale.max).toBeLessThan(0.9);
  });

  it('avoids the coarse 500 V scale for the reference circuit', () => {
    const scale = plotScale(241, 5);
    expect(scale.max).toBeLessThan(500);
    expect(scale.max).toBe(300);
  });

  it('scales small and large values consistently', () => {
    const small = plotScale(0.032, 5);
    expect(small.max).toBeGreaterThanOrEqual(0.032);
    expect(small.max / 0.032).toBeLessThan(2);

    const large = plotScale(8.2e6, 5);
    expect(large.max).toBeGreaterThanOrEqual(8.2e6);
    expect(large.max / 8.2e6).toBeLessThan(2);
  });

  it('falls back to a usable scale for a zero vector', () => {
    const scale = plotScale(0, 5);
    expect(scale.step).toBeGreaterThan(0);
    expect(scale.max).toBeGreaterThan(0);
  });
});
