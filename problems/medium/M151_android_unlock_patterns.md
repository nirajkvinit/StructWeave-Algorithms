---
id: M151
old_id: I150
slug: android-unlock-patterns
title: Android Unlock Patterns
difficulty: medium
category: medium
topics: ["backtracking", "combinatorics"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M020", "E046", "M077"]
prerequisites: ["backtracking", "depth-first-search", "symmetry", "memoization"]
---
# Android Unlock Patterns

## Problem

Think about the pattern lock on a smartphone screen - you've probably used one yourself. You have a `3 x 3` grid of dots numbered 1 through 9, and you draw a continuous path through these dots to create an unlock pattern. This problem asks you to count how many valid patterns are possible given certain constraints. An unlock pattern is **valid** when it follows two key rules: First, each dot can only be used once in the pattern (no backtracking to a dot you've already visited). Second, here's the tricky part: if you want to jump from one dot to another and the straight line between them passes directly through the center of a third dot, that intermediate dot must already be part of your pattern. For example, jumping from dot 1 to dot 3 requires that you've already visited dot 2, because the line from 1 to 3 goes right through 2's center. However, jumping from dot 2 to dot 9 is fine even if you haven't visited dot 5 or 6, because the connecting line doesn't pass through their centers. Here are some example valid and invalid unlock patterns:

**Android 3x3 Grid:**
```
1---2---3
|   |   |
4---5---6
|   |   |
7---8---9
```

**Example Patterns:**

Pattern `[4,1,3,6]` - INVALID
```
1 --X-- 3          (1→3 crosses 2, but 2 not selected yet)
|       |
4       6
```

Pattern `[4,1,9,2]` - INVALID
```
1       .
|       X          (1→9 crosses 5, but 5 not selected yet)
4   .   9---2
```

Pattern `[2,4,1,3,6]` - VALID
```
2---1---3          (1→3 OK because 2 already selected)
    |    \
    4     6
```

Pattern `[6,5,4,1,9,2]` - VALID
```
.   .   .
|   5---4---1      (1→9 OK because 5 already selected)
.       |   9---2
```

Given two integers `m` and `n`, your task is to calculate how many distinct valid unlock patterns exist that contain between `m` and `n` dots (inclusive). Two patterns are different if they include different dots or if the same dots appear in a different order. Edge cases to consider include single-dot patterns (always valid), patterns that try to skip across the grid diagonally, and ensuring you correctly identify which jumps require intermediate dots.

## Why This Matters

This problem directly models the security pattern lock feature found on Android devices and many smartphone lock screens, where users draw patterns to unlock their phones. Understanding the combinatorics here helps security engineers analyze pattern strength - for instance, patterns with more dots are exponentially more secure. Beyond mobile security, this problem teaches essential skills in constraint validation and backtracking that appear in game development (chess move validation, pathfinding with obstacles), robotics (motion planning where certain movements are restricted), and UI design (gesture recognition systems). The symmetry optimization technique you'll learn here is also crucial in computational biology for analyzing molecular structures and in computer graphics for reducing redundant calculations when rendering symmetric objects.

## Examples

**Example 1:**
- Input: `m = 1, n = 1`
- Output: `9`
- Explanation: Each individual dot forms a valid pattern of length 1.

**Example 2:**
- Input: `m = 1, n = 2`
- Output: `65`
- Explanation: This includes all 9 single-dot patterns plus all valid two-dot combinations.

## Constraints

- 1 <= m, n <= 9

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Identify the Crossing Rules</summary>
First, map out which dot pairs require an intermediate dot. For example, 1→3 requires 2, 1→7 requires 4, 1→9 requires 5. Not all jumps need an intermediate: 1→5, 1→6, 2→4 are direct. Create a lookup table for these crossing relationships.
</details>

<details>
<summary>🎯 Hint 2: Use Backtracking with Symmetry</summary>
Use DFS/backtracking to explore all valid patterns:
- Track visited dots using a boolean array or bitmask
- For each unvisited dot, check if move is valid (no crossing rule violated or intermediate dot already visited)
- Count patterns of length between m and n

Key optimization: The grid has symmetry. Patterns starting from corners (1,3,7,9) are symmetric, as are patterns from edges (2,4,6,8). Only compute once and multiply.
</details>

<details>
<summary>📝 Hint 3: Implementation Strategy</summary>
Algorithm:
1. Create skip map: skip[i][j] = intermediate dot between i and j (if any)
2. DFS function(current_dot, remaining_dots, visited):
   - If remaining_dots is in [0, n-m], increment count
   - If remaining_dots == 0, return
   - For each unvisited dot:
     - If no skip condition OR skip dot already visited:
       - Mark dot as visited, recurse, unmark
3. Use symmetry: count(1) × 4 + count(2) × 4 + count(5) × 1

The skip map captures crossing rules: skip[1][3]=2, skip[1][7]=4, skip[1][9]=5, etc.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force DFS | O(9!) | O(9) | Try all permutations, check validity |
| **DFS with Symmetry** | **O(9!)** worst case | **O(9)** | Prune invalid paths early, use symmetry to reduce by ~8x |
| Memoization | O(9! × 2⁹) | O(2⁹ × 9) | Cache (current_dot, visited_mask, length) |

## Common Mistakes

**Mistake 1: Not Handling Crossing Rules**
```python
# Wrong: Allows invalid jumps
def countPatterns(m, n):
    def dfs(current, length, visited):
        if length >= m:
            count = 1
        if length == n:
            return count

        for next_dot in range(1, 10):
            if next_dot not in visited:
                visited.add(next_dot)
                count += dfs(next_dot, length + 1, visited)
                visited.remove(next_dot)
        return count
    # Missing skip validation!
```

**Correct Approach:**
```python
# Correct: Validates crossing rules
def countPatterns(m, n):
    skip = {}
    skip[1,3] = skip[3,1] = 2
    skip[1,7] = skip[7,1] = 4
    skip[3,9] = skip[9,3] = 6
    skip[7,9] = skip[9,7] = 8
    skip[1,9] = skip[9,1] = 5
    skip[2,8] = skip[8,2] = 5
    skip[3,7] = skip[7,3] = 5
    skip[4,6] = skip[6,4] = 5

    def dfs(current, length, visited):
        if length >= m:
            count = 1
        else:
            count = 0
        if length == n:
            return count

        for next_dot in range(1, 10):
            if next_dot not in visited:
                # Check skip condition
                intermediate = skip.get((current, next_dot))
                if intermediate is None or intermediate in visited:
                    visited.add(next_dot)
                    count += dfs(next_dot, length + 1, visited)
                    visited.remove(next_dot)
        return count

    total = 0
    visited = set()
    for start in range(1, 10):
        visited.add(start)
        total += dfs(start, 1, visited)
        visited.remove(start)
    return total
```

**Mistake 2: Not Exploiting Symmetry**
```python
# Wrong: Computes all 9 starting positions separately
def countPatterns(m, n):
    total = 0
    for start in range(1, 10):
        total += dfs(start, 1, {start})
    return total
    # Could optimize 9x → ~2x by using symmetry
```

**Correct Approach:**
```python
# Correct: Use symmetry to reduce computation
def countPatterns(m, n):
    # ... skip map and dfs definition ...

    # Corners are symmetric: 1, 3, 7, 9
    total = dfs(1, 1, {1}) * 4
    # Edges are symmetric: 2, 4, 6, 8
    total += dfs(2, 1, {2}) * 4
    # Center is unique: 5
    total += dfs(5, 1, {5})

    return total
```

**Mistake 3: Off-by-One in Length Counting**
```python
# Wrong: Counts length incorrectly
def dfs(current, length, visited):
    count = 0
    if length > m and length < n:  # Wrong! Should be >= m and <= n
        count = 1
    # ...
```

## Variations

| Variation | Description | Key Difference |
|-----------|-------------|----------------|
| 4x4 Grid | Larger grid with 16 dots | More crossing rules, larger state space |
| Custom Grid | Non-rectangular or irregular layout | Different crossing logic |
| Minimum Security | Patterns must have length >= k | Change base case in DFS |
| Count Unique Patterns | Mirror/rotation counted as same | Normalize patterns before counting |
| Path Reconstruction | Return actual patterns, not just count | Store paths in DFS |

## Practice Checklist

- [ ] Day 1: Implement basic DFS with crossing validation
- [ ] Day 2: Optimize using symmetry
- [ ] Day 7: Add memoization for repeated subproblems
- [ ] Day 14: Solve 4x4 grid variation
- [ ] Day 30: Solve without looking at hints

**Strategy**: See [Backtracking Patterns](../strategies/patterns/backtracking.md)
