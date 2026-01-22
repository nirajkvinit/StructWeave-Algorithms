---
id: E066
old_id: F163
slug: missing-ranges
title: Missing Ranges
difficulty: easy
category: easy
topics: ["array"]
patterns: ["interval-merging"]
estimated_time_minutes: 15
frequency: low
related_problems: ["E228", "M056", "M057"]
prerequisites: ["arrays", "iteration"]
strategy_ref: ../prerequisites/arrays.md
---
# Missing Ranges

## Problem

Given a sorted array of unique integers and a lower and upper bound, find all the ranges of numbers that are missing from the array within that bound.

**What you're looking for:** Gaps between numbers.

For example, if you have `nums = [0, 1, 3, 50, 75]` within bounds `[0, 99]`:
- Gap before first number: None (starts at 0)
- Gap after 1: `[2, 2]` (just the number 2)
- Gap after 3: `[4, 49]` (all numbers from 4 to 49)
- Gap after 50: `[51, 74]` (all numbers from 51 to 74)
- Gap after 75: `[76, 99]` (all numbers from 76 to 99)

**Return format:** Each range is `[start, end]` where both start and end are inclusive. Single missing numbers appear as `[num, num]`.

**The trick:** You need to check three types of gaps:
1. Before the first array element (from `lower` to first element)
2. Between consecutive array elements
3. After the last array element (from last element to `upper`)

## Why This Matters

This is a practical **gap detection** problem that appears in real systems:
- **Database ID allocation**: Finding unused ID ranges in a sequence
- **IP address management**: Identifying available IP ranges in a subnet
- **Seat assignment**: Finding consecutive empty seats in a reservation system
- **Time slot scheduling**: Detecting free time windows between bookings

The core skill is tracking what you've "seen" and identifying what's missing - a fundamental pattern in data validation and inventory management.

## Examples

**Example 1:**
- Input: `nums = [0,1,3,50,75], lower = 0, upper = 99`
- Output: `[[2,2],[4,49],[51,74],[76,99]]`
- Explanation: The ranges are:
[2,2]
[4,49]
[51,74]
[76,99]

**Example 2:**
- Input: `nums = [-1], lower = -1, upper = -1`
- Output: `[]`
- Explanation: There are no missing ranges since there are no missing numbers.

## Constraints

- -10⁹ <= lower <= upper <= 10⁹
- 0 <= nums.length <= 100
- lower <= nums[i] <= upper
- All the values of nums are **unique**.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Track the Gaps</summary>

The key is to find gaps between consecutive numbers in the array. Think about:
- What happens before the first element? Is there a gap from `lower` to `nums[0]`?
- What happens between consecutive elements? If `nums[i+1] - nums[i] > 1`, there's a gap.
- What happens after the last element? Is there a gap from `nums[n-1]` to `upper`?

You need to check three types of gaps: before array, within array, and after array.

</details>

<details>
<summary>🎯 Hint 2: Iterate and Compare</summary>

Use a single pass through the array:
1. Start by checking if there's a gap between `lower` and the first element
2. For each pair of consecutive elements, check if there's a gap between them
3. After processing all elements, check if there's a gap between the last element and `upper`

For each gap found:
- If gap is one number (e.g., missing 5), add `[5, 5]`
- If gap is multiple numbers (e.g., missing 5-10), add `[5, 10]`

</details>

<details>
<summary>📝 Hint 3: Step-by-Step Algorithm</summary>

```
1. Initialize result list
2. Initialize prev = lower - 1 (track previous number)

3. For each number in nums (and one extra iteration for upper + 1):
   a. current = nums[i] (or upper + 1 for last iteration)
   b. If current - prev > 1:
      - start = prev + 1
      - end = current - 1
      - Add [start, end] to result
   c. prev = current

4. Return result
```

Time: O(n), Space: O(1) excluding output
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n * range) | O(1) | Check every number in [lower, upper] |
| **Linear Scan** | **O(n)** | **O(1)** | One pass, track gaps between consecutive elements |

## Common Mistakes

### 1. Off-by-One Errors
```python
# WRONG: Missing the boundary checks
for i in range(len(nums) - 1):
    if nums[i+1] - nums[i] > 1:
        result.append([nums[i]+1, nums[i+1]-1])
# Missing: gaps before first and after last element

# CORRECT: Include boundary checks
prev = lower - 1
for num in nums + [upper + 1]:  # Add sentinel
    if num - prev > 1:
        result.append([prev + 1, num - 1])
    prev = num
```

### 2. Not Handling Edge Cases
```python
# WRONG: Assumes array is non-empty
first_gap_end = nums[0] - 1
# What if nums is empty?

# CORRECT: Handle empty array
if not nums:
    return [[lower, upper]]
```

### 3. Including Existing Numbers
```python
# WRONG: Including the boundary numbers that exist
if nums[i+1] - nums[i] > 1:
    result.append([nums[i], nums[i+1]])  # Includes existing nums[i] and nums[i+1]

# CORRECT: Only include missing numbers
if nums[i+1] - nums[i] > 1:
    result.append([nums[i] + 1, nums[i+1] - 1])
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Missing Numbers | Return individual numbers instead of ranges | Track single missing values |
| Overlapping Ranges | Array contains ranges instead of numbers | Merge intervals first |
| Circular Range | Range wraps around (e.g., 999 to 1) | Handle modulo arithmetic |
| Unsorted Array | Input not sorted | Sort first O(n log n) or use hash set O(n) |

## Practice Checklist

**Correctness:**
- [ ] Handles empty array correctly
- [ ] Handles array with one element
- [ ] Handles case where no numbers are missing
- [ ] Handles case where all numbers in range are missing
- [ ] Correctly identifies gaps before first element
- [ ] Correctly identifies gaps after last element
- [ ] Handles negative numbers in range

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 10 minutes
- [ ] Can identify edge cases before coding
- [ ] Can explain time/space complexity
- [ ] Can handle follow-up questions

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Array Fundamentals](../../prerequisites/arrays.md)
