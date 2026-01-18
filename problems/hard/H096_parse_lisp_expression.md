---
id: H096
old_id: A203
slug: parse-lisp-expression
title: Parse Lisp Expression
difficulty: hard
category: hard
topics: ["string"]
patterns: ["backtrack-combination"]
estimated_time_minutes: 45
---
# Parse Lisp Expression

## Problem

Your task is to evaluate a simplified Lisp-style expression provided as a string and return its integer result.

Expression grammar:

- **Base cases**: An expression can be an integer literal (positive or negative) or a variable reference
- **Let binding**: Format `"(let v₁ e₁ v₂ e₂ ... vn en expr)"` creates variable bindings sequentially. Each variable `vᵢ` receives the value of expression `eᵢ`. The entire let expression evaluates to the final expression `expr` under these bindings
- **Addition**: Format `"(add e₁ e₂)"` computes the sum of two evaluated expressions
- **Multiplication**: Format `"(mult e₁ e₂)"` computes the product of two evaluated expressions
- **Variable naming**: Variables begin with a lowercase letter followed by any number of lowercase letters or digits. The keywords `"add"`, `"let"`, and `"mult"` are reserved
- **Scoping**: Variable lookup follows lexical scoping rules. When evaluating a variable reference, the interpreter searches from the innermost enclosing scope outward through parent scopes until finding a binding

All provided expressions are guaranteed to be syntactically valid and evaluable.

## Why This Matters

String manipulation is essential for text processing and pattern matching. This problem builds your character-level thinking.

## Examples

**Example 1:**
- Input: `expression = "(let x 2 (mult x (let x 3 y 4 (add x y))))"`
- Output: `14`
- Explanation: Within the inner add operation, variable `x` resolves to 3 from the nearest enclosing scope, while `y` equals 4. This sum (7) is then multiplied by the outer `x` value of 2, yielding 14.

**Example 2:**
- Input: `expression = "(let x 3 x 2 x)"`
- Output: `2`
- Explanation: Variable bindings are processed left to right, so the final binding of `x` to 2 takes precedence.

**Example 3:**
- Input: `expression = "(let x 1 y 2 x (add x y) (add x y))"`
- Output: `5`
- Explanation: The expression `(add x y)` evaluates to 3 and rebinds variable `x`. The final expression then computes 3 + 2 = 5.

## Constraints

- 1 <= expression.length <= 2000
- There are no leading or trailing spaces in expression.
- All tokens are separated by a single space in expression.
- The answer and all intermediate calculations of that answer are guaranteed to fit in a **32-bit** integer.
- The expression is guaranteed to be legal and evaluate to an integer.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a recursive evaluation problem with lexical scoping. Use recursive descent parsing: when you encounter '(', determine the operation type (let/add/mult), parse arguments recursively, and maintain scope chain for variable lookups. Each 'let' creates a new scope that shadows outer variables.
</details>

<details>
<summary>🎯 Main Approach</summary>
Implement a recursive evaluator with scope management. Parse tokens by splitting on spaces while respecting parentheses. For 'let', create new scope dict copying parent scope, bind variables sequentially, recurse on final expression. For 'add'/'mult', evaluate both operands recursively and perform operation. Handle base cases: integers parse directly, variables lookup in current scope.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use a stack or dictionary chain for scope management. When entering a new scope, copy parent scope (or use ChainMap in Python). Parse tokens lazily: tokenize once, then consume tokens as you evaluate. Match parentheses carefully to find expression boundaries for recursive calls.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| String Parsing + Recursion | O(n²) | O(n²) | Repeated string operations |
| Tokenization + Recursion | O(n) | O(n) | Parse once, evaluate recursively |
| Optimal | O(n) | O(n) | Single tokenization pass |

## Common Mistakes

1. **Not handling scope correctly**
   ```python
   # Wrong: Global scope for all variables
   scope = {}
   def eval(expr):
       if expr.startswith('(let'):
           scope[var] = val  # Pollutes global scope

   # Correct: Create new scope for each let
   def eval(expr, scope=None):
       scope = dict(scope or {})  # Copy parent scope
       if expr.startswith('(let'):
           scope[var] = eval(val, scope)  # Local binding
       return eval(final_expr, scope)
   ```

2. **Incorrect tokenization with nested parentheses**
   ```python
   # Wrong: Simple split breaks nested expressions
   tokens = expr.split(' ')  # Breaks on "(let x (add 1 2) x)"

   # Correct: Track parentheses depth during tokenization
   def tokenize(expr):
       tokens = []
       depth = 0
       current = ''
       for ch in expr:
           if ch == '(' or ch == ')':
               depth += 1 if ch == '(' else -1
           # Split on space only at depth 0
   ```

3. **Not evaluating let bindings sequentially**
   ```python
   # Wrong: Evaluating all bindings in initial scope
   scope = {}
   for i in range(0, len(bindings), 2):
       scope[bindings[i]] = eval(bindings[i+1], initial_scope)

   # Correct: Update scope as you go
   scope = dict(parent_scope)
   for i in range(0, len(bindings), 2):
       scope[bindings[i]] = eval(bindings[i+1], scope)  # Use updated scope
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Basic Calculator III | Hard | Math expression with +, -, *, /, () |
| Ternary Expression Parser | Medium | Simpler conditional evaluation |
| Evaluate Reverse Polish Notation | Medium | Stack-based, no scoping needed |
| Expression Add Operators | Hard | Generate expressions vs evaluate |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (nested scopes, shadowing)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Recursion](../../strategies/patterns/recursion.md) | [String Parsing](../../strategies/patterns/string-manipulation.md)
