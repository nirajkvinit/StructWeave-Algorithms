---
id: E133
old_id: I182
slug: ransom-note
title: Ransom Note
difficulty: easy
category: easy
topics: ["hash-table", "string", "counting"]
patterns: ["frequency-counting"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E242", "E383", "E126"]
prerequisites: ["hash-table", "string-manipulation"]
strategy_ref: ../prerequisites/hash-table.md
---
# Ransom Note

## Problem

Given two strings `ransomNote` and `magazine`, determine whether you can construct the ransom note by cutting out letters from the magazine. Each letter in the magazine can only be used once, so if the ransom note requires two 'a' characters, the magazine must contain at least two 'a' characters.

Return `true` if it's possible to construct the ransom note from the magazine, and `false` otherwise. Both strings consist only of lowercase English letters.

Think of this like physically cutting letters from a magazine to paste into a ransom note. If the magazine contains the letters "aab" and you need to create the note "aa", you have enough material (two 'a' letters are available). But if the magazine only contains "ab" and you need "aa", you're short one 'a' and cannot complete the note.

The straightforward approach of searching the magazine string for each character in the ransom note becomes inefficient when strings are long (up to 100,000 characters). Instead, counting character frequencies in the magazine first, then checking if the ransom note can be "paid for" with those counts, gives you a much faster linear-time solution.

## Why This Matters

Character frequency counting is one of the most versatile patterns in string processing, appearing in anagram detection, text compression, spell checking, DNA sequence analysis, and cryptography. This problem teaches you the hash table pattern at its simplest while introducing the important concept of resource constraint checking (do we have enough of each resource to fulfill a requirement?). This same pattern scales to inventory management systems, rate limiting in APIs (tracking request counts), multiplayer game networking (validating client actions against available resources), and compiler symbol table lookups. The choice between using a hash map versus a fixed-size array for counting is a practical space-time tradeoff you'll encounter repeatedly in production code.

## Examples

**Example 1:**
- Input: `ransomNote = "a", magazine = "b"`
- Output: `false`
- Explanation: The magazine doesn't contain the letter 'a'.

**Example 2:**
- Input: `ransomNote = "aa", magazine = "ab"`
- Output: `false`
- Explanation: We need two 'a' characters, but the magazine only has one.

**Example 3:**
- Input: `ransomNote = "aa", magazine = "aab"`
- Output: `true`
- Explanation: The magazine contains two 'a' characters, enough to construct the ransom note.

## Constraints

- 1 <= ransomNote.length, magazine.length <= 10⁵
- ransomNote and magazine consist of lowercase English letters.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Nested Loop Character Matching
For each character in ransomNote, search through magazine to find and mark it as used.

**Key Steps:**
1. Convert magazine to a list (for mutability)
2. For each char in ransomNote, search magazine
3. If found, mark as used (or remove)
4. If not found, return False

**When to use:** Only for initial understanding. Very inefficient - O(n × m) time.

### Intermediate Approach - Hash Table Frequency Count
Count character frequencies in magazine, then verify ransomNote can be constructed.

**Key Steps:**
1. Build frequency map of magazine characters
2. Iterate through ransomNote
3. For each character, decrement count in map
4. If count goes negative or character missing, return False

**When to use:** This is the standard optimal solution - O(n + m) time.

### Advanced Approach - Array as Hash Table
Since only lowercase English letters, can you use a fixed-size array instead of hash table?

**Key Steps:**
1. Use array of size 26 for character counts
2. Map 'a' to index 0, 'b' to index 1, etc.
3. Count characters in magazine
4. Decrement for ransomNote characters
5. Check for negative counts

**When to use:** When you want constant space (26 slots) instead of hash table overhead.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Nested Loops | O(n × m) | O(m) | n = ransomNote length, m = magazine length |
| Hash Table | O(n + m) | O(1) or O(m) | O(1) since at most 26 characters |
| Array Counter | O(n + m) | O(1) | Fixed 26-element array |
| Sorting | O(m log m + n log n) | O(1) or O(m+n) | Not better than hash table |

## Common Mistakes

### Mistake 1: Not checking character availability
```python
# Wrong - only checking presence, not frequency
def canConstruct(ransomNote, magazine):
    mag_set = set(magazine)
    for char in ransomNote:
        if char not in mag_set:
            return False
    return True  # Wrong: doesn't check if enough chars available
```

**Why it's wrong:** Sets only track presence, not frequency. For ransomNote="aa", magazine="ab", this returns True incorrectly because 'a' exists, but there's only one 'a' available.

**Fix:** Use a dictionary/hash table to count frequencies, not just track presence.

### Mistake 2: Modifying magazine string incorrectly
```python
# Wrong - strings are immutable in many languages
def canConstruct(ransomNote, magazine):
    for char in ransomNote:
        if char in magazine:
            magazine.remove(char)  # Error: strings don't have remove()
        else:
            return False
    return True
```

**Why it's wrong:** Strings are immutable in most languages. You can't remove characters directly.

**Fix:** Use a frequency counter (dictionary or array) instead of trying to modify the string.

### Mistake 3: Not decrementing the count
```python
# Wrong - checking but not consuming characters
def canConstruct(ransomNote, magazine):
    count = {}
    for char in magazine:
        count[char] = count.get(char, 0) + 1

    for char in ransomNote:
        if char not in count or count[char] == 0:
            return False
        # Missing: count[char] -= 1
    return True
```

**Why it's wrong:** Without decrementing, you can reuse the same character multiple times. For ransomNote="aa", magazine="a", this incorrectly returns True.

**Fix:** Decrement count[char] after each successful check.

## Variations

| Variation | Difficulty | Description | Key Difference |
|-----------|-----------|-------------|----------------|
| Valid Anagram | Easy | Check if two strings are anagrams | Both must use all characters |
| Find All Anagrams | Medium | Find all anagram substrings | Sliding window + frequency |
| Group Anagrams | Medium | Group strings that are anagrams | Clustering problem |
| Minimum Window Substring | Hard | Find smallest substring with all chars | Sliding window optimization |

## Practice Checklist

Track your progress and spaced repetition:

- [ ] Initial attempt (after reading problem)
- [ ] Reviewed approach hints
- [ ] Implemented hash table solution
- [ ] Implemented array counter solution
- [ ] Handled edge cases (empty strings)
- [ ] All test cases passing
- [ ] Reviewed common mistakes
- [ ] Revisit after 1 day
- [ ] Revisit after 3 days
- [ ] Revisit after 1 week
- [ ] Can explain frequency counting clearly

**Strategy Guide:** For pattern recognition and detailed techniques, see [Hash Table Pattern](../prerequisites/hash-table.md)
