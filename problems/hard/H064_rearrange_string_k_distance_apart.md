---
id: H064
old_id: I157
slug: rearrange-string-k-distance-apart
title: Rearrange String k Distance Apart
difficulty: hard
category: hard
topics: ["string"]
patterns: ["backtrack-permutation"]
estimated_time_minutes: 45
---
# Rearrange String k Distance Apart

## Problem

You are given a string `s` and an integer `k`. Your task is to reorganize the characters in `s` to create a new string where identical characters are separated by **at least** `k` positions.

If such a reorganization is impossible, return an empty string `""`.

## Why This Matters

String manipulation is essential for text processing and pattern matching. This problem builds your character-level thinking.

## Examples

**Example 1:**
- Input: `s = "aabbcc", k = 3`
- Output: `"abcabc"`
- Explanation: In the output, each occurrence of 'a', 'b', or 'c' is separated from its next occurrence by at least 3 positions.

**Example 2:**
- Input: `s = "aaabc", k = 3`
- Output: `""`
- Explanation: No valid arrangement exists that satisfies the distance requirement.

**Example 3:**
- Input: `s = "aaadbbcc", k = 2`
- Output: `"abacabcd"`
- Explanation: Duplicate characters are spaced at least 2 positions apart in the result.

## Constraints

- 1 <= s.length <= 3 * 10⁵
- s consists of only lowercase English letters.
- 0 <= k <= s.length

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Use a greedy approach with a max-heap to always place the most frequent remaining character. After placing a character, it must "cool down" for k positions before it can be used again. Maintain a waiting queue to track characters in cooldown along with when they become available again.
</details>

<details>
<summary>🎯 Main Approach</summary>
Count character frequencies, then use a max-heap to get the most frequent character at each step. Place it in the result and add it to a waiting queue with its next available position. After processing k positions (or when a character becomes available), move characters from the waiting queue back to the heap. If the heap is empty but we haven't finished, return empty string.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Early termination: if any character appears more than (n + k - 1) / k times, it's impossible to arrange (Pigeonhole Principle). Check this before starting the main algorithm. Also, when k is 0 or 1, simply return the original string as any arrangement works.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force (backtracking) | O(26^n) | O(n) | Try all valid arrangements, exponential |
| Optimal (greedy with heap) | O(n log 26) = O(n) | O(26) = O(1) | Heap operations on constant alphabet size |

## Common Mistakes

1. **Not tracking cooldown positions correctly**
   ```python
   # Wrong: just removing from heap and forgetting about it
   char = heappop(max_heap)
   result.append(char)
   # Lost track of when it can be reused

   # Correct: track next available position
   char, count = heappop(max_heap)
   result.append(char)
   waiting_queue.append((i + k, char, count - 1))
   ```

2. **Not checking impossibility early**
   ```python
   # Wrong: attempting to build even when impossible
   while heap:
       # Try to build and fail at the end

   # Correct: check mathematical constraint first
   max_freq = max(Counter(s).values())
   if max_freq > (len(s) + k - 1) // k:
       return ""  # Impossible
   ```

3. **Handling k=0 or k=1 incorrectly**
   ```python
   # Wrong: running full algorithm for k=0
   # Wastes time on unnecessary processing

   # Correct: handle simple cases early
   if k == 0 or k == 1:
       return s  # Any arrangement works
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Task Scheduler | Medium | Similar cooldown concept, allows idle time |
| Reorganize String | Medium | Special case where k=2 |
| Rearrange String k Distance Apart II | Hard | Return all valid arrangements |
| Distant Barcodes | Medium | Same problem in different context |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Greedy + Heap](../../strategies/patterns/greedy.md)
