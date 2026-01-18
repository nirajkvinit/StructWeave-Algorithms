---
id: E097
old_id: I049
slug: group-shifted-strings
title: Group Shifted Strings
difficulty: easy
category: easy
topics: ["array", "hash-table", "string"]
patterns: ["hashing"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E001", "E049", "M249"]
prerequisites: ["hash-table", "string-manipulation"]
strategy_ref: ../strategies/patterns/hashing.md
---
# Group Shifted Strings

## Problem

Imagine shifting a string by moving every character forward in the alphabet by the same amount. For example, shifting "abc" by 1 position gives "bcd", shifting by 2 gives "cde", and so on. The alphabet wraps around, so shifting "xyz" by 1 gives "yza". Strings that can be transformed into each other through shifting belong to the same shift sequence.

Given an array of strings, group all strings that belong to the same shift sequence together. Strings "abc", "bcd", and "xyz" all belong to the same sequence because they have the same pattern of differences between consecutive characters: each character is 1 position ahead of the previous one. Similarly, "az" and "ba" belong to the same sequence because in both cases the second character is 1 position ahead of the first (with wraparound).

The key insight is that strings in the same shift sequence share a common pattern: the differences between consecutive characters remain constant. For "abc", the differences are [1, 1] (b-a=1, c-b=1). For "xyz", the differences are also [1, 1] (y-x=1, z-y=1). This difference pattern serves as a unique signature for each shift sequence.

An important edge case to handle is wraparound. When you compute the difference from 'z' to 'a', it's not -25 but +1 (wrapping around the alphabet). You need to normalize these differences using modulo 26 to ensure "za" and "ab" are recognized as the same pattern.

## Why This Matters

This problem teaches a powerful technique: finding invariants that characterize groups. Instead of comparing strings directly, you extract a signature (the difference pattern) that remains constant across transformations. This approach appears throughout computer science in hashing, clustering, and pattern recognition.

The problem demonstrates how to design effective hash keys for complex grouping operations. In databases, similar techniques group records by normalized values. In cryptography, analyzing character shift patterns helps break simple ciphers. In bioinformatics, grouping DNA sequences by patterns is fundamental to sequence alignment.

Understanding this problem builds intuition for the broader category of "group by pattern" problems, which includes grouping anagrams, finding isomorphic strings, and detecting similar documents. The hash map grouping pattern is essential for data aggregation in analytics pipelines and ETL systems.

This is a medium-frequency interview question that tests your ability to identify the right abstraction for grouping. It also assesses your understanding of modular arithmetic and hash map usage. The wraparound handling with modulo is a common source of bugs that interviewers look for.

## Examples

**Example 1:**
- Input: `strings = ["abc","bcd","acef","xyz","az","ba","a","z"]`
- Output: `[["acef"],["a","z"],["abc","bcd","xyz"],["az","ba"]]`

**Example 2:**
- Input: `strings = ["a"]`
- Output: `[["a"]]`

## Constraints

- 1 <= strings.length <= 200
- 1 <= strings[i].length <= 50
- strings[i] consists of lowercase English letters.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Find a Unique Signature</summary>

Strings in the same shift sequence share a common pattern. Think about what remains constant when you shift all characters. For "abc" and "xyz", the differences between consecutive characters are the same: (b-a, c-b) = (1, 1) and (y-x, z-y) = (1, 1). This difference pattern can serve as a unique signature.

</details>

<details>
<summary>🎯 Hint 2: Normalize with Differences</summary>

Calculate the difference between consecutive characters for each string. For "abc": differences are [1, 1]. For "az": difference is [25] (wrapping around from 'z' to 'a'). Handle the wraparound case using modulo 26. Use this difference tuple as a hash key to group strings.

</details>

<details>
<summary>📝 Hint 3: Hash Map Grouping</summary>

Pseudocode approach:
1. Create empty hash map: signature → list of strings
2. For each string:
   - Calculate differences: [(s[i+1] - s[i] + 26) % 26 for each i]
   - Convert differences to tuple (hashable)
   - Add string to hash map[tuple]
3. Return all values from hash map

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Compare All Pairs) | O(n² × m) | O(n × m) | n strings, m average length |
| **Optimal (Hash with Signature)** | **O(n × m)** | **O(n × m)** | Single pass, linear in total characters |

## Common Mistakes

### Mistake 1: Forgetting Wraparound Case

```python
# WRONG: Negative differences break the grouping
def groupStrings(strings):
    groups = {}
    for s in strings:
        key = tuple(ord(s[i+1]) - ord(s[i]) for i in range(len(s) - 1))
        # For "za": ord('a') - ord('z') = -25, should be 1
        groups.setdefault(key, []).append(s)
    return list(groups.values())
```

```python
# CORRECT: Handle wraparound with modulo
def groupStrings(strings):
    groups = {}
    for s in strings:
        key = tuple((ord(s[i+1]) - ord(s[i]) + 26) % 26 for i in range(len(s) - 1))
        # For "za": (ord('a') - ord('z') + 26) % 26 = 1 ✓
        groups.setdefault(key, []).append(s)
    return list(groups.values())
```

### Mistake 2: Using String Instead of Tuple for Key

```python
# WRONG: Lists are unhashable
def groupStrings(strings):
    groups = {}
    for s in strings:
        key = [(ord(s[i+1]) - ord(s[i]) + 26) % 26 for i in range(len(s) - 1)]
        groups.setdefault(key, []).append(s)  # TypeError: unhashable type: 'list'
    return list(groups.values())
```

```python
# CORRECT: Convert to tuple for hashing
def groupStrings(strings):
    groups = {}
    for s in strings:
        key = tuple((ord(s[i+1]) - ord(s[i]) + 26) % 26 for i in range(len(s) - 1))
        groups.setdefault(key, []).append(s)
    return list(groups.values())
```

### Mistake 3: Single-Character Edge Case

```python
# WRONG: Single-char strings have empty difference arrays
def groupStrings(strings):
    groups = {}
    for s in strings:
        if len(s) == 1:
            continue  # Bug: ignoring single characters
        key = tuple((ord(s[i+1]) - ord(s[i]) + 26) % 26 for i in range(len(s) - 1))
        groups.setdefault(key, []).append(s)
    return list(groups.values())  # Missing ["a", "z"]
```

```python
# CORRECT: Single-char strings share empty tuple as key
def groupStrings(strings):
    groups = {}
    for s in strings:
        key = tuple((ord(s[i+1]) - ord(s[i]) + 26) % 26 for i in range(len(s) - 1))
        # Empty tuple () for single characters - all group together
        groups.setdefault(key, []).append(s)
    return list(groups.values())
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Group Anagrams | Medium | Group by sorted character frequency |
| Isomorphic Strings | Easy | Check if two strings have same pattern |
| Word Pattern | Easy | Map pattern to words bijectively |
| Find and Replace Pattern | Medium | Match strings with same character mapping |

## Practice Checklist

- [ ] Day 1: Solve with hash map (20 min)
- [ ] Day 2: Handle wraparound case correctly (15 min)
- [ ] Day 7: Solve again, explain signature concept (15 min)
- [ ] Day 14: Optimize without looking at solution (10 min)
- [ ] Day 30: Code from memory (10 min)

**Strategy**: See [Hashing Pattern](../strategies/patterns/hashing.md)
