/**
 * Pick a readable axis step that is at least as large as `rawStep`.
 *
 * A plain 1-2-5 sequence can round a 56-unit step to 100, leaving a plot
 * mostly empty. Including intermediate steps such as 1.5, 3 and 6 keeps the
 * largest phasor close to the edge while still producing tidy labels.
 */
const NICE_FRACTIONS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

export function niceStep(rawStep: number): number {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
  const exponent = Math.floor(Math.log10(rawStep));
  const fraction = rawStep / 10 ** exponent;
  const nice = NICE_FRACTIONS.find((candidate) => fraction <= candidate) ?? 10;
  return Number((nice * 10 ** exponent).toPrecision(12));
}

/** Choose the total grid extent and per-division step for a linear plot. */
export function plotScale(
  largestMagnitude: number,
  divisions: number,
  headroom = 1.16,
): { step: number; max: number } {
  const safeMagnitude = Number.isFinite(largestMagnitude) && largestMagnitude > 0
    ? largestMagnitude
    : 1;
  const step = niceStep((safeMagnitude * headroom) / divisions);
  return { step, max: step * divisions };
}
