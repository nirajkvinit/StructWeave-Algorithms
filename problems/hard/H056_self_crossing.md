---
id: H056
old_id: I134
slug: self-crossing
title: Self Crossing
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# Self Crossing

## Problem

You receive an integer array called `distance` that defines a series of movements.

Beginning at coordinates `(0, 0)` on a 2D coordinate plane, you execute movements in a repeating directional pattern: first move `distance[0]` units north, then `distance[1]` units west, followed by `distance[2]` units south, then `distance[3]` units east, continuing this counter-clockwise rotation for all remaining elements.

Your task is to determine whether any segment of your path intersects with a previous segment. Return `true` if the path crosses itself at any point, otherwise return `false`.

**Diagram:**

Example 1: Input `[2,1,1,2]` - Self crossing
```
    N
    |
W --+-- E
    |
    S

    ^
    |
  2 |
    |
<-1-+ (crosses here)
  2 |
    v
```

Example 2: Input `[1,2,3,4]` - No crossing (spiral outward)
```
      ^
      |3
      |
  <-2-+
    4 |
      v
```

Example 3: Input `[1,1,1,1]` - Forms a square, no crossing
```
  +--1--+
  |     |
  1     1
  |     |
  +--1--+
```


## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Constraints

- 1 <= distance.length <= 10⁵
- 1 <= distance[i] <= 10⁵

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
A line can only cross with a line from 3, 4, or 5 steps before. Lines closer than 3 steps away are perpendicular and cannot cross. Lines more than 5 steps away are too far. This reduces the problem to checking only a few specific crossing patterns.
</details>

<details>
<summary>🎯 Main Approach</summary>
For each line i (where i >= 3), check three crossing conditions: (1) 4th line crosses i-th (i crosses i-3), (2) 5th line crosses i-th (i crosses i-4), (3) 6th line crosses i-th (i crosses i-5). Each has specific geometric conditions based on the lengths and relative positions of the involved lines.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
The three crossing patterns are: (1) i >= 3: d[i] >= d[i-2] and d[i-1] <= d[i-3], (2) i >= 4: d[i-1] == d[i-3] and d[i] + d[i-4] >= d[i-2], (3) i >= 5: d[i-2] >= d[i-4] and d[i-3] >= d[i-1] and d[i-1] + d[i-5] >= d[i-3] and d[i] + d[i-4] >= d[i-2]. Check these conditions as you iterate.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(n) | Check all line segment pairs for intersection |
| Pattern Matching | O(n) | O(1) | Check only 3 specific crossing patterns |

## Common Mistakes

1. **Checking all pairs of lines**
   ```python
   # Wrong: O(n²) checking all intersections
   for i in range(len(distance)):
       for j in range(i + 1, len(distance)):
           if lines_intersect(i, j):
               return True

   # Correct: Only check lines 3-5 steps away
   for i in range(3, len(distance)):
       # Check only 3 specific patterns
       if check_pattern_1(i) or check_pattern_2(i) or check_pattern_3(i):
           return True
   ```

2. **Incorrect geometric conditions**
   ```python
   # Wrong: Incomplete crossing check
   if distance[i] >= distance[i-2]:
       return True

   # Correct: Full condition for 4th line crossing
   if i >= 3 and distance[i] >= distance[i-2] and distance[i-1] <= distance[i-3]:
       return True
   ```

3. **Missing edge cases for parallel lines**
   ```python
   # Wrong: Not handling touching/overlapping cases
   if distance[i-1] < distance[i-3]:
       # Assumes strict inequality

   # Correct: Handle equal case (parallel touching)
   if i >= 4 and distance[i-1] == distance[i-3] and \
      distance[i] + distance[i-4] >= distance[i-2]:
       return True
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Rectangle Overlap | Easy | Check if two rectangles overlap |
| Line Reflection | Medium | Check if points reflect across a line |
| Valid Boomerang | Easy | Check if three points are not collinear |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Geometry](../../strategies/patterns/geometry.md)
