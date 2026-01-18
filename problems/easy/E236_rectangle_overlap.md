---
id: E236
old_id: A303
slug: rectangle-overlap
title: Rectangle Overlap
difficulty: easy
category: easy
topics: ["geometry", "math"]
patterns: ["interval-overlap"]
estimated_time_minutes: 15
frequency: medium
prerequisites: ["coordinate-geometry", "interval-intersection"]
related_problems: ["E044", "M048", "M079"]
strategy_ref: ../strategies/patterns/interval-overlap.md
---
# Rectangle Overlap

## Problem

You are working with axis-aligned rectangles, which means all their sides are parallel to either the x-axis or the y-axis (no rotated or tilted rectangles). Each rectangle is represented by four numbers: `[x1, y1, x2, y2]`, where `(x1, y1)` represents the coordinates of the bottom-left corner and `(x2, y2)` represents the coordinates of the top-right corner.

Your task is to determine whether two given rectangles overlap with a positive area. This is an important distinction: rectangles that merely touch at a single edge or corner point are not considered overlapping, since they share zero area. Only rectangles that have some region of interior overlap count as overlapping.

For example, imagine two squares on graph paper. If they share a border edge, they're adjacent but not overlapping. If one corner of the first square touches one corner of the second square, again, they're not overlapping. Only when the interior regions actually intersect does the answer become true.

The key insight here is that you can break this 2D geometry problem into two independent 1D problems. Think of the rectangles as intervals on the x-axis and intervals on the y-axis. For the rectangles to overlap, their projections must overlap on both axes simultaneously. If they overlap only on the x-axis but not the y-axis (or vice versa), the rectangles don't overlap.

Another useful approach is to think about when rectangles definitely don't overlap. If one rectangle is completely to the left, right, above, or below the other, they can't possibly overlap. Checking for these separation conditions can be simpler than checking for overlap directly.

## Why This Matters

Rectangle intersection is a fundamental building block in computational geometry with applications across many domains. In computer graphics and game development, collision detection systems constantly check whether game objects (represented as bounding rectangles) overlap to determine if characters have collided or if bullets have hit targets.

User interface systems use rectangle overlap detection extensively. When you click on a screen, the UI needs to determine which window or button your mouse cursor intersects with. When windows overlap, the system needs to know which regions to redraw. Map rendering applications check which tiles intersect with the visible viewport to determine what to load and display.

Spatial databases and geographic information systems (GIS) use rectangle intersection queries to efficiently answer questions like "which buildings are in this city block?" or "which stores are within this delivery zone?" The R-tree data structure, commonly used for spatial indexing, relies heavily on rectangle intersection tests.

The interval overlap pattern you learn here extends beyond rectangles. The same principles apply to checking if time ranges overlap (meeting scheduler), if number ranges overlap (compression algorithms), and if multi-dimensional bounding boxes intersect (3D graphics, physics simulations). Mastering the 2D case with rectangles gives you a foundation that scales to higher dimensions and more complex geometric problems.

## Examples

**Example 1:**
- Input: `rec1 = [0,0,2,2], rec2 = [1,1,3,3]`
- Output: `true`

**Example 2:**
- Input: `rec1 = [0,0,1,1], rec2 = [1,0,2,1]`
- Output: `false`

**Example 3:**
- Input: `rec1 = [0,0,1,1], rec2 = [2,2,3,3]`
- Output: `false`

## Constraints

- rec1.length == 4
- rec2.length == 4
- -10⁹ <= rec1[i], rec2[i] <= 10⁹
- rec1 and rec2 represent a valid rectangle with a non-zero area.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1 - Conceptual Foundation
Think about when rectangles DON'T overlap. Consider the cases where rectangles are completely separated - one is entirely to the left, right, above, or below the other. Can you express this using the boundary coordinates?

### Hint 2 - Dimensional Decomposition
Break the 2D rectangle overlap problem into two 1D interval overlap problems. If two intervals [a1, a2] and [b1, b2] overlap on the x-axis, and two intervals [c1, c2] and [d1, d2] overlap on the y-axis, what does that tell you about the rectangles?

### Hint 3 - Implementation Strategy
Use the negation approach: define all conditions where rectangles DON'T overlap, then return the opposite. Check if rec1 is completely to the left of rec2, rec1 is completely to the right of rec2, rec1 is completely above rec2, or rec1 is completely below rec2. Return true only if none of these separations exist.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Separation Conditions | O(1) | O(1) | Constant checks for boundary comparisons |
| Intersection Computation | O(1) | O(1) | Calculate intersection rectangle dimensions |

## Common Mistakes

### Mistake 1: Treating Edge Touching as Overlap
```python
# INCORRECT: Allows edge/corner touching
if rec1[2] >= rec2[0] and rec1[0] <= rec2[2]:  # Wrong: uses >=, <=
    return True
```
**Why it's wrong:** The problem requires POSITIVE area overlap. Rectangles sharing an edge or corner have zero overlap area.

**Correct approach:**
```python
# CORRECT: Requires strict overlap with positive area
if rec1[2] > rec2[0] and rec1[0] < rec2[2]:  # Correct: uses >, <
    # Check y-axis similarly
    pass
```

### Mistake 2: Checking Only Overlap Instead of Non-Overlap
```python
# INCORRECT: Complex overlap logic prone to errors
if (rec1[0] < rec2[2] and rec1[2] > rec2[0] and
    rec1[1] < rec2[3] and rec1[3] > rec2[1]):
    return True
```
**Why it's problematic:** While this can work, it's harder to reason about and easy to get the inequalities wrong.

**Correct approach:**
```python
# CORRECT: Clear separation conditions
if rec1[2] <= rec2[0]:  # rec1 is left of rec2
    return False
if rec1[0] >= rec2[2]:  # rec1 is right of rec2
    return False
if rec1[3] <= rec2[1]:  # rec1 is below rec2
    return False
if rec1[1] >= rec2[3]:  # rec1 is above rec2
    return False
return True  # No separation found, must overlap
```

### Mistake 3: Coordinate Confusion
```python
# INCORRECT: Mixing up x and y coordinates
if rec1[1] > rec2[0] and rec1[3] < rec2[2]:  # Wrong axis comparison
    return True
```
**Why it's wrong:** The indices represent [x1, y1, x2, y2]. Comparing x-coordinates with y-coordinates produces incorrect results.

## Problem Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Count Rectangle Overlaps | Medium | Given N rectangles, count overlapping pairs |
| Rectangle Area Coverage | Medium | Calculate total area covered by multiple rectangles |
| Maximum Overlap Region | Hard | Find region with maximum overlapping rectangles |
| Rotated Rectangles | Hard | Handle rectangles at arbitrary angles |
| 3D Box Overlap | Medium | Extend to three dimensions with cuboids |

## Practice Checklist

- [ ] First solve: Can detect rectangle overlap correctly
- [ ] Handle edge cases: Adjacent rectangles (touching but not overlapping)
- [ ] Optimize: Use efficient separation check
- [ ] Review after 1 day: Can explain the logic clearly
- [ ] Review after 1 week: Solve without hints
- [ ] Interview ready: Explain time/space complexity and handle follow-ups

## Strategy

**Pattern**: Interval Overlap
- Learn the fundamental interval intersection technique
- Apply to multiple dimensions independently
- Master the separation vs overlap logic

See [Interval Overlap Pattern](../strategies/patterns/interval-overlap.md) for the complete strategy guide.
