---
id: M266
old_id: A063
slug: permutation-in-string
title: Permutation in String
difficulty: medium
category: medium
topics: ["string", "sliding-window", "hash-table"]
patterns: ["backtrack-permutation", "sliding-window"]
estimated_time_minutes: 30
frequency: high
related_problems: ["E242_valid_anagram", "M438_find_all_anagrams_in_a_string", "M567_permutation_in_string", "M076_minimum_window_substring"]
prerequisites: ["sliding-window", "hash-table", "string-manipulation"]
---
# Permutation in String

## Problem

Given two strings `s1` and `s2`, determine whether any permutation (rearrangement) of `s1` exists as a contiguous substring within `s2`. In other words, check if you can find a window in `s2` that contains exactly the same characters with the same frequencies as `s1`, though possibly in a different order.

A permutation means any rearrangement of the characters. For example, "ab", "ba" are both permutations of each other. If `s1 = "ab"`, you're looking for any substring in `s2` that contains exactly one 'a' and one 'b' (like "ab" or "ba"). The substring must be consecutive characters in `s2` and have exactly the same length as `s1`.

The challenge is doing this efficiently without generating all permutations of `s1` (which would be factorial time complexity and impossible for long strings). The key insight is that you only need to compare character frequencies using a sliding window technique, checking each window of length `len(s1)` in `s2`.

Important considerations: both strings contain only lowercase English letters, and you need exact character count matches (not just "contains the characters"). If `s1` is longer than `s2`, it's impossible for `s2` to contain a permutation of `s1`.

## Why This Matters

The sliding window pattern combined with character frequency matching is one of the most common techniques in string algorithm interviews at companies like Google, Amazon, and Microsoft. This problem appears in various forms: finding anagrams, pattern matching with wildcards, and substring search with constraints. Beyond interviews, similar techniques power DNA sequence analysis (finding genetic patterns), plagiarism detection (finding text reuse), and text editors (find-and-replace with flexible matching). Mastering this pattern gives you a foundation for solving the harder "Minimum Window Substring" problem and various substring optimization challenges.

## Examples

**Example 1:**
- Input: `s1 = "ab", s2 = "eidbaooo"`
- Output: `true`
- Explanation: The substring "ba" is an anagram of "ab" and appears in s2.

**Example 2:**
- Input: `s1 = "ab", s2 = "eidboaoo"`
- Output: `false`

## Constraints

- 1 <= s1.length, s2.length <= 10⁴
- s1 and s2 consist of lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Sliding Window + Character Frequency</summary>

The key insight is that a permutation of s1 will have the same character frequency as s1. We need to check if any window of length len(s1) in s2 has the same character frequency.

Use a sliding window of size len(s1) and maintain character counts. Compare the window's frequency map with s1's frequency map. Slide the window one character at a time, updating counts efficiently.
</details>

<details>
<summary>Hint 2: Optimized Frequency Matching</summary>

Instead of comparing two hash maps at each step, maintain a count of how many characters have matching frequencies.

Algorithm:
1. Create frequency map for s1
2. Create frequency map for first window in s2
3. Count how many characters have matching frequencies
4. Slide window: remove leftmost char, add new rightmost char
5. Update match count based on frequency changes
6. If match count == 26 (or number of unique chars), found permutation

This reduces comparison from O(26) to O(1) per window.
</details>

<details>
<summary>Hint 3: Implementation Pattern</summary>

```python
# Pseudocode:
from collections import Counter

def checkInclusion(s1, s2):
    if len(s1) > len(s2):
        return False

    s1_count = Counter(s1)
    window_count = Counter(s2[:len(s1)])

    if s1_count == window_count:
        return True

    # Slide window
    for i in range(len(s1), len(s2)):
        # Add new character
        window_count[s2[i]] += 1

        # Remove old character
        left_char = s2[i - len(s1)]
        window_count[left_char] -= 1
        if window_count[left_char] == 0:
            del window_count[left_char]

        if s1_count == window_count:
            return True

    return False
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Sliding Window + HashMap | O(n) | O(1) | n = len(s2), constant 26 letters |
| Brute Force | O(n * m * m!) | O(m) | Generate all permutations of s1 |
| Sorting Each Window | O(n * m log m) | O(m) | Sort each window and compare |

## Common Mistakes

1. **Not handling window initialization correctly**
```python
# Wrong: Starting sliding from index 0
for i in range(len(s2)):
    window = s2[i:i+len(s1)]  # Recreating window each time - inefficient

# Correct: Initialize first window, then slide
window_count = Counter(s2[:len(s1)])
for i in range(len(s1), len(s2)):
    # Update window incrementally
```

2. **Forgetting to remove zero-count entries**
```python
# Wrong: Leaving zero counts in hash map
window_count[left_char] -= 1  # May become 0 but still in map

# Correct: Remove zero counts for proper comparison
window_count[left_char] -= 1
if window_count[left_char] == 0:
    del window_count[left_char]
```

3. **Not checking if s1 is longer than s2**
```python
# Wrong: May cause index errors or infinite loops
def checkInclusion(s1, s2):
    # Missing length check
    window = s2[:len(s1)]  # Fails if len(s1) > len(s2)

# Correct: Early return for invalid cases
if len(s1) > len(s2):
    return False
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Find All Anagrams | Medium | Return starting indices of all anagrams in s2 |
| Minimum Window Substring | Hard | Find smallest window containing all chars of s1 |
| Anagram with K Changes | Hard | Allow up to k character changes in s1 |
| Case-Insensitive Permutation | Easy | Ignore case while matching |

## Practice Checklist

- [ ] Solve using sliding window with hash map
- [ ] Optimize to O(1) comparison per window
- [ ] Handle edge case: s1 longer than s2
- [ ] Handle edge case: s1 and s2 are identical
- [ ] **Day 3**: Solve again without hints
- [ ] **Week 1**: Solve "Find All Anagrams in String" variation
- [ ] **Week 2**: Solve from memory in under 20 minutes

**Strategy**: See [Sliding Window Pattern](../strategies/patterns/sliding-window.md)
