---
id: E072
old_id: F175
slug: largest-number
title: Largest Number
difficulty: easy
category: easy
topics: ["array", "string", "sorting"]
patterns: ["custom-comparator"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["M179", "E242", "M451"]
prerequisites: ["sorting", "string-comparison", "comparators"]
strategy_ref: ../strategies/fundamentals/sorting-searching.md
---
# Largest Number

## Problem

Given an array of non-negative integers, arrange them to form the largest possible number and return it as a string.

**The challenge:** You can't simply sort by numeric value! Consider `[3, 30, 34]`:
- Numeric sort (descending): [34, 30, 3] → "34303"
- Optimal arrangement: [34, 3, 30] → "34330"

Why is [34, 3, 30] better? Because when we compare:
- "343" vs "334": 343 > 334, so 34 should come before 3
- "330" vs "303": 330 > 303, so 3 should come before 30

**The key insight:** To determine if number A should come before number B, compare the concatenations:
- If "AB" > "BA", then A should come before B
- If "AB" < "BA", then B should come before A

This forms a custom comparator for sorting.

**Example walkthrough for [3, 30, 34, 5, 9]:**
```
Compare pairs:
- "9" vs "5": "95" > "59" → 9 before 5
- "5" vs "34": "534" > "345" → 5 before 34
- "34" vs "3": "343" > "334" → 34 before 3
- "3" vs "30": "330" > "303" → 3 before 30

Result: [9, 5, 34, 3, 30] → "9534330"
```

**Edge case:** If all numbers are 0, return "0" (not "000...").

## Why This Matters

This problem teaches **custom comparator design** - one of the most powerful tools in algorithm design. The skill of defining "how things should be ordered" based on problem-specific criteria appears in:
- **Task scheduling**: Ordering tasks by custom priority rules
- **Greedy algorithms**: Choosing optimal ordering for maximization/minimization
- **String algorithms**: Lexicographic ordering with custom rules
- **Data normalization**: Canonical ordering of equivalent representations

Understanding that "sorting" isn't just about numeric or alphabetic order - but about defining the right comparison function - unlocks solutions to many optimization problems.

## Examples

**Example 1:**
- Input: `nums = [10,2]`
- Output: `"210"`

**Example 2:**
- Input: `nums = [3,30,34,5,9]`
- Output: `"9534330"`

## Constraints

- 1 <= nums.length <= 100
- 0 <= nums[i] <= 10⁹

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Sorting with a Custom Rule</summary>

The key insight: This isn't about sorting by numeric value!
- If we sort [3, 30, 34] numerically: [3, 30, 34] → "33034"
- But we want: [34, 3, 30] → "34330"

Think about comparing two numbers a and b:
- If "a+b" > "b+a" (as strings), then a should come before b
- Example: For 3 and 30, compare "330" vs "303" → "330" > "303", so 3 comes first

Can you design a custom comparator based on this concatenation rule?

</details>

<details>
<summary>🎯 Hint 2: String Concatenation Comparison</summary>

For any two numbers x and y, determine their order by comparing:
- Option 1: str(x) + str(y)
- Option 2: str(y) + str(x)

Whichever produces the larger string, that order is better.

Example with 3 and 30:
- "3" + "30" = "330"
- "30" + "3" = "303"
- "330" > "303", so 3 should come before 30

This forms a valid comparison function for sorting!

</details>

<details>
<summary>📝 Hint 3: Step-by-Step Algorithm</summary>

```
1. Convert all numbers to strings
2. Sort strings using custom comparator:
   - Compare two strings a and b
   - If a+b > b+a: a comes before b
   - If a+b < b+a: b comes before a
3. Concatenate sorted strings
4. Edge case: If result is all zeros, return "0"
```

Example: [3, 30, 34, 5, 9]
- Convert: ["3", "30", "34", "5", "9"]
- Compare pairs:
  - "9" vs "5": "95" > "59" → 9 first
  - "9" vs "34": "934" > "349" → 9 first
  - "5" vs "34": "534" > "345" → 5 first
  - "34" vs "3": "343" > "334" → 34 first
  - "3" vs "30": "330" > "303" → 3 first
- Sorted: ["9", "5", "34", "3", "30"]
- Result: "9534330"

Time: O(n log n), Space: O(n)
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Generate All Permutations | O(n! × n) | O(n) | Try all arrangements, impractical |
| **Custom Sort** | **O(n log n × k)** | **O(n)** | k = average string length, optimal |

Note: String comparison is O(k), so overall O(n log n × k)

## Common Mistakes

### 1. Sorting by Numeric Value
```python
# WRONG: Sort numbers numerically
nums.sort(reverse=True)
result = ''.join(map(str, nums))
# For [3, 30, 34], gives "34303" instead of "34330"

# CORRECT: Custom comparator based on concatenation
from functools import cmp_to_key
nums.sort(key=cmp_to_key(lambda a, b:
    1 if str(b) + str(a) > str(a) + str(b) else -1))
```

### 2. Not Handling All Zeros
```python
# WRONG: Concatenate without checking
result = ''.join(sorted_strings)
# For [0, 0, 0], gives "000" instead of "0"

# CORRECT: Check for all zeros
result = ''.join(sorted_strings)
return '0' if result[0] == '0' else result
```

### 3. Comparing Individual Digits Only
```python
# WRONG: Compare first digits only
nums.sort(key=lambda x: str(x)[0], reverse=True)
# For [9, 90], both start with '9', but "990" > "909"

# CORRECT: Use concatenation comparison
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Smallest number | Form smallest number | Reverse comparator logic |
| K-digit limit | Result must be exactly k digits | Select subset, then arrange |
| Negative numbers | Include negatives | Handle sign separately |
| Lexicographic order | Alphabetic instead of numeric | Standard string comparison |

## Practice Checklist

**Correctness:**
- [ ] Handles single element array
- [ ] Handles all zeros [0, 0, 0] → "0"
- [ ] Handles mixed single/multi-digit [3, 30, 34]
- [ ] Handles large numbers correctly
- [ ] Produces largest possible concatenation
- [ ] Returns string format, not integer

**Interview Readiness:**
- [ ] Can explain concatenation comparison
- [ ] Can code custom comparator
- [ ] Can implement in 10 minutes
- [ ] Can explain why numeric sort fails
- [ ] Can handle follow-up about smallest number

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve "smallest number" variation
- [ ] Day 14: Explain comparator to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Sorting and Searching](../../strategies/fundamentals/sorting-searching.md)
