---
id: E166
old_id: I256
slug: circular-array-loop
title: Circular Array Loop
difficulty: easy
category: easy
topics: ["array", "two-pointers", "cycle-detection"]
patterns: ["two-pointers-same", "fast-slow-pointers"]
estimated_time_minutes: 15
frequency: medium
related_problems: ["E022", "E142", "E287"]
prerequisites: ["array-traversal", "modulo-arithmetic", "cycle-detection"]
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Circular Array Loop

## Problem

Imagine an array where each element acts as a jump instruction, telling you how many positions to move forward (positive values) or backward (negative values). The array is circular, meaning if you jump past the end, you wrap around to the beginning, and vice versa. For example, in an array of length 5, jumping forward 3 steps from index 4 would land you at index 2.

Your task is to determine whether there exists a valid cycle in this jumping pattern. A valid cycle must satisfy three important conditions. First, following the jump instructions must eventually return you to your starting position—that's what makes it a cycle. Second, all jumps in the cycle must go in the same direction: either all forward (positive) or all backward (negative). You can't have a cycle that sometimes jumps forward and sometimes backward. Third, the cycle must involve at least two different positions; a single position that jumps to itself doesn't count as a valid cycle.

The challenge here involves understanding circular indexing with modulo arithmetic (especially handling negative numbers correctly), detecting cycles efficiently without checking every possible starting point exhaustively, and validating the "same direction" constraint. Think about how the fast-slow pointer technique (Floyd's cycle detection) might help you identify cycles in O(n) time rather than O(n²).

## Why This Matters

Cycle detection is a fundamental algorithmic technique with applications far beyond array jumping. In computer graphics, circular buffer management uses similar wraparound logic. In operating systems, detecting deadlock cycles among processes follows the same pattern. Network routing protocols must detect routing loops to prevent packets from circulating forever. The fast-slow pointer technique you'll apply here is the standard approach for cycle detection in linked lists and is essential knowledge for any software engineer.

This problem also teaches careful handling of modulo arithmetic with negative numbers, which behaves differently across programming languages. In many languages, `-1 % 5` yields `-1` rather than `4`, requiring the formula `((index + jump) % n + n) % n` to ensure positive results. Understanding these subtleties prevents bugs in any algorithm involving circular buffers, ring data structures, or wraparound indexing. The constraint validation aspect (ensuring all cycle elements have the same sign) demonstrates how cycle detection often requires not just finding a cycle, but verifying it meets specific properties.

## Constraints

- 1 <= nums.length <= 5000
- -1000 <= nums[i] <= 1000
- nums[i] != 0

## Think About

1. What makes this problem challenging?
   - Handling circular array indexing with positive and negative movements
   - Detecting cycles that may only involve a subset of the array
   - Distinguishing valid cycles from invalid ones (single-element, mixed signs)

2. Can you identify subproblems?
   - Computing the next index given current position and movement value
   - Detecting if a sequence of moves forms a cycle
   - Validating cycle properties (same sign, length > 1)

3. What invariants must be maintained?
   - All values in a valid cycle must have the same sign
   - The cycle must contain at least 2 elements
   - Circular indexing: (current + nums[current]) % n, handling negatives

4. Is there a mathematical relationship to exploit?
   - Fast and slow pointer technique can detect cycles efficiently
   - Each starting position needs to be checked only once
   - Marking visited positions prevents redundant work

## Approach Hints

### Hint 1: Brute Force - Check Every Starting Position
Start from each index and follow the movement rules, keeping track of visited indices. For each starting position, simulate the movement and check if you return to the start. Verify that all indices in the path have the same sign and the cycle has more than one element.

**Key insight**: You need to track both the path and check cycle validity conditions.

**Limitations**: Time complexity O(n²) because each position may traverse the entire array.

### Hint 2: Optimized with Marking
Use the fast-slow pointer technique to detect cycles. From each unvisited position, advance a slow pointer one step and a fast pointer two steps. If they meet and all conditions are satisfied, you've found a valid cycle. Mark visited positions to avoid rechecking.

**Key insight**: Floyd's cycle detection can identify cycles in O(n) per starting point.

**How to implement**:
- For each starting index, initialize slow and fast pointers
- Advance slow by one step: slow = getNext(slow)
- Advance fast by two steps: fast = getNext(getNext(fast))
- Check if moves maintain the same direction as the start

### Hint 3: Optimal with Early Termination
Enhance the marking approach by invalidating entire paths that lead to already-visited positions or don't form valid cycles. When you determine a path is invalid, mark all positions in that path as visited to prevent future checks.

**Key insight**: Once you know a position doesn't lead to a valid cycle, all positions that lead to it also don't form valid cycles.

**Optimization strategy**:
- Use a visited array or modify the input array to mark checked positions
- When a cycle is invalid or path leads to a visited position, mark the entire path
- getNext function: `(i + nums[i] % n + n) % n` handles negative wrapping

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Brute Force (Simulate all paths) | O(n²) | O(n) | Check each starting position, may traverse entire array per start |
| Fast-Slow Pointer (Basic) | O(n²) | O(n) | Floyd's algorithm per unvisited position, visiting array for tracking |
| Fast-Slow with Path Marking | O(n) | O(n) | Each position visited at most twice (once as start, once in path) |
| In-place Path Invalidation | O(n) | O(1) | Modify input array to mark checked positions, amortized O(n) |

## Common Mistakes

### Mistake 1: Incorrect circular indexing for negative numbers
```
// Wrong - doesn't handle negative results correctly
next = (current + nums[current]) % n

// Why it fails: In languages like Java/C++, -1 % 5 = -1, not 4
// Example: current=0, nums[0]=-1, n=5
// Result: (0 + -1) % 5 = -1 (invalid index!)

// Correct - ensures positive result
next = ((current + nums[current]) % n + n) % n
```

### Mistake 2: Not checking single-element cycles
```
// Wrong - allows self-loops
if (slow == fast) return true

// Why it fails: nums[i] might equal 0 modulo n (e.g., nums[2]=3, n=3)
// This creates a single-element "cycle" which is invalid

// Correct - verify cycle has more than one element
if (slow == fast && slow != getNext(slow)) return true
```

### Mistake 3: Not validating consistent direction throughout cycle
```
// Wrong - only checks starting direction
direction = nums[start] > 0
// ... move pointers without checking direction

// Why it fails: Cycle might contain both positive and negative values
// Example: [2, -1, 1] starting at index 0

// Correct - check direction at each step
if ((nums[current] > 0) != (nums[start] > 0)) {
    // Direction changed, invalid cycle
    break
}
```

## Variations

| Variation | Difference | Difficulty |
|-----------|-----------|------------|
| Find the actual cycle | Return the indices forming the cycle instead of boolean | Medium |
| Count all valid cycles | Count total number of valid cycles (not just existence) | Medium |
| Maximum cycle length | Find the longest valid cycle in the array | Medium |
| Minimum cycle length | Find the shortest valid cycle with specific constraints | Hard |
| Bi-directional cycles | Allow cycles with mixed directions under certain rules | Hard |
| Weighted circular array | Movement based on weighted values with different rules | Hard |

## Practice Checklist

Track your progress on mastering this problem:

- [ ] First attempt (understand the problem)
- [ ] Implement brute force solution
- [ ] Implement fast-slow pointer approach
- [ ] Optimize with path marking
- [ ] Handle all edge cases (single element, mixed signs, self-loops)
- [ ] Review after 1 day
- [ ] Review after 3 days
- [ ] Review after 1 week
- [ ] Solve without hints
- [ ] Explain solution to someone else
- [ ] Complete in under 20 minutes

**Strategy**: See [Two Pointers Pattern](../strategies/patterns/two-pointers.md)
