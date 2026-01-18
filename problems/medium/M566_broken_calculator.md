---
id: M566
old_id: A458
slug: broken-calculator
title: Broken Calculator
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Broken Calculator

## Problem

Picture yourself with a calculator that only has two working buttons. You need to transform one number into another using the fewest button presses possible. It's like solving a puzzle where every move counts.

You have a broken calculator displaying an integer `startValue`. This calculator supports only two operations:
- **Double**: Multiply the displayed number by 2
- **Decrement**: Subtract 1 from the displayed number

Given integers `startValue` and `target`, determine the minimum number of operations needed to transform `startValue` into `target`.

For example, if you start at 3 and want to reach 10, you could double (3 → 6), decrement (6 → 5), then double again (5 → 10). That's 3 operations. But can you do better?


## Why This Matters

This problem mirrors real-world optimization challenges where you have limited actions available and need to reach a goal efficiently. It appears in game AI (finding shortest paths with restricted moves), compiler optimizations (transforming code using allowed operations), numerical algorithms (computing values using only addition and doubling in hardware that lacks multiplication), and resource management systems (reaching target inventory levels with limited actions). The greedy "work backwards" approach taught here is powerful for many reversible transformation problems - from solving puzzle games like Rubik's cube to optimizing state transitions in embedded systems with constrained instruction sets.

## Examples

**Example 1:**
- Input: `startValue = 2, target = 3`
- Output: `2`
- Explanation: Use double operation and then decrement operation {2 -> 4 -> 3}.

**Example 2:**
- Input: `startValue = 5, target = 8`
- Output: `2`
- Explanation: Use decrement and then double {5 -> 4 -> 8}.

**Example 3:**
- Input: `startValue = 3, target = 10`
- Output: `3`
- Explanation: Use double, decrement and double {3 -> 6 -> 5 -> 10}.

## Constraints

- 1 <= startValue, target <= 10⁹

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Instead of going forward from startValue to target, work backwards from target to startValue. This transforms the operations: instead of "multiply by 2" or "subtract 1", you use "divide by 2 (if even)" or "add 1".
</details>

<details>
<summary>🎯 Main Approach</summary>
Work backwards from target to startValue. If target is even, divide by 2. If target is odd, add 1 (to make it even). Continue until target equals startValue. This greedy approach is optimal because division reduces the value faster than addition.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
When target is less than startValue, you can only subtract (or equivalently, add when going backwards). The remaining operations needed is simply (startValue - target). This handles the base case efficiently.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| BFS Forward | O(target) | O(target) | Explores many states, may timeout |
| Optimal (Reverse Greedy) | O(log target) | O(1) | Each division halves the value |

## Common Mistakes

1. **Working Forward Instead of Backward**
   ```python
   # Wrong: BFS from start to target (inefficient)
   queue = [(startValue, 0)]
   while queue:
       val, steps = queue.pop(0)
       if val == target:
           return steps
       queue.append((val * 2, steps + 1))
       queue.append((val - 1, steps + 1))

   # Correct: Work backward from target
   steps = 0
   while target > startValue:
       if target % 2 == 0:
           target //= 2
       else:
           target += 1
       steps += 1
   return steps + (startValue - target)
   ```

2. **Not Handling target < startValue**
   ```python
   # Wrong: Doesn't handle when target is smaller
   while target != startValue:
       if target % 2 == 0:
           target //= 2
       else:
           target += 1
       steps += 1

   # Correct: Add base case
   steps = 0
   while target > startValue:
       # ... operations
   return steps + (startValue - target)  # Handle remaining difference
   ```

3. **Trying to Optimize Even Division**
   ```python
   # Wrong: Trying to skip odd numbers incorrectly
   while target > startValue:
       steps += target % 2  # Add if odd
       target = (target + target % 2) // 2  # Complex logic

   # Correct: Simple greedy approach
   while target > startValue:
       if target % 2 == 0:
           target //= 2
       else:
           target += 1
       steps += 1
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Minimum Operations to Reduce X to Zero | Medium | Can subtract from both ends of array |
| Integer Replacement | Medium | Similar problem: replace n with n/2 or n+1/n-1 |
| Reach a Number | Medium | Use +n or -n to reach target on number line |
| 2 Keys Keyboard | Medium | Copy and paste operations to get n 'A's |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Greedy Algorithms](../../strategies/patterns/greedy.md)
