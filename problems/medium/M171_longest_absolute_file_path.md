---
id: M171
old_id: I187
slug: longest-absolute-file-path
title: Longest Absolute File Path
difficulty: medium
category: medium
topics: ["string", "stack"]
patterns: ["stack"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M173", "E020", "M394"]
prerequisites: ["stack", "string-parsing"]
---
# Longest Absolute File Path

## Problem

Imagine you're working with a file system that's been serialized into a single string. This string encodes both the directory structure and files using special characters: newline characters (`'\n'`) separate different entries, while tab characters (`'\t'`) indicate how deeply nested each item is within the hierarchy. The number of tabs before an entry tells you its depth level. For example, no tabs means it's at the root level, one tab means it's nested one level deep, two tabs means two levels deep, and so on. Files are distinguished from directories by the presence of a dot (`.`) in their name, which represents the file extension. Directories never have extensions.

Let's visualize this with a concrete example. The string `"dir\n\tsubdir1\n\t\tfile1.ext\n\t\tsubsubdir1\n\tsubdir2\n\t\tsubsubdir2\n\t\t\tfile2.ext"` represents a tree structure where `dir` is the root, containing two subdirectories: `subdir1` and `subdir2`. Inside `subdir1`, there's a file `file1.ext` and another directory `subsubdir1`. Meanwhile, `subdir2` contains `subsubdir2`, which in turn contains `file2.ext`. When you construct the absolute path to a file, you join all directory names from the root down to the file using forward slashes (`'/'`) as separators. For instance, the complete path to `file2.ext` is `"dir/subdir2/subsubdir2/file2.ext"`, which has a total length of 32 characters.

Your challenge is to find the length of the longest absolute path to any file in this system. Notice that we're only interested in paths that end at files, not directories. If the input contains only directories and no files at all, you should return `0`. One important edge case to consider: names can contain letters, digits, and even spaces, but all names are guaranteed to have positive length, and the input always represents a valid, well-formed file system structure.

## Why This Matters

File system navigation is fundamental to operating systems, backup software, and build tools. When you run commands like `find`, `du`, or `ls -R` on Unix systems, they're traversing directory structures similar to this problem. Version control systems like Git track files with their full paths, and compression utilities like tar and zip need to efficiently encode directory hierarchies. This problem teaches you how to parse serialized hierarchical data, which appears in many formats beyond file systems: XML/HTML documents, JSON with nested objects, organizational charts, and syntax trees in compilers all share the same tree-like structure. The key insight is working with depth levels without building the entire tree in memory, which is crucial when dealing with massive directory structures containing millions of files. By tracking cumulative path lengths at each depth using a stack, you can solve this in a single pass with minimal memory, demonstrating how the right data structure transforms a complex problem into an elegant solution.

## Examples

**Example 1:**
- Input: `input = "a"`
- Output: `0`
- Explanation: The input contains only a directory named "a" with no files present.

## Constraints

- 1 <= input.length <= 10⁴
- input may contain lowercase or uppercase English letters, a new line character '\n', a tab character '\t', a dot '.', a space ' ', and digits.
- All file and directory names have **positive** length.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Parsing the Structure</summary>

Split the input by newline characters to get individual entries. For each entry, count the number of leading tab characters to determine its depth level. This tells you how deeply nested it is in the directory tree.

</details>

<details>
<summary>🎯 Hint 2: Tracking Path Lengths</summary>

You don't need to store the actual path strings. Instead, maintain a stack or array that stores cumulative path lengths at each depth level. When you encounter a file (contains a dot), calculate its total path length by adding its name length to the parent directory's cumulative length plus separators.

</details>

<details>
<summary>📝 Hint 3: Stack-Based Approach</summary>

Use a stack to track path lengths at each level:
1. For each entry, determine its depth by counting tabs
2. Pop from stack until stack size equals current depth
3. Calculate current path length = stack top + len(current_name) + 1 (for '/')
4. If it's a file (has '.'), update max length
5. If it's a directory, push current length to stack

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Build Tree + DFS | O(n) | O(n) | Builds explicit tree structure, inefficient |
| String Concatenation | O(n²) | O(n) | Concatenating strings repeatedly is slow |
| **Stack with Lengths** | **O(n)** | **O(d)** | Optimal: d is max depth, typically much smaller than n |

## Common Mistakes

### Mistake 1: Storing full path strings instead of lengths

```python
# Wrong: Storing and concatenating strings is inefficient
def lengthLongestPath(input):
    lines = input.split('\n')
    stack = []
    max_len = 0

    for line in lines:
        depth = line.count('\t')
        name = line.replace('\t', '')

        # WRONG: Building actual path strings
        while len(stack) > depth:
            stack.pop()

        if stack:
            path = stack[-1] + '/' + name
        else:
            path = name

        if '.' in name:
            max_len = max(max_len, len(path))
        else:
            stack.append(path)

    return max_len

# Correct: Store only lengths
def lengthLongestPath(input):
    lines = input.split('\n')
    stack = [0]  # Stack stores cumulative lengths
    max_len = 0

    for line in lines:
        depth = line.count('\t')
        name = line.lstrip('\t')

        # Pop to correct depth
        while len(stack) > depth + 1:
            stack.pop()

        # Current length = parent length + name length + separator
        current_len = stack[-1] + len(name) + (1 if stack[-1] > 0 else 0)

        if '.' in name:
            max_len = max(max_len, current_len)
        else:
            stack.append(current_len)

    return max_len
```

### Mistake 2: Not handling depth changes correctly

```python
# Wrong: Incorrect depth handling
def lengthLongestPath(input):
    lines = input.split('\n')
    stack = []
    max_len = 0

    for line in lines:
        depth = line.count('\t')
        name = line.lstrip('\t')

        # WRONG: Not popping to correct depth
        if len(stack) > 0:
            stack.pop()

        # This doesn't maintain correct parent-child relationship
        if stack:
            current = stack[-1] + len(name) + 1
        else:
            current = len(name)

        if '.' in name:
            max_len = max(max_len, current)
        else:
            stack.append(current)

    return max_len

# Correct: Properly adjust stack to match depth
def lengthLongestPath(input):
    lines = input.split('\n')
    stack = [0]
    max_len = 0

    for line in lines:
        depth = line.count('\t')
        name = line.lstrip('\t')

        # Adjust stack size to depth + 1
        while len(stack) > depth + 1:
            stack.pop()

        current_len = stack[-1] + len(name) + (1 if depth > 0 else 0)

        if '.' in name:
            max_len = max(max_len, current_len)
        else:
            stack.append(current_len)

    return max_len
```

### Mistake 3: Counting separators incorrectly

```python
# Wrong: Off-by-one errors in separator counting
def lengthLongestPath(input):
    lines = input.split('\n')
    stack = [0]
    max_len = 0

    for line in lines:
        depth = line.count('\t')
        name = line.lstrip('\t')

        while len(stack) > depth + 1:
            stack.pop()

        # WRONG: Always adding 1 even for root level
        current_len = stack[-1] + len(name) + 1

        if '.' in name:
            max_len = max(max_len, current_len)
        else:
            stack.append(current_len)

    return max_len

# Correct: Only add separator when not at root
def lengthLongestPath(input):
    lines = input.split('\n')
    stack = [0]
    max_len = 0

    for line in lines:
        depth = line.count('\t')
        name = line.lstrip('\t')

        while len(stack) > depth + 1:
            stack.pop()

        # Add separator only if we have a parent
        separator = 1 if depth > 0 else 0
        current_len = stack[-1] + len(name) + separator

        if '.' in name:
            max_len = max(max_len, current_len)
        else:
            stack.append(current_len)

    return max_len
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Return actual path | Return the longest path string instead of length | Easy |
| Count all files | Count total number of files in the system | Easy |
| Deepest directory | Find the maximum depth of directories | Easy |
| Multiple extensions | Handle files with multiple dots (e.g., file.tar.gz) | Medium |
| Path validation | Verify if a given path exists in the system | Medium |

## Practice Checklist

- [ ] First attempt (solve independently)
- [ ] Implement stack-based solution
- [ ] Test with various depths and structures
- [ ] Handle edge cases (no files, single file, deep nesting)
- [ ] Practice after 1 day
- [ ] Practice after 3 days
- [ ] Practice after 1 week

**Strategy**: See [Stack Patterns](../strategies/patterns/stack.md)
