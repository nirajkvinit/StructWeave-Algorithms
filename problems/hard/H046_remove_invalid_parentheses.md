---
id: H046
old_id: I100
slug: remove-invalid-parentheses
title: Remove Invalid Parentheses
difficulty: hard
category: hard
topics: ["string", "stack"]
patterns: []
estimated_time_minutes: 45
strategy_ref: ../prerequisites/stacks-and-queues.md
---
# Remove Invalid Parentheses

## Problem

You have a string `s` containing parentheses characters '(' and ')' mixed with letters. Some of these parentheses may be improperly matched, making the string invalid.

Your task is to delete the smallest possible number of parentheses to create a valid string. A valid string has every opening parenthesis matched with a corresponding closing parenthesis in the correct order.

Return all distinct valid strings achievable by removing the minimum number of parentheses. The order of strings in your result doesn't matter.

## Why This Matters

String manipulation is essential for text processing and pattern matching. This problem builds your character-level thinking.

## Examples

**Example 1:**
- Input: `s = "()())()"`
- Output: `["(())()","()()()"]`

**Example 2:**
- Input: `s = "(a)())()"`
- Output: `["(a())()","(a)()()"]`

**Example 3:**
- Input: `s = ")("`
- Output: `[""]`

## Constraints

- 1 <= s.length <= 25
- The string s contains only lowercase English letters and the characters '(' and ')'.
- At most 20 parentheses appear in s.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

**Strategy**: See [String Pattern](../prerequisites/stacks-and-queues.md)

## Approach Hints

<details>
<summary>Key Insight</summary>
First, determine the minimum number of removals needed: count unmatched opening and closing parentheses. Then, use BFS or DFS to generate all possible strings by removing that exact number of parentheses, keeping only valid results. The challenge is avoiding duplicate work when exploring different removal combinations.
</details>

<details>
<summary>Main Approach</summary>
Use BFS starting from the original string. At each level, generate all possible strings by removing one parenthesis. Check if each new string is valid. If valid strings are found at any level, those are your answers (minimum removals). Use a set to avoid processing duplicate strings. Stop when you find the first level with valid strings to ensure minimum removals.
</details>

<details>
<summary>Optimization Tip</summary>
Before BFS, calculate the exact number of left and right parentheses to remove using a single pass with a counter. Use DFS with pruning: only explore paths where you haven't exceeded the removal limits. This reduces the search space significantly and avoids generating strings that remove too many parentheses.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(2^n × n) | O(2^n) | Try all subsets, validate each string |
| BFS with Deduplication | O(n × 2^n) | O(2^n) | Level-order exploration with set for visited |
| DFS with Pruning | O(2^n) | O(n) | More memory efficient, stops early |
| Optimal | O(2^n) | O(n) | Cannot avoid checking exponential combinations in worst case |

## Common Mistakes

1. **Not Checking for Minimum Removals**
   ```python
   # Wrong: Returns all valid strings, not just those with minimum removals
   def removeInvalidParentheses(self, s):
       results = []
       for i in range(len(s)):
           candidate = s[:i] + s[i+1:]
           if self.isValid(candidate):
               results.append(candidate)
       return results

   # Correct: Use BFS to ensure minimum removals
   def removeInvalidParentheses(self, s):
       if self.isValid(s):
           return [s]
       queue = [s]
       visited = {s}
       found = False
       results = []
       while queue and not found:
           for _ in range(len(queue)):
               curr = queue.pop(0)
               for i in range(len(curr)):
                   if curr[i] not in '()':
                       continue
                   candidate = curr[:i] + curr[i+1:]
                   if candidate not in visited:
                       visited.add(candidate)
                       if self.isValid(candidate):
                           results.append(candidate)
                           found = True
                       else:
                           queue.append(candidate)
       return results
   ```

2. **Inefficient Validation**
   ```python
   # Wrong: Recreates validation logic incorrectly
   def isValid(self, s):
       return s.count('(') == s.count(')')

   # Correct: Check balanced parentheses properly
   def isValid(self, s):
       count = 0
       for ch in s:
           if ch == '(':
               count += 1
           elif ch == ')':
               count -= 1
               if count < 0:
                   return False
       return count == 0
   ```

3. **Not Handling Duplicates**
   ```python
   # Wrong: Processes same string multiple times
   queue = [s]
   while queue:
       curr = queue.pop(0)
       # No visited set check

   # Correct: Use set to track visited strings
   queue = [s]
   visited = {s}
   while queue:
       curr = queue.pop(0)
       for candidate in generate_candidates(curr):
           if candidate not in visited:
               visited.add(candidate)
               queue.append(candidate)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Minimum Remove to Make Valid Parentheses | Medium | Return any valid string, not all with minimum removals |
| Longest Valid Parentheses | Hard | Find longest valid substring instead of making whole string valid |
| Different Types of Brackets | Hard | Handle [], {}, () all together |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [BFS Pattern](../../strategies/patterns/bfs.md)
