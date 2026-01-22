---
id: E267
euler_id: 22
slug: names-scores
title: Names Scores
difficulty: easy
category: easy
topics: ["string", "sorting"]
patterns: []
estimated_time_minutes: 15
frequency: low
related_problems: ["E005", "M049"]
prerequisites: ["sorting-basics", "strings-basics"]
---

# Names Scores

## Problem

Given a list of names, calculate the total "name score" for all names in the list.

The score for each name is calculated as:
1. First, sort the names alphabetically
2. For each name, calculate its alphabetical value (sum of letter positions: A=1, B=2, ..., Z=26)
3. Multiply this alphabetical value by the name's position in the sorted list (1-indexed)
4. Sum all these scores

For example, if the sorted list contains "COLIN" at position 938:
- Alphabetical value: C(3) + O(15) + L(12) + I(9) + N(14) = 53
- Position score: 53 × 938 = 49714
- This contributes 49714 to the total

Input names are in uppercase letters only, without spaces or special characters.

## Why This Matters

This problem combines three fundamental operations: sorting, string processing, and numerical computation. While individually simple, orchestrating these operations efficiently teaches you about data transformation pipelines - a pattern central to data processing, ETL (Extract-Transform-Load) systems, and analytics.

The alphabetical value calculation introduces the concept of character encoding and ASCII arithmetic. Understanding that 'A' through 'Z' have consecutive integer values is fundamental to string manipulation in low-level systems programming and text processing.

Sorting is one of the most studied problems in computer science. While you'll likely use built-in sort functions here, understanding when sorting is the right preprocessing step (versus maintaining sorted order incrementally) is crucial for system design. This pattern appears in database indexing, search engines, and recommendation systems.

## Examples

**Example 1:**

- Input: `names = ["MARY", "PATRICIA", "LINDA"]`
- Output: `MARY(1): 57×1=57, LINDA(2): 40×2=80, PATRICIA(3): 95×3=285. Total=422`
- Explanation: After sorting: ["LINDA", "MARY", "PATRICIA"]. Calculate each score and sum.

**Example 2:**

- Input: `names = ["ALICE", "BOB"]`
- Output: `ALICE(1): 30×1=30, BOB(2): 19×2=38. Total=68`
- Explanation: Names already sorted alphabetically.

**Example 3:**

- Input: `names = ["ZOE", "ANN"]`
- Output: `ANN(1): 29×1=29, ZOE(2): 56×2=112. Total=141`
- Explanation: Sorting reverses the input order.

## Constraints

- 1 <= names.length <= 10,000
- 1 <= name.length <= 20
- Names contain only uppercase letters A-Z
- Names are unique

## Think About

1. What's the most efficient sorting algorithm to use?
2. How do you convert letters to their alphabetical positions?
3. Should you use 0-based or 1-based indexing for positions?
4. Can any of these operations be combined to save iterations?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Breaking down the problem</summary>

The problem has three clear steps:

1. **Sort names alphabetically**
2. **For each name (with its sorted position):**
   - Calculate alphabetical value
   - Multiply by position
   - Add to running total
3. **Return total**

Each step is straightforward. The challenge is implementation correctness, not algorithmic complexity.

</details>

<details>
<summary>🎯 Hint 2: Calculating alphabetical value</summary>

For a letter like 'C':
- Its ASCII value is `ord('C')` = 67
- 'A' has ASCII value `ord('A')` = 65
- Position of 'C' is: `ord('C') - ord('A') + 1 = 67 - 65 + 1 = 3`

**For a whole name:**

```python
def alphabetical_value(name):
    return sum(ord(char) - ord('A') + 1 for char in name)
```

**Example:** "COLIN"
- C: 3, O: 15, L: 12, I: 9, N: 14
- Sum: 3 + 15 + 12 + 9 + 14 = 53

</details>

<details>
<summary>📝 Hint 3: Complete algorithm</summary>

```
Step 1: Sort names alphabetically
    sorted_names = sort(names)

Step 2: Initialize total score
    total_score = 0

Step 3: Process each name with its position
    for position, name in enumerate(sorted_names, start=1):
        # Calculate alphabetical value
        alpha_value = sum(ord(c) - ord('A') + 1 for c in name)

        # Calculate this name's score
        name_score = alpha_value * position

        # Add to total
        total_score += name_score

Step 4: Return total
    return total_score
```

**Time Complexity:** O(n log n) dominated by sorting

**Space Complexity:** O(n) for sorted array (or O(1) if sorting in-place)

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| **Sort then Calculate** | **O(n log n + nm)** | **O(n)** | Standard approach; m = avg name length |
| Counting Sort + Calculate | O(nm + k) | O(n + k) | Only if names have limited variety (k = unique names) |

Where:
- n = number of names
- m = average length of names
- O(n log n) for sorting
- O(nm) for calculating all alphabetical values

**Why Sort-Then-Calculate Wins:**

- Sorting dominates at O(n log n)
- Built-in sorts are highly optimized (Timsort in Python)
- Character processing is linear and unavoidable
- Total complexity is effectively O(n log n)

---

## Common Mistakes

### 1. Off-by-one errors in position

```python
# WRONG: Using 0-based indexing
for i, name in enumerate(sorted_names):
    score += alpha_value(name) * i  # Position should be i+1!

# CORRECT: Use 1-based indexing
for i, name in enumerate(sorted_names, start=1):
    score += alpha_value(name) * i
```

### 2. Incorrect character-to-number conversion

```python
# WRONG: Forgetting to add 1
position = ord(char) - ord('A')  # 'A' becomes 0, not 1!

# CORRECT:
position = ord(char) - ord('A') + 1  # 'A' = 1, 'B' = 2, etc.
```

### 3. Not handling mixed case

```python
# WRONG: Assuming lowercase
position = ord(char) - ord('a') + 1  # Fails for uppercase input

# CORRECT: Convert to uppercase first, or use 'A'
name = name.upper()  # Ensure uppercase
position = ord(char) - ord('A') + 1
```

### 4. Modifying original array

```python
# WRONG: Sorting in-place may modify input
names.sort()  # This changes the original list!

# CORRECT: Create sorted copy if immutability needed
sorted_names = sorted(names)  # Returns new list
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Descending order** | Sort Z to A | Reverse sort, same calculation |
| **Case-insensitive** | Mixed case names | Convert to uppercase before sorting |
| **Weighted positions** | Different position formula | Change multiplication factor |
| **Top-K scores only** | Return K highest scores | Track scores, sort by score, take top K |
| **Group by letter** | Score by first letter | Group names, calculate per group |

**Descending order variant:**

```python
sorted_names = sorted(names, reverse=True)
# Rest remains same
```

**Top-K scores variant:**

```python
# Calculate all name scores
scores = []
for position, name in enumerate(sorted_names, start=1):
    alpha_value = sum(ord(c) - ord('A') + 1 for c in name)
    scores.append(alpha_value * position)

# Return top K
scores.sort(reverse=True)
return scores[:k]
```

---

## Practice Checklist

**Correctness:**

- [ ] Sorts names alphabetically
- [ ] Uses 1-based indexing for positions
- [ ] Correctly converts letters to values (A=1...Z=26)
- [ ] Handles all examples correctly

**Optimization:**

- [ ] Uses efficient built-in sort (O(n log n))
- [ ] Single pass for score calculation
- [ ] No unnecessary string operations

**Interview Readiness:**

- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 6 minutes
- [ ] Can discuss alternative approaches
- [ ] Identified edge cases (empty list, single name, all same name)

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Implement a variation (descending, top-K)
- [ ] Day 14: Explain character encoding to someone else
- [ ] Day 30: Quick review

---

**Strategy Reference:** See [Sorting Fundamentals](../../strategies/fundamentals/sorting.md) | [String Processing](../../prerequisites/strings.md)
