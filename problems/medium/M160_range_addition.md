---
id: M160
old_id: I169
slug: range-addition
title: Range Addition
difficulty: medium
category: medium
topics: ["array"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
frequency: high
related_problems: ["E370", "M1109", "M1674"]
prerequisites: ["prefix-sum", "difference-array", "range-updates"]
---
# Range Addition

## Problem

Imagine you're working with a scoreboard or a timeline where you need to apply multiple updates that affect ranges of positions. You start with an array of zeros of a given `length`, and you receive a series of update operations, each specified as `[startIdx, endIdx, inc]` which means "add `inc` to every element from index `startIdx` to `endIdx` inclusive." Your task is to process all these updates in order and return the final array. For example, if you have an array of length 5 initialized to [0, 0, 0, 0, 0] and you apply update [1, 3, 2], the array becomes [0, 2, 2, 2, 0]. The naive approach is straightforward: for each update, loop through the range and add the increment to each element. However, this becomes painfully slow when you have large ranges - imagine an array of length 100,000 with updates that affect ranges of 50,000 elements each. With 10,000 such updates, you'd be doing billions of operations. The key insight is to use a difference array technique: instead of updating every element in a range, you can mark just the start and end boundaries of where changes occur, then reconstruct the final values with a single pass at the end. This transforms the problem from requiring multiple scans over large ranges to just marking boundaries and doing one final sweep. Edge cases include updates that span the entire array, multiple overlapping updates affecting the same positions (values accumulate), and negative increments that decrease values.

**Diagram:**

```
length = 10, updates = [[2,4,6],[5,6,8],[1,9,-4]]

Index:     0   1   2   3   4   5   6   7   8   9
Initial:  [0,  0,  0,  0,  0,  0,  0,  0,  0,  0]

Update [2,4,6]: Add 6 to indices 2-4
          [0,  0,  6,  6,  6,  0,  0,  0,  0,  0]
                   ^^^^^^^^^^^^

Update [5,6,8]: Add 8 to indices 5-6
          [0,  0,  6,  6,  6,  8,  8,  0,  0,  0]
                                   ^^^^^^^^

Update [1,9,-4]: Add -4 to indices 1-9
          [0, -4,  2,  2,  2,  4,  4, -4, -4, -4]
              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Final:    [0, -4,  2,  2,  2,  4,  4, -4, -4, -4]
```


## Why This Matters

This range update pattern is fundamental in database systems for handling batch updates efficiently - when thousands of users update overlapping time ranges in a calendar application, or when financial systems apply interest rate changes to ranges of accounts, they use this exact technique to avoid redundant operations. It powers the "lazy propagation" optimization in segment trees and Fenwick trees used by competitive programming platforms to handle millions of range queries per second. In game development, this technique optimizes sprite rendering when applying effects to rectangular regions of the screen, and in image processing, it enables fast blurring or color adjustments to rectangular selections in tools like Photoshop. Cloud computing platforms use difference arrays to track resource allocation over time windows (like CPU usage from hour 10 to hour 15), and inventory management systems apply it to track stock level changes across date ranges. The boundary-marking principle you learn here generalizes to computational geometry problems like rectangle union area calculation and appears in scheduling algorithms that need to find free time slots across multiple calendars.

## Examples

**Example 1:**
- Input: `length = 10, updates = [[2,4,6],[5,6,8],[1,9,-4]]`
- Output: `[0,-4,2,2,2,4,4,-4,-4,-4]`

## Constraints

- 1 <= length <= 10⁵
- 0 <= updates.length <= 10⁴
- 0 <= startIdxi <= endIdxi < length
- -1000 <= inci <= 1000

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Avoid Repeated Work</summary>

The brute force approach updates every element in every range, leading to O(updates * length) time complexity. Can you mark just the boundaries of changes instead of updating every element? Think about how a change "starts" at one index and "stops" at another.
</details>

<details>
<summary>🎯 Hint 2: Difference Array Technique</summary>

Use a difference array where you only mark the start and end of each range. For a range [start, end] with increment inc:
- Add inc at index start (change begins)
- Subtract inc at index end+1 (change ends)

After processing all updates, perform a prefix sum to reconstruct the actual values. This transforms O(k*n) into O(k+n) where k is number of updates.
</details>

<details>
<summary>📝 Hint 3: Implementation Steps</summary>

Pseudocode:
```
1. Create difference array of size length+1 (extra space for boundary)
2. For each update [start, end, inc]:
   - diff[start] += inc
   - diff[end + 1] -= inc

3. Compute prefix sum to get final result:
   result[0] = diff[0]
   for i from 1 to length-1:
       result[i] = result[i-1] + diff[i]

4. Return result
```
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(k * n) | O(n) | Update all elements in each range; k = updates, n = length |
| **Difference Array** | **O(k + n)** | **O(n)** | Mark boundaries, then prefix sum; optimal solution |

## Common Mistakes

**Mistake 1: Updating every element in range**
```python
# Wrong: O(k * n) time complexity
def getModifiedArray(length, updates):
    result = [0] * length
    for start, end, inc in updates:
        for i in range(start, end + 1):
            result[i] += inc  # Too slow for large ranges
    return result
```

```python
# Correct: O(k + n) using difference array
def getModifiedArray(length, updates):
    diff = [0] * (length + 1)

    for start, end, inc in updates:
        diff[start] += inc
        diff[end + 1] -= inc

    result = [0] * length
    result[0] = diff[0]
    for i in range(1, length):
        result[i] = result[i-1] + diff[i]

    return result
```

**Mistake 2: Index out of bounds**
```python
# Wrong: diff array too small
def getModifiedArray(length, updates):
    diff = [0] * length  # Should be length + 1
    for start, end, inc in updates:
        diff[start] += inc
        diff[end + 1] -= inc  # IndexError when end = length-1
```

**Mistake 3: Not initializing result properly**
```python
# Wrong: Missing first element initialization
def getModifiedArray(length, updates):
    diff = [0] * (length + 1)
    # ... process updates ...

    result = [0] * length
    for i in range(1, length):  # Wrong: skips result[0]
        result[i] = result[i-1] + diff[i]
```

## Variations

| Variation | Difference | Hint |
|-----------|-----------|------|
| 2D Range Addition | Update rectangular submatrices | Apply difference array technique in 2D |
| Range Multiplication | Multiply ranges instead of add | Use logarithms or segment trees |
| Lazy Propagation | Update and query interleaved | Use segment tree with lazy updates |
| Weighted Range Update | Different weights per position | Store weight function, apply during prefix sum |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Reviewed solution
- [ ] Attempted again after 1 day
- [ ] Attempted again after 3 days
- [ ] Attempted again after 1 week
- [ ] Attempted again after 2 weeks
