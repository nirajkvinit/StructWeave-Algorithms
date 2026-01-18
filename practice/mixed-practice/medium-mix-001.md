---
title: Medium Mixed Practice Set 001
category: mixed-practice
difficulty: medium
problem_count: 10
estimated_time_minutes: 200-300
---

# Medium Mixed Practice Set 001

## Purpose

This set contains 10 medium-difficulty problems from diverse patterns in randomized order. These problems test your ability to:
- Recognize patterns from problem statements
- Design solutions for more complex scenarios
- Implement optimized algorithms
- Handle multiple constraints and edge cases

## How to Use

### Practice Mode
1. **Read problem without hints** - identify the pattern
2. **Set timer for 30 minutes** per problem
3. **Plan approach before coding** (5 minutes)
4. **Implement and test** (20-25 minutes)

### Interview Simulation
- **Time limit**: Strict 30 minutes per problem
- **Think aloud**: Explain your approach
- **Optimize**: Discuss time/space complexity
- **Test**: Walk through examples and edge cases

### Target Performance
- **Total time**: 200-300 minutes (20-30 min per problem)
- **Success rate**: 7-10 problems solved correctly
- **Optimization**: Achieve optimal time complexity for 8+ problems

---

## Problem Set

### Problem 1: Longest Substring Without Repeating Characters
- **ID**: M002
- **Estimated Time**: 25 minutes
- **Pattern**: Sliding window, hash table
- **Why this problem**: Classic sliding window application

**What to think about:**
- How do you track characters in current window?
- What happens when you encounter a duplicate?
- When do you update the maximum length?

**Approach Hint (if stuck):**
Use sliding window with hash map. When duplicate found, move left pointer to position after first occurrence.

**Optimization Goal**: O(n) time, O(min(m,n)) space where m is charset size

**Time Target**: 20-30 minutes

---

### Problem 2: Generate Parentheses
- **ID**: M005
- **Estimated Time**: 25 minutes
- **Pattern**: Backtracking with constraints
- **Why this problem**: Constraint-based generation

**What to think about:**
- When can you add an opening parenthesis?
- When can you add a closing parenthesis?
- How do you avoid generating invalid combinations?

**Approach Hint (if stuck):**
Backtrack with two counters (open, close). Add '(' if open < n, add ')' if close < open.

**Key Insight**: Pruning prevents generating invalid strings

**Time Target**: 20-25 minutes

---

### Problem 3: Merge Intervals
- **ID**: M017
- **Estimated Time**: 25 minutes
- **Pattern**: Interval manipulation, sorting
- **Why this problem**: Foundation for interval problems

**What to think about:**
- How do you determine if intervals overlap?
- Should you sort first?
- How do you merge overlapping intervals?

**Approach Hint (if stuck):**
Sort by start time. Iterate and merge if current start <= previous end.

**Edge Cases**: Single interval, no overlaps, complete overlap

**Time Target**: 20-30 minutes

---

### Problem 4: Unique Paths
- **ID**: M022
- **Estimated Time**: 25 minutes
- **Pattern**: 2D Dynamic Programming, grid traversal
- **Why this problem**: Classic 2D DP

**What to think about:**
- What does dp[i][j] represent?
- What are the base cases?
- How do you build the recurrence relation?

**Approach Hint (if stuck):**
`dp[i][j] = dp[i-1][j] + dp[i][j-1]`. Can only arrive from top or left.

**Optimization Challenge**: Can you reduce space to O(n)?

**Time Target**: 20-25 minutes

---

### Problem 5: Search in Rotated Sorted Array
- **ID**: M008
- **Estimated Time**: 30 minutes
- **Pattern**: Modified binary search
- **Why this problem**: Binary search with a twist

**What to think about:**
- How do you determine which half is sorted?
- How do you decide which half to search?
- What are the edge cases?

**Approach Hint (if stuck):**
Compare mid with left/right to find sorted half. Check if target is in sorted half.

**Key Challenge**: Correctly identifying which half to search

**Time Target**: 25-35 minutes

---

### Problem 6: Add Two Numbers (Linked Lists)
- **ID**: M001
- **Estimated Time**: 25 minutes
- **Pattern**: Linked list manipulation, carry handling
- **Why this problem**: Linked list traversal with state

**What to think about:**
- How do you handle carries?
- What if lists have different lengths?
- What if there's a carry after processing both lists?

**Approach Hint (if stuck):**
Traverse both lists simultaneously, track carry, handle remaining digits.

**Edge Cases**: Different lengths, carry at end, empty lists

**Time Target**: 20-30 minutes

---

### Problem 7: Longest Palindromic Substring
- **ID**: M003
- **Estimated Time**: 30 minutes
- **Pattern**: Expand from center, interval DP
- **Why this problem**: Multiple approaches possible

**What to think about:**
- Brute force: check all substrings (too slow)
- Can you expand from each center?
- How do you handle even vs odd length palindromes?

**Approach Hint (if stuck):**
Expand from each center (2n-1 centers: n chars + n-1 gaps). Track longest found.

**Alternative**: 2D DP with dp[i][j] = is s[i:j+1] palindrome

**Time Target**: 25-35 minutes

---

### Problem 8: Combination Sum II
- **ID**: M009
- **Estimated Time**: 30 minutes
- **Pattern**: Backtracking with duplicate handling
- **Why this problem**: Advanced backtracking

**What to think about:**
- How do you avoid duplicate combinations?
- When should you skip duplicate elements?
- How do you know when to stop exploring?

**Approach Hint (if stuck):**
Sort array. In backtracking, skip duplicates at same recursion level: `if i > start and candidates[i] == candidates[i-1]: continue`

**Key Pattern**: Skip duplicates at same level, not globally

**Time Target**: 25-35 minutes

---

### Problem 9: Minimum Path Sum
- **ID**: M024
- **Estimated Time**: 25 minutes
- **Pattern**: 2D DP, grid optimization
- **Why this problem**: Path cost minimization

**What to think about:**
- What does dp[i][j] represent?
- How does it differ from Unique Paths?
- Can you optimize space?

**Approach Hint (if stuck):**
`dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1])`

**Optimization**: Can reduce to O(n) space with rolling array

**Time Target**: 20-28 minutes

---

### Problem 10: Rotate Image
- **ID**: M013
- **Estimated Time**: 25 minutes
- **Pattern**: Matrix manipulation, in-place rotation
- **Why this problem**: 2D array transformation

**What to think about:**
- Can you rotate in-place?
- What's the relationship between rotated positions?
- How do you rotate layer by layer?

**Approach Hint (if stuck):**
Transpose matrix, then reverse each row. Or rotate layer by layer.

**Key Insight**: 90° clockwise = transpose + reverse rows

**Time Target**: 20-30 minutes

---

## Pattern Distribution

This set covers:
- **Sliding Window**: 1 problem (Longest Substring)
- **Backtracking**: 2 problems (Generate Parentheses, Combination Sum II)
- **Intervals**: 1 problem (Merge Intervals)
- **Dynamic Programming**: 2 problems (Unique Paths, Minimum Path Sum)
- **Binary Search**: 1 problem (Search in Rotated Sorted Array)
- **Linked Lists**: 1 problem (Add Two Numbers)
- **String Algorithms**: 1 problem (Longest Palindromic Substring)
- **Matrix Manipulation**: 1 problem (Rotate Image)

---

## Difficulty Levels Within Medium

### Easier Medium (Good Starting Points)
- Generate Parentheses (M005)
- Unique Paths (M022)
- Add Two Numbers (M001)

### Standard Medium
- Longest Substring Without Repeating (M002)
- Merge Intervals (M017)
- Minimum Path Sum (M024)
- Rotate Image (M013)

### Harder Medium (Practice These Last)
- Search in Rotated Sorted Array (M008)
- Longest Palindromic Substring (M003)
- Combination Sum II (M009)

---

## Self-Assessment Rubric

### Pattern Recognition (Score: /10)
- **9-10 points**: Identified optimal approach within 3 minutes for all problems
- **7-8 points**: Identified approach within 5 minutes for 8-9 problems
- **5-6 points**: Identified approach within 7 minutes for 6-7 problems
- **<5 points**: Struggled with pattern identification, review pattern guides

### Solution Quality (Score: /10)
- **9-10 points**: Optimal time/space complexity achieved for 9-10 problems
- **7-8 points**: Optimal complexity for 7-8 problems, suboptimal but working for others
- **5-6 points**: Working solutions for 6-7 problems
- **<5 points**: Many incorrect or inefficient solutions

### Code Quality (Score: /10)
- **9-10 points**: Clean, bug-free code with proper edge case handling
- **7-8 points**: Minor bugs in 2-3 problems, fixed within time limit
- **5-6 points**: Debugging needed for 4-5 problems
- **<5 points**: Many bugs, incomplete solutions

**Total Score: /30**
- **27-30**: Excellent, ready for hard problems and real interviews
- **24-26**: Good, practice more medium problems
- **20-23**: Adequate, review weak patterns and retry
- **<20**: Complete pattern drills first, then retry

---

## Common Pitfalls by Pattern

### Sliding Window
- Not updating window boundaries correctly
- Forgetting to remove elements when shrinking window
- Using wrong data structure for tracking

### Backtracking
- Not backtracking (forgetting to undo changes)
- Wrong duplicate-skipping logic
- Not copying results before adding to answer

### Dynamic Programming
- Off-by-one errors in indexing
- Missing base cases
- Not optimizing space when possible

### Binary Search
- Wrong loop condition (< vs <=)
- Incorrect mid calculation
- Not handling edge cases (empty array, single element)

### Linked Lists
- Not handling null pointers
- Losing references to nodes
- Off-by-one errors in traversal

---

## Optimization Checklist

For each problem, after getting working solution:

### Time Complexity
- [ ] Is this the optimal time complexity?
- [ ] Can I reduce nested loops?
- [ ] Is there a mathematical formula?
- [ ] Can I use better data structure?

### Space Complexity
- [ ] Can I do this in-place?
- [ ] Can I reduce dimensions (2D → 1D)?
- [ ] Can I use constant space?
- [ ] Can I avoid recursion stack?

### Code Quality
- [ ] Handled all edge cases?
- [ ] Variable names are clear?
- [ ] Can I simplify the logic?
- [ ] Added comments for tricky parts?

---

## Practice Strategies

### Strategy 1: Timed Practice (Interview Simulation)
1. Set 30-minute timer for each problem
2. Code in interview environment (whiteboard or basic editor)
3. Explain approach out loud
4. Don't look at hints until time is up

### Strategy 2: Pattern Mastery
1. Group problems by pattern
2. Solve all DP problems first, then backtracking, etc.
3. Identify common templates
4. Note pattern-specific edge cases

### Strategy 3: Iterative Improvement
1. First attempt: Get working solution, any complexity
2. Second attempt: Optimize time complexity
3. Third attempt: Optimize space complexity
4. Fourth attempt: Perfect code quality

---

## Time Tracking Template

| Problem | Pattern | Approach Time | Code Time | Total | Complexity | Bugs | Score |
|---------|---------|---------------|-----------|-------|------------|------|-------|
| 1. Longest Substring | | | | | | | /10 |
| 2. Generate Parentheses | | | | | | | /10 |
| 3. Merge Intervals | | | | | | | /10 |
| 4. Unique Paths | | | | | | | /10 |
| 5. Rotated Array Search | | | | | | | /10 |
| 6. Add Two Numbers | | | | | | | /10 |
| 7. Longest Palindrome | | | | | | | /10 |
| 8. Combination Sum II | | | | | | | /10 |
| 9. Minimum Path Sum | | | | | | | /10 |
| 10. Rotate Image | | | | | | | /10 |
| **Total** | | | | | | | /100 |

**Score Key per problem:**
- 10: Optimal solution, no bugs, within time
- 8: Optimal solution, minor bugs or slightly over time
- 6: Working solution, suboptimal or significant debugging
- 4: Incomplete solution but correct approach
- 2: Wrong approach or didn't finish

---

## Next Steps

### Based on Performance

**If Total Time < 220 minutes and Score > 85:**
- Move to Hard Mix 001
- Try mock interviews
- Focus on explaining solutions clearly

**If Total Time 220-280 minutes and Score 70-85:**
- Retry this set focusing on weak patterns
- Complete pattern-specific drills for struggled patterns
- Practice explaining solutions

**If Total Time > 280 minutes or Score < 70:**
- Review fundamentals for struggled patterns
- Complete pattern drills (dp-drill.md, backtracking-drill.md)
- Practice more easy problems
- Retry in 2-3 weeks

---

## Pattern Deep Dives

**If you struggled with:**

### Sliding Window (Longest Substring)
- Review [Sliding Window](../../strategies/patterns/sliding-window.md)
- Practice: Minimum Window Substring, Longest Repeating Character Replacement
- Key: When to expand, when to contract

### Backtracking (Generate Parentheses, Combination Sum II)
- Review [Backtracking](../../strategies/patterns/backtracking.md)
- Complete [Backtracking Drill](../pattern-drills/backtracking-drill.md)
- Key: Pruning and state management

### DP (Unique Paths, Minimum Path Sum)
- Review [Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
- Complete [DP Drill](../pattern-drills/dp-drill.md)
- Key: State definition and recurrence relation

### Binary Search (Rotated Array Search)
- Review [Binary Search](../../strategies/patterns/binary-search.md)
- Practice: Find Minimum in Rotated Sorted Array, Search 2D Matrix
- Key: Identifying sorted half

---

## Completion Checklist

### First Pass
- [ ] All 10 problems attempted
- [ ] Time and complexity recorded
- [ ] Self-assessment completed
- [ ] Weak patterns identified

### Mastery (After Multiple Attempts)
- [ ] All problems solved optimally
- [ ] Total time < 220 minutes
- [ ] Can explain each solution clearly
- [ ] No major bugs in solutions

### Interview Ready
- [ ] Completed 2-3 times with improving scores
- [ ] Can solve similar problems without hints
- [ ] Comfortable discussing trade-offs
- [ ] Ready to tackle hard problems

---

## Related Practice

**Continue Building Skills:**
- Hard Mix 001 (mixed-practice/hard-mix-001.md)
- Pattern Drills (pattern-drills/)
- Easy Mix 001 for warmup (mixed-practice/easy-mix-001.md)

**Strategy Guides:**
- [Sliding Window](../../strategies/patterns/sliding-window.md)
- [Backtracking](../../strategies/patterns/backtracking.md)
- [Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
- [Binary Search](../../strategies/patterns/binary-search.md)
