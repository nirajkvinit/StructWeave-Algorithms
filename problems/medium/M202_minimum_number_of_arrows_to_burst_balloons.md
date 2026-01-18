---
id: M202
old_id: I251
slug: minimum-number-of-arrows-to-burst-balloons
title: Minimum Number of Arrows to Burst Balloons
difficulty: medium
category: medium
topics: ["array", "greedy", "sorting"]
patterns: ["interval-merging"]
estimated_time_minutes: 30
frequency: high
related_problems: ["M056", "M435", "M252"]
prerequisites: ["greedy-algorithms", "sorting", "interval-problems"]
---
# Minimum Number of Arrows to Burst Balloons

## Problem

Imagine balloons floating above a flat surface, each stretched horizontally between two x-coordinates. You're given an array `points` where `points[i] = [xstart, xend]` represents a balloon spanning from `xstart` to `xend` along the x-axis. The vertical positions don't matter since arrows travel upward infinitely.

You can shoot arrows straight up from any x-coordinate. An arrow shot from position `x` bursts all balloons whose horizontal span includes that position (where `xstart <= x <= xend`). A single arrow can pop multiple overlapping balloons. Find the minimum number of arrows needed to burst all balloons.

This is a classic interval scheduling problem disguised as a geometric puzzle. The key insight involves recognizing that balloons with overlapping horizontal ranges can share a single arrow, transforming this into an optimization problem about grouping intervals efficiently. Think about how sorting the balloons might help identify natural groupings.

## Why This Matters

This problem models real-world resource allocation scenarios like scheduling meeting rooms, assigning servers to handle overlapping requests, or optimizing delivery routes with time windows. The greedy interval merging pattern appears frequently in task scheduling systems, where you need to minimize resources (like CPU cores or network connections) while handling overlapping demands. Mastering this technique is essential for system design interviews and forms the basis for more complex problems like activity selection and weighted job scheduling. The sorting-based greedy approach taught here is a fundamental algorithmic pattern that extends far beyond balloons and arrows.

## Examples

**Example 1:**
- Input: `points = [[10,16],[2,8],[1,6],[7,12]]`
- Output: `2`
- Explanation: Two arrows suffice to pop all balloons:
- Fire an arrow from x = 6, which pops balloons [2,8] and [1,6].
- Fire an arrow from x = 11, which pops balloons [10,16] and [7,12].

**Example 2:**
- Input: `points = [[1,2],[3,4],[5,6],[7,8]]`
- Output: `4`
- Explanation: Each balloon requires its own arrow, totaling 4 arrows.

**Example 3:**
- Input: `points = [[1,2],[2,3],[3,4],[4,5]]`
- Output: `2`
- Explanation: Two arrows suffice to pop all balloons:
- Fire an arrow from x = 2, which pops balloons [1,2] and [2,3].
- Fire an arrow from x = 4, which pops balloons [3,4] and [4,5].

## Constraints

- 1 <= points.length <= 10⁵
- points[i].length == 2
- -2³¹ <= xstart < xend <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Greedy Interval Strategy</summary>

This is a classic interval scheduling problem. The key insight is that you want to maximize the number of balloons each arrow can pop. Think about sorting the balloons by their end positions. If you shoot an arrow at the earliest ending position, it will pop all overlapping balloons that start before that position.

</details>

<details>
<summary>🎯 Hint 2: Tracking Overlap</summary>

After sorting by end position, maintain a variable tracking the current arrow position (initially at the first balloon's end). For each subsequent balloon, if it starts after the current arrow position, you need a new arrow. Otherwise, the current arrow can pop this balloon too. Update the arrow position to be the minimum of current position and this balloon's end (to maximize future overlaps).

</details>

<details>
<summary>📝 Hint 3: Implementation Algorithm</summary>

```
Sort balloons by end position
arrows = 1
arrow_position = first balloon's end

For each balloon starting from second:
    if balloon.start > arrow_position:
        # Need new arrow
        arrows += 1
        arrow_position = balloon.end
    else:
        # Current arrow can pop this balloon
        # Update position to minimum end for max overlap
        arrow_position = min(arrow_position, balloon.end)

Return arrows
```

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (try all positions) | O(n * m) | O(1) | m = range of x coordinates |
| Greedy with Sorting | O(n log n) | O(1) or O(n) | Sorting step dominates, space depends on sort |
| Dynamic Programming | O(n²) | O(n) | Overkill for this problem |

**Recommended approach:** Greedy with sorting by end position (O(n log n) time, O(1) space)

## Common Mistakes

### Mistake 1: Sorting by start position instead of end
**Wrong:**
```python
def findMinArrowShots(points):
    points.sort(key=lambda x: x[0])  # Wrong: sort by start
    arrows = 1
    end = points[0][1]

    for start, curr_end in points[1:]:
        if start > end:
            arrows += 1
            end = curr_end
        # Missing logic to update end properly
```

**Correct:**
```python
def findMinArrowShots(points):
    points.sort(key=lambda x: x[1])  # Correct: sort by end position
    arrows = 1
    arrow_pos = points[0][1]

    for start, end in points[1:]:
        if start > arrow_pos:
            arrows += 1
            arrow_pos = end
        else:
            arrow_pos = min(arrow_pos, end)

    return arrows
```

### Mistake 2: Not updating arrow position to minimum end
**Wrong:**
```python
def findMinArrowShots(points):
    points.sort(key=lambda x: x[1])
    arrows = 1
    arrow_pos = points[0][1]

    for start, end in points[1:]:
        if start > arrow_pos:
            arrows += 1
            arrow_pos = end
        # Wrong: not updating arrow_pos when overlapping
```

**Correct:**
```python
def findMinArrowShots(points):
    points.sort(key=lambda x: x[1])
    arrows = 1
    arrow_pos = points[0][1]

    for start, end in points[1:]:
        if start > arrow_pos:
            arrows += 1
            arrow_pos = end
        else:
            # Update to minimum end for maximum future overlap
            arrow_pos = min(arrow_pos, end)

    return arrows
```

### Mistake 3: Off-by-one with boundary conditions
**Wrong:**
```python
# Using >= instead of > for overlap check
if start >= arrow_pos:  # Wrong: balloons touching at boundary should overlap
    arrows += 1
```

**Correct:**
```python
# Balloons overlap if start <= arrow_pos
if start > arrow_pos:  # Only need new arrow if starts AFTER current position
    arrows += 1
    arrow_pos = end
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Merge Intervals | Medium | Merge overlapping intervals instead of counting groups |
| Non-overlapping Intervals | Medium | Remove minimum intervals to make non-overlapping |
| Meeting Rooms II | Medium | Find minimum rooms needed (similar greedy) |
| Activity Selection | Medium | Select maximum non-overlapping activities |

## Practice Checklist

- [ ] First attempt (after reading problem)
- [ ] Understood greedy strategy
- [ ] Implemented with correct sorting
- [ ] Handled edge cases (single balloon, all overlapping, none overlapping)
- [ ] Verified boundary conditions (touching intervals)
- [ ] Tested with custom cases
- [ ] Reviewed after 1 day
- [ ] Reviewed after 1 week
- [ ] Could explain solution to others
- [ ] Comfortable with variations

**Strategy**: See [Greedy Algorithms](../strategies/patterns/greedy.md)
