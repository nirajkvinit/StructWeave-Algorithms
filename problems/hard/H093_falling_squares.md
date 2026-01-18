---
id: H093
old_id: A166
slug: falling-squares
title: Falling Squares
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# Falling Squares

## Problem

Imagine squares falling sequentially onto a horizontal X-axis in a 2D coordinate system.

You receive an array `positions` where each element `positions[i] = [lefti, sideLengthi]` describes square `i`: its left boundary starts at coordinate `lefti` and it has side length `sideLengthi`.

Squares drop one by one from above. Each square descends vertically until it rests either on the X-axis or atop another square. Contact must occur along the top surface of an existing square; merely touching edges doesn't count as support. Once positioned, squares remain fixed.

Track the maximum height of all stacked squares after each drop.

Return an array `ans` where `ans[i]` indicates the peak height immediately after the `ith` square settles.


**Diagram:**

Example: Squares falling onto X-axis
```
After square 1 [1, 2]:     After square 2 [2, 3]:     After square 3 [6, 1]:
Height                     Height                     Height
  2  ┌──┐                    3  ┌───┐                   3  ┌───┐
  1  └──┘                    2  │   │ ┌──┐              2  │   │ ┌──┐
  0  ────────                1  └───┘ └──┘              1  └───┘ └──┘ ┌─┐
     0 1 2 3 4 5 6 X            0 1 2 3 4 5 6 X            0 1 2 3 4 5 6 7 X

Square positions: [left, sideLength]
Square 1: left=1, width=2, lands at height 0, top at height 2
Square 2: left=2, width=3, partially overlaps square 1, stacks on top
Square 3: left=6, width=1, lands separately at height 0
```


## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `positions = [[100,100],[200,100]]`
- Output: `[100,100]`
- Explanation: Following the first drop, the maximum height is 100 (from square 1).
Following the second drop, both squares have height 100, maintaining the maximum at 100.
Result: [100, 100].
Note: Square 2 only contacts square 1's edge, so it lands on the ground independently.

## Constraints

- 1 <= positions.length <= 1000
- 1 <= lefti <= 10⁸
- 1 <= sideLengthi <= 10⁶

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is an interval overlap problem where you need to track the maximum height at each position. For each falling square, determine which existing squares it overlaps with, find the maximum height among them, and place the new square on top.
</details>

<details>
<summary>🎯 Main Approach</summary>
Maintain a list of intervals with their heights. For each new square [left, sideLength], check overlap with existing squares by comparing if intervals intersect (left < other_right AND right > other_left). Find max height among overlapping squares, place new square at that height + sideLength, then track the overall maximum.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use coordinate compression or segment tree for better performance with many squares. For simpler implementation, maintain intervals as (left, right, height) tuples and iterate through all previous squares for each new drop. Merge adjacent intervals with same height to reduce list size.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(n) | Check all previous squares for each drop |
| Segment Tree | O(n log C) | O(C) | C is coordinate range |
| Coordinate Compression + Segment Tree | O(n² log n) | O(n) | Better for large coordinates |
| Optimal (with merging) | O(n²) | O(n) | Merge intervals to reduce checks |

## Common Mistakes

1. **Incorrect overlap detection**
   ```python
   # Wrong: Only checking if left positions match
   if square1[0] == square2[0]:
       overlaps = True

   # Correct: Check if intervals intersect
   def overlaps(left1, right1, left2, right2):
       return left1 < right2 and right1 > left2
   ```

2. **Not considering edge-only contact**
   ```python
   # Wrong: Counting edge contact as support
   right = left + sideLength
   if left <= other_right and right >= other_left:
       overlaps = True  # Edge contact shouldn't count

   # Correct: Use strict inequality for overlap
   if left < other_right and right > other_left:
       overlaps = True
   ```

3. **Forgetting to track global maximum**
   ```python
   # Wrong: Only tracking current height
   heights = []
   for pos in positions:
       current_max = calculate_height(pos)
       heights.append(current_max)  # Missing global max

   # Correct: Maintain running maximum
   global_max = 0
   heights = []
   for pos in positions:
       current_height = calculate_height(pos)
       global_max = max(global_max, current_height)
       heights.append(global_max)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| The Skyline Problem | Hard | Merge all buildings, track critical points |
| My Calendar III | Hard | Count maximum overlapping intervals |
| Range Module | Hard | Track and query covered ranges |
| Merge Intervals | Medium | Simpler interval merging without height |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (edge contact, large coordinates)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Intervals](../../strategies/patterns/intervals.md) | [Segment Tree](../../strategies/data-structures/segment-tree.md)
