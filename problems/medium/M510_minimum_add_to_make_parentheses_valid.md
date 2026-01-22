---
id: M510
old_id: A388
slug: minimum-add-to-make-parentheses-valid
title: Minimum Add to Make Parentheses Valid
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Minimum Add to Make Parentheses Valid

## Problem

You're given a string `s` containing only opening `(` and closing `)` parentheses. The string might be invalid - meaning the parentheses don't balance properly. Your task is to determine the minimum number of parentheses you need to insert (anywhere in the string) to make it valid.

First, let's clarify what makes a parentheses string **valid**:
- An empty string is valid
- If `A` and `B` are valid strings, then `AB` (concatenation) is valid
- If `A` is valid, then `(A)` is valid

Essentially, every opening parenthesis must have a matching closing parenthesis that comes after it, and every closing parenthesis must have a matching opening parenthesis that came before it.

Examples of valid strings: `""`, `"()"`, `"(())"`, `"()()"`, `"((())())"`
Examples of invalid strings: `"("`, `")"`, `"()))"`, `"((("`

For any invalid string, you can insert parentheses anywhere to fix it:
- `"())"` → Insert `(` at the start to get `"(()))"` (1 insertion)
- `"((("` → Insert `)))` at the end to get `"((()))"` (3 insertions)
- `"()))"` → Insert `(` at position 2 to get `"(())"` (1 insertion)

Your goal: find the minimum number of insertions needed.

## Why This Matters

Parentheses validation is fundamental to building parsers and compilers. Every IDE uses similar algorithms to check whether your code has balanced braces, brackets, and parentheses, highlighting errors as you type. Template engines verify that opening and closing tags match. Mathematical expression evaluators validate that formulas are well-formed before evaluation. Build systems check that configuration files have properly nested structures. The counting technique you'll learn here - tracking unmatched opening and closing elements separately - extends to any nested structure validation: XML/HTML tags, JSON brace matching, and even protein folding patterns in bioinformatics where molecular bonds need balanced pairing.

## Examples

**Example 1:**
- Input: `s = "())"`
- Output: `1`

**Example 2:**
- Input: `s = "((("`
- Output: `3`

## Constraints

- 1 <= s.length <= 1000
- s[i] is either '(' or ')'.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Track unmatched opening and closing parentheses separately as you scan left to right. Each '(' can potentially match with a future ')', and each ')' needs a preceding '(' to match with. Unmatched ones need insertions.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use two counters: one for unmatched opening parentheses and one for unmatched closing. For each '(', increment opens. For each ')', if opens > 0, decrement opens (matched), otherwise increment closes (unmatched). The sum of remaining opens and closes is your answer.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
This can be solved in a single pass with O(1) space. No stack needed - just track the balance. Think of it as tracking debt: opening parentheses create credit, closing parentheses consume it or create debt.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Stack-based | O(n) | O(n) | Using stack to track unmatched parentheses |
| Optimal | O(n) | O(1) | Two counters for opens and closes |

## Common Mistakes

1. **Using stack when counters suffice**
   ```python
   # Wrong: Unnecessarily complex with stack
   def minAddToMakeValid(self, s):
       stack = []
       unmatched_close = 0
       for char in s:
           if char == '(':
               stack.append(char)
           else:
               if stack:
                   stack.pop()
               else:
                   unmatched_close += 1
       return len(stack) + unmatched_close

   # Correct: Simple counter approach
   def minAddToMakeValid(self, s):
       opens = 0
       closes = 0
       for char in s:
           if char == '(':
               opens += 1
           else:
               if opens > 0:
                   opens -= 1
               else:
                   closes += 1
       return opens + closes
   ```

2. **Not handling unmatched opening parentheses**
   ```python
   # Wrong: Only counts unmatched closing
   def minAddToMakeValid(self, s):
       balance = 0
       unmatched = 0
       for char in s:
           if char == '(':
               balance += 1
           else:
               balance -= 1
               if balance < 0:
                   unmatched += 1
                   balance = 0
       return unmatched  # Missing: + balance for unmatched opens

   # Correct: Account for both types
   def minAddToMakeValid(self, s):
       balance = 0
       unmatched = 0
       for char in s:
           if char == '(':
               balance += 1
           else:
               balance -= 1
               if balance < 0:
                   unmatched += 1
                   balance = 0
       return unmatched + balance  # Both closes and opens
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Valid Parentheses | Easy | Just check validity without counting insertions |
| Minimum Remove to Make Valid Parentheses | Medium | Remove instead of insert |
| Longest Valid Parentheses | Hard | Find longest valid substring |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Stack](../../prerequisites/stack.md)
