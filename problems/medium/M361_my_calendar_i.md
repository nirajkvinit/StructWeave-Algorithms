---
id: M361
old_id: A196
slug: my-calendar-i
title: My Calendar I
difficulty: medium
category: medium
topics: ["design", "binary-search"]
patterns: ["interval-merge"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["M056", "M363", "M364"]
prerequisites: ["interval-overlap", "binary-search-tree"]
---
# My Calendar I

## Problem

Design a calendar booking system that prevents scheduling conflicts. Your system should accept new events only when they don't create overlapping bookings, known as **double bookings**.

Think of this like managing a conference room reservation system. A **double booking** happens when two events overlap in time, sharing at least one moment. For example, an event from 10am to 11am conflicts with another event from 10:30am to 12pm, because they're both active between 10:30am and 11am.

Events are represented as half-open intervals `[start, end)`. The half-open notation means the start time is included but the end time is excluded. So `[10, 15)` includes moment 10 but not moment 15, meaning events `[10, 15)` and `[15, 20)` don't conflict because they don't share any common moments.

Implement the `MyCalendar` class with these capabilities:

- `MyCalendar()` - Constructor that initializes an empty calendar
- `boolean book(int start, int end)` - Attempts to schedule an event from `start` to `end`. Returns `true` if successful (no conflicts), or `false` if it would create a double booking (in which case, don't add the event)

The challenge is efficiently detecting overlaps, especially as your calendar grows to hundreds of bookings.

## Why This Matters

This problem appears in real scheduling systems everywhere: calendar applications, hotel booking platforms, meeting room managers, and appointment schedulers. Understanding interval overlap detection is fundamental to resource allocation problems.

The interval management pattern you'll learn here extends to more complex scenarios like database transaction isolation, CPU task scheduling, and memory management. It also teaches you to think about time-based conflicts, which is crucial for distributed systems and concurrent programming.

This is a popular interview question because it combines design thinking with algorithmic optimization, requiring you to choose appropriate data structures and consider time-space tradeoffs as the system scales.

## Constraints

- 0 <= start < end <= 10⁹
- At most 1000 calls will be made to book.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Hint 1: Interval Overlap Detection</summary>

Two intervals `[s1, e1)` and `[s2, e2)` overlap if and only if:
- `s1 < e2` AND `s2 < e1`

This is the key condition to check. They do NOT overlap if:
- `e1 <= s2` (first interval ends before second starts)
- `e2 <= s1` (second interval ends before first starts)

For each new booking, check it against all existing bookings using this overlap condition.

</details>

<details>
<summary>Hint 2: List-Based Approach</summary>

Maintain a list of booked intervals:
1. For each new booking request `[start, end)`:
   - Iterate through all existing bookings
   - Check if the new interval overlaps with any existing one
   - If any overlap is found, return False
   - If no overlaps, add the interval to the list and return True

Time complexity: O(n) per booking, where n is the number of bookings.

</details>

<details>
<summary>Hint 3: Binary Search Tree Optimization</summary>

Use a balanced tree structure (TreeMap in Java, SortedList in Python):
1. Store intervals sorted by start time
2. For a new booking `[start, end)`:
   - Find the interval that would come immediately before it
   - Find the interval that would come immediately after it
   - Check only these two neighbors for overlap
3. If no overlap, insert the interval

Time complexity: O(log n) per booking with a balanced BST.

</details>

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Linear list | O(n) per book | O(n) | Check all existing bookings for each new one |
| Sorted list | O(n) per book | O(n) | Binary search to find position, but insertion is O(n) |
| Balanced BST | O(log n) per book | O(n) | TreeMap/TreeSet for efficient insertion and search |
| Segment tree | O(log n) per book | O(n) | Overkill for this problem but works |

Where n is the number of successfully booked events.

## Common Mistakes

**Mistake 1: Incorrect overlap condition**
```python
# Wrong - misses edge case when intervals are adjacent
def check_overlap(start1, end1, start2, end2):
    if start1 <= start2 <= end1:  # Incomplete
        return True
    return False

# Correct - checks both directions
def check_overlap(start1, end1, start2, end2):
    return start1 < end2 and start2 < end1
```

**Mistake 2: Treating end time as inclusive**
```python
# Wrong - treats [1, 5) and [5, 10) as overlapping
def check_overlap(start1, end1, start2, end2):
    return start1 <= end2 and start2 <= end1  # Wrong for half-open

# Correct - half-open intervals don't overlap at boundary
def check_overlap(start1, end1, start2, end2):
    return start1 < end2 and start2 < end1
```

**Mistake 3: Adding event before checking all overlaps**
```python
# Wrong - adds event even if it overlaps
def book(self, start, end):
    for s, e in self.bookings:
        if start < e and s < end:
            return False
    self.bookings.append((start, end))  # Added outside loop
    return True  # This can execute even after return False!

# Correct - only add after confirming no overlaps
def book(self, start, end):
    for s, e in self.bookings:
        if start < e and s < end:
            return False
    self.bookings.append((start, end))
    return True
```

## Variations

| Variation | Difference | Difficulty |
|-----------|------------|------------|
| My Calendar II | Allow double booking but prevent triple booking | Medium |
| My Calendar III | Track maximum number of overlapping events | Medium |
| Meeting Rooms | Check if person can attend all meetings | Easy |
| Merge Intervals | Merge all overlapping intervals | Medium |

## Practice Checklist

- [ ] Solve with simple list approach first
- [ ] Test edge cases: adjacent intervals [1,5) and [5,10)
- [ ] Implement with binary search tree for optimization
- [ ] Test with 1000 bookings to verify performance
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Explain why half-open intervals matter
- [ ] Compare time complexity of different approaches
- [ ] Handle case where all bookings overlap at one point
