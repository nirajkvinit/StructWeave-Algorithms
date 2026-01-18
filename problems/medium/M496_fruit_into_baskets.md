---
id: M496
old_id: A371
slug: fruit-into-baskets
title: Fruit Into Baskets
difficulty: medium
category: medium
topics: ["array"]
patterns: ["backtrack-permutation"]
estimated_time_minutes: 30
---
# Fruit Into Baskets

## Problem

Imagine you're walking through an orchard where fruit trees are planted in a single row. Each tree produces one type of fruit, and you want to harvest as many fruits as possible with the following rules:

You have exactly **two baskets**, and each basket can only hold one type of fruit (but unlimited quantity of that type). You start at any tree you choose and walk to the right, picking one fruit from each tree you pass. You must pick fruit from every tree you encounter, you can't skip trees.

The harvest ends when you reach a tree whose fruit type doesn't match either of your two baskets (you already have two different types and can't accommodate a third).

For example, if the trees are arranged like this: `[Apple, Banana, Banana, Apple, Apple, Cherry]`
- If you start at the first tree (Apple), you pick: Apple, Banana, Banana, Apple, Apple, then stop at Cherry (that would be a third type). Total: 5 fruits.
- If you start at tree 2 (first Banana), you pick: Banana, Banana, Apple, Apple, then stop at Cherry. Total: 4 fruits.

The array `fruits` represents the tree types in order, where `fruits[i]` is the type of fruit from tree `i`. Your goal is to find the maximum number of fruits you can collect following these rules.

## Why This Matters

Network packet inspection systems face an analogous problem when analyzing traffic streams. A security device might be configured to deep-inspect only two protocol types simultaneously (say, HTTP and DNS) due to memory constraints. The question becomes: "What's the longest continuous sequence of packets we can analyze before encountering a third protocol type?" This helps network engineers optimize buffer sizes and understand inspection coverage.

Content delivery networks (CDNs) use similar logic when caching media streams. A cache node might only store two video codec types at once (H.264 and VP9, for example). When serving a playlist of videos to a user, the CDN wants to maximize the continuous segment it can serve from cache before hitting a third codec type that would require expensive disk access or upstream fetching. This sliding window pattern with a constraint on distinct types is fundamental to resource-constrained streaming and caching systems.

## Examples

**Example 1:**
- Input: `fruits = [1,2,1]`
- Output: `3`
- Explanation: All 3 trees can be harvested successfully.

**Example 2:**
- Input: `fruits = [0,1,2,2]`
- Output: `3`
- Explanation: Harvesting trees at indices [1,2,2] yields the maximum.
Starting from index 0 would only allow collecting from [0,1].

**Example 3:**
- Input: `fruits = [1,2,3,2,2]`
- Output: `4`
- Explanation: Collecting from trees [2,3,2,2] provides the optimal result.
Beginning at index 0 limits collection to [1,2].

## Constraints

- 1 <= fruits.length <= 10⁵
- 0 <= fruits[i] < fruits.length

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a disguised "longest substring with at most 2 distinct characters" problem. The fruit types are characters, baskets are the limit on distinct types, and the contiguous collection is the substring. Think sliding window with a constraint on unique elements.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use a sliding window with two pointers. Expand the right pointer to include new fruits, tracking counts of each type in a HashMap. When you have more than 2 types, shrink from the left by moving the left pointer until you're back to 2 or fewer types. Track the maximum window size seen.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Instead of a HashMap for counts, you can track just the last occurrence index of each fruit type. When you need to shrink, find the fruit type with the earliest last occurrence and remove everything up to that point. This simplifies the shrinking logic.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n²) | O(1) | Try all subarrays |
| Optimal (Sliding Window) | O(n) | O(1) | At most 2 types tracked |

Where n = length of fruits array

## Common Mistakes

1. **Not using sliding window**
   ```python
   # Wrong: Trying all subarrays explicitly
   max_fruits = 0
   for i in range(len(fruits)):
       basket = set()
       for j in range(i, len(fruits)):
           basket.add(fruits[j])
           if len(basket) <= 2:
               max_fruits = max(max_fruits, j - i + 1)

   # Correct: Sliding window approach
   left = 0
   basket = {}
   max_fruits = 0
   for right in range(len(fruits)):
       basket[fruits[right]] = basket.get(fruits[right], 0) + 1
       while len(basket) > 2:
           basket[fruits[left]] -= 1
           if basket[fruits[left]] == 0:
               del basket[fruits[left]]
           left += 1
       max_fruits = max(max_fruits, right - left + 1)
   ```

2. **Incorrect window shrinking**
   ```python
   # Wrong: Only shrinking by one step
   while len(basket) > 2:
       left += 1  # Might need multiple steps to remove a type!

   # Correct: Properly remove from basket
   while len(basket) > 2:
       basket[fruits[left]] -= 1
       if basket[fruits[left]] == 0:
           del basket[fruits[left]]
       left += 1
   ```

3. **Off-by-one in window size calculation**
   ```python
   # Wrong: Forgetting window is inclusive
   max_fruits = max(max_fruits, right - left)

   # Correct: Window size is right - left + 1
   max_fruits = max(max_fruits, right - left + 1)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Longest Substring with At Most K Distinct Characters | Medium | Generalize to k types instead of 2 |
| Longest Substring Without Repeating Characters | Medium | At most 1 occurrence of each char |
| Subarrays with K Different Integers | Hard | Exactly k distinct, not "at most" |
| Max Consecutive Ones III | Medium | Flip at most k zeros, similar window |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Sliding Window](../../strategies/patterns/sliding-window.md)
