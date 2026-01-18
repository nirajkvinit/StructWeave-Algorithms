---
title: Backtracking Pattern Drill
category: pattern-drills
pattern: backtracking
difficulty_range: easy-hard
estimated_time_minutes: 150-180
problem_count: 11
---

# Backtracking Pattern Drill

## Purpose

Master the backtracking pattern by solving problems that systematically explore decision trees. This drill covers all major backtracking archetypes: permutations, combinations, subsets, and constraint satisfaction.

## Learning Objectives

After completing this drill, you should be able to:
- Recognize when backtracking is the optimal approach
- Implement the choose-explore-unchoose pattern
- Apply pruning techniques to reduce search space
- Calculate time complexity for backtracking algorithms
- Handle state management in recursive calls

---

## Backtracking Template

All backtracking problems follow this structure:

```python
def backtrack(state, choices, result):
    # Base case: solution is complete
    if is_complete(state):
        result.append(state.copy())  # Must copy!
        return

    # Try each valid choice
    for choice in get_valid_choices(choices):
        # 1. CHOOSE: Add choice to current state
        state.append(choice)
        mark_as_used(choice)

        # 2. EXPLORE: Recurse with updated state
        backtrack(state, choices, result)

        # 3. UNCHOOSE: Remove choice (backtrack)
        state.pop()
        mark_as_unused(choice)
```

### Key Components

1. **State**: Current partial solution being built
2. **Choices**: Available options at this decision point
3. **Constraints**: Rules that determine valid choices
4. **Goal**: Condition for a complete solution
5. **Pruning**: Early termination of invalid branches

---

## Pattern Recognition Guide

### When to Use Backtracking

Look for these signals:
- Generate **all** solutions (not just one)
- Explore **combinations, permutations, or subsets**
- Satisfy **constraints** while building solutions
- Keywords: "all possible", "find all ways", "generate all"

### Backtracking vs. Other Approaches

| Scenario | Use Backtracking | Use Alternative |
|----------|------------------|-----------------|
| Generate all permutations | ✓ Yes | - |
| Find one valid solution | ✓ Yes | BFS/DFS might be simpler |
| Count solutions only | Maybe | DP often faster |
| Optimize (min/max) | Rarely | DP, Greedy usually better |
| Large search space | Only with pruning | DP, Greedy, Heuristics |

---

## Problem Set

### Section 1: Subsets and Combinations (3 problems)

#### 1. Subsets (Power Set)
- **ID**: Find in problems/easy/ (search "subsets")
- **Pattern**: Include/exclude decisions
- **Concepts**: Binary tree exploration, 2^n solutions
- **Time Target**: 15 minutes
- **Key Insight**: At each element, choose to include or exclude it

**Why start here:**
- Simplest backtracking pattern
- Clear binary decision at each step
- Foundation for combination problems

**Decision Tree for [1,2,3]:**
```
                    []
          /                    \
      [1]                        []
    /     \                    /     \
 [1,2]    [1]              [2]        []
 /   \    /  \            /   \      /   \
[1,2,3][1,2][1,3][1]  [2,3][2]  [3]  []
```

**Template:**
```python
def subsets(nums):
    result = []

    def backtrack(start, current):
        result.append(current[:])  # Add current subset

        for i in range(start, len(nums)):
            current.append(nums[i])      # Include nums[i]
            backtrack(i + 1, current)    # Explore
            current.pop()                # Exclude nums[i]

    backtrack(0, [])
    return result
```

**Time Complexity**: O(2^n × n) - 2^n subsets, each takes O(n) to copy
**Space Complexity**: O(n) - recursion depth

---

#### 2. Combination Sum
- **ID**: E024
- **Pattern**: Unbounded choices (can reuse elements)
- **Concepts**: Exploring with repetition, pruning by sorting
- **Time Target**: 20 minutes
- **Key Insight**: Can use same element multiple times

**Why this problem:**
- Introduces unbounded backtracking
- Teaches pruning (skip if sum exceeds target)
- Practice with early termination

**Pruning Strategies:**
```python
def combinationSum(candidates, target):
    result = []
    candidates.sort()  # Enables pruning

    def backtrack(start, current, current_sum):
        if current_sum == target:
            result.append(current[:])
            return

        for i in range(start, len(candidates)):
            if current_sum + candidates[i] > target:
                break  # PRUNING: sorted, so rest also too large

            current.append(candidates[i])
            backtrack(i, current, current_sum + candidates[i])  # i, not i+1 (can reuse)
            current.pop()

    backtrack(0, [], 0)
    return result
```

**Pruning Impact:**
- Without pruning: Explore all branches until sum > target
- With pruning: Stop early when candidate too large
- Sorting enables early break (not just continue)

---

#### 3. Combination Sum II (with duplicates)
- **ID**: M009
- **Pattern**: Skip duplicates at same level
- **Concepts**: Avoiding duplicate combinations, same-level pruning
- **Time Target**: 25 minutes
- **Key Insight**: Skip duplicate elements at same recursion level

**Why this problem:**
- Handles duplicate elements
- Critical pattern: skip duplicates at same level, not globally
- Tests understanding of recursion tree structure

**Duplicate Handling:**
```python
def combinationSum2(candidates, target):
    result = []
    candidates.sort()

    def backtrack(start, current, current_sum):
        if current_sum == target:
            result.append(current[:])
            return

        for i in range(start, len(candidates)):
            if current_sum + candidates[i] > target:
                break

            # CRITICAL: Skip duplicates at same level
            if i > start and candidates[i] == candidates[i-1]:
                continue  # Same level (different from different depths)

            current.append(candidates[i])
            backtrack(i + 1, current, current_sum + candidates[i])
            current.pop()

    backtrack(0, [], 0)
    return result
```

**Why `i > start` not `i > 0`?**
```
candidates = [1, 2, 2, 3], target = 5

At level 0: Can choose first 2 (i=1)
At level 1: SKIP second 2 (i=2) if already chose 2 at same level
But different depths: [2, 2, ...] is valid (chose 2 at i=1, then i=2 in recursion)
```

---

### Section 2: Permutations (3 problems)

#### 4. Permutations
- **ID**: E025
- **Pattern**: All orderings of distinct elements
- **Concepts**: Used set, all positions matter
- **Time Target**: 15 minutes
- **Key Insight**: Track which elements are already used

**Why this problem:**
- Canonical permutation problem
- Introduces "used" tracking
- Foundation for permutation variations

**Two Approaches:**

**Approach 1: Used Set**
```python
def permute(nums):
    result = []

    def backtrack(current):
        if len(current) == len(nums):
            result.append(current[:])
            return

        for num in nums:
            if num in current:  # Or use a used set
                continue
            current.append(num)
            backtrack(current)
            current.pop()

    backtrack([])
    return result
```

**Approach 2: Swap-based (in-place)**
```python
def permute(nums):
    result = []

    def backtrack(start):
        if start == len(nums):
            result.append(nums[:])
            return

        for i in range(start, len(nums)):
            nums[start], nums[i] = nums[i], nums[start]  # Swap
            backtrack(start + 1)
            nums[start], nums[i] = nums[i], nums[start]  # Swap back

    backtrack(0)
    return result
```

**Time Complexity**: O(n! × n) - n! permutations, each takes O(n) to build

---

#### 5. Permutations II (with duplicates)
- **ID**: M012
- **Pattern**: Permutations with duplicate elements
- **Concepts**: Skip duplicates in permutations, frequency counting
- **Time Target**: 25 minutes
- **Key Insight**: Sort and skip consecutive duplicates at same level

**Why this problem:**
- Combines permutation with duplicate handling
- More complex pruning logic
- Tests both concepts together

**Implementation:**
```python
def permuteUnique(nums):
    result = []
    nums.sort()
    used = [False] * len(nums)

    def backtrack(current):
        if len(current) == len(nums):
            result.append(current[:])
            return

        for i in range(len(nums)):
            if used[i]:
                continue

            # Skip duplicates: if current num same as previous AND previous not used
            if i > 0 and nums[i] == nums[i-1] and not used[i-1]:
                continue

            used[i] = True
            current.append(nums[i])
            backtrack(current)
            current.pop()
            used[i] = False

    backtrack([])
    return result
```

**Why check `not used[i-1]`?**
- If nums[i-1] is used: We're in a different branch (deeper recursion)
- If nums[i-1] not used: We're at same level, would create duplicate

---

#### 6. Next Permutation
- **ID**: E019
- **Pattern**: Lexicographic ordering, in-place algorithm
- **Concepts**: Two pointers, reverse, no backtracking (but related)
- **Time Target**: 20 minutes
- **Key Insight**: Find rightmost ascent, swap with next larger, reverse tail

**Why this problem:**
- Important permutation algorithm
- Efficient O(n) solution (not backtracking)
- Understanding permutation ordering

**Algorithm:**
```python
def nextPermutation(nums):
    # 1. Find rightmost ascent (i < i+1)
    i = len(nums) - 2
    while i >= 0 and nums[i] >= nums[i+1]:
        i -= 1

    if i >= 0:  # Not last permutation
        # 2. Find rightmost element > nums[i]
        j = len(nums) - 1
        while nums[j] <= nums[i]:
            j -= 1

        # 3. Swap
        nums[i], nums[j] = nums[j], nums[i]

    # 4. Reverse tail
    nums[i+1:] = reversed(nums[i+1:])
```

---

### Section 3: Constraint Satisfaction (3 problems)

#### 7. Generate Parentheses
- **ID**: M005
- **Pattern**: Constraint-based generation
- **Concepts**: Pruning invalid branches, validity rules
- **Time Target**: 20 minutes
- **Key Insight**: Only add ')' when more '(' exist

**Why this problem:**
- Elegant pruning example
- Two constraints: count limits and validity
- Teaches early termination

**Constraints:**
```python
def generateParenthesis(n):
    result = []

    def backtrack(current, open_count, close_count):
        if len(current) == 2 * n:
            result.append(current)
            return

        # Constraint 1: Can add '(' if not at limit
        if open_count < n:
            backtrack(current + '(', open_count + 1, close_count)

        # Constraint 2: Can add ')' if it would be valid
        if close_count < open_count:
            backtrack(current + ')', open_count, close_count + 1)

    backtrack('', 0, 0)
    return result
```

**Pruning Power:**
- Brute force: 2^(2n) combinations, then filter
- Backtracking: Only ~4^n / sqrt(n) valid (Catalan number)

---

#### 8. Letter Combinations of a Phone Number
- **ID**: E012
- **Pattern**: Multiple choice sets, cartesian product
- **Concepts**: Digit-to-letter mapping, exploring combinations
- **Time Target**: 15 minutes
- **Key Insight**: For each digit, try all corresponding letters

**Why this problem:**
- Simple backtracking application
- Multiple choice sets (not just include/exclude)
- Good warm-up for harder problems

**Implementation:**
```python
def letterCombinations(digits):
    if not digits:
        return []

    phone = {
        '2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl',
        '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz'
    }
    result = []

    def backtrack(index, current):
        if index == len(digits):
            result.append(current)
            return

        for letter in phone[digits[index]]:
            backtrack(index + 1, current + letter)

    backtrack(0, '')
    return result
```

**Time Complexity**: O(4^n × n) worst case (digit 7 and 9 have 4 letters)

---

#### 9. Valid Sudoku Solver
- **ID**: H007
- **Pattern**: Constraint satisfaction problem
- **Concepts**: Multiple constraints, backtracking with validation
- **Time Target**: 40 minutes
- **Key Insight**: Try digits 1-9, validate constraints, backtrack if invalid

**Why this problem:**
- Classic CSP problem
- Multiple simultaneous constraints (row, column, box)
- Tests advanced backtracking skills

**Constraints to Check:**
1. Row constraint: No duplicate in row
2. Column constraint: No duplicate in column
3. Box constraint: No duplicate in 3×3 box

**Template:**
```python
def solveSudoku(board):
    def is_valid(board, row, col, num):
        # Check row
        if num in board[row]:
            return False

        # Check column
        if num in [board[i][col] for i in range(9)]:
            return False

        # Check 3x3 box
        box_row, box_col = 3 * (row // 3), 3 * (col // 3)
        for i in range(box_row, box_row + 3):
            for j in range(box_col, box_col + 3):
                if board[i][j] == num:
                    return False
        return True

    def backtrack():
        for row in range(9):
            for col in range(9):
                if board[row][col] == '.':
                    for num in '123456789':
                        if is_valid(board, row, col, num):
                            board[row][col] = num

                            if backtrack():
                                return True

                            board[row][col] = '.'  # Backtrack
                    return False  # No valid digit found
        return True  # All cells filled

    backtrack()
```

---

### Section 4: Advanced Backtracking (2 problems)

#### 10. N-Queens
- **ID**: H011
- **Pattern**: Placement with constraints
- **Concepts**: Diagonal constraints, board state
- **Time Target**: 35 minutes
- **Key Insight**: Track columns, diagonals with sets

**Why this problem:**
- Classic backtracking problem
- Multiple constraint types
- Efficient constraint checking

**Constraint Tracking:**
```python
def solveNQueens(n):
    result = []
    board = [['.'] * n for _ in range(n)]

    cols = set()
    diag1 = set()  # row - col
    diag2 = set()  # row + col

    def backtrack(row):
        if row == n:
            result.append([''.join(r) for r in board])
            return

        for col in range(n):
            # Check constraints
            if col in cols or (row - col) in diag1 or (row + col) in diag2:
                continue

            # Place queen
            board[row][col] = 'Q'
            cols.add(col)
            diag1.add(row - col)
            diag2.add(row + col)

            backtrack(row + 1)

            # Remove queen
            board[row][col] = '.'
            cols.remove(col)
            diag1.remove(row - col)
            diag2.remove(row + col)

    backtrack(0)
    return result
```

**Constraint Formulas:**
- Same column: `col`
- Same diagonal (\): `row - col` is constant
- Same diagonal (/): `row + col` is constant

**Time Complexity**: O(n!) - roughly n choices for first row, n-1 for second, etc.

---

#### 11. N-Queens II (Count Solutions)
- **ID**: H012
- **Pattern**: Same as N-Queens, but count only
- **Concepts**: Optimization - no need to build board
- **Time Target**: 25 minutes
- **Key Insight**: Same algorithm, just increment counter

**Why this problem:**
- Practice optimization
- Shows when to skip solution construction
- Faster than building all solutions

**Optimized Version:**
```python
def totalNQueens(n):
    def backtrack(row, cols, diag1, diag2):
        if row == n:
            return 1

        count = 0
        for col in range(n):
            if col not in cols and (row-col) not in diag1 and (row+col) not in diag2:
                count += backtrack(
                    row + 1,
                    cols | {col},
                    diag1 | {row-col},
                    diag2 | {row+col}
                )
        return count

    return backtrack(0, set(), set(), set())
```

---

## Pruning Techniques

### 1. Constraint Checking
Stop exploring if constraints violated:
```python
if current_sum > target:
    return  # Don't explore further
```

### 2. Sorting for Early Termination
```python
candidates.sort()
for num in candidates:
    if current_sum + num > target:
        break  # All remaining are too large
```

### 3. Skip Duplicates at Same Level
```python
if i > start and nums[i] == nums[i-1]:
    continue  # Avoid duplicate combinations
```

### 4. Isomorphism Pruning
```python
# N-Queens: Only try first row, exploit symmetry
# Can reduce search space by half or more
```

---

## Time Complexity Analysis

### General Backtracking Complexity

| Problem Type | Time Complexity | Explanation |
|-------------|----------------|-------------|
| Subsets | O(2^n × n) | 2^n subsets, O(n) to copy each |
| Permutations | O(n! × n) | n! permutations, O(n) to build each |
| Combinations | O(C(n,k) × k) | C(n,k) combinations, O(k) to copy |
| N-Queens | O(n!) | Roughly n choices, then n-1, etc. |
| Sudoku | O(9^m) | m empty cells, 9 choices each (with pruning) |

### Calculating Branches
```
Number of solutions × Cost to build each solution

Examples:
- Subsets of n elements: 2^n subsets × O(n) copy = O(2^n × n)
- Permutations of n: n! perms × O(n) copy = O(n! × n)
```

---

## Common Mistakes

### 1. Forgetting to Copy
```python
# WRONG: All results reference same list
result.append(current)

# CORRECT: Copy the list
result.append(current[:])  # or current.copy()
```

### 2. Not Backtracking
```python
# WRONG: State not restored
current.append(choice)
backtrack(...)
# Missing: current.pop()

# CORRECT: Always undo changes
current.append(choice)
backtrack(...)
current.pop()
```

### 3. Wrong Duplicate Skip Logic
```python
# WRONG: Skips duplicates globally
if nums[i] == nums[i-1]:
    continue

# CORRECT: Skip only at same level
if i > start and nums[i] == nums[i-1]:
    continue
```

### 4. Index Out of Bounds
```python
# WRONG: i-1 when i could be 0
if nums[i] == nums[i-1]:  # Crashes when i=0

# CORRECT: Check bounds
if i > 0 and nums[i] == nums[i-1]:
```

---

## Practice Strategies

### First Pass: Understanding
1. Draw the decision tree for small input
2. Identify what choices exist at each step
3. Define base case clearly
4. Implement basic backtracking
5. Test with examples

### Second Pass: Optimization
1. Add constraint checking
2. Implement pruning
3. Sort input if helpful
4. Skip duplicates correctly
5. Measure speedup

### Pattern Recognition
For each problem, identify:
- **Choice space**: What can I choose?
- **Constraints**: When is a choice invalid?
- **State**: What do I track in recursion?
- **Base case**: When is solution complete?
- **Pruning**: How can I cut branches early?

---

## Completion Checklist

### Understanding
- [ ] Can explain choose-explore-unchoose pattern
- [ ] Can draw decision tree for backtracking problems
- [ ] Understands difference between same-level and global duplicates
- [ ] Can calculate time complexity for backtracking

### Implementation
- [ ] Comfortable with both array and set-based state
- [ ] Can implement swap-based and choice-based approaches
- [ ] Always remembers to copy when adding to result
- [ ] Always backtracks (undoes changes)

### Problem-Solving
- [ ] Completed all 11 problems
- [ ] Solved each within time target
- [ ] Can implement all pruning techniques
- [ ] Can handle duplicates correctly

---

## Next Steps

After completing this drill:
1. **Time yourself**: Resolve problems under interview conditions
2. **Variations**: Try related problems in problems/
3. **Optimization**: Focus on pruning techniques
4. **Explanation**: Practice explaining approach verbally

**Related Drills:**
- Dynamic Programming Drill (pattern-drills/dp-drill.md)
- DFS/BFS Drill (pattern-drills/graph-drill.md)
- Recursion Fundamentals (strategies/fundamentals/recursion.md)

**Strategy Reference:** See [Backtracking Pattern](../../strategies/patterns/backtracking.md)
