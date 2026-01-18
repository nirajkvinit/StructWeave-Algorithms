---
id: H014
old_id: F072
slug: edit-distance
title: Edit Distance
difficulty: hard
category: hard
topics: ["string", "dynamic-programming", "recursion"]
patterns: ["dp-2d", "sequence-alignment", "edit-distance"]
estimated_time_minutes: 45
frequency: high
related_problems: ["M072", "M115", "M161", "M583"]
prerequisites: ["2d-dp-basics", "string-manipulation", "recursive-thinking"]
strategy_ref: ../strategies/patterns/dynamic-programming.md
---
# Edit Distance

## Problem

Given two strings `word1` and `word2`, return the **minimum number of operations** required to convert `word1` to `word2`.

You have three permitted operations:
1. **Insert** a character
2. **Delete** a character
3. **Replace** a character

This is also known as the **Levenshtein distance** between two strings.

## Why This Matters

Edit distance is a **foundational algorithm** with broad applications:

**Real-world uses:**
- **Spell checkers**: Finding closest correct spelling ("teh" → "the")
- **DNA sequence alignment**: Comparing genetic sequences in bioinformatics
- **Natural Language Processing**: Measuring text similarity, plagiarism detection
- **Version control**: Computing file diffs (Git, SVN)
- **Speech recognition**: Matching phonetic patterns

**Why it's Hard:**
- **2D DP state space**: Requires understanding dp[i][j] represents subproblems
- **Recurrence relation**: Three choices at each step (insert/delete/replace)
- **Edge cases**: Empty strings, identical strings, no common characters
- **Space optimization**: Can reduce from O(mn) to O(min(m,n))

## Examples

**Example 1:**
- Input: `word1 = "horse", word2 = "ros"`
- Output: `3`
- Explanation: horse -> rorse (replace 'h' with 'r')
rorse -> rose (remove 'r')
rose -> ros (remove 'e')

**Example 2:**
- Input: `word1 = "intention", word2 = "execution"`
- Output: `5`
- Explanation:
  ```
  intention → inention  (delete 't')
  inention  → enention  (replace 'i' with 'e')
  enention  → exention  (replace 'n' with 'x')
  exention  → exection  (replace 'n' with 'c')
  exection  → execution (insert 'u')
  ```

**Example 3:**
- Input: `word1 = "", word2 = "abc"`
- Output: `3`
- Explanation: Insert 'a', 'b', 'c' (3 insertions)

**Example 4:**
- Input: `word1 = "abc", word2 = "abc"`
- Output: `0`
- Explanation: Strings are identical, no operations needed

## Constraints

- 0 <= word1.length, word2.length <= 500
- word1 and word2 consist of lowercase English letters.

## Think About

1. If characters word1[i] and word2[j] match, what's the minimum edit distance?
2. If they don't match, which is cheaper: insert, delete, or replace?
3. What does dp[i][j] represent? (Hint: distance between word1[0..i-1] and word2[0..j-1])
4. What are the base cases when one string is empty?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Building intuition with recursion</summary>

Start with a **recursive formulation**:

**Problem:** Convert word1[0..i-1] to word2[0..j-1]

**Base cases:**
- If i = 0: Need j insertions to build word2[0..j-1] from empty string
- If j = 0: Need i deletions to reduce word1[0..i-1] to empty string

**Recursive case:** Compare word1[i-1] with word2[j-1]

**Case 1: Characters match** (word1[i-1] == word2[j-1])
```
No operation needed!
editDistance(i, j) = editDistance(i-1, j-1)
```

**Case 2: Characters don't match**
Try all three operations and take minimum:
```
1. Insert word2[j-1]: editDistance(i, j-1) + 1
   (Now word1[0..i-1] matches word2[0..j-2], handle word2[j-1] with insert)

2. Delete word1[i-1]: editDistance(i-1, j) + 1
   (Now word1[0..i-2] needs to match word2[0..j-1])

3. Replace word1[i-1] with word2[j-1]: editDistance(i-1, j-1) + 1
   (Both strings advance, last chars now match)

editDistance(i, j) = 1 + min(insert, delete, replace)
```

**Problem with pure recursion:** Exponential time due to overlapping subproblems!

**Example overlap:**
```
word1 = "abc", word2 = "def"
editDistance(2, 2) is computed multiple times:
  - From editDistance(3, 3) via delete
  - From editDistance(3, 2) via replace
  - etc.
```

This hints at needing **memoization** or **bottom-up DP**.

</details>

<details>
<summary>🎯 Hint 2: Three approaches with trade-offs</summary>

### Approach 1: Recursive with Memoization (Top-Down DP)
```
memo = {}

function editDistance(i, j):
    if (i, j) in memo:
        return memo[(i, j)]

    if i == 0:
        return j  # Need j insertions
    if j == 0:
        return i  # Need i deletions

    if word1[i-1] == word2[j-1]:
        result = editDistance(i-1, j-1)
    else:
        insert = editDistance(i, j-1) + 1
        delete = editDistance(i-1, j) + 1
        replace = editDistance(i-1, j-1) + 1
        result = min(insert, delete, replace)

    memo[(i, j)] = result
    return result

return editDistance(m, n)
```
- Time: O(mn) - each state computed once
- Space: O(mn) - memo + O(m+n) recursion stack
- Easier to understand (matches recursive thinking)

### Approach 2: Bottom-Up DP (2D table)
```
dp[i][j] = edit distance for word1[0..i-1] to word2[0..j-1]

# Initialize base cases
dp[0][j] = j for all j  # Empty word1 → word2[0..j-1]
dp[i][0] = i for all i  # word1[0..i-1] → empty word2

# Fill table
for i = 1 to m:
    for j = 1 to n:
        if word1[i-1] == word2[j-1]:
            dp[i][j] = dp[i-1][j-1]
        else:
            dp[i][j] = 1 + min(
                dp[i][j-1],    # insert
                dp[i-1][j],    # delete
                dp[i-1][j-1]   # replace
            )

return dp[m][n]
```
- Time: O(mn)
- Space: O(mn)
- Most common interview approach

### Approach 3: Space-Optimized DP (1D array)
Notice dp[i][j] only depends on:
- dp[i-1][j-1] (diagonal)
- dp[i-1][j] (above)
- dp[i][j-1] (left)

We only need **current row** and **previous row**!
```
prev = [0, 1, 2, ..., n]  # Base case for row 0
curr = [0] * (n + 1)

for i = 1 to m:
    curr[0] = i  # Base case for column 0
    for j = 1 to n:
        if word1[i-1] == word2[j-1]:
            curr[j] = prev[j-1]
        else:
            curr[j] = 1 + min(curr[j-1], prev[j], prev[j-1])
    prev = curr
    curr = [0] * (n + 1)

return prev[n]
```
- Time: O(mn)
- Space: O(min(m,n)) - use shorter string for columns
- Interview bonus points!

**Which to use?**
- **Interviews:** 2D DP (clearest), mention space optimization
- **Production:** Space-optimized if memory constrained
- **Learning:** Start with memoization, then 2D DP

</details>

<details>
<summary>📝 Hint 3: Detailed 2D DP algorithm</summary>

```
function minDistance(word1, word2):
    m = length(word1)
    n = length(word2)

    # Create DP table (m+1) x (n+1)
    dp = 2D array of size (m+1) x (n+1)

    # Base case: converting empty string to word2[0..j-1]
    for j = 0 to n:
        dp[0][j] = j

    # Base case: converting word1[0..i-1] to empty string
    for i = 0 to m:
        dp[i][0] = i

    # Fill the table
    for i = 1 to m:
        for j = 1 to n:
            if word1[i-1] == word2[j-1]:
                # Characters match, no operation needed
                dp[i][j] = dp[i-1][j-1]
            else:
                # Take minimum of three operations
                insert_cost = dp[i][j-1] + 1    # Insert word2[j-1]
                delete_cost = dp[i-1][j] + 1    # Delete word1[i-1]
                replace_cost = dp[i-1][j-1] + 1 # Replace word1[i-1]

                dp[i][j] = min(insert_cost, delete_cost, replace_cost)

    # Answer is in bottom-right cell
    return dp[m][n]
```

**Understanding the operations:**

When at dp[i][j] and word1[i-1] ≠ word2[j-1]:

1. **Insert word2[j-1] into word1:**
   - We've already matched word1[0..i-1] with word2[0..j-2] (cost: dp[i][j-1])
   - Insert word2[j-1] at end of word1 (cost: +1)
   - Total: dp[i][j-1] + 1

2. **Delete word1[i-1]:**
   - Match word1[0..i-2] with word2[0..j-1] (cost: dp[i-1][j])
   - Delete word1[i-1] (cost: +1)
   - Total: dp[i-1][j] + 1

3. **Replace word1[i-1] with word2[j-1]:**
   - Match word1[0..i-2] with word2[0..j-2] (cost: dp[i-1][j-1])
   - Replace word1[i-1] (cost: +1)
   - Total: dp[i-1][j-1] + 1

**Edge cases:**
- Empty word1: dp[0][j] = j (all insertions)
- Empty word2: dp[i][0] = i (all deletions)
- Identical strings: dp[m][n] = 0 (no ops propagated through matches)

</details>

---

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute force recursion | O(3^max(m,n)) | O(max(m,n)) | Exponential, TLE |
| Recursive + Memoization | O(mn) | O(mn) + O(m+n) | Memo table + recursion stack |
| **2D DP (bottom-up)** | **O(mn)** | **O(mn)** | Most common interview solution |
| Space-optimized DP | O(mn) | O(min(m,n)) | Production-quality optimization |

**Why 2D DP is standard:**
- O(mn) time is optimal (must examine all character pairs)
- O(mn) space is acceptable for most interview constraints (m, n ≤ 500)
- Iterative (no stack overflow risk)
- Easy to trace and debug

**Space optimization details:**
- Since dp[i][j] only depends on row i-1 and current row i
- Can maintain just two 1D arrays: prev_row and curr_row
- Further: can reduce to single array with careful update order
- Reduces space from O(mn) to O(min(m, n))

---

## Common Mistakes

### 1. Off-by-one indexing
```python
# WRONG: Confusing dp indices with string indices
if word1[i] == word2[j]:  # Should be i-1, j-1!
    dp[i][j] = dp[i-1][j-1]

# CORRECT: dp[i][j] represents word1[0..i-1] and word2[0..j-1]
if word1[i-1] == word2[j-1]:
    dp[i][j] = dp[i-1][j-1]
```

### 2. Not initializing base cases
```python
# WRONG: Forgetting to initialize row 0 and column 0
dp = [[0] * (n+1) for _ in range(m+1)]
# ... fill table ...

# CORRECT: Initialize base cases
dp = [[0] * (n+1) for _ in range(m+1)]
for i in range(m+1):
    dp[i][0] = i
for j in range(n+1):
    dp[0][j] = j
```

### 3. Incorrect operation costs
```python
# WRONG: Not adding +1 for operation
dp[i][j] = min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])

# CORRECT: Add 1 for each operation
dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
```

### 4. Wrong dimension order
```python
# WRONG: Creating table with swapped dimensions
dp = [[0] * (m+1) for _ in range(n+1)]  # Should be (m+1) rows!

# CORRECT: m+1 rows, n+1 columns
dp = [[0] * (n+1) for _ in range(m+1)]
```

### 5. Not handling empty strings
```python
# WRONG: Crashes on empty input
if word1[0] == word2[0]:  # Index error if word1 = ""
    # ...

# CORRECT: Base cases handle empty strings naturally
if m == 0:
    return n
if n == 0:
    return m
# Or use dp table with proper initialization
```

---

## Visual Walkthrough

**Input:** `word1 = "horse"`, `word2 = "ros"`

### DP Table Construction:

```
       ""  r   o   s
""      0   1   2   3
h       1   ?   ?   ?
o       2   ?   ?   ?
r       3   ?   ?   ?
s       4   ?   ?   ?
e       5   ?   ?   ?

Base cases initialized:
- Row 0: [0, 1, 2, 3] (insert r, o, s)
- Col 0: [0, 1, 2, 3, 4, 5] (delete h, o, r, s, e)

Fill cell by cell:

Cell dp[1][1] (h vs r):
├─ h ≠ r, so try all ops:
├─ insert:  dp[1][0] + 1 = 1 + 1 = 2
├─ delete:  dp[0][1] + 1 = 1 + 1 = 2
├─ replace: dp[0][0] + 1 = 0 + 1 = 1 ← minimum
└─ dp[1][1] = 1

Cell dp[1][2] (h vs ro):
├─ h ≠ o, so:
├─ insert:  dp[1][1] + 1 = 1 + 1 = 2 ← minimum
├─ delete:  dp[0][2] + 1 = 2 + 1 = 3
├─ replace: dp[0][1] + 1 = 1 + 1 = 2 ← minimum
└─ dp[1][2] = 2

Cell dp[2][2] (ho vs ro):
├─ o == o, no operation!
└─ dp[2][2] = dp[1][1] = 1

Cell dp[3][1] (hor vs r):
├─ r == r, no operation!
└─ dp[3][1] = dp[2][0] = 2

Complete table:
       ""  r   o   s
""      0   1   2   3
h       1   1   2   3
o       2   2   1   2
r       3   2   2   2
s       4   3   3   2
e       5   4   4   3

Answer: dp[5][3] = 3
```

**Trace-back (reconstruction):**
```
dp[5][3] = 3 (e → s): delete 'e'
dp[4][3] = 2 (s → s): match
dp[3][2] = 2 (r → o): delete 'r'
dp[2][2] = 1 (o → o): match
dp[1][1] = 1 (h → r): replace 'h' with 'r'
dp[0][0] = 0: done

Operations: replace h→r, delete r, delete e
Result: horse → rorse → rose → ros
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Weighted edit distance** | Different costs for ops | Use costs[op] instead of +1 |
| **One Edit Distance** | Check if exactly 1 edit | Two pointers, early exit |
| **Longest Common Subsequence (LCS)** | Only insert/delete (no replace) | Similar DP, different recurrence |
| **String alignment** | Need actual operations | Add backtracking to reconstruct path |
| **Phonetic distance** | Similar sounding chars cheaper | Weighted costs based on phonetics |

---

## Practice Checklist

**Correctness:**
- [ ] Handles both strings empty
- [ ] Handles one string empty
- [ ] Handles identical strings (returns 0)
- [ ] Handles completely different strings
- [ ] Handles strings of different lengths
- [ ] Handles single character strings

**Algorithm Understanding:**
- [ ] Can explain what dp[i][j] represents
- [ ] Can derive recurrence relation from scratch
- [ ] Understands all three operations (insert/delete/replace)
- [ ] Can trace through DP table construction
- [ ] Can reconstruct actual edit sequence

**Interview Readiness:**
- [ ] Can code 2D DP solution in 20 minutes
- [ ] Can explain time/space complexity
- [ ] Can discuss space optimization approach
- [ ] Can handle follow-up: reconstruct operations sequence

**Spaced Repetition Tracker:**
- [ ] Day 1: Study solution, understand DP state definition
- [ ] Day 3: Implement 2D DP from scratch
- [ ] Day 7: Implement with trace-back (operation reconstruction)
- [ ] Day 14: Implement space-optimized version
- [ ] Day 30: Speed run (< 15 min) + explain to someone

---

**Strategy**: See [2D Dynamic Programming](../../strategies/patterns/dynamic-programming.md) | [String Algorithms](../../strategies/data-structures/strings.md)
