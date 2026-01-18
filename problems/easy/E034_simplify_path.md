---
id: E034
old_id: F071
slug: simplify-path
title: Simplify Path
difficulty: easy
category: easy
topics: ["string", "stack"]
patterns: ["stack-simulation"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["M388", "M385", "E020"]
prerequisites: ["stacks", "string-splitting"]
strategy_ref: ../../strategies/data-structures/stack.md
---
# Simplify Path

## Problem

Given an absolute file path in Unix-style format, convert it to its simplified canonical form. A Unix path starts with a slash '/' and uses slashes to separate directories.

Unix paths have special components you need to handle: a single period '.' represents the current directory (which can be removed), a double period '..' represents the parent directory (move up one level), multiple consecutive slashes are equivalent to a single slash, and any sequence of non-slash characters represents a directory name.

For example, the path "/home//foo/" should be simplified to "/home/foo" (removing trailing slash and collapsing double slashes). The path "/a/./b/../../c/" should become "/c" because the '.' is ignored, and the two '..' move up from b to a and then from a to the root, leaving only c.

The canonical path must start with '/', must not end with '/' (unless it's the root), and must have single slashes between directory names. Also, going up from the root directory (like "/../") is a no-op since you're already at the highest level.

Your task is to process all these rules and return the simplified canonical path.

## Why This Matters

Path normalization is a critical security and functionality feature in operating systems, web servers, file management systems, and cloud storage platforms. Failing to properly canonicalize paths can lead to security vulnerabilities where attackers use sequences like "../../" to access files outside allowed directories.

This problem teaches the stack data structure in a practical context. The stack naturally handles the "undo" operation needed for ".." (going to parent directory), making it the perfect tool for this task. Understanding when a stack is the right choice is an important pattern recognition skill.

Real-world applications include implementing file system navigation, normalizing URLs in web applications, resolving symbolic links, and securing REST API endpoints that accept path parameters. The pattern you learn here applies anywhere you need to track hierarchical navigation with the ability to move both forward and backward.

## Examples

**Example 1:**
- Input: `path = "/home/"`
- Output: `"/home"`
- Explanation: Note that there is no trailing slash after the last directory name.

**Example 2:**
- Input: `path = "/../"`
- Output: `"/"`
- Explanation: Going one level up from the root directory is a no-op, as the root level is the highest level you can go.

**Example 3:**
- Input: `path = "/home//foo/"`
- Output: `"/home/foo"`
- Explanation: In the canonical path, multiple consecutive slashes are replaced by a single one.

## Constraints

- 1 <= path.length <= 3000
- path consists of English letters, digits, period '.', slash '/' or '_'.
- path is a valid absolute Unix path.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Understanding Path Components</summary>

In Unix paths:
- `/` is the path separator
- `.` means current directory (can be ignored)
- `..` means parent directory (go up one level)
- Multiple consecutive `/` are treated as one

Which data structure naturally handles "going back" or "undoing" operations?

</details>

<details>
<summary>🎯 Hint 2: Stack for Directory Navigation</summary>

Think of navigating a file system as building a stack of directory names:
- When you see a directory name, push it onto the stack
- When you see `..`, pop from the stack (go up one level)
- When you see `.` or empty string, ignore it

After processing all components, the stack contains your path from root to destination.

</details>

<details>
<summary>📝 Hint 3: Step-by-Step Algorithm</summary>

```
Algorithm:
1. Split path by '/' to get components
   Example: "/a/./b/../../c/" → ["", "a", ".", "b", "..", "..", "c", ""]

2. Initialize empty stack

3. For each component:
   - If empty or '.': skip (ignore)
   - If '..':
       if stack not empty: pop (go up)
       else: ignore (already at root)
   - Else: push component (enter directory)

4. Build result: '/' + '/'.join(stack)
   - If stack empty, return '/'

Example trace: "/a/./b/../../c/"
Components: ["", "a", ".", "b", "..", "..", "c", ""]
- "": skip → stack=[]
- "a": push → stack=["a"]
- ".": skip → stack=["a"]
- "b": push → stack=["a","b"]
- "..": pop → stack=["a"]
- "..": pop → stack=[]
- "c": push → stack=["c"]
- "": skip → stack=["c"]
Result: "/c"
```

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| **Stack-Based** | **O(n)** | **O(n)** | Single pass through path, stack for components |
| String Manipulation | O(n) | O(n) | Multiple string operations, less clean |

## Common Mistakes

### 1. Not Handling Multiple Slashes
```python
# WRONG: Assuming single slashes
components = path.split('/')
# This creates empty strings for consecutive slashes

# CORRECT: Filter out empty components
components = [c for c in path.split('/') if c]
# OR handle empty strings in processing logic
```

### 2. Popping from Empty Stack
```python
# WRONG: Not checking if stack is empty
if component == '..':
    stack.pop()  # Error if stack is empty!

# CORRECT: Check before popping
if component == '..':
    if stack:
        stack.pop()
```

### 3. Incorrect Result Construction
```python
# WRONG: Missing leading slash
return '/'.join(stack)  # "home/user" instead of "/home/user"

# CORRECT: Always start with '/'
return '/' + '/'.join(stack)
# OR handle empty stack: return '/' if not stack else '/' + '/'.join(stack)
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Windows Path | Use backslash `\` separator | Split by `\` instead of `/` |
| Relative Path | No leading `/` | Track if original path was absolute |
| Longest Valid Path | Find longest valid subpath | Use DP with stack for each position |

## Practice Checklist

**Correctness:**
- [ ] Handles simple paths ("/home")
- [ ] Handles current directory (".")
- [ ] Handles parent directory ("..")
- [ ] Handles multiple slashes ("//")
- [ ] Handles trailing slash
- [ ] Handles root directory edge cases
- [ ] Returns correct format with leading "/"

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 15 minutes
- [ ] Can discuss complexity
- [ ] Can explain Unix path rules

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations (Windows path)
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Stack](../../strategies/data-structures/stack.md)
