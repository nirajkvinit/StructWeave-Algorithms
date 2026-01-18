---
id: M375
old_id: A215
slug: shortest-completing-word
title: Shortest Completing Word
difficulty: medium
category: medium
topics: ["array", "string", "hash-table"]
patterns: ["frequency-count", "string-matching"]
estimated_time_minutes: 30
frequency: low
related_problems:
  - id: E210
    title: Valid Anagram
    difficulty: easy
  - id: M030
    title: Find All Anagrams in a String
    difficulty: medium
  - id: M076
    title: Minimum Window Substring
    difficulty: medium
prerequisites:
  - Hash Map/Frequency Counting
  - String Processing
  - Character Comparison
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Shortest Completing Word

## Problem

Imagine you're building a word game based on license plates. Given a license plate string `licensePlate` and an array of candidate words, find the shortest word that "completes" the license plate by containing all its letters.

A completing word must include every letter from the license plate with at least the same frequency (count). However, the license plate contains noise: you must ignore all digits (0-9) and spaces, and treat letters case-insensitively. Only the alphabetic characters matter.

For example, given `licensePlate = "1s3 PSt"`:
- Extract only letters: 's', 'P', 'S', 't'
- Convert to lowercase: 's', 'p', 's', 't'
- Count frequencies: 's' appears 2 times, 'p' appears 1 time, 't' appears 1 time
- A completing word must contain at least 2 's', 1 'p', and 1 't' (in any order, possibly with extra letters)

Your task: return the shortest word from the `words` array that satisfies this requirement. If multiple words tie for shortest length, return the one that appears first in the array. The problem guarantees at least one valid answer exists.

Example completing words for "1s3 PSt": "steps" (has s, t, e, p, s), "stepple" (has s, t, e, p, p, l, e), but NOT "step" (only has one 's', needs two).

The challenge lies in efficiently comparing character frequencies between the license plate and each candidate word, while handling the case-insensitive requirement and ignoring non-alphabetic characters.

## Why This Matters

This problem teaches frequency counting with hash maps, a pattern that appears in anagram detection, spell checking, DNA sequence analysis, and plagiarism detection systems. The character frequency comparison technique is fundamental to substring search algorithms (like finding all anagrams in a string) and forms the basis for more complex problems like minimum window substring. Understanding how to efficiently preprocess strings by filtering and normalizing characters is essential for text processing in search engines, data validation, and natural language processing. Many companies working with text data ask variations of this problem to test your ability to handle string manipulation and hash map operations.

## Examples

**Example 1:**
- Input: `licensePlate = "1s3 PSt", words = ["step","steps","stripe","stepple"]`
- Output: `"steps"`
- Explanation: After filtering out digits and normalizing case, licensePlate requires: 's' twice, 'p' once, 't' once.
Analyzing candidates: "step" has only one 's' (insufficient), "steps" has all required letters with correct frequencies, "stripe" lacks a second 's', "stepple" also lacks a second 's'.
Only "steps" satisfies all requirements.

**Example 2:**
- Input: `licensePlate = "1s3 456", words = ["looks","pest","stew","show"]`
- Output: `"pest"`
- Explanation: The license plate requires only the letter 's' once. Multiple words qualify: "pest", "stew", and "show" all contain 's' and have equal length. We return "pest" since it appears first in the array.

## Constraints

- 1 <= licensePlate.length <= 7
- licensePlate contains digits, letters (uppercase or lowercase), or space ' '.
- 1 <= words.length <= 1000
- 1 <= words[i].length <= 15
- words[i] consists of lower case English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Extract and Count Required Characters</summary>

First, preprocess the license plate to extract only the letters (ignoring digits and spaces) and convert everything to lowercase for case-insensitive comparison.

Build a frequency map (counter) for the required characters:
```python
from collections import Counter
plate_letters = [c.lower() for c in licensePlate if c.isalpha()]
required = Counter(plate_letters)
```

For `"1s3 PSt"`, this gives you `{'s': 2, 'p': 1, 't': 1}`.

</details>

<details>
<summary>Hint 2: Check if a Word is Completing</summary>

For each word in the words array, build its character frequency map and check if it satisfies the requirement.

A word is completing if for every character in `required`, the word has at least that many occurrences:

```python
def is_completing(word, required):
    word_count = Counter(word)
    for char, count in required.items():
        if word_count[char] < count:
            return False
    return True
```

Alternatively, using Counter subtraction: `required - word_count` should be empty.

</details>

<details>
<summary>Hint 3: Track the Shortest Valid Word</summary>

Iterate through all words, checking each one. Track the shortest completing word found so far:

```python
shortest = None
for word in words:
    if is_completing(word, required):
        if shortest is None or len(word) < len(shortest):
            shortest = word
return shortest
```

Since the problem guarantees a solution exists, you don't need to handle the case where no word qualifies.

The order of iteration ensures that when lengths are equal, we keep the first occurrence.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (char by char) | O(n * m * k) | O(1) | n=words, m=word length, k=plate length |
| Hash Map Frequency | O(p + n * m) | O(26) = O(1) | p=plate length, n=words, m=avg word length |
| Optimized with Early Exit | O(p + n * m) | O(1) | Same but faster in practice |
| Sort Words First | O(n log n + n * m) | O(1) | Sort by length, find first valid |

## Common Mistakes

### Mistake 1: Not Handling Case Sensitivity
```python
# Wrong: Case-sensitive comparison
def shortestCompletingWord(licensePlate, words):
    required = Counter(c for c in licensePlate if c.isalpha())
    # licensePlate has 'P', 'S', 't' - doesn't match lowercase words
    for word in words:
        if all(Counter(word)[char] >= count for char, count in required.items()):
            return word
```

**Fix:** Convert to lowercase:
```python
# Correct: Case-insensitive
required = Counter(c.lower() for c in licensePlate if c.isalpha())
```

### Mistake 2: Not Filtering Digits and Spaces
```python
# Wrong: Including non-alphabetic characters
def shortestCompletingWord(licensePlate, words):
    required = Counter(licensePlate.lower())
    # This counts spaces and digits!
    # required = {' ': 1, '1': 1, 's': 2, '3': 1, 'p': 1, 't': 1}
```

**Fix:** Filter to only letters:
```python
# Correct: Only alphabetic characters
required = Counter(c.lower() for c in licensePlate if c.isalpha())
```

### Mistake 3: Not Tracking Shortest Correctly
```python
# Wrong: Returning first completing word instead of shortest
def shortestCompletingWord(licensePlate, words):
    required = Counter(c.lower() for c in licensePlate if c.isalpha())
    for word in words:
        word_count = Counter(word)
        if all(word_count[c] >= required[c] for c in required):
            return word  # Returns first, not shortest!
```

**Fix:** Track the shortest:
```python
# Correct: Track minimum length
result = None
for word in words:
    if is_completing(word, required):
        if result is None or len(word) < len(result):
            result = word
return result
```

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| All Completing Words | Return all words that complete the license plate | Easy |
| K Shortest Completing Words | Return the K shortest completing words | Medium |
| Completing Word with Wildcards | License plate can have wildcard characters | Hard |
| Most Efficient Completing Word | Minimize excess characters beyond requirements | Medium |
| Anagram Detection | Check if word is exact anagram (no extra chars) | Easy |

## Practice Checklist

- [ ] First attempt (within 30 minutes)
- [ ] Implement character frequency counting
- [ ] Handle case-insensitivity correctly
- [ ] Filter non-alphabetic characters properly
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Can explain Counter usage and alternatives
- [ ] Attempted Minimum Window Substring variation

**Strategy**: See [String Matching Pattern](../strategies/patterns/two-pointers.md)
