---
id: M203
old_id: I252
slug: minimum-moves-to-equal-array-elements
title: Minimum Moves to Equal Array Elements
difficulty: medium
category: medium
topics: ["array", "math"]
patterns: ["mathematical-insight"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M207", "E453", "M462"]
prerequisites: ["array", "mathematical-reasoning", "invariant-analysis"]
---
# Minimum Moves to Equal Array Elements

## Problem

Given an integer array `nums` with `n` elements, find the minimum number of operations to make all elements equal. In each operation, you must choose exactly `n - 1` elements and increment each by 1. You cannot increment all elements at once, nor can you increment just one element.

The constraint of incrementing `n - 1` elements (leaving one unchanged) seems unusual at first. The naive simulation approach quickly becomes impractical since the number of operations could be enormous for arrays with large value differences. The breakthrough comes from reframing the problem: what if we think about the relative differences between elements rather than their absolute values?

Consider this insight: incrementing `n - 1` elements by 1 is mathematically equivalent to decrementing the one remaining element by 1 (in terms of relative differences). This perspective transformation reveals a simple mathematical formula that solves the problem in linear time without any simulation.

## Why This Matters

This problem exemplifies the power of mathematical insight over brute force computation. The ability to reframe operations (incrementing n-1 elements vs. decrementing 1 element) is a critical thinking skill that appears in distributed systems, where understanding invariants under transformation is essential. This pattern recognition skill transfers to problems involving load balancing, resource distribution, and state synchronization. The problem teaches you to look for mathematical relationships and exploit problem symmetry, a technique that distinguishes efficient algorithms from slow ones and is highly valued in technical interviews for its demonstration of analytical thinking.

## Examples

**Example 1:**
- Input: `nums = [1,2,3]`
- Output: `3`
- Explanation: Three operations are sufficient (each operation increments two elements):
[1,2,3]  =>  [2,3,3]  =>  [3,4,3]  =>  [4,4,4]

**Example 2:**
- Input: `nums = [1,1,1]`
- Output: `0`

## Constraints

- n == nums.length
- 1 <= nums.length <= 10⁵
- -10⁹ <= nums[i] <= 10⁹
- The answer is guaranteed to fit in a **32-bit** integer.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Reverse the Operation</summary>

Instead of thinking about incrementing n-1 elements by 1 each time, think about the equivalent operation: decrementing 1 element by 1 is the same as incrementing all other n-1 elements by 1 (relative to that element). This reframing transforms the problem: you want to make all elements equal to the minimum element by decrementing elements down to it.

</details>

<details>
<summary>🎯 Hint 2: Mathematical Insight</summary>

When you increment n-1 elements, the relative difference between elements changes. The key insight is that incrementing n-1 elements is equivalent to decrementing 1 element in terms of the final goal. Therefore, the minimum number of operations equals the sum of differences between each element and the minimum element: sum(nums) - n * min(nums).

</details>

<details>
<summary>📝 Hint 3: Simple Implementation</summary>

```
Find minimum element in array
Calculate sum of all elements

moves = sum - (n * minimum)
return moves
```

This works because each operation effectively decreases one element by 1 relative to the others. To make all elements equal to the minimum, you need to reduce each element down to that minimum.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Simulation | O(k * n) | O(1) | k = number of operations, very slow |
| Mathematical Formula | O(n) | O(1) | Single pass to find min and sum |
| Sort-based | O(n log n) | O(1) | Unnecessary sorting |

**Recommended approach:** Mathematical formula (O(n) time, O(1) space)

## Common Mistakes

### Mistake 1: Simulating the operations
**Wrong:**
```python
def minMoves(nums):
    moves = 0
    while len(set(nums)) > 1:  # While not all equal
        max_val = max(nums)
        for i in range(len(nums)):
            if nums[i] != max_val:
                nums[i] += 1
        moves += 1
    return moves
# Time limit exceeded - O(k * n) where k can be huge
```

**Correct:**
```python
def minMoves(nums):
    min_val = min(nums)
    total = sum(nums)
    return total - len(nums) * min_val
# O(n) time - single pass
```

### Mistake 2: Not understanding the mathematical relationship
**Wrong:**
```python
# Trying to increment to maximum
def minMoves(nums):
    max_val = max(nums)
    moves = 0
    for num in nums:
        moves += max_val - num  # Wrong approach
    return moves
```

**Correct:**
```python
# The key insight: incrementing n-1 elements is like decrementing 1
def minMoves(nums):
    min_val = min(nums)
    return sum(nums) - len(nums) * min_val
```

### Mistake 3: Integer overflow concerns
**Wrong:**
```python
# In languages like C++/Java, might overflow
int minMoves(vector<int>& nums) {
    int min_val = *min_element(nums.begin(), nums.end());
    int total = 0;
    for (int num : nums) {
        total += num;  // Might overflow if numbers are large
    }
    return total - nums.size() * min_val;
}
```

**Correct:**
```python
# Python handles big integers automatically
def minMoves(nums):
    min_val = min(nums)
    return sum(nums) - len(nums) * min_val

# In C++/Java, use long long:
# long long total = accumulate(nums.begin(), nums.end(), 0LL);
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Minimum Moves II (increment/decrement any element) | Medium | Different operation, uses median instead |
| Equal Array Elements with k operations | Medium | Limited number of operations |
| Minimum Moves with different operation costs | Hard | Operations have different weights |
| Make Array Equal with multiplication | Hard | Different operation type |

## Practice Checklist

- [ ] First attempt (after reading problem)
- [ ] Understood the mathematical insight
- [ ] Implemented without simulation
- [ ] Handled edge cases (all equal, negative numbers, single element)
- [ ] Verified with manual calculation
- [ ] Tested with custom cases
- [ ] Reviewed after 1 day
- [ ] Reviewed after 1 week
- [ ] Could explain solution to others
- [ ] Comfortable with variations

**Strategy**: See [Mathematical Patterns](../strategies/patterns/math.md)
