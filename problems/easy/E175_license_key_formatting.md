---
id: E175
old_id: I281
slug: license-key-formatting
title: License Key Formatting
difficulty: easy
category: easy
topics: ["string", "formatting"]
patterns: ["string-manipulation", "reverse-processing"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E008", "E165", "E537"]
prerequisites: ["string-basics", "string-building", "modulo-arithmetic"]
strategy_ref: ../strategies/patterns/string-manipulation.md
---
# License Key Formatting

## Problem

You're given a license key string containing alphanumeric characters and dashes, along with an integer k that specifies the desired group size. Your task is to reformat this license key by removing all existing dashes and regrouping the characters into sections of exactly k characters, separated by dashes.

Here's the twist: the first group can be shorter than k characters (but must have at least one character), while all remaining groups must have exactly k characters. Additionally, all letters in the output should be uppercase. Think of this like reformatting a product key or credit card number for consistent display.

For example, if you have "5F3Z-2e-9-w" with k=4, you first strip out the dashes and convert to uppercase to get "5F3Z2E9W" (8 characters total). Then working from right to left, you create groups of 4: the rightmost 4 characters form "2E9W", and the next 4 form "5F3Z", giving you "5F3Z-2E9W". Notice how both groups have exactly 4 characters. The key insight is processing from right to left ensures all groups except possibly the first have exactly k characters.

## Why This Matters

String formatting and manipulation is ubiquitous in software development - from displaying credit card numbers and phone numbers to formatting serial keys, ISBN codes, and configuration identifiers. The specific technique of processing strings in reverse is a clever pattern that naturally handles asymmetric constraints (where one end has different rules than the other). This appears in problems involving number formatting, text justification, and anywhere you need to ensure trailing groups have fixed sizes while the leading group is variable. The problem also reinforces important string building practices: using string builders or arrays instead of repeated concatenation, and handling character case conversion efficiently.

## Examples

**Example 1:**
- Input: `s = "5F3Z-2e-9-w", k = 4`
- Output: `"5F3Z-2E9W"`
- Explanation: After removing existing dashes and converting to uppercase, the characters are regrouped into sections of 4, resulting in two groups with 4 characters each.

**Example 2:**
- Input: `s = "2-5g-3-J", k = 2`
- Output: `"2-5G-3J"`
- Explanation: The reformatted result has three groups of 2 characters each, with the first group being allowed to have fewer characters if needed.

## Constraints

- 1 <= s.length <= 10⁵
- s consists of English letters, digits, and dashes '-'.
- 1 <= k <= 10⁴

## Think About

1. What makes this problem challenging?
   - First group may have fewer than k characters, all others must have exactly k
   - Need to process from right to left to handle variable first group
   - Must remove all existing dashes and convert to uppercase
   - Building the result string efficiently

2. Can you identify subproblems?
   - Removing dashes from the input string
   - Converting characters to uppercase
   - Grouping characters from right to left in groups of k
   - Inserting dashes between groups

3. What invariants must be maintained?
   - First group has 1 to k characters (never 0)
   - All subsequent groups have exactly k characters
   - All letters must be uppercase
   - Groups separated by single dash

4. Is there a mathematical relationship to exploit?
   - Process string backwards to naturally handle variable first group
   - Use modulo to determine when to insert dashes
   - Total characters (excluding dashes) determines first group size
   - First group size = totalChars % k (or k if result is 0)

## Approach Hints

### Hint 1: Forward Processing with First Group Calculation
Remove all dashes, convert to uppercase, then calculate the size of the first group using modulo. Build the result by taking the first group, then repeatedly taking k characters and inserting dashes.

**Key insight**: First group size = length % k (handle 0 case specially).

**Limitations**: Requires calculating first group size upfront, two passes through string.

### Hint 2: Reverse Processing
Remove dashes and convert to uppercase, then process the string from right to left. Build groups of k characters, inserting dashes between them. Finally, reverse the result.

**Key insight**: Processing backwards naturally handles the variable first group.

**How to implement**:
- Clean string: remove dashes, convert to uppercase
- Iterate from end to start
- Add k characters at a time to result
- Add dash after each group (except the last)
- Reverse the final result

### Hint 3: Optimized Reverse Build
Process the cleaned string from right to left directly into a result array or string builder. Track the count of characters added to the current group. When count reaches k, add a dash (if not at the end) and reset count.

**Key insight**: Using array/list is more efficient than string concatenation in most languages.

**Optimization strategy**:
- Use array/list for building result
- Process from right to left: for (i = cleanStr.length - 1; i >= 0; i--)
- Add character, increment group count
- If count == k and not at start: add dash, reset count
- Reverse array and join to string

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Forward with Calculation | O(n) | O(n) | Calculate first group, then build string |
| Reverse and Reverse Again | O(n) | O(n) | Build reversed, then reverse back |
| Optimized Reverse Build | O(n) | O(n) | Single pass backward, reverse at end |
| StringBuilder Approach | O(n) | O(n) | Most efficient in practice with mutable builders |

## Common Mistakes

### Mistake 1: Not handling the first group correctly when length % k == 0
```
// Wrong - creates empty first group
cleaned = s.replace(/-/g, '').toUpperCase()
firstGroupSize = cleaned.length % k
// ... use firstGroupSize

// Why it fails: If cleaned.length = 8 and k = 4, firstGroupSize = 0
// This creates an empty first group or extra dash at start

// Correct - handle zero case
firstGroupSize = cleaned.length % k
if (firstGroupSize === 0) firstGroupSize = k
// Or: firstGroupSize = ((cleaned.length - 1) % k) + 1
```

### Mistake 2: Adding dash at the wrong position
```
// Wrong - adds dash after every k characters without checking position
result = ""
count = 0
for (let i = cleaned.length - 1; i >= 0; i--) {
    result = cleaned[i] + result
    count++
    if (count === k) {
        result = "-" + result  // Wrong! Adds dash even at start
        count = 0
    }
}

// Why it fails: Adds dash before first group, e.g., "-AB-CDEF"

// Correct - only add dash if not at start
if (count === k && i > 0) {
    result = "-" + result
    count = 0
}
```

### Mistake 3: Not converting to uppercase
```
// Wrong - forgets case conversion
cleaned = s.replace(/-/g, '')
// Process without converting to uppercase

// Why it fails: Output should be uppercase but keeps original case
// Example: "2-4a" becomes "24a" instead of "24A"

// Correct - convert during cleaning or processing
cleaned = s.replace(/-/g, '').toUpperCase()
```

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Format with custom delimiter | Use character other than dash as delimiter | Easy |
| Format from left | First group can be variable but process left-to-right | Easy |
| Multiple delimiter types | Remove multiple types of delimiters before reformatting | Easy |
| Group by value | Different characters grouped with different k values | Medium |
| Validate before format | Return error if input contains invalid characters | Easy |
| Preserve case | Keep original case instead of converting to uppercase | Easy |

## Practice Checklist

Track your progress on mastering this problem:

- [ ] First attempt (understand the problem)
- [ ] Implement forward processing approach
- [ ] Implement reverse processing approach
- [ ] Handle edge cases (k=1, empty string, no dashes)
- [ ] Optimize with string builder or array
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Solve without hints
- [ ] Explain solution to someone else
- [ ] Complete in under 15 minutes

**Strategy**: See [String Manipulation Pattern](../strategies/patterns/string-manipulation.md)
