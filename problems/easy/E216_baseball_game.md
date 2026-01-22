---
id: E216
old_id: A149
slug: baseball-game
title: Baseball Game
difficulty: easy
category: easy
topics: ["array", "stack", "simulation"]
patterns: ["stack-operations"]
estimated_time_minutes: 15
frequency: medium
related_problems:
  - E020_valid_parentheses
  - E155_min_stack
  - M227_basic_calculator_ii
prerequisites:
  - Stack data structure
  - Array iteration
  - String parsing
strategy_ref: ../prerequisites/stacks.md
---
# Baseball Game

## Problem

You're implementing a score tracker for a baseball game with unusual scoring rules. You start with an empty record and process a sequence of operations that modify the score history. Each operation is given as a string in an array, and there are four types of operations you need to handle.

The operations are: (1) An integer string (like "5" or "-2") - add that score to your record. (2) The character '+' - add a new score equal to the sum of the two most recent scores. (3) The character 'D' - add a new score that doubles the most recent score. (4) The character 'C' - remove the most recent score from the record (like an undo operation).

The key insight is that this problem naturally fits a Last-In-First-Out (LIFO) data structure. You need to frequently access the most recent score (for 'D'), the two most recent scores (for '+'), and remove the most recent score (for 'C'). A stack is perfect for this.

For example, with operations ["5", "2", "C", "D", "+"], you'd process: add 5 ([5]), add 2 ([5, 2]), cancel last ([5]), double last to get 10 ([5, 10]), sum last two to get 15 ([5, 10, 15]). The final sum is 5 + 10 + 15 = 30.

Be careful with integer parsing - scores can be negative like "-2", so you can't just check if the first character is a digit. After processing all operations, return the sum of all scores remaining in your record.

## Why This Matters

This problem teaches stack-based simulation, a pattern that appears throughout software engineering. In code editors, the undo/redo functionality uses a stack to track operations. In calculators and expression evaluators, stacks process operators and operands. In browser history, the back button pops from a stack. In function call management, the call stack tracks execution context. The problem also demonstrates string parsing and type conversion, common tasks in data processing pipelines and API handlers. Many technical interviews include stack problems because they test whether you recognize LIFO patterns and can implement basic data structure operations cleanly. Understanding this prepares you for more complex problems like evaluating postfix notation, implementing min/max stacks, validating nested structures, and parsing complex expressions. The simplicity of this problem makes it an excellent introduction to stack-based thinking.

## Examples

**Example 1:**
- Input: `ops = ["5","2","C","D","+"]`
- Output: `30`
- Explanation:
"5" - Record becomes [5].
"2" - Record becomes [5, 2].
"C" - Remove last score, record becomes [5].
"D" - Double 5 to get 10, record becomes [5, 10].
"+" - Sum last two scores (5 + 10 = 15), record becomes [5, 10, 15].
Final sum: 5 + 10 + 15 = 30.

**Example 2:**
- Input: `ops = ["5","-2","4","C","D","9","+","+"]`
- Output: `27`
- Explanation:
"5" - Record becomes [5].
"-2" - Record becomes [5, -2].
"4" - Record becomes [5, -2, 4].
"C" - Remove last score, record becomes [5, -2].
"D" - Double -2 to get -4, record becomes [5, -2, -4].
"9" - Record becomes [5, -2, -4, 9].
"+" - Sum last two (-4 + 9 = 5), record becomes [5, -2, -4, 9, 5].
"+" - Sum last two (9 + 5 = 14), record becomes [5, -2, -4, 9, 5, 14].
Final sum: 5 + (-2) + (-4) + 9 + 5 + 14 = 27.

**Example 3:**
- Input: `ops = ["1","C"]`
- Output: `0`
- Explanation:
"1" - Record becomes [1].
"C" - Remove last score, record becomes [].
With an empty record, the sum is 0.

## Constraints

- 1 <= operations.length <= 1000
- operations[i] is "C", "D", "+", or a string representing an integer in the range [-3 * 10⁴, 3 * 10⁴].
- For operation "+", there will always be at least two previous scores on the record.
- For operations "C" and "D", there will always be at least one previous score on the record.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1 Hint - Initial Direction
Consider what data structure naturally supports adding elements, removing the most recent element, and accessing the last one or two elements. Think about Last-In-First-Out (LIFO) behavior.

### Tier 2 Hint - Key Insight
Use a stack to maintain the score record. For each operation type, you need to:
- Push numeric values directly
- For 'C', pop the last element
- For 'D', peek at the last element, double it, and push
- For '+', peek at the last two elements, sum them, and push

### Tier 3 Hint - Implementation Details
Process each operation string sequentially. Handle string-to-integer conversion for numeric operations. Maintain a running record in a stack/list. After processing all operations, sum all remaining elements in the stack.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Stack simulation | O(n) | O(n) | n is the number of operations; worst case all operations add scores |
| Array simulation | O(n) | O(n) | Similar to stack but using array/list |

**Optimization notes:**
- Single pass through operations is optimal
- Cannot avoid O(n) space as we need to store up to n scores
- Can compute sum during iteration instead of separate final pass

## Common Mistakes

### Mistake 1: Not handling negative numbers correctly
```python
# Wrong - assuming all scores are positive
if ops[i][0].isdigit():
    stack.append(int(ops[i]))

# Correct - handle negative numbers
if ops[i] not in ['C', 'D', '+']:
    stack.append(int(ops[i]))
```

### Mistake 2: Modifying stack incorrectly for '+' operation
```python
# Wrong - popping elements when computing sum
second = stack.pop()
first = stack.pop()
stack.append(first + second)  # Lost first and second!

# Correct - peek without removing
stack.append(stack[-1] + stack[-2])
```

### Mistake 3: Forgetting to sum at the end
```python
# Wrong - returning stack length
return len(stack)

# Correct - sum all scores
return sum(stack)
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| Multiple undo levels | Medium | Support 'C' with a number to remove last k scores |
| Conditional operations | Medium | Add operations like 'M' (multiply last two) or 'A' (average last two) |
| Max score tracking | Easy | Also track and return the maximum score seen |
| Time-based operations | Hard | Each operation has a timestamp, support time-travel queries |

## Practice Checklist

Track your progress on mastering this problem:

**Initial Practice**
- [ ] Solve independently without hints (30 min time limit)
- [ ] Implement stack-based solution
- [ ] Handle all operation types correctly
- [ ] Test with positive and negative numbers

**Spaced Repetition**
- [ ] Day 1: Solve again from scratch
- [ ] Day 3: Solve with O(1) sum tracking optimization
- [ ] Week 1: Explain solution to someone else
- [ ] Week 2: Solve with array instead of stack

**Mastery Validation**
- [ ] Can explain why stack is ideal data structure
- [ ] Can handle edge cases (single operation, all cancels)
- [ ] Solve in under 10 minutes
- [ ] Implement without referring to notes

**Strategy**: See [Stack Pattern](../prerequisites/stacks.md)
