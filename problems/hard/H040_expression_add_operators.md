---
id: H040
old_id: I081
slug: expression-add-operators
title: Expression Add Operators
difficulty: hard
category: hard
topics: ["string"]
patterns: []
estimated_time_minutes: 45
---
# Expression Add Operators

## Problem

You have a numeric string `num` consisting solely of digit characters, along with a target integer value. Your task is to find every possible way to place the arithmetic operators addition, subtraction, and multiplication between the digits such that the resulting mathematical expression equals the target value.

Leading zeros are not permitted in any operand within the generated expressions.

## Why This Matters

String manipulation is essential for text processing and pattern matching. This problem builds your character-level thinking.

## Examples

**Example 1:**
- Input: `num = "123", target = 6`
- Output: `["1*2*3","1+2+3"]`
- Explanation: Both "1*2*3" and "1+2+3" evaluate to 6.

**Example 2:**
- Input: `num = "232", target = 8`
- Output: `["2*3+2","2+3*2"]`
- Explanation: Both "2*3+2" and "2+3*2" evaluate to 8.

**Example 3:**
- Input: `num = "3456237490", target = 9191`
- Output: `[]`
- Explanation: There are no expressions that can be created from "3456237490" to evaluate to 9191.

## Constraints

- 1 <= num.length <= 10
- num consists of only digits.
- -2³¹ <= target <= 2³¹ - 1

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>Key Insight</summary>
Use backtracking to try all possible placements of operators. The challenge is handling multiplication's higher precedence. Track the previous operand separately so when you encounter multiplication, you can "undo" the last addition/subtraction and apply multiplication first.
</details>

<details>
<summary>Main Approach</summary>
Backtrack with parameters: current_index, current_expression_string, current_value, last_operand. At each position, try: 1) No operator (extend current number), 2) + operator, 3) - operator, 4) * operator. For multiplication, subtract last_operand from current_value, then add (last_operand * new_number). Handle leading zeros by not allowing multi-digit numbers starting with 0.
</details>

<details>
<summary>Optimization Tip</summary>
Critical: track "last" value to handle multiplication correctly. When you add/subtract, last = +/- number. When you multiply, calculate: value = value - last + (last * num). This effectively replaces "last" with "last * num" in the total. Prune branches early by checking if remaining digits can possibly reach target.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force Backtracking | O(4^n * n) | O(n) | 4 choices at each position, n positions |
| Optimal (with pruning) | O(4^n * n) | O(n) | Same worst case, but prunes invalid branches |
| Memoization attempt | Not applicable | - | Subproblems aren't overlapping |

## Common Mistakes

1. **Incorrect multiplication handling**
   ```python
   # Wrong: Treating multiplication same as addition
   if op == '*':
       new_value = current_value * num

   # Correct: Undo last operation, then multiply
   if op == '*':
       new_value = current_value - last + (last * num)
       new_last = last * num
   ```

2. **Not preventing leading zeros**
   ```python
   # Wrong: Allowing numbers like "05" or "00"
   for i in range(pos, len(num)):
       operand = int(num[pos:i+1])
       # process...

   # Correct: Skip if current starts with 0 and length > 1
   if num[pos] == '0' and i > pos:
       break
   ```

3. **String concatenation inefficiency**
   ```python
   # Wrong: Creating new strings repeatedly (slow)
   def backtrack(expr_string):
       backtrack(expr_string + '+' + num)

   # Correct: Build result list, avoid string ops in recursion
   def backtrack(path, ...):
       if at_end:
           result.append(''.join(path))
       path.append('+')
       backtrack(path, ...)
       path.pop()
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Basic Calculator | Hard | Evaluate given expression (no operator placement) |
| Different Ways to Add Parentheses | Medium | Add parentheses to expression for different results |
| Target Sum | Medium | Add +/- before numbers to reach target |
| Maximize Score After N Operations | Hard | Choose pairs and operators to maximize score |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Backtracking with State Management](../../strategies/patterns/backtracking.md)
