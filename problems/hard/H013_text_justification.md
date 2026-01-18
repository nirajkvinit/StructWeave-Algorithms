---
id: H013
old_id: F068
slug: text-justification
title: Text Justification
difficulty: hard
category: hard
topics: ["array", "string", "two-pointers", "greedy"]
patterns: []
estimated_time_minutes: 45
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Text Justification

## Problem

Format text into lines of specified width with full justification.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `words = ["This", "is", "an", "example", "of", "text", "justification."], maxWidth = 16`
- Output: `[
   "This    is    an",
   "example  of text",
   "justification.  "
]`

**Example 2:**
- Input: `words = ["What","must","be","acknowledgment","shall","be"], maxWidth = 16`
- Output: `[
  "What   must   be",
  "acknowledgment  ",
  "shall be        "
]`
- Explanation: Note that the last line is "shall be    " instead of "shall     be", because the last line must be left-justified instead of fully-justified.
Note that the second line is also left-justified because it contains only one word.

**Example 3:**
- Input: `words = ["Science","is","what","we","understand","well","enough","to","explain","to","a","computer.","Art","is","everything","else","we","do"], maxWidth = 20`
- Output: `[
  "Science  is  what we",
  "understand      well",
  "enough to explain to",
  "a  computer.  Art is",
  "everything  else  we",
  "do                  "
]`

## Constraints

- 1 <= words.length <= 300
- 1 <= words[i].length <= 20
- words[i] consists of only English letters and symbols.
- 1 <= maxWidth <= 100
- words[i].length <= maxWidth

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

**Strategy**: See [Array Pattern](../strategies/patterns/two-pointers.md)

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

This is primarily a simulation problem with careful edge case handling. The key insight is to process words greedily: fit as many words as possible on each line without exceeding maxWidth. The tricky parts are: (1) distributing spaces evenly between words (leftmost gaps get extra spaces), (2) left-justifying the last line, and (3) handling single-word lines.

</details>

<details>
<summary>🎯 Main Approach</summary>

Process words in groups that fit on one line. For each line: calculate total character count, determine how many spaces are needed, and distribute them. If multiple words exist, divide spaces evenly with remainder going to leftmost gaps. For the last line or single-word lines, left-justify (one space between words, remaining spaces at the end). Build each line carefully as a string.

</details>

<details>
<summary>⚡ Optimization Tip</summary>

Use a helper function to justify a line given the words that belong on it. Separate the logic for: (1) determining which words go on the current line, (2) full justification (middle lines with multiple words), (3) left justification (last line or single word). Calculate spaces as: total_spaces = maxWidth - sum(word_lengths), spaces_between_gaps = total_spaces // (num_words - 1), extra_spaces = total_spaces % (num_words - 1).

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Greedy Simulation | O(n) | O(n) | n = total characters in all words |
| Optimal | O(n) | O(n) | Single pass through words, build result |

## Common Mistakes

1. **Not distributing extra spaces correctly**
   ```python
   # Wrong: Putting all extra spaces at the end
   spaces_per_gap = total_spaces // num_gaps
   line = ' '.join(words, ' ' * spaces_per_gap)
   line += ' ' * (total_spaces % num_gaps)

   # Correct: Distribute extra spaces to leftmost gaps
   spaces_per_gap = total_spaces // num_gaps
   extra_spaces = total_spaces % num_gaps

   result = []
   for i, word in enumerate(words[:-1]):
       result.append(word)
       result.append(' ' * spaces_per_gap)
       if i < extra_spaces:  # Give extra space to left gaps
           result.append(' ')
   result.append(words[-1])
   ```

2. **Forgetting last line is left-justified**
   ```python
   # Wrong: Fully justifying the last line
   def justify_line(words, maxWidth):
       # Same logic for all lines...
       return distribute_spaces_evenly(words, maxWidth)

   # Correct: Special case for last line
   def justify_line(words, maxWidth, is_last_line):
       if is_last_line or len(words) == 1:
           # Left justify: single space between words
           line = ' '.join(words)
           return line + ' ' * (maxWidth - len(line))
       else:
           # Full justify: distribute spaces evenly
           return distribute_spaces_evenly(words, maxWidth)
   ```

3. **Not handling single-word lines properly**
   ```python
   # Wrong: Dividing by zero when calculating space distribution
   spaces_per_gap = total_spaces // (len(words) - 1)  # Error if len(words) == 1!

   # Correct: Handle single word case separately
   if len(words) == 1:
       return words[0] + ' ' * (maxWidth - len(words[0]))

   num_gaps = len(words) - 1
   spaces_per_gap = total_spaces // num_gaps
   extra_spaces = total_spaces % num_gaps
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Reorder Data in Log Files | Easy | Simpler string formatting and sorting |
| Zigzag Conversion | Medium | Different string arrangement pattern |
| String Compression | Easy | Format strings with counts |
| Word Wrap (Dynamic Programming) | Hard | Minimize raggedness instead of full justification |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (last line, single word, exact fit)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [String Manipulation](../../strategies/patterns/string-manipulation.md)
