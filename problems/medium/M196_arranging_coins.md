---
id: M196
old_id: I240
slug: arranging-coins
title: Arranging Coins
difficulty: medium
category: medium
topics: []
patterns: ["backtrack-permutation", "dp-2d"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E069", "M050", "M367"]
prerequisites: ["binary-search", "math", "quadratic-formula"]
---
# Arranging Coins

## Problem

Imagine you have `n` coins that you want to arrange into a staircase pattern, where each row `i` must contain exactly `i` coins. The first row has 1 coin, the second row has 2 coins, the third row has 3 coins, and so on. You keep adding rows until you run out of coins. The final row might be incomplete if you don't have enough coins left to fill it entirely.

Given the total number of coins `n`, determine how many complete rows you can form in this staircase structure. A complete row is one that has all the coins it needs (row `k` needs exactly `k` coins). For example, if you have 5 coins, you can make 2 complete rows: row 1 gets 1 coin, row 2 gets 2 coins, and you have 2 coins left over (not enough for row 3, which would need 3 coins). The challenge is that `n` can be extremely large (up to 2³¹ - 1), so approaches that try to build the staircase row by row or loop through possibilities will be too slow. Think about the mathematical relationship: you need 1+2+3+...+k coins for k complete rows, which equals k(k+1)/2.

**Diagram:**

Example 1: n = 5 coins (2 complete rows)
```
Row 1:  *
Row 2:  * *
Row 3:  * *  (incomplete)
```

Example 2: n = 8 coins (3 complete rows)
```
Row 1:  *
Row 2:  * *
Row 3:  * * *
Row 4:  * *  (incomplete)
```


## Why This Matters

This problem appears in resource allocation scenarios where items must be distributed in increasing quantities across stages or levels. Game developers use this pattern when designing level progression systems where each level requires more experience points than the previous one, and they need to calculate what level a player reaches with a given total XP. Storage systems apply this when allocating increasingly larger buffer sizes across cache levels and need to determine how many levels fit within total memory. The mathematical insight of solving quadratic equations efficiently appears in physics simulations (projectile motion, acceleration problems), financial calculations (compound interest convergence), and computer graphics (curve approximation). The binary search approach you'll develop here for finding the largest k satisfying an inequality is a fundamental technique for any monotonic function where direct calculation might have numerical precision issues. Understanding when to use mathematical formulas versus binary search versus iteration teaches you to balance theoretical elegance with practical robustness, a key skill when working with floating-point arithmetic in real systems.

## Constraints

- 1 <= n <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual Understanding</summary>
The sum of the first k rows is 1 + 2 + 3 + ... + k = k(k+1)/2. You need to find the largest k where k(k+1)/2 <= n. This is equivalent to solving the quadratic equation k² + k - 2n = 0 and taking the floor of the positive root. Alternatively, use binary search to find the largest valid k.
</details>

<details>
<summary>🎯 Hint 2: Multiple Approaches</summary>
Three valid approaches: 1) Math formula: k = floor((-1 + sqrt(1 + 8n)) / 2), derived from quadratic formula. 2) Binary search: search for largest k in [0, n] where k(k+1)/2 <= n. 3) Iterative: subtract 1, 2, 3... until n < next row size. Binary search is most reliable due to numerical precision issues with sqrt.
</details>

<details>
<summary>📝 Hint 3: Binary Search Algorithm</summary>
```
def arrangeCoins(n):
    left, right = 0, n

    while left <= right:
        mid = left + (right - left) // 2
        # Check if we can form mid complete rows
        coins_needed = mid * (mid + 1) // 2

        if coins_needed == n:
            return mid
        elif coins_needed < n:
            left = mid + 1
        else:
            right = mid - 1

    # right is the largest k where k(k+1)/2 <= n
    return right
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Binary Search | O(log n) | O(1) | Most reliable, no precision issues |
| Mathematical Formula | O(1) | O(1) | Fast but floating point precision concerns |
| Iterative Subtraction | O(√n) | O(1) | Simple but slow for large n |
| Newton's Method | O(log log n) | O(1) | Fastest but complex implementation |

**Recommended approach**: Binary search for balance of clarity and efficiency.

## Common Mistakes

**Mistake 1: Integer overflow in sum calculation**
```python
# Wrong: mid * (mid + 1) can overflow for large mid
def arrangeCoins(n):
    left, right = 0, n

    while left <= right:
        mid = (left + right) // 2
        coins_needed = mid * (mid + 1) // 2  # Overflow possible

        if coins_needed == n:
            return mid
        elif coins_needed < n:
            left = mid + 1
        else:
            right = mid - 1

    return right
```

```python
# Correct: Use comparison to avoid overflow
def arrangeCoins(n):
    left, right = 0, n

    while left <= right:
        mid = left + (right - left) // 2
        # Check without computing full sum if possible
        # Or ensure using Python 3's arbitrary precision
        coins_needed = mid * (mid + 1) // 2

        if coins_needed == n:
            return mid
        elif coins_needed < n:
            left = mid + 1
        else:
            right = mid - 1

    return right  # Python handles big integers, but be aware in other languages
```

**Mistake 2: Incorrect mathematical formula**
```python
# Wrong: Doesn't handle floor correctly or uses wrong formula
import math

def arrangeCoins(n):
    # Missing floor, or wrong calculation
    return int((-1 + math.sqrt(1 + 8 * n)) / 2) + 1  # Off by one
```

```python
# Correct: Proper quadratic formula with floor
import math

def arrangeCoins(n):
    # From k^2 + k - 2n = 0, solve for k
    # k = (-1 + sqrt(1 + 8n)) / 2
    return int((-1 + math.sqrt(1 + 8 * n)) / 2)
```

**Mistake 3: Wrong binary search boundary**
```python
# Wrong: Returns left instead of right
def arrangeCoins(n):
    left, right = 0, n

    while left <= right:
        mid = left + (right - left) // 2
        coins_needed = mid * (mid + 1) // 2

        if coins_needed == n:
            return mid
        elif coins_needed < n:
            left = mid + 1
        else:
            right = mid - 1

    return left  # Wrong: left is one past the answer
```

```python
# Correct: Returns right after binary search
def arrangeCoins(n):
    left, right = 0, n

    while left <= right:
        mid = left + (right - left) // 2
        coins_needed = mid * (mid + 1) // 2

        if coins_needed == n:
            return mid
        elif coins_needed < n:
            left = mid + 1
        else:
            right = mid - 1

    return right  # Right is largest k where k(k+1)/2 <= n
```

## Variations

| Variation | Difference | Key Insight |
|-----------|-----------|-------------|
| Perfect Square | Find largest k where k² <= n | Binary search or integer sqrt |
| Triangular Number Check | Is n a triangular number? | Check if k(k+1)/2 == n has integer solution |
| Sum of Consecutive | n as sum of consecutive integers | Related to triangular numbers |
| Hexagonal Tiling | Different geometric pattern | Adjust formula for pattern's sum |
| K-step Staircase | Rows increase by k each time | Generalize arithmetic series sum |

## Practice Checklist

Use spaced repetition to master this problem:

- [ ] Day 1: Solve using binary search
- [ ] Day 2: Solve using mathematical formula
- [ ] Day 4: Implement without looking at notes
- [ ] Day 7: Solve and derive quadratic formula
- [ ] Day 14: Solve variations (perfect square)
- [ ] Day 30: Speed test - solve in under 8 minutes
