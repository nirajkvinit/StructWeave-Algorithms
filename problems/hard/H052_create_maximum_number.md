---
id: H052
old_id: I120
slug: create-maximum-number
title: Create Maximum Number
difficulty: hard
category: hard
topics: ["array"]
patterns: []
estimated_time_minutes: 45
---
# Create Maximum Number

## Problem

You have two integer arrays, `nums1` and `nums2`, with lengths `m` and `n`. Each array represents digits of a number. You also receive an integer `k`.

Your objective is to construct the largest possible number with exactly `k` digits (where `k <= m + n`) by selecting digits from both arrays. The order of digits selected from each individual array must remain unchanged.

Output an array containing the `k` digits that form this maximum number.

## Why This Matters

Arrays are the foundation of algorithmic thinking. This problem develops your ability to manipulate sequential data efficiently.

## Examples

**Example 1:**
- Input: `nums1 = [3,4,6,5], nums2 = [9,1,2,5,8,3], k = 5`
- Output: `[9,8,6,5,3]`

**Example 2:**
- Input: `nums1 = [6,7], nums2 = [6,0,4], k = 5`
- Output: `[6,7,6,0,4]`

**Example 3:**
- Input: `nums1 = [3,9], nums2 = [8,9], k = 3`
- Output: `[9,8,9]`

## Constraints

- `m` equals the length of `nums1`
- `n` equals the length of `nums2`
- Both arrays have lengths between 1 and 500
- Each element in both arrays is a digit from 0 to 9
- `k` ranges from 1 to `m + n`

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Break the problem into three sub-problems: (1) find the maximum subsequence of length x from nums1, (2) find the maximum subsequence of length k-x from nums2, (3) merge these two subsequences to create the maximum combined sequence. Try all valid distributions of k between the two arrays.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use a monotonic decreasing stack to extract max subsequence from a single array. For each possible split (i digits from nums1, k-i from nums2), extract the best i-digit sequence from nums1 and best (k-i)-digit sequence from nums2. Merge them lexicographically (always take larger leading element) and track the global maximum across all splits.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
When extracting max subsequence of length L from array of length N, use a greedy stack approach: iterate through array, and pop smaller elements from stack only if you have enough remaining elements to fill L positions. For merging, compare entire remaining sequences, not just current digits, to handle equal cases correctly.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(C(m,k) × C(n,k) × k) | O(k) | Try all combinations |
| Optimal (Monotonic Stack + Merge) | O(k × (m + n)) | O(k) | k iterations, each O(m+n) for extract+merge |

## Common Mistakes

1. **Incorrect merging logic**
   ```python
   # Wrong: Comparing only current digits
   if nums1[i] > nums2[j]:
       result.append(nums1[i])

   # Correct: Compare remaining sequences
   if nums1[i:] > nums2[j:]:
       result.append(nums1[i])
       i += 1
   ```

2. **Not trying all valid splits**
   ```python
   # Wrong: Fixed split assumption
   sub1 = maxSubsequence(nums1, k // 2)
   sub2 = maxSubsequence(nums2, k - k // 2)

   # Correct: Try all valid splits
   result = []
   for i in range(max(0, k - n), min(k, m) + 1):
       sub1 = maxSubsequence(nums1, i)
       sub2 = maxSubsequence(nums2, k - i)
       result = max(result, merge(sub1, sub2))
   ```

3. **Incorrect max subsequence extraction**
   ```python
   # Wrong: Not checking remaining elements
   while stack and stack[-1] < num:
       stack.pop()

   # Correct: Ensure enough elements remain
   while stack and stack[-1] < num and len(stack) + len(nums) - i > k:
       stack.pop()
   stack.append(num)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Maximum Number from Single Array | Medium | Extract max k-digit subsequence from one array |
| Merge K Sorted Arrays | Hard | Similar merge logic but different constraints |
| Remove K Digits | Medium | Related greedy/stack approach |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Monotonic Stack](../../strategies/patterns/monotonic-stack.md)
