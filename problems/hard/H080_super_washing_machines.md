---
id: H080
old_id: A015
slug: super-washing-machines
title: Super Washing Machines
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# Super Washing Machines

## Problem

Consider `n` washing machines positioned in a linear arrangement. Each machine initially contains a certain number of items (or may be empty).

During a single operation, you may select any number of machines (between `1` and `n`), and simultaneously transfer one item from each selected machine to one of its immediate neighbors.

You are given an integer array `machines` where each element indicates the count of items in the corresponding machine from left to right. Calculate the minimum number of operations needed to equalize the item count across all machines. If achieving equal distribution is impossible, return `-1`.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `machines = [1,0,5]`
- Output: `3`
- Explanation: Operation sequence leads to distribution [1,1,4] -> [2,1,3] -> [2,2,2]

**Example 2:**
- Input: `machines = [0,3,0]`
- Output: `2`
- Explanation: Operation sequence leads to distribution [1,2,0] -> [1,1,1]

**Example 3:**
- Input: `machines = [0,2,0]`
- Output: `-1`
- Explanation: Equal distribution across all three machines cannot be achieved.

## Constraints

- n == machines.length
- 1 <= n <= 10⁴
- 0 <= machines[i] <= 10⁵

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

The key insight is that the answer is determined by two constraints:
1. **Individual bottleneck**: The maximum number of items any single machine must pass through it (either giving or receiving)
2. **Flow bottleneck**: The maximum flow that must pass any boundary between left and right partitions

Calculate both and take the maximum. The problem is about identifying the critical bottleneck, not simulating the actual transfers.

</details>

<details>
<summary>🎯 Main Approach</summary>

Mathematical analysis approach:
1. First check if equal distribution is possible: sum must be divisible by n
2. Calculate target = sum / n
3. For each machine i, calculate how many items it needs to give/receive: machines[i] - target
4. Calculate prefix sum to determine flow across each boundary
5. The answer is max of:
   - Maximum absolute prefix sum (max flow across any boundary)
   - Maximum individual machine deficit/surplus

Why this works: In one operation, we can move items across any boundary, so we need enough operations to handle the worst boundary. Also, if one machine has a huge surplus, it needs that many operations to distribute.

</details>

<details>
<summary>⚡ Optimization Tip</summary>

The problem can be solved in O(n) with a single pass:
- Track running sum (flow across boundaries)
- Track max absolute running sum (worst boundary flow)
- Track max individual machine deficit (machines[i] - target)
- Return max(max_flow, max_individual)

No simulation needed - pure math based on flow analysis.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Simulation | Infinite | O(n) | Actually simulating transfers doesn't work - complex dependencies |
| Flow Analysis | O(n) | O(1) | Single pass calculating flows and bottlenecks |
| Optimal | O(n) | O(1) | Cannot improve - must examine all machines |

## Common Mistakes

1. **Trying to simulate the actual operations**
   ```python
   # Wrong: Simulation approach - doesn't work
   def super_washing_machines(machines):
       target = sum(machines) // len(machines)
       operations = 0
       while machines != [target] * len(machines):
           # Try to move items... complex logic, doesn't lead to answer
           operations += 1
       return operations

   # Correct: Analyze flow mathematically
   def super_washing_machines(machines):
       total = sum(machines)
       n = len(machines)
       if total % n != 0:
           return -1

       target = total // n
       max_ops = 0
       flow = 0

       for machine in machines:
           diff = machine - target
           flow += diff
           max_ops = max(max_ops, abs(flow), diff)

       return max_ops
   ```

2. **Not checking if equal distribution is possible**
   ```python
   # Wrong: Not validating sum divisibility
   target = sum(machines) // len(machines)
   # If sum not divisible, target is wrong

   # Correct: Check first
   if sum(machines) % len(machines) != 0:
       return -1
   target = sum(machines) // len(machines)
   ```

3. **Only considering individual machine loads**
   ```python
   # Wrong: Only looking at max surplus/deficit
   target = sum(machines) // len(machines)
   max_ops = max(abs(m - target) for m in machines)
   return max_ops
   # Misses cases where flow across boundaries is the bottleneck

   # Correct: Consider both individual AND flow constraints
   max_ops = 0
   flow = 0
   for machine in machines:
       diff = machine - target
       flow += diff
       # Max of: individual constraint, flow constraint
       max_ops = max(max_ops, abs(flow), diff)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Minimum Moves to Equal Array Elements | Medium | Can only increment, simpler problem |
| Water and Jug Problem | Medium | Different resource distribution problem |
| Pour Water | Medium | Gravity-based flow instead of manual transfer |
| Minimum Operations to Make Array Equal | Medium | Similar balancing concept |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (impossible distribution, zero machines)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Mathematical Analysis](../../strategies/patterns/math.md)
