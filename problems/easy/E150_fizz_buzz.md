---
id: E150
old_id: I211
slug: fizz-buzz
title: Fizz Buzz
difficulty: easy
category: easy
topics: ["math", "simulation"]
patterns: ["modular-arithmetic", "iteration"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E172", "E202", "M012"]
prerequisites: ["modular-arithmetic", "conditional-logic", "string-conversion"]
strategy_ref: ../strategies/fundamentals/iteration-patterns.md
---
# Fizz Buzz

## Problem

Given a positive integer n, create an array of strings representing the numbers from 1 to n, but with special substitution rules applied. The array should be 1-indexed, meaning position 0 represents number 1, position 1 represents number 2, and so on.

The substitution rules are based on divisibility and must be checked in the correct order. For each number from 1 to n: if the number is divisible by both 3 and 5, replace it with "FizzBuzz". If divisible by 3 but not 5, use "Fizz". If divisible by 5 but not 3, use "Buzz". If divisible by neither, use the string representation of the number itself.

The critical detail is checking divisibility by both 3 and 5 before checking them individually. Since any number divisible by both 3 and 5 is also divisible by 3 alone and 5 alone, you must structure your conditionals carefully. If you check divisibility by 3 first without also checking 5, you'll return "Fizz" for numbers like 15 that should return "FizzBuzz". You can check divisibility by 15 (since LCM of 3 and 5 is 15), or use a compound condition checking both 3 and 5 simultaneously.

The modulo operator is your tool here: `i % 3 == 0` checks divisibility by 3. You'll iterate from 1 to n inclusive, apply the rules to each number, and build the result array. This problem, despite its simplicity, tests your understanding of conditional logic ordering and modular arithmetic.

## Why This Matters

FizzBuzz is a classic programming interview filter that tests basic coding competence: loops, conditionals, and modular arithmetic. Beyond its screening purpose, it introduces patterns used in real applications: rule-based transformations appear in business logic engines, game development (turn-based actions), automated testing frameworks, and calendar/scheduling systems (every nth day events). The modulo operation is fundamental to circular buffers, hash table implementations, load balancing algorithms (round-robin), and cryptographic operations. The extensibility challenge ("what if we add more rules?") teaches you to write maintainable code that separates data from logic, preparing you for configuration-driven systems, plugin architectures, and strategy pattern implementations. This problem also appears in discussions of code maintainability, interview screening effectiveness, and as a benchmark for comparing programming languages. Understanding how to elegantly extend FizzBuzz to handle arbitrary divisor-string mappings demonstrates your grasp of abstraction and separation of concerns, essential for production code.

## Examples

**Example 1:**
- Input: `n = 3`
- Output: `["1","2","Fizz"]`
- Explanation: Position 3 is divisible by 3, so it becomes "Fizz"

**Example 2:**
- Input: `n = 5`
- Output: `["1","2","Fizz","4","Buzz"]`
- Explanation: Position 3 gets "Fizz" and position 5 gets "Buzz"

**Example 3:**
- Input: `n = 15`
- Output: `["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]`
- Explanation: Position 15 is divisible by both 3 and 5, resulting in "FizzBuzz"

## Constraints

- 1 <= n <= 10⁴

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Sequential Conditional Checks
Iterate from 1 to n. For each number, check the conditions in order: first check if divisible by both 3 and 5 (using modulo operator `%`), then check divisible by 3 only, then divisible by 5 only, otherwise use the number itself. Build the result array as you go.

**Key insight**: Check the most specific condition (divisible by both) before the individual conditions to avoid incorrect matches.

### Intermediate Approach - String Concatenation
For each number from 1 to n, build the result string by concatenating. Start with an empty string, add "Fizz" if divisible by 3, add "Buzz" if divisible by 5. If the string is still empty, use the number. This approach naturally handles the "FizzBuzz" case without a separate check.

**Key insight**: String concatenation elegantly combines conditions without nested if-else.

### Advanced Approach - Extensible Design
Design the solution to easily add new rules (e.g., divisible by 7 → "Boom"). Use a mapping of divisors to strings, iterate through the mappings for each number, and concatenate matching strings. This makes the code maintainable and extensible for interview follow-ups.

**Key insight**: Separation of rules from logic makes the solution adaptable to changing requirements.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Conditional Checks | O(n) | O(n) | Output array storage, constant work per number |
| String Concatenation | O(n) | O(n) | Same time, potentially cleaner code |
| Extensible/Mapping | O(n × k) | O(n) | k = number of rules (constant in basic case) |

All practical approaches are linear in n since we must produce n outputs.

## Common Mistakes

### Mistake 1: Wrong Condition Order
```python
# Wrong: Checking individual conditions first
def fizzBuzz(n):
    result = []
    for i in range(1, n + 1):
        if i % 3 == 0:
            result.append("Fizz")  # Will never reach "FizzBuzz"
        elif i % 5 == 0:
            result.append("Buzz")
        elif i % 15 == 0:
            result.append("FizzBuzz")
        else:
            result.append(str(i))
    return result
```

**Why it fails**: Numbers divisible by 15 match the first condition (divisible by 3) and return "Fizz" instead of "FizzBuzz".

**Fix**: Check divisibility by 15 (or both 3 and 5) first: `if i % 15 == 0: result.append("FizzBuzz")`.

### Mistake 2: Using 15 Without Understanding
```python
# Wrong: Hardcoding 15 without explanation
def fizzBuzz(n):
    result = []
    for i in range(1, n + 1):
        if i % 15 == 0:  # Magic number
            result.append("FizzBuzz")
        # ... rest
```

**Why it's problematic**: While correct, using 15 without comment is unclear. Better to use `i % 3 == 0 and i % 5 == 0` for readability, or add a comment explaining that 15 = LCM(3, 5).

**Fix**: Either use explicit condition `if i % 3 == 0 and i % 5 == 0` or add comment: `if i % 15 == 0:  # LCM of 3 and 5`.

### Mistake 3: Off-by-One Error in Range
```python
# Wrong: Excluding n
def fizzBuzz(n):
    result = []
    for i in range(1, n):  # Missing n
        # ... logic
    return result
```

**Why it fails**: Returns n-1 elements instead of n. For input 15, misses "FizzBuzz" at position 15.

**Fix**: Use `range(1, n + 1)` to include n, or `range(n)` with `i + 1` for the number.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Fizz Buzz Multithreaded | Medium | Print FizzBuzz using multiple threads in order |
| Custom Rules FizzBuzz | Easy | Extend to arbitrary divisor-string mappings |
| Reverse FizzBuzz | Medium | Given output array, determine n and rules |
| FizzBuzz Tree | Medium | Print FizzBuzz for nodes in a binary tree |
| Distributed FizzBuzz | Hard | Coordinate FizzBuzz across multiple machines |

## Practice Checklist

Track your progress on this problem:

- [ ] **Day 0**: Solve with basic conditional approach (15 min)
- [ ] **Day 1**: Review condition ordering and off-by-one errors
- [ ] **Day 3**: Implement using string concatenation method (10 min)
- [ ] **Day 7**: Write extensible version with configurable rules (20 min)
- [ ] **Day 14**: Explain to someone why order matters (5 min)
- [ ] **Day 30**: Speed solve in under 5 minutes

**Strategy**: See [Iteration Patterns](../strategies/fundamentals/iteration-patterns.md)
