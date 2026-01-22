---
id: M423
old_id: A271
slug: unique-morse-code-words
title: Unique Morse Code Words
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Unique Morse Code Words

## Problem

In Morse code, each letter of the alphabet has a unique pattern of dots and dashes. The 26 lowercase English letters (a through z) map to these specific sequences:

[".-","-...","-.-.","-..",".","..-.","--.","....","..",".---","-.-",".-..","--","-.","---",".--.","--.-",".-.","...","-","..-","...-",".--","-..-","-.--","--.."]

Given an array of words, you need to convert each word into its Morse code representation. To convert a word, replace each letter with its corresponding Morse code sequence and concatenate them together. For example, "cab" becomes "-.-..--..." by joining the codes for 'c' ("-.-.", 'a' (".-"), and 'b' ("-..."). We call this concatenated string the word's **transformation**.

The interesting observation is that different words can produce the same Morse code transformation. For instance, "gin" and "zen" both transform to the same pattern because their letters happen to map to identical sequences when concatenated.

Your task is to determine how many distinct (unique) transformations exist across all the input words. Two words that produce the same transformation should only be counted once.

## Why This Matters

This problem illustrates the fundamental concept of hashing and collision detection. In real-world applications, we often need to identify unique patterns or signatures across datasets, whether it's detecting duplicate files by their checksums, finding unique user behaviors in analytics, or identifying equivalent expressions in compilers. The technique of transforming data into a canonical form and using hash sets for deduplication is ubiquitous in data processing, caching systems, and database optimization. This problem builds your intuition for when to use sets versus lists for efficient uniqueness checking.

## Examples

**Example 1:**
- Input: `words = ["gin","zen","gig","msg"]`
- Output: `2`
- Explanation: Each word converts as follows:
"gin" -> "--...-."
"zen" -> "--...-."
"gig" -> "--...--."
"msg" -> "--...--."
Only 2 distinct Morse code patterns appear: "--...-." and "--...--.".

**Example 2:**
- Input: `words = ["a"]`
- Output: `1`

## Constraints

- 1 <= words.length <= 100
- 1 <= words[i].length <= 12
- words[i] consists of lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
This is a straightforward hash set problem. Transform each word into its Morse code representation by mapping each letter to its Morse code and concatenating the results. Use a set to track unique transformations since sets automatically handle duplicates. The answer is simply the size of the set.
</details>

<details>
<summary>Main Approach</summary>
Create a lookup array or dictionary mapping each letter (a-z) to its Morse code. For each word in the input, iterate through its characters, look up each letter's Morse code, and concatenate them to form the transformation. Add each transformation to a set. Finally, return the size of the set.
</details>

<details>
<summary>Optimization Tip</summary>
Use a list for the Morse code lookup (indexed by ord(char) - ord('a')) rather than a dictionary for O(1) access. You can also use a list to build the transformation string and join at the end, which is more efficient than repeated string concatenation in Python.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Hash Set | O(N × L) | O(N × L) | N = words, L = average word length |
| Optimal | O(N × L) | O(N × L) | Same, already optimal for this problem |

## Common Mistakes

1. **Using inefficient string concatenation**
   ```python
   # Wrong: Repeated string concatenation is inefficient
   transformation = ""
   for char in word:
       transformation += morse[ord(char) - ord('a')]

   # Correct: Use join with list comprehension
   transformation = ''.join(morse[ord(char) - ord('a')] for char in word)
   ```

2. **Not using a set for uniqueness**
   ```python
   # Wrong: Manually checking for duplicates
   transformations = []
   for word in words:
       trans = transform(word)
       if trans not in transformations:
           transformations.append(trans)
   return len(transformations)

   # Correct: Use set for automatic deduplication
   transformations = set()
   for word in words:
       transformations.add(transform(word))
   return len(transformations)
   ```

3. **Hardcoding morse lookup inefficiently**
   ```python
   # Wrong: Using dictionary for 26 entries
   morse = {'a': '.-', 'b': '-...', ...}

   # Correct: Use list for O(1) index access
   morse = [".-", "-...", "-.-.", "-..", ".", "..-.", ...]
   # Access with: morse[ord(char) - ord('a')]
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Group Anagrams | Medium | Group words by sorted character signature |
| Find Duplicate Subtrees | Medium | Use serialization to find duplicate tree structures |
| Encode and Decode Strings | Medium | Design encoding scheme that's reversible |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Hash Table](../../prerequisites/hash-tables.md)
