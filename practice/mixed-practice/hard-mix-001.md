---
title: Hard Mixed Practice Set 001
category: mixed-practice
difficulty: hard
problem_count: 8
estimated_time_minutes: 240-360
---

# Hard Mixed Practice Set 001

## Purpose

This set contains 8 hard-difficulty problems that test advanced problem-solving skills. These problems require:
- Deep pattern recognition and algorithm design
- Multiple techniques combined
- Careful edge case analysis
- Optimal time/space complexity
- Interview-level explanation skills

## How to Use

### Practice Mode
1. **Read problem carefully** - understand all constraints
2. **Set timer for 45 minutes** per problem
3. **Plan thoroughly** (10 minutes) before coding
4. **Implement, test, optimize** (30-35 minutes)

### Interview Simulation
- **Time limit**: 45 minutes per problem
- **Think aloud**: Explain your reasoning continuously
- **Multiple approaches**: Discuss brute force, then optimize
- **Trade-offs**: Explain time/space complexity trade-offs

### Target Performance
- **Total time**: 240-360 minutes (30-45 min per problem)
- **Success rate**: 5-8 problems solved correctly
- **Optimization**: Achieve optimal or near-optimal solution for 6+ problems

---

## Problem Set

### Problem 1: Median of Two Sorted Arrays
- **ID**: H001
- **Estimated Time**: 45 minutes
- **Pattern**: Binary search on answer, divide and conquer
- **Difficulty**: Very Hard
- **Why this problem**: Classic algorithm design problem

**What to think about:**
- Brute force: Merge arrays O(m+n) - can we do better?
- Binary search on which array?
- What invariant can we maintain?
- How to partition arrays to find median?

**Approach Hint (if stuck):**
Binary search on smaller array. Find partition where left half elements < right half elements. Median is based on max(left) and min(right).

**Key Challenge**: O(log(min(m,n))) solution requires binary search on partition point

**Edge Cases**: Empty arrays, arrays of size 1, all elements in one array smaller

**Time Target**: 40-50 minutes

---

### Problem 2: Trapping Rain Water
- **ID**: H009
- **Pattern**: Two pointers, stack, or DP
- **Difficulty**: Hard
- **Why this problem**: Multiple solution approaches, optimization thinking

**What to think about:**
- What determines water level at each position?
- Can you compute left_max and right_max for each position?
- Can you avoid computing all left_max and right_max?
- Two pointer approach: how to decide which pointer to move?

**Approach Options:**
1. **DP approach**: Precompute left_max and right_max arrays - O(n) time, O(n) space
2. **Two pointers**: Maintain left_max and right_max dynamically - O(n) time, O(1) space
3. **Stack**: Monotonic stack to find boundaries - O(n) time, O(n) space

**Optimal**: Two pointers with O(1) space

**Time Target**: 30-40 minutes

---

### Problem 3: Edit Distance (Levenshtein Distance)
- **ID**: H014
- **Estimated Time**: 40 minutes
- **Pattern**: 2D Dynamic Programming, sequence alignment
- **Difficulty**: Hard
- **Why this problem**: Classic DP, real-world applications

**What to think about:**
- What does dp[i][j] represent?
- Three operations: insert, delete, replace - how do they relate?
- Base cases when one string is empty?
- Can you optimize space from O(mn) to O(min(m,n))?

**Approach Hint (if stuck):**
```
dp[i][j] = min edit distance from word1[0..i-1] to word2[0..j-1]

If word1[i-1] == word2[j-1]:
    dp[i][j] = dp[i-1][j-1]
Else:
    dp[i][j] = 1 + min(
        dp[i][j-1],    # insert
        dp[i-1][j],    # delete
        dp[i-1][j-1]   # replace
    )
```

**Extension**: Can you reconstruct the actual edit sequence?

**Time Target**: 35-45 minutes

---

### Problem 4: N-Queens
- **ID**: H011
- **Estimated Time**: 40 minutes
- **Pattern**: Backtracking with constraints
- **Difficulty**: Hard
- **Why this problem**: Classic constraint satisfaction problem

**What to think about:**
- How to efficiently check if position is attacked?
- What constraints to track? (columns, diagonals)
- How to represent diagonals mathematically?
- Can you optimize checking from O(n) to O(1)?

**Approach Hint (if stuck):**
Backtrack row by row. Track columns, diagonal1 (row-col), diagonal2 (row+col) in sets for O(1) checking.

**Diagonal formulas:**
- Main diagonal (\): `row - col` is constant
- Anti-diagonal (/): `row + col` is constant

**Optimization**: Use bit manipulation for even faster checking (advanced)

**Time Target**: 35-45 minutes

---

### Problem 5: Merge K Sorted Lists
- **ID**: H003
- **Estimated Time**: 35 minutes
- **Pattern**: Heap, divide and conquer
- **Difficulty**: Hard
- **Why this problem**: Heap application, merge optimization

**What to think about:**
- Brute force: Merge two at a time - what's the complexity?
- Can you use a min-heap to always get smallest element?
- Divide and conquer: merge pairs, then merge results
- Which approach is better?

**Approach Options:**
1. **Min-Heap**: Add first node of each list to heap, extract min and add next - O(N log k)
2. **Divide and Conquer**: Merge pairs recursively - O(N log k)
3. **Sequential Merge**: Merge one by one - O(Nk) - too slow

**Optimal**: Both heap and divide-conquer are O(N log k) where N = total nodes, k = number of lists

**Time Target**: 30-40 minutes

---

### Problem 6: Minimum Window Substring
- **ID**: H015
- **Estimated Time**: 40 minutes
- **Pattern**: Sliding window with hash map
- **Difficulty**: Hard
- **Why this problem**: Advanced sliding window with multiple constraints

**What to think about:**
- How to track characters needed?
- When to expand window? When to contract?
- How to check if window is valid?
- How to minimize window size?

**Approach Hint (if stuck):**
Use two hash maps (or one map + counter). Expand right until valid, then contract left while maintaining validity. Track minimum window.

**Key Challenge**: Efficiently checking if window contains all required characters

**Template:**
```
required = Counter(t)
window = defaultdict(int)
have, need = 0, len(required)

while right < len(s):
    # Expand window
    window[s[right]] += 1
    if s[right] in required and window[s[right]] == required[s[right]]:
        have += 1

    # Contract window while valid
    while have == need:
        # Update result
        # Try to shrink from left
        ...
```

**Time Target**: 35-45 minutes

---

### Problem 7: Longest Valid Parentheses
- **ID**: H006
- **Estimated Time**: 40 minutes
- **Pattern**: Stack or DP, multiple approaches
- **Difficulty**: Hard
- **Why this problem**: Creative problem-solving, multiple solutions

**What to think about:**
- Stack approach: What to push to stack?
- DP approach: What does dp[i] represent?
- Two-pass approach: Scan left-to-right, then right-to-left
- Which approach is most intuitive?

**Approach Options:**
1. **Stack**: Push indices, track valid substring lengths - O(n) time, O(n) space
2. **DP**: `dp[i]` = length of longest valid ending at i - O(n) time, O(n) space
3. **Two counters**: Count left and right parens in two passes - O(n) time, O(1) space

**Stack Approach Hint:**
Push index when '(' or when invalid ')'. Valid length = current index - stack[-1].

**Time Target**: 35-45 minutes

---

### Problem 8: Regular Expression Matching
- **ID**: H002
- **Estimated Time**: 45 minutes
- **Pattern**: 2D DP or recursion with memoization
- **Difficulty**: Very Hard
- **Why this problem**: Complex state transitions, tricky edge cases

**What to think about:**
- Base cases: empty string, empty pattern
- How does '*' affect matching? (matches zero or more of preceding element)
- How does '.' affect matching? (matches any single character)
- Recursion vs DP trade-offs?

**State Definition:**
`dp[i][j]` = does s[0..i-1] match p[0..j-1]

**Recurrence Cases:**
1. If `p[j-1]` is normal char or '.': Must match current char
2. If `p[j-1]` is '*': Either match zero (ignore a*) or match one or more

**Key Challenge**: Handling '*' correctly - it modifies the previous character

**Time Target**: 40-50 minutes

---

## Pattern Distribution

This set covers:
- **Binary Search**: 1 problem (Median of Two Sorted Arrays)
- **Two Pointers**: 1 problem (Trapping Rain Water)
- **Dynamic Programming**: 3 problems (Edit Distance, Longest Valid Parentheses, Regex Matching)
- **Backtracking**: 1 problem (N-Queens)
- **Heap/Priority Queue**: 1 problem (Merge K Sorted Lists)
- **Sliding Window**: 1 problem (Minimum Window Substring)

---

## Difficulty Tiers Within Hard

### Entry Hard (Start Here)
- Trapping Rain Water (H009) - Multiple approaches, good for learning
- Merge K Sorted Lists (H003) - Clear heap application

### Standard Hard
- Edit Distance (H014) - Classic DP
- N-Queens (H011) - Classic backtracking
- Minimum Window Substring (H015) - Advanced sliding window
- Longest Valid Parentheses (H006) - Multiple approaches

### Very Hard (Practice Last)
- Median of Two Sorted Arrays (H001) - Requires non-obvious insight
- Regular Expression Matching (H002) - Complex state transitions

---

## Self-Assessment Rubric

### Problem-Solving Approach (Score: /10)
- **9-10 points**: Identified optimal approach quickly, explained clearly
- **7-8 points**: Found working approach, some optimization needed
- **5-6 points**: Working solution but suboptimal
- **<5 points**: Struggled to find working approach

### Implementation Quality (Score: /10)
- **9-10 points**: Clean, optimal code with minimal bugs
- **7-8 points**: Working code with minor issues
- **5-6 points**: Code works but needs significant debugging
- **<5 points**: Code has major bugs or doesn't compile

### Optimization & Analysis (Score: /10)
- **9-10 points**: Achieved optimal complexity, analyzed trade-offs
- **7-8 points**: Near-optimal solution, understood complexity
- **5-6 points**: Working but not optimized
- **<5 points**: Did not analyze complexity

**Total Score: /30 per problem, /240 overall**

**Overall Assessment:**
- **200-240**: Excellent, ready for top-tier interviews
- **160-199**: Good, practice more hard problems
- **120-159**: Adequate, review patterns and retry
- **<120**: Complete pattern drills, practice more medium first

---

## Advanced Techniques Checklist

### For Each Problem

**Algorithm Design:**
- [ ] Identified brute force approach
- [ ] Explained why brute force won't work
- [ ] Found optimization insight
- [ ] Proved correctness of approach

**Implementation:**
- [ ] Handled all edge cases
- [ ] Clean, readable code
- [ ] Proper variable names
- [ ] Added comments for tricky parts

**Complexity Analysis:**
- [ ] Calculated time complexity with proof
- [ ] Calculated space complexity
- [ ] Discussed trade-offs
- [ ] Considered further optimizations

**Interview Skills:**
- [ ] Explained approach clearly
- [ ] Walked through examples
- [ ] Tested with edge cases
- [ ] Discussed alternative approaches

---

## Common Hard Problem Patterns

### 1. Binary Search on Answer
**Problems**: Median of Two Sorted Arrays
**Template**: Binary search on result space, not array indices
```python
def search_answer(low, high):
    while low < high:
        mid = (low + high) // 2
        if is_valid(mid):
            high = mid
        else:
            low = mid + 1
    return low
```

### 2. Complex DP State
**Problems**: Edit Distance, Regex Matching
**Key**: Clearly define what dp[i][j] represents
**Tip**: Draw small example table to verify recurrence

### 3. Advanced Sliding Window
**Problems**: Minimum Window Substring
**Key**: Two pointers + hash map for O(n) solution
**Tip**: Use "have" and "need" counters for efficiency

### 4. Constraint Satisfaction
**Problems**: N-Queens
**Key**: Efficient constraint checking (use sets, not loops)
**Tip**: Represent constraints mathematically

### 5. Heap for K-way Operations
**Problems**: Merge K Sorted Lists
**Key**: Heap maintains k elements, extract min repeatedly
**Tip**: Push tuples (value, list_index, node_index)

---

## Debugging Strategies for Hard Problems

### When Stuck

**1. Simplify the problem:**
- Reduce constraints (smaller N, K)
- Test with minimal examples
- Solve brute force first

**2. Verify understanding:**
- Reread problem carefully
- List all constraints
- Check edge cases

**3. Break down approach:**
- Solve subproblem first
- Build up to full solution
- Test each component

**4. Review pattern:**
- Check pattern guide for template
- Look at similar problems
- Identify what's different

---

## Time Tracking Template

| Problem | Pattern | Plan (min) | Code (min) | Debug (min) | Total | Complexity | Score |
|---------|---------|------------|------------|-------------|-------|------------|-------|
| 1. Median Two Arrays | | | | | | | /30 |
| 2. Trapping Rain Water | | | | | | | /30 |
| 3. Edit Distance | | | | | | | /30 |
| 4. N-Queens | | | | | | | /30 |
| 5. Merge K Lists | | | | | | | /30 |
| 6. Min Window Substring | | | | | | | /30 |
| 7. Longest Valid Parens | | | | | | | /30 |
| 8. Regex Matching | | | | | | | /30 |
| **Total** | | | | | | | /240 |

**Score Breakdown per problem:**
- **27-30**: Optimal solution, clean code, within time
- **21-26**: Working optimal solution, minor issues or overtime
- **15-20**: Suboptimal but working solution
- **9-14**: Partial solution or major bugs
- **0-8**: Did not complete

---

## Practice Strategies

### Strategy 1: Single Problem Deep Dive
1. Spend full 45 minutes on problem
2. Get working solution (any complexity)
3. Optimize to better complexity
4. Implement optimal solution
5. Write explanation of approach

### Strategy 2: Pattern-Based
1. Group by pattern (all DP, then backtracking, etc.)
2. Solve similar problems together
3. Identify common template
4. Note pattern-specific tricks

### Strategy 3: Interview Simulation
1. Set strict 45-minute timer
2. Code on whiteboard or restricted editor
3. Explain approach out loud
4. Don't look at solutions until time up
5. Review and optimize afterward

---

## Next Steps

### Based on Performance

**If Total Score > 200:**
- Practice mock interviews
- Explain solutions to others
- Try contest problems (Codeforces, programming.com)
- Focus on communication and speed

**If Total Score 160-200:**
- Retry this set focusing on optimization
- Practice explaining approaches
- Review weak patterns in depth
- Try more hard problems from the problems directory

**If Total Score 120-160:**
- Complete all pattern drills
- Practice more medium problems
- Review fundamentals for weak areas
- Retry in 3-4 weeks

**If Total Score < 120:**
- Focus on medium problems first
- Complete pattern drills thoroughly
- Review algorithm fundamentals
- Build strong foundation before returning

---

## Interview Preparation Checklist

### Technical Skills
- [ ] Can recognize optimal patterns for hard problems
- [ ] Comfortable with advanced DP (2D, state machines)
- [ ] Proficient with backtracking and pruning
- [ ] Understand binary search variations
- [ ] Can use heaps effectively

### Problem-Solving Process
- [ ] Can explain brute force approach
- [ ] Identify optimization opportunities
- [ ] Prove correctness of solution
- [ ] Analyze time/space complexity
- [ ] Handle edge cases systematically

### Communication Skills
- [ ] Can explain approach clearly
- [ ] Discuss trade-offs between solutions
- [ ] Walk through examples effectively
- [ ] Ask clarifying questions
- [ ] Explain complexity analysis

### Ready for Interviews When
- [ ] Completed this set with score > 180
- [ ] Can solve 6+ problems optimally
- [ ] All solutions within 45 minutes
- [ ] Can explain every solution clearly

---

## Recommended Study Path

### Week 1-2: Pattern Mastery
- Complete DP Drill (pattern-drills/dp-drill.md)
- Complete Backtracking Drill (pattern-drills/backtracking-drill.md)
- Review heap and sliding window patterns

### Week 3-4: Medium Problems
- Complete Medium Mix 001
- Solve 20+ medium problems from the problems directory
- Focus on weak patterns

### Week 5-6: Hard Problems
- Start with entry hard problems (Trapping Rain Water, Merge K Lists)
- Progress to standard hard
- Attempt very hard problems last

### Week 7-8: Interview Prep
- Complete Hard Mix 001 with score > 180
- Mock interviews with peer or platform
- Explain solutions clearly
- Ready for interviews!

---

## Related Resources

**Pattern Guides:**
- [Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
- [Backtracking](../../strategies/patterns/backtracking.md)
- [Binary Search](../../strategies/patterns/binary-search.md)
- [Sliding Window](../../strategies/patterns/sliding-window.md)

**Practice Sets:**
- DP Drill (pattern-drills/dp-drill.md)
- Backtracking Drill (pattern-drills/backtracking-drill.md)
- Medium Mix 001 (mixed-practice/medium-mix-001.md)

**Problem Bank:**
- Hard problems in problems/hard/
- Filter by pattern in metadata/problem_index.json
