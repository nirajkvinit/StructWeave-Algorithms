---
id: E160
old_id: I238
slug: ternary-expression-parser
title: Ternary Expression Parser
difficulty: easy
category: easy
topics: ["string", "stack", "recursion"]
patterns: ["stack", "recursion", "parsing"]
estimated_time_minutes: 15
frequency: low
related_problems: ["E020", "E224", "M227"]
prerequisites: ["stack-operations", "recursion-basics"]
strategy_ref: ../strategies/patterns/stack.md
---
# Ternary Expression Parser

## Problem

A ternary expression is a compact way to write conditional logic, similar to an if-else statement but in a single line. The format is `condition ? value_if_true : value_if_false`. These expressions can be nested, like `T ? (F ? 1 : 2) : 3`.

You're given a string `expression` representing a nested ternary expression, and your task is to evaluate it and return the final result as a string.

The expression contains:
- Single-digit numbers (0-9)
- Boolean values: 'T' (true) and 'F' (false)
- The operators '?' (then) and ':' (else)

An important detail: ternary expressions are **right-associative**, meaning they evaluate from right to left. This is different from most arithmetic operators. For example, `F?1:T?4:5` should be read as `F?1:(T?4:5)`, not `(F?1:T)?4:5`. This right-to-left evaluation is standard in programming languages like C, Java, and Python.

The expression is guaranteed to be well-formed, with proper pairing of '?' and ':' characters. After complete evaluation, the result will always be a single character: either a digit, 'T', or 'F'.

## Why This Matters

Expression parsing is a core component of compilers, interpreters, configuration file processors, and template engines. This problem teaches you how to handle operator associativity, which determines the order of evaluation when multiple operators appear in sequence. Right-associativity is less common than left-associativity (addition and multiplication are left-associative), making it particularly instructive. The stack-based approach you'll learn here is the foundation for evaluating postfix expressions, parsing HTML/XML tags, checking balanced parentheses, and implementing calculators. The alternative recursive approach demonstrates how recursion naturally handles nested structures by mirroring the grammar of the language. Understanding both stack-based and recursive parsing prepares you for more complex parsing tasks like building abstract syntax trees or implementing domain-specific languages.

## Examples

**Example 1:**
- Input: `expression = "T?2:3"`
- Output: `"2"`
- Explanation: Since the condition is true, we select 2 rather than 3.

**Example 2:**
- Input: `expression = "F?1:T?4:5"`
- Output: `"4"`
- Explanation: Due to right-to-left association, we can add parentheses for clarity:
"(F ? 1 : (T ? 4 : 5))" evaluates to "(F ? 1 : 4)" which becomes "4"
Alternatively: "(F ? 1 : (T ? 4 : 5))" evaluates to "(T ? 4 : 5)" which becomes "4"

**Example 3:**
- Input: `expression = "T?T?F:5:3"`
- Output: `"F"`
- Explanation: With right-to-left grouping and parentheses added:
"(T ? (T ? F : 5) : 3)" evaluates to "(T ? F : 3)" which becomes "F"
"(T ? (T ? F : 5) : 3)" evaluates to "(T ? F : 5)" which becomes "F"

## Constraints

- 5 <= expression.length <= 10⁴
- expression consists of digits, 'T', 'F', '?', and ':'.
- It is **guaranteed** that expression is a valid ternary expression and that each number is a **one-digit number**.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Recursive Parsing
**Hint**: Since ternary expressions are right-associative, recursion naturally handles the nesting.

**Key Ideas**:
- Start from the beginning, find the condition (first character)
- Find the '?' and corresponding ':'
- Recursively evaluate true branch and false branch
- Return appropriate result based on condition

**Why This Works**: Recursion handles nested structure naturally, matching right-to-left association.

### Intermediate Approach - Stack with Right-to-Left Scan
**Hint**: Process the expression from right to left using a stack to handle nested ternary operations.

**Optimization**:
- Iterate from right to left
- Push characters onto stack
- When you see a '?', the condition is to the left
- Pop true and false values, evaluate condition, push result
- Final stack top is the answer

**Trade-off**: O(n) time, O(n) space, cleaner than tracking indices in recursion.

### Advanced Approach - Single Pass with Stack
**Hint**: Use stack to track operands and operators, evaluating from right to left in one pass.

**Key Insight**:
- Scan right to left: for each character
- If digit/T/F: push to stack
- If ':': skip (separator)
- If '?': pop two values (true_val, false_val), check condition (left of '?'), push result
- Continue until expression is fully evaluated

**Why This is Optimal**: O(n) time, O(n) space, single pass without complex recursion overhead.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Naive Recursion (no memoization) | O(n^2) | O(n) | May re-scan for ':' multiple times |
| Optimized Recursion | O(n) | O(n) | Single scan with index tracking |
| Stack (right-to-left) | O(n) | O(n) | Single pass, stack stores intermediate results |
| Stack (left-to-right with lookahead) | O(n) | O(n) | More complex logic, same complexity |

## Common Mistakes

### Mistake 1: Incorrect colon matching for nested ternaries
```
# WRONG - Finding first ':' instead of matching ':'
def parse(expr):
    condition = expr[0]
    colon_idx = expr.index(':')  # Finds first ':', not the matching one!
    true_branch = expr[2:colon_idx]
    false_branch = expr[colon_idx+1:]
```
**Why it fails**: For "T?T?F:5:3", finds first ':' at index 5, not the matching one at index 7.

**Correct approach**: Track nesting depth with counter to find matching ':' for the current '?'.

### Mistake 2: Evaluating in wrong order (left-to-right)
```
# WRONG - Left-to-right evaluation
result = expr[0]
for i in range(1, len(expr)):
    if expr[i] == '?':
        # This doesn't handle right-associativity correctly
```
**Why it fails**: Ternary expressions are right-associative, must evaluate from right or use recursion.

**Correct approach**: Process right-to-left with stack or use recursion which naturally handles right association.

### Mistake 3: Not handling single character base case
```
# WRONG - Missing base case
def parse(expr):
    condition = expr[0]
    # Assumes there's always a '?' but expr might be just "5" or "T"
    q_idx = expr.index('?')  # Raises ValueError if no '?'
```
**Why it fails**: After recursing, subexpressions may be single characters.

**Correct approach**: Check if expression length is 1, return that character directly.

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Nested Conditional with Multiple Operators | Add &&, ||, ! operators | Medium |
| Expression with Parentheses | Allow explicit grouping with () | Medium |
| Multi-digit Numbers | Handle numbers > 9 | Medium |
| Ternary to If-Else Converter | Output structured if-else code | Medium |
| Minimal Ternary Expression | Simplify redundant ternaries | Hard |

## Practice Checklist

Track your progress as you master this problem:

- [ ] **Day 1**: Solve with recursive approach (allow 25 mins)
- [ ] **Day 2**: Implement stack-based right-to-left solution
- [ ] **Day 3**: Code without reference, test edge cases
- [ ] **Week 2**: Handle correct colon matching for nested expressions
- [ ] **Week 4**: Solve expression parser with parentheses
- [ ] **Week 8**: Speed drill - solve in under 12 minutes

**Strategy**: See [Stack Pattern](../strategies/patterns/stack.md) for expression parsing techniques.
