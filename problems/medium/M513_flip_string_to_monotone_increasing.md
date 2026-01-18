---
id: M513
old_id: A393
slug: flip-string-to-monotone-increasing
title: Flip String to Monotone Increasing
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Flip String to Monotone Increasing

## Problem

Imagine you're processing sensor data from an IoT device that records events as a binary stream—0 represents "inactive" and 1 represents "active". For your analysis to work correctly, you need the data to be monotone increasing: all the inactive periods (0s) should come before all the active periods (1s). Think of it like organizing a daily schedule where rest time comes before work time.

A binary string is considered monotone increasing when it has this pattern: zero or more `0`s followed by zero or more `1`s. Examples: `"0001111"`, `"000"`, `"111"`, and even `"01"` are all monotone increasing. However, `"010"` and `"1001"` are not, because `0`s appear after `1`s.

Given a binary string `s` containing only `0`s and `1`s, you can perform flip operations where each flip toggles a character: `0` becomes `1`, or `1` becomes `0`.

Calculate and return the minimum number of flip operations needed to transform `s` into a monotone increasing binary string.

## Why This Matters

This problem appears frequently in data cleaning and signal processing. Sensor data from manufacturing equipment often needs correction to remove noise and maintain consistent state transitions. Log analysis systems use similar techniques to identify and fix corrupted entries where states transition unexpectedly. Video encoding algorithms apply this concept when compressing binary data by minimizing transitions. The dynamic programming approach you'll develop here is fundamental to understanding how to make optimal local decisions that lead to global optimality—a pattern that appears in resource allocation, scheduling, and cost minimization problems across computer science and operations research.

## Examples

**Example 1:**
- Input: `s = "00110"`
- Output: `1`
- Explanation: We flip the last digit to get 00111.

**Example 2:**
- Input: `s = "010110"`
- Output: `2`
- Explanation: We flip to get 011111, or alternatively 000111.

**Example 3:**
- Input: `s = "00011000"`
- Output: `2`
- Explanation: We flip to get 00000000.

## Constraints

- 1 <= s.length <= 10⁵
- s[i] is either '0' or '1'.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
For monotone increasing, you need all 0s before all 1s. At each position, decide whether to keep it as part of the "0s section" or "1s section". Track the minimum flips needed if we've seen only 0s so far versus if we allow 1s.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use dynamic programming with two states: flips0 (minimum flips if everything so far becomes 0) and flips1 (minimum flips if we allow 1s from some point). For each character, update: new flips0 = flips0 + (1 if char is '1'), new flips1 = min(flips0, flips1) + (1 if char is '0').
</details>

<details>
<summary>⚡ Optimization Tip</summary>
You can solve this in one pass with O(1) space using two variables. No need for arrays. Think of it as maintaining the cost of "all zeros so far" vs "zeros then ones" as you scan left to right.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Prefix/Suffix Arrays | O(n) | O(n) | Count 1s before and 0s after each split point |
| DP Array | O(n) | O(n) | Track states for each position |
| Optimal | O(n) | O(1) | Two variables for current state |

## Common Mistakes

1. **Not considering the transition from 0s to 1s**
   ```python
   # Wrong: Only tracks flipping to all 0s or all 1s
   def minFlipsMonoIncr(self, s):
       flip_to_zero = sum(1 for c in s if c == '1')
       flip_to_one = sum(1 for c in s if c == '0')
       return min(flip_to_zero, flip_to_one)

   # Correct: Track transitions at each position
   def minFlipsMonoIncr(self, s):
       flips0 = 0  # Flips if all 0s so far
       flips1 = 0  # Flips if allowing 1s
       for char in s:
           if char == '1':
               flips0 += 1
           else:
               flips1 = min(flips0, flips1 + 1)
       return min(flips0, flips1)
   ```

2. **Updating variables in wrong order**
   ```python
   # Wrong: Updates flips1 before reading old flips0
   def minFlipsMonoIncr(self, s):
       flips0 = 0
       flips1 = 0
       for char in s:
           if char == '0':
               flips1 = min(flips0, flips1 + 1)  # Uses new flips0!
               flips0 = flips0
           else:
               flips0 += 1  # Modified after flips1 update
       return min(flips0, flips1)

   # Correct: Calculate new values together or save old ones
   def minFlipsMonoIncr(self, s):
       flips0 = 0
       flips1 = 0
       for char in s:
           new_flips0 = flips0 + (1 if char == '1' else 0)
           new_flips1 = min(flips0, flips1) + (1 if char == '0' else 0)
           flips0, flips1 = new_flips0, new_flips1
       return min(flips0, flips1)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Longest Mountain in Array | Medium | Find pattern in array instead of binary string |
| Minimum Deletions to Make String Balanced | Medium | Delete instead of flip |
| Count Binary Substrings | Easy | Count valid substrings |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
