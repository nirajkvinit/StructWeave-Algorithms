---
id: M270
old_id: A067
slug: distribute-candies
title: Distribute Candies
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
frequency: low
related_problems: ["E217", "E136", "M442"]
prerequisites: ["hash-set", "array-manipulation"]
---
# Distribute Candies

## Problem

You have a collection of `n` candies (where `n` is guaranteed to be even), with each candy belonging to a specific type indicated by an integer in the array `candyType[i]`. Due to dietary guidelines from your doctor, you can only consume exactly `n / 2` candies from your entire collection.

Your goal is to maximize the variety of candy types you eat while respecting this quantity limit. Given the integer array `candyType` of length `n`, determine the maximum number of distinct candy types you can consume when selecting exactly `n / 2` candies.

The key insight is recognizing you face two constraints: a quantity limit (can only eat `n / 2` candies) and a variety limit (can't eat more types than exist). The answer is whichever constraint is more restrictive. For example, if you have 100 candies but only 10 unique types, you're limited by variety (can eat at most 10 types). If you have 100 candies with 80 unique types, you're limited by quantity (can eat at most 50 candies, thus at most 50 types).

This problem tests your understanding of set operations and constraint optimization, wrapped in a simple scenario.

## Why This Matters

Hash set operations for counting unique elements are fundamental to data deduplication, database query optimization (COUNT DISTINCT operations), and analytics pipelines. The "minimum of two constraints" pattern appears frequently in resource allocation problems, optimization under constraints, and capacity planning. This specific problem teaches you to recognize when complexity is unnecessary - the solution is surprisingly elegant once you identify the right abstraction. Beyond technical interviews, similar logic appears in portfolio diversification (maximize variety within budget), menu planning (maximize variety within calorie limits), and sampling strategies (maximize coverage within sample size).

## Examples

**Example 1:**
- Input: `candyType = [1,1,2,2,3,3]`
- Output: `3`
- Explanation: Alice can only eat 6 / 2 = 3 candies. Since there are only 3 types, she can eat one of each type.

**Example 2:**
- Input: `candyType = [1,1,2,3]`
- Output: `2`
- Explanation: Alice can only eat 4 / 2 = 2 candies. Whether she eats types [1,2], [1,3], or [2,3], she still can only eat 2 different types.

**Example 3:**
- Input: `candyType = [6,6,6,6]`
- Output: `1`
- Explanation: Alice can only eat 4 / 2 = 2 candies. Even though she can eat 2 candies, she only has 1 type.

## Constraints

- n == candyType.length
- 2 <= n <= 10⁴
- n is even.
- -10⁵ <= candyType[i] <= 10⁵

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Identifying the Constraint</summary>

You have two limits to consider:
1. You can eat at most `n / 2` candies (quantity limit)
2. You can't eat more distinct types than actually exist (variety limit)

The answer is the minimum of these two values. Think about when each limit becomes the bottleneck:
- If you have 100 candies but only 10 types, you can eat at most 10 types (even though you could eat 50 candies)
- If you have 100 candies with 80 types, you can eat at most 50 types (limited by quantity, not variety)
</details>

<details>
<summary>Hint 2: Counting Unique Elements</summary>

The core of this problem is counting distinct candy types. What data structure efficiently tracks uniqueness?

A hash set automatically handles duplicates - when you add elements to a set, it only stores unique values. The size of the set after adding all candies gives you the number of distinct types.

Example: `[1,1,2,2,3,3]` → Set: `{1,2,3}` → 3 unique types
</details>

<details>
<summary>Hint 3: Complete Solution Strategy</summary>

The solution is elegant:

```python
unique_types = len(set(candyType))  # Count distinct types
max_allowed = len(candyType) // 2    # Can eat at most n/2 candies
return min(unique_types, max_allowed)
```

Why this works:
- If `unique_types <= max_allowed`: Eat one of each type (variety-limited)
- If `unique_types > max_allowed`: Eat max_allowed different types (quantity-limited)

The minimum automatically selects the correct constraint.

Alternative without set: Use a hash map to count frequencies, then check map size.
</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Hash Set | O(n) | O(n) | Best approach; set stores unique types |
| Hash Map | O(n) | O(n) | Also works; counts frequencies then checks size |
| Sorting | O(n log n) | O(1) or O(n) | Sort then count distinct adjacent elements; slower |

## Common Mistakes

### Mistake 1: Forgetting the quantity limit
```python
# WRONG: Only returning unique count without checking n/2 limit
def distributeCandies(candyType):
    return len(set(candyType))  # Missing the min() check!

# Example failure: [1,2,3,4,5,6]
# Returns 6, but can only eat 3 candies!
```
**Why it's wrong:** You must enforce the `n / 2` limit. Even if 100 unique types exist, you can only eat `n / 2` candies maximum.

### Mistake 2: Complex unnecessary logic
```python
# WRONG: Overcomplicating with frequency counting
def distributeCandies(candyType):
    freq = {}
    for candy in candyType:
        freq[candy] = freq.get(candy, 0) + 1

    # Trying to pick candies greedily - unnecessary!
    count = 0
    eaten = 0
    for candy_type in freq:
        if eaten < len(candyType) // 2:
            count += 1
            eaten += 1
    return count
```
**Why it's wrong:** You don't need to track which specific candies to eat. The problem only asks for the maximum variety, which is simply `min(unique_count, n/2)`.

### Mistake 3: Not using built-in set
```python
# INEFFICIENT: Manually tracking unique elements
def distributeCandies(candyType):
    unique = []
    for candy in candyType:
        if candy not in unique:  # O(n) lookup in list!
            unique.append(candy)
    return min(len(unique), len(candyType) // 2)
```
**Why it's wrong:** Using a list for uniqueness checking is O(n²) because `in` operator on lists is O(n). Use a set for O(1) lookups and O(n) overall complexity.

## Variations

| Variation | Difficulty | Key Difference |
|-----------|-----------|----------------|
| Contains Duplicate | Easy | Check if any value appears twice |
| Single Number | Easy | Find element appearing once when others appear twice |
| Find All Duplicates | Medium | Find all elements appearing twice |
| Maximum Number of Distinct Elements | Medium | Remove k elements to maximize distinct count |

## Practice Checklist

- [ ] Solve using hash set approach (Day 1)
- [ ] Implement using hash map (Day 1)
- [ ] Solve using sorting method (Day 2)
- [ ] Handle edge cases: all same type, all different types (Day 3)
- [ ] Review after 1 week (Day 8)
- [ ] Review after 2 weeks (Day 15)
- [ ] Solve without looking at hints (Day 30)
