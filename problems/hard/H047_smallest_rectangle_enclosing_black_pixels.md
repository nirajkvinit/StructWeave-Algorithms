---
id: H047
old_id: I101
slug: smallest-rectangle-enclosing-black-pixels
title: Smallest Rectangle Enclosing Black Pixels
difficulty: hard
category: hard
topics: []
patterns: ["dp-2d"]
estimated_time_minutes: 45
---
# Smallest Rectangle Enclosing Black Pixels

## Problem

Consider a binary grid `image` with dimensions `m x n`, where each cell contains either `0` (representing white) or `1` (representing black).

All black cells form a single connected component, with connectivity defined through horizontal and vertical adjacency only.

You receive two coordinates `x` and `y` indicating the position of any black cell within this grid. Your task is to compute the area of the minimal axis-aligned bounding rectangle that contains every black cell in the image.

Your solution must achieve a runtime complexity better than `O(mn)`.


**Diagram:**

Example: Find smallest rectangle enclosing all black pixels (1)
```
Input grid (x=0, y=2):
┌───┬───┬───┬───┐
│ 0 │ 0 │ 1 │ 0 │ ← Black pixel at (0,2)
├───┼───┼───┼───┤
│ 0 │ 0 │ 1 │ 0 │ ← Black pixel at (1,2)
├───┼───┼───┼───┤
│ 0 │ 0 │ 1 │ 0 │ ← Black pixel at (2,2)
└───┴───┴───┴───┘

Smallest bounding rectangle:
┌───────────┐
│ top: 0    │
│ left: 2   │ ← Rectangle from (0,2) to (2,2)
│ bottom: 2 │
│ right: 2  │
└───────────┘
Area = (2-0+1) × (2-2+1) = 3 × 1 = 3

Visual representation:
┌───┬───┬═══┬───┐
│ 0 │ 0 ║ 1 ║ 0 │ ← Rectangle bounds
├───┼───╫───╫───┤
│ 0 │ 0 ║ 1 ║ 0 │
├───┼───╫───╫───┤
│ 0 │ 0 ║ 1 ║ 0 │
└───┴───╚═══╝───┘
```


## Why This Matters

This problem develops fundamental algorithmic thinking and problem-solving skills.

## Examples

**Example 1:**
- Input: `image = [["1"]], x = 0, y = 0`
- Output: `1`

## Constraints

- m == image.length
- n == image[i].length
- 1 <= m, n <= 100
- image[i][j] is either '0' or '1'.
- 0 <= x < m
- 0 <= y < n
- image[x][y] == '1'.
- The black pixels in the image only form **one component**.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>Key Insight</summary>
Since all black pixels form a connected component, the rectangle's boundaries are the minimum and maximum row/column indices containing black pixels. The key constraint is achieving better than O(mn) time, which suggests using binary search on rows and columns to find these boundaries instead of scanning everything.
</details>

<details>
<summary>Main Approach</summary>
Use binary search to find the four boundaries: topmost row, bottommost row, leftmost column, and rightmost column containing black pixels. For each boundary, binary search on the relevant dimension. For example, to find the leftmost column, binary search on columns and check if any row in that column has a '1'. The helper function checks a row or column in O(m) or O(n) time.
</details>

<details>
<summary>Optimization Tip</summary>
Since you're given a starting black pixel at (x, y), you know the boundaries must include this position. Use this to limit your binary search ranges: search [0, y] for leftmost column, [y, n-1] for rightmost column, [0, x] for topmost row, and [x, m-1] for bottommost row. This reduces the search space.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Scan All) | O(mn) | O(1) | Check every cell |
| DFS/BFS | O(mn) | O(mn) | Doesn't meet requirement |
| Binary Search on Boundaries | O(m log n + n log m) | O(1) | Binary search each dimension |
| Optimal | O(m log n + n log m) | O(1) | Four binary searches, best possible |

## Common Mistakes

1. **Using DFS/BFS Instead of Binary Search**
   ```python
   # Wrong: O(mn) complexity, violates constraint
   def minArea(self, image, x, y):
       visited = set()
       def dfs(r, c):
           if (r, c) in visited or image[r][c] == '0':
               return
           visited.add((r, c))
           # DFS to all neighbors

   # Correct: Use binary search
   def minArea(self, image, x, y):
       m, n = len(image), len(image[0])
       left = self.searchColumns(image, 0, y, True)
       right = self.searchColumns(image, y, n - 1, False)
       # Similar for top and bottom
   ```

2. **Incorrect Binary Search Boundaries**
   ```python
   # Wrong: Doesn't account for inclusive/exclusive boundaries
   def searchColumns(self, image, start, end):
       while start < end:
           mid = (start + end) // 2
           if self.hasBlack(image, mid, True):
               end = mid
           else:
               start = mid

   # Correct: Handle boundaries correctly
   def searchColumns(self, image, start, end, searchLeft):
       while start < end:
           mid = (start + end) // 2
           if self.hasBlackInColumn(image, mid):
               if searchLeft:
                   end = mid
               else:
                   start = mid + 1
           else:
               if searchLeft:
                   start = mid + 1
               else:
                   end = mid
       return start if searchLeft else end
   ```

3. **Inefficient Helper Function**
   ```python
   # Wrong: Checks entire grid each time
   def hasBlack(self, image, index, isColumn):
       for i in range(len(image)):
           for j in range(len(image[0])):
               if image[i][j] == '1':
                   return True

   # Correct: Only check relevant row or column
   def hasBlackInColumn(self, image, col):
       for row in range(len(image)):
           if image[row][col] == '1':
               return True
       return False
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Number of Islands | Medium | Find count of connected components |
| Max Area of Island | Medium | Find largest connected component area |
| Image Smoother | Easy | Apply filter to image |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Binary Search Pattern](../../strategies/patterns/binary-search.md)
