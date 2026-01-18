---
id: M008
old_id: F033
slug: search-in-rotated-sorted-array
title: Search in Rotated Sorted Array
difficulty: medium
category: medium
topics: ["array", "binary-search"]
patterns: ["modified-binary-search"]
estimated_time_minutes: 30
frequency: very-high
related_problems: ["M081", "M153", "M154", "E704"]
prerequisites: ["binary-search", "array-basics"]
strategy_ref: ../strategies/patterns/binary-search.md
---
# Search in Rotated Sorted Array

## Problem

Imagine a sorted array like [0,1,2,4,5,6,7] that has been rotated at some unknown pivot point, producing something like [4,5,6,7,0,1,2]. Your task is to search for a target value in this rotated array and return its index, or -1 if not found. The constraint is you must achieve O(log n) time complexity, meaning you need a modified binary search rather than a simple linear scan. The rotation creates two sorted subarrays, and at any midpoint during binary search, you're guaranteed that at least one half is properly sorted. The challenge is determining which half is sorted, then deciding whether your target lies in the sorted portion or the rotated portion. All values in the array are unique, simplifying comparison logic. Edge cases include arrays that aren't rotated at all, single-element arrays, and targets that don't exist.

## Why This Matters

Rotated array search directly applies to circular buffers used in audio/video streaming, network packet queues, and producer-consumer systems. Log rotation systems often need to search through time-ordered data that wraps around. Understanding how to maintain O(log n) search complexity despite data distortion teaches you to adapt standard algorithms to real-world constraints. The "determine which half is sorted" technique is a powerful pattern applicable to many modified binary search problems. Database indexing systems employ similar logic when handling partitioned or sharded data with non-standard orderings. This problem builds your intuition for preserving algorithm efficiency even when preconditions (like full sorting) are partially violated. It's extremely common in interviews because it tests whether you truly understand binary search or just memorize it, and whether you can adapt algorithms to variations of standard problems.

## Examples

**Example 1:**
- Input: `nums = [4,5,6,7,0,1,2], target = 0`
- Output: `4`

**Example 2:**
- Input: `nums = [4,5,6,7,0,1,2], target = 3`
- Output: `-1`

**Example 3:**
- Input: `nums = [1], target = 0`
- Output: `-1`

## Constraints

- 1 <= nums.length <= 5000
- -10⁴ <= nums[i] <= 10⁴
- All values of nums are **unique**.
- nums is an ascending array that is possibly rotated.
- -10⁴ <= target <= 10⁴

## Think About

1. What's the brute force approach? What's its time complexity?
2. Can you identify any patterns in the examples?
3. What data structure would help organize the information?
4. How does rotation affect sorted order?
5. Can you still use binary search somehow?
6. What properties remain after rotation?

---

## Approach Hints

<details>
<summary>💡 Hint 1: Understanding rotation</summary>

A rotated sorted array is a sorted array that's been "rotated" at some pivot point.

Example:
```
Original sorted: [0, 1, 2, 4, 5, 6, 7]
Rotated at 4:    [4, 5, 6, 7, 0, 1, 2]
                  ────────── ────────
                  sorted      sorted
```

**Key observation:** After rotation, you have **two sorted subarrays**.

**Think about:**
- If you pick the middle element, what can you determine?
- Is the left half sorted? Or the right half?
- How do you know which half contains your target?

**Critical insight:** At least one half is always sorted!

</details>

<details>
<summary>🎯 Hint 2: Modified binary search</summary>

Use binary search, but determine which half is sorted before deciding where to search.

**At each step:**
1. Check if `nums[mid] == target` (found it!)
2. Determine which half is sorted:
   - If `nums[left] <= nums[mid]`: left half is sorted
   - Otherwise: right half is sorted
3. Check if target is in the sorted half:
   - If yes, search that half
   - If no, search the other half

```
Example: [4,5,6,7,0,1,2], target = 0
         left    mid    right
          ↓       ↓       ↓
         [4, 5, 6, 7, 0, 1, 2]

Step 1: mid=3, nums[mid]=7
  - Left half [4,5,6,7] is sorted (4 <= 7)
  - Target 0 not in [4,7] range
  - Search right half

Step 2: Search [0,1,2]
  - mid=1, nums[mid]=1
  - Left half [0] is sorted
  - Target 0 in [0,1] range
  - Search left half

Step 3: mid=0, nums[mid]=0 → Found!
```

**The key decision:** Which half to search based on where target falls relative to the sorted portion.

</details>

<details>
<summary>📝 Hint 3: Implementation details</summary>

```python
def search(nums, target):
    left, right = 0, len(nums) - 1

    while left <= right:
        mid = (left + right) // 2

        # Found target
        if nums[mid] == target:
            return mid

        # Determine which half is sorted
        if nums[left] <= nums[mid]:
            # Left half is sorted
            if nums[left] <= target < nums[mid]:
                # Target is in sorted left half
                right = mid - 1
            else:
                # Target is in unsorted right half
                left = mid + 1
        else:
            # Right half is sorted
            if nums[mid] < target <= nums[right]:
                # Target is in sorted right half
                left = mid + 1
            else:
                # Target is in unsorted left half
                right = mid - 1

    return -1  # Not found
```

**Why `nums[left] <= nums[mid]` for checking sorted half?**
- Uses `<=` to handle duplicates at boundaries
- When left == mid, left "half" is trivially sorted

**Range checks:**
- Left sorted: `nums[left] <= target < nums[mid]`
- Right sorted: `nums[mid] < target <= nums[right]`
- Use `<` on one side to avoid including mid (already checked)

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| Linear search | O(n) | O(1) | Simple but slow |
| Find pivot, then two binary searches | O(log n) | O(1) | Works but complex |
| **Modified binary search** | **O(log n)** | **O(1)** | Optimal, elegant |

**Why modified binary search wins:**
- Single pass with O(log n) time
- No need to find rotation point first
- Constant space
- Clean logic once you understand it

**Time complexity proof:**
- Each iteration halves the search space
- T(n) = T(n/2) + O(1) = O(log n)

**Space complexity:**
- Only uses a few variables: left, right, mid
- No recursion needed (iterative approach)

---

## Common Mistakes

### 1. Not checking which half is sorted
```python
# WRONG: Assumes left half is always sorted
if nums[left] <= target <= nums[mid]:
    right = mid - 1
else:
    left = mid + 1

# CORRECT: First determine which half is sorted
if nums[left] <= nums[mid]:  # Left is sorted
    if nums[left] <= target < nums[mid]:
        right = mid - 1
    else:
        left = mid + 1
else:  # Right is sorted
    if nums[mid] < target <= nums[right]:
        left = mid + 1
    else:
        right = mid - 1
```

### 2. Off-by-one in range checks
```python
# WRONG: Includes mid in range, might miss target
if nums[left] <= target <= nums[mid]:
    right = mid - 1

# CORRECT: Exclude mid (already checked equal case)
if nums[left] <= target < nums[mid]:
    right = mid - 1
```

### 3. Using strict inequality for sorted check
```python
# WRONG: Fails when left == mid
if nums[left] < nums[mid]:  # What if they're equal?

# CORRECT: Use <= to handle single-element "half"
if nums[left] <= nums[mid]:
```

### 4. Not handling the not-found case
```python
# WRONG: Might return garbage or crash
def search(nums, target):
    # ... binary search ...
    # What if we exit loop without finding target?

# CORRECT: Return -1 after loop
while left <= right:
    # ... search logic ...
return -1
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **With duplicates** | Allow duplicate values | Need extra checks, worst case O(n) |
| **Find minimum** | Return min element | Modified BS to find rotation point |
| **Find rotation count** | Count rotations | Same as finding min index |
| **Check if sorted array is rotated** | Boolean check | Compare first and last elements |
| **Rotated at unknown point K times** | Multiple rotations | K rotations = (K % n) rotations |

**Search with duplicates (harder):**
```python
def search(nums, target):
    left, right = 0, len(nums) - 1

    while left <= right:
        mid = (left + right) // 2

        if nums[mid] == target:
            return True

        # Handle duplicates: can't determine which side is sorted
        if nums[left] == nums[mid] == nums[right]:
            left += 1
            right -= 1
            continue

        # Same logic as before
        if nums[left] <= nums[mid]:
            if nums[left] <= target < nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
        else:
            if nums[mid] < target <= nums[right]:
                left = mid + 1
            else:
                right = mid - 1

    return False
```

**Find minimum element:**
```python
def findMin(nums):
    left, right = 0, len(nums) - 1

    while left < right:
        mid = (left + right) // 2

        # If mid > right, min is in right half
        if nums[mid] > nums[right]:
            left = mid + 1
        else:
            # Min is in left half (including mid)
            right = mid

    return nums[left]
```

**Find rotation count (index of minimum):**
```python
def findRotationCount(nums):
    left, right = 0, len(nums) - 1

    while left < right:
        # Already sorted
        if nums[left] < nums[right]:
            return left

        mid = (left + right) // 2

        if nums[mid] > nums[right]:
            left = mid + 1
        else:
            right = mid

    return left
```

---

## Visual Walkthrough

```
Array: [4, 5, 6, 7, 0, 1, 2]
Target: 0

Initial state:
  left=0, right=6
  Array: [4, 5, 6, 7, 0, 1, 2]
          ↑           ↑        ↑
        left        mid      right

Step 1: mid = (0 + 6) // 2 = 3
  nums[mid] = 7
  7 != 0 (not found)

  Check which half is sorted:
    nums[0]=4 <= nums[3]=7 → Left half [4,5,6,7] is sorted

  Is target in sorted left half?
    4 <= 0 < 7? NO (0 is not in range)
    → Search right half
    left = 4

Step 2: left=4, right=6
  Array:  4  5  6  7 [0  1  2]
                     ↑     ↑  ↑
                   left  mid right

  mid = (4 + 6) // 2 = 5
  nums[mid] = 1
  1 != 0 (not found)

  Check which half is sorted:
    nums[4]=0 <= nums[5]=1 → Left half [0,1] is sorted

  Is target in sorted left half?
    0 <= 0 < 1? YES (0 is in range)
    → Search left half
    right = 4

Step 3: left=4, right=4
  Array:  4  5  6  7 [0] 1  2
                     ↑
                left/mid/right

  mid = (4 + 4) // 2 = 4
  nums[mid] = 0
  0 == 0 → Found at index 4!

Result: 4
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles array rotated at beginning (not rotated)
- [ ] Handles array rotated at end
- [ ] Handles single element array
- [ ] Finds target in left sorted portion
- [ ] Finds target in right sorted portion
- [ ] Returns -1 when target not present
- [ ] Handles target at rotation point

**Code Quality:**
- [ ] Clean binary search structure
- [ ] Correct sorted-half detection
- [ ] Proper range checks (< vs <=)
- [ ] No off-by-one errors
- [ ] Readable variable names

**Interview Readiness:**
- [ ] Can explain rotation concept in 1 minute
- [ ] Can draw array diagram showing sorted halves
- [ ] Can code solution in 12 minutes
- [ ] Can trace through example on whiteboard
- [ ] Can handle follow-up: with duplicates

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve find-minimum variation
- [ ] Day 14: Solve with-duplicates variation
- [ ] Day 30: Quick review

---

**Strategy**: See [Binary Search Pattern](../../strategies/patterns/binary-search.md)
