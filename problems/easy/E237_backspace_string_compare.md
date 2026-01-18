---
id: E237
old_id: A311
slug: backspace-string-compare
title: Backspace String Compare
difficulty: easy
category: easy
topics: ["string", "two-pointers", "stack"]
patterns: ["two-pointers", "stack-simulation"]
estimated_time_minutes: 15
frequency: high
prerequisites: ["string-traversal", "stack-basics"]
related_problems: ["E020", "E155", "M032"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Backspace String Compare

## Problem

You are given two strings, `s` and `t`, which represent sequences of characters that were typed into a text editor. The special character `'#'` represents a backspace operation, meaning it deletes the previous character (if one exists). Your task is to determine whether the two strings result in the same final text after processing all the backspace operations.

Think of it like typing on a keyboard where the backspace key is represented by `'#'`. When you encounter a regular letter, it gets added to your text. When you encounter `'#'`, the last character gets removed from your text (unless the text is already empty, in which case the backspace does nothing). For example, the string `"ab#c"` would produce the text `"ac"` because you type 'a', then 'b', then backspace (removing 'b'), then 'c'.

The straightforward approach is to process each string character by character, simulating the text editor behavior. A stack data structure naturally fits this problem: push regular characters onto the stack, and pop when you encounter a backspace. After processing both strings, you can compare the final stacks to see if they're equal. This approach is intuitive and easy to implement, but it requires extra space proportional to the string length.

However, there's a clever optimization that lets you solve this problem using constant extra space. The key insight is to process the strings from right to left instead of left to right. When reading backward, if you encounter a `'#'`, you know you need to skip the next valid character you'll find. By maintaining a count of backspaces as you traverse backward, you can determine which characters are actually part of the final text without building the strings explicitly.

This backward traversal technique allows you to compare the strings character by character without constructing intermediate results, achieving O(1) space complexity while maintaining O(n) time complexity.

## Why This Matters

Text processing with state transformations is a fundamental pattern in software engineering. This exact problem models the behavior of text editors, terminal input processing, and command-line interfaces where backspace characters need to be interpreted. Understanding how to handle character sequences with deletion operations prepares you for problems in string parsing, input validation, and text manipulation.

The two distinct approaches to this problem demonstrate an important space-time tradeoff. The stack-based solution is more intuitive and easier to implement, making it suitable for production code where clarity matters. The two-pointer backward traversal is a classic example of algorithmic optimization, showing how careful analysis can eliminate auxiliary space usage. This pattern of "simulate straightforwardly with extra space" versus "process cleverly without extra space" appears across many algorithm problems.

The backward traversal technique itself is a valuable tool in your algorithmic toolkit. Similar patterns appear in problems involving parentheses matching, string reversal with constraints, and any scenario where you need to process elements with contextual dependencies. The ability to reverse your perspective on a problem (literally, in this case) often reveals simpler solutions.

From a systems programming perspective, this problem touches on buffer management and undo/redo functionality. Version control systems use similar concepts when computing diffs between file versions, where insertions and deletions need to be tracked and compared efficiently.

## Examples

**Example 1:**
- Input: `s = "ab#c", t = "ad#c"`
- Output: `true`
- Explanation: After processing backspaces, both strings result in "ac".

**Example 2:**
- Input: `s = "ab##", t = "c#d#"`
- Output: `true`
- Explanation: After processing backspaces, both strings result in empty text.

**Example 3:**
- Input: `s = "a#c", t = "b"`
- Output: `false`
- Explanation: String s produces "c" after processing, while string t remains "b".

## Constraints

- 1 <= s.length, t.length <= 200
- s and t only contain lowercase letters and '#' characters.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1 - Conceptual Foundation
Think about how a text editor processes backspaces. Each regular character adds to the result, while each backspace removes the last character (if one exists). What data structure naturally supports adding and removing from one end?

### Hint 2 - Space-Optimized Approach
While a stack-based solution works well, can you process the strings without extra space? Consider reading the strings from right to left. When you encounter a '#', how many regular characters should you skip?

### Hint 3 - Implementation Strategy
Use two pointers to traverse both strings backward simultaneously. Maintain a counter for the number of backspaces encountered. When you find a regular character, compare them only if both counters are zero. Handle the case where strings have different numbers of backspaces carefully.

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Stack-Based | O(n + m) | O(n + m) | Build processed strings using stacks |
| Two Pointers (Backward) | O(n + m) | O(1) | Process strings in-place from right to left |
| Build and Compare | O(n + m) | O(n + m) | Construct final strings then compare |

## Common Mistakes

### Mistake 1: Forward Processing Without Stack
```python
# INCORRECT: Forward traversal doesn't handle backspaces properly
def process(s):
    result = ""
    for char in s:
        if char == '#':
            result = result[:-1]  # String slicing creates new string each time
        else:
            result += char
    return result
```
**Why it's wrong:** While this logic is correct, string slicing in Python creates new strings, leading to O(n²) time complexity in the worst case.

**Correct approach:**
```python
# CORRECT: Use a list (acts as stack) for O(n) time
def process(s):
    stack = []
    for char in s:
        if char == '#':
            if stack:  # Only pop if stack is not empty
                stack.pop()
        else:
            stack.append(char)
    return ''.join(stack)
```

### Mistake 2: Not Handling Multiple Consecutive Backspaces
```python
# INCORRECT: Only tracks one backspace at a time
def compare_backward(s, t):
    i, j = len(s) - 1, len(t) - 1
    while i >= 0 or j >= 0:
        if s[i] == '#':
            i -= 2  # Skip the # and one char - wrong for multiple #'s
        # ...
```
**Why it's wrong:** Multiple consecutive backspaces (like "ab###") require counting all backspaces before determining which character to process.

**Correct approach:**
```python
# CORRECT: Count all backspaces before processing
def get_next_valid_char_index(s, index):
    skip = 0
    while index >= 0:
        if s[index] == '#':
            skip += 1
            index -= 1
        elif skip > 0:
            skip -= 1
            index -= 1
        else:
            break
    return index
```

## Problem Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Multiple Backspace Types | Medium | Handle different deletion operations (delete word, delete line) |
| Undo/Redo Operations | Medium | Support undo and redo for text editing |
| Minimum Operations to Match | Medium | Find minimum edits to make strings match after backspaces |
| Stream Processing | Hard | Process backspace strings in a streaming fashion |
| Pattern Matching with Backspaces | Hard | Find if pattern exists in text with backspace operations |

## Practice Checklist

- [ ] First solve: Implement stack-based solution correctly
- [ ] Optimize: Solve with O(1) space using two pointers
- [ ] Handle edge cases: Empty strings, all backspaces, no backspaces
- [ ] Review after 1 day: Explain both approaches and trade-offs
- [ ] Review after 1 week: Implement two-pointer solution from scratch
- [ ] Interview ready: Discuss space optimization and follow-up variations

## Strategy

**Pattern**: Two Pointers / Stack Simulation
- Master backward traversal for context-dependent processing
- Learn when stack simulation can be replaced with counters
- Understand space-time tradeoffs in string processing

See [Two Pointers Pattern](../strategies/patterns/two-pointers.md) for the complete strategy guide.
