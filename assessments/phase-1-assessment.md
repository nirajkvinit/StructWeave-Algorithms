---
title: Phase 1 Assessment - Foundation Patterns
type: assessment
difficulty: foundation
estimated_time_minutes: 75
passing_score: "5/7 problems solved correctly (71%)"
patterns_tested: ["two-pointers", "sliding-window", "binary-search", "hash-table"]
---

# Phase 1 Assessment - Foundation Patterns

## Purpose

This assessment validates your mastery of fundamental algorithmic patterns that serve as building blocks for more advanced techniques. These patterns appear in 40-50% of all coding interview problems.

## Patterns Covered

- **Two Pointers:** Opposite direction, same direction, fast/slow
- **Sliding Window:** Fixed size, variable size, with hash map
- **Binary Search:** Standard, boundary conditions, search space reduction
- **Hash Table:** Lookups, counting, complement search

## Assessment Structure

- **7 Problems** ranging from easy to medium difficulty
- **Estimated Time:** 75 minutes total (10-12 minutes per problem)
- **Passing Score:** 5/7 problems solved correctly (71%)
- **Format:** Timed, closed-book (no external resources)

## Instructions

1. Solve problems in order (difficulty increases)
2. Write complete, compilable code
3. Explain your approach and complexity
4. Test with provided examples
5. Note any problems you couldn't solve for review

---

## Problem 1: Two Pointers - Opposite Direction (Easy, 10 minutes)
**Problem ID:** E067 - Two Sum II (Sorted Array)

### Problem Statement

Given a sorted array of integers, find two numbers that add up to a specific target. Return the 1-indexed positions of the two numbers.

You may assume that each input has exactly one solution, and you may not use the same element twice.

### Example
```
Input: numbers = [2,7,11,15], target = 9
Output: [1,2]
Explanation: 2 + 7 = 9, indices are 1 and 2 (1-indexed)
```

### Constraints
- 2 ≤ numbers.length ≤ 30,000
- -1000 ≤ numbers[i] ≤ 1000
- -1000 ≤ target ≤ 1000
- Array is sorted in non-decreasing order
- Exactly one solution exists

### Requirements
- **Must use two-pointer technique** (not hash map)
- Time: O(n), Space: O(1)
- Handle negative numbers correctly

**Reference:** [E067 - Two Sum II](../problems/easy/E067_two_sum_ii_input_array_is_sorted.md)

---

## Problem 2: Two Pointers - In-Place Modification (Easy, 10 minutes)
**Problem ID:** E016 - Remove Duplicates from Sorted Array

### Problem Statement

Given a sorted array, remove duplicates in-place such that each element appears only once. Return the length of the new array. Do not allocate extra space - you must modify the input array in-place with O(1) extra memory.

### Example
```
Input: nums = [1,1,2,2,3]
Output: 3, nums = [1,2,3,_,_]
Explanation: First three elements contain unique values
```

### Constraints
- 0 ≤ nums.length ≤ 30,000
- -100 ≤ nums[i] ≤ 100
- Array is sorted in non-decreasing order

### Requirements
- Use slow/fast pointer technique
- O(n) time, O(1) space
- Modify array in-place

**Reference:** [E016 - Remove Duplicates from Sorted Array](../problems/easy/E016_remove_duplicates_from_sorted_array.md)

---

## Problem 3: Sliding Window - Variable Size (Medium, 12 minutes)
**Problem ID:** M002 - Longest Substring Without Repeating Characters

### Problem Statement

Given a string, find the length of the longest substring without repeating characters.

### Examples
```
Input: s = "abcabcbb"
Output: 3
Explanation: "abc" is the longest substring without repeating characters

Input: s = "bbbbb"
Output: 1

Input: s = "pwwkew"
Output: 3
Explanation: "wke" is the longest substring
```

### Constraints
- 0 ≤ s.length ≤ 50,000
- s consists of English letters, digits, symbols, and spaces

### Requirements
- Use sliding window with hash map/set
- O(n) time, O(min(m,n)) space where m is charset size
- Explain window expansion and contraction logic

**Reference:** [M002 - Longest Substring Without Repeating Characters](../problems/medium/M002_longest_substring_without_repeating_characters.md)

---

## Problem 4: Binary Search - Standard Template (Easy, 10 minutes)
**Problem ID:** E021 - Search Insert Position

### Problem Statement

Given a sorted array of distinct integers and a target value, return the index if the target is found. If not, return the index where it would be if it were inserted in order.

You must write an algorithm with O(log n) runtime complexity.

### Examples
```
Input: nums = [1,3,5,6], target = 5
Output: 2

Input: nums = [1,3,5,6], target = 2
Output: 1

Input: nums = [1,3,5,6], target = 7
Output: 4
```

### Constraints
- 1 ≤ nums.length ≤ 10,000
- -10,000 ≤ nums[i] ≤ 10,000
- nums contains distinct values sorted in ascending order
- -10,000 ≤ target ≤ 10,000

### Requirements
- Implement binary search correctly
- Handle all edge cases (not found, insert at start/end)
- O(log n) time, O(1) space

**Reference:** [E021 - Search Insert Position](../problems/easy/E021_search_insert_position.md)

---

## Problem 5: Binary Search - Find Boundaries (Easy, 12 minutes)
**Problem ID:** E020 - Find First and Last Position

### Problem Statement

Given a sorted array of integers, find the starting and ending position of a given target value. If the target is not found, return [-1, -1].

You must write an algorithm with O(log n) runtime complexity.

### Examples
```
Input: nums = [5,7,7,8,8,10], target = 8
Output: [3,4]

Input: nums = [5,7,7,8,8,10], target = 6
Output: [-1,-1]

Input: nums = [], target = 0
Output: [-1,-1]
```

### Constraints
- 0 ≤ nums.length ≤ 100,000
- -10^9 ≤ nums[i] ≤ 10^9
- nums is sorted in non-decreasing order
- -10^9 ≤ target ≤ 10^9

### Requirements
- Implement two binary searches (first and last occurrence)
- O(log n) time, O(1) space
- Handle duplicates correctly

**Reference:** [E020 - Find First and Last Position](../problems/easy/E020_find_first_and_last_position_of_element_in_sorted_array.md)

---

## Problem 6: Hash Table + Array (Medium, 10 minutes)
**Problem ID:** E010 - 3Sum

### Problem Statement

Given an integer array, return all unique triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.

The solution set must not contain duplicate triplets.

### Example
```
Input: nums = [-1,0,1,2,-1,-4]
Output: [[-1,-1,2],[-1,0,1]]

Input: nums = [0,1,1]
Output: []

Input: nums = [0,0,0]
Output: [[0,0,0]]
```

### Constraints
- 3 ≤ nums.length ≤ 3000
- -100,000 ≤ nums[i] ≤ 100,000

### Requirements
- Combine sorting + two pointers
- Avoid duplicate triplets
- O(n²) time, O(1) space (excluding output)
- Explain how you handle duplicates

**Reference:** [E010 - 3Sum](../problems/easy/E010_3sum.md)

---

## Problem 7: Container Optimization (Easy, 11 minutes)
**Problem ID:** E006 - Container With Most Water

### Problem Statement

Given an array of non-negative integers where each represents a point at coordinate (i, height[i]), find two lines that together with the x-axis form a container that holds the most water.

Return the maximum amount of water a container can store.

### Example
```
Input: height = [1,8,6,2,5,4,8,3,7]
Output: 49
Explanation: Lines at index 1 and 8 form container with area = 7 * min(8,7) = 49
```

### Constraints
- 2 ≤ height.length ≤ 100,000
- 0 ≤ height[i] ≤ 10,000

### Requirements
- Use two-pointer technique (greedy approach)
- O(n) time, O(1) space
- Explain why moving the shorter line is optimal

**Reference:** [E006 - Container With Most Water](../problems/easy/E006_container_with_most_water.md)

---

## Scoring Rubric

Each problem is scored individually:

### Full Credit (1 point)
- ✓ Correct algorithm/pattern applied
- ✓ Working code with no bugs
- ✓ Optimal time and space complexity
- ✓ Handles all edge cases
- ✓ Clean, readable code

### Partial Credit (0.5 points)
- ✓ Correct approach identified
- ✗ Minor implementation bugs
- ✗ Suboptimal but acceptable complexity
- ✓ Handles most cases

### No Credit (0 points)
- ✗ Wrong approach or pattern
- ✗ Major algorithmic errors
- ✗ Significantly suboptimal complexity
- ✗ Incomplete solution

---

## Passing Criteria

**Minimum Score:** 5/7 (71%)

### Performance Levels

**7/7 (100%) - Excellent**
- You've mastered Phase 1 patterns
- Ready to advance to Phase 2
- Strong pattern recognition and implementation

**6/7 (86%) - Very Good**
- Solid understanding with minor gaps
- Review the missed problem's pattern
- Proceed to Phase 2 after targeted review

**5/7 (71%) - Pass**
- Adequate foundation established
- Review problems 6-7 if you missed them
- Can proceed to Phase 2 with caution
- Consider revisiting weaker patterns

**4/7 (57%) - Below Passing**
- Need more practice with Phase 1 patterns
- Identify specific weak patterns
- Practice 10-15 more problems in weak areas
- Retake assessment in 1 week

**0-3/7 (<43%) - Needs Review**
- Fundamental gaps in pattern understanding
- Return to Phase 1 study materials
- Practice 20-30 problems across all patterns
- Retake assessment in 2 weeks

---

## Common Mistakes to Avoid

### Two Pointers
- ❌ Not considering negative numbers
- ❌ Incorrect pointer movement logic
- ❌ Off-by-one errors in boundaries
- ❌ Not handling empty or single-element arrays

### Sliding Window
- ❌ Not contracting window properly
- ❌ Wrong initialization of window state
- ❌ Forgetting to update result during expansion
- ❌ Not handling edge case of empty string

### Binary Search
- ❌ Infinite loop (wrong mid calculation)
- ❌ Not handling target not found
- ❌ Integer overflow in mid calculation: use `left + (right - left) / 2`
- ❌ Wrong boundary conditions (< vs ≤)

### Hash Table
- ❌ Not handling duplicates properly
- ❌ Wrong hash key/value pair
- ❌ Not checking if key exists before access
- ❌ Modifying array while iterating

---

## Time Allocation Guide

| Problem | Pattern | Difficulty | Est. Time | Cumulative |
|---------|---------|------------|-----------|------------|
| 1 | Two Pointers | Easy | 10 min | 10 min |
| 2 | Two Pointers | Easy | 10 min | 20 min |
| 3 | Sliding Window | Medium | 12 min | 32 min |
| 4 | Binary Search | Easy | 10 min | 42 min |
| 5 | Binary Search | Easy | 12 min | 54 min |
| 6 | Hash Table | Medium | 10 min | 64 min |
| 7 | Two Pointers | Easy | 11 min | 75 min |

**Buffer:** You have 75 minutes total. If a problem takes >15 minutes, move on and return to it later.

---

## Post-Assessment Review

After completing the assessment:

### 1. Self-Assessment Questions
- Which pattern was easiest for you?
- Which pattern needs more practice?
- Did you correctly identify the pattern for each problem?
- Were complexity requirements met?

### 2. Detailed Review Process
For each incorrect or partial solution:

1. **Identify the gap:**
   - Was it pattern recognition?
   - Implementation details?
   - Edge cases?
   - Complexity optimization?

2. **Study the solution:**
   - Read the full problem explanation
   - Understand the optimal approach
   - Trace through examples by hand

3. **Practice similar problems:**
   - Find 3-5 problems with the same pattern
   - Solve without hints
   - Time yourself

### 3. Create a Review Schedule

**Immediate (Day 1):**
- Review all incorrect solutions
- Understand why you missed them
- Re-solve from scratch

**Short-term (Week 1):**
- Practice 5 more problems per weak pattern
- Focus on edge cases and complexity

**Long-term (Week 2-3):**
- Spaced repetition of all Phase 1 patterns
- Move to Phase 2 when confident

---

## Next Steps Based on Score

### If You Passed (5-7/7)

**Congratulations!** You're ready for Phase 2.

**Action Items:**
1. Review any missed problems within 24 hours
2. Practice 2-3 more problems in weak patterns
3. Begin [Phase 2 Assessment](./phase-2-assessment.md) within 1 week
4. Study preview materials:
   - [Prefix Sum Pattern](../strategies/patterns/prefix-sum.md)
   - [Monotonic Stack Pattern](../strategies/patterns/monotonic-stack.md)

### If You Didn't Pass (0-4/7)

**Don't worry!** More practice is needed.

**Action Items:**
1. Identify your two weakest patterns
2. Complete focused practice:
   - **Two Pointers:** 10 more problems
   - **Sliding Window:** 8 more problems
   - **Binary Search:** 8 more problems
   - **Hash Table:** 5 more problems
3. Review strategy guides:
   - [Two Pointers Guide](../strategies/patterns/two-pointers.md)
   - [Sliding Window Guide](../strategies/patterns/sliding-window.md)
   - [Binary Search Guide](../strategies/patterns/binary-search.md)
4. Retake assessment in 1-2 weeks

---

## Additional Practice Problems

If you need more practice before or after the assessment:

### Two Pointers Practice
- E067 - Two Sum II (Sorted)
- E108 - Move Zeroes
- E010 - 3Sum
- E011 - 3Sum Closest
- M004 - Remove Nth Node From End

### Sliding Window Practice
- E206 - Maximum Average Subarray I
- M002 - Longest Substring Without Repeating
- M067 - Longest Substring with At Most Two Distinct
- M184 - Longest Repeating Character Replacement

### Binary Search Practice
- E021 - Search Insert Position
- E020 - Find First and Last Position
- M008 - Search in Rotated Sorted Array
- M026 - Search 2D Matrix

### Hash Table Practice
- E001 - Two Sum
- E010 - 3Sum
- M017 - Merge Intervals
- E159 - Find All Anagrams

---

**Ready to begin? Good luck!** Remember: understanding WHY a solution works is more important than memorizing code. Focus on pattern recognition and systematic problem-solving approaches.

**Related Resources:**
- [Pattern Strategy Overview](../strategies/patterns/README.md)
- [Two Pointers Deep Dive](../strategies/patterns/two-pointers.md)
- [Sliding Window Deep Dive](../strategies/patterns/sliding-window.md)
- [Binary Search Deep Dive](../strategies/patterns/binary-search.md)
- [Learning Roadmap](../tracks/roadmap.md)
