---
id: E265
euler_id: 8
slug: largest-product-in-a-series
title: Largest Product in a Series
difficulty: easy
category: easy
topics: ["array", "sliding-window"]
patterns: ["sliding-window-fixed"]
estimated_time_minutes: 20
frequency: medium
related_problems: ["E269", "M001"]
prerequisites: ["arrays-basics"]
---

# Largest Product in a Series

## Problem

Given a string of digits and a window size k, find the largest product of k consecutive digits in the string.

For example, if you have the digit string `"73167176531330624919225119674426574742355349194934"` and k = 4, you need to find the product of 4 consecutive digits that gives the maximum result. The substring `"9989"` would give 9 × 9 × 8 × 9 = 5832, but there might be a larger product elsewhere.

You should treat each character in the string as a single-digit integer (0-9). The string will only contain digit characters.

## Why This Matters

This is a classic sliding window problem that teaches you to efficiently process consecutive elements in a sequence. Instead of recalculating the product from scratch for every window position (which would be O(n*k)), the sliding window pattern lets you maintain state as you move through the data in O(n) time.

The key algorithmic insight is handling zeros intelligently: when you encounter a zero in your window, the product becomes zero. Rather than multiplying by zero repeatedly, you can skip ahead or reset your calculation. This problem appears in various forms in real-world scenarios like analyzing time-series data (stock prices, sensor readings), detecting patterns in DNA sequences, or finding optimal substrings in text processing.

The product calculation also teaches careful handling of edge cases: integer overflow for very large products, division by zero when sliding the window, and boundary conditions at the start and end of the sequence.

## Examples

**Example 1:**

- Input: `digits = "1234", k = 2`
- Output: `12`
- Explanation: Possible windows are "12" (1×2=2), "23" (2×3=6), "34" (3×4=12). Maximum is 12.

**Example 2:**

- Input: `digits = "73167176531330624919", k = 4`
- Output: `5832`
- Explanation: The window "7316" gives 7×3×1×6=126, but "9989" appears later giving 9×9×8×9=5832.

**Example 3:**

- Input: `digits = "90034", k = 3`
- Output: `0`
- Explanation: Every 3-digit window contains the zero, so all products are 0.

## Constraints

- 1 <= k <= digits.length <= 1000
- `digits` contains only characters '0'-'9'
- k represents the number of consecutive digits to multiply

## Think About

1. What's the brute force approach? How can you optimize it?
2. When sliding the window right by one position, what changes?
3. How should you handle zeros in the digit string?
4. Can you avoid recalculating the entire product for each window?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Brute force baseline</summary>

The straightforward approach iterates through each possible starting position and multiplies k consecutive digits.

**Consider:**

- How many windows are there in a string of length n with window size k?
- For each window, you multiply k digits: what's the time complexity?
- This gives O(n*k) time - can we do better?

</details>

<details>
<summary>🎯 Hint 2: Sliding window optimization</summary>

Think about moving from one window to the next: `[a,b,c,d]` to `[b,c,d,e]`.

You're removing `a` and adding `e`. If you had the product of the first window, can you calculate the second window's product without multiplying all 4 numbers again?

**Key insight:** `new_product = (old_product / a) * e`

**But beware:** What happens when `a` is 0? Division by zero!

</details>

<details>
<summary>📝 Hint 3: Handling zeros intelligently</summary>

**Two approaches:**

**Approach A - Convert and track:**
```
Convert string to array of integers
For each window:
    If any element is 0:
        product = 0
    Else:
        Calculate/update product normally
```

**Approach B - Split on zeros:**
```
Split the digit string by '0' characters
For each segment (substring with no zeros):
    Apply sliding window
Track global maximum
```

**Optimization:** When you encounter a zero, you can skip k positions ahead since any window containing that zero will have product 0.

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Brute Force | O(n*k) | O(1) | Simple but recalculates products |
| **Sliding Window** | **O(n)** | **O(n)** | Optimal; single pass with digit array |
| Sliding Window (optimized) | O(n) | O(1) | Can avoid array conversion |

**Why Sliding Window Wins:**

- Single pass through the digit string
- Constant time to slide window (remove left, add right)
- Space can be O(1) if processing characters directly

**Note:** When zeros are frequent, the "split on zeros" optimization can significantly improve practical performance.

---

## Common Mistakes

### 1. Division by zero when sliding

```
# WRONG: Dividing by zero
product = product / left_digit * right_digit  # Fails when left_digit = 0

# CORRECT: Check for zeros or recalculate
if left_digit == 0:
    product = calculate_fresh_product(window)
else:
    product = (product // left_digit) * right_digit
```

### 2. Integer overflow for large products

```
# ISSUE: In languages like C++/Java, products can overflow
# For k=13 with all 9s: 9^13 > 2^31

# SOLUTION:
# - Use long/BigInteger types
# - In Python, integers have arbitrary precision (no issue)
```

### 3. Off-by-one errors in window boundaries

```
# WRONG: Window extends past array bounds
for i in range(len(digits)):  # Should be range(len(digits) - k + 1)
    product = multiply(digits[i:i+k])

# CORRECT: Ensure window fits
for i in range(len(digits) - k + 1):
    ...
```

### 4. Not initializing max_product correctly

```
# WRONG: Starting with max_product = 0
# If all products are negative (impossible here, but pattern matters)
# or if all are less than initial value

# CORRECT: Initialize with first window's product
max_product = product_of_first_window
# Then compare remaining windows
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Maximum sum window** | Sum instead of product | Same sliding window, easier (no zeros issue) |
| **Variable window size** | Find any size window with max product | Try all k from 1 to n |
| **Minimum product** | Find minimum instead | Same algorithm, track min instead |
| **Product equals target** | Find window with specific product | Add early termination when target found |
| **2D grid version** | Find product in grid | See Problem E269 - extend to 4 directions |

**Maximum Sum Window (easier variant):**

```
current_sum = sum(first k elements)
max_sum = current_sum

for i in range(k, n):
    current_sum = current_sum - array[i-k] + array[i]
    max_sum = max(max_sum, current_sum)
```

---

## Practice Checklist

**Correctness:**

- [ ] Handles basic case (Example 1)
- [ ] Handles zeros in the digit string (Example 3)
- [ ] Handles window size = 1
- [ ] Handles window size = entire string length

**Optimization:**

- [ ] Achieved O(n) time complexity
- [ ] Avoided recalculating product for each window
- [ ] Handled zeros efficiently

**Interview Readiness:**

- [ ] Can explain sliding window pattern in 2 minutes
- [ ] Can code solution in 7 minutes
- [ ] Can discuss zero-handling strategies
- [ ] Identified edge cases (all zeros, single digit, etc.)

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve with variations (sum window)
- [ ] Day 14: Explain optimization to someone else
- [ ] Day 30: Quick review

---

**Strategy Reference:** See [Sliding Window Pattern](../../strategies/patterns/sliding-window.md) | [Array Fundamentals](../../prerequisites/arrays.md)
