---
id: M493
old_id: A367
slug: rle-iterator
title: RLE Iterator
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# RLE Iterator

## Problem

Run-length encoding (RLE) is a compression technique that stores repetitive sequences compactly. Instead of storing `[8,8,8,5,5]`, we store `[3,8,2,5]` meaning "three 8s, then two 5s."

In this encoding format, pairs of numbers represent the data:
- Even-indexed positions (0, 2, 4, ...) hold repetition counts
- Odd-indexed positions (1, 3, 5, ...) hold the values being repeated

For example, the encoding `[3,8,2,5]` means:
- 3 repetitions of value 8
- 2 repetitions of value 5
- Which expands to: `[8,8,8,5,5]`

Your task is to build an iterator that can traverse this compressed sequence without actually decompressing it into memory.

Implement the `RLEIterator` class with these methods:

- `RLEIterator(int[] encoded)`: Initialize the iterator with a run-length encoded array
- `int next(int n)`: Skip ahead `n` elements in the virtual sequence and return the value of the nth element consumed. If fewer than `n` elements remain, return `-1`

For instance, if the encoding is `[3,8,2,5]` (representing `[8,8,8,5,5]`):
- `next(2)` consumes two elements and returns `8` (consumed the 1st and 2nd elements, both are 8)
- `next(1)` consumes one more and returns `8` (consumed the 3rd element)
- `next(1)` consumes one more and returns `5` (consumed the 4th element, now into the 5s)
- `next(2)` returns `-1` (only 1 element remains, can't consume 2)

## Why This Matters

Video game engines frequently use run-length encoding for tile-based maps and sprite compression. When a platformer game has long stretches of identical tiles (like a brick wall or grass field), storing each tile individually wastes memory. Instead, games encode these as "50 grass tiles, 10 stone tiles, 30 grass tiles." Your iterator pattern allows the game to stream through these compressed maps efficiently without loading the entire decompressed level into RAM.

Log analysis systems also use RLE iterators to process compressed log files. Server logs often contain repeated events (thousands of identical "heartbeat" messages, for instance), and storing them compressed saves terabytes of disk space. When analyzing logs, engineers need to skip through these repetitive sections quickly to find interesting anomalies. An RLE iterator lets you jump ahead "skip the next 10,000 heartbeat messages" without expanding them all into memory.

## Constraints

- 2 <= encoding.length <= 1000
- encoding.length is even.
- 0 <= encoding[i] <= 10⁹
- 1 <= n <= 10⁹
- At most 1000 calls will be made to next.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Instead of expanding the run-length encoding into an actual array (which could be huge), maintain a pointer to the current position in the encoding array. Track how many elements have been consumed from the current count-value pair. When a pair is exhausted, move to the next pair.
</details>

<details>
<summary>🎯 Main Approach</summary>
Keep an index pointing to the current position in the encoding array (starting at 0) and a counter tracking remaining elements in the current count-value pair. On next(n), consume n elements by decrementing the counter and advancing the index when pairs are exhausted. Return the value at the final position or -1 if insufficient elements remain.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Each next() call runs in O(k) time where k is the number of encoding pairs you skip through, not O(n) where n is the number of elements consumed. This is much more efficient than expanding the encoding. You can make it even faster by preprocessing cumulative counts if you need O(1) random access.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Expand encoding | O(sum of counts) | O(sum of counts) | Impractical for large counts |
| Optimal (Pointer) | O(k) per next | O(1) | k = encoding pairs traversed |

Where k = number of encoding pairs, typically k << n (elements consumed)

## Common Mistakes

1. **Expanding the entire encoding upfront**
   ```python
   # Wrong: Wastes memory and time for large counts
   def __init__(self, encoding):
       self.arr = []
       for i in range(0, len(encoding), 2):
           count, val = encoding[i], encoding[i+1]
           self.arr.extend([val] * count)  # Could be huge!

   # Correct: Keep encoding compressed
   def __init__(self, encoding):
       self.encoding = encoding
       self.index = 0
       self.current_count = encoding[0] if encoding else 0
   ```

2. **Not handling exhausted pairs correctly**
   ```python
   # Wrong: Forgetting to move to next pair
   def next(self, n):
       self.current_count -= n
       if self.current_count < 0:
           return -1  # Wrong! Should check next pairs

   # Correct: Skip exhausted pairs
   def next(self, n):
       while self.index < len(self.encoding):
           if n <= self.current_count:
               self.current_count -= n
               return self.encoding[self.index + 1]
           n -= self.current_count
           self.index += 2
           self.current_count = self.encoding[self.index] if self.index < len(self.encoding) else 0
       return -1
   ```

3. **Off-by-one errors with pair indexing**
   ```python
   # Wrong: Confusing count and value positions
   count = self.encoding[self.index + 1]  # Should be index
   value = self.encoding[self.index]      # Should be index + 1

   # Correct: Count at even index, value at odd index
   count = self.encoding[self.index]      # Even: 0, 2, 4...
   value = self.encoding[self.index + 1]  # Odd: 1, 3, 5...
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Decode String | Medium | Nested encoding with brackets |
| String Compression | Easy | Create run-length encoding |
| Design Compressed String Iterator | Medium | Similar iterator with chars |
| ZigZag Iterator | Medium | Interleave multiple lists |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Iterator Design](../../strategies/patterns/design-patterns.md)
