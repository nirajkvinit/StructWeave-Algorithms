---
id: M090
old_id: I023
slug: rectangle-area
title: Rectangle Area
difficulty: medium
category: medium
topics: ["geometry", "math"]
patterns: ["coordinate-geometry"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E066", "M084", "H010"]
prerequisites: ["coordinate-geometry", "overlap-detection"]
---
# Rectangle Area

## Problem

You are provided with position data for two axis-aligned rectangles on a 2D coordinate plane. Calculate and return the combined area occupied by both shapes. Rectangle one is specified by coordinates `(ax1, ay1)` at its lower-left vertex and `(ax2, ay2)` at its upper-right vertex. Rectangle two is specified by coordinates `(bx1, by1)` at its lower-left vertex and `(bx2, by2)` at its upper-right vertex. Axis-aligned means the rectangle edges are parallel to the x and y axes, not rotated. Your task is to compute the total area covered by the union of these two rectangles, accounting for any overlap. If the rectangles overlap, you must avoid counting the overlapping region twice. If they don't overlap, simply sum their areas. If one rectangle completely contains the other, the answer is just the larger rectangle's area. The overlap region itself is a rectangle (or empty if they don't intersect), and you need to determine its boundaries and area. Edge cases include rectangles that don't overlap at all, rectangles that share only an edge or corner (zero overlap area), rectangles where one fully contains the other, identical rectangles, and rectangles with negative coordinates.

**Diagram:**

```
Coordinate plane with two rectangles:

      4 |     ┌──────┐
        |     │  B   │
      2 |  ┌──┼──┐   │
        |  │  │//│   │  (// = overlap)
      0 |  │  A  │   │
        |  │     └───┼──┐
     -2 |  └─────────┘  │
        |                └──
     -4 |___________________
       -4  -2   0   2   4

Total Area = Area(A) + Area(B) - Area(Overlap)
```


## Why This Matters

Rectangle overlap calculations are fundamental in computer graphics rendering, where the graphics pipeline must determine which screen regions need updating when windows overlap or move. Collision detection in game engines and physics simulations relies on rectangle intersection tests to determine if objects are touching. Geographic information systems use rectangle overlap to compute land parcel boundaries, property ownership regions, and zoning coverage. Computational geometry algorithms for map rendering and CAD systems constantly compute unions and intersections of rectangular regions. VLSI chip design tools calculate rectangle overlaps to detect design rule violations where circuit traces or components improperly intersect. The inclusion-exclusion principle you apply here, Total = A + B - Overlap, is fundamental in probability theory, set theory, and database query optimization where you're combining result sets. This problem teaches you to decompose geometric problems into algebraic calculations by carefully defining overlap boundaries using max/min operations, a technique that extends to 3D box intersections and more complex geometric computations.

## Examples

**Example 1:**
- Input: `ax1 = -2, ay1 = -2, ax2 = 2, ay2 = 2, bx1 = -2, by1 = -2, bx2 = 2, by2 = 2`
- Output: `16`

## Constraints

- -10⁴ <= ax1 <= ax2 <= 10⁴
- -10⁴ <= ay1 <= ay2 <= 10⁴
- -10⁴ <= bx1 <= bx2 <= 10⁴
- -10⁴ <= by1 <= by2 <= 10⁴

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

Think about the union of two sets. The combined area is the sum of both rectangles minus the area they share (overlap). The key challenge is determining if there's an overlap and calculating its area. Consider what conditions must be true for two rectangles to NOT overlap.

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

Calculate the area of each rectangle independently using (width × height). Then determine the overlapping region by finding the intersection boundaries: the overlap's left edge is max(ax1, bx1), right edge is min(ax2, bx2), bottom is max(ay1, by1), and top is min(ay2, by2). If these form a valid rectangle, subtract its area.

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

```
area1 = (ax2 - ax1) * (ay2 - ay1)
area2 = (bx2 - bx1) * (by2 - by1)

overlapLeft = max(ax1, bx1)
overlapRight = min(ax2, bx2)
overlapBottom = max(ay1, by1)
overlapTop = min(ay2, by2)

if overlapLeft < overlapRight and overlapBottom < overlapTop:
  overlapArea = (overlapRight - overlapLeft) * (overlapTop - overlapBottom)
else:
  overlapArea = 0

return area1 + area2 - overlapArea
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| **Inclusion-Exclusion** | **O(1)** | **O(1)** | Calculate areas and overlap directly |
| Coordinate Sweep | O(n log n) | O(n) | Overkill for 2 rectangles, useful for many |
| Grid Marking | O(w × h) | O(w × h) | Mark cells, inefficient for large coordinates |

## Common Mistakes

### Mistake 1: Not handling non-overlapping rectangles
```python
# Wrong - assumes overlap always exists
overlap_area = (min(ax2, bx2) - max(ax1, bx1)) * (min(ay2, by2) - max(ay1, by1))
total = area1 + area2 - overlap_area

# Correct - check if overlap exists
overlap_width = max(0, min(ax2, bx2) - max(ax1, bx1))
overlap_height = max(0, min(ay2, by2) - max(ay1, by1))
overlap_area = overlap_width * overlap_height
total = area1 + area2 - overlap_area
```

### Mistake 2: Integer overflow with large coordinates
```python
# Wrong - may overflow with coordinates near ±10⁴
area = (ax2 - ax1) * (ay2 - ay1)  # Could exceed 32-bit int

# Correct - use larger data type or be careful
area = int(ax2 - ax1) * int(ay2 - ay1)  # Python handles big ints automatically
# In other languages, use long/int64
```

### Mistake 3: Incorrect overlap boundary calculation
```python
# Wrong - using min for left edge
overlap_left = min(ax1, bx1)  # This gives leftmost point, not overlap

# Correct - overlap starts at the rightmost left edge
overlap_left = max(ax1, bx1)
overlap_right = min(ax2, bx2)
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Rectangle Overlap | Easy | Return boolean if rectangles overlap |
| Overlapping Rectangles Area | Medium | Given N rectangles, find total covered area |
| Rectangle Intersection | Easy | Return coordinates of overlapping region |
| Line Segment Overlap | Easy | 1D version of the problem |

## Practice Checklist

- [ ] Implement basic area calculation
- [ ] Handle case with no overlap
- [ ] Handle case with complete overlap (one inside other)
- [ ] Handle case with partial overlap
- [ ] Test with negative coordinates
- [ ] Test with touching rectangles (edge contact, no overlap)
- [ ] Verify inclusion-exclusion principle

**Spaced Repetition Schedule:**
- Day 1: Initial attempt, understand overlap logic
- Day 3: Implement without looking at hints
- Day 7: Solve similar geometry problems
- Day 14: Extend to N rectangles
- Day 30: Speed solve under 10 minutes

**Strategy**: See [Coordinate Geometry](../strategies/patterns/geometry.md)
