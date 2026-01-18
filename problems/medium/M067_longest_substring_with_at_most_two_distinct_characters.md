---
id: M067
old_id: F159
slug: longest-substring-with-at-most-two-distinct-characters
title: Longest Substring with At Most Two Distinct Characters
difficulty: medium
category: medium
topics: ["string", "sliding-window"]
patterns: ["sliding-window-variable"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E003", "M159", "M340"]
prerequisites: ["sliding-window", "hash-map", "two-pointers"]
strategy_ref: ../strategies/patterns/sliding-window.md
---
# Longest Substring with At Most Two Distinct Characters

## Problem

Given a string, find the length of the longest substring that contains at most two distinct characters. A substring is a contiguous sequence of characters, and "distinct" means different unique characters. For example, in the string "eceba", the longest substring with at most two distinct characters is "ece" with length 3 (containing 'e' and 'c'). In "ccaabbb", it's "aabbb" with length 5 (containing 'a' and 'b'). You need to find the maximum length among all such valid substrings. This is a variable-length sliding window problem where you expand the window by moving the right boundary and add characters until you have more than two distinct characters, then shrink from the left until you're back to two or fewer. The challenge is efficiently tracking which characters are in the current window and their counts, removing characters from the window when their count drops to zero, and updating the maximum length whenever you have a valid window. Consider what happens when you encounter a third distinct character or when characters repeat multiple times within the window.

## Why This Matters

This pattern appears in text analysis tools that identify segments with limited vocabulary, useful for readability scoring or language learning applications that want to find passages using only recently learned words. Log analysis systems use this to find time windows where at most two error types occurred, helping identify correlated failures. DNA sequence analysis looks for genomic regions with limited nucleotide diversity (at most 2 of the 4 bases), indicating evolutionary constraints. Network monitoring finds time intervals where traffic comes from at most two sources, detecting potential DoS patterns. Retail analytics identifies shopping sequences where customers browse at most two product categories, revealing natural browsing patterns. The sliding window with character counting technique generalizes to "at most K distinct elements" problems in streaming data, inventory management (warehouses carrying at most K product types per zone), and resource allocation (systems supporting at most K concurrent user types). Mastering this teaches you the fundamental variable-window pattern that extends to many optimization problems over sequences.

## Examples

**Example 1:**
- Input: `s = "eceba"`
- Output: `3`
- Explanation: The substring is "ece" which its length is 3.

**Example 2:**
- Input: `s = "ccaabbb"`
- Output: `5`
- Explanation: The substring is "aabbb" which its length is 5.

## Constraints

- 1 <= s.length <= 10⁵
- s consists of English letters.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Sliding Window Pattern</summary>

This is a classic variable-size sliding window problem. You expand the window by moving the right pointer and adding characters. When you have more than 2 distinct characters, you shrink from the left until you're back to 2 or fewer distinct characters.

</details>

<details>
<summary>🎯 Hint 2: Tracking Character Counts</summary>

Use a hash map to track the count of each character in the current window. This allows you to:
- Know how many distinct characters you have (map size)
- Efficiently remove characters from the left by decrementing counts
- Remove characters from the map when their count reaches 0

</details>

<details>
<summary>📝 Hint 3: Two-Pointer Algorithm</summary>

**Setup:**
```
left = 0
charCount = HashMap()
maxLen = 0
```

**For each right from 0 to n-1:**
```
1. Add s[right] to charCount
2. While charCount.size() > 2:
     - Decrement charCount[s[left]]
     - If charCount[s[left]] == 0, remove from map
     - Increment left
3. maxLen = max(maxLen, right - left + 1)
```

The window [left, right] always maintains at most 2 distinct characters.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Check all substrings |
| **Sliding Window** | **O(n)** | **O(1)** | At most 26 chars in English alphabet |

## Common Mistakes

### 1. Not Removing Characters From Map
```python
# WRONG: Leaves zero-count characters in map
def lengthOfLongestSubstringTwoDistinct(s):
    charCount = {}
    left = maxLen = 0

    for right in range(len(s)):
        charCount[s[right]] = charCount.get(s[right], 0) + 1

        while len(charCount) > 2:
            charCount[s[left]] -= 1
            # Missing: remove if count is 0!
            left += 1

        maxLen = max(maxLen, right - left + 1)
    return maxLen
# len(charCount) never decreases!
```

```python
# CORRECT: Remove zero-count characters
def lengthOfLongestSubstringTwoDistinct(s):
    charCount = {}
    left = maxLen = 0

    for right in range(len(s)):
        charCount[s[right]] = charCount.get(s[right], 0) + 1

        while len(charCount) > 2:
            charCount[s[left]] -= 1
            if charCount[s[left]] == 0:
                del charCount[s[left]]  # Critical!
            left += 1

        maxLen = max(maxLen, right - left + 1)
    return maxLen
```

### 2. Incorrect Window Size Calculation
```python
# WRONG: Off-by-one error
def lengthOfLongestSubstringTwoDistinct(s):
    # ...
    maxLen = max(maxLen, right - left)  # Wrong!
    # ...
```

```python
# CORRECT: Inclusive range calculation
def lengthOfLongestSubstringTwoDistinct(s):
    # ...
    maxLen = max(maxLen, right - left + 1)  # Correct!
    # ...
```

### 3. Updating maxLen at Wrong Time
```python
# WRONG: Updates maxLen before shrinking window
def lengthOfLongestSubstringTwoDistinct(s):
    charCount = {}
    left = maxLen = 0

    for right in range(len(s)):
        charCount[s[right]] = charCount.get(s[right], 0) + 1
        maxLen = max(maxLen, right - left + 1)  # Too early!

        while len(charCount) > 2:
            # ... shrink window ...
    return maxLen
# Records invalid windows with > 2 distinct chars
```

```python
# CORRECT: Update after ensuring valid window
def lengthOfLongestSubstringTwoDistinct(s):
    charCount = {}
    left = maxLen = 0

    for right in range(len(s)):
        charCount[s[right]] = charCount.get(s[right], 0) + 1

        while len(charCount) > 2:
            # ... shrink window ...

        maxLen = max(maxLen, right - left + 1)  # After validation!
    return maxLen
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| K distinct characters (M340) | At most K instead of 2 | Same algorithm, change 2 to K |
| Exactly 2 distinct | Must have exactly 2 | Track windows with size == 2 |
| No repeating characters | All distinct | K = 1 for sliding window |
| Longest with all unique | Variation of above | Track all characters, no duplicates |

## Practice Checklist

- [ ] Handles empty string
- [ ] Handles single character string
- [ ] Handles string with all same characters
- [ ] Handles string with all different characters
- [ ] Can generalize to K distinct characters
- [ ] Can explain sliding window invariant
- [ ] Can code solution in 12 min
- [ ] Can discuss time/space complexity

**Spaced Repetition:** Day 1 → 3 → 7 → 14 → 30

---

**Strategy**: See [Sliding Window Pattern](../../strategies/patterns/sliding-window.md)
