import { describe, expect, it } from 'vitest';
import { parseDecimal, parseReactance, parseSI } from './units';

function expectValue(result: ReturnType<typeof parseSI>, expected: number) {
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.value).toBeCloseTo(expected, 12);
}

describe('parseSI', () => {
  it('treats blank input as an empty optional value', () => {
    expect(parseSI('   ')).toEqual({ ok: true, value: null });
    expect(parseReactance('', 'L')).toEqual({ ok: true, value: null });
    expect(parseDecimal('')).toEqual({ ok: true, value: null });
  });

  it('parses case-sensitive SI prefixes', () => {
    expectValue(parseSI('4.7k', 'plain'), 4700);
    expectValue(parseSI('2M', 'plain'), 2_000_000);
    expectValue(parseSI('100m', 'plain'), 0.1);
    expectValue(parseSI('10u', 'plain'), 1e-5);
    expectValue(parseSI('10µ', 'plain'), 1e-5);
    expectValue(parseSI('10μ', 'plain'), 1e-5);
    expectValue(parseSI('470n', 'plain'), 470e-9);
    expectValue(parseSI('22p', 'plain'), 22e-12);
  });

  it('accepts optional units and engineering text', () => {
    expectValue(parseSI('4.7 kΩ', 'resistance'), 4700);
    expectValue(parseSI('100mH', 'inductance'), 0.1);
    expectValue(parseSI('10uF', 'capacitance'), 1e-5);
    expectValue(parseSI('230V', 'voltage'), 230);
    expectValue(parseSI('757mA', 'current'), 0.757);
    expectValue(parseSI('159.15Hz', 'frequency'), 159.15);
  });

  it('accepts comma decimals and grouping', () => {
    expectValue(parseSI('1,5k', 'plain'), 1500);
    expectValue(parseSI('1,234.5', 'plain'), 1234.5);
    expectValue(parseDecimal('0,95'), 0.95);
  });

  it('rejects a unit from the wrong quantity', () => {
    const result = parseSI('100mH', 'capacitance');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('capacitance');
  });

  it('rejects unknown suffixes and malformed numbers', () => {
    expect(parseSI('10 watts').ok).toBe(false);
    expect(parseSI('4.7.2k').ok).toBe(false);
    expect(parseSI('abc').ok).toBe(false);
    expect(parseSI('1e999').ok).toBe(false);
  });

  it('rejects units in a plain-number field', () => {
    expect(parseSI('2.2kΩ', 'plain').ok).toBe(false);
  });
});

describe('parseReactance', () => {
  it('reads L, C and Z suffixes as direct ohm values', () => {
    expectValue(parseReactance('50L', 'L'), 50);
    expectValue(parseReactance('30C', 'C'), 30);
    expectValue(parseReactance('100Z', 'Z'), 100);
    expectValue(parseReactance('j50', 'L'), 50);
    expectValue(parseReactance('50 Ω', 'Z'), 50);
    expectValue(parseReactance('2.2kL', 'L'), 2200);
  });

  it('rejects the wrong suffix', () => {
    expect(parseReactance('50C', 'L').ok).toBe(false);
    expect(parseReactance('30L', 'C').ok).toBe(false);
    expect(parseReactance('100Hz', 'Z').ok).toBe(false);
  });

  it('requires reactance to be positive', () => {
    expect(parseReactance('0L', 'L').ok).toBe(false);
    expect(parseReactance('-50L', 'L').ok).toBe(false);
  });
});
