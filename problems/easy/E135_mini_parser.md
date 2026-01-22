---
id: E135
old_id: I184
slug: mini-parser
title: Mini Parser
difficulty: easy
category: easy
topics: ["string", "stack", "recursion", "parsing"]
patterns: ["stack", "recursion"]
estimated_time_minutes: 15
frequency: low
related_problems: ["M394", "E020", "M227"]
prerequisites: ["stack", "recursion", "string-parsing"]
strategy_ref: ../prerequisites/stack.md
---
# Mini Parser

## Problem

You're given a string `s` representing a serialized nested list structure, and you need to build a parser that deserializes it into a `NestedInteger` object. A NestedInteger can hold either a single integer value or a list of NestedInteger objects, which themselves can contain integers or more nested lists at any depth.

The input format uses square brackets to denote lists and commas to separate elements. For example, "324" represents a single integer, while "[123,[456,[789]]]" represents a list containing an integer 123 and another list, which itself contains 456 and a deeply nested list with 789.

Your parser must handle several cases. A simple integer like "324" becomes a NestedInteger holding that value. Nested lists require tracking the current nesting level so you know which list to add elements to as you parse character by character. Numbers can be negative (indicated by a '-' sign) and multi-digit. Empty lists are valid. The string format is guaranteed to be valid, so you don't need to handle malformed input.

The challenge lies in correctly managing nested structures. When you encounter an opening bracket '[', you're starting a new list level. When you hit a closing bracket ']', you're completing the current level and need to add it to its parent. A stack naturally models this push/pop behavior as you traverse the string.

## Why This Matters

String parsing is fundamental to working with serialized data formats. This problem teaches you the stack-based parsing pattern used in JSON parsers, XML/HTML processors, mathematical expression evaluators, and programming language compilers. Understanding how to incrementally build nested structures character-by-character is essential for implementing configuration file readers, network protocol decoders, and data serialization libraries. The decision between iterative stack-based parsing and recursive descent parsing is a practical tradeoff you'll encounter in many real-world parsers. This problem also reinforces careful state management (tracking position in the string, accumulating multi-digit numbers, handling special characters) which is critical in any text processing pipeline.

## Examples

**Example 1:**
- Input: `s = "324"`
- Output: `324`
- Explanation: The output is a NestedInteger object representing a single integer value of 324.

**Example 2:**
- Input: `s = "[123,[456,[789]]]"`
- Output: `[123,[456,[789]]]`
- Explanation: The output is a NestedInteger object with a nested list structure containing:
1. The integer 123.
2. A nested list with two items:
    i.  The integer 456.
    ii. A further nested list containing:
         a. The integer 789

## Constraints

- 1 <= s.length <= 5 * 10⁴
- s consists of digits, square brackets "[]", negative sign '-', and commas ','.
- s is the serialization of valid NestedInteger.
- All the values in the input are in the range [-10⁶, 10⁶].

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

### Beginner Approach - Character-by-Character with Stack
Process the string one character at a time, using a stack to track nested structures.

**Key Steps:**
1. If digit or '-', parse the complete number
2. On '[', create new NestedInteger and push to stack
3. On ']', pop from stack and add to parent
4. On ',', continue to next element
5. Handle single integer case (no brackets)

**When to use:** Standard approach for parsing nested structures - O(n) time.

### Intermediate Approach - Recursive Descent Parser
Use recursion to naturally handle nested structure without explicit stack.

**Key Steps:**
1. Track current position in string
2. Parse integer or list based on current character
3. For lists, recursively parse elements
4. Return when closing bracket found
5. Advance position pointer after each parse

**When to use:** When you prefer recursive thinking over iterative stack management.

### Advanced Approach - Two-Stack Method
Use separate stacks for values and structural elements for clearer separation.

**Key Steps:**
1. One stack for NestedInteger objects
2. Another for tracking depth/context
3. Build nested structure incrementally
4. Combine stacks' information for final result

**When to use:** When you want explicit control over structural vs. data elements.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Stack-based | O(n) | O(n) | n = string length; stack depth = nesting level |
| Recursive | O(n) | O(n) | Call stack for recursion + result structure |
| Two-stack | O(n) | O(n) | Similar to single stack, more bookkeeping |

## Common Mistakes

### Mistake 1: Not handling negative numbers
```python
# Wrong - only parsing positive integers
def deserialize(s):
    if s[0] != '[':
        return NestedInteger(int(s))  # Works for positive
    # But what about "-123"?
```

**Why it's wrong:** The problem includes negative numbers (range [-10⁶, 10⁶]). Only checking for digits misses the '-' sign.

**Fix:** When parsing a number, check for '-' sign first, then accumulate digits. Use isdigit() or check for both '-' and digits.

### Mistake 2: Incorrect number parsing in context
```python
# Wrong - not handling multi-digit numbers correctly
for char in s:
    if char.isdigit():
        num = int(char)  # Wrong: only gets single digit
        current.add(NestedInteger(num))
```

**Why it's wrong:** Numbers can be multi-digit (e.g., "123"). Processing one character at a time creates separate single-digit integers.

**Fix:** When you encounter a digit (or '-'), continue reading until you hit a non-digit character to get the complete number.

### Mistake 3: Stack management errors
```python
# Wrong - not properly linking nested structures
def deserialize(s):
    stack = []
    for char in s:
        if char == '[':
            stack.append(NestedInteger())
        elif char == ']':
            ni = stack.pop()
            # Missing: add ni to parent if stack not empty
    return stack[0]  # Might be wrong if not properly nested
```

**Why it's wrong:** When popping a NestedInteger on ']', you need to add it to its parent (the next item on stack) before fully processing.

**Fix:** After popping on ']', if stack is not empty, add the popped item to stack[-1] (the parent).

## Variations

| Variation | Difficulty | Description | Key Difference |
|-----------|-----------|-------------|----------------|
| Decode String | Medium | Decode k[encoded_string] format | Different nesting semantics |
| Parse Expression | Medium | Parse mathematical expressions | Operator precedence handling |
| Serialize/Deserialize Tree | Hard | Convert tree to/from string | Tree structure vs. nested lists |
| JSON Parser | Hard | Full JSON parsing | More complex grammar |

## Practice Checklist

Track your progress and spaced repetition:

- [ ] Initial attempt (after reading problem)
- [ ] Reviewed approach hints
- [ ] Implemented stack-based solution
- [ ] Handled single integer case
- [ ] Handled negative numbers correctly
- [ ] Handled nested structures correctly
- [ ] All test cases passing
- [ ] Reviewed common mistakes
- [ ] Revisit after 1 day
- [ ] Revisit after 3 days
- [ ] Revisit after 1 week
- [ ] Can explain parsing strategy clearly

**Strategy Guide:** For pattern recognition and detailed techniques, see [Stack Pattern](../prerequisites/stack.md)
