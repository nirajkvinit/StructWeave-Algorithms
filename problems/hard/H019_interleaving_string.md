---
id: H019
old_id: F097
slug: interleaving-string
title: Interleaving String
difficulty: hard
category: hard
topics: ["string", "dynamic-programming", "recursion"]
patterns: ["2d-dynamic-programming", "path-finding"]
estimated_time_minutes: 45
frequency: medium
related_problems: ["M072", "M115", "H010"]
prerequisites: ["2d-dp-basics", "string-traversal", "backtracking"]
strategy_ref: ../strategies/patterns/dynamic-programming.md
---

# Interleaving String

## Problem

Given three strings `s1`, `s2`, and `s3`, determine if `s3` is formed by **interleaving** `s1` and `s2`.

An **interleaving** of two strings `s` and `t` is a configuration where `s` and `t` are divided into substrings such that:
- `s = s1 + s2 + ... + sn`
- `t = t1 + t2 + ... + tm`
- `|n - m| <= 1`
- The interleaving is `s1 + t1 + s2 + t2 + ...` or `t1 + s1 + t2 + s2 + ...`

**Note:** The order of characters from each string must be preserved.

```
Visualization of valid interleaving:

s1 = "aabcc"
s2 = "dbbca"
s3 = "aadbbcbcac"

s1:  a  a     b  c     c
     ↓  ↓     ↓  ↓     ↓
s3:  a  a  d  b  b  c  b  c  a  c
        ↓     ↓     ↓     ↓  ↓
s2:     d     b     b     c  a

Key insight: We're choosing characters from s1 or s2 at each step,
maintaining the relative order within each string.
```

## Why This Matters

This problem is a classic 2D Dynamic Programming challenge because:
- **State space is 2-dimensional**: Position in s1 × position in s2
- **Optimal substructure**: If we can interleave up to (i,j), can we extend it?
- **Multiple paths**: Many ways to form the same prefix, but we only care if ANY path works

**Real-world applications:**
- **Merge conflict resolution**: Determining if changes from two branches can be interleaved
- **DNA sequence analysis**: Checking if a sequence could have originated from two parent sequences
- **Log file merging**: Validating merged logs preserve chronological order from sources
- **Text processing**: Document merging while preserving paragraph order from sources

Unlike simple string matching, this requires tracking **two independent positions** simultaneously.

## Examples

**Example 1:**
- Input: `s1 = "aabcc", s2 = "dbbca", s3 = "aadbbcbcac"`
- Output: `true`
- Explanation: One valid interleaving path:
  ```
  Take 'a' from s1 → "a"
  Take 'a' from s1 → "aa"
  Take 'd' from s2 → "aad"
  Take 'b' from s1 → "aadb"
  Take 'b' from s2 → "aadbb"
  Take 'c' from s1 → "aadbbcb"
  Take 'b' from s2 → "aadbbcb"
  Take 'c' from s1 → "aadbbcbc"
  Take 'a' from s2 → "aadbbcbca"
  Take 'c' from s2 → "aadbbcbcac" ✓
  ```

**Example 2:**
- Input: `s1 = "aabcc", s2 = "dbbca", s3 = "aadbbbaccc"`
- Output: `false`
- Explanation: No valid interleaving exists. The character sequence in s3 cannot be formed while preserving order from both s1 and s2.

**Example 3:**
- Input: `s1 = "", s2 = "", s3 = ""`
- Output: `true`
- Explanation: Empty strings trivially interleave to empty string.

**Example 4:**
- Input: `s1 = "a", s2 = "b", s3 = "ab"`
- Output: `true`
- Explanation: Take 'a' from s1, then 'b' from s2.

**Example 5:**
- Input: `s1 = "abc", s2 = "def", s3 = "adbecf"`
- Output: `true`
- Explanation: Alternating pattern: a(s1), d(s2), b(s1), e(s2), c(s1), f(s2).

## Constraints

- 0 <= s1.length, s2.length <= 100
- 0 <= s3.length <= 200
- s1, s2, and s3 consist of lowercase English letters.

**Follow-up:** Could you solve it using only O(s2.length) additional memory space?

## Think About

1. What's the first check you should perform before attempting interleaving?
2. How many characters from s1 and s2 have we consumed at each step?
3. If we're at position (i, j) in s1 and s2, what positions in s3 are we checking?
4. Can this problem be solved with memoization? What would the state be?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Understanding the state space</summary>

Let's build intuition with Socratic questions:

**Q1: What's a necessary (but not sufficient) condition?**
```
If s3 is an interleaving of s1 and s2:
    len(s3) MUST equal len(s1) + len(s2)

s1 = "ab", s2 = "cd", s3 = "abcde"
→ 2 + 2 ≠ 5, so immediately return false
```
This check eliminates many inputs instantly!

**Q2: What positions are we tracking?**
We need THREE pointers:
- `i`: current position in s1 (0 to len(s1))
- `j`: current position in s2 (0 to len(s2))
- `k`: current position in s3 (0 to len(s3))

**Key relationship:** `k = i + j` always!
```
If we've used i chars from s1 and j chars from s2,
we've formed i+j chars of s3
```

**Q3: What are our choices at each step?**
At state (i, j):
1. If `s1[i] == s3[i+j]`: Try taking from s1 → move to (i+1, j)
2. If `s2[j] == s3[i+j]`: Try taking from s2 → move to (i, j+1)
3. If both match: Try BOTH paths (we need only ONE to succeed)
4. If neither matches: This path fails

**Q4: What's the base case?**
```
If i == len(s1) and j == len(s2):
    We've consumed both strings → return true

If we're at (i, j) and s3[i+j] doesn't match s1[i] or s2[j]:
    This path is blocked → return false
```

</details>

<details>
<summary>🎯 Hint 2: Multiple approaches (Recursion → DP)</summary>

### Approach 1: Recursive Backtracking (TLE but intuitive)

```python
def isInterleave(s1, s2, s3):
    if len(s1) + len(s2) != len(s3):
        return False

    def dfs(i, j):
        # Base case: consumed both strings
        if i == len(s1) and j == len(s2):
            return True

        k = i + j  # Current position in s3

        # Try taking from s1
        if i < len(s1) and s1[i] == s3[k]:
            if dfs(i + 1, j):
                return True

        # Try taking from s2
        if j < len(s2) and s2[j] == s3[k]:
            if dfs(i, j + 1):
                return True

        return False

    return dfs(0, 0)
```

**Problem:** O(2^(m+n)) time - explores exponential paths!

### Approach 2: 2D DP (Bottom-up)

Define `dp[i][j]` = true if first `i` chars of s1 and first `j` chars of s2 can interleave to form first `i+j` chars of s3.

**Recurrence:**
```
dp[i][j] = (dp[i-1][j] and s1[i-1] == s3[i+j-1])  // Take from s1
           OR
           (dp[i][j-1] and s2[j-1] == s3[i+j-1])  // Take from s2
```

**Base case:**
```
dp[0][0] = true  (empty strings interleave to empty)

dp[i][0] = dp[i-1][0] and s1[i-1] == s3[i-1]  (only s1)
dp[0][j] = dp[0][j-1] and s2[j-1] == s3[j-1]  (only s2)
```

### Approach 3: 1D DP (Space-optimized)

Since `dp[i][j]` only depends on `dp[i-1][j]` (previous row) and `dp[i][j-1]` (current row), we can use a 1D array!

```python
dp = [False] * (len(s2) + 1)
dp[0] = True

# Process row by row
for i in range(len(s1) + 1):
    for j in range(len(s2) + 1):
        # Update dp[j] in place
```

**Space:** O(min(m, n)) by choosing shorter string for columns

</details>

<details>
<summary>📝 Hint 3: Detailed 2D DP pseudocode</summary>

```
function isInterleave(s1, s2, s3):
    m = len(s1), n = len(s2)

    // Early exit
    if m + n != len(s3):
        return false

    // Create DP table: (m+1) x (n+1)
    dp = 2D array of size (m+1) x (n+1), initialized to false
    dp[0][0] = true  // Base case

    // Fill first column (only using s1)
    for i from 1 to m:
        dp[i][0] = dp[i-1][0] AND s1[i-1] == s3[i-1]

    // Fill first row (only using s2)
    for j from 1 to n:
        dp[0][j] = dp[0][j-1] AND s2[j-1] == s3[j-1]

    // Fill rest of table
    for i from 1 to m:
        for j from 1 to n:
            k = i + j - 1  // Position in s3 (0-indexed)

            // Can we extend from (i-1, j)?
            fromS1 = dp[i-1][j] AND s1[i-1] == s3[k]

            // Can we extend from (i, j-1)?
            fromS2 = dp[i][j-1] AND s2[j-1] == s3[k]

            dp[i][j] = fromS1 OR fromS2

    return dp[m][n]
```

**State transitions visualization:**
```
At dp[i][j], we're asking:
"Can first i chars of s1 and first j chars of s2 form first i+j chars of s3?"

    ┌─────────┐
    │ dp[i-1][j] │  ← Used i-1 from s1, j from s2
    └────┬────┘
         │ Take s1[i-1]?
         ↓
    ┌────────┐
    │ dp[i][j] │
    └────────┘
         ↑
         │ Take s2[j-1]?
    ┌────┴────┐
    │ dp[i][j-1] │  ← Used i from s1, j-1 from s2
    └──────────┘
```

</details>

---

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute-force recursion | O(2^(m+n)) | O(m+n) | Explores all paths, recursion stack |
| **2D DP** | **O(m × n)** | **O(m × n)** | Fill entire table once |
| 1D DP (space-optimized) | O(m × n) | O(min(m,n)) | Rolling array optimization |
| Memoized recursion | O(m × n) | O(m × n) | Same as 2D DP, easier to code |

**Why DP wins:**
- Each state (i, j) computed exactly once
- Avoids recomputing overlapping subproblems
- Bottom-up DP avoids recursion overhead

**Trade-offs:**
- 2D DP: Easier to understand and debug
- 1D DP: Better space for large inputs, trickier to implement correctly

---

## Common Mistakes

### 1. Forgetting the length check
```python
# WRONG: Immediately start DP without checking
def isInterleave(s1, s2, s3):
    m, n = len(s1), len(s2)
    dp = [[False] * (n+1) for _ in range(m+1)]
    # ... if s3 length is wrong, we still compute everything!

# CORRECT: Early exit
if len(s1) + len(s2) != len(s3):
    return False
```

### 2. Off-by-one errors in indices
```python
# WRONG: Confusing 0-indexed vs 1-indexed
dp[i][j] = dp[i-1][j] and s1[i] == s3[i+j]  # s1[i] out of bounds!

# CORRECT: dp[i][j] represents first i chars, so use i-1 for indexing
dp[i][j] = dp[i-1][j] and s1[i-1] == s3[i+j-1]
#                              ^^^         ^^^
#                         0-indexed    0-indexed
```

### 3. Wrong base case initialization
```python
# WRONG: Only setting dp[0][0]
dp[0][0] = True
# Forgot to fill first row and column!

# CORRECT: Handle edge cases
dp[0][0] = True
for i in range(1, m+1):
    dp[i][0] = dp[i-1][0] and s1[i-1] == s3[i-1]
for j in range(1, n+1):
    dp[0][j] = dp[0][j-1] and s2[j-1] == s3[j-1]
```

### 4. Using AND instead of OR in recurrence
```python
# WRONG: Requires BOTH paths to work
dp[i][j] = (dp[i-1][j] and s1[i-1] == s3[k]) and \
           (dp[i][j-1] and s2[j-1] == s3[k])

# CORRECT: Need only ONE valid path
dp[i][j] = (dp[i-1][j] and s1[i-1] == s3[k]) or \
           (dp[i][j-1] and s2[j-1] == s3[k])
```

### 5. Space-optimized DP: Wrong update order
```python
# WRONG: Overwriting values before reading them
for i in range(m+1):
    for j in range(n+1):
        dp[j] = ...  # This overwrites dp[j-1] before we read it!

# CORRECT: Process in correct order
# When going left-to-right, dp[j-1] is already updated (current row)
# and dp[j] is from previous row - exactly what we need!
```

---

## Visual Walkthrough

### Example: s1 = "aab", s2 = "axy", s3 = "aaxaby"

```
Build the DP table:

     ''  a   x   y
''   T   T   F   F
a    T   T   F   F
a    T   T   T   T
b    F   F   T   T
           ↑
        Result

Step-by-step construction:

Initial state:
     ''  a   x   y
''   T   ?   ?   ?
a    ?   ?   ?   ?
a    ?   ?   ?   ?
b    ?   ?   ?   ?

Fill first row (only s2):
s3[0]='a', s2[0]='a' → match, dp[0][1]=T
s3[1]='a', s2[1]='x' → no match, dp[0][2]=F
     ''  a   x   y
''   T   T   F   F
a    ?   ?   ?   ?
a    ?   ?   ?   ?
b    ?   ?   ?   ?

Fill first column (only s1):
s3[0]='a', s1[0]='a' → match, dp[1][0]=T
s3[1]='a', s1[1]='a' → match, dp[2][0]=T
s3[2]='x', s1[2]='b' → no match, dp[3][0]=F
     ''  a   x   y
''   T   T   F   F
a    T   ?   ?   ?
a    T   ?   ?   ?
b    F   ?   ?   ?

Fill dp[1][1]: (i=1, j=1, k=i+j-1=1)
s3[1]='a'
From s1: dp[0][1]=T and s1[0]='a' → T and T = T
From s2: dp[1][0]=T and s2[0]='a' → T and T = T
dp[1][1] = T or T = T

     ''  a   x   y
''   T   T   F   F
a    T   T   ?   ?
a    T   ?   ?   ?
b    F   ?   ?   ?

Fill dp[1][2]: (i=1, j=2, k=2)
s3[2]='x'
From s1: dp[0][2]=F → F
From s2: dp[1][1]=T and s2[1]='x' → T and T = T
dp[1][2] = F or T = F... wait, that's wrong!

Let me recalculate:
From s1: dp[0][2] and s1[0]=='x' → F and F = F
From s2: dp[1][1] and s2[1]=='x' → T and T = T
dp[1][2] = T

     ''  a   x   y
''   T   T   F   F
a    T   T   F   ?
a    T   ?   ?   ?
b    F   ?   ?   ?

Actually, let me redo this more carefully:

s1 = "aab" (indices 0,1,2)
s2 = "axy" (indices 0,1,2)
s3 = "aaxaby" (indices 0,1,2,3,4,5)

     ''  a   x   y
''   T
a
a
b

dp[0][1]: s3[0]='a', s2[0]='a', dp[0][0]=T → T
dp[0][2]: s3[1]='a', s2[1]='x' → F
dp[0][3]: stays F

dp[1][0]: s3[0]='a', s1[0]='a', dp[0][0]=T → T
dp[2][0]: s3[1]='a', s1[1]='a', dp[1][0]=T → T
dp[3][0]: s3[2]='x', s1[2]='b' → F

dp[1][1]: s3[1]='a'
  From s1[0]='a': dp[0][1]=T and 'a'=='a' → T
  From s2[0]='a': dp[1][0]=T and 'a'=='a' → T
  Result: T

dp[1][2]: s3[2]='x'
  From s1[0]='a': dp[0][2]=F → F
  From s2[1]='x': dp[1][1]=T and 'x'=='x' → T
  Result: T

... (continuing this process)

Final table:
     ''  a   x   y
''   T   T   F   F
a    T   T   T   F
a    T   T   T   T
b    F   F   T   T

Reading: dp[3][3] = T ✓
```

### Path Reconstruction (optional)

```
The TRUE cells show valid interleavings:

     ''  a   x   y
''   T → T
     ↓   ↓
a    T → T → T
     ↓   ↓   ↓
a    T → T → T → T
             ↓   ↓
b                T → T

One valid path (following arrows):
(0,0) → (0,1) [take s2[0]='a'] → (1,1) [take s1[0]='a']
      → (1,2) [take s2[1]='x'] → (2,2) [take s1[1]='a']
      → (2,3) [take s2[2]='y'] → (3,3) [take s1[2]='b']

Resulting interleaving: a(s2) a(s1) x(s2) a(s1) y(s2) b(s1) = "aaxayb"
Wait, that's not right!

Actually s3 = "aaxaby", so the path is:
a(s1) a(s2) x(s2) a(s1) b(s1) y(s2)?
Let me verify: "aa" + "x" + "a" + "b" + "y" = "aaxaby" ✓
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Three-way interleaving** | s4 formed from s1, s2, s3 | 3D DP: O(m×n×p) space/time |
| **Return one valid path** | Not just yes/no | Track parent pointers in DP |
| **Count all interleavings** | How many ways? | Change OR to + in recurrence |
| **Weighted interleaving** | Each char has cost | DP tracks minimum cost |
| **With character limits** | Max k chars from s1 | Add constraint to state |
| **Substring interleaving** | s3 is substring, not full | Different base cases |

---

## Practice Checklist

**Correctness:**
- [ ] Handles empty strings (s1="", s2="", s3="")
- [ ] Handles one empty string (s1="", s2="abc", s3="abc")
- [ ] Handles length mismatch (returns false immediately)
- [ ] Handles no valid interleaving
- [ ] Handles multiple valid interleavings
- [ ] Handles all characters from one string first
- [ ] Handles alternating characters

**Algorithm Understanding:**
- [ ] Can explain what dp[i][j] represents
- [ ] Can derive the recurrence relation
- [ ] Understands why k = i + j
- [ ] Can trace through a small example by hand

**Implementation:**
- [ ] 2D DP: Can code without looking (20 min)
- [ ] 1D DP: Can code space-optimized version (25 min)
- [ ] Memoized recursion: Can code top-down (15 min)
- [ ] No off-by-one errors in indices

**Interview Readiness:**
- [ ] Can explain approach in 3 minutes
- [ ] Can code 2D DP solution in 15 minutes
- [ ] Can discuss space optimization
- [ ] Can handle follow-up variations

**Spaced Repetition Tracker:**
- [ ] Day 1: Study 2D DP solution, understand state space
- [ ] Day 3: Implement 2D DP from scratch
- [ ] Day 7: Implement space-optimized version
- [ ] Day 14: Solve without looking at notes
- [ ] Day 30: Speed run (< 15 min), explain to someone

---

**Strategy**: See [2D Dynamic Programming](../../strategies/patterns/dynamic-programming.md) | [String Processing](../../strategies/fundamentals/string-algorithms.md)
