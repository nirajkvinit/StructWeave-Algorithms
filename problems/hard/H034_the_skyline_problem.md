---
id: H034
old_id: I018
slug: the-skyline-problem
title: The Skyline Problem
difficulty: hard
category: hard
topics: []
patterns: []
estimated_time_minutes: 45
---
# The Skyline Problem

## Problem

The **skyline** represents the outline of a metropolitan area's profile as seen from far away. When provided with position and elevation data for every structure, produce *the resulting **skyline** that these structures create together*.

Each structure's spatial data is provided in the `buildings` array, where `buildings[i] = [lefti, righti, heighti]`:

	- `lefti` represents the x position where the `ith` structure begins.
	- `righti` represents the x position where the `ith` structure ends.
	- `heighti` represents how tall the `ith` structure is.

Treat all structures as rectangular shapes sitting on a completely level ground plane at elevation `0`.

Your **skyline** output must be a sequence of "key points" **ordered by x-coordinate** formatted as `[[x₁,y₁],[x₂,y₂],...]`. Each key point marks where a horizontal skyline segment starts, with the final point having y-coordinate `0` to indicate where the skyline concludes after the last structure. The ground area spanning from the first to the last structure must be included in the skyline outline.

Note: Adjacent horizontal segments at the same elevation cannot appear in your result. For example, `[...,[2 3],[4 5],[7 5],[11 5],[12 7],...]` is invalid; those three elevation-5 segments must be consolidated into a single segment: `[...,[2 3],[4 5],[12 7],...]`


**Diagram:**

```
Buildings: [[2,9,10], [3,7,15], [5,12,12], [15,20,10], [19,24,8]]

Height
  15 |    ████
  12 |    ████████
  10 | ████████    ██████
   8 | ████████    ████████
     |_________________________
       2  5  7 9 12  15  19 24

Skyline: [[2,10], [3,15], [7,12], [12,0], [15,10], [20,8], [24,0]]
```


## Why This Matters

This problem develops fundamental algorithmic thinking and problem-solving skills.

## Examples

**Example 1:**
- Input: `buildings = [[0,2,3],[2,5,3]]`
- Output: `[[0,3],[5,0]]`

## Constraints

- 1 <= buildings.length <= 10⁴
- 0 <= lefti < righti <= 2³¹ - 1
- 1 <= heighti <= 2³¹ - 1
- buildings is sorted by lefti in non-decreasing order.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>Key Insight</summary>
Process building edges (both start and end) as critical points where skyline height might change. At each critical point, track all active buildings and find the maximum height. A key point is added to result when the maximum height changes from the previous point.
</details>

<details>
<summary>Main Approach</summary>
1. Create events for each building: (left_x, -height, right_x) for start and (right_x, 0, 0) for end. Use negative height for starts to prioritize taller buildings when positions are equal. 2. Sort all events by x-coordinate. 3. Use a max heap to track active building heights. 4. For each event, add/remove heights from heap and check if max height changed. 5. Add (x, new_max_height) to result when height changes.
</details>

<details>
<summary>Optimization Tip</summary>
When multiple buildings start or end at the same x-coordinate, process all starts before ends to handle edge cases correctly. Use a multiset or heap that allows duplicates since multiple buildings can have the same height. When a building ends, remove its specific height instance from the active set.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n^2 * max_x) | O(max_x) | Check each x-coordinate, scan all buildings |
| Sweep Line + Heap | O(n log n) | O(n) | Sort events, maintain max heap of active heights |
| Optimal (Multiset) | O(n log n) | O(n) | Better for handling duplicates and removals |

## Common Mistakes

1. **Not handling equal x-coordinates correctly**
   ```python
   # Wrong: Random order when x-coordinates equal
   events.sort(key=lambda x: x[0])

   # Correct: Prioritize starts over ends, taller over shorter
   events.sort(key=lambda x: (x[0], x[1]))  # x[1] negative for starts
   ```

2. **Forgetting to remove building heights**
   ```python
   # Wrong: Only adding heights, never removing
   if is_start:
       heap.add(height)
   # Missing: removal when building ends

   # Correct: Track and remove ended buildings
   if is_end:
       active_heights.remove(height)
   ```

3. **Adding redundant key points**
   ```python
   # Wrong: Adding point even when height doesn't change
   result.append([x, max_height])

   # Correct: Only add when height actually changes
   if not result or max_height != result[-1][1]:
       result.append([x, max_height])
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Rectangle Area | Medium | Calculate area of overlapping rectangles |
| Meeting Rooms II | Medium | Find minimum rooms needed (similar sweep line) |
| Merge Intervals | Medium | Combine overlapping intervals |
| The Skyline Problem 3D | Hard | Add depth dimension to buildings |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Sweep Line Algorithm](../../strategies/patterns/sweep-line.md)
