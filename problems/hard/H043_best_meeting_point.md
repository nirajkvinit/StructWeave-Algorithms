---
id: H043
old_id: I095
slug: best-meeting-point
title: Best Meeting Point
difficulty: hard
category: hard
topics: ["matrix"]
patterns: ["dp-2d"]
estimated_time_minutes: 45
---
# Best Meeting Point

## Problem

You have an `m x n` binary grid `grid` where each `1` indicates a friend's residence. Find *the smallest **total travel distance*** for all friends to meet at an optimal location.

The **total travel distance** equals the sum of distances from each friend's house to the chosen meeting location.

Distance is measured using <a href="http://en.wikipedia.org/wiki/Taxicab_geometry" target="_blank">Manhattan Distance, calculated as `distance(p1, p2) = |p2.x - p1.x| + |p2.y - p1.y|`.


**Diagram:**

Example: Find best meeting point for friends
```
Grid with friend locations (1):
┌───┬───┬───┐
│ 1 │ 0 │ 0 │ ← Friend at (0,0)
├───┼───┼───┤
│ 0 │ 0 │ 0 │
├───┼───┼───┤
│ 0 │ 0 │ 1 │ ← Friend at (2,2)
└───┴───┴───┘

Best meeting point: (1,1) - center
Total distance = |0-1| + |0-1| + |2-1| + |2-1| = 1 + 1 + 1 + 1 = 4

Alternative meeting at (0,0):
Distance = 0 + |2-0| + |2-0| = 4
Meeting at (2,2):
Distance = |0-2| + |0-2| + 0 = 4

For grid [[1,0,0,0,1],[0,0,0,0,0],[0,0,1,0,0]]:
┌───┬───┬───┬───┬───┐
│ 1 │ 0 │ 0 │ 0 │ 1 │ ← Friends at (0,0) and (0,4)
├───┼───┼───┼───┼───┤
│ 0 │ 0 │ 0 │ 0 │ 0 │
├───┼───┼───┼───┼───┤
│ 0 │ 0 │ 1 │ 0 │ 0 │ ← Friend at (2,2)
└───┴───┴───┴───┴───┘
Best meeting: (0,2) with minimum total distance = 6
```


## Why This Matters

2D arrays model grids, images, and spatial data. This problem develops your ability to navigate multi-dimensional structures.

## Examples

**Example 1:**
- Input: `grid = [[1,1]]`
- Output: `1`

## Constraints

- m == grid.length
- n == grid[i].length
- 1 <= m, n <= 200
- grid[i][j] is either 0 or 1.
- There will be **at least two** friends in the grid.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>Key Insight</summary>
Manhattan distance allows you to decompose the 2D problem into two independent 1D problems: minimizing distance in the x-direction and y-direction separately. The best meeting point in 1D is the median of all coordinates, which minimizes the sum of absolute differences.
</details>

<details>
<summary>Main Approach</summary>
Collect all x-coordinates and y-coordinates of friends separately. Sort each list. The optimal meeting point is at the median of x-coordinates and median of y-coordinates. Calculate the total Manhattan distance by summing distances in both dimensions independently. This works because Manhattan distance is |x1-x2| + |y1-y2|, separable into x and y components.
</details>

<details>
<summary>Optimization Tip</summary>
You don't need to find the actual meeting point coordinates. Instead, calculate the sum of distances directly by iterating through sorted coordinates. For a sorted list, the total distance is the sum of differences between elements in the upper half and lower half, which can be computed in linear time without finding the median explicitly.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(m²n² × k) | O(1) | Try every cell as meeting point, k = number of friends |
| BFS from All Friends | O(mn × k) | O(mn) | Run BFS from each friend, sum distances |
| Optimal (Median) | O(mn + k log k) | O(k) | Collect coordinates, sort, find median |
| Optimal (No Sorting) | O(mn) | O(k) | Collect coordinates in sorted order from grid |

## Common Mistakes

1. **Computing Euclidean Distance Instead of Manhattan**
   ```python
   # Wrong: Uses Euclidean distance
   distance = sqrt((x1-x2)**2 + (y1-y2)**2)

   # Correct: Use Manhattan distance
   distance = abs(x1-x2) + abs(y1-y2)
   ```

2. **Not Separating X and Y Dimensions**
   ```python
   # Wrong: Tries to find 2D median directly
   meeting_point = find_2d_median(points)

   # Correct: Handle dimensions independently
   x_coords = sorted([x for x, y in points])
   y_coords = sorted([y for x, y in points])
   median_x = x_coords[len(x_coords)//2]
   median_y = y_coords[len(y_coords)//2]
   ```

3. **Inefficient Distance Calculation**
   ```python
   # Wrong: Recomputes median for every friend
   total = sum(abs(friend[0] - median_x) + abs(friend[1] - median_y)
               for friend in friends)

   # Correct: Use sorted coordinates for O(n) calculation
   total = 0
   for i in range(len(x_coords)):
       total += x_coords[i] - x_coords[len(x_coords) - i - 1]
   # Similar for y_coords
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Best Meeting Point (Weighted) | Hard | Different friends have different travel costs |
| Minimize Maximum Distance | Hard | Minimize the longest distance any friend travels |
| K Meeting Points | Hard | Find k locations to minimize total distance |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Math & Geometry](../../strategies/patterns/math-geometry.md)
