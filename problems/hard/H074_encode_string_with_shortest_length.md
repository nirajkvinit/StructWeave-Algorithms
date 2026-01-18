---
id: H074
old_id: I270
slug: encode-string-with-shortest-length
title: Encode String with Shortest Length
difficulty: hard
category: hard
topics: ["string"]
patterns: []
estimated_time_minutes: 45
---
# Encode String with Shortest Length

## Problem

Your task is to compress a string `s` into its most compact encoded representation.

Use this encoding notation: `k[encoded_string]`, which means the substring within the brackets repeats exactly `k` times, where `k` is a positive integer.

Only apply encoding when it reduces the total length. If multiple equally short encodings exist, any valid answer is acceptable.

## Why This Matters

String manipulation is essential for text processing and pattern matching. This problem builds your character-level thinking.

## Examples

**Example 1:**
- Input: `s = "aaa"`
- Output: `"aaa"`
- Explanation: Encoding doesn't reduce the length, so the original string is returned.

**Example 2:**
- Input: `s = "aaaaa"`
- Output: `"5[a]"`
- Explanation: The encoded form "5[a]" saves one character compared to "aaaaa".

**Example 3:**
- Input: `s = "aaaaaaaaaa"`
- Output: `"10[a]"`
- Explanation: Alternative encodings like "a9[a]" or "9[a]a" are also acceptable as they achieve the same length of 5 characters.

## Constraints

- 1 <= s.length <= 150
- s consists of only lowercase English letters.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

This is an interval dynamic programming problem. For any substring s[i:j], the optimal encoding depends on:
1. Not encoding it at all (keep it as-is)
2. Encoding it as a repetition if it contains a repeating pattern
3. Splitting it at some point k and combining the optimal encodings of s[i:k] and s[k:j]

To detect if a substring is a repetition, use the trick: if s == s[0:len(s)//k] * k for some divisor k, then it repeats.

</details>

<details>
<summary>🎯 Main Approach</summary>

Use dynamic programming with interval processing:
1. Create a 2D DP table where dp[i][j] = shortest encoding of s[i:j+1]
2. Process substrings in increasing length order
3. For each substring s[i:j]:
   - Try encoding as repetition: check if (s+s).find(s, 1) < len(s) indicates a pattern
   - Try all split points k: combine dp[i][k] + dp[k+1][j]
   - Take the shortest of all options
4. Return dp[0][n-1]

The repetition detection uses a clever string trick: if substring appears in doubled version starting at index 1, it's repeating.

</details>

<details>
<summary>⚡ Optimization Tip</summary>

For repetition detection, instead of checking all divisors, use the string doubling trick: if s is in (s+s)[1:-1], then s has a repeating pattern. The length of the pattern is len(s) - (s+s).find(s, 1). This gives you the period of repetition directly, allowing you to construct the k[pattern] format efficiently.

Also, only encode if it saves space: len(encoded) < len(original).

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n! × n) | O(n²) | Try all possible encodings - intractable |
| Interval DP | O(n³) | O(n²) | n² substrings, O(n) to find best split |
| Optimal | O(n³) | O(n²) | Cannot improve asymptotically for this problem |

## Common Mistakes

1. **Not considering all split points**
   ```python
   # Wrong: Only checking if entire string repeats
   def encode(s):
       if is_repetition(s):
           return compress(s)
       return s  # Missing: try splitting into parts

   # Correct: Try all possible splits
   def encode_interval(s, i, j, dp):
       # Try no split (direct encoding or keep as-is)
       result = compress(s[i:j+1])
       # Try all splits
       for k in range(i, j):
           candidate = dp[i][k] + dp[k+1][j]
           if len(candidate) < len(result):
               result = candidate
       return result
   ```

2. **Incorrect repetition detection**
   ```python
   # Wrong: Only checking if first half equals second half
   def is_repetition(s):
       mid = len(s) // 2
       return s[:mid] == s[mid:]  # Misses patterns like "abcabc"

   # Correct: Use string find trick or check all divisors
   def get_compressed(s):
       n = len(s)
       pos = (s + s).find(s, 1)
       if pos < n:  # Repeating pattern found
           pattern_len = pos
           return f"{n // pattern_len}[{s[:pattern_len]}]"
       return s
   ```

3. **Encoding when it doesn't save space**
   ```python
   # Wrong: Always encoding repetitions
   def compress(s):
       # Even "aaa" becomes "3[a]" - same length!
       return f"{count}[{pattern}]"

   # Correct: Only encode if it saves space
   def compress(s):
       # ... find pattern and count ...
       encoded = f"{count}[{pattern}]"
       return encoded if len(encoded) < len(s) else s
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Decode String | Medium | Reverse operation - expand encoded string |
| String Compression | Medium | Run-length encoding only |
| Number of Atoms | Hard | Parsing nested chemical formulas |
| Mini Parser | Medium | Parse nested integer lists |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (no compression benefit, nested patterns)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming - Intervals](../../strategies/patterns/dynamic-programming.md)
