---
id: E260
old_id: A413
slug: validate-stack-sequences
title: Validate Stack Sequences
difficulty: easy
category: easy
topics: ["array", "stack"]
patterns: ["stack-simulation"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E020", "E155", "M032"]
prerequisites: ["stack", "arrays"]
strategy_ref: ../prerequisites/stacks-and-queues.md
---
# Validate Stack Sequences

## Problem

A stack is a Last-In-First-Out (LIFO) data structure where you can push elements onto the top and pop elements from the top. Given two integer arrays `pushed` and `popped`, you need to determine whether they represent a valid sequence of push and pop operations on an initially empty stack.

Both arrays contain the same unique values. The `pushed` array shows the order in which elements should be pushed onto the stack, while the `popped` array shows a desired order for popping elements. The question is: starting with an empty stack, can you interleave push and pop operations to match both sequences? For example, you might push several elements, then pop one, push more, pop several, and so on.

Return `true` if such a sequence of operations is possible, and `false` otherwise. Note that you must push elements in the exact order given by `pushed`, but you have flexibility in when to perform the pop operations (as long as the popped values appear in the order specified by `popped`).

## Why This Matters

Stack validation is a fundamental problem that appears in expression evaluation, browser history navigation, undo/redo functionality, and parser implementations. This problem teaches you the powerful technique of "simulation" - instead of trying to reason about all possible interleavings abstractly, you simply simulate the operations and see if they work. This approach is widely used in validating state machines, checking syntax correctness, and verifying protocol sequences in networking. Understanding stack behavior deeply is essential because stacks underlie function call management, recursion, backtracking algorithms, and many parsing techniques. The pattern of using a stack to validate sequences appears frequently in compiler design and expression parsing interviews.

## Examples

**Example 1:**
- Input: `pushed = [1,2,3,4,5], popped = [4,5,3,2,1]`
- Output: `true`
- Explanation: A valid sequence exists:
push(1), push(2), push(3), push(4),
pop() -> 4,
push(5),
pop() -> 5, pop() -> 3, pop() -> 2, pop() -> 1

**Example 2:**
- Input: `pushed = [1,2,3,4,5], popped = [4,3,5,1,2]`
- Output: `false`
- Explanation: The value 1 would need to be popped before 2, which violates stack order.

## Constraints

- 1 <= pushed.length <= 1000
- 0 <= pushed[i] <= 1000
- All the elements of pushed are **unique**.
- popped.length == pushed.length
- popped is a permutation of pushed.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1: Conceptual Foundation
- Simulate the actual stack operations to validate the sequences
- Push elements onto a stack following the `pushed` order
- Try to pop elements matching the `popped` sequence
- If simulation completes successfully, sequences are valid

### Tier 2: Step-by-Step Strategy
- Use an actual stack to simulate operations
- Use a pointer to track position in the `popped` array
- For each element in `pushed`:
  - Push it onto the stack
  - While stack is not empty AND top of stack matches current element in `popped`:
    - Pop from stack
    - Advance pointer in `popped` array
- After processing all elements, check if stack is empty
- Empty stack means all pops were successful, return true

### Tier 3: Implementation Details
- Initialize empty stack `stack = []`
- Initialize pointer `pop_index = 0`
- For each `value` in `pushed`:
  - `stack.append(value)`
  - While `stack` is not empty and `pop_index < len(popped)` and `stack[-1] == popped[pop_index]`:
    - `stack.pop()`
    - `pop_index += 1`
- Return `len(stack) == 0` or equivalently `pop_index == len(popped)`

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Stack Simulation | O(n) | O(n) | Optimal solution, each element pushed/popped once |
| Generate All Permutations | O(n! * n) | O(n) | Extremely inefficient, tries all orderings |
| Recursive Validation | O(n) | O(n) | Similar to stack but with call stack overhead |

**Optimal Solution**: Stack simulation achieves O(n) time and O(n) space.

## Common Mistakes

### Mistake 1: Not checking stack top before popping
```python
# Wrong: popping without checking if element matches
for value in pushed:
    stack.append(value)
    if popped[pop_index] in stack:  # Wrong check!
        stack.pop()
        pop_index += 1

# Correct: only pop when top matches
for value in pushed:
    stack.append(value)
    while stack and pop_index < len(popped) and stack[-1] == popped[pop_index]:
        stack.pop()
        pop_index += 1
```

### Mistake 2: Forgetting the while loop for multiple pops
```python
# Wrong: only checking once after each push
for value in pushed:
    stack.append(value)
    if stack and stack[-1] == popped[pop_index]:  # Only one pop
        stack.pop()
        pop_index += 1

# Correct: keep popping while top matches
for value in pushed:
    stack.append(value)
    while stack and pop_index < len(popped) and stack[-1] == popped[pop_index]:
        stack.pop()  # May pop multiple times
        pop_index += 1
```

### Mistake 3: Not validating final state
```python
# Wrong: not checking if all elements were popped
for value in pushed:
    stack.append(value)
    while stack and stack[-1] == popped[pop_index]:
        stack.pop()
        pop_index += 1
return True  # Assumes success without checking!

# Correct: verify stack is empty
return len(stack) == 0  # or pop_index == len(popped)
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Two stacks with transfers | Medium | Allow moving elements between two stacks |
| Queue validation sequences | Medium | Use queue (FIFO) instead of stack (LIFO) |
| Minimum number of stacks needed | Medium | Find minimum stacks to achieve sequence |
| Count valid pop sequences | Hard | Count all valid orderings for given push sequence |
| With peek operations | Medium | Add peek operations to the sequence |

## Practice Checklist

Track your progress mastering this problem:

- [ ] Solved independently on first attempt
- [ ] Completed within 15 minutes
- [ ] Recognized stack simulation pattern
- [ ] Used while loop for continuous popping
- [ ] Handled empty stack edge case properly
- [ ] Wrote bug-free code on first submission
- [ ] Explained solution clearly to someone else
- [ ] Solved without hints after 1 day
- [ ] Solved without hints after 1 week
- [ ] Identified time and space complexity correctly

**Spaced Repetition Schedule**: Review on Day 1, Day 3, Day 7, Day 14, Day 30

**Strategy**: See [Stacks and Queues](../prerequisites/stacks-and-queues.md)
