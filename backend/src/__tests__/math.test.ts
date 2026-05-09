import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { gramsToKg, kgToGrams, calculateEarnedAmd } from "../utils/math";

describe("gramsToKg", () => {
  it("converts whole kilograms correctly", () => {
    assert.strictEqual(gramsToKg(1000), 1);
    assert.strictEqual(gramsToKg(5000), 5);
  });

  it("converts fractional kilograms to 3 decimal places", () => {
    assert.strictEqual(gramsToKg(1500), 1.5);
    assert.strictEqual(gramsToKg(22400), 22.4);
    assert.strictEqual(gramsToKg(123), 0.123);
  });

  it("rounds to 3 decimal places", () => {
    // 1 gram = 0.001 kg exactly
    assert.strictEqual(gramsToKg(1), 0.001);
  });
});

describe("kgToGrams", () => {
  it("converts whole kilograms correctly", () => {
    assert.strictEqual(kgToGrams(1), 1000);
    assert.strictEqual(kgToGrams(10), 10000);
  });

  it("converts fractional kilograms with rounding", () => {
    assert.strictEqual(kgToGrams(1.5), 1500);
    assert.strictEqual(kgToGrams(0.123), 123);
  });

  it("rounds sub-gram values", () => {
    // 1.0001 kg = 1000.1 grams → rounds to 1000
    assert.strictEqual(kgToGrams(1.0001), 1000);
    // 1.0005 kg = 1000.5 grams → rounds to 1001
    assert.strictEqual(kgToGrams(1.0005), 1001);
  });
});

describe("calculateEarnedAmd", () => {
  it("calculates earnings for whole kilograms", () => {
    // 1 kg at ֏350/kg = ֏350
    assert.strictEqual(calculateEarnedAmd(1000, 350), 350);
    // 1 kg at ֏500/kg = ֏500
    assert.strictEqual(calculateEarnedAmd(1000, 500), 500);
  });

  it("calculates earnings for fractional weights", () => {
    // 22.4 kg at ֏350/kg = ֏7840
    assert.strictEqual(calculateEarnedAmd(22400, 350), 7840);
    // 0.5 kg at ֏500/kg = ֏250
    assert.strictEqual(calculateEarnedAmd(500, 500), 250);
  });

  it("rounds fractional drams to nearest whole dram", () => {
    // 1.5 kg at ֏333/kg = 499.5 → ֏500
    assert.strictEqual(calculateEarnedAmd(1500, 333), 500);
    // 1 kg at ֏333/kg = 333 → ֏333
    assert.strictEqual(calculateEarnedAmd(1000, 333), 333);
  });

  it("returns zero for zero weight", () => {
    assert.strictEqual(calculateEarnedAmd(0, 350), 0);
  });
});
