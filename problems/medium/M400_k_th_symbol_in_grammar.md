---
id: M400
old_id: A246
slug: k-th-symbol-in-grammar
title: K-th Symbol in Grammar
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# K-th Symbol in Grammar

## Problem

Imagine building a table with `n` rows where each row is generated from the previous one using a simple transformation rule. The first row contains just a single `0`. To generate each subsequent row, scan the previous row and apply these rules: replace every `0` with `01` and replace every `1` with `10`.

This creates a pattern:
- Row 1: `0`
- Row 2: `01` (the `0` became `01`)
- Row 3: `0110` (the `0` became `01`, the `1` became `10`)
- Row 4: `01101001` (expanding each symbol from row 3)

Notice how each row doubles in length: row `n` contains `2^(n-1)` symbols. Given two integers `n` and `k`, return the `k`-th symbol (using 1-based indexing) in row `n`.

The naive approach of actually building all rows quickly becomes impractical: row 30 would contain over 536 million symbols. The key insight is recognizing the recursive structure. Each symbol in row `n` is the parent of two symbols in row `n+1`. If you want the `k`-th symbol in row `n`, you can trace backward: it came from the `(k+1)//2`-th symbol in row `n-1`, and you can determine whether it's the left child (from applying the replacement rule to `0` or `1`) or the right child based on whether `k` is odd or even.

An even more elegant approach uses bit manipulation: the value at position `k` (0-indexed) equals the parity of the number of 1-bits in `k`. This works because the grammar generates symbols following the XOR pattern of binary representations.

## Why This Matters

This problem teaches you to recognize when apparent brute-force exponential growth can be solved with O(log n) or even O(1) algorithms by understanding the underlying mathematical structure. The recursive doubling pattern appears in binary trees, divide-and-conquer algorithms, and in understanding how binary representations encode information. The bit manipulation insight - that complex recursive patterns often have simple closed-form solutions using bitwise operations - is crucial for competitive programming and for optimizing real-world systems where bit-level operations are orders of magnitude faster than iteration. This type of problem tests your ability to spot patterns and think recursively rather than iteratively, a skill essential for analyzing recursive data structures and understanding fractal-like mathematical sequences.

## Examples

**Example 1:**
- Input: `n = 1, k = 1`
- Output: `0`
- Explanation: row 1: 0

**Example 2:**
- Input: `n = 2, k = 1`
- Output: `0`
- Explanation: row 1: 0
row 2: 01

**Example 3:**
- Input: `n = 2, k = 2`
- Output: `1`
- Explanation: row 1: 0
row 2: 01

## Constraints

- 1 <= n <= 30
- 1 <= k <= 2ⁿ ⁻ ¹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
The table forms a binary tree structure. Each symbol in row n generates two symbols in row n+1. The symbol at position k in row n is the parent of symbols at positions 2k-1 and 2k in row n+1. This means you can trace backwards from row n to row 1 to find the answer, rather than building all rows.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use recursion or bit manipulation. For recursion: if k is in the first half of row n, it comes from the same symbol in row n-1. If k is in the second half, it comes from the flipped symbol in row n-1. The pattern follows: if parent is 0, children are [0,1]; if parent is 1, children are [1,0]. Alternatively, the kth symbol in row n equals the count of 1-bits in (k-1) modulo 2.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
The bit manipulation approach is fastest: return the parity of set bits in (k-1). This is because the grammar follows the pattern of generating binary numbers where the kth position (0-indexed) has a value equal to the XOR of all bits in k. Use bin(k-1).count('1') % 2 in Python for a one-liner solution.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Build All Rows | O(2^n) | O(2^n) | Exponential - not practical for n=30 |
| Recursive Backtrack | O(n) | O(n) | Trace from row n to row 1 |
| Optimal Bit Counting | O(log k) | O(1) | Count bits in k-1 |

## Common Mistakes

1. **Trying to build all rows**
   ```python
   # Wrong: Exponential time and space
   def kthGrammar(n, k):
       row = "0"
       for i in range(n - 1):
           new_row = ""
           for ch in row:
               new_row += "01" if ch == '0' else "10"
           row = new_row
       return int(row[k-1])

   # Correct: Use bit manipulation
   def kthGrammar(n, k):
       return bin(k - 1).count('1') % 2
   ```

2. **Off-by-one errors with indexing**
   ```python
   # Wrong: Forgetting k is 1-indexed
   def kthGrammar(n, k):
       return bin(k).count('1') % 2  # Should be k-1

   # Correct: Adjust for 1-based indexing
   def kthGrammar(n, k):
       return bin(k - 1).count('1') % 2
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Binary tree parent-child queries | Easy | Similar recursive structure |
| Gray code generation | Medium | Different bit transformation pattern |
| Count bits in range | Medium | Similar bit counting technique |
| Nth magical number | Hard | More complex mathematical pattern |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Bit Manipulation](../../strategies/patterns/bit-manipulation.md)
