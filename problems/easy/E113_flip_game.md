---
id: E113
old_id: I092
slug: flip-game
title: Flip Game
difficulty: easy
category: easy
topics: ["string", "simulation"]
patterns: ["string-generation"]
estimated_time_minutes: 15
frequency: low
related_problems: ["M294", "M293", "E344"]
prerequisites: ["string-manipulation", "list-generation", "iteration"]
strategy_ref: ../strategies/data-structures/string.md
---
# Flip Game

## Problem

You're playing a string transformation game with `+` and `-` symbols. The game involves finding all possible states reachable by making exactly one valid move from the current state.

Given a string `currentState` containing only `'+'` and `'-'` characters, a valid move consists of flipping any two consecutive `"++"` characters to `"--"`. Your task is to generate and return all distinct strings that result from making exactly one such move. If no valid moves exist (no `"++"` pattern appears in the string), return an empty list.

For example, with `"+++++"`, you could flip positions (0,1), (1,2), (2,3), or (3,4) to create four different resulting states. Each flip is independent; you're not chaining multiple moves together. The order of results in your output doesn't matter.

The key algorithmic challenge is efficiency in string construction. Since strings are typically immutable in most languages, each flip requires creating a new string. You'll need to scan the input string linearly, identify valid flip positions, and construct the resulting strings without modifying the original.

Think about the edge cases: what if the string is empty? What if it has only one character? What if it contains only `-` characters or only a single `+`? These situations have no valid moves and should return an empty list.

## Why This Matters

This problem introduces game state generation, a fundamental concept in game tree exploration, chess engines, and reinforcement learning. The ability to enumerate all possible next states from a current state is crucial for minimax algorithms, Monte Carlo tree search, and breadth-first search in game playing AI.

String generation with immutability constraints mirrors real-world scenarios in functional programming, where data structures cannot be modified in place. Learning to efficiently create new strings while preserving the original teaches memory management and algorithmic thinking in immutable data paradigms.

The pattern of "find all occurrences of X and generate variations" appears in DNA sequence analysis (finding mutation sites), text editing (find and replace variations), compiler optimization (instruction reordering), and code refactoring tools (finding all locations where a change could be applied).

## Examples

**Example 1:**
- Input: `currentState = "++++"`
- Output: `["--++","+--+","++--"]`

**Example 2:**
- Input: `currentState = "+"`
- Output: `[]`

## Constraints

- 1 <= currentState.length <= 500
- currentState[i] is either '+' or '-'.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Scan for Valid Positions</summary>

A valid move requires finding two consecutive '+' characters. Scan through the string looking for the pattern "++". Each occurrence represents a possible move. How many possible moves can you find in a string of length n?

</details>

<details>
<summary>🎯 Hint 2: Generate Each Possible Result</summary>

For each position i where currentState[i:i+2] == "++", create a new string by replacing those two characters with "--". Since strings are immutable in most languages, you'll need to construct a new string for each valid move. You can use string slicing or character array manipulation.

</details>

<details>
<summary>📝 Hint 3: Linear Scan Implementation</summary>

Pseudocode:
```
result = []
for i from 0 to len(currentState) - 2:
    if currentState[i] == '+' and currentState[i+1] == '+':
        // Create new string with flip at position i
        newState = currentState[0:i] + "--" + currentState[i+2:]
        result.append(newState)
return result
```

This approach scans once through the string and generates all possible next states.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Nested Loops | O(n² * k) | O(n * k) | Generate all states then filter valid - inefficient |
| **Linear Scan** | **O(n² )** | **O(n * k)** | Optimal: O(n) to scan, O(n) per string creation, k possible moves |

Where n = string length, k = number of "++" patterns (at most n-1)

## Common Mistakes

### Mistake 1: Modifying String In-Place

**Wrong:**
```python
def generatePossibleNextMoves(currentState):
    result = []
    for i in range(len(currentState) - 1):
        if currentState[i:i+2] == "++":
            currentState = currentState[:i] + "--" + currentState[i+2:]
            result.append(currentState)
            # String is now modified for next iterations!
    return result
```

**Correct:**
```python
def generatePossibleNextMoves(currentState):
    result = []
    for i in range(len(currentState) - 1):
        if currentState[i:i+2] == "++":
            newState = currentState[:i] + "--" + currentState[i+2:]
            result.append(newState)
            # currentState remains unchanged
    return result
```

Each move should be independent; don't modify the original state.

### Mistake 2: Missing Adjacent Check

**Wrong:**
```python
def generatePossibleNextMoves(currentState):
    result = []
    for i in range(len(currentState)):
        if currentState[i] == '+':
            # Only checking single character, not adjacent pair
            newState = currentState[:i] + "-" + currentState[i+1:]
            result.append(newState)
    return result
```

**Correct:**
```python
def generatePossibleNextMoves(currentState):
    result = []
    for i in range(len(currentState) - 1):
        if currentState[i] == '+' and currentState[i+1] == '+':
            newState = currentState[:i] + "--" + currentState[i+2:]
            result.append(newState)
    return result
```

Must check for two consecutive '+' characters, not just one.

### Mistake 3: Off-By-One in Loop Range

**Wrong:**
```python
def generatePossibleNextMoves(currentState):
    result = []
    for i in range(len(currentState)):  # Goes one too far
        if currentState[i:i+2] == "++":  # Could access beyond string
            newState = currentState[:i] + "--" + currentState[i+2:]
            result.append(newState)
    return result
```

**Correct:**
```python
def generatePossibleNextMoves(currentState):
    result = []
    for i in range(len(currentState) - 1):  # Stop one before end
        if currentState[i:i+2] == "++":
            newState = currentState[:i] + "--" + currentState[i+2:]
            result.append(newState)
    return result
```

Loop should go to `len(currentState) - 1` since we're checking pairs.

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| Flip Game II | Determine if current player can guarantee a win | Medium |
| Count Flips | Count number of possible moves instead of generating | Easy |
| K Consecutive | Flip k consecutive characters instead of 2 | Easy |
| Multi-Pattern | Multiple different flip patterns allowed | Medium |
| Optimal Flip Sequence | Find sequence leading to longest game | Hard |

## Practice Checklist

- [ ] Solve using linear scan approach (10 min)
- [ ] Handle edge case: no "++" found (5 min)
- [ ] Handle edge case: string length 0 or 1 (5 min)
- [ ] Review after 24 hours
- [ ] Review after 1 week
- [ ] Try Flip Game II for game theory practice

**Strategy**: See [String Manipulation](../strategies/data-structures/string.md)
