---
id: M319
old_id: A134
slug: beautiful-arrangement-ii
title: Beautiful Arrangement II
difficulty: medium
category: medium
topics: []
patterns: ["backtrack-permutation"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M042", "M046", "E001"]
prerequisites: ["array-manipulation", "pattern-construction", "greedy-algorithms"]
---
# Beautiful Arrangement II

## Problem

Construct an array of `n` distinct integers from 1 to `n` such that the absolute differences between consecutive elements produce exactly `k` distinct values.

Given integers `n` and `k`, create an arrangement `[a₁, a₂, ..., aₙ]` where computing the consecutive differences `[|a₁ - a₂|, |a₂ - a₃|, ..., |aₙ₋₁ - aₙ|]` yields exactly `k` unique values. For example, with `n=5` and `k=2`, the array `[1,3,2,4,5]` produces differences `[2,1,2,1]`, which contains 2 distinct values: {1, 2}.

The key insight is understanding how to maximize unique differences. The arrangement `[1, n, 2, n-1, 3, n-2, ...]` that alternates between minimum and maximum values creates differences of `[n-1, n-2, n-3, ...]`, giving you the maximum possible distinct differences. To get exactly `k` unique differences, you alternate for `k+1` elements (producing `k` gaps), then append the remaining numbers in sorted order.

For instance, with `n=6, k=3`: start with `[1,6,2,5]` (creating differences 5, 4, 3), then append the remaining sorted values `[3,4]` which add only difference 1 (already potentially counted or new). The challenge is determining the correct number of alternations and how to arrange remaining elements.

Return any valid arrangement satisfying the constraint.

## Why This Matters

This problem teaches constructive algorithms where you build solutions incrementally using pattern recognition, a technique crucial for generating test data, creating counterexamples, and designing protocols with specific properties. The alternating pattern appears in signal processing where you might want waveforms with controlled frequency components. Database test data generators use similar logic to create datasets with specific statistical properties for benchmark testing. The problem demonstrates how greedy construction with mathematical insight can replace expensive backtracking. Understanding the relationship between element positions and difference patterns builds intuition for encoding information in sequences, a concept used in error-correcting codes and data compression. This constructive approach is valuable for interview problems where you must produce output with constrained properties rather than simply validate or search.

## Examples

**Example 1:**
- Input: `n = 3, k = 1`
- Output: `[1,2,3]
Explanation: This arrangement uses integers 1, 2, 3, and the consecutive differences are [1,1], which contains exactly 1 unique value.`

**Example 2:**
- Input: `n = 3, k = 2`
- Output: `[1,3,2]
Explanation: This arrangement uses integers 1, 2, 3, and the consecutive differences are [2,1], which contains exactly 2 unique values.`

## Constraints

- 1 <= k < n <= 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Understand the Difference Pattern</summary>

The key insight is that alternating between minimum and maximum values creates the maximum number of unique differences. For example, `[1, n, 2, n-1, 3, n-2, ...]` creates differences of `[n-1, n-2, n-3, n-4, ...]`.

If you alternate `k` times, you'll get `k` unique differences. The remaining numbers can be placed in ascending order (creating difference of 1).

</details>

<details>
<summary>Hint 2: Build the Pattern Greedily</summary>

Start with two pointers: `low = 1` and `high = n`. To create `k` unique differences:
1. Alternate between `low` and `high` for `k+1` elements
2. This creates `k` unique differences
3. Append the remaining numbers in sorted order (all create difference of 1, which is already counted)

Example: `n=5, k=3` → `[1,5,2,4,3]` → differences `[4,3,2,1]` → 3 unique when we stop

</details>

<details>
<summary>Hint 3: Optimize with Pattern Recognition</summary>

```python
def constructArray(n, k):
    result = []
    low, high = 1, n

    # Create k unique differences by alternating
    for i in range(k):
        if i % 2 == 0:
            result.append(low)
            low += 1
        else:
            result.append(high)
            high -= 1

    # Fill remaining with sorted sequence
    # This adds only 1 more unique difference
    for num in range(high, low - 1, -1 if k % 2 == 0 else 1):
        result.append(num)

    return result
```

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Greedy Construction | O(n) | O(1) | Excluding output array; single pass construction |
| Backtracking | O(n!) | O(n) | Explores all permutations; impractical for large n |
| Pattern with Two Pointers | O(n) | O(1) | Optimal approach; builds result directly |

## Common Mistakes

**Mistake 1: Overcomplicating with Full Alternation**
```python
# Wrong: Alternating all n elements
result = []
low, high = 1, n
for i in range(n):
    if i % 2 == 0:
        result.append(low)
        low += 1
    else:
        result.append(high)
        high -= 1
# This creates n-1 unique differences, not k

# Correct: Only alternate k+1 times
for i in range(k + 1):
    # alternate...
# Then fill rest in order
```

**Mistake 2: Incorrect Remaining Elements Order**
```python
# Wrong: Not accounting for parity of k
for num in range(low, high + 1):
    result.append(num)

# Correct: Direction depends on whether k is even/odd
if k % 2 == 0:
    result.extend(range(high, low - 1, -1))
else:
    result.extend(range(low, high + 1))
```

**Mistake 3: Off-by-One in Alternation Count**
```python
# Wrong: Alternating k times gives k-1 unique diffs
for i in range(k):
    # alternate...

# Correct: Need k+1 elements to get k differences
for i in range(k + 1):
    # alternate...
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Find lexicographically smallest arrangement | Medium | Add ordering constraint |
| Count all valid arrangements | Hard | Combinatorics problem |
| Create exactly k differences (not unique) | Easy | Remove uniqueness constraint |
| Maximize sum of differences | Medium | Different optimization goal |
| Fixed first/last element | Medium | Additional positional constraints |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Analyzed time/space complexity
- [ ] Solved without hints
- [ ] Tested edge cases (k=1, k=n-1, small n)
- [ ] Reviewed alternative approaches
- [ ] Practiced again after 1 day
- [ ] Practiced again after 1 week
- [ ] Could explain solution to others
