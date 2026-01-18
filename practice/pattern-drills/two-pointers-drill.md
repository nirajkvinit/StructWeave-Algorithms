---
title: Two Pointers Pattern Drill
type: pattern-drill
pattern: two-pointers
difficulty_range: easy-hard
problems_count: 12
estimated_time_minutes: 180
---

# Two Pointers Pattern Drill

Master the two-pointers technique through progressive practice. This pattern is essential for array and linked list problems, appearing in 20%+ of technical interviews.

## Pattern Overview

**Two Pointers** uses two indices (or references) to traverse data structures, typically to reduce time complexity from O(n²) to O(n).

**When to use:**
- Problems involving pairs or triplets in sorted/unsorted arrays
- In-place array modifications
- Linked list cycle detection
- Palindrome checking
- Merging sorted sequences

## Pattern Recognition Flowchart

```
Is the data sequential (array, string, linked list)?
  └─> YES
      ├─> Need to find pairs/triplets?
      │   └─> Use OPPOSITE ENDS pattern
      │
      ├─> Need to modify in-place?
      │   └─> Use SAME DIRECTION pattern
      │
      └─> Need to detect cycles?
          └─> Use FAST/SLOW pattern
```

## Sub-Patterns

### 1. Opposite Ends (Converging Pointers)
**Start from both ends, move toward center**

**Template:**
```python
def opposite_ends(arr):
    left, right = 0, len(arr) - 1

    while left < right:
        # Check condition
        if condition_met(arr[left], arr[right]):
            # Process or record result
            result = process(arr[left], arr[right])

        # Move pointers based on logic
        if should_move_left:
            left += 1
        if should_move_right:
            right -= 1

    return result
```

**Use cases:**
- Finding pairs with target sum (sorted array)
- Container problems (max area, volume)
- Palindrome verification
- Reverse operations

### 2. Same Direction (Slow/Fast Pointers)
**Both pointers move in same direction at different speeds**

**Template:**
```python
def same_direction(arr):
    slow = 0  # Write pointer or comparison anchor

    for fast in range(len(arr)):
        # Fast pointer explores
        if condition(arr[fast]):
            # Slow pointer writes/updates
            arr[slow] = arr[fast]
            slow += 1

    return slow  # Often returns position or count
```

**Use cases:**
- Remove duplicates in-place
- Remove specific elements
- Partition arrays
- Move zeros to end

### 3. Fast/Slow (Floyd's Cycle Detection)
**Two pointers at different speeds**

**Template:**
```python
def floyd_cycle(head):
    slow = fast = head

    # Phase 1: Detect cycle
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next

        if slow == fast:
            # Cycle detected
            break

    # Phase 2: Find cycle start (if needed)
    if not fast or not fast.next:
        return None  # No cycle

    slow = head
    while slow != fast:
        slow = slow.next
        fast = fast.next

    return slow  # Cycle start
```

**Use cases:**
- Linked list cycle detection
- Finding cycle entry point
- Finding middle of linked list
- Checking if linked list is palindrome

## Problem Set

### Easy Problems (Warmup)

| ID | Problem | Time | Sub-Pattern | Key Insight |
|----|---------|------|-------------|-------------|
| E006 | Container With Most Water | 15min | Opposite Ends | Move pointer at shorter line - only way to potentially increase area |
| E016 | Remove Duplicates from Sorted Array | 15min | Same Direction | Slow writes unique elements, fast explores ahead |
| E057 | Linked List Cycle | 15min | Fast/Slow | Fast catches slow if cycle exists (tortoise and hare) |
| E038 | Merge Sorted Array | 20min | Opposite Ends | Merge from END to avoid overwriting unprocessed elements |

**Practice Goals (Easy):**
- Understand when to move which pointer
- Handle edge cases (empty arrays, single elements)
- Avoid off-by-one errors
- Total Time: ~60 minutes

### Medium Problems (Core Practice)

| ID | Problem | Time | Sub-Pattern | Key Insight |
|----|---------|------|-------------|-------------|
| E010 | 3Sum | 25min | Opposite Ends | Fix one element, use two pointers for remaining pair; skip duplicates |
| M004 | Remove Nth Node From End | 20min | Fast/Slow | Fast gets n steps ahead, then move both until fast reaches end |
| M058 | Linked List Cycle II | 25min | Fast/Slow | After detecting cycle, reset slow to head and move both at same speed |
| M028 | Remove Duplicates from Sorted Array II | 20min | Same Direction | Compare with element TWO positions back to allow up to 2 duplicates |
| M030 | Remove Duplicates from Sorted List II | 25min | Same Direction | Use dummy node and skip entire duplicate sequences |

**Practice Goals (Medium):**
- Combine two pointers with other techniques (sorting, hashing)
- Handle duplicate elements correctly
- Master linked list pointer manipulation
- Total Time: ~115 minutes

### Hard Problems (Mastery)

| ID | Problem | Time | Sub-Pattern | Key Insight |
|----|---------|------|-------------|-------------|
| H009 | Trapping Rain Water | 30min | Opposite Ends | Water level limited by shorter boundary; move from shorter side |
| H015 | Minimum Window Substring | 35min | Same Direction | Expandable window with character frequency tracking |
| H014 | Edit Distance | 40min | Dynamic Programming | Advanced - combines DP with string pointers |

**Practice Goals (Hard):**
- Handle complex state tracking
- Optimize space complexity
- Combine patterns (DP + two pointers, sliding window + two pointers)
- Total Time: ~105 minutes

## Common Variations Table

| Variation | Example Problem | Modification |
|-----------|----------------|--------------|
| **Sorted Array** | E006, E010 | Can use opposite ends to exploit ordering |
| **Unsorted Array** | E001 (Two Sum) | May need hash map instead of two pointers |
| **In-Place Modification** | E016, M028 | Use same-direction to write valid elements |
| **Linked List** | E057, M004 | Use node references instead of indices |
| **Multiple Arrays** | E038 | One pointer per array, merge based on comparison |
| **K-way Problems** | E013 (4Sum) | Nested two-pointers, O(n^(k-1)) complexity |

## Quick Reference Card

### When to Use Two Pointers

**Indicators:**
- "Find pair/triplet with property X"
- "Remove duplicates/elements IN-PLACE"
- "Detect cycle in linked list"
- "Palindrome check"
- "Merge sorted sequences"
- Array is sorted or can be sorted

**Counter-indicators:**
- Need to preserve original order (and array unsorted)
- Need to find ALL subarrays (might need sliding window)
- Complex state tracking (might need DP or graph algorithms)

### Decision Tree

```
Q: Is data sorted or sortable?
└─> YES: Can sorting help? → Try opposite ends
└─> NO: Check below

Q: Need to modify in-place?
└─> YES: Try same-direction (read/write pointers)

Q: Linked list problem?
└─> Cycle-related? → Fast/Slow
└─> Position-related (middle, nth from end)? → Fast/Slow with offset

Q: Finding pairs in sorted array?
└─> Opposite ends (O(n) instead of O(n²))

Q: Finding pairs in unsorted array?
└─> Hash map might be better (O(n) time, O(n) space)
```

## Off-by-One Prevention Guide

**Common Mistakes & Fixes:**

1. **Loop Condition**
   ```python
   # WRONG
   while left <= right:  # Can process same element twice

   # CORRECT (for opposite ends)
   while left < right:   # Stop when pointers meet
   ```

2. **Pointer Movement**
   ```python
   # WRONG
   left += 1 if arr[left] < arr[right] else right -= 1  # Only moves one!

   # CORRECT
   if arr[left] < arr[right]:
       left += 1
   else:
       right -= 1
   ```

3. **Array Index Bounds**
   ```python
   # WRONG
   if arr[left] == target:  # Might access out of bounds

   # CORRECT
   if left < len(arr) and arr[left] == target:
   ```

4. **Linked List Traversal**
   ```python
   # WRONG
   while fast:  # fast.next might be None
       slow = slow.next
       fast = fast.next.next

   # CORRECT
   while fast and fast.next:  # Check both
       slow = slow.next
       fast = fast.next.next
   ```

## Pattern Mastery Checklist

### Level 1: Understanding (Study & Observe)
- [ ] Can explain when to use opposite ends vs same direction
- [ ] Can identify two-pointer problems from description
- [ ] Understand why two pointers reduce O(n²) to O(n)
- [ ] Can draw diagrams showing pointer movement

### Level 2: Implementation (Guided Practice)
- [ ] Solve E006 (Container) - understand greedy pointer movement
- [ ] Solve E016 (Remove Duplicates) - master read/write pattern
- [ ] Solve E057 (Cycle Detection) - understand fast/slow mechanics
- [ ] Can implement basic template without hints

### Level 3: Application (Independent Solving)
- [ ] Solve E010 (3Sum) - combine with sorting and deduplication
- [ ] Solve M004 (Nth from End) - offset pointers technique
- [ ] Solve M028 (Remove Dups II) - modify same-direction logic
- [ ] Can choose correct sub-pattern for new problems

### Level 4: Mastery (Optimization & Variations)
- [ ] Solve H009 (Trapping Water) - complex pointer movement logic
- [ ] Solve H015 (Min Window) - expandable window with frequency map
- [ ] Can optimize brute force O(n²) solutions to O(n) using two pointers
- [ ] Can explain trade-offs: two pointers vs hash map vs sorting

### Level 5: Teaching (Deep Understanding)
- [ ] Can teach the pattern to someone else without notes
- [ ] Can prove correctness of greedy pointer movements
- [ ] Can derive complexity analysis from first principles
- [ ] Can identify when two pointers WON'T work

## Practice Schedule

**Week 1: Foundations**
- Day 1: E006, E016 (understand opposite/same-direction)
- Day 2: E057, E038 (fast/slow and merging)
- Day 3: Review + E010 (combine with sorting)

**Week 2: Depth**
- Day 1: M004, M058 (linked list mastery)
- Day 2: M028, M030 (in-place modifications)
- Day 3: Review all Medium problems

**Week 3: Mastery**
- Day 1: H009 (complex pointer logic)
- Day 2: H015 (two pointers + frequency tracking)
- Day 3: Mixed practice - random selection from all levels

## Additional Practice

After completing this drill, try these related problems:
- E013: 4Sum (extend 3Sum to k-Sum)
- M017: Merge Intervals (sorting + two pointers)
- M042: Trapping Rain Water II (3D version)
- E108: Move Zeroes (in-place reordering)

## Strategy Guide

See the comprehensive [Two Pointers Pattern Guide](../../strategies/patterns/two-pointers.md) for:
- Detailed complexity analysis
- Proof of correctness for common patterns
- Advanced variations and extensions
- Interview tips and talking points

---

**Progress Tracking:**
- [ ] Completed Easy tier (4 problems)
- [ ] Completed Medium tier (5 problems)
- [ ] Completed Hard tier (3 problems)
- [ ] Can solve new two-pointer problems in 15-20 minutes
- [ ] Ready for interview two-pointer questions
