---
id: H006
old_id: F032
slug: longest-valid-parentheses
title: Longest Valid Parentheses
difficulty: hard
category: hard
topics: ["string", "stack", "dynamic-programming"]
patterns: ["stack-based-tracking", "dynamic-programming"]
estimated_time_minutes: 45
frequency: high
related_problems: ["E020", "M022", "M032"]
prerequisites: ["stack-basics", "string-traversal", "dynamic-programming-basics"]
strategy_ref: ../strategies/data-structures/stacks-and-queues.md
---

# Longest Valid Parentheses

## Problem

Given a string containing only `'('` and `')'` characters, find the length of the longest valid (well-formed) parentheses substring.

A valid parentheses string has every opening parenthesis matched with a closing parenthesis in the correct order.

```
Visualization:
s = "(()"
     └┬┘
Valid substring = "()" with length 2

s = ")()())"
     └┬┬┬┘
Valid substring = "()()" with length 4

Key insight: We need to track positions and relationships,
not just count parentheses!
```

## Why This Matters

This problem is a classic "Hard" interview question because it combines multiple challenging aspects:
- **Multiple valid approaches**: Stack, DP, and two-pass scanning all work
- **Subtle edge cases**: Nested vs sequential parentheses, leading/trailing invalid chars
- **Tracking vs counting distinction**: Must track positions, not just balance

**Real-world applications:**
- **Syntax validation**: Code editors validating bracket/parenthesis matching
- **Expression parsing**: Compilers identifying valid expression boundaries
- **Data validation**: Detecting malformed structured data (JSON, XML)
- **String cleanup**: Finding valid segments in partially corrupted input

Unlike simple parenthesis validation (which only needs a counter), this requires understanding **where** valid substrings occur.

## Examples

**Example 1:**
- Input: `s = "(()"`
- Output: `2`
- Explanation: The longest valid parentheses substring is `"()"` at positions 1-2.

**Example 2:**
- Input: `s = ")()())"`
- Output: `4`
- Explanation: The longest valid parentheses substring is `"()()"` at positions 1-4.

**Example 3:**
- Input: `s = ""`
- Output: `0`
- Explanation: Empty string has no valid parentheses.

**Example 4:**
- Input: `s = "()(())"`
- Output: `6`
- Explanation: The entire string is valid: nested and sequential combined.

**Example 5:**
- Input: `s = "(()("`
- Output: `2`
- Explanation: Only `"()"` at positions 1-2 is valid.

## Constraints

- 0 <= s.length <= 3 * 10⁴
- s[i] is '(' or ')'.

## Think About

1. Why can't we just count opening and closing parentheses?
2. How do stacks naturally represent nested structures?
3. What does a DP state represent for this problem?
4. Can you solve it without extra space (beyond the input)?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Understanding the problem deeply</summary>

Let's explore what makes this hard with Socratic questions:

**Q1: Why is this different from "Valid Parentheses"?**
- Valid Parentheses: "Is the entire string valid?" (binary yes/no)
- This problem: "What's the longest valid substring?" (requires tracking positions)

**Q2: What breaks a valid sequence?**
```
"(()"  →  First '(' has no match
"())"  →  Last ')' has no match
"()("  →  Last '(' has no match

Pattern: An unmatched character "resets" the valid sequence
```

**Q3: Can valid substrings overlap?**
No! If we find "()" at positions 2-3, we can't also count those positions in another substring.

**Q4: How do we handle nested parentheses?**
```
"(())"  →  The inner "()" is part of a larger valid string
           We need to track the START of the valid sequence, not just matches
```

**Key insight:** We need to track either:
1. **Indices** of unmatched characters (Stack approach)
2. **Lengths** ending at each position (DP approach)
3. **Boundaries** of valid regions (Two-pass approach)

</details>

<details>
<summary>🎯 Hint 2: Three different approaches</summary>

### Approach 1: Stack (Most Intuitive)

Store **indices** of unmatched characters:
- Push index of `'('` onto stack
- On `')'`: if stack empty, it's unmatched (boundary); else pop and calculate length
- Use a **base index** to handle edge cases

```
Example: s = "(()"
Index:        0 1 2

Step 1: '(' at 0 → push(0)       stack: [0]
Step 2: '(' at 1 → push(1)       stack: [0, 1]
Step 3: ')' at 2 → pop(1)        stack: [0]
        Length = 2 - 0 = 2

Stack holds the START of the current valid sequence!
```

**Trick:** Initialize stack with `-1` as a base index to handle edge cases.

### Approach 2: Dynamic Programming

Define `dp[i]` = length of longest valid substring **ending at index i**

**Recurrence:**
```
If s[i] = '(':
    dp[i] = 0  (can't end with opening paren)

If s[i] = ')':
    If s[i-1] = '(':  # Immediate pair "()"
        dp[i] = dp[i-2] + 2

    If s[i-1] = ')':  # Nested case "))"
        j = i - dp[i-1] - 1  # Find matching position
        If s[j] = '(':
            dp[i] = dp[i-1] + 2 + dp[j-1]
                    └─────┘   │   └──────┘
                    inner     pair  before
```

### Approach 3: Two-pass scanning (O(1) space)

Scan left-to-right counting `(` and `)`:
- When `left == right`, update max length
- When `right > left`, reset counters

Then scan right-to-left (handles cases where left-to-right missed).

```
s = ")()())"
L→R: Skips leading ')', finds 4
R→L: Confirms 4
```

**Why two passes?** `"(()"` → left-to-right never has `left == right`

</details>

<details>
<summary>📝 Hint 3: Detailed pseudocode (Stack approach)</summary>

```
function longestValidParentheses(s):
    stack = [-1]  // Base index
    maxLen = 0

    for i from 0 to s.length - 1:
        if s[i] == '(':
            stack.push(i)  // Store index of unmatched '('
        else:  // s[i] == ')'
            stack.pop()  // Match with previous '('

            if stack.isEmpty():
                // No matching '(', this ')' is a boundary
                stack.push(i)
            else:
                // Calculate length from current valid sequence start
                currentLen = i - stack.peek()
                maxLen = max(maxLen, currentLen)

    return maxLen
```

**State transitions:**
```
s = ")()())"
     0123456

i=0: ')' → pop(-1), stack empty → push(0)     stack: [0]       maxLen: 0
i=1: '(' → push(1)                            stack: [0,1]     maxLen: 0
i=2: ')' → pop(1) → len = 2-0 = 2            stack: [0]       maxLen: 2
i=3: '(' → push(3)                            stack: [0,3]     maxLen: 2
i=4: ')' → pop(3) → len = 4-0 = 4            stack: [0]       maxLen: 4
i=5: ')' → pop(0), empty → push(5)           stack: [5]       maxLen: 4

Result: 4
```

**Why it works:**
- Stack top always points to the start of the current potentially valid sequence
- When we match a pair, we calculate length from that start
- When we can't match, we update the start (boundary)

</details>

---

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| **Stack-based** | **O(n)** | **O(n)** | One pass, worst-case stack size = n |
| Dynamic Programming | O(n) | O(n) | DP array of size n |
| Two-pass scanning | O(n) | O(1) | Two passes, just counters |
| Brute force (all substrings) | O(n³) | O(1) | Check each substring's validity |

**Comparison:**
- **Stack**: Most intuitive, easy to trace, good for interviews
- **DP**: Elegant recurrence, good if DP is your strength
- **Two-pass**: Best space complexity, trickier to get right
- All optimal approaches are O(n) time

---

## Common Mistakes

### 1. Forgetting the base index in stack
```python
# WRONG: Stack can become empty, causing errors
stack = []
for i, char in enumerate(s):
    if char == ')' and stack:
        stack.pop()
        # What if stack is now empty? i - stack[-1] crashes!

# CORRECT: Initialize with base
stack = [-1]
# Now stack.peek() always works
```

### 2. Confusing "valid" with "balanced"
```python
# WRONG: Just counting doesn't work
left = right = 0
for char in s:
    if char == '(': left += 1
    else: right += 1
if left == right: return len(s)  # Wrong!

# Input: ")()(" → left=2, right=2, but longest valid is 2, not 4
```

### 3. DP recurrence off-by-one errors
```python
# WRONG: Not checking bounds
if s[i] == ')' and s[i-1] == ')':
    j = i - dp[i-1] - 1
    if s[j] == '(':  # What if j < 0?
        dp[i] = dp[i-1] + 2 + dp[j-1]  # What if j-1 < 0?

# CORRECT: Check bounds
if s[i] == ')' and s[i-1] == ')':
    j = i - dp[i-1] - 1
    if j >= 0 and s[j] == '(':
        dp[i] = dp[i-1] + 2
        if j > 0:
            dp[i] += dp[j-1]
```

### 4. Two-pass: Forgetting to reset
```python
# WRONG: Not resetting when right > left
left = right = 0
for char in s:
    if char == '(': left += 1
    else: right += 1
    if left == right:
        maxLen = max(maxLen, 2 * right)
# Missing: if right > left: left = right = 0

# Input: "(()" → left never equals right, returns 0 (wrong!)
```

### 5. Not doing the second pass (two-pass approach)
```python
# WRONG: Only scanning left-to-right
left = right = maxLen = 0
for char in s:
    # ... scan left to right
return maxLen

# Input: "(()" → Never finds the valid "()", returns 0

# CORRECT: Must scan both directions
# Left-to-right catches cases where ')' is excess
# Right-to-left catches cases where '(' is excess
```

---

## Visual Walkthrough

### Example: s = ")()())"

```
Step-by-step with Stack approach:

Initial: stack = [-1], maxLen = 0

Index 0: char = ')'
┌────────────────────────────────┐
│ Action: pop() → removes -1     │
│ Stack empty? YES               │
│ → Push 0 (boundary marker)     │
│ stack = [0]                    │
│ maxLen = 0                     │
└────────────────────────────────┘

Index 1: char = '('
┌────────────────────────────────┐
│ Action: push(1)                │
│ stack = [0, 1]                 │
│ maxLen = 0                     │
└────────────────────────────────┘

Index 2: char = ')'
┌────────────────────────────────┐
│ Action: pop() → removes 1      │
│ Stack empty? NO                │
│ Length = 2 - stack.top()       │
│        = 2 - 0 = 2            │
│ stack = [0]                    │
│ maxLen = 2        ◄── UPDATE   │
└────────────────────────────────┘
    ) ( )
    0 1 2
      └─┘  Valid substring length 2

Index 3: char = '('
┌────────────────────────────────┐
│ Action: push(3)                │
│ stack = [0, 3]                 │
│ maxLen = 2                     │
└────────────────────────────────┘

Index 4: char = ')'
┌────────────────────────────────┐
│ Action: pop() → removes 3      │
│ Stack empty? NO                │
│ Length = 4 - stack.top()       │
│        = 4 - 0 = 4            │
│ stack = [0]                    │
│ maxLen = 4        ◄── UPDATE   │
└────────────────────────────────┘
    ) ( ) ( )
    0 1 2 3 4
      └─────┘  Valid substring length 4

Index 5: char = ')'
┌────────────────────────────────┐
│ Action: pop() → removes 0      │
│ Stack empty? YES               │
│ → Push 5 (new boundary)        │
│ stack = [5]                    │
│ maxLen = 4                     │
└────────────────────────────────┘

Final answer: 4
```

### DP Visualization for s = "(())"

```
Index:   0   1   2   3
Char:    (   (   )   )
dp:      0   0   2   4

Step 1: dp[0] = 0  ('(' can't end valid string)
Step 2: dp[1] = 0  ('(' can't end valid string)

Step 3: dp[2] - char is ')', s[1] is '('
        → Immediate pair "()"
        dp[2] = dp[0] + 2 = 0 + 2 = 2

        ( ( )
        0 1 2
          └─┘ Length 2

Step 4: dp[3] - char is ')', s[2] is ')'
        → Nested case
        j = 3 - dp[2] - 1 = 3 - 2 - 1 = 0
        s[0] = '(' (matches!)
        dp[3] = dp[2] + 2 + dp[j-1]
              = 2 + 2 + 0 = 4

        ( ( ) )
        0 1 2 3
        └─────┘ Length 4

Result: max(dp) = 4
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Longest valid brackets** | `'['` and `']'` instead | Same algorithms, different characters |
| **Multiple bracket types** | `()`, `[]`, `{}` mixed | Stack needs to track type, not just count |
| **Return the substring** | Return string, not length | Track start/end indices alongside length |
| **Count valid substrings** | Count all valid substrings | DP adds counts instead of lengths |
| **Minimum removals** | Remove chars to make valid | Track unmatched positions, count them |
| **With wildcards** | `'*'` can be `'('` or `')'` or empty | Add state for wildcard choices (much harder) |

---

## Practice Checklist

**Correctness:**
- [ ] Handles empty string
- [ ] Handles all opening: `"((("` → 0
- [ ] Handles all closing: `")))"` → 0
- [ ] Handles leading invalid: `")()"`
- [ ] Handles trailing invalid: `"()("`
- [ ] Handles nested: `"(())"`
- [ ] Handles sequential: `"()()"`
- [ ] Handles mixed: `"()(())"`

**Algorithm Understanding:**
- [ ] Can explain why stack holds indices, not characters
- [ ] Can trace DP recurrence for nested case
- [ ] Understands why two-pass needs both directions
- [ ] Can explain the difference between this and "Valid Parentheses"

**Implementation:**
- [ ] Stack: Can code without looking (15 min)
- [ ] DP: Can code without looking (20 min)
- [ ] Two-pass: Can code without looking (15 min)
- [ ] Can choose best approach based on constraints

**Interview Readiness:**
- [ ] Can explain all 3 approaches in 5 minutes
- [ ] Can code preferred approach in 15 minutes
- [ ] Can discuss trade-offs (space vs simplicity)
- [ ] Can handle follow-up variations

**Spaced Repetition Tracker:**
- [ ] Day 1: Study all approaches, understand stack deeply
- [ ] Day 3: Implement stack approach from scratch
- [ ] Day 7: Implement DP approach from scratch
- [ ] Day 14: Implement two-pass approach
- [ ] Day 30: Speed run all 3 approaches (< 20 min total)

---

**Strategy**: See [Stack-Based Tracking](../../strategies/data-structures/stacks-and-queues.md) | [Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
