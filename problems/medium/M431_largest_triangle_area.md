---
id: M431
old_id: A279
slug: largest-triangle-area
title: Largest Triangle Area
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Largest Triangle Area

## Problem

Given an array of 2D coordinate points on a plane, find the largest area you can form by connecting any three of these points into a triangle.

Each point in the array `points` is represented as `[x, y]`, where both coordinates can be positive, negative, or zero. Your task is to examine all possible combinations of three distinct points and determine which triplet forms the triangle with the maximum area. The answer should be accurate to within `10⁻⁵` of the actual value.

The key challenge here is computing the area of a triangle given only three coordinate pairs. In geometry, there's an elegant formula called the Shoelace formula (or cross-product method) that calculates area directly from coordinates: `Area = |x₁(y₂-y₃) + x₂(y₃-y₁) + x₃(y₁-y₂)| / 2`. Note that we take the absolute value because the formula can produce negative results depending on the order of points.

With at most 50 points in the input, you can afford to check every possible combination of three points without worrying about performance. Some triplets will form large triangles, some will form tiny ones, and some might even be collinear (forming a line with zero area). Your solution needs to track the maximum area encountered across all possibilities.


**Diagram:**

```
Points on 2D plane forming triangles:

    y
    5│        • (4,5)
    4│    •(2,4)
    3│            • (6,3)
    2│  •(1,2)
    1│                • (7,1)
    0│    • (2,0)  • (5,0)
     └─────────────────────── x
      0  1  2  3  4  5  6  7

For any 3 points P1(x1,y1), P2(x2,y2), P3(x3,y3):

Triangle Area = |x1(y2-y3) + x2(y3-y1) + x3(y1-y2)| / 2

Example: Points (0,0), (2,0), (1,2)
         Form triangle with base=2, height=2
         Area = 2.0
```


## Why This Matters

Computational geometry problems appear frequently in computer graphics, game development, and geographic information systems. Whether you're calculating the coverage area of wireless sensors, determining collision boundaries in game physics, or analyzing spatial data in mapping applications, the ability to compute geometric properties from coordinates is essential. This problem specifically builds your skills in combinatorial enumeration (trying all possibilities systematically) and applying mathematical formulas in code. It's also a common interview question that tests whether you can recognize when brute force is acceptable given the problem constraints.

## Examples

**Example 1:**
- Input: `points = [[1,0],[0,0],[0,1]]`
- Output: `0.50000`

## Constraints

- 3 <= points.length <= 50
- -50 <= xi, yi <= 50
- All the given points are **unique**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Use the cross-product formula (Shoelace formula) to calculate triangle area from three points: Area = |x1(y2-y3) + x2(y3-y1) + x3(y1-y2)| / 2. With at most 50 points, you can afford O(n³) complexity to check all triplets.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use three nested loops to examine every combination of three distinct points. For each triplet, apply the Shoelace formula to compute the area. Track the maximum area encountered. This brute force approach is acceptable given the constraint of at most 50 points.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
For larger inputs, convex hull algorithms could reduce complexity, but they're unnecessary here. Focus on correct formula implementation and handling absolute values properly to avoid negative areas.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (All Triplets) | O(n³) | O(1) | Check all combinations |
| Optimal | O(n³) | O(1) | No better approach needed for n ≤ 50 |

## Common Mistakes

1. **Incorrect area formula**
   ```python
   # Wrong: Using distance-based approach incorrectly
   def area(p1, p2, p3):
       a = distance(p1, p2)
       b = distance(p2, p3)
       c = distance(p3, p1)
       # Heron's formula is more complex than needed

   # Correct: Use cross-product (Shoelace) formula
   def area(p1, p2, p3):
       x1, y1 = p1
       x2, y2 = p2
       x3, y3 = p3
       return abs(x1*(y2-y3) + x2*(y3-y1) + x3*(y1-y2)) / 2.0
   ```

2. **Forgetting absolute value**
   ```python
   # Wrong: Area can be negative depending on point order
   area = (x1*(y2-y3) + x2*(y3-y1) + x3*(y1-y2)) / 2.0

   # Correct: Always take absolute value
   area = abs(x1*(y2-y3) + x2*(y3-y1) + x3*(y1-y2)) / 2.0
   ```

3. **Not handling collinear points**
   ```python
   # Wrong: Not considering that area could be 0
   if area > max_area:
       max_area = area

   # Correct: Initialize max_area to 0 and handle zero areas naturally
   max_area = 0
   for each triplet:
       max_area = max(max_area, calculate_area(triplet))
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Largest Rectangle in Histogram | Hard | 1D instead of 2D geometry |
| Convex Hull | Medium | Find perimeter points, related optimization |
| Max Points on a Line | Medium | Collinearity instead of area maximization |
| Minimum Area Rectangle | Medium | Finding rectangles instead of triangles |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Geometry](../../strategies/patterns/geometry.md)
