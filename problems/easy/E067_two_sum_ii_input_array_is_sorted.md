---
id: E067
old_id: F167
slug: two-sum-ii-input-array-is-sorted
title: Two Sum II - Input Array Is Sorted
difficulty: easy
category: easy
topics: ["array", "two-pointers", "binary-search"]
patterns: ["complement-search", "two-pointers"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E001", "M167", "M015"]
prerequisites: ["two-pointers", "binary-search"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Two Sum II - Input Array Is Sorted

## Problem

Given a sorted array of integers and a target value, find two numbers that add up to the target. Return the indices of these two numbers as a 1-indexed array (not 0-indexed).

**Key differences from the classic Two Sum:**
- The array is sorted in non-decreasing order (allows for better solutions)
- Return 1-indexed positions instead of 0-indexed
- The problem guarantees exactly one solution exists

**Example walkthrough:**
For `numbers = [2, 7, 11, 15]` and `target = 9`:
- Index 1 has value 2, index 2 has value 7
- 2 + 7 = 9, so return `[1, 2]` (1-indexed)

**The challenge:** Because the array is sorted, you can solve this in O(n) time with O(1) space using the two-pointer technique. This is more efficient than using a hash map (which would use O(n) space).

**How two pointers work:**
```
Start: [2, 7, 11, 15]
        ↑           ↑
       left       right

Sum = 2 + 15 = 17 > 9 (too large)
Move right pointer left

       [2, 7, 11, 15]
        ↑       ↑
       left   right

Sum = 2 + 11 = 13 > 9 (still too large)
Move right pointer left

       [2, 7, 11, 15]
        ↑   ↑
       left right

Sum = 2 + 7 = 9 (found it!)
```

## Why This Matters

This problem teaches the classic **two-pointer squeeze technique** - one of the most important patterns for sorted array problems. Understanding when and how to use two pointers is essential for:
- Three Sum and Four Sum problems
- Container with most water
- Trapping rainwater
- Palindrome verification

The technique appears in countless interview problems. The pattern is simple: start pointers at opposite ends, move them toward each other based on a comparison. This reduces O(n²) brute force to O(n) by leveraging the sorted property to eliminate impossible pairs.

## Examples

**Example 1:**
- Input: `numbers = [2,7,11,15], target = 9`
- Output: `[1,2]`
- Explanation: The sum of 2 and 7 is 9. Therefore, index₁ = 1, index₂ = 2. We return [1, 2].

**Example 2:**
- Input: `numbers = [2,3,4], target = 6`
- Output: `[1,3]`
- Explanation: The sum of 2 and 4 is 6. Therefore index₁ = 1, index₂ = 3. We return [1, 3].

**Example 3:**
- Input: `numbers = [-1,0], target = -1`
- Output: `[1,2]`
- Explanation: The sum of -1 and 0 is -1. Therefore index₁ = 1, index₂ = 2. We return [1, 2].

## Constraints

- 2 <= numbers.length <= 3 * 10⁴
- -1000 <= numbers[i] <= 1000
- numbers is sorted in **non-decreasing order**.
- -1000 <= target <= 1000
- The tests are generated such that there is **exactly one solution**.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Leveraging the Sorted Property</summary>

Unlike the original Two Sum problem, this array is SORTED. How can you use this property?

If you pick two numbers and their sum is:
- Too small: Which number should you change? The smaller or larger one?
- Too large: Which number should you change?

Think about starting with numbers at opposite ends of the array. What happens as you move the pointers?

</details>

<details>
<summary>🎯 Hint 2: Two Pointers Strategy</summary>

Use two pointers, one at each end:
- Left pointer at index 0 (smallest value)
- Right pointer at index n-1 (largest value)

Calculate sum = numbers[left] + numbers[right]:
- If sum == target: Found the answer!
- If sum < target: Need a larger sum, move left pointer right (increase smaller value)
- If sum > target: Need a smaller sum, move right pointer left (decrease larger value)

Why does this work? The sorted property guarantees:
- Moving left pointer right increases the sum
- Moving right pointer left decreases the sum

</details>

<details>
<summary>📝 Hint 3: Step-by-Step Algorithm</summary>

**Two Pointers (Optimal):**
```
1. Initialize left = 0, right = n - 1
2. While left < right:
   a. sum = numbers[left] + numbers[right]
   b. If sum == target:
      - Return [left + 1, right + 1]  (1-indexed!)
   c. Else if sum < target:
      - left++  (need larger sum)
   d. Else (sum > target):
      - right--  (need smaller sum)
3. Return [] (no solution, though problem guarantees one exists)
```

Time: O(n), Space: O(1)

**Alternative approaches:**
- Hash map: O(n) time, O(n) space (same as Two Sum I)
- Binary search for each element: O(n log n) time, O(1) space

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Check all pairs |
| Hash Map | O(n) | O(n) | Same as Two Sum I |
| Binary Search | O(n log n) | O(1) | For each element, binary search for complement |
| **Two Pointers** | **O(n)** | **O(1)** | Optimal; uses sorted property |

## Common Mistakes

### 1. Forgetting 1-Indexed Output
```python
# WRONG: Returns 0-indexed positions
if numbers[left] + numbers[right] == target:
    return [left, right]

# CORRECT: Convert to 1-indexed
if numbers[left] + numbers[right] == target:
    return [left + 1, right + 1]
```

### 2. Moving Wrong Pointer
```python
# WRONG: Moving left when sum is too large
if sum < target:
    left += 1
elif sum > target:
    left -= 1  # Should move right pointer!

# CORRECT: Move appropriate pointer
if sum < target:
    left += 1  # Increase sum
else:  # sum > target
    right -= 1  # Decrease sum
```

### 3. Not Handling Duplicates Properly
```python
# WRONG: Assumes no duplicates, might skip solution
if numbers[left] == numbers[left + 1]:
    left += 1  # Could skip the answer!

# CORRECT: Only move based on sum comparison
# The two-pointer algorithm naturally handles duplicates
if sum < target:
    left += 1
elif sum > target:
    right -= 1
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Two Sum (unsorted) | Array not sorted | Use hash map approach |
| Three Sum | Find three numbers | Fix one, two pointers for others |
| Two Sum - All Pairs | Return all pairs | Continue after finding match, skip duplicates |
| K Sum | Find k numbers that sum to target | Recursion + two pointers |

## Practice Checklist

**Correctness:**
- [ ] Handles minimum size array (n=2)
- [ ] Handles negative numbers
- [ ] Returns 1-indexed positions (not 0-indexed)
- [ ] Handles duplicates in array
- [ ] Works with negative target
- [ ] Returns array in correct order [smaller, larger]

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 8 minutes
- [ ] Can explain why two pointers work
- [ ] Can compare with hash map approach
- [ ] Can extend to Three Sum problem

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Two Pointers Pattern](../../strategies/patterns/two-pointers.md)
