---
id: M114
old_id: I072
slug: integer-to-english-words
title: Integer to English Words
difficulty: medium
category: medium
topics: ["string", "math", "recursion"]
patterns: ["divide-and-conquer", "modular-arithmetic"]
estimated_time_minutes: 30
frequency: low
related_problems: ["E012", "E013", "M273"]
prerequisites: ["string-manipulation", "recursion", "number-representation"]
---
# Integer to English Words

## Problem

Transform a given non-negative whole number (ranging from 0 to 2³¹ - 1) into its corresponding English word phrase. For example, 123 becomes "One Hundred Twenty Three" and 12345 becomes "Twelve Thousand Three Hundred Forty Five". The challenge lies in handling the grouping structure of English numbers, which follows a pattern every three digits (ones, thousands, millions, billions). Numbers from 10 to 19 require special handling ("Eleven", not "Ten One"). You'll need to build the phrase recursively or iteratively, carefully managing spaces and handling edge cases like zero. This is a classic string construction problem that tests your ability to break down a complex formatting task into manageable components and handle numerous special cases systematically.

## Why This Matters

Check-writing software and financial systems convert numeric amounts to words for legal documents and bank checks to prevent fraud (the written amount serves as verification). Voice assistants and text-to-speech systems need to pronounce numbers naturally across different languages, each with their own grouping rules. Invoice generation systems spell out totals for contracts and official receipts. Accessibility tools for visually impaired users convert displayed numbers to spoken words. This problem teaches you to handle localization and formatting challenges, manage recursive decomposition of structured data, and build lookup-table-driven solutions that are common in parsers, compilers, and data serialization libraries.

## Examples

**Example 1:**
- Input: `num = 123`
- Output: `"One Hundred Twenty Three"`

**Example 2:**
- Input: `num = 12345`
- Output: `"Twelve Thousand Three Hundred Forty Five"`

**Example 3:**
- Input: `num = 1234567`
- Output: `"One Million Two Hundred Thirty Four Thousand Five Hundred Sixty Seven"`

## Constraints

- 0 <= num <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Grouping by Thousands</summary>

English number representation follows a pattern every three digits: ones, thousands, millions, billions. Break the number into chunks of three digits from right to left. Process each chunk separately and append the appropriate scale word (Thousand, Million, Billion).

</details>

<details>
<summary>🎯 Hint 2: Recursive Helper for Three Digits</summary>

Create a helper function that converts numbers 0-999 to words. This handles hundreds, tens, and ones places. The main function splits the full number into groups of three and calls the helper for each group, adding scale words between groups.

</details>

<details>
<summary>📝 Hint 3: Implementation Structure</summary>

```
Setup lookup tables:
- ones = ["", "One", "Two", ..., "Nine"]
- teens = ["Ten", "Eleven", ..., "Nineteen"]
- tens = ["", "", "Twenty", "Thirty", ..., "Ninety"]
- thousands = ["", "Thousand", "Million", "Billion"]

Helper function three_digit_to_words(num):
    Handle 0-19 specially
    Handle 20-99 (tens + ones)
    Handle 100-999 (hundreds + recursive for remainder)

Main function:
    1. Handle special case: num == 0 return "Zero"
    2. Break num into groups of 3 digits
    3. For each group (from most significant):
       - Convert using helper
       - Append scale word (Billion/Million/Thousand)
    4. Join with spaces, trim extra spaces
```

Edge cases: Zero, teens (10-19), exact hundreds/thousands.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (Hardcode all) | O(1) | O(1) | Impractical, millions of cases |
| **Recursive Grouping** | **O(1)** | **O(1)** | Max 10 digits = constant operations |
| Iterative with Lookup | O(1) | O(1) | Same as recursive, different style |

All approaches are O(1) because input is bounded by 2³¹-1 (10 digits max).

## Common Mistakes

### Mistake 1: Not handling zero correctly
```python
# Wrong: Returns empty string for zero
def numberToWords(num):
    if num == 0:
        return ""  # Wrong!
    # Process groups...

# Correct: Special case for zero
def numberToWords(num):
    if num == 0:
        return "Zero"
    # Process groups...
```

### Mistake 2: Incorrect teen handling (10-19)
```python
# Wrong: Treats 10-19 as "Ten One", "Ten Two", etc.
def three_digit_to_words(num):
    tens_digit = (num // 10) % 10
    ones_digit = num % 10
    result = tens[tens_digit] + " " + ones[ones_digit]
    # Wrong for 10-19!

# Correct: Special case for 10-19
def three_digit_to_words(num):
    if 10 <= num <= 19:
        return teens[num - 10]
    tens_digit = (num // 10) % 10
    ones_digit = num % 10
    result = tens[tens_digit]
    if ones_digit:
        result += " " + ones[ones_digit]
    return result
```

### Mistake 3: Extra spaces not trimmed
```python
# Wrong: May produce "One  Thousand" (double space)
def numberToWords(num):
    result = ""
    for group, scale in zip(groups, ["Billion", "Million", "Thousand", ""]):
        if group:
            result += three_digit_to_words(group) + " " + scale + " "
    return result  # Trailing/extra spaces!

# Correct: Clean up spaces
def numberToWords(num):
    if num == 0:
        return "Zero"

    result = []
    for group, scale in zip(groups, ["Billion", "Million", "Thousand", ""]):
        if group:
            words = three_digit_to_words(group)
            if scale:
                words += " " + scale
            result.append(words)
    return " ".join(result)
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Integer to Roman | Medium | Different number system |
| Excel sheet column title | Easy | Base-26 representation |
| Fraction to recurring decimal | Medium | Handle decimals/fractions |
| Number to words in other languages | Medium | Different grouping rules |
| Parse words back to integer | Hard | Reverse operation |

## Practice Checklist

- [ ] **Day 0**: Solve using recursive helper approach (35 min)
- [ ] **Day 1**: Implement iterative version (30 min)
- [ ] **Day 3**: Code from memory, handle all edge cases (25 min)
- [ ] **Day 7**: Extend to handle negative numbers and decimals (40 min)
- [ ] **Day 14**: Implement in different language with different word order (35 min)
- [ ] **Day 30**: Speed run under time pressure (20 min)

**Strategy**: See [String Manipulation Patterns](../strategies/patterns/string-patterns.md)
