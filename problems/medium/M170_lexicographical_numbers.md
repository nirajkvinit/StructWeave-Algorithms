---
id: M170
old_id: I185
slug: lexicographical-numbers
title: Lexicographical Numbers
difficulty: medium
category: medium
topics: ["dfs", "trie"]
patterns: ["dfs"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M170", "M022", "E234"]
prerequisites: ["depth-first-search", "number-theory"]
---
# Lexicographical Numbers

## Problem

Given a positive integer `n`, generate a list containing all integers from 1 to n (inclusive) sorted in lexicographical order—the same order words would appear in a dictionary. Lexicographical ordering treats numbers as strings and compares them character by character from left to right. For example, with n = 13, the sequence is [1, 10, 11, 12, 13, 2, 3, 4, 5, 6, 7, 8, 9] because "1" comes before "10" (which comes before "11", "12", "13"), and all of those come before "2". Notice that 10 appears after 1 but before 2 because we compare digit-by-digit like strings. The naive approach of converting all numbers to strings, sorting them, and converting back works but violates the strict constraints: your solution must run in O(n) time (linear, not O(n log n) like sorting) and use only O(1) auxiliary space (constant extra memory beyond the output list itself). This means you cannot use sorting or recursion stack space, and you need to generate numbers directly in lexicographical order through a clever iterative construction process. Think of building a tree where each node is a digit and you traverse depth-first to generate numbers in the correct sequence.

## Why This Matters

This problem teaches depth-first traversal patterns and iterative tree construction without explicit tree structures, techniques used extensively in file system navigation, compiler symbol table generation, and numerical algorithms. File systems display directories and files in lexicographical order through similar traversal logic, going deep into subdirectories before backtracking to siblings. Database indexing systems use lexicographical ordering for B-tree and trie structures where keys need to be traversed in sorted order without fully materializing sorted sequences. Text processing applications like autocomplete systems generate suggestions in lexicographical order by traversing trie data structures using depth-first patterns. Compiler design uses this for generating symbol tables and namespace resolution where identifiers are processed in lexicographical order. Network routing tables organize IP addresses lexicographically for efficient longest-prefix matching. The technique of building sequences iteratively without recursion or sorting is crucial for memory-constrained embedded systems and real-time systems where stack depth and memory allocation must be tightly controlled. This problem also demonstrates how mathematical properties (the structure of base-10 numbers) can guide algorithmic design, creating elegant solutions that seem to generate sorted output "magically" without explicit sorting.

## Examples

**Example 1:**
- Input: `n = 13`
- Output: `[1,10,11,12,13,2,3,4,5,6,7,8,9]`
- Explanation: When sorted as strings, "1" comes before "10", "11", etc., which all come before "2".

**Example 2:**
- Input: `n = 2`
- Output: `[1,2]`
- Explanation: With only two numbers, they remain in their natural order which is also lexicographical.

## Constraints

- 1 <= n <= 5 * 10⁴

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Understanding Lexicographical Order</summary>

Think about how strings are sorted in a dictionary. The number 1 comes before 10, 100, 1000, etc. because we compare digit by digit from left to right. This suggests a tree-like structure where each digit (0-9) represents a child node.

</details>

<details>
<summary>🎯 Hint 2: DFS Pattern Recognition</summary>

Imagine building numbers digit by digit. Start with 1, then try appending 0-9 to get 10-19, then go deeper to 100-199, etc. This is a depth-first traversal pattern. You can visit numbers in lexicographical order by exploring in DFS fashion: go as deep as possible (multiply by 10) before backtracking.

</details>

<details>
<summary>📝 Hint 3: Iterative Construction</summary>

You can build the sequence iteratively without recursion:
1. Start with current = 1
2. Add current to result
3. Try going deeper (current * 10) if it doesn't exceed n
4. Otherwise, increment and handle carry-over (skip trailing 9s)
5. The key is: always try to go deeper first, then try the next sibling

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Convert to String + Sort | O(n log n) | O(n) | Violates time constraint, uses extra space |
| DFS Recursive | O(n) | O(log n) | Meets time but uses recursion stack space |
| **DFS Iterative** | **O(n)** | **O(1)** | Optimal: meets both constraints |

## Common Mistakes

### Mistake 1: Using string conversion and sorting

```python
# Wrong: O(n log n) time, O(n) space - violates requirements
def lexicalOrder(n):
    # Converting to strings and sorting
    result = [str(i) for i in range(1, n + 1)]
    result.sort()  # O(n log n)
    return [int(x) for x in result]

# Correct: DFS approach in O(n) time, O(1) space
def lexicalOrder(n):
    result = []
    current = 1

    for _ in range(n):
        result.append(current)

        if current * 10 <= n:
            current *= 10  # Go deeper
        else:
            if current >= n:
                current //= 10
            current += 1

            # Skip over trailing 9s
            while current % 10 == 0:
                current //= 10

    return result
```

### Mistake 2: Incorrect DFS traversal logic

```python
# Wrong: Doesn't properly handle boundaries
def lexicalOrder(n):
    result = []

    def dfs(current):
        if current > n:
            return
        result.append(current)

        # WRONG: Doesn't properly limit the range
        for i in range(10):
            dfs(current * 10 + i)

    for i in range(1, 10):  # Should be bounded by n
        dfs(i)

    return result

# Correct: Proper boundary checking
def lexicalOrder(n):
    result = []

    def dfs(current):
        if current > n:
            return
        result.append(current)

        # Try appending 0-9, but stop if exceeds n
        for i in range(10):
            if current * 10 + i > n:
                break
            dfs(current * 10 + i)

    # Start with 1-9, not 0
    for i in range(1, 10):
        if i > n:
            break
        dfs(i)

    return result
```

### Mistake 3: Not handling the increment logic properly

```python
# Wrong: Infinite loop or incorrect sequence
def lexicalOrder(n):
    result = []
    current = 1

    for _ in range(n):
        result.append(current)

        if current * 10 <= n:
            current *= 10
        else:
            current += 1  # WRONG: Doesn't handle boundaries
            # Missing logic to skip back after reaching n

    return result

# Correct: Proper increment with boundary handling
def lexicalOrder(n):
    result = []
    current = 1

    for _ in range(n):
        result.append(current)

        if current * 10 <= n:
            current *= 10
        else:
            # Move to next sibling
            if current >= n:
                current //= 10
            current += 1

            # Handle carry-over (e.g., 19 -> 2, not 20)
            while current % 10 == 0:
                current //= 10

    return result
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Reverse lexicographical | Generate in reverse lexicographical order | Medium |
| K-th lexicographical number | Find only the k-th number without generating all | Medium |
| Lexicographical range | Generate numbers in lex order within range [a, b] | Medium |
| Lexicographical with prefix | All numbers with specific prefix in lex order | Easy |
| Multi-base lex order | Lexicographical order in different number bases | Hard |

## Practice Checklist

- [ ] First attempt (solve independently)
- [ ] Implement both recursive and iterative solutions
- [ ] Trace through examples manually
- [ ] Test edge cases (n=1, n=9, n=10, n=100)
- [ ] Practice after 1 day
- [ ] Practice after 3 days
- [ ] Practice after 1 week

**Strategy**: See [DFS Patterns](../strategies/patterns/depth-first-search.md)
