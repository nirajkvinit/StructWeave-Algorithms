---
id: H029
old_id: F149
slug: max-points-on-a-line
title: Max Points on a Line
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# Max Points on a Line

## Problem

Find the maximum number of points that lie on the same straight line.

**Diagram:**

Example 1: Points on a coordinate plane
```
Input: points = [[1,1],[2,2],[3,3]]
Visual representation:
  (3,3) *
       /
  (2,2) *
       /
  (1,1) *
All 3 points lie on the same line.
Output: 3
```

Example 2: Points with some collinear
```
Input: points = [[1,1],[3,2],[5,3],[4,1],[2,3],[1,4]]
Visual representation:
  (1,4) *
  (2,3) *
  (4,1) *   (5,3) *
  (1,1) *   (3,2) *
Maximum points on any single line: 4
Output: 4
```


## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Constraints

- 1 <= points.length <= 300
- points[i].length == 2
- -10⁴ <= xi, yi <= 10⁴
- All the points are **unique**.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
For each point, calculate the slope to every other point. Points with the same slope from a reference point lie on the same line. Use a hash map to count points for each unique slope. Handle vertical lines (infinite slope) and duplicate points as special cases.
</details>

<details>
<summary>🎯 Main Approach</summary>
For each point as an anchor, create a hash map where keys are slopes (as fractions reduced to lowest terms) and values are counts of points with that slope. The maximum count for any anchor point (plus the anchor itself) is a candidate answer. Handle duplicates by counting them separately and adding to all slopes for that anchor.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use GCD to reduce slopes to lowest terms (e.g., 2/4 becomes 1/2) to avoid floating point precision errors. Store slopes as tuples (dy/gcd, dx/gcd) rather than decimals. Handle vertical lines explicitly as a special key like (1, 0).
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (check all triplets) | O(n³) | O(1) | Check every combination of 3 points |
| Optimal (slope counting) | O(n²) | O(n) | For each point, hash slopes to all others |

## Common Mistakes

1. **Using floating point for slopes**
   ```python
   # Wrong: Floating point precision issues
   slope = (y2 - y1) / (x2 - x1)  # 0.333... vs 0.33333334
   slope_map[slope] = slope_map.get(slope, 0) + 1

   # Correct: Use reduced fractions
   dx, dy = x2 - x1, y2 - y1
   g = gcd(dx, dy)
   slope = (dy // g, dx // g)
   slope_map[slope] = slope_map.get(slope, 0) + 1
   ```

2. **Not handling vertical lines**
   ```python
   # Wrong: Division by zero
   slope = (y2 - y1) / (x2 - x1)  # Crashes when x2 == x1

   # Correct: Special case for vertical lines
   if x2 == x1:
       slope = ('inf', 0)  # Or any special marker
   else:
       slope = calculate_slope(x1, y1, x2, y2)
   ```

3. **Not normalizing slope signs**
   ```python
   # Wrong: (2, -4) and (-2, 4) represent same slope but different keys
   slope = (dy, dx)

   # Correct: Normalize sign (ensure denominator is positive)
   g = gcd(abs(dx), abs(dy))
   slope = (dy // g, dx // g)
   if dx < 0:  # Make sure dx is positive
       slope = (-slope[0], -slope[1])
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Line Reflection | Medium | Check if points are symmetric about a line |
| Valid Boomerang | Easy | Check if 3 points are collinear (not on same line) |
| Minimum Number of Lines to Cover All Points | Hard | Find minimum lines to cover all points |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Hash Map Patterns](../../strategies/data-structures/hash-tables.md)
