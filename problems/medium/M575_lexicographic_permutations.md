---
id: M575
euler_id: 24
slug: lexicographic-permutations
title: Lexicographic Permutations
difficulty: medium
category: medium
topics: ["math", "permutations", "factorial", "combinatorics"]
patterns: ["factorial-number-system"]
estimated_time_minutes: 25
frequency: medium
related_problems: ["M046", "M060", "H060"]
prerequisites: ["factorial", "recursion", "modular-arithmetic"]
---

# Lexicographic Permutations

## Problem

Given a set of distinct elements (like the digits 0-9 or letters a-z) and a number n, find the nth permutation when all permutations are listed in lexicographic (dictionary) order.

For example, the permutations of {0, 1, 2} in lexicographic order are:
1. 012
2. 021
3. 102
4. 120
5. 201
6. 210

So the 4th permutation is "120".

Your task: Given elements and position n, return the nth permutation without generating all permutations.

## Why This Matters

This problem teaches the factorial number system - a powerful technique for directly computing the nth permutation in O(n) time instead of O(n!) time. The insight is that permutations have a hierarchical structure: the first (n-1)! permutations all start with the smallest element, the next (n-1)! start with the second smallest, and so on.

This pattern appears in:
- **Combinatorial optimization**: Efficiently exploring permutation spaces
- **Cryptography**: Generating specific arrangements without enumeration
- **Coding theory**: Error-correcting codes use permutation mathematics
- **Interview questions**: Tests mathematical reasoning and avoiding brute force

The key skill is recognizing when brute force (generating all possibilities) can be replaced by direct calculation using combinatorial mathematics.

## Examples

**Example 1:**
- Input: `elements = [0, 1, 2], n = 4`
- Output: `"120"`
- Explanation: The 6 permutations in order are: 012, 021, 102, 120, 201, 210. The 4th is "120".

**Example 2:**
- Input: `elements = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], n = 1000000`
- Output: `"2783915460"`
- Explanation: The millionth permutation of digits 0-9.

**Example 3:**
- Input: `elements = ['a', 'b', 'c'], n = 1`
- Output: `"abc"`
- Explanation: The first (smallest) permutation is alphabetically first.

**Example 4:**
- Input: `elements = ['a', 'b', 'c'], n = 6`
- Output: `"cba"`
- Explanation: The last (6th) permutation is reverse order.

## Constraints

- 1 <= n <= k! where k = number of elements
- Elements are distinct
- 1 <= number of elements <= 12 (since 12! ≈ 479 million)
- n is 1-indexed (1st permutation, not 0th)

## Think About

1. How many permutations start with each element?
2. If you know the first element, how do you find the second?
3. What's the relationship between position n and factorial numbers?
4. How does 1-indexed vs 0-indexed affect your calculation?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Factorial structure</summary>

For k elements, there are k! total permutations. They're organized hierarchically:

- First (k-1)! permutations start with the smallest element
- Next (k-1)! permutations start with the second smallest
- And so on...

**Example with {0, 1, 2} (k=3, 3!=6 permutations):**
```
Positions 1-2: Start with 0 (2! = 2 permutations: 012, 021)
Positions 3-4: Start with 1 (2! = 2 permutations: 102, 120)
Positions 5-6: Start with 2 (2! = 2 permutations: 201, 210)
```

**To find which element is first for position n:**
```
first_element_index = (n - 1) // (k-1)!
```

(Use n-1 to convert from 1-indexed to 0-indexed)

</details>

<details>
<summary>🎯 Hint 2: Iterative selection</summary>

After finding the first element, the problem becomes: "Find the mth permutation of the remaining elements" where m = remainder after dividing by (k-1)!

**Algorithm:**
```
remaining = list of available elements (sorted)
result = []
n = n - 1  # Convert to 0-indexed

for i in range(k, 0, -1):
    factorial = (i - 1)!
    index = n // factorial
    result.append(remaining[index])
    remaining.remove(remaining[index])
    n = n % factorial

return result
```

**Example: n=4 for {0,1,2}:**
```
n = 4 - 1 = 3 (0-indexed)
remaining = [0, 1, 2]

i=3: factorial = 2! = 2
     index = 3 // 2 = 1  →  pick remaining[1] = 1
     remaining = [0, 2]
     n = 3 % 2 = 1

i=2: factorial = 1! = 1
     index = 1 // 1 = 1  →  pick remaining[1] = 2
     remaining = [0]
     n = 1 % 1 = 0

i=1: factorial = 0! = 1
     index = 0 // 1 = 0  →  pick remaining[0] = 0
     remaining = []

Result: [1, 2, 0] → "120" ✓
```

</details>

<details>
<summary>🚀 Hint 3: Complete implementation</summary>

```python
def nth_permutation(elements, n):
    """Find the nth lexicographic permutation of elements."""
    elements = sorted(elements)  # Ensure lexicographic order
    k = len(elements)

    # Precompute factorials
    factorial = [1] * (k + 1)
    for i in range(1, k + 1):
        factorial[i] = factorial[i - 1] * i

    # Convert to 0-indexed
    n -= 1

    result = []
    remaining = list(elements)

    for i in range(k, 0, -1):
        # How many permutations per starting element
        group_size = factorial[i - 1]

        # Which element should be at this position
        index = n // group_size
        result.append(remaining[index])

        # Remove used element and update n
        remaining.pop(index)
        n %= group_size

    return ''.join(str(x) for x in result)
```

**Time complexity:** O(k²) due to list removal (can be O(k log k) with better data structure)

**Space complexity:** O(k) for the result and remaining list

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Generate all permutations | O(k! × k) | O(k! × k) | Infeasible for k > 10 |
| Next permutation k times | O(n × k) | O(k) | Too slow for large n |
| **Factorial number system** | **O(k²)** | **O(k)** | Direct calculation, optimal |
| Factorial + efficient removal | O(k log k) | O(k) | Using balanced BST for removal |

**Why factorial number system wins:**
- For 10 elements: 10! = 3,628,800 permutations
- Generating all takes ~36 million operations
- Direct calculation takes ~100 operations (k² for k=10)
- That's 360,000x faster!

---

## Common Mistakes

### 1. Off-by-one from 1-indexed to 0-indexed

```python
# WRONG: Using n directly
index = n // factorial[i - 1]  # Off by one!

# CORRECT: Convert to 0-indexed first
n -= 1  # Do this once at the start
index = n // factorial[i - 1]
```

### 2. Not removing used elements

```python
# WRONG: Reusing elements
for i in range(k):
    index = n // factorial[k - 1 - i]
    result.append(elements[index])  # Same element could be picked twice!
    n %= factorial[k - 1 - i]

# CORRECT: Remove from available pool
remaining = list(elements)
for i in range(k):
    index = n // factorial[k - 1 - i]
    result.append(remaining[index])
    remaining.pop(index)  # Remove used element
    n %= factorial[k - 1 - i]
```

### 3. Wrong factorial index

```python
# WRONG: Using factorial[i] instead of factorial[i-1]
for i in range(k, 0, -1):
    index = n // factorial[i]  # Wrong! This is too large

# CORRECT: After placing one element, remaining elements have (i-1)! arrangements
for i in range(k, 0, -1):
    index = n // factorial[i - 1]  # Correct: (i-1)! arrangements per choice
```

### 4. Not precomputing factorials

```python
# INEFFICIENT: Computing factorial each iteration
for i in range(k, 0, -1):
    fact = 1
    for j in range(1, i):
        fact *= j  # Recomputing every time!

# BETTER: Precompute once
factorial = [1] * (k + 1)
for i in range(1, k + 1):
    factorial[i] = factorial[i - 1] * i
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Find permutation rank** | Given permutation, find its position | Count how many smaller permutations: Σ(index × factorial) |
| **Next permutation** | Find the lexicographically next | Different algorithm: find rightmost ascent, swap, reverse |
| **Permutations with repetition** | Elements may repeat | Divide by repetition factorials |
| **Circular permutations** | Rotations are equivalent | Fix one element, permute rest |

**Finding rank (inverse problem):**
```python
def permutation_rank(perm):
    """Find the 1-indexed position of a permutation."""
    elements = sorted(perm)
    rank = 0
    k = len(perm)

    factorial = [1] * (k + 1)
    for i in range(1, k + 1):
        factorial[i] = factorial[i - 1] * i

    for i, elem in enumerate(perm):
        # Count elements smaller than elem still available
        smaller = sum(1 for x in elements if x < elem)
        rank += smaller * factorial[k - 1 - i]
        elements.remove(elem)

    return rank + 1  # Convert to 1-indexed
```

---

## Visual Walkthrough

```
Find the 1,000,000th permutation of [0,1,2,3,4,5,6,7,8,9]

k = 10, so 10! = 3,628,800 total permutations
n = 1,000,000 - 1 = 999,999 (0-indexed)

═══════════════════════════════════════════════════════
Position 1: What's the first digit?
───────────────────────────────────────────────────────
Remaining elements: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
Group size = 9! = 362,880

index = 999,999 // 362,880 = 2
First digit = remaining[2] = 2 ✓

Remaining: [0, 1, 3, 4, 5, 6, 7, 8, 9]
n = 999,999 % 362,880 = 274,239

═══════════════════════════════════════════════════════
Position 2: What's the second digit?
───────────────────────────────────────────────────────
Group size = 8! = 40,320

index = 274,239 // 40,320 = 6
Second digit = remaining[6] = 7 ✓

Remaining: [0, 1, 3, 4, 5, 6, 8, 9]
n = 274,239 % 40,320 = 32,319

═══════════════════════════════════════════════════════
Position 3:
───────────────────────────────────────────────────────
Group size = 7! = 5,040

index = 32,319 // 5,040 = 6
Third digit = remaining[6] = 8 ✓

Remaining: [0, 1, 3, 4, 5, 6, 9]
n = 32,319 % 5,040 = 2,079

═══════════════════════════════════════════════════════
Continue this process...
───────────────────────────────────────────────────────
Position 4: index = 2,079 // 720 = 2 → digit = 3
Position 5: index = 639 // 120 = 5 → digit = 9
Position 6: index = 39 // 24 = 1 → digit = 1
Position 7: index = 15 // 6 = 2 → digit = 5
Position 8: index = 3 // 2 = 1 → digit = 4
Position 9: index = 1 // 1 = 1 → digit = 6
Position 10: index = 0 // 1 = 0 → digit = 0

═══════════════════════════════════════════════════════
Final Result: 2783915460
═══════════════════════════════════════════════════════
```

---

## Key Concept: Factorial Number System

The factorial number system is a mixed-radix positional system where the ith position has weight i!

**Regular decimal:** 274 = 2×10² + 7×10¹ + 4×10⁰

**Factorial notation:** The position n in the permutation sequence can be written as:
```
n = a₁×(k-1)! + a₂×(k-2)! + ... + aₖ₋₁×1! + aₖ×0!
```

Where 0 ≤ aᵢ < i. Each coefficient aᵢ tells you which element to pick at position i.

This is exactly what our algorithm computes!

---

## Practice Checklist

**Understanding:**
- [ ] Can explain factorial structure of permutations
- [ ] Understands 0-indexed vs 1-indexed conversion
- [ ] Can trace algorithm by hand for small examples
- [ ] Knows why this is O(k²) not O(k!)

**Implementation:**
- [ ] Precomputes factorials correctly
- [ ] Handles indexing without off-by-one errors
- [ ] Removes elements from remaining pool
- [ ] Constructs result correctly

**Edge Cases:**
- [ ] n = 1 (first permutation)
- [ ] n = k! (last permutation)
- [ ] Single element
- [ ] Large n with 10+ elements

**Interview Readiness:**
- [ ] Can code solution in 15 minutes
- [ ] Can explain factorial number system
- [ ] Knows inverse problem (find rank)
- [ ] Can discuss time complexity improvement

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve with hints
- [ ] Day 3: Solve without hints
- [ ] Day 7: Implement inverse (find rank)
- [ ] Day 14: Explain to someone else
- [ ] Day 30: Quick review, handle variations

---

**Strategy Reference:** See [Math Patterns](../../strategies/patterns/math.md) | [Permutation Problems](../../strategies/patterns/backtracking.md#permutations)
