---
id: M455
old_id: A310
slug: guess-the-word
title: Guess the Word
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Guess the Word

## Problem

You're playing a word-guessing game similar to Wordle or Mastermind, but with a twist. You have a list of six-letter words, and one of them has been secretly chosen. Your job is to figure out which word it is.

Here's how the game works: you can call an API function `Master.guess(word)` with any six-letter word from your list. The function returns a number telling you how many characters in your guess match the secret word in both value AND position. For example, if the secret is "acckzz" and you guess "ccbazz", you'll get back 3 because three characters match exactly: the 'c' at position 1, the 'z' at position 4, and the 'z' at position 5.

You have a limited number of guesses (typically 10) to identify the secret word. If you guess the exact word, you win immediately. If you run out of guesses without finding it, you lose.

The key challenge is to be strategic: each guess should eliminate as many possibilities as possible, helping you narrow down the answer efficiently.

## Why This Matters

This problem teaches information theory and optimal decision-making under uncertainty - skills critical in A/B testing, diagnostics systems, and search algorithms. The minimax strategy you'll develop is used in game AI (chess engines, poker bots), medical diagnosis systems (choosing tests that maximize information gain), and quality control (selecting which items to inspect). The concept of using each guess to partition the remaining possibilities efficiently appears in binary search, decision tree construction, and database query optimization. Understanding how to minimize worst-case scenarios is fundamental to robust algorithm design and is used in compiler optimization, network routing, and resource allocation.

## Examples

**Example 1:**
- Input: `secret = "acckzz", words = ["acckzz","ccbazz","eiowzz","abcczz"], allowedGuesses = 10`
- Output: `You guessed the secret word correctly.`
- Explanation: master.guess("aaaaaa") returns -1, because "aaaaaa" is not in wordlist.
master.guess("acckzz") returns 6, because "acckzz" is secret and has all 6 matches.
master.guess("ccbazz") returns 3, because "ccbazz" has 3 matches.
master.guess("eiowzz") returns 2, because "eiowzz" has 2 matches.
master.guess("abcczz") returns 4, because "abcczz" has 4 matches.
We made 5 calls to master.guess, and one of them was the secret, so we pass the test case.

**Example 2:**
- Input: `secret = "hamada", words = ["hamada","khaled"], allowedGuesses = 10`
- Output: `You guessed the secret word correctly.`
- Explanation: Since there are two words, you can guess both.

## Constraints

- 1 <= words.length <= 100
- words[i].length == 6
- words[i] consist of lowercase English letters.
- All the strings of wordlist are **unique**.
- secret exists in words.
- 10 <= allowedGuesses <= 30

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is an information theory problem. Each guess gives you information (match count) that eliminates words. The key is to maximize information gain with each guess - choose words that partition the remaining candidates most evenly, minimizing the worst-case size of the remaining set.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use a minimax strategy. For each candidate word, simulate guessing it and calculate how it would partition the remaining word list based on possible match counts (0-6). Choose the word that minimizes the maximum partition size. After each guess, filter the candidate list to only words with the same match count as the response.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Helper function to count matches between two words is crucial. Also, instead of trying every word, you can use heuristics like choosing words with common letter patterns or words that have match count 0 with many other words (eliminates more possibilities).
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Random Guessing | O(allowedGuesses * n) | O(n) | May fail, not guaranteed |
| Greedy (Minimax) | O(allowedGuesses * n^2) | O(n) | Choose word that minimizes max partition |
| Optimal (Information Theory) | O(allowedGuesses * n^2) | O(n) | Maximize expected information gain |

## Common Mistakes

1. **Not filtering candidates correctly after each guess**
   ```python
   # Wrong: Not updating candidate list based on match count
   def findSecretWord(words, master):
       for word in words:
           matches = master.guess(word)
           # Forgot to filter words!

   # Correct: Keep only words with same match count
   def findSecretWord(words, master):
       candidates = words[:]
       for _ in range(10):
           guess = choose_best(candidates)
           matches = master.guess(guess)
           if matches == 6:
               return
           candidates = [w for w in candidates if match_count(guess, w) == matches]
   ```

2. **Incorrect match counting function**
   ```python
   # Wrong: Counting character frequency instead of position matches
   def match_count(w1, w2):
       return sum(w1.count(c) for c in w2)  # Wrong!

   # Correct: Count same character at same position
   def match_count(w1, w2):
       return sum(c1 == c2 for c1, c2 in zip(w1, w2))
   ```

3. **Poor guess selection strategy**
   ```python
   # Wrong: Just guessing first word in list
   guess = candidates[0]

   # Correct: Choose word that minimizes worst-case
   def choose_best(candidates):
       min_max_size = float('inf')
       best_guess = candidates[0]
       for guess in candidates:
           partitions = {}
           for word in candidates:
               matches = match_count(guess, word)
               partitions[matches] = partitions.get(matches, 0) + 1
           max_partition = max(partitions.values())
           if max_partition < min_max_size:
               min_max_size = max_partition
               best_guess = guess
       return best_guess
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Mastermind Game | Medium | Color patterns instead of letters |
| Wordle Solver | Medium | Different feedback format (exact/present/absent) |
| Bulls and Cows | Medium | Similar matching but different scoring |
| Word Ladder | Medium | Transform one word to another |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Greedy Algorithms](../../strategies/patterns/greedy.md)
