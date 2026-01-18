---
id: H073
old_id: I265
slug: count-the-repetitions
title: Count The Repetitions
difficulty: hard
category: hard
topics: ["string"]
patterns: []
estimated_time_minutes: 45
---
# Count The Repetitions

## Problem

Let's establish a notation: `str = [s, n]` represents a string created by repeating the string `s` exactly `n` times.

	- For instance, `str == ["abc", 3] =="abcabcabc"`.

We say that string `s1` can be derived from string `s2` when we can delete certain characters from `s2` to produce `s1` (maintaining the order of remaining characters).

	- For instance, `s1 = "abc"` can be derived from `s2 = "ab**dbe**c"` by eliminating the bolded characters shown.

You are provided with two strings `s1` and `s2`, along with two integers `n1` and `n2`. This gives you two constructed strings `str1 = [s1, n1]` and `str2 = [s2, n2]`.

Determine the *largest integer *`m`* for which *`str = [str2, m]`* can be derived from *`str1`.

## Why This Matters

String manipulation is essential for text processing and pattern matching. This problem builds your character-level thinking.

## Examples

**Example 1:**
- Input: `s1 = "acb", n1 = 4, s2 = "ab", n2 = 2`
- Output: `2`

**Example 2:**
- Input: `s1 = "acb", n1 = 1, s2 = "acb", n2 = 1`
- Output: `1`

## Constraints

- 1 <= s1.length, s2.length <= 100
- s1 and s2 consist of lowercase English letters.
- 1 <= n1, n2 <= 10⁶

## Think About

1. What's the brute force approach? Why is it inefficient?
2. What property of the input can you exploit?
3. Would sorting or preprocessing help?
4. Can you reduce this to a problem you've seen before?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

The key is recognizing that patterns repeat. When matching s2 against repeated s1, you'll eventually return to the same position in s2 after processing complete copies of s1. Once you detect this cycle, you can calculate how many s2's you can form without actually iterating through all n1 copies of s1.

Think about: after processing k copies of s1, you've matched m characters of s2. What happens in the next cycle of s1?

</details>

<details>
<summary>🎯 Main Approach</summary>

Use cycle detection:
1. Track state after each s1: (index in s2, count of complete s2s formed)
2. Use a hashmap to detect when you return to the same index in s2
3. Once a cycle is detected, calculate:
   - How many s2's are completed per cycle
   - How many remaining s1's fit into complete cycles
   - Process the remaining non-cycle s1's normally
4. Divide total s2 count by n2 to get final answer

The state is determined by the position in s2, since s1 is always processed sequentially.

</details>

<details>
<summary>⚡ Optimization Tip</summary>

The cycle detection can happen within the first len(s2) iterations of s1, since there are only len(s2) possible starting positions in s2. Once you find a cycle, you can skip processing millions of s1 copies and jump straight to calculating the final count using modular arithmetic.

Also handle edge case: if s2 cannot be derived from s1 at all (even once), return 0 immediately.

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force | O(n1 × |s1| × |s2|) | O(1) | Simulate entire matching - TLE for large n1 |
| Cycle Detection | O(|s1| × |s2|) | O(|s2|) | Detect pattern within first |s2| cycles |
| Optimal | O(|s1| × |s2|) | O(|s2|) | Process at most |s2| complete s1 iterations |

## Common Mistakes

1. **Simulating the entire matching process**
   ```python
   # Wrong: Iterating through all n1 copies - TLE
   def get_max_repetitions(s1, n1, s2, n2):
       big_s1 = s1 * n1  # Memory error for large n1
       count = 0
       j = 0
       for char in big_s1:
           if char == s2[j]:
               j += 1
               if j == len(s2):
                   count += 1
                   j = 0
       return count // n2

   # Correct: Use cycle detection to skip iterations
   def get_max_repetitions(s1, n1, s2, n2):
       index_s2 = 0
       count_s2 = 0
       memo = {}  # Map s2_index -> (s1_count, s2_count)

       for i in range(n1):
           for char in s1:
               if char == s2[index_s2]:
                   index_s2 += 1
                   if index_s2 == len(s2):
                       count_s2 += 1
                       index_s2 = 0

           if index_s2 in memo:
               # Cycle detected - calculate remaining
               break
           memo[index_s2] = (i, count_s2)
   ```

2. **Not handling the remainder after cycle**
   ```python
   # Wrong: Forgetting to process remaining s1's after cycle
   cycle_len = i - prev_i
   cycle_count = (n1 - prev_i) // cycle_len
   total = prev_count + cycle_count * (count_s2 - prev_count)
   # Missing: process the remainder (n1 - prev_i) % cycle_len

   # Correct: Process remainder iterations
   remaining = (n1 - prev_i) % cycle_len
   for _ in range(remaining):
       for char in s1:
           if char == s2[index_s2]:
               index_s2 += 1
               if index_s2 == len(s2):
                   total += 1
                   index_s2 = 0
   ```

3. **Wrong final division**
   ```python
   # Wrong: Not dividing by n2
   return count_s2  # Returns count of s2, not str2=[s2,n2]

   # Correct: Divide by n2 to get str2 count
   return count_s2 // n2
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Is Subsequence | Easy | Single string matching, no repetition |
| Repeated String Match | Medium | Find minimum repetitions needed |
| Shortest Way to Form String | Medium | Multiple source strings allowed |
| Interleaving String | Hard | Two source strings interleave |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (no match possible, exact cycles)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Cycle Detection](../../strategies/patterns/cycle-detection.md)
