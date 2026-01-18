---
id: M167
old_id: I179
slug: insert-delete-getrandom-o1
title: Insert Delete GetRandom O(1)
difficulty: medium
category: medium
topics: ["design", "hash-table", "array"]
patterns: ["system-design"]
estimated_time_minutes: 30
frequency: high
related_problems: ["M381", "M710", "M146"]
prerequisites: ["hash-map", "dynamic-array", "randomization"]
---
# Insert Delete GetRandom O(1)

## Problem

Design a data structure that maintains a set of unique integers with three specific operations, all of which must run in average O(1) constant time. The `insert(val)` method adds a value to the set if it's not already present, returning true on successful insertion or false if the value already existed. The `remove(val)` method deletes a value from the set if it exists, returning true on successful removal or false if the value wasn't found. The `getRandom()` method returns a randomly selected element from the current set where every element has exactly equal probability of being chosen—this is called uniform random selection. The challenging part is achieving O(1) average time for all three operations simultaneously. A hash set alone gives you fast insert and remove but can't do uniform random selection efficiently. An array gives you fast random access by index but makes removal slow because you'd need to find and delete elements. Your solution needs to cleverly combine multiple data structures to get the benefits of both approaches, with a particularly clever trick for O(1) removal that doesn't require shifting elements.

## Why This Matters

This problem models a fundamental pattern in building high-performance caching systems and randomized algorithms used across modern software infrastructure. Load balancers use this exact data structure to maintain pools of healthy servers and randomly distribute incoming requests uniformly across them, quickly adding new servers or removing failed ones without slowing down request routing. Randomized testing frameworks maintain test case pools where tests can be added, removed, or randomly selected for fuzzing. Gaming systems use this for managing active player pools, loot drop tables, and random event selection. Database query optimizers use randomized sampling of table rows for statistics collection, requiring fast insertion/deletion as data changes and uniform random selection for sampling. Ad serving platforms maintain advertiser pools and randomly select ads to show while quickly updating the pool as budgets are exhausted or new campaigns launch. The key insight—combining hash maps for O(1) lookup with arrays for O(1) random access, plus the swap-with-last trick for O(1) deletion—is a pattern you'll see repeatedly in systems requiring both fast membership operations and random sampling.

## Constraints

- -2³¹ <= val <= 2³¹ - 1
- At most 2 * 10⁵ calls will be made to insert, remove, and getRandom.
- There will be **at least one** element in the data structure when getRandom is called.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Why One Data Structure Isn't Enough</summary>

Consider each operation separately:
- **HashSet**: O(1) insert/remove, but getRandom is O(n) or impossible to do uniformly
- **Array**: O(1) getRandom with random index, but remove is O(n) (need to find element)

You need the benefits of both. How can you combine them?
</details>

<details>
<summary>🎯 Hint 2: HashMap + ArrayList Combination</summary>

Use two data structures:
1. **ArrayList**: Store actual values for O(1) random access by index
2. **HashMap**: Map value → index in ArrayList for O(1) lookup

The trick for O(1) removal: Instead of shifting elements, swap the element to remove with the last element, then pop. Update the HashMap accordingly.
</details>

<details>
<summary>📝 Hint 3: Implementation Details</summary>

Pseudocode:
```
class RandomizedSet:
    values: ArrayList
    value_to_index: HashMap

    insert(val):
        if val in value_to_index:
            return false

        values.append(val)
        value_to_index[val] = values.length - 1
        return true

    remove(val):
        if val not in value_to_index:
            return false

        // Swap with last element
        index = value_to_index[val]
        last_val = values[last_index]

        values[index] = last_val
        value_to_index[last_val] = index

        // Remove last element
        values.pop()
        delete value_to_index[val]

        return true

    getRandom():
        random_index = random integer in [0, values.length)
        return values[random_index]
```
</details>

## Complexity Analysis

| Approach | Time (insert/remove/getRandom) | Space | Notes |
|----------|-------------------------------|-------|-------|
| HashSet Only | O(1) / O(1) / O(n) | O(n) | Can't get random in O(1) |
| Array Only | O(1) / O(n) / O(1) | O(n) | Remove requires search |
| **HashMap + ArrayList** | **O(1) / O(1) / O(1)** | **O(n)** | Optimal solution |

## Common Mistakes

**Mistake 1: Not updating indices after swap**
```python
# Wrong: After swap, forgot to update HashMap
def remove(self, val):
    if val not in self.val_to_idx:
        return False

    idx = self.val_to_idx[val]
    last_val = self.values[-1]

    self.values[idx] = last_val
    # Wrong: forgot to update self.val_to_idx[last_val] = idx

    self.values.pop()
    del self.val_to_idx[val]
    return True
```

```python
# Correct: Update both data structures
def remove(self, val):
    if val not in self.val_to_idx:
        return False

    idx = self.val_to_idx[val]
    last_val = self.values[-1]

    # Swap
    self.values[idx] = last_val
    self.val_to_idx[last_val] = idx  # Critical update

    # Remove
    self.values.pop()
    del self.val_to_idx[val]
    return True
```

**Mistake 2: Edge case when removing last element**
```python
# Wrong: Fails when removing the last element
def remove(self, val):
    idx = self.val_to_idx[val]
    last_val = self.values[-1]

    self.values[idx] = last_val
    self.val_to_idx[last_val] = idx  # Wrong if idx == len-1

    self.values.pop()
    del self.val_to_idx[val]  # Wrong: already deleted if val == last_val
```

```python
# Correct: Handle when element is already last
def remove(self, val):
    if val not in self.val_to_idx:
        return False

    idx = self.val_to_idx[val]
    last_val = self.values[-1]

    # Move last element to idx
    self.values[idx] = last_val
    self.val_to_idx[last_val] = idx

    # Remove last
    self.values.pop()
    del self.val_to_idx[val]

    return True
# This works even when idx == len-1 because we overwrite then pop
```

**Mistake 3: Not using proper random function**
```python
# Wrong: Not truly uniform random
import random

def getRandom(self):
    return random.choice(list(self.val_to_idx.keys()))
    # Creating list is O(n)! And unnecessary
```

```python
# Correct: O(1) random access
import random

def getRandom(self):
    return random.choice(self.values)
    # Or: self.values[random.randint(0, len(self.values) - 1)]
```

## Variations

| Variation | Difference | Hint |
|-----------|-----------|------|
| With duplicates allowed | Can insert same value multiple times | Use HashMap to count occurrences, store index list |
| Weighted random | Elements have different selection probabilities | Use prefix sum array for weighted selection |
| With iterator support | Support for-each iteration | Array already supports this naturally |
| Thread-safe version | Concurrent access required | Add locks/synchronization to operations |

## Practice Checklist

- [ ] First attempt (blind)
- [ ] Reviewed solution
- [ ] Attempted again after 1 day
- [ ] Attempted again after 3 days
- [ ] Attempted again after 1 week
- [ ] Attempted again after 2 weeks
