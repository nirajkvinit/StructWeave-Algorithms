---
id: M168
old_id: I180
slug: insert-delete-getrandom-o1-duplicates-allowed
title: Insert Delete GetRandom O(1) - Duplicates allowed
difficulty: medium
category: medium
topics: ["hash-table", "array", "design"]
patterns: ["data-structure-design"]
estimated_time_minutes: 30
frequency: medium
related_problems: ["E128", "M120", "M438"]
prerequisites: ["hash-tables", "dynamic-arrays", "randomization"]
---
# Insert Delete GetRandom O(1) - Duplicates allowed

## Problem

Design a multiset (a collection that allows duplicate values) supporting three operations, all in average O(1) time. The `insert(val)` method adds a value to the collection, even if it already exists, and returns true if this is the first occurrence of that value or false if duplicates already existed. The `remove(val)` method deletes just one occurrence of the value if it exists (not all occurrences), returning true if successfully removed or false if the value wasn't present at all. The `getRandom()` method returns a randomly selected element where the probability of selection is proportional to how many times that element appears—so if the number 5 appears three times and the number 7 appears once, you're three times more likely to get 5 than 7. This is called weighted random selection based on frequency. The challenge is trickier than the no-duplicates version because you now need to track multiple positions for the same value, efficiently pick which occurrence to remove when deleting, and ensure the weighted randomness works correctly when you have varying numbers of duplicates.

## Why This Matters

This problem extends the randomized data structure pattern to handle real-world scenarios where duplicates matter and frequency affects probability. Weighted random selection based on occurrence count is fundamental in machine learning for training data sampling, where you might oversample minority classes or sample with replacement allowing duplicates. Music streaming services use this to create shuffle-play modes that favor frequently played songs while still including everything in the playlist. E-commerce recommendation engines maintain product pools where popular items appear multiple times to increase their selection probability for display. Network traffic simulation systems use weighted random selection to model realistic traffic patterns where some packet types occur more frequently. Inventory management systems track multiple identical items and need to allocate/deallocate specific instances while maintaining random selection proportional to stock levels. Game developers use this for loot systems where rare items have lower drop rates (fewer duplicates in the pool) and common items have higher rates (more duplicates). The technique of mapping values to sets of indices while maintaining an array for random access is essential for building systems that combine membership operations, frequency tracking, and probabilistic selection.

## Constraints

- -2³¹ <= val <= 2³¹ - 1
- At most 2 * 10⁵ calls **in total** will be made to insert, remove, and getRandom.
- There will be **at least one** element in the data structure when getRandom is called.

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Data Structure Selection</summary>

To achieve O(1) random access, you need an array-like structure where any position can be accessed by index. However, for O(1) insertion and deletion, you also need a way to quickly find element positions. Consider combining a list with a hash map that stores indices.

</details>

<details>
<summary>🎯 Hint 2: Handling Duplicates</summary>

Unlike the single-duplicate version, the same value can appear multiple times in the collection. Your hash map should map each value to ALL of its positions in the array. A set of indices for each value works well. When deleting, you need to remove one index from this set while maintaining O(1) complexity.

</details>

<details>
<summary>📝 Hint 3: Efficient Removal Strategy</summary>

To remove an element in O(1), avoid shifting array elements. Instead:
1. Find any index where the value exists (pick one from the set)
2. Swap the element at this index with the last element in the array
3. Remove the last element (O(1) operation)
4. Update the hash map: remove the old index, add the new index for the swapped element

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Naive List Only | O(n) insert, O(n) remove, O(1) getRandom | O(n) | Linear search for removal is too slow |
| **HashMap + ArrayList** | **O(1) avg all ops** | **O(n)** | Optimal: HashMap stores sets of indices, ArrayList enables random access |

## Common Mistakes

### Mistake 1: Not updating swapped element's indices correctly

```python
# Wrong: Forgetting to update the index of the swapped element
def remove(self, val):
    if val not in self.val_to_indices:
        return False

    idx_to_remove = next(iter(self.val_to_indices[val]))
    last_element = self.nums[-1]

    # Swap and remove
    self.nums[idx_to_remove] = last_element
    self.nums.pop()

    # WRONG: Not updating last_element's index in the map
    self.val_to_indices[val].remove(idx_to_remove)
    return True

# Correct: Update both the removed and swapped element indices
def remove(self, val):
    if val not in self.val_to_indices:
        return False

    idx_to_remove = next(iter(self.val_to_indices[val]))
    last_idx = len(self.nums) - 1
    last_element = self.nums[last_idx]

    # Swap
    self.nums[idx_to_remove] = last_element

    # Update indices for the swapped element
    self.val_to_indices[last_element].add(idx_to_remove)
    self.val_to_indices[last_element].remove(last_idx)

    # Remove the target element
    self.val_to_indices[val].remove(idx_to_remove)
    if not self.val_to_indices[val]:
        del self.val_to_indices[val]

    self.nums.pop()
    return True
```

### Mistake 2: Edge case when removing the last element

```python
# Wrong: Doesn't handle when removing the last element itself
def remove(self, val):
    idx_to_remove = next(iter(self.val_to_indices[val]))
    last_element = self.nums[-1]

    # If idx_to_remove == len(nums)-1, we're swapping with itself!
    self.nums[idx_to_remove] = last_element
    # This breaks the index set logic

# Correct: Check if we're removing the last element
def remove(self, val):
    if val not in self.val_to_indices:
        return False

    idx_to_remove = next(iter(self.val_to_indices[val]))
    last_idx = len(self.nums) - 1

    if idx_to_remove != last_idx:
        last_element = self.nums[last_idx]
        self.nums[idx_to_remove] = last_element

        # Update swapped element's indices
        self.val_to_indices[last_element].add(idx_to_remove)
        self.val_to_indices[last_element].remove(last_idx)

    # Remove target element
    self.val_to_indices[val].remove(idx_to_remove)
    if not self.val_to_indices[val]:
        del self.val_to_indices[val]

    self.nums.pop()
    return True
```

### Mistake 3: Using list instead of set for indices

```python
# Wrong: Using a list makes removal O(n)
self.val_to_indices = {}  # val -> [idx1, idx2, ...]

# When removing, finding and removing from list is O(n)
self.val_to_indices[val].remove(idx)  # O(n) operation!

# Correct: Use set for O(1) add/remove operations
self.val_to_indices = {}  # val -> {idx1, idx2, ...}
self.val_to_indices[val].remove(idx)  # O(1) operation
```

## Variations

| Variation | Description | Difficulty |
|-----------|-------------|------------|
| No duplicates version | Simpler version where each value appears at most once | Medium |
| GetRandom with weight | Return elements with custom weights, not just frequency | Hard |
| Delete all occurrences | Remove all instances of a value at once | Medium |
| k-th smallest element | Support finding k-th smallest in O(log n) | Hard |
| Range delete | Delete all values in a given range | Hard |

## Practice Checklist

- [ ] First attempt (solve independently)
- [ ] Review optimal solution
- [ ] Implement without looking at solution
- [ ] Test with edge cases (single element, all duplicates, removing last element)
- [ ] Practice after 1 day
- [ ] Practice after 3 days
- [ ] Practice after 1 week

**Strategy**: See [Data Structure Design Patterns](../strategies/patterns/data-structure-design.md)
