---
id: E268
euler_id: 17
slug: number-letter-counts
title: Number Letter Counts
difficulty: easy
category: easy
topics: ["string", "recursion"]
patterns: []
estimated_time_minutes: 25
frequency: low
related_problems: ["E012", "M273"]
prerequisites: ["strings-basics", "recursion-basics"]
---

# Number Letter Counts

## Problem

Convert numbers from 1 to N into their English word representation and count the total number of letters used (excluding spaces and hyphens).

For example:
- 342 is written as "three hundred and forty-two" (ignoring spaces and hyphens: "threehundredandfortytwo" = 23 letters)
- 115 is "one hundred and fifteen" = "onehundredandfifteen" = 20 letters

If you write out all numbers from 1 to 5 as words:
- 1 = "one" (3 letters)
- 2 = "two" (3 letters)
- 3 = "three" (5 letters)
- 4 = "four" (4 letters)
- 5 = "five" (4 letters)
- Total = 3 + 3 + 5 + 4 + 4 = 19 letters

Note: Use British English conventions (e.g., "one hundred and forty-two" not "one hundred forty-two").

## Why This Matters

This problem teaches systematic decomposition of a problem into cases. Converting numbers to words requires handling special cases (teens vs. tens, hundreds, compound numbers) and recursive structure (each part follows similar rules).

The pattern here—breaking a number into components (hundreds place, tens place, units place) and processing each independently—is fundamental to many parsing and formatting problems. You'll see similar patterns in date formatting, currency conversion, roman numeral conversion, and natural language generation systems.

This problem also emphasizes the importance of edge case handling. The numbers 10-19 ("ten", "eleven", "twelve", ..., "nineteen") break the regular pattern of tens and units, requiring special handling. Recognizing and correctly implementing such special cases is critical in real-world software development where exceptions and edge cases are the norm.

## Examples

**Example 1:**

- Input: `N = 5`
- Output: `19`
- Explanation: "one" (3) + "two" (3) + "three" (5) + "four" (4) + "five" (4) = 19 letters

**Example 2:**

- Input: `N = 20`
- Output: `112`
- Explanation: Sum of letters for "one" through "twenty"

**Example 3:**

- Input: `N = 342`
- Output: Sum includes "three hundred and forty-two" = 23 letters for 342 alone

**Example 4:**

- Input: `N = 1000`
- Output: Includes "one thousand" = 11 letters for 1000

## Constraints

- 1 <= N <= 1000
- Use British English (include "and" between hundreds and tens/units)
- Do not count spaces or hyphens
- Count only letters

## Think About

1. What are the special cases? (1-19, tens, hundreds, thousands)
2. How do you break down a multi-digit number into components?
3. When do you add "and" in British English?
4. Can you precompute letter counts for common words?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Identify word components</summary>

Break down the problem by number ranges:

**1-9:** "one", "two", "three", ..., "nine"
- Store in array: `ones = ["", "one", "two", ..., "nine"]`

**10-19:** Special cases "ten", "eleven", "twelve", ..., "nineteen"
- Store in array: `teens = ["ten", "eleven", ..., "nineteen"]`

**20-90:** "twenty", "thirty", "forty", ..., "ninety"
- Store in array: `tens = ["", "", "twenty", "thirty", ..., "ninety"]`

**100s:** "hundred"

**1000:** "thousand"

</details>

<details>
<summary>🎯 Hint 2: Convert number to words algorithm</summary>

```
function number_to_words(n):
    if n >= 1000:
        return ones[n // 1000] + " thousand"

    words = ""

    if n >= 100:
        words += ones[n // 100] + " hundred"
        if n % 100 != 0:
            words += " and"

    remainder = n % 100

    if remainder >= 20:
        words += " " + tens[remainder // 10]
        if remainder % 10 != 0:
            words += "-" + ones[remainder % 10]
    elif remainder >= 10:
        words += " " + teens[remainder - 10]
    elif remainder > 0:
        # Check if we need "and" before units (British English)
        if n >= 100:
            words += " " + ones[remainder]
        else:
            words += ones[remainder]

    return words.strip()
```

**Key insight:** Handle hundreds, then check if remainder is teen (10-19), twenty+ (20-99), or single digit (1-9).

</details>

<details>
<summary>📝 Hint 3: Optimization - precompute letter counts</summary>

Instead of generating full strings, precompute letter counts:

```python
# Letter counts for base words
ones_letters = [0, 3, 3, 5, 4, 4, 3, 5, 5, 4]  # "", "one", "two", ...
teens_letters = [3, 6, 6, 8, 8, 7, 7, 9, 8, 8]  # "ten", "eleven", ...
tens_letters = [0, 0, 6, 6, 5, 5, 5, 7, 6, 6]  # "", "", "twenty", ...

# "hundred" = 7 letters
# "thousand" = 8 letters
# "and" = 3 letters

def count_letters(n):
    count = 0

    if n >= 1000:
        count += ones_letters[n // 1000] + 8  # "thousand"
        n %= 1000

    if n >= 100:
        count += ones_letters[n // 100] + 7  # "hundred"
        if n % 100 != 0:
            count += 3  # "and"

    remainder = n % 100

    if remainder >= 20:
        count += tens_letters[remainder // 10]
        count += ones_letters[remainder % 10]
    elif remainder >= 10:
        count += teens_letters[remainder - 10]
    else:
        count += ones_letters[remainder]

    return count
```

This avoids string manipulation and is much faster.

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Generate Strings | O(N × log N) | O(log N) | Slow; creates strings for each number |
| **Precompute Counts** | **O(N)** | **O(1)** | Optimal; direct counting |
| Cache Results | O(N) + memoization | O(N) | Useful if recalculating same numbers |

Where:
- N = upper limit (1 to N)
- log N = number of digits in N

**Why Precompute Wins:**

- Constant time per number: O(1) per conversion
- No string allocation overhead
- Simple arithmetic operations only

---

## Common Mistakes

### 1. Forgetting "and" in British English

```
# WRONG: American English style
142 → "one hundred forty-two"

# CORRECT: British English
142 → "one hundred and forty-two"
```

**Rule:** Add "and" between hundreds and any non-zero tens/units.

### 2. Incorrect teen handling

```python
# WRONG: Treating teens like twenties
15 → "tenty-five"  # No such word!

# CORRECT: Special case for 10-19
if 10 <= n <= 19:
    return teens[n - 10]
```

### 3. Off-by-one in array indexing

```python
# WRONG:
ones = ["one", "two", "three", ...]  # Index 0 is "one"
# Then ones[1] = "two", not "one"!

# CORRECT: Start with empty string
ones = ["", "one", "two", "three", ...]  # ones[1] = "one"
```

### 4. Counting spaces and hyphens

```
# WRONG:
"twenty-three" → count = 12 (includes hyphen)

# CORRECT:
"twenty-three" → "twentythree" → count = 11
```

**Solution:** Remove spaces and hyphens before counting, or don't include them in precomputed counts.

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **American English** | No "and" in numbers | Skip "and" addition |
| **Roman Numerals** | Convert to I, V, X, L, C, D, M | Different decomposition rules |
| **Ordinal numbers** | "first", "second", "third" | Different word lists |
| **Large numbers** | Up to millions/billions | Extend with "million", "billion" cases |
| **Different language** | Spanish, French, etc. | Change word arrays |

**American English variant:**

```python
# Simply remove the "and" addition
if n >= 100:
    count += ones_letters[n // 100] + 7  # "hundred"
    # Do NOT add 3 for "and"
```

**Ordinal numbers variant:**

```python
# Different endings
ordinal_ones = ["", "first", "second", "third", "fourth", "fifth", ...]
ordinal_teens = ["tenth", "eleventh", "twelfth", ...]
ordinal_tens = ["", "", "twentieth", "thirtieth", ...]
```

---

## Practice Checklist

**Correctness:**

- [ ] Handles 1-9 correctly
- [ ] Handles 10-19 (teens) correctly
- [ ] Handles 20-99 (tens + units) correctly
- [ ] Handles 100-999 with "and"
- [ ] Handles 1000 correctly

**Optimization:**

- [ ] Precomputed letter counts
- [ ] No unnecessary string creation
- [ ] O(N) total time complexity

**Interview Readiness:**

- [ ] Can explain British vs. American English difference
- [ ] Can code solution in 12 minutes
- [ ] Can discuss special cases (teens, "and")
- [ ] Identified edge cases (1, 1000, teens)

**Spaced Repetition Tracker:**

- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Implement ordinal numbers variant
- [ ] Day 14: Explain recursion pattern to someone else
- [ ] Day 30: Quick review

---

**Strategy Reference:** See [String Processing](../../prerequisites/strings.md) | [Recursion Patterns](../../strategies/patterns/recursion.md)
