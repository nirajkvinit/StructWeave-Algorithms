---
id: E149
old_id: I208
slug: longest-palindrome
title: Longest Palindrome
difficulty: easy
category: easy
topics: ["string", "hash-table", "greedy"]
patterns: ["hash-counting", "greedy"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E125", "M005", "E020"]
prerequisites: ["hash-table", "character-counting", "palindrome-properties"]
strategy_ref: ../strategies/patterns/hash-table.md
---
# Longest Palindrome

## Problem

You are given a string containing both uppercase and lowercase English letters. Your goal is to determine the length of the longest palindrome that can be constructed by rearranging these characters. Note that you're not finding an existing palindrome within the string, you're building a new one using the available characters in any order you choose.

A palindrome reads the same forwards and backwards, like "racecar" or "noon". The key structural insight is that palindromes are symmetric around their center. For characters to form a palindrome, they must appear in pairs that can be mirrored on both sides of the center. For example, if you have two 'a's, one can go on the left and one on the right. If you have four 'c's, two go on each side.

However, there's one special case: you can place at most one character with an odd count in the center position. So if you have three 'd's, you can use two on the sides (one left, one right) and put the third in the middle. Critical detail: uppercase and lowercase are distinct characters. The string "Aa" contains two different characters that cannot pair with each other, so the longest palindrome from "Aa" has length 1 (just one character).

Your task is to count character frequencies, determine how many can be used in pairs, and check if any odd-count character exists to potentially occupy the center position. You don't need to construct the actual palindrome string, only return the maximum possible length.

## Why This Matters

Character frequency analysis and palindrome properties appear frequently in text processing, bioinformatics (DNA sequence analysis where palindromic sequences have special significance), cryptography, and data compression. This problem introduces greedy algorithm thinking: locally optimal choices (using all pairs, plus one center character if available) lead to the globally optimal solution. The hash table pattern for counting character frequencies is fundamental to many algorithms including anagram detection, substring problems, finding duplicates, and statistical text analysis. Understanding palindrome structure helps with problems involving symmetry detection, pattern matching in strings, and sequence alignment. This specific pattern of "counting pairs with at most one odd element" appears in problems about balanced strings, valid parentheses pairing, and resource allocation where items must be matched. Interview questions favor this problem because it tests multiple concepts: hash tables, greedy thinking, mathematical reasoning about even/odd counts, and attention to case sensitivity as an edge case.

## Examples

**Example 1:**
- Input: `s = "abccccdd"`
- Output: `7`
- Explanation: Using these letters, we can construct "dccaccd" (or similar), which has 7 characters.

**Example 2:**
- Input: `s = "a"`
- Output: `1`
- Explanation: With only one character available, the maximum palindrome length is 1.

## Constraints

- 1 <= s.length <= 2000
- s consists of lowercase **and/or** uppercase English letters only.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Character Frequency Counting
Count the frequency of each character using a hash table or array. For a palindrome, most characters need even counts (they go on both sides), but you can have at most one character with an odd count (it goes in the center). Calculate: sum of all even counts + largest odd count.

**Key insight**: Palindromes are symmetric, so pairs of characters go on both sides, and at most one unpaired character can be in the middle.

### Intermediate Approach - Pair Counting with Odd Flag
Count character frequencies. For each character, add `(count // 2) * 2` to the result (this gives you the largest even number ≤ count). If any character has an odd count, you can place one extra character in the center, so track if you've seen any odd count.

**Key insight**: Use integer division to get pairs, and remember that one odd character can be centered.

### Advanced Approach - Single Pass Optimization
Use a set or hash table to track unpaired characters. As you iterate through the string, if a character is already in the set, remove it and add 2 to the length (you found a pair). If not in set, add it (it's unpaired for now). At the end, if the set is non-empty, add 1 for the center character.

**Key insight**: Track unpaired characters on-the-fly to avoid a separate counting phase.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Frequency Count | O(n) | O(1) | O(52) space for upper + lowercase letters |
| Set-based Pairing | O(n) | O(1) | At most 52 unique characters in set |
| Array Counting | O(n) | O(1) | Fixed 128 size for ASCII |

All approaches are linear time with constant space (bounded by character set size).

## Common Mistakes

### Mistake 1: Forgetting the Center Character
```python
# Wrong: Not accounting for odd count center
def longestPalindrome(s):
    count = {}
    for c in s:
        count[c] = count.get(c, 0) + 1

    length = 0
    for freq in count.values():
        length += (freq // 2) * 2

    return length  # Missing center character
```

**Why it fails**: For `"abccccdd"`, this returns 6 instead of 7. You can place one odd character in the center.

**Fix**: Add `if length < len(s): length += 1` to account for center character when odd counts exist.

### Mistake 2: Counting All Odd Characters
```python
# Wrong: Adding all odd frequencies
def longestPalindrome(s):
    count = {}
    for c in s:
        count[c] = count.get(c, 0) + 1

    length = 0
    for freq in count.values():
        if freq % 2 == 0:
            length += freq
        else:
            length += freq  # Adding entire odd frequency

    return length
```

**Why it fails**: You can't use all characters with odd counts symmetrically. Only pairs work on both sides.

**Fix**: Use `(freq // 2) * 2` to get only the paired portion, then add at most 1 for center.

### Mistake 3: Case Sensitivity Error
```python
# Wrong: Treating 'A' and 'a' as same
def longestPalindrome(s):
    s = s.lower()  # Converting to lowercase
    # ... rest of logic
```

**Why it fails**: Problem states "uppercase and lowercase letters are treated as distinct". `"Aa"` cannot form a palindrome.

**Fix**: Don't normalize case; treat 'A' and 'a' as different characters.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Palindrome Permutation | Easy | Check if any permutation of string is a palindrome |
| Longest Palindromic Substring | Medium | Find actual longest palindrome substring (not constructible) |
| Palindrome Pairs | Hard | Find pairs of words that concatenate to palindrome |
| Minimum Deletions for Palindrome | Medium | Minimum characters to delete to make palindrome |
| Break Palindrome | Medium | Change one character to get lexicographically smallest non-palindrome |

## Practice Checklist

Track your progress on this problem:

- [ ] **Day 0**: Solve using character frequency approach (20 min)
- [ ] **Day 1**: Review edge cases (all same char, single char, no pairs possible)
- [ ] **Day 3**: Implement with set-based pairing method (15 min)
- [ ] **Day 7**: Solve without looking at previous solution (10 min)
- [ ] **Day 14**: Explain why at most one odd character can be centered (10 min)
- [ ] **Day 30**: Speed solve in under 8 minutes

**Strategy**: See [Hash Table Patterns](../strategies/patterns/hash-table.md)
