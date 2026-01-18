---
id: M540
old_id: A430
slug: minimum-area-rectangle-ii
title: Minimum Area Rectangle II
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Minimum Area Rectangle II

## Problem

Imagine you have thumbtacks stuck in a corkboard at various positions, and you want to stretch a rubber band around exactly four of them to form a rectangle. The rectangle doesn't have to be aligned with the board's edges - it can be tilted at any angle. What's the smallest rectangle area you can create?

You receive a collection of coordinate points on a 2D plane, represented as `points` where each element `points[i] = [xi, yi]` specifies a point's location.

Determine the smallest area of any rectangle that can be constructed using four of these points. The rectangle's edges do not need to align with the coordinate axes (rotated rectangles are allowed). If no valid rectangle exists, return `0`.

For instance, given points at (1,2), (2,1), (1,0), (0,1):
- These form a tilted square rotated 45 degrees
- All four sides have equal length
- The diagonals bisect each other at (1,1)
- Area = 2

Solutions accurate to within `10⁻⁵` of the correct answer are acceptable.


**Diagram:**

```
Example 1: Points forming axis-aligned rectangle
    Y
    |   •(3,4)      •(5,4)
    |
    |   •(3,2)      •(5,2)
    |________________X

    Area = 2 × 2 = 4

Example 2: Points forming rotated rectangle
    Y
    |     •
    |   •   •
    |     •
    |________________X

    Rectangle can be rotated
    Find minimum area among all valid rectangles

Example 3: No valid rectangle possible
    Y
    |   •     •
    |
    |     •
    |________________X

    Return 0 (points don't form rectangle)
```


## Why This Matters

Finding geometric shapes in point clouds appears in computer vision (object recognition in images), robotics (identifying rectangular obstacles for navigation), architectural software (detecting building outlines from survey data), and manufacturing (quality control for rectangular parts). The problem teaches you to work with rotated coordinate systems and use algebraic properties of rectangles (equal diagonals, perpendicular sides, bisecting diagonals). The technique of grouping point pairs by their midpoint and distance is powerful for any geometry problem involving symmetry. This pattern appears in molecular chemistry (identifying rectangular molecular structures) and game development (collision detection for rotated rectangular hitboxes).

## Constraints

- 1 <= points.length <= 50
- points[i].length == 2
- 0 <= xi, yi <= 4 * 10⁴
- All the given points are **unique**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
A rectangle is defined by its diagonals, which must have the same center point and same length. For any two points, if they form a diagonal, the other two points of the rectangle can be determined by rotation. The key insight is to group point pairs by their center and distance.
</details>

<details>
<summary>Main Approach</summary>
For each pair of points, calculate the center point (midpoint) and the distance between them. Use a dictionary mapping (center, distance) to lists of point pairs. When two pairs share the same center and distance, they form a rectangle. Calculate the area using the cross product or distance formula for the four points.
</details>

<details>
<summary>Optimization Tip</summary>
To check if four points form a rectangle: verify that all four side lengths come in two pairs of equal lengths, and the two diagonals are equal. Alternatively, use vector mathematics: if diagonals bisect each other (same center) and have equal length, it's a rectangle. The dot product of adjacent sides should be zero for right angles.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n⁴) | O(1) | Check all combinations of 4 points |
| Diagonal Grouping | O(n²) | O(n²) | Group by diagonal properties |
| Optimal | O(n² log n) | O(n²) | Hash diagonal pairs, iterate to find rectangles |

## Common Mistakes

1. **Assuming axis-aligned rectangles only**
   ```python
   # Wrong: Only checking horizontal/vertical alignment
   if p1[0] == p2[0] or p1[1] == p2[1]:
       # Only handles axis-aligned

   # Correct: Handle rotated rectangles
   center = ((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2)
   dist = (p1[0] - p2[0])**2 + (p1[1] - p2[1])**2
   ```

2. **Incorrect area calculation for rotated rectangles**
   ```python
   # Wrong: Using simple width × height
   area = abs(x2 - x1) * abs(y2 - y1)

   # Correct: Use vector cross product for area
   # Given 4 points, calculate side vectors
   # area = |side1| × |side2| where sides are perpendicular
   d1 = distance(p1, p2)
   d2 = distance(p2, p3)
   area = d1 * d2
   ```

3. **Not validating rectangle properties**
   ```python
   # Wrong: Assuming same center + distance = rectangle
   if (center, dist) in diagonal_map:
       # Missing validation

   # Correct: Verify perpendicularity or right angles
   # Check dot product of adjacent sides equals zero
   # Or verify all 4 sides in two equal pairs
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Minimum Area Rectangle | Medium | Axis-aligned rectangles only, simpler |
| Largest Rectangle in Histogram | Hard | Different context, uses stack |
| Rectangle Area | Medium | Calculate total area covered by rectangles |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Geometry](../../strategies/patterns/geometry.md)
