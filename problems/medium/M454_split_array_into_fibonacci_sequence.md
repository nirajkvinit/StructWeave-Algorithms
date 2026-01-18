---
id: M454
old_id: A309
slug: split-array-into-fibonacci-sequence
title: Split Array into Fibonacci Sequence
difficulty: medium
category: medium
topics: ["string"]
patterns: []
estimated_time_minutes: 30
---
# Split Array into Fibonacci Sequence

## Problem

You're given a string of digits like "123456579", and your challenge is to determine if you can split it into a sequence of numbers that follows the Fibonacci pattern.

In a Fibonacci-like sequence, each number (starting from the third one) must equal the sum of the two numbers immediately before it. For example, the sequence [1, 2, 3, 5, 8] is Fibonacci-like because 3 = 1+2, 5 = 2+3, and 8 = 3+5.

Your sequence must meet these requirements:
- Contains at least 3 numbers
- Each number must fit in a 32-bit signed integer (less than 2^31)
- No number can have leading zeros (except the number 0 itself)
- When you read the numbers back-to-back, they recreate the original string

If you can create such a sequence, return any valid sequence. If it's impossible, return an empty array.

For example, the string "1101111" could be split into [110, 1, 111] or [11, 0, 11, 11] - both are valid because they follow the Fibonacci addition pattern.

## Why This Matters

This problem models data parsing challenges where you need to extract structured numeric sequences from continuous streams. It appears in financial transaction analysis where you might need to identify related transaction amounts, in data recovery where corrupted delimiters force you to reconstruct number boundaries, and in bioinformatics where you parse DNA sequence markers. The backtracking approach you'll use is fundamental to parsing expressions in compilers, validating input formats, and solving constraint satisfaction problems. Understanding how to efficiently explore possibilities while pruning invalid paths is essential for game AI, route planning, and resource allocation problems.

## Examples

**Example 1:**
- Input: `num = "1101111"`
- Output: `[11,0,11,11]`
- Explanation: The output [110, 1, 111] would also be accepted.

**Example 2:**
- Input: `num = "112358130"`
- Output: `[]`
- Explanation: The task is impossible.

**Example 3:**
- Input: `num = "0123"`
- Output: `[]`
- Explanation: Leading zeroes are not allowed, so "01", "2", "3" is not valid.

## Constraints

- 1 <= num.length <= 200
- num contains only digits.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Once you choose the first two numbers in the sequence, the rest is determined (each subsequent number must be the sum of the previous two). So the problem reduces to trying all valid pairs of first two numbers and checking if the remaining string follows the Fibonacci pattern.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use backtracking with two nested loops to try all possible lengths for the first two numbers. For each pair (num1, num2), check if num1 + num2 matches the next substring. Continue building the sequence recursively. Handle edge cases: leading zeros, 32-bit overflow, and minimum 3 elements requirement.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Early termination is key: if num1 + num2 doesn't match the beginning of the remaining string, backtrack immediately. Also, the maximum length of any number is about len(num)/2 since we need at least 3 numbers, so limit your search space accordingly.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Try all partitions) | O(2^n) | O(n) | Exponential without pruning |
| Backtracking with Pruning | O(n^2) for first two, O(n) validation | O(n) | Much faster with early termination |

## Common Mistakes

1. **Not handling leading zeros correctly**
   ```python
   # Wrong: Allowing leading zeros like "01"
   num_str = num[start:end]
   num_val = int(num_str)  # 01 becomes 1, but should be invalid!

   # Correct: Check for leading zeros
   if len(num_str) > 1 and num_str[0] == '0':
       continue  # Skip this partition
   # Exception: "0" by itself is valid
   ```

2. **Forgetting 32-bit integer constraint**
   ```python
   # Wrong: Not checking overflow
   num1 = int(num[i:j])
   num2 = int(num[j:k])
   # Could exceed 2^31 - 1

   # Correct: Validate range
   MAX_INT = 2**31 - 1
   if num1 > MAX_INT or num2 > MAX_INT:
       continue
   ```

3. **Inefficient string matching**
   ```python
   # Wrong: Building full sequence then validating
   def build_all_sequences(num):
       # Try all combinations, very slow

   # Correct: Validate incrementally
   def backtrack(index, path):
       if index == len(num):
           return len(path) >= 3
       for end in range(index + 1, len(num) + 1):
           if is_valid_next(num[index:end], path):
               if backtrack(end, path + [num[index:end]]):
                   return True
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Additive Number | Medium | Binary strings or different bases |
| Split String to Make Unique | Medium | Split into unique substrings, different constraint |
| Restore IP Addresses | Medium | Split into 4 valid IP parts (0-255) |
| Palindrome Partitioning | Medium | Split into palindromic substrings |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Backtracking](../../strategies/patterns/backtracking.md)
