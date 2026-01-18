---
id: M146
old_id: I140
slug: flatten-nested-list-iterator
title: Flatten Nested List Iterator
difficulty: medium
category: medium
topics: ["stack", "design", "iterator"]
patterns: ["lazy-evaluation", "stack-based-iteration"]
estimated_time_minutes: 30
frequency: high
related_problems: ["M145", "M251", "M341"]
prerequisites: ["stack-operations", "iterator-design", "nested-structures"]
---
# Flatten Nested List Iterator

## Problem

Design an iterator that processes a nested list structure where elements can be integers or lists containing more integers and lists. Imagine you're building a data processing pipeline that receives complex, hierarchical JSON-like structures but needs to extract values in a simple, linear sequence for downstream processing. Your iterator must hide the complexity of the nesting and present a flat interface to consumers.

Create a `NestedIterator` class with these methods: `NestedIterator(List<NestedInteger> nestedList)` initializes the iterator with the nested structure, `int next()` retrieves the next integer from the flattened sequence, and `boolean hasNext()` checks if more integers remain to be retrieved. The iterator should traverse all integers in the nested structure as if they were in a flat list, maintaining their original left-to-right ordering.

The key design challenge is deciding between eager evaluation (flattening everything upfront in the constructor) versus lazy evaluation (processing elements on-demand as `next()` is called). Lazy evaluation is memory-efficient for large structures but requires careful state management. Edge cases include deeply nested structures that could cause stack overflow with naive recursion, empty nested lists that should be skipped, and mixed nesting levels where some integers are deeply nested while others are at the surface. You must ensure that repeatedly calling `next()` while `hasNext()` returns true produces all integers without skipping any or returning them out of order.

## Why This Matters

Iterator design is central to modern programming languages and frameworks. Python's generators, Java's Iterator interface, and JavaScript's iterables all build on these principles. Streaming data processing systems like Apache Kafka or message queue consumers use lazy iterators to process nested message formats without loading entire batches into memory. XML/HTML parsers use iterators to traverse document trees, and database result set cursors iterate through hierarchical query results. Understanding lazy evaluation versus eager processing helps you optimize memory usage in big data pipelines. This problem teaches stack-based traversal for nested structures, a technique used in compilers for traversing abstract syntax trees, in operating systems for directory tree walking, and in graph algorithms for depth-first search. The design pattern here is foundational for building efficient, memory-conscious data processing systems.

## Examples

**Example 1:**
- Input: `nestedList = [[1,1],2,[1,1]]`
- Output: `[1,1,2,1,1]`
- Explanation: The iterator produces integers in sequence: 1, 1, 2, 1, 1.

**Example 2:**
- Input: `nestedList = [1,[4,[6]]]`
- Output: `[1,4,6]`
- Explanation: The iterator flattens the nested structure to yield: 1, 4, 6.

## Constraints

- 1 <= nestedList.length <= 500
- The values of the integers in the nested list is in the range [-10⁶, 10⁶].

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Lazy Evaluation vs. Eager Flattening</summary>

You have two main approaches:
1. Eager: Flatten the entire nested list in the constructor and store all integers
2. Lazy: Process the structure on-demand during `next()` and `hasNext()` calls

Lazy evaluation is more memory-efficient for large structures. Consider using a stack to keep track of elements you need to process, similar to iterative DFS.

</details>

<details>
<summary>🎯 Hint 2: Stack-Based Iteration</summary>

Use a stack to store NestedInteger objects. In `hasNext()`:
- While the stack is not empty and the top element is a list (not an integer):
  - Pop the list
  - Push its elements in reverse order (to maintain left-to-right order)
- Return true if stack is not empty and top is an integer

This ensures `next()` can simply pop and return the top integer.

</details>

<details>
<summary>📝 Hint 3: Algorithm Steps</summary>

**Approach 1: Eager Flattening**
```
Constructor:
1. Initialize empty result list
2. Define recursive flatten(nested_list):
   - For each element:
     - If integer: append to result
     - If list: recursively flatten
3. Call flatten(nestedList)
4. Initialize index = 0

hasNext(): return index < len(result)
next(): return result[index++]
```

**Approach 2: Lazy Stack-Based**
```
Constructor:
1. Initialize stack
2. Push all elements from nestedList in reverse order

hasNext():
1. While stack not empty:
   - Peek top element
   - If it's an integer: return true
   - If it's a list:
     - Pop it
     - Push its elements in reverse order
2. Return false

next():
1. Call hasNext() to ensure top is integer
2. Pop and return the integer
```

Key insight: hasNext() does the heavy lifting of ensuring next integer is ready.

</details>

## Complexity Analysis

| Approach | Time (Constructor) | Time (hasNext/next) | Space | Notes |
|----------|-------------------|---------------------|-------|-------|
| Eager Flattening | O(n) | O(1) | O(n) | Flatten everything upfront |
| **Lazy Stack** | **O(1)** | **Amortized O(1)** | **O(d)** | **d is max depth, optimal** |

Where n is total number of integers. Lazy approach has O(1) constructor and amortized O(1) for iteration.

## Common Mistakes

### Mistake 1: Not Handling Nested Lists in hasNext()

**Wrong Approach:**
```python
# Only checking if stack is non-empty
class NestedIterator:
    def __init__(self, nestedList):
        self.stack = nestedList[::-1]  # Reverse for correct order

    def hasNext(self):
        return len(self.stack) > 0  # Wrong: doesn't unwrap lists

    def next(self):
        element = self.stack.pop()
        # What if element is a list, not an integer?
        return element.getInteger()  # Will fail!
```

**Correct Approach:**
```python
# Unwrap nested lists in hasNext()
class NestedIterator:
    def __init__(self, nestedList):
        self.stack = nestedList[::-1]

    def hasNext(self):
        while self.stack:
            top = self.stack[-1]
            if top.isInteger():  # Correct: check if integer
                return True
            # Unwrap list
            self.stack.pop()
            self.stack.extend(top.getList()[::-1])
        return False

    def next(self):
        return self.stack.pop().getInteger()
```

### Mistake 2: Wrong Order When Pushing to Stack

**Wrong Approach:**
```python
# Pushing in forward order gives reversed output
def hasNext(self):
    while self.stack:
        top = self.stack[-1]
        if top.isInteger():
            return True
        self.stack.pop()
        self.stack.extend(top.getList())  # Wrong: forward order
    return False
# Elements come out in reverse!
```

**Correct Approach:**
```python
# Push in reverse order for correct left-to-right output
def hasNext(self):
    while self.stack:
        top = self.stack[-1]
        if top.isInteger():
            return True
        self.stack.pop()
        self.stack.extend(top.getList()[::-1])  # Correct: reverse
    return False
```

### Mistake 3: Not Calling hasNext() Before next()

**Wrong Approach:**
```python
# Assuming top is always an integer in next()
def next(self):
    return self.stack.pop().getInteger()  # Might fail if top is list
```

**Correct Approach:**
```python
# Ensure hasNext() is called to prepare next integer
def next(self):
    self.hasNext()  # Ensure top is integer
    return self.stack.pop().getInteger()
```

## Variations

| Variation | Difference | Key Insight |
|-----------|------------|-------------|
| Flatten 2D Vector | Only 2 levels of nesting | Simpler with two pointers (row, col) |
| Zigzag Iterator | Interleave multiple lists | Use queue to rotate between lists |
| Peeking Iterator | Add peek() method | Cache next element |
| Binary Search Tree Iterator | Tree instead of list | Use stack for in-order traversal |
| Nested List Weight Sum | Calculate weighted sum | Similar traversal, track depth |

## Practice Checklist

- [ ] Implement eager flattening approach
- [ ] Implement lazy stack-based approach
- [ ] Handle edge case: empty nested list
- [ ] Handle edge case: deeply nested structure
- [ ] Handle edge case: all integers at same level
- [ ] Test with mixed nesting levels
- [ ] Verify correct left-to-right order
- [ ] Confirm amortized O(1) time per operation
- [ ] Verify stack uses O(depth) space
- [ ] Code without looking at solution

**Spaced Repetition Schedule:**
- First review: 24 hours
- Second review: 3 days
- Third review: 1 week
- Fourth review: 2 weeks
- Fifth review: 1 month

**Strategy**: See [Stack Patterns](../strategies/data-structures/stacks.md)
