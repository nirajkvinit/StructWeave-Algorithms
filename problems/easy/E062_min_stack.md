---
id: E062
old_id: F155
slug: min-stack
title: Min Stack
difficulty: easy
category: easy
topics: ["stack", "design"]
patterns: ["stack-operations", "auxiliary-data-structure"]
estimated_time_minutes: 15
frequency: high
related_problems: ["M716", "H895", "E232"]
prerequisites: ["stack-basics", "data-structure-design"]
strategy_ref: ../prerequisites/stack.md
---
# Min Stack

## Problem

Design a stack data structure that supports the standard stack operations (push, pop, top) plus one additional operation: retrieving the minimum element in constant time O(1).

Implement the MinStack class with these operations:
- `push(val)`: Add val to the top of the stack
- `pop()`: Remove the element from the top of the stack
- `top()`: Get the top element of the stack
- `getMin()`: Retrieve the minimum element in the stack

All four operations must run in O(1) time. A regular stack supports push, pop, and top in O(1), but finding the minimum typically requires scanning all elements in O(n) time.

The challenge is: how do you track the minimum efficiently as elements are added and removed?

**Watch out for:**
- When you pop the current minimum, you need to know what the new minimum is without scanning.
- Multiple elements can have the same value, including the minimum.
- You cannot simply store a single "global minimum" because it might get popped.

Think about maintaining extra information alongside your main stack so you always know the minimum at each stack level.

## Why This Matters

This problem teaches auxiliary data structure design, a pattern used in:
- Implementing editor undo/redo with state tracking
- Monitoring systems that track real-time metrics (current value and minimum/maximum)
- Database query optimization (maintaining statistics during operations)
- Game engines tracking entity state with min/max bounds

Understanding how to maintain invariants across operations (like "always know the minimum") using helper structures is fundamental to designing efficient data structures. This pattern extends to maintaining medians (with heaps), k-th largest elements, and other aggregate statistics.

## Examples

**Example 1:**
- Input:
  ```
  ["MinStack","push","push","push","getMin","pop","top","getMin"]
  [[],[-2],[0],[-3],[],[],[],[]]
  ```
- Output: `[null,null,null,null,-3,null,0,-2]`
- Explanation:
  ```
  MinStack minStack = new MinStack();
  minStack.push(-2);
  minStack.push(0);
  minStack.push(-3);
  minStack.getMin(); // return -3
  minStack.pop();
  minStack.top();    // return 0
  minStack.getMin(); // return -2
  ```

## Constraints

- -2³¹ <= val <= 2³¹ - 1
- Methods pop, top and getMin operations will always be called on **non-empty** stacks.
- At most 3 * 10⁴ calls will be made to push, pop, top, and getMin.

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: The Core Challenge</summary>

A regular stack supports push, pop, and top in O(1) time. The challenge is adding getMin() in O(1) as well.

If you scan the stack to find the minimum each time, that's O(n). How can you track the minimum without scanning?

Think about: when you push a new element, how does it affect the current minimum? When you pop an element, how does that affect the minimum?

</details>

<details>
<summary>🎯 Hint 2: Auxiliary Stack Approach</summary>

Use TWO stacks:
1. **Main stack**: stores all values normally
2. **Min stack**: stores the minimum value at each level

When pushing value x:
- Push x to main stack
- Push min(x, current_min) to min stack

When popping:
- Pop from both stacks

When getting minimum:
- Return top of min stack (O(1))

Example: Push -2, 0, -3
- Main: [-2, 0, -3]
- Min:  [-2, -2, -3]  (each position stores min so far)

</details>

<details>
<summary>📝 Hint 3: Implementation Details</summary>

```
class MinStack:
    initialize:
        main_stack = []
        min_stack = []

    push(val):
        main_stack.push(val)
        if min_stack is empty:
            min_stack.push(val)
        else:
            current_min = min_stack.top()
            min_stack.push(min(val, current_min))

    pop():
        main_stack.pop()
        min_stack.pop()

    top():
        return main_stack.top()

    getMin():
        return min_stack.top()
```

All operations: O(1) time
Space: O(n) for two stacks

**Alternative**: Store (value, min) pairs in single stack

</details>

## Complexity Analysis

| Approach | Time (all ops) | Space | Notes |
|----------|----------------|-------|-------|
| **Two Stacks** | **O(1)** | **O(n)** | Optimal; maintain separate min stack |
| Single Stack with Pairs | O(1) | O(n) | Store (value, current_min) tuples |
| Single Stack with Diffs | O(1) | O(n) | Store differences; complex, saves space |
| Scan on getMin | O(n) | O(n) | Violates O(1) requirement |

## Common Mistakes

### 1. Only Storing Global Minimum
```python
# WRONG: Loses minimum after popping
def __init__(self):
    self.stack = []
    self.min = float('inf')

def pop(self):
    val = self.stack.pop()
    # What if we just popped the minimum? Lost!

# CORRECT: Track minimum at each level
def __init__(self):
    self.stack = []
    self.min_stack = []
```

### 2. Not Checking Empty Stack
```python
# WRONG: Doesn't handle first push
def push(self, val):
    self.stack.append(val)
    current_min = self.min_stack[-1]  # IndexError if empty!
    self.min_stack.append(min(val, current_min))

# CORRECT: Check if min_stack is empty
def push(self, val):
    self.stack.append(val)
    if not self.min_stack:
        self.min_stack.append(val)
    else:
        self.min_stack.append(min(val, self.min_stack[-1]))
```

### 3. Forgetting to Pop from Min Stack
```python
# WRONG: Only popping from main stack
def pop(self):
    return self.stack.pop()
    # min_stack is now out of sync!

# CORRECT: Pop from both stacks
def pop(self):
    self.min_stack.pop()
    return self.stack.pop()
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Max Stack | Track maximum instead | Same approach, use max instead of min |
| Min/Max Stack | Track both min and max | Use two auxiliary stacks or store triples |
| Min Queue | Queue instead of stack | Use two stacks to implement queue |
| Median Stack | Track median | Use two heaps (min and max) |

## Practice Checklist

**Correctness:**
- [ ] Handles first element correctly
- [ ] Handles new minimum correctly
- [ ] Handles popping minimum correctly
- [ ] getMin returns correct value after any sequence
- [ ] All operations are O(1)
- [ ] No index out of bounds errors

**Interview Readiness:**
- [ ] Can explain approach in 2 minutes
- [ ] Can code solution in 12 minutes
- [ ] Can discuss space-time tradeoff
- [ ] Can explain why two stacks are needed
- [ ] Can implement alternative (value, min) pairs approach

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve variations
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Stack Pattern](../../prerequisites/stack.md)
