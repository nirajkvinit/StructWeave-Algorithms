---
id: M414
old_id: A260
slug: preimage-size-of-factorial-zeroes-function
title: Preimage Size of Factorial Zeroes Function
difficulty: medium
category: medium
topics: ["math"]
patterns: []
estimated_time_minutes: 30
---
# Preimage Size of Factorial Zeroes Function

## Problem

Define a function `f(x)` that counts the trailing zeros in the factorial of `x`. For example, `5! = 120` has one trailing zero, so `f(5) = 1`. Similarly, `10! = 3628800` has two trailing zeros, so `f(10) = 2`.

Trailing zeros come from factors of 10, which are products of 2 and 5. Since factorials contain more factors of 2 than 5, the number of trailing zeros equals the number of times 5 divides into x!. This count is calculated as: `f(x) = ⌊x/5⌋ + ⌊x/25⌋ + ⌊x/125⌋ + ...` (counting multiples of 5, 25, 125, etc.).

Here's the twist: given an integer `k`, determine how many non-negative integers `x` exist such that `f(x) = k`. In other words, how many numbers have factorials with exactly `k` trailing zeros?

For example, when `k = 0`, the values x = 0, 1, 2, 3, 4 all have factorials with zero trailing zeros (0!=1, 1!=1, 2!=2, 3!=6, 4!=24), giving us 5 possible values. However, some values of `k` are impossible. For instance, `k = 5` cannot be achieved by any factorial because the function `f(x)` "jumps over" 5 (it goes from 4 to 6).

The fascinating mathematical property is that the answer is always either 0 or 5.

## Why This Matters

This problem beautifully demonstrates how mathematical insights can transform what seems like a computational problem into an elegant analytical one. The function f(x) is monotonically increasing but not continuous - it has "gaps" where certain values are impossible. Understanding discrete functions and their properties is crucial in algorithm analysis, cryptography (where modular arithmetic creates similar gaps), and computational number theory. The binary search technique combined with mathematical reasoning here is a pattern that appears in many optimization problems where you need to find values satisfying numerical constraints.

## Examples

**Example 1:**
- Input: `k = 0`
- Output: `5`
- Explanation: 0!, 1!, 2!, 3!, and 4! end with k = 0 zeroes.

**Example 2:**
- Input: `k = 5`
- Output: `0`
- Explanation: There is no x such that x! ends in k = 5 zeroes.

**Example 3:**
- Input: `k = 3`
- Output: `5`

## Constraints

- 0 <= k <= 10⁹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Trailing zeros come from factors of 10 = 2 × 5. Since there are always more factors of 2 than 5 in factorials, count factors of 5. The function f(x) = x/5 + x/25 + x/125 + ... is monotonically increasing but NOT continuous - it "jumps" at certain values. The answer is either 0 or 5 depending on whether k is in a gap.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use binary search to find the smallest x where f(x) >= k and the largest x where f(x) <= k. If they produce the same value of k, then the preimage size is (largest - smallest + 1). However, due to the discrete jumps in f(x), certain k values are impossible (gaps in the range of f). The pattern shows: the answer is always 0 or 5.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
You don't need to compute the exact preimage set. Just check if k is achievable. Use binary search to find any x where f(x) = k. If found, return 5 (there are always exactly 5 consecutive integers with the same trailing zero count when it exists). If not found, return 0. The search space is [0, 5*k] since f(x) grows roughly as x/4.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(k) | O(1) | Check each x up to some limit |
| Binary Search | O(log²k) | O(1) | Binary search with f(x) calculation being O(log k) |
| Optimal | O(log²k) | O(1) | Single binary search to check if k is achievable |

## Common Mistakes

1. **Not understanding the trailing zeros formula**
   ```python
   # Wrong: Only counting factors of 5 at one level
   def trailing_zeros(n):
       return n // 5

   # Correct: Count all powers of 5
   def trailing_zeros(n):
       count = 0
       power = 5
       while power <= n:
           count += n // power
           power *= 5
       return count
   ```

2. **Assuming the answer can be any number**
   ```python
   # Wrong: Trying to count exact range
   left = binary_search_left(k)
   right = binary_search_right(k)
   return right - left + 1  # Could be inefficient

   # Correct: Answer is always 0 or 5
   def preimage_size(k):
       if is_achievable(k):
           return 5
       return 0
   ```

3. **Inefficient binary search bounds**
   ```python
   # Wrong: Using very large bounds unnecessarily
   left, right = 0, 10**10  # Too large

   # Correct: Tighter bounds based on f(x) growth
   left, right = 0, 5 * k  # f(x) ~ x/4, so upper bound is ~5k
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Factorial Trailing Zeroes | Easy | Direct calculation of f(x) for given x |
| Count Primes | Medium | Different mathematical function to analyze |
| Nth Digit | Medium | Find digit in infinite integer sequence |
| K-th Smallest Prime Fraction | Hard | Binary search on fractions with constraint |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Binary Search](../../strategies/patterns/binary-search.md)
