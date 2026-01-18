---
id: M134
old_id: I117
slug: maximum-product-of-word-lengths
title: Maximum Product of Word Lengths
difficulty: medium
category: medium
topics: ["string"]
patterns: []
estimated_time_minutes: 30
frequency: medium
related_problems: ["E136", "M079", "M134"]
prerequisites: ["bit-manipulation", "hash-set", "string-processing"]
---
# Maximum Product of Word Lengths

## Problem

You're given an array of strings called `words`, and your challenge is to find two words that share no common letters and have the maximum possible product of their lengths. In other words, you need to find `length(word[i]) * length(word[j])` where words `i` and `j` are completely disjoint in terms of their character sets.

Let's unpack what "no letters in common" means. Two words share no letters if their character sets don't overlap at all. For example, "abc" and "def" share no letters (disjoint sets), while "abc" and "bcd" share letters 'b' and 'c' (not disjoint). You're looking for the pair of words with no overlap that, when you multiply their lengths together, gives you the largest possible product. For instance, if you have words "abcw" (length 4) and "xtfn" (length 4), and they share no common letters, their product would be 4 × 4 = 16. The naive approach would compare every possible pair of words, checking character by character whether they share any letters, but with potentially 1000 words and each word up to 1000 characters long, this becomes very slow. The key insight is that you can preprocess each word's character set into a compact representation that allows for instant comparison between any two words. If no valid pair exists (for example, if all words contain the letter 'a'), return 0.

## Why This Matters

This problem teaches bit manipulation, an essential technique for optimizing space and time in many algorithms. In systems programming, bit manipulation enables efficient flag storage, permission systems (like Unix file permissions), and network packet processing. Compilers use bit vectors to track which variables are live at each program point during optimization passes. Database systems use bitmap indexes for fast query processing when filtering on multiple attributes. The specific pattern here, using bitmasks to represent sets for fast intersection checks, appears frequently: spell checkers might use it to quickly filter dictionary words, search engines use similar techniques for query matching, and game engines use bit fields to track entity states efficiently. Beyond the immediate application, you're learning to think about data representation, recognizing that choosing the right way to encode information (here, a 26-bit integer instead of a hash set) can transform an algorithm's performance. This mindset of "what's the most compact, efficient representation for this data?" is valuable across all areas of software engineering.

## Examples

**Example 1:**
- Input: `words = ["abcw","baz","foo","bar","xtfn","abcdef"]`
- Output: `16`
- Explanation: Selecting "abcw" and "xtfn" yields the maximum product.

**Example 2:**
- Input: `words = ["a","ab","abc","d","cd","bcd","abcd"]`
- Output: `4`
- Explanation: The optimal pair is "ab" and "cd".

**Example 3:**
- Input: `words = ["a","aa","aaa","aaaa"]`
- Output: `0`
- Explanation: Every word shares the letter 'a', so no valid pair exists.

## Constraints

- The array contains between 2 and 1000 words
- Each word has length between 1 and 1000
- All words contain only lowercase English letters

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Efficient Character Comparison</summary>

The naive approach checks every pair of words and compares character sets, which is O(n² × L) where L is average word length. Can you preprocess each word's character set for O(1) comparison? Think about representing each word's character set as a compact data structure.
</details>

<details>
<summary>🎯 Hint 2: Bit Manipulation Representation</summary>

Use a bitmask to represent each word's character set. Since there are only 26 lowercase letters, use a 26-bit integer where bit i indicates if character ('a' + i) exists. Two words share no common characters if their bitmasks have bitwise AND = 0. This reduces comparison to O(1).
</details>

<details>
<summary>📝 Hint 3: Implementation Strategy</summary>

Algorithm:
1. Preprocess: for each word, create bitmask
   - For word "abc": mask = (1<<0) | (1<<1) | (1<<2) = 7
2. Compare all pairs: if mask[i] & mask[j] == 0, they share no letters
3. Track maximum product: max(len[i] × len[j])

Optimization: Sort words by length descending for early termination.

Time: O(n×L + n²), Space: O(n)
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Set Comparison) | O(n²×L) | O(1) | L = avg word length |
| **Bitmask Preprocessing** | **O(n×L + n²)** | **O(n)** | **Optimal approach** |
| Bitmask + Sorting | O(n×L + n² log n) | O(n) | Early termination possible |
| Hash Map Deduplication | O(n×L + unique²) | O(n) | Skip duplicate bitmasks |

## Common Mistakes

### Mistake 1: Repeated Character Set Calculation

```python
# WRONG: Recalculating character sets for each comparison
def maxProduct(words):
    max_prod = 0

    for i in range(len(words)):
        for j in range(i + 1, len(words)):
            # Inefficient: creating sets every time
            set_i = set(words[i])
            set_j = set(words[j])
            if not set_i & set_j:  # O(min(|set_i|, |set_j|))
                max_prod = max(max_prod, len(words[i]) * len(words[j]))

    return max_prod
```

```python
# CORRECT: Precompute bitmasks
def maxProduct(words):
    n = len(words)
    masks = [0] * n

    # Precompute bitmasks O(n×L)
    for i, word in enumerate(words):
        for char in word:
            masks[i] |= 1 << (ord(char) - ord('a'))

    max_prod = 0
    # Compare pairs O(n²) with O(1) comparison
    for i in range(n):
        for j in range(i + 1, n):
            if masks[i] & masks[j] == 0:  # O(1) bitwise AND
                max_prod = max(max_prod, len(words[i]) * len(words[j]))

    return max_prod
```

### Mistake 2: Not Handling Duplicate Words Efficiently

```python
# WRONG: Processing duplicate bitmasks separately
def maxProduct(words):
    masks = []
    for word in words:
        mask = 0
        for char in word:
            mask |= 1 << (ord(char) - ord('a'))
        masks.append(mask)

    # Could have multiple words with same mask but different lengths
    # Not optimized for this case
```

```python
# CORRECT: Track maximum length for each bitmask
def maxProduct(words):
    # Map bitmask to maximum word length with that mask
    mask_to_len = {}

    for word in words:
        mask = 0
        for char in word:
            mask |= 1 << (ord(char) - ord('a'))
        # Keep only the longest word for each bitmask
        mask_to_len[mask] = max(mask_to_len.get(mask, 0), len(word))

    max_prod = 0
    masks = list(mask_to_len.items())

    for i in range(len(masks)):
        for j in range(i + 1, len(masks)):
            if masks[i][0] & masks[j][0] == 0:
                max_prod = max(max_prod, masks[i][1] * masks[j][1])

    return max_prod
```

### Mistake 3: Incorrect Bitmask Construction

```python
# WRONG: Setting all bits for each character occurrence
def maxProduct(words):
    masks = []
    for word in words:
        mask = 0
        for char in word:
            mask += 1 << (ord(char) - ord('a'))  # Wrong: should be |= not +=
        masks.append(mask)
```

```python
# CORRECT: Use bitwise OR to set bits
def maxProduct(words):
    masks = []
    for word in words:
        mask = 0
        for char in word:
            mask |= 1 << (ord(char) - ord('a'))  # Bitwise OR
        masks.append(mask)

    max_prod = 0
    for i in range(len(masks)):
        for j in range(i + 1, len(masks)):
            if masks[i] & masks[j] == 0:
                max_prod = max(max_prod, len(words[i]) * len(words[j]))

    return max_prod
```

## Variations

| Variation | Description | Key Difference |
|-----------|-------------|----------------|
| Minimum Product | Find minimum instead of maximum | Same algorithm, track min |
| K Words | Find k words with no common chars | Extend to k-way comparison |
| Character Limit | Words can share at most k characters | Modify bitmask comparison |
| Weighted Characters | Different characters have weights | Use weighted bitmask |
| Case-Sensitive | Include uppercase letters | Use 52-bit mask |
| Unicode Characters | Support non-ASCII | Use hash set instead of bitmask |

## Practice Checklist

- [ ] Day 1: Implement bitmask solution
- [ ] Day 2: Optimize with hash map deduplication
- [ ] Day 3: Solve without hints
- [ ] Day 7: Compare bitmask vs set performance
- [ ] Day 14: Speed test - solve in 15 minutes
- [ ] Day 30: Explain bit manipulation to someone

**Strategy**: See [Bit Manipulation Patterns](../strategies/patterns/bit-manipulation.md)
