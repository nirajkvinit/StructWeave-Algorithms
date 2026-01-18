---
id: M173
old_id: I193
slug: decode-string
title: Decode String
difficulty: medium
category: medium
topics: ["stack", "string", "recursion"]
patterns: ["stack"]
estimated_time_minutes: 30
frequency: high
related_problems: ["E020", "M394", "M726"]
prerequisites: ["stack", "string-manipulation", "recursion"]
---
# Decode String

## Problem

Imagine you're working with a compressed text format where repetitive patterns are encoded using a special notation. The encoding scheme uses numbers followed by brackets to indicate repetition: `k[encoded_string]` means "repeat the content inside the brackets exactly `k` times," where `k` is a positive integer. For example, `3[a]` decodes to `aaa` because the letter 'a' is repeated 3 times. What makes this particularly interesting is that encodings can be nested inside one another, creating multiple layers of repetition.

Consider the input `3[a2[c]]`. To decode this, you need to work from the innermost brackets outward. First, `2[c]` becomes `cc`, so the expression becomes `3[acc]`. Then, repeating `acc` three times gives you the final result: `accaccacc`. You can also have multiple encoded segments in sequence, like `2[abc]3[cd]ef`, which decodes to `abcabccdcdcdef` (notice the literal `ef` at the end isn't repeated). The encoding is guaranteed to be well-formed: brackets are always properly matched, there's no extraneous whitespace, and digits only appear as repetition counts, never as part of the actual string content. Edge cases like `3a` or `2[4]` won't appear in valid inputs. The final decoded output is guaranteed to be no longer than 100,000 characters, so you don't need to worry about memory overflow.

Your task is to write a decoder that takes an encoded string and produces the fully expanded original string. Think carefully about how to handle the nested structure: when you encounter an opening bracket, you're entering a new context that must be fully resolved before you can continue with the outer context. This suggests a stack-based approach or recursion might be helpful.

## Why This Matters

String encoding and decoding is everywhere in modern software systems. When you download a compressed file, the decompression algorithm uses similar pattern-matching techniques to expand repeated sequences. Template engines in web frameworks expand nested placeholders like `{{user.profile.{{field}}}}`. Configuration management systems like Ansible and Terraform process nested variable substitutions. Markup languages like HTML and XML require parsing nested tags, and JSON parsers must handle arbitrarily nested objects and arrays. This problem teaches you to recognize and process nested structures using a stack, which is one of the most important patterns in computer science. The stack naturally handles the "context switching" required when you enter and exit nested levels, allowing you to build up the result incrementally. Understanding this pattern prepares you for parsing challenges in compilers, interpreters, calculators, and any system that processes hierarchical or recursive data structures. It's also a common interview question that tests whether you can identify the right data structure for the problem.

## Examples

**Example 1:**
- Input: `s = "3[a]2[bc]"`
- Output: `"aaabcbc"`
- Explanation: "a" repeated 3 times, then "bc" repeated 2 times.

**Example 2:**
- Input: `s = "3[a2[c]]"`
- Output: `"accaccacc"`
- Explanation: Inner pattern "c" repeated 2 times becomes "cc", then "acc" repeated 3 times.

**Example 3:**
- Input: `s = "2[abc]3[cd]ef"`
- Output: `"abcabccdcdcdef"`
- Explanation: "abc" twice, "cd" three times, followed by literal "ef".

## Constraints

- 1 <= s.length <= 30
- s consists of lowercase English letters, digits, and square brackets '[]'.
- s is guaranteed to be **a valid** input.
- All the integers in s are in the range [1, 300].

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Nested Structure Suggests Stack</summary>

The nested brackets `[` and `]` suggest a stack-based approach. Each time you encounter `[`, you're entering a new nested context that must be resolved before continuing with the outer context. Think about what information you need to save when entering a nested level.

</details>

<details>
<summary>🎯 Hint 2: What to Store in the Stack</summary>

You need to track two things when entering a nested level:
1. The string built so far (before the current bracket)
2. The repetition count for the current bracket

When you encounter `]`, pop from the stack, repeat the current string, and append it to the previous string.

</details>

<details>
<summary>📝 Hint 3: Character-by-Character Processing</summary>

Process the string character by character:
- If digit: build the number (could be multi-digit like "100")
- If `[`: push (current_string, current_number) to stack, reset both
- If `]`: pop from stack, repeat current_string, append to popped string
- If letter: append to current_string

This handles arbitrary nesting depth naturally.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Recursive | O(n) | O(n) | Call stack depth equals nesting level |
| **Stack-based** | **O(n)** | **O(n)** | Optimal: single pass with explicit stack |
| Regex replacement | O(n²) | O(n) | Multiple passes, inefficient for nested patterns |

## Common Mistakes

### Mistake 1: Not handling multi-digit numbers

```python
# Wrong: Only handles single-digit repetition counts
def decodeString(s):
    stack = []
    current_str = ""

    for char in s:
        if char.isdigit():
            # WRONG: Treats each digit separately
            stack.append((current_str, int(char)))
            current_str = ""
        elif char == '[':
            pass
        elif char == ']':
            prev_str, num = stack.pop()
            current_str = prev_str + current_str * num
        else:
            current_str += char

    return current_str

# Correct: Accumulate multi-digit numbers
def decodeString(s):
    stack = []
    current_num = 0
    current_str = ""

    for char in s:
        if char.isdigit():
            current_num = current_num * 10 + int(char)
        elif char == '[':
            stack.append((current_str, current_num))
            current_str = ""
            current_num = 0
        elif char == ']':
            prev_str, num = stack.pop()
            current_str = prev_str + current_str * num
        else:
            current_str += char

    return current_str
```

### Mistake 2: Incorrect stack operations

```python
# Wrong: Pushing and popping at wrong times
def decodeString(s):
    stack = []
    current_str = ""
    current_num = 0

    for char in s:
        if char.isdigit():
            current_num = current_num * 10 + int(char)
        elif char == '[':
            # WRONG: Not saving state before entering nested level
            stack.append(current_num)
        elif char == ']':
            num = stack.pop()
            # WRONG: Lost the previous string context
            current_str = current_str * num
        else:
            current_str += char

    return current_str

# Correct: Save both string and number
def decodeString(s):
    stack = []
    current_num = 0
    current_str = ""

    for char in s:
        if char.isdigit():
            current_num = current_num * 10 + int(char)
        elif char == '[':
            # Save both current string and number
            stack.append((current_str, current_num))
            current_str = ""
            current_num = 0
        elif char == ']':
            prev_str, num = stack.pop()
            current_str = prev_str + current_str * num
        else:
            current_str += char

    return current_str
```

### Mistake 3: String concatenation inefficiency

```python
# Wrong: Inefficient string building (works but slow)
def decodeString(s):
    stack = []
    current_num = 0
    current_str = ""

    for char in s:
        if char.isdigit():
            current_num = current_num * 10 + int(char)
        elif char == '[':
            stack.append((current_str, current_num))
            current_str = ""
            current_num = 0
        elif char == ']':
            prev_str, num = stack.pop()
            # WRONG: Repeated concatenation is O(n²)
            for _ in range(num):
                current_str = prev_str + current_str
        else:
            current_str += char

    return current_str

# Correct: Use string multiplication
def decodeString(s):
    stack = []
    current_num = 0
    current_str = ""

    for char in s:
        if char.isdigit():
            current_num = current_num * 10 + int(char)
        elif char == '[':
            stack.append((current_str, current_num))
            current_str = ""
            current_num = 0
        elif char == ']':
            prev_str, num = stack.pop()
            current_str = prev_str + current_str * num
        else:
            current_str += char

    return current_str
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Encode string | Given decoded string, produce encoded version | Medium |
| Nested depth | Find maximum nesting depth of brackets | Easy |
| Invalid encoding | Handle and report invalid bracket patterns | Medium |
| Multiple bracket types | Support (), [], {} with different meanings | Hard |
| Variable substitution | Replace variables like ${VAR} with values | Hard |

## Practice Checklist

- [ ] First attempt (solve independently)
- [ ] Implement stack-based solution
- [ ] Implement recursive solution
- [ ] Test with deeply nested examples
- [ ] Practice after 1 day
- [ ] Practice after 3 days
- [ ] Practice after 1 week

**Strategy**: See [Stack Patterns](../strategies/patterns/stack.md)
