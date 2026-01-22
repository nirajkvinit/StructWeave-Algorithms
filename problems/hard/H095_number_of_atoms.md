---
id: H095
old_id: A193
slug: number-of-atoms
title: Number of Atoms
difficulty: hard
category: hard
topics: ["string", "sorting"]
patterns: []
estimated_time_minutes: 45
---
# Number of Atoms

## Problem

You are given a string `formula` that represents a chemical compound. Your task is to parse this formula and determine the total quantity of each element present.

Chemical element notation follows these rules:
- Element names begin with an uppercase letter, optionally followed by lowercase letters
- A numeric count may appear after the element name when there are multiple atoms (counts of 1 are implicit and not written)
  - Valid: `"H2O"`, `"H2O2"`
  - Invalid: `"H1O2"` (explicitly showing count of 1)

Formulas can be combined by concatenation:
- Example: `"H2O2He3Mg4"` represents a valid compound

Parentheses can group parts of a formula, with an optional multiplier:
- Examples: `"(H2O2)"` or `"(H2O2)3"`

Your output should be a string listing elements alphabetically by name, each followed by its total count (omit the count if it equals 1). Format: element₁, count₁, element₂, count₂, etc.

All atom counts are guaranteed to fit within a 32-bit integer.

## Why This Matters

String manipulation is essential for text processing and pattern matching. This problem builds your character-level thinking.

## Examples

**Example 1:**
- Input: `formula = "H2O"`
- Output: `"H2O"`
- Explanation: Atom counts: H appears 2 times, O appears 1 time.

**Example 2:**
- Input: `formula = "Mg(OH)2"`
- Output: `"H2MgO2"`
- Explanation: Atom counts: H appears 2 times, Mg appears 1 time, O appears 2 times.

**Example 3:**
- Input: `formula = "K4(ON(SO3)2)2"`
- Output: `"K4N2O14S4"`
- Explanation: Atom counts: K appears 4 times, N appears 2 times, O appears 14 times, S appears 4 times.

## Constraints

- 1 <= formula.length <= 1000
- formula consists of English letters, digits, '(', and ')'.
- formula is always valid.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a parsing problem with nested structures. Use a stack to handle parentheses: when you encounter '(', push current counts onto stack; when you hit ')', pop and multiply by the following number. Parse element names and their counts character by character.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use a stack of hashmaps (dictionaries). Process the formula left to right: for uppercase letters, parse the full element name; for digits, parse the complete number; for '(', push a new empty map; for ')', pop the map, get the multiplier, and merge counts into the previous level by multiplying. Finally, sort elements alphabetically and format output.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use a single pass through the string with index tracking. When parsing element names, peek ahead for lowercase letters. When parsing numbers, collect all consecutive digits. Maintain stack invariant: always have at least one map for the base level. Use collections.defaultdict to simplify count merging.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Recursive Parsing | O(n²) | O(n) | Recursive calls for nested parens |
| Stack-based Parsing | O(n log k) | O(n) | k is unique elements (for sorting) |
| Optimal | O(n log k) | O(n) | Single pass with stack |

## Common Mistakes

1. **Not handling multi-character elements**
   ```python
   # Wrong: Only reading single character
   if formula[i].isupper():
       element = formula[i]
       i += 1

   # Correct: Read all lowercase letters following uppercase
   element = formula[i]
   i += 1
   while i < len(formula) and formula[i].islower():
       element += formula[i]
       i += 1
   ```

2. **Incorrect multiplier application**
   ```python
   # Wrong: Not multiplying counts when closing parenthesis
   if ch == ')':
       temp = stack.pop()
       for elem, count in temp.items():
           stack[-1][elem] += count  # Missing multiplier

   # Correct: Parse and apply multiplier
   if ch == ')':
       temp = stack.pop()
       multiplier = parse_number(i)  # Get number after ')'
       for elem, count in temp.items():
           stack[-1][elem] += count * multiplier
   ```

3. **Wrong output format**
   ```python
   # Wrong: Always including count
   result = ''.join(f"{elem}{count}" for elem, count in sorted(counts.items()))

   # Correct: Omit count if it's 1
   result = ''
   for elem, count in sorted(counts.items()):
       result += elem
       if count > 1:
           result += str(count)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Decode String | Medium | Similar parentheses with repetition |
| Ternary Expression Parser | Medium | Nested conditional evaluation |
| Mini Parser | Medium | Parse nested integer lists |
| Remove Comments | Medium | String parsing with state management |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (multi-char elements, nested parens)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Stack](../../prerequisites/stack.md) | [String Parsing](../../strategies/patterns/string-manipulation.md)
