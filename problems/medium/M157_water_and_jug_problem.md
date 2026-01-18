---
id: M157
old_id: I164
slug: water-and-jug-problem
title: Water and Jug Problem
difficulty: medium
category: medium
topics: ["math", "breadth-first-search"]
patterns: []
estimated_time_minutes: 30
frequency: low
related_problems: ["M020", "E001", "M152"]
prerequisites: ["greatest-common-divisor", "number-theory", "breadth-first-search", "state-space-search"]
---
# Water and Jug Problem

## Problem

This is a classic puzzle that dates back centuries, famously appearing in the movie "Die Hard with a Vengeance." You have two containers (jugs) with maximum capacities of `jug1Capacity` and `jug2Capacity` liters, and you have access to an unlimited water supply. Your challenge is to determine whether you can measure out exactly `targetCapacity` liters using only these two containers. Success means having `targetCapacity` liters in total between the two jugs at some point - it could be all in one jug, all in the other, or split between them. You're allowed three types of operations: fill either jug completely from the water source, dump all water from either jug, or pour from one jug into the other until either the receiving jug is full or the source jug is empty. For example, with a 3-liter jug and a 5-liter jug, you can measure 4 liters by filling the 5-liter jug, pouring it into the 3-liter jug (leaving 2 liters in the 5-liter jug), dumping the 3-liter jug, transferring the 2 liters into the 3-liter jug, filling the 5-liter jug again, and then topping off the 3-liter jug (which takes 1 liter), leaving exactly 4 liters in the 5-liter jug. The brute force approach of simulating all possible sequences of operations quickly becomes intractable. The key insight is that this is actually a number theory problem in disguise - you don't need to simulate pouring at all. Important edge cases include when the target exactly equals one jug's capacity (trivially true), when the target exceeds both jugs combined (impossible), and when the jug sizes have certain mathematical relationships.

## Why This Matters

This problem teaches you to recognize when brute-force simulation can be replaced by mathematical insight - a critical skill in algorithm design. The water jug problem is isomorphic to problems in chemistry and pharmaceuticals where you need to measure precise volumes or concentrations by combining solutions with fixed ratios, production scheduling where you need to achieve target quantities using machines with fixed batch sizes, and currency exchange where you want to reach exact amounts using bills of specific denominations. The underlying mathematical principle - Bézout's identity and the greatest common divisor (GCD) - powers the RSA encryption algorithm that secures online banking and e-commerce, appears in scheduling algorithms that find repeating patterns (like calendar systems determining when holidays align), and is fundamental in music theory for calculating harmonic intervals. Learning to spot when a problem reduces to GCD calculations rather than state-space search is a hallmark of experienced algorithm designers.

## Examples

**Example 1:**
- Input: `jug1Capacity = 3, jug2Capacity = 5, targetCapacity = 4`
- Output: `true`
- Explanation: It's possible to obtain exactly 4 liters using these two containers.

**Example 2:**
- Input: `jug1Capacity = 2, jug2Capacity = 6, targetCapacity = 5`
- Output: `false`
- Explanation: You cannot measure exactly 5 liters with containers of size 2 and 6.

**Example 3:**
- Input: `jug1Capacity = 1, jug2Capacity = 2, targetCapacity = 3`
- Output: `true`
- Explanation: By filling both containers, you obtain exactly 3 liters total.

## Constraints

- 1 <= jug1Capacity, jug2Capacity, targetCapacity <= 10⁶

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Mathematical Insight</summary>
This is actually a number theory problem in disguise. Think about what amounts you can create by filling, emptying, and pouring. The key insight: any amount you can measure must be a linear combination of the two jug capacities. What mathematical property determines which combinations are possible?
</details>

<details>
<summary>🎯 Hint 2: GCD and Bézout's Identity</summary>
By Bézout's identity, you can measure any amount that is a multiple of GCD(jug1Capacity, jug2Capacity). For example, with jugs of 3 and 5 liters, GCD(3,5) = 1, so you can measure 1, 2, 3, 4, 5, 6, 7, 8 liters (up to the sum of capacities). The target is achievable if:
1. target ≤ jug1Capacity + jug2Capacity (physical limit)
2. target % GCD(jug1Capacity, jug2Capacity) == 0 (mathematical requirement)
</details>

<details>
<summary>📝 Hint 3: Mathematical Solution</summary>
Algorithm (O(log n) using Euclidean algorithm):
```
1. If targetCapacity > jug1Capacity + jug2Capacity:
   return false  // Can't exceed total capacity

2. If targetCapacity == jug1Capacity OR targetCapacity == jug2Capacity:
   return true   // Fill exactly one jug

3. gcd = GCD(jug1Capacity, jug2Capacity)
4. return targetCapacity % gcd == 0
```

Alternative: BFS through state space (jug1_amount, jug2_amount), but this is O(j1 × j2) and can TLE.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| BFS State Space | O(j1 × j2) | O(j1 × j2) | Explore all possible states (amount1, amount2) |
| DFS with Memoization | O(j1 × j2) | O(j1 × j2) | Similar to BFS, cache visited states |
| **Mathematical (GCD)** | **O(log(min(j1, j2)))** | **O(1)** | Use Euclidean algorithm for GCD |

## Common Mistakes

**Mistake 1: BFS Without Mathematical Insight**
```python
# Wrong: O(j1 × j2) - can TLE for large inputs
from collections import deque

def canMeasureWater(jug1, jug2, target):
    if target > jug1 + jug2:
        return False

    visited = set()
    queue = deque([(0, 0)])  # (jug1_amount, jug2_amount)

    while queue:
        a, b = queue.popleft()
        if a + b == target:
            return True

        if (a, b) in visited:
            continue
        visited.add((a, b))

        # 6 possible operations
        states = [
            (jug1, b),      # Fill jug1
            (a, jug2),      # Fill jug2
            (0, b),         # Empty jug1
            (a, 0),         # Empty jug2
            (min(a + b, jug1), max(0, a + b - jug1)),  # Pour jug2 -> jug1
            (max(0, a + b - jug2), min(a + b, jug2))   # Pour jug1 -> jug2
        ]

        for state in states:
            if state not in visited:
                queue.append(state)

    return False
```

**Correct Approach:**
```python
# Correct: O(log n) using GCD
import math

def canMeasureWater(jug1, jug2, target):
    # Check physical constraint
    if target > jug1 + jug2:
        return False

    # Trivial cases
    if target == jug1 or target == jug2 or target == jug1 + jug2:
        return True

    # Mathematical solution using GCD
    gcd = math.gcd(jug1, jug2)
    return target % gcd == 0
```

**Mistake 2: Not Checking Physical Constraint**
```python
# Wrong: Forgets to check if target exceeds total capacity
def canMeasureWater(jug1, jug2, target):
    gcd = math.gcd(jug1, jug2)
    return target % gcd == 0  # Wrong! What if target > jug1 + jug2?

# Correct: Check both constraints
def canMeasureWater(jug1, jug2, target):
    if target > jug1 + jug2:
        return False
    gcd = math.gcd(jug1, jug2)
    return target % gcd == 0
```

**Mistake 3: Edge Case with Zero**
```python
# Wrong: Doesn't handle target = 0
def canMeasureWater(jug1, jug2, target):
    if target > jug1 + jug2:
        return False
    gcd = math.gcd(jug1, jug2)
    return target % gcd == 0  # What if target = 0?

# Correct: Target 0 is always achievable (empty both jugs)
def canMeasureWater(jug1, jug2, target):
    if target == 0:
        return True
    if target > jug1 + jug2:
        return False
    gcd = math.gcd(jug1, jug2)
    return target % gcd == 0
```

## Variations

| Variation | Description | Key Difference |
|-----------|-------------|----------------|
| Three Jugs | Three containers instead of two | GCD of three numbers |
| Minimum Steps | Find minimum operations to reach target | BFS with step counting |
| All Reachable Amounts | List all measurable amounts ≤ limit | Generate multiples of GCD |
| Fractional Capacity | Jugs with decimal capacities | Use rational GCD algorithm |
| Path Reconstruction | Show sequence of operations | BFS with parent tracking |

## Practice Checklist

- [ ] Day 1: Implement mathematical GCD solution
- [ ] Day 2: Implement BFS solution for understanding
- [ ] Day 7: Solve three jugs variation
- [ ] Day 14: Solve minimum steps variation with BFS
- [ ] Day 30: Solve without looking at hints

**Strategy**: See [Mathematical Reasoning](../strategies/fundamentals/mathematical-thinking.md)
