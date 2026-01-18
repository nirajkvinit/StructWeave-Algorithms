---
id: E012
old_id: F017
slug: letter-combinations-of-a-phone-number
title: Letter Combinations of a Phone Number
difficulty: easy
category: easy
topics: ["string", "backtracking"]
patterns: ["backtrack-combination", "recursion"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E001", "M039", "M077"]
prerequisites: ["backtracking", "recursion", "string-building"]
strategy_ref: ../../strategies/patterns/backtracking.md
---
# Letter Combinations of a Phone Number

## Problem

Given a string of digits from 2 to 9, generate all possible letter combinations that the numbers could represent, based on the mapping from old telephone keypads where each number corresponds to a set of letters.

The mapping is: `2 → abc`, `3 → def`, `4 → ghi`, `5 → jkl`, `6 → mno`, `7 → pqrs`, `8 → tuv`, `9 → wxyz`. For example, if the input is `"23"`, you need to generate all combinations by taking one letter from `"abc"` and one from `"def"`, resulting in `["ad", "ae", "af", "bd", "be", "bf", "cd", "ce", "cf"]`.

This is a combinatorial generation problem, where the number of results grows exponentially with the input length. If the input has 3 digits, you might generate dozens of combinations; with 4 digits, potentially hundreds. The challenge is systematically exploring all possibilities without missing any or generating duplicates.

## Why This Matters

This problem introduces backtracking, a powerful technique for generating all possible solutions systematically. Backtracking is the foundation for solving constraint satisfaction problems, including puzzles like Sudoku, scheduling problems, and combinatorial optimization.

Beyond the classic phone keypad use case, this pattern appears in password generation, generating test cases for software testing, T9 predictive text input systems, and exploring configuration spaces in system design. The ability to generate all combinations efficiently is a fundamental skill that extends far beyond simple string manipulation.

## Examples

**Example 1:**
- Input: `digits = "23"`
- Output: `["ad","ae","af","bd","be","bf","cd","ce","cf"]`

**Example 2:**
- Input: `digits = ""`
- Output: `[]`

**Example 3:**
- Input: `digits = "2"`
- Output: `["a","b","c"]`

## Constraints

- 0 <= digits.length <= 4
- digits[i] is a digit in the range ['2', '9'].

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Cartesian Product</summary>

Think of this as generating the Cartesian product of sets. If "2" maps to ["a","b","c"] and "3" maps to ["d","e","f"], you need all combinations:
- "a" with each letter from "3": ad, ae, af
- "b" with each letter from "3": bd, be, bf
- "c" with each letter from "3": cd, ce, cf

How can you systematically generate all combinations? What approach naturally explores all possibilities?

</details>

<details>
<summary>🎯 Hint 2: Backtracking Framework</summary>

Use backtracking to build combinations character by character:

1. Create a mapping: 2→"abc", 3→"def", 4→"ghi", etc.
2. Start with an empty combination
3. For each digit, try adding each of its possible letters
4. Recursively build the rest of the combination
5. When combination length equals input length, add to results

Key decision at each step: Which letter to add for the current digit?

</details>

<details>
<summary>📝 Hint 3: Backtracking Implementation</summary>

**Pseudocode:**
```
1. Create phone mapping:
   phone = {
     '2': 'abc', '3': 'def', '4': 'ghi',
     '5': 'jkl', '6': 'mno', '7': 'pqrs',
     '8': 'tuv', '9': 'wxyz'
   }

2. Define backtrack(index, current_combination):
   a. Base case: if index == len(digits):
      - Add current_combination to results
      - Return
   b. Get letters for current digit
   c. For each letter in those letters:
      - Add letter to current_combination
      - Recursively call backtrack(index + 1, current_combination)
      - Remove letter (backtrack)

3. Initialize results = []
4. If digits is empty, return []
5. Call backtrack(0, "")
6. Return results
```

**Iterative alternative:** Use a queue/list and build combinations level by level.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| **Backtracking** | **O(4ⁿ × n)** | **O(n)** | n = digits length, 4 = max letters per digit |
| Iterative (BFS-style) | O(4ⁿ × n) | O(4ⁿ) | Stores all combinations at once |
| Nested loops | O(4ⁿ × n) | O(1) | Only works for fixed length |

Time breakdown:
- At most 4 choices per digit (7 and 9 have 4 letters)
- n digits means 4ⁿ total combinations
- Each combination takes O(n) to build

## Common Mistakes

### 1. Modifying shared state without backtracking
```python
# WRONG: Doesn't remove letter after exploring path
def backtrack(index, current):
    if index == len(digits):
        results.append(current)
        return
    for letter in phone[digits[index]]:
        current += letter
        backtrack(index + 1, current)
        # Missing: current = current[:-1]

# CORRECT: Proper backtracking
def backtrack(index, current):
    if index == len(digits):
        results.append(current)
        return
    for letter in phone[digits[index]]:
        backtrack(index + 1, current + letter)
# OR pass new string each time to avoid explicit backtracking
```

### 2. Not handling empty input
```python
# WRONG: Returns [[]] or [""] for empty input
if not digits:
    return []  # But might have initialized results = [[]]

# CORRECT: Check early
if not digits:
    return []
results = []
backtrack(0, "")
return results
```

### 3. Using list instead of string for current combination
```python
# WRONG: Appending list to results instead of string
current = []
# ... build combination ...
results.append(current)  # Results in [['a','d'], ['a','e'], ...]

# CORRECT: Use string or join list at the end
current = ""
# OR
results.append("".join(current))
```

### 4. Incorrect phone mapping
```python
# WRONG: Missing letters or wrong mapping
phone = {'2': 'abc', '3': 'def', '7': 'pqr'}  # 7 should be 'pqrs'

# CORRECT: Complete and accurate mapping
phone = {
    '2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl',
    '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz'
}
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Return count only | Don't need combinations | Just count: 3^a × 4^b where a,b are digit frequencies |
| Include digits 0 and 1 | More mappings | Add 0→' ', 1→'' or custom mapping |
| Return in lexicographic order | Sorted output | Already in order if process digits left-to-right |
| Generate k-length combinations | Fixed length, any digits | Modify base case to check length == k |
| T9 predictive text | Find words in dictionary | Filter results against dictionary |

## Practice Checklist

**Correctness:**
- [ ] Handles empty input
- [ ] Handles single digit
- [ ] Handles multiple digits
- [ ] Handles digits with 4 letters (7, 9)
- [ ] Returns all combinations (no duplicates, no missing)
- [ ] Returns in correct format (list of strings)

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 10-12 minutes
- [ ] Can discuss complexity
- [ ] Can draw recursion tree for "23"
- [ ] Can explain backtracking vs iterative

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations (iterative approach)
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Backtracking Patterns](../../strategies/patterns/backtracking.md)
