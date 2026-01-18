---
id: E231
old_id: A238
slug: jewels-and-stones
title: Jewels and Stones
difficulty: easy
category: easy
topics: ["string", "hash-table"]
patterns: ["set-lookup"]
estimated_time_minutes: 15
frequency: high
prerequisites: ["hash-set", "string-iteration"]
related_problems: ["E242", "E383", "E387"]
strategy_ref: ../strategies/data-structures/hash-table.md
---
# Jewels and Stones

## Problem

You have two strings: `jewels` and `stones`. The `jewels` string represents types of stones that are precious (each character is a jewel type), while the `stones` string represents all the stones you have (each character is one stone). Your task is to count how many of your stones are also jewels.

Character case matters here, meaning 'a' and 'A' are considered completely different stone types. If `jewels = "aA"`, then both lowercase 'a' and uppercase 'A' are valuable, but they're distinct types.

Each character in `jewels` is guaranteed to be unique, meaning no jewel type appears twice in that string. This is helpful because it means you don't have to worry about counting the same jewel type multiple times. However, the `stones` string can have duplicates, and you need to count each occurrence.

For example, if `jewels = "aA"` and `stones = "aAAbbbb"`, you'd count three jewels: one 'a' and two 'A's. The four 'b's don't count because 'b' isn't in the jewels string.

## Why This Matters

This problem teaches efficient membership checking using hash sets, a fundamental optimization that appears constantly in real-world programming. Set-based lookups reduce time complexity from O(n) per search to O(1), which becomes critical when processing large datasets.

The pattern of "build a set once, query many times" appears in filtering operations, validation systems, access control lists, spam detection, and data deduplication. For example, checking if an email is in a blocklist, validating user permissions, or filtering valid product codes all use this pattern.

String processing with case sensitivity is crucial in text parsing, lexical analysis, DNA sequence analysis (where 'A' and 'a' might represent different nucleotides), and file system operations (case-sensitive vs case-insensitive paths). Understanding when and how to handle case sensitivity is a practical skill.

This is a high-frequency interview problem because it's simple enough to solve in minutes but tests whether you understand the performance difference between O(n) string searching versus O(1) set lookup. Many candidates intuitively reach for nested loops without recognizing the optimization opportunity.

## Examples

**Example 1:**
- Input: `jewels = "aA", stones = "aAAbbbb"`
- Output: `3`

**Example 2:**
- Input: `jewels = "z", stones = "ZZ"`
- Output: `0`

## Constraints

- 1 <= jewels.length, stones.length <= 50
- jewels and stones consist of only English letters.
- All the characters of jewels are **unique**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1: Simple Counting
For each stone in your stones string, you need to check if it's a jewel type (appears in the jewels string). The straightforward approach is to iterate through stones and for each character, check if it exists in jewels. What operation would you use to check membership?

### Tier 2: Optimizing Lookups
In the basic approach, how many times do you check if a character exists in jewels? If you have n stones and m jewel types, checking each stone requires searching through jewels. What data structure makes membership checks much faster than linear search?

### Tier 3: Single Pass Solution
Convert the jewels string into a set for O(1) lookup time. Then iterate through stones once, checking each stone against the set. This gives you O(m + n) time where m is jewels length and n is stones length. Can you do it in a single line using built-in functions?

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (nested check) | O(m × n) | O(1) | Check each stone against all jewels |
| Hash Set (Optimal) | O(m + n) | O(m) | Convert jewels to set, iterate stones |
| Counter + Set | O(m + n) | O(m + unique stones) | Count all stones, filter by jewels set |

Where m = length of jewels, n = length of stones

## Common Mistakes

### Mistake 1: Case Sensitivity Error
```python
# Wrong: Treats 'a' and 'A' as the same
def numJewelsInStones(jewels, stones):
    jewel_set = set(jewels.lower())  # Don't convert case!
    return sum(1 for stone in stones if stone.lower() in jewel_set)

# Correct: Preserve case sensitivity
def numJewelsInStones(jewels, stones):
    jewel_set = set(jewels)
    return sum(1 for stone in stones if stone in jewel_set)
```

### Mistake 2: Inefficient String Search
```python
# Wrong: O(m × n) - searches jewels string for each stone
def numJewelsInStones(jewels, stones):
    count = 0
    for stone in stones:
        if stone in jewels:  # String search is O(m)
            count += 1
    return count

# Better: Convert to set first for O(1) lookup
jewel_set = set(jewels)
count = sum(1 for stone in stones if stone in jewel_set)
```

### Mistake 3: Counting Jewels Instead of Stones
```python
# Wrong: Counts how many jewel types appear in stones
def numJewelsInStones(jewels, stones):
    stone_set = set(stones)
    return sum(1 for jewel in jewels if jewel in stone_set)

# Correct: Count how many stones are jewels
jewel_set = set(jewels)
return sum(1 for stone in stones if stone in jewel_set)
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Most Valuable Stone Type | Easy | Return the jewel type that appears most frequently in stones. |
| Weighted Jewels | Medium | Each jewel type has a value. Return total value of all jewels in stones. |
| Stone Replacement | Medium | Replace all non-jewel stones with a placeholder character. |
| K Most Common Jewels | Medium | Find the k jewel types that appear most often in stones. |
| Case-Insensitive Jewels | Easy | Treat 'a' and 'A' as the same jewel type. |

## Practice Checklist

- [ ] First attempt (no hints)
- [ ] Solved with brute force approach
- [ ] Optimized to O(m + n) with hash set
- [ ] Handled edge case: no jewels in stones (count = 0)
- [ ] Handled edge case: all stones are jewels
- [ ] Handled edge case: empty jewels string
- [ ] Verified case sensitivity ('a' != 'A')
- [ ] Review after 24 hours
- [ ] Review after 1 week
- [ ] Can explain approach to someone else

**Strategy**: See [Hash Table Patterns](../strategies/data-structures/hash-table.md)
