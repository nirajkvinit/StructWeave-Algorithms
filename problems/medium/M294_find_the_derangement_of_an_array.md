---
id: M294
old_id: A101
slug: find-the-derangement-of-an-array
title: Find the Derangement of An Array
difficulty: medium
category: medium
topics: ["math", "dynamic-programming", "combinatorics"]
patterns: ["backtrack-permutation", "mathematical-dp"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E203", "M367", "H046"]
prerequisites: ["dynamic-programming", "combinatorics", "recurrence-relations"]
---
# Find the Derangement of An Array

## Problem

Imagine you have `n` numbered cards from 1 to `n` sitting in order: [1, 2, 3, ..., n]. A derangement is a shuffling where no card ends up in its original position - card 1 is not in position 1, card 2 is not in position 2, and so on (using 1-indexed positions).

For example:
- With `n = 3` and cards [1, 2, 3], the derangements are [2, 3, 1] and [3, 1, 2]. The arrangement [2, 1, 3] doesn't count because card 3 stayed in position 3.
- With `n = 2` and cards [1, 2], only [2, 1] is valid.
- With `n = 1`, there are zero derangements since the single card must stay in its only position.

Your task: count how many valid derangements exist for a given `n`. Since the count grows extremely fast (factorially), return the result modulo 10⁹ + 7.

The challenge isn't checking individual arrangements but counting them efficiently. Generating all permutations and filtering would be impossibly slow (there are n! total permutations). Instead, you need to recognize this as a classic counting problem with a mathematical pattern.

## Why This Matters

Derangements are a fundamental concept in combinatorics with surprising real-world applications. The "hat check problem" asks: if n people check their hats and get random hats back, what's the probability no one gets their own hat? This equals D(n)/n! where D(n) is the number of derangements. Derangements appear in cryptography for permutation ciphers, in card shuffling analysis, and in the inclusion-exclusion principle for counting. The problem teaches you to recognize when a counting problem has a recurrence relation: D(n) = (n-1)[D(n-1) + D(n-2)]. This pattern-recognition skill applies to many dynamic programming problems. You'll also learn to handle large numbers with modular arithmetic, essential for any problem involving combinatorial counting.

## Examples

**Example 1:**
- Input: `n = 3`
- Output: `2`
- Explanation: Starting with [1,2,3], two valid rearrangements exist: [2,3,1] where element 1 is at position 2, element 2 is at position 3, and element 3 is at position 1; and [3,1,2] following a similar pattern.

**Example 2:**
- Input: `n = 2`
- Output: `1`
- Explanation: Starting with [1,2], only [2,1] is valid.

**Example 3:**
- Input: `n = 1`
- Output: `0`
- Explanation: [1] cannot be rearranged so that 1 is not at position 1.

## Constraints

- 1 <= n <= 10⁶

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Recurrence Relation for Derangements</summary>

The number of derangements D(n) follows a recurrence relation. Consider element n: it must go to some position k where k ≠ n. There are (n-1) choices for k. For each choice, either: (1) element k goes to position n, leaving D(n-2) ways to derange the remaining elements, or (2) element k doesn't go to position n, which is equivalent to deranging n-1 elements. This gives: D(n) = (n-1) * [D(n-1) + D(n-2)].

</details>

<details>
<summary>Hint 2: Dynamic Programming Implementation</summary>

Use dynamic programming with base cases D(0) = 1 and D(1) = 0. Build up the solution iteratively from 2 to n using the recurrence relation. Since n can be up to 10⁶, use space optimization by only keeping track of the last two values instead of an entire array. Remember to apply modulo 10⁹ + 7 at each step to prevent overflow.

</details>

<details>
<summary>Hint 3: Alternative Formula</summary>

There's a closed-form approximation: D(n) ≈ n! / e, where e is Euler's number. The exact formula is: D(n) = n! * Σ((-1)^k / k!) for k from 0 to n. However, the DP approach with the recurrence relation is more numerically stable for large n and easier to implement with modular arithmetic.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| DP with Recurrence | O(n) | O(1) | Optimal; uses space-optimized DP |
| DP with Array | O(n) | O(n) | Store all values from 0 to n |
| Factorial Formula | O(n) | O(1) | Requires careful handling of factorial and modulo |
| Backtracking | O(n!) | O(n) | Generates all permutations; too slow |

## Common Mistakes

1. **Not applying modulo at each step**
```python
# Wrong: applies modulo only at the end
def findDerangement(n):
    if n == 1: return 0
    dp0, dp1 = 1, 0
    for i in range(2, n + 1):
        dp_curr = (i - 1) * (dp0 + dp1)  # Can overflow
    return dp_curr % (10**9 + 7)

# Correct: apply modulo at each step
def findDerangement(n):
    MOD = 10**9 + 7
    if n == 1: return 0
    dp0, dp1 = 1, 0
    for i in range(2, n + 1):
        dp_curr = ((i - 1) * (dp0 + dp1)) % MOD
        dp0, dp1 = dp1, dp_curr
    return dp1
```

2. **Wrong base cases**
```python
# Wrong: incorrect base cases
def findDerangement(n):
    dp = [0] * (n + 1)
    dp[0] = 0  # Wrong! D(0) should be 1
    dp[1] = 0  # Correct
    # ... rest of DP

# Correct: D(0) = 1, D(1) = 0
def findDerangement(n):
    if n == 1: return 0
    dp0, dp1 = 1, 0  # D(0) = 1, D(1) = 0
    for i in range(2, n + 1):
        dp_curr = ((i - 1) * (dp0 + dp1)) % (10**9 + 7)
        dp0, dp1 = dp1, dp_curr
    return dp1
```

3. **Off-by-one in recurrence formula**
```python
# Wrong: uses (i) instead of (i-1)
def findDerangement(n):
    MOD = 10**9 + 7
    dp0, dp1 = 1, 0
    for i in range(2, n + 1):
        dp_curr = (i * (dp0 + dp1)) % MOD  # Should be (i-1)
        dp0, dp1 = dp1, dp_curr

# Correct: uses (i-1) as per recurrence relation
def findDerangement(n):
    MOD = 10**9 + 7
    dp0, dp1 = 1, 0
    for i in range(2, n + 1):
        dp_curr = ((i - 1) * (dp0 + dp1)) % MOD
        dp0, dp1 = dp1, dp_curr
    return dp1
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Partial Derangements | Count permutations where exactly k elements are in their original positions | Hard |
| Derangement with Constraints | Some positions are pre-assigned; count valid derangements | Hard |
| Cyclic Derangements | Count derangements that form a single cycle | Medium |
| k-Derangements | At least k elements must be displaced from original positions | Medium |

## Practice Checklist

- [ ] Implement DP solution with recurrence relation
- [ ] Use space-optimized DP (O(1) space)
- [ ] Handle base cases: n=0 (returns 1 conceptually), n=1 (returns 0)
- [ ] Apply modulo at each step
- [ ] Test with n=2, n=3, n=4
- [ ] Verify result for n=10: D(10) = 1,334,961
- [ ] Test with large n (approaching 10⁶)
- [ ] Understand why D(n) ≈ n!/e for large n
- [ ] **Review in 24 hours**: Re-implement from memory
- [ ] **Review in 1 week**: Derive recurrence relation from scratch
- [ ] **Review in 2 weeks**: Solve without hints
