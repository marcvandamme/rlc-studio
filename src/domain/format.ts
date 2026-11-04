/** Formatting helpers with user-selectable decimal precision and SI scaling. */

const PREFIX_TABLE: Array<{ exponent: number; prefix: string }> = [
  { exponent: 12, prefix: 'T' },
  { exponent: 9, prefix: 'G' },
  { exponent: 6, prefix: 'M' },
  { exponent: 3, prefix: 'k' },
  { exponent: 0, prefix: '' },
  { exponent: -3, prefix: 'm' },
  { exponent: -6, prefix: 'µ' },
  { exponent: -9, prefix: 'n' },
  { exponent: -12, prefix: 'p' },
];

export interface EngineeringParts {
  valueText: string;
  prefix: string;
  exponent: number;
  scientific: boolean;
}

export function engineeringParts(value: number, decimals: number): EngineeringParts {
  if (!Number.isFinite(value)) {
    return {
      valueText: value > 0 ? '∞' : value < 0 ? '-∞' : '—',
      prefix: '',
      exponent: 0,
      scientific: false,
    };
  }

  if (value === 0) {
    return { valueText: (0).toFixed(decimals), prefix: '', exponent: 0, scientific: false };
  }

  const magnitude = Math.abs(value);

  if (magnitude >= 1e15 || magnitude < 1e-15) {
    return {
      valueText: value.toExponential(decimals).replace('e+', 'e'),
      prefix: '',
      exponent: 0,
      scientific: true,
    };
  }

  let exponent = Math.max(-12, Math.min(12, Math.floor(Math.log10(magnitude) / 3) * 3));
  let scaled = value / 10 ** exponent;
  let rounded = Number(scaled.toFixed(decimals));

  // Rounding can push 999.9 -> 1000.0; move to the next prefix in that case.
  if (Math.abs(rounded) >= 1000 && exponent < 12) {
    exponent += 3;
    scaled = value / 10 ** exponent;
  }

  if (Math.abs(Number(scaled.toFixed(decimals))) === 0) {
    // Avoid "-0.00" from tiny negative values.
    scaled = 0;
  }

  const prefix = PREFIX_TABLE.find((entry) => entry.exponent === exponent)?.prefix ?? '';
  return {
    valueText: scaled.toFixed(decimals),
    prefix,
    exponent,
    scientific: false,
  };
}

const NO_PREFIX_UNITS = new Set(['°', '%', '°C', '']);

/** Format a value with automatic SI prefix, fixed decimal places and a unit. */
export function formatSI(
  value: number | null | undefined,
  unit: string,
  decimals: number,
  options: { absolute?: boolean } = {},
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const shown = options.absolute ? Math.abs(value) : value;
  if (!Number.isFinite(shown)) {
    return `${shown > 0 ? '∞' : '-∞'}${unit ? ` ${unit}` : ''}`;
  }
  if (NO_PREFIX_UNITS.has(unit)) {
    const text = formatFixed(shown, decimals);
    return unit ? `${text} ${unit}` : text;
  }
  const parts = engineeringParts(shown, decimals);
  const displayUnit = parts.scientific ? unit : `${parts.prefix}${unit}`;
  return displayUnit ? `${parts.valueText} ${displayUnit}` : parts.valueText;
}

/** Avoid "-0.00" when a tiny negative value rounds to zero. */
function withoutNegativeZero(text: string): string {
  return /^-0(?:\.0+)?$/.test(text) ? text.slice(1) : text;
}

/** A value that should keep a fixed decimal count without SI scaling. */
export function formatFixed(value: number | null | undefined, decimals: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (!Number.isFinite(value)) return value > 0 ? '∞' : '-∞';
  return withoutNegativeZero(value.toFixed(decimals));
}

export function formatAngle(value: number | null | undefined, decimals: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (!Number.isFinite(value)) return '—';
  return `${formatFixed(value, decimals)}°`;
}

export function formatPercent(fraction: number | null | undefined, decimals: number): string {
  if (fraction === null || fraction === undefined || Number.isNaN(fraction)) return '—';
  return `${withoutNegativeZero((fraction * 100).toFixed(decimals))}%`;
}

export function formatPF(value: number | null | undefined, decimals: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return formatFixed(value, decimals);
}

export function formatPhaseDescriptor(phaseDeg: number): string {
  if (Math.abs(phaseDeg) < 1e-3) return 'unity';
  return phaseDeg > 0 ? 'lagging' : 'leading';
}

export function formatComplexPolar(
  magnitude: number,
  angleDeg: number,
  unit: string,
  decimals: number,
): string {
  return `${formatSI(magnitude, unit, decimals)} ∠ ${formatAngle(angleDeg, decimals)}`;
}

export function formatSigned(value: number, unit: string, decimals: number): string {
  if (!Number.isFinite(value)) return formatSI(value, unit, decimals);
  const formatted = formatSI(Math.abs(value), unit, decimals);
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatted}`;
}

/** Convert a frequency to a nice axis label, e.g. 1.25 kHz. */
export function formatAxisFrequency(value: number, decimals = 1): string {
  return formatSI(value, 'Hz', decimals);
}

/** Plain text number for reports, always using the user's precision. */
export function formatReportNumber(value: number | null | undefined, unit: string, decimals: number): string {
  return formatSI(value, unit, decimals);
}
