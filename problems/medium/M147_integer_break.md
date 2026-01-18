---
id: M147
old_id: I142
slug: integer-break
title: Integer Break
difficulty: medium
category: medium
topics: ["math", "dynamic-programming"]
patterns: ["dp-1d", "mathematical-optimization"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E070", "M279", "M343"]
prerequisites: ["dynamic-programming", "mathematical-reasoning", "optimization"]
---
# Integer Break

## Problem

You are given a positive integer `n`. Your objective is to decompose this number into a sum of at least two positive integers, then find the decomposition that yields the maximum possible product when all parts are multiplied together. For example, if `n = 10`, you could break it into `3 + 3 + 4`, which gives a product of `3 × 3 × 4 = 36`, but you could also break it into `2 + 2 + 2 + 2 + 2`, which only gives `2 × 2 × 2 × 2 × 2 = 32`.

Return the largest product achievable through such a decomposition. The constraint that you must use at least two parts means you can't simply return `n` itself; you must split it. The question becomes: which splitting strategy maximizes the product? Should you split into many small numbers or fewer larger numbers? Is there a mathematical pattern to the optimal splits?

The key insight involves recognizing that certain numbers appear repeatedly in optimal solutions. Through experimentation with small values, you'll discover that breaking numbers into 3s tends to maximize products, with special handling for remainders. Edge cases include small values like `n = 2` (must split into 1 + 1 = 1) and `n = 3` (must split into 1 + 2 = 2), where the splitting requirement actually reduces the value below `n` itself.

## Why This Matters

This problem appears in resource allocation optimization where you must divide resources into portions to maximize overall utility or output. Manufacturing systems determine optimal batch sizes: producing items in batches of size 3 often maximizes efficiency due to setup costs versus processing throughput. Network packet sizing follows similar principles, where splitting data into optimal-sized chunks maximizes bandwidth utilization. Investment strategies involve dividing capital into portions where compounding returns follow multiplicative rules. The mathematical insight that 3s are optimal comes from calculus: the number `e` (approximately 2.718) theoretically maximizes products, and 3 is the closest integer to `e`, making it the most efficient divisor. This problem teaches you to look for mathematical patterns in optimization problems rather than purely algorithmic solutions, a skill valuable in operations research, algorithm design, and quantitative analysis.

## Examples

**Example 1:**
- Input: `n = 2`
- Output: `1`
- Explanation: The only way to split 2 is into 1 + 1, which gives a product of 1 × 1 = 1

**Example 2:**
- Input: `n = 10`
- Output: `36`
- Explanation: One optimal decomposition is 10 = 3 + 3 + 4, yielding 3 × 3 × 4 = 36

## Constraints

- 2 <= n <= 58

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Mathematical Pattern Discovery</summary>

Try calculating the optimal product for small values:
- n=2: 1×1 = 1
- n=3: 1×2 = 2
- n=4: 2×2 = 4
- n=5: 2×3 = 6
- n=6: 3×3 = 9
- n=7: 3×4 = 12 or 2×2×3 = 12
- n=8: 2×3×3 = 18 or 3×3×2 = 18

Do you notice a pattern? Which numbers appear most frequently in optimal decompositions? Hint: Focus on 2s and 3s.

</details>

<details>
<summary>🎯 Hint 2: Why 3s Are Optimal</summary>

Mathematical insight: For n ≥ 5, breaking into 3s maximizes the product. Why?
- 3 × 3 = 9 > 2 × 2 × 2 = 8 (using three 2s)
- As n increases, using 3s gives better products than using 2s
- Exception: When remainder after dividing by 3 is 1, use one less 3 and add 4 (because 2×2 = 4 > 3×1 = 3)

Strategy: Maximize the number of 3s, handle remainders specially.

</details>

<details>
<summary>📝 Hint 3: Algorithm Steps</summary>

**Approach 1: Dynamic Programming**
```
1. Create dp array where dp[i] = max product for number i
2. Base cases: dp[1] = 1, dp[2] = 1
3. For i from 3 to n:
   - For each split point j from 1 to i-1:
     - Option 1: Don't split j further: j × dp[i-j]
     - Option 2: Don't split i-j further: dp[j] × (i-j)
     - Option 3: Don't split either: j × (i-j)
     - Take maximum of all options
4. Return dp[n]
```

**Approach 2: Mathematical (Optimal)**
```
1. If n <= 3: return n - 1
2. Calculate: quotient = n // 3, remainder = n % 3
3. If remainder == 0: return 3^quotient
4. If remainder == 1: return 3^(quotient-1) × 4
5. If remainder == 2: return 3^quotient × 2
```

Key insight: Greedy use of 3s with special remainder handling.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force Recursion | O(2^n) | O(n) | Try all partitions, exponential |
| Dynamic Programming | O(n²) | O(n) | Try all split points for each number |
| **Mathematical/Greedy** | **O(log n)** | **O(1)** | **Power operation, optimal** |

The mathematical approach is optimal, recognizing that 3s maximize the product.

## Common Mistakes

### Mistake 1: Not Considering "No Split" Option

**Wrong Approach:**
```python
# Only splitting numbers, missing the option to not split
def integer_break(n):
    dp = [0] * (n + 1)
    dp[1] = 1
    dp[2] = 1

    for i in range(3, n + 1):
        for j in range(1, i):
            dp[i] = max(dp[i], dp[j] * dp[i - j])  # Wrong: always splitting

    return dp[n]
```

**Correct Approach:**
```python
# Consider not splitting one or both parts
def integer_break(n):
    dp = [0] * (n + 1)
    dp[1] = 1
    dp[2] = 1

    for i in range(3, n + 1):
        for j in range(1, i):
            # Three options: split j, split i-j, or don't split
            dp[i] = max(dp[i],
                       j * (i - j),          # Don't split either
                       j * dp[i - j],        # Split second part
                       dp[j] * (i - j))      # Split first part

    return dp[n]
```

### Mistake 2: Wrong Base Cases

**Wrong Approach:**
```python
# Incorrect base cases for DP
def integer_break(n):
    if n <= 2:
        return n  # Wrong: should return n-1

    dp = [0] * (n + 1)
    dp[1] = 1
    dp[2] = 2  # Wrong: for n=2, answer is 1 not 2
    # Rest of DP...
```

**Correct Approach:**
```python
# Correct base cases
def integer_break(n):
    if n <= 3:
        return n - 1  # Correct: n=2→1, n=3→2

    dp = [0] * (n + 1)
    dp[1] = 1  # Subproblem value
    dp[2] = 2  # Subproblem value (can use 2 without splitting)
    dp[3] = 3  # Subproblem value (can use 3 without splitting)

    for i in range(4, n + 1):
        # Now dp can reference dp[2] and dp[3] correctly
```

### Mistake 3: Not Handling Remainder 1 Correctly

**Wrong Approach:**
```python
# Mathematical approach with wrong remainder handling
def integer_break(n):
    if n <= 3:
        return n - 1

    quotient = n // 3
    remainder = n % 3

    if remainder == 0:
        return 3 ** quotient
    elif remainder == 1:
        return 3 ** quotient * 1  # Wrong: 3^q × 1 is suboptimal
    else:
        return 3 ** quotient * 2
```

**Correct Approach:**
```python
# Handle remainder 1 by using one less 3 and adding 4
def integer_break(n):
    if n <= 3:
        return n - 1

    quotient = n // 3
    remainder = n % 3

    if remainder == 0:
        return 3 ** quotient
    elif remainder == 1:
        return 3 ** (quotient - 1) * 4  # Correct: use 3^(q-1) × 4
    else:
        return 3 ** quotient * 2
```

## Variations

| Variation | Difference | Key Insight |
|-----------|------------|-------------|
| Perfect Squares | Sum of perfect squares | Similar DP, consider squares i² |
| Coin Change | Minimum coins for amount | DP with different optimization goal |
| Partition Equal Subset Sum | Split into equal sum subsets | DP with subset sum target |
| Integer Break (Min Product) | Minimize product instead | Use 2s and handle differently |
| Integer Break (Fixed Parts) | Exactly k parts | Add dimension to DP for part count |

## Practice Checklist

- [ ] Implement DP solution with all split options
- [ ] Implement mathematical/greedy solution
- [ ] Handle edge case: n = 2
- [ ] Handle edge case: n = 3
- [ ] Verify pattern: n=4→4, n=5→6, n=6→9
- [ ] Test with n = 10 (expect 36)
- [ ] Test with large n (n = 58)
- [ ] Understand why 3s are optimal
- [ ] Verify O(1) space for mathematical approach
- [ ] Code without looking at solution

**Spaced Repetition Schedule:**
- First review: 24 hours
- Second review: 3 days
- Third review: 1 week
- Fourth review: 2 weeks
- Fifth review: 1 month

**Strategy**: See [Dynamic Programming Patterns](../strategies/patterns/dynamic-programming.md)
