---
id: E016
old_id: F026
slug: remove-duplicates-from-sorted-array
title: Remove Duplicates from Sorted Array
difficulty: easy
category: easy
topics: ["array", "two-pointers"]
patterns: ["two-pointers-same", "in-place-modification"]
estimated_time_minutes: 15
frequency: high
related_problems: ["E027", "M080", "E283"]
prerequisites: ["arrays-basics", "two-pointers-basics"]
strategy_ref: ../../strategies/patterns/two-pointers.md
---
# Remove Duplicates from Sorted Array

## Problem

Remove duplicate values from a sorted array in-place and return the count of unique elements.

## Why This Matters

This problem is a cornerstone of the two-pointer technique for in-place array manipulation. It teaches:
- **In-place algorithms**: Modifying data without extra space
- **Two-pointer pattern**: Using multiple indices to track different positions
- **Exploiting sorted data**: Leveraging order to optimize solutions

**Real-world applications:**
- Database deduplication and data cleaning
- Memory-efficient data processing in embedded systems
- Stream processing with limited memory
- Log file analysis and compression

## Examples

**Example 1:**
- Input: `nums = [1,1,2]`
- Output: `2, nums = [1,2,_]`
- Explanation: Your function should return k = 2, with the first two elements of nums being 1 and 2 respectively.
It does not matter what you leave beyond the returned k (hence they are underscores).

**Example 2:**
- Input: `nums = [0,0,1,1,1,2,2,3,3,4]`
- Output: `5, nums = [0,1,2,3,4,_,_,_,_,_]`
- Explanation: Your function should return k = 5, with the first five elements of nums being 0, 1, 2, 3, and 4 respectively.
It does not matter what you leave beyond the returned k (hence they are underscores).

## Constraints

- 1 <= nums.length <= 3 * 10⁴
- -100 <= nums[i] <= 100
- nums is sorted in **non-decreasing** order.

## Think About

1. How does the sorted property help you detect duplicates?
2. Can you solve this with O(1) extra space?
3. What do the two pointers represent in this problem?
4. How do you know when to advance each pointer?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Using the sorted property</summary>

Since the array is sorted, all duplicate values are **adjacent** to each other.

**Think about:**
- If `nums[i] == nums[i+1]`, they're duplicates
- You only need to compare adjacent elements
- No need to look at the entire array for each element

This is fundamentally different from unsorted arrays where you'd need a hash set.

</details>

<details>
<summary>🎯 Hint 2: The two-pointer insight</summary>

Use two pointers with different purposes:
- **Write pointer**: Position where next unique element should be written
- **Read pointer**: Scans through the array looking for unique elements

**Strategy:**
1. Start with write pointer at index 0 (first element is always unique)
2. Scan with read pointer from index 1
3. When you find an element different from the previous one, it's unique
4. Write it at the write pointer position and advance write pointer

**Key insight:** Write pointer is always <= read pointer, so you never overwrite data you haven't read yet.

</details>

<details>
<summary>📝 Hint 3: Two-pointer algorithm</summary>

```
function removeDuplicates(nums):
    if array is empty:
        return 0

    write_index = 1  # First element always stays

    for read_index from 1 to end:
        # If current element is different from previous (unique)
        if nums[read_index] != nums[read_index - 1]:
            nums[write_index] = nums[read_index]
            write_index += 1

    return write_index  # Number of unique elements
```

**Example trace for [1,1,2,2,3]:**
1. write=1, read=1: nums[1]=1 == nums[0]=1 → skip
2. write=1, read=2: nums[2]=2 != nums[1]=1 → write 2 at index 1, write=2
3. write=2, read=3: nums[3]=2 == nums[2]=2 → skip
4. write=2, read=4: nums[4]=3 != nums[3]=2 → write 3 at index 2, write=3
5. Return 3 → Array is now [1,2,3,2,3], first 3 elements are unique

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Hash Set | O(n) | O(n) | Extra space; works for unsorted too |
| New Array | O(n) | O(n) | Simple but violates in-place requirement |
| **Two Pointers (Optimal)** | **O(n)** | **O(1)** | In-place; exploits sorted property |

**Why Two Pointers Wins:**
- Time: O(n) - single pass through array
- Space: O(1) - only two integer pointers
- In-place: Modifies array directly
- Exploits sortedness: Only checks adjacent elements

---

## Common Mistakes

### 1. Overwriting unread elements
```
# WRONG: Write pointer ahead of read pointer
for i in range(len(nums)):
    if nums[i] is unique:
        nums[unique_count] = nums[i]  # Might overwrite nums[i] before reading it!

# CORRECT: Write pointer always behind or equal to read pointer
for i in range(1, len(nums)):
    if nums[i] != nums[i-1]:  # Compare with previous (already read)
        nums[write] = nums[i]
        write += 1
```

### 2. Starting write pointer at wrong position
```
# WRONG: Starting at 0
write = 0
for i in range(len(nums)):
    if nums[i] != nums[i-1]:  # Index error when i=0!
        nums[write] = nums[i]
        write += 1

# CORRECT: First element always stays, start write at 1
write = 1
for i in range(1, len(nums)):
    if nums[i] != nums[i-1]:
        nums[write] = nums[i]
        write += 1
```

### 3. Comparing with wrong element
```
# WRONG: Comparing with element at write pointer
if nums[i] != nums[write]:
    nums[write] = nums[i]
    write += 1
# This doesn't work correctly!

# CORRECT: Compare with previous element (adjacent in sorted array)
if nums[i] != nums[i-1]:
    nums[write] = nums[i]
    write += 1
```

### 4. Forgetting to handle empty array
```
# WRONG: Assumes array has elements
write = 1
for i in range(1, len(nums)):  # Works, but...
    ...
return write  # Returns 1 for empty array!

# CORRECT: Check empty case
if not nums:
    return 0
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Remove Element** | Remove specific value | Same two-pointer, different condition |
| **Remove Duplicates II** | Keep at most 2 of each | Compare with element 2 positions back |
| **Move Zeros** | Move zeros to end | Two pointers, swap instead of overwrite |
| **Unsorted array** | Not sorted | Use hash set, O(n) space |
| **Return new array** | Can use extra space | Filter or create new array |
| **Count duplicates** | Just count, don't modify | Single pass counting |

**Variation: Remove Duplicates II (at most 2 duplicates):**
```
def removeDuplicates(nums):
    if len(nums) <= 2:
        return len(nums)

    write = 2  # First two elements always stay

    for read in range(2, len(nums)):
        # Compare with element 2 positions back
        # If different, we can add current element
        if nums[read] != nums[write - 2]:
            nums[write] = nums[read]
            write += 1

    return write
```

**Variation: Move Zeros (related problem):**
```
def moveZeros(nums):
    write = 0  # Position for next non-zero

    # Move all non-zeros to front
    for read in range(len(nums)):
        if nums[read] != 0:
            nums[write] = nums[read]
            write += 1

    # Fill remaining positions with zeros
    while write < len(nums):
        nums[write] = 0
        write += 1
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles basic case (Example 1: [1,1,2] → 2)
- [ ] Handles longer array (Example 2)
- [ ] Handles array with no duplicates
- [ ] Handles array with all same elements
- [ ] Handles empty array
- [ ] Handles single element array

**Optimization:**
- [ ] Achieved O(n) time complexity
- [ ] Used O(1) space (in-place)
- [ ] Single pass solution
- [ ] Doesn't overwrite unread elements

**Interview Readiness:**
- [ ] Can explain two-pointer approach in 2 minutes
- [ ] Can code solution in 5 minutes
- [ ] Can trace algorithm with example
- [ ] Can explain why it works in-place safely
- [ ] Can discuss variations (Remove Duplicates II, Move Zeros)

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve Remove Duplicates II variant
- [ ] Day 14: Solve Move Zeros (related problem)
- [ ] Day 30: Quick review and complexity analysis

---

**Strategy**: See [Two Pointers Pattern](../../strategies/patterns/two-pointers.md) | [Array Manipulation](../../prerequisites/arrays.md)
