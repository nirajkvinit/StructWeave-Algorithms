---
id: H063
old_id: I155
slug: line-reflection
title: Line Reflection
difficulty: hard
category: hard
topics: []
patterns: []
estimated_time_minutes: 45
---
# Line Reflection

## Problem

You have `n` points distributed on a 2D coordinate plane. Determine whether there exists a vertical line (parallel to the y-axis) that acts as a mirror of symmetry for these points.

More specifically, check if you can draw a vertical line such that reflecting every point across this line produces the exact same set of points you started with.

**Note** that duplicate points may exist in the input.

**Diagram:**

Example 1: Points `[[1,1],[-1,1]]` - Has reflection line
```
  y
  |
  | (1,1)     (-1,1)
  |   *    |    *
  |        |          Line of reflection at x=0
  +--------|---------> x
           0
```
Reflection line exists at x = 0. Each point has a mirror.

Example 2: Points `[[1,1],[-1,-1]]` - No reflection line
```
  y
  |
  | (1,1)
  |   *
  +-------------------> x
  |         *
  |    (-1,-1)
```
No vertical line can reflect these points onto each other.


## Why This Matters

This problem develops fundamental algorithmic thinking and problem-solving skills.

## Constraints

- n == points.length
- 1 <= n <= 10⁴
- -10⁸ <= points[i][j] <= 10⁸

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
If a vertical reflection line exists, it must be at x = (minX + maxX) / 2. For every point (x, y), its reflection (2*lineX - x, y) must also exist in the point set. The y-coordinate remains unchanged during vertical reflection, only the x-coordinate changes symmetrically.
</details>

<details>
<summary>🎯 Main Approach</summary>
First, find the minimum and maximum x-coordinates to determine the potential reflection line. Then use a hash set to store all points as tuples. For each point, calculate where its reflection should be and check if that reflected point exists in the set. All points must have valid reflections for the answer to be true.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use a set of tuples for O(1) lookup instead of checking pairs in O(n²). Handle duplicates by storing points in a set initially. Be careful with floating-point arithmetic - work with 2*lineX instead of lineX to avoid division and keep everything as integers.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (try all x values) | O(n² * m) | O(n) | Check every unique x as potential line, m = unique x values |
| Optimal (hash set reflection check) | O(n) | O(n) | Single pass to find line, single pass to verify |

## Common Mistakes

1. **Floating-point precision errors**
   ```python
   # Wrong: using floating-point for reflection line
   line_x = (min_x + max_x) / 2.0
   reflected_x = 2 * line_x - x  # Precision issues

   # Correct: use integer arithmetic
   line_x_doubled = min_x + max_x
   reflected_x = line_x_doubled - x  # No division, exact
   ```

2. **Not handling duplicate points**
   ```python
   # Wrong: treating duplicates as separate points
   points_set = [tuple(p) for p in points]

   # Correct: use set to handle duplicates
   points_set = set(tuple(p) for p in points)
   # Each unique point still needs its reflection
   ```

3. **Forgetting edge cases**
   ```python
   # Wrong: not handling single point or collinear points
   if len(points) == 1:
       return True  # Single point is always symmetric

   # Correct: check if all points have same x-coordinate
   if min_x == max_x:
       return True  # All points on same vertical line
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Valid Palindrome | Easy | 1D version of symmetry checking |
| Symmetric Tree | Easy | Tree structure symmetry |
| Mirror Reflection | Medium | Ray tracing with reflections |
| Largest Rectangle in Histogram | Hard | Uses similar min/max finding technique |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Hash Table](../../strategies/data-structures/hash-tables.md)
