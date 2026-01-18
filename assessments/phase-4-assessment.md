---
title: Phase 4 Assessment - Expert Patterns
type: assessment
difficulty: expert
estimated_time_minutes: 100
passing_score: "4/6 problems solved correctly (67%)"
patterns_tested: ["dynamic-programming", "backtracking", "greedy", "divide-and-conquer"]
---

# Phase 4 Assessment - Expert Patterns

## Purpose

This final assessment evaluates your mastery of the most sophisticated algorithmic patterns. These techniques are essential for solving hard-level problems and are frequently asked in senior engineer and staff-level interviews at top tech companies.

## Patterns Covered

- **Dynamic Programming:** Optimal substructure, memoization, tabulation
- **Backtracking:** State space exploration, pruning, constraint satisfaction
- **Greedy Algorithms:** Local optimal choices, proof of correctness
- **Divide and Conquer:** Problem decomposition, merge strategies

## Assessment Structure

- **6 Problems** - Medium to hard difficulty
- **Estimated Time:** 100 minutes total (15-20 minutes per problem)
- **Passing Score:** 4/6 problems solved correctly (67%)
- **Prerequisites:** Must pass Phase 3 Assessment
- **Note:** Lower passing threshold reflects increased difficulty

## Instructions

1. Problems are ordered by pattern, not necessarily difficulty
2. Focus on optimal solutions from the start
3. Explain your approach and prove correctness when possible
4. Handle all edge cases systematically
5. Code must be production-quality

---

## Problem 1: Dynamic Programming - 1D (Medium, 15 minutes)
**Problem ID:** M011 - Jump Game II

### Problem Statement

You are given a 0-indexed array of integers `nums` of length `n`. You are initially positioned at `nums[0]`.

Each element `nums[i]` represents the maximum length of a forward jump from index `i`. In other words, if you are at `nums[i]`, you can jump to any `nums[i + j]` where:
- 0 ≤ j ≤ nums[i]
- i + j < n

Return the minimum number of jumps to reach `nums[n - 1]`. The test cases are generated such that you can reach `nums[n - 1]`.

### Examples
```
Input: nums = [2,3,1,1,4]
Output: 2
Explanation: Jump 1 step from index 0 to 1, then 3 steps to the last index.

Input: nums = [2,3,0,1,4]
Output: 2
```

### Constraints
- 1 ≤ nums.length ≤ 10,000
- 0 ≤ nums[i] ≤ 1000
- It's guaranteed you can reach nums[n-1]

### Requirements
- Solve using greedy BFS or DP
- O(n) time, O(1) space (greedy approach)
- Explain why greedy choice is optimal
- Alternative: DP solution O(n) time, O(n) space

**Reference:** [M011 - Jump Game II](../problems/medium/M011_jump_game_ii.md)

---

## Problem 2: Dynamic Programming - 2D (Medium, 18 minutes)
**Problem ID:** M024 - Minimum Path Sum

### Problem Statement

Given a `m x n` grid filled with non-negative numbers, find a path from top left to bottom right, which minimizes the sum of all numbers along its path.

You can only move either down or right at any point in time.

### Examples
```
Input: grid = [[1,3,1],
               [1,5,1],
               [4,2,1]]
Output: 7
Explanation: Path 1→3→1→1→1 has minimum sum = 7

Input: grid = [[1,2,3],
               [4,5,6]]
Output: 12
```

### Constraints
- m == grid.length
- n == grid[i].length
- 1 ≤ m, n ≤ 200
- 0 ≤ grid[i][j] ≤ 200

### Requirements
- Use 2D DP or space-optimized 1D DP
- O(m*n) time
- Space: O(m*n) for 2D DP, O(n) for optimized
- Explain optimal substructure
- Handle first row and column initialization

**Reference:** [M024 - Minimum Path Sum](../problems/medium/M024_minimum_path_sum.md)

---

## Problem 3: Dynamic Programming - String (Hard, 20 minutes)
**Problem ID:** H014 - Edit Distance

### Problem Statement

Given two strings `word1` and `word2`, return the minimum number of operations required to convert `word1` to `word2`.

You have the following three operations permitted on a word:
- Insert a character
- Delete a character
- Replace a character

### Examples
```
Input: word1 = "horse", word2 = "ros"
Output: 3
Explanation:
horse -> rorse (replace 'h' with 'r')
rorse -> rose (remove 'r')
rose -> ros (remove 'e')

Input: word1 = "intention", word2 = "execution"
Output: 5
```

### Constraints
- 0 ≤ word1.length, word2.length ≤ 500
- word1 and word2 consist of lowercase English letters

### Requirements
- Use 2D DP (Levenshtein distance)
- O(m*n) time, O(m*n) or O(min(m,n)) space
- Explain recurrence relation
- Handle empty string edge cases
- Bonus: Space optimization to O(min(m,n))

**Reference:** [H014 - Edit Distance](../problems/hard/H014_edit_distance.md)

---

## Problem 4: Backtracking - Combination (Medium, 15 minutes)
**Problem ID:** M027 - Combinations

### Problem Statement

Given two integers `n` and `k`, return all possible combinations of `k` numbers chosen from the range `[1, n]`.

You may return the answer in any order.

### Examples
```
Input: n = 4, k = 2
Output: [[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]

Input: n = 1, k = 1
Output: [[1]]
```

### Constraints
- 1 ≤ n ≤ 20
- 1 ≤ k ≤ n

### Requirements
- Use backtracking with pruning
- Generate all C(n,k) combinations
- Avoid duplicates
- Time: O(C(n,k) * k), Space: O(k) for recursion
- Explain pruning optimization

**Reference:** [M027 - Combinations](../problems/medium/M027_combinations.md)

---

## Problem 5: Backtracking - Constraint Satisfaction (Hard, 18 minutes)
**Problem ID:** H011 - N-Queens

### Problem Statement

The n-queens puzzle is the problem of placing `n` queens on an `n x n` chessboard such that no two queens attack each other.

Given an integer `n`, return all distinct solutions to the n-queens puzzle. You may return the answer in any order.

Each solution contains a distinct board configuration of the n-queens' placement, where 'Q' and '.' both indicate a queen and an empty space, respectively.

### Examples
```
Input: n = 4
Output: [[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]

Input: n = 1
Output: [["Q"]]
```

### Constraints
- 1 ≤ n ≤ 9

### Requirements
- Use backtracking with conflict checking
- Track columns, diagonals, anti-diagonals
- O(n!) time complexity
- Optimize conflict detection to O(1)
- Explain why backtracking is necessary

**Reference:** [H011 - N-Queens](../problems/hard/H011_n_queens.md)

---

## Problem 6: Greedy or DP - Interval Scheduling (Medium, 14 minutes)
**Problem ID:** M017 - Merge Intervals (Alternative: Non-overlapping Intervals)

### Problem Statement - Non-overlapping Intervals

Given an array of intervals where `intervals[i] = [start_i, end_i]`, return the minimum number of intervals you need to remove to make the rest of the intervals non-overlapping.

### Examples
```
Input: intervals = [[1,2],[2,3],[3,4],[1,3]]
Output: 1
Explanation: Remove [1,3] and the rest are non-overlapping

Input: intervals = [[1,2],[1,2],[1,2]]
Output: 2
Explanation: Remove 2 intervals, keep 1

Input: intervals = [[1,2],[2,3]]
Output: 0
Explanation: Already non-overlapping
```

### Constraints
- 1 ≤ intervals.length ≤ 100,000
- intervals[i].length == 2
- -50,000 ≤ start_i < end_i ≤ 50,000

### Requirements
- Greedy approach: sort by end time, select greedily
- O(n log n) time, O(1) space (excluding sort)
- Explain greedy choice property
- Prove why greedy is optimal
- Alternative: DP solution (less efficient)

**Reference:** [M017 - Merge Intervals](../problems/medium/M017_merge_intervals.md) (related pattern)

---

## Scoring Rubric

Each problem is scored individually:

### Full Credit (1 point)
- ✓ Optimal algorithm (correct pattern)
- ✓ Correct time and space complexity
- ✓ Handles all edge cases
- ✓ Clean, bug-free implementation
- ✓ Can explain why solution is optimal
- ✓ Can prove correctness (for greedy)

### Partial Credit (0.5 points)
- ✓ Correct approach but suboptimal complexity
- ✓ Minor implementation issues
- ✗ Missed 1-2 edge cases
- ✓ Core algorithm correct
- ✓ Understands concept

### No Credit (0 points)
- ✗ Wrong pattern or approach
- ✗ Significantly suboptimal
- ✗ Major algorithmic flaws
- ✗ Incomplete or non-working solution

---

## Passing Criteria

**Minimum Score:** 4/6 (67%)

### Performance Levels

**6/6 (100%) - Expert**
- Mastered all algorithmic patterns
- Ready for competitive programming
- Prepared for staff+ level interviews
- Can tackle any coding interview confidently
- Consider teaching/mentoring others

**5/6 (83%) - Advanced**
- Excellent understanding
- One minor gap to address
- Ready for senior-level interviews
- Strong problem-solving skills

**4/6 (67%) - Pass**
- Solid grasp of expert patterns
- Some patterns need reinforcement
- Prepared for most technical interviews
- Continue practicing hard problems

**3/6 (50%) - Near Pass**
- Good effort, need more practice
- Focus on weak patterns
- 15-20 more problems per weak pattern
- Retake in 2-3 weeks

**0-2/6 (<33%) - Needs Significant Work**
- Gaps in understanding expert patterns
- Return to Phase 4 study materials
- May need to review Phase 3
- 50+ more practice problems
- Retake in 4-6 weeks

---

## Pattern-Specific Evaluation

### Dynamic Programming (Problems 1-3)
**Key Concepts:**
- Identifying optimal substructure
- Defining state and transitions
- Base case initialization
- Bottom-up vs top-down
- Space optimization

**If you struggled:**
- Review [Dynamic Programming Guide](../strategies/patterns/dynamic-programming.md)
- Practice: 20-25 DP problems across types
- Understand: Why DP works (overlapping subproblems)
- Master: 1D, 2D, string, subsequence DP

**Common Issues:**
- Wrong state definition
- Incorrect transition formula
- Missing base cases
- Off-by-one errors in indices
- Not recognizing DP opportunity

**Progressive Practice:**
1. Simple 1D: Fibonacci, climbing stairs
2. 1D optimization: House robber, jump game
3. 2D grid: Path counting, min path sum
4. String DP: LCS, edit distance, palindromes
5. Subsequence: LIS, partition problems

### Backtracking (Problems 4-5)
**Key Concepts:**
- State space exploration
- Pruning for efficiency
- Backtracking vs recursion
- Constraint checking
- Generating vs counting

**If you struggled:**
- Review [Backtracking Guide](../strategies/patterns/backtracking.md)
- Practice: Permutations, combinations, subsets
- Understand: When to backtrack vs when to DP
- Master: Constraint satisfaction problems

**Common Issues:**
- Not backtracking properly
- Missing pruning opportunities
- Duplicates in results
- Inefficient constraint checking
- Wrong base case

**Progressive Practice:**
1. Generation: Subsets, permutations, combinations
2. Constraint: N-Queens, Sudoku solver
3. Optimization: Word search, path finding
4. Advanced: Generate parentheses, partition problems

### Greedy (Problem 6)
**Key Concepts:**
- Local optimal → global optimal
- Proof of correctness
- Greedy choice property
- Optimal substructure
- When greedy works vs when it doesn't

**If you struggled:**
- Review [Greedy Algorithms](../strategies/patterns/greedy.md)
- Practice: Interval scheduling, Huffman coding
- Understand: How to prove greedy is correct
- Master: Exchange arguments, staying ahead

**Common Issues:**
- Greedy when DP needed (or vice versa)
- Wrong greedy criterion
- Can't prove correctness
- Sorting by wrong attribute
- Missing counterexamples

**Progressive Practice:**
1. Simple: Activity selection, fractional knapsack
2. Intervals: Meeting rooms, non-overlapping
3. Arrays: Jump game, gas station
4. Advanced: Minimum arrows, candy distribution

---

## Common Mistakes by Pattern

### Dynamic Programming
- ❌ Not identifying it's a DP problem
- ❌ Wrong state representation
- ❌ Incorrect recurrence relation
- ❌ Missing base cases or initialization
- ❌ Off-by-one in indices
- ❌ Not considering space optimization
- ❌ Iterating in wrong order (bottom-up)

### Backtracking
- ❌ Not removing element after recursive call
- ❌ Modifying shared state incorrectly
- ❌ Missing pruning conditions
- ❌ Generating duplicates
- ❌ Wrong termination condition
- ❌ Not passing copies when needed
- ❌ Inefficient constraint validation

### Greedy
- ❌ Assuming greedy works without proof
- ❌ Sorting by wrong criterion
- ❌ Local optimal ≠ global optimal
- ❌ Not considering counterexamples
- ❌ Missing edge cases
- ❌ Using greedy when DP needed

### General Expert-Level
- ❌ Not recognizing pattern from description
- ❌ Jumping to code without clear plan
- ❌ Not considering time/space trade-offs
- ❌ Missing optimization opportunities
- ❌ Weak complexity analysis

---

## Time Allocation Guide

| Problem | Pattern | Difficulty | Est. Time | Cumulative |
|---------|---------|------------|-----------|------------|
| 1 | DP (1D/Greedy) | Medium | 15 min | 15 min |
| 2 | DP (2D Grid) | Medium | 18 min | 33 min |
| 3 | DP (String) | Hard | 20 min | 53 min |
| 4 | Backtracking | Medium | 15 min | 68 min |
| 5 | Backtracking | Hard | 18 min | 86 min |
| 6 | Greedy | Medium | 14 min | 100 min |

**Strategy:**
- Hard DP problems may take 25+ minutes - that's okay
- If stuck >20 minutes, move on and return later
- Budget extra time for proof/explanation on greedy
- Testing is critical - allocate 2-3 minutes per problem

---

## Complexity Targets

Know your complexity targets before coding:

| Problem | Expected Time | Expected Space |
|---------|---------------|----------------|
| Jump Game II | O(n) | O(1) |
| Min Path Sum | O(m*n) | O(n) optimized |
| Edit Distance | O(m*n) | O(min(m,n)) optimized |
| Combinations | O(C(n,k) * k) | O(k) recursion |
| N-Queens | O(n!) | O(n²) for board |
| Interval Scheduling | O(n log n) | O(1) or O(n) |

If you can't achieve these complexities, reconsider your approach.

---

## Post-Assessment Action Plan

### Immediate Actions (Day 1-2)

**For each problem:**

1. **Verify correctness:**
   - Test all examples manually
   - Create 2-3 additional test cases
   - Check edge cases systematically

2. **Analyze complexity:**
   - Walk through time complexity proof
   - Count space usage carefully
   - Compare to optimal

3. **For incorrect solutions:**
   - Identify gap: pattern recognition? implementation? optimization?
   - Study optimal solution deeply
   - Re-implement without looking
   - Explain to someone else

### Pattern-Specific Practice (Weeks 1-2)

**Dynamic Programming (if weak):**

**Week 1:**
- Day 1-2: 1D DP (Fibonacci, climbing stairs, house robber)
- Day 3-4: 2D DP (unique paths, min path sum, dungeon game)
- Day 5-6: String DP (LCS, edit distance, wildcard matching)
- Day 7: Review and mixed problems

**Week 2:**
- Subsequence problems (LIS, partition problems)
- State machine DP (buy/sell stock)
- Tree DP (house robber III, binary tree cameras)
- Practice 20-25 DP problems total

**Resources:**
- [DP Pattern Guide](../strategies/patterns/dynamic-programming.md)
- AtCoder DP contest
- Codeforces DP problems

---

**Backtracking (if weak):**

**Week 1:**
- Day 1-2: Generation (subsets, permutations, combinations)
- Day 3-4: Constraint satisfaction (N-Queens, Sudoku)
- Day 5-6: Path finding (word search, rat in maze)
- Day 7: Optimization problems

**Week 2:**
- Advanced: Partition to K equal sum subsets
- String: Letter combinations, generate parentheses
- Board: Word search II (with trie)
- Practice 15-20 backtracking problems

**Resources:**
- [Backtracking Guide](../strategies/patterns/backtracking.md)
- Classic backtracking problems

---

**Greedy (if weak):**

**Week 1:**
- Study proof techniques (exchange argument, staying ahead)
- Practice 10-12 classic greedy problems
- For each: prove why greedy works or find counterexample
- Interval problems: meeting rooms, arrows, scheduling

**Week 2:**
- Advanced greedy: candy, gas station, jump game
- Greedy + other patterns: reconstruct queue, task scheduler
- Learn to distinguish: greedy vs DP

**Resources:**
- [Greedy Algorithms](../strategies/patterns/greedy.md)
- CLRS Chapter 16 (Greedy Algorithms)

---

### Long-term Mastery (Weeks 3-4)

1. **Mixed pattern practice:**
   - Don't label problems by pattern
   - Practice pattern recognition
   - 30-40 mixed medium/hard problems

2. **Mock interviews:**
   - Pramp, interviewing.io, or with peers
   - Practice explaining your thought process
   - Get feedback on communication

3. **Company-specific prep:**
   - Research target companies' patterns
   - Solve tagged problems
   - Understand company culture

4. **Advanced topics** (optional):
   - Segment trees, Fenwick trees
   - Advanced graph (strongly connected components)
   - String algorithms (KMP, suffix arrays)
   - Math (number theory, combinatorics)

---

## Next Steps Based on Score

### If You Passed (4-6/6)

**Congratulations! You've completed all four phases.**

You're now prepared for:
- Senior software engineer interviews
- Most FAANG-level coding assessments
- Competitive programming (beginner to intermediate)
- Technical leadership roles

**Continuous Improvement:**

1. **Maintain skills:**
   - Solve 3-5 problems weekly
   - Focus on hard problems
   - Participate in contests (LeetCode weekly, Codeforces)

2. **Specialize:**
   - Choose favorite patterns to master
   - Contribute to open source
   - Write tutorials or blog posts
   - Mentor others

3. **Expand skillset:**
   - System design (if targeting senior roles)
   - Domain-specific algorithms (ML, crypto, graphics)
   - Competitive programming (if interested)
   - Teaching and creating content

4. **Interview preparation:**
   - Company research
   - Behavioral interview prep
   - Mock interviews
   - Build portfolio projects

**Resources for Continued Growth:**
- Competitive programming: Codeforces, AtCoder, CodeChef
- Advanced courses: MIT 6.046, Stanford CS166
- Books: "Algorithm Design Manual", "Competitive Programming"
- Community: Join algorithm study groups

---

### If You Didn't Pass (0-3/6)

**Don't be discouraged!** Expert patterns are the hardest.

**Structured Recovery Plan:**

**Diagnosis (Week 1):**
- Identify specific weaknesses
- DP? Backtracking? Greedy?
- Pattern recognition or implementation?
- Review Phase 3 if needed

**Focused Learning (Weeks 2-4):**
- **Weak Pattern Deep Dive:**
  - Study pattern guide thoroughly
  - Solve 20-25 problems per weak pattern
  - Understand WHY solutions work
  - Practice explaining to others

**Integration (Weeks 5-6):**
- Solve mixed problems
- Practice pattern recognition
- Time yourself but don't stress
- Focus on understanding over speed

**Reassessment (Week 7):**
- Retake Phase 4 assessment
- Expect significant improvement
- Review any remaining gaps

**Additional Support:**
- Join study group or find accountability partner
- Consider algorithm course (Coursera, edX)
- Use spaced repetition (Anki for patterns)
- Watch solution videos (NeetCode, Back to Back SWE)

---

## DP Problem Solving Framework

When facing a DP problem:

1. **Identify it's DP:**
   - Optimization problem (min/max)
   - Counting problem
   - Yes/No decision with constraints

2. **Define state:**
   - What information do we need to track?
   - `dp[i]` = optimal solution for subproblem ending at i
   - `dp[i][j]` = optimal solution considering first i of A, first j of B

3. **Write recurrence:**
   - How does `dp[i]` relate to previous states?
   - What choices do we have at each step?

4. **Base cases:**
   - What are the simplest subproblems?
   - `dp[0]`, `dp[0][0]`, etc.

5. **Order of computation:**
   - Bottom-up: ensure we compute dependencies first
   - Top-down: memoization handles this

6. **Space optimization:**
   - Do we need the entire DP table?
   - Can we use rolling array?

---

## Backtracking Problem Solving Framework

When facing a backtracking problem:

1. **Identify it's backtracking:**
   - Generate all possibilities
   - Constraint satisfaction
   - Combinatorial search

2. **Define state:**
   - Current partial solution
   - Remaining choices
   - Constraints to check

3. **Write recursive function:**
   ```
   backtrack(state):
       if is_solution(state):
           record_solution(state)
           return

       for choice in get_choices(state):
           if is_valid(choice, state):
               make_choice(choice, state)
               backtrack(state)
               undo_choice(choice, state)  # backtrack!
   ```

4. **Pruning:**
   - Early termination
   - Constraint checking before recursion
   - Avoid duplicate work

5. **Optimization:**
   - Order choices intelligently
   - Use helper data structures (sets, maps)
   - Memoization if overlapping subproblems

---

## Greedy Problem Solving Framework

When considering greedy:

1. **Identify potential greedy:**
   - Optimization problem
   - Making sequence of choices
   - Each choice seems "obvious"

2. **Formulate greedy choice:**
   - What's the criterion?
   - Sort by what attribute?
   - Which choice to make at each step?

3. **Prove correctness:**
   - **Exchange argument:** Swapping greedy choice with any other doesn't improve
   - **Staying ahead:** Greedy maintains better or equal state
   - **Counterexample:** If you find one, greedy doesn't work!

4. **Implement:**
   - Usually involves sorting
   - One pass through data
   - Simple compared to DP

5. **Verify:**
   - Test edge cases
   - Check if greedy intuition holds
   - Compare with DP if unsure

---

## Final Thoughts

Completing Phase 4 represents a major achievement. You've mastered:

- **40+ algorithmic patterns** across all difficulty levels
- **Problem-solving frameworks** for systematic approaches
- **Complexity analysis** and optimization techniques
- **Interview communication** and explanation skills

### You're Ready For:

**Technical Interviews:**
- Software Engineer (all levels)
- Senior Software Engineer
- Staff Engineer (with system design)
- Technical leadership roles

**Competitive Programming:**
- LeetCode contests
- Codeforces Div 2
- Google Code Jam
- AtCoder Beginner Contests

**Continued Learning:**
- Advanced algorithms courses
- Research in algorithms
- Teaching and mentoring
- Open source contributions

### Remember:

- **Understanding > Memorization:** Know WHY, not just HOW
- **Consistency > Intensity:** Regular practice beats cramming
- **Breadth + Depth:** Know many patterns, master a few
- **Communication matters:** Explaining is as important as solving
- **Never stop learning:** Algorithms is a lifelong journey

---

**Congratulations on reaching Phase 4!** Regardless of your score, the dedication to get here shows commitment to excellence. Keep practicing, keep learning, and good luck with your interviews and career!

---

**Related Resources:**
- [All Assessment Files](./README.md)
- [Dynamic Programming Deep Dive](../strategies/patterns/dynamic-programming.md)
- [Backtracking Deep Dive](../strategies/patterns/backtracking.md)
- [Greedy Algorithms](../strategies/patterns/greedy.md)
- [Divide and Conquer](../strategies/patterns/divide-and-conquer.md)
- [Complete Learning Roadmap](../tracks/roadmap.md)
- [Problem Index](../metadata/problem_index.json)
