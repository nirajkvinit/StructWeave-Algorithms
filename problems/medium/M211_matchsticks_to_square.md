---
id: M211
old_id: I272
slug: matchsticks-to-square
title: Matchsticks to Square
difficulty: medium
category: medium
topics: ["array", "backtracking", "bitmask"]
patterns: ["dp-2d", "partition"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M416", "M698", "M473"]
prerequisites: ["backtracking", "recursion", "pruning", "partition-problem"]
---
# Matchsticks to Square

## Problem

You have a collection of matchsticks with different lengths. Given an integer array `matchsticks` where `matchsticks[i]` represents the length of the ith matchstick, determine whether you can arrange all these matchsticks to form a perfect square.

The challenge involves satisfying several constraints. First, every matchstick must be used exactly once - you cannot leave any out or use any twice. Second, matchsticks cannot be broken or bent - each must be placed end-to-end along the sides of the square. Third, multiple matchsticks can combine to form a single side, but all four sides must have equal length.

Before attempting a solution, consider a quick feasibility check: the sum of all matchstick lengths must be divisible by 4 (since a square has four equal sides). Even if this condition holds, finding a valid arrangement can be challenging because you need to partition the matchsticks into four groups with identical sums. With up to 15 matchsticks and lengths up to 10^8, the search space is deceptively large.

Return `true` if you can form a square using all matchsticks, otherwise return `false`.


**Diagram:**

```
Example: matchsticks = [1,1,2,2,2]
Can form a square with side length 2:

  2     2
+---+---+
|       | 2
+   +   +
|       | 2
+---+---+
  1   1

Each side = 2 units (sum of matchsticks / 4)
```


## Why This Matters

This problem is a classic example of the partition problem - dividing a collection into subsets with equal sums - which appears frequently in resource allocation scenarios. Imagine distributing workloads evenly across servers, organizing teams with balanced skill sets, or packing items into containers with weight limits. The backtracking technique you'll develop here applies to constraint satisfaction problems across computer science, from scheduling to circuit design. Additionally, this problem teaches crucial optimization strategies like pruning and early termination, which can reduce exponential search spaces by orders of magnitude in practice.

## Examples

**Example 1:**
- Input: `matchsticks = [3,3,3,3,4]`
- Output: `false`
- Explanation: No arrangement exists that forms a square using all matchsticks.

## Constraints

- 1 <= matchsticks.length <= 15
- 1 <= matchsticks[i] <= 10⁸

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Partition Problem</summary>

This is a variant of the partition problem. You need to partition the matchsticks into 4 groups with equal sum. First, check if the total sum is divisible by 4. If not, return false immediately. Each side must have length = sum/4. The challenge is finding a valid partition.

</details>

<details>
<summary>🎯 Hint 2: Backtracking with Pruning</summary>

Use backtracking to try assigning each matchstick to one of the 4 sides. Key optimizations: (1) Sort matchsticks in descending order to fail fast with large sticks, (2) Skip duplicate side lengths during recursion, (3) Early termination when a side exceeds target length. Maintain 4 side lengths and recursively try each matchstick on each side.

</details>

<details>
<summary>📝 Hint 3: Optimized Backtracking</summary>

```
def makesquare(matchsticks):
    total = sum(matchsticks)
    if total % 4 != 0:
        return False

    target = total // 4
    matchsticks.sort(reverse=True)

    # Early exit: if any stick is longer than target
    if matchsticks[0] > target:
        return False

    sides = [0] * 4

    def backtrack(index):
        if index == len(matchsticks):
            return all(s == target for s in sides)

        for i in range(4):
            if sides[i] + matchsticks[index] <= target:
                sides[i] += matchsticks[index]
                if backtrack(index + 1):
                    return True
                sides[i] -= matchsticks[index]

                # Pruning: if this side is empty, no point trying other empty sides
                if sides[i] == 0:
                    break

        return False

    return backtrack(0)
```

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (All Permutations) | O(n! × 4^n) | O(n) | Try all ways to assign sticks to sides |
| Backtracking (No Pruning) | O(4^n) | O(n) | Each stick can go to any of 4 sides |
| Backtracking (With Pruning) | O(4^n) best case | O(n) | Sorting + early termination helps significantly |
| Dynamic Programming (Bitmask) | O(2^n × n) | O(2^n) | Track which sticks are used, 4 side states |

n = number of matchsticks (≤ 15)

## Common Mistakes

**Mistake 1: Not Sorting for Early Pruning**

```python
# Wrong: Processing small sticks first wastes time
def makesquare(matchsticks):
    total = sum(matchsticks)
    if total % 4 != 0:
        return False
    target = total // 4
    sides = [0] * 4

    def backtrack(index):
        # Without sorting, small sticks fill sides slowly
        # ...
```

```python
# Correct: Sort descending to fail fast
def makesquare(matchsticks):
    total = sum(matchsticks)
    if total % 4 != 0:
        return False
    target = total // 4
    matchsticks.sort(reverse=True)  # Large sticks first

    if matchsticks[0] > target:
        return False

    sides = [0] * 4
    # ...
```

**Mistake 2: Missing Critical Pruning**

```python
# Wrong: Tries all sides even when they're identical
def backtrack(index):
    if index == len(matchsticks):
        return all(s == target for s in sides)

    for i in range(4):
        if sides[i] + matchsticks[index] <= target:
            sides[i] += matchsticks[index]
            if backtrack(index + 1):
                return True
            sides[i] -= matchsticks[index]
    return False
```

```python
# Correct: Skip equivalent sides
def backtrack(index):
    if index == len(matchsticks):
        return all(s == target for s in sides)

    for i in range(4):
        if sides[i] + matchsticks[index] <= target:
            sides[i] += matchsticks[index]
            if backtrack(index + 1):
                return True
            sides[i] -= matchsticks[index]

            # If this side is 0, all remaining sides are 0
            # No point trying them
            if sides[i] == 0:
                break
    return False
```

**Mistake 3: Incorrect Base Case**

```python
# Wrong: Doesn't verify all sides are exactly target
def backtrack(index):
    if index == len(matchsticks):
        return True  # Wrong! Some sides might be < target
```

```python
# Correct: Verify all sides equal target
def backtrack(index):
    if index == len(matchsticks):
        return all(s == target for s in sides)
    # Since we check sides[i] + matchsticks[index] <= target,
    # this ensures all sides are exactly target when all sticks are used
```

## Variations

| Variation | Difference | Approach Change |
|-----------|-----------|-----------------|
| N-gon Formation | Form regular polygon with N sides | Generalize to N sides instead of 4 |
| Minimum Squares | Use minimum number of squares | BFS or DP to find minimum partitions |
| Maximum Side Length | Find largest possible square | Binary search on side length |
| Weighted Sticks | Different weights per stick | Add weight constraint to backtracking |
| Allow Breaking | Can break sticks | Becomes much easier, just check sum % 4 |

## Practice Checklist

- [ ] First attempt (after reading problem)
- [ ] Reviewed solution
- [ ] Implemented without hints (Day 1)
- [ ] Solved again (Day 3)
- [ ] Solved again (Day 7)
- [ ] Solved again (Day 14)
- [ ] Attempted all variations above

**Strategy**: See [Backtracking](../strategies/patterns/backtracking.md) and [Partition Problems](../strategies/patterns/partition.md)
