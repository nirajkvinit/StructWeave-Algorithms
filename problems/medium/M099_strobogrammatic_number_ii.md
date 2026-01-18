---
id: M099
old_id: I047
slug: strobogrammatic-number-ii
title: Strobogrammatic Number II
difficulty: medium
category: medium
topics: ["recursion", "string", "backtracking"]
patterns: ["recursion", "symmetry"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E246", "M100"]
prerequisites: ["recursion", "string-manipulation", "symmetry"]
---
# Strobogrammatic Number II

## Problem

You receive an integer `n` as input. Your task is to generate all strobogrammatic numbers that have exactly `n` digits, returning them in any order. A strobogrammatic number is one that looks the same when rotated 180 degrees (flipped upside down). Think about how digits look when inverted: 0 stays 0, 1 stays 1, 8 stays 8, 6 becomes 9, and 9 becomes 6. Other digits (2, 3, 4, 5, 7) don't have valid rotated forms. For example, "69" is strobogrammatic because when you flip it upside down, you get "69" again (the 6 becomes 9 and vice versa, and they swap positions). Similarly, "88" and "11" are strobogrammatic. For `n = 2`, valid numbers include "11", "69", "88", "96" (but not "00" since we don't allow leading zeros in multi-digit numbers). The challenge is to build these numbers systematically, using recursion to construct them symmetrically from the center outward, while being careful to exclude numbers with leading zeros.

## Why This Matters

This problem teaches symmetry-based generation and recursive construction, which appear in many practical scenarios. Display systems that support screen rotation (tablets, phones, digital clocks) sometimes need to render numbers that remain readable when the device is flipped. Ambigram designers create text and logos that read the same when rotated, using similar principles. In optical character recognition (OCR), understanding which digits look similar when rotated helps improve error correction when scanning documents that might be upside down. Security systems generating PIN codes or serial numbers sometimes want to avoid ambiguous sequences that could be misread when rotated. More broadly, this problem develops your ability to think about recursive generation with constraints, backtracking to build valid combinations, and handling symmetry properties, all of which are fundamental techniques for solving constraint satisfaction problems and generating combinatorial structures in computer science.



## Examples

**Example 1:**
- Input: `n = 2`
- Output: `["11","69","88","96"]`

**Example 2:**
- Input: `n = 1`
- Output: `["0","1","8"]`

## Constraints

- 1 <= n <= 14

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Identify Symmetry Pairs</summary>

Which digits look the same when rotated 180 degrees? Make a mapping: 0→0, 1→1, 6→9, 8→8, 9→6. Notice that you must build numbers symmetrically from the outside in.

</details>

<details>
<summary>🎯 Hint 2: Recursive Construction</summary>

Build strobogrammatic numbers from the center outward. For n digits, recursively generate all (n-2) digit strobogrammatic numbers, then wrap each with valid pairs (0,0), (1,1), (6,9), (8,8), (9,6). Handle the base cases: n=0 returns [""], n=1 returns ["0","1","8"].

</details>

<details>
<summary>📝 Hint 3: Algorithm Structure</summary>

Pseudocode approach:
```
function generateStrobogrammatic(n, length):
    if n == 0: return [""]
    if n == 1: return ["0", "1", "8"]

    middles = generateStrobogrammatic(n - 2, length)
    result = []

    for middle in middles:
        for pair in [(0,0), (1,1), (6,9), (8,8), (9,6)]:
            if n != length or pair[0] != '0':  # no leading zeros
                result.append(pair[0] + middle + pair[1])

    return result
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Generate & Filter | O(10^n) | O(10^n) | Generate all n-digit numbers, filter valid ones |
| Iterative Build | O(5^(n/2)) | O(5^(n/2)) | Build layer by layer without recursion |
| **Optimal Recursive** | **O(5^(n/2))** | **O(5^(n/2))** | Each position has ~5 valid choices, recursive depth n/2 |

## Common Mistakes

**Mistake 1: Forgetting to exclude leading zeros**
```python
# Wrong: Generates numbers with leading zeros like "00", "09"
def find_strobogrammatic(n):
    if n == 0: return [""]
    if n == 1: return ["0", "1", "8"]

    middles = find_strobogrammatic(n - 2)
    result = []
    for middle in middles:
        for pair in [("0","0"), ("1","1"), ("6","9"), ("8","8"), ("9","6")]:
            result.append(pair[0] + middle + pair[1])
    return result
```

```python
# Correct: Check if at outermost level before adding (0,0) pair
def find_strobogrammatic(n, length=None):
    if length is None:
        length = n
    if n == 0: return [""]
    if n == 1: return ["0", "1", "8"]

    middles = find_strobogrammatic(n - 2, length)
    result = []
    for middle in middles:
        for pair in [("0","0"), ("1","1"), ("6","9"), ("8","8"), ("9","6")]:
            if n != length or pair[0] != "0":  # no leading zeros
                result.append(pair[0] + middle + pair[1])
    return result
```

**Mistake 2: Not handling single-digit center for odd n**
```python
# Wrong: Doesn't properly handle odd-length numbers
def find_strobogrammatic(n):
    if n == 1: return ["0", "1", "8"]
    # Missing base case for n == 0
    middles = find_strobogrammatic(n - 2)
    # ... rest of logic
```

```python
# Correct: Proper base cases for both even and odd lengths
def find_strobogrammatic(n, length=None):
    if length is None: length = n
    if n == 0: return [""]  # Even length base case
    if n == 1: return ["0", "1", "8"]  # Odd length base case
    # ... continue building
```

**Mistake 3: Incorrect pair mapping**
```python
# Wrong: 6 and 9 map to themselves
pairs = [("0","0"), ("1","1"), ("6","6"), ("8","8"), ("9","9")]
```

```python
# Correct: 6 rotates to 9, and 9 rotates to 6
pairs = [("0","0"), ("1","1"), ("6","9"), ("8","8"), ("9","6")]
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Strobogrammatic Number I | Check if single number is strobogrammatic | Easy |
| Strobogrammatic in Range | Count strobogrammatic numbers in range [low, high] | Hard |
| Confusing Number | Number that rotates to a different valid number | Easy |
| Palindromic Numbers | Generate all palindromes of length n | Medium |
| Mirror Reflection | Generate strings symmetric across vertical axis | Medium |

## Practice Checklist

- [ ] Initial attempt (Day 0)
- [ ] Reviewed recursion structure (Day 0)
- [ ] Implemented with proper base cases (Day 0)
- [ ] First spaced repetition (Day 1)
- [ ] Second spaced repetition (Day 3)
- [ ] Third spaced repetition (Day 7)
- [ ] Fourth spaced repetition (Day 14)
- [ ] Can explain symmetry concept (Day 14)
- [ ] Can code without references (Day 30)
- [ ] Interview-ready confidence (Day 30)

**Strategy**: Use recursion to build symmetric numbers from center outward, avoiding leading zeros at the outermost level.
