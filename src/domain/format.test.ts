import { describe, expect, it } from 'vitest';
import {
  engineeringParts,
  formatAngle,
  formatFixed,
  formatPercent,
  formatPF,
  formatSI,
  formatSigned,
  formatComplexPolar,
} from './format';

describe('engineeringParts', () => {
  it('selects an SI prefix by engineering exponent', () => {
    expect(engineeringParts(0.757021, 3)).toMatchObject({
      valueText: '757.021',
      prefix: 'm',
      exponent: -3,
    });
    expect(engineeringParts(31.416, 3)).toMatchObject({
      valueText: '31.416',
      prefix: '',
      exponent: 0,
    });
    expect(engineeringParts(2200, 2)).toMatchObject({
      valueText: '2.20',
      prefix: 'k',
      exponent: 3,
    });
  });

  it('promotes a value that rounds up to 1000', () => {
    expect(engineeringParts(999.9, 0)).toMatchObject({
      valueText: '1',
      prefix: 'k',
      exponent: 3,
    });
  });

  it('handles zero without a prefix', () => {
    expect(engineeringParts(0, 2)).toMatchObject({
      valueText: '0.00',
      prefix: '',
      exponent: 0,
    });
  });

  it('falls back to scientific notation outside the prefix range', () => {
    expect(engineeringParts(1e16, 2)).toMatchObject({
      valueText: '1.00e16',
      scientific: true,
    });
  });
});

describe('formatSI', () => {
  it('formats values with automatic prefixes and the requested precision', () => {
    expect(formatSI(0.757021, 'A', 3)).toBe('757.021 mA');
    expect(formatSI(303.823, 'Ω', 3)).toBe('303.823 Ω');
    expect(formatSI(1e-5, 'F', 2)).toBe('10.00 µF');
    expect(formatSI(159.1549, 'Hz', 2)).toBe('159.15 Hz');
    expect(formatSI(4700, 'Ω', 1)).toBe('4.7 kΩ');
  });

  it('honours zero decimals', () => {
    expect(formatSI(0.757021, 'A', 0)).toBe('757 mA');
    expect(formatSI(303.823, 'Ω', 0)).toBe('304 Ω');
  });

  it('keeps units without SI prefixes', () => {
    expect(formatSI(-70.783, '°', 3)).toBe('-70.783 °');
    expect(formatSI(95, '%', 1)).toBe('95.0 %');
  });

  it('handles empty and non-finite values', () => {
    expect(formatSI(null, 'V', 2)).toBe('—');
    expect(formatSI(Number.NaN, 'V', 2)).toBe('—');
    expect(formatSI(Number.POSITIVE_INFINITY, 'Ω', 2)).toBe('∞ Ω');
    expect(formatSI(Number.NEGATIVE_INFINITY, 'Ω', 2)).toBe('-∞ Ω');
  });

  it('supports an absolute value mode', () => {
    expect(formatSI(-230, 'V', 1, { absolute: true })).toBe('230.0 V');
  });

  it('formats fixed values, angles, power factors and signs', () => {
    expect(formatFixed(-0, 2)).toBe('0.00');
    expect(formatFixed(-0.0004, 3)).toBe('0.000');
    expect(formatFixed(-0.4, 0)).toBe('0');
    expect(formatPercent(-0.00001, 2)).toBe('0.00%');
    expect(formatFixed(Number.POSITIVE_INFINITY, 2)).toBe('∞');
    expect(formatAngle(70.783, 2)).toBe('70.78°');
    expect(formatAngle(-0.0004, 3)).toBe('0.000°');
    expect(formatAngle(Number.POSITIVE_INFINITY, 2)).toBe('—');
    expect(formatPF(0.329, 3)).toBe('0.329');
    expect(formatPF(null, 3)).toBe('—');
    expect(formatSigned(-164.4, 'var', 1)).toBe('−164.4 var');
    expect(formatComplexPolar(230, 0, 'V', 1)).toBe('230.0 V ∠ 0.0°');
  });
});
