---
id: E142
old_id: I197
slug: random-pick-index
title: Random Pick Index
difficulty: easy
category: easy
topics: ["array", "hash-table", "reservoir-sampling"]
patterns: ["reservoir-sampling", "randomization"]
estimated_time_minutes: 15
frequency: medium
related_problems:
  - M382
  - M528
  - M710
prerequisites:
  - hash-table basics
  - reservoir sampling algorithm
  - random number generation
strategy_ref: ../strategies/patterns/reservoir-sampling.md
---
# Random Pick Index

## Problem

Design a data structure that can randomly select an index from an integer array where duplicates may exist. The key constraint is maintaining **uniform random distribution** - when multiple indices contain the target value, each valid index must have exactly equal probability of being selected.

Implement a `Solution` class with two methods:

1. **`Solution(int[] nums)`** - Constructor that receives and stores the integer array `nums`
2. **`int pick(int target)`** - Returns a randomly chosen index `i` where `nums[i] == target`. When multiple indices match, each must have probability `1/count` of being selected.

**Example scenario:** If `nums = [1,2,3,3,3]` and you call `pick(3)`, the method should return index 2, 3, or 4, with each having exactly 1/3 probability (33.33%). Calling `pick(3)` multiple times should produce different indices roughly equal numbers of times.

You may assume that `target` is guaranteed to exist in the array (at least one index contains it). The challenge lies in choosing between two fundamentally different approaches: preprocessing with extra space versus computing on-demand with minimal space.

**Performance consideration:** The constraints allow up to 10,000 calls to `pick()`, so efficiency matters for repeated queries.

## Why This Matters

Random sampling with uniform distribution is fundamental to randomized algorithms, statistics, gaming systems (loot drops, matchmaking), A/B testing, machine learning (dataset sampling), load balancing, and shuffle algorithms. This problem teaches reservoir sampling, an elegant technique for selecting random items from a stream where you don't know the total count in advance.

The reservoir sampling algorithm demonstrates a beautiful mathematical property: by selecting each new candidate with probability `1/count`, the final probability for any element being chosen is exactly `1/total_count`. This probabilistic reasoning appears in streaming algorithms, online algorithms, and scenarios where memory is limited but you need fair randomness.

Understanding the trade-off between preprocessing (O(n) space for instant queries) versus on-demand computation (O(n) time per query with O(1) space) is a classic system design consideration that appears in caching, indexing, and data structure design.

## Constraints

- 1 <= nums.length <= 2 * 10⁴
- -2³¹ <= nums[i] <= 2³¹ - 1
- target is an integer from nums.
- At most 10⁴ calls will be made to pick.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Tier 1 Hint - Core Concept
Two main approaches exist: (1) Preprocess: build a hash map where each value maps to a list of its indices. On `pick(target)`, randomly select from that list. (2) Reservoir sampling: iterate through the array on each pick call, using the reservoir sampling algorithm to select one index uniformly at random without storing all indices.

### Tier 2 Hint - Implementation Details
**Approach 1 (Hash Map):** In constructor, iterate through `nums` and build `indices = {value: [index1, index2, ...]}`. On `pick(target)`, use `random.choice(indices[target])` or equivalent. Time: O(n) init, O(1) pick. Space: O(n).

**Approach 2 (Reservoir Sampling):** On each `pick(target)`, iterate through array. Keep a counter `count` and current result `res`. When you encounter `target` at index `i`, increment `count` and set `res = i` with probability `1/count` (i.e., `random.randint(1, count) == 1`). This ensures uniform distribution. Time: O(n) per pick. Space: O(1).

### Tier 3 Hint - Optimization Strategy
Choose based on trade-offs: hash map preprocessing is better for multiple picks (amortized), while reservoir sampling uses less space. For reservoir sampling: `count = 0; res = -1; for i, num in enumerate(nums): if num == target: count++; if random.randint(0, count-1) == 0: res = i`. The probability math: first occurrence selected with prob 1, second with 1/2, third with 1/3, etc. Final probability for each index is 1/total_count.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Hash Map Preprocessing | O(n) init, O(1) pick | O(n) | Store all indices in map |
| Reservoir Sampling | O(1) init, O(n) pick | O(1) | No extra storage needed |
| Linear Scan + List | O(n) init, O(n) pick | O(n) | Collect indices each time (inefficient) |
| Sorted Index Map | O(n log n) init, O(1) pick | O(n) | Unnecessary sorting overhead |

## Common Mistakes

### Mistake 1: Non-uniform random selection
```python
# Wrong - not uniformly random
class Solution:
    def __init__(self, nums):
        self.nums = nums

    def pick(self, target):
        indices = []
        for i, num in enumerate(self.nums):
            if num == target:
                indices.append(i)
                # WRONG: return immediately with 1/len(indices) probability
                if random.random() < 0.5:
                    return i
        return indices[-1]  # Not uniform!
```

**Why it's wrong:** Early indices have unfair advantage. Must collect all or use proper reservoir sampling.

**Fix:** Collect all indices then random select, or use correct reservoir sampling formula.

### Mistake 2: Incorrect reservoir sampling probability
```python
# Wrong - incorrect probability calculation
class Solution:
    def __init__(self, nums):
        self.nums = nums

    def pick(self, target):
        res = -1
        count = 0
        for i, num in enumerate(self.nums):
            if num == target:
                count += 1
                # WRONG: should be 1/count probability
                if random.randint(0, 1) == 0:
                    res = i
        return res
```

**Why it's wrong:** Using fixed 0.5 probability doesn't give uniform distribution. Should be `random.randint(0, count-1) == 0` for 1/count probability.

**Fix:** Use correct formula: `random.randint(1, count) == 1` or `random.randint(0, count-1) == 0`.

### Mistake 3: Modifying the input array
```python
# Wrong - modifies input
class Solution:
    def __init__(self, nums):
        self.nums = nums
        self.nums.sort()  # WRONG - modifies input

    def pick(self, target):
        # Binary search logic...
        pass
```

**Why it's wrong:** Sorting destroys original index positions. We need original indices.

**Fix:** Don't modify input; use hash map if preprocessing needed.

## Variations

| Variation | Difference | Difficulty Δ |
|-----------|-----------|-------------|
| Pick K random indices | Select K indices instead of 1 | +1 |
| Weighted random pick | Each index has different weight | +1 |
| Pick from range | Select random index in value range | 0 |
| Stream random sampling | Process streaming data | +1 |
| Pick without replacement | No repeated picks until all exhausted | +1 |
| Blacklist indices | Avoid certain indices | +1 |

## Practice Checklist

Track your progress on this problem:

- [ ] Solved using hash map preprocessing
- [ ] Implemented reservoir sampling version
- [ ] Proved uniform distribution property on paper
- [ ] After 1 day: Re-solved from memory
- [ ] After 1 week: Solved both approaches in < 15 minutes
- [ ] Explained reservoir sampling probability to someone

**Strategy**: See [Reservoir Sampling Pattern](../strategies/patterns/reservoir-sampling.md)
