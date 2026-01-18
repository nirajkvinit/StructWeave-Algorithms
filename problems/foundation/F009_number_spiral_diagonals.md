---
id: F009
euler_id: 28
slug: number-spiral-diagonals
title: Number Spiral Diagonals
difficulty: foundation
topics: ["math", "patterns", "spirals"]
patterns: []
estimated_time_minutes: 15
prerequisites: ["programming-basics"]
---

# Number Spiral Diagonals

## Problem

Starting with 1 at the center and spiraling outward clockwise, form an n×n spiral of numbers. Find the sum of the numbers on both diagonals.

The spiral looks like this for n = 5:

```
21 22 23 24 25
20  7  8  9 10
19  6  1  2 11
18  5  4  3 12
17 16 15 14 13
```

The two diagonals are:
- Top-left to bottom-right: 21, 7, 1, 3, 13
- Top-right to bottom-left: 25, 9, 1, 5, 17

Note that the center (1) is counted only once. The sum is 21 + 7 + 1 + 3 + 13 + 25 + 9 + 5 + 17 = 101.

Given an odd number n, calculate the sum of all numbers on both diagonals of an n×n spiral.

## Why This Matters

Pattern recognition is one of the most valuable skills in algorithm design and mathematics. Many problems that seem to require complex data structures or brute-force iteration can be solved elegantly by recognizing underlying patterns.

This problem teaches you to:
1. **Avoid brute force**: Building the entire n×n matrix is O(n²) space and time. Recognizing the pattern makes it O(n) time and O(1) space.
2. **Find mathematical structure**: The spiral reveals a predictable sequence. Each "ring" or "layer" adds specific corner values.
3. **Generalize from examples**: By examining small cases (n=3, n=5), you can derive formulas for arbitrary n.

**Real-world applications** of spiral patterns and pattern recognition:
- **Image processing**: Spiral scans for compression and feature detection
- **Cache-friendly algorithms**: Accessing memory in predictable patterns
- **Maze generation**: Spiral algorithms for procedural generation
- **Prime number spirals**: Ulam spiral reveals patterns in prime distribution
- **Scheduling**: Round-robin and circular buffer patterns

The key insight is that corners of each ring follow a mathematical formula. This transforms a seemingly geometric problem into pure arithmetic.

## Examples

**Example 1:**

- Input: `n = 5`
- Output: `101`
- Explanation: Diagonals sum: 21 + 7 + 1 + 3 + 13 + 25 + 9 + 5 + 17 = 101

**Example 2:**

- Input: `n = 3`
- Output: `25`
- Explanation: For the 3×3 spiral:
  ```
  7 8 9
  6 1 2
  5 4 3
  ```
  Diagonals: 7 + 1 + 3 + 9 + 5 = 25

**Example 3:**

- Input: `n = 1`
- Output: `1`
- Explanation: Just the center: 1

## Constraints

- n is odd
- 1 <= n <= 1001
- n is the side length of the spiral

## Think About

1. Do you really need to build the entire spiral matrix?
2. What pattern do the corner values follow?
3. How many "rings" or "layers" are there in an n×n spiral?
4. Can you express the corner values mathematically?

---

## Approach Hints

<details>
<summary>Hint 1: Getting Started - Observe the Pattern</summary>

Don't build the matrix! Instead, observe the corner values:

**For n = 5:**
- Layer 1 (center): 1
- Layer 2 (3×3): corners are 3, 5, 7, 9
- Layer 3 (5×5): corners are 13, 17, 21, 25

**For n = 7:**
- Layer 4 (7×7): corners are 31, 37, 43, 49

Notice:
- Each layer adds 4 corner values (except the center)
- The side length increases by 2 each layer (1, 3, 5, 7, ...)
- The gap between corners in each layer is the side length minus 1

</details>

<details>
<summary>Hint 2: Key Insight - Mathematical Formula</summary>

For a ring with side length `s` (where s = 3, 5, 7, ...), the top-right corner is `s²`.

From there, the other three corners are:
- Top-right corner: s²
- Top-left corner: s² - (s - 1)
- Bottom-left corner: s² - 2(s - 1)
- Bottom-right corner: s² - 3(s - 1)

Sum of the four corners:
```
sum = s² + (s² - (s-1)) + (s² - 2(s-1)) + (s² - 3(s-1))
    = 4s² - 6(s - 1)
    = 4s² - 6s + 6
```

**Algorithm:**
```
total = 1  # center
for side_length in [3, 5, 7, ..., n]:
    total += 4 * side_length² - 6 * side_length + 6
```

</details>

<details>
<summary>Hint 3: Optimization - Implementation</summary>

```python
def spiral_diagonals(n):
    if n == 1:
        return 1

    total = 1  # start with center

    # Iterate through odd side lengths: 3, 5, 7, ..., n
    for side_length in range(3, n + 1, 2):
        total += 4 * side_length**2 - 6 * side_length + 6

    return total
```

**Complexity:**
- Time: O(n) - iterate through n/2 layers
- Space: O(1) - only store running sum

This is dramatically better than building the O(n²) matrix!

**Alternative closed-form formula** (very advanced):
```
sum = (4n³ + 3n² + 8n - 9) / 6
```

But deriving this requires summing arithmetic series. The iterative approach is clearer and equally efficient.

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Build full matrix | O(n²) | O(n²) | Intuitive but wasteful |
| Pattern recognition | O(n) | O(1) | Optimal; uses mathematical insight |
| Closed-form formula | O(1) | O(1) | Fastest but complex to derive |

---

## Key Concept

**Pattern Recognition in Sequences**

Many algorithmic problems have hidden patterns that transform brute-force O(n²) or O(n³) solutions into O(n) or even O(1) solutions.

**How to discover patterns:**
1. **Work small examples**: Compute n = 1, 3, 5, 7 by hand
2. **Look for structure**: How do values change between layers?
3. **Express relationships**: Can each value be computed from previous ones?
4. **Generalize**: Write a formula that works for arbitrary n
5. **Verify**: Test your formula against known small cases

**Spiral properties:**
- The spiral has (n+1)/2 layers (including the center)
- Layer k has side length 2k - 1
- The top-right corner of layer k is (2k - 1)²
- All four corners can be expressed relative to this top-right corner

**Mathematical insight:**
The sum of corners for side length s is 4s² - 6s + 6. Summing this for s = 3, 5, 7, ..., n gives:
```
Σ(4s² - 6s + 6) for s ∈ {3, 5, 7, ..., n}
```

This can be evaluated using arithmetic series formulas, yielding the closed-form solution.

**General lesson**: Before implementing a complex simulation, analyze the problem for patterns. Mathematical insight often beats computational power.

---

## Common Mistakes

1. **Building the entire matrix**: This works but is inefficient. You don't need the full spiral, just the diagonal values.

2. **Off-by-one errors in layers**: Make sure you iterate through all layers. For n = 5, you have layers with side lengths 1, 3, 5 (3 layers total).

3. **Counting the center twice**: The center (1) appears on both diagonals but should only be counted once.

4. **Wrong corner formula**: The corners decrease by (side_length - 1), not side_length. For side 5: 25, 21, 17, 13 (gaps of 4, not 5).

5. **Assuming n is even**: The problem specifies n is odd. Even-sized spirals don't have a single center point.

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Counter-clockwise spiral | Spiral direction reversed | Same corners, different positions |
| Only one diagonal | Sum just one diagonal | Track only corners on that diagonal |
| Product instead of sum | Multiply diagonal values | Use product accumulator |
| Even-sized spiral | n can be even | Handle center differently (no single center) |
| Prime spiral (Ulam) | Mark only primes | Build matrix, check primality |
| Largest diagonal value | Find maximum | Track max instead of sum |

---

## Practice Checklist

**Correctness:**

- [ ] Handles basic cases (Examples 1-3)
- [ ] Handles edge cases (n = 1, n = 1001)
- [ ] Counts center only once
- [ ] Produces correct output format (single integer)

**Understanding:**

- [ ] Can explain the pattern without code
- [ ] Understands corner value formula
- [ ] Can derive formula for arbitrary layer

**Mastery:**

- [ ] Solved without hints
- [ ] Can explain to someone else
- [ ] Avoided building the full matrix
- [ ] Identified pattern from small examples

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Explain the pattern
- [ ] Day 14: Derive closed-form formula

---

**Euler Reference:** [Problem 28](https://projecteuler.net/problem=28)

**Next Step:** After mastering this, try [F010: Distinct Powers](F010_distinct_powers.md)
