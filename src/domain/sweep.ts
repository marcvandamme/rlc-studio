import type { CircuitAnalysis } from './types';
import { parseSI } from './units';

export type SweepMode = 'auto' | 'manual';

export interface ResolvedSweepRange {
  start: number;
  end: number;
  autoStart: number;
  autoEnd: number;
  error: string | null;
}

export function suggestedSweepRange(analysis: CircuitAnalysis): { start: number; end: number } {
  const centre = analysis.resonance?.frequency ?? analysis.frequency;
  return { start: centre / 100, end: centre * 100 };
}

/** Turn a frequency range in Hz into a short, parseable input value. */
export function formatInputNumber(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '';
  const rounded = Number(value.toPrecision(5));
  return rounded.toString();
}

export function resolveSweepRange(
  analysis: CircuitAnalysis,
  mode: SweepMode,
  startInput: string,
  endInput: string,
): ResolvedSweepRange {
  const suggested = suggestedSweepRange(analysis);

  if (mode === 'auto') {
    return {
      start: suggested.start,
      end: suggested.end,
      autoStart: suggested.start,
      autoEnd: suggested.end,
      error: null,
    };
  }

  const startResult = parseSI(startInput, 'frequency');
  const endResult = parseSI(endInput, 'frequency');

  if (!startResult.ok) {
    return { ...suggested, autoStart: suggested.start, autoEnd: suggested.end, error: `Start: ${startResult.error}` };
  }
  if (!endResult.ok) {
    return { ...suggested, autoStart: suggested.start, autoEnd: suggested.end, error: `End: ${endResult.error}` };
  }
  if (startResult.value === null || endResult.value === null) {
    return { ...suggested, autoStart: suggested.start, autoEnd: suggested.end, error: 'Enter both sweep endpoints.' };
  }
  if (startResult.value <= 0 || endResult.value <= 0) {
    return { ...suggested, autoStart: suggested.start, autoEnd: suggested.end, error: 'Sweep frequencies must be greater than 0 Hz.' };
  }
  if (endResult.value <= startResult.value) {
    return { ...suggested, autoStart: suggested.start, autoEnd: suggested.end, error: 'The end frequency must be greater than the start frequency.' };
  }
  if (endResult.value / startResult.value < 1.01) {
    return { ...suggested, autoStart: suggested.start, autoEnd: suggested.end, error: 'Choose a frequency span of at least 1%.' };
  }

  return {
    start: startResult.value,
    end: endResult.value,
    autoStart: suggested.start,
    autoEnd: suggested.end,
    error: null,
  };
}
