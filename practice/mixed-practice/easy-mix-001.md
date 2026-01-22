---
title: Easy Mixed Practice Set 001
category: mixed-practice
difficulty: easy
problem_count: 10
estimated_time_minutes: 100-150
---

# Easy Mixed Practice Set 001

## Purpose

This set contains 10 easy problems from different patterns in randomized order. Unlike pattern drills, this simulates real interview scenarios where you must identify the pattern yourself.

## How to Use

### Practice Mode
1. **Read problem title only** - try to recall the pattern
2. **Set timer for 15 minutes** per problem
3. **Solve without looking at hints**
4. **Track time and mistakes**

### Review Mode
After solving all 10:
- Identify which patterns you recognized quickly
- Note which problems took longer than expected
- Review patterns for problems you struggled with

### Target Performance
- **Total time**: 100-150 minutes (10-15 min per problem)
- **Success rate**: 8-10 problems solved correctly
- **Pattern recognition**: Identify correct approach within 2 minutes

---

## Problem Set

### Problem 1: Longest Common Prefix
- **ID**: E009
- **Estimated Time**: 10 minutes
- **Pattern**: String manipulation, vertical/horizontal scanning
- **Why this problem**: String processing fundamentals

**Approach Hint (if stuck):**
Compare characters column-by-column across all strings, stop at first mismatch.

**Time Target**: 10-12 minutes

---

### Problem 2: Climbing Stairs
- **ID**: E033
- **Estimated Time**: 12 minutes
- **Pattern**: 1D Dynamic Programming, Fibonacci sequence
- **Why this problem**: Classic DP introduction

**Approach Hint (if stuck):**
`ways[i] = ways[i-1] + ways[i-2]` - you can arrive from 1 or 2 steps below.

**Space Optimization Challenge**: Can you solve with O(1) space?

**Time Target**: 10-15 minutes

---

### Problem 3: Merge Two Sorted Lists
- **ID**: E015
- **Estimated Time**: 12 minutes
- **Pattern**: Two pointers, linked list manipulation
- **Why this problem**: Fundamental merge operation

**Approach Hint (if stuck):**
Use a dummy head, compare current nodes, advance smaller pointer.

**Edge Cases**: Empty lists, lists of different lengths

**Time Target**: 10-15 minutes

---

### Problem 4: Valid Parentheses
- **ID**: E014
- **Estimated Time**: 12 minutes
- **Pattern**: Stack matching
- **Why this problem**: Stack application, bracket matching

**Approach Hint (if stuck):**
Push opening brackets to stack, pop and match when encountering closing brackets.

**Edge Cases**: Empty string, unmatched closing bracket, stack not empty at end

**Time Target**: 10-12 minutes

---

### Problem 5: Search Insert Position
- **ID**: E021
- **Estimated Time**: 12 minutes
- **Pattern**: Binary search
- **Why this problem**: Binary search application

**Approach Hint (if stuck):**
Standard binary search, return `left` pointer position if target not found.

**Key Insight**: `left` pointer ends at insertion position

**Time Target**: 10-15 minutes

---

### Problem 6: Maximum Depth of Binary Tree
- **ID**: E045
- **Estimated Time**: 10 minutes
- **Pattern**: Tree recursion, DFS
- **Why this problem**: Simple tree traversal

**Approach Hint (if stuck):**
`depth(node) = 1 + max(depth(left), depth(right))`

**Approaches**: Recursive DFS (cleaner) or iterative BFS/DFS

**Time Target**: 8-12 minutes

---

### Problem 7: Two Sum
- **ID**: E001
- **Estimated Time**: 10 minutes
- **Pattern**: Hash table, complement search
- **Why this problem**: Most asked interview question

**Approach Hint (if stuck):**
Use hash map to store numbers you've seen, check if complement exists.

**Key Insight**: One pass with hash map is O(n)

**Time Target**: 8-12 minutes

---

### Problem 8: Palindrome Number
- **ID**: E005
- **Estimated Time**: 12 minutes
- **Pattern**: Math, digit manipulation
- **Why this problem**: Number manipulation without strings

**Approach Hint (if stuck):**
Reverse half the number, compare with first half. Handle negative and ending-zero cases.

**Optimization**: Don't convert to string

**Time Target**: 10-15 minutes

---

### Problem 9: Symmetric Tree
- **ID**: E044
- **Estimated Time**: 15 minutes
- **Pattern**: Tree recursion, mirror comparison
- **Why this problem**: Tree recursion with two pointers

**Approach Hint (if stuck):**
Helper function `isMirror(left, right)` - compare left.left with right.right and left.right with right.left.

**Approaches**: Recursive (cleaner) or iterative with queue

**Time Target**: 12-18 minutes

---

### Problem 10: Pascal's Triangle
- **ID**: E049
- **Estimated Time**: 15 minutes
- **Pattern**: 2D array generation, combinatorics
- **Why this problem**: Array construction with pattern

**Approach Hint (if stuck):**
Each row starts and ends with 1. Interior: `row[j] = prev_row[j-1] + prev_row[j]`

**Edge Cases**: n = 0, n = 1

**Time Target**: 12-15 minutes

---

## Pattern Distribution

This set covers:
- **Hash Tables**: 1 problem (Two Sum)
- **Arrays/Strings**: 2 problems (Longest Common Prefix, Pascal's Triangle)
- **Linked Lists**: 1 problem (Merge Two Sorted Lists)
- **Stacks**: 1 problem (Valid Parentheses)
- **Binary Search**: 1 problem (Search Insert Position)
- **Trees**: 2 problems (Max Depth, Symmetric Tree)
- **Dynamic Programming**: 1 problem (Climbing Stairs)
- **Math**: 1 problem (Palindrome Number)

---

## Self-Assessment Rubric

### Pattern Recognition (Score: /10)
- **9-10 points**: Identified correct pattern within 1 minute for all problems
- **7-8 points**: Identified pattern within 2 minutes for 8-9 problems
- **5-6 points**: Identified pattern within 3 minutes for 6-7 problems
- **<5 points**: Struggled with pattern identification, review pattern guides

### Implementation Speed (Score: /10)
- **9-10 points**: All problems completed in 100-120 minutes
- **7-8 points**: Completed in 120-140 minutes
- **5-6 points**: Completed in 140-160 minutes
- **<5 points**: >160 minutes, focus on coding speed

### Code Quality (Score: /10)
- **9-10 points**: Clean, bug-free code on first attempt for 9-10 problems
- **7-8 points**: Minor bugs in 2-3 problems, fixed quickly
- **5-6 points**: Significant debugging needed for 3-5 problems
- **<5 points**: Many bugs, review fundamentals

**Total Score: /30**
- **27-30**: Excellent, ready for medium problems
- **24-26**: Good, practice a bit more
- **20-23**: Adequate, review weak patterns
- **<20**: Need more practice with easy problems

---

## Common Mistakes to Avoid

### Two Sum
- Using nested loops (O(n²)) instead of hash map (O(n))
- Not checking if complement exists before adding to map

### Valid Parentheses
- Forgetting to check if stack is empty before popping
- Not checking if stack is empty at the end

### Binary Search
- Using `while left < right` instead of `left <= right`
- Wrong mid calculation: `(left + right) // 2` can overflow in some languages

### Tree Problems
- Forgetting null checks
- Returning wrong values for base cases
- Stack overflow on deep trees (prefer iterative if concerned)

### Linked Lists
- Not handling null lists
- Forgetting to update pointers
- Off-by-one errors

---

## Practice Strategies

### First Attempt
1. **Quick scan**: Read all 10 problems, note which look familiar
2. **Start with confidence**: Begin with problems you recognize
3. **Time box**: Don't spend >20 minutes on any problem first time
4. **Mark and move**: If stuck, mark and come back

### Problem-Solving Process
1. **Understand** (2 min): Read problem, identify constraints
2. **Plan** (2 min): Recognize pattern, plan approach
3. **Code** (6-8 min): Implement solution
4. **Test** (2-3 min): Walk through examples, edge cases

### Review Session
After completing all 10:
- Identify slowest problem - why did it take long?
- Check solutions for problems you found difficult
- Write notes on patterns you missed
- Practice similar problems from same pattern

---

## Time Tracking Template

| Problem | Pattern Identified | Time Taken | Bugs Found | Notes |
|---------|-------------------|------------|------------|-------|
| 1. Longest Common Prefix | | | | |
| 2. Climbing Stairs | | | | |
| 3. Merge Two Sorted Lists | | | | |
| 4. Valid Parentheses | | | | |
| 5. Search Insert Position | | | | |
| 6. Max Depth Binary Tree | | | | |
| 7. Two Sum | | | | |
| 8. Palindrome Number | | | | |
| 9. Symmetric Tree | | | | |
| 10. Pascal's Triangle | | | | |
| **Total** | | | | |

---

## Next Steps

### Based on Performance

**If Total Time < 120 minutes:**
- Move to Medium Mix 001
- Try Easy Mix 002 (if available) under tighter time constraints
- Challenge: Solve each in 8 minutes

**If Total Time 120-150 minutes:**
- Practice individual patterns that were slow
- Retry this set after 1 week
- Review pattern strategy guides

**If Total Time > 150 minutes:**
- Focus on pattern drills (pattern-drills/)
- Do warmup problems daily (warmup-5min.md)
- Retry in 2 weeks

---

## Completion Checklist

### First Pass
- [ ] All 10 problems attempted
- [ ] Time recorded for each problem
- [ ] Patterns identified (even if incorrect)
- [ ] Self-assessment completed

### Mastery (Future Attempts)
- [ ] All problems solved correctly
- [ ] Total time < 120 minutes
- [ ] All patterns identified within 2 minutes
- [ ] Code quality score 9-10

### Ready for Next Level
- [ ] Completed this set 2-3 times
- [ ] Total time consistently < 120 minutes
- [ ] Can explain each solution clearly
- [ ] Ready for Medium Mix 001

---

## Related Practice

**If you struggled with specific patterns:**
- **Hash Tables**: Review [Hash Tables](../../prerequisites/hash-tables.md)
- **Binary Search**: Review [Binary Search](../../strategies/patterns/binary-search.md)
- **Trees**: Review [Trees](../../prerequisites/trees.md)
- **DP**: Complete [DP Drill](../pattern-drills/dp-drill.md)
- **Linked Lists**: Review [Linked Lists](../../prerequisites/linked-lists.md)

**Other Practice Sets:**
- Warmup 5-Min (problem-sets/warmup-5min.md)
- Medium Mix 001 (mixed-practice/medium-mix-001.md)
- Pattern-Specific Drills (pattern-drills/)
