---
id: M181
old_id: I217
slug: sentence-screen-fitting
title: Sentence Screen Fitting
difficulty: medium
category: medium
topics: ["string", "simulation", "optimization"]
patterns: ["simulation", "modulo-arithmetic"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E058", "M418", "E806"]
prerequisites: ["string-manipulation", "modulo-arithmetic"]
---
# Sentence Screen Fitting

## Problem

Imagine you're building a text display system for a digital screen with specific dimensions (measured in `rows` by `cols` characters). You have a sentence composed of multiple words stored as an array of strings, and your goal is to calculate how many complete instances of this sentence can fit on the screen. Think of this like an old-school ticker display that repeatedly shows the same message. The sentence repeats continuously, filling the screen from top-left to bottom-right. Each word must appear in its original sequence and cannot be split across multiple lines. Adjacent words on the same line must be separated by exactly one space. For example, if your screen is 2 rows by 8 columns and your sentence is `["hello", "world"]`, the display would look like: `hello---` on row 1 and `world---` on row 2, fitting exactly 1 complete sentence. The challenge becomes interesting when words are shorter or the screen is larger, as you need to efficiently calculate how many times the entire sentence repeats without simulating every single character placement. Edge cases to consider include when a single word is longer than the screen width (making zero sentences possible) and when the sentence fits perfectly with no wasted space.

## Why This Matters

This problem models real-world text rendering scenarios found in embedded systems, digital signage, terminal emulators, and text editors with fixed-width displays. When developing console applications or embedded device interfaces with character-based displays (like LCD screens or LED matrices), you need efficient algorithms to calculate text layout without iterating through every character, especially when dealing with large screens or long-running displays. The optimization techniques you'll learn here, particularly using modulo arithmetic and precomputation to identify repeating patterns, are applicable to many cyclical simulation problems. This appears in text justification engines, subtitle rendering systems, and even game development where repeating patterns need to be calculated efficiently. The problem also strengthens your ability to identify when brute force simulation becomes inefficient and how to leverage pattern recognition to achieve better time complexity.

## Examples

**Example 1:**
- Input: `sentence = ["hello","world"], rows = 2, cols = 8`
- Output: `1`
- Explanation: hello---
world---
Empty positions are shown with the '-' character.

**Example 2:**
- Input: `sentence = ["a", "bcd", "e"], rows = 3, cols = 6`
- Output: `2`
- Explanation: a-bcd-
e-a---
bcd-e-
Empty positions are shown with the '-' character.

**Example 3:**
- Input: `sentence = ["i","had","apple","pie"], rows = 4, cols = 5`
- Output: `1`
- Explanation: i-had
apple
pie-i
had--
Empty positions are shown with the '-' character.

## Constraints

- 1 <= sentence.length <= 100
- 1 <= sentence[i].length <= 10
- sentence[i] consists of lowercase English letters.
- 1 <= rows, cols <= 2 * 10⁴

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Simulate row by row, but optimize</summary>

The brute force approach is to simulate placing words row by row. However, with up to 20,000 rows, this can be slow. The key optimization is recognizing that the pattern of which word starts each row will eventually repeat. Use memoization or precomputation to avoid recalculating.
</details>

<details>
<summary>🎯 Hint 2: Precompute how many words fit starting from each word</summary>

For each word position in the sentence, precompute how many words can fit on a single row if that word is the first word on the row. Store this in an array. Then, for each row, look up the precomputed value, update the current word index, and count completed sentences.
</details>

<details>
<summary>📝 Hint 3: Use modulo for sentence wrapping</summary>

```
1. Precompute for each word index i:
   - How many words fit on a row starting at word i
   - Next word index after filling the row
2. For each row:
   - Look up precomputed values for current word index
   - Add to completed sentence count
   - Update current word index (with modulo for wrapping)
3. Return total completed sentences

Optimization: If word_index repeats, you've found a cycle
```
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Optimized Simulation | O(rows + n) | O(n) | n = sentence length, precompute once |
| Brute Force Simulation | O(rows × cols) | O(1) | Too slow for large inputs |
| String Concatenation | O(rows × total_length) | O(total_length) | Create one long string approach |

## Common Mistakes

### Mistake 1: Simulating character by character

```python
# Wrong: Too slow for large inputs
def sentence_fitting_wrong(sentence, rows, cols):
    count = 0
    word_idx = 0
    for row in range(rows):
        col = 0
        while col < cols:
            word = sentence[word_idx]
            if col + len(word) <= cols:
                col += len(word) + 1  # word + space
                word_idx += 1
                if word_idx == len(sentence):
                    count += 1
                    word_idx = 0
            else:
                break
    return count
```

```python
# Correct: Precompute to avoid repeated calculations
def sentence_fitting_correct(sentence, rows, cols):
    n = len(sentence)
    # Precompute: for each word, how many words fit and next word index
    next_word = [0] * n
    word_count = [0] * n

    for i in range(n):
        length = 0
        count = 0
        idx = i
        while length + len(sentence[idx % n]) <= cols:
            length += len(sentence[idx % n]) + 1
            count += 1
            idx += 1
        next_word[i] = idx % n
        word_count[i] = count

    total = 0
    word_idx = 0
    for _ in range(rows):
        total += word_count[word_idx]
        word_idx = next_word[word_idx]

    return total // n
```

### Mistake 2: Incorrect space handling

```python
# Wrong: Not accounting for trailing space or edge cases
def fit_words_wrong(sentence, cols):
    # Missing: what if last word fills exactly to cols?
    # Missing: space between words handling
    pass
```

```python
# Correct: Careful space handling
def fit_words_correct(sentence, cols):
    length = 0
    count = 0
    idx = 0
    n = len(sentence)

    while True:
        word = sentence[idx % n]
        # Check if word fits
        if length + len(word) <= cols:
            length += len(word)
            if length < cols:  # Add space only if not at end
                length += 1
            count += 1
            idx += 1
        else:
            break

    return count, idx % n
```

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Text Justification | Hard | Fully justify text within width constraint - E058 |
| Split Array Largest Sum | Hard | Similar optimization with grouping constraint |
| Sentence Screen Fitting II | Hard | Allow word breaking across lines |
| Minimum Lines to Fit Text | Medium | Find minimum rows needed |

## Practice Checklist

- [ ] Day 1: Solve using precomputation approach (30-40 min)
- [ ] Day 2: Implement brute force first, then optimize (35 min)
- [ ] Day 7: Re-solve focusing on edge cases (cols < word length) (25 min)
- [ ] Day 14: Compare with Text Justification problem (20 min)
- [ ] Day 30: Explain the cycle detection optimization (10 min)

**Strategy**: See [Simulation Pattern](../strategies/patterns/simulation.md)
