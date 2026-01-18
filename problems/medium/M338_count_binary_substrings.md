---
id: M338
old_id: A163
slug: count-binary-substrings
title: Count Binary Substrings
difficulty: medium
category: medium
topics: ["string"]
patterns: []
estimated_time_minutes: 30
frequency: medium
related_problems:
  - E028_valid_parentheses.md
  - M172_longest_substring_with_at_least_k_repeating_characters.md
  - M256_group_anagrams.md
prerequisites:
  - string-manipulation
  - two-pointers
  - grouping
---
# Count Binary Substrings

## Problem

Given a binary string `s` (containing only '0' and '1' characters), count how many contiguous substrings meet all three of these requirements:

1. The substring has equal counts of zeros and ones
2. All zeros are grouped together consecutively
3. All ones are grouped together consecutively

For example, "0011" is valid because it has two zeros together followed by two ones together. But "0101" would NOT be valid as a complete substring (though it contains valid substrings "01" and "01").

Here are valid patterns:
- "01" - one zero, then one one
- "0011" - two zeros, then two ones
- "10" - one one, then one zero
- "000111" - three zeros, then three ones

Notice that the zeros and ones must each form a single continuous block, and there must be equal numbers of each. The substring "001011" would NOT be valid because the ones are split into two groups (1, then 11).

Count each occurrence separately based on position - if "01" appears twice at different positions in the string, count both.

## Why This Matters

Pattern counting in binary strings appears in digital signal processing (detecting alternating voltage patterns), run-length encoding for data compression, and genetic sequence analysis (finding balanced GC content regions in DNA). This problem teaches you to avoid brute-force substring enumeration by recognizing structural patterns - a key optimization technique. The grouping approach you'll develop generalizes to finding repeating patterns in time-series data, network traffic analysis, and music rhythm detection.

## Examples

**Example 1:**
- Input: `s = "00110011"`
- Output: `6`
- Explanation: Six valid substrings exist: "0011", "01", "1100", "10", "0011", and "01".
Repeating patterns are counted multiple times based on position.
The full string "00110011" doesn't qualify because zeros and ones alternate rather than forming two consecutive groups.

**Example 2:**
- Input: `s = "10101"`
- Output: `4`
- Explanation: Four valid substrings: "10", "01", "10", "01" each containing equal consecutive binary digits.

## Constraints

- 1 <= s.length <= 10⁵
- s[i] is either '0' or '1'.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Group Consecutive Characters</summary>

Instead of examining every possible substring, focus on grouping consecutive identical characters. For example, "00110011" becomes groups: [2, 2, 2, 2] representing two 0's, two 1's, two 0's, two 1's.

The key insight: between any two adjacent groups, the number of valid substrings equals the minimum of their sizes. For groups of size 2 and 2, you can form min(2, 2) = 2 valid substrings like "01" and "0011".

This transforms an O(n²) problem into O(n) by processing groups sequentially.
</details>

<details>
<summary>Hint 2: Linear Scan with Previous Count</summary>

You don't need to store all groups. Use two variables: `previous_count` (size of last group) and `current_count` (size of current group being built).

As you scan the string:
- When the character changes, add min(previous_count, current_count) to result
- Update previous_count = current_count
- Reset current_count = 1

This achieves O(n) time with O(1) space.
</details>

<details>
<summary>Hint 3: Handle Edge Cases</summary>

Consider these scenarios:
- Single character string: returns 0 (no valid pairs)
- All same characters "000": returns 0
- Alternating "0101": each pair counts once

Don't forget to process the final group after the loop ends. The relationship between consecutive groups is what matters, not individual characters.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (check all substrings) | O(n²) | O(1) | Check every substring for validity |
| Group Counting with Array | O(n) | O(n) | Store all group sizes, then sum adjacent minimums |
| Linear Scan (Optimal) | O(n) | O(1) | Track only previous and current group sizes |

## Common Mistakes

### Mistake 1: Checking Every Substring
```python
# DON'T: O(n²) approach checking all substrings
def countBinarySubstrings(s: str) -> int:
    count = 0
    for i in range(len(s)):
        for j in range(i + 2, len(s) + 1):
            substr = s[i:j]
            # Check if substr is valid (expensive)
            if is_valid(substr):
                count += 1
    return count
# Problem: Quadratic time, unnecessary validation
```

**Why it's wrong:** This examines O(n²) substrings and validates each one. Most substrings are invalid, wasting computation.

**Fix:** Group consecutive characters and use the minimum relationship.

### Mistake 2: Not Handling Group Transitions Correctly
```python
# DON'T: Missing the final comparison
def countBinarySubstrings(s: str) -> int:
    groups = []
    count = 1
    for i in range(1, len(s)):
        if s[i] == s[i-1]:
            count += 1
        else:
            groups.append(count)
            count = 1
    # Missing: groups.append(count) here!

    return sum(min(groups[i], groups[i+1]) for i in range(len(groups)-1))
# Problem: Last group not added, causing IndexError or wrong count
```

**Why it's wrong:** After the loop, the last group size is never appended, leading to incorrect results.

**Fix:** Always append the final group count after the loop.

### Mistake 3: Incorrect Adjacent Group Logic
```python
# DON'T: Using max instead of min
def countBinarySubstrings(s: str) -> int:
    groups = [1]
    for i in range(1, len(s)):
        if s[i] != s[i-1]:
            groups.append(1)
        else:
            groups[-1] += 1

    # Wrong: using max instead of min
    return sum(max(groups[i], groups[i+1]) for i in range(len(groups)-1))
# Problem: max gives wrong count; should be min
```

**Why it's wrong:** The number of valid substrings between two groups is limited by the smaller group, not the larger.

**Fix:** Use min(groups[i], groups[i+1]) for adjacent groups.

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| K Different Characters | Count substrings with exactly k different consecutive character groups | Hard |
| Maximum Length Binary Substring | Find the longest valid binary substring | Medium |
| Count Ternary Substrings | Extend to strings with three characters (0, 1, 2) | Hard |
| Weighted Binary Substrings | Each character has a weight; find minimum weight valid substring | Hard |

## Practice Checklist

- [ ] First attempt (no hints)
- [ ] Reviewed group-based approach
- [ ] Implemented O(n) time, O(1) space solution
- [ ] Tested edge cases: single char, all same, alternating
- [ ] Analyzed time/space complexity
- [ ] **Day 1-3:** Revisit and implement without reference
- [ ] **Week 1:** Solve variations with k-character groups
- [ ] **Week 2:** Apply grouping technique to similar problems

**Strategy**: See [String Pattern](../strategies/patterns/string-manipulation.md)
