---
id: M412
old_id: A258
slug: custom-sort-string
title: Custom Sort String
difficulty: medium
category: medium
topics: ["string"]
patterns: ["backtrack-permutation"]
estimated_time_minutes: 30
---
# Custom Sort String

## Problem

You are given two strings: `order` and `s`. The `order` string defines a custom sorting rule where each character appears exactly once, establishing the relative ordering you must follow. Your task is to rearrange the characters in string `s` to respect this custom ordering.

The ordering rule works like this: if character 'x' appears before character 'y' in `order`, then all occurrences of 'x' in your result must appear before all occurrences of 'y'. Characters in `s` that don't appear in `order` can be placed anywhere in the result since they have no ordering constraint.

For example, if `order = "cba"` and `s = "abcd"`, you must ensure all 'c's come before all 'b's, and all 'b's come before all 'a's. The character 'd' doesn't appear in `order`, so it can go anywhere. Valid results include "cbad", "dcba", "cdba", or "cbda".

Return any valid rearrangement of `s` that satisfies these constraints. Note that there may be multiple correct answers.

## Why This Matters

Custom sorting by arbitrary rules is a common requirement in data processing systems. You might need to sort products by a brand-specific priority list, arrange tasks by custom priority rules, or organize data according to user-defined preferences. This problem teaches you to separate the counting phase (understanding what you have) from the reconstruction phase (building the result according to rules). The hash map approach here is fundamental to many string manipulation tasks, and understanding when to use O(n) counting versus O(n log n) sorting is a valuable optimization skill.

## Examples

**Example 1:**
- Input: `order = "cba", s = "abcd"`
- Output: `"cbad"`
- Explanation: "a", "b", "c" appear in order, so the order of "a", "b", "c" should be "c", "b", and "a".
Since "d" does not appear in order, it can be at any position in the returned string. "dcba", "cdba", "cbda" are also valid outputs.

**Example 2:**
- Input: `order = "cbafg", s = "abcd"`
- Output: `"cbad"`

## Constraints

- 1 <= order.length <= 26
- 1 <= s.length <= 200
- order and s consist of lowercase English letters.
- All the characters of order are **unique**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Count the frequency of each character in string s, then rebuild the result by iterating through the order string. For each character in order, append all its occurrences from s. Finally, append any characters from s that don't appear in order (they can go anywhere).
</details>

<details>
<summary>🎯 Main Approach</summary>
Use a hash map (Counter) to count character frequencies in s. Iterate through order: for each character, append it to the result as many times as it appears in s, then mark it as used. After processing all characters in order, append any remaining characters from s that weren't in order. This ensures the custom ordering is respected.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
You can use Python's built-in sorted() with a custom key function. Create a mapping from characters in order to their indices, and use this for sorting. Characters not in order can be assigned a default high value. This is more concise but essentially does the same work: O(n log n) vs O(n) for the counting approach.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Counting + Reconstruction | O(n + m) | O(1) | n = len(s), m = len(order); space is O(26) = O(1) |
| Custom Sort | O(n log n) | O(n) | Standard sorting with custom comparator |
| Optimal | O(n + m) | O(1) | Hash map with at most 26 characters |

## Common Mistakes

1. **Using inefficient sorting without counting**
   ```python
   # Wrong: Sorting entire string with custom comparator (slower)
   order_map = {ch: i for i, ch in enumerate(order)}
   return ''.join(sorted(s, key=lambda x: order_map.get(x, 26)))

   # Correct: Count frequencies and build result directly
   from collections import Counter
   count = Counter(s)
   result = []
   for ch in order:
       result.append(ch * count[ch])
       count[ch] = 0
   for ch in count:
       result.append(ch * count[ch])
   return ''.join(result)
   ```

2. **Forgetting to handle characters not in order**
   ```python
   # Wrong: Only processing characters in order
   for ch in order:
       result += ch * count[ch]
   return result  # Missing characters from s not in order

   # Correct: Add remaining characters
   for ch in order:
       result += ch * count[ch]
   for ch in s:
       if ch not in order:
           result += ch
   ```

3. **Building result inefficiently with string concatenation**
   ```python
   # Wrong: String concatenation in loop (O(n²) in some languages)
   result = ""
   for ch in order:
       result += ch * count[ch]

   # Correct: Use list and join
   result = []
   for ch in order:
       result.append(ch * count[ch])
   return ''.join(result)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Sort Characters By Frequency | Medium | Sort by frequency (descending), not custom order |
| Relative Sort Array | Easy | Same concept but with integer arrays |
| Sort Array by Increasing Frequency | Easy | Sort by frequency ascending, then value descending |
| Custom Sort String II | Medium | Multiple ordering constraints simultaneously |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Hash Table Patterns](../../strategies/data-structures/hash-tables.md)
