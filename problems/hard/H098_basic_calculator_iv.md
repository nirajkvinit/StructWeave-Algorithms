---
id: H098
old_id: A237
slug: basic-calculator-iv
title: Basic Calculator IV
difficulty: hard
category: hard
topics: ["sorting"]
patterns: []
estimated_time_minutes: 45
---
# Basic Calculator IV

## Problem

You're provided with an algebraic expression (like `expression = "e + 8 - a + 5"`) and a set of variable assignments specified by `evalvars` and `evalints` arrays (for example, `evalvars = ["e"]` and `evalints = [1]` means `e = 1`). Your task is to simplify the expression and return the result as a list of terms, such as `["-1*a","14"]`.

Expression structure:
- Elements alternate between operands and operators, separated by single spaces
- An operand can be: a parenthesized sub-expression, a variable name, or a non-negative number
- Variables consist only of lowercase letters and can be multi-character (never include leading coefficients like `"2x"` or unary operators like `"-x"`)

Standard operator precedence applies: parentheses are evaluated first, followed by multiplication, then addition and subtraction.
- Example: `expression = "1 + 2 * 3"` evaluates to `["7"]`

Output formatting requirements:
- Within each term, arrange variables alphabetically
  - Write `"a*b*c"` rather than `"b*a*c"`
- Order terms by degree (count of variable factors, with repetition), highest first. Break ties alphabetically by the variable portion
  - `"a*a*b*c"` has degree 4
- Prefix each term with its coefficient and an asterisk (always include coefficient, even if it's 1)
- Example output: `["-2*a*a*a", "3*a*a*b", "3*b*b", "4*a", "5*c", "-6"]`
- Omit any terms with coefficient 0
  - An expression evaluating to `"0"` returns `[]`

You can assume all expressions are valid and intermediate calculations stay within `[-2³¹, 2³¹ - 1]`.

## Why This Matters

Sorting is a fundamental building block for many algorithms. This problem explores how ordered data enables efficient solutions.

## Examples

**Example 1:**
- Input: `expression = "e + 8 - a + 5", evalvars = ["e"], evalints = [1]`
- Output: `["-1*a","14"]`

**Example 2:**
- Input: `expression = "e - 8 + temperature - pressure", evalvars = ["e", "temperature"], evalints = [1, 12]`
- Output: `["-1*pressure","5"]`

**Example 3:**
- Input: `expression = "(e + 8) * (e - 8)", evalvars = [], evalints = []`
- Output: `["1*e*e","-64"]`

## Constraints

- 1 <= expression.length <= 250
- expression consists of lowercase English letters, digits, '+', '-', '*', '(', ')', ' '.
- expression does not contain any leading or trailing spaces.
- All the tokens in expression are separated by a single space.
- 0 <= evalvars.length <= 100
- 1 <= evalvars[i].length <= 20
- evalvars[i] consists of lowercase English letters.
- evalints.length == evalvars.length
- -100 <= evalints[i] <= 100

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Represent polynomial terms as (coefficient, sorted_variables_tuple) pairs. Use recursive descent parsing with operator precedence: handle parentheses first, then multiplication, then addition/subtraction. Store terms in a dictionary mapping variable tuples to coefficients for easy combining of like terms.
</details>

<details>
<summary>🎯 Main Approach</summary>
Create a Term class with coefficient and variables list. Parse expression using recursion: for parentheses, recursively evaluate inner expression; for multiplication, cross-multiply term lists (multiply coefficients, merge variable lists); for add/subtract, combine like terms. Substitute variables with given values. Finally, sort terms by degree and variables, format output.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use dictionary with variable-tuple keys to automatically combine like terms during operations. When multiplying terms, create new term with merged sorted variable lists. Implement comparison function for terms: first by degree (descending), then lexicographically by variables. Filter out zero-coefficient terms before final output.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| String Manipulation | O(n³) | O(n²) | Repeated string operations |
| Recursive Parsing | O(n² · t) | O(n · t) | t is number of terms |
| Optimal with HashMap | O(n · t log t) | O(n · t) | log t for final sorting |

## Common Mistakes

1. **Not sorting variables within terms**
   ```python
   # Wrong: Variables in random order
   term = (coefficient, ['b', 'a', 'c'])

   # Correct: Always sort variables alphabetically
   term = (coefficient, tuple(sorted(['b', 'a', 'c'])))
   # Result: (coefficient, ('a', 'b', 'c'))
   ```

2. **Incorrect term multiplication**
   ```python
   # Wrong: Only multiplying coefficients
   def multiply_terms(term1, term2):
       return (term1[0] * term2[0], term1[1])  # Loses variables from term2

   # Correct: Merge variable lists
   def multiply_terms(term1, term2):
       coeff = term1[0] * term2[0]
       vars = tuple(sorted(list(term1[1]) + list(term2[1])))
       return (coeff, vars)
   ```

3. **Wrong term sorting**
   ```python
   # Wrong: Sorting only by coefficient
   terms.sort(key=lambda t: t[0], reverse=True)

   # Correct: Sort by degree, then lexicographically
   def term_key(term):
       coeff, vars = term
       degree = len(vars)
       return (-degree, vars)  # Negative for descending
   terms.sort(key=term_key)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Basic Calculator III | Hard | Numeric only, simpler evaluation |
| Evaluate Division | Medium | Division with variable substitution |
| Expression Add Operators | Hard | Generate expressions to reach target |
| Parse Lisp Expression | Hard | Different syntax, scoping rules |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (term ordering, variable sorting)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Recursion](../../strategies/patterns/recursion.md) | [HashMap](../../strategies/data-structures/hash-table.md)
