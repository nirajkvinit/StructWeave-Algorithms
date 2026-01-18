---
id: H050
old_id: I114
slug: count-of-smaller-numbers-after-self
title: Count of Smaller Numbers After Self
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# Count of Smaller Numbers After Self

## Problem

Provided with an integer array `nums`, construct and return an integer array `counts` where each element `counts[i]` represents how many elements positioned to the right of `nums[i]` have values smaller than `nums[i]`.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `nums = [5,2,6,1]`
- Output: `[2,1,1,0]`
- Explanation: After 5, there are 2 smaller values (2 and 1).
  After 2, there is 1 smaller value (1).
  After 6, there is 1 smaller value (1).
  After 1, there are 0 smaller values.

**Example 2:**
- Input: `nums = [-1]`
- Output: `[0]`

**Example 3:**
- Input: `nums = [-1,-1]`
- Output: `[0,0]`

## Constraints

- 1 <= nums.length <= 10⁵
- -10⁴ <= nums[i] <= 10⁴

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>Key Insight</summary>
Process the array from right to left while maintaining a sorted structure of elements seen so far. For each element, the count of smaller elements to its right equals the number of elements in the sorted structure that are smaller than it. The challenge is maintaining the sorted structure efficiently.
</details>

<details>
<summary>Main Approach</summary>
Use merge sort with index tracking. During the merge step, count how many elements from the right half are smaller than elements from the left half - these contribute to the answer. Alternatively, use a Binary Indexed Tree (BIT) or balanced BST: iterate from right to left, for each element query how many smaller elements are in the tree, then insert the element.
</details>

<details>
<summary>Optimization Tip</summary>
For BIT approach, coordinate compression is crucial if numbers have large range. Map numbers to ranks (0 to n-1) first. For merge sort, track original indices throughout sorting to place counts in correct positions. Merge sort is more intuitive but BIT handles duplicates more elegantly with proper rank assignment.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(n) | Check every pair (i, j) where j > i |
| Merge Sort with Counting | O(n log n) | O(n) | Count inversions during merge |
| Binary Indexed Tree | O(n log n) | O(n) | Insert and query in sorted structure |
| Balanced BST | O(n log n) | O(n) | Similar to BIT but with tree structure |

## Common Mistakes

1. **Incorrect Merge Sort Count Logic**
   ```python
   # Wrong: Doesn't count correctly during merge
   def mergeSort(self, arr):
       if len(arr) <= 1:
           return arr
       mid = len(arr) // 2
       left = self.mergeSort(arr[:mid])
       right = self.mergeSort(arr[mid:])
       return self.merge(left, right)

   # Correct: Track indices and count during merge
   def mergeSort(self, enums):
       if len(enums) <= 1:
           return enums
       mid = len(enums) // 2
       left = self.mergeSort(enums[:mid])
       right = self.mergeSort(enums[mid:])

       i = j = 0
       merged = []
       while i < len(left) or j < len(right):
           if j >= len(right) or (i < len(left) and left[i][1] <= right[j][1]):
               # Count elements in right that are smaller
               self.counts[left[i][0]] += j
               merged.append(left[i])
               i += 1
           else:
               merged.append(right[j])
               j += 1
       return merged
   ```

2. **Not Using Coordinate Compression for BIT**
   ```python
   # Wrong: BIT size based on value range (could be huge)
   bit = BIT(max(nums) + 1)

   # Correct: Use rank compression
   sorted_nums = sorted(set(nums))
   rank = {v: i + 1 for i, v in enumerate(sorted_nums)}
   bit = BIT(len(sorted_nums) + 1)
   for num in reversed(nums):
       result.append(bit.query(rank[num] - 1))
       bit.update(rank[num], 1)
   ```

3. **Processing Array in Wrong Direction**
   ```python
   # Wrong: Process left to right (counts elements before, not after)
   for num in nums:
       count = query_smaller(num)
       insert(num)

   # Correct: Process right to left
   for num in reversed(nums):
       count = query_smaller(num)
       result.append(count)
       insert(num)
   result.reverse()
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Count of Range Sum | Hard | Count pairs with sum in range instead of simple comparison |
| Reverse Pairs | Hard | Count pairs where nums[i] > 2 * nums[j] |
| Count of Smaller Numbers Before Self | Medium | Same problem but count elements before instead of after |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Merge Sort & BIT Pattern](../../strategies/patterns/advanced-sorting.md)
