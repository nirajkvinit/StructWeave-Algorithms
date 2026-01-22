---
id: H071
old_id: I259
slug: lfu-cache
title: LFU Cache
difficulty: hard
category: hard
topics: []
patterns: []
estimated_time_minutes: 45
---
# LFU Cache

## Problem

Create a cache data structure that implements the <a href="https://en.wikipedia.org/wiki/Least_frequently_used" target="_blank">Least Frequently Used (LFU) eviction policy.

Your `LFUCache` class should support these operations:

	- `LFUCache(int capacity)` Constructor that sets the maximum number of items the cache can hold.
	- `int get(int key)` Retrieves the value associated with the key if it exists in the cache, otherwise returns `-1`.
	- `void put(int key, int value)` Inserts a new key-value pair or updates an existing key's value. If the cache is at full capacity when inserting a new key, first evict the key that has been accessed the fewest times. In case of a tie in access frequency, evict the key that was least recently used among those with the same frequency.

Each key maintains an access counter tracking how many times it has been used. When first added via `put`, a key's counter starts at `1`. Both `get` and `put` operations increment the counter for the accessed key.

Both operations must achieve `O(1)` average time complexity.

## Why This Matters

This problem develops fundamental algorithmic thinking and problem-solving skills.

## Constraints

- 1 <= capacity <= 10⁴
- 0 <= key <= 10⁵
- 0 <= value <= 10⁹
- At most 2 * 10⁵ calls will be made to get and put.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

The challenge is maintaining O(1) operations while tracking both frequency AND recency. You need a data structure that can quickly:
1. Find a key's value and update its frequency
2. Identify the least frequently used key
3. Break ties by finding the least recently used among equal frequencies

Think about combining hash maps with doubly linked lists - similar to LRU cache but with an extra dimension.

</details>

<details>
<summary>🎯 Main Approach</summary>

Use a three-layer structure:
1. **Key-to-Node map**: HashMap mapping keys to nodes containing (key, value, frequency)
2. **Frequency-to-List map**: HashMap mapping each frequency to a doubly linked list of nodes with that frequency
3. **Min frequency tracker**: Integer tracking the current minimum frequency

When accessing a key, remove it from its current frequency list and add it to the next frequency list. When evicting, remove from the list corresponding to min frequency (and update min frequency if that list becomes empty).

</details>

<details>
<summary>⚡ Optimization Tip</summary>

Don't rebuild frequency lists on every operation. Instead, maintain them incrementally. When a node's frequency increases from f to f+1, simply move it from the f-list to the (f+1)-list. Track minFreq carefully - it only increases when you add new keys (starts at 1) or when the current minFreq list becomes empty after an access.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n) per operation | O(n) | Linear scan to find min frequency |
| Optimal | O(1) per operation | O(capacity) | HashMap + doubly linked lists |

## Common Mistakes

1. **Not updating min frequency correctly**
   ```python
   # Wrong: Forgetting to update minFreq when its list becomes empty
   def get(self, key):
       if key not in self.key_map:
           return -1
       self.increment_frequency(key)
       # Missing: Check if minFreq list is now empty
       return self.key_map[key].value

   # Correct: Update minFreq when necessary
   def get(self, key):
       if key not in self.key_map:
           return -1
       node = self.key_map[key]
       old_freq = node.freq
       self.increment_frequency(key)
       # If old minFreq list is now empty, increment minFreq
       if old_freq == self.min_freq and not self.freq_map[old_freq]:
           self.min_freq += 1
       return node.value
   ```

2. **Inefficient eviction policy**
   ```python
   # Wrong: Scanning all frequencies to find minimum
   def evict(self):
       min_freq = min(self.freq_map.keys())  # O(k) operation
       # ... evict from min_freq list

   # Correct: Track minimum frequency as instance variable
   def evict(self):
       # Use self.min_freq directly - O(1)
       lru_list = self.freq_map[self.min_freq]
       # Remove least recent from this list
   ```

3. **Not handling frequency transitions properly**
   ```python
   # Wrong: Creating new node instead of moving existing one
   def increment_frequency(self, key):
       node = self.key_map[key]
       new_node = Node(key, node.value, node.freq + 1)  # Memory leak
       self.key_map[key] = new_node

   # Correct: Update existing node and move between lists
   def increment_frequency(self, key):
       node = self.key_map[key]
       old_freq = node.freq
       # Remove from old frequency list
       self.freq_map[old_freq].remove(node)
       # Update frequency and add to new frequency list
       node.freq += 1
       self.freq_map[node.freq].add(node)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| LRU Cache | Medium | Only tracks recency, not frequency |
| LFU with Time Limit | Hard | Items expire after certain time |
| Weighted LFU Cache | Hard | Different items have different weights |
| Multi-level Cache | Hard | Multiple cache levels with different policies |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved (O(1) per operation)
- [ ] Clean, readable code
- [ ] Handled all edge cases (capacity 1, tie-breaking)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Hash Table](../../prerequisites/hash-tables.md)
