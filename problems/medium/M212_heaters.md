---
id: M212
old_id: I274
slug: heaters
title: Heaters
difficulty: medium
category: medium
topics: ["array", "binary-search", "two-pointers"]
patterns: ["greedy"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E1539", "M875", "M1818"]
prerequisites: ["binary-search", "sorting", "greedy-algorithms"]
---
# Heaters

## Problem

Imagine houses and heaters positioned along a single horizontal line, each at specific integer coordinates. Every heater can project warmth in both directions with a given radius - for example, a heater at position 5 with radius 3 can warm any house between positions 2 and 8 (inclusive).

You're given two arrays: `houses` containing the positions of all houses, and `heaters` containing the positions of all heaters. Your goal is to find the minimum radius value such that if every heater uses this same radius, all houses will be warmed. A house is considered warmed if it falls within at least one heater's range.

The key insight is that you need to satisfy the "worst-case" house - the one farthest from its nearest heater. Think of it this way: for each house, find its closest heater. Some houses will be very close to heaters, others farther away. The house with the maximum distance to its nearest heater determines the minimum radius needed for full coverage.

Note that all heaters must use the same radius value, and positions can range up to 10^9, so an efficient solution is essential.

## Why This Matters

This problem models real-world optimization scenarios like placing cell towers to cover all customers, positioning fire hydrants to serve all buildings, or locating emergency services to meet response time requirements. It combines greedy thinking with binary search techniques - you're essentially finding the minimum value (radius) that satisfies all constraints (houses warmed). The efficient solution demonstrates how sorting and binary search can reduce brute-force O(n × m) approaches to O(n log m), a pattern that appears in range queries, nearest-neighbor problems, and coverage optimization across many domains.

## Examples

**Example 1:**
- Input: `houses = [1,2,3], heaters = [2]`
- Output: `1`
- Explanation: With the heater at position 2 and radius 1, all houses are covered.

**Example 2:**
- Input: `houses = [1,2,3,4], heaters = [1,4]`
- Output: `1`
- Explanation: Heaters at positions 1 and 4 with radius 1 can cover all houses.

**Example 3:**
- Input: `houses = [1,5], heaters = [2]`
- Output: `3`

## Constraints

- 1 <= houses.length, heaters.length <= 3 * 10⁴
- 1 <= houses[i], heaters[i] <= 10⁹

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Minimum of Maximums</summary>

The answer is the minimum radius needed, which equals the maximum distance any house needs to reach its nearest heater. For each house, find the closest heater, then take the maximum of all these minimum distances. This greedy approach works because each house must be covered, and we need the smallest radius that covers the "worst case" house.

</details>

<details>
<summary>🎯 Hint 2: Binary Search for Nearest Heater</summary>

Sort both arrays first. For each house, use binary search to find the closest heater. Check both the heater at or just before the house position and the heater just after. The minimum of these two distances is the radius needed for that house. Track the maximum across all houses.

</details>

<details>
<summary>📝 Hint 3: Two Pointers Alternative</summary>

```
def find_radius(houses, heaters):
    houses.sort()
    heaters.sort()

    max_radius = 0
    heater_idx = 0

    for house in houses:
        # Move heater pointer to find closest heater
        while (heater_idx < len(heaters) - 1 and
               abs(heaters[heater_idx + 1] - house) <=
               abs(heaters[heater_idx] - house)):
            heater_idx += 1

        # Distance to closest heater
        radius = abs(heaters[heater_idx] - house)
        max_radius = max(max_radius, radius)

    return max_radius
```

Alternative using binary search:
```
from bisect import bisect_left

def find_radius(houses, heaters):
    heaters.sort()
    max_radius = 0

    for house in houses:
        pos = bisect_left(heaters, house)

        dist_left = float('inf') if pos == 0 else house - heaters[pos - 1]
        dist_right = float('inf') if pos == len(heaters) else heaters[pos] - house

        radius = min(dist_left, dist_right)
        max_radius = max(max_radius, radius)

    return max_radius
```

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force | O(n × m) | O(1) | Check each house against all heaters |
| Sort + Binary Search | O(n log n + m log m + n log m) | O(1) | Sort both, binary search for each house |
| Sort + Two Pointers | O(n log n + m log m + n + m) | O(1) | Optimal, single pass after sorting |

n = houses.length, m = heaters.length

## Common Mistakes

**Mistake 1: Not Sorting Input Arrays**

```python
# Wrong: Binary search requires sorted array
def find_radius(houses, heaters):
    max_radius = 0
    for house in houses:
        pos = bisect_left(heaters, house)  # Wrong if heaters not sorted!
        # ...
```

```python
# Correct: Sort first
def find_radius(houses, heaters):
    houses.sort()
    heaters.sort()
    max_radius = 0
    for house in houses:
        pos = bisect_left(heaters, house)
        # ...
```

**Mistake 2: Only Checking One Side**

```python
# Wrong: Only checks heater at or after house position
def find_radius(houses, heaters):
    heaters.sort()
    max_radius = 0
    for house in houses:
        pos = bisect_left(heaters, house)
        if pos < len(heaters):
            max_radius = max(max_radius, abs(heaters[pos] - house))
    return max_radius
```

```python
# Correct: Check both left and right heaters
def find_radius(houses, heaters):
    heaters.sort()
    max_radius = 0
    for house in houses:
        pos = bisect_left(heaters, house)

        left_dist = float('inf') if pos == 0 else house - heaters[pos - 1]
        right_dist = float('inf') if pos == len(heaters) else heaters[pos] - house

        max_radius = max(max_radius, min(left_dist, right_dist))
    return max_radius
```

**Mistake 3: Using Average Instead of Max**

```python
# Wrong: Using sum or average of distances
def find_radius(houses, heaters):
    total = 0
    for house in houses:
        # find closest heater distance
        total += distance
    return total // len(houses)  # Wrong! Need MAX not average
```

```python
# Correct: Use maximum distance
def find_radius(houses, heaters):
    max_radius = 0
    for house in houses:
        # find closest heater distance
        max_radius = max(max_radius, distance)
    return max_radius
```

## Variations

| Variation | Difference | Approach Change |
|-----------|-----------|-----------------|
| Different Heater Radii | Each heater has different max radius | Check if assignment possible, use greedy matching |
| 2D Grid | Houses and heaters on 2D plane | Use KD-tree or sweep line, Manhattan/Euclidean distance |
| Minimize Total Cost | Radius has cost, minimize sum | Dynamic programming or optimization |
| K Heaters to Place | Choose positions for K heaters | Binary search on radius + greedy placement |
| Weighted Houses | Some houses more important | Priority-based coverage |

## Practice Checklist

- [ ] First attempt (after reading problem)
- [ ] Reviewed solution
- [ ] Implemented without hints (Day 1)
- [ ] Solved again (Day 3)
- [ ] Solved again (Day 7)
- [ ] Solved again (Day 14)
- [ ] Attempted all variations above

**Strategy**: See [Binary Search](../strategies/patterns/binary-search.md) and [Two Pointers](../strategies/patterns/two-pointers.md)
