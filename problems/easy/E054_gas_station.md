---
id: E054
old_id: F134
slug: gas-station
title: Gas Station
difficulty: easy
category: easy
topics: ["array", "greedy"]
patterns: ["greedy", "circular-array"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E053", "M134", "E045"]
prerequisites: ["arrays", "greedy-algorithms", "circular-traversal"]
strategy_ref: ../strategies/patterns/greedy.md
---
# Gas Station

## Problem

You're driving around a circular route with `n` gas stations. At station `i`, you can fill up `gas[i]` units of fuel, and it costs `cost[i]` units to travel to the next station.

Your car starts with an empty tank. Find the **starting station index** where you can complete the circuit (visit all stations and return to start), or return -1 if impossible.

**Key rules:**
- The route is circular: from station n-1, you go back to station 0
- You start at the chosen station with an empty tank
- At each station, you fill up completely, then drive to the next station
- Your tank can hold unlimited gas

**Example:** With gas = [1,2,3,4,5] and cost = [3,4,5,1,2]:
- Starting at station 3: tank = 0+4=4, drive to station 4 (tank = 4-1+5=8), drive to station 0 (tank = 8-2+1=7), and so on...
- Station 3 works, so return 3

**Watch out for:** If sum(gas) < sum(cost), it's impossible to complete the circuit no matter where you start. This is your first check.

## Why This Matters

This problem teaches a powerful greedy insight: if you can't reach station B starting from station A, then NO station between A and B can reach B either. This "skip forward" optimization transforms a naive O(n²) solution into an elegant O(n) single-pass algorithm.

The circular array pattern appears in scheduling problems, resource allocation, and ring buffer implementations. The underlying principle - proving that a local failure implies a global impossibility - is a common technique in greedy algorithm design.

## Examples

**Example 1:**
- Input: `gas = [1,2,3,4,5], cost = [3,4,5,1,2]`
- Output: `3`
- Explanation: Start at station 3 (index 3) and fill up with 4 unit of gas. Your tank = 0 + 4 = 4
Travel to station 4. Your tank = 4 - 1 + 5 = 8
Travel to station 0. Your tank = 8 - 2 + 1 = 7
Travel to station 1. Your tank = 7 - 3 + 2 = 6
Travel to station 2. Your tank = 6 - 4 + 3 = 5
Travel to station 3. The cost is 5. Your gas is just enough to travel back to station 3.
Therefore, return 3 as the starting index.

**Example 2:**
- Input: `gas = [2,3,4], cost = [3,4,3]`
- Output: `-1`
- Explanation: You can't start at station 0 or 1, as there is not enough gas to travel to the next station.
Let's start at station 2 and fill up with 4 unit of gas. Your tank = 0 + 4 = 4
Travel to station 0. Your tank = 4 - 3 + 2 = 3
Travel to station 1. Your tank = 3 - 3 + 3 = 3
You cannot travel back to station 2, as it requires 4 unit of gas but you only have 3.
Therefore, you can't travel around the circuit once no matter where you start.

## Constraints

- n == gas.length == cost.length
- 1 <= n <= 10⁵
- 0 <= gas[i], cost[i] <= 10⁴

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?

## Approach Hints

<details>
<summary>💡 Hint 1: Necessary Condition</summary>

Think about the total gas available and total cost needed. If sum(gas) < sum(cost), is it possible to complete the circuit? What does this tell you about the problem's feasibility?

This gives you a quick check before attempting to find the starting point.

</details>

<details>
<summary>🎯 Hint 2: Greedy Insight</summary>

Key insight: If you start at station A and can't reach station B (you run out of gas between them), then NO station between A and B can be a valid starting point either. Why? Because if you started at some station C between A and B, you'd have less gas when reaching the same point where you failed.

This means: when you fail at station i, you can skip all stations up to i and try starting from i+1.

</details>

<details>
<summary>📝 Hint 3: One-Pass Algorithm</summary>

```
function canCompleteCircuit(gas, cost):
    1. Check if sum(gas) < sum(cost):
         if yes, return -1 (impossible)

    2. Initialize:
         start = 0
         current_tank = 0

    3. For i from 0 to n-1:
         a. current_tank += gas[i] - cost[i]

         b. If current_tank < 0:
              # Can't reach next station from current start
              start = i + 1
              current_tank = 0

    4. Return start
```

Why does this work? If sum(gas) >= sum(cost) and we find a starting point where we never go negative, that starting point must work for the complete circuit.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Try each station, simulate full circuit |
| **Greedy (one pass)** | **O(n)** | **O(1)** | Single pass with smart skipping |
| Kadane's variant | O(n) | O(1) | Transform to max subarray problem |

## Common Mistakes

### 1. Not checking total feasibility first
```python
# WRONG: Missing the impossible case check
def canCompleteCircuit(gas, cost):
    n = len(gas)
    for start in range(n):
        tank = 0
        for i in range(n):
            idx = (start + i) % n
            tank += gas[idx] - cost[idx]
            if tank < 0:
                break
        if tank >= 0:
            return start
    return -1
# Works but O(n²)

# CORRECT: Check feasibility first, then one pass
def canCompleteCircuit(gas, cost):
    if sum(gas) < sum(cost):
        return -1

    start = 0
    tank = 0
    for i in range(len(gas)):
        tank += gas[i] - cost[i]
        if tank < 0:
            start = i + 1
            tank = 0
    return start
```

### 2. Simulating the full circuit
```python
# WRONG: Simulating full circuit for each starting point
def canCompleteCircuit(gas, cost):
    n = len(gas)
    for start in range(n):
        tank = 0
        success = True
        for steps in range(n):
            i = (start + steps) % n
            tank += gas[i] - cost[i]
            if tank < 0:
                success = False
                break
        if success:
            return start
    return -1
# O(n²) - unnecessary

# CORRECT: One pass greedy
def canCompleteCircuit(gas, cost):
    if sum(gas) < sum(cost):
        return -1
    start, tank = 0, 0
    for i in range(len(gas)):
        tank += gas[i] - cost[i]
        if tank < 0:
            start = i + 1
            tank = 0
    return start
```

### 3. Not resetting tank when updating start
```python
# WRONG: Not resetting tank
def canCompleteCircuit(gas, cost):
    if sum(gas) < sum(cost):
        return -1
    start = 0
    tank = 0
    for i in range(len(gas)):
        tank += gas[i] - cost[i]
        if tank < 0:
            start = i + 1
            # Missing: tank = 0
    return start

# CORRECT: Reset tank when changing start
def canCompleteCircuit(gas, cost):
    if sum(gas) < sum(cost):
        return -1
    start = 0
    tank = 0
    for i in range(len(gas)):
        tank += gas[i] - cost[i]
        if tank < 0:
            start = i + 1
            tank = 0  # Important!
    return start
```

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| Multiple circuits | Complete k circuits | Track gas over k*n stations |
| Return all valid starts | All possible starting points | Continue search instead of returning first |
| Maximum distance | How far can you go | Track maximum stations reachable |
| Minimum starting gas | Min initial gas needed | Track minimum tank value reached |
| Bidirectional circuit | Can go either direction | Try both clockwise and counterclockwise |

## Practice Checklist

**Correctness:**
- [ ] Handles impossible case (sum(gas) < sum(cost))
- [ ] Handles single station (returns 0 if gas[0] >= cost[0])
- [ ] Handles all stations equal (gas[i] == cost[i])
- [ ] Returns correct starting index
- [ ] Works with circular indexing

**Interview Readiness:**
- [ ] Can explain greedy insight in 2 minutes
- [ ] Can code solution in 10 minutes
- [ ] Can prove why one-pass works
- [ ] Can explain why skipping works

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve and explain proof
- [ ] Day 14: Explain to someone
- [ ] Day 30: Quick review

---

**Strategy**: See [Greedy Pattern](../../strategies/patterns/greedy.md)
