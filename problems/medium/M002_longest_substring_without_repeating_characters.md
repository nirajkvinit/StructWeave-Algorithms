---
id: M002
old_id: F003
slug: longest-substring-without-repeating-characters
title: Longest Substring Without Repeating Characters
difficulty: medium
category: medium
topics: ["string"]
patterns: ["sliding-window-variable"]
estimated_time_minutes: 30
frequency: very-high
related_problems: ["M159", "M340", "M003", "E001"]
prerequisites: ["hash-table", "two-pointers"]
strategy_ref: ../strategies/patterns/sliding-window.md
---
# Longest Substring Without Repeating Characters

## Problem

Given a string, find the length of the longest contiguous substring where every character appears at most once. A substring is a continuous sequence of characters, not to be confused with a subsequence which can have gaps. For example, in "abcabcbb", the longest substring without repeating characters is "abc" with length 3. Note that "abcbb" contains duplicate 'b's, so it doesn't qualify. You'll need to efficiently track which characters you've seen as you scan through the string. The key challenge is knowing when to shrink your current window after encountering a duplicate. Edge cases include: strings with all unique characters, strings with all identical characters, and empty strings.

## Why This Matters

The sliding window pattern you'll learn here is one of the most powerful techniques in algorithm design, appearing in countless real-world applications. Text editors use similar logic for syntax highlighting and autocomplete features. Network protocols employ sliding window techniques for flow control and packet management. Database query optimizers use variations of this pattern for range scans. This problem teaches you to maintain a dynamic "window" of valid data while processing streams, a skill essential for processing large datasets that don't fit in memory. The character-tracking approach translates directly to problems involving duplicate detection, frequency analysis, and constraint satisfaction. It's a very high-frequency interview question because it tests your ability to optimize from a naive O(n²) solution to an elegant O(n) approach.

## Examples

**Example 1:**
- Input: `s = "abcabcbb"`
- Output: `3`
- Explanation: The answer is "abc", with the length of 3.

**Example 2:**
- Input: `s = "bbbbb"`
- Output: `1`
- Explanation: The answer is "b", with the length of 1.

**Example 3:**
- Input: `s = "pwwkew"`
- Output: `3`
- Explanation: The answer is "wke", with the length of 3.
Notice that the answer must be a substring, "pwke" is a subsequence and not a substring.

## Constraints

- 0 <= s.length <= 5 * 10⁴
- s consists of English letters, digits, symbols and spaces.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?
4. How can you efficiently track which characters you've seen?
5. When you encounter a duplicate, what needs to happen to your window?

---

## Approach Hints

<details>
<summary>💡 Hint 1: The window analogy</summary>

Imagine looking at the string through a window that only shows substrings without duplicates.

When you see a character you've already seen in your current window, what must you do?
- Can you keep the left side of the window where it is?
- Or must you move it to ensure no duplicates remain?

**Think about:**
- How do you know when you've seen a character before?
- What's the leftmost position your window can start from after finding a duplicate?

</details>

<details>
<summary>🎯 Hint 2: Sliding window with hash map</summary>

Use a **variable-size sliding window** that expands right and contracts from left when duplicates appear.

The key insight: Track the **most recent index** of each character using a hash map.

```
For string "abcabcbb":
  Window "abc" → valid (length 3)
  Add 'a' → duplicate!
  Shrink left to after the previous 'a'
  Window "bca" → valid (length 3)
```

**Data structure:**
- `char_index = {}` maps character to its latest index
- `left = 0` marks window start
- `max_len = 0` tracks best result

**When duplicate found at index `i`:**
- Move `left` to `max(left, char_index[s[i]] + 1)`
- This skips past the previous occurrence

</details>

<details>
<summary>📝 Hint 3: Optimized algorithm</summary>

```
char_index = {}
left = 0
max_len = 0

for right in range(len(s)):
    char = s[right]

    # If char seen and within current window
    if char in char_index and char_index[char] >= left:
        # Move left past the duplicate
        left = char_index[char] + 1

    # Update this character's position
    char_index[char] = right

    # Update max length
    current_len = right - left + 1
    max_len = max(max_len, current_len)

return max_len
```

**Why `char_index[char] >= left` check?**
If the previous occurrence is before `left`, it's not in our current window!

Example: "abba"
- At second 'b': left moves to after first 'b'
- At second 'a': first 'a' is before left, so ignore it

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Brute force (check all substrings) | O(n³) | O(min(n,m)) | Simple but unusable |
| Brute force optimized | O(n²) | O(min(n,m)) | Still too slow |
| **Sliding window with set** | **O(n)** | **O(min(n,m))** | Need to shrink carefully |
| **Sliding window with map** | **O(n)** | **O(min(n,m))** | Optimal, clean logic |

**Where `n` = string length, `m` = character set size (128 for ASCII)**

**Why sliding window wins:**
- Single pass through string (right pointer)
- Each character added/removed from set at most once
- Amortized O(1) operations

**Space breakdown:**
- Hash map/set: O(min(n, m)) - at most m unique characters
- Variables: O(1)

**Set vs Map tradeoff:**
- **Set approach**: Explicitly remove characters from set while shrinking
- **Map approach**: Just track indices, implicit removal via left pointer

---

## Common Mistakes

### 1. Not handling the duplicate correctly
```python
# WRONG: Moves left by only 1, might still have duplicates
if char in char_set:
    left += 1
    char_set.remove(s[left-1])

# CORRECT: Jump left directly past the duplicate
if char in char_index and char_index[char] >= left:
    left = char_index[char] + 1
```

### 2. Forgetting to check if duplicate is in current window
```python
# WRONG: Old occurrence might be before window start
if char in char_index:
    left = char_index[char] + 1  # Could move left backwards!

# CORRECT: Only move if duplicate is in current window
if char in char_index and char_index[char] >= left:
    left = char_index[char] + 1
```

### 3. Updating max_len only when moving left
```python
# WRONG: Misses valid windows when no duplicates
if char in char_index:
    left = char_index[char] + 1
    max_len = max(max_len, right - left + 1)

# CORRECT: Update max_len on every iteration
for right in range(len(s)):
    # ... handle duplicates ...
    max_len = max(max_len, right - left + 1)
```

### 4. Off-by-one errors in window calculation
```python
# WRONG: Doesn't include right endpoint
current_len = right - left

# CORRECT: Both endpoints inclusive
current_len = right - left + 1
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **At most K distinct chars** | Allow K unique chars | Track char count, shrink when > K |
| **Exactly K distinct chars** | Must have K unique chars | Two sliding windows: at-most-K minus at-most-(K-1) |
| **Longest substring with at most 2 distinct** | K=2 special case | Same sliding window |
| **Replace at most K chars** | Can change K chars to any | Track char frequencies, shrink when distinct > K+1 |
| **Longest repeating char replacement** | Make substring of same char | Track max frequency, allow K replacements |

**At most K distinct characters variation:**
```python
def lengthOfLongestSubstringKDistinct(s, k):
    char_count = {}
    left = 0
    max_len = 0

    for right in range(len(s)):
        char = s[right]
        char_count[char] = char_count.get(char, 0) + 1

        # Shrink window if too many distinct chars
        while len(char_count) > k:
            left_char = s[left]
            char_count[left_char] -= 1
            if char_count[left_char] == 0:
                del char_count[left_char]
            left += 1

        max_len = max(max_len, right - left + 1)

    return max_len
```

---

## Visual Walkthrough

```
String: "pwwkew"

Step 1: right=0, char='p'
  Window: [p]
  char_index: {'p': 0}
  left=0, max_len=1

Step 2: right=1, char='w'
  Window: [p w]
  char_index: {'p': 0, 'w': 1}
  left=0, max_len=2

Step 3: right=2, char='w' (duplicate!)
  Window before: [p w w]
  'w' already at index 1, which is >= left (0)
  left = 1 + 1 = 2
  Window after: [w]
  char_index: {'p': 0, 'w': 2}
  left=2, max_len=2

Step 4: right=3, char='k'
  Window: [w k]
  char_index: {'p': 0, 'w': 2, 'k': 3}
  left=2, max_len=2

Step 5: right=4, char='e'
  Window: [w k e]
  char_index: {'p': 0, 'w': 2, 'k': 3, 'e': 4}
  left=2, max_len=3 ← answer!

Step 6: right=5, char='w' (duplicate!)
  'w' already at index 2, which is >= left (2)
  left = 2 + 1 = 3
  Window: [k e w]
  char_index: {'p': 0, 'w': 5, 'k': 3, 'e': 4}
  left=3, max_len=3

Result: 3 (substring "wke")
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles string with all unique characters
- [ ] Handles string with all same characters
- [ ] Handles empty string (if allowed)
- [ ] Handles single character string
- [ ] Correctly identifies longest when multiple exist
- [ ] Handles special characters and spaces

**Code Quality:**
- [ ] Clean sliding window logic
- [ ] No off-by-one errors
- [ ] Efficient duplicate detection
- [ ] Clear variable names

**Interview Readiness:**
- [ ] Can explain sliding window pattern in 2 minutes
- [ ] Can code solution in 12 minutes
- [ ] Can discuss time/space complexity
- [ ] Can handle follow-up variations (K distinct chars)

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve K-distinct variation
- [ ] Day 14: Explain to someone else
- [ ] Day 30: Quick review

---

**Strategy**: See [Sliding Window Pattern](../../strategies/patterns/sliding-window.md)
