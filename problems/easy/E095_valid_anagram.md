---
id: E095
old_id: I042
slug: valid-anagram
title: Valid Anagram
difficulty: easy
category: easy
topics: ["string", "hash-table", "sorting"]
patterns: ["frequency-count", "character-mapping"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E088", "E093", "E094"]
prerequisites: ["hash-tables", "string-manipulation", "sorting"]
strategy_ref: ../strategies/patterns/frequency-count.md
---
# Valid Anagram

## Problem

Given two strings `s` and `t`, determine whether `t` is an anagram of `s`. An anagram is a word or phrase formed by rearranging the letters of another word or phrase, using each letter exactly once. For example, "listen" and "silent" are anagrams, as are "anagram" and "nagaram".

The key requirement is that both strings must contain exactly the same characters with exactly the same frequencies. If `s` has three 'a's, then `t` must also have three 'a's. If `s` has a letter that `t` doesn't have, or if the counts don't match, they're not anagrams.

This problem has an important early check you can make: if the strings have different lengths, they can't possibly be anagrams. There's no point counting characters if one string is longer than the other. Beyond that, you need to verify that every character appears the same number of times in both strings.

While the constraint specifies lowercase English letters, understanding how to solve this for any character set is valuable. The approach you choose may depend on the size of the character set: a fixed-size array works great for just lowercase letters, while a hash table is more flexible for unicode or mixed-case input.

## Why This Matters

Character frequency counting is one of the most fundamental string processing techniques. This pattern appears in countless applications: spell checkers detect anagrams to suggest corrections, game applications like Scrabble need to verify word validity, and text analysis tools use frequency counting to detect patterns or plagiarism.

The problem elegantly demonstrates the trade-off between different algorithmic approaches. Sorting is simple and intuitive with O(n log n) time. Hash maps offer O(n) time but require understanding how to count frequencies properly. Fixed-size arrays provide O(n) time with O(1) space when the character set is bounded. Each approach has its place depending on your constraints.

This is an extremely common interview question used to assess your understanding of hash tables and your ability to recognize when sorting is appropriate. It's often the warm-up problem before harder variations like finding all anagrams in a string or grouping anagrams together. Mastering this builds the foundation for those more complex problems.

In practical systems, anagram detection appears in search engines (finding related queries), bioinformatics (matching DNA sequences), and cryptography (analyzing character patterns). The frequency counting technique extends beyond anagrams to many text analysis tasks.

## Examples

**Example 1:**
- Input: `s = "anagram", t = "nagaram"`
- Output: `true`

**Example 2:**
- Input: `s = "rat", t = "car"`
- Output: `false`

## Constraints

- 1 <= s.length, t.length <= 5 * 10⁴
- s and t consist of lowercase English letters.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Character Frequency</summary>

Two strings are anagrams if and only if they contain the exact same characters with the exact same frequencies. How can you efficiently count character frequencies? Think about data structures that excel at counting occurrences.

</details>

<details>
<summary>🎯 Hint 2: Multiple Valid Approaches</summary>

There are several ways to solve this:
1. Sort both strings and compare - simple but O(n log n)
2. Count character frequencies with a hash map - O(n) time and space
3. Use an array of size 26 for lowercase letters - O(n) time, O(1) space

Which approach best balances simplicity and efficiency for this problem?

</details>

<details>
<summary>📝 Hint 3: Implementation Strategies</summary>

**Approach 1 - Sorting (Simple):**
```
if len(s) != len(t):
    return false
return sorted(s) == sorted(t)
```
Time: O(n log n), Space: O(n)

**Approach 2 - Hash Map (Optimal for general case):**
```
if len(s) != len(t):
    return false
count = {}
for char in s:
    count[char] = count.get(char, 0) + 1
for char in t:
    if char not in count:
        return false
    count[char] -= 1
    if count[char] < 0:
        return false
return all(v == 0 for v in count.values())
```
Time: O(n), Space: O(1) for lowercase letters

**Approach 3 - Fixed Array (Optimal for lowercase letters):**
```
if len(s) != len(t):
    return false
counts = [0] * 26
for char in s:
    counts[ord(char) - ord('a')] += 1
for char in t:
    counts[ord(char) - ord('a')] -= 1
return all(c == 0 for c in counts)
```
Time: O(n), Space: O(1)

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force Permutations | O(n! * n) | O(n) | Generate all permutations - extremely slow |
| Sorting | O(n log n) | O(n) | Simple and clean, good for interviews |
| **Hash Map** | **O(n)** | **O(k)** | k is charset size, O(1) for fixed charset |
| Fixed Array (26 letters) | O(n) | O(1) | Best for lowercase English letters |

**Optimal approach:** Hash map or fixed array depending on character set constraints.

## Common Mistakes

**Mistake 1: Not checking lengths first**

```python
# Wrong - wastes time if lengths differ
def isAnagram(s, t):
    count = {}
    for char in s:
        count[char] = count.get(char, 0) + 1
    for char in t:
        # ... (lots of work for nothing if len(s) != len(t))
```

```python
# Correct - early return on length mismatch
def isAnagram(s, t):
    if len(s) != len(t):
        return False
    # Now proceed with counting
```

**Mistake 2: Not decrementing counts properly**

```python
# Wrong - only counts characters, doesn't compare
def isAnagram(s, t):
    count_s = {}
    count_t = {}
    for char in s:
        count_s[char] = count_s.get(char, 0) + 1
    for char in t:
        count_t[char] = count_t.get(char, 0) + 1
    # Forgot to compare the dictionaries!
```

```python
# Correct - single counter, increment and decrement
def isAnagram(s, t):
    if len(s) != len(t):
        return False
    count = {}
    for char in s:
        count[char] = count.get(char, 0) + 1
    for char in t:
        count[char] = count.get(char, 0) - 1
    return all(v == 0 for v in count.values())
```

**Mistake 3: Using inefficient comparison**

```python
# Wrong - creates unnecessary sorted strings
def isAnagram(s, t):
    return sorted(list(s)) == sorted(list(t))  # list() is redundant
```

```python
# Correct - sorted() works directly on strings
def isAnagram(s, t):
    return sorted(s) == sorted(t)
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Group Anagrams | Medium | Group multiple strings by anagram equivalence |
| Find All Anagrams in String | Medium | Sliding window to find anagram substrings |
| Permutation in String | Medium | Check if one string is permutation of another's substring |
| Valid Anagram (Unicode) | Medium | Handle full Unicode character set |

## Practice Checklist

- [ ] **Day 1:** Solve using sorting approach
- [ ] **Day 3:** Implement hash map frequency counting
- [ ] **Day 7:** Optimize to fixed array for O(1) space
- [ ] **Day 14:** Solve in under 10 minutes
- [ ] **Day 30:** Solve "Group Anagrams" variation

**Strategy**: See [Frequency Count Pattern](../strategies/patterns/frequency-count.md)
