---
id: E014
old_id: F020
slug: valid-parentheses
title: Valid Parentheses
difficulty: easy
category: easy
topics: ["string", "stack"]
patterns: ["stack-matching", "bracket-validation"]
estimated_time_minutes: 15
frequency: very-high
related_problems: ["M022", "M032", "H301"]
prerequisites: ["stack-basics", "string-basics"]
strategy_ref: ../prerequisites/stacks-and-queues.md
---
# Valid Parentheses

## Problem

Determine if a string of brackets is valid: every opening bracket has a matching closing bracket in correct order.

## Why This Matters

This problem teaches the **stack pattern** - one of the most fundamental data structures in computer science. The Last-In-First-Out (LIFO) behavior naturally models nested structures.

**Real-world applications:**
- **Compilers**: Syntax validation in programming languages (every IDE does this)
- **HTML/XML parsing**: Validating nested tags like `<div><p></p></div>`
- **Mathematical expressions**: Checking balanced equations in calculators
- **Code editors**: Auto-closing brackets and error detection
- **Network protocols**: Validating nested message structures

**Core concept**: When dealing with matching pairs in nested structures, stacks provide O(1) access to the most recent unmatched opening. This mirrors how nesting works - the most recent opening must be closed first.

## Examples

**Example 1:**
- Input: `s = "()"`
- Output: `true`

**Example 2:**
- Input: `s = "()[]{}"`
- Output: `true`

**Example 3:**
- Input: `s = "(]"`
- Output: `false`

## Constraints

- 1 <= s.length <= 10⁴
- s consists of parentheses only '()[]{}'.

## Think About

1. When you encounter a closing bracket, which opening bracket must it match with?
2. What data structure gives you access to the "most recent unmatched opening"?
3. What should happen if you see a closing bracket when no openings are unmatched?
4. If the string is valid, what should be the state of your data structure at the end?

---

## Approach Hints

<details>
<summary>💡 Hint 1: What makes a string invalid?</summary>

A string is **invalid** if any of these conditions occur:
1. A closing bracket appears with no corresponding opening (e.g., ")")
2. A closing bracket doesn't match the most recent opening (e.g., "(]")
3. An opening bracket is never closed (e.g., "(()")

**Think about:** In "({[]})", when you see ']', which bracket must it match? The most **recent** unmatched opening, which is '['.

What data structure lets you access the most recently added item?

</details>

<details>
<summary>🎯 Hint 2: The stack insight</summary>

Use a **stack** to track unmatched opening brackets:

- When you see an **opening** bracket: push it onto the stack
- When you see a **closing** bracket:
  - Check if stack is empty (invalid - nothing to close)
  - Check if top of stack matches (pop if yes, invalid if no)
- At the end: stack must be empty (all openings were closed)

**Why stack?** Its LIFO behavior perfectly models nesting:
```
Input: "({[]})"

Process '(': stack = ['(']
Process '{': stack = ['(', '{']
Process '[': stack = ['(', '{', '[']
Process ']': top is '[' ✓ match, pop → stack = ['(', '{']
Process '}': top is '{' ✓ match, pop → stack = ['(']
Process ')': top is '(' ✓ match, pop → stack = []

Stack empty ✓ valid!
```

</details>

<details>
<summary>📝 Hint 3: Stack matching algorithm</summary>

```
create empty stack
create mapping: ')' → '(', ']' → '[', '}' → '{'

for each character in string:
    if character is opening bracket ('(', '[', '{'):
        push character onto stack

    else:  # closing bracket
        if stack is empty:
            return False  # nothing to close

        if stack.top() == matching_opening[character]:
            pop from stack
        else:
            return False  # mismatch

if stack is empty:
    return True  # all openings were closed
else:
    return False  # unclosed openings remain
```

**Time**: O(n) - single pass through string
**Space**: O(n) - worst case stack size (all opening brackets)

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Counting (only one bracket type) | O(n) | O(1) | Simple counter works, but can't handle multiple types |
| Replace matching pairs | O(n²) | O(n) | Repeatedly remove "()", "[]", "{}" - inefficient |
| **Stack (Optimal)** | **O(n)** | **O(n)** | Single pass; handles all bracket types |

**Why Stack Wins:**
- Single pass through string (each character processed once)
- O(1) push/pop operations
- Space is at most n (if all characters are opening brackets)
- Naturally handles nested and interleaved brackets

---

## Common Mistakes

### 1. Using a counter instead of stack
```
# WRONG: Counter can't handle different bracket types
count = 0
for char in s:
    if char in '([{':
        count += 1
    else:
        count -= 1
    if count < 0:
        return False
return count == 0

# Problem: "([)]" would return True incorrectly!

# CORRECT: Use stack to track bracket types
stack = []
# ... (see Hint 3)
```

### 2. Not checking for empty stack before pop
```
# WRONG: Accessing empty stack causes error
if stack[-1] == matching[char]:  # Crashes if stack is empty!
    stack.pop()

# CORRECT: Check if stack is empty first
if not stack:
    return False
if stack[-1] == matching[char]:
    stack.pop()
```

### 3. Forgetting to check if stack is empty at end
```
# WRONG: Stack might still have unmatched openings
for char in s:
    # ... process characters
return True  # Always returns True if loop completes!

# CORRECT: Verify all openings were closed
return len(stack) == 0
```

### 4. Using wrong data structure
```
# WRONG: Queue (FIFO) doesn't match nesting behavior
from collections import deque
queue = deque()
# This will fail for nested structures

# CORRECT: Stack (LIFO) matches nesting
stack = []
```

### 5. Not handling edge cases
```
# WRONG: Assumes input is non-empty
stack = []
for char in s:  # Crashes if s is empty in some languages
    ...

# CORRECT: Handle edge cases
if not s:
    return True  # Empty string is valid
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Generate Parentheses (M022)** | Generate all valid combinations | Backtracking with validity check |
| **Longest Valid Parentheses (M032)** | Find longest valid substring | DP or stack with indices |
| **Remove Invalid Parentheses (H301)** | Remove minimum to make valid | BFS or backtracking |
| **Minimum Add to Make Valid** | Count additions needed | Track unmatched count |
| **Score of Parentheses** | Assign scores to nested pairs | Stack with score calculation |
| **Multiple bracket types** | More than 3 types | Same approach, extend mapping |

**Extension: Wildcard Matching**
```
# '*' can be '(', ')', or empty
s = "(*)"  # Valid: '*' becomes ')'
# Requires tracking possible states
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles Example 1: "()"
- [ ] Handles Example 2: "()[]{}"
- [ ] Handles Example 3: "(]" (mismatch)
- [ ] Handles empty string (valid)
- [ ] Handles single opening: "("
- [ ] Handles single closing: ")"
- [ ] Handles interleaved: "([)]" (invalid)
- [ ] Handles nested: "({[]})" (valid)

**Optimization:**
- [ ] Achieved O(n) time complexity
- [ ] O(n) space complexity
- [ ] Single pass implementation
- [ ] Early return on first invalid character

**Interview Readiness:**
- [ ] Can explain why stack is needed
- [ ] Can describe LIFO behavior and how it models nesting
- [ ] Can code solution in 5 minutes
- [ ] Can discuss follow-up variations
- [ ] Can identify when NOT to use stack (single bracket type)

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Implement "Generate Parentheses" variation
- [ ] Day 14: Explain stack behavior to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Stack Pattern](../../prerequisites/stacks-and-queues.md)
