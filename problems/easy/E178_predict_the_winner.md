---
id: E178
old_id: I285
slug: predict-the-winner
title: Predict the Winner
difficulty: easy
category: easy
topics: ["array", "dynamic-programming", "game-theory"]
patterns: ["minimax"]
estimated_time_minutes: 15
frequency: medium
related_problems:
  - M045  # Stone Game
  - H012  # Stone Game II
  - M046  # Stone Game III
prerequisites:
  - Recursion
  - Dynamic programming
  - Game theory basics
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Predict the Winner

## Problem

Two players are competing in a strategic number-picking game using an integer array. The rules are simple but require optimal strategy: players alternate turns, and on each turn, the current player must choose either the leftmost or rightmost number from the remaining array, adding that number to their score. Both players start with a score of 0, and the game continues until all numbers have been taken.

The crucial assumption is that both players play optimally - each player makes the choice that maximizes their advantage on every turn, knowing the opponent will do the same. Your task is to determine whether Player 1 can win (or tie) given perfect play from both sides. Note that ties count as wins for Player 1.

This is a classic minimax problem: when you choose a number, you're not just maximizing your score, but also choosing which game state to leave for your opponent. If you take the left number, your opponent gets to choose from the remaining array, and they'll pick whichever option is best for them (worst for you). Understanding this adversarial dynamic is key to solving the problem.

## Why This Matters

This problem introduces minimax algorithm and game theory principles that are fundamental to AI decision-making in competitive scenarios. The same principles power chess engines, Go programs, poker bots, and any system where agents compete for optimal outcomes. The pattern of "maximizing your score while minimizing your opponent's advantage" appears in economics (Nash equilibrium), security (adversarial modeling), and competitive resource allocation. The dynamic programming optimization technique you learn here - transforming a recursive minimax tree into a table of score advantages - is essential for making game-playing algorithms practical. Companies building game AI, recommendation systems with competing objectives, or any form of strategic planning value this skill highly.

## Examples

**Example 1:**
- Input: `nums = [1,5,2]`
- Output: `false`
- Explanation: With optimal play, Player 1 selects 2, Player 2 takes 5, and Player 1 gets 1. The final scores are Player 1: 3, Player 2: 5, resulting in Player 2's victory.

**Example 2:**
- Input: `nums = [1,5,233,7]`
- Output: `true`
- Explanation: Using optimal strategy, Player 1 takes 1, then regardless of Player 2's choice (5 or 7), Player 1 can secure 233. Player 1 ends with 234 points versus Player 2's 12 points.

## Constraints

- 1 <= nums.length <= 20
- 0 <= nums[i] <= 10⁷

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Hint
Think recursively: at each turn, a player chooses left or right. The score difference for the current player is the chosen value minus the best the opponent can achieve on the remaining array. Use memoization to avoid recalculating subproblems.

### Intermediate Hint
Define a recursive function that returns the maximum score difference (current player - opponent) for a subarray from index i to j. When a player picks from left, they get nums[i] + (-recurse(i+1, j)). When picking from right, they get nums[j] + (-recurse(i, j-1)). The negation represents the opponent's turn.

### Advanced Hint
Use dynamic programming with a 2D table dp[i][j] representing the maximum score advantage for the current player on subarray [i, j]. Base case: dp[i][i] = nums[i]. Recurrence: dp[i][j] = max(nums[i] - dp[i+1][j], nums[j] - dp[i][j-1]). Player 1 wins if dp[0][n-1] >= 0. Optimize to O(n) space using 1D array.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (Try All) | O(2^n) | O(n) | Recursive tree without memoization |
| Recursion + Memoization | O(n²) | O(n²) | Cache results for each subarray |
| 2D DP Bottom-Up | O(n²) | O(n²) | Iterative table-filling approach |
| 1D DP Optimized | O(n²) | O(n) | Space-optimized using rolling array |

## Common Mistakes

### Mistake 1: Not considering opponent's optimal play
```python
# Wrong: Maximizing own score without considering opponent
def predictWinner(nums):
    def helper(i, j):
        if i == j:
            return nums[i]
        # Wrong: just picking max without opponent's best response
        return max(nums[i] + helper(i+1, j),
                   nums[j] + helper(i, j-1))
```

**Issue**: This assumes the opponent doesn't play optimally. The correct approach should subtract the opponent's best score.

**Fix**: Use `max(nums[i] - helper(i+1, j), nums[j] - helper(i, j-1))` to account for the opponent's optimal strategy.

### Mistake 2: Incorrect base case handling
```python
# Wrong: Missing or incorrect base case
def predictWinner(nums):
    memo = {}
    def helper(i, j):
        if (i, j) in memo:
            return memo[(i, j)]
        # Missing: base case when i == j
        if i > j:
            return 0
        # Rest of logic...
```

**Issue**: The base case should handle when there's exactly one element (i == j), not when indices cross.

**Fix**: Add `if i == j: return nums[i]` before checking `i > j`.

### Mistake 3: Wrong final comparison
```python
# Wrong: Comparing total scores instead of advantage
def predictWinner(nums):
    # ... DP logic that calculates advantage
    advantage = dp[0][n-1]
    total = sum(nums)
    return advantage > total // 2  # Wrong comparison
```

**Issue**: The DP returns score advantage, not absolute score. Comparing to half the total is incorrect.

**Fix**: Simply return `dp[0][n-1] >= 0` since Player 1 wins if their advantage is non-negative (ties count as wins).

## Variations

| Variation | Difficulty | Description |
|-----------|----------|-------------|
| Stone Game | Medium | Variation with even-length array and piles of stones |
| Stone Game II | Hard | Players can take 1 to 2X piles at a time |
| Stone Game III | Hard | Players can take 1, 2, or 3 stones from beginning |
| Stone Game IV | Hard | Players can take square number of stones |
| Minimum Score After Removals | Hard | Minimize score difference with different rules |

## Practice Checklist

Track your progress on this problem:

**First Attempt**
- [ ] Solved independently (30 min time limit)
- [ ] Implemented DP solution with memoization
- [ ] All test cases passing
- [ ] Analyzed time and space complexity

**Spaced Repetition**
- [ ] Day 1: Resolve from memory
- [ ] Day 3: Solve with bottom-up DP
- [ ] Week 1: Implement 1D space optimization
- [ ] Week 2: Solve Stone Game variations
- [ ] Month 1: Teach minimax concept to someone else

**Mastery Goals**
- [ ] Can explain minimax algorithm
- [ ] Can handle edge cases (single element, two elements, all equal)
- [ ] Can derive DP recurrence from game rules
- [ ] Can solve in under 20 minutes

**Strategy**: See [Dynamic Programming Patterns](../strategies/patterns/dynamic-programming.md)
