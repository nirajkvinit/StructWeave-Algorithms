import { describe, it, expect } from "vitest";
import { find_sum_hard_way, find_sum_optimized_way } from "./index.js";

describe("f001: Sum of multiples", () => {
  it("should calculate sum of multiples of 3 or 5 below 10", () => {
    // 3, 5, 6, 9 => 23
    expect(find_sum_hard_way(10, 3, 5)).toBe(23);

    expect(find_sum_optimized_way(10, 3, 5)).toBe(23);
  });

  it("should calculate sum for a larger number", () => {
    // Check for another known value if needed, or just basic confidence check
    expect(find_sum_hard_way(16, 3, 5)).toBe(60);
    expect(find_sum_optimized_way(16, 3, 5)).toBe(60);
    // Multiples below 16: 3, 5, 6, 9, 10, 12, 15
    // Sum: 3+5+6+9+10+12+15 = 60
  });

  it("should return 0 when no multiples exist below limit", () => {
    expect(find_sum_hard_way(3, 3, 5)).toBe(0);
    expect(find_sum_optimized_way(3, 3, 5)).toBe(0);
  });

  it("should return 0 for safe edge cases like limit 0 or negative", () => {
    expect(find_sum_hard_way(0, 3, 5)).toBe(0);
    expect(find_sum_hard_way(-10, 3, 5)).toBe(0);

    expect(find_sum_optimized_way(0, 3, 5)).toBe(0);
    expect(find_sum_optimized_way(-10, 3, 5)).toBe(0);
  });

  it("should handle cases where dividers are larger than limit", () => {
    expect(find_sum_hard_way(5, 10, 15)).toBe(0);

    expect(find_sum_optimized_way(5, 10, 15)).toBe(0);
  });

  it("should handle cases where dividers match", () => {
    // valid multiples below 10 for 5: 5.
    expect(find_sum_hard_way(10, 5, 5)).toBe(5);
    expect(find_sum_optimized_way(10, 5, 5)).toBe(5);
  });

  it("should handle cases where one divider is a multiple of the other", () => {
    // limit 10, dividers 2 and 4.
    // Multiples of 2: 2, 4, 6, 8. (4 and 8 are also multiples of 4)
    // Sum: 2+4+6+8 = 20
    // Code:
    // 2%2==0 (add 2)
    // 3%2!=0
    // 4%2==0 (add 4) - verify else if logic handles this correct (it won't double count)
    expect(find_sum_hard_way(10, 2, 4)).toBe(20);
    expect(find_sum_optimized_way(10, 2, 4)).toBe(20);
  });

  it("should handle divider equal to 1", () => {
    // limit 5, divider 1 and 5.
    // Multiples of 1 below 5: 1, 2, 3, 4. Sum = 10.
    expect(find_sum_hard_way(5, 1, 5)).toBe(10);
    expect(find_sum_optimized_way(5, 1, 5)).toBe(10);
  });

  it("should calculate correctly for larger numbers (Project Euler #1)", () => {
    // Sum of multiples of 3 or 5 below 1000 is 233168
    expect(find_sum_hard_way(1000, 3, 5)).toBe(233168);
    expect(find_sum_optimized_way(1000, 3, 5)).toBe(233168);
  });

  it("should calculate correctly for even larger limit", () => {
    // Limit 10,000
    // Multiples of 3 below 10000: sum(3, 6, ..., 9999) = 3 * sum(1..3333) = 3 * (3333*3334)/2 = 16668333
    // Multiples of 5 below 10000: sum(5, 10, ..., 9995) = 5 * sum(1..1999) = 5 * (1999*2000)/2 = 9995000
    // Multiples of 15 below 10000: sum(15, 30, ..., 9990) = 15 * sum(1..666) = 15 * (666*667)/2 = 3331665
    // Total = 16668333 + 9995000 - 3331665 = 23331668
    expect(find_sum_hard_way(10000, 3, 5)).toBe(23331668);
    expect(find_sum_optimized_way(10000, 3, 5)).toBe(23331668);
  });

  it("should handle non-coprime divisors where neither divides the other", () => {
    // limit 25, divisors 4 and 6. LCM(4,6) = 12, not 24
    // Multiples of 4 below 25: 4, 8, 12, 16, 20, 24
    // Multiples of 6 below 25: 6, 12, 18, 24
    // Union: 4, 6, 8, 12, 16, 18, 20, 24 => sum = 108
    expect(find_sum_hard_way(25, 4, 6)).toBe(108);
    expect(find_sum_optimized_way(25, 4, 6)).toBe(108);
  });

  it("should return 0 when limit is 1", () => {
    // No positive integers below 1
    expect(find_sum_hard_way(1, 3, 5)).toBe(0);
    expect(find_sum_optimized_way(1, 3, 5)).toBe(0);
  });

  it("should handle very large limits efficiently (O(1) only)", () => {
    // 1 million - O(n) would be slow, O(1) is instant
    // This verifies the optimized formula works for large numbers
    const result = find_sum_optimized_way(1_000_000, 3, 5);
    expect(result).toBe(233333166668);
  });

  describe("Edge cases for 0 or negative, inputs", () => {
    it("should return 0 if limit is 0", () => {
      expect(find_sum_hard_way(0, 3, 5)).toBe(0);
      expect(find_sum_optimized_way(0, 3, 5)).toBe(0);
    });

    it("should return 0 if limit is negative", () => {
      expect(find_sum_hard_way(-10, 3, 5)).toBe(0);
      expect(find_sum_optimized_way(-10, 3, 5)).toBe(0);
    });

    it("should handle 0 as a divisor (resulting in no matches for that divisor)", () => {
      // Division by zero results in NaN in JS % operation, so i % 0 === 0 is false.
      // If both divisors are 0, sum should be 0.
      expect(find_sum_hard_way(10, 0, 0)).toBe(0);
      expect(find_sum_optimized_way(10, 0, 0)).toBe(0);
      // If one is valid and other is 0, should sum only for valid one.
      // Multiples of 3 below 10: 3, 6, 9 => 18
      expect(find_sum_hard_way(10, 3, 0)).toBe(18);
      expect(find_sum_optimized_way(10, 3, 0)).toBe(18);
    });

    it("should handle negative divisors safely", () => {
      // Mathematically, positive integers can be divisible by negative integers.
      // 3 % -3 === 0 in JS.
      // 6 % -3 === 0.
      // So it should sum the same as if they were positive.
      expect(find_sum_hard_way(10, -3, -5)).toBe(23);
      expect(find_sum_hard_way(10, 3, -5)).toBe(23);
      expect(find_sum_optimized_way(10, -3, -5)).toBe(23);
      expect(find_sum_optimized_way(10, 3, -5)).toBe(23);
    });
  });
});
