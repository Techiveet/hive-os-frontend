/**
 * Shared monetary helpers.
 *
 * The subscription pricing authority is the backend: every amount that is
 * charged, stored, or sent to a payment provider is calculated server-side and
 * already normalised to the currency's minor units. These helpers exist purely
 * so the frontend never *re-introduces* IEEE-754 artefacts (e.g.
 * 899.0000000000002) when it recomputes a display-only estimate — summing
 * add-on prices, or multiplying a monthly figure out to an annual one.
 *
 * ETB is a two-decimal currency. If Hive later supports currencies with
 * different minor units, `decimals` is the single knob to make it aware.
 */

/**
 * Round a value to a fixed number of decimals, correcting binary
 * floating-point drift so the result is a clean decimal number (not a string).
 */
export function roundMoney(value: unknown, decimals = 2): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return 0;
  }
  const factor = 10 ** decimals;
  // Adding Number.EPSILON nudges values that sit a hair below a rounding
  // boundary (e.g. 1.005) up to the intended digit before truncation.
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

/**
 * Format a monetary value for display. Defaults to Hive's existing
 * `ETB <whole>` convention (no decimals); pass `decimals: 2` for `ETB 899.00`.
 */
export function formatMoney(
  value: unknown,
  { currency = 'ETB', decimals = 0, locale = 'en-US' }: { currency?: string; decimals?: number; locale?: string } = {},
): string {
  const amount = roundMoney(value, Math.max(decimals, 2));
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

  return `${currency} ${formatted}`;
}
