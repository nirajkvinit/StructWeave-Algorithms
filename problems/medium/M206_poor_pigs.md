---
id: M206
old_id: I257
slug: poor-pigs
title: Poor Pigs
difficulty: medium
category: medium
topics: ["math", "combinatorics"]
patterns: ["mathematical-insight", "information-theory"]
estimated_time_minutes: 30
frequency: low
related_problems: ["M292", "E231", "M372"]
prerequisites: ["logarithms", "information-theory", "combinatorics"]
---
# Poor Pigs

## Problem

You have `buckets` containers, exactly one of which is poisoned. Using pigs as test subjects, determine the minimum number of pigs needed to identify the poisoned bucket within `minutesToTest` minutes. When a pig drinks poison, it dies after exactly `minutesToDie` minutes.

The testing process works as follows: you can have pigs drink from multiple buckets simultaneously, and multiple pigs can share buckets. After giving pigs their drinks, you must wait `minutesToDie` minutes to see which ones die. Based on the pattern of deaths, you deduce which bucket was poisoned. If time permits, you can conduct multiple rounds of testing.

This is fundamentally an information theory problem disguised as a logic puzzle. Think about how many distinct states each pig can be in. With one testing round, each pig has two states: alive or dead. But with multiple rounds, each pig can die in round 1, round 2, round 3, or survive all rounds—giving it multiple states. The number of states per pig determines how many buckets you can distinguish.

For example, with 2 pigs and 1 testing round (2 states each), you can identify among 2² = 4 buckets. The mathematical relationship involves logarithms and base conversion, connecting to how binary numbers encode information.

## Why This Matters

This problem teaches information theory principles that underlie error detection, fault isolation in distributed systems, and efficient encoding schemes. The concept of using multiple test subjects (or sensors) to identify failures among many components appears in network diagnostics, hardware testing, and quality control systems. Understanding how to maximize information gain from limited tests is crucial in scenarios like A/B testing with limited samples or debugging systems with expensive operations. The logarithmic relationship between states and entities is the same principle behind binary search and tree height calculations, making this a conceptual foundation for understanding computational efficiency.

## Examples

**Example 1:**
- Input: `buckets = 4, minutesToDie = 15, minutesToTest = 15`
- Output: `2`
- Explanation: With only one testing round available, two pigs can distinguish between 4 buckets. Give pig 1 buckets 1 and 2, and pig 2 buckets 2 and 3. Based on which pigs die, you can identify the poisoned bucket: only pig 1 dies means bucket 1, only pig 2 dies means bucket 3, both die means bucket 2, neither dies means bucket 4.

**Example 2:**
- Input: `buckets = 4, minutesToDie = 15, minutesToTest = 30`
- Output: `2`
- Explanation: Two testing rounds are possible. In round 1, give pig 1 bucket 1 and pig 2 bucket 2. If a pig dies, you've found the poison. If both survive, conduct round 2 with pig 1 testing bucket 3 and pig 2 testing bucket 4.

## Constraints

- 1 <= buckets <= 1000
- 1 <= minutesToDie <= minutesToTest <= 100

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Information Theory Perspective</summary>

Think of this as an information encoding problem. Each pig can be in multiple states depending on when it dies (or doesn't die). If you have T testing rounds possible, each pig can be in T+1 states: dies in round 1, round 2, ..., round T, or survives all rounds. With p pigs, you can distinguish (T+1)^p different scenarios.

</details>

<details>
<summary>🎯 Hint 2: States Per Pig</summary>

Calculate the number of testing rounds: tests = minutesToTest / minutesToDie. Each pig can provide tests + 1 states of information (dies at each test time, or doesn't die). With p pigs, you can distinguish (tests + 1)^p buckets. Find the minimum p where (tests + 1)^p >= buckets.

</details>

<details>
<summary>📝 Hint 3: Mathematical Formula</summary>

```
tests = minutesToTest // minutesToDie
states_per_pig = tests + 1

# Find minimum pigs where:
# (states_per_pig)^pigs >= buckets

# Using logarithm:
# pigs >= log(buckets) / log(states_per_pig)

import math
pigs = math.ceil(math.log(buckets) / math.log(states_per_pig))

# Handle edge case: if buckets == 1, return 0
```

For example: 4 buckets, 1 test round → states_per_pig = 2
Need: 2^p >= 4 → p = 2

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Simulation/Brute Force | Exponential | O(1) | Trying all combinations |
| Mathematical Formula | O(1) | O(1) | Direct calculation using logarithm |
| Iterative Power Check | O(log buckets) | O(1) | Loop until condition met |

**Recommended approach:** Mathematical formula with logarithm (O(1) time, O(1) space)

## Common Mistakes

### Mistake 1: Thinking only in binary (2 states per pig)
**Wrong:**
```python
def poorPigs(buckets, minutesToDie, minutesToTest):
    # Assuming each pig only has 2 states (dead or alive)
    import math
    return math.ceil(math.log2(buckets))
# Wrong: ignores the fact that pigs can die at different times
```

**Correct:**
```python
def poorPigs(buckets, minutesToDie, minutesToTest):
    if buckets == 1:
        return 0

    import math
    tests = minutesToTest // minutesToDie
    states_per_pig = tests + 1

    # Each pig can be in (tests + 1) states
    return math.ceil(math.log(buckets) / math.log(states_per_pig))
```

### Mistake 2: Off-by-one error in number of states
**Wrong:**
```python
# Counting only the rounds, not including "survives all"
tests = minutesToTest // minutesToDie
states_per_pig = tests  # Wrong: should be tests + 1
```

**Correct:**
```python
tests = minutesToTest // minutesToDie
states_per_pig = tests + 1  # +1 for "survives all rounds"
# Example: 1 test round gives 2 states (dies, survives)
```

### Mistake 3: Not handling edge cases
**Wrong:**
```python
def poorPigs(buckets, minutesToDie, minutesToTest):
    import math
    tests = minutesToTest // minutesToDie
    states_per_pig = tests + 1
    return math.ceil(math.log(buckets) / math.log(states_per_pig))
# Fails for buckets == 1 (log(1) = 0, division issues)
```

**Correct:**
```python
def poorPigs(buckets, minutesToDie, minutesToTest):
    if buckets == 1:
        return 0  # No pigs needed for single bucket

    import math
    tests = minutesToTest // minutesToDie
    states_per_pig = tests + 1

    return math.ceil(math.log(buckets) / math.log(states_per_pig))
```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Binary Search for Poisoned Bottle | Easy | Simple binary search with 2 states |
| Find Fake Coin with Balance | Medium | Similar information theory problem |
| Minimum Tests for n Conditions | Hard | Generalized information encoding |
| Egg Drop Problem | Medium | Similar optimization with limited resources |

## Practice Checklist

- [ ] First attempt (after reading problem)
- [ ] Understood information theory concept
- [ ] Recognized states per pig formula
- [ ] Implemented mathematical solution
- [ ] Handled edge cases (1 bucket, 0 tests possible)
- [ ] Verified with manual calculation
- [ ] Reviewed after 1 day
- [ ] Reviewed after 1 week
- [ ] Could explain solution to others
- [ ] Comfortable with variations

**Strategy**: See [Mathematical Patterns](../strategies/patterns/math.md)
