---
id: E215
old_id: A147
slug: valid-palindrome-ii
title: Valid Palindrome II
difficulty: easy
category: easy
topics: ["string", "two-pointers", "greedy"]
patterns: ["two-pointers", "greedy"]
estimated_time_minutes: 15
frequency: high
prerequisites: ["two-pointers", "palindrome-check", "string-manipulation"]
related_problems: ["E125", "E680", "M5"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Valid Palindrome II

## Problem

You're given a string and need to determine if it can become a palindrome by removing at most one character. A palindrome reads the same forwards and backwards, like "aba" or "racecar". The twist here is that you're allowed one deletion to fix a string that isn't already a palindrome.

For example, "abca" can become a palindrome by removing either 'b' (leaving "aca") or 'c' (leaving "aba"). Either works, so the answer is true. But "abc" cannot become a palindrome with just one deletion - even if you remove any character, the remaining string won't be a palindrome.

The key insight is that you only need to consider deleting a character when you encounter a mismatch. If the string is already a palindrome (no mismatches when comparing from both ends), you return true immediately. When you find the first mismatch at positions left and right, you have two choices: skip the character at left or skip the character at right. Check if either resulting substring forms a palindrome.

Importantly, you cannot delete more than one character. If skipping the character at left doesn't create a palindrome AND skipping the character at right doesn't create a palindrome, then no single deletion will work, so return false.

The challenge is implementing this efficiently in O(n) time using the two-pointer technique rather than generating and checking all possible strings with one character removed.

## Why This Matters

This problem frequently appears in technical interviews at major tech companies because it tests your ability to optimize brute force solutions and use the two-pointer pattern effectively. In production systems, palindrome checking and edit distance calculations appear in DNA sequence analysis (biological data often has palindromic structures), data deduplication (detecting near-identical strings), and spell-checking systems. The problem teaches you greedy decision-making with limited resources - you have exactly one deletion to "spend", so you must spend it wisely when you encounter a mismatch. It also demonstrates problem reduction: once you've narrowed down to two options, you reduce the problem to the simpler "is this a palindrome" check. Many string algorithm problems follow this pattern: use pointers to scan until you find an issue, then branch on a small number of possibilities. Understanding this prepares you for more complex problems involving edit distance, longest palindromic substring, and string transformations.

## Examples

**Example 1:**
- Input: `s = "aba"`
- Output: `true`

**Example 2:**
- Input: `s = "abca"`
- Output: `true`
- Explanation: Removing the character 'c' results in "aba", which is a palindrome.

**Example 3:**
- Input: `s = "abc"`
- Output: `false`

## Constraints

- 1 <= s.length <= 10⁵
- s consists of lowercase English letters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Two Pointers with One Chance
Start with two pointers at the beginning and end of the string. Move them inward while characters match. When you find a mismatch at positions left and right, you have two options: skip the character at left OR skip the character at right. Check if either resulting substring is a palindrome. You only get one deletion, so this decision is critical.

### Hint 2: Helper Function for Palindrome Check
Create a helper function that checks if a substring (or range) is a palindrome without any deletions allowed. When you encounter the first mismatch, call this helper twice: once for s[left+1...right] and once for s[left...right-1]. If either is a palindrome, return true; otherwise false.

### Hint 3: Greedy Decision Making
The greedy insight: you only need to consider deleting a character when you encounter the first mismatch. If the string is already a palindrome (no mismatches), return true immediately. If there's a mismatch, try both deletion options. There's no need to try deleting characters that already match.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Two Pointers with Helper | O(n) | O(1) | Optimal solution |
| Brute Force (Try all deletions) | O(n²) | O(n) | Try removing each char, check palindrome |
| Recursion with Memoization | O(n²) | O(n²) | Overkill for this problem |
| DP Longest Palindromic Subseq | O(n²) | O(n²) | Works but unnecessarily complex |

## Common Mistakes

### Mistake 1: Trying to delete more than once
```
// Wrong: Allowing multiple deletions
boolean isPalindrome(String s, int deletions) {
    int left = 0, right = s.length() - 1;
    while (left < right) {
        if (s.charAt(left) != s.charAt(right)) {
            if (deletions == 0) return false;
            // Wrong: trying both options recursively with deletions-1
            return isPalindrome(s.substring(0,left) + s.substring(left+1), deletions-1) ||
                   isPalindrome(s.substring(0,right) + s.substring(right+1), deletions-1);
        }
        left++; right--;
    }
    return true;
}
```
**Why it's wrong**: The problem allows at most one deletion, not multiple. This approach is overcomplicated and has exponential complexity.

**Correct approach**: After first mismatch, check if either substring (with one char removed) is a palindrome with no further deletions.

### Mistake 2: Not checking both deletion options
```
// Wrong: Only checking one deletion option
if (s.charAt(left) != s.charAt(right)) {
    // Only trying to delete left character
    return isPalindrome(s, left + 1, right);  // Missing the other option!
}
```
**Why it's wrong**: You must try both options (delete left OR delete right) because either could lead to a valid palindrome.

**Correct approach**: Return `isPalindrome(left+1, right) || isPalindrome(left, right-1)`.

### Mistake 3: Incorrect palindrome check helper
```
// Wrong: Creating new strings (inefficient)
boolean isPalindrome(String s) {
    return s.equals(new StringBuilder(s).reverse().toString());
}
```
**Why it's wrong**: While this works, it creates unnecessary string objects. For the main algorithm, you also need a range-based check without creating substrings.

**Correct approach**: Use two-pointer technique on index ranges: `isPalindrome(s, left, right)`.

## Variations

| Variation | Difference | Difficulty Increase |
|-----------|------------|---------------------|
| Valid palindrome (basic) | No deletions allowed | None (easier) |
| Valid palindrome with K deletions | Allow up to K deletions | Medium (requires DP/recursion) |
| Minimum deletions to make palindrome | Return count of deletions needed | Medium (DP problem) |
| Valid palindrome ignoring non-alphanumeric | Skip special chars, case-insensitive | None (same complexity) |
| Construct palindrome with min insertions | Add characters instead of delete | Medium (different problem) |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Solve using two-pointers with helper
- [ ] Handle edge cases (already palindrome, "ab", "abc")
- [ ] Implement without bugs on first try
- [ ] Explain why only first mismatch matters
- [ ] Test with "aba", "abca", "abc", "racecar"
- [ ] Solve in under 15 minutes
- [ ] Optimize to avoid substring creation
- [ ] Trace through both deletion options
- [ ] Revisit after 3 days (spaced repetition)
- [ ] Revisit after 1 week (spaced repetition)
- [ ] Solve basic palindrome check first (E125)
- [ ] Solve minimum deletions variation

**Strategy**: See [Two Pointers Pattern](../strategies/patterns/two-pointers.md)
