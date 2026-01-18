---
id: M389
old_id: A231
slug: largest-plus-sign
title: Largest Plus Sign
difficulty: medium
category: medium
topics: ["matrix"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
---
# Largest Plus Sign

## Problem

Imagine a grid filled with 1s, except for some "mine" positions that contain 0s. Your task is to find the largest plus sign (+) made entirely of 1s.

Start with an `n x n` grid where every cell is `1`. Then you're given a list of `mines` - positions where the value is `0` instead. For example, `mines = [[4,2]]` means the cell at row 4, column 2 is `0`.

A **plus sign of size k** is defined as:
- A center cell containing `1` at position `[r, c]`
- Four arms extending from the center (up, down, left, right)
- Each arm has exactly `k - 1` consecutive `1`s

For example, a plus sign of size 2 looks like this:
```
  1      (1 cell up)
1 1 1    (center with 1 left and 1 right)
  1      (1 cell down)
```
This has a center plus 1 cell in each direction (1+1 = size 2).

A plus sign of size 3 would have a center plus 2 cells in each direction:
```
    1
    1
1 1 1 1 1
    1
    1
```

Your task: Find the **size** of the largest plus sign that can fit in the grid (considering the mines). If no plus sign is possible (like if the entire grid is mines, or n=1 with a mine at [0,0]), return 0.

Important: Only the cells forming the plus need to be `1`. Diagonal cells or cells beyond the arms don't matter.


**Diagram:**

```
Example 1: n=5, mines=[[4,2]]
Grid (0 at mines positions, 1 elsewhere):

  0 1 2 3 4
0 1 1 1 1 1
1 1 1 1 1 1
2 1 1 1 1 1
3 1 1 1 1 1
4 1 1 0 1 1

Largest plus sign (size 2, center at [2,2]):
    |
  - 1 -
    |

  0 1 2 3 4
0 1 1 1 1 1
1 1 1 ↑ 1 1
2 1 ← 1 → 1
3 1 1 ↓ 1 1
4 1 1 0 1 1

Arms extend 1 cell in each direction from center.

Example 2: n=1, mines=[[0,0]]
Grid:
  0
0 0

No plus sign possible, return 0.
```


## Why This Matters

This problem teaches multi-directional dynamic programming, a technique essential for image processing, game development, and spatial analysis. The pattern of computing "how far can I extend in each direction" appears in computer vision (detecting shapes), game AI (line-of-sight calculations), and GIS systems (analyzing terrain features). The optimization of tracking four directional constraints simultaneously is common in grid-based algorithms like pathfinding, flood fill, and pattern recognition. This builds foundational skills for 2D DP problems that are frequent in technical interviews and real-world spatial computing applications.

## Constraints

- 1 <= n <= 500
- 1 <= mines.length <= 5000
- 0 <= xi, yi < n
- All the pairs (xi, yi) are **unique**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
For each cell, the maximum plus sign size is limited by the minimum arm length in all four directions (up, down, left, right). Precompute consecutive 1's extending in each direction.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use dynamic programming to track consecutive 1's from each direction. For each cell, compute four values: left arm length, right arm length, up arm length, and down arm length. The plus size at that cell is the minimum of these four values.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Instead of creating four separate 2D arrays, use a single 2D array and update it incrementally in four passes (left-to-right, right-to-left, top-to-bottom, bottom-to-top), keeping the running minimum at each position.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n³) | O(1) | Check all cells, expand in 4 directions |
| Optimal | O(n²) | O(n²) | Four directional passes with DP |

## Common Mistakes

1. **Forgetting to Handle Mines**
   ```python
   # Wrong: Not resetting count at mine positions
   for j in range(n):
       dp[i][j] = dp[i][j-1] + 1 if j > 0 else 1

   # Correct: Reset count when encountering a mine
   for j in range(n):
       if (i, j) in mines:
           dp[i][j] = 0
       else:
           dp[i][j] = dp[i][j-1] + 1 if j > 0 else 1
   ```

2. **Not Taking Minimum Across All Directions**
   ```python
   # Wrong: Only checking two directions
   plus_size = min(left[i][j], up[i][j])

   # Correct: Check all four directions
   plus_size = min(left[i][j], right[i][j], up[i][j], down[i][j])
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Maximal Square | Medium | Finding largest square of 1's instead of plus |
| Count Square Submatrices | Medium | Counting all squares instead of finding maximum |
| Number of Islands | Medium | Connected components instead of geometric shapes |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [2D Dynamic Programming](../../strategies/patterns/dp-2d.md)
