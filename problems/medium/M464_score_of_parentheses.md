---
id: M464
old_id: A323
slug: score-of-parentheses
title: Score of Parentheses
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Score of Parentheses

## Problem

You're given a string `s` containing only parentheses, guaranteed to be balanced (every opening parenthesis has a matching closing one). Your task is to calculate its score using these three rules:

1. **Base case**: An empty pair of parentheses `"()"` has a score of `1`
2. **Concatenation**: When two valid parentheses strings `A` and `B` sit side by side, their combined score is `A + B`
3. **Nesting**: When a valid parentheses string `A` is wrapped in parentheses to form `(A)`, the score doubles to become `2 * A`

For example:
- `"()"` scores 1 (base case)
- `"(())"` is `()` wrapped, so it scores 2 × 1 = 2 (nesting)
- `"()()"` is two base cases side by side, so it scores 1 + 1 = 2 (concatenation)
- `"((()))"` is `(())` wrapped, which is `()` wrapped twice, so 2 × (2 × 1) = 4

## Why This Matters

This problem teaches you to recognize and evaluate recursive structures, a fundamental skill in parsing and compiler design. Think about expression evaluation in programming languages where nested operations have precedence (like `2 * (3 + 4)`), or XML/HTML parsing where nested tags have hierarchical meaning. It also appears in mathematical notation processing, JSON validation, and any system that needs to understand nested structures. The key insight is recognizing that depth of nesting corresponds to exponential contribution, similar to how digits in different positions contribute powers of 10 to a number's value.

## Examples

**Example 1:**
- Input: `s = "()"`
- Output: `1`

**Example 2:**
- Input: `s = "(())"`
- Output: `2`

**Example 3:**
- Input: `s = "()()"`
- Output: `2`

## Constraints

- 2 <= s.length <= 50
- s consists of only '(' and ')'.
- s is a balanced parentheses string.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Each "()" at depth d contributes 2^d to the total score. The depth is how many unmatched "(" precede it. Instead of parsing and evaluating the expression tree, you can directly calculate the contribution of each "()" based on its nesting depth.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use a stack to track scores at each nesting level. When you see "(", push 0 onto the stack (new level). When you see ")", pop the top value: if it's 0, we just closed "()" so add 1; otherwise, we closed "(A)" so double the value. Add this to the new top of stack. Alternatively, track depth and add 2^depth whenever you see "()".
</details>

<details>
<summary>⚡ Optimization Tip</summary>
The O(1) space solution: maintain depth counter, and whenever you encounter "()" (current char is ")" and previous is "("), add 2^(depth-1) to the score. Increment depth for "(", decrement for ")". This avoids the stack entirely.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Recursive Parsing | O(n) | O(n) | Build expression tree, evaluate recursively |
| Stack-based | O(n) | O(n) | Push/pop scores at each nesting level |
| Depth Counting | O(n) | O(1) | Count depth, add 2^depth for each "()" |

## Common Mistakes

1. **Incorrectly handling nested structures**
   ```python
   # Wrong: Not doubling when closing nested parentheses
   if s[i] == ')':
       score += 1

   # Correct: Check if inner content exists
   if s[i] == ')':
       val = stack.pop()
       stack[-1] += max(2 * val, 1)  # 1 if val==0 (empty), else double
   ```

2. **Not tracking depth correctly**
   ```python
   # Wrong: Incrementing score without considering nesting
   if s[i:i+2] == "()":
       score += 1

   # Correct: Score depends on depth
   if s[i] == '(':
       depth += 1
   else:
       if s[i-1] == '(':  # Found "()"
           score += (1 << (depth - 1))  # 2^(depth-1)
       depth -= 1
   ```

3. **Misunderstanding the scoring rules**
   ```python
   # Wrong: Adding scores incorrectly
   # "()()" should be 1 + 1 = 2, not 2 * 2

   # Correct: Adjacent strings add, nested strings double
   # "(())" = 2 * 1 = 2
   # "()()" = 1 + 1 = 2
   # "((()))" = 2 * 2 * 1 = 4
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Valid Parentheses | Easy | Just check validity, no scoring |
| Minimum Add to Make Parentheses Valid | Medium | Count unmatched parentheses |
| Longest Valid Parentheses | Hard | Find longest valid substring |
| Different Ways to Add Parentheses | Medium | Generate all possible results |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Stack Pattern](../../strategies/patterns/stack.md)
