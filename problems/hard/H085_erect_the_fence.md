---
id: H085
old_id: A072
slug: erect-the-fence
title: Erect the Fence
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# Erect the Fence

## Problem

You have an array `trees` where each element `trees[i] = [xi, yi]` denotes the position of a tree in a garden.

Your goal is to construct a fence that encloses all trees using the shortest possible amount of rope. A properly fenced garden must have every tree either inside or on the boundary.

Your task is to identify and return the coordinates of all trees that lie exactly on the fence's outer perimeter. The order of the returned coordinates does not matter.


**Diagram:**

```
Example 1: Convex Hull
Input: trees = [[1,1],[2,2],[2,0],[2,4],[3,3],[4,2]]

  4 |     (2,4)
  3 |  (1,1) (3,3)
  2 |     (2,2) (4,2)
  1 |
  0 |     (2,0)
    +----------------
      1   2   3   4

The fence encloses all trees using minimal rope.
Trees on perimeter: [[1,1],[2,0],[4,2],[3,3],[2,4]]
```

```
Example 2: All points on convex hull
Input: trees = [[1,2],[2,2],[4,2]]

  2 | (1,2) (2,2)   (4,2)
  1 |
  0 |
    +--------------------
      1   2   3   4

All three points lie on the fence perimeter (they're collinear).
Output: [[1,2],[2,2],[4,2]]
```


## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Constraints

- 1 <= trees.length <= 3000
- trees[i].length == 2
- 0 <= xi, yi <= 100
- All the given positions are **unique**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
This is the classic Convex Hull problem in computational geometry. The fence represents the convex hull of all points. Use the cross product to determine if three points make a left turn, right turn, or are collinear. Points on the hull never make a right turn when traversing counterclockwise.
</details>

<details>
<summary>Main Approach</summary>
Use Graham Scan or Jarvis March algorithm. Sort points by x-coordinate (then y-coordinate for ties). Build the lower hull by traversing left to right, keeping only points that don't create right turns. Build the upper hull similarly by traversing right to left. Combine both hulls, handling collinear points carefully.
</details>

<details>
<summary>Optimization Tip</summary>
For this problem, you must include all collinear points on the hull boundary (not just the endpoints). Modify the standard convex hull algorithm to keep collinear points. Use Andrew's Monotone Chain algorithm which is simpler to implement than Graham Scan and handles duplicates well.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n^3) | O(n) | Check every combination of 3 points |
| Graham Scan | O(n log n) | O(n) | Sort + linear scan |
| Jarvis March | O(nh) | O(n) | h = hull size, better for small hulls |
| Andrew's Algorithm | O(n log n) | O(n) | Monotone chain, easiest to implement |

## Common Mistakes

1. **Using standard convex hull without handling collinear points**
   ```python
   # Wrong: Standard cross product check excludes collinear points
   def cross(O, A, B):
       return (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0])

   while len(hull) >= 2 and cross(hull[-2], hull[-1], p) <= 0:
       hull.pop()  # This removes collinear points

   # Correct: Keep collinear points on the boundary
   while len(hull) >= 2 and cross(hull[-2], hull[-1], p) < 0:
       hull.pop()  # Only remove right turns, keep collinear
   ```

2. **Forgetting to handle the last segment of the hull**
   ```python
   # Wrong: Not checking collinear points on final segment
   lower = build_hull(sorted_points)
   upper = build_hull(reversed(sorted_points))
   return lower + upper  # May miss collinear points

   # Correct: Special handling for collinear points on closing edge
   # Include all points between first and last hull point that are collinear
   ```

3. **Incorrect sorting of points**
   ```python
   # Wrong: Only sorting by x-coordinate
   points.sort(key=lambda p: p[0])

   # Correct: Sort by x, then by y for ties
   points.sort(key=lambda p: (p[0], p[1]))
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Convex Hull (Standard) | Hard | Exclude collinear points on edges |
| Largest Triangle Area | Medium | Find largest area using convex hull points |
| Minimum Area Rectangle | Medium | Use convex hull properties |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Computational Geometry](../../strategies/patterns/computational-geometry.md)
