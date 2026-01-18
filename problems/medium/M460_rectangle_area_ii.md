---
id: M460
old_id: A317
slug: rectangle-area-ii
title: Rectangle Area II
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Rectangle Area II

## Problem

Imagine you're looking at several rectangles drawn on graph paper, some of which overlap. Your task is to calculate the total area covered by paint if you painted all these rectangles - counting each square of graph paper only once, even if multiple rectangles cover it.

Each rectangle is given as four coordinates: `[x1, y1, x2, y2]` where (x1, y1) is the bottom-left corner and (x2, y2) is the top-right corner. All rectangles are aligned with the coordinate axes (no rotation).

For example, if you have rectangles [[0,0,2,2], [1,0,2,3], [1,0,3,1]], some parts are covered by multiple rectangles, but you only count each unit of area once. The total unique area covered is 6.

The coordinates can be very large (up to 10^9), so return your answer modulo 10^9 + 7.

## Why This Matters

Rectangle union area calculation is fundamental to computational geometry with applications across many fields. In graphics rendering and UI design, you calculate visible areas when windows overlap. In Geographic Information Systems (GIS), you might compute land coverage when property boundaries overlap. In VLSI chip design, you calculate total silicon area used by overlapping circuit components. Database query optimization uses similar techniques for index range overlap analysis. The coordinate compression technique you'll learn is essential for handling large coordinate spaces efficiently - it appears in sparse matrix operations, event scheduling with large time ranges, and memory management systems. This same algorithmic pattern is used in calculating building skylines, shadow coverage in solar panel placement, and radar coverage area optimization.

## Examples

**Example 1:**
- Input: `rectangles = [[0,0,1000000000,1000000000]]`
- Output: `49`
- Explanation: A single massive rectangle has area 10¹⁸, which equals 49 when taken modulo (10⁹ + 7).

## Constraints

- 1 <= rectangles.length <= 200
- rectanges[i].length == 4
- 0 <= xi₁, yi₁, xi₂, yi₂ <= 10⁹
- xi₁ <= xi₂
- yi₁ <= yi₂

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
The challenge is handling overlapping rectangles efficiently. A key technique is coordinate compression: collect all unique x and y coordinates from all rectangles, then divide the plane into a grid using these coordinates. Each grid cell is either completely covered or not covered, making the calculation straightforward.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use coordinate compression: extract all unique x-coordinates and y-coordinates from the rectangles, sort them. This creates a grid of cells. For each cell, check if it's covered by any rectangle. If covered, add its area to the total. The grid has at most O(n) × O(n) cells where n is the number of rectangles.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Instead of checking every rectangle for every cell, use a sweep line algorithm: sort events by x-coordinate, maintain active y-intervals as you sweep. This reduces redundant checks. Remember to apply modulo 10^9 + 7 to the final result. For large coordinates, be careful with integer overflow during multiplication.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n^2 × A) | O(A) | Mark each unit square in coordinate space - impractical for large coordinates |
| Coordinate Compression | O(n^3) | O(n^2) | Check each of O(n^2) cells against all rectangles |
| Sweep Line | O(n^2 log n) | O(n) | More efficient with sorted events and interval merging |

## Common Mistakes

1. **Not handling coordinate compression properly**
   ```python
   # Wrong: Using raw coordinates creates huge grid
   for x in range(0, max_x):
       for y in range(0, max_y):  # Can be up to 10^9!
           # Check if covered

   # Correct: Use only unique coordinates
   x_coords = sorted(set(x for rect in rectangles for x in [rect[0], rect[2]]))
   y_coords = sorted(set(y for rect in rectangles for y in [rect[1], rect[3]]))
   for i in range(len(x_coords) - 1):
       for j in range(len(y_coords) - 1):
           # Check cell (x_coords[i], y_coords[j])
   ```

2. **Forgetting modulo operation**
   ```python
   # Wrong: Can cause integer overflow
   area = width * height
   total += area
   return total

   # Correct: Apply modulo at each step
   MOD = 10**9 + 7
   area = (width * height) % MOD
   total = (total + area) % MOD
   return total % MOD
   ```

3. **Double-counting overlapping regions**
   ```python
   # Wrong: Simply summing all rectangle areas
   total = sum((x2 - x1) * (y2 - y1) for x1, y1, x2, y2 in rectangles)

   # Correct: Use grid approach to count each cell once
   for i in range(len(x_coords) - 1):
       for j in range(len(y_coords) - 1):
           if is_covered(x_coords[i], y_coords[j]):
               total += (x_coords[i+1] - x_coords[i]) * (y_coords[j+1] - y_coords[j])
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Rectangle Area (2 rectangles) | Medium | Simpler - calculate overlap area and subtract |
| Perfect Rectangle | Hard | Check if rectangles form perfect cover without gaps/overlaps |
| Skyline Problem | Hard | 1D version with heights, uses sweep line |
| Count Square Submatrices | Medium | DP on grid for counting, not area calculation |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Sweep Line Algorithm](../../strategies/patterns/sweep-line.md)
