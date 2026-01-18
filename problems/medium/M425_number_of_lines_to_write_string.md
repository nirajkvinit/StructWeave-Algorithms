---
id: M425
old_id: A273
slug: number-of-lines-to-write-string
title: Number of Lines To Write String
difficulty: medium
category: medium
topics: ["string"]
patterns: []
estimated_time_minutes: 30
---
# Number of Lines To Write String

## Problem

You're writing a string `s` across multiple lines, where each character occupies a specific width measured in pixels. The width of each lowercase letter is provided in an array `widths` of length 26, where `widths[0]` is the pixel width of 'a', `widths[1]` is the width of 'b', and so on through `widths[25]` for 'z'.

Each line has a maximum capacity of exactly 100 pixels. You fill each line from left to right with characters from the string. When adding the next character would cause the current line to exceed 100 pixels, you must move to a new line and place that character there instead. Continue this process until you've written all characters.

Think of it like typing on paper with a fixed line width. For example, if the current line has 95 pixels used and the next character is 8 pixels wide, you can't fit it on the current line (95 + 8 = 103 > 100), so you start a new line with that character.

Return a 2-element array with:
- `result[0]`: The total number of lines used
- `result[1]`: The number of pixels occupied on the final (last) line

## Why This Matters

This simulation problem models text rendering and layout engines used in word processors, web browsers, and terminal applications. The concept of tracking line breaks based on content width appears in typography systems, pagination algorithms, and UI text wrapping. While the problem itself is straightforward, it builds your ability to handle state-based simulation and boundary conditions, which are common in event-driven systems, game development, and real-time data processing. The pattern of tracking current state and deciding when to reset is fundamental to many iterative algorithms.

## Examples

**Example 1:**
- Input: `widths = [10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10], s = "abcdefghijklmnopqrstuvwxyz"`
- Output: `[3,60]`
- Explanation: The string is distributed across lines as:
abcdefghij  // 100 pixels wide
klmnopqrst  // 100 pixels wide
uvwxyz      // 60 pixels wide
Result: 3 total lines with the final line using 60 pixels.

**Example 2:**
- Input: `widths = [4,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10], s = "bbbcccdddaaa"`
- Output: `[2,4]`
- Explanation: The layout becomes:
bbbcccdddaa  // 98 pixels wide
a            // 4 pixels wide
Result: 2 total lines with the final line using 4 pixels.

## Constraints

- widths.length == 26
- 2 <= widths[i] <= 10
- 1 <= s.length <= 1000
- s contains only lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
This is a simple simulation problem. Process characters one by one, tracking the current line's width. When adding a character would exceed 100 pixels, move to a new line and place the character there. Keep a count of total lines and the width of the current line.
</details>

<details>
<summary>Main Approach</summary>
Initialize line count to 1 and current width to 0. For each character in the string, get its width from the widths array using ord(char) - ord('a') as the index. If adding this character would make current width exceed 100, increment line count and reset current width to 0. Then add the character's width to current width. Return [line count, current width].
</details>

<details>
<summary>Optimization Tip</summary>
This problem is already O(n) and optimal. The only minor optimization is using widths[ord(char) - ord('a')] directly instead of creating a character-to-width dictionary, which saves O(26) space and lookup time. Make sure to check if current_width + char_width > 100 before adding, not current_width > 100 after adding.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Simulation | O(n) | O(1) | n = length of string, process each char once |
| Optimal | O(n) | O(1) | Same, already optimal |

## Common Mistakes

1. **Incorrect line break logic**
   ```python
   # Wrong: Checking after adding the character
   current_width += widths[ord(char) - ord('a')]
   if current_width > 100:
       lines += 1
       current_width = widths[ord(char) - ord('a')]

   # Correct: Check before adding
   char_width = widths[ord(char) - ord('a')]
   if current_width + char_width > 100:
       lines += 1
       current_width = 0
   current_width += char_width
   ```

2. **Not initializing line count correctly**
   ```python
   # Wrong: Starting with 0 lines
   lines = 0
   current_width = 0

   # Correct: Start with 1 line (we're always on at least one line)
   lines = 1
   current_width = 0
   ```

3. **Off-by-one error in character indexing**
   ```python
   # Wrong: Incorrect index calculation
   width = widths[ord(char)]

   # Correct: Subtract ord('a') to get 0-25 range
   width = widths[ord(char) - ord('a')]
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Text Justification | Hard | Must justify text to exactly 100 pixels per line |
| Word Break | Medium | Break string into valid dictionary words |
| Sentence Screen Fitting | Medium | Fit sentence repeatedly on screen with line breaks |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days
