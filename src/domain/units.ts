/**
 * Case-sensitive SI parsing for engineering input.
 *
 * Supported prefixes: T (1e12), G (1e9), M (1e6), k (1e3),
 * m (1e-3), u / µ / μ (1e-6), n (1e-9), p (1e-12).
 *
 * "m" is always milli and "M" is always mega. A trailing unit is optional:
 * "2.2k", "2.2 kΩ", "2.2kohm", "4.7uF", "100mH", "230V" all work.
 */

export type Quantity =
  | 'frequency'
  | 'resistance'
  | 'inductance'
  | 'capacitance'
  | 'voltage'
  | 'current'
  | 'time'
  | 'plain';

export type ParseResult =
  | { ok: true; value: number | null }
  | { ok: false; error: string };

const PREFIXES: Record<string, number> = {
  T: 1e12,
  G: 1e9,
  M: 1e6,
  k: 1e3,
  m: 1e-3,
  u: 1e-6,
  µ: 1e-6,
  μ: 1e-6,
  n: 1e-9,
  p: 1e-12,
};

const UNIT_ALIASES: Record<string, Exclude<Quantity, 'plain'>> = {
  hz: 'frequency',
  hertz: 'frequency',
  h: 'inductance',
  henry: 'inductance',
  henries: 'inductance',
  f: 'capacitance',
  farad: 'capacitance',
  farads: 'capacitance',
  ohm: 'resistance',
  ohms: 'resistance',
  ω: 'resistance',
  v: 'voltage',
  volt: 'voltage',
  volts: 'voltage',
  a: 'current',
  amp: 'current',
  amps: 'current',
  ampere: 'current',
  amperes: 'current',
  s: 'time',
  sec: 'time',
  second: 'time',
  seconds: 'time',
};

const UNIT_LABEL: Record<Exclude<Quantity, 'plain'>, string> = {
  frequency: 'Hz',
  resistance: 'Ω',
  inductance: 'H',
  capacitance: 'F',
  voltage: 'V',
  current: 'A',
  time: 's',
};

interface SuffixResolution {
  multiplier: number;
  unit: Exclude<Quantity, 'plain'> | null;
}

function resolveSuffix(suffix: string): SuffixResolution | string {
  if (suffix === '') return { multiplier: 1, unit: null };

  const directUnit = UNIT_ALIASES[suffix.toLowerCase()];
  if (directUnit) return { multiplier: 1, unit: directUnit };

  const first = suffix[0];
  if (Object.prototype.hasOwnProperty.call(PREFIXES, first)) {
    const rest = suffix.slice(1);
    if (rest === '') return { multiplier: PREFIXES[first], unit: null };
    const unit = UNIT_ALIASES[rest.toLowerCase()];
    if (unit) return { multiplier: PREFIXES[first], unit };
  }

  return `Unknown unit "${suffix}". Try a suffix such as k, m, u, n, p, Ω, Hz, H, F, V or A.`;
}

function normalizeNumericText(text: string): string {
  let compact = text.trim().replace(/\s+/g, '').replace(/_/g, '');
  if (compact.includes(',') && compact.includes('.')) {
    compact = compact.replace(/,/g, '');
  } else {
    compact = compact.replace(/,/g, '.');
  }
  return compact;
}

const NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/;

/**
 * Parse a value with an optional SI prefix and/or unit.
 * Returns `{ ok: true, value: null }` for a blank input.
 */
export function parseSI(raw: string, quantity: Quantity = 'plain'): ParseResult {
  if (raw.trim() === '') return { ok: true, value: null };

  const compact = normalizeNumericText(raw);
  if (compact === '') return { ok: true, value: null };

  if ((compact.match(/\./g) ?? []).length > 1) {
    return { ok: false, error: 'Use a single decimal point (for example 4.7k).' };
  }

  const match = compact.match(NUMBER_PATTERN);
  if (!match) {
    return { ok: false, error: 'Enter a number, optionally with an SI prefix (e.g. 4.7k, 100m, 2.2u).' };
  }

  const numericPart = match[0];
  const suffix = compact.slice(numericPart.length);

  if (suffix !== '' && !/^[a-zA-ZµμΩω]+$/.test(suffix)) {
    return { ok: false, error: `Could not read "${raw.trim()}".` };
  }

  const resolved = resolveSuffix(suffix);
  if (typeof resolved === 'string') {
    return { ok: false, error: resolved };
  }

  if (quantity !== 'plain') {
    if (resolved.unit !== null && resolved.unit !== quantity) {
      return {
        ok: false,
        error: `Expected ${quantity === 'resistance' ? 'a resistance' : `a ${quantity}`} in ${UNIT_LABEL[quantity]}, but got ${resolved.unit}.`,
      };
    }
  } else if (resolved.unit !== null) {
    return { ok: false, error: 'This field expects a plain number without a unit.' };
  }

  const numeric = Number(numericPart);
  if (!Number.isFinite(numeric)) {
    return { ok: false, error: 'This number is too large to evaluate.' };
  }

  return { ok: true, value: numeric * resolved.multiplier };
}

/**
 * Parse direct reactance / impedance input.
 * Examples: 50L, 30C, 100Z, j50, 50Ω, 50 ohm, 50.
 * The suffix marks the quantity and the value is interpreted in ohms.
 */
export function parseReactance(raw: string, symbol: 'L' | 'C' | 'Z'): ParseResult {
  if (raw.trim() === '') return { ok: true, value: null };

  let text = raw.trim().replace(/\s+/g, '');

  const foreignSymbols = (['L', 'C', 'Z'] as const).filter((candidate) => candidate !== symbol);
  for (const foreign of foreignSymbols) {
    if (text.toUpperCase().endsWith(foreign) && !text.toUpperCase().endsWith('HZ')) {
      return {
        ok: false,
        error: `Use the ${symbol} suffix in this field (for example 50${symbol}).`,
      };
    }
  }

  if (text.toUpperCase().endsWith(symbol) && !text.toUpperCase().endsWith('HZ')) {
    text = text.slice(0, -1);
  } else if (text.toLowerCase().endsWith('hz')) {
    return { ok: false, error: `Use a reactance in Ω, optionally written as 50${symbol}.` };
  }

  if (text.startsWith('j') || text.startsWith('J')) text = text.slice(1);
  if (text.endsWith('j') || text.endsWith('J')) text = text.slice(0, -1);

  const result = parseSI(text, 'resistance');
  if (!result.ok) return result;
  if (result.value === null) return { ok: true, value: null };
  if (result.value <= 0) {
    return { ok: false, error: 'Reactance and impedance must be greater than zero.' };
  }
  return { ok: true, value: result.value };
}

/** Parse a plain decimal (comma or dot accepted). */
export function parseDecimal(raw: string): ParseResult {
  if (raw.trim() === '') return { ok: true, value: null };
  const compact = normalizeNumericText(raw);
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(compact)) {
    return { ok: false, error: 'Enter a plain decimal number (for example 0.95).' };
  }
  const value = Number(compact);
  if (!Number.isFinite(value)) return { ok: false, error: 'This number is too large to evaluate.' };
  return { ok: true, value };
}
