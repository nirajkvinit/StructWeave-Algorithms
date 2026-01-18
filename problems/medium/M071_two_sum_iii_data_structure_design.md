---
id: M071
old_id: F170
slug: two-sum-iii-data-structure-design
title: Two Sum III - Data structure design
difficulty: medium
category: medium
topics: ["hash-table", "design", "array"]
patterns: ["complement-search"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E001", "M068", "M072"]
prerequisites: ["hash-map", "data-structure-design", "two-sum"]
strategy_ref: ../strategies/patterns/hash-map.md
---
# Two Sum III - Data structure design

## Problem

Design a data structure that efficiently supports two operations: adding numbers to an internal collection, and checking whether any two numbers in the collection sum to a target value. Think of this as building a specialized container where you continuously add numbers over time, and occasionally need to query whether a pair exists that adds up to a specific target. The challenge lies in balancing the performance of these two operations - should you optimize for fast additions or fast lookups? Consider edge cases like duplicate numbers (what if the same number appears multiple times?) and how to handle queries before any numbers are added. This is an API design problem where you're building the underlying implementation rather than just using existing data structures.

## Why This Matters

This problem directly models real-world caching and query optimization scenarios. Payment processing systems use similar structures to detect fraudulent transaction pairs that sum to known suspicious amounts. Social network analytics platforms maintain running collections of user interaction scores and frequently query for pairs matching certain thresholds. Database query optimizers employ this pattern when building hash join indices that need to support both insertions and lookups efficiently. The trade-off analysis between optimizing add() versus find() operations mirrors fundamental decisions in system design - whether to pay the cost upfront during writes or defer it to read time. Understanding this balance helps you design better APIs and choose appropriate data structures for streaming data scenarios where elements arrive continuously and queries happen intermittently.

## Constraints

- -10⁵ <= number <= 10⁵
- -2³¹ <= value <= 2³¹ - 1
- At most 10⁴ calls will be made to add and find.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Trade-off Analysis</summary>

You need to design a data structure with two operations: add(number) and find(value). Consider the trade-off: should you optimize add() or find()? What data structure allows fast lookups? What about handling duplicates?

</details>

<details>
<summary>🎯 Hint 2: Hash Map with Frequency Count</summary>

Use a hash map to store numbers and their frequencies. This allows O(1) add operations. For find(value), iterate through the hash map and check if (value - number) exists. Be careful with the edge case where number + number = value (need frequency >= 2).

</details>

<details>
<summary>📝 Hint 3: Implementation Details</summary>

Design:
```
class TwoSum:
    def __init__():
        self.nums = {}  # number → frequency

    def add(number):
        self.nums[number] = self.nums.get(number, 0) + 1

    def find(value):
        for num in self.nums:
            complement = value - num
            if complement exists in self.nums:
                if complement != num OR frequency >= 2:
                    return true
        return false
```

Time: add O(1), find O(n)
Space: O(n)

Alternative: Pre-compute all possible sums during add (slower add, faster find).

</details>

## Complexity Analysis

| Approach | Time (add/find) | Space | Notes |
|----------|-----------------|-------|-------|
| List Storage | O(1) / O(n²) | O(n) | Brute force: check all pairs |
| **Hash Map (Frequency)** | **O(1) / O(n)** | **O(n)** | Optimal for frequent adds |
| Pre-compute Sums | O(n) / O(1) | O(n²) | Optimal for frequent finds |
| Sorted List + Two Pointers | O(n log n) / O(n) | O(n) | Requires sorting on find |

## Common Mistakes

### 1. Not Handling Duplicates

```python
# WRONG: Fails when value = 2 * number
def find(value):
    for num in self.nums:
        if (value - num) in self.nums:
            return True  # Wrong if num appears once

# CORRECT: Check frequency
def find(value):
    for num in self.nums:
        complement = value - num
        if complement in self.nums:
            if complement != num or self.nums[num] >= 2:
                return True
```

### 2. Using Set Instead of Map

```python
# WRONG: Can't track frequency
class TwoSum:
    def __init__(self):
        self.nums = set()  # Loses duplicate info

# CORRECT: Use frequency map
class TwoSum:
    def __init__(self):
        self.nums = {}  # number → count
```

### 3. Inefficient Pre-computation

```python
# WRONG: Recomputes all sums on every add
class TwoSum:
    def __init__(self):
        self.nums = []
        self.sums = set()

    def add(self, num):
        self.nums.append(num)
        self.sums = {a + b for i, a in enumerate(self.nums)
                            for b in self.nums[i:]}  # O(n²) every add!

# CORRECT: Incremental sum computation
class TwoSum:
    def add(self, num):
        for existing in self.nums:
            self.sums.add(num + existing)
        self.nums.add(num)
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Three Sum | Find three numbers summing to value | Use hash map + two pointers |
| K Sum | Find k numbers summing to value | Generalize with recursion/DP |
| Remove Operation | Support remove(number) | Decrement frequency, remove if 0 |
| Range Sum Query | Find if any sum in [low, high] | Store sorted list or use BST |

## Practice Checklist

- [ ] Handles empty/edge cases (no numbers, single number, duplicates)
- [ ] Can explain approach in 2 min (hash map with frequency counting)
- [ ] Can code solution in 15 min
- [ ] Can discuss time/space complexity and trade-offs
- [ ] Handles duplicate numbers correctly

**Spaced Repetition:** Day 1 → 3 → 7 → 14 → 30

---

**Strategy**: See [Hash Map Pattern](../../strategies/patterns/hash-map.md)
