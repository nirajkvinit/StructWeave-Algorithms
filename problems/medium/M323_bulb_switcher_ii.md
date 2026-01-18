---
id: M323
old_id: A139
slug: bulb-switcher-ii
title: Bulb Switcher II
difficulty: medium
category: medium
topics: ["math", "bit-manipulation"]
patterns: []
estimated_time_minutes: 30
frequency: low
related_problems: ["M319", "E672", "M672"]
prerequisites: ["bit-manipulation", "pattern-recognition", "modular-arithmetic"]
---
# Bulb Switcher II

## Problem

Imagine a room with `n` bulbs numbered 1 to n, all initially turned on. You have four buttons on the wall, each affecting different bulbs when pressed:

- **Button 1**: Flips all bulbs (on becomes off, off becomes on)
- **Button 2**: Flips bulbs at even positions (2, 4, 6, ...)
- **Button 3**: Flips bulbs at odd positions (1, 3, 5, ...)
- **Button 4**: Flips bulbs at positions of the form 3k+1 for k ≥ 0 (positions 1, 4, 7, 10, ...)

You must press buttons exactly `presses` times total. You can press the same button multiple times, and you can choose any sequence of button presses. Your task is to determine how many distinct final bulb configurations are achievable.

The challenge is recognizing that this isn't a simulation problem. With up to 1000 presses and 1000 bulbs, simulating all possible sequences would be impossibly slow. Instead, the key insight is mathematical: pressing the same button twice cancels out (since toggling twice returns to the original state), and the order of button presses doesn't matter (flipping odds then evens is the same as flipping evens then odds).

This means only the parity matters: is each button pressed an odd number of times or an even number of times? With 4 buttons, there are at most 2⁴ = 16 possible states. However, not all states are achievable with a given number of presses. For example, with just 1 press, you can only press one button, giving you 4 possible states, not 16.

The problem further simplifies because the bulb pattern repeats every 3 positions due to button 4's behavior. This means you only need to track the first 3 bulbs to determine the entire configuration.

## Why This Matters

This problem teaches pattern recognition and mathematical reasoning over brute-force simulation. Many real-world systems have similar properties where actions commute (order doesn't matter) and are idempotent (repeating cancels out), such as XOR operations in cryptography, set operations in databases, and toggle switches in hardware control systems.

The insight that "only parity matters" appears in bit manipulation problems, parity checking in error detection, and state minimization in finite automata. Learning to identify when a problem has hidden structure that reduces its complexity is a crucial algorithmic skill.

This problem also demonstrates the power of mathematical analysis: a seemingly complex simulation with billions of possible sequences reduces to a simple formula based on n and presses.

## Examples

**Example 1:**
- Input: `n = 1, presses = 1`
- Output: `2`
- Explanation: Possible configurations:
- [off] using button 1
- [on] using button 2

**Example 2:**
- Input: `n = 2, presses = 1`
- Output: `3`
- Explanation: Possible configurations:
- [off, off] using button 1
- [on, off] using button 2
- [off, on] using button 3

**Example 3:**
- Input: `n = 3, presses = 1`
- Output: `4`
- Explanation: Possible configurations:
- [off, off, off] using button 1
- [off, on, off] using button 2
- [on, off, on] using button 3
- [off, on, on] using button 4

## Constraints

- 1 <= n <= 1000
- 0 <= presses <= 1000

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Recognize Button Press Properties</summary>

Key observations:
1. **Pressing the same button twice cancels out** (toggling twice = no change)
2. **Order doesn't matter** (Button 1 then Button 2 = Button 2 then Button 1)
3. **Only parity matters**: What matters is whether each button is pressed an even or odd number of times

This means we only care about 4 binary decisions (each button: pressed odd times or even times), giving at most 2⁴ = 16 possible states.

</details>

<details>
<summary>Hint 2: Analyze Small Cases and Patterns</summary>

The problem simplifies dramatically based on n and presses:

**For presses:**
- `presses = 0`: Only 1 state (all on)
- `presses = 1`: Can press 1 button (4 states maximum)
- `presses = 2`: Can press 2 different buttons or same button twice (more combinations)
- `presses >= 3`: Can achieve all valid combinations

**For n:**
- `n = 1`: Only 3 first bulbs matter (positions 1, 2, 3)
- `n = 2`: Patterns determined by first 2 bulbs
- `n >= 3`: Full pattern space

The bulb pattern repeats every 3 positions due to button 4's pattern.

</details>

<details>
<summary>Hint 3: Use Pattern Enumeration</summary>

Rather than simulating, enumerate valid patterns based on constraints:

```python
def flipLights(n, presses):
    # For 0 presses, only 1 state
    if presses == 0:
        return 1

    # For small n and presses, enumerate manually
    if n == 1:
        return 2 if presses == 1 else 2  # [on], [off]

    if n == 2:
        if presses == 1:
            return 3  # Can achieve 3 states
        else:
            return 4  # presses >= 2: all combinations

    # For n >= 3
    if presses == 1:
        return 4
    elif presses == 2:
        return 7
    else:  # presses >= 3
        return 8
```

The magic numbers come from manual enumeration of achievable states.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Pattern Recognition | O(1) | O(1) | Direct formula based on n and presses |
| BFS/DFS Enumeration | O(2⁴ × p) | O(2⁴) | Explore state space; p = presses |
| Brute Force Simulation | O(4ᵖ) | O(n) | Try all button sequences; too slow |

## Common Mistakes

**Mistake 1: Simulating All Button Press Sequences**
```python
# Wrong: Exponential time complexity
def flipLights(n, presses):
    results = set()
    def dfs(state, remaining):
        if remaining == 0:
            results.add(tuple(state))
            return
        for button in range(4):
            new_state = apply_button(state, button)
            dfs(new_state, remaining - 1)
    # This is O(4^presses)

# Correct: Use pattern recognition (O(1))
```

**Mistake 2: Not Recognizing That Parity Matters**
```python
# Wrong: Treating sequence order as important
# "Button 1, Button 2" different from "Button 2, Button 1"

# Correct: Only care about how many times each button pressed (mod 2)
# Both sequences give same final state
```

**Mistake 3: Ignoring Repeating Patterns**
```python
# Wrong: Thinking all n bulbs need separate analysis
def flipLights(n, presses):
    # Analyzing each bulb position separately for large n

# Correct: Pattern repeats every 3 positions
# Only need to consider first 3 bulbs
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| k different button types | Hard | Generalize to k buttons with different patterns |
| Count reachable states with exactly k on | Hard | Additional constraint on count |
| Minimum presses to reach target state | Medium | Reverse problem - find shortest path |
| Buttons affect different patterns | Medium | Changed button definitions |
| Bulbs start in random state | Medium | Different initial condition |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Analyzed time/space complexity
- [ ] Solved without hints
- [ ] Tested edge cases (presses=0, n=1, large n)
- [ ] Reviewed alternative approaches
- [ ] Practiced again after 1 day
- [ ] Practiced again after 1 week
- [ ] Could explain solution to others
