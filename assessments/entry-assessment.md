---
title: Entry Assessment - Algorithm Fundamentals
type: assessment
difficulty: entry
estimated_time_minutes: 90
passing_score: "7/12 correct answers (58%)"
---

# Entry Assessment - Algorithm Fundamentals

## Purpose

This assessment evaluates your foundational knowledge of algorithms and data structures to help place you in the appropriate learning track. It covers essential concepts that form the building blocks of all advanced topics.

## Assessment Structure

- **Part A: Conceptual Questions (6 questions)** - 30 minutes
- **Part B: Practical Coding (6 problems)** - 60 minutes
- **Total Time**: 90 minutes
- **Passing Score**: 7/12 (58%)

## Instructions

1. Complete all questions in order
2. For coding problems, write working code without running it
3. Explain your reasoning and complexity analysis
4. No external resources allowed during assessment
5. Take note of which problems you struggled with for targeted review

---

## Part A: Conceptual Questions (30 minutes)

### Question 1: Time Complexity Analysis

What is the time complexity of this code snippet?

```python
def mystery(n):
    result = 0
    i = 1
    while i < n:
        for j in range(i):
            result += 1
        i *= 2
    return result
```

**Options:**
- A) O(n)
- B) O(n log n)
- C) O(log n)
- D) O(n²)

**Explain your reasoning.**

---

### Question 2: Space Complexity

Which operation has O(1) space complexity?

**Options:**
- A) Creating a hash map to store all elements from an array
- B) Reversing an array in-place by swapping elements
- C) Building a recursive call stack for depth-first search
- D) Creating a copy of a linked list

**Explain why the others are not O(1).**

---

### Question 3: Data Structure Selection

You need to maintain a collection of elements where:
- Elements are frequently added and removed from both ends
- You need to access elements by position occasionally
- Order must be preserved

Which data structure is most appropriate?

**Options:**
- A) Array/ArrayList
- B) Linked List
- C) Deque (Double-ended queue)
- D) Hash Set

**Justify your choice.**

---

### Question 4: Algorithm Pattern Recognition

Given an array, you need to find the longest subarray with a sum equal to k. Which pattern(s) would be most effective?

**Options:**
- A) Two pointers
- B) Sliding window
- C) Prefix sum with hash map
- D) Binary search

**Explain why your choice is optimal.**

---

### Question 5: Recursion vs Iteration

Which statement about recursion is TRUE?

**Options:**
- A) Recursion is always faster than iteration
- B) Every recursive solution can be converted to an iterative one
- C) Recursive solutions always use less memory than iterative ones
- D) Recursion cannot be used for tree traversal

**Provide a brief justification.**

---

### Question 6: Hash Table Understanding

What is the average and worst-case time complexity for searching an element in a hash table?

**Average case:** ___________
**Worst case:** ___________

**Explain what causes the worst case.**

---

## Part B: Practical Coding Problems (60 minutes)

### Problem 1: Array Manipulation (Easy, 8 minutes)
**Problem ID:** E001 - Two Sum

Given an array of integers `nums` and an integer `target`, return indices of the two numbers that add up to `target`.

**Example:**
- Input: `nums = [2,7,11,15], target = 9`
- Output: `[0,1]`

**Requirements:**
- Write the complete solution
- Explain time and space complexity
- Identify the key pattern used

**Reference:** [E001 - Two Sum](../problems/easy/E001_two_sum.md)

---

### Problem 2: String Processing (Easy, 8 minutes)
**Problem ID:** E014 - Valid Parentheses

Given a string containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. An input string is valid if brackets are properly matched and nested.

**Example:**
- Input: `s = "()[]{}"`
- Output: `true`
- Input: `s = "([)]"`
- Output: `false`

**Requirements:**
- Identify the appropriate data structure
- Explain why it works

**Reference:** [E014 - Valid Parentheses](../problems/easy/E014_valid_parentheses.md)

---

### Problem 3: Linked List (Easy, 10 minutes)
**Problem ID:** E015 - Merge Two Sorted Lists

Merge two sorted linked lists and return it as a sorted list. The list should be made by splicing together the nodes of the first two lists.

**Example:**
- Input: `list1 = [1,2,4], list2 = [1,3,4]`
- Output: `[1,1,2,3,4,4]`

**Requirements:**
- Write the solution (can be iterative or recursive)
- Explain space complexity implications

**Reference:** [E015 - Merge Two Sorted Lists](../problems/easy/E015_merge_two_sorted_lists.md)

---

### Problem 4: Searching (Easy, 10 minutes)
**Problem ID:** E021 - Search Insert Position

Given a sorted array of distinct integers and a target value, return the index if the target is found. If not, return the index where it would be if it were inserted in order.

**Example:**
- Input: `nums = [1,3,5,6], target = 5`
- Output: `2`
- Input: `nums = [1,3,5,6], target = 2`
- Output: `1`

**Requirements:**
- Must use O(log n) approach
- Explain the algorithm used

**Reference:** [E021 - Search Insert Position](../problems/easy/E021_search_insert_position.md)

---

### Problem 5: Two Pointers Pattern (Easy, 12 minutes)
**Problem ID:** E016 - Remove Duplicates from Sorted Array

Given an integer array `nums` sorted in non-decreasing order, remove duplicates in-place such that each unique element appears only once. Return the number of unique elements.

**Example:**
- Input: `nums = [1,1,2]`
- Output: `2, nums = [1,2,_]`

**Requirements:**
- Must modify array in-place with O(1) extra space
- Explain the two-pointer technique

**Reference:** [E016 - Remove Duplicates from Sorted Array](../problems/easy/E016_remove_duplicates_from_sorted_array.md)

---

### Problem 6: Array Subarray (Medium, 12 minutes)
**Problem ID:** M015 - Maximum Subarray

Given an integer array `nums`, find the contiguous subarray with the largest sum and return that sum.

**Example:**
- Input: `nums = [-2,1,-3,4,-1,2,1,-5,4]`
- Output: `6` (subarray [4,-1,2,1])

**Requirements:**
- Aim for O(n) time complexity
- Name the algorithm/pattern used

**Reference:** [M015 - Maximum Subarray](../problems/medium/M015_maximum_subarray.md)

---

## Scoring Guide

### Part A: Conceptual (6 points, 1 each)

**Question 1:** B - O(n log n). The outer loop runs log n times (i doubles each iteration), and the inner loop runs i times, giving 1 + 2 + 4 + ... + n/2 = n-1 operations.

**Question 2:** B - Reversing in-place. Swapping uses only a few temporary variables. Others create new data structures.

**Question 3:** C - Deque. Optimized for both-ends operations and allows indexed access, unlike pure linked lists.

**Question 4:** C - Prefix sum with hash map. Allows O(n) solution by tracking cumulative sums. Sliding window only works for all positive numbers.

**Question 5:** B - Every recursive solution can be converted to iterative. This is a fundamental principle (though iterative may be more complex).

**Question 6:** Average: O(1), Worst: O(n). Worst case occurs with hash collisions when all elements hash to same bucket.

### Part B: Practical (6 points)

Each problem scored as:
- **Full credit (1 point):** Working solution with correct complexity
- **Partial credit (0.5 points):** Correct approach but implementation issues or suboptimal complexity
- **No credit (0 points):** Wrong approach or incomplete

**Problem 1:** Hash map solution, O(n) time, O(n) space
**Problem 2:** Stack solution, O(n) time, O(n) space
**Problem 3:** Two pointers/recursive, O(n+m) time, O(1) space iterative or O(n+m) recursive
**Problem 4:** Binary search, O(log n) time, O(1) space
**Problem 5:** Two pointers (slow/fast), O(n) time, O(1) space
**Problem 6:** Kadane's algorithm, O(n) time, O(1) space

---

## Track Placement Recommendations

Based on your score, we recommend:

### Score: 11-12 (92-100%) - Advanced Track
- **Assessment:** You have a strong foundation
- **Recommendation:** Start with Phase 2 (Intermediate Patterns)
- **Focus:** Advanced patterns and optimization techniques
- **Next:** Complete Phase 2 Assessment within 1 week

### Score: 9-10 (75-83%) - Intermediate Track
- **Assessment:** Solid understanding with some gaps
- **Recommendation:** Start with Phase 1 but move quickly
- **Focus:** Pattern recognition and complexity analysis
- **Next:** Review weak areas, then Phase 1 Assessment

### Score: 7-8 (58-67%) - Foundation Track (Recommended)
- **Assessment:** Basic understanding, needs strengthening
- **Recommendation:** Complete Phase 1 thoroughly
- **Focus:** Core patterns (Two Pointers, Binary Search, Sliding Window)
- **Next:** Deep dive into [Pattern Fundamentals](../strategies/patterns/README.md)

### Score: 0-6 (<58%) - Fundamentals Track
- **Assessment:** Significant gaps in core concepts
- **Recommendation:** Start with fundamentals review
- **Focus:** Data structures basics and time/space complexity
- **Resources:**
  - [Fundamentals Guide](../strategies/fundamentals/README.md)
  - [Time Complexity](../strategies/fundamentals/time-complexity.md)
  - [Space Complexity](../strategies/fundamentals/space-complexity.md)
- **Next:** Retake Entry Assessment in 2 weeks

---

## Self-Reflection Questions

After completing the assessment, reflect on:

1. **Conceptual Understanding:**
   - Which complexity analysis questions were challenging?
   - Do you understand when to use each data structure?

2. **Problem-Solving:**
   - Did you recognize the patterns in each problem?
   - Which problems took longer than estimated?
   - Did you consider edge cases?

3. **Implementation:**
   - Were you able to translate ideas into code?
   - Did you struggle with specific language features?

4. **Time Management:**
   - Did you finish within 90 minutes?
   - Which sections needed more time?

---

## Next Steps

1. **Review incorrect answers** using the linked problem files
2. **Identify patterns** in the problems you struggled with
3. **Follow the recommended track** based on your score
4. **Create a study plan** focusing on weak areas
5. **Schedule Phase 1 Assessment** for 1-2 weeks from now

**Remember:** This assessment is a starting point, not a final judgment. Everyone learns at their own pace. Focus on understanding concepts deeply rather than memorizing solutions.

---

**Related Resources:**
- [Pattern Strategy Guide](../strategies/patterns/README.md)
- [Two Pointers Pattern](../strategies/patterns/two-pointers.md)
- [Binary Search Pattern](../strategies/patterns/binary-search.md)
- [Learning Roadmap](../tracks/roadmap.md)
