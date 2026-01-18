---
id: M356
old_id: A189
slug: remove-comments
title: Remove Comments
difficulty: medium
category: medium
topics: ["array", "string", "parsing"]
patterns: ["state-machine", "string-parsing"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E020", "M071", "M385"]
prerequisites: ["string-manipulation", "state-machines"]
---
# Remove Comments

## Problem

Implement a comment remover for C++ source code. Given an array of strings `source` where each string represents one line of code (think of it as splitting code on newline characters), remove all comments and return the cleaned code in the same line-by-line format.

C++ has two types of comments you need to handle:

**Line comments** start with `//` and extend to the end of the current line. Everything after `//` on that line is ignored. For example, `int x = 5; // initialize x` becomes just `int x = 5;` after removal.

**Block comments** start with `/*` and continue until the matching `*/` is found, even across multiple lines. All content between these delimiters is ignored. An important edge case: `"/*//"` starts a block comment (the `/*` takes precedence), and it won't close until a later `*/` appears, because the `//` inside the block comment is just treated as regular comment text, not as a line comment.

The tricky part is the interaction between these comment types and their precedence. Once you're inside a block comment, any `//` you encounter is just part of the comment text, not a new line comment. Similarly, a `/*` inside an existing block comment doesn't start a nested comment—it's just text waiting for the first `*/` to close the block.

After removing comments, some lines may become completely empty. These should be omitted from the output. Additionally, block comments can consume newlines: if a block comment starts on one line and ends on another, the code before and after the comment should be joined together. For instance, `["a/*comment", "line", "more*/b"]` becomes `["ab"]`—a single line with the block comment (including newlines) removed.

You're guaranteed that the input won't contain string literals with quotes (which would complicate comment detection), and all block comments are properly closed (no unclosed `/*`).

## Why This Matters

This problem teaches state machine design and parsing techniques fundamental to building compilers, linters, and code formatters. Real preprocessors like the C preprocessor and tools like JSMin (JavaScript minifier) perform exactly this task. The skill of tracking parser state—knowing whether you're "inside a comment" or "in normal code"—transfers directly to building lexers for programming languages, HTML/XML parsers, and even regular expression engines. This is also a gentle introduction to how syntax highlighters work in code editors, distinguishing code from comments in real-time.

## Examples

**Example 1:**
- Input: `source = ["/*Test program */", "int main()", "{ ", "  // variable declaration ", "int a, b, c;", "/* This is a test", "   multiline  ", "   comment for ", "   testing */", "a = b + c;", "}"]`
- Output: `["int main()","{ ","  ","int a, b, c;","a = b + c;","}"]`
- Explanation: Original source visualization:
/*Test program */
int main()
{
  // variable declaration
int a, b, c;
/* This is a test
   multiline
   comment for
   testing */
a = b + c;
}
Line 1 and lines 6-9 form block comments (/* ... */). Line 4 contains a line comment (//).
After comment removal:
int main()
{

int a, b, c;
a = b + c;
}

**Example 2:**
- Input: `source = ["a/*comment", "line", "more_comment*/b"]`
- Output: `["ab"]`
- Explanation: Original represents "a/*comment\nline\nmore_comment*/b". The block comment consumes the newlines, leaving just "ab" which becomes ["ab"].

## Constraints

- 1 <= source.length <= 100
- 0 <= source[i].length <= 80
- source[i] consists of printable **ASCII** characters.
- Every open block comment is eventually closed.
- There are no single-quote or double-quote in the input.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: State Machine Thinking</summary>

This is a classic **state machine** problem. At any point while parsing, you're in one of two states:
1. **Normal mode**: Not inside a comment
2. **Block comment mode**: Inside a /* ... */ comment

The key is tracking which state you're in and how to transition between states:
- Normal -> Block comment: when you see `/*`
- Block comment -> Normal: when you see `*/`
- Line comments in normal mode: ignore rest of line (but don't change state for next line)

As you process each character, your action depends on:
- Current state
- Current character and next character (for two-character sequences like `//`, `/*`, `*/`)
</details>

<details>
<summary>Hint 2: Character-by-Character Processing</summary>

Algorithm:
1. Initialize `in_block = False` (not in block comment)
2. Initialize `current_line = ""` (accumulates non-comment characters)
3. Initialize `result = []` (final output)
4. For each line in source:
   - For each position i in line:
     - Check for two-character sequences first (i and i+1)
     - If in normal mode:
       - If see `/*`: enter block mode, skip 2 chars
       - If see `//`: ignore rest of line, break
       - Else: append char to current_line
     - If in block mode:
       - If see `*/`: exit block mode, skip 2 chars
       - Else: skip char (it's a comment)
   - After each line: if not in block mode and current_line is non-empty, add to result and reset
5. Return result

Edge case: Block comments can span lines, so `in_block` persists across line boundaries.
</details>

<details>
<summary>Hint 3: Implementation Details</summary>

Key implementation points:

1. **Two-character lookahead**: When at position i, check if `line[i:i+2]` matches `//`, `/*`, or `*/` before processing single character

2. **Index management**: When you match a 2-char sequence, increment i by 2 (not 1). Use a while loop instead of for loop for better control:
   ```python
   i = 0
   while i < len(line):
       # check 2-char sequences
       # increment i by 1 or 2 as needed
   ```

3. **Empty line handling**: Only add current_line to result if it's non-empty and we're not in a block comment

4. **Newline handling in blocks**: When in block comment mode, don't add newlines - just continue to next line (this handles Example 2 where `ab` comes from multiple lines)

Time: O(n) where n is total characters
Space: O(n) for output
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Regex-based | O(n) | O(n) | Complex regex, hard to handle all edge cases |
| State Machine | O(n) | O(n) | Process each character once with state tracking |
| Optimal | O(n) | O(n) | Linear pass through all characters |

## Common Mistakes

**Mistake 1: Not handling block comments across lines**
```python
# Wrong - resets block comment state for each line
def removeComments(source):
    result = []
    for line in source:
        in_block = False  # Wrong: should persist across lines!
        current = ""
        i = 0
        while i < len(line):
            if not in_block and i + 1 < len(line) and line[i:i+2] == '/*':
                in_block = True
                i += 2
            elif in_block and i + 1 < len(line) and line[i:i+2] == '*/':
                in_block = False
                i += 2
            # ... rest of logic
        if current:
            result.append(current)
    return result
    # Fails on Example 2: each line processed independently
```

**Mistake 2: Not accumulating lines during block comment**
```python
# Wrong - adds partial lines even when in block comment
def removeComments(source):
    result = []
    in_block = False
    current = ""

    for line in source:
        i = 0
        while i < len(line):
            # ... (processing logic)
            pass
        # Wrong: adds line even if in_block is True
        if current:
            result.append(current)
            current = ""  # Resets current!

    return result
    # Should only append when exiting block or in normal mode
```

**Mistake 3: Incorrect index increment**
```python
# Wrong - doesn't skip 2 characters for 2-char sequences
def removeComments(source):
    result = []
    in_block = False
    current = ""

    for line in source:
        for i in range(len(line)):  # Using for loop - can't skip chars
            if not in_block and i + 1 < len(line) and line[i:i+2] == '/*':
                in_block = True
                # Can't increment i here in for loop!
            elif not in_block and i + 1 < len(line) and line[i:i+2] == '//':
                break
            # ...
    # Need while loop with manual increment, not for loop
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Basic Calculator | Medium | Parse and evaluate expressions with parentheses |
| Decode String | Medium | Parse nested encoded strings |
| Parse Lisp Expression | Hard | More complex parsing with nested structures |
| Mini Parser | Medium | Parse nested integer lists |
| Tag Validator | Hard | Validate HTML-like tags with complex rules |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Reviewed solution
- [ ] Practiced again (1 day later)
- [ ] Practiced again (3 days later)
- [ ] Practiced again (1 week later)
- [ ] Can solve in under 30 minutes
- [ ] Can explain solution clearly
- [ ] Implemented state machine correctly
- [ ] Handled multi-line block comments
- [ ] Tested edge cases (block comment spanning all lines, empty result)

**Strategy**: See [String Parsing Patterns](../strategies/patterns/string-parsing.md)
