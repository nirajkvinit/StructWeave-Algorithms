---
id: M003
old_id: F005
slug: longest-palindromic-substring
title: Longest Palindromic Substring
difficulty: medium
category: medium
topics: ["string", "dynamic-programming"]
patterns: ["expand-around-center", "dynamic-programming"]
estimated_time_minutes: 30
frequency: high
related_problems: ["E009", "M647", "M516", "M005"]
prerequisites: ["palindrome-basics", "two-pointers"]
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Longest Palindromic Substring

## Problem

Given a string, identify and return the longest substring that reads the same forwards and backwards. A palindrome is a sequence that mirrors itself, like "racecar" or "noon". For example, in "babad", both "bab" and "aba" are valid palindromic substrings of length 3, so either is an acceptable answer. The challenge lies in efficiently checking all possible substrings without resorting to a brute-force approach that examines every substring individually. Important distinction: you're looking for a palindromic substring (contiguous characters), not a subsequence (which can skip characters). Edge cases to watch for: single-character strings are trivially palindromes, strings with no palindromes longer than 1, and even-length versus odd-length palindromes which require slightly different handling.

## Why This Matters

Palindrome detection appears in surprising places across computer science and software engineering. DNA sequence analysis uses palindrome finding for identifying gene structures and restriction sites. Compression algorithms detect palindromic patterns to improve encoding efficiency. Version control systems use similar symmetry-detection logic to identify code refactoring patterns. The expand-around-center technique you'll learn transfers directly to other problems involving radial pattern matching. This problem teaches you to think about string structure from the inside-out rather than left-to-right, a perspective shift valuable for many optimization problems. It's also a gateway to understanding dynamic programming, as the DP solution reveals how larger problems decompose into smaller overlapping subproblems. Frequently asked in interviews because it has multiple valid approaches with different time-space tradeoffs, testing your ability to analyze and choose optimal solutions.

## Examples

**Example 1:**
- Input: `s = "babad"`
- Output: `"bab"`
- Explanation: "aba" is also a valid answer.

**Example 2:**
- Input: `s = "cbbd"`
- Output: `"bb"`

## Constraints

- 1 <= s.length <= 1000
- s consist of only digits and English letters.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?
4. What makes a string a palindrome?
5. How do palindromes grow from their centers?
6. Do odd-length and even-length palindromes differ?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Growing from the center</summary>

Think about how palindromes are structured. They're symmetric around a center point.

Consider the palindrome "racecar":
```
r a c e c a r
      ↑
    center
```

If you start at the center and expand outward, you can verify it's a palindrome by checking if characters at equal distances match.

**Think about:**
- How many possible centers exist in a string of length n?
- Is the center always a single character?
- What about even-length palindromes like "abba"?

**Key insight:** There are 2n-1 possible centers (n single characters + n-1 gaps between characters)

</details>

<details>
<summary>🎯 Hint 2: Expand around center technique</summary>

For each possible center, **expand outward** while characters match.

**Two cases to handle:**
1. **Odd-length palindromes**: Single character center (e.g., "aba")
2. **Even-length palindromes**: Gap between two characters (e.g., "abba")

```
Odd-length example "babad":
  Center at 'a' (index 1):
    b[a]b → expand → [bab] ✓

Even-length example "cbbd":
  Center at gap between 'bb' (indices 1,2):
    c[bb]d → can't expand further → [bb] ✓
```

**Algorithm:**
- Try each of the 2n-1 centers
- For each center, expand while `s[left] == s[right]`
- Track the longest palindrome found

**Time complexity:** O(n²) - n centers × O(n) expansion each

</details>

<details>
<summary>📝 Hint 3: Implementation with helper function</summary>

```python
def longestPalindrome(s):
    if not s:
        return ""

    start = 0
    max_len = 0

    def expandAroundCenter(left, right):
        # Expand while within bounds and characters match
        while left >= 0 and right < len(s) and s[left] == s[right]:
            left -= 1
            right += 1
        # Return length of palindrome found
        # (left and right are now one past the palindrome edges)
        return right - left - 1

    for i in range(len(s)):
        # Check odd-length palindromes (single character center)
        len1 = expandAroundCenter(i, i)

        # Check even-length palindromes (gap center)
        len2 = expandAroundCenter(i, i + 1)

        # Take maximum of both
        current_max = max(len1, len2)

        # Update global maximum
        if current_max > max_len:
            max_len = current_max
            # Calculate start position
            start = i - (current_max - 1) // 2

    return s[start:start + max_len]
```

**Why `start = i - (current_max - 1) // 2`?**
- Center is at position `i`
- Palindrome extends `(len - 1) // 2` to the left
- Works for both odd and even lengths

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Brute force (check all substrings) | O(n³) | O(1) | Too slow |
| **Expand around center** | **O(n²)** | **O(1)** | Optimal for most cases |
| Dynamic programming | O(n²) | O(n²) | Clear logic but uses extra space |
| Manacher's algorithm | O(n) | O(n) | Optimal but complex |

**Why expand-around-center is preferred:**
- O(1) space (only storing indices)
- Intuitive and easy to code
- O(n²) is acceptable for n ≤ 1000
- No extra data structures needed

**Dynamic programming approach:**
```
dp[i][j] = true if s[i:j+1] is palindrome

Base cases:
  dp[i][i] = true (single char)
  dp[i][i+1] = (s[i] == s[i+1]) (two chars)

Recurrence:
  dp[i][j] = (s[i] == s[j]) AND dp[i+1][j-1]
```

**Manacher's algorithm:**
- Achieves O(n) time but rarely needed in interviews
- Complex implementation, easy to make mistakes

---

## Common Mistakes

### 1. Forgetting even-length palindromes
```python
# WRONG: Only checks odd-length palindromes
for i in range(len(s)):
    length = expandAroundCenter(i, i)  # Missing (i, i+1)

# CORRECT: Check both odd and even
for i in range(len(s)):
    len1 = expandAroundCenter(i, i)
    len2 = expandAroundCenter(i, i + 1)
    current_max = max(len1, len2)
```

### 2. Off-by-one in expansion logic
```python
# WRONG: Doesn't include the center characters
while left > 0 and right < len(s) - 1:
    if s[left] == s[right]:
        left -= 1
        right += 1

# CORRECT: Start by including center, then expand
while left >= 0 and right < len(s) and s[left] == s[right]:
    left -= 1
    right += 1
return right - left - 1  # Adjust for overshoot
```

### 3. Incorrect start position calculation
```python
# WRONG: Doesn't account for palindrome centering
start = i - max_len // 2

# CORRECT: Use (max_len - 1) // 2
start = i - (max_len - 1) // 2
```

### 4. Not handling empty or single character strings
```python
# WRONG: Crashes on empty string
def longestPalindrome(s):
    for i in range(len(s)):  # range(0) is empty
        ...

# CORRECT: Early return for edge cases
if not s or len(s) == 1:
    return s
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Count palindromic substrings** | Return count not string | Same expand logic, increment counter |
| **Longest palindromic subsequence** | Allow gaps | DP with different recurrence |
| **Palindrome partitioning** | Split into all palindromes | Backtracking + memoization |
| **Shortest palindrome** | Add chars to make palindrome | KMP or expand from start |
| **Valid palindrome** | Check if palindrome | Two pointers from ends |

**Count palindromic substrings variation:**
```python
def countSubstrings(s):
    count = 0

    def expandAroundCenter(left, right):
        nonlocal count
        while left >= 0 and right < len(s) and s[left] == s[right]:
            count += 1  # Found a palindrome
            left -= 1
            right += 1

    for i in range(len(s)):
        expandAroundCenter(i, i)      # Odd length
        expandAroundCenter(i, i + 1)  # Even length

    return count
```

**Longest palindromic subsequence (DP):**
```python
def longestPalindromeSubseq(s):
    n = len(s)
    dp = [[0] * n for _ in range(n)]

    # Single characters
    for i in range(n):
        dp[i][i] = 1

    # Build up from length 2 to n
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            if s[i] == s[j]:
                dp[i][j] = dp[i+1][j-1] + 2
            else:
                dp[i][j] = max(dp[i+1][j], dp[i][j-1])

    return dp[0][n-1]
```

---

## Visual Walkthrough

```
String: "babad"

Centers to check:
  Position 0: 'b' → expand → "b" (length 1)
  Position 0-1: 'ba' → no match
  Position 1: 'a' → expand → "bab" (length 3) ✓
  Position 1-2: 'ab' → no match
  Position 2: 'b' → expand → "aba" (length 3) ✓
  Position 2-3: 'ba' → no match
  Position 3: 'a' → expand → "a" (length 1)
  Position 3-4: 'ad' → no match
  Position 4: 'd' → expand → "d" (length 1)

Detailed expansion for center at index 1 ('a'):
  Step 0: left=1, right=1, s[1]='a'
    Match! → palindrome: "a"

  Step 1: left=0, right=2, s[0]='b', s[2]='b'
    Match! → palindrome: "bab"

  Step 2: left=-1, right=3
    Out of bounds → stop

  Final: "bab" (length 3)

Maximum palindrome found: "bab" (or "aba")
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles single character strings
- [ ] Handles all same characters (e.g., "aaaa")
- [ ] Handles odd-length palindromes
- [ ] Handles even-length palindromes
- [ ] Returns first occurrence when multiple exist
- [ ] Handles no palindromes beyond single chars

**Code Quality:**
- [ ] Clean expand helper function
- [ ] No off-by-one errors
- [ ] Handles both odd and even centers
- [ ] Clear variable names

**Interview Readiness:**
- [ ] Can explain expand-around-center in 2 minutes
- [ ] Can code solution in 15 minutes
- [ ] Can discuss all three approaches (expand, DP, Manacher)
- [ ] Can handle follow-up: count palindromes

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve count palindromes variation
- [ ] Day 14: Implement DP approach
- [ ] Day 30: Quick review

---

**Strategy**: See [Dynamic Programming Pattern](../../strategies/patterns/dynamic-programming.md)
