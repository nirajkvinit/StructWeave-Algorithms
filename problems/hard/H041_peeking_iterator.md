---
id: H041
old_id: I083
slug: peeking-iterator
title: Peeking Iterator
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# Peeking Iterator

## Problem

Create an iterator wrapper that extends standard iterator functionality by adding a preview capability alongside the standard traversal and availability-checking methods.

Build a `PeekingIterator` class with these methods:

	- `PeekingIterator(Iterator<int> nums)` Sets up the wrapper using a provided integer iterator as its underlying data source.
	- `int next()` Retrieves the upcoming element from the collection and advances the internal position forward.
	- `boolean hasNext()` Indicates whether additional elements remain available for retrieval.
	- `int peek()` Retrieves the upcoming element from the collection **while keeping** the internal position unchanged.

**Note:** Implementation details for constructors and `Iterator` vary across programming languages, though all provide the standard `int next()` and `boolean hasNext()` capabilities.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Constraints

- 1 <= nums.length <= 1000
- 1 <= nums[i] <= 1000
- All the calls to next and peek are valid.
- At most 1000 calls will be made to next, hasNext, and peek.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>Key Insight</summary>
The peek operation needs to return the next element without consuming it. Since the underlying iterator only moves forward, you need to cache the next element before calling the iterator's next() method. Think of maintaining a buffer that holds the "peeked" value.
</details>

<details>
<summary>Main Approach</summary>
Maintain a cache variable that stores the next element. In the constructor, immediately fetch the first element from the iterator. When peek() is called, return the cached value. When next() is called, save the cached value to return, then fetch the next element from the iterator into the cache. For hasNext(), check if the cache has a valid value.
</details>

<details>
<summary>Optimization Tip</summary>
Use a flag or special value (like null in languages that support it) to track whether the cache is valid. This handles edge cases when the iterator is exhausted. Alternatively, maintain both the cached value and a boolean flag indicating whether more elements exist.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Caching Single Element | O(1) | O(1) | All operations (next, peek, hasNext) run in constant time |
| Optimal | O(1) | O(1) | Only stores one element ahead, minimal space overhead |

## Common Mistakes

1. **Calling Iterator's next() in peek()**
   ```python
   # Wrong: This consumes the element
   def peek(self):
       return self.iterator.next()

   # Correct: Return cached value without consuming
   def peek(self):
       return self.cache
   ```

2. **Not Initializing Cache in Constructor**
   ```python
   # Wrong: Cache is empty initially
   def __init__(self, iterator):
       self.iterator = iterator
       self.cache = None

   # Correct: Pre-fetch first element
   def __init__(self, iterator):
       self.iterator = iterator
       self.cache = iterator.next() if iterator.hasNext() else None
   ```

3. **Forgetting to Update Cache After next()**
   ```python
   # Wrong: Cache becomes stale
   def next(self):
       return self.cache

   # Correct: Update cache with next element
   def next(self):
       result = self.cache
       self.cache = self.iterator.next() if self.iterator.hasNext() else None
       return result
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Multi-Step Peek Iterator | Hard | Support peek(k) to look k elements ahead |
| Bidirectional Peeking Iterator | Hard | Support both peekNext() and peekPrevious() |
| Buffered Iterator | Medium | Peek multiple elements with buffer |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Iterator Design Pattern](../../strategies/patterns/design-patterns.md)
