---
id: M164
old_id: I176
slug: combination-sum-iv
title: Combination Sum IV
difficulty: medium
category: medium
topics: ["array"]
patterns: ["backtrack-combination"]
estimated_time_minutes: 30
frequency: high
related_problems: ["M039", "E070", "M322"]
prerequisites: ["dynamic-programming", "unbounded-knapsack", "counting-dp"]
---
# Combination Sum IV

## Problem

You are provided with an array `nums` containing unique positive integers and a target sum `target`. Your task is to count how many distinct ordered sequences can be formed using elements from the array (with unlimited repetitions allowed) that add up exactly to the target. The key distinction here is that order matters—the sequences `[1, 2, 1]` and `[2, 1, 1]` are considered different even though they contain the same elements. You can use any number from `nums` as many times as you want, and you can create sequences of any length as long as they sum to the target. For instance, with `nums = [1, 2, 3]` and `target = 4`, valid sequences include `[1,1,1,1]`, `[1,1,2]`, `[1,2,1]`, `[2,1,1]`, `[2,2]`, `[1,3]`, and `[3,1]`—that's seven distinct sequences. The challenge is counting these efficiently without generating each one explicitly, as that would be too slow for large targets. Note that the problem guarantees the answer fits in a 32-bit integer, meaning it won't exceed about 2 billion combinations.

## Why This Matters

This problem models dynamic programming problems that count the number of ways to achieve a goal, which appears everywhere in real-world applications. In financial engineering, you might calculate how many ways you can make change for a dollar using different coin denominations, where order represents different transaction sequences. Resource allocation systems use this to determine how many ways tasks can be scheduled to fill a time budget. Natural language processing applies similar counting when analyzing how many different word orderings can form grammatically valid sentences with a target length. Compiler optimization counts the number of different instruction sequences that achieve the same computation. In e-commerce, recommendation systems might calculate how many product combinations fit a customer's budget in different purchase orders. Game development uses this for counting achievement paths or calculating probability distributions for random events. The dynamic programming technique you'll learn here—building solutions incrementally from smaller subproblems—is foundational for optimization problems across computer science and operations research.

## Examples

**Example 1:**
- Input: `nums = [1,2,3], target = 4`
- Output: `7`
- Explanation: Seven different ordered sequences sum to 4:
(1, 1, 1, 1)
(1, 1, 2)
(1, 2, 1)
(1, 3)
(2, 1, 1)
(2, 2)
(3, 1)
Order matters: (1, 2, 1) and (2, 1, 1) are considered different sequences.

**Example 2:**
- Input: `nums = [9], target = 3`
- Output: `0`

## Constraints

- 1 <= nums.length <= 200
- 1 <= nums[i] <= 1000
- All the elements of nums are **unique**.
- 1 <= target <= 1000

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Order Matters</summary>

This is different from standard combination problems because order matters (it's actually a permutation problem despite the name). For target = 4 with [1,2], both [1,1,2] and [2,1,1] count separately. Think about what position each number can occupy in the sequence.
</details>

<details>
<summary>🎯 Hint 2: Dynamic Programming Approach</summary>

Let dp[i] = number of ways to form sum i.

For each target sum i, you can reach it by taking any number num from nums and adding it to a sequence that sums to (i - num). So:

dp[i] = sum of dp[i - num] for all num in nums where num <= i

This is similar to the coin change problem but counting combinations instead of finding minimum coins.
</details>

<details>
<summary>📝 Hint 3: Bottom-Up Implementation</summary>

Pseudocode:
```
function combinationSum4(nums, target):
    dp = array of size (target + 1), initialized to 0
    dp[0] = 1  // One way to make 0: use nothing

    // Build up from 1 to target
    for i from 1 to target:
        for num in nums:
            if i >= num:
                dp[i] += dp[i - num]

    return dp[target]
```

The order of loops is crucial: outer loop on target, inner loop on nums, to count permutations.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Recursive Brute Force | O(n^target) | O(target) | Exponential; tries all sequences |
| Memoization (Top-Down DP) | O(target * n) | O(target) | Cache results for each sum |
| **Bottom-Up DP** | **O(target * n)** | **O(target)** | Most efficient; single pass |

## Common Mistakes

**Mistake 1: Using combinations instead of permutations**
```python
# Wrong: This counts combinations, not permutations
def combinationSum4(nums, target):
    dp = [0] * (target + 1)
    dp[0] = 1

    for num in nums:  # Wrong: outer loop on nums
        for i in range(num, target + 1):
            dp[i] += dp[i - num]

    return dp[target]
# This gives combinations where order doesn't matter
```

```python
# Correct: Permutations where order matters
def combinationSum4(nums, target):
    dp = [0] * (target + 1)
    dp[0] = 1

    for i in range(1, target + 1):  # Correct: outer loop on target
        for num in nums:
            if i >= num:
                dp[i] += dp[i - num]

    return dp[target]
```

**Mistake 2: Not handling base case**
```python
# Wrong: Missing dp[0] = 1
def combinationSum4(nums, target):
    dp = [0] * (target + 1)
    # dp[0] = 1 is missing!

    for i in range(1, target + 1):
        for num in nums:
            if i >= num:
                dp[i] += dp[i - num]  # Will always be 0

    return dp[target]
```

**Mistake 3: Integer overflow not considered**
```python
# Wrong: Not handling potential overflow in other languages
# In Python, integers are unlimited, but in Java/C++:
# The result might overflow before returning
# Use long or check bounds appropriately
```

## Variations

| Variation | Difference | Hint |
|-----------|-----------|------|
| Combination Sum (order doesn't matter) | Count combinations, not permutations | Swap loop order: nums outer, target inner |
| Limited uses | Each number used at most once | Track used numbers or use 2D DP |
| Exact k elements | Sequences must have exactly k numbers | Add dimension: dp[i][k] = ways with sum i using k numbers |
| Find actual sequences | Return all sequences, not just count | Backtracking with memoization |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Reviewed solution
- [ ] Attempted again after 1 day
- [ ] Attempted again after 3 days
- [ ] Attempted again after 1 week
- [ ] Attempted again after 2 weeks
