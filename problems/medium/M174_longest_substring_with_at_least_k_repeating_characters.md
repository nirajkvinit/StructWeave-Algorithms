---
id: M174
old_id: I194
slug: longest-substring-with-at-least-k-repeating-characters
title: Longest Substring with At Least K Repeating Characters
difficulty: medium
category: medium
topics: ["string", "sliding-window", "divide-and-conquer"]
patterns: ["sliding-window-variable", "divide-and-conquer"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E003", "M340", "M159"]
prerequisites: ["sliding-window", "hash-maps", "recursion"]
---
# Longest Substring with At Least K Repeating Characters

## Problem

You're given a string `s` and a threshold value `k`, and your challenge is to find the longest contiguous substring where every single character that appears in that substring shows up at least `k` times. The key constraint here is "every character" – it's not enough for some characters to meet the frequency requirement while others fall short. All characters in the substring must appear at least `k` times for it to be valid.

Let's work through some examples to clarify this. If `s = "aaabb"` and `k = 3`, the substring `"aaa"` is valid because the only character in it is 'a', which appears exactly 3 times (meeting the threshold). The full string `"aaabb"` is invalid because while 'a' appears 3 times (which is fine), 'b' only appears twice, failing to meet the requirement. For another example, consider `s = "ababbc"` and `k = 2`. The substring `"ababb"` has length 5 and is valid: 'a' appears 2 times and 'b' appears 3 times, both meeting or exceeding the threshold of 2. Notice that 'b' appearing more than `k` times is perfectly fine; the requirement is "at least k," not "exactly k."

An important edge case: if you examine a character's total frequency across the entire string and find it appears fewer than `k` times, then that character can never be part of any valid substring. Such characters act as natural "breaking points" that split your search space. If no valid substring exists at all (for instance, if `k` is larger than the string length), you should return 0. The string consists only of lowercase English letters, can be up to 10,000 characters long, and `k` can range from 1 to 100,000.

## Why This Matters

Frequency-based substring analysis is critical in text mining, bioinformatics, and data compression. In DNA sequence analysis, researchers look for patterns where specific nucleotides repeat at certain frequencies, which can indicate genes or regulatory regions. In natural language processing, identifying substrings with consistent character distributions helps with language detection and text classification. Compression algorithms like LZ77 and LZ78 find repeated substrings to achieve better compression ratios. This problem teaches two powerful algorithmic techniques: divide-and-conquer (splitting the string at invalid characters) and constrained sliding window (maintaining exactly `n` unique characters while tracking their frequencies). The divide-and-conquer approach demonstrates how identifying impossible cases can simplify a problem dramatically. Characters that can't possibly be valid become split points, breaking one hard problem into several easier subproblems. The sliding window approach shows how adding constraints (fixing the number of unique characters) can transform an intractable problem into a linear-time solution. Both techniques are widely applicable beyond this specific problem.

## Examples

**Example 1:**
- Input: `s = "aaabb", k = 3`
- Output: `3`
- Explanation: The substring "aaa" satisfies the requirement since 'a' appears 3 times.

**Example 2:**
- Input: `s = "ababbc", k = 2`
- Output: `5`
- Explanation: In "ababb", both 'a' and 'b' meet the minimum frequency requirement (a appears 2 times, b appears 3 times).

## Constraints

- 1 <= s.length <= 10⁴
- s consists of only lowercase English letters.
- 1 <= k <= 10⁵

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Characters That Can't Be Included</summary>

If a character appears in the string but its total frequency is less than k, it cannot be part of any valid substring. These characters act as natural split points. Try dividing the problem around these invalid characters.

</details>

<details>
<summary>🎯 Hint 2: Divide and Conquer Strategy</summary>

Count character frequencies in the current string. Find any character with frequency < k. This character splits the string into segments. Recursively solve for each segment and return the maximum. Base case: if all characters meet the frequency requirement, return the entire string length.

</details>

<details>
<summary>📝 Hint 3: Sliding Window with Constraint</summary>

Alternative approach: try all possible numbers of unique characters (1 to 26). For each fixed number of unique characters, use a sliding window to find the longest substring with exactly that many unique characters where each appears at least k times. This gives you O(26n) = O(n) complexity.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n³) | O(1) | Check all substrings with frequency counting |
| Divide and Conquer | O(n log n) avg, O(n²) worst | O(n) | Recursion depth varies with split distribution |
| **Sliding Window (26 passes)** | **O(26n) = O(n)** | **O(1)** | Optimal: fixed number of passes, constant space |

## Common Mistakes

### Mistake 1: Trying standard sliding window directly

```python
# Wrong: Standard sliding window doesn't work directly
def longestSubstring(s, k):
    max_len = 0
    left = 0
    count = {}

    for right in range(len(s)):
        count[s[right]] = count.get(s[right], 0) + 1

        # WRONG: Can't simply shrink when condition fails
        # because removing from left might make other chars invalid
        while any(v < k for v in count.values()):
            count[s[left]] -= 1
            if count[s[left]] == 0:
                del count[s[left]]
            left += 1

        max_len = max(max_len, right - left + 1)

    return max_len

# Correct: Use divide and conquer or fixed unique chars
def longestSubstring(s, k):
    if len(s) < k:
        return 0

    # Count frequencies
    count = {}
    for c in s:
        count[c] = count.get(c, 0) + 1

    # Find characters that can't be included
    for char, freq in count.items():
        if freq < k:
            # Split by this character and recurse
            return max(longestSubstring(sub, k) for sub in s.split(char))

    # All characters have freq >= k
    return len(s)
```

### Mistake 2: Not handling edge cases

```python
# Wrong: Doesn't handle k=1 or empty splits
def longestSubstring(s, k):
    count = {}
    for c in s:
        count[c] = count.get(c, 0) + 1

    for char, freq in count.items():
        if freq < k:
            # WRONG: Doesn't handle empty strings from split
            return max(longestSubstring(sub, k) for sub in s.split(char))

    return len(s)

# Correct: Handle edge cases properly
def longestSubstring(s, k):
    if len(s) < k:
        return 0
    if k <= 1:
        return len(s)

    count = {}
    for c in s:
        count[c] = count.get(c, 0) + 1

    for char, freq in count.items():
        if freq < k:
            # Filter out empty strings
            return max((longestSubstring(sub, k) for sub in s.split(char)), default=0)

    return len(s)
```

### Mistake 3: Inefficient frequency recounting

```python
# Wrong: Recounting frequencies in each recursive call
def longestSubstring(s, k):
    if len(s) < k:
        return 0

    # WRONG: Counting inside loop is inefficient
    for i in range(len(s)):
        count = {}
        for c in s:
            count[c] = count.get(c, 0) + 1

        if count[s[i]] < k:
            substrings = s.split(s[i])
            return max(longestSubstring(sub, k) for sub in substrings)

    return len(s)

# Correct: Count once, use efficiently
def longestSubstring(s, k):
    if len(s) < k:
        return 0

    count = {}
    for c in s:
        count[c] = count.get(c, 0) + 1

    for char, freq in count.items():
        if freq < k:
            return max((longestSubstring(sub, k) for sub in s.split(char)), default=0)

    return len(s)
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| At most k occurrences | Find longest substring where chars appear at most k times | Medium |
| Exactly k unique chars | Longest substring with exactly k distinct characters | Medium |
| Multiple k values | Answer queries with different k values efficiently | Hard |
| Count valid substrings | Count all substrings meeting the criteria | Hard |
| Lexicographically smallest | Find smallest valid substring (not longest) | Medium |

## Practice Checklist

- [ ] First attempt (solve independently)
- [ ] Implement divide and conquer solution
- [ ] Implement sliding window with fixed unique chars
- [ ] Compare performance of both approaches
- [ ] Practice after 1 day
- [ ] Practice after 3 days
- [ ] Practice after 1 week

**Strategy**: See [Sliding Window Patterns](../strategies/patterns/sliding-window.md)
