---
id: M384
old_id: A225
slug: bold-words-in-string
title: Bold Words in String
difficulty: medium
category: medium
topics: ["array", "string"]
patterns: ["backtrack-combination"]
estimated_time_minutes: 30
---
# Bold Words in String

## Problem

Imagine highlighting search results in a document. Given a list of keywords and a text string, you need to wrap every occurrence of each keyword with HTML bold tags (`<b>` and `</b>`). The catch? You must minimize the number of tags by merging overlapping or adjacent bold regions.

For example, if you have keywords `["ab", "bc"]` and the string `"aabcd"`:
- The substring `"ab"` appears at index 1
- The substring `"bc"` appears at index 2
- These overlap (they share the character 'b' at index 2)
- Instead of producing `"a<b>ab</b><b>bc</b>d"` (using 4 tags), you should merge them into `"a<b>abc</b>d"` (using only 2 tags)

Your task is to:
1. Find all occurrences of all keywords in the string
2. Identify which positions should be bold (a position is bold if it's part of any keyword occurrence)
3. Merge consecutive bold positions into single bold regions
4. Insert `<b>` and `</b>` tags at the boundaries of these regions

Return the modified string with minimal tags. All tags must be properly paired - every opening `<b>` must have a corresponding closing `</b>`.

## Why This Matters

This problem mirrors real-world text highlighting and search result formatting seen in code editors, search engines, and document processors. The core technique - marking ranges and merging overlapping intervals - appears frequently in systems that handle time ranges (calendar conflicts), memory allocation (coalescing free blocks), and genomics (merging gene sequences). Search engines like Google use similar logic to highlight query terms in search snippets while minimizing HTML overhead. The interval merging pattern is fundamental to many optimization problems where you need to consolidate overlapping or adjacent segments efficiently.

## Examples

**Example 1:**
- Input: `words = ["ab","bc"], s = "aabcd"`
- Output: `"a<b>abc</b>d"`
- Explanation: Returning `"a<b>ab</b><b>bc</b>d"` uses excessive tags and is therefore incorrect.

**Example 2:**
- Input: `words = ["ab","cb"], s = "aabcd"`
- Output: `"a<b>ab</b>cd"`

## Constraints

- 1 <= s.length <= 500
- 0 <= words.length <= 50
- 1 <= words[i].length <= 10
- s and words[i] consist of lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
Mark bold regions using interval merging. First, find all occurrences of all keywords and mark their index ranges. Then merge overlapping or adjacent intervals. Finally, build the result string by inserting tags at interval boundaries. This avoids duplicate tags for consecutive bold characters.
</details>

<details>
<summary>Main Approach</summary>
Create a boolean array marking bold positions. For each word in words, find all occurrences in s (using string find or iteration) and mark those indices as True. Then scan the boolean array: when transitioning from False to True, insert "<b>"; when transitioning from True to False, insert "</b>". Build result string character by character.
</details>

<details>
<summary>Optimization Tip</summary>
Instead of searching for each word independently in the entire string, use a Trie or Aho-Corasick automaton for multi-pattern matching. This reduces time from O(words * s) to O(total_chars_in_words + s). For the given constraints (s.length <= 500, words.length <= 50), the simple approach suffices.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(w * s * maxLen) | O(s) | w = words count, search each word |
| Boolean Array | O(w * s * maxLen) | O(s) | Mark bold positions, simple implementation |
| Trie/Aho-Corasick | O(total + s) | O(total) | total = sum of word lengths |

## Common Mistakes

1. **Adding redundant tags**
   ```python
   # Wrong: Add tags for each word occurrence separately
   for word in words:
       result = result.replace(word, f"<b>{word}</b>")
   # produces: "a<b>ab</b><b>bc</b>d" instead of "a<b>abc</b>d"

   # Correct: Merge intervals first, then add tags
   mark_all_bold_positions()
   add_tags_at_boundaries()
   ```

2. **Not handling overlapping keywords**
   ```python
   # Wrong: Don't merge overlapping regions
   for word in words:
       intervals.append((start, end))

   # Correct: Merge overlapping/adjacent intervals
   intervals.sort()
   merged = merge_intervals(intervals)
   ```

3. **Off-by-one errors in interval boundaries**
   ```python
   # Wrong: Incorrect interval marking
   for i in range(start, end):  # excludes character at 'end'
       bold[i] = True

   # Correct: Include all characters of the word
   for i in range(start, start + len(word)):
       bold[i] = True
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Add Bold Tag in String | Medium | Same problem with different name |
| Merge Intervals | Medium | Core interval merging technique |
| Tag Validator | Hard | More complex tag validation rules |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Interval Merging](../../strategies/patterns/intervals.md)
