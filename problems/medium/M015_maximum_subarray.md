---
id: M015
old_id: F053
slug: maximum-subarray
title: Maximum Subarray
difficulty: medium
category: medium
topics: ["array", "divide-and-conquer", "dynamic-programming"]
patterns: ["kadane"]
estimated_time_minutes: 30
frequency: very-high
related_problems: ["E121", "M152", "M053"]
prerequisites: ["array-basics", "dynamic-programming-intro"]
strategy_ref: ../strategies/patterns/kadane-algorithm.md
---
# Maximum Subarray

## Problem

Given an array of integers (which may include negative numbers), find the contiguous chunk (subarray) with the largest sum. A subarray must contain at least one element and must be contiguous—meaning the elements appear consecutively in the original array, though you can start and end anywhere.

For example, in [-2, 1, -3, 4, -1, 2, 1, -5, 4], the best contiguous chunk is [4, -1, 2, 1] with sum 6. Notice that even though this subarray contains a negative number (-1), it's still worth including because the positive numbers that follow make up for it.

The key insight is recognizing when to "restart" your sum calculation. At each position, you face a decision: should you extend the current subarray (adding this element to your running sum) or start fresh from this element? If your running sum has become negative, it will only drag down future elements, so it's better to reset.

This problem is famous for **Kadane's algorithm**, which solves it in a single pass with constant extra space by tracking two values: the best sum ending at the current position (local maximum) and the best sum seen so far (global maximum).

```
Example:
Array: [-2, 1, -3, 4, -1, 2, 1, -5, 4]
                  ^-----------^
Best subarray: [4, -1, 2, 1]
Sum: 6
```

## Why This Matters

This is arguably the most famous array problem in computer science education because it has multiple solution approaches (brute force O(n²), divide-and-conquer O(n log n), and Kadane's O(n)) that illustrate fundamental algorithm design principles. The elegant one-pass solution is a perfect example of dynamic programming that doesn't require storing previous results.

**Real-world applications:**
- **Financial analysis**: Maximum profit in a trading window, identifying best-performing quarters
- **Data streaming**: Finding peak activity periods in server logs or network traffic
- **Genomic sequencing**: Identifying gene regions with high/low GC content
- **Signal processing**: Detecting strongest signal intervals in noisy sensor data
- **Business intelligence**: Identifying most profitable time periods in sales data
- **Sports analytics**: Finding player performance streaks or team hot/cold periods
- **Image processing**: Locating brightest or darkest rectangular regions (extends to 2D)

Interviewers love this problem because it reveals whether you understand the difference between local and global optima, can recognize when greedy decisions work, and know when to throw away partial solutions (restarting when sum becomes negative). The gap between the O(n²) beginner solution and the O(n) optimal solution is dramatic.

## Examples

**Example 1:**
- Input: `nums = [-2,1,-3,4,-1,2,1,-5,4]`
- Output: `6`
- Explanation: The subarray [4,-1,2,1] has the largest sum 6.

**Example 2:**
- Input: `nums = [1]`
- Output: `1`
- Explanation: The subarray [1] has the largest sum 1.

**Example 3:**
- Input: `nums = [5,4,-1,7,8]`
- Output: `23`
- Explanation: The subarray [5,4,-1,7,8] has the largest sum 23.

## Constraints

- 1 <= nums.length <= 10⁵
- -10⁴ <= nums[i] <= 10⁴

## Think About

1. At each position, you face a choice: extend the current subarray or start a new one. How do you decide?
2. Can a negative number ever be part of the maximum subarray?
3. If you know the maximum subarray ending at position i, can you compute it for position i+1?
4. Do you need to track the actual subarray, or just the sum?

---

## Approach Hints

<details>
<summary>💡 Hint 1: The key decision at each element</summary>

Imagine you're at position `i` and you've been tracking subarrays:

```
Current position: nums[i]
Previous best ending here: current_sum

Question: Should you extend the previous subarray or start fresh?
```

**Two choices:**
1. **Extend**: `current_sum + nums[i]` (include previous elements)
2. **Restart**: `nums[i]` (start fresh from here)

**Think about:**
- When is it beneficial to extend? When `current_sum + nums[i] > nums[i]`
- When should you restart? When `current_sum + nums[i] <= nums[i]`
- Simplify: extend if `current_sum > 0`, restart if `current_sum <= 0`

**Example:**
```
nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]

At position 0: current_sum = -2
At position 1:
  - Extend: -2 + 1 = -1
  - Restart: 1
  - Choose: 1 (restart is better)

At position 3:
  - current_sum so far: 1 + (-3) = -2
  - At nums[3] = 4
  - Extend: -2 + 4 = 2
  - Restart: 4
  - Choose: 4 (restart is better)
```

**Key insight:** If the sum so far is negative, it will only drag down future elements. Better to restart!

</details>

<details>
<summary>🎯 Hint 2: Kadane's algorithm - local vs. global</summary>

**Kadane's algorithm** tracks two values:

1. **Local maximum** (`current_max`): Best sum ending at current position
2. **Global maximum** (`max_so_far`): Best sum seen anywhere

**The update rules:**
```
For each element nums[i]:
  1. current_max = max(nums[i], current_max + nums[i])
     (restart vs. extend)

  2. max_so_far = max(max_so_far, current_max)
     (update global best if needed)
```

**Why this works:**
- `current_max` always represents the best subarray ending at position `i`
- By checking all positions, `max_so_far` captures the overall best
- This is **dynamic programming**: each decision uses the previous result

**Intuition:**
```
current_max: "What's the best I can do ending HERE?"
max_so_far: "What's the best I've seen ANYWHERE?"
```

**Example trace:**
```
nums:        [-2,  1, -3,  4, -1,  2,  1, -5,  4]
current_max: [-2,  1, -2,  4,  3,  5,  6,  1,  5]
max_so_far:  [-2,  1,  1,  4,  4,  5,  6,  6,  6]
                                          ^
                                    answer: 6
```

</details>

<details>
<summary>📝 Hint 3: Complete algorithm</summary>

**Kadane's Algorithm:**
```
function maxSubArray(nums):
    if nums is empty:
        return 0

    max_so_far = nums[0]
    current_max = nums[0]

    for i from 1 to nums.length - 1:
        # Decision: extend or restart?
        current_max = max(nums[i], current_max + nums[i])

        # Update global maximum
        max_so_far = max(max_so_far, current_max)

    return max_so_far
```

**Simplified version** (more intuitive):
```
function maxSubArray(nums):
    max_so_far = nums[0]
    current_max = nums[0]

    for i from 1 to nums.length - 1:
        # If current_max is negative, restart
        if current_max < 0:
            current_max = nums[i]
        else:
            current_max += nums[i]

        # Track global max
        max_so_far = max(max_so_far, current_max)

    return max_so_far
```

**Why O(n) time, O(1) space?**
- Single pass through array: O(n)
- Only two variables: O(1)
- No recursion stack: O(1)

**Edge cases:**
- All negative numbers: returns largest single element
- Single element: returns that element
- Empty array: return 0 or handle as error

</details>

---

## Complexity Analysis

| Approach | Time | Space | Trade-off |
|----------|------|-------|-----------|
| **Kadane's algorithm** | **O(n)** | **O(1)** | Optimal |
| Brute force (all subarrays) | O(n²) or O(n³) | O(1) | Too slow |
| Divide and conquer | O(n log n) | O(log n) | Theoretical interest only |
| Dynamic programming (tabulation) | O(n) | O(n) | Unnecessary space |
| Prefix sum + optimization | O(n) | O(n) | More complex, same result |

**Why Kadane's wins:**
- Linear time: can't do better than reading each element
- Constant space: doesn't need to store previous results
- Simple and elegant: 5-line solution

**Divide and conquer approach:**
- Split array in half
- Max subarray is either:
  - Entirely in left half
  - Entirely in right half
  - Crosses the middle
- Recursively solve each case
- Time: T(n) = 2T(n/2) + O(n) = O(n log n)
- Interesting but not optimal

**Dynamic programming table version:**
```python
dp[i] = maximum sum ending at index i
dp[i] = max(nums[i], dp[i-1] + nums[i])

# Kadane's just optimizes this to O(1) space
```

---

## Common Mistakes

### 1. Wrong initialization
```python
# WRONG: Assumes all positive numbers
max_so_far = 0  # Fails on all-negative arrays
current_max = 0

# Example: nums = [-5, -2, -1]
# Wrong answer: 0
# Correct: -1

# CORRECT: Initialize with first element
max_so_far = nums[0]
current_max = nums[0]
```

### 2. Not updating global max
```python
# WRONG: Only returns current_max at end
for num in nums:
    current_max = max(num, current_max + num)
return current_max  # Wrong! Could decrease at end

# Example: nums = [5, -10, 2]
# current_max at end: 2
# Correct answer: 5

# CORRECT: Track global max throughout
max_so_far = nums[0]
for num in nums[1:]:
    current_max = max(num, current_max + num)
    max_so_far = max(max_so_far, current_max)  # Update here!
return max_so_far
```

### 3. Wrong restart condition
```python
# WRONG: Restarts on any negative number
if nums[i] < 0:
    current_max = nums[i]

# Example: [1, 2, -1, 3]
# Would not include -1, missing sum = 5
# CORRECT: Restart only if current_max < 0
if current_max < 0:
    current_max = nums[i]
```

### 4. Index out of bounds
```python
# WRONG: Loop includes index 0 but accesses nums[-1]
current_max = 0
for i in range(len(nums)):
    current_max = max(nums[i], current_max + nums[i])

# CORRECT: Start from index 1 or initialize first
current_max = nums[0]
for i in range(1, len(nums)):
    current_max = max(nums[i], current_max + nums[i])
```

### 5. Returning indices instead of sum
```python
# WRONG: Mixing up requirements
# Problem asks for sum, not indices
return (start_index, end_index)

# CORRECT: Return sum
return max_so_far

# If indices needed (variation), track them separately
```

### 6. Off-by-one in tracking subarray
```python
# If tracking actual subarray (not just sum):
# WRONG: Forgetting to update start index
if current_max < 0:
    current_max = nums[i]
    # Missing: start = i

# CORRECT: Update all tracking variables
if current_max < 0:
    current_max = nums[i]
    start = i
```

---

## Visual Walkthrough

```
Array: [-2, 1, -3, 4, -1, 2, 1, -5, 4]

Initialization:
max_so_far = -2
current_max = -2


Step 1: i=1, nums[1]=1
Decision: max(1, -2 + 1) = max(1, -1) = 1 ← restart
current_max = 1
max_so_far = max(-2, 1) = 1

State: current subarray = [1], sum = 1


Step 2: i=2, nums[2]=-3
Decision: max(-3, 1 + (-3)) = max(-3, -2) = -2 ← extend
current_max = -2
max_so_far = max(1, -2) = 1

State: current subarray = [1, -3], sum = -2


Step 3: i=3, nums[3]=4
Decision: max(4, -2 + 4) = max(4, 2) = 4 ← restart
current_max = 4
max_so_far = max(1, 4) = 4

State: current subarray = [4], sum = 4


Step 4: i=4, nums[4]=-1
Decision: max(-1, 4 + (-1)) = max(-1, 3) = 3 ← extend
current_max = 3
max_so_far = max(4, 3) = 4

State: current subarray = [4, -1], sum = 3


Step 5: i=5, nums[5]=2
Decision: max(2, 3 + 2) = max(2, 5) = 5 ← extend
current_max = 5
max_so_far = max(4, 5) = 5

State: current subarray = [4, -1, 2], sum = 5


Step 6: i=6, nums[6]=1
Decision: max(1, 5 + 1) = max(1, 6) = 6 ← extend
current_max = 6
max_so_far = max(5, 6) = 6

State: current subarray = [4, -1, 2, 1], sum = 6 ★


Step 7: i=7, nums[7]=-5
Decision: max(-5, 6 + (-5)) = max(-5, 1) = 1 ← extend
current_max = 1
max_so_far = max(6, 1) = 6

State: current subarray = [4, -1, 2, 1, -5], sum = 1


Step 8: i=8, nums[8]=4
Decision: max(4, 1 + 4) = max(4, 5) = 5 ← extend
current_max = 5
max_so_far = max(6, 5) = 6

State: current subarray = [4, -1, 2, 1, -5, 4], sum = 5


Final answer: 6
Best subarray: [4, -1, 2, 1]
```

**Visualization of decisions:**
```
 i   nums[i]  current_max  max_so_far  Decision
---  -------  -----------  ----------  --------
 0      -2        -2          -2       init
 1       1         1           1       restart  (1 > -2+1)
 2      -3        -2           1       extend   (-2 < 1-3)
 3       4         4           4       restart  (4 > -2+4)
 4      -1         3           4       extend   (3 < 4-1)
 5       2         5           5       extend   (5 < 3+2)
 6       1         6           6       extend   (6 < 5+1) ★
 7      -5         1           6       extend   (1 < 6-5)
 8       4         5           6       extend   (5 < 1+4)
```

---

## Variations

| Variation | Change | Approach Adjustment |
|-----------|--------|---------------------|
| **Return subarray indices** | Return [start, end] | Track start/end during updates |
| **Maximum product subarray** | Product instead of sum | Track both max and min (negatives flip) |
| **Circular array** | Array wraps around | Max of (Kadane, total - min subarray) |
| **At most K modifications** | Can flip K elements | Sliding window + state |
| **2D maximum subarray** | Matrix instead of array | Kadane + column compression |
| **At least K length** | Minimum length constraint | Track positions with deque |

**Return indices variation:**
```python
def maxSubArrayIndices(nums):
    max_so_far = nums[0]
    current_max = nums[0]

    start = 0
    end = 0
    temp_start = 0

    for i in range(1, len(nums)):
        if nums[i] > current_max + nums[i]:
            # Restart
            current_max = nums[i]
            temp_start = i
        else:
            # Extend
            current_max += nums[i]

        if current_max > max_so_far:
            max_so_far = current_max
            start = temp_start
            end = i

    return (start, end, max_so_far)
```

**Maximum product subarray (M152):**
```python
def maxProduct(nums):
    max_so_far = nums[0]
    current_max = nums[0]
    current_min = nums[0]  # Track min too (negative * negative)

    for i in range(1, len(nums)):
        if nums[i] < 0:
            current_max, current_min = current_min, current_max

        current_max = max(nums[i], current_max * nums[i])
        current_min = min(nums[i], current_min * nums[i])

        max_so_far = max(max_so_far, current_max)

    return max_so_far
```

---

## Practice Checklist

**Correctness:**
- [ ] Handles all positive numbers
- [ ] Handles all negative numbers (returns largest element)
- [ ] Handles mixed positive and negative
- [ ] Handles single element array
- [ ] Handles array with zeros
- [ ] Handles large arrays (10^5 elements)

**Code Quality:**
- [ ] Proper initialization (nums[0], not 0)
- [ ] Updates global max inside loop
- [ ] Correct restart condition (current_max < 0)
- [ ] Clean variable names (current_max, max_so_far)
- [ ] No unnecessary space

**Interview Readiness:**
- [ ] Can explain Kadane's algorithm (2 minutes)
- [ ] Can code solution in 5-7 minutes
- [ ] Can trace through example by hand
- [ ] Can explain why O(n) time is optimal
- [ ] Can handle "return indices" variation
- [ ] Can discuss divide-and-conquer alternative

**Spaced Repetition Tracker:**
- [ ] Day 1: Initial solve
- [ ] Day 3: Solve without hints
- [ ] Day 7: Solve with indices tracking
- [ ] Day 14: Solve maximum product variation (M152)
- [ ] Day 30: Quick review + explain to someone

---

**Strategy**: See [Kadane's Algorithm Pattern](../../strategies/patterns/kadane-algorithm.md)
