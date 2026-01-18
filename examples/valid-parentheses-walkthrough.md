---
title: Valid Parentheses - Complete Walkthrough
type: worked-example
problem_id: E014
patterns: ["stack-matching", "bracket-validation"]
estimated_time: 30
difficulty: easy
topics: ["string", "stack"]
---

# Valid Parentheses - Complete Walkthrough

## Overview

This walkthrough demonstrates how to solve the Valid Parentheses problem using the stack data structure. You'll learn why stacks are the natural choice for matching problems and how to implement a clean, efficient solution.

**Problem Statement:** Given a string containing only the characters `'(', ')', '{', '}', '[', ']'`, determine if the input string is valid. A string is valid if every opening bracket has a corresponding closing bracket in the correct order.

**Learning Goals:**
- Understand when and why to use stacks
- Master the Last-In-First-Out (LIFO) pattern
- Learn to handle matching problems systematically
- Develop intuition for nested structure problems

---

## Problem Visualization

Before diving into code, let's visualize what makes a string valid or invalid.

### Valid Examples

**Example 1: Simple matching**
```
Input: "()"

Visual:
Step 1: See '(' → Push to stack → Stack: ['(']
Step 2: See ')' → Matches top '(' → Pop → Stack: []
Result: Stack empty ✓ VALID
```

**Example 2: Multiple types**
```
Input: "()[]{}"

Process:
( → stack: ['(']
) → matches '(', pop → stack: []
[ → stack: ['[']
] → matches '[', pop → stack: []
{ → stack: ['{']
} → matches '{', pop → stack: []

Result: Stack empty ✓ VALID
```

**Example 3: Nested brackets**
```
Input: "{[()]}"

Process:
{ → stack: ['{']
[ → stack: ['{', '[']
( → stack: ['{', '[', '(']
) → matches '(', pop → stack: ['{', '[']
] → matches '[', pop → stack: ['{']
} → matches '{', pop → stack: []

Result: Stack empty ✓ VALID

Visual nesting:
{ [ ( ) ] }
└─────────┘  Outermost pair
  └───────┘  Middle pair
    └───┘    Innermost pair
```

### Invalid Examples

**Example 1: Mismatched types**
```
Input: "(]"

Process:
( → stack: ['(']
] → top is '(' but we need ']' to match '['
    MISMATCH! ✗ INVALID

The ']' doesn't match the '(' on top of stack.
```

**Example 2: Wrong order**
```
Input: "([)]"

Process:
( → stack: ['(']
[ → stack: ['(', '[']
) → top is '[' but ')' should match '('
    MISMATCH! ✗ INVALID

Visual issue:
( [ ) ]
└───┘ Tries to close inner pair
  └─X─┘ Before closing middle pair
```

**Example 3: Unclosed brackets**
```
Input: "((("

Process:
( → stack: ['(']
( → stack: ['(', '(']
( → stack: ['(', '(', '(']

Result: Stack not empty ✗ INVALID

Three opening brackets, zero closing brackets.
```

**Example 4: Closing with no opening**
```
Input: ")"

Process:
) → stack is empty, nothing to match!
    ✗ INVALID

Can't close what was never opened.
```

---

## Building Intuition: Why Stack?

### The Key Question

When you see a closing bracket like `')'`, which opening bracket must it match with?

**Answer:** The **most recent unmatched** opening bracket.

### Real-World Analogy

Think about putting on clothes:

```
Morning (opening):
1. Put on shirt     [stack: shirt]
2. Put on jacket    [stack: shirt, jacket]
3. Put on coat      [stack: shirt, jacket, coat]

Evening (closing):
1. Remove coat      [stack: shirt, jacket]      ← Must remove LAST item first
2. Remove jacket    [stack: shirt]              ← Then second-to-last
3. Remove shirt     [stack: empty]              ← Finally the first item

You MUST remove in reverse order (Last-In-First-Out)!
```

This is exactly how nested brackets work. The most recently opened bracket must be the first to close.

### Why Not Other Data Structures?

**Queue (First-In-First-Out)?**
```
Input: "{()}"

Using queue:
{ → queue: ['{']
( → queue: ['{', '(']
) → front is '{' (WRONG! Should be '(')
    ✗ FAILS

Queues give us the FIRST opening, not the MOST RECENT.
```

**Array without LIFO?**
```
Input: "([)]"

Using unsorted array:
We'd have to search through all openings
to find which one matches.
Time: O(n) per closing bracket
Total: O(n²)

Stack gives us O(1) access to the right opening!
```

**Counter?**
```
Input: "([)]"

Using counters:
Open count = 2, Close count = 2
Counter says: BALANCED ✓

But it's actually INVALID!
Counter can't check matching TYPES or ORDER.
```

### The Stack Insight

Stack gives us exactly what we need:
1. **O(1) access** to the most recent opening
2. **Natural LIFO** matches how nesting works
3. **Automatic ordering** - stack itself maintains order

---

## Step-by-Step Solution Development

### Step 1: What Information Do We Track?

For each opening bracket we see, we need to remember:
- What type it is (`(`, `[`, or `{`)
- Where it is (its position in the stack)

We don't need to store indices - just the bracket characters themselves.

### Step 2: The Algorithm

```
Algorithm:
1. Create empty stack
2. For each character in string:
   IF character is opening bracket:
      Push it onto stack
   ELSE (character is closing bracket):
      IF stack is empty:
         INVALID (closing with no opening)
      IF top of stack matches this closing bracket:
         Pop from stack (successful match)
      ELSE:
         INVALID (wrong bracket type)
3. After processing all characters:
   IF stack is empty:
      VALID (all openings were closed)
   ELSE:
      INVALID (unclosed openings remain)
```

### Step 3: How to Check Matches?

We need to know which closing bracket matches which opening bracket.

**Mapping:**
```
')' matches '('
']' matches '['
'}' matches '{'
```

We can use a dictionary:
```python
matches = {
    ')': '(',
    ']': '[',
    '}': '{'
}
```

When we see a closing bracket `c`, we check if `stack.top() == matches[c]`.

---

## Complete Implementation

### Code with Line-by-Line Explanation

```python
def is_valid(s):
    """
    Check if string of brackets is valid

    Time: O(n) - single pass through string
    Space: O(n) - stack can grow up to n/2 in size
    """
    # Map each closing bracket to its opening bracket
    matches = {
        ')': '(',
        ']': '[',
        '}': '{'
    }

    # Stack to track unmatched opening brackets
    stack = []

    # Process each character
    for char in s:
        # Is this an opening bracket?
        if char in '([{':
            # Yes - push onto stack to wait for closing
            stack.append(char)

        else:  # char is closing bracket: ), ], or }
            # Check 1: Is stack empty?
            if not stack:
                # Closing bracket with no opening
                return False

            # Check 2: Does top of stack match?
            if stack[-1] == matches[char]:
                # Success - pop the matched opening
                stack.pop()
            else:
                # Mismatch - wrong bracket type
                return False

    # All characters processed
    # Valid only if all openings were closed (stack empty)
    return len(stack) == 0
```

### Detailed Line Breakdown

```python
matches = {
    ')': '(',
    ']': '[',
    '}': '{'
}
```
- Dictionary mapping closing → opening brackets
- Alternative: could map opening → closing
- This direction is cleaner for our use case

```python
stack = []
```
- Python list as stack (append = push, pop = pop)
- Will store opening brackets we haven't closed yet
- Empty initially - no unmatched openings

```python
for char in s:
```
- Single pass through string
- Process each bracket exactly once
- O(n) time where n = string length

```python
if char in '([{':
```
- Check if character is an opening bracket
- Alternative: `char in matches.values()`
- String membership check is faster

```python
stack.append(char)
```
- Push opening bracket onto stack
- It's now waiting to be matched
- append() is O(1) - just add to end

```python
else:  # closing bracket
```
- Only 6 possible characters total
- If not opening, must be closing
- Could explicitly check `char in ')]}']` for clarity

```python
if not stack:
    return False
```
- Empty stack means no unmatched openings
- Can't close what was never opened
- Example: ")" immediately fails here

```python
if stack[-1] == matches[char]:
```
- `stack[-1]` is top of stack (last element)
- `matches[char]` is the opening this closing needs
- Example: char = ')', matches[')'] = '(', check if top is '('

```python
stack.pop()
```
- Remove matched opening from stack
- pop() is O(1) - just remove last element
- Stack gets smaller as we match pairs

```python
else:
    return False
```
- Top doesn't match required opening
- Example: top = '[', char = ')', expects '('
- Immediate failure - no need to continue

```python
return len(stack) == 0
```
- Final check: all openings should be matched
- If stack not empty, some brackets unclosed
- Example: "(((" leaves stack as ['(', '(', '(']
- Could also write: `return not stack`

---

## Detailed Trace Through Examples

### Example 1: Valid Nested Brackets

**Input:** `s = "({[]})"`

**Initial State:**
```
stack = []
matches = {')': '(', ']': '[', '}': '{'}
```

**Process each character:**

```
char = '('
  Is '(' in '([{' ? YES → opening bracket
  Action: stack.append('(')
  Stack: ['(']

char = '{'
  Is '{' in '([{' ? YES → opening bracket
  Action: stack.append('{')
  Stack: ['(', '{']

char = '['
  Is '[' in '([{' ? YES → opening bracket
  Action: stack.append('[')
  Stack: ['(', '{', '[']

char = ']'
  Is ']' in '([{' ? NO → closing bracket
  Is stack empty? NO
  Does stack[-1] == matches[']' ]?
    stack[-1] = '['
    matches[']'] = '['
    '[' == '[' ? YES ✓
  Action: stack.pop()
  Stack: ['(', '{']

char = '}'
  Is '}' in '([{' ? NO → closing bracket
  Is stack empty? NO
  Does stack[-1] == matches['}']?
    stack[-1] = '{'
    matches['}'] = '{'
    '{' == '{' ? YES ✓
  Action: stack.pop()
  Stack: ['(']

char = ')'
  Is ')' in '([{' ? NO → closing bracket
  Is stack empty? NO
  Does stack[-1] == matches[')']?
    stack[-1] = '('
    matches[')'] = '('
    '(' == '(' ? YES ✓
  Action: stack.pop()
  Stack: []

End of string.
Is len(stack) == 0 ? YES
Return: True ✓ VALID
```

### Example 2: Invalid Mismatch

**Input:** `s = "([)]"`

```
char = '('
  Opening → stack.append('(')
  Stack: ['(']

char = '['
  Opening → stack.append('[')
  Stack: ['(', '[']

char = ')'
  Closing bracket
  Stack not empty ✓
  Does stack[-1] == matches[')']?
    stack[-1] = '['
    matches[')'] = '('
    '[' == '(' ? NO ✗
  Return: False ✗ INVALID

Explanation:
  We opened '(' then '['
  But tried to close ')' (which needs '(')
  Most recent opening is '[', not '('
  Brackets are interleaved, not nested properly
```

### Example 3: Invalid - Unclosed Brackets

**Input:** `s = "(("`

```
char = '('
  Opening → stack.append('(')
  Stack: ['(']

char = '('
  Opening → stack.append('(')
  Stack: ['(', '(']

End of string.
Is len(stack) == 0?
  len(stack) = 2
  NO ✗
Return: False ✗ INVALID

Explanation:
  Two openings, zero closings
  Stack still has unmatched brackets
```

### Example 4: Invalid - Closing with No Opening

**Input:** `s = ")"`

```
char = ')'
  Closing bracket
  Is stack empty? YES
  Return: False ✗ INVALID

Explanation:
  First character is closing
  Nothing to match it with
  Fails immediately
```

### Example 5: Edge Case - Empty String

**Input:** `s = ""`

```
for char in s:  ← Loop never executes (empty string)

Is len(stack) == 0?
  Stack was never modified, still []
  YES ✓
Return: True ✓ VALID

Explanation:
  Empty string has no unmatched brackets
  Vacuously true - valid by definition
```

---

## Common Mistakes and Edge Cases

### Mistake 1: Not Checking Empty Stack

**Wrong Code:**
```python
for char in s:
    if char in '([{':
        stack.append(char)
    else:
        if stack[-1] == matches[char]:  # CRASHES if stack empty!
            stack.pop()
        else:
            return False
```

**Problem:**
```
Input: ")"
First iteration: char = ')'
  Not in '([{', so goes to else
  Tries stack[-1] but stack is []
  IndexError: list index out of range
```

**Fix:** Check if stack is empty first
```python
if not stack:
    return False
if stack[-1] == matches[char]:
    ...
```

### Mistake 2: Forgetting Final Stack Check

**Wrong Code:**
```python
for char in s:
    # ... process characters
return True  # WRONG: Always returns True if no mismatch during loop
```

**Problem:**
```
Input: "((("
Loop processes all characters fine (all are openings)
Returns True
BUT stack = ['(', '(', '('] → should be INVALID!
```

**Fix:** Check if stack is empty at end
```python
return len(stack) == 0
```

### Mistake 3: Using Counter Instead of Stack

**Wrong Code:**
```python
count = 0
for char in s:
    if char in '([{':
        count += 1
    else:
        count -= 1
    if count < 0:
        return False
return count == 0
```

**Problem:**
```
Input: "([)]"
( → count = 1
[ → count = 2
) → count = 1
] → count = 0
Returns True

BUT actually INVALID! Wrong order.
Counter can't distinguish bracket TYPES.
```

### Mistake 4: Wrong Match Check

**Wrong Code:**
```python
# Using opening → closing mapping
matches = {'(': ')', '[': ']', '{': '}'}

for char in s:
    if char in '([{':
        stack.append(char)
    else:
        if stack and stack[-1] in matches and matches[stack[-1]] == char:
            stack.pop()
        else:
            return False
```

**This actually works but is more complex!**
```
When char = ')':
  Check: matches[stack[-1]] == char
  Check: matches['('] == ')'
  More steps, harder to read
```

**Our approach is cleaner:**
```python
matches = {')': '(', ']': '[', '}': '{'}
if stack[-1] == matches[char]:  # Direct comparison
```

### Mistake 5: Not Handling All Bracket Types

**Wrong Code:**
```python
# Only handles ()
for char in s:
    if char == '(':
        stack.append(char)
    elif char == ')':
        if not stack or stack[-1] != '(':
            return False
        stack.pop()
# What about [] and {}? Forgot them!
```

**Fix:** Use data structure that handles all types
```python
matches = {')': '(', ']': '[', '}': '{'}  # All three types
if char in '([{':  # All opening types
    ...
```

---

## Complexity Analysis

### Time Complexity: O(n)

**Breakdown:**
1. Loop through string: n iterations
2. Each iteration:
   - Dictionary lookup: O(1)
   - Stack push/pop: O(1)
   - String membership check: O(1)
3. Total: O(n) × O(1) = O(n)

**Best case:** O(1)
```
Input: ")"
First character fails immediately
```

**Average case:** O(n)
```
Input: "(())"
Process all characters
```

**Worst case:** O(n)
```
Input: "((((("
Process all n characters
Plus final stack check
```

### Space Complexity: O(n)

**Analysis:**
- Stack stores opening brackets
- Worst case: all characters are opening brackets
- Example: "(((((" → stack size = 5

**Best case:** O(1)
```
Input: "()"
Stack size never exceeds 1
```

**Average case:** O(n/2) = O(n)
```
Input: "((()))"
Max stack size = 3 (half of 6)

Process:
( → stack: ['(']
( → stack: ['(', '(']
( → stack: ['(', '(', '(']  ← Max size
) → stack: ['(', '(']
) → stack: ['(']
) → stack: []
```

**Worst case:** O(n)
```
Input: "((((("
All openings, no closings
Stack size = n
```

**Space breakdown:**
- Stack: O(n)
- Matches dictionary: O(1) (only 3 entries)
- Loop variables: O(1)
- Total: O(n)

---

## Variations and Extensions

### Variation 1: Return Position of First Error

**Problem:** Instead of True/False, return index of first invalid character

```python
def first_error_position(s):
    """
    Return index of first invalid character, or -1 if valid

    Example:
      "([)]" → returns 2 (index of ')')
      "(())" → returns -1 (valid)
    """
    matches = {')': '(', ']': '[', '}': '{'}
    stack = []

    for i, char in enumerate(s):  # Track index
        if char in '([{':
            stack.append(char)
        else:
            if not stack:
                return i  # Closing with no opening
            if stack[-1] != matches[char]:
                return i  # Mismatch
            stack.pop()

    if stack:
        # Unclosed brackets - error is at first unclosed position
        # Could return index of first unclosed opening
        return len(s)  # Or some sentinel value

    return -1  # Valid
```

### Variation 2: Count Minimum Additions to Make Valid

**Problem:** How many brackets to add to make string valid?

```python
def min_additions(s):
    """
    Count minimum brackets to add

    Example:
      "(()" → 1 (need one ')')
      "())" → 1 (need one '(' at start)
      "(((" → 3 (need three ')')
    """
    matches = {')': '(', ']': '[', '}': '{'}
    stack = []
    additions = 0

    for char in s:
        if char in '([{':
            stack.append(char)
        else:
            if not stack:
                additions += 1  # Need to add opening
            elif stack[-1] != matches[char]:
                additions += 1  # Need to fix mismatch
            else:
                stack.pop()

    # Remaining stack items need closing brackets
    additions += len(stack)

    return additions
```

### Variation 3: Generate All Valid Combinations

**Problem:** Generate all valid strings with n pairs of parentheses

```python
def generate_parentheses(n):
    """
    Generate all valid strings with n pairs of '()'

    Example:
      n = 2 → ["(())", "()()"]
      n = 3 → ["((()))", "(()())", "(())()", "()(())", "()()()"]
    """
    result = []

    def backtrack(current, open_count, close_count):
        # Base case: used all n pairs
        if len(current) == 2 * n:
            result.append(current)
            return

        # Can add opening if haven't used all n
        if open_count < n:
            backtrack(current + '(', open_count + 1, close_count)

        # Can add closing if it matches an opening
        if close_count < open_count:
            backtrack(current + ')', open_count, close_count + 1)

    backtrack('', 0, 0)
    return result
```

### Variation 4: Longest Valid Substring

**Problem:** Find length of longest valid substring

```python
def longest_valid(s):
    """
    Find length of longest valid parentheses substring

    Example:
      "(()" → 2 ("()")
      ")()())" → 4 ("()()")
      "((()))" → 6 (entire string)
    """
    stack = [-1]  # Base for valid substring calculation
    max_length = 0

    for i, char in enumerate(s):
        if char == '(':
            stack.append(i)
        else:
            stack.pop()
            if not stack:
                stack.append(i)  # New base
            else:
                # Calculate length from current base
                max_length = max(max_length, i - stack[-1])

    return max_length
```

---

## Interview Talking Points

### How to Explain the Solution (2-minute version)

> "This is a classic stack problem. The key insight is that when we see a closing bracket, it must match the most recent unmatched opening bracket - that's exactly what a stack gives us with its Last-In-First-Out behavior.
>
> I maintain a stack of opening brackets. When I see an opening bracket, I push it. When I see a closing bracket, I check if the stack is empty (invalid - nothing to close) and if the top matches this closing bracket (using a dictionary to map closing to opening brackets).
>
> At the end, the stack must be empty - if not, we have unclosed openings.
>
> This is O(n) time with a single pass through the string, and O(n) space for the stack in the worst case."

### Questions to Ask

Before coding:
1. "Should I return True/False or throw an exception?" → Return boolean
2. "Is the string guaranteed to only contain bracket characters?" → Yes (check constraints)
3. "Can the string be empty?" → Yes (empty string is valid)
4. "Do you want me to handle other bracket types like angle brackets <>?" → Usually no

### Common Follow-Ups

**Interviewer:** "Can you do it with O(1) space?"

**You:** "Not while maintaining O(n) time and handling all three bracket types. We need the stack to track which opening brackets are unmatched and their types. However, if we only had one type of bracket like '()', we could use a counter - increment for '(' and decrement for ')'. But that doesn't work for multiple types because we need to track the order and type of openings."

**Interviewer:** "What if brackets could be nested inside strings, like '(hello)'?"

**You:** "We'd need to add logic to skip non-bracket characters. We could modify the condition to `if char in '([{':` continue processing, otherwise skip the character. The algorithm remains the same."

**Interviewer:** "How would you extend this to generate all valid combinations?"

**You:** "That's a backtracking problem. We'd recursively build strings by adding opening brackets (if we haven't used all n) or closing brackets (if we have unmatched openings). It's related but a different problem."

---

## Practice Exercises

### Exercise 1: Code from Scratch
Close this walkthrough and implement the solution without looking. Aim for 5 minutes.

### Exercise 2: Edge Cases
Test your implementation with:
- `""` (empty string)
- `"("` (single opening)
- `")"` (single closing)
- `"()[]{}"` (all types valid)
- `"([)]"` (interleaved invalid)
- `"((()))"` (deeply nested valid)
- `"((("` (all openings)
- `")))"` (all closings)

### Exercise 3: Trace Through
On paper, trace through `"{[()]}"` step by step, showing the stack state after each character.

### Exercise 4: Variations
Implement the "minimum additions" variation. How does it differ from the original?

### Exercise 5: Explain the Pattern
When would you use a stack vs a queue vs a hash map? Give examples of problems for each.

---

## Summary

### Key Takeaways

1. **Stacks for matching problems**: When dealing with nested or paired structures, stacks naturally model the Last-In-First-Out behavior

2. **LIFO mirrors nesting**: The most recently opened must be the first to close - exactly how stacks work

3. **Check before accessing**: Always verify stack is not empty before accessing top element

4. **Final state matters**: After processing all elements, check that stack is empty (all matches completed)

5. **Dictionary for mappings**: Use dictionaries to cleanly map closing → opening brackets

### Complexity Reference

| Operation | Time | Space |
|-----------|------|-------|
| Push to stack | O(1) | - |
| Pop from stack | O(1) | - |
| Check top | O(1) | - |
| Overall | O(n) | O(n) |

### Mental Model

Think of the stack as a "waiting room" for opening brackets. Each opening bracket enters and waits for its matching closing bracket. When a closing bracket arrives, it must match the most recent opening in the waiting room (top of stack). If all goes well, the waiting room is empty at the end.

### Pattern Recognition

Use a stack when you see:
- Matching pairs (brackets, tags, etc.)
- Nested structures
- "Most recent unmatched" requirements
- LIFO processing needs
- Backtracking or undo operations

### Next Steps

1. Solve M022 (Generate Parentheses) for backtracking practice
2. Solve M032 (Longest Valid Parentheses) for advanced stack usage
3. Study other stack problems (expression evaluation, next greater element)
4. Practice explaining why stack is the right choice

---

**Remember:** The stack pattern appears everywhere - from compiler design to browser history to undo/redo functionality. Mastering this problem gives you a fundamental tool that applies far beyond bracket matching.
