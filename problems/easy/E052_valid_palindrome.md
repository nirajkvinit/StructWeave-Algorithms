---
id: E052
old_id: F125
slug: valid-palindrome
title: Valid Palindrome
difficulty: easy
category: easy
topics: ["string"]
patterns: ["two-pointers"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E053", "E680", "M005"]
prerequisites: ["two-pointers", "string-manipulation", "character-validation"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Valid Palindrome

## Problem

Given a string `s`, determine if it's a **palindrome** when considering only alphanumeric characters (letters and digits) and ignoring case.

**What's a palindrome?** A word, phrase, or sequence that reads the same backward as forward. "racecar" is a palindrome. "race car" is also a palindrome if you ignore spaces.

**The twist:** You must:
- Ignore all non-alphanumeric characters (spaces, punctuation, symbols)
- Treat uppercase and lowercase letters as the same

For example, "A man, a plan, a canal: Panama" becomes "amanaplanacanalpanama" after filtering - which is a palindrome.

**Edge case:** An empty string (or a string with only non-alphanumeric characters) counts as a palindrome.

**Two approaches:**
1. Clean the string first, then check
2. Use two pointers and skip invalid characters on the fly

## Why This Matters

Palindrome checking appears in DNA sequence analysis (finding palindromic sequences), text processing, data validation, and compression algorithms. The two-pointer technique you learn here is fundamental for string manipulation and appears in problems involving reversals, partitioning, and pattern matching.

This problem teaches the trade-off between preprocessing (clean first) versus online processing (check during traversal). Understanding when to use each approach is crucial for optimizing space usage in production systems.

## Examples

**Example 1:**
- Input: `s = "A man, a plan, a canal: Panama"`
- Output: `true`
- Explanation: "amanaplanacanalpanama" is a palindrome.

**Example 2:**
- Input: `s = "race a car"`
- Output: `false`
- Explanation: "raceacar" is not a palindrome.

**Example 3:**
- Input: `s = " "`
- Output: `true`
- Explanation: s is an empty string "" after removing non-alphanumeric characters.
Since an empty string reads the same forward and backward, it is a palindrome.

## Constraints

- 1 <= s.length <= 2 * 10⁵
- s consists only of printable ASCII characters.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Clean String vs. Two Pointers</summary>

Two approaches exist:
1. **Clean and compare**: Remove non-alphanumeric characters, convert to lowercase, then check if string equals its reverse
2. **Two pointers in-place**: Use left and right pointers, skip non-alphanumeric characters on the fly

Which approach uses less space? Which is more efficient?

</details>

<details>
<summary>🎯 Hint 2: Two-Pointer Technique</summary>

Use two pointers starting at opposite ends:
- Left pointer starts at beginning, right at end
- Skip non-alphanumeric characters by advancing pointers
- Compare characters (case-insensitive) when both point to valid characters
- If any mismatch found, return false
- If pointers meet/cross, return true

How do you handle case-insensitivity without creating a new string?

</details>

<details>
<summary>📝 Hint 3: Implementation Details</summary>

```
function isPalindrome(s):
    1. Initialize left = 0, right = s.length - 1

    2. While left < right:
         a. Skip non-alphanumeric from left:
              while left < right and !isAlphanumeric(s[left]):
                  left++

         b. Skip non-alphanumeric from right:
              while left < right and !isAlphanumeric(s[right]):
                  right--

         c. Compare characters (case-insensitive):
              if toLowerCase(s[left]) != toLowerCase(s[right]):
                  return false

         d. Move pointers:
              left++, right--

    3. Return true
```

Helper: isAlphanumeric checks if character is letter or digit.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Clean string | O(n) | O(n) | Create new filtered string |
| **Two pointers** | **O(n)** | **O(1)** | In-place comparison |
| Reverse and compare | O(n) | O(n) | Filter, then compare with reverse |

## Common Mistakes

### 1. Not handling non-alphanumeric characters
```python
# WRONG: Compares all characters including spaces/punctuation
def isPalindrome(s):
    return s == s[::-1]

# CORRECT: Filter to alphanumeric only
def isPalindrome(s):
    left, right = 0, len(s) - 1
    while left < right:
        while left < right and not s[left].isalnum():
            left += 1
        while left < right and not s[right].isalnum():
            right -= 1
        if s[left].lower() != s[right].lower():
            return False
        left += 1
        right -= 1
    return True
```

### 2. Case sensitivity
```python
# WRONG: Case-sensitive comparison
def isPalindrome(s):
    cleaned = ''.join(c for c in s if c.isalnum())
    return cleaned == cleaned[::-1]
# "Aa" would fail

# CORRECT: Convert to lowercase
def isPalindrome(s):
    cleaned = ''.join(c.lower() for c in s if c.isalnum())
    return cleaned == cleaned[::-1]
```

### 3. Not checking left < right in inner loops
```python
# WRONG: Potential infinite loop or index error
def isPalindrome(s):
    left, right = 0, len(s) - 1
    while left < right:
        while not s[left].isalnum():  # Missing left < right check!
            left += 1
        while not s[right].isalnum():  # Missing left < right check!
            right -= 1
        if s[left].lower() != s[right].lower():
            return False
        left += 1
        right -= 1
    return True

# CORRECT: Check bounds in inner loops
def isPalindrome(s):
    left, right = 0, len(s) - 1
    while left < right:
        while left < right and not s[left].isalnum():
            left += 1
        while left < right and not s[right].isalnum():
            right -= 1
        if s[left].lower() != s[right].lower():
            return False
        left += 1
        right -= 1
    return True
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Palindrome II | Allow one character deletion | Try deleting at each mismatch, check if valid |
| Longest palindrome substring | Find longest palindromic substring | Expand around center or DP |
| Valid palindrome III | Allow k character deletions | DP with edit distance approach |
| Ignore all non-letters | Numbers don't count either | Modify isAlphanumeric to only check isalpha() |
| Sentence palindrome | Ignore word boundaries | Same approach, skip spaces too |

## Practice Checklist

**Correctness:**
- [ ] Handles empty string (returns true)
- [ ] Handles single character (returns true)
- [ ] Handles mixed case ("Aa" returns true)
- [ ] Handles special characters ("A man, a plan...")
- [ ] Handles strings with no alphanumeric (returns true)

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 7 minutes
- [ ] Can discuss space optimization (two pointers)
- [ ] Can extend to Palindrome II variation

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve Palindrome II (allow one deletion)
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Two Pointers Pattern](../../strategies/patterns/two-pointers.md)
