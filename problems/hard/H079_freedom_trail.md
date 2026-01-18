---
id: H079
old_id: A012
slug: freedom-trail
title: Freedom Trail
difficulty: hard
category: hard
topics: ["string"]
patterns: []
estimated_time_minutes: 45
---
# Freedom Trail

## Problem

Consider a circular dial mechanism where characters are arranged in a ring formation. You have two strings: `ring` (representing the characters arranged on the dial) and `key` (representing a target sequence you need to form). Determine the minimum number of operations required to spell out all characters in the `key` string.

The mechanism works as follows:
- At the start, the first character of `ring` is positioned at the top (12 o'clock position)
- To form each character of `key`, you must rotate the dial and then confirm the selection
- Rotation mechanics:
  - Rotating the dial one position in either direction (clockwise or counterclockwise) costs 1 step
  - The goal of rotation is to bring the target character to the top position
  - Once the desired character `key[i]` is at the top, pressing a confirmation button costs an additional 1 step
  - After confirmation, proceed to align the next character in `key`

Your objective is to calculate the minimum total steps needed to form the complete `key` string.


**Diagram:**

```
        g
    n       o
  i           d

d               d
    i       n
        g

Circular dial with characters: g-o-d-d-i-n-g
Starting position: 'g' at top (12 o'clock)
Rotate clockwise or counterclockwise to spell the key
Each rotation = 1 step, each button press = 1 step
```


## Why This Matters

String manipulation is essential for text processing and pattern matching. This problem builds your character-level thinking.

## Examples

**Example 1:**
- Input: `ring = "godding", key = "godding"`
- Output: `13`

## Constraints

- 1 <= ring.length, key.length <= 100
- ring and key consist of only lower case English letters.
- It is guaranteed that key could always be spelled by rotating ring.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>

This is a dynamic programming problem with choices at each step. For each character in the key:
1. You can be at any position on the ring
2. You need to rotate to one of the positions containing the target character
3. The cost is: rotation distance + 1 (button press)

The subproblem: "minimum cost to spell key[i:] starting from position j on the ring." These subproblems overlap significantly.

</details>

<details>
<summary>🎯 Main Approach</summary>

Use dynamic programming with memoization:
1. Preprocess: build a map of character → list of positions in ring
2. Define dp(key_idx, ring_pos) = minimum steps to spell key[key_idx:] starting at ring_pos
3. Base case: if key_idx == len(key), return 0 (done)
4. Recursive case: for each occurrence of key[key_idx] in ring:
   - Calculate rotation distance (min of clockwise and counterclockwise)
   - Cost = rotation + 1 + dp(key_idx + 1, new_position)
   - Take minimum across all occurrences
5. Return dp(0, 0) (start at position 0 of ring, spell entire key)

The rotation distance between positions i and j on a ring of size n is: min(|i-j|, n - |i-j|)

</details>

<details>
<summary>⚡ Optimization Tip</summary>

Precompute all positions of each character to avoid repeated searching. Also, when calculating rotation distance, remember it's circular - you can go either direction, so take the minimum of direct distance and wraparound distance.

For very large inputs, use bottom-up DP with two arrays (current and next key position) to optimize space to O(n) instead of O(n×m).

</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force DFS | O(m^n) | O(n) | m positions per character, n key length - TLE |
| DP with Memoization | O(n × m × k) | O(n × m) | n = key length, m = ring length, k = avg occurrences |
| Optimal | O(n × m²) | O(n × m) | For each (key_pos, ring_pos), try all target positions |

## Common Mistakes

1. **Not considering both rotation directions**
   ```python
   # Wrong: Only calculating clockwise distance
   def min_distance(ring, pos1, pos2):
       return abs(pos1 - pos2)

   # Correct: Consider both clockwise and counterclockwise
   def min_distance(ring_len, pos1, pos2):
       clockwise = abs(pos2 - pos1)
       counterclockwise = ring_len - clockwise
       return min(clockwise, counterclockwise)
   ```

2. **Forgetting the button press cost**
   ```python
   # Wrong: Only counting rotation steps
   for target_pos in char_positions[key[idx]]:
       dist = min_distance(len(ring), current_pos, target_pos)
       result = min(result, dist + dp(idx + 1, target_pos))

   # Correct: Add 1 for button press
   for target_pos in char_positions[key[idx]]:
       dist = min_distance(len(ring), current_pos, target_pos)
       result = min(result, dist + 1 + dp(idx + 1, target_pos))  # +1 for press
   ```

3. **Not preprocessing character positions**
   ```python
   # Wrong: Searching for character positions every time
   def dp(key_idx, ring_pos):
       target = key[key_idx]
       positions = []
       for i, ch in enumerate(ring):  # O(m) search repeated many times
           if ch == target:
               positions.append(i)

   # Correct: Precompute all positions
   char_positions = {}
   for i, ch in enumerate(ring):
       char_positions.setdefault(ch, []).append(i)

   def dp(key_idx, ring_pos):
       target = key[key_idx]
       positions = char_positions[target]  # O(1) lookup
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Minimum Path Sum | Medium | 2D grid instead of circular ring |
| Coin Change | Medium | Simpler DP without position tracking |
| Decode Ways | Medium | Linear DP, no circular structure |
| Knight Dialer | Medium | Graph DP with limited transitions |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases (circular distance, multiple occurrences)
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
