---
id: E239
old_id: A326
slug: buddy-strings
title: Buddy Strings
difficulty: easy
category: easy
topics: ["string", "hash-table"]
patterns: ["string-matching", "counting"]
estimated_time_minutes: 15
frequency: medium
prerequisites: ["string-comparison", "hash-map-basics"]
related_problems: ["E242", "M049", "M151"]
strategy_ref: ../strategies/patterns/string-matching.md
---
# Buddy Strings

## Problem

You are given two strings, `s` and `goal`, and you need to determine whether you can transform `s` into `goal` by performing exactly one swap operation. A swap operation means you select two different positions `i` and `j` in string `s` (where `i != j`) and exchange the characters at those positions.

The key word here is "exactly" one swap. You must perform a swap, and you can only perform one swap. This creates some interesting cases to consider. If the strings are already identical, you still need to make a swap, so you can only return true if there exists at least one pair of identical characters that you can swap without changing the string (like swapping two 'a's in "aa"). If the strings are different, you need exactly one swap to fix them, which means there should be exactly two positions where they differ, and swapping those two positions should make the strings equal.

Let's walk through an example: if `s = "ab"` and `goal = "ba"`, you can swap positions 0 and 1 in `s` to get "ba", which matches `goal`, so the answer is true. However, if `s = "ab"` and `goal = "ab"`, they're already equal, but you can't swap any two distinct positions without changing the string (since 'a' != 'b'), so the answer is false. On the other hand, if `s = "aa"` and `goal = "aa"`, you can swap the two 'a's at positions 0 and 1, and the string remains "aa", so the answer is true.

This problem requires careful case analysis. You need to handle three main scenarios: (1) the strings are equal and you need to find swappable duplicates, (2) the strings differ in exactly two positions and those positions can be swapped to make them equal, and (3) all other cases should return false (strings differ in 1, 3, or more positions, strings have different lengths, etc.).

## Why This Matters

This problem develops your pattern recognition and systematic case analysis skills, which are essential for writing robust code that handles all edge cases correctly. The "exactly one operation" constraint is common in many real-world scenarios, from data validation to error correction.

String swap detection appears in spell-checking algorithms, where a common typing error is transposing two adjacent characters (typing "teh" instead of "the"). Detecting these transposition errors quickly is important for autocorrect systems. In bioinformatics, DNA sequence analysis often involves detecting single nucleotide swaps or mutations, and algorithms need to determine if two sequences differ by a single swap event.

The problem also models data validation scenarios. For example, in banking systems, you might need to verify whether two transaction records are identical except for a single intentional swap (perhaps correcting a data entry error). The "exactly one difference" pattern appears in version control systems when analyzing single-character edits.

From an algorithmic perspective, this problem teaches you to break complex boolean logic into clear, separate cases. Rather than trying to write one complicated conditional expression, you identify distinct scenarios and handle each explicitly. This case-based thinking is crucial for writing maintainable code and avoiding subtle bugs that arise from trying to handle everything in one monolithic check.

The character frequency analysis you might use (checking for duplicate characters when strings are equal) is a fundamental technique that appears across many string problems, from anagram detection to character counting algorithms. Understanding when to use sets versus counters versus direct comparisons is a valuable skill.

## Examples

**Example 1:**
- Input: `s = "ab", goal = "ba"`
- Output: `true`
- Explanation: Swapping the characters at positions 0 and 1 transforms "ab" to "ba".

**Example 2:**
- Input: `s = "ab", goal = "ab"`
- Output: `false`
- Explanation: Swapping any two positions would change the string to "ba", which doesn't match the goal.

**Example 3:**
- Input: `s = "aa", goal = "aa"`
- Output: `true`
- Explanation: Swapping the two identical characters maintains the string as "aa".

## Constraints

- 1 <= s.length, goal.length <= 2 * 10⁴
- s and goal consist of lowercase letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1 - Conceptual Foundation
Consider the different scenarios: (1) s and goal are already equal - when can we still make a valid swap? (2) s and goal differ - how many positions should differ, and what relationship must those differing positions have? Break the problem into these distinct cases.

### Hint 2 - Difference Analysis
If s and goal are different strings, count the positions where they differ. What's the only valid number of differences that allows a single swap to fix them? What must be true about the characters at those differing positions?

### Hint 3 - Implementation Strategy
First check if lengths differ (immediate return false). If strings are equal, check if there's at least one character appearing more than once (we can swap duplicates). If strings differ, collect all positions where they differ. Return true only if there are exactly 2 differences and swapping those positions makes the strings equal.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Difference Tracking | O(n) | O(1) | Single pass with constant space for differences |
| Character Frequency | O(n) | O(26) = O(1) | Count character frequencies for duplicate detection |
| Brute Force (Try All Swaps) | O(n²) | O(n) | Not efficient, try every pair of positions |

## Common Mistakes

### Mistake 1: Not Handling Identical Strings
```python
# INCORRECT: Returns false when s == goal
def buddy_strings(s, goal):
    if s == goal:
        return False  # Wrong! We can swap duplicates
    # Check differences...
```
**Why it's wrong:** When s equals goal and s contains duplicate characters, we can swap the duplicates to get the same string, satisfying the "exactly one swap" requirement.

**Correct approach:**
```python
# CORRECT: Check for duplicates when strings are equal
def buddy_strings(s, goal):
    if len(s) != len(goal):
        return False

    if s == goal:
        # Check if there's at least one duplicate character
        char_set = set(s)
        return len(char_set) < len(s)  # True if duplicates exist

    # Handle different strings...
```

### Mistake 2: Allowing More or Fewer Than Two Differences
```python
# INCORRECT: Doesn't validate exact difference count
def buddy_strings(s, goal):
    differences = []
    for i in range(len(s)):
        if s[i] != goal[i]:
            differences.append(i)

    # Missing check for exactly 2 differences
    if len(differences) > 0:  # Wrong: could be 1, 3, 4, etc.
        return s[differences[0]] == goal[differences[1]]
```
**Why it's wrong:** A single swap changes exactly 2 positions. If there are 1, 3, or more differences, no single swap can fix them.

**Correct approach:**
```python
# CORRECT: Verify exactly 2 differences
def buddy_strings(s, goal):
    if len(s) != len(goal):
        return False

    differences = []
    for i in range(len(s)):
        if s[i] != goal[i]:
            differences.append(i)

    if len(differences) == 0:
        return len(set(s)) < len(s)  # Check for duplicates

    if len(differences) == 2:
        i, j = differences[0], differences[1]
        return s[i] == goal[j] and s[j] == goal[i]

    return False  # Wrong number of differences
```

### Mistake 3: Incorrect Swap Validation
```python
# INCORRECT: Only checks one direction
def buddy_strings(s, goal):
    # ... found 2 differences at positions i and j
    return s[i] == goal[j]  # Wrong: must check both directions
```
**Why it's wrong:** For a valid swap, s[i] must equal goal[j] AND s[j] must equal goal[i]. Checking only one direction is insufficient.

## Problem Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| K Swaps to Match | Medium | Allow up to K swaps instead of exactly 1 |
| Minimum Swaps to Match | Medium | Find minimum swaps needed to match strings |
| Buddy Strings with Wildcards | Medium | Allow wildcard characters that match anything |
| Circular Buddy Strings | Medium | Allow circular rotation combined with swap |
| Three-Way Buddy | Hard | Swap characters among three strings |

## Practice Checklist

- [ ] First solve: Handle all cases (equal, different, duplicates)
- [ ] Handle edge cases: Single character, no duplicates, all same
- [ ] Optimize: Single-pass solution with O(1) space
- [ ] Review after 1 day: List all edge cases from memory
- [ ] Review after 1 week: Implement without looking at notes
- [ ] Interview ready: Explain the duplicate case clearly

## Strategy

**Pattern**: String Matching with Constraints
- Master systematic case analysis for string problems
- Learn to handle equality and difference cases separately
- Understand character frequency analysis

See [String Matching Pattern](../strategies/patterns/string-matching.md) for the complete strategy guide.
