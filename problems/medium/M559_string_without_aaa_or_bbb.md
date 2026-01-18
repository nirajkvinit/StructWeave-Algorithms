---
id: M559
old_id: A451
slug: string-without-aaa-or-bbb
title: String Without AAA or BBB
difficulty: medium
category: medium
topics: ["string"]
patterns: []
estimated_time_minutes: 30
---
# String Without AAA or BBB

## Problem

Imagine you're building a string from two character types - 'a' and 'b' - with a specific constraint: you cannot have three identical characters in a row. Given two counts, `a` (how many 'a's you must use) and `b` (how many 'b's you must use), construct any valid string that uses all characters while respecting this rule.

Your string must satisfy all these requirements:

- **Total length** exactly equals `a + b` characters
- **Contains exactly** `a` occurrences of the character `'a'`
- **Contains exactly** `b` occurrences of the character `'b'`
- **No substring** `"aaa"` appears anywhere (no three consecutive 'a's)
- **No substring** `"bbb"` appears anywhere (no three consecutive 'b's)

Note that two consecutive identical characters (like "aa" or "bb") are perfectly fine - you just can't have three.

Example scenarios:
```
a=1, b=2 → "abb" ✓ (or "bab" or "bba" all work)
a=4, b=1 → "aabaa" ✓ (distributes the b's to prevent "aaa")
a=0, b=3 → "bb" ✓ (can't use all 3 b's without creating "bbb", but problem guarantees solution exists)
```

The problem guarantees that a valid solution always exists for the given inputs.

## Why This Matters

Constraint-based string construction appears throughout text generation, data formatting, and protocol design. Network packet assembly must distribute control characters to avoid reserved bit patterns that could trigger false protocol commands. DNA sequence design in genetics requires avoiding certain consecutive nucleotide patterns that create unwanted gene expressions or instability. Text encoding systems prevent repeated escape sequences that could corrupt data transmission. Password generators create secure strings while avoiding patterns that reduce entropy or create dictionary words. Load balancing algorithms distribute tasks (represented as symbols) to prevent three consecutive assignments to the same server. Speech synthesis avoids consecutive phonemes that create unnatural sounds. Error-correcting codes ensure transmitted bits don't contain forbidden patterns that could mask errors. The greedy balancing strategy learned here applies broadly to fair resource distribution under placement constraints.

## Examples

**Example 1:**
- Input: `a = 1, b = 2`
- Output: `"abb"`
- Explanation: Multiple valid solutions exist including "abb", "bab", and "bba".

**Example 2:**
- Input: `a = 4, b = 1`
- Output: `"aabaa"`

## Constraints

- 0 <= a, b <= 100
- It is guaranteed such an s exists for the given a and b.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
Use a greedy strategy: always write the character that has more remaining count, but never write more than 2 of the same character consecutively. If you've already written 2 of one character, you must write the other character next (even if it has fewer remaining).
</details>

<details>
<summary>Main Approach</summary>
Build the string character by character. At each step, determine which character to append based on: (1) If the last 2 characters are the same, you must write the other character. (2) Otherwise, write the character with higher remaining count. Write 2 of that character if its count is much larger than the other, otherwise write 1.
</details>

<details>
<summary>Optimization Tip</summary>
When one character's count is significantly larger (e.g., ≥2 more), write two of that character at once to balance the counts faster. This prevents getting stuck with many of one character and none of the other at the end. The pattern becomes: write 2 of the majority character, then 1 of the minority character.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Greedy | O(a + b) | O(a + b) | Build result string of length a+b |
| Optimal | O(a + b) | O(a + b) | Same as above, linear time |

## Common Mistakes

1. **Not handling the "write 2 vs write 1" decision**
   ```python
   # Wrong: Always writing one character at a time
   while a > 0 or b > 0:
       if a > b:
           result.append('a')
           a -= 1
       else:
           result.append('b')
           b -= 1

   # Correct: Write 2 when one count is much larger
   while a > 0 or b > 0:
       if a > b:
           use_a = 2 if a >= 2 else 1
           result.append('a' * use_a)
           a -= use_a
       # ... similar for b ...
   ```

2. **Not checking the last 2 characters**
   ```python
   # Wrong: Not preventing "aaa" or "bbb"
   if a > b:
       result.append('a')
       a -= 1

   # Correct: Check if last 2 chars are same before writing
   if len(result) >= 2 and result[-1] == result[-2] == 'a':
       result.append('b')
       b -= 1
   elif a >= b:
       result.append('a')
       a -= 1
   ```

3. **Edge case: one count is zero**
   ```python
   # Wrong: Not handling when b=0 early
   while a > 0:
       result.append('a')  # Could create "aaa"

   # Correct: Handle zero count properly
   if b == 0:
       # Can write at most 2 'a's
       result.append('a' * min(a, 2))
       return result
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Remove Consecutive Characters | Easy | Remove existing triples instead of constructing |
| Reorganize String (no adjacent same) | Medium | No two adjacent characters can be same |
| Rearrange String k Distance Apart | Hard | Characters must be ≥k positions apart |
| Task Scheduler | Medium | Similar greedy with cooldown periods |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Greedy Algorithms](../../strategies/patterns/greedy.md)
