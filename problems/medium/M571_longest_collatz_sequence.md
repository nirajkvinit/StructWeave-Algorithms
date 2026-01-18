---
id: M571
slug: longest-collatz-sequence
title: Longest Collatz Sequence
difficulty: medium
category: medium
topics: ["math", "memoization", "sequences"]
patterns: ["memoization"]
estimated_time_minutes: 25
frequency: medium
related_problems: ["M070", "E001"]
prerequisites: ["recursion-basics", "hash-map"]
---

# Longest Collatz Sequence

## Problem

Consider the following iterative sequence: start with any positive integer n. If n is even, divide it by 2. If n is odd, multiply by 3 and add 1. Repeat this process with each resulting number. The conjecture (unproven but believed true) is that no matter what starting number you choose, the sequence will always eventually reach 1.

For example, starting with 13:
```
13 → 40 → 20 → 10 → 5 → 16 → 8 → 4 → 2 → 1
```

This sequence has 10 terms (including the starting number and ending at 1).

Your task: Given a limit value, find which starting number under that limit produces the longest sequence. If multiple numbers produce the same maximum length, return the largest starting number.

```
Example visualization:
n = 13: 13→40→20→10→5→16→8→4→2→1  (length: 10)
n = 10: 10→5→16→8→4→2→1           (length: 7)
n = 5:  5→16→8→4→2→1              (length: 6)
```

## Why This Matters

The Collatz sequence is one of mathematics' most famous unsolved problems, yet computing sequence lengths demonstrates practical memoization perfectly. This problem teaches you when and how to cache computational results - a fundamental optimization technique used everywhere from web caching to dynamic programming. The naive approach would recalculate sequence lengths repeatedly, leading to exponential time complexity. With memoization, you transform this into nearly linear time. This pattern appears in interview problems involving Fibonacci sequences, tree path calculations, and recursive computations. Understanding how to identify repeated subproblems and cache their results is essential for optimizing recursive algorithms. The Collatz sequence also introduces you to mathematical sequences and pattern recognition, skills crucial for algorithm design.

## Examples

**Example 1:**
- Input: `limit = 10`
- Output: `9`
- Explanation: Starting with 9 produces the sequence 9→28→14→7→22→11→34→17→52→26→13→40→20→10→5→16→8→4→2→1 (20 terms), which is the longest among numbers below 10.

**Example 2:**
- Input: `limit = 1000000`
- Output: `837799`
- Explanation: 837799 produces the longest sequence (length 525) among all numbers below 1 million.

**Example 3:**
- Input: `limit = 5`
- Output: `3`
- Explanation: Starting with 3 gives 3→10→5→16→8→4→2→1 (8 terms), which is the longest for numbers below 5.

## Constraints

- 1 <= limit <= 10^7
- The sequence length for any starting number will not exceed 10^6 terms
- You can assume the Collatz conjecture is true (all sequences eventually reach 1)

## Think About

1. What happens when you calculate the sequence for a number you've already processed?
2. If you know the length from number n, can you use that information when processing 2n?
3. How much memory are you willing to trade for speed?
4. What's the base case for your sequence calculation?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Identify the repeated work</summary>

Consider calculating the sequence length for n = 10:
```
10 → 5 → 16 → 8 → 4 → 2 → 1
```

Now calculate for n = 20:
```
20 → 10 → 5 → 16 → 8 → 4 → 2 → 1
```

Notice that once you reach 10, the rest of the sequence is identical! If you've already calculated the length from 10 to 1, you can reuse that result.

**Think about:**
- How many times might you encounter the same intermediate number?
- What data structure efficiently stores and retrieves previously computed lengths?

</details>

<details>
<summary>🎯 Hint 2: Memoization strategy</summary>

Use a hash map (dictionary) to store sequence lengths you've already computed:

```
memo = {}  # key: starting number, value: sequence length

function collatz_length(n):
    if n == 1:
        return 1

    if n in memo:
        return memo[n]  # Already computed!

    # Calculate next number in sequence
    if n is even:
        next_n = n / 2
    else:
        next_n = 3 * n + 1

    # Recursively get length from next_n
    length = 1 + collatz_length(next_n)

    # Cache the result before returning
    memo[n] = length
    return length
```

**Key insight:** Every number you encounter while computing sequences can be cached and reused.

</details>

<details>
<summary>🚀 Hint 3: Optimization tips</summary>

**Optimization 1: Start from the bottom**
- Compute lengths for small numbers first (they appear in many sequences)
- This populates your cache with commonly-needed values

**Optimization 2: Iterative vs Recursive**
- Recursive approach is elegant but may hit stack limits for large sequences
- Iterative approach with memoization is more robust:

```python
def get_length(n, memo):
    original_n = n
    steps = 0

    # Follow sequence until we hit a cached value or 1
    while n not in memo and n != 1:
        if n % 2 == 0:
            n = n // 2
        else:
            n = 3 * n + 1
        steps += 1

    # Base case or cached value
    base_length = 1 if n == 1 else memo[n]

    # Cache and return
    memo[original_n] = steps + base_length
    return memo[original_n]
```

**Optimization 3: Memory management**
- You don't need to cache every number up to the limit
- Only cache numbers you actually encounter in sequences
- Numbers above the limit can still be computed, but don't cache them (they won't be starting points)

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Brute Force (no caching) | O(n * L) | O(1) | L = avg sequence length (~100s), extremely slow |
| **Memoization** | **O(n * α)** | **O(n)** | α = amortized cost per number (~1-2 after caching) |
| Pre-compute all | O(n * L) | O(n) | Slower initially but handles queries in O(1) |

**Why memoization wins:**
- First computation of a sequence: O(L) where L is sequence length
- Subsequent lookups of any number in that sequence: O(1)
- Average case: Each number is processed ~1-2 times max
- Effective time complexity approaches O(n)

**Space breakdown:**
- Hash map: O(n) entries in worst case
- Each entry: O(1) space (integer key and value)
- Stack space (if recursive): O(L) where L = max sequence length (~500)

**Practical performance:**
- For limit = 1,000,000:
  - Without memoization: ~30+ seconds
  - With memoization: ~1-2 seconds
  - 15-30x speedup!

---

## Common Mistakes

### 1. Not caching intermediate values
```python
# WRONG: Only caches the starting number's length
def get_length(n):
    steps = 0
    while n != 1:
        if n % 2 == 0:
            n = n // 2
        else:
            n = 3 * n + 1
        steps += 1
    return steps

# For each starting number, recomputes entire sequence!
max_len = 0
for i in range(1, limit):
    max_len = max(max_len, get_length(i))
```

**Fix:** Cache every intermediate value you compute, not just the starting number.

### 2. Integer overflow
```python
# WRONG: 3 * n + 1 can overflow for large n
if n % 2 == 1:
    n = 3 * n + 1  # May overflow if n is large
```

**Fix:** Use languages with arbitrary precision (Python) or ensure n stays within bounds. In this problem, even though starting numbers are limited, intermediate values can exceed the limit by a lot.

### 3. Off-by-one in counting
```python
# WRONG: Counting inconsistently
steps = 0
while n != 1:
    # ... transform n ...
    steps += 1
# Forgot to count the final 1!

# CORRECT: Either include 1 in the count or start at 1
steps = 1  # Count the starting number
while n != 1:
    # ... transform n ...
    steps += 1
```

### 4. Stack overflow with deep recursion
```python
# RISKY: Recursive solution without tail call optimization
def collatz_length(n, memo):
    if n == 1:
        return 1
    if n in memo:
        return memo[n]

    # Deep recursion for long sequences
    next_n = n // 2 if n % 2 == 0 else 3 * n + 1
    memo[n] = 1 + collatz_length(next_n, memo)  # May overflow stack
    return memo[n]
```

**Fix:** Use iterative approach or ensure your language optimizes tail calls.

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Sum of sequence values** | Return sum instead of length | Track sum while traversing |
| **Multiple limits** | Many queries with different limits | Pre-compute all up to max limit |
| **Reverse Collatz** | Find number that appears in most sequences | Build reverse graph of which numbers lead where |
| **Bounded sequence** | Stop if sequence exceeds threshold | Add early termination check |
| **Modified rule** | Different transformation (e.g., 5n+1) | Same structure, different calculation |

**Multiple queries variation:**
```python
# If you need to answer many queries efficiently
def precompute_lengths(max_limit):
    memo = {1: 1}

    for n in range(2, max_limit + 1):
        original = n
        steps = 0

        # Follow sequence until cached value
        while n not in memo:
            if n % 2 == 0:
                n = n // 2
            else:
                n = 3 * n + 1
            steps += 1

        memo[original] = steps + memo[n]

    return memo

# Now all queries are O(1)
memo = precompute_lengths(1000000)
answer = max(range(1, limit + 1), key=lambda x: memo[x])
```

---

## Visual Walkthrough

```
Computing for limit = 10:

n=1: 1 (length: 1) ✓
n=2: 2→1 (length: 2) ✓
n=3: 3→10→5→16→8→4→2→1 (length: 8) ✓
n=4: 4→2→1 (length: 3) [used cached length from 2]
n=5: 5→16→8→4→2→1 (length: 6) [used cached length from 16]
n=6: 6→3→... (length: 9) [used cached length from 3]
n=7: 7→22→11→34→17→52→26→13→40→20→10→5→... (length: 17)
n=8: 8→4→... (length: 4) [used cached length from 4]
n=9: 9→28→14→7→... (length: 20) [used cached length from 7]
n=10: 10→5→... (length: 7) [used cached length from 5]

Maximum length: 20 (starting number: 9)

Memo cache after computation:
{1:1, 2:2, 3:8, 4:3, 5:6, 6:9, 7:17, 8:4, 9:20, 10:7,
 16:5, 22:16, 13:10, 40:9, 20:8, ... many more intermediate values}
```

---

## Practice Checklist

**Understanding:**
- [ ] Can explain why memoization helps
- [ ] Understand when to cache vs when not to
- [ ] Can calculate a sequence by hand
- [ ] Know the difference between sequence length and max value

**Implementation:**
- [ ] Handles base case (n = 1) correctly
- [ ] Caches intermediate values, not just starting numbers
- [ ] Uses iterative approach to avoid stack overflow
- [ ] Correctly counts sequence length (including or excluding starting number consistently)
- [ ] Handles even/odd cases correctly

**Optimization:**
- [ ] Memoization reduces time from O(n*L) to ~O(n)
- [ ] Memory usage is acceptable for problem constraints
- [ ] Can explain space-time tradeoff

**Interview Readiness:**
- [ ] Can code solution in 15 minutes
- [ ] Can explain memoization benefits clearly
- [ ] Can discuss when memoization is appropriate
- [ ] Can handle follow-up variations

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve with memoization
- [ ] Day 3: Solve without looking at notes
- [ ] Day 7: Implement iterative version
- [ ] Day 14: Optimize for multiple queries
- [ ] Day 30: Explain pattern to someone else

---

**Strategy Reference:** See [Dynamic Programming](../../strategies/patterns/dynamic-programming.md) and [Memoization Patterns](../../strategies/patterns/dynamic-programming.md#memoization)
