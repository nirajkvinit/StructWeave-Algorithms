---
id: E138
old_id: I190
slug: perfect-rectangle
title: Perfect Rectangle
difficulty: easy
category: easy
topics: ["array", "geometry", "hash-table"]
patterns: ["corner-tracking", "area-validation"]
estimated_time_minutes: 15
frequency: low
related_problems:
  - M223
  - H218
  - M850
prerequisites:
  - coordinate geometry
  - hash-table/set operations
  - area calculation
strategy_ref: ../strategies/patterns/geometry.md
---
# Perfect Rectangle

## Problem

You are given an array `rectangles` where each element `rectangles[i] = [xi, yi, ai, bi]` describes an axis-aligned rectangle on a 2D plane. The notation works as follows: `(xi, yi)` represents the coordinates of the bottom-left corner, while `(ai, bi)` represents the coordinates of the top-right corner.

Your task is to determine whether all these rectangles together form a **perfect rectangular coverage**. This means three critical conditions must be satisfied: there are no overlapping areas between any rectangles, there are no gaps within the covered region, and the final combined shape forms exactly one complete rectangle (not multiple separate rectangles or an L-shape).

This is a challenging spatial reasoning problem. Consider that rectangles `[[1,1,3,3], [3,1,4,2]]` would share an edge perfectly at x=3, but `[[1,1,3,3], [2,2,4,4]]` would overlap in the region from (2,2) to (3,3). The visual diagrams below illustrate valid and invalid configurations to help clarify what constitutes a perfect rectangle.

Edge cases to consider: What if all rectangles are the same? What if there's just one rectangle? What mathematical properties must hold for a perfect rectangular tiling?

**Diagram:**

```
Example 1: Perfect rectangle (returns true)
rectangles = [[1,1,3,3],[3,1,4,2],[3,2,4,4],[1,3,2,4],[2,3,3,4]]

    4 ┌───┬─┐
      │ D │E│
    3 ├───┼─┤
      │ A │ │
    2 │   ├─┤
      │   │B│
    1 └───┴─┘
      1 2 3 4

All rectangles fit perfectly with no gaps or overlaps.

Example 2: Has gap (returns false)
rectangles = [[1,1,2,3],[1,3,2,4],[3,1,4,2],[3,2,4,4]]

    4 ┌───┐ ┐
      │ B │ │
    3 ├───┤ ┤
      │   │GAP
    2 │ A │ ┤
      │   │ D│
    1 └───┴ ┘
      1 2 3 4

There is a gap at position (2,2) to (3,3).

Example 3: Has overlap (returns false)
rectangles = [[1,1,3,3],[3,1,4,2],[1,3,2,4],[2,2,4,4]]

    4 ┌───┬──┐
      │ C │  │
    3 ├───┼──┤
      │   │D │
    2 │ A │  │
      │   └──┘
    1 └─────┘
      1 2 3 4

Rectangle D overlaps with A.
```


## Why This Matters

Geometric validation appears in computer graphics (polygon mesh validation), VLSI chip design (verifying circuit layouts have no gaps or overlaps), map processing (validating administrative boundaries), and computational geometry applications. This problem develops spatial reasoning and teaches how to verify complex geometric properties using simple mathematical invariants.

The elegant solution relies on two key insights: area conservation (total area must match the bounding box) and corner parity (only the four outer corners should appear an odd number of times). These invariant-based approaches are common in geometry problems and demonstrate how mathematical properties can replace expensive pixel-by-pixel validation. Understanding this pattern helps solve related problems involving rectangle intersection, union, and coverage analysis.

## Constraints

- 1 <= rectangles.length <= 2 * 10⁴
- rectangles[i].length == 4
- -10⁵ <= xi, yi, ai, bi <= 10⁵

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Tier 1 Hint - Core Concept
For a perfect rectangle, two conditions must hold: (1) The sum of all individual rectangle areas must equal the area of the bounding rectangle, and (2) Each corner point must appear the correct number of times. Think about corner properties: in a perfect rectangle, only the four outer corners appear once, while all other corners appear in pairs (2 or 4 times).

### Tier 2 Hint - Implementation Details
Track two things: (1) Calculate the bounding box by finding min/max x and y coordinates. Compute its area and compare with sum of all rectangle areas. (2) Use a set to track corners. For each rectangle, add its four corners. If a corner appears twice, remove it (XOR-like behavior). At the end, only four corners should remain - these should be the bounding box corners.

### Tier 3 Hint - Optimization Strategy
Use a set with XOR logic: when adding a corner, if it exists in the set, remove it; otherwise, add it. This leaves only corners with odd occurrence count. Valid rectangle has exactly 4 corners remaining, matching the bounding box corners. Area check: `sum(individual areas) == (max_x - min_x) * (max_y - min_y)`. Time: O(n), Space: O(n) for corner tracking.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (pixel grid) | O(n * A) | O(A) | A = total area, mark each pixel |
| Sweep Line | O(n log n) | O(n) | Sort events, track active intervals |
| Corner + Area Check | O(n) | O(n) | Track corners in set, validate area |
| Hash Map Corner Count | O(n) | O(n) | Count corner occurrences explicitly |

## Common Mistakes

### Mistake 1: Only checking area sum
```python
# Incomplete - missing corner validation
def isRectangleCover(rectangles):
    min_x = min_y = float('inf')
    max_x = max_y = float('-inf')
    area_sum = 0

    for x1, y1, x2, y2 in rectangles:
        min_x = min(min_x, x1)
        min_y = min(min_y, y1)
        max_x = max(max_x, x2)
        max_y = max(max_y, y2)
        area_sum += (x2 - x1) * (y2 - y1)

    expected_area = (max_x - min_x) * (max_y - min_y)
    return area_sum == expected_area  # Not sufficient!
```

**Why it's wrong:** Overlapping rectangles can have correct total area but still fail. Need to verify corners.

**Fix:** Add corner tracking logic.

### Mistake 2: Incorrect corner occurrence logic
```python
# Wrong - doesn't handle interior corners correctly
def isRectangleCover(rectangles):
    corners = set()
    for x1, y1, x2, y2 in rectangles:
        corners.add((x1, y1))
        corners.add((x2, y2))
        # Missing: (x1, y2) and (x2, y1)
    return len(corners) == 4
```

**Why it's wrong:** Each rectangle has 4 corners, not 2. Must track all corners.

**Fix:** Track all four corners per rectangle: `(x1,y1), (x1,y2), (x2,y1), (x2,y2)`.

### Mistake 3: Not using XOR-like set behavior
```python
# Inefficient - counts instead of toggle
def isRectangleCover(rectangles):
    corner_count = {}
    for x1, y1, x2, y2 in rectangles:
        for corner in [(x1,y1), (x1,y2), (x2,y1), (x2,y2)]:
            corner_count[corner] = corner_count.get(corner, 0) + 1

    # Complex validation of counts...
    odd_count = [c for c in corner_count.values() if c % 2 == 1]
    return len(odd_count) == 4  # Incomplete logic
```

**Why it's inefficient:** Counting works but is more complex. Set toggle is cleaner.

**Fix:** Use set add/remove toggle for automatic odd-occurrence tracking.

## Variations

| Variation | Difference | Difficulty Δ |
|-----------|-----------|-------------|
| Rectangle area overlap | Calculate total overlapping area | +2 |
| Minimum covering rectangle | Find smallest rectangle covering all points | 0 |
| Perfect square check | Verify if rectangles form a square | 0 |
| 3D cuboid version | Extend to 3D rectangular prisms | +2 |
| Allow gaps | Find total area with gaps allowed | +1 |
| Count overlapping regions | Find how many rectangles overlap at any point | +2 |

## Practice Checklist

Track your progress on this problem:

- [ ] Solved using area + corner validation
- [ ] Implemented set-based corner tracking (XOR logic)
- [ ] Understood why area alone is insufficient
- [ ] After 1 day: Re-solved from memory
- [ ] After 1 week: Solved in < 15 minutes
- [ ] Explained corner occurrence property to someone

**Strategy**: See [Geometry Pattern](../strategies/patterns/geometry.md)
