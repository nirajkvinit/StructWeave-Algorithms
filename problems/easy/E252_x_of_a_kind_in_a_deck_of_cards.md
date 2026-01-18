---
id: E252
old_id: A381
slug: x-of-a-kind-in-a-deck-of-cards
title: X of a Kind in a Deck of Cards
difficulty: easy
category: easy
topics: ["array", "hash-table", "math"]
patterns: ["frequency-counting", "gcd"]
estimated_time_minutes: 15
frequency: low
related_problems:
  - E204_count_primes.md
  - E217_contains_duplicate.md
prerequisites:
  - "Greatest Common Divisor (GCD)"
  - "Frequency counting"
  - "Hash table operations"
strategy_ref: ../strategies/fundamentals/mathematical-concepts.md
---
# X of a Kind in a Deck of Cards

## Problem

Imagine you have a deck of cards where each card displays an integer value, represented by an array `deck` where `deck[i]` is the value on the i-th card. Your goal is to determine whether you can divide all the cards into groups that follow two strict rules: every group must contain exactly the same number of cards (let's call this number `x`, where `x` must be at least 2), and within each group, all cards must show identical values. For example, with the deck [1, 2, 3, 4, 4, 3, 2, 1], you could form four groups of size 2: [1,1], [2,2], [3,3], and [4,4]. The challenge is that you don't know what `x` should be beforehand, and you need to find if any valid `x >= 2` exists that allows you to partition the entire deck. Note that you cannot have leftover cards, and you cannot mix different values within a group. Return `true` if such a grouping is possible, otherwise return `false`. This problem tests whether you can recognize the mathematical relationship that must exist between the frequencies of different card values.

## Why This Matters

This problem elegantly combines frequency analysis with number theory, introducing the Greatest Common Divisor (GCD) in a practical context. While it appears to be about card games, the underlying pattern applies broadly to resource allocation, batch processing, and inventory management where you need to divide items into equal-sized groups. The key insight that all frequencies must share a common divisor greater than 1 is a pattern that appears in scheduling problems (dividing time slots), manufacturing (batch sizes), and data partitioning. In technical interviews, this problem assesses your ability to recognize when a mathematical property (GCD) can replace brute-force checking of all possible divisors. The frequency counting step reinforces hash table usage, while the GCD computation teaches you about the properties of divisibility and modular arithmetic. Companies particularly value this problem because it rewards mathematical thinking over pure algorithmic pattern matching.

## Examples

**Example 1:**
- Input: `deck = [1,2,3,4,4,3,2,1]`
- Output: `true`
- Explanation: Can group as [1,1],[2,2],[3,3],[4,4] where each group has 2 cards.

**Example 2:**
- Input: `deck = [1,1,1,2,2,2,3,3]`
- Output: `false`
- Explanation: Cannot form valid groups with equal sizes.

## Constraints

- 1 <= deck.length <= 10⁴
- 0 <= deck[i] < 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Tier 1 Hint - Problem Understanding
The key constraint is that all groups must have the same size `x`, and `x > 1`. This means the frequency of each card value must be divisible by `x`.

What mathematical property must all frequencies share? Think about what happens when you have frequencies [2, 4, 6] vs [2, 3, 6].

### Tier 2 Hint - Solution Strategy
Count the frequency of each card value. The group size `x` must divide all frequencies evenly. The largest such `x` is the Greatest Common Divisor (GCD) of all frequencies.

If GCD of all frequencies is greater than 1, you can form valid groups. Otherwise, return false.

### Tier 3 Hint - Implementation Details
1. Use a hash map to count frequency of each card value
2. Find GCD of all frequency values:
   - Start with GCD of first two frequencies
   - Iteratively compute GCD with remaining frequencies
   - Use the property: `gcd(a, b, c) = gcd(gcd(a, b), c)`
3. Return `true` if final GCD >= 2, else `false`

Note: GCD of 0 and any number n is n. Handle this edge case.

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Hash map + GCD | O(n + k log m) | O(k) | n = array length, k = unique values, m = max frequency |
| Brute force divisors | O(n × m) | O(k) | Check all possible divisors from 2 to max frequency |
| Optimized GCD | O(n + k) | O(k) | Using efficient GCD implementation |

## Common Mistakes

### Mistake 1: Checking if all frequencies are equal
```python
# Wrong: Assumes all frequencies must be identical
freq = Counter(deck)
return len(set(freq.values())) == 1 and list(freq.values())[0] > 1
```
**Why it's wrong**: `[1,1,1,1,2,2]` has frequencies [4, 2], which aren't equal, but GCD is 2, so answer is `true`.

### Mistake 2: Only checking if frequencies are divisible by 2
```python
# Wrong: Only checks x=2
freq = Counter(deck)
return all(f % 2 == 0 for f in freq.values())
```
**Why it's wrong**: `[1,1,1,2,2,2]` has all frequencies divisible by 3, but not by 2. Need to find the actual GCD.

### Mistake 3: Forgetting the x > 1 constraint
```python
# Wrong: Allows x=1
freq = Counter(deck)
g = gcd_of_all(freq.values())
return g >= 1  # Should be g >= 2
```
**Why it's wrong**: The problem requires `x > 1`. Any set of frequencies has GCD of at least 1, but we need at least 2 cards per group.

## Variations

| Variation | Difficulty | Description |
|-----------|-----------|-------------|
| Find maximum group size | Easy | Return the largest possible group size (the GCD) |
| Minimum groups | Easy | Return minimum number of groups needed |
| Groups with different sizes | Medium | Allow k different group sizes |
| Maximize number of complete groups | Medium | Allow leftover cards, maximize complete groups |
| Cards with costs | Medium | Each card has a cost, minimize total cost of valid grouping |

## Practice Checklist

- [ ] First attempt (solve independently)
- [ ] Reviewed solution and understood all approaches
- [ ] Practiced again after 1 day
- [ ] Practiced again after 3 days
- [ ] Practiced again after 1 week
- [ ] Can explain the solution clearly to others
- [ ] Solved all variations above

**Strategy**: See [Mathematical Concepts](../strategies/fundamentals/mathematical-concepts.md)
