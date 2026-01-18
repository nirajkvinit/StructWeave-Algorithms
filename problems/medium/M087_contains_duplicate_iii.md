---
id: M087
old_id: I020
slug: contains-duplicate-iii
title: Contains Duplicate III
difficulty: medium
category: medium
topics: ["array", "sliding-window", "ordered-set"]
patterns: []
estimated_time_minutes: 30
frequency: low
related_problems: ["E217", "E219", "M220"]
prerequisites: ["sliding-window", "ordered-set", "bucket-sort"]
---
# Contains Duplicate III

## Problem

You receive an integer array `nums` along with two integer parameters `indexDiff` and `valueDiff`. Your task is to locate any index pair `(i, j)` that simultaneously satisfies three conditions: first, `i != j` meaning the indices must be different; second, `abs(i - j) <= indexDiff` meaning the elements must be at most indexDiff positions apart in the array; and third, `abs(nums[i] - nums[j]) <= valueDiff` meaning the element values must differ by at most valueDiff. Output `true` when at least one qualifying pair exists, or `false` if none can be found. This is essentially a two-dimensional proximity search: you're looking for elements that are close both in position (index constraint) and in value (value constraint). The indexDiff constraint suggests using a sliding window of size indexDiff, while the valueDiff constraint requires efficiently checking if values within that window fall in the range `[nums[i] - valueDiff, nums[i] + valueDiff]`. Edge cases include indexDiff covering the entire array, valueDiff being zero (requiring exact duplicates), negative numbers creating wide value ranges, and situations where many elements cluster in value but are too far apart in position.

## Why This Matters

This problem models anomaly detection in time-series data, where you're searching for similar values occurring close together in time, which might indicate sensor errors, duplicate events, or clustering patterns. In financial fraud detection, identifying transactions of similar amounts happening within a short time window can flag suspicious activity. Network intrusion detection systems look for similar packet sizes or request patterns within temporal windows to identify attacks. In quality control, detecting measurements that are suspiciously similar within a production batch can indicate calibration drift. Recommendation systems use sliding window techniques with value similarity to find related user behaviors or product affinities in event streams. The dual constraints teach you to balance spatial and value-based indexing, combining sliding windows with efficient range search data structures like ordered sets or bucketing schemes. This problem demonstrates how combining multiple algorithmic techniques (sliding windows plus binary search trees or hash-based bucketing) solves complex multi-dimensional proximity queries efficiently.

## Examples

**Example 1:**
- Input: `nums = [1,2,3,1], indexDiff = 3, valueDiff = 0`
- Output: `true`
- Explanation: We can choose (i, j) = (0, 3).
We satisfy the three conditions:
i != j --> 0 != 3
abs(i - j) <= indexDiff --> abs(0 - 3) <= 3
abs(nums[i] - nums[j]) <= valueDiff --> abs(1 - 1) <= 0

**Example 2:**
- Input: `nums = [1,5,9,1,5,9], indexDiff = 2, valueDiff = 3`
- Output: `false`
- Explanation: After trying all the possible pairs (i, j), we cannot satisfy the three conditions, so we return false.

## Constraints

- 2 <= nums.length <= 10⁵
- -10⁹ <= nums[i] <= 10⁹
- 1 <= indexDiff <= nums.length
- 0 <= valueDiff <= 10⁹

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>💡 Hint 1: Sliding Window Constraint</summary>

The indexDiff constraint suggests using a sliding window of size indexDiff. For each position i, you only need to check elements within the window [i - indexDiff, i - 1]. The challenge is efficiently finding if any element in this window satisfies the valueDiff constraint.

</details>

<details>
<summary>🎯 Hint 2: Efficient Range Search</summary>

For each element nums[i], you need to find if there exists a value in the window such that:
- nums[i] - valueDiff <= value <= nums[i] + valueDiff

This is a range search problem. Options:
1. **Ordered Set (TreeSet/SortedSet)**: Insert/delete in O(log k), range query in O(log k)
2. **Buckets**: Divide value space into buckets of size valueDiff + 1
3. **Brute force**: Check all elements in window, O(k) per element

</details>

<details>
<summary>📝 Hint 3: Bucket Approach (Optimal for Understanding)</summary>

Bucket technique:
```
1. Create buckets of size (valueDiff + 1)
2. For each element nums[i]:
   a. Calculate bucket_id = nums[i] // (valueDiff + 1)
   b. Check if bucket_id already has an element (same bucket = within range)
   c. Check adjacent buckets (bucket_id - 1, bucket_id + 1)
   d. If found within valueDiff, return true
   e. Add nums[i] to bucket_id
   f. Remove nums[i - indexDiff] from window (maintain size)
3. Return false if no pair found
```

Time: O(n), Space: O(min(n, indexDiff))

Alternative with ordered set:
```
1. Maintain ordered set of size <= indexDiff
2. For each nums[i]:
   a. Search for ceiling(nums[i] - valueDiff)
   b. If found and <= nums[i] + valueDiff, return true
   c. Add nums[i] to set
   d. Remove nums[i - indexDiff] if needed
```

Time: O(n log k), Space: O(min(n, indexDiff))

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n × indexDiff) | O(1) | Check all pairs within indexDiff, simple but slow |
| Ordered Set (TreeSet) | O(n log k) | O(k) | k = min(n, indexDiff). Use ceiling/floor operations |
| **Bucket Sort** | **O(n)** | **O(k)** | Optimal approach, divides value space into buckets |
| Sorting + Two Pointers | O(n log n) | O(n) | Loses index information, doesn't work well here |

## Common Mistakes

**Mistake 1: Not maintaining window size properly**

```python
# Wrong - Window grows unbounded
def containsNearbyAlmostDuplicate(nums, indexDiff, valueDiff):
    window = set()
    for i in range(len(nums)):
        # Check window...
        window.add(nums[i])
        # Forgot to remove old elements!
```

```python
# Correct - Remove elements outside window
def containsNearbyAlmostDuplicate(nums, indexDiff, valueDiff):
    from sortedcontainers import SortedList
    window = SortedList()

    for i in range(len(nums)):
        # Check if value in range exists
        pos = window.bisect_left(nums[i] - valueDiff)
        if pos < len(window) and window[pos] <= nums[i] + valueDiff:
            return True

        window.add(nums[i])
        if i >= indexDiff:
            window.remove(nums[i - indexDiff])  # Maintain window size

    return False
```

**Mistake 2: Incorrect bucket size or ID calculation**

```python
# Wrong - Bucket size doesn't guarantee coverage
def containsNearbyAlmostDuplicate(nums, indexDiff, valueDiff):
    buckets = {}
    bucket_size = valueDiff  # Wrong! Should be valueDiff + 1

    for i in range(len(nums)):
        bucket_id = nums[i] // bucket_size  # Can miss adjacent values
        # ...
```

```python
# Correct - Bucket size ensures adjacent buckets cover range
def containsNearbyAlmostDuplicate(nums, indexDiff, valueDiff):
    if valueDiff < 0:
        return False

    buckets = {}
    bucket_size = valueDiff + 1  # Correct size

    for i in range(len(nums)):
        bucket_id = nums[i] // bucket_size

        # Check same bucket
        if bucket_id in buckets:
            return True

        # Check adjacent buckets
        if bucket_id - 1 in buckets and abs(nums[i] - buckets[bucket_id - 1]) <= valueDiff:
            return True
        if bucket_id + 1 in buckets and abs(nums[i] - buckets[bucket_id + 1]) <= valueDiff:
            return True

        buckets[bucket_id] = nums[i]

        if i >= indexDiff:
            del buckets[nums[i - indexDiff] // bucket_size]

    return False
```

**Mistake 3: Not handling negative numbers in bucket calculation**

```python
# Wrong - Negative numbers cause incorrect bucketing
def containsNearbyAlmostDuplicate(nums, indexDiff, valueDiff):
    bucket_size = valueDiff + 1
    bucket_id = nums[i] // bucket_size  # Python's // rounds toward -inf
    # For nums[i] = -5, valueDiff = 2: bucket_id = -5 // 3 = -2
    # For nums[i] = -4, valueDiff = 2: bucket_id = -4 // 3 = -2
    # But -5 and -4 differ by 1, should be in same bucket (correct)
    # Actually Python handles this correctly!
```

```python
# Correct - Python's floor division handles negatives correctly
def containsNearbyAlmostDuplicate(nums, indexDiff, valueDiff):
    if valueDiff < 0:
        return False

    buckets = {}
    bucket_size = valueDiff + 1

    for i in range(len(nums)):
        # Python's // correctly handles negatives
        bucket_id = nums[i] // bucket_size

        if bucket_id in buckets:
            return True

        # Check adjacent buckets with explicit valueDiff check
        for adj in [bucket_id - 1, bucket_id + 1]:
            if adj in buckets and abs(nums[i] - buckets[adj]) <= valueDiff:
                return True

        buckets[bucket_id] = nums[i]

        if i >= indexDiff:
            del buckets[nums[i - indexDiff] // bucket_size]

    return False
```

## Variations

| Variation | Difficulty | Description |
|-----------|------------|-------------|
| Contains Duplicate | Easy | Just check if any duplicates exist |
| Contains Duplicate II | Easy | Check for duplicates within index distance k |
| Contains Duplicate III | Medium | This problem - both index and value constraints |
| Max Sum of Rectangle No Larger Than K | Hard | 2D version with cumulative sum constraint |
| Sliding Window Maximum | Hard | Find maximum in each sliding window |

## Practice Checklist

- [ ] Day 1: Solve using ordered set (TreeSet/SortedList)
- [ ] Day 2: Solve using bucket approach for O(n) time
- [ ] Day 7: Re-solve from scratch, focus on edge cases (negatives, valueDiff=0)
- [ ] Day 14: Compare bucket vs ordered set tradeoffs
- [ ] Day 30: Implement without external libraries (manual BST or simpler approach)

**Strategy**: See [Sliding Window with Ordered Set](../strategies/patterns/sliding-window.md)
