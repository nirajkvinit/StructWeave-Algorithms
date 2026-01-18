---
id: E094
old_id: I041
slug: different-ways-to-add-parentheses
title: Different Ways to Add Parentheses
difficulty: easy
category: easy
topics: ["string", "recursion", "divide-and-conquer"]
patterns: ["divide-and-conquer", "memoization"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E088", "E095", "M030"]
prerequisites: ["recursion", "string-parsing", "divide-and-conquer"]
strategy_ref: ../strategies/patterns/divide-and-conquer.md
---
# Different Ways to Add Parentheses

## Problem

You're given a mathematical expression as a string containing numbers and operators (+, -, *). Your task is to find all possible results that can be obtained by adding parentheses to the expression in different ways. The order of results doesn't matter.

Think about how parentheses change evaluation order. For example, `2-1-1` could be evaluated as `(2-1)-1 = 0` or `2-(1-1) = 2`. Each way of grouping the operations produces a potentially different result. Your job is to generate every possible result by considering every possible way to add parentheses.

The key insight is that every operator in the expression could be the "last" operation to evaluate. If you choose an operator at position i to be evaluated last, you split the expression into a left part and a right part. You then recursively find all possible values for the left part and all possible values for the right part, then combine each left value with each right value using the operator at position i.

The problem guarantees that all results fit within 32-bit integers and that the total number of unique results won't exceed 10,000, so you don't need to worry about overflow or excessive output size.

## Why This Matters

This problem is a classic application of the divide-and-conquer paradigm, one of the most important algorithm design techniques. The pattern of "try every possibility for splitting the problem, recursively solve subproblems, and combine results" appears throughout computer science. You'll see it in parsing expressions, dynamic programming problems, and combinatorial generation.

Understanding this problem deepens your grasp of how different operator precedences and groupings affect computation. Compilers use similar techniques to parse and optimize mathematical expressions. Expression evaluation is fundamental to spreadsheet software, calculator apps, and symbolic mathematics systems.

The problem also introduces Catalan numbers - the number of ways to parenthesize n operators is the nth Catalan number. This sequence appears surprisingly often in combinatorics, from counting binary trees to polygon triangulations. Recognizing when a problem has Catalan number complexity helps you set realistic performance expectations.

This is a medium-difficulty problem that frequently appears in interviews to test recursive thinking and understanding of expression evaluation. It also demonstrates the value of memoization: without caching results, you'd recompute the same subexpressions many times.

## Examples

**Example 1:**
- Input: `expression = "2-1-1"`
- Output: `[0,2]`
- Explanation: ((2-1)-1) = 0
(2-(1-1)) = 2

**Example 2:**
- Input: `expression = "2*3-4*5"`
- Output: `[-34,-14,-10,-10,10]`
- Explanation: (2*(3-(4*5))) = -34
((2*3)-(4*5)) = -14
((2*(3-4))*5) = -10
(2*((3-4)*5)) = -10
(((2*3)-4)*5) = 10

## Constraints

- 1 <= expression.length <= 20
- expression consists of digits and the operator '+', '-', and '*'.
- All the integer values in the input expression are in the range [0, 99].

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Divide and Conquer Pattern</summary>

Every operator in the expression can be the "last" operation to evaluate. If you split the expression at each operator, you can recursively evaluate the left and right parts, then combine their results using that operator. This generates all possible evaluation orders.

</details>

<details>
<summary>🎯 Hint 2: Recursive Decomposition</summary>

For each operator at position i, split the expression into left and right subexpressions. Recursively compute all possible values for the left part and all possible values for the right part. Then combine each left value with each right value using the operator at position i. The base case is when the expression contains no operators (just a number).

</details>

<details>
<summary>📝 Hint 3: Implementation with Memoization</summary>

Optimal approach with memoization:

```
function diffWays(expression):
    if expression is cached:
        return cached result

    results = []
    for i in range(len(expression)):
        if expression[i] is operator:
            left_results = diffWays(expression[0:i])
            right_results = diffWays(expression[i+1:])

            for left in left_results:
                for right in right_results:
                    results.add(apply_operator(left, operator, right))

    if results is empty:  # No operators, just a number
        results.add(parse_int(expression))

    cache[expression] = results
    return results
```

Example: "2-1-1"
- Split at first '-': diffWays("2") and diffWays("1-1")
  - "2" → [2]
  - "1-1" → split at '-': [1] and [1] → [0]
  - Combine: 2 - 0 = 2
- Split at second '-': diffWays("2-1") and diffWays("1")
  - "2-1" → [1]
  - "1" → [1]
  - Combine: 1 - 1 = 0
- Results: [2, 0]

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force Generate All | O(2^n) | O(2^n) | Generate all parenthesizations explicitly |
| **Divide & Conquer** | **O(C(n))** | **O(C(n))** | C(n) is nth Catalan number, roughly O(4^n/n^(3/2)) |
| With Memoization | O(C(n)) | O(C(n)) | Avoids redundant subproblem computation |

**Note:** The number of ways to parenthesize n operators is the nth Catalan number.

**Optimal approach:** Divide and conquer with memoization avoids recomputing subexpressions.

## Common Mistakes

**Mistake 1: Not handling single numbers**

```python
# Wrong - crashes on single number
def diffWaysToCompute(expression):
    results = []
    for i, char in enumerate(expression):
        if char in "+-*":
            left = diffWaysToCompute(expression[:i])
            right = diffWaysToCompute(expression[i+1:])
            for l in left:
                for r in right:
                    # ...
    # Forgot base case!
    return results  # Empty for single numbers!
```

```python
# Correct - handle base case
def diffWaysToCompute(expression):
    results = []
    for i, char in enumerate(expression):
        if char in "+-*":
            # ... split and combine
    if not results:  # No operators found
        results.append(int(expression))
    return results
```

**Mistake 2: Not caching results**

```python
# Wrong - recalculates same subexpressions many times
def diffWaysToCompute(expression):
    results = []
    for i, char in enumerate(expression):
        if char in "+-*":
            left = diffWaysToCompute(expression[:i])  # No memo!
            right = diffWaysToCompute(expression[i+1:])
            # ...
```

```python
# Correct - use memoization
def diffWaysToCompute(expression, memo={}):
    if expression in memo:
        return memo[expression]
    results = []
    for i, char in enumerate(expression):
        if char in "+-*":
            left = diffWaysToCompute(expression[:i], memo)
            right = diffWaysToCompute(expression[i+1:], memo)
            # ...
    if not results:
        results.append(int(expression))
    memo[expression] = results
    return results
```

**Mistake 3: Incorrect operator application**

```python
# Wrong - doesn't handle all operators
def diffWaysToCompute(expression):
    # ...
    for l in left:
        for r in right:
            if char == '+':
                results.append(l + r)
            elif char == '-':
                results.append(l - r)
            # Forgot multiplication!
```

```python
# Correct - handle all operators
def diffWaysToCompute(expression):
    # ...
    for l in left:
        for r in right:
            if char == '+':
                results.append(l + r)
            elif char == '-':
                results.append(l - r)
            elif char == '*':
                results.append(l * r)
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Basic Calculator | Hard | Evaluate expression with single parenthesization |
| Expression Add Operators | Hard | Insert operators to reach target value |
| Unique Binary Search Trees II | Medium | Similar Catalan number problem with trees |
| Parsing Boolean Expression | Hard | Different operators but same divide-and-conquer pattern |

## Practice Checklist

- [ ] **Day 1:** Implement basic divide and conquer solution
- [ ] **Day 3:** Add memoization for optimization
- [ ] **Day 7:** Solve without looking at previous solution
- [ ] **Day 14:** Handle all operators and edge cases correctly
- [ ] **Day 30:** Understand Catalan number connection

**Strategy**: See [Divide and Conquer Pattern](../strategies/patterns/divide-and-conquer.md)
