---
id: M239
old_id: A026
slug: random-pick-with-weight
title: Random Pick with Weight
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
frequency: medium
related_problems:
  - id: E001
    title: Two Sum
    difficulty: easy
  - id: M001
    title: Add Two Numbers
    difficulty: medium
prerequisites:
  - Prefix sums
  - Binary search
  - Random number generation
---
# Random Pick with Weight

## Problem

Design a data structure that picks a random index with probability proportional to weights. Given an array `w` where `w[i]` is the weight for index `i`, implement `pickIndex()` such that the probability of returning index `i` is `w[i] / sum(w)`.

For example, with weights `[1, 3]`, you should return index 0 with 25% probability (1 out of 4 total weight) and index 1 with 75% probability (3 out of 4 total weight). If called 1000 times, index 0 should appear roughly 250 times and index 1 roughly 750 times.

The naive approach of creating an array with repeated indices (one copy of index 0, three copies of index 1) works for small weights but fails when weights are large. With `w = [1, 100000]`, you'd need an array of 100,001 elements just to store the distribution, which wastes massive space.

The elegant solution maps weights to ranges on a number line. Think of placing weights end-to-end: index 0 occupies range `[0, 1)`, index 1 occupies range `[1, 4)`, total range is `[0, 4)`. Generate a random number in `[0, 4)` and find which range it falls into. A random value of 0.5 lands in index 0's range, while 2.7 lands in index 1's range.

To implement this efficiently, build a prefix sum array where `prefix[i]` is the sum of all weights up to index `i`. For `w = [1, 3]`, the prefix array is `[1, 4]`. Generate a random number `rand` in `[0, total_sum)`, then use binary search to find the smallest index where `prefix[index] > rand`. This gives you O(log n) time per pick instead of O(n) with linear search.

## Why This Matters

Weighted random sampling is fundamental to many real-world systems: recommendation algorithms (showing items proportional to relevance scores), load balancing (distributing requests based on server capacity), Monte Carlo simulations (sampling according to probability distributions), and genetic algorithms (selecting candidates based on fitness). The prefix sum plus binary search pattern appears in "Random Pick with Blacklist," "Random Point in Non-overlapping Rectangles," and various range query problems. This problem also demonstrates a classic space-time tradeoff: spending O(n) space on preprocessing (prefix sums) to achieve O(log n) query time instead of O(n). Understanding this pattern is essential for building scalable systems that need efficient probabilistic selection.

## Constraints

- 1 <= w.length <= 10⁴
- 1 <= w[i] <= 10⁵
- pickIndex will be called at most 10⁴ times.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Converting weights to ranges</summary>

Think of the weight array as defining consecutive ranges on a number line. For `w = [1, 3, 2]`:
- Index 0 covers range [0, 1) - length 1
- Index 1 covers range [1, 4) - length 3
- Index 2 covers range [4, 6) - length 2

If you pick a random number from [0, 6), the probability of landing in each range matches the weight distribution.

</details>

<details>
<summary>Hint 2: Using prefix sums for range lookup</summary>

Build a prefix sum array to define the range boundaries:
- `prefix = [1, 4, 6]` for weights `[1, 3, 2]`

Generate a random number `rand` from [0, total_sum), then find the smallest index where `prefix[index] > rand`. This is the weighted random selection.

</details>

<details>
<summary>Hint 3: Binary search for efficiency</summary>

Instead of linear scanning through the prefix array, use binary search to find the insertion point. This reduces pickIndex() from O(n) to O(log n).

Implementation: Use Python's `bisect_right()` or implement custom binary search to find the first element greater than the random number.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Prefix sum + Linear search | Init: O(n), Pick: O(n) | O(n) | Simple but inefficient for large arrays |
| Prefix sum + Binary search | Init: O(n), Pick: O(log n) | O(n) | Optimal solution; fast repeated picks |
| Alias method | Init: O(n), Pick: O(1) | O(n) | Complex setup, constant-time sampling |

## Common Mistakes

1. Off-by-one errors in range boundaries

```python
# Wrong: Using closed interval [0, total]
rand = random.randint(0, total_sum)  # Includes total_sum
# This creates bias - total_sum maps to invalid index

# Correct: Use half-open interval [0, total)
rand = random.randint(0, total_sum - 1)  # Or random.random() * total_sum
```

2. Not building prefix sums correctly

```python
# Wrong: Overwriting the original array
def __init__(self, w):
    for i in range(1, len(w)):
        w[i] += w[i-1]  # Modifies input
    self.prefix = w

# Correct: Create separate prefix array
def __init__(self, w):
    self.prefix = []
    total = 0
    for weight in w:
        total += weight
        self.prefix.append(total)
```

3. Incorrect binary search logic

```python
# Wrong: Looking for exact match
def pickIndex(self):
    rand = random.random() * self.prefix[-1]
    # May not find exact match
    return self.prefix.index(rand)

# Correct: Find insertion point (first element > rand)
import bisect
def pickIndex(self):
    rand = random.random() * self.prefix[-1]
    return bisect.bisect_right(self.prefix, rand)
```

## Variations

| Variation | Difference | Strategy |
|-----------|-----------|----------|
| Dynamic weight updates | Weights can change after initialization | Use segment tree or Fenwick tree for O(log n) updates |
| Pick k distinct indices | Return k weighted samples without replacement | Use reservoir sampling with weights |
| Negative weights allowed | Some weights can be negative | Add offset to make all weights positive |
| 2D weighted sampling | Pick from 2D grid with weights | Flatten to 1D or use 2D prefix sums |

## Practice Checklist

- [ ] Implement prefix sum + linear search solution (15 min)
- [ ] Optimize with binary search (15 min)
- [ ] Test with edge cases (single element, all equal weights)
- [ ] Review after 1 day - implement from memory
- [ ] Review after 1 week - analyze probability distribution
- [ ] Review after 1 month - implement alias method

**Strategy**: Prefix sums with binary search for efficient weighted random sampling
