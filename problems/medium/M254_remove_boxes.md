---
id: M254
old_id: A043
slug: remove-boxes
title: Remove Boxes
difficulty: medium
category: medium
topics: ["array", "dynamic-programming", "memoization"]
patterns: ["dp-3d", "memoization", "interval-dp"]
estimated_time_minutes: 30
frequency: low
related_problems:
  - H312_burst_balloons.md
  - M546_remove_boxes.md
  - M375_guess_number_higher_or_lower_ii.md
prerequisites:
  - dynamic programming (intervals)
  - memoization/top-down DP
  - 3D DP states
---
# Remove Boxes

## Problem

Given an array of colored boxes (represented by positive integers where each number is a color), remove all boxes to maximize your score. In each move, select a contiguous group of boxes with the same color and remove them, earning points equal to k squared, where k is the number of boxes in that group.

For example, if you have three consecutive red boxes and remove them together, you earn 3 × 3 = 9 points. If you remove them one at a time, you only earn 1 + 1 + 1 = 3 points. This scoring system creates a crucial insight: it's often better to remove boxes in the middle first to merge same-colored boxes that aren't currently adjacent.

Consider the array [1,3,2,2,2,3,4,3,1]. A greedy approach might remove the three consecutive 2s first for 9 points, but the optimal strategy removes boxes strategically to merge the 3s together. By removing the middle boxes, you can combine separated same-colored boxes into larger groups, maximizing your score.

This problem requires 3D dynamic programming because you need to track not just the current subarray interval [i,j], but also how many additional boxes of the same color exist to the right that could potentially be merged. The state is dp[i][j][k], representing the maximum points from boxes i to j, where k additional boxes of the same color as box j exist immediately to the right.

The greedy approach fails here because local optimal choices don't lead to global optimal solutions. You must consider whether removing boxes now or later will create better merging opportunities.

## Why This Matters

This problem teaches advanced interval dynamic programming with non-obvious state dimensions, a pattern that appears in game theory problems, resource allocation, and optimization challenges. The same 3D DP technique applies to problems like "Burst Balloons" and other scenarios where future choices depend on both position and accumulated context. Mastering this problem builds your ability to identify when standard 2D DP is insufficient and an additional dimension captures critical state. It's rarely asked in interviews due to its difficulty, but understanding it deepens your DP intuition significantly.

## Examples

**Example 1:**
- Input: `boxes = [1,3,2,2,2,3,4,3,1]`
- Output: `23`
- Explanation: [1, 3, 2, 2, 2, 3, 4, 3, 1]
----> [1, 3, 3, 4, 3, 1] (3*3=9 points)
----> [1, 3, 3, 3, 1] (1*1=1 points)
----> [1, 1] (3*3=9 points)
----> [] (2*2=4 points)

**Example 2:**
- Input: `boxes = [1,1,1]`
- Output: `9`

**Example 3:**
- Input: `boxes = [1]`
- Output: `1`

## Constraints

- 1 <= boxes.length <= 100
- 1 <= boxes[i] <= 100

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: The Greedy Approach Fails</summary>

You might think: "Always remove the longest consecutive sequence for maximum points." However, this is suboptimal.

Example: [1,3,2,2,2,3,4,3,1]

Greedy (remove 2,2,2 first): 9 + ... = 18 total
Optimal (remove middle 3 first, merge the 3s): 23 total

The key insight: Sometimes it's better to remove boxes in the middle first to merge boxes of the same color, even if they're not currently consecutive. This suggests we need dynamic programming with memoization.
</details>

<details>
<summary>Hint 2: Define State with Three Parameters</summary>

The DP state needs to track more than just the remaining interval. Define:

`dp[i][j][k]` = maximum points from boxes[i..j] where we have k additional boxes of the same color as boxes[j] to the right.

Base case: `dp[i][i][k] = (k+1) * (k+1)` (we have 1 + k boxes of the same color)

The extra parameter `k` allows us to account for boxes that might be merged later, which is crucial for optimal solutions.
</details>

<details>
<summary>Hint 3: Try Two Strategies - Merge or Remove</summary>

For `dp[i][j][k]`, we have two choices:

1. **Remove boxes[j] immediately**: Get `(k+1)²` points and solve `dp[i][j-1][0]`

2. **Merge with earlier boxes of same color**: If boxes[m] == boxes[j] for some `m` in `[i, j-1]`, we can:
   - Remove boxes[m+1..j-1] first
   - Merge boxes[m] with boxes[j] (and the k boxes after j)
   - This gives: `dp[i][m][k+1] + dp[m+1][j-1][0]`

Take the maximum of all possibilities!

```python
dp[i][j][k] = max(
    (k+1)**2 + dp[i][j-1][0],  # Remove j immediately
    max(dp[i][m][k+1] + dp[m+1][j-1][0]  # Merge with earlier boxes
        for m in range(i, j) if boxes[m] == boxes[j])
)
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Greedy (Wrong) | O(n²) | O(1) | Fails to find optimal solution |
| Brute Force Recursion | O(n!) | O(n) | Explores all removal orders - too slow |
| 3D DP with Memoization | O(n⁴) | O(n³) | Optimal solution; n³ states, O(n) per state |
| Bottom-up 3D DP | O(n⁴) | O(n³) | Same as memoization but iterative |

## Common Mistakes

### Mistake 1: Using 2D DP Instead of 3D
```python
# Wrong: Missing the 'k' parameter for additional boxes
def removeBoxes(boxes):
    n = len(boxes)
    memo = {}

    def dp(i, j):
        if i > j:
            return 0
        if (i, j) in memo:
            return memo[(i, j)]

        # This doesn't account for merging opportunities!
        result = 1 + dp(i+1, j)
        memo[(i, j)] = result
        return result

# Correct: Use 3D state dp[i][j][k]
def removeBoxes(boxes):
    n = len(boxes)
    memo = {}

    def dp(i, j, k):
        if i > j:
            return 0
        if (i, j, k) in memo:
            return memo[(i, j, k)]

        # Count consecutive boxes same as boxes[j]
        while j > i and boxes[j] == boxes[j-1]:
            j -= 1
            k += 1

        # Option 1: remove boxes[j] and its k duplicates
        result = (k+1) ** 2 + dp(i, j-1, 0)

        # Option 2: merge with earlier boxes of same color
        for m in range(i, j):
            if boxes[m] == boxes[j]:
                result = max(result,
                           dp(i, m, k+1) + dp(m+1, j-1, 0))

        memo[(i, j, k)] = result
        return result

    return dp(0, len(boxes)-1, 0)
```

### Mistake 2: Not Optimizing Consecutive Duplicates
```python
# Inefficient: Processes each duplicate separately
def dp(i, j, k):
    if i > j:
        return 0
    # ... memoization check

    result = (k+1) ** 2 + dp(i, j-1, 0)
    for m in range(i, j):
        if boxes[m] == boxes[j]:
            result = max(result, dp(i, m, k+1) + dp(m+1, j-1, 0))
    return result

# Better: Merge consecutive duplicates first
def dp(i, j, k):
    if i > j:
        return 0
    # ... memoization check

    # Merge consecutive boxes same as boxes[j]
    while j > i and boxes[j] == boxes[j-1]:
        j -= 1
        k += 1

    result = (k+1) ** 2 + dp(i, j-1, 0)
    for m in range(i, j):
        if boxes[m] == boxes[j]:
            result = max(result, dp(i, m, k+1) + dp(m+1, j-1, 0))
    return result
```

### Mistake 3: Incorrect Base Case
```python
# Wrong: Doesn't account for k additional boxes
def dp(i, j, k):
    if i == j:
        return 1  # Wrong! Should be (k+1)²
    # ...

# Correct: Include k in base case calculation
def dp(i, j, k):
    if i > j:
        return 0
    if i == j:
        return (k + 1) ** 2  # 1 box + k additional boxes
    # ...
```

## Variations

| Variation | Difference | Complexity Impact |
|-----------|------------|-------------------|
| Different Scoring | Points = k instead of k² | Same approach, different formula |
| Remove K Consecutive | Must remove exactly k boxes at once | Add constraint checking |
| Circular Array | Last box adjacent to first box | Handle wrap-around in DP |
| 2D Grid Removal | Remove rows/columns in a grid | 5D DP or more complex state |

## Practice Checklist

Track your progress with spaced repetition:

- [ ] First attempt (understand why greedy fails)
- [ ] Implement 3D DP with memoization
- [ ] Add optimization for consecutive duplicates
- [ ] Trace through Example 1 manually
- [ ] After 2 days: Solve without hints
- [ ] After 1 week: Solve in under 30 minutes
- [ ] Before interview: Explain the 3D state clearly

**Strategy**: See [Interval DP Pattern](../strategies/patterns/interval-dp.md) and [3D DP Pattern](../strategies/patterns/dp-3d.md)
