---
id: M050
old_id: F120
slug: triangle
title: Triangle
difficulty: medium
category: medium
topics: ["dynamic-programming", "array"]
patterns: ["bottom-up-dp", "space-optimization"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E746", "M064", "M120"]
prerequisites: ["dynamic-programming", "array-manipulation"]
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Triangle

## Problem

Given a triangle represented as a list of lists (where row i has i+1 elements), find the minimum sum along any path from the top to the bottom. At each step moving down the triangle, you can move to an adjacent number in the row below. "Adjacent" means you can move from position j in row i to either position j or position j+1 in row i+1.

This is a classic dynamic programming problem with a particularly elegant bottom-up solution. While you could track minimum paths from the top downward, processing from bottom to top is cleaner: each position simply adds itself to the minimum of the two adjacent positions below it. By working upward, you naturally merge paths without needing to track which positions are reachable from above. The algorithm can be done in-place by modifying the input triangle, achieving O(1) extra space, or with a separate DP array if you need to preserve the input. A key insight is that the triangle structure guarantees you'll never go out of bounds: when at position j, positions j and j+1 in the next row always exist. Edge cases include single-element triangles, handling negative numbers correctly (using min not max), and ensuring your loop bounds stop before the last row since that's your base case.

## Why This Matters

Minimum path sum problems are fundamental to understanding dynamic programming and appear throughout computer science. This specific triangle structure models decision trees where each choice leads to a new set of options, such as in financial planning (choosing investments at each period), resource allocation (distributing budget across stages), or game strategy (selecting moves that open up future possibilities). The bottom-up approach teaches a crucial DP insight: sometimes working backward from the goal is simpler than working forward from the start, because base cases are clearer and state dependencies are more natural. The space optimization (in-place modification) demonstrates that you don't always need a separate DP table when you can reuse the input structure. This problem is excellent interview material because it's simple enough to solve in 15 minutes but rich enough to discuss multiple approaches, space optimizations, and the general principle of choosing your DP direction wisely. The triangle shape also makes it visually intuitive, helping interviewers assess your ability to translate a geometric problem into algorithmic logic.

## Examples

**Example 1:**
- Input: `triangle = [[2],[3,4],[6,5,7],[4,1,8,3]]`
- Output: `11`
- Explanation: The triangle looks like:
   2
  3 4
 6 5 7
4 1 8 3
The minimum path sum from top to bottom is 2 + 3 + 5 + 1 = 11 (underlined above).

**Example 2:**
- Input: `triangle = [[-10]]`
- Output: `-10`

## Constraints

- 1 <= triangle.length <= 200
- triangle[0].length == 1
- triangle[i].length == triangle[i - 1].length + 1
- -10⁴ <= triangle[i][j] <= 10⁴

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Top-Down vs Bottom-Up</summary>

From any position, you can only move to adjacent positions in the row below. Think about whether it's easier to track the minimum path from top to each position, or from each position to the bottom. Which direction eliminates the need to track multiple states?

</details>

<details>
<summary>🎯 Hint 2: Dynamic Programming Choice</summary>

At each position [i][j], the minimum path sum depends only on the adjacent positions in the next row below. If you process from bottom to top, each position only needs the minimum of two choices from the row below. Can you modify the triangle in-place to save space?

</details>

<details>
<summary>📝 Hint 3: Bottom-Up Algorithm</summary>

**Pseudocode approach:**
1. Start from the second-to-last row
2. For each position [i][j], add the minimum of:
   - triangle[i+1][j] (down-left)
   - triangle[i+1][j+1] (down-right)
3. Store result back in triangle[i][j]
4. Move up one row and repeat
5. The top element will contain the minimum path sum

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force DFS | O(2^n) | O(n) | Explores all paths, exponential time |
| Top-Down DP with Memo | O(n²) | O(n²) | n² states, each computed once |
| Bottom-Up DP (extra array) | O(n²) | O(n²) | Cleaner but uses extra space |
| **Bottom-Up DP (in-place)** | **O(n²)** | **O(1)** | Optimal - modifies input triangle |
| Bottom-Up with 1D array | O(n²) | O(n) | Good compromise if can't modify input |

## Common Mistakes

### 1. Starting from Top Instead of Bottom
```python
# WRONG: Top-down requires tracking multiple paths
def minimumTotal(triangle):
    # At each position, need to remember best path to both children
    # Complex state management
    for i in range(len(triangle)):
        for j in range(len(triangle[i])):
            # Which parent had minimum? Need to track...
            pass

# CORRECT: Bottom-up naturally merges paths
def minimumTotal(triangle):
    for i in range(len(triangle) - 2, -1, -1):
        for j in range(len(triangle[i])):
            triangle[i][j] += min(triangle[i+1][j], triangle[i+1][j+1])
    return triangle[0][0]
```

### 2. Off-by-One Errors with Indices
```python
# WRONG: Accessing out of bounds
def minimumTotal(triangle):
    for i in range(len(triangle) - 1):
        for j in range(len(triangle[i])):
            # triangle[i+1][j+1] may be out of bounds!
            triangle[i][j] += min(triangle[i+1][j], triangle[i+1][j+1])

# CORRECT: Start from second-to-last row
def minimumTotal(triangle):
    for i in range(len(triangle) - 2, -1, -1):  # Stop before last row
        for j in range(len(triangle[i])):
            triangle[i][j] += min(triangle[i+1][j], triangle[i+1][j+1])
    return triangle[0][0]
```

### 3. Not Considering Negative Numbers
```python
# WRONG: Assuming we want maximum path
def minimumTotal(triangle):
    for i in range(len(triangle) - 2, -1, -1):
        for j in range(len(triangle[i])):
            triangle[i][j] += max(triangle[i+1][j], triangle[i+1][j+1])  # Wrong!
    return triangle[0][0]

# CORRECT: Use min for minimum path sum
# Also works with negative numbers
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Maximum Path Sum | Find max instead of min | Change `min()` to `max()` in DP transition |
| Count All Paths | Count paths, not sum | Track count instead of minimum value |
| Path Reconstruction | Return actual path | Track parent pointers or rebuild from DP table |
| 2D Grid (not triangle) | Full rectangular grid | Similar DP but four directions instead of two |
| Cannot Modify Input | Must preserve triangle | Use separate DP array (O(n) or O(n²) space) |

## Practice Checklist

- [ ] Handles single-element triangle
- [ ] Can explain bottom-up approach in 2 min
- [ ] Can code in-place solution in 15 min
- [ ] Can discuss space optimization techniques
- [ ] Understands why bottom-up is simpler than top-down

**Spaced Repetition:** Day 1 → 3 → 7 → 14 → 30

---

**Strategy**: See [Dynamic Programming Patterns](../../strategies/patterns/dynamic-programming.md)
