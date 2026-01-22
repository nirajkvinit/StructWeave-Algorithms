---
id: M523
old_id: A406
slug: minimum-area-rectangle
title: Minimum Area Rectangle
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Minimum Area Rectangle

## Problem

Picture yourself working on a computer graphics application that detects rectangular regions in a scatter plot. You're given an array of points on a 2D coordinate plane, where each point is represented as `[x, y]`. Your task is to find the smallest possible rectangle that can be formed using exactly four of these points as corners.

There's an important constraint: all rectangles must be axis-aligned, meaning their sides must be parallel to the X and Y axes. No rotated or tilted rectangles are allowed.

For instance, if you have points at (1,1), (1,3), (3,1), and (3,3), they form a perfect rectangle with width 2 and height 2, giving an area of 4. But if you add a point at (2,2), it doesn't help form any rectangle because it can't serve as a corner for an axis-aligned rectangle with the other points.

The challenge is to efficiently check all possible combinations of four points to see if they form valid rectangles, and among those valid rectangles, identify the one with the minimum area. If no valid rectangle exists, return 0.


**Diagram:**

Example 1: Finding minimum rectangle

```
Points: [[1,1],[1,3],[3,1],[3,3],[2,2]]

Y-axis
  3  •     •
  2      •
  1  •     •
     1  2  3  X-axis

Valid rectangle: points (1,1), (1,3), (3,1), (3,3)
- Width: 3 - 1 = 2
- Height: 3 - 1 = 2
- Area: 2 × 2 = 4

Point (2,2) cannot form axis-aligned rectangle with others
```

Example 2: Multiple rectangles

```
Points: [[1,1],[1,3],[3,1],[3,3],[4,1],[4,3]]

Y-axis
  3  •     •   •
  2
  1  •     •   •
     1  2  3  4  X-axis

Rectangle 1: (1,1), (1,3), (3,1), (3,3) → Area = 4
Rectangle 2: (3,1), (3,3), (4,1), (4,3) → Area = 2 (minimum)
Rectangle 3: (1,1), (1,3), (4,1), (4,3) → Area = 6

Minimum area = 2
```


## Why This Matters

This problem is fundamental to computational geometry applications used across multiple domains. In computer vision, object detection algorithms identify bounding boxes (rectangles) around detected objects, often needing to find the minimal enclosing rectangle. Geographic information systems (GIS) use similar techniques to find optimal rectangular zones for urban planning or agricultural plots. VLSI chip design relies on rectangle-finding algorithms to optimize component placement on silicon wafers. Image compression algorithms detect rectangular regions with similar colors to apply efficient encoding. The technique of using hash sets for O(1) point lookups while checking geometric relationships teaches you how to optimize brute-force geometric algorithms, a pattern that extends to collision detection in gaming, spatial indexing in databases, and layout optimization in UI frameworks.

## Constraints

- 1 <= points.length <= 500
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
For an axis-aligned rectangle, if you know two diagonal corners (x1,y1) and (x2,y2) where x1≠x2 and y1≠y2, the other two corners must be at (x1,y2) and (x2,y1). Use a set for O(1) point lookup.
</details>

<details>
<summary>Main Approach</summary>
Diagonal-based search:
1. Store all points in a set for O(1) lookup
2. For each pair of points, check if they can be diagonal corners (different x AND different y)
3. If yes, check if the other two required corners exist in the set
4. If all four corners exist, calculate area and track minimum
5. Return minimum area found (or 0 if none)
</details>

<details>
<summary>Optimization Tip</summary>
To avoid duplicate work, iterate through pairs where point1 comes before point2 (lexicographically). Also, only calculate area when you find a valid rectangle - don't compute for every pair. Use tuple (x,y) format for efficient set operations.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (4 points) | O(n^4) | O(n) | Check all combinations of 4 points |
| Diagonal Pairs | O(n^2) | O(n) | Check all pairs as potential diagonals |

## Common Mistakes

1. **Not checking if diagonal corners are valid**
   ```python
   # Wrong: Assume any two points can be diagonal
   for p1 in points:
       for p2 in points:
           if (p1[0], p2[1]) in point_set and (p2[0], p1[1]) in point_set:

   # Correct: Verify x and y are different
   for p1 in points:
       for p2 in points:
           if p1[0] != p2[0] and p1[1] != p2[1]:  # Valid diagonal
               if (p1[0], p2[1]) in point_set and (p2[0], p1[1]) in point_set:
   ```

2. **Counting same rectangle multiple times**
   ```python
   # Wrong: Count each rectangle 4 times (once per corner pair)
   min_area = min(min_area, area)

   # Correct: Only consider ordered pairs
   for i in range(len(points)):
       for j in range(i+1, len(points)):
           # Process pair (i,j) once
   ```

3. **Integer overflow in area calculation**
   ```python
   # Wrong: May overflow with large coordinates
   area = width * height

   # Correct: Use absolute values and compare before multiplication
   width = abs(x2 - x1)
   height = abs(y2 - y1)
   area = width * height  # Python handles big integers
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Max Points on a Line | Hard | Line instead of rectangle |
| Rectangle Area | Medium | Calculate area of overlapping rectangles |
| Perfect Rectangle | Hard | Check if rectangles form perfect coverage |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Hash Set Pattern](../../prerequisites/hash-tables.md)
