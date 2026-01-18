---
id: M544
old_id: A434
slug: numbers-with-same-consecutive-differences
title: Numbers With Same Consecutive Differences
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Numbers With Same Consecutive Differences

## Problem

Imagine you're creating a sequence of `n`-digit numbers where each digit forms a perfect "staircase" pattern with its neighbors—the difference between any two adjacent digits is always exactly `k`.

For example, in the 3-digit number `181`, look at the adjacent pairs:
- `1` to `8`: difference is 7
- `8` to `1`: difference is 7

Every consecutive pair has the same absolute difference!

Your task: Given `n` (number of digits) and `k` (the required difference), generate all possible `n`-digit numbers where each pair of adjacent digits has an absolute difference of exactly `k`.

Important: Numbers cannot have leading zeros (so `081` is invalid, but `181` is fine).

## Why This Matters

This pattern appears in cryptography when generating valid keys with specific digit properties, in barcode generation systems that require check digits with controlled differences, and in puzzle generation algorithms (like Sudoku variants). The constraint-satisfaction approach you'll develop here mirrors problems in scheduling systems (where adjacent time slots must differ by specific amounts), sequence prediction in time-series analysis, and even in music theory for generating scales with specific interval patterns. The backtracking technique is fundamental to solving combinatorial problems in artificial intelligence, game tree exploration, and constraint programming frameworks used in industrial optimization.

## Examples

**Example 1:**
- Input: `n = 3, k = 7`
- Output: `[181,292,707,818,929]`
- Explanation: Numbers like 070 are excluded due to the leading zero restriction.

**Example 2:**
- Input: `n = 2, k = 1`
- Output: `[10,12,21,23,32,34,43,45,54,56,65,67,76,78,87,89,98]`

## Constraints

- 2 <= n <= 9
- 0 <= k <= 9

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a backtracking/DFS problem where you build numbers digit by digit. Start with digits 1-9 (no leading zeros), then for each digit d, the next digit can only be d+k or d-k (if they're valid digits 0-9). Build the number incrementally until you reach n digits.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use BFS or DFS to generate numbers. Start with all single digits 1-9. For each current number, if it has fewer than n digits, append the last digit ± k (if valid). Continue until all numbers have exactly n digits. Alternatively, use recursion where the state is (current_number, remaining_digits). Special case: when k=0, d+k and d-k are the same, so only add once.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
When k=0, you'll generate duplicates if you add both d+0 and d-0. Handle this edge case by only adding one option when k=0. You can use either BFS with a queue or DFS with recursion. BFS is more straightforward as you process level by level (digit by digit).
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Backtracking/DFS | O(2^n) | O(2^n) | Each digit has at most 2 choices |
| BFS Level-by-Level | O(2^n) | O(2^n) | Generate all valid numbers |
| Optimal | O(2^n) | O(2^n) | Exponential in number of digits |

## Common Mistakes

1. **Including numbers with leading zeros**
   ```python
   # Wrong: Starting with 0
   queue = list(range(10))  # Includes 0

   # Correct: Start with 1-9 only
   queue = list(range(1, 10))  # No leading zeros
   ```

2. **Adding duplicates when k=0**
   ```python
   # Wrong: Adding both d+0 and d-0
   next_digits = [last_digit + k, last_digit - k]
   for next_d in next_digits:
       if 0 <= next_d <= 9:
           queue.append(num * 10 + next_d)
   # When k=0, adds same digit twice

   # Correct: Handle k=0 case
   if k == 0:
       next_digits = [last_digit]
   else:
       next_digits = [last_digit + k, last_digit - k]
   ```

3. **Not validating digit bounds**
   ```python
   # Wrong: Not checking if next digit is valid
   next_num = current_num * 10 + (last_digit + k)
   # May create invalid digits > 9 or < 0

   # Correct: Validate before adding
   next_digit = last_digit + k
   if 0 <= next_digit <= 9:
       next_num = current_num * 10 + next_digit
       queue.append(next_num)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Letter Combinations of Phone Number | Medium | Similar digit-by-digit building approach |
| Generate Parentheses | Medium | Building valid sequences with constraints |
| Sequential Digits | Medium | Consecutive increasing digits requirement |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Backtracking](../../strategies/patterns/backtracking.md)
