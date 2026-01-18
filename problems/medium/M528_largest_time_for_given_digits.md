---
id: M528
old_id: A416
slug: largest-time-for-given-digits
title: Largest Time for Given Digits
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Largest Time for Given Digits

## Problem

Imagine you have four digital clock segments that have fallen off their display, each showing a single digit. Your task is to arrange these four digits to create the latest possible valid time in 24-hour format, using each digit exactly once.

Given an array `arr` containing exactly 4 digits (0-9), construct the maximum possible valid time string in the format `"HH:MM"`. Valid 24-hour times have hours ranging from `00` to `23` and minutes from `00` to `59`.

For example, with digits [1, 2, 3, 4], you could form times like "12:34", "13:24", "14:23", "21:34", "23:14", and "23:41". Among these valid options, "23:41" is the latest time possible.

However, not all digit combinations can form valid times. With digits [5, 5, 5, 5], you cannot create any valid time because "55:55" exceeds the valid ranges (hours can't be 55, and minutes can't exceed 59).

Return the latest valid time as a string in `"HH:MM"` format, or return an empty string `""` if no valid time can be constructed.

## Why This Matters

This problem appears in embedded systems and IoT devices where seven-segment displays need to show optimal information from limited digit sets. Digital clock applications use similar logic for "smart time" features that suggest the nearest valid time when users input invalid digits. Configuration interfaces for timers, schedulers, and alarm systems employ these constraints when validating user input. The permutation-based approach with validation teaches you how to handle small combinatorial search spaces efficiently, a pattern that extends to puzzle solvers (Sudoku validators), lock combination crackers, PIN code generation with constraints, and autocomplete systems that suggest valid inputs from partial data.

## Examples

**Example 1:**
- Input: `arr = [1,2,3,4]`
- Output: `"23:41"`
- Explanation: Multiple valid times can be formed: "12:34", "12:43", "13:24", "13:42", "14:23", "14:32", "21:34", "21:43", "23:14", and "23:41". The maximum is "23:41".

**Example 2:**
- Input: `arr = [5,5,5,5]`
- Output: `""`
- Explanation: No valid time exists since "55:55" exceeds the valid ranges for hours and minutes.

## Constraints

- arr.length == 4
- 0 <= arr[i] <= 9

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
Since there are only 4 digits, there are at most 4! = 24 permutations to check. You can generate all possible permutations and validate which ones form valid times, then select the maximum.
</details>

<details>
<summary>Main Approach</summary>
Generate all permutations of the 4 digits, convert each to HH:MM format, validate that hours are 00-23 and minutes are 00-59, then track the maximum valid time encountered. Use string comparison since times in "HH:MM" format compare lexicographically correctly.
</details>

<details>
<summary>Optimization Tip</summary>
Instead of generating all permutations blindly, you can optimize by trying digits in descending order for the hour positions first. For a valid time, the first digit must be 0-2, and if it's 2, the second digit must be 0-3. Similarly, the third digit (minutes tens) must be 0-5.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (All Permutations) | O(1) | O(1) | 4! = 24 permutations, constant since input size is fixed at 4 |
| Optimal (Greedy with Validation) | O(1) | O(1) | Try digits in optimal order, still bounded by small constant |

## Common Mistakes

1. **Not handling invalid times correctly**
   ```python
   # Wrong: Forgetting that hours max at 23, not 24
   def is_valid_time(h1, h2, m1, m2):
       hours = h1 * 10 + h2
       return hours <= 24  # Bug: 24:00 is invalid

   # Correct: Proper validation
   def is_valid_time(h1, h2, m1, m2):
       hours = h1 * 10 + h2
       minutes = m1 * 10 + m2
       return 0 <= hours <= 23 and 0 <= minutes <= 59
   ```

2. **Inefficient string comparison**
   ```python
   # Wrong: Converting to integers for comparison
   time1_val = int(time1.replace(':', ''))  # Expensive and unnecessary

   # Correct: Direct string comparison works for "HH:MM" format
   max_time = max(max_time, current_time)  # Lexicographic comparison
   ```

3. **Not initializing result properly**
   ```python
   # Wrong: Starting with "00:00" as default
   result = "00:00"  # Will return this even if no valid time exists

   # Correct: Use empty string to indicate no valid time found
   result = ""
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Smallest Valid Time | Easy | Find minimum instead of maximum |
| 12-Hour Format Time | Medium | Additional AM/PM constraint handling |
| Largest Time with N Digits | Hard | Generalize to N digits and different time formats |
| Next Closest Time | Medium | Find the next valid time after a given time using same digits |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days
