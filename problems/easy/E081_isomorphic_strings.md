---
id: E081
old_id: I005
slug: isomorphic-strings
title: Isomorphic Strings
difficulty: easy
category: easy
topics: ["string", "hash-table"]
patterns: ["mapping"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E290", "E242", "E205"]
prerequisites: ["hash-map", "string-traversal"]
strategy_ref: ../strategies/data-structures/hash-tables.md
---
# Isomorphic Strings

## Problem

Two strings `s` and `t` are **isomorphic** if there exists a one-to-one character mapping that transforms `s` into `t`. Think of it as a substitution cipher where each character in `s` consistently maps to exactly one character in `t`, and no two different characters in `s` map to the same character in `t`.

**Key requirements for isomorphism:**
1. **Consistency**: Each character in `s` must always map to the same character in `t`
2. **Uniqueness (bijection)**: No two different characters in `s` can map to the same character in `t`
3. **Order preservation**: The mapping maintains positional relationships

**Examples:**
- `"egg"` and `"add"` are isomorphic:
  - e → a (appears at positions 0)
  - g → d (appears at positions 1, 2)

- `"foo"` and `"bar"` are NOT isomorphic:
  - f → b, o → a, but then o → r (inconsistent!)

- `"paper"` and `"title"` are isomorphic:
  - p → t (positions 0, 2)
  - a → i (position 1)
  - e → l (position 3)
  - r → e (position 4)

**Watch out for:**
- Characters can map to themselves (e.g., "abc" and "abc")
- You need to verify the mapping works in BOTH directions (s→t and t→s)
- Example showing why bidirectional check matters: `"ab"` and `"aa"` would seem valid with only s→t mapping (a→a, b→a), but it fails the uniqueness requirement

## Why This Matters

Isomorphic string matching teaches **bijective mapping**, a fundamental concept across computer science:
- **Pattern recognition**: Detecting structural similarities in code (refactoring tools, plagiarism detection)
- **Data normalization**: Transforming data between different schemas while preserving relationships
- **Graph isomorphism**: Determining if two graphs have the same structure (network analysis, molecular chemistry)
- **Compiler design**: Variable renaming and symbol table management
- **Natural language processing**: Word pattern matching for anagram detection and template filling

The two-hash-map technique you'll learn demonstrates a common pattern: when checking for a reversible relationship, track both forward and backward mappings simultaneously. This pattern appears in database foreign keys, network routing tables, and many other bidirectional associations.

## Examples

**Example 1:**
- Input: `s = "egg", t = "add"`
- Output: `true`

**Example 2:**
- Input: `s = "foo", t = "bar"`
- Output: `false`

**Example 3:**
- Input: `s = "paper", t = "title"`
- Output: `true`

## Constraints

- 1 <= s.length <= 5 * 10⁴
- t.length == s.length
- s and t consist of any valid ascii character.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

Two strings are isomorphic if there's a bijective (one-to-one and onto) mapping between their characters. This means each character in s maps to exactly one character in t, and no two different characters in s can map to the same character in t.

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

Use two hash maps: one to track s -> t mappings and another to track t -> s mappings. As you iterate through both strings simultaneously, check if the current mapping is consistent with previous mappings in both directions. If any inconsistency is found, return false.

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

**Two Hash Maps:**
1. Create map_s_to_t = {}, map_t_to_s = {}
2. For each pair (char_s, char_t) at same position:
   - If char_s in map_s_to_t:
     - Check if map_s_to_t[char_s] == char_t
   - Else:
     - Add mapping char_s -> char_t
   - Similarly check/add for map_t_to_s
3. Return true if all checks pass

Alternative: Use single pass with transformation to canonical form.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| **Two Hash Maps** | **O(n)** | **O(1)** | n = string length; at most 256 ASCII chars |
| Single Hash Map + Set | O(n) | O(1) | Track forward map + used values |
| Transformation | O(n) | O(n) | Convert both to canonical form and compare |

## Common Mistakes

**Mistake 1: Only Checking One Direction**

```python
# Wrong: Missing reverse mapping check
def isIsomorphic(s, t):
    mapping = {}
    for i in range(len(s)):
        if s[i] in mapping:
            if mapping[s[i]] != t[i]:
                return False
        else:
            mapping[s[i]] = t[i]
    return True  # Fails for s="ab", t="aa"
```

```python
# Correct: Check both directions
def isIsomorphic(s, t):
    map_s_to_t = {}
    map_t_to_s = {}
    for char_s, char_t in zip(s, t):
        if char_s in map_s_to_t:
            if map_s_to_t[char_s] != char_t:
                return False
        else:
            map_s_to_t[char_s] = char_t

        if char_t in map_t_to_s:
            if map_t_to_s[char_t] != char_s:
                return False
        else:
            map_t_to_s[char_t] = char_s
    return True
```

**Mistake 2: Not Checking if Target Already Mapped**

```python
# Wrong: Allows multiple chars to map to same target
def isIsomorphic(s, t):
    mapping = {}
    for i in range(len(s)):
        if s[i] not in mapping:
            mapping[s[i]] = t[i]  # Doesn't check if t[i] already used
        elif mapping[s[i]] != t[i]:
            return False
    return True
```

```python
# Correct: Use set or reverse mapping
def isIsomorphic(s, t):
    mapping = {}
    used = set()
    for char_s, char_t in zip(s, t):
        if char_s in mapping:
            if mapping[char_s] != char_t:
                return False
        else:
            if char_t in used:  # Check if already used
                return False
            mapping[char_s] = char_t
            used.add(char_t)
    return True
```

**Mistake 3: Confusing with Anagram**

```python
# Wrong: This checks for anagram, not isomorphism
def isIsomorphic(s, t):
    return sorted(s) == sorted(t)  # Completely wrong approach
```

```python
# Correct: Check character mapping pattern
def isIsomorphic(s, t):
    return len(set(zip(s, t))) == len(set(s)) == len(set(t))
    # Or use explicit mapping approach shown above
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Word Pattern | Map words instead of characters | Easy |
| Group Isomorphic Strings | Group strings by isomorphic pattern | Medium |
| Find and Replace Pattern | Find words matching a pattern | Medium |
| Valid Anagram | Check if two strings are anagrams | Easy |
| Scramble String | Check if string can be scrambled to another | Hard |

## Practice Checklist

- [ ] Day 1: Solve using two hash maps approach
- [ ] Day 2: Optimize using single map with set
- [ ] Day 3: Try transformation to canonical form
- [ ] Week 1: Solve Word Pattern problem using same technique
- [ ] Week 2: Explain bijective mapping concept clearly
- [ ] Month 1: Apply to more complex pattern matching problems

**Strategy**: See [Hash Table Pattern](../strategies/data-structures/hash-tables.md)
