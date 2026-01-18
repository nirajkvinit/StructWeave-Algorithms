---
id: M490
old_id: A362
slug: maximum-frequency-stack
title: Maximum Frequency Stack
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Maximum Frequency Stack

## Problem

Imagine you're designing a specialized stack data structure for a music player's "most played songs" feature. This stack needs to track not just what was added most recently, but what appears most frequently overall.

Your task is to implement a `FreqStack` class that combines frequency tracking with stack behavior:

- `FreqStack()` - Initializes a new empty frequency-aware stack
- `void push(int val)` - Adds the integer `val` to the stack
- `int pop()` - Removes and returns the element that has been pushed the most times

Here's the interesting part: when multiple elements are tied for the highest frequency, you must remove the one that was added most recently among them. For example, if you've pushed 5 three times and 7 three times, and 7 was pushed more recently, then `pop()` should return 7.

Think of it like a priority system where frequency is the primary criterion, but recency breaks ties.

## Why This Matters

This problem combines multiple data structure concepts to solve a real-world design challenge. Similar patterns appear in LRU/LFU cache implementations used by operating systems and databases, browser history management, autocomplete systems that prioritize frequent queries, and recommendation engines that balance popularity with recency. Understanding how to efficiently track both frequency and order is crucial for building performant caching systems, which are essential components in web applications, content delivery networks, and database query optimizers. The problem teaches you to think about composite data structures where multiple hashmaps and stacks work together to achieve O(1) operations. This type of creative data structure design is common in system design interviews and real-world performance optimization scenarios where you need to balance multiple competing priorities efficiently.

## Constraints

- 0 <= val <= 10⁹
- At most 2 * 10⁴ calls will be made to push and pop.
- It is guaranteed that there will be at least one element in the stack before calling pop.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
You need to track both frequency counts AND insertion order for elements with the same frequency. Think about maintaining separate stacks for each frequency level, where elements at the same frequency are stored in insertion order.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use a HashMap to track element frequencies, and maintain a HashMap of stacks where each frequency maps to a stack of elements. Track the maximum frequency seen so far. On push, increment frequency and add to the appropriate frequency stack. On pop, remove from the max frequency stack and decrement if that stack becomes empty.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Both push and pop can be O(1) operations. You don't need to search or sort anything - just maintain the right data structures. The key is using nested hash maps: freq[element] → count, and group[count] → stack of elements.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n) pop, O(1) push | O(n) | Linear scan to find max frequency |
| Optimal | O(1) push/pop | O(n) | HashMap + stacks for each frequency |

Where n = total number of elements pushed

## Common Mistakes

1. **Using a single priority queue**
   ```python
   # Wrong: Priority queue doesn't maintain insertion order for same frequency
   def __init__(self):
       self.heap = []  # Max heap by frequency
       self.freq = {}

   # Correct: Use stacks grouped by frequency
   def __init__(self):
       self.freq = {}  # element -> count
       self.group = {}  # count -> stack of elements
       self.max_freq = 0
   ```

2. **Not tracking maximum frequency**
   ```python
   # Wrong: Search for max frequency on each pop
   def pop(self):
       max_f = max(self.group.keys())  # O(k) where k = unique frequencies

   # Correct: Track max frequency as you go
   def pop(self):
       val = self.group[self.max_freq].pop()
       if not self.group[self.max_freq]:
           self.max_freq -= 1
   ```

3. **Forgetting to update frequency on pop**
   ```python
   # Wrong: Only remove from frequency stack
   def pop(self):
       val = self.group[self.max_freq].pop()
       return val

   # Correct: Update element's frequency count too
   def pop(self):
       val = self.group[self.max_freq].pop()
       self.freq[val] -= 1
       if not self.group[self.max_freq]:
           self.max_freq -= 1
       return val
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| LFU Cache | Hard | Evict least frequently used, capacity constraint |
| LRU Cache | Medium | Track recency instead of frequency |
| Min Stack | Easy | Track minimum element, simpler version |
| Design HashMap | Easy | Basic hash table implementation |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Stack Patterns](../../strategies/data-structures/stacks-queues.md)
