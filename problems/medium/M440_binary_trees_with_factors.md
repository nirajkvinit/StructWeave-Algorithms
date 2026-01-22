---
id: M440
old_id: A290
slug: binary-trees-with-factors
title: Binary Trees With Factors
difficulty: medium
category: medium
topics: ["array", "tree"]
patterns: []
estimated_time_minutes: 30
strategy_ref: ../prerequisites/trees.md
---
# Binary Trees With Factors

## Problem

Given an array of distinct positive integers (all greater than 1), count how many different binary trees you can construct where every non-leaf node's value equals the product of its two children's values.

Values from the array can be reused unlimited times, and you can create trees of any size. A single-node tree (just a leaf) counts as one valid tree for that value. For larger trees, every internal node must satisfy the multiplication rule: `parent.value = left_child.value × right_child.value`.

For example, with array `[2, 4]`, you can build three trees: a single node with value 2, a single node with value 4, and a three-node tree where 4 is the root with two children both valued 2 (since 2 × 2 = 4). With array `[2, 4, 5, 10]`, you get more possibilities because 10 = 2 × 5 and 10 = 5 × 2 (which creates different tree structures since left and right children are distinct).

The challenge is counting systematically without missing or double-counting configurations. This is fundamentally a dynamic programming problem disguised as a tree-counting problem. The number of trees with root value X depends on all the ways you can factor X into two values from the array, multiplied by the number of trees possible for each factor.

Since the count can grow very large, return the answer modulo 10⁹ + 7.

## Why This Matters

Combinatorial counting problems with multiplicative constraints appear in compiler optimization (counting expression tree configurations), probabilistic modeling (enumerating event trees), and algorithm analysis (counting recursive decompositions). This problem specifically teaches you to recognize when tree-building problems can be solved with dynamic programming by identifying overlapping subproblems. The pattern here—building larger structures from smaller ones based on factorization—applies to many scenarios including parsing expression grammars, constructing algebraic expression trees, and analyzing hierarchical data models. It also demonstrates how to use sorting to ensure dependencies are resolved before they're needed, a key technique in many DP solutions.

## Examples

**Example 1:**
- Input: `arr = [2,4]`
- Output: `3`
- Explanation: We can make these trees: `[2], [4], [4, 2, 2]`

**Example 2:**
- Input: `arr = [2,4,5,10]`
- Output: `7`
- Explanation: The valid tree configurations are: `[2], [4], [5], [10], [4, 2, 2], [10, 2, 5], [10, 5, 2]`.

## Constraints

- 1 <= arr.length <= 1000
- 2 <= arr[i] <= 10⁹
- All the values of arr are **unique**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a dynamic programming problem disguised as a tree problem. The number of trees with root value X equals the sum of (trees with root A) * (trees with root B) for all pairs where A * B = X. Each value can be a leaf (1 tree) or an internal node.
</details>

<details>
<summary>🎯 Main Approach</summary>
Sort the array first. Use dynamic programming where dp[x] represents the number of trees with root value x. For each value x, it can be a leaf (1 way), or check all smaller values a where x % a == 0 and b = x / a exists. Add dp[a] * dp[b] to dp[x]. Sum all dp values for the final answer.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use a hash map/dictionary to store dp values for O(1) lookup when checking if a divisor exists. When processing value x, only check divisors up to sqrt(x) to avoid duplicate counting, but remember to handle the case where a == b (perfect square).
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n² * 2^n) | O(2^n) | Generate all possible trees |
| Optimal (DP) | O(n² * √max_val) | O(n) | Sort + DP with divisor checking |
| Optimized DP | O(n² * log(max_val)) | O(n) | Using factorization techniques |

## Common Mistakes

1. **Not considering each value as a standalone leaf**
   ```python
   # Wrong: Only counting internal nodes
   for x in arr:
       dp[x] = 0
       for a in arr:
           if x % a == 0 and x // a in dp:
               dp[x] += dp[a] * dp[x // a]

   # Correct: Initialize each value as 1 (leaf node)
   for x in arr:
       dp[x] = 1  # Each value can be a leaf
       for a in arr:
           if a < x and x % a == 0 and x // a in dp:
               dp[x] += dp[a] * dp[x // a]
   ```

2. **Forgetting to apply modulo operation**
   ```python
   # Wrong: No modulo can cause overflow
   return sum(dp.values())

   # Correct: Apply modulo throughout
   MOD = 10**9 + 7
   for x in arr:
       dp[x] = 1
       for a in arr:
           if a < x and x % a == 0 and x // a in dp:
               dp[x] = (dp[x] + dp[a] * dp[x // a]) % MOD
   return sum(dp.values()) % MOD
   ```

3. **Double counting when a == b**
   ```python
   # Wrong: Counting a * a twice
   for a in arr:
       b = x // a
       if x % a == 0 and b in dp:
           dp[x] += dp[a] * dp[b]

   # Correct: Handle perfect squares carefully
   for a in arr:
       if a * a > x:
           break
       if x % a == 0:
           b = x // a
           if b in dp:
               if a == b:
                   dp[x] += dp[a] * dp[a]
               else:
                   dp[x] += 2 * dp[a] * dp[b]
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Count BSTs with n nodes | Medium | Catalan number formula |
| Trees with sum property | Hard | Children sum to parent instead of product |
| K-ary trees with factors | Hard | More than 2 children allowed |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming](../../strategies/patterns/dynamic-programming.md) | [Tree Structures](../../prerequisites/trees.md)
