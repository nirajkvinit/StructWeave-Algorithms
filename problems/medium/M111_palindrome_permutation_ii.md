---
id: M111
old_id: I066
slug: palindrome-permutation-ii
title: Palindrome Permutation II
difficulty: medium
category: medium
topics: ["string", "backtracking"]
patterns: ["backtrack-permutation", "palindrome-construction"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M110", "M046", "E125"]
prerequisites: ["backtracking", "palindrome-properties", "string-manipulation"]
---
# Palindrome Permutation II

## Problem

Given a string `s`, your task is to generate all unique palindromic permutations of its characters. A palindrome is a sequence that reads the same forwards and backwards, like "racecar" or "abba". For example, if you're given "aabb", the valid palindromic arrangements are "abba" and "baab". Not every string can form a palindrome through rearrangement. The string "abc" cannot form any palindrome because it has three different characters, each appearing once. For a string to form a palindrome, at most one character can appear an odd number of times (which would go in the middle). Return all possible palindromic permutations in any order, or an empty list if none exist. This problem combines character frequency analysis with systematic permutation generation, requiring you to think about both feasibility checking and efficient construction.

The output can be in **any sequence**. When no such arrangements exist for `s`, provide an empty collection.

## Why This Matters

Palindrome generation appears in computational biology when analyzing DNA sequences for palindromic restriction sites that enzymes recognize. Text editors use palindrome detection for implementing "find mirrored patterns" features. In cryptography, palindromic properties help design self-verifying checksums and error-detection codes. This problem teaches you to optimize combinatorial search by pruning impossible cases early (feasibility check) and reducing the search space by generating only half the solution (since palindromes are symmetric). These techniques extend to any problem where you can exploit symmetry or structure to avoid exhaustive enumeration.

## Examples

**Example 1:**
- Input: `s = "aabb"`
- Output: `["abba","baab"]`

**Example 2:**
- Input: `s = "abc"`
- Output: `[]`

## Constraints

- 1 <= s.length <= 16
- s consists of only lowercase English letters.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Check Feasibility First</summary>

Before generating any palindromes, verify that a palindrome permutation is possible. Count character frequencies. A palindrome can be formed only if at most one character has an odd frequency. If impossible, return empty list immediately.

</details>

<details>
<summary>🎯 Hint 2: Half-String Construction</summary>

Instead of generating full permutations, build only the first half of the palindrome. The second half is simply the reverse of the first half. If there's a character with odd frequency, place one instance in the middle. This reduces the search space from n! to (n/2)!.

</details>

<details>
<summary>📝 Hint 3: Backtracking Strategy</summary>

```
1. Count character frequencies
2. Verify at most one odd frequency (else return [])
3. Extract middle character if one has odd frequency
4. Create half_chars list with half of each character's count
5. Backtrack to generate all permutations of half_chars:
   - Build permutation
   - When complete: result = perm + middle + reverse(perm)
   - Use visited array to avoid duplicates
6. Return all generated palindromes
```

**Optimization**: To avoid duplicate permutations, skip consecutive identical characters in backtracking when choosing the next character.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Generate All Permutations | O(n! × n) | O(n!) | Check each permutation if palindrome |
| **Half-String Backtracking** | **O((n/2)! × n)** | **O(n)** | Generate only valid palindromes |
| With Duplicate Skipping | O(n!/k₁!k₂!...kₘ!) | O(n) | k_i = count of character i, much faster |

The actual number of unique palindrome permutations is much smaller than (n/2)! due to duplicate characters.

## Common Mistakes

### Mistake 1: Not checking feasibility first
```python
# Wrong: Waste time backtracking when no palindrome possible
def generatePalindromes(s):
    result = []
    backtrack(s, [], result)
    return result

# Correct: Early exit if impossible
def generatePalindromes(s):
    freq = Counter(s)
    odd_count = sum(1 for count in freq.values() if count % 2)
    if odd_count > 1:
        return []
    # Proceed with backtracking
    # ...
```

### Mistake 2: Generating full permutations instead of half
```python
# Wrong: Generates n! permutations instead of (n/2)!
def generatePalindromes(s):
    # Generate all permutations of s
    # Filter only palindromes
    # Very slow!

# Correct: Generate half, mirror to create full palindrome
def generatePalindromes(s):
    freq = Counter(s)
    # Check feasibility
    odd_chars = [ch for ch, cnt in freq.items() if cnt % 2]
    if len(odd_chars) > 1:
        return []

    middle = odd_chars[0] if odd_chars else ''
    half = []
    for ch, cnt in freq.items():
        half.extend([ch] * (cnt // 2))

    result = []
    def backtrack(path, remaining):
        if not remaining:
            palindrome = ''.join(path) + middle + ''.join(path[::-1])
            result.append(palindrome)
            return
        # Generate permutations of remaining
        # ...
```

### Mistake 3: Not handling duplicate characters in backtracking
```python
# Wrong: Generates duplicate palindromes
def backtrack(path, remaining):
    if not remaining:
        result.append(construct_palindrome(path))
        return
    for i in range(len(remaining)):
        backtrack(path + [remaining[i]], remaining[:i] + remaining[i+1:])

# Correct: Skip duplicates
def backtrack(path, remaining):
    if not remaining:
        result.append(construct_palindrome(path))
        return
    used = set()
    for i in range(len(remaining)):
        if remaining[i] in used:
            continue
        used.add(remaining[i])
        backtrack(path + [remaining[i]], remaining[:i] + remaining[i+1:])
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Palindrome Permutation I (check if possible) | Easy | Just check, don't generate |
| All Permutations (no palindrome requirement) | Medium | Standard backtracking |
| Next Palindrome Permutation | Medium | Generate next lexicographic palindrome |
| Longest Palindromic Permutation | Medium | Find longest subset that forms palindrome |
| Palindrome Partitioning | Medium | Partition string into palindromes |

## Practice Checklist

- [ ] **Day 0**: Solve using full backtracking approach (35 min)
- [ ] **Day 1**: Optimize to half-string generation (30 min)
- [ ] **Day 3**: Implement duplicate skipping optimization (25 min)
- [ ] **Day 7**: Code from memory with all optimizations (20 min)
- [ ] **Day 14**: Handle case-insensitive and special characters (30 min)
- [ ] **Day 30**: Speed run under time pressure (18 min)

**Strategy**: See [Backtracking Patterns](../strategies/patterns/backtracking.md)
