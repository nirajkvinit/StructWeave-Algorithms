---
id: M480
old_id: A348
slug: boats-to-save-people
title: Boats to Save People
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Boats to Save People

## Problem

Imagine you're coordinating an evacuation where people need to be transported across water. You have unlimited boats, but each boat can only carry a maximum of two people and has a weight limit. Your goal is to transport everyone using the fewest boat trips possible.

You have an array `people` where `people[i]` represents the weight of person `i`, and you have boats with a weight capacity of `limit`. Each boat can carry **at most 2 people** at the same time, as long as their combined weight doesn't exceed `limit`.

Determine the minimum number of boats needed to transport everyone.

**Key constraint**: Each boat holds at most 2 people, even if there's room for more by weight.

## Why This Matters

This problem models resource optimization in emergency response systems (evacuation planning), ride-sharing algorithms (pairing passengers to minimize trips), and load balancing in distributed systems (pairing processes on machines with capacity constraints). The two-pointer greedy strategy you'll develop applies to container shipping optimization (packing cargo to minimize containers), elevator scheduling (grouping passengers efficiently), and network packet aggregation (combining small packets to reduce transmission overhead). Understanding when greedy pairing is optimal helps in designing efficient matching algorithms across many domains.

## Examples

**Example 1:**
- Input: `people = [1,2], limit = 3`
- Output: `1`
- Explanation: 1 boat (1, 2)

**Example 2:**
- Input: `people = [3,2,2,1], limit = 3`
- Output: `3`
- Explanation: 3 boats (1, 2), (2) and (3)

**Example 3:**
- Input: `people = [3,5,3,4], limit = 5`
- Output: `4`
- Explanation: 4 boats (3), (3), (4), (5)

## Constraints

- 1 <= people.length <= 5 * 10⁴
- 1 <= people[i] <= limit <= 3 * 10⁴

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Each boat can carry at most 2 people. The greedy insight is: always try to pair the heaviest person with the lightest person. If they fit together, you've minimized waste. If not, the heaviest person must travel alone. This greedy strategy works because pairing heavy with light is always optimal or equivalent to any other pairing.
</details>

<details>
<summary>🎯 Main Approach</summary>
Sort the people array. Use two pointers: one at the start (lightest) and one at the end (heaviest). If people[left] + people[right] <= limit, both can share a boat (increment left, decrement right). Otherwise, the heavy person goes alone (decrement right only). Count boats in either case. Continue until left > right.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
The sorting step is O(n log n), but the two-pointer traversal is O(n), making total time O(n log n). You cannot do better than this because you need to sort. Space is O(1) if you sort in-place, or O(n) if the sort creates a copy. Make sure to increment the boat count for every iteration, not just when pairs are formed.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Try all possible pairings |
| Optimal (Two Pointers) | O(n log n) | O(1) | Dominated by sorting; in-place sort |

## Common Mistakes

1. **Not sorting first**
   ```python
   # Wrong: Two pointers only work on sorted data
   left, right = 0, len(people) - 1
   boats = 0
   while left <= right:
       # This won't give correct pairing on unsorted data

   # Correct: Sort before applying two pointers
   people.sort()
   left, right = 0, len(people) - 1
   ```

2. **Counting boats incorrectly**
   ```python
   # Wrong: Only counting when pairs are formed
   if people[left] + people[right] <= limit:
       boats += 1
       left += 1
       right -= 1
   else:
       right -= 1

   # Correct: Every iteration uses one boat
   boats = 0
   while left <= right:
       if people[left] + people[right] <= limit:
           left += 1
       right -= 1
       boats += 1
   ```

3. **Trying to fit more than 2 people**
   ```python
   # Wrong: Constraint says max 2 people per boat
   while people[left] + people[right] <= limit:
       left += 1  # Adding multiple light people

   # Correct: Each boat takes at most 2 people
   if people[left] + people[right] <= limit:
       left += 1
       right -= 1
       boats += 1
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Container With Most Water | Medium | Maximize area between two pointers, not minimize count |
| 3Sum | Medium | Three pointers to find triplets summing to target |
| Partition Labels | Medium | Greedy partitioning with different constraint |
| Assign Cookies | Easy | Similar greedy two-pointer matching problem |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Two Pointers](../../strategies/patterns/two-pointers.md)
