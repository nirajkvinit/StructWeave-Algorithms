---
id: M118
old_id: I078
slug: perfect-squares
title: Perfect Squares
difficulty: medium
category: medium
topics: ["dynamic-programming", "math", "bfs"]
patterns: ["dp-1d", "bfs"]
estimated_time_minutes: 30
frequency: high
related_problems: ["M119", "M126", "E258"]
prerequisites: ["dynamic-programming", "bfs", "mathematical-properties"]
---
# Perfect Squares

## Problem

For a given integer `n`, determine the minimum count of perfect square numbers needed to sum up to `n`. A perfect square is a whole number that results from multiplying an integer by itself: 1, 4, 9, 16, 25, etc. For example, 12 can be expressed as 4+4+4 (three perfect squares), which is minimal—you can't do it with fewer. The number 13 needs only two: 4+9. This problem is related to Lagrange's four-square theorem, which proves that every positive integer can be expressed as the sum of at most four perfect squares, but finding the actual minimum for a specific number requires careful exploration. You're essentially finding the shortest path to reach `n` starting from 0, where each step can jump by any perfect square value (1, 4, 9, 16, ...). This can be solved with dynamic programming (building up from smaller numbers) or breadth-first search (exploring level by level).

## Why This Matters

Perfect square decomposition appears in computer graphics when calculating pixel distances using squared Euclidean norms, avoiding expensive square root operations. Number theory applications include analyzing which integers can be represented as sums of squares, relevant to cryptographic algorithms and prime factorization. Dynamic programming optimization teaches you to recognize problems where the solution builds on solutions to smaller subproblems. Resource allocation systems use similar min-count decomposition when breaking down budgets into standard denomination chunks. This problem demonstrates the coin change pattern, a foundational DP technique that extends to making change with minimum coins, partitioning sets optimally, and any scenario where you're minimizing the count of elements that sum to a target.

## Examples

**Example 1:**
- Input: `n = 12`
- Output: `3`
- Explanation: 12 = 4 + 4 + 4.

**Example 2:**
- Input: `n = 13`
- Output: `2`
- Explanation: 13 = 4 + 9.

## Constraints

- 1 <= n <= 10⁴

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

Think of this as finding the shortest path to reach `n` from `0`. Each step can jump by any perfect square value. This frames the problem as either a graph traversal or an optimization problem.

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

Consider two main approaches: (1) Dynamic Programming where `dp[i]` represents the minimum count for number `i`, or (2) BFS where each level represents using one more perfect square. For DP, think about how `dp[i-j*j]` relates to `dp[i]`.

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

**DP Approach:**
1. Create array `dp` where `dp[i]` = minimum squares to sum to `i`
2. Initialize `dp[0] = 0`
3. For each number `i` from 1 to n:
   - For each perfect square `j*j` where `j*j <= i`:
     - Update `dp[i] = min(dp[i], dp[i - j*j] + 1)`
4. Return `dp[n]`

**BFS Approach:**
1. Use queue starting with `n`
2. For each number, try subtracting all perfect squares
3. First time you reach 0, return the level count

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force Recursion | O(√n^n) | O(n) | Exponential, tries all combinations |
| **DP Bottom-Up** | **O(n × √n)** | **O(n)** | Optimal, fills array once |
| BFS | O(n × √n) | O(n) | Similar time, explores level by level |
| Mathematical (Lagrange) | O(√n) | O(1) | Based on four-square theorem, complex implementation |

## Common Mistakes

### Mistake 1: Not considering all perfect squares up to current number

**Wrong:**
```python
def numSquares(n):
    dp = [float('inf')] * (n + 1)
    dp[0] = 0
    # Only checking up to sqrt(n) once
    for j in range(1, int(n**0.5) + 1):
        dp[j*j] = 1
    return dp[n]  # Wrong: doesn't build on previous results
```

**Correct:**
```python
def numSquares(n):
    dp = [float('inf')] * (n + 1)
    dp[0] = 0
    # For each number, check all perfect squares
    for i in range(1, n + 1):
        j = 1
        while j * j <= i:
            dp[i] = min(dp[i], dp[i - j*j] + 1)
            j += 1
    return dp[n]
```

### Mistake 2: Inefficient BFS without visited set

**Wrong:**
```python
def numSquares(n):
    queue = [(n, 0)]
    while queue:
        num, steps = queue.pop(0)
        # May visit same number multiple times
        for i in range(1, int(num**0.5) + 1):
            next_num = num - i*i
            if next_num == 0:
                return steps + 1
            queue.append((next_num, steps + 1))
```

**Correct:**
```python
def numSquares(n):
    if n < 2:
        return n

    queue = [n]
    visited = {n}
    level = 0

    while queue:
        level += 1
        next_queue = []
        for num in queue:
            for i in range(1, int(num**0.5) + 1):
                next_num = num - i*i
                if next_num == 0:
                    return level
                if next_num not in visited:
                    visited.add(next_num)
                    next_queue.append(next_num)
        queue = next_queue
```

### Mistake 3: Greedy approach choosing largest squares first

**Wrong:**
```python
def numSquares(n):
    # Greedy: always pick largest square
    count = 0
    while n > 0:
        sqrt = int(n**0.5)
        n -= sqrt * sqrt
        count += 1
    return count  # Fails for n=12: picks 9,1,1,1 instead of 4,4,4
```

**Correct:**
```python
def numSquares(n):
    # Must consider all combinations, not greedy
    dp = [float('inf')] * (n + 1)
    dp[0] = 0
    for i in range(1, n + 1):
        for j in range(1, int(i**0.5) + 1):
            dp[i] = min(dp[i], dp[i - j*j] + 1)
    return dp[n]
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Perfect Cubes | Find minimum perfect cubes to sum to n | Medium |
| Coin Change | Replace perfect squares with arbitrary denominations | Medium |
| Print Sequence | Return actual perfect squares used, not just count | Medium |
| k-th Power Sum | Generalize to k-th powers instead of squares | Hard |
| Count All Ways | Count distinct ways to sum to n using perfect squares | Hard |

## Practice Checklist

- [ ] Solve using DP bottom-up approach
- [ ] Solve using BFS approach
- [ ] Optimize space if possible
- [ ] Handle edge cases (n=0, n=1, perfect square inputs)
- [ ] **Day 3**: Re-solve without looking at solution
- [ ] **Week 1**: Solve variation (Perfect Cubes)
- [ ] **Week 2**: Explain approach to someone else
- [ ] **Month 1**: Solve a similar problem (Coin Change)

**Strategy**: See [Dynamic Programming Patterns](../strategies/patterns/dynamic-programming.md)
