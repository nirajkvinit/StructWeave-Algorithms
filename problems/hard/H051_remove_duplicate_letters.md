---
id: H051
old_id: I115
slug: remove-duplicate-letters
title: Remove Duplicate Letters
difficulty: hard
category: hard
topics: ["string"]
patterns: []
estimated_time_minutes: 45
---
# Remove Duplicate Letters

## Problem

Provided with a string `s`, eliminate duplicate characters such that each distinct letter appears exactly once in the output. Your solution must produce **the lexicographically smallest string** possible among all valid outputs.

## Why This Matters

String manipulation is essential for text processing and pattern matching. This problem builds your character-level thinking.

## Examples

**Example 1:**
- Input: `s = "bcabc"`
- Output: `"abc"`

**Example 2:**
- Input: `s = "cbacdcbc"`
- Output: `"acdb"`

## Constraints

- 1 <= s.length <= 10⁴
- s consists of lowercase English letters.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Use a greedy monotonic stack approach. Track the last occurrence of each character to know if you can safely remove a character (because it appears later). The key is maintaining lexicographical order while ensuring each character appears exactly once.
</details>

<details>
<summary>🎯 Main Approach</summary>
Build a result using a stack/string. For each character: (1) skip if already in result, (2) while the last character in result is greater than current character AND appears later in string, pop it from result, (3) add current character to result. Use a frequency map for last occurrence positions and a set to track characters already in result.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Precompute the last index of each character in a single pass. Use a boolean visited array (26 elements for lowercase letters) instead of a set for O(1) lookups. The stack can be implemented as a string/list for simplicity.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n! × n) | O(n) | Generate all permutations, check validity |
| Greedy Stack | O(n) | O(1) | Single pass with constant space (26 letters) |

## Common Mistakes

1. **Forgetting to check if character appears later**
   ```python
   # Wrong: Removing characters without checking if they appear later
   while stack and stack[-1] > char:
       stack.pop()

   # Correct: Only remove if character appears later
   while stack and stack[-1] > char and last_occurrence[stack[-1]] > i:
       visited.remove(stack.pop())
   ```

2. **Not tracking visited characters**
   ```python
   # Wrong: Adding duplicates to result
   if stack and stack[-1] > char:
       stack.pop()
   stack.append(char)

   # Correct: Skip if already included
   if char in visited:
       continue
   # ... process and add to stack
   visited.add(char)
   ```

3. **Building result inefficiently**
   ```python
   # Wrong: Using string concatenation in loop
   result = ""
   for char in s:
       result += char  # O(n) operation

   # Correct: Use list and join
   result = []
   for char in s:
       result.append(char)
   return ''.join(result)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Remove K Digits | Medium | Remove k digits to get smallest number |
| Smallest Subsequence of Distinct Characters | Hard | Same problem, different name |
| Lexicographically Smallest String After Applying Operations | Medium | With rotation/replacement operations |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Monotonic Stack](../../strategies/patterns/monotonic-stack.md)
