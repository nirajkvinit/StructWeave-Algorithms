# Python Interview Patterns

> 17 algorithm patterns that solve 90% of coding interview problems

Each pattern includes a template, real examples, and complexity analysis—all in idiomatic Python.

---

## Table of Contents

1. [Two Pointers](#1-two-pointers)
2. [Sliding Window](#2-sliding-window)
3. [Binary Search](#3-binary-search)
4. [Prefix Sum](#4-prefix-sum)
5. [Monotonic Stack](#5-monotonic-stack)
6. [Hash Map Patterns](#6-hash-map-patterns)
7. [Two Heaps](#7-two-heaps)
8. [Merge Intervals](#8-merge-intervals)
9. [Cyclic Sort](#9-cyclic-sort)
10. [BFS/DFS](#10-bfsdfs)
11. [Backtracking](#11-backtracking)
12. [Dynamic Programming](#12-dynamic-programming)
13. [Greedy](#13-greedy)
14. [Topological Sort](#14-topological-sort)
15. [Union-Find](#15-union-find)
16. [Trie](#16-trie)
17. [Bit Manipulation](#17-bit-manipulation)

---

## 1. Two Pointers

### Use When
- Array is sorted (or can be sorted)
- Finding pairs with a specific sum
- Removing duplicates in-place
- Reversing or comparing from both ends

### Pattern: Converging Pointers

```python
def two_sum_sorted(nums: list[int], target: int) -> list[int]:
    left, right = 0, len(nums) - 1

    while left < right:
        current_sum = nums[left] + nums[right]
        if current_sum == target:
            return [left, right]
        elif current_sum < target:
            left += 1
        else:
            right -= 1

    return []
```

### Pattern: Same Direction (Fast/Slow)

```python
def remove_duplicates(nums: list[int]) -> int:
    """Remove duplicates in-place, return new length."""
    if not nums:
        return 0

    slow = 0
    for fast in range(1, len(nums)):
        if nums[fast] != nums[slow]:
            slow += 1
            nums[slow] = nums[fast]

    return slow + 1
```

### Example: Container With Most Water

```python
def max_area(heights: list[int]) -> int:
    """Find max water that can be contained between two lines."""
    left, right = 0, len(heights) - 1
    max_water = 0

    while left < right:
        width = right - left
        height = min(heights[left], heights[right])
        max_water = max(max_water, width * height)

        # Move the shorter line (greedy choice)
        if heights[left] < heights[right]:
            left += 1
        else:
            right -= 1

    return max_water
```

**Time:** O(n) | **Space:** O(1)

### Example: Valid Palindrome

```python
def is_palindrome(s: str) -> bool:
    """Check if string is palindrome (alphanumeric only)."""
    left, right = 0, len(s) - 1

    while left < right:
        # Skip non-alphanumeric
        while left < right and not s[left].isalnum():
            left += 1
        while left < right and not s[right].isalnum():
            right -= 1

        if s[left].lower() != s[right].lower():
            return False

        left += 1
        right -= 1

    return True
```

**Time:** O(n) | **Space:** O(1)

### Example: Three Sum

```python
def three_sum(nums: list[int]) -> list[list[int]]:
    """Find all unique triplets that sum to zero."""
    nums.sort()
    result = []

    for i in range(len(nums) - 2):
        # Skip duplicates
        if i > 0 and nums[i] == nums[i - 1]:
            continue

        left, right = i + 1, len(nums) - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total == 0:
                result.append([nums[i], nums[left], nums[right]])
                # Skip duplicates
                while left < right and nums[left] == nums[left + 1]:
                    left += 1
                while left < right and nums[right] == nums[right - 1]:
                    right -= 1
                left += 1
                right -= 1
            elif total < 0:
                left += 1
            else:
                right -= 1

    return result
```

**Time:** O(n²) | **Space:** O(1) excluding output

---

## 2. Sliding Window

### Use When
- Contiguous subarray/substring problems
- Finding longest/shortest with a condition
- Fixed-size window statistics

### Pattern: Fixed Window

```python
def max_sum_subarray(nums: list[int], k: int) -> int:
    """Find max sum of subarray of size k."""
    if len(nums) < k:
        return 0

    # Initial window
    window_sum = sum(nums[:k])
    max_sum = window_sum

    # Slide window
    for i in range(k, len(nums)):
        window_sum += nums[i] - nums[i - k]
        max_sum = max(max_sum, window_sum)

    return max_sum
```

**Time:** O(n) | **Space:** O(1)

### Pattern: Variable Window

```python
def min_subarray_len(target: int, nums: list[int]) -> int:
    """Find min length subarray with sum >= target."""
    left = 0
    current_sum = 0
    min_len = float('inf')

    for right in range(len(nums)):
        current_sum += nums[right]

        while current_sum >= target:
            min_len = min(min_len, right - left + 1)
            current_sum -= nums[left]
            left += 1

    return min_len if min_len != float('inf') else 0
```

**Time:** O(n) | **Space:** O(1)

### Example: Longest Substring Without Repeating

```python
def length_of_longest_substring(s: str) -> int:
    """Find length of longest substring without repeating characters."""
    char_index = {}
    left = 0
    max_len = 0

    for right, char in enumerate(s):
        if char in char_index and char_index[char] >= left:
            left = char_index[char] + 1
        else:
            max_len = max(max_len, right - left + 1)

        char_index[char] = right

    return max_len
```

**Time:** O(n) | **Space:** O(min(n, alphabet_size))

### Example: Minimum Window Substring

```python
from collections import Counter

def min_window(s: str, t: str) -> str:
    """Find minimum window in s that contains all characters of t."""
    if not t or not s:
        return ""

    need = Counter(t)
    have = {}
    required = len(need)
    formed = 0

    left = 0
    min_len = float('inf')
    min_window_start = 0

    for right, char in enumerate(s):
        have[char] = have.get(char, 0) + 1

        if char in need and have[char] == need[char]:
            formed += 1

        while formed == required:
            # Update minimum
            if right - left + 1 < min_len:
                min_len = right - left + 1
                min_window_start = left

            # Shrink window
            left_char = s[left]
            have[left_char] -= 1
            if left_char in need and have[left_char] < need[left_char]:
                formed -= 1
            left += 1

    return "" if min_len == float('inf') else s[min_window_start:min_window_start + min_len]
```

**Time:** O(|s| + |t|) | **Space:** O(|s| + |t|)

### Example: Find All Anagrams

```python
from collections import Counter

def find_anagrams(s: str, p: str) -> list[int]:
    """Find all start indices of p's anagrams in s."""
    if len(p) > len(s):
        return []

    result = []
    p_count = Counter(p)
    s_count = Counter(s[:len(p)])

    if s_count == p_count:
        result.append(0)

    for i in range(len(p), len(s)):
        # Add new char
        s_count[s[i]] += 1
        # Remove old char
        old_char = s[i - len(p)]
        s_count[old_char] -= 1
        if s_count[old_char] == 0:
            del s_count[old_char]

        if s_count == p_count:
            result.append(i - len(p) + 1)

    return result
```

**Time:** O(n) | **Space:** O(1) (fixed alphabet size)

---

## 3. Binary Search

### Use When
- Sorted array search
- Finding boundary (first/last occurrence)
- Search space can be halved
- Finding minimum/maximum that satisfies condition

### Pattern: Basic Binary Search

```python
def binary_search(nums: list[int], target: int) -> int:
    """Find index of target, or -1 if not found."""
    left, right = 0, len(nums) - 1

    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1

    return -1
```

### Pattern: Using bisect Module

```python
from bisect import bisect_left, bisect_right

nums = [1, 2, 2, 2, 3, 4]

# Find insertion point (left)
bisect_left(nums, 2)                # 1 (leftmost position)

# Find insertion point (right)
bisect_right(nums, 2)               # 4 (rightmost position + 1)

# Find first occurrence
def first_occurrence(nums, target):
    i = bisect_left(nums, target)
    if i < len(nums) and nums[i] == target:
        return i
    return -1

# Find last occurrence
def last_occurrence(nums, target):
    i = bisect_right(nums, target) - 1
    if i >= 0 and nums[i] == target:
        return i
    return -1

# Count occurrences
def count_occurrences(nums, target):
    return bisect_right(nums, target) - bisect_left(nums, target)
```

### Pattern: Find Boundary

```python
def find_first_true(arr: list[bool]) -> int:
    """Find first True in [False, False, ..., True, True, ...]."""
    left, right = 0, len(arr) - 1
    result = -1

    while left <= right:
        mid = left + (right - left) // 2
        if arr[mid]:
            result = mid
            right = mid - 1         # Keep searching left
        else:
            left = mid + 1

    return result
```

### Example: Search in Rotated Sorted Array

```python
def search_rotated(nums: list[int], target: int) -> int:
    """Search in rotated sorted array."""
    left, right = 0, len(nums) - 1

    while left <= right:
        mid = left + (right - left) // 2

        if nums[mid] == target:
            return mid

        # Left half is sorted
        if nums[left] <= nums[mid]:
            if nums[left] <= target < nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
        # Right half is sorted
        else:
            if nums[mid] < target <= nums[right]:
                left = mid + 1
            else:
                right = mid - 1

    return -1
```

**Time:** O(log n) | **Space:** O(1)

### Example: Find Peak Element

```python
def find_peak_element(nums: list[int]) -> int:
    """Find a peak element (greater than neighbors)."""
    left, right = 0, len(nums) - 1

    while left < right:
        mid = left + (right - left) // 2
        if nums[mid] > nums[mid + 1]:
            right = mid             # Peak is on left or at mid
        else:
            left = mid + 1          # Peak is on right

    return left
```

**Time:** O(log n) | **Space:** O(1)

### Example: Capacity to Ship Packages

```python
def ship_within_days(weights: list[int], days: int) -> int:
    """Find min capacity to ship all packages in given days."""
    def can_ship(capacity):
        current_load = 0
        days_needed = 1
        for weight in weights:
            if current_load + weight > capacity:
                days_needed += 1
                current_load = 0
            current_load += weight
        return days_needed <= days

    left = max(weights)             # Min capacity
    right = sum(weights)            # Max capacity

    while left < right:
        mid = left + (right - left) // 2
        if can_ship(mid):
            right = mid
        else:
            left = mid + 1

    return left
```

**Time:** O(n log(sum - max)) | **Space:** O(1)

---

## 4. Prefix Sum

### Use When
- Range sum queries
- Subarray sum problems
- Cumulative statistics

### Pattern: Prefix Sum Array

```python
def prefix_sum(nums: list[int]) -> list[int]:
    """Build prefix sum array."""
    prefix = [0]                    # prefix[0] = 0 for convenience
    for num in nums:
        prefix.append(prefix[-1] + num)
    return prefix

# Range sum query [i, j] inclusive
def range_sum(prefix, i, j):
    return prefix[j + 1] - prefix[i]

# Or using accumulate
from itertools import accumulate
prefix = list(accumulate(nums, initial=0))
```

### Example: Subarray Sum Equals K

```python
def subarray_sum(nums: list[int], k: int) -> int:
    """Count subarrays that sum to k."""
    count = 0
    current_sum = 0
    prefix_counts = {0: 1}          # Empty prefix

    for num in nums:
        current_sum += num
        # If current_sum - k exists, we found a subarray
        count += prefix_counts.get(current_sum - k, 0)
        prefix_counts[current_sum] = prefix_counts.get(current_sum, 0) + 1

    return count
```

**Time:** O(n) | **Space:** O(n)

### Example: Product of Array Except Self

```python
def product_except_self(nums: list[int]) -> list[int]:
    """Return array where each element is product of all others."""
    n = len(nums)
    result = [1] * n

    # Left products
    left_product = 1
    for i in range(n):
        result[i] = left_product
        left_product *= nums[i]

    # Right products
    right_product = 1
    for i in range(n - 1, -1, -1):
        result[i] *= right_product
        right_product *= nums[i]

    return result
```

**Time:** O(n) | **Space:** O(1) excluding output

### Example: Continuous Subarray Sum

```python
def check_subarray_sum(nums: list[int], k: int) -> bool:
    """Check if subarray of length >= 2 has sum multiple of k."""
    prefix_mod = {0: -1}            # mod -> earliest index
    current_sum = 0

    for i, num in enumerate(nums):
        current_sum += num
        mod = current_sum % k if k != 0 else current_sum

        if mod in prefix_mod:
            if i - prefix_mod[mod] >= 2:
                return True
        else:
            prefix_mod[mod] = i

    return False
```

**Time:** O(n) | **Space:** O(min(n, k))

---

## 5. Monotonic Stack

### Use When
- Next greater/smaller element
- Previous greater/smaller element
- Finding spans or ranges

### Pattern: Next Greater Element

```python
def next_greater(nums: list[int]) -> list[int]:
    """Find next greater element for each position."""
    n = len(nums)
    result = [-1] * n
    stack = []                      # Indices

    for i in range(n):
        while stack and nums[stack[-1]] < nums[i]:
            idx = stack.pop()
            result[idx] = nums[i]
        stack.append(i)

    return result
```

**Time:** O(n) | **Space:** O(n)

### Example: Daily Temperatures

```python
def daily_temperatures(temps: list[int]) -> list[int]:
    """Days until warmer temperature for each day."""
    n = len(temps)
    result = [0] * n
    stack = []                      # Indices

    for i in range(n):
        while stack and temps[stack[-1]] < temps[i]:
            idx = stack.pop()
            result[idx] = i - idx
        stack.append(i)

    return result
```

**Time:** O(n) | **Space:** O(n)

### Example: Largest Rectangle in Histogram

```python
def largest_rectangle_area(heights: list[int]) -> int:
    """Find largest rectangle area in histogram."""
    stack = []                      # (index, height)
    max_area = 0

    for i, h in enumerate(heights):
        start = i
        while stack and stack[-1][1] > h:
            idx, height = stack.pop()
            max_area = max(max_area, height * (i - idx))
            start = idx
        stack.append((start, h))

    # Process remaining
    for idx, height in stack:
        max_area = max(max_area, height * (len(heights) - idx))

    return max_area
```

**Time:** O(n) | **Space:** O(n)

### Example: Trapping Rain Water

```python
def trap(height: list[int]) -> int:
    """Calculate water that can be trapped."""
    if not height:
        return 0

    stack = []                      # Indices
    water = 0

    for i, h in enumerate(height):
        while stack and height[stack[-1]] < h:
            mid = stack.pop()
            if not stack:
                break
            left = stack[-1]
            width = i - left - 1
            bounded_height = min(h, height[left]) - height[mid]
            water += width * bounded_height
        stack.append(i)

    return water

# Two-pointer solution (more intuitive)
def trap_two_pointers(height: list[int]) -> int:
    if not height:
        return 0

    left, right = 0, len(height) - 1
    left_max = right_max = 0
    water = 0

    while left < right:
        if height[left] < height[right]:
            if height[left] >= left_max:
                left_max = height[left]
            else:
                water += left_max - height[left]
            left += 1
        else:
            if height[right] >= right_max:
                right_max = height[right]
            else:
                water += right_max - height[right]
            right -= 1

    return water
```

**Time:** O(n) | **Space:** O(n) for stack, O(1) for two-pointer

---

## 6. Hash Map Patterns

### Use When
- O(1) lookups needed
- Counting frequencies
- Finding pairs/complements
- Grouping by key

### Pattern: Two Sum (Complement Search)

```python
def two_sum(nums: list[int], target: int) -> list[int]:
    """Find two indices that sum to target."""
    seen = {}

    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i

    return []
```

**Time:** O(n) | **Space:** O(n)

### Pattern: Frequency Counter

```python
from collections import Counter

def top_k_frequent(nums: list[int], k: int) -> list[int]:
    """Find k most frequent elements."""
    counts = Counter(nums)
    return [num for num, _ in counts.most_common(k)]
```

**Time:** O(n log k) | **Space:** O(n)

### Example: Group Anagrams

```python
from collections import defaultdict

def group_anagrams(strs: list[str]) -> list[list[str]]:
    """Group strings that are anagrams of each other."""
    groups = defaultdict(list)

    for s in strs:
        # Key: sorted characters or character count
        key = tuple(sorted(s))
        groups[key].append(s)

    return list(groups.values())

# Alternative: count-based key (faster for long strings)
def group_anagrams_count(strs: list[str]) -> list[list[str]]:
    groups = defaultdict(list)

    for s in strs:
        count = [0] * 26
        for c in s:
            count[ord(c) - ord('a')] += 1
        key = tuple(count)
        groups[key].append(s)

    return list(groups.values())
```

**Time:** O(n * k) where k is max string length | **Space:** O(n * k)

### Example: Longest Consecutive Sequence

```python
def longest_consecutive(nums: list[int]) -> int:
    """Find length of longest consecutive elements sequence."""
    num_set = set(nums)
    max_length = 0

    for num in num_set:
        # Only start counting from sequence start
        if num - 1 not in num_set:
            current = num
            length = 1

            while current + 1 in num_set:
                current += 1
                length += 1

            max_length = max(max_length, length)

    return max_length
```

**Time:** O(n) | **Space:** O(n)

### Example: Valid Sudoku

```python
def is_valid_sudoku(board: list[list[str]]) -> bool:
    """Check if Sudoku board is valid."""
    rows = [set() for _ in range(9)]
    cols = [set() for _ in range(9)]
    boxes = [set() for _ in range(9)]

    for i in range(9):
        for j in range(9):
            num = board[i][j]
            if num == '.':
                continue

            box_idx = (i // 3) * 3 + j // 3

            if num in rows[i] or num in cols[j] or num in boxes[box_idx]:
                return False

            rows[i].add(num)
            cols[j].add(num)
            boxes[box_idx].add(num)

    return True
```

**Time:** O(81) = O(1) | **Space:** O(81) = O(1)

---

## 7. Two Heaps

### Use When
- Finding median in a stream
- Balancing two halves of data
- Top/bottom k combined problems

### Pattern: Median Finder

```python
import heapq

class MedianFinder:
    def __init__(self):
        self.small = []             # Max heap (negated)
        self.large = []             # Min heap

    def add_num(self, num: int) -> None:
        # Add to max heap first
        heapq.heappush(self.small, -num)

        # Balance: move max of small to large
        if self.small and self.large and (-self.small[0] > self.large[0]):
            val = -heapq.heappop(self.small)
            heapq.heappush(self.large, val)

        # Balance sizes
        if len(self.small) > len(self.large) + 1:
            val = -heapq.heappop(self.small)
            heapq.heappush(self.large, val)
        elif len(self.large) > len(self.small):
            val = heapq.heappop(self.large)
            heapq.heappush(self.small, -val)

    def find_median(self) -> float:
        if len(self.small) > len(self.large):
            return -self.small[0]
        return (-self.small[0] + self.large[0]) / 2
```

**Time:** O(log n) add, O(1) median | **Space:** O(n)

### Example: Sliding Window Median

```python
import heapq
from collections import defaultdict

def median_sliding_window(nums: list[int], k: int) -> list[float]:
    """Find median of each sliding window of size k."""
    result = []
    small = []                      # Max heap (negated)
    large = []                      # Min heap
    removed = defaultdict(int)      # Lazy deletion

    def add(num):
        if not small or num <= -small[0]:
            heapq.heappush(small, -num)
        else:
            heapq.heappush(large, num)

    def balance():
        while len(small) > len(large) + 1:
            heapq.heappush(large, -heapq.heappop(small))
        while len(large) > len(small):
            heapq.heappush(small, -heapq.heappop(large))

    def remove_top(heap, is_max_heap):
        while heap and removed[(-heap[0] if is_max_heap else heap[0])] > 0:
            val = -heapq.heappop(heap) if is_max_heap else heapq.heappop(heap)
            removed[val] -= 1

    def get_median():
        if k % 2 == 1:
            return float(-small[0])
        return (-small[0] + large[0]) / 2

    for i in range(len(nums)):
        add(nums[i])
        balance()

        if i >= k - 1:
            remove_top(small, True)
            remove_top(large, False)
            result.append(get_median())

            # Mark element to remove
            out_num = nums[i - k + 1]
            removed[out_num] += 1

            # Rebalance
            if out_num <= -small[0]:
                # Need to move from large to small
                if large:
                    heapq.heappush(small, -heapq.heappop(large))
            else:
                # Need to move from small to large
                if small:
                    heapq.heappush(large, -heapq.heappop(small))

            remove_top(small, True)
            remove_top(large, False)

    return result
```

**Time:** O(n log k) | **Space:** O(k)

---

## 8. Merge Intervals

### Use When
- Overlapping intervals
- Scheduling problems
- Range merging

### Pattern: Merge Overlapping Intervals

```python
def merge(intervals: list[list[int]]) -> list[list[int]]:
    """Merge all overlapping intervals."""
    if not intervals:
        return []

    intervals.sort(key=lambda x: x[0])
    result = [intervals[0]]

    for start, end in intervals[1:]:
        if start <= result[-1][1]:
            result[-1][1] = max(result[-1][1], end)
        else:
            result.append([start, end])

    return result
```

**Time:** O(n log n) | **Space:** O(n)

### Example: Insert Interval

```python
def insert(intervals: list[list[int]], new: list[int]) -> list[list[int]]:
    """Insert and merge a new interval."""
    result = []
    i = 0
    n = len(intervals)

    # Add all intervals before new
    while i < n and intervals[i][1] < new[0]:
        result.append(intervals[i])
        i += 1

    # Merge overlapping
    while i < n and intervals[i][0] <= new[1]:
        new[0] = min(new[0], intervals[i][0])
        new[1] = max(new[1], intervals[i][1])
        i += 1
    result.append(new)

    # Add remaining
    while i < n:
        result.append(intervals[i])
        i += 1

    return result
```

**Time:** O(n) | **Space:** O(n)

### Example: Meeting Rooms II

```python
import heapq

def min_meeting_rooms(intervals: list[list[int]]) -> int:
    """Find minimum meeting rooms needed."""
    if not intervals:
        return 0

    intervals.sort(key=lambda x: x[0])
    end_times = []                  # Min heap of end times

    for start, end in intervals:
        if end_times and end_times[0] <= start:
            heapq.heappop(end_times)
        heapq.heappush(end_times, end)

    return len(end_times)
```

**Time:** O(n log n) | **Space:** O(n)

---

## 9. Cyclic Sort

### Use When
- Array contains numbers from 1 to n (or 0 to n-1)
- Finding missing/duplicate numbers
- In-place O(1) space required

### Pattern: Cyclic Sort

```python
def cyclic_sort(nums: list[int]) -> list[int]:
    """Sort array of 1 to n in-place."""
    i = 0
    while i < len(nums):
        correct_idx = nums[i] - 1
        if nums[i] != nums[correct_idx]:
            nums[i], nums[correct_idx] = nums[correct_idx], nums[i]
        else:
            i += 1
    return nums
```

**Time:** O(n) | **Space:** O(1)

### Example: Find Missing Number

```python
def missing_number(nums: list[int]) -> int:
    """Find missing number in 0 to n."""
    # Method 1: Cyclic sort
    n = len(nums)
    i = 0
    while i < n:
        if nums[i] < n and nums[i] != nums[nums[i]]:
            nums[nums[i]], nums[i] = nums[i], nums[nums[i]]
        else:
            i += 1

    for i in range(n):
        if nums[i] != i:
            return i
    return n

    # Method 2: Math (simpler)
    # return n * (n + 1) // 2 - sum(nums)

    # Method 3: XOR
    # result = n
    # for i, num in enumerate(nums):
    #     result ^= i ^ num
    # return result
```

**Time:** O(n) | **Space:** O(1)

### Example: Find All Duplicates

```python
def find_duplicates(nums: list[int]) -> list[int]:
    """Find all duplicates in array of 1 to n (appear at most twice)."""
    result = []

    for num in nums:
        idx = abs(num) - 1
        if nums[idx] < 0:
            result.append(abs(num))
        else:
            nums[idx] = -nums[idx]

    return result
```

**Time:** O(n) | **Space:** O(1)

---

## 10. BFS/DFS

### Use When
- Graph traversal
- Tree traversal
- Finding shortest path (BFS)
- Exploring all paths (DFS)
- Connected components

### Pattern: BFS (Level-Order)

```python
from collections import deque

def bfs(graph: dict, start: int) -> list[int]:
    """BFS traversal of graph."""
    visited = {start}
    queue = deque([start])
    result = []

    while queue:
        node = queue.popleft()
        result.append(node)

        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)

    return result
```

### Pattern: DFS (Recursive)

```python
def dfs(graph: dict, start: int, visited: set = None) -> list[int]:
    """DFS traversal of graph."""
    if visited is None:
        visited = set()

    visited.add(start)
    result = [start]

    for neighbor in graph[start]:
        if neighbor not in visited:
            result.extend(dfs(graph, neighbor, visited))

    return result
```

### Pattern: DFS (Iterative)

```python
def dfs_iterative(graph: dict, start: int) -> list[int]:
    """DFS traversal using stack."""
    visited = set()
    stack = [start]
    result = []

    while stack:
        node = stack.pop()
        if node in visited:
            continue
        visited.add(node)
        result.append(node)

        for neighbor in reversed(graph[node]):
            if neighbor not in visited:
                stack.append(neighbor)

    return result
```

### Example: Number of Islands

```python
def num_islands(grid: list[list[str]]) -> int:
    """Count number of islands (connected 1s)."""
    if not grid:
        return 0

    rows, cols = len(grid), len(grid[0])
    count = 0

    def dfs(r, c):
        if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] != '1':
            return
        grid[r][c] = '0'            # Mark visited
        dfs(r + 1, c)
        dfs(r - 1, c)
        dfs(r, c + 1)
        dfs(r, c - 1)

    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                dfs(r, c)
                count += 1

    return count
```

**Time:** O(m * n) | **Space:** O(m * n) for recursion

### Example: Shortest Path (BFS)

```python
from collections import deque

def shortest_path(grid: list[list[int]], start: tuple, end: tuple) -> int:
    """Find shortest path in grid (0 = path, 1 = wall)."""
    if grid[start[0]][start[1]] == 1 or grid[end[0]][end[1]] == 1:
        return -1

    rows, cols = len(grid), len(grid[0])
    directions = [(0, 1), (0, -1), (1, 0), (-1, 0)]
    visited = {start}
    queue = deque([(start[0], start[1], 0)])

    while queue:
        r, c, dist = queue.popleft()

        if (r, c) == end:
            return dist

        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if (0 <= nr < rows and 0 <= nc < cols and
                grid[nr][nc] == 0 and (nr, nc) not in visited):
                visited.add((nr, nc))
                queue.append((nr, nc, dist + 1))

    return -1
```

**Time:** O(m * n) | **Space:** O(m * n)

### Example: Clone Graph

```python
class Node:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors else []

def clone_graph(node: Node) -> Node:
    """Deep copy a graph."""
    if not node:
        return None

    cloned = {node: Node(node.val)}
    queue = deque([node])

    while queue:
        curr = queue.popleft()
        for neighbor in curr.neighbors:
            if neighbor not in cloned:
                cloned[neighbor] = Node(neighbor.val)
                queue.append(neighbor)
            cloned[curr].neighbors.append(cloned[neighbor])

    return cloned[node]
```

**Time:** O(V + E) | **Space:** O(V)

---

## 11. Backtracking

### Use When
- Generating all possibilities
- Combinatorial problems
- Constraint satisfaction
- Permutations, combinations, subsets

### Pattern: Backtracking Template

```python
def backtrack(path, choices):
    if is_solution(path):
        result.append(path[:])
        return

    for choice in choices:
        if is_valid(choice):
            path.append(choice)
            backtrack(path, remaining_choices)
            path.pop()              # Backtrack
```

### Example: Subsets

```python
def subsets(nums: list[int]) -> list[list[int]]:
    """Generate all subsets."""
    result = []

    def backtrack(start, path):
        result.append(path[:])

        for i in range(start, len(nums)):
            path.append(nums[i])
            backtrack(i + 1, path)
            path.pop()

    backtrack(0, [])
    return result
```

**Time:** O(n * 2^n) | **Space:** O(n)

### Example: Permutations

```python
def permute(nums: list[int]) -> list[list[int]]:
    """Generate all permutations."""
    result = []

    def backtrack(path, remaining):
        if not remaining:
            result.append(path[:])
            return

        for i in range(len(remaining)):
            path.append(remaining[i])
            backtrack(path, remaining[:i] + remaining[i+1:])
            path.pop()

    backtrack([], nums)
    return result

# Alternative using swap
def permute_swap(nums: list[int]) -> list[list[int]]:
    result = []

    def backtrack(first):
        if first == len(nums):
            result.append(nums[:])
            return

        for i in range(first, len(nums)):
            nums[first], nums[i] = nums[i], nums[first]
            backtrack(first + 1)
            nums[first], nums[i] = nums[i], nums[first]

    backtrack(0)
    return result
```

**Time:** O(n * n!) | **Space:** O(n)

### Example: Combinations

```python
def combine(n: int, k: int) -> list[list[int]]:
    """Generate all combinations of k numbers from 1 to n."""
    result = []

    def backtrack(start, path):
        if len(path) == k:
            result.append(path[:])
            return

        # Pruning: need k - len(path) more elements
        for i in range(start, n - (k - len(path)) + 2):
            path.append(i)
            backtrack(i + 1, path)
            path.pop()

    backtrack(1, [])
    return result
```

**Time:** O(k * C(n,k)) | **Space:** O(k)

### Example: Combination Sum

```python
def combination_sum(candidates: list[int], target: int) -> list[list[int]]:
    """Find combinations that sum to target (can reuse elements)."""
    result = []

    def backtrack(start, path, remaining):
        if remaining == 0:
            result.append(path[:])
            return
        if remaining < 0:
            return

        for i in range(start, len(candidates)):
            path.append(candidates[i])
            backtrack(i, path, remaining - candidates[i])  # i, not i+1 (reuse)
            path.pop()

    backtrack(0, [], target)
    return result
```

**Time:** O(n^(target/min)) | **Space:** O(target/min)

### Example: N-Queens

```python
def solve_n_queens(n: int) -> list[list[str]]:
    """Find all solutions to N-Queens problem."""
    result = []
    cols = set()
    diag1 = set()                   # r - c
    diag2 = set()                   # r + c

    def backtrack(row, queens):
        if row == n:
            board = ['.' * q + 'Q' + '.' * (n - q - 1) for q in queens]
            result.append(board)
            return

        for col in range(n):
            if col in cols or (row - col) in diag1 or (row + col) in diag2:
                continue

            cols.add(col)
            diag1.add(row - col)
            diag2.add(row + col)
            queens.append(col)

            backtrack(row + 1, queens)

            queens.pop()
            cols.remove(col)
            diag1.remove(row - col)
            diag2.remove(row + col)

    backtrack(0, [])
    return result
```

**Time:** O(n!) | **Space:** O(n)

---

## 12. Dynamic Programming

### Use When
- Optimal substructure (optimal solution built from optimal subproblems)
- Overlapping subproblems (same subproblems solved multiple times)
- Counting ways or finding min/max

### Pattern: Top-Down (Memoization)

```python
from functools import cache

def fibonacci(n: int) -> int:
    @cache
    def dp(i):
        if i <= 1:
            return i
        return dp(i - 1) + dp(i - 2)

    return dp(n)
```

### Pattern: Bottom-Up (Tabulation)

```python
def fibonacci(n: int) -> int:
    if n <= 1:
        return n

    dp = [0] * (n + 1)
    dp[1] = 1

    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]

    return dp[n]

# Space-optimized
def fibonacci_optimized(n: int) -> int:
    if n <= 1:
        return n

    prev, curr = 0, 1
    for _ in range(2, n + 1):
        prev, curr = curr, prev + curr

    return curr
```

### Example: Climbing Stairs

```python
from functools import cache

def climb_stairs(n: int) -> int:
    """Number of ways to climb n stairs (1 or 2 steps at a time)."""
    @cache
    def dp(i):
        if i <= 2:
            return i
        return dp(i - 1) + dp(i - 2)

    return dp(n)

# Bottom-up
def climb_stairs_iterative(n: int) -> int:
    if n <= 2:
        return n
    prev, curr = 1, 2
    for _ in range(3, n + 1):
        prev, curr = curr, prev + curr
    return curr
```

**Time:** O(n) | **Space:** O(1) for optimized

### Example: Coin Change

```python
def coin_change(coins: list[int], amount: int) -> int:
    """Minimum coins needed to make amount."""
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0

    for coin in coins:
        for x in range(coin, amount + 1):
            dp[x] = min(dp[x], dp[x - coin] + 1)

    return dp[amount] if dp[amount] != float('inf') else -1
```

**Time:** O(amount * coins) | **Space:** O(amount)

### Example: Longest Common Subsequence

```python
def longest_common_subsequence(text1: str, text2: str) -> int:
    """Find length of LCS of two strings."""
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i - 1] == text2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])

    return dp[m][n]

# Space-optimized
def lcs_optimized(text1: str, text2: str) -> int:
    if len(text1) < len(text2):
        text1, text2 = text2, text1

    prev = [0] * (len(text2) + 1)
    curr = [0] * (len(text2) + 1)

    for i in range(1, len(text1) + 1):
        for j in range(1, len(text2) + 1):
            if text1[i - 1] == text2[j - 1]:
                curr[j] = prev[j - 1] + 1
            else:
                curr[j] = max(prev[j], curr[j - 1])
        prev, curr = curr, [0] * (len(text2) + 1)

    return prev[len(text2)]
```

**Time:** O(m * n) | **Space:** O(n) for optimized

### Example: 0/1 Knapsack

```python
def knapsack(weights: list[int], values: list[int], capacity: int) -> int:
    """Maximum value in knapsack with capacity limit."""
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):
        for w in range(capacity + 1):
            if weights[i - 1] <= w:
                dp[i][w] = max(
                    dp[i - 1][w],
                    dp[i - 1][w - weights[i - 1]] + values[i - 1]
                )
            else:
                dp[i][w] = dp[i - 1][w]

    return dp[n][capacity]

# Space-optimized
def knapsack_optimized(weights: list[int], values: list[int], capacity: int) -> int:
    dp = [0] * (capacity + 1)

    for i in range(len(weights)):
        for w in range(capacity, weights[i] - 1, -1):  # Reverse to avoid reuse
            dp[w] = max(dp[w], dp[w - weights[i]] + values[i])

    return dp[capacity]
```

**Time:** O(n * capacity) | **Space:** O(capacity) for optimized

### Example: Longest Increasing Subsequence

```python
def length_of_lis(nums: list[int]) -> int:
    """Find length of longest increasing subsequence."""
    # O(n^2) DP solution
    n = len(nums)
    dp = [1] * n

    for i in range(1, n):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)

    return max(dp)

# O(n log n) solution using binary search
from bisect import bisect_left

def length_of_lis_optimized(nums: list[int]) -> int:
    sub = []

    for num in nums:
        pos = bisect_left(sub, num)
        if pos == len(sub):
            sub.append(num)
        else:
            sub[pos] = num

    return len(sub)
```

**Time:** O(n log n) for optimized | **Space:** O(n)

---

## 13. Greedy

### Use When
- Local optimal choice leads to global optimal
- Interval scheduling
- Activity selection
- Huffman coding

### Example: Jump Game

```python
def can_jump(nums: list[int]) -> bool:
    """Check if can reach last index."""
    max_reach = 0

    for i, jump in enumerate(nums):
        if i > max_reach:
            return False
        max_reach = max(max_reach, i + jump)

    return True
```

**Time:** O(n) | **Space:** O(1)

### Example: Jump Game II

```python
def jump(nums: list[int]) -> int:
    """Minimum jumps to reach last index."""
    jumps = 0
    current_end = 0
    farthest = 0

    for i in range(len(nums) - 1):
        farthest = max(farthest, i + nums[i])
        if i == current_end:
            jumps += 1
            current_end = farthest

    return jumps
```

**Time:** O(n) | **Space:** O(1)

### Example: Gas Station

```python
def can_complete_circuit(gas: list[int], cost: list[int]) -> int:
    """Find starting station to complete circuit."""
    if sum(gas) < sum(cost):
        return -1

    start = 0
    tank = 0

    for i in range(len(gas)):
        tank += gas[i] - cost[i]
        if tank < 0:
            start = i + 1
            tank = 0

    return start
```

**Time:** O(n) | **Space:** O(1)

### Example: Task Scheduler

```python
from collections import Counter

def least_interval(tasks: list[str], n: int) -> int:
    """Minimum time to finish all tasks with cooldown."""
    counts = Counter(tasks)
    max_count = max(counts.values())
    max_count_tasks = sum(1 for c in counts.values() if c == max_count)

    return max(len(tasks), (max_count - 1) * (n + 1) + max_count_tasks)
```

**Time:** O(n) | **Space:** O(1) (26 letters max)

---

## 14. Topological Sort

### Use When
- Dependency resolution
- Course scheduling
- Build order
- Detecting cycles in directed graph

### Pattern: Kahn's Algorithm (BFS)

```python
from collections import deque, defaultdict

def topological_sort(n: int, edges: list[list[int]]) -> list[int]:
    """Return topological order, or empty if cycle exists."""
    graph = defaultdict(list)
    in_degree = [0] * n

    for u, v in edges:
        graph[u].append(v)
        in_degree[v] += 1

    queue = deque([i for i in range(n) if in_degree[i] == 0])
    result = []

    while queue:
        node = queue.popleft()
        result.append(node)

        for neighbor in graph[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return result if len(result) == n else []  # Empty if cycle
```

**Time:** O(V + E) | **Space:** O(V + E)

### Example: Course Schedule

```python
from collections import deque, defaultdict

def can_finish(num_courses: int, prerequisites: list[list[int]]) -> bool:
    """Check if all courses can be finished."""
    graph = defaultdict(list)
    in_degree = [0] * num_courses

    for course, prereq in prerequisites:
        graph[prereq].append(course)
        in_degree[course] += 1

    queue = deque([i for i in range(num_courses) if in_degree[i] == 0])
    count = 0

    while queue:
        node = queue.popleft()
        count += 1

        for neighbor in graph[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return count == num_courses
```

**Time:** O(V + E) | **Space:** O(V + E)

### Example: Course Schedule II (Find Order)

```python
def find_order(num_courses: int, prerequisites: list[list[int]]) -> list[int]:
    """Find valid course order."""
    graph = defaultdict(list)
    in_degree = [0] * num_courses

    for course, prereq in prerequisites:
        graph[prereq].append(course)
        in_degree[course] += 1

    queue = deque([i for i in range(num_courses) if in_degree[i] == 0])
    order = []

    while queue:
        node = queue.popleft()
        order.append(node)

        for neighbor in graph[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return order if len(order) == num_courses else []
```

---

## 15. Union-Find

### Use When
- Connected components
- Detecting cycles in undirected graph
- Kruskal's MST algorithm
- Grouping/clustering

### Pattern: Union-Find with Path Compression and Union by Rank

```python
class UnionFind:
    def __init__(self, n: int):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.count = n              # Number of components

    def find(self, x: int) -> int:
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # Path compression
        return self.parent[x]

    def union(self, x: int, y: int) -> bool:
        px, py = self.find(x), self.find(y)
        if px == py:
            return False            # Already connected

        # Union by rank
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        self.parent[py] = px
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1

        self.count -= 1
        return True

    def connected(self, x: int, y: int) -> bool:
        return self.find(x) == self.find(y)
```

### Example: Number of Connected Components

```python
def count_components(n: int, edges: list[list[int]]) -> int:
    """Count connected components in undirected graph."""
    uf = UnionFind(n)
    for u, v in edges:
        uf.union(u, v)
    return uf.count
```

**Time:** O(n * α(n)) ≈ O(n) | **Space:** O(n)

### Example: Redundant Connection

```python
def find_redundant_connection(edges: list[list[int]]) -> list[int]:
    """Find edge that creates cycle."""
    n = len(edges)
    uf = UnionFind(n + 1)           # 1-indexed

    for u, v in edges:
        if not uf.union(u, v):
            return [u, v]

    return []
```

---

## 16. Trie

### Use When
- Prefix matching
- Autocomplete
- Word search
- Dictionary operations

### Pattern: Trie Implementation

```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_end = True

    def search(self, word: str) -> bool:
        node = self._find_node(word)
        return node is not None and node.is_end

    def starts_with(self, prefix: str) -> bool:
        return self._find_node(prefix) is not None

    def _find_node(self, prefix: str) -> TrieNode | None:
        node = self.root
        for char in prefix:
            if char not in node.children:
                return None
            node = node.children[char]
        return node
```

**Time:** O(m) for all operations (m = word length) | **Space:** O(n * m)

### Example: Word Search II

```python
def find_words(board: list[list[str]], words: list[str]) -> list[str]:
    """Find all words from list that exist in board."""
    # Build trie
    trie = Trie()
    for word in words:
        trie.insert(word)

    rows, cols = len(board), len(board[0])
    result = set()

    def dfs(r, c, node, path):
        char = board[r][c]
        if char not in node.children:
            return

        node = node.children[char]
        path += char

        if node.is_end:
            result.add(path)

        board[r][c] = '#'           # Mark visited
        for dr, dc in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and board[nr][nc] != '#':
                dfs(nr, nc, node, path)
        board[r][c] = char          # Restore

    for r in range(rows):
        for c in range(cols):
            dfs(r, c, trie.root, "")

    return list(result)
```

---

## 17. Bit Manipulation

### Use When
- XOR tricks
- Checking/setting bits
- Power of 2 checks
- Subset generation

### Common Operations

```python
# Check if bit is set
def is_bit_set(n: int, i: int) -> bool:
    return (n >> i) & 1 == 1

# Set bit
def set_bit(n: int, i: int) -> int:
    return n | (1 << i)

# Clear bit
def clear_bit(n: int, i: int) -> int:
    return n & ~(1 << i)

# Toggle bit
def toggle_bit(n: int, i: int) -> int:
    return n ^ (1 << i)

# Check power of 2
def is_power_of_two(n: int) -> bool:
    return n > 0 and (n & (n - 1)) == 0

# Count set bits
def count_bits(n: int) -> int:
    count = 0
    while n:
        count += n & 1
        n >>= 1
    return count

# Or use built-in
n.bit_count()                       # Python 3.10+
bin(n).count('1')                   # All versions
```

### Example: Single Number

```python
def single_number(nums: list[int]) -> int:
    """Find element that appears once (others appear twice)."""
    result = 0
    for num in nums:
        result ^= num
    return result
```

**Time:** O(n) | **Space:** O(1)

### Example: Single Number II (appears once, others thrice)

```python
def single_number_ii(nums: list[int]) -> int:
    """Find element that appears once (others appear three times)."""
    ones = twos = 0
    for num in nums:
        ones = (ones ^ num) & ~twos
        twos = (twos ^ num) & ~ones
    return ones
```

### Example: Subsets Using Bits

```python
def subsets(nums: list[int]) -> list[list[int]]:
    """Generate all subsets using bit manipulation."""
    n = len(nums)
    result = []

    for mask in range(1 << n):
        subset = []
        for i in range(n):
            if mask & (1 << i):
                subset.append(nums[i])
        result.append(subset)

    return result
```

---

## Quick Reference Table

| Pattern | Signal Keywords | Time Complexity |
|---------|-----------------|-----------------|
| Two Pointers | Sorted, pairs, in-place | O(n) |
| Sliding Window | Contiguous, substring, subarray | O(n) |
| Binary Search | Sorted, find, search space | O(log n) |
| Prefix Sum | Range sum, subarray sum | O(n) |
| Monotonic Stack | Next greater/smaller | O(n) |
| Hash Map | Lookup, frequency, pairs | O(n) |
| Two Heaps | Median, top/bottom k | O(n log n) |
| Merge Intervals | Overlapping, scheduling | O(n log n) |
| Cyclic Sort | 1 to n, missing/duplicate | O(n) |
| BFS/DFS | Graph, tree, shortest path | O(V + E) |
| Backtracking | All possibilities, permutations | O(2^n) or O(n!) |
| Dynamic Programming | Optimal, count ways, min/max | O(n) to O(n²) |
| Greedy | Local optimal, intervals | O(n log n) |
| Topological Sort | Dependencies, ordering | O(V + E) |
| Union-Find | Connected components, cycles | O(α(n)) ≈ O(1) |
| Trie | Prefix, dictionary, autocomplete | O(m) |
| Bit Manipulation | XOR, power of 2, single number | O(1) to O(n) |
