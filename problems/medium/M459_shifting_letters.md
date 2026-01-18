---
id: M459
old_id: A315
slug: shifting-letters
title: Shifting Letters
difficulty: medium
category: medium
topics: ["array", "string"]
patterns: []
estimated_time_minutes: 30
---
# Shifting Letters

## Problem

Imagine you have a string of lowercase letters and a magic wand that can shift letters forward in the alphabet. When you shift a letter, it moves to the next one: 'a' becomes 'b', 'b' becomes 'c', and so on. When you shift 'z', it wraps around to 'a'.

Here's the twist: you have an array of shift amounts, and each shift amount affects not just one letter, but a prefix of the string. The first shift amount shifts all letters from position 0 to position 0 (just the first letter). The second shift amount shifts all letters from position 0 to position 1 (the first two letters). The third shift amount shifts all letters from position 0 to position 2 (the first three letters), and so on.

For example, with string "abc" and shifts [3, 5, 9]:
- First, shift the first 1 letters by 3: "abc" becomes "dbc"
- Then, shift the first 2 letters by 5: "dbc" becomes "igc"
- Finally, shift the first 3 letters by 9: "igc" becomes "rpl"

Your task is to return the final string after applying all these shift operations.

## Why This Matters

This problem teaches cumulative operations optimization - a pattern that appears throughout computer science. In video game physics, you might calculate the cumulative effect of multiple force fields acting on different regions of the game world. In financial systems, you calculate running totals of transactions that affect different account ranges. Database systems use similar techniques for range updates without rewriting entire datasets. The suffix sum optimization you'll discover is fundamental to difference arrays, which are used in calendar booking systems (overlapping event counts), traffic analysis (cumulative flow through road segments), and memory management (tracking reference counts across regions). Understanding how to transform O(n²) naive solutions into O(n) optimal ones is a crucial algorithmic skill.

## Examples

**Example 1:**
- Input: `s = "abc", shifts = [3,5,9]`
- Output: `"rpl"`
- Explanation: Starting with "abc":
After 3 shifts to the first character: "dbc"
After 5 shifts to the first two characters: "igc"
After 9 shifts to all three characters: "rpl"

**Example 2:**
- Input: `s = "aaa", shifts = [1,2,3]`
- Output: `"gfd"`

## Constraints

- 1 <= s.length <= 10⁵
- s consists of lowercase English letters.
- shifts.length == s.length
- 0 <= shifts[i] <= 10⁹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
The naive approach of applying each shift[i] to positions 0..i would be O(n^2) time complexity. Notice that character at position j will be shifted by shifts[j] + shifts[j+1] + ... + shifts[n-1]. This is a suffix sum! Calculate cumulative shifts from right to left.
</details>

<details>
<summary>🎯 Main Approach</summary>
Work backwards through the shifts array, accumulating the total shifts that apply to each position. For position i, calculate total_shift = sum of shifts[i:]. Then apply (total_shift % 26) to s[i]. Use modulo 26 to handle wraparound and large shift values efficiently.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Instead of calculating suffix sums separately, maintain a running total as you iterate right-to-left. This gives O(n) time and O(1) extra space (besides the output). Remember to use modulo 26 at each step to prevent integer overflow with large shift values.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n^2) | O(1) | Apply each shift to all affected characters |
| Suffix Sum | O(n) | O(n) | Precompute suffix sums, then apply shifts |
| Optimal (Running Total) | O(n) | O(1) | Single pass with running total from right |

## Common Mistakes

1. **Forgetting modulo 26 for large numbers**
   ```python
   # Wrong: Can cause integer overflow or incorrect results
   total_shift = sum(shifts[i:])
   new_char = chr((ord(s[i]) - ord('a') + total_shift) % 26 + ord('a'))

   # Correct: Apply modulo to running total
   total_shift = 0
   for i in range(len(s) - 1, -1, -1):
       total_shift = (total_shift + shifts[i]) % 26
       new_char = chr((ord(s[i]) - ord('a') + total_shift) % 26 + ord('a'))
   ```

2. **Inefficient left-to-right iteration**
   ```python
   # Wrong: O(n^2) - recalculating sum for each position
   result = []
   for i in range(len(s)):
       shift = sum(shifts[i:])  # This is O(n) for each i
       result.append(shift_char(s[i], shift))

   # Correct: O(n) - single right-to-left pass
   total = 0
   result = [''] * len(s)
   for i in range(len(s) - 1, -1, -1):
       total += shifts[i]
       result[i] = shift_char(s[i], total)
   ```

3. **Incorrect character wraparound**
   ```python
   # Wrong: Doesn't handle wraparound correctly
   new_char = chr(ord(s[i]) + shift)

   # Correct: Convert to 0-25 range, add shift, modulo, convert back
   offset = (ord(s[i]) - ord('a') + shift) % 26
   new_char = chr(offset + ord('a'))
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Range Addition | Medium | Similar suffix sum concept with intervals |
| Corporate Flight Bookings | Medium | Apply operations to ranges, use difference array |
| Prefix/Suffix Sum Problems | Easy | General array manipulation with cumulative operations |
| String Shifting with Queries | Medium | Multiple query types on string transformations |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Prefix Sum Pattern](../../strategies/patterns/prefix-sum.md)
