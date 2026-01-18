---
id: H065
old_id: I163
slug: nested-list-weight-sum-ii
title: Nested List Weight Sum II
difficulty: hard
category: hard
topics: []
patterns: []
estimated_time_minutes: 45
---
# Nested List Weight Sum II

## Problem

You receive a nested structure `nestedList` containing integers. Each item can be either a single integer value or another list that may contain integers or additional nested lists.

An integer's **depth** represents how many levels of nesting contain it. For instance, in `[1,[2,2],[[3],2],1]`, each number has a depth equal to the count of brackets surrounding it. Define `maxDepth` as the greatest depth value among all integers.

An integer's **weight** is calculated as `maxDepth - (the depth of the integer) + 1`.

Calculate the total obtained by multiplying each integer in `nestedList` by its corresponding weight and summing these products.


**Diagram:**

```
Example 1: [[1,1],2,[1,1]]
Structure visualization:
  Depth 1: [          [1,1],    2,    [1,1]         ]
  Depth 2:             1, 1           1, 1

  maxDepth = 2
  Weight calculation: maxDepth - depth + 1
  - Numbers at depth 1 (2): weight = 2 - 1 + 1 = 2
  - Numbers at depth 2 (1,1,1,1): weight = 2 - 2 + 1 = 1

  Sum = 2×2 + (1×1 + 1×1 + 1×1 + 1×1) = 4 + 4 = 8

Example 2: [1,[4,[6]]]
Structure visualization:
  Depth 1: [ 1,  [    4,    [  6  ]    ]  ]
  Depth 2:           4
  Depth 3:                     6

  maxDepth = 3
  Weight calculation:
  - 1 at depth 1: weight = 3 - 1 + 1 = 3
  - 4 at depth 2: weight = 3 - 2 + 1 = 2
  - 6 at depth 3: weight = 3 - 3 + 1 = 1

  Sum = 1×3 + 4×2 + 6×1 = 3 + 8 + 6 = 17
```


## Why This Matters

This problem develops fundamental algorithmic thinking and problem-solving skills.

## Constraints

- 1 <= nestedList.length <= 50
- The values of the integers in the nested list is in the range [-100, 100].
- The maximum **depth** of any integer is less than or equal to 50.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Since weight = maxDepth - depth + 1, you need to find maxDepth first. However, there's a clever trick: instead of computing weights from maxDepth downward, accumulate sums from bottom up. Each level's contribution can be calculated by adding the unweighted sum multiple times based on how many levels remain below.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use BFS to traverse level by level. For each level, collect all integers and nested lists separately. Keep a running sum that accumulates: at each level, add all integers from that level AND all integers from previous levels (this simulates the reverse weighting). The final accumulated sum gives the answer without needing to know maxDepth in advance.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Alternative: Do two passes - first DFS to find maxDepth, second DFS to calculate weighted sum. However, the single-pass BFS with accumulation is more elegant. The key insight is: instead of multiplying each value by (maxDepth - depth + 1), add each value (maxDepth - depth + 1) times to a running total.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Two-pass DFS | O(n) | O(h) | n = total elements, h = max nesting depth |
| Optimal (single-pass BFS) | O(n) | O(w) | w = maximum width at any level |

## Common Mistakes

1. **Computing maxDepth incorrectly**
   ```python
   # Wrong: only checking first level depth
   max_depth = len(nestedList)

   # Correct: recursively find maximum nesting
   def find_depth(lst, depth=1):
       max_d = depth
       for item in lst:
           if isinstance(item, list):
               max_d = max(max_d, find_depth(item, depth + 1))
       return max_d
   ```

2. **Not handling the reverse weighting properly**
   ```python
   # Wrong: using normal depth weighting
   def dfs(lst, depth):
       total = 0
       for item in lst:
           if isinstance(item, int):
               total += item * depth

   # Correct: use maxDepth - depth + 1
   def dfs(lst, depth, max_depth):
       total = 0
       for item in lst:
           if isinstance(item, int):
               total += item * (max_depth - depth + 1)
   ```

3. **BFS accumulation trick not understood**
   ```python
   # Wrong: trying to weight during BFS
   # Need to know maxDepth first

   # Correct: accumulate cleverly
   unweighted = weighted = 0
   while queue:
       for _ in range(len(queue)):
           # Process level
           unweighted += sum(integers at this level)
       weighted += unweighted  # Add cumulative sum
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Nested List Weight Sum | Medium | Normal weighting (depth increases weight) |
| Flatten Nested List Iterator | Medium | Similar traversal, no weighting |
| Array Nesting | Medium | Different nesting structure |
| Mini Parser | Medium | Parsing nested structures |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [BFS/DFS](../../strategies/patterns/tree-traversal.md)
