---
id: H031
old_id: F174
slug: dungeon-game
title: Dungeon Game
difficulty: hard
category: hard
topics: ["matrix"]
patterns: ["dp-2d"]
estimated_time_minutes: 45
---
# Dungeon Game

## Problem

Find minimum initial health for a knight to rescue a princess in a dungeon grid.

**Diagram:**

```
Dungeon grid example:
┌─────┬─────┬─────┐
│ -2  │ -3  │  3  │  (K = Knight starts here)
├─────┼─────┼─────┤
│ -5  │-10  │  1  │
├─────┼─────┼─────┤
│ 10  │ 30  │ -5  │  (P = Princess is here)
└─────┴─────┴─────┘

Knight moves from top-left to bottom-right.
Negative values reduce health, positive values increase health.
Find minimum initial health needed to reach princess.
```


## Why This Matters

2D arrays model grids, images, and spatial data. This problem develops your ability to navigate multi-dimensional structures.

## Examples

**Example 1:**
- Input: `dungeon = [[0]]`
- Output: `1`

## Constraints

- m == dungeon.length
- n == dungeon[i].length
- 1 <= m, n <= 200
- -1000 <= dungeon[i][j] <= 1000

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>Key Insight</summary>
Unlike typical path problems, you must work backwards from the destination. The knight's health at any cell depends on what happens next, not what happened before. The minimum health needed at the end is 1 (to stay alive).
</details>

<details>
<summary>Main Approach</summary>
Use dynamic programming starting from the bottom-right (princess location). For each cell, calculate the minimum health needed to reach the princess. Health requirement = max(1, min_health_needed_in_next_cell - current_cell_value). Work backwards row by row and column by column.
</details>

<details>
<summary>Optimization Tip</summary>
Handle positive and negative values carefully. If entering a cell with positive value reduces health requirement below 1, you still need at least 1 health to be alive. Use max(1, requirement) at each step.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (All Paths) | O(2^(m+n)) | O(m+n) | Try all possible paths recursively |
| Optimal (Bottom-up DP) | O(m*n) | O(m*n) | Can optimize to O(min(m,n)) using rolling array |

## Common Mistakes

1. **Working forward instead of backward**
   ```python
   # Wrong: Forward DP doesn't account for future requirements
   dp[i][j] = max(dp[i-1][j], dp[i][j-1]) + dungeon[i][j]

   # Correct: Backward DP from destination
   dp[i][j] = max(1, min(dp[i+1][j], dp[i][j+1]) - dungeon[i][j])
   ```

2. **Forgetting minimum health constraint**
   ```python
   # Wrong: Health can't be zero or negative
   min_health = next_health - current_cell

   # Correct: Must maintain at least 1 health
   min_health = max(1, next_health - current_cell)
   ```

3. **Incorrect initialization of destination cell**
   ```python
   # Wrong: Not accounting for destination value
   dp[m-1][n-1] = dungeon[m-1][n-1]

   # Correct: Need enough health to survive destination
   dp[m-1][n-1] = max(1, 1 - dungeon[m-1][n-1])
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Minimum Path Sum | Medium | Find minimum cost path (no health constraint) |
| Unique Paths II | Medium | Count paths with obstacles |
| Cherry Pickup | Hard | Two simultaneous paths with optimization |
| Maximum Path Quality | Hard | Path with time limit and values |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [2D Dynamic Programming](../../strategies/patterns/dp-2d.md)
