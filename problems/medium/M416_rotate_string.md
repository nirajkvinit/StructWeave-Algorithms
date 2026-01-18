---
id: M416
old_id: A263
slug: rotate-string
title: Rotate String
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Rotate String

## Problem

Given two strings `s` and `goal`, determine whether you can transform `s` into `goal` through a series of shift operations.

A shift operation (also called a rotation) takes the leftmost character of the string and moves it to the rightmost position. For example:
- Shifting "abcde" once gives "bcdea" (moved 'a' to the end)
- Shifting "bcdea" once gives "cdeab" (moved 'b' to the end)
- Shifting "cdeab" once gives "deabc" (moved 'c' to the end)

You can perform any number of shifts (including zero). The question is: can you transform `s` into `goal` through these operations?

For instance, if `s = "abcde"` and `goal = "cdeab"`, the answer is true because you can shift twice to get from "abcde" → "bcdea" → "cdeab". However, if `goal = "abced"`, the answer is false because no amount of shifting will produce that result (the characters are in a different order, not just rotated).

The elegant solution uses a mathematical property: all possible rotations of a string are substrings of the string concatenated with itself.

## Why This Matters

String rotation problems appear frequently in practical applications: circular buffers in systems programming, detecting equivalent DNA sequences in bioinformatics (since DNA strands can be circular), image recognition (detecting rotated patterns), and data validation (checking if two representations are rotations of each other). The technique of concatenating a string with itself to capture all rotations is a beautiful example of how a clever representation can simplify what seems like a complex problem. This pattern of transforming a problem by changing representation is fundamental to algorithm design.

## Examples

**Example 1:**
- Input: `s = "abcde", goal = "cdeab"`
- Output: `true`

**Example 2:**
- Input: `s = "abcde", goal = "abced"`
- Output: `false`

## Constraints

- 1 <= s.length, goal.length <= 100
- s and goal consist of lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
All rotations of string s are substrings of s + s. For example, if s = "abcde", then s + s = "abcdeabcde" contains all rotations: "abcde", "bcdea", "cdeab", "deabc", "eabcd". Simply check if goal is a substring of s + s (with length check).
</details>

<details>
<summary>🎯 Main Approach</summary>
First check if s and goal have the same length (necessary condition). If lengths differ, return false immediately. Then check if goal appears as a substring in s + s. Use the built-in string contains operation or substring search. This elegantly handles all possible rotations in one check.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
The substring check using s + s is already optimal for most cases. If you want to avoid creating the concatenated string, you can use the KMP (Knuth-Morris-Pratt) algorithm to search for goal in the circular representation of s, but this is typically unnecessary given the string length constraints (up to 100).
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Check All Rotations | O(n²) | O(n) | Generate each rotation and compare |
| Substring in s+s | O(n) | O(n) | Built-in substring search (KMP-like) |
| KMP Algorithm | O(n) | O(n) | Explicit pattern matching without concatenation |
| Optimal | O(n) | O(n) | Using s + s with substring check |

## Common Mistakes

1. **Manually checking each rotation**
   ```python
   # Wrong: Iterating through all possible rotations
   def rotate_string(s, goal):
       if len(s) != len(goal):
           return False
       for i in range(len(s)):
           if s[i:] + s[:i] == goal:
               return True
       return False

   # Correct: Single substring check
   def rotate_string(s, goal):
       return len(s) == len(goal) and goal in s + s
   ```

2. **Forgetting to check lengths first**
   ```python
   # Wrong: Not checking length equality
   def rotate_string(s, goal):
       return goal in s + s  # Will give wrong answer if lengths differ

   # Correct: Check lengths first
   def rotate_string(s, goal):
       return len(s) == len(goal) and goal in s + s
   ```

3. **Creating unnecessary rotations in a loop**
   ```python
   # Wrong: Building each rotation string
   rotations = []
   for i in range(len(s)):
       rotations.append(s[i:] + s[:i])
   return goal in rotations

   # Correct: Use mathematical property
   return len(s) == len(goal) and goal in s + s
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Determine if String Halves Are Alike | Easy | Compare properties of two halves |
| Check if One String Swap Can Make Equal | Easy | One swap instead of rotation |
| Minimum Number of Swaps to Make Strings Equal | Medium | Multiple swaps to match |
| String Rotation with K Shifts | Medium | Limited number of rotations allowed |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [String Manipulation](../../strategies/data-structures/strings.md)
