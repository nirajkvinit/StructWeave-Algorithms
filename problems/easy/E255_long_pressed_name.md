---
id: E255
old_id: A392
slug: long-pressed-name
title: Long Pressed Name
difficulty: easy
category: easy
topics: ["string", "two-pointers"]
patterns: ["two-pointers"]
estimated_time_minutes: 15
frequency: low
related_problems:
  - E028_find_the_index_of_the_first_occurrence_in_a_string.md
  - E125_valid_palindrome.md
prerequisites:
  - "Two pointer technique"
  - "String traversal"
  - "Character comparison"
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Long Pressed Name

## Problem

Imagine someone is typing their name on a keyboard, but occasionally a key gets held down too long, causing that character to appear multiple times consecutively. You're given two strings: `name` (the intended name) and `typed` (what was actually typed). Your task is to determine whether `typed` could have resulted from typing `name` with zero or more characters being accidentally long-pressed. For example, if the name is "alex" and someone typed "aaleex", this is valid because 'a' was held once (producing "aa" instead of "a") and 'e' was held once (producing "ee" instead of "e"). However, if the name is "saeed" and they typed "ssaaedd", this is invalid because the name requires two consecutive 'e' characters, but the typed version only has one 'e' before the 'd'. The key rule is that `typed` must contain all characters from `name` in the exact same order and with at least the same consecutive count for each character, but may have additional repetitions. Return `true` if `typed` is a valid long-pressed version of `name`, `false` otherwise.

## Why This Matters

This problem models error detection in user input systems, where you need to determine if observed data could be explained by a specific type of systematic error. The pattern appears in keyboard input validation, autocorrect systems, signal processing (where sensors might duplicate readings), and DNA sequence analysis (where replication errors cause nucleotide repetitions). The two-pointer technique with group counting is essential here - you're not just matching characters one-by-one, but comparing consecutive runs of the same character. This pattern extends to problems involving string compression validation, run-length encoding verification, and any scenario where you need to match sequences while allowing certain controlled variations. In interviews, this problem tests your ability to handle multiple edge cases: ensuring you consume the entire typed string, verifying character counts match or exceed requirements, and correctly handling consecutive duplicates in the original name. The problem also teaches defensive validation - checking that extra characters in typed are legitimate extensions rather than extraneous additions.

## Examples

**Example 1:**
- Input: `name = "alex", typed = "aaleex"`
- Output: `true`
- Explanation: The characters 'a' and 'e' were held down, producing extra occurrences.

**Example 2:**
- Input: `name = "saeed", typed = "ssaaedd"`
- Output: `false`
- Explanation: The name requires two consecutive 'e' characters, but only one appears in the typed string.

## Constraints

- 1 <= name.length, typed.length <= 1000
- name and typed consist of only lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1 Hint - Problem Understanding
The typed string can have extra occurrences of characters from name, but cannot have fewer occurrences or different characters. Think of it as matching name with a more "stretched" version in typed.

What conditions must be true for each character in name to have a valid match in typed?

### Tier 2 Hint - Solution Strategy
Use two pointers - one for name (`i`) and one for typed (`j`):
1. For each character in name, it must appear in typed at the current position
2. Count how many times this character repeats in name
3. Count how many times it repeats in typed at the same position
4. Typed must have at least as many consecutive occurrences as name

The count in typed can be greater (long press) but not less.

### Tier 3 Hint - Implementation Details
```
i, j = 0, 0
while i < len(name):
    if j >= len(typed) or name[i] != typed[j]:
        return False

    char = name[i]
    name_count = 0
    while i < len(name) and name[i] == char:
        name_count += 1
        i += 1

    typed_count = 0
    while j < len(typed) and typed[j] == char:
        typed_count += 1
        j += 1

    if typed_count < name_count:
        return False

return j == len(typed)  # All of typed must be consumed
```

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Two pointers with counting | O(n + m) | O(1) | n = len(name), m = len(typed) |
| Character-by-character | O(n + m) | O(1) | Simpler logic, same complexity |
| Regular expression | O(n + m) | O(n) | Build regex from name, match typed |

## Common Mistakes

### Mistake 1: Not checking character counts
```python
# Wrong: Only checks if characters match
i, j = 0, 0
for c in typed:
    if i < len(name) and c == name[i]:
        i += 1
return i == len(name)
```
**Why it's wrong**: "alex" and "aaleex" would pass, but "alex" and "aalex" would also pass incorrectly (missing one 'e').

### Mistake 2: Forgetting to consume all of typed
```python
# Wrong: Not checking if typed has extra characters at end
# ... matching logic
return i == len(name)  # Should also check j == len(typed)
```
**Why it's wrong**: "alex" and "aaleexz" would return true, but 'z' at the end is invalid.

### Mistake 3: Not handling the case where name has consecutive duplicates
```python
# Wrong: Assumes each character in name appears once
for i in range(len(name)):
    if typed[j] == name[i]:
        j += 1
    # Doesn't handle name[i] == name[i+1]
```
**Why it's wrong**: For "saeed" vs "ssaaedd", you need to track that name needs 2 'e's consecutively, and typed must have at least 2 consecutive 'e's.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Minimum edits to match | Medium | Find minimum insertions to make typed match name |
| Multiple possible names | Medium | Given typed, find all possible original names |
| Short pressed keys | Medium | Keys can also be released early (fewer occurrences) |
| Weighted long press | Medium | Different keys have different probabilities of being long-pressed |
| Optimize typing | Medium | Find minimum keypresses to generate target allowing long press |

## Practice Checklist

- [ ] First attempt (solve independently)
- [ ] Reviewed solution and understood all approaches
- [ ] Practiced again after 1 day
- [ ] Practiced again after 3 days
- [ ] Practiced again after 1 week
- [ ] Can explain the solution clearly to others
- [ ] Solved all variations above

**Strategy**: See [Two Pointers Pattern](../strategies/patterns/two-pointers.md)
