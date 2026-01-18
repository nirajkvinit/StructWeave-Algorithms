---
id: M399
old_id: A244
slug: swap-adjacent-in-lr-string
title: Swap Adjacent in LR String
difficulty: medium
category: medium
topics: ["string"]
patterns: []
estimated_time_minutes: 30
---
# Swap Adjacent in LR String

## Problem

Given two strings of equal length containing only the characters 'L', 'R', and 'X', determine if you can transform the first string into the second using a sequence of allowed moves. You have two types of transformations available:
- Replace any occurrence of "XL" with "LX" (move L to the left)
- Replace any occurrence of "RX" with "XR" (move R to the right)

Think of 'L' and 'R' as pieces on a board with 'X' representing empty spaces. The 'L' pieces can only slide left into empty spaces, and 'R' pieces can only slide right into empty spaces. Critically, pieces cannot pass through each other or jump over one another.

For example, starting with "RXXLRXRXL", you can transform it to "XRLXXRRLX" through a sequence of moves. But you cannot transform "X" into "L" because 'L' would need to appear from nowhere, and you cannot transform "LR" into "RL" because the pieces cannot pass through each other.

The key insight is recognizing the invariants: the relative order of all 'L' and 'R' characters must remain identical between start and end strings (since they cannot pass each other), and each 'L' can only move left (or stay in place), while each 'R' can only move right (or stay in place). This means if you strip out all 'X' characters from both strings, the results must match exactly, and then you verify that each character has moved in the allowed direction.

## Why This Matters

This problem teaches constraint-based reasoning about state transformations, a skill essential for puzzle solving algorithms, game AI, and verifying reachability in state machines. The pattern of checking movement direction constraints appears in sliding puzzle solvers, planning algorithms for robotics (where robots can only move in certain directions), and in compiler optimization passes that verify code transformations preserve program semantics. Understanding invariants that must be preserved across transformations is fundamental to formal verification and correctness proofs in software engineering. The two-pointer technique used in the optimal solution - skipping over irrelevant characters while maintaining position constraints - is widely applicable to string matching and pattern recognition problems.

## Examples

**Example 1:**
- Input: `start = "RXXLRXRXL", end = "XRLXXRRLX"`
- Output: `true`
- Explanation: We can transform start to end following these steps:
RXXLRXRXL ->
XRXLRXRXL ->
XRLXRXRXL ->
XRLXXRRXL ->
XRLXXRRLX

**Example 2:**
- Input: `start = "X", end = "L"`
- Output: `false`

## Constraints

- 1 <= start.length <= 10⁴
- start.length == end.length
- Both start and end will only consist of characters in 'L', 'R', and 'X'.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Notice that 'L' can only move left (XL → LX) and 'R' can only move right (RX → XR). This means L's and R's cannot pass through each other. The relative order of L's and R's must remain the same between start and end strings.
</details>

<details>
<summary>🎯 Main Approach</summary>
Extract all non-X characters from both strings and verify they match in the same order. Then use two pointers to check position constraints: each 'L' in end must be at the same position or to the left of its corresponding 'L' in start (since L moves left), and each 'R' in end must be at the same position or to the right of its corresponding 'R' in start (since R moves right).
</details>

<details>
<summary>⚡ Optimization Tip</summary>
You can do this in a single pass with two pointers instead of extracting characters into separate arrays. Skip over 'X' characters in both strings and compare non-X characters directly, checking the position constraints as you go. This reduces space complexity from O(n) to O(1).
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Extract and Compare | O(n) | O(n) | Store non-X characters in arrays |
| Optimal Two Pointers | O(n) | O(1) | Single pass with position tracking |

## Common Mistakes

1. **Not checking relative order of L's and R's**
   ```python
   # Wrong: Only checking counts of L's and R's
   def canTransform(start, end):
       return (start.count('L') == end.count('L') and
               start.count('R') == end.count('R'))

   # Correct: Check order and position constraints
   def canTransform(start, end):
       if start.replace('X', '') != end.replace('X', ''):
           return False
       # Also need to check position constraints
   ```

2. **Ignoring movement direction constraints**
   ```python
   # Wrong: Not checking if L moved right or R moved left
   i = j = 0
   while i < len(start) and j < len(end):
       if start[i] != 'X':
           if start[i] != end[j]:
               return False
       # Missing: position constraint checks

   # Correct: Verify L only moves left, R only moves right
   for i, j in zip(start_positions, end_positions):
       if char == 'L' and i < j:  # L moved right - invalid
           return False
       if char == 'R' and i > j:  # R moved left - invalid
           return False
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Swap adjacent characters in string | Easy | No movement restrictions |
| Minimum swaps to make strings equal | Medium | Different swap rules |
| Valid parentheses with swaps | Medium | Similar constraint checking pattern |
| Sliding puzzle | Hard | 2D version with position transformations |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Two Pointers](../../strategies/patterns/two-pointers.md)
