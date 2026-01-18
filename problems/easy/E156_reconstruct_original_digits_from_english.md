---
id: E156
old_id: I222
slug: reconstruct-original-digits-from-english
title: Reconstruct Original Digits from English
difficulty: easy
category: easy
topics: ["string", "hash-table", "greedy"]
patterns: ["counting", "greedy-elimination"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E164", "E159", "M001"]
prerequisites: ["hash-map-basics", "string-manipulation"]
strategy_ref: ../strategies/patterns/greedy.md
---
# Reconstruct Original Digits from English

## Problem

Imagine someone wrote down the English words for several digits ("zero", "one", "two", etc.), then scrambled all the letters together into a single jumbled string. Your task is to figure out which digits were originally written and return them in ascending order.

You're given a string `s` containing letters from digit words. These letters are completely scrambled and out of order. For example, the input might contain the letters "owoztneoer", which could come from scrambling "zero", "one", and "two" together.

Here's the key insight: certain letters appear in only one digit's word. The letter 'z' appears only in "zero", 'w' only in "two", 'u' only in "four", 'x' only in "six", and 'g' only in "eight". This gives you a foothold to start identifying digits. After removing those unique letters, other letters become unique among what remains, creating a cascading elimination strategy.

The input is guaranteed to be valid, meaning it's always possible to reconstruct some set of digits from the given letters.

## Why This Matters

This problem demonstrates greedy elimination through unique identifiers, a technique widely used in data recovery, error correction, and constraint satisfaction problems. In real systems, you might need to reconstruct corrupted database records by identifying unique field markers, decode multiplexed signals by extracting unique frequency signatures, or resolve dependencies in build systems where some components have unique requirements. The pattern of processing items in order of uniqueness (handling the most constrained choices first) appears in scheduling algorithms, resource allocation, and compiler optimization. This is also an excellent introduction to frequency counting with hash maps, which is fundamental to text analysis, pattern matching, and natural language processing applications.

## Examples

**Example 1:**
- Input: `s = "owoztneoer"`
- Output: `"012"`

**Example 2:**
- Input: `s = "fviefuro"`
- Output: `"45"`

## Constraints

- 1 <= s.length <= 10⁵
- s[i] is one of the characters ["e","g","f","i","h","o","n","s","r","u","t","w","v","x","z"].
- s is **guaranteed** to be valid.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Frequency Map with Unique Characters
**Hint**: Some digits have unique letters. For example, 'z' only appears in "zero", 'w' only in "two", 'u' only in "four", etc.

**Key Ideas**:
- Count frequency of all characters
- Identify digits with unique characters first (0,2,4,6,8)
- Remove those character counts and identify semi-unique digits (3,5,7)
- Finally identify remaining digits (1,9)

**Why This Works**: By processing digits in order of uniqueness, you can eliminate ambiguity.

### Intermediate Approach - Greedy Elimination Strategy
**Hint**: Process digits in a specific order where each digit has at least one character that's currently unique among remaining possibilities.

**Optimization**:
- Order: z(0) -> w(2) -> u(4) -> x(6) -> g(8) -> h(3) -> f(5) -> s(7) -> i(1) -> n(9)
- After identifying a digit, subtract its character counts from the frequency map
- This ensures each step has a unique identifier

**Trade-off**: Requires understanding the dependency chain but leads to cleaner implementation.

### Advanced Approach - Mathematical Character Counting
**Hint**: Use the fact that certain characters uniquely identify digits even after other digits are removed.

**Key Insight**:
- Unique letters: z,w,u,x,g identify 0,2,4,6,8 directly
- After removing above: h,f,s become unique for 3,5,7
- After removing above: i,n become unique for 1,9
- This creates three tiers of identification

**Why This is Optimal**: O(n) time with single pass character counting, O(1) space for fixed alphabet.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (Try all permutations) | O(10! * n) | O(n) | Impossibly slow, not practical |
| Frequency Map Basic | O(n) | O(1) | Count chars, 26-letter alphabet = constant space |
| Greedy Elimination | O(n) | O(1) | Single pass counting, ordered extraction |
| Optimal Character Tiering | O(n) | O(1) | Same complexity but cleaner logic |

## Common Mistakes

### Mistake 1: Processing digits in wrong order
```
# WRONG - Trying to identify 'one' before removing 'zero', 'two', 'four'
count_frequency(s)
if freq['o'] >= 1:
    # 'o' appears in zero, one, two, four - ambiguous!
```
**Why it fails**: Characters like 'o', 'n', 'e' appear in multiple digit words, causing incorrect counting.

**Correct approach**: Always process digits with unique characters first, then semi-unique, then remaining.

### Mistake 2: Forgetting to update counts after extraction
```
# WRONG - Not subtracting character counts
freq = count_chars(s)
result = []
if freq['z'] > 0:
    result.append('0')
# Missing: subtract 'z', 'e', 'r', 'o' counts
if freq['n'] > 0:  # 'n' count is still polluted by 'zero'
```
**Why it fails**: Character counts remain inflated by already-identified digits.

**Correct approach**: After identifying each digit, subtract all its character counts from the frequency map.

### Mistake 3: Not handling multiple occurrences
```
# WRONG - Only checking if character exists
if 'z' in s:
    result.append('0')  # Only adds one zero, even if multiple exist
```
**Why it fails**: Ignores that digits can appear multiple times.

**Correct approach**: Use character frequency count, not just presence check.

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Reconstruct from Foreign Language | Digit words in different language with different unique chars | Medium |
| Minimum Operations to Reconstruct | Count how many characters need to be added/removed | Medium |
| Partial String Recovery | Some characters are missing, find possible digits | Hard |
| Reconstruct with Constraints | Some digits must appear before others | Hard |
| Multiple Valid Reconstructions | Return all possible digit combinations | Hard |

## Practice Checklist

Track your progress as you master this problem:

- [ ] **Day 1**: Solve with hash map approach (allow 30+ mins)
- [ ] **Day 2**: Implement greedy elimination with correct ordering
- [ ] **Day 3**: Code without looking at solution (aim for 15 mins)
- [ ] **Week 2**: Re-solve and optimize to single-pass O(n)
- [ ] **Week 4**: Teach the unique character identification strategy to someone
- [ ] **Week 8**: Speed drill - solve in under 10 minutes

**Strategy**: See [Greedy Patterns](../strategies/patterns/greedy.md) for systematic greedy elimination techniques.
