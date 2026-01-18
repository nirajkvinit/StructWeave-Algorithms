---
id: M333
old_id: A158
slug: stickers-to-spell-word
title: Stickers to Spell Word
difficulty: medium
category: medium
topics: ["backtracking", "dynamic-programming"]
patterns: ["backtrack-permutation"]
estimated_time_minutes: 30
frequency: low
related_problems:
  - id: M200
    title: Coin Change
    difficulty: medium
  - id: H050
    title: Word Break II
    difficulty: hard
prerequisites:
  - Backtracking
  - Dynamic programming
  - Bitmask optimization
  - Character frequency counting
---
# Stickers to Spell Word

## Problem

You have unlimited quantities of `n` different types of stickers. Each sticker contains a word made up of lowercase English letters. For example, you might have stickers with words like "with", "example", and "science".

Your goal is to spell out a target string by cutting out individual letters from your stickers and arranging them in any order. You can use the same type of sticker as many times as you want. For instance, if you need three 'e' letters and one sticker only has one 'e', you can use multiple copies of that sticker.

Find the minimum number of stickers needed to construct the target string. If it's impossible to form the target using the available stickers (because some required letter doesn't appear on any sticker), return `-1`.

**Important edge case**: Each sticker must be used as a whole - you choose to "take a sticker," then you can use any or all of its letters. You can't partially use a sticker. The question is: what's the fewest number of complete stickers you need to pick to have all the letters necessary for your target?

Note that you might not use all letters from a sticker - if a sticker says "example" and you only need the 'e', that's fine. But taking that sticker counts as 1 toward your total count.

**Note:** Test cases use words from common English vocabulary, with targets formed by combining words.

## Why This Matters

This is a classic example of an NP-hard optimization problem, similar to the Set Cover problem used in resource allocation, task scheduling, and test case selection in software engineering. The dynamic programming approach with memoization teaches you how to make exponential problems tractable through state space reduction - a technique critical for compiler optimization, game AI tree search, and configuration management. Understanding when greedy approaches fail (picking the sticker with most matching letters first doesn't always work) builds intuition for recognizing problems that require exhaustive search with pruning.

## Examples

**Example 1:**
- Input: `stickers = ["with","example","science"], target = "thehat"`
- Output: `3`
- Explanation: Using two "with" stickers and one "example" sticker provides all necessary letters to construct "thehat". This represents the minimum sticker count needed.

**Example 2:**
- Input: `stickers = ["notice","possible"], target = "basicbasic"`
- Output: `-1`
- Explanation: The available stickers don't contain all the letters needed to form "basicbasic".

## Constraints

- n == stickers.length
- 1 <= n <= 50
- 1 <= stickers[i].length <= 10
- 1 <= target.length <= 15
- stickers[i] and target consist of lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Understanding the State Space</summary>

This is a challenging problem that requires dynamic programming with memoization. The key insight is that the state can be represented by which letters of the target remain to be covered.

First, check if all letters in the target exist in at least one sticker. If any letter is missing entirely, return -1 immediately.

The state can be represented as a string of remaining characters needed. For example, if target is "thehat" and we've used letters "th", the remaining state is "ehat".

</details>

<details>
<summary>Hint 2: Memoization with Character Frequency</summary>

Use memoization where the key is the remaining target string (sorted to ensure consistency). For each state:

1. If the remaining target is empty, return 0 (no more stickers needed)
2. Try using each sticker and see which letters from the remaining target it can cover
3. Recursively solve for the new remaining target after using that sticker
4. Take the minimum across all sticker choices

Important optimization: when trying a sticker, only proceed if it contains at least one character from the remaining target. Otherwise, it's useless.

```
def minStickers(stickers, target):
    # Convert stickers to character frequency counts
    sticker_counts = [Counter(s) for s in stickers]

    memo = {}

    def dp(remaining):
        if not remaining:
            return 0
        if remaining in memo:
            return memo[remaining]

        remaining_count = Counter(remaining)
        result = float('inf')

        for sticker_count in sticker_counts:
            # Only use this sticker if it has the first char of remaining
            if remaining[0] not in sticker_count:
                continue

            # Use this sticker and calculate new remaining
            new_remaining = ""
            for char, count in remaining_count.items():
                new_remaining += char * max(0, count - sticker_count[char])

            result = min(result, 1 + dp(new_remaining))

        memo[remaining] = result
        return result

    ans = dp(target)
    return ans if ans != float('inf') else -1
```

</details>

<details>
<summary>Hint 3: Optimization Strategies</summary>

Several optimizations make this problem tractable:

1. **Filter useless stickers**: Remove stickers that are completely contained in other stickers
2. **Prioritize stickers**: When trying stickers, prioritize those that cover the first character of the remaining target (this prevents infinite loops and reduces branching)
3. **Sort remaining target**: Always sort the remaining target string when using it as a memoization key to ensure "abc" and "bca" are treated as the same state
4. **Early termination**: If a letter in target doesn't exist in any sticker, return -1 immediately

The time complexity is still exponential in the worst case, but these optimizations make it practical for the given constraints (target length ≤ 15).

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Backtracking (no memo) | O(n^t) | O(t) | n = stickers, t = target length; impractical |
| DP with Memoization | O(n × 2^t × t) | O(2^t × t) | States = subsets of target, process each with all stickers |
| Optimized DP | O(n × 3^t) | O(3^t) | With pruning and character frequency optimization |

Note: The actual complexity depends heavily on the character overlap between stickers and target.

## Common Mistakes

### Mistake 1: Not Handling Letter Impossibility
```python
# WRONG: Not checking if target can be formed at all
def minStickers(stickers, target):
    # Missing: check if all target letters exist in stickers
    memo = {}

    def dp(remaining):
        if not remaining:
            return 0
        # ... recursive logic
```

**Why it's wrong**: Before starting the expensive DP search, check if each letter in the target appears in at least one sticker. If not, return -1 immediately to avoid infinite recursion or timeout.

### Mistake 2: Incorrect Remaining Target Calculation
```python
# WRONG: Not properly calculating remaining characters
def minStickers(stickers, target):
    def dp(remaining):
        if not remaining:
            return 0

        result = float('inf')
        for sticker in stickers:
            # Bug: simple string replacement doesn't work for frequency
            new_remaining = remaining
            for char in sticker:
                new_remaining = new_remaining.replace(char, '', 1)  # Wrong approach

            result = min(result, 1 + dp(new_remaining))

        return result
```

**Why it's wrong**: This approach doesn't correctly handle character frequencies. Use `Counter` to track how many of each character remain, then subtract the sticker's characters properly.

### Mistake 3: Not Pruning Search Space
```python
# WRONG: Trying every sticker even if it doesn't help
def minStickers(stickers, target):
    memo = {}

    def dp(remaining):
        if not remaining:
            return 0
        if remaining in memo:
            return memo[remaining]

        result = float('inf')
        # Bug: trying all stickers without checking if they help
        for sticker in stickers:
            new_remaining = ...  # calculate new remaining
            if new_remaining != remaining:  # At least some progress
                result = min(result, 1 + dp(new_remaining))

        memo[remaining] = result
        return result
```

**Why it's wrong**: While this checks for progress, a better optimization is to only try stickers that contain the first character of the remaining target. This crucial optimization prevents exploring useless branches and makes the solution tractable.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Limited Sticker Quantities | Hard | Each sticker type has a maximum count |
| Weighted Stickers | Hard | Different stickers have different costs |
| Multiple Targets | Hard | Form multiple target strings with minimum stickers |
| Order-Dependent Formation | Hard | Target must be formed left-to-right |

## Practice Checklist

- [ ] **First attempt**: Solve independently (60 min time limit)
- [ ] **Understand state**: Clearly define what constitutes a DP state
- [ ] **Implement memoization**: Use Counter for character frequencies
- [ ] **Add optimizations**: Filter stickers, prioritize by first char
- [ ] **Spaced repetition**: Revisit after 3 days
- [ ] **Interview practice**: Explain state space and pruning strategy
- [ ] **Variations**: Solve Coin Change to understand similar DP pattern
- [ ] **Final review**: Solve again after 1 week without hints

**Strategy**: See [Backtracking Pattern](../strategies/patterns/backtracking.md)
