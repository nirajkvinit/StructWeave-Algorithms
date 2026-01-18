---
id: M463
old_id: A322
slug: exam-room
title: Exam Room
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Exam Room

## Problem

Imagine you're managing seat assignments in an exam hall with `n` seats arranged in a single row, numbered from 0 to n-1. Students want to sit as far away from others as possible to minimize distractions during the exam.

The seating rules are:
- When a student arrives, they choose the available seat that maximizes the distance to the nearest occupied seat
- If there's a tie (multiple seats with the same maximum distance), they choose the seat with the smallest number
- If the room is completely empty, they sit in seat 0

You need to design an `ExamRoom` class that manages this seating system with these operations:

- `ExamRoom(int n)`: Initialize the room with `n` total seats, all initially empty
- `int seat()`: A student arrives - return which seat number they should take based on the rules above
- `void leave(int p)`: The student in seat `p` leaves (you can assume seat `p` is currently occupied)

## Why This Matters

This problem appears in real-world resource allocation systems. Consider social distancing algorithms used during the pandemic to space people optimally in queues or seating areas. It's also relevant in memory allocation where you want to place new data far from existing data to reduce cache conflicts, parking lot optimization to maximize space between vehicles, and even meeting room scheduling where you want privacy by maximizing distance from other occupied rooms. The challenge combines data structure design with optimization under constraints, teaching you how to efficiently track and update spatial arrangements.

## Constraints

- 1 <= n <= 10⁹
- It is guaranteed that there is a student sitting at seat p.
- At most 10⁴ calls will be made to seat and leave.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Maintain a sorted list of occupied seats. For each seat() call, find the largest gap between consecutive occupied seats. The best position is in the middle of the largest gap. Edge cases: if seat 0 is empty, distance is the position itself; if seat n-1 is empty, distance is n-1 minus the last occupied seat.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use a sorted list or TreeSet to maintain occupied seats. For seat(): iterate through consecutive pairs of occupied seats, calculate the maximum distance achievable in each gap (gap_size // 2 for middle gaps, full distance for edges). Choose the gap that maximizes distance, breaking ties by smallest index. For leave(p): simply remove p from the set.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
For Python, use a list with bisect for O(log n) insertion and removal. For each seat() operation, you need O(n) to scan all gaps. With up to 10^4 operations, this is acceptable. Alternative: use a heap to track gaps, but this complicates leave() operations due to gap invalidation.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| List Scan | O(n) per seat, O(n) per leave | O(n) | Scan all occupied seats, simple implementation |
| Sorted Set + Scan | O(n) per seat, O(log n) per leave | O(n) | Use TreeSet/SortedList, scan gaps for seat() |
| Heap (complex) | O(log n) per operation | O(n) | Requires careful gap management |

## Common Mistakes

1. **Not handling edge seats correctly**
   ```python
   # Wrong: Treating all gaps the same
   for i in range(len(seats) - 1):
       distance = (seats[i+1] - seats[i]) // 2

   # Correct: Special handling for edges
   # Left edge: distance is seats[0]
   if len(seats) == 0:
       return 0
   max_dist = seats[0]
   best_seat = 0
   # Middle gaps: distance is gap // 2
   for i in range(len(seats) - 1):
       dist = (seats[i+1] - seats[i]) // 2
   # Right edge: distance is (n - 1) - seats[-1]
   if n - 1 - seats[-1] > max_dist:
       best_seat = n - 1
   ```

2. **Incorrect tie-breaking**
   ```python
   # Wrong: Not selecting smallest index on tie
   if distance > max_distance:
       best_seat = current_seat

   # Correct: Use >= to ensure smallest index wins
   # (Actually wrong - use > and track leftmost in other way)
   # Better: update only when strictly greater
   if distance > max_distance:
       max_distance = distance
       best_seat = current_seat
   ```

3. **Inefficient data structure**
   ```python
   # Wrong: Using unsorted list
   seats = []
   seats.append(new_seat)  # Need to sort every time

   # Correct: Maintain sorted order
   import bisect
   seats = []
   bisect.insort(seats, new_seat)  # O(n) but maintains order
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Design Hit Counter | Medium | Time-based data structure with sliding window |
| Design Phone Directory | Medium | Track available resources, simpler logic |
| Seat Reservation Manager | Easy | Simple seat allocation without distance maximization |
| Design HashMap | Medium | Custom data structure design |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Design Patterns](../../strategies/patterns/object-oriented-design.md)
