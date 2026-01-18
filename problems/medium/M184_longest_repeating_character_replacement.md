---
id: M184
old_id: I223
slug: longest-repeating-character-replacement
title: Longest Repeating Character Replacement
difficulty: medium
category: medium
topics: ["string", "sliding-window"]
patterns: ["sliding-window-variable"]
estimated_time_minutes: 30
frequency: high
related_problems: ["M003", "M340", "E424"]
prerequisites: ["sliding-window", "hash-map"]
---
# Longest Repeating Character Replacement

## Problem

You're given a string `s` containing only uppercase English letters and an integer `k` representing the number of character replacements you're allowed to make. Your goal is to find the maximum length of a contiguous substring that can be made to contain all identical characters by replacing at most `k` characters with any uppercase letter of your choice. For example, with the string `"ABAB"` and `k = 2`, you can replace both 'A' characters with 'B' (or vice versa) to create a substring of length 4 with all identical characters. The challenge is determining which characters to replace and where. Think of it as finding a window in the string where, if you change the minority characters to match the majority character, you can create the longest possible run of identical letters. The key insight is that within any valid window, you should keep the most frequent character and replace all others. A window is valid when `window_length - max_frequency <= k`, meaning the number of characters that need changing doesn't exceed your replacement budget. The problem becomes interesting with edge cases like when `k = 0` (no replacements allowed, so you're just finding the longest existing run) or when `k` is greater than or equal to the string length (you can make the entire string uniform). Efficiently solving this requires a sliding window approach that tracks character frequencies without repeatedly scanning the entire window.

## Why This Matters

This problem models real-world text normalization and data cleaning scenarios found in natural language processing, DNA sequence analysis, and data compression systems. When processing noisy text data from OCR (optical character recognition), you often need to find the longest recoverable sequences where a limited number of recognition errors can be tolerated and corrected. In bioinformatics, this appears when identifying gene sequences where up to k mutations are acceptable for classification purposes, or when aligning DNA sequences allowing for a certain number of mismatches. Data compression algorithms use similar windowing techniques to identify repeating patterns that can be encoded more efficiently. The sliding window pattern with frequency tracking you'll master here is foundational for many streaming data problems, including network packet analysis (finding stable connection periods despite occasional packet corruption), time-series anomaly detection (identifying trends while allowing for noise), and recommendation systems (finding user behavior patterns despite occasional outliers). This problem strengthens your ability to maintain dynamic statistics over a moving window, a skill crucial for real-time analytics systems and signal processing applications.

## Examples

**Example 1:**
- Input: `s = "ABAB", k = 2`
- Output: `4`
- Explanation: By changing both 'A' characters to 'B' (or both 'B' characters to 'A'), you get a string with 4 identical consecutive characters.

**Example 2:**
- Input: `s = "AABABBA", k = 1`
- Output: `4`
- Explanation: By replacing the middle 'A' with 'B', the string becomes "AABBBBA". The substring "BBBB" contains 4 repeating letters, which is the longest possible. Other valid approaches may also yield this answer.

## Constraints

- 1 <= s.length <= 10⁵
- s consists of only uppercase English letters.
- 0 <= k <= s.length

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Use sliding window to maintain valid substring</summary>

The key insight is that within any valid window, you can replace the minority characters with the majority character. A window is valid if: window_length - max_frequency_in_window <= k. Use a sliding window to find the longest such window.
</details>

<details>
<summary>🎯 Hint 2: Track character frequencies in current window</summary>

Maintain a frequency map for characters in the current window. The most frequent character in the window should be kept, and all others can be replaced (up to k replacements). Expand the window by moving right pointer, shrink by moving left pointer when invalid.
</details>

<details>
<summary>📝 Hint 3: Sliding window algorithm</summary>

```
1. Initialize: left = 0, max_length = 0, char_count = {}
2. For right from 0 to n-1:
   - Add s[right] to char_count
   - max_freq = max frequency in current window
   - window_size = right - left + 1
   - If window_size - max_freq > k:
     - Remove s[left] from char_count
     - left += 1  # Shrink window
   - max_length = max(max_length, right - left + 1)
3. Return max_length

Time: O(n), Space: O(26) = O(1)
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Sliding Window | O(n) | O(26) = O(1) | Only uppercase letters |
| Brute Force | O(n²) | O(26) = O(1) | Check all substrings |
| Optimized Window | O(n) | O(1) | Track only max frequency |

## Common Mistakes

### Mistake 1: Not maintaining max frequency correctly

```python
# Wrong: Recalculating max frequency each time is inefficient
def character_replacement_wrong(s, k):
    left = 0
    max_length = 0
    char_count = {}

    for right in range(len(s)):
        char_count[s[right]] = char_count.get(s[right], 0) + 1

        # Wrong: max(char_count.values()) every iteration is O(26)
        while (right - left + 1) - max(char_count.values()) > k:
            char_count[s[left]] -= 1
            left += 1

        max_length = max(max_length, right - left + 1)

    return max_length  # Works but suboptimal
```

```python
# Correct: Track max frequency as we go
def character_replacement_correct(s, k):
    left = 0
    max_length = 0
    max_freq = 0
    char_count = {}

    for right in range(len(s)):
        char_count[s[right]] = char_count.get(s[right], 0) + 1
        max_freq = max(max_freq, char_count[s[right]])

        # Check if current window is valid
        window_size = right - left + 1
        if window_size - max_freq > k:
            char_count[s[left]] -= 1
            left += 1

        max_length = max(max_length, right - left + 1)

    return max_length
```

### Mistake 2: Incorrectly shrinking the window

```python
# Wrong: Using if instead of while (may not shrink enough)
def character_replacement_wrong(s, k):
    # ... setup code ...
    if (right - left + 1) - max_freq > k:  # Wrong: should be while
        char_count[s[left]] -= 1
        left += 1
```

```python
# Correct: Note that 'if' actually works for this problem
# because we only need to shrink by 1 at most
def character_replacement_correct(s, k):
    left = 0
    max_freq = 0
    char_count = {}

    for right in range(len(s)):
        char_count[s[right]] = char_count.get(s[right], 0) + 1
        max_freq = max(max_freq, char_count[s[right]])

        # 'if' works because max_freq is non-decreasing
        # and we're looking for maximum window
        if (right - left + 1) - max_freq > k:
            char_count[s[left]] -= 1
            left += 1

    return right - left + 1 if right >= 0 else 0
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Longest Substring with At Most K Distinct | Medium | Similar sliding window - M340 |
| Longest Substring Without Repeating | Medium | No replacement allowed - M003 |
| Max Consecutive Ones III | Medium | Binary version with flip operation |
| Longest Repeating Substring | Medium | Find longest repeating substring without replacement |

## Practice Checklist

- [ ] Day 1: Solve using sliding window with frequency map (25-35 min)
- [ ] Day 2: Implement and understand the max_freq optimization (30 min)
- [ ] Day 7: Re-solve and handle edge cases (k = 0, k >= n) (20 min)
- [ ] Day 14: Compare with "Longest Substring with At Most K Distinct" (25 min)
- [ ] Day 30: Explain why max_freq doesn't need to decrease (15 min)

**Strategy**: See [Sliding Window Pattern](../strategies/patterns/sliding-window.md)
