---
id: M020
old_id: F060
slug: permutation-sequence
title: Permutation Sequence
difficulty: medium
category: medium
topics: ["math", "combinatorics", "backtracking"]
patterns: ["backtrack-permutation", "factorial-number-system"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M027", "M046", "M031"]
prerequisites: ["factorial-arithmetic", "permutations-basics"]
strategy_ref: ../strategies/patterns/backtracking.md
---

# Permutation Sequence

## Problem

Imagine listing all possible arrangements (permutations) of the numbers 1 through n in lexicographic (dictionary) order. For n=3, you'd have 6 permutations: "123", "132", "213", "231", "312", "321". Given n and k, directly compute the kth permutation without generating all previous ones.

The naive approach of generating all n! permutations until reaching the kth one becomes impossibly slow as n grows (10! = 3.6 million, 15! = 1.3 trillion). The key insight is that permutations have a structured pattern based on factorials: all permutations starting with a particular digit form a group, and each group has (n-1)! permutations.

For n=4, there are 4! = 24 permutations. The first 6 start with '1', the next 6 with '2', the next 6 with '3', and the last 6 with '4' (because 24/4 = 6 = 3!). To find the 9th permutation, you know it's in the second group (starts with '2'), and it's the 3rd permutation within that group. This factorial-based grouping allows you to determine each digit position by position using division and modulo operations.

This technique is called the **factorial number system** (also known as factorial base or Lehmer code), where you essentially represent k in base factorial to directly construct the permutation.

```
Example for n=3:
Position  Permutation
   1         123
   2         132
   3         213
   4         231
   5         312
   6         321

k=3 → return "213"
```

## Why This Matters

This problem teaches a beautiful example of mathematical optimization: using the structure of the problem (factorial groups) to convert an exponential enumeration task into a polynomial computation. It's a gateway to understanding ranking/unranking algorithms used throughout computer science.

**Real-world applications:**
- **Combinatorial search**: Efficiently jumping to specific states in large search spaces (chess endgame tables, puzzle solvers)
- **Cryptography**: Generating specific permutation-based keys or S-boxes without storing all possibilities
- **Hashing**: Perfect hash functions for permutations (map each permutation to unique integer)
- **Genetic algorithms**: Encoding and decoding permutation-based solutions compactly
- **Database optimization**: Selecting specific join orders from exponentially many possibilities
- **Testing frameworks**: Generating specific test case permutations for reproducible testing
- **Compression algorithms**: Encoding permutations efficiently in data streams

This appears in interviews because it tests mathematical thinking rather than just coding. Companies want to see if you can recognize factorial structure, avoid brute force when analytical solutions exist, and handle edge cases like 0-indexed vs 1-indexed conversions and the minimum integer overflow issue with n = -2³¹.

## Examples

**Example 1:**
- Input: `n = 3, k = 3`
- Output: `"213"`
- Explanation: The permutations in order are ["123","132","213","231","312","321"]. The 3rd permutation is "213".

**Example 2:**
- Input: `n = 4, k = 9`
- Output: `"2314"`
- Explanation: The 9th permutation of [1,2,3,4] is "2314".

**Example 3:**
- Input: `n = 3, k = 1`
- Output: `"123"`
- Explanation: The 1st permutation is "123".

## Constraints

- 1 <= n <= 9
- 1 <= k <= n!

## Think About

1. Can you find the kth permutation without generating all previous ones?
2. How many permutations start with each digit?
3. What role do factorials play in the structure?
4. How can you use the factorial number system?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Permutation groups structure</summary>

For n numbers, permutations can be grouped by their first digit. Each group has (n-1)! permutations.

```
For n=3 (total 3! = 6 permutations):

Starting with 1: (3-1)! = 2 permutations
  1. 123
  2. 132

Starting with 2: (3-1)! = 2 permutations
  3. 213
  4. 231

Starting with 3: (3-1)! = 2 permutations
  5. 312
  6. 321

To find k=5:
  5 is in the 3rd group (index 2)
  So first digit is 3
```

**Key insight:** Use division to find which group, modulo to find position within group.

</details>

<details>
<summary>🎯 Hint 2: Factorial number system</summary>

Convert k to 0-indexed: k' = k - 1

Then repeatedly divide by factorials to find digit indices:
```
For n=4, k=9 (k'=8):

Available: [1, 2, 3, 4]
factorial(3) = 6

index = 8 // 6 = 1  → pick available[1] = 2
remainder = 8 % 6 = 2

Available: [1, 3, 4]
factorial(2) = 2

index = 2 // 2 = 1  → pick available[1] = 3
remainder = 2 % 2 = 0

Available: [1, 4]
factorial(1) = 1

index = 0 // 1 = 0  → pick available[0] = 1
remainder = 0 % 1 = 0

Available: [4]
index = 0  → pick available[0] = 4

Result: "2314"
```

</details>

<details>
<summary>📝 Hint 3: Direct construction algorithm</summary>

```
def getPermutation(n, k):
    # Precompute factorials
    factorial = [1]
    for i in range(1, n):
        factorial.append(factorial[-1] * i)

    # Available numbers
    numbers = list(range(1, n + 1))

    # Convert to 0-indexed
    k -= 1

    result = []

    for i in range(n):
        # How many permutations per group at this level
        fact = factorial[n - 1 - i]

        # Which group does k fall into?
        index = k // fact

        # Add the number at that index
        result.append(str(numbers[index]))

        # Remove used number
        numbers.pop(index)

        # Update k for next iteration
        k %= fact

    return ''.join(result)
```

**Key steps:**
1. Precompute factorials: [1, 1, 2, 6, 24, ...]
2. For each position, find which available number to use
3. Update k by taking modulo
4. Remove used number from available list

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| **Factorial number system** | **O(n²)** | **O(n)** | Direct construction, optimal |
| Generate all, sort, index | O(n! × n) | O(n!) | Infeasible for n > 10 |
| Backtracking to kth | O(k × n) | O(n) | Still expensive for large k |

**Why factorial approach wins:**
- No permutation generation needed
- Works for any k in constant iterations
- Space efficient

**Time breakdown:**
- Precompute factorials: O(n)
- Main loop: n iterations
  - Each iteration: O(n) to remove from list
- Total: O(n²)

**Space breakdown:**
- Factorial array: O(n)
- Available numbers: O(n)
- Result string: O(n)

**Optimization:**
- Use list for O(1) removal by index
- Precompute factorials once

---

## Common Mistakes

### 1. Forgetting to convert k to 0-indexed
```python
# WRONG: Uses 1-indexed k directly
index = k // factorial[n - 1]

# CORRECT: Convert to 0-indexed first
k -= 1  # Convert to 0-indexed
index = k // factorial[n - 1]
```

### 2. Using wrong factorial
```python
# WRONG: Uses factorial[n]
fact = factorial[n]
index = k // fact

# CORRECT: Uses factorial[n-1-i] for remaining positions
fact = factorial[n - 1 - i]
index = k // fact
```

### 3. Not updating k after each iteration
```python
# WRONG: k never changes
for i in range(n):
    index = k // factorial[n - 1 - i]
    result.append(numbers[index])

# CORRECT: Update k with modulo
for i in range(n):
    fact = factorial[n - 1 - i]
    index = k // fact
    result.append(numbers[index])
    k %= fact  # Update for next iteration
```

### 4. Not removing used numbers
```python
# WRONG: Reuses numbers
for i in range(n):
    index = k // factorial[n - 1 - i]
    result.append(str(numbers[index]))
    # Missing: numbers.pop(index)

# CORRECT: Remove used number
for i in range(n):
    index = k // factorial[n - 1 - i]
    result.append(str(numbers[index]))
    numbers.pop(index)  # Remove to avoid reuse
    k %= factorial[n - 1 - i]
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Find rank of permutation** | Given perm, find k | Reverse process: compute index at each position |
| **Next permutation** | Find k+1th | Use next permutation algorithm |
| **Previous permutation** | Find k-1th | Similar to next, but in reverse |
| **Circular permutations** | Treat as cycle | Divide by n (rotation equivalence) |
| **With duplicates** | Repeated elements | More complex: multinomial coefficients |

**Finding rank (inverse operation):**
```python
def findRank(permutation):
    n = len(permutation)
    nums = list(range(1, n + 1))

    # Precompute factorials
    factorial = [1]
    for i in range(1, n):
        factorial.append(factorial[-1] * i)

    rank = 0

    for i in range(n):
        digit = int(permutation[i])
        # How many available numbers are smaller?
        smaller_count = nums.index(digit)

        # Add contribution to rank
        rank += smaller_count * factorial[n - 1 - i]

        # Remove used digit
        nums.remove(digit)

    return rank + 1  # Convert to 1-indexed
```

---

## Visual Walkthrough

```
Find 9th permutation of n=4

Step 0: Setup
  k = 9 → k' = 8 (0-indexed)
  factorial = [1, 1, 2, 6]
  numbers = [1, 2, 3, 4]

Step 1: First position
  fact = factorial[4-1-0] = factorial[3] = 6
  index = 8 // 6 = 1
  k' = 8 % 6 = 2
  Pick numbers[1] = 2
  numbers = [1, 3, 4]
  result = "2"

Step 2: Second position
  fact = factorial[4-1-1] = factorial[2] = 2
  index = 2 // 2 = 1
  k' = 2 % 2 = 0
  Pick numbers[1] = 3
  numbers = [1, 4]
  result = "23"

Step 3: Third position
  fact = factorial[4-1-2] = factorial[1] = 1
  index = 0 // 1 = 0
  k' = 0 % 1 = 0
  Pick numbers[0] = 1
  numbers = [4]
  result = "231"

Step 4: Fourth position
  fact = factorial[4-1-3] = factorial[0] = 1
  index = 0 // 1 = 0
  Pick numbers[0] = 4
  numbers = []
  result = "2314"

Final: "2314"

Verification:
Permutations starting with 1: 1-6   (6 perms)
Permutations starting with 2: 7-12  (6 perms)
  Starting with 21: 7-8    (2 perms)
  Starting with 23: 9-10   (2 perms) ← k=9 is here!
    2314 (position 9) ✓
    2341 (position 10)
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles k=1 (first permutation)
- [ ] Handles k=n! (last permutation)
- [ ] Handles n=1 (single element)
- [ ] Converts k to 0-indexed
- [ ] All digits appear exactly once

**Code Quality:**
- [ ] Precomputes factorials correctly
- [ ] Updates k with modulo at each step
- [ ] Removes used numbers from available list
- [ ] Joins result efficiently

**Interview Readiness:**
- [ ] Can explain factorial number system in 2 minutes
- [ ] Can draw grouping diagram for n=3
- [ ] Can code solution in 15 minutes
- [ ] Can implement reverse operation (find rank)

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve with factorial approach
- [ ] Day 3: Solve without hints
- [ ] Day 7: Implement find-rank variation
- [ ] Day 14: Explain to someone else
- [ ] Day 30: Compare with next-permutation algorithm

---

**Strategy**: See [Backtracking Pattern](../../strategies/patterns/backtracking.md) and [Factorial Number System](../../strategies/fundamentals/combinatorics.md)
