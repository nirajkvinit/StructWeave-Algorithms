---
title: Two Sum - Complete Walkthrough
type: worked-example
problem_id: E001
patterns: ["complement-search", "hash-map-lookup"]
estimated_time: 30
difficulty: easy
topics: ["array", "hash-table"]
---

# Two Sum - Complete Walkthrough

## Overview

This walkthrough will guide you through solving the Two Sum problem step by step, showing you exactly how an experienced engineer thinks through the problem, explores different approaches, and arrives at the optimal solution.

**Problem Statement:** Given an array of integers and a target sum, find the indices of two numbers that add up to the target. You may assume exactly one solution exists, and you cannot use the same element twice.

**Learning Goals:**
- Master the complement search pattern
- Understand time-space trade-offs
- Learn when to use hash tables for optimization
- Develop systematic problem-solving habits

---

## Initial Thinking Process

### Step 1: Understanding the Problem

Let's start by making sure we truly understand what's being asked.

**Given:**
```
nums = [2, 7, 11, 15]
target = 9
```

**Find:** Two indices `i` and `j` where `nums[i] + nums[j] == target`

**Expected Output:** `[0, 1]` (because `nums[0] + nums[1] = 2 + 7 = 9`)

**Key Constraints:**
1. Exactly one solution exists (we don't need to handle "no solution" cases)
2. Cannot use the same element twice (e.g., if nums = [5] and target = 10, we can't return [0, 0])
3. Return indices, not values
4. Order of indices doesn't matter ([0, 1] or [1, 0] both acceptable)

### Step 2: What Approaches Come to Mind?

When I first see this problem, several approaches immediately come to mind:

**Approach 1: Brute Force**
- Try every possible pair of numbers
- For each number at index i, check every number at index j (where j > i)
- Simple but potentially slow

**Approach 2: Sorting**
- Sort the array and use two pointers
- But wait... we need to return original indices!
- We'd need to track indices during sorting (adds complexity)

**Approach 3: Hash Table**
- Use extra space to store what we've seen
- Look up complements in O(1) time
- Sounds promising...

Let's explore each approach systematically.

---

## Approach 1: Brute Force Solution

### The Idea

The most straightforward approach: check every possible pair.

**Thinking out loud:**
> "If I need two numbers that sum to target, the simplest way is to just try all combinations. Take the first number, try it with every other number. Take the second number, try it with every remaining number. And so on."

### Pseudocode

```
for i from 0 to length-1:
    for j from i+1 to length-1:
        if nums[i] + nums[j] == target:
            return [i, j]
```

### Complete Implementation

```python
def two_sum_brute_force(nums, target):
    """
    Brute force approach: Try all pairs

    Time: O(n²) - nested loops
    Space: O(1) - only using loop variables
    """
    n = len(nums)

    # Outer loop: pick first number
    for i in range(n):
        # Inner loop: try pairing with each remaining number
        for j in range(i + 1, n):  # j starts at i+1 to avoid using same element
            if nums[i] + nums[j] == target:
                return [i, j]

    # Per problem constraints, we always have a solution
    return []
```

### Trace Through Example

Let's trace through `nums = [2, 7, 11, 15]`, `target = 9`:

```
Iteration 1: i=0 (nums[0]=2)
  j=1: nums[0] + nums[1] = 2 + 7 = 9 ✓ MATCH!
  Return [0, 1]

Total comparisons: 1
```

Let's try a case where the answer isn't at the beginning:
`nums = [3, 2, 4]`, `target = 6`

```
Iteration 1: i=0 (nums[0]=3)
  j=1: nums[0] + nums[1] = 3 + 2 = 5 ≠ 6 ✗
  j=2: nums[0] + nums[2] = 3 + 4 = 7 ≠ 6 ✗

Iteration 2: i=1 (nums[1]=2)
  j=2: nums[1] + nums[2] = 2 + 4 = 6 ✓ MATCH!
  Return [1, 2]

Total comparisons: 3
```

### Analysis

**Time Complexity: O(n²)**
- Outer loop runs n times
- Inner loop runs (n-1) + (n-2) + ... + 1 = n(n-1)/2 times
- In worst case (answer is the last pair), we check all pairs

**Space Complexity: O(1)**
- Only using two loop variables (i, j)
- No additional data structures

**Pros:**
- Simple to understand and implement
- No extra space needed
- Easy to verify correctness

**Cons:**
- Very slow for large arrays
- With n = 10,000 elements, we'd make up to 50 million comparisons
- Not acceptable in production or interviews

**Question to ask yourself:** Can we do better?

---

## The Optimization Insight

### Critical Observation

Here's the key insight that leads to the optimal solution:

**Instead of asking "which two numbers sum to target?"**
**Ask: "For each number, what's its complement?"**

Let me explain:

```
If we have: nums[i] + nums[j] = target
Then: nums[j] = target - nums[i]

Example:
  target = 9
  nums[i] = 2
  We need: nums[j] = 9 - 2 = 7
```

**The complement of a number is what it needs to reach the target.**

For each number we encounter:
1. Calculate its complement: `complement = target - current_number`
2. Check: "Have we seen this complement before?"
3. If yes: we found our pair!
4. If no: remember this number for future checks

### The Data Structure Question

**Question:** Which data structure lets us check "have we seen X before?" in O(1) time?

**Answer:** Hash table (dictionary/map)!

- Insert: O(1) average case
- Lookup: O(1) average case
- Perfect for our needs

---

## Approach 2: Hash Map Solution (Optimal)

### The Algorithm

```
1. Create an empty hash map: {value → index}
2. For each number at index i:
   a. Calculate complement = target - nums[i]
   b. If complement exists in hash map:
      - Return [hash_map[complement], i]
   c. Otherwise:
      - Store nums[i] → i in hash map
3. Return [] (won't happen per constraints)
```

### Why This Order Matters

**Critical detail:** We check BEFORE we store!

Why?
```python
# Consider: nums = [3, 3], target = 6

# WRONG: Store first, then check
hash_map[3] = 0      # Store first element
complement = 6 - 3 = 3
if 3 in hash_map:    # Found it! But this is the SAME element!
    return [0, 0]    # WRONG: used same element twice

# CORRECT: Check first, then store
complement = 6 - 3 = 3
if 3 in hash_map:    # Not there yet
    pass
hash_map[3] = 0      # Store first element

# Process second element:
complement = 6 - 3 = 3
if 3 in hash_map:    # NOW we find it
    return [0, 1]    # CORRECT: two different indices
```

### Complete Implementation

```python
def two_sum_optimized(nums, target):
    """
    Hash map approach: Store what we've seen

    Time: O(n) - single pass
    Space: O(n) - hash map can store up to n-1 elements
    """
    # Map: value → index
    seen = {}

    # Single pass through array
    for i, num in enumerate(nums):
        # Calculate what we need to complete the sum
        complement = target - num

        # Have we seen the complement before?
        if complement in seen:
            # Yes! Return the pair
            return [seen[complement], i]

        # No, store current number for future lookups
        seen[num] = i

    # No solution found (won't happen per problem constraints)
    return []
```

### Line-by-Line Explanation

Let me break down every single line:

```python
def two_sum_optimized(nums, target):
```
- Function signature: takes an array and target sum
- Returns a list of two indices

```python
    seen = {}
```
- Create empty hash map
- Will store: {number_value: its_index}
- Example after processing [2, 7]: {2: 0, 7: 1}

```python
    for i, num in enumerate(nums):
```
- Loop through array with both index and value
- `i` = current index (0, 1, 2, ...)
- `num` = value at that index (nums[i])
- `enumerate` gives us both in one pass

```python
        complement = target - num
```
- Calculate what number would complete the sum
- If target = 9 and num = 2, complement = 7
- This is THE key insight of the entire solution

```python
        if complement in seen:
```
- Check if we've already seen this complement
- Hash map lookup is O(1) on average
- If True, we found our answer!

```python
            return [seen[complement], i]
```
- `seen[complement]` = index where we saw the complement earlier
- `i` = current index
- Return both indices as a list
- Order doesn't matter per problem statement

```python
        seen[num] = i
```
- Store current number and its index
- This number might be someone else's complement later
- We store AFTER checking to avoid using same element twice

```python
    return []
```
- Fallback for no solution
- Per constraints, this line never executes
- Good practice to include for completeness

### Detailed Trace Through

Let's trace through `nums = [2, 7, 11, 15]`, `target = 9`:

**Initial State:**
```
seen = {}
```

**Iteration 1: i=0, num=2**
```
1. complement = 9 - 2 = 7
2. Is 7 in seen? No (seen is empty)
3. Store: seen[2] = 0

   seen = {2: 0}
```

**Iteration 2: i=1, num=7**
```
1. complement = 9 - 7 = 2
2. Is 2 in seen? YES! seen[2] = 0
3. Return [0, 1]

DONE! Found answer in 2 iterations.
```

Let's trace a more complex example: `nums = [3, 2, 4]`, `target = 6`

**Initial State:**
```
seen = {}
```

**Iteration 1: i=0, num=3**
```
1. complement = 6 - 3 = 3
2. Is 3 in seen? No
3. Store: seen[3] = 0

   seen = {3: 0}
```

**Iteration 2: i=1, num=2**
```
1. complement = 6 - 2 = 4
2. Is 4 in seen? No
3. Store: seen[2] = 1

   seen = {3: 0, 2: 1}
```

**Iteration 3: i=2, num=4**
```
1. complement = 6 - 4 = 2
2. Is 2 in seen? YES! seen[2] = 1
3. Return [1, 2]

DONE! Found answer in 3 iterations.
```

### Edge Case: Duplicate Values

`nums = [3, 3]`, `target = 6`

**Initial State:**
```
seen = {}
```

**Iteration 1: i=0, num=3**
```
1. complement = 6 - 3 = 3
2. Is 3 in seen? No (empty hash map)
3. Store: seen[3] = 0

   seen = {3: 0}
```

**Iteration 2: i=1, num=3**
```
1. complement = 6 - 3 = 3
2. Is 3 in seen? YES! seen[3] = 0
3. Return [0, 1]

CORRECT! Two different indices of the same value.
```

**Why this works:**
- First 3 is stored at index 0
- Second 3 looks for complement 3
- Finds the first 3 (different index)
- Returns [0, 1] correctly

---

## Complexity Analysis

### Time Complexity: O(n)

**Breakdown:**
1. Loop runs n times (one pass through array)
2. Each iteration:
   - Calculate complement: O(1)
   - Hash map lookup: O(1) average
   - Hash map insertion: O(1) average
3. Total: O(n) × O(1) = O(n)

**Best case:** O(1)
- Answer is the first two elements
- Example: [2, 7, ...], target = 9

**Average case:** O(n)
- Answer somewhere in middle
- Process about n/2 elements

**Worst case:** O(n)
- Answer is last pair or near end
- Process almost all n elements

**Comparison with brute force:**
- Brute force: O(n²) = 10,000² = 100,000,000 operations for n=10,000
- Hash map: O(n) = 10,000 operations for n=10,000
- **10,000x faster!**

### Space Complexity: O(n)

**Breakdown:**
- Hash map can store up to n-1 elements
- Worst case: answer is at indices [n-2, n-1]
- We'd store n-2 elements in hash map

**Example:**
```
nums = [1, 2, 3, 4, 5, 6, 7], target = 13
Answer: [5, 6] (6 + 7 = 13)

seen after processing:
{1:0, 2:1, 3:2, 4:3, 5:4, 6:5}  → 6 elements stored
```

**Space-Time Trade-off:**
- We use O(n) extra space
- But gain O(n²) → O(n) time improvement
- This is almost always worth it!

---

## Common Mistakes and How to Avoid Them

### Mistake 1: Using the Same Element Twice

**Wrong Code:**
```python
def two_sum_wrong(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        seen[num] = i           # Store FIRST
        complement = target - num
        if complement in seen:  # Then check
            return [seen[complement], i]
    return []
```

**Problem:**
```
nums = [3, ...], target = 6
First iteration:
  seen[3] = 0           # Store 3
  complement = 6 - 3 = 3
  3 in seen? YES
  Return [0, 0]         # WRONG: same index twice!
```

**Fix:** Check before storing
```python
if complement in seen:      # Check FIRST
    return [seen[complement], i]
seen[num] = i              # Then store
```

### Mistake 2: Returning Values Instead of Indices

**Wrong Code:**
```python
if complement in seen:
    return [complement, num]  # WRONG: returning values
```

**Problem:**
```
nums = [2, 7, 11, 15], target = 9
Would return: [7, 2]  # Values, not indices!
Expected:     [0, 1]  # Indices
```

**Fix:** Return indices
```python
return [seen[complement], i]  # CORRECT
```

### Mistake 3: Not Handling Negative Numbers

**Misconception:**
> "Hash maps don't work with negative numbers"

**Truth:** They work perfectly fine!

```python
nums = [-3, 4, 3, 90], target = 0
seen = {}

i=0, num=-3: complement = 0-(-3) = 3
  seen = {-3: 0}

i=1, num=4: complement = 0-4 = -4
  seen = {-3: 0, 4: 1}

i=2, num=3: complement = 0-3 = -3
  -3 in seen? YES!
  Return [0, 2]  ✓ CORRECT
```

### Mistake 4: Overwriting Duplicate Values

**Wrong Code:**
```python
# Build hash map first
seen = {}
for i, num in enumerate(nums):
    seen[num] = i  # Later duplicates overwrite earlier ones

# Then search
for i, num in enumerate(nums):
    complement = target - num
    if complement in seen and seen[complement] != i:
        return [i, seen[complement]]
```

**Problem:**
```
nums = [3, 2, 3], target = 6
After first loop: seen = {3: 2, 2: 1}  # 3:0 was overwritten!
When processing i=0 (num=3):
  complement = 3
  seen[3] = 2 (not 0!)
  Return [0, 2]  ✓ Still works, but inefficient
```

**Why our approach is better:**
- We don't need to build hash map first
- Single pass is more efficient
- Natural handling of duplicates

### Mistake 5: Not Considering Order

**Wrong Assumption:**
> "I need to return smaller index first"

**Truth:** Problem says order doesn't matter!

```python
# Both are valid:
return [0, 1]  ✓
return [1, 0]  ✓
```

Our solution naturally returns `[earlier_index, later_index]` because we check earlier elements first, but `[later_index, earlier_index]` would also be accepted.

---

## Variations and Follow-Ups

### Variation 1: Return All Pairs

**Problem:** What if multiple valid pairs exist?

```python
def two_sum_all_pairs(nums, target):
    """
    Find ALL pairs that sum to target

    Example:
      nums = [1, 2, 3, 4, 3], target = 6
      Output: [[1, 4], [2, 3]]  (indices)
      Explanation: 2+4=6 and 3+3=6
    """
    seen = {}
    result = []

    for i, num in enumerate(nums):
        complement = target - num

        if complement in seen:
            # Found a pair, add it to results
            result.append([seen[complement], i])
            # DON'T return early!

        seen[num] = i

    return result
```

### Variation 2: Return True/False (Existence Check)

**Problem:** Just check if a pair exists

```python
def two_sum_exists(nums, target):
    """
    Return True if pair exists, False otherwise

    Time: O(n)
    Space: O(n)
    """
    seen = set()  # Only need to track values, not indices

    for num in nums:
        if target - num in seen:
            return True
        seen.add(num)

    return False
```

**Optimization:** Use set instead of dict since we don't need indices!

### Variation 3: Sorted Array (Two Pointers)

**Problem:** Array is sorted, can we use O(1) space?

```python
def two_sum_sorted(nums, target):
    """
    Two pointers approach for sorted array

    Time: O(n)
    Space: O(1)
    """
    left, right = 0, len(nums) - 1

    while left < right:
        current_sum = nums[left] + nums[right]

        if current_sum == target:
            return [left, right]
        elif current_sum < target:
            # Need larger sum, move left pointer right
            left += 1
        else:
            # Need smaller sum, move right pointer left
            right -= 1

    return []
```

**Why this works:**
- If sum is too small, we need a larger number (move left++)
- If sum is too large, we need a smaller number (move right--)
- Sorted array lets us make greedy decisions

### Variation 4: Three Sum

**Problem:** Find three numbers that sum to target

```python
def three_sum(nums, target):
    """
    Extend Two Sum to three numbers

    Strategy:
    1. Fix one number
    2. Use Two Sum on the rest

    Time: O(n²)
    Space: O(n)
    """
    nums.sort()  # Sort first for optimization
    result = []

    for i in range(len(nums) - 2):
        # Fix nums[i], find two numbers that sum to target - nums[i]
        new_target = target - nums[i]

        # Two pointers on remaining array
        left, right = i + 1, len(nums) - 1

        while left < right:
            current_sum = nums[left] + nums[right]

            if current_sum == new_target:
                result.append([i, left, right])
                left += 1
                right -= 1
            elif current_sum < new_target:
                left += 1
            else:
                right -= 1

    return result
```

---

## Interview Talking Points

### How to Explain Your Solution (2-minute version)

> "The key insight is to use a complement search pattern. Instead of checking all pairs which takes O(n²) time, I maintain a hash map of numbers I've seen so far.
>
> For each number, I calculate what value would complete the sum - that's the complement. I check if we've seen this complement before using the hash map, which gives O(1) lookup.
>
> If yes, we found our answer. If not, I store the current number for future checks.
>
> The critical detail is checking before storing to avoid using the same element twice.
>
> This gives us O(n) time complexity with O(n) space - a good trade-off that's almost always worth it."

### Questions You Should Ask

Before coding, demonstrate that you think carefully:

1. "Can the array contain duplicates?" → Yes
2. "Can numbers be negative?" → Yes
3. "Is the array sorted?" → No (if it were, we could use two pointers with O(1) space)
4. "Can I modify the input array?" → Usually no, but ask!
5. "What should I return if no solution exists?" → Problem guarantees one exists
6. "Does the order of returned indices matter?" → No

### How to Defend Your Approach

**Interviewer:** "Why not sort the array first?"

**You:** "Good question! Sorting would be O(n log n) time and let us use two pointers with O(1) space. However, we'd lose the original indices, so we'd need to track them during sorting. That adds complexity. The hash map approach is cleaner, faster (O(n) vs O(n log n)), and simpler to implement correctly."

**Interviewer:** "What's the space complexity?"

**You:** "O(n) because in the worst case, we might store n-1 elements in the hash map before finding the answer. For example, if the answer is at indices [n-2, n-1], we'd store all elements before them."

**Interviewer:** "Can you do better than O(n) space?"

**You:** "Not while maintaining O(n) time for an unsorted array. There's a fundamental time-space trade-off here. We could use O(1) space with O(n²) brute force, or O(n) space with O(n) hash map, or sort first for O(n log n) time. The hash map approach is optimal for this problem."

---

## Practice Exercises

### Exercise 1: Code from Scratch
Close this walkthrough and implement the hash map solution without looking. Time yourself - aim for under 5 minutes.

### Exercise 2: Edge Cases
Test your implementation with:
- `nums = [3, 3], target = 6` (duplicates)
- `nums = [-1, -2, -3, -4, -5], target = -8` (negatives)
- `nums = [0, 4, 3, 0], target = 0` (zeros)
- `nums = [2, 7], target = 9` (minimal case)

### Exercise 3: Explain to a Friend
Teach someone else how the hash map approach works. If you can explain it clearly, you truly understand it.

### Exercise 4: Variations
Implement the three sum variation on your own. Can you extend your thinking to four sum?

### Exercise 5: Space Optimization
If told the array is sorted, can you write the two-pointer solution from memory?

---

## Summary

### Key Takeaways

1. **Complement search pattern**: For problems asking "find pair with property X", think about what each element "needs" to satisfy X

2. **Hash tables for O(1) lookup**: When you need to check "have I seen value X before?", hash maps/sets are your friend

3. **Check before store**: When avoiding duplicates or same-element reuse, check for complement BEFORE storing current element

4. **Time-space trade-offs**: Using O(n) extra space to improve from O(n²) to O(n) time is almost always worth it

5. **One-pass algorithms**: Many problems can be solved in a single pass with the right data structure

### Complexity Reference

| Approach | Time | Space | Best For |
|----------|------|-------|----------|
| Brute Force | O(n²) | O(1) | Tiny arrays (n < 100) |
| Hash Map | O(n) | O(n) | General case (optimal) |
| Sort + Two Pointers | O(n log n) | O(1) | When array is pre-sorted |

### Mental Model

Think of the hash map as a "memory" that lets you answer "have I seen X before?" instantly. Each element you process either:
1. Finds its "partner" in memory (solution found!)
2. Gets added to memory for future elements to find

This pattern appears in countless problems beyond Two Sum.

### Next Steps

1. Solve E010 (Three Sum) to extend this pattern
2. Study other complement-search problems
3. Practice explaining the solution out loud
4. Implement without hints until it's automatic

---

**Remember:** The hash map solution isn't just about solving this one problem - it's about developing the intuition to recognize when O(1) lookup can transform a slow solution into a fast one. This pattern will serve you throughout your entire programming career.
