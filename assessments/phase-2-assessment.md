---
title: Phase 2 Assessment - Intermediate Patterns
type: assessment
difficulty: intermediate
estimated_time_minutes: 85
passing_score: "5/7 problems solved correctly (71%)"
patterns_tested: ["prefix-sum", "cyclic-sort", "monotonic-stack", "merge-intervals"]
---

# Phase 2 Assessment - Intermediate Patterns

## Purpose

This assessment evaluates your understanding of intermediate algorithmic patterns that build upon Phase 1 foundations. These patterns are crucial for solving medium-difficulty interview problems and appear in 30-40% of technical interviews.

## Patterns Covered

- **Prefix Sum / Cumulative Sum:** Range queries, subarray problems
- **Cyclic Sort:** In-place sorting with limited range
- **Monotonic Stack:** Next greater/smaller element problems
- **Merge Intervals:** Overlapping ranges, scheduling problems
- **Pattern Recognition:** Identifying which pattern fits a problem

## Assessment Structure

- **7 Problems** ranging from easy to medium difficulty
- **Estimated Time:** 85 minutes total (10-15 minutes per problem)
- **Passing Score:** 5/7 problems solved correctly (71%)
- **Prerequisites:** Must pass Phase 1 Assessment

## Instructions

1. Solve problems in order (difficulty increases)
2. Write complete, working code
3. Explain time and space complexity
4. For each problem, identify the pattern before coding
5. No external resources during assessment

---

## Problem 1: Prefix Sum Basics (Easy, 10 minutes)
**Problem ID:** E114 - Range Sum Query (Immutable)

### Problem Statement

Given an integer array `nums`, handle multiple queries of the following type:
- Calculate the sum of the elements of `nums` between indices `left` and `right` (inclusive) where `left <= right`.

Implement the `NumArray` class:
- `NumArray(int[] nums)` - Initializes the object with the integer array `nums`
- `int sumRange(int left, int right)` - Returns the sum of elements between indices `left` and `right`

### Examples
```
Input:
["NumArray", "sumRange", "sumRange", "sumRange"]
[[[-2, 0, 3, -5, 2, -1]], [0, 2], [2, 5], [0, 5]]

Output:
[null, 1, -1, -3]

Explanation:
NumArray numArray = new NumArray([-2, 0, 3, -5, 2, -1]);
numArray.sumRange(0, 2); // return (-2 + 0 + 3) = 1
numArray.sumRange(2, 5); // return (3 + -5 + 2 + -1) = -1
numArray.sumRange(0, 5); // return (-2 + 0 + 3 + -5 + 2 + -1) = -3
```

### Constraints
- 1 ≤ nums.length ≤ 10,000
- -10^5 ≤ nums[i] ≤ 10^5
- 0 ≤ left ≤ right < nums.length
- At most 10,000 calls to `sumRange`

### Requirements
- Use prefix sum array for O(1) query time
- Explain trade-off: O(n) space for O(1) queries vs O(1) space for O(n) queries
- Initialize: O(n), Query: O(1)

**Reference:** [E114 - Range Sum Query](../problems/easy/E114_range_sum_query_immutable.md)

---

## Problem 2: Subarray with Target Sum (Medium, 12 minutes)
**Problem ID:** M015 - Maximum Subarray (Kadane's Algorithm)

### Problem Statement

Given an integer array `nums`, find the contiguous subarray (containing at least one number) which has the largest sum and return that sum.

### Examples
```
Input: nums = [-2,1,-3,4,-1,2,1,-5,4]
Output: 6
Explanation: [4,-1,2,1] has the largest sum = 6

Input: nums = [1]
Output: 1

Input: nums = [5,4,-1,7,8]
Output: 23
```

### Constraints
- 1 ≤ nums.length ≤ 100,000
- -10,000 ≤ nums[i] ≤ 10,000

### Requirements
- Implement Kadane's algorithm
- O(n) time, O(1) space
- Explain the "local max vs global max" concept
- Handle all-negative arrays correctly

**Reference:** [M015 - Maximum Subarray](../problems/medium/M015_maximum_subarray.md)

---

## Problem 3: Cyclic Sort Application (Easy, 12 minutes)
**Problem ID:** E161 - Find All Duplicates in Array

### Problem Statement

Given an integer array `nums` of length `n` where all integers are in the range [1, n] and each integer appears once or twice, return an array of all the integers that appear twice.

You must write an algorithm that runs in O(n) time and uses only constant extra space.

### Examples
```
Input: nums = [4,3,2,7,8,2,3,1]
Output: [2,3]

Input: nums = [1,1,2]
Output: [1]

Input: nums = [1]
Output: []
```

### Constraints
- n == nums.length
- 1 ≤ n ≤ 100,000
- 1 ≤ nums[i] ≤ n
- Each element appears once or twice

### Requirements
- Use cyclic sort or index marking technique
- O(n) time, O(1) space (excluding output)
- Explain why the value range [1,n] enables O(1) space solution

**Reference:** [E161 - Find All Duplicates](../problems/easy/E161_find_all_duplicates_in_an_array.md)

---

## Problem 4: Monotonic Stack - Next Greater (Medium, 13 minutes)
**Problem ID:** E227 - Asteroid Collision

### Problem Statement

We are given an array `asteroids` of integers representing asteroids in a row. For each asteroid, the absolute value represents its size, and the sign represents its direction (positive = right, negative = left). Each asteroid moves at the same speed.

Find out the state of the asteroids after all collisions. If two asteroids meet, the smaller one will explode. If both are the same size, both explode. Two asteroids moving in the same direction will never meet.

### Examples
```
Input: asteroids = [5,10,-5]
Output: [5,10]
Explanation: The 10 and -5 collide, -5 explodes. The 5 and 10 never collide.

Input: asteroids = [8,-8]
Output: []
Explanation: Both explode

Input: asteroids = [10,2,-5]
Output: [10]
Explanation: 2 and -5 collide (-5 wins), then 10 and -5 collide (10 wins)
```

### Constraints
- 2 ≤ asteroids.length ≤ 10,000
- -1000 ≤ asteroids[i] ≤ 1000
- asteroids[i] != 0

### Requirements
- Use stack to track surviving asteroids
- O(n) time, O(n) space
- Explain collision logic clearly
- Handle multiple consecutive collisions

**Reference:** [E227 - Asteroid Collision](../problems/easy/E227_asteroid_collision.md)

---

## Problem 5: Merge Intervals - Core Pattern (Medium, 14 minutes)
**Problem ID:** M017 - Merge Intervals

### Problem Statement

Given an array of intervals where `intervals[i] = [start_i, end_i]`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.

### Examples
```
Input: intervals = [[1,3],[2,6],[8,10],[15,18]]
Output: [[1,6],[8,10],[15,18]]
Explanation: [1,3] and [2,6] overlap, so merge to [1,6]

Input: intervals = [[1,4],[4,5]]
Output: [[1,5]]
Explanation: Intervals touching at boundary should be merged
```

### Constraints
- 1 ≤ intervals.length ≤ 10,000
- intervals[i].length == 2
- 0 ≤ start_i ≤ end_i ≤ 10,000

### Requirements
- Sort intervals first
- O(n log n) time, O(n) space
- Explain merge condition
- Handle edge cases (single interval, no overlaps, all overlap)

**Reference:** [M017 - Merge Intervals](../problems/medium/M017_merge_intervals.md)

---

## Problem 6: Insert Interval (Medium, 12 minutes)
**Problem ID:** M018 - Insert Interval

### Problem Statement

You are given an array of non-overlapping intervals `intervals` where `intervals[i] = [start_i, end_i]` represent the start and end of the i-th interval, sorted in ascending order by start_i. You are also given an interval `newInterval = [start, end]`.

Insert `newInterval` into `intervals` such that `intervals` is still sorted in ascending order by start_i and has no overlapping intervals (merge overlapping intervals if necessary).

Return `intervals` after the insertion.

### Examples
```
Input: intervals = [[1,3],[6,9]], newInterval = [2,5]
Output: [[1,5],[6,9]]

Input: intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval = [4,8]
Output: [[1,2],[3,10],[12,16]]
Explanation: New interval [4,8] overlaps with [3,5],[6,7],[8,10]
```

### Constraints
- 0 ≤ intervals.length ≤ 10,000
- intervals[i].length == 2
- 0 ≤ start_i ≤ end_i ≤ 100,000
- intervals is sorted by start_i
- newInterval.length == 2
- 0 ≤ start ≤ end ≤ 100,000

### Requirements
- Single pass through intervals
- O(n) time, O(n) space
- Handle three cases: before merge, during merge, after merge
- No sorting needed (already sorted)

**Reference:** [M018 - Insert Interval](../problems/medium/M018_insert_interval.md)

---

## Problem 7: Pattern Recognition Challenge (Medium, 12 minutes)
**Problem ID:** M067 - Longest Substring with At Most Two Distinct Characters

### Problem Statement

Given a string `s`, return the length of the longest substring that contains at most two distinct characters.

### Examples
```
Input: s = "eceba"
Output: 3
Explanation: "ece" is the longest substring with at most 2 distinct characters

Input: s = "ccaabbb"
Output: 5
Explanation: "aabbb" is the longest

Input: s = "a"
Output: 1
```

### Constraints
- 1 ≤ s.length ≤ 100,000
- s consists of English letters

### Requirements
- Identify this as a sliding window problem
- Use hash map to track character frequencies in window
- O(n) time, O(1) space (at most 26 characters)
- Explain window expansion and contraction logic

**Reference:** [M067 - Longest Substring with At Most Two Distinct](../problems/medium/M067_longest_substring_with_at_most_two_distinct_characters.md)

---

## Scoring Rubric

Each problem is scored individually:

### Full Credit (1 point)
- ✓ Correct pattern identified
- ✓ Optimal algorithm implemented
- ✓ Correct time and space complexity
- ✓ Handles all edge cases
- ✓ Clean, bug-free code
- ✓ Clear explanation of approach

### Partial Credit (0.5 points)
- ✓ Correct pattern but suboptimal implementation
- ✗ Minor bugs or edge case misses
- ✓ Understands concept but implementation issues
- ✓ Complexity close but not optimal

### No Credit (0 points)
- ✗ Wrong pattern applied
- ✗ Significantly wrong approach
- ✗ Major algorithmic errors
- ✗ Far from optimal complexity

---

## Passing Criteria

**Minimum Score:** 5/7 (71%)

### Performance Levels

**7/7 (100%) - Excellent**
- Mastered intermediate patterns
- Strong pattern recognition
- Ready for Phase 3 (Advanced)
- Consider competitive programming challenges

**6/7 (86%) - Very Good**
- Solid grasp with one weak area
- Review missed pattern
- Proceed to Phase 3 after targeted practice

**5/7 (71%) - Pass**
- Adequate understanding of most patterns
- Review problems 5-7 if missed
- Can proceed to Phase 3 with caution
- Extra practice recommended in weak areas

**4/7 (57%) - Below Passing**
- Need more practice with specific patterns
- Identify 2-3 weakest patterns
- Practice 10 more problems per weak pattern
- Retake in 1-2 weeks

**0-3/7 (<43%) - Needs Significant Review**
- Fundamental gaps in intermediate patterns
- Return to Phase 2 study materials
- Complete 30-40 more practice problems
- May need to review Phase 1 patterns
- Retake in 2-3 weeks

---

## Pattern-Specific Evaluation

### Prefix Sum (Problems 1-2)
**Key Concepts:**
- Building cumulative sum arrays
- O(1) range queries using prefix differences
- Kadane's algorithm as dynamic programming

**If you struggled:**
- Review [Prefix Sum Pattern Guide](../strategies/patterns/prefix-sum.md)
- Practice: Subarray sum problems
- Understand: prefix[i] - prefix[j] = sum(j+1 to i)

### Cyclic Sort (Problem 3)
**Key Concepts:**
- Using array indices when values are in range [1,n]
- In-place rearrangement
- Index marking vs actual sorting

**If you struggled:**
- Review [Cyclic Sort Pattern Guide](../strategies/patterns/cyclic-sort.md)
- Practice: Missing number problems
- Understand: Why range constraint enables O(1) space

### Monotonic Stack (Problem 4)
**Key Concepts:**
- Maintaining increasing/decreasing order in stack
- O(n) time by processing each element once
- Simulating state machines

**If you struggled:**
- Review [Monotonic Stack Pattern Guide](../strategies/patterns/monotonic-stack.md)
- Practice: Next greater element problems
- Understand: Each element pushed/popped at most once

### Merge Intervals (Problems 5-6)
**Key Concepts:**
- Sorting by start time
- Merge condition: current.start ≤ last.end
- Three-phase processing (before, during, after)

**If you struggled:**
- Review [Merge Intervals Pattern Guide](../strategies/patterns/merge-intervals.md)
- Practice: Meeting room problems
- Understand: When to merge vs when to add new interval

### Pattern Recognition (Problem 7)
**Key Concepts:**
- Recognizing sliding window with constraints
- Hash map for state tracking
- Variable window size

**If you struggled:**
- This tests Phase 1 + Phase 2 integration
- Review both sliding window and hash map patterns
- Practice identifying patterns from problem descriptions

---

## Common Mistakes by Pattern

### Prefix Sum
- ❌ Not handling empty subarrays
- ❌ Off-by-one errors in range calculation
- ❌ Forgetting to initialize prefix[0] = 0
- ❌ Not considering negative numbers in Kadane's

### Cyclic Sort
- ❌ Infinite loop when swapping
- ❌ Not using correct index (value - 1 for 1-indexed)
- ❌ Modifying while iterating incorrectly
- ❌ Not handling duplicates properly

### Monotonic Stack
- ❌ Wrong stack order (increasing vs decreasing)
- ❌ Not handling when stack becomes empty
- ❌ Popping without checking stack size
- ❌ Processing collisions in wrong order

### Merge Intervals
- ❌ Forgetting to sort first
- ❌ Wrong merge condition (< vs ≤)
- ❌ Not updating end of merged interval
- ❌ Modifying input when shouldn't

---

## Time Allocation Guide

| Problem | Pattern | Difficulty | Est. Time | Cumulative |
|---------|---------|------------|-----------|------------|
| 1 | Prefix Sum | Easy | 10 min | 10 min |
| 2 | Kadane/DP | Medium | 12 min | 22 min |
| 3 | Cyclic Sort | Easy | 12 min | 34 min |
| 4 | Monotonic Stack | Medium | 13 min | 47 min |
| 5 | Merge Intervals | Medium | 14 min | 61 min |
| 6 | Merge Intervals | Medium | 12 min | 73 min |
| 7 | Sliding Window | Medium | 12 min | 85 min |

**Strategy:** If stuck on a problem for >15 minutes, move on and return later.

---

## Post-Assessment Action Plan

### Immediate Review (Day 1)

**For each incorrect solution:**

1. **Read the full problem solution**
   - Understand the optimal approach
   - Trace through examples by hand
   - Identify where your approach differed

2. **Re-implement from scratch**
   - Don't look at solution while coding
   - Test with examples
   - Verify complexity

3. **Understand the pattern deeply**
   - Why does this pattern apply here?
   - What are the key indicators?
   - What variations exist?

### Short-term Practice (Week 1)

**Target practice problems per weak pattern:**
- 5-7 problems for patterns you missed
- 2-3 problems for patterns you got partial credit
- 1 review problem for patterns you mastered

**Practice Resources by Pattern:**

**Prefix Sum:**
- Range sum queries
- Subarray sum equals K
- Continuous subarray sum
- Product of array except self

**Cyclic Sort:**
- Find missing number
- Find all numbers disappeared
- First missing positive
- Find duplicate number

**Monotonic Stack:**
- Daily temperatures
- Next greater element
- Largest rectangle in histogram
- Trapping rain water

**Merge Intervals:**
- Meeting rooms I & II
- Minimum number of arrows
- Non-overlapping intervals
- Employee free time

### Long-term Mastery (Weeks 2-3)

1. **Mixed practice:**
   - Solve problems without knowing the pattern
   - Focus on pattern recognition
   - Practice identifying patterns from descriptions

2. **Spaced repetition:**
   - Day 3: Retry all Phase 2 assessment problems
   - Day 7: Random 10 problems from weak patterns
   - Day 14: Mixed pattern problems
   - Day 21: Teaching/explaining patterns to others

3. **Complexity analysis:**
   - Can you explain why each pattern has its complexity?
   - What trade-offs does each pattern make?
   - When would you choose one over another?

---

## Next Steps Based on Score

### If You Passed (5-7/7)

**Congratulations!** You're ready for Phase 3.

**Preparation for Phase 3:**
1. Review any missed problems within 48 hours
2. Do 5 mixed problems combining Phase 1 + Phase 2 patterns
3. Study Phase 3 preview materials:
   - [Graph Traversal (BFS/DFS)](../strategies/patterns/graph-traversal.md)
   - [Topological Sort](../strategies/patterns/topological-sort.md)
   - [Heap Patterns](../prerequisites/heaps.md)
4. Schedule [Phase 3 Assessment](./phase-3-assessment.md) in 1-2 weeks

**Challenge Problems** (optional, for 7/7 scorers):
- H009 - Trapping Rain Water (combines monotonic stack + two pointers)
- H015 - Minimum Window Substring (sliding window mastery)
- H016 - Largest Rectangle in Histogram (monotonic stack advanced)

### If You Didn't Pass (0-4/7)

**Keep going!** More focused practice needed.

**Recovery Plan:**

1. **Week 1: Pattern Isolation**
   - Choose your 2 weakest patterns
   - Solve 10 problems per pattern
   - Use strategy guides actively
   - Understand WHY, not just HOW

2. **Week 2: Pattern Integration**
   - Solve problems combining Phase 1 + Phase 2 patterns
   - Practice pattern recognition
   - Focus on medium difficulty problems

3. **Week 3: Assessment Retry**
   - Retake Phase 2 Assessment
   - Should see significant improvement
   - If still struggling, consider 1:1 help or study group

**Study Resources:**
- [All Pattern Guides](../strategies/patterns/README.md)
- [Prefix Sum Deep Dive](../strategies/patterns/prefix-sum.md)
- [Cyclic Sort Deep Dive](../strategies/patterns/cyclic-sort.md)
- [Monotonic Stack Deep Dive](../strategies/patterns/monotonic-stack.md)
- [Merge Intervals Deep Dive](../strategies/patterns/merge-intervals.md)

---

## Success Tips

1. **Pattern Recognition:** Before coding, spend 2-3 minutes identifying the pattern. Ask:
   - What's being optimized?
   - What constraints hint at a specific pattern?
   - Have I seen similar problems?

2. **Complexity First:** Know the target complexity before coding. If you can't achieve it, your approach is likely wrong.

3. **Edge Cases:** Always consider:
   - Empty input
   - Single element
   - All same elements
   - Extreme values (min/max)
   - Sorted vs unsorted (when relevant)

4. **Code Quality:** Even under time pressure:
   - Use meaningful variable names
   - Add comments for complex logic
   - Validate your solution with examples

5. **Don't Panic:** If stuck, skip and return later. Fresh eyes often see the solution.

---

**Ready to begin? Good luck!** Remember: Phase 2 patterns are about recognizing structure in problems. Focus on understanding WHY each pattern works, not memorizing solutions.

**Related Resources:**
- [Phase 1 Review](./phase-1-assessment.md)
- [Phase 3 Preview](./phase-3-assessment.md)
- [All Pattern Strategies](../strategies/patterns/README.md)
- [Learning Roadmap](../tracks/roadmap.md)
