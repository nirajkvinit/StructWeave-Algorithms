---
id: H058
old_id: I139
slug: longest-substring-with-at-most-k-distinct-characters
title: Longest Substring with At Most K Distinct Characters
difficulty: hard
category: hard
topics: ["string"]
patterns: ["sliding-window-variable"]
estimated_time_minutes: 45
---
# Longest Substring with At Most K Distinct Characters

## Problem

Find the maximum length of a contiguous substring within string `s` where the number of unique characters does not exceed `k`.

You need to determine the longest possible substring that satisfies the constraint of having at most `k` different characters.

## Why This Matters

String manipulation is essential for text processing and pattern matching. This problem builds your character-level thinking.

## Examples

**Example 1:**
- Input: `s = "eceba", k = 2`
- Output: `3`
- Explanation: "ece" contains only 2 unique characters and has length 3.

**Example 2:**
- Input: `s = "aa", k = 1`
- Output: `2`
- Explanation: "aa" contains 1 unique character and has length 2.

## Constraints

- 1 <= s.length <= 5 * 10⁴
- 0 <= k <= 50

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Use a sliding window approach with a hash map to track character frequencies. Expand the window by moving right pointer, and shrink from left when distinct characters exceed k. Track the maximum window size seen during the process.
</details>

<details>
<summary>🎯 Main Approach</summary>
Maintain a window [left, right] and a frequency map. Move right pointer to expand window, adding characters to map. When map size > k, move left pointer and decrement frequencies (remove characters with 0 frequency). Update max_length at each valid window state.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Instead of using a hash map size check, maintain a counter for distinct characters. When adding a character with frequency 0, increment the counter; when removing a character to frequency 0, decrement the counter. This avoids repeated map size calculations.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(k) | Check all substrings |
| Sliding Window | O(n) | O(k) | Each element visited at most twice |

## Common Mistakes

1. **Not properly shrinking the window**
   ```python
   # Wrong: Removing one character at a time
   while len(char_map) > k:
       left += 1

   # Correct: Remove characters and update map
   while len(char_map) > k:
       char_map[s[left]] -= 1
       if char_map[s[left]] == 0:
           del char_map[s[left]]
       left += 1
   ```

2. **Updating max_length incorrectly**
   ```python
   # Wrong: Updating even when window is invalid
   max_length = max(max_length, right - left + 1)

   # Correct: Update only when window is valid
   if len(char_map) <= k:
       max_length = max(max_length, right - left + 1)
   ```

3. **Not handling k = 0 edge case**
   ```python
   # Wrong: Assuming k is always positive
   if not s or k <= 0:
       return 0  # Missing k == 0 case

   # Correct: Proper edge case handling
   if not s or k == 0:
       return 0
   if k >= len(set(s)):
       return len(s)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Longest Substring Without Repeating Characters | Medium | k = all characters must be distinct |
| Longest Substring with At Most Two Distinct Characters | Medium | k = 2 specifically |
| Subarrays with K Different Integers | Hard | Count subarrays instead of length |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Sliding Window](../../strategies/patterns/sliding-window-variable.md)
