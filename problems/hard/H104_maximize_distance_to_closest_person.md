---
id: H104
old_id: A316
slug: maximize-distance-to-closest-person
title: Maximize Distance to Closest Person
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# Maximize Distance to Closest Person

## Problem

You're given a binary array `seats` representing a row of seating positions. A value of `1` at position `i` indicates someone is seated there, while `0` means the seat is vacant.

The array is guaranteed to have at least one occupied seat and at least one empty seat.

Your goal is to find the optimal empty seat that maximizes the distance to the nearest occupied seat, and return that maximum possible distance.


**Diagram:**

Example visualization of seating arrangement:
```
Input: seats = [1, 0, 0, 0, 1, 0, 1]

Index:         0  1  2  3  4  5  6
Seats:        [1, 0, 0, 0, 1, 0, 1]
               ↑           ↑     ↑
            person      person person

Distance to nearest person for each empty seat:
  Index 1: min(|1-0|, |1-4|) = min(1, 3) = 1
  Index 2: min(|2-0|, |2-4|) = min(2, 2) = 2  ← Maximum!
  Index 3: min(|3-0|, |3-4|) = min(3, 1) = 1
  Index 5: min(|5-4|, |5-6|) = min(1, 1) = 1

Best choice: sit at index 2 with distance = 2

Visual representation:
Position:  0   1   2   3   4   5   6
Seats:    [P] [ ] [X] [ ] [P] [ ] [P]
           │   └───┼───┘   │
           └───────┴───────┘

P = Person already seated
X = Best empty seat to choose
Distance from X to nearest P = 2
```


## Why This Matters

This problem teaches distance optimization and how to analyze spatial relationships in one-dimensional arrays.

## Examples

**Example 1:**
- Input: `seats = [1,0,0,0]`
- Output: `3`
- Explanation: Choosing the rightmost empty seat (index 3) places you 3 positions from the nearest person, which is the maximum achievable distance.

**Example 2:**
- Input: `seats = [0,1]`
- Output: `1`

## Constraints

- 2 <= seats.length <= 2 * 10⁴
- seats[i] is 0 or 1.
- At least one seat is **empty**.
- At least one seat is **occupied**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

The maximum distance can occur in three scenarios: (1) at the beginning of the array before the first person, (2) at the end after the last person, or (3) in the middle between two people. For gaps between people, the best seat is in the middle of the gap, giving distance of gap_length // 2.

</details>

<details>
<summary>🎯 Main Approach</summary>

Scan through the array once to identify all positions with people (where seats[i] == 1). Calculate three candidates: (1) distance from start to first person, (2) distance from last person to end, (3) for each pair of consecutive people, (gap_length - 1) // 2 where gap_length is the distance between them. Return the maximum of these candidates.

</details>

<details>
<summary>⚡ Optimization Tip</summary>

Instead of storing all person positions and iterating again, maintain a running maximum while scanning. Track the previous person's index, and for each new person found, calculate the middle gap distance immediately. This reduces space complexity from O(n) to O(1).

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Two Pass with Array | O(n) | O(n) | Store all person positions, then calculate |
| Optimal Single Pass | O(n) | O(1) | Track previous person index only |

## Common Mistakes

1. **Incorrect middle gap calculation**
   ```python
   # Wrong: Not accounting for which seat to choose in gap
   gap_length = right_person - left_person
   max_dist = gap_length // 2  # Off by one for odd gaps

   # Correct: Middle of gap gives (gap - 1) // 2 distance
   gap_length = right_person - left_person
   max_dist = (gap_length - 1) // 2
   # Example: gap of 4 between indices 0 and 4 -> sit at 2, distance = 2
   ```

2. **Forgetting edge positions**
   ```python
   # Wrong: Only checking gaps between people
   max_dist = 0
   for i in range(1, len(people_positions)):
       gap = people_positions[i] - people_positions[i-1]
       max_dist = max(max_dist, (gap - 1) // 2)

   # Correct: Include start and end
   max_dist = people_positions[0]  # Distance to start
   max_dist = max(max_dist, len(seats) - 1 - people_positions[-1])  # End
   for i in range(1, len(people_positions)):
       gap = people_positions[i] - people_positions[i-1]
       max_dist = max(max_dist, (gap - 1) // 2)
   ```

3. **Not handling array boundaries correctly**
   ```python
   # Wrong: Index out of bounds
   for i in range(len(seats)):
       if seats[i] == 0:
           dist = min(i - prev_person, next_person - i)  # next_person undefined

   # Correct: Handle boundaries properly
   prev = -1
   max_dist = 0
   for i in range(len(seats)):
       if seats[i] == 1:
           if prev == -1:
               max_dist = i  # Distance from start
           else:
               max_dist = max(max_dist, (i - prev) // 2)
           prev = i
   max_dist = max(max_dist, len(seats) - 1 - prev)  # Distance to end
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| K Empty Seats Between | Medium | Find K consecutive empty seats |
| Maximize Sum of Distances | Hard | Maximize sum of distances to K nearest people |
| Circular Seating | Medium | Array is circular (last connects to first) |
| Weighted Distance | Medium | Different weights for distance in each direction |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (person at start, at end, single gap)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Two Pointers Pattern](../../strategies/patterns/two-pointers.md)
