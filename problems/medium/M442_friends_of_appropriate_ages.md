---
id: M442
old_id: A292
slug: friends-of-appropriate-ages
title: Friends Of Appropriate Ages
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Friends Of Appropriate Ages

## Problem

You're analyzing friend request behavior on a social network where each person has an associated age. Given an array `ages` of length `n`, where `ages[i]` represents the age of the `ith` person, calculate the total number of friend requests that will be sent across the entire platform.

The platform has specific age-based rules that govern when person `x` will send a friend request to person `y`. Person `x` will **NOT** send a request to person `y` if **any** of these three conditions are true:

1. `age[y] <= 0.5 * age[x] + 7` (Person y is too young relative to person x)
2. `age[y] > age[x]` (Person y is older than person x)
3. `age[y] > 100 && age[x] < 100` (Person y is over 100 while person x is under 100)

If **none** of these rejection conditions apply, then person `x` **will** send a friend request to person `y`.

Key details to remember:
- Friend requests are **unidirectional**: if person `x` sends a request to person `y`, it doesn't mean person `y` will send one to person `x`
- No one sends a friend request to themselves
- Multiple people can have the same age, and each person is evaluated independently

Return the total count of all friend requests that will be sent.

## Why This Matters

This problem teaches you to optimize array processing through clever counting techniques. Instead of checking every possible pair (which would be O(n²)), you'll learn to exploit the constraint that ages fall within a limited range (1-120). This bucketing optimization pattern appears frequently in real systems: analyzing user demographics, processing transaction data, or aggregating metrics where values cluster within known bounds. The problem also demonstrates how to transform complex conditional logic into mathematical ranges, a skill essential for writing efficient filtering systems.

## Examples

**Example 1:**
- Input: `ages = [16,16]`
- Output: `2`
- Explanation: 2 people friend request each other.

**Example 2:**
- Input: `ages = [16,17,18]`
- Output: `2`
- Explanation: Friend requests are made 17 -> 16, 18 -> 17.

**Example 3:**
- Input: `ages = [20,30,100,110,120]`
- Output: `3`
- Explanation: Friend requests are made 110 -> 100, 120 -> 110, 120 -> 100.

## Constraints

- n == ages.length
- 1 <= n <= 2 * 10⁴
- 1 <= ages[i] <= 120

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Instead of checking every pair of people (O(n²)), realize that the age constraint creates age ranges. People with the same age will send requests to the same set of people. Use frequency counting to group people by age (only 120 possible ages).
</details>

<details>
<summary>🎯 Main Approach</summary>
Create a frequency count array for ages (size 121). For each age X with count countX, determine the valid age range that X can send requests to. For each valid age Y with countY in that range, add countX * countY requests. Handle the special case where X == Y (same age): add countX * (countX - 1) since people don't request themselves.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
The three rejection conditions simplify: X will request Y only if Y is in range (0.5*X + 7, X]. The third condition (age[y] > 100 && age[x] < 100) is redundant given the first two. Use cumulative sums or binary search to quickly count valid ages in a range.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Check all pairs |
| Age Counting | O(n + A²) | O(A) | A = 120 (age range), often better than n² |
| Optimal (Prefix Sum) | O(n + A) | O(A) | Using cumulative counts |

## Common Mistakes

1. **Counting self-requests**
   ```python
   # Wrong: Person requests themselves
   for x in range(121):
       for y in range(121):
           if is_valid(x, y):
               count += age_count[x] * age_count[y]

   # Correct: Handle same age specially
   for x in range(121):
       for y in range(121):
           if is_valid(x, y):
               if x == y:
                   count += age_count[x] * (age_count[x] - 1)
               else:
                   count += age_count[x] * age_count[y]
   ```

2. **Misunderstanding the condition logic**
   ```python
   # Wrong: Using OR instead of understanding when request happens
   if age_y <= 0.5 * age_x + 7 or age_y > age_x or (age_y > 100 and age_x < 100):
       # Don't send request

   # Correct: Send request when NONE of the conditions are true
   # Simplified: send if 0.5 * age_x + 7 < age_y <= age_x
   if 0.5 * age_x + 7 < age_y <= age_x:
       # Send request
   ```

3. **Not handling duplicate ages efficiently**
   ```python
   # Wrong: Checking all n people individually
   for i in range(n):
       for j in range(n):
           if i != j and is_valid(ages[i], ages[j]):
               count += 1

   # Correct: Group by age first
   age_count = [0] * 121
   for age in ages:
       age_count[age] += 1
   # Then process age pairs
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Bidirectional friend requests | Medium | Count unique pairs instead of directed requests |
| Multiple constraint conditions | Medium | More complex validity checking |
| K-degree friend connections | Hard | Find indirect connections |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Counting and Bucketing](../../strategies/patterns/counting.md)
