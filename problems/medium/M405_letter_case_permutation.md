---
id: M405
old_id: A251
slug: letter-case-permutation
title: Letter Case Permutation
difficulty: medium
category: medium
topics: ["string"]
patterns: ["backtrack-permutation"]
estimated_time_minutes: 30
---
# Letter Case Permutation

## Problem

Given a string `s` containing letters and digits, generate all possible strings that can be created by changing the case (uppercase/lowercase) of the letters. Digits remain unchanged.

For each letter in the string, you have exactly two choices: keep it lowercase or make it uppercase. Digits have no choices - they stay as they are. The order of output doesn't matter, just return all distinct possibilities.

For example, with the string `"a1b2"`, you have two letters (`a` and `b`) that can each be uppercase or lowercase. This gives you 2 × 2 = 4 total combinations: `"a1b2"`, `"a1B2"`, `"A1b2"`, and `"A1B2"`. The digits `1` and `2` appear in the same positions in all outputs.

If there are k letters in the input string, you'll generate exactly 2^k output strings. This exponential growth is inherent to the problem - you're not optimizing to reduce the number of results, you're generating all valid permutations.

The challenge is implementing this generation efficiently using either backtracking (exploring choices recursively) or iterative expansion (building up results step by step).

Return a list of all possible strings.

## Why This Matters

This is a classic backtracking and permutation generation problem that appears frequently in coding interviews. It teaches you to recognize binary choice patterns - whenever each element has exactly two states, you're dealing with a 2^n problem space.

The same pattern appears in subset generation, binary tree enumeration, and many combinatorial problems. Learning to implement this both recursively (backtracking) and iteratively (BFS-style expansion) gives you flexibility to choose the clearest approach for different scenarios.

This problem also reinforces string manipulation and character-level operations, including ASCII value manipulation for case conversion - a useful technique in text processing and parsing problems.

## Examples

**Example 1:**
- Input: `s = "a1b2"`
- Output: `["a1b2","a1B2","A1b2","A1B2"]`

**Example 2:**
- Input: `s = "3z4"`
- Output: `["3z4","3Z4"]`

## Constraints

- 1 <= s.length <= 12
- s consists of lowercase English letters, uppercase English letters, and digits.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
For each letter in the string, you have two choices: keep it uppercase or lowercase. Digits have no choice. If there are k letters, you'll have 2^k total permutations. This is a classic backtracking problem where you make binary decisions at each letter position.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use backtracking or iterative generation. For backtracking, at each position: if it's a digit, just add it and continue; if it's a letter, recursively explore both uppercase and lowercase options. For iterative, start with the original string in a list, then for each character, if it's a letter, create new versions by toggling case for all existing permutations.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
The iterative approach is often clearer: iterate through each character, and if it's a letter, double your current results list by adding versions with that letter toggled. Use Python's swapcase() or manual ASCII manipulation (char XOR 32 toggles case). Both approaches have the same O(2^k * n) complexity where k is letter count.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Backtracking | O(2^k * n) | O(2^k * n) | k = letter count, n = string length |
| Iterative BFS | O(2^k * n) | O(2^k * n) | Same complexity, different implementation |
| Optimal | O(2^k * n) | O(2^k * n) | Cannot do better than generating all results |

## Common Mistakes

1. **Not handling digits correctly**
   ```python
   # Wrong: Trying to change case of digits
   def letterCasePermutation(s):
       result = []
       def backtrack(index, current):
           if index == len(s):
               result.append(current)
               return
           # Missing: check if character is a letter
           backtrack(index + 1, current + s[index].lower())
           backtrack(index + 1, current + s[index].upper())
       backtrack(0, "")
       return result

   # Correct: Only toggle letters
   def letterCasePermutation(s):
       result = []
       def backtrack(index, current):
           if index == len(s):
               result.append(current)
               return
           if s[index].isalpha():
               backtrack(index + 1, current + s[index].lower())
               backtrack(index + 1, current + s[index].upper())
           else:
               backtrack(index + 1, current + s[index])
       backtrack(0, "")
       return result
   ```

2. **Inefficient string concatenation**
   ```python
   # Wrong: String concatenation in tight loop
   def letterCasePermutation(s):
       result = [s]
       for i, char in enumerate(s):
           if char.isalpha():
               temp = []
               for perm in result:
                   temp.append(perm)  # Copy
                   temp.append(perm[:i] + perm[i].swapcase() + perm[i+1:])  # Slow slicing
               result = temp
       return result

   # Correct: Use list for building, convert to string once
   def letterCasePermutation(s):
       result = [[]]
       for char in s:
           new_result = []
           for perm in result:
               new_result.append(perm + [char])
               if char.isalpha():
                   new_result.append(perm + [char.swapcase()])
           result = new_result
       return [''.join(perm) for perm in result]
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Subsets | Easy | Similar backtracking pattern |
| Permutations | Medium | All arrangements instead of case variations |
| Generate parentheses | Medium | Backtracking with validity constraints |
| Gray code | Medium | Binary variations with different rules |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Backtracking](../../strategies/patterns/backtracking.md)
