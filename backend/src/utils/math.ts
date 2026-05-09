/** Convert grams to kilograms, rounded to 3 decimal places. */
export function gramsToKg(grams: number): number {
  return Number((grams / 1000).toFixed(3));
}

/** Convert kilograms to grams, rounded to the nearest gram. */
export function kgToGrams(kg: number): number {
  return Math.round(kg * 1000);
}

/**
 * Calculate AMD earned for a given weight and per-kg rate.
 * Rounded to the nearest whole dram.
 */
export function calculateEarnedAmd(grams: number, amdPerKg: number): number {
  return Math.round((grams / 1000) * amdPerKg);
}
