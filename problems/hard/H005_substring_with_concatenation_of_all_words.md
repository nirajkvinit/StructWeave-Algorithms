---
id: H005
old_id: F030
slug: substring-with-concatenation-of-all-words
title: Substring with Concatenation of All Words
difficulty: hard
category: hard
topics: ["array", "string"]
patterns: ["backtrack-permutation"]
estimated_time_minutes: 45
---
# Substring with Concatenation of All Words

## Problem

Find all starting indices where a substring is a concatenation of all given words.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `s = "barfoothefoobarman", words = ["foo","bar"]`
- Output: `[0,9]`
- Explanation: Since words.length == 2 and words[i].length == 3, the concatenated substring has to be of length 6.
The substring starting at 0 is "barfoo". It is the concatenation of ["bar","foo"] which is a permutation of words.
The substring starting at 9 is "foobar". It is the concatenation of ["foo","bar"] which is a permutation of words.
The output order does not matter. Returning [9,0] is fine too.

**Example 2:**
- Input: `s = "wordgoodgoodgoodbestword", words = ["word","good","best","word"]`
- Output: `[]`
- Explanation: Since words.length == 4 and words[i].length == 4, the concatenated substring has to be of length 16.
There is no substring of length 16 in s that is equal to the concatenation of any permutation of words.
We return an empty array.

**Example 3:**
- Input: `s = "barfoofoobarthefoobarman", words = ["bar","foo","the"]`
- Output: `[6,9,12]`
- Explanation: Since words.length == 3 and words[i].length == 3, the concatenated substring has to be of length 9.
The substring starting at 6 is "foobarthe". It is the concatenation of ["foo","bar","the"] which is a permutation of words.
The substring starting at 9 is "barthefoo". It is the concatenation of ["bar","the","foo"] which is a permutation of words.
The substring starting at 12 is "thefoobar". It is the concatenation of ["the","foo","bar"] which is a permutation of words.

## Constraints

- 1 <= s.length <= 10⁴
- 1 <= words.length <= 5000
- 1 <= words[i].length <= 30
- s and words[i] consist of lowercase English letters.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

Since all words have the same length, you can treat the string as a sequence of "word blocks" rather than individual characters. A valid substring must contain exactly one permutation of all words, so you need to match word frequencies, not word order. Think about using a sliding window that moves by word-length increments.

</details>

<details>
<summary>🎯 Main Approach</summary>

Use a sliding window with hash maps to track word frequencies. Create a target frequency map from the words array. For each starting position (0 to word_length-1), slide a window of size (num_words * word_length) and extract words of fixed length. Compare the frequency of extracted words against the target. When frequencies match exactly, record the starting index.

</details>

<details>
<summary>⚡ Optimization Tip</summary>

Instead of rebuilding the word frequency map for each position, use a sliding window approach where you add one word on the right and remove one word on the left. You only need to run the algorithm from word_length different starting positions (0, 1, ..., word_length-1) because other positions are covered by sliding. This reduces time complexity from O(n * m * len) to O(n * word_length).

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n * m * w) | O(m * w) | Check every position, n=string length, m=num words, w=word length |
| Sliding Window (Naive) | O(n * m) | O(m * w) | Better but still checks each position |
| Optimized Sliding Window | O(n * w) | O(m * w) | Optimal - only w starting positions |

## Common Mistakes

1. **Not accounting for duplicate words in the input**
   ```python
   # Wrong: Using a set instead of frequency map
   word_set = set(words)
   # Misses that "foo" might appear twice in words array

   # Correct: Track word frequencies
   word_count = {}
   for word in words:
       word_count[word] = word_count.get(word, 0) + 1
   ```

2. **Checking every character position instead of word positions**
   ```python
   # Wrong: Moving window by 1 character at a time
   for i in range(len(s)):
       check_substring(s[i:i + total_len])  # Very inefficient!

   # Correct: Only check word_length different starting positions
   word_len = len(words[0])
   for start in range(word_len):
       # Slide by word_len increments from this start
       check_from_position(s, start, word_len)
   ```

3. **Not handling words that aren't in the dictionary**
   ```python
   # Wrong: Continuing to count invalid words
   current_word = s[i:i+word_len]
   seen[current_word] += 1  # What if current_word not in words?

   # Correct: Reset window when encountering invalid word
   current_word = s[i:i+word_len]
   if current_word not in word_count:
       seen.clear()
       count = 0
       continue  # Skip this window entirely
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Find All Anagrams in String | Medium | Words are single characters, simpler |
| Minimum Window Substring | Hard | Find minimum window containing all characters |
| Longest Substring Without Repeating Characters | Medium | No duplicate characters constraint |
| Permutation in String | Medium | Check if permutation exists as substring |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (duplicates, invalid words, empty input)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Sliding Window Pattern](../../strategies/patterns/sliding-window.md)
