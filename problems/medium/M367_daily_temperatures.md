---
id: M367
old_id: A206
slug: daily-temperatures
title: Daily Temperatures
difficulty: medium
category: medium
topics: ["array", "stack"]
patterns: ["monotonic-stack"]
estimated_time_minutes: 30
frequency: high
related_problems: ["E496", "M503", "M739"]
prerequisites: ["stack", "monotonic-stack"]
---
# Daily Temperatures

## Problem

Given a list of daily temperatures, determine for each day how many days you'd have to wait until a warmer temperature arrives. If there's no future day with a warmer temperature, the wait time is 0.

For example, if temperatures are `[73, 74, 75, 71, 69, 72, 76, 73]`:
- Day 0 (73°): Next warmer day is day 1 (74°), so wait 1 day
- Day 1 (74°): Next warmer day is day 2 (75°), so wait 1 day
- Day 2 (75°): Next warmer day is day 6 (76°), so wait 4 days
- Day 3 (71°): Next warmer day is day 5 (72°), so wait 2 days
- Day 7 (73°): No warmer day follows, so wait 0 days

The output would be `[1, 1, 4, 2, 1, 1, 0, 0]`.

The naive approach of checking every future day for each current day works but takes O(n²) time, which is too slow for large inputs (up to 10⁵ temperatures). The challenge is finding an O(n) solution that processes each temperature exactly once.

This is a classic "next greater element" problem where you need to efficiently find, for each element, the next element to its right that's larger. The key insight is using a stack to remember days that are still waiting for a warmer temperature, allowing you to resolve multiple days at once when a warm day arrives.

## Why This Matters

This problem introduces the monotonic stack pattern, one of the most elegant techniques in algorithm design. Once you recognize this pattern, you'll see it everywhere: stock price spans (how many consecutive days had lower prices?), histogram problems (finding the largest rectangle), and parsing expressions with precedence rules.

The monotonic stack is a fundamental tool for "next greater/smaller element" questions, which appear frequently in technical interviews at major tech companies. It's also valuable in real-world systems: compilers use similar techniques for operator precedence parsing, and time-series analytics often need to find the next occurrence of threshold-crossing events.

Learning to recognize when a problem can be solved with a monotonic stack transforms seemingly quadratic problems into linear ones, a powerful optimization technique that demonstrates the importance of choosing the right data structure.

## Examples

**Example 1:**
- Input: `temperatures = [73,74,75,71,69,72,76,73]`
- Output: `[1,1,4,2,1,1,0,0]`

**Example 2:**
- Input: `temperatures = [30,40,50,60]`
- Output: `[1,1,1,0]`

**Example 3:**
- Input: `temperatures = [30,60,90]`
- Output: `[1,1,0]`

## Constraints

- 1 <= temperatures.length <= 10⁵
- 30 <= temperatures[i] <= 100

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Brute Force Recognition</summary>

The naive approach is clear but inefficient:
```
For each day i:
  For each day j from i+1 to end:
    If temperatures[j] > temperatures[i]:
      answer[i] = j - i
      break
  If no warmer day found:
    answer[i] = 0
```

Time complexity: O(n²)
This works but is too slow for large inputs (up to 10⁵ elements).

</details>

<details>
<summary>Hint 2: Monotonic Stack Pattern</summary>

Use a **decreasing monotonic stack** that stores indices:
- Stack maintains indices in decreasing order of their temperatures
- When you encounter a warmer temperature, it's the answer for all days in the stack that are cooler

Algorithm:
```
1. Initialize empty stack and result array
2. For each day i from left to right:
   - While stack is not empty AND current temp > temp at stack top:
     - Pop index from stack
     - Set answer[popped_index] = i - popped_index
   - Push current index i onto stack
3. Remaining indices in stack have answer = 0
```

This is the classic "next greater element" pattern.

</details>

<details>
<summary>Hint 3: Stack Invariant</summary>

Key insight: the stack stores indices of days waiting to find their next warmer day.

Invariant: temperatures at indices in the stack are in **decreasing order** from bottom to top.

When a warmer temperature arrives:
- It resolves all cooler days at the top of the stack
- Then gets pushed onto the stack (waiting for an even warmer day)

Example trace for `[73,74,75,71,69,72,76,73]`:
- i=0: stack=[0]
- i=1: 74>73, pop 0, answer[0]=1, stack=[1]
- i=2: 75>74, pop 1, answer[1]=1, stack=[2]
- i=3: 71<75, stack=[2,3]
- i=4: 69<71, stack=[2,3,4]
- i=5: 72>69,71 but <75, pop 4,3, answer[4]=1, answer[3]=2, stack=[2,5]
- ...

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute force (nested loop) | O(n²) | O(1) | For each element, scan remaining array; too slow |
| Monotonic stack | O(n) | O(n) | Each element pushed and popped at most once |
| Backward scan | O(n) | O(1) | Scan from right to left, tracking next warmer; clever but less intuitive |

Monotonic stack is the standard and most intuitive optimal solution.

## Common Mistakes

**Mistake 1: Using a stack that stores temperatures instead of indices**
```python
# Wrong - can't calculate the distance without indices
stack = []
for temp in temperatures:
    while stack and temp > stack[-1]:
        stack.pop()  # How to set answer? Need index!
    stack.append(temp)

# Correct - store indices
stack = []
for i, temp in enumerate(temperatures):
    while stack and temperatures[i] > temperatures[stack[-1]]:
        prev_idx = stack.pop()
        answer[prev_idx] = i - prev_idx
    stack.append(i)
```

**Mistake 2: Not initializing answer array**
```python
# Wrong - uninitialized array
answer = [0] * len(temperatures)
# But then forget to handle remaining stack elements
# They should stay 0, so initialization is correct

# Actually correct - initialize to 0
# Elements that remain in stack already have answer[i] = 0
```

**Mistake 3: Incorrect stack comparison**
```python
# Wrong - compares indices instead of temperatures
while stack and i > stack[-1]:  # Comparing indices!
    prev_idx = stack.pop()
    answer[prev_idx] = i - prev_idx

# Correct - compare temperatures at those indices
while stack and temperatures[i] > temperatures[stack[-1]]:
    prev_idx = stack.pop()
    answer[prev_idx] = i - prev_idx
```

## Variations

| Variation | Difference | Difficulty |
|-----------|------------|------------|
| Next Greater Element I | Find next greater in circular array | Easy |
| Next Greater Element II | Circular array variation | Medium |
| Online Stock Span | Running computation of consecutive days with lower price | Medium |
| Largest Rectangle in Histogram | Use monotonic stack for 2D area calculation | Hard |

## Practice Checklist

- [ ] Solve with monotonic stack approach
- [ ] Test edge cases: increasing sequence, decreasing sequence
- [ ] Trace through example [73,74,75,71,69,72,76,73] manually
- [ ] Test with all same temperatures: [70,70,70]
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Explain why stack should store indices, not values
- [ ] Implement backward scan approach for comparison
- [ ] Draw the stack state at each step for an example
