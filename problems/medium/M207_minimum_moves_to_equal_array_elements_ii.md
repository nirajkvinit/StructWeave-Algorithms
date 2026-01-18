---
id: M207
old_id: I261
slug: minimum-moves-to-equal-array-elements-ii
title: Minimum Moves to Equal Array Elements II
difficulty: medium
category: medium
topics: ["array", "math", "sorting"]
patterns: ["median", "mathematical-insight"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M203", "M296", "E462"]
prerequisites: ["array", "median", "sorting", "mathematical-reasoning"]
---
# Minimum Moves to Equal Array Elements II

## Problem

Given an integer array `nums`, find the minimum number of moves to make all elements equal, where each move increments or decrements a single element by 1. Unlike the similar problem where you must increment `n-1` elements at once, here you have full flexibility to adjust any element up or down individually.

The question becomes: what target value should all elements converge to? If you pick the maximum value as the target, you'll need many increments. If you pick the minimum, you'll need many decrements. Intuitively, the optimal target lies somewhere in the middle. But should it be the arithmetic mean (average), the mode (most common value), or something else?

The mathematical answer is the median—the middle value when the array is sorted. This minimizes the sum of absolute deviations, a well-known property from statistics. For an array like [1, 2, 3], the median is 2, requiring |1-2| + |2-2| + |3-2| = 2 total moves. If you chose the mean (also 2 here), you'd get the same result, but for arrays like [1, 2, 100], the median (2) vastly outperforms the mean (34.3).

The algorithm is straightforward: sort the array, find the median, and sum the absolute distances from each element to that median.

## Why This Matters

The median's property of minimizing absolute deviations appears throughout data science, statistics, and robust estimation. This problem demonstrates why medians are more robust than means for outlier-heavy data, a principle used in network latency monitoring, sensor fusion, and financial modeling. The pattern of sorting data to find optimal meeting points extends to facility location problems in operations research and clustering algorithms in machine learning. Understanding when to use median versus mean is a fundamental statistical skill that separates effective data analysis from naive averaging.

## Examples

**Example 1:**
- Input: `nums = [1,2,3]`
- Output: `2`
- Explanation: We need exactly two operations, where each operation changes one element by 1:
[1,2,3]  =>  [2,2,3]  =>  [2,2,2]

**Example 2:**
- Input: `nums = [1,10,2,9]`
- Output: `16`

## Constraints

- n == nums.length
- 1 <= nums.length <= 10⁵
- -10⁹ <= nums[i] <= 10⁹

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Target Value Selection</summary>

What value should all elements converge to? Consider this: if you can increment or decrement any element by 1, the total number of moves to reach a target value T is the sum of absolute differences: sum(|nums[i] - T|). The key question is: which T minimizes this sum?

</details>

<details>
<summary>🎯 Hint 2: Median Property</summary>

The median minimizes the sum of absolute deviations. This is a well-known mathematical property. For any array, converting all elements to the median value requires the minimum total moves. Sort the array and pick the middle element (for odd length) or any value between the two middle elements (for even length).

</details>

<details>
<summary>📝 Hint 3: Implementation Algorithm</summary>

```
Sort the array
Find median:
    - If odd length: median = nums[n // 2]
    - If even length: median = nums[n // 2] (or nums[n // 2 - 1], both work)

Calculate total moves:
moves = 0
For each num in nums:
    moves += abs(num - median)

Return moves
```

For [1,2,3]: median = 2, moves = |1-2| + |2-2| + |3-2| = 1 + 0 + 1 = 2

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Try All Targets | O(n * range) | O(1) | Impractical for large range |
| Sort + Median | O(n log n) | O(1) or O(n) | Optimal, space depends on sort implementation |
| QuickSelect Median | O(n) average | O(1) | Best average case, but O(n log n) simpler |

**Recommended approach:** Sort and use median (O(n log n) time, O(1) space)

## Common Mistakes

### Mistake 1: Using mean instead of median
**Wrong:**
```python
def minMoves2(nums):
    # Using average/mean as target
    target = sum(nums) // len(nums)
    moves = 0
    for num in nums:
        moves += abs(num - target)
    return moves
# Wrong: mean doesn't minimize sum of absolute deviations
```

**Correct:**
```python
def minMoves2(nums):
    nums.sort()
    median = nums[len(nums) // 2]

    moves = 0
    for num in nums:
        moves += abs(num - median)
    return moves
```

### Mistake 2: Incorrect median calculation for even-length arrays
**Wrong:**
```python
# Trying to use average of two middle elements
nums.sort()
if len(nums) % 2 == 0:
    median = (nums[len(nums)//2] + nums[len(nums)//2 - 1]) / 2
# This might give a non-integer, but any value between works
```

**Correct:**
```python
nums.sort()
# For even length, either middle element works
median = nums[len(nums) // 2]
# Or: median = nums[len(nums) // 2 - 1]
# Both give the same result for sum of absolute differences
```

### Mistake 3: Not handling negative numbers properly
**Wrong:**
```python
# Assuming all positive numbers
moves = sum(nums) - min(nums) * len(nums)
# This formula is for a different problem (Minimum Moves I)
```

**Correct:**
```python
def minMoves2(nums):
    nums.sort()
    median = nums[len(nums) // 2]

    # abs() handles negative numbers correctly
    return sum(abs(num - median) for num in nums)
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Minimum Moves I (increment n-1 elements) | Medium | Different operation, uses minimum instead |
| Minimum Cost to Make Array Equal | Medium | Each operation has different cost |
| Best Meeting Point | Hard | 2D version of this problem |
| Minimize Deviation in Array | Hard | More complex target selection |

## Practice Checklist

- [ ] First attempt (after reading problem)
- [ ] Understood median property
- [ ] Implemented with sorting
- [ ] Handled edge cases (single element, all equal, negative numbers)
- [ ] Verified median selection for even/odd length
- [ ] Tested with custom cases
- [ ] Reviewed after 1 day
- [ ] Reviewed after 1 week
- [ ] Could explain solution to others
- [ ] Comfortable with variations

**Strategy**: See [Mathematical Patterns](../strategies/patterns/math.md)
