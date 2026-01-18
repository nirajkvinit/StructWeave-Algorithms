---
id: M259
old_id: A051
slug: split-concatenated-strings
title: Split Concatenated Strings
difficulty: medium
category: medium
topics: ["array", "string", "greedy"]
patterns: ["greedy"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M266_permutation_in_string", "E242_valid_anagram", "M179_largest_number"]
prerequisites: ["string-manipulation", "greedy-algorithms"]
---
# Split Concatenated Strings

## Problem

Given an array of strings, arrange them into a circular chain (like beads on a bracelet) where you can optionally reverse any string before adding it. Then find the lexicographically largest string possible by cutting the circle at any position to form a linear string.

The process has two steps: First, for each string, decide whether to use it as-is or reversed, then concatenate them in the given order to form a circle. Second, choose where to cut this circle to create a linear string. The circle has no inherent start or end, so cutting at different positions produces different linear strings.

For example, with strings ["abc", "xyz"], you might reverse "abc" to "cba" and "xyz" to "zyx", creating the circle "cbazyx". Cutting between 'z' and 'y' produces "yxcbaz", while cutting between 'c' and 'b' produces "bazyxc". But cutting after 'z' (before 'y') gives "zyxcba", which is lexicographically largest.

The key challenge is that you must try different cut positions and potentially different orientations (original or reversed) for the strings. A fully brute force approach would be prohibitively expensive, but you can optimize by: 1) greedily choosing the better version (original vs reversed) for most strings, and 2) only trying cut positions at string boundaries, not every character.

Specifically, for the string where you make the cut, try both its original and reversed forms with all possible cut positions within that string. For all other strings, use whichever version (original or reversed) is lexicographically larger. This reduces the search space significantly.

## Why This Matters

This problem develops greedy optimization skills and string manipulation techniques used in text processing, DNA sequence analysis (where complementary strands can be reversed), and circular buffer management in embedded systems. The circular-to-linear transformation pattern appears in problems involving rotation arrays, cyclic dependencies, and ring buffers. Understanding when to make greedy choices versus when to exhaustively search is a valuable algorithmic skill. While infrequently interviewed due to its specific constraints, it teaches important lessons about optimization and search space reduction.

## Examples

**Example 1:**
- Input: `strs = ["abc","xyz"]`
- Output: `"zyxcba"`
- Explanation: Possible circular arrangements include "-abcxyz-", "-abczyx-", "-cbaxyz-", "-cbazyx-" (where '-' indicates the circular nature). The optimal result comes from the fourth configuration, cutting at character 'a' to produce "zyxcba".

**Example 2:**
- Input: `strs = ["abc"]`
- Output: `"cba"`

## Constraints

- 1 <= strs.length <= 1000
- 1 <= strs[i].length <= 1000
- 1 <= sum(strs[i].length) <= 1000
- strs[i] consists of lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Greedy Strategy</summary>

For each string, we should choose to keep it as-is or reverse it based on which version is lexicographically larger. This greedy choice ensures we have the best possible circular arrangement.

However, we need to try all possible cut positions. For efficiency, we only need to consider cutting at the start of each character in the array strings, not every position in the final concatenated string.
</details>

<details>
<summary>Hint 2: Optimization Insight</summary>

Pre-process all strings: for each string, store the lexicographically larger version (original vs reversed). Then build the "best" circular arrangement.

For the cutting phase, iterate through each string in the array. For the current string, try both the original and reversed versions as the starting point. Concatenate the "best" versions of all other strings in circular order and compare results.
</details>

<details>
<summary>Hint 3: Implementation Strategy</summary>

```python
# Pseudocode:
1. For each string, determine its "best" version (max of original and reversed)
2. Build middle part: concatenate all best versions except current
3. For each string i in array:
   a. Try both original and reversed as starting string
   b. For each character position in the starting string:
      - Build candidate: substring_from_position + middle + substring_before_position
      - Update global maximum
4. Return the maximum lexicographic string found
```

Key optimization: Only iterate through strings in the array, not every character position in the final concatenation.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Optimal Solution | O(n * L²) | O(n * L) | n = number of strings, L = average length |
| Brute Force | O(n! * n * L²) | O(n * L) | Try all permutations and reversals |

## Common Mistakes

1. **Not trying both original and reversed for the starting string**
```python
# Wrong: Only considering the "best" version for starting position
best = max(s, s[::-1])
for i in range(len(best)):
    candidate = best[i:] + middle + best[:i]

# Correct: Try both versions for starting position
for version in [s, s[::-1]]:
    for i in range(len(version)):
        candidate = version[i:] + middle + version[:i]
```

2. **Inefficient concatenation**
```python
# Wrong: Rebuilding entire string for every position
for i in range(total_length):
    candidate = full_string[i:] + full_string[:i]  # O(L) for each position

# Correct: Only iterate through array strings, not all characters
for str_idx in range(n):
    # Build from this string's positions only
```

3. **Incorrect lexicographic comparison**
```python
# Wrong: Comparing lengths instead of lexicographic order
if len(candidate) > len(max_result):
    max_result = candidate

# Correct: Use string comparison
if candidate > max_result:
    max_result = candidate
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Minimum Lexicographic | Medium | Find minimum instead of maximum |
| K-String Rotation | Hard | Allow rotating at most k strings |
| Weighted Strings | Hard | Each string has a cost; maximize value/cost ratio |
| Circular Palindrome | Hard | Find longest palindrome in circular arrangement |

## Practice Checklist

- [ ] Solve using greedy approach with all cut positions
- [ ] Handle edge case: single string
- [ ] Handle edge case: all strings identical
- [ ] Optimize by pre-computing best versions
- [ ] **Day 3**: Solve again without hints
- [ ] **Week 1**: Implement minimum lexicographic variation
- [ ] **Week 2**: Solve from memory in under 25 minutes

**Strategy**: See [Greedy Algorithms](../strategies/patterns/greedy.md)
