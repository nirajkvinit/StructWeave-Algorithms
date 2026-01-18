---
id: E087
old_id: I028
slug: summary-ranges
title: Summary Ranges
difficulty: easy
category: easy
topics: ["array"]
patterns: ["two-pointers", "linear-scan"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E001", "E088", "M015"]
prerequisites: ["arrays", "string-formatting", "edge-cases"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Summary Ranges

## Problem

Given a sorted array of unique integers `nums`, return the smallest sorted list of ranges that cover all the numbers in the array exactly. Each range represents a consecutive sequence of integers.

A **range** `[a,b]` covers all integers from `a` to `b` inclusive. Format each range as:
- `"a->b"` if the range contains more than one number (a < b)
- `"a"` if the range contains just one number (a == b)

**Example walkthrough:**
For `nums = [0,1,2,4,5,7]`:
- Numbers 0,1,2 are consecutive → "0->2"
- Numbers 4,5 are consecutive → "4->5"
- Number 7 stands alone → "7"
- Result: `["0->2", "4->5", "7"]`

The key insight is that the array is already sorted, so consecutive numbers will differ by exactly 1. When you encounter a gap (difference > 1), you've found the end of one range and the start of the next.

**Watch out for:**
- Single-element ranges need different formatting (no arrow)
- Empty arrays (though constraints guarantee at least 0 length)
- Off-by-one errors when checking if you've reached the end
- Properly finalizing the last range

## Why This Matters

This problem teaches **range compression**, a practical technique used in:

- **IP address ranges** - Representing firewall rules like "192.168.1.10->192.168.1.20"
- **Data summarization** - Compressing sequences like "pages 5-10, 15, 20-25"
- **Calendar scheduling** - Merging consecutive available time slots
- **Memory allocation** - Representing free memory blocks in operating systems

This pattern appears whenever you need to group consecutive elements efficiently. It's also a great introduction to problems involving ranges and intervals, which become more complex in medium/hard variations like merging overlapping intervals.

## Examples

**Example 1:**
- Input: `nums = [0,1,2,4,5,7]`
- Output: `["0->2","4->5","7"]`
- Explanation: The ranges are:
[0,2] --> "0->2"
[4,5] --> "4->5"
[7,7] --> "7"

**Example 2:**
- Input: `nums = [0,2,3,4,6,8,9]`
- Output: `["0","2->4","6","8->9"]`
- Explanation: The ranges are:
[0,0] --> "0"
[2,4] --> "2->4"
[6,6] --> "6"
[8,9] --> "8->9"

## Constraints

- 0 <= nums.length <= 20
- -2³¹ <= nums[i] <= 2³¹ - 1
- All the values of nums are **unique**.
- nums is sorted in ascending order.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Identify Consecutive Sequences</summary>

Since the array is already sorted, consecutive numbers will differ by exactly 1. When you encounter a gap (difference > 1), you've found the end of a range and the start of a new one. How would you track the beginning and end of each range?

</details>

<details>
<summary>🎯 Hint 2: Single Pass Strategy</summary>

You can solve this with a single pass through the array. Keep track of where the current range starts. As you iterate, check if the next number continues the sequence or breaks it. When a break occurs, finalize the current range and start a new one.

</details>

<details>
<summary>📝 Hint 3: Implementation Details</summary>

Pseudocode approach:
1. Handle empty array edge case
2. Initialize range_start = nums[0]
3. For each index i from 0 to n-1:
   - If we're at the end OR next number breaks sequence:
     - Format range from range_start to nums[i]
     - Add to result
     - Set range_start = nums[i+1] (if not at end)
4. Return result

Don't forget: A single number is formatted as "a", not "a->a"

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Nested Loop) | O(n²) | O(n) | Check every pair - unnecessarily slow |
| **Single Pass** | **O(n)** | **O(n)** | Optimal - visit each element once |
| Two Pointers | O(n) | O(n) | Alternative approach with start/end pointers |

**Optimal approach:** Single pass is ideal since array is sorted and we need to process all elements.

## Common Mistakes

**Mistake 1: Not handling single-element ranges**

```python
# Wrong - formats single elements as "7->7"
def summaryRanges(nums):
    result = []
    start = 0
    for i in range(len(nums)):
        if i == len(nums) - 1 or nums[i] + 1 != nums[i + 1]:
            result.append(f"{nums[start]}->{nums[i]}")
            start = i + 1
    return result
```

```python
# Correct - checks if range has more than one element
def summaryRanges(nums):
    result = []
    start = 0
    for i in range(len(nums)):
        if i == len(nums) - 1 or nums[i] + 1 != nums[i + 1]:
            if start == i:
                result.append(str(nums[start]))
            else:
                result.append(f"{nums[start]}->{nums[i]}")
            start = i + 1
    return result
```

**Mistake 2: Forgetting to handle empty array**

```python
# Wrong - crashes on empty array
def summaryRanges(nums):
    result = []
    start = nums[0]  # IndexError on empty array!
    # ...
```

```python
# Correct
def summaryRanges(nums):
    if not nums:
        return []
    result = []
    start = 0
    # ...
```

**Mistake 3: Off-by-one errors with indices**

```python
# Wrong - may miss last range
def summaryRanges(nums):
    result = []
    start = 0
    for i in range(len(nums) - 1):  # Stops too early!
        if nums[i] + 1 != nums[i + 1]:
            # ...
    return result  # Last range never added
```

```python
# Correct - includes last element check
def summaryRanges(nums):
    result = []
    start = 0
    for i in range(len(nums)):
        if i == len(nums) - 1 or nums[i] + 1 != nums[i + 1]:
            # Process range
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Missing Ranges | Easy | Find gaps between ranges in a target interval |
| Data Stream as Disjoint Intervals | Hard | Dynamically maintain ranges as numbers arrive |
| Range Addition | Medium | Apply range updates and return final array |
| Merge Intervals | Medium | Combine overlapping intervals from unsorted input |

## Practice Checklist

- [ ] **Day 1:** Solve with single pass approach
- [ ] **Day 3:** Handle all edge cases (empty, single element, all consecutive)
- [ ] **Day 7:** Solve without looking at previous solution
- [ ] **Day 14:** Implement in under 15 minutes with proper formatting
- [ ] **Day 30:** Solve the "Missing Ranges" variation

**Strategy**: See [Two Pointers Pattern](../strategies/patterns/two-pointers.md)
