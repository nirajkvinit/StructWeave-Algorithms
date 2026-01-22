/**
 * ============================================================================
 * PROJECT EULER PROBLEM #1: Multiples of 3 or 5
 * ============================================================================
 *
 * PROBLEM:
 * Find the sum of all positive integers below a limit that are divisible
 * by either of two given divisors.
 *
 * EXAMPLE:
 * Below 10, which numbers are divisible by 3 or 5?
 *
 *    1  2  3  4  5  6  7  8  9
 *          ✓     ✓  ✓        ✓
 *
 *    3 ÷ 3 = 1 (no remainder) ✓
 *    5 ÷ 5 = 1 (no remainder) ✓
 *    6 ÷ 3 = 2 (no remainder) ✓
 *    9 ÷ 3 = 3 (no remainder) ✓
 *
 *    Answer: 3 + 5 + 6 + 9 = 23
 *
 * TWO APPROACHES:
 * 1. find_sum_hard_way     - Loop through every number (slow but simple)
 * 2. find_sum_optimized_way - Use math formula (instant, even for billions)
 */

// ============================================================================
// MATH HELPER #1: Greatest Common Divisor (GCD)
// ============================================================================
/**
 * GCD finds the LARGEST number that divides both inputs evenly.
 *
 * WHY DO WE NEED THIS?
 * To find the LCM (Least Common Multiple), which tells us where
 * the multiples of our two divisors OVERLAP.
 *
 * ALGORITHM: Euclidean Algorithm (discovered ~300 BC!)
 * Keep replacing the larger number with the remainder until remainder is 0.
 *
 * VISUALIZATION - Finding GCD(48, 18):
 *
 *    ┌──────────────────────────────────────────────────────────┐
 *    │  Step  │   a   │   b   │  a % b  │  What happens        │
 *    ├──────────────────────────────────────────────────────────┤
 *    │  Start │  48   │  18   │   12    │  48 ÷ 18 = 2 rem 12  │
 *    │    1   │  18   │  12   │    6    │  18 ÷ 12 = 1 rem 6   │
 *    │    2   │  12   │   6   │    0    │  12 ÷ 6  = 2 rem 0   │
 *    │  Done! │   6   │   0   │    -    │  Return 6            │
 *    └──────────────────────────────────────────────────────────┘
 *
 *    Answer: GCD(48, 18) = 6
 *    Check: 48 ÷ 6 = 8 ✓   18 ÷ 6 = 3 ✓
 *
 * SIMPLE EXAMPLE - GCD(12, 8):
 *
 *    12 % 8 = 4  →  now check GCD(8, 4)
 *     8 % 4 = 0  →  done! Answer is 4
 *
 *    Factors of 12: 1, 2, 3, 4, 6, 12
 *    Factors of  8: 1, 2, 4, 8
 *    Common: 1, 2, 4  →  Greatest is 4 ✓
 */
const gcd = (a: number, b: number): number => {
  // Keep going until b becomes 0
  while (b !== 0) {
    // Save the remainder (what's left after division)
    const remainder = a % b;

    // Shift: old 'b' becomes new 'a'
    a = b;

    // Shift: remainder becomes new 'b'
    b = remainder;
  }

  // When b is 0, 'a' holds our answer
  return a;
};

// ============================================================================
// MATH HELPER #2: Least Common Multiple (LCM)
// ============================================================================
/**
 * LCM finds the SMALLEST number that both inputs divide into evenly.
 *
 * WHY DO WE NEED THIS?
 * When counting multiples of 3 AND 5, some numbers (like 15, 30, 45...)
 * are counted TWICE. The LCM tells us which numbers to subtract.
 *
 * FORMULA: LCM(a, b) = (a × b) ÷ GCD(a, b)
 *
 * VISUALIZATION - Finding LCM(4, 6):
 *
 *    Multiples of 4:  4,  8, 12, 16, 20, 24, 28...
 *    Multiples of 6:  6, 12, 18, 24, 30...
 *                         ↑
 *                    First common = 12 = LCM
 *
 *    Using formula:
 *    ┌─────────────────────────────────────┐
 *    │  Step 1: 4 × 6 = 24                 │
 *    │  Step 2: GCD(4, 6) = 2              │
 *    │  Step 3: 24 ÷ 2 = 12                │
 *    │  Answer: LCM(4, 6) = 12             │
 *    └─────────────────────────────────────┘
 *
 * COMMON MISTAKE:
 *    LCM is NOT always a × b!
 *    LCM(4, 6) = 12, NOT 24
 *    LCM(3, 5) = 15 (here it IS 3 × 5, because GCD is 1)
 */
const lcm = (a: number, b: number): number => {
  // Can't find LCM if either number is 0
  if (a === 0 || b === 0) return 0;

  // Formula: |a × b| ÷ GCD(a,b)
  // Math.abs handles negative numbers
  return Math.abs((a * b) / gcd(a, b));
};

// ============================================================================
// MATH HELPER #3: Sum of Arithmetic Series (Gauss Formula)
// ============================================================================
/**
 * Adds up all numbers from 1 to n: 1 + 2 + 3 + ... + n
 *
 * STORY TIME - Young Gauss (age 10):
 * Teacher: "Add numbers 1 to 100 to keep you busy"
 * Gauss: "5050" (answered in seconds!)
 *
 * THE TRICK - Pair numbers from opposite ends:
 *
 *    1 + 2 + 3 + ... + 98 + 99 + 100
 *    └─────────────────────────────┘
 *         Pair them up:
 *         1 + 100 = 101
 *         2 +  99 = 101
 *         3 +  98 = 101
 *         ...
 *         50 pairs, each = 101
 *         50 × 101 = 5050
 *
 * FORMULA: sum = n × (n + 1) ÷ 2
 *
 * VISUALIZATION for n = 5:
 *
 *    Numbers: 1, 2, 3, 4, 5
 *
 *    Visual trick - make a rectangle:
 *
 *    ★ ☆ ☆ ☆ ☆ ☆      ★ = our sum (1+2+3+4+5)
 *    ★ ★ ☆ ☆ ☆ ☆      ☆ = mirror copy
 *    ★ ★ ★ ☆ ☆ ☆
 *    ★ ★ ★ ★ ☆ ☆      Rectangle = n × (n+1) = 5 × 6 = 30
 *    ★ ★ ★ ★ ★ ☆      Our sum = half = 30 ÷ 2 = 15
 *
 *    Check: 1 + 2 + 3 + 4 + 5 = 15 ✓
 */
const arithmeticSeriesSum = (n: number): number => {
  // Can't sum negative count of numbers
  if (n < 1) return 0;

  // Gauss formula: n(n+1)/2
  // Math.floor ensures we get a whole number
  return Math.floor((n * (n + 1)) / 2);
};

// ============================================================================
// DOMAIN HELPER #1: Count Multiples Below a Limit
// ============================================================================
/**
 * How many multiples of 'divisor' exist below 'limit'?
 *
 * EXAMPLE: How many multiples of 3 are below 10?
 *
 *    Numbers below 10:  1, 2, 3, 4, 5, 6, 7, 8, 9
 *    Multiples of 3:          3,       6,       9
 *    Count: 3
 *
 *    Formula: floor((limit - 1) ÷ divisor)
 *           = floor((10 - 1) ÷ 3)
 *           = floor(9 ÷ 3)
 *           = floor(3)
 *           = 3 ✓
 *
 * WHY (limit - 1)?
 *    Because we want numbers BELOW the limit, not including it.
 *    If limit = 15 and divisor = 5:
 *    - We want: 5, 10 (two numbers)
 *    - We DON'T want: 15 (it's not BELOW 15)
 *    - floor((15-1) ÷ 5) = floor(14 ÷ 5) = floor(2.8) = 2 ✓
 */
const countMultiplesBelow = (limit: number, divisor: number): number => {
  // Edge cases: nothing to count
  if (limit < 1 || divisor === 0) return 0;

  // Formula: how many times does divisor fit into (limit-1)?
  // Math.abs handles negative divisors (multiples of -3 are same as multiples of 3)
  return Math.floor((limit - 1) / Math.abs(divisor));
};

// ============================================================================
// DOMAIN HELPER #2: Sum of All Multiples Below a Limit
// ============================================================================
/**
 * Add up all multiples of 'divisor' that are below 'limit'.
 *
 * EXAMPLE: Sum of multiples of 3 below 10
 *
 *    Multiples of 3 below 10:  3, 6, 9
 *    Sum: 3 + 6 + 9 = 18
 *
 * THE CLEVER TRICK:
 *    3 + 6 + 9 = 3×1 + 3×2 + 3×3
 *              = 3 × (1 + 2 + 3)
 *              = 3 × 6
 *              = 18
 *
 *    In general: divisor × (1 + 2 + ... + count)
 *              = divisor × arithmeticSeriesSum(count)
 *
 * VISUALIZATION:
 *
 *    ┌────────────────────────────────────────────────────────┐
 *    │  Sum of multiples of 5 below 20:                       │
 *    │                                                        │
 *    │  Multiples: 5, 10, 15                                  │
 *    │  Count: floor((20-1) ÷ 5) = 3                          │
 *    │                                                        │
 *    │  5 + 10 + 15 = 5×1 + 5×2 + 5×3                         │
 *    │              = 5 × (1 + 2 + 3)                         │
 *    │              = 5 × 6                                   │
 *    │              = 30                                      │
 *    └────────────────────────────────────────────────────────┘
 */
const sumOfMultiplesBelow = (limit: number, divisor: number): number => {
  // Edge cases: nothing to sum
  if (limit < 1 || divisor === 0) return 0;

  // Handle negative divisors (multiples of -3 = multiples of 3)
  const normalizedDivisor = Math.abs(divisor);

  // Step 1: How many multiples are there?
  const count = countMultiplesBelow(limit, normalizedDivisor);

  // Step 2: Sum = divisor × (1 + 2 + ... + count)
  return normalizedDivisor * arithmeticSeriesSum(count);
};

// ============================================================================
// EXPORTED FUNCTION #1: The Simple Way (Brute Force)
// ============================================================================
/**
 * Loop through every number and check if it's divisible.
 *
 * TIME COMPLEXITY: O(n) - checks every number up to limit
 *
 * HOW IT WORKS:
 *
 *    find_sum_hard_way(10, 3, 5)
 *
 *    ┌─────┬───────────┬───────────┬─────────┐
 *    │  i  │  i % 3    │  i % 5    │  Add?   │
 *    ├─────┼───────────┼───────────┼─────────┤
 *    │  1  │  1 ≠ 0    │  1 ≠ 0    │  No     │
 *    │  2  │  2 ≠ 0    │  2 ≠ 0    │  No     │
 *    │  3  │  0 = 0 ✓  │  (skip)   │  Yes +3 │
 *    │  4  │  1 ≠ 0    │  4 ≠ 0    │  No     │
 *    │  5  │  2 ≠ 0    │  0 = 0 ✓  │  Yes +5 │
 *    │  6  │  0 = 0 ✓  │  (skip)   │  Yes +6 │
 *    │  7  │  1 ≠ 0    │  2 ≠ 0    │  No     │
 *    │  8  │  2 ≠ 0    │  3 ≠ 0    │  No     │
 *    │  9  │  0 = 0 ✓  │  (skip)   │  Yes +9 │
 *    └─────┴───────────┴───────────┴─────────┘
 *
 *    Result: 3 + 5 + 6 + 9 = 23
 *
 * NOTE: We use "else if" so numbers divisible by BOTH (like 15)
 *       are only counted once!
 *
 * WHEN TO USE:
 *    - Small limits (under 100,000)
 *    - When you need to understand the logic
 *    - When debugging
 *
 * PROBLEM:
 *    For limit = 1,000,000,000 (one billion), this would
 *    need to check ONE BILLION numbers. Too slow!
 */
export const find_sum_hard_way = (
  limit: number,
  divisor1: number,
  divisor2: number,
): number => {
  // Nothing below 1, so sum is 0
  if (limit < 1) return 0;

  let result = 0;

  // Check every number from 1 to limit-1
  for (let i = 1; i < limit; i++) {
    // Is i divisible by divisor1?
    // (divisor1 !== 0 prevents division by zero)
    if (divisor1 !== 0 && i % divisor1 === 0) {
      result += i;
    }
    // ELSE IF: only check divisor2 if divisor1 didn't match
    // This prevents double-counting numbers like 15 (divisible by both 3 and 5)
    else if (divisor2 !== 0 && i % divisor2 === 0) {
      result += i;
    }
  }

  return result;
};

// ============================================================================
// EXPORTED FUNCTION #2: The Smart Way (Math Formula)
// ============================================================================
/**
 * Use math formulas to calculate instantly, even for billions!
 *
 * TIME COMPLEXITY: O(1) - constant time, regardless of limit size
 *
 * THE KEY INSIGHT: Inclusion-Exclusion Principle
 *
 *    When you count "multiples of 3 OR 5", some numbers get
 *    counted twice (like 15, 30, 45...). We need to subtract them.
 *
 *    VENN DIAGRAM:
 *
 *       ┌─────────────────────────────────────┐
 *       │        Numbers below 20             │
 *       │   ┌───────────┬───────────┐         │
 *       │   │           │           │         │
 *       │   │  Only ÷3  │  Only ÷5  │         │
 *       │   │   3,6,9   │   5,10    │         │
 *       │   │   12,18   │   20      │         │
 *       │   │           │           │         │
 *       │   │     ┌─────┤           │         │
 *       │   │     │ 15  │           │         │
 *       │   │     │(÷3  │           │         │
 *       │   │     │AND  │           │         │
 *       │   │     │ ÷5) │           │         │
 *       │   └─────┴─────┴───────────┘         │
 *       └─────────────────────────────────────┘
 *
 *    If we add (sum of ÷3) + (sum of ÷5), we count 15 TWICE!
 *    Fix: Subtract (sum of numbers ÷ both 3 AND 5)
 *
 * FORMULA:
 *    Total = Sum(divisor1) + Sum(divisor2) - Sum(LCM)
 *
 *    Where LCM = Least Common Multiple (where overlaps happen)
 *
 * EXAMPLE: find_sum_optimized_way(20, 3, 5)
 *
 *    ┌────────────────────────────────────────────────────────┐
 *    │  Step 1: Sum of multiples of 3 below 20                │
 *    │          3 + 6 + 9 + 12 + 15 + 18 = 63                 │
 *    │                                                        │
 *    │  Step 2: Sum of multiples of 5 below 20                │
 *    │          5 + 10 + 15 = 30                              │
 *    │                                                        │
 *    │  Step 3: LCM(3, 5) = 15                                │
 *    │          Sum of multiples of 15 below 20 = 15          │
 *    │                                                        │
 *    │  Step 4: Total = 63 + 30 - 15 = 78                     │
 *    └────────────────────────────────────────────────────────┘
 *
 *    Verify: 3+5+6+9+10+12+15+18 = 78 ✓
 *
 * WHY IS THIS FAST?
 *    No loops! Just a few multiplications and divisions.
 *    Works the same whether limit is 10 or 10,000,000,000.
 */
export const find_sum_optimized_way = (
  limit: number,
  divisor1: number,
  divisor2: number,
): number => {
  // Nothing below 1, so sum is 0
  if (limit < 1) return 0;

  // If both divisors are 0, there are no multiples to find
  if (divisor1 === 0 && divisor2 === 0) return 0;

  // Step 1: Sum all multiples of divisor1
  const sum1 = sumOfMultiplesBelow(limit, divisor1);

  // Step 2: Sum all multiples of divisor2
  const sum2 = sumOfMultiplesBelow(limit, divisor2);

  // Step 3: Find where overlaps occur (LCM)
  const overlapDivisor = lcm(divisor1, divisor2);

  // Step 4: Sum the overlapping multiples (counted twice, need to subtract once)
  const overlapSum = sumOfMultiplesBelow(limit, overlapDivisor);

  // Final answer: Add both, subtract overlap
  // This is the Inclusion-Exclusion Principle!
  return sum1 + sum2 - overlapSum;
};
