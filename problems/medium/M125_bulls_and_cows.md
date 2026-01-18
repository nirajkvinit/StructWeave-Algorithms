---
id: M125
old_id: I098
slug: bulls-and-cows
title: Bulls and Cows
difficulty: medium
category: medium
topics: ["hash-table", "string", "counting"]
patterns: ["frequency-counting"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M124", "E001", "M126"]
prerequisites: ["hash-table", "frequency-counting", "string-processing"]
---
# Bulls and Cows

## Problem

You're implementing the logic for Bulls and Cows, a classic code-breaking guessing game similar to the board game Mastermind. In this game, one player chooses a secret number (like "1807") and another player tries to guess it (like "7810"). After each guess, you provide feedback in the form of "bulls" and "cows" to help the guesser narrow down the possibilities.

A **bull** is a digit that appears in both the secret and the guess at exactly the same position. For example, if the secret is "1807" and the guess is "7810", the digit '8' at position 1 is a bull because it matches perfectly. A **cow** is a digit that exists in both the secret and the guess but at different positions, and importantly, we only count digits as cows if they haven't already been counted as bulls. In our example, the digits '7', '1', and '0' appear in both strings but at different positions, giving us 3 cows. Your task is to compute this feedback given a secret and a guess, returning the result in the format `"xAyB"` where `x` is the number of bulls and `y` is the number of cows.

The tricky part is handling duplicates correctly. If the secret is "1123" and the guess is "0111", you have 1 bull (the '1' at position 0), but only 1 cow, not 2, because after accounting for the bull, there's only one unmatched '1' remaining in the secret. Each digit in the guess can only match with one digit in the secret. Edge cases include secrets with all identical digits, guesses with no matches at all, and situations where all digits are bulls (a perfect match).

## Why This Matters

This problem teaches frequency counting and careful bookkeeping patterns that appear throughout data processing and validation systems. Game development uses similar scoring logic for puzzle games, word games, and pattern-matching challenges where you need to provide partial feedback about correctness. Biometric authentication systems compare fingerprint or facial recognition features using similar "partial match" scoring to determine confidence levels. Spell checkers and autocorrect systems compute how many characters match in the right positions versus characters that exist but are out of order when suggesting corrections. Data deduplication algorithms compare records to determine similarity scores based on field-by-field matching. Password strength meters analyze character diversity and patterns using frequency analysis. The algorithmic challenge here is efficiently tracking which digits have been matched while respecting the constraint that each digit can only be used once, typically solved with frequency maps or counting arrays that get decremented as matches are found.

## Examples

**Example 1:**
- Input: `secret = "1807", guess = "7810"`
- Output: `"1A3B"`
- Explanation: Position 1 has matching digit '8' (1 bull). The digits 7, 1, and 0 all appear in both strings but at different positions (3 cows).

**Example 2:**
- Input: `secret = "1123", guess = "0111"`
- Output: `"1A1B"`
- Explanation: Position 0 has matching digit '1' (1 bull). One additional '1' from the guess appears in the secret at a different position (1 cow). Note that we can only count one cow for the '1' digit since only one unmatched '1' exists in the secret after accounting for the bull.

## Constraints

- 1 <= secret.length, guess.length <= 1000
- secret.length == guess.length
- secret and guess consist of digits only.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Conceptual</summary>

Break the problem into two phases: First, count bulls by comparing digits at the same positions. Then, count cows by tracking which digits appear in both strings but at different positions. Be careful with duplicates - each digit in the guess can only be matched once.

</details>

<details>
<summary>🎯 Hint 2: Approach</summary>

Use two passes or frequency counting. First pass: iterate through both strings simultaneously, counting bulls (same position matches) and building frequency maps for non-matching digits. Second pass: for each non-matching digit in guess, check if it exists in secret's frequency map and count as cow if found, then decrement the count.

</details>

<details>
<summary>📝 Hint 3: Algorithm</summary>

**Two-Pass Approach:**
```
1. Initialize bulls = 0, cows = 0
2. Create frequency maps for secret and guess (for non-bulls)

3. First pass - count bulls:
   - For i in range(len(secret)):
     - If secret[i] == guess[i]:
       - bulls += 1
     - Else:
       - Add secret[i] to secret_freq
       - Add guess[i] to guess_freq

4. Second pass - count cows:
   - For each digit in guess_freq:
     - cows += min(secret_freq[digit], guess_freq[digit])

5. Return f"{bulls}A{cows}B"
```

**One-Pass Approach:**
```
1. Initialize bulls = 0, cows = 0
2. Create arrays secret_counts[10], guess_counts[10]

3. For i in range(len(secret)):
   - If secret[i] == guess[i]:
     - bulls += 1
   - Else:
     - If secret_counts[guess[i]] > 0: cows += 1, secret_counts[guess[i]] -= 1
     - Else: guess_counts[guess[i]] += 1
     - If guess_counts[secret[i]] > 0: cows += 1, guess_counts[secret[i]] -= 1
     - Else: secret_counts[secret[i]] += 1

4. Return f"{bulls}A{cows}B"
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Match each guess digit with each secret digit |
| **Two-Pass Frequency Count** | **O(n)** | **O(1)** | Only 10 possible digits, optimal |
| One-Pass Frequency Count | O(n) | O(1) | Clever but harder to understand |
| Sorting | O(n log n) | O(n) | Inefficient, unnecessary |

## Common Mistakes

### Mistake 1: Counting same digit multiple times

**Wrong:**
```python
def getHint(secret, guess):
    bulls = cows = 0

    # Count bulls
    for i in range(len(secret)):
        if secret[i] == guess[i]:
            bulls += 1

    # Wrong: counts all occurrences, including bulls
    for digit in guess:
        if digit in secret:
            cows += 1  # Overcounts!

    return f"{bulls}A{cows}B"
```

**Correct:**
```python
def getHint(secret, guess):
    bulls = 0
    secret_freq = {}
    guess_freq = {}

    # First pass: count bulls and build frequency maps
    for i in range(len(secret)):
        if secret[i] == guess[i]:
            bulls += 1
        else:
            secret_freq[secret[i]] = secret_freq.get(secret[i], 0) + 1
            guess_freq[guess[i]] = guess_freq.get(guess[i], 0) + 1

    # Second pass: count cows
    cows = 0
    for digit in guess_freq:
        if digit in secret_freq:
            cows += min(secret_freq[digit], guess_freq[digit])

    return f"{bulls}A{cows}B"
```

### Mistake 2: Not handling duplicates correctly

**Wrong:**
```python
def getHint(secret, guess):
    bulls = cows = 0

    for i in range(len(secret)):
        if secret[i] == guess[i]:
            bulls += 1
        elif secret[i] in guess:
            cows += 1  # Wrong: doesn't respect position or frequency

    return f"{bulls}A{cows}B"
# Fails for secret="1123", guess="0111" -> should be "1A1B", not "1A2B"
```

**Correct:**
```python
def getHint(secret, guess):
    bulls = 0
    secret_counts = [0] * 10
    guess_counts = [0] * 10

    # Count bulls and frequencies
    for i in range(len(secret)):
        s_digit = int(secret[i])
        g_digit = int(guess[i])

        if s_digit == g_digit:
            bulls += 1
        else:
            secret_counts[s_digit] += 1
            guess_counts[g_digit] += 1

    # Count cows using minimum of frequencies
    cows = sum(min(secret_counts[i], guess_counts[i]) for i in range(10))

    return f"{bulls}A{cows}B"
```

### Mistake 3: Inefficient character-by-character comparison

**Wrong:**
```python
def getHint(secret, guess):
    bulls = cows = 0

    for i in range(len(secret)):
        if secret[i] == guess[i]:
            bulls += 1
            # Mark as used by replacing with special character
            secret = secret[:i] + '*' + secret[i+1:]
            guess = guess[:i] + '*' + guess[i+1:]

    # String modification is O(n) per operation = O(n²) total
    for i in range(len(guess)):
        if guess[i] != '*' and guess[i] in secret:
            cows += 1
            idx = secret.index(guess[i])
            secret = secret[:idx] + '*' + secret[idx+1:]
```

**Correct:**
```python
def getHint(secret, guess):
    bulls = cows = 0
    s_counts = [0] * 10
    g_counts = [0] * 10

    # Single pass through strings
    for i in range(len(secret)):
        s = int(secret[i])
        g = int(guess[i])

        if s == g:
            bulls += 1
        else:
            # Check if current guess digit was seen in secret before
            if s_counts[g] > 0:
                cows += 1
                s_counts[g] -= 1
            else:
                g_counts[g] += 1

            # Check if current secret digit was seen in guess before
            if g_counts[s] > 0:
                cows += 1
                g_counts[s] -= 1
            else:
                s_counts[s] += 1

    return f"{bulls}A{cows}B"
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Mastermind | Classic board game with colors instead of digits | Medium |
| Wordle Logic | Similar concept with letters and word validation | Medium |
| Multiple Guesses | Track all guesses and optimize next guess | Hard |
| Variable Length | Secret and guess can have different lengths | Medium |
| With Hints | Generate hints to help player improve guesses | Hard |

## Practice Checklist

- [ ] Solve using two-pass frequency counting
- [ ] Solve using one-pass approach
- [ ] Handle edge cases (all bulls, no matches, duplicates)
- [ ] Optimize to O(n) time and O(1) space
- [ ] **Day 3**: Re-solve without looking at solution
- [ ] **Week 1**: Implement Mastermind variation
- [ ] **Week 2**: Explain frequency counting technique to someone
- [ ] **Month 1**: Solve a similar counting problem

**Strategy**: See [Frequency Counting Patterns](../strategies/patterns/frequency-counting.md)
