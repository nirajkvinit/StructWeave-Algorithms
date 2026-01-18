---
id: M509
old_id: A387
slug: number-of-music-playlists
title: Number of Music Playlists
difficulty: medium
category: medium
topics: []
patterns: []
estimated_time_minutes: 30
---
# Number of Music Playlists

## Problem

You're creating a music playlist with some interesting constraints. You have a library of `n` different songs, and you want to build a playlist that's exactly `goal` songs long. Songs can repeat in the playlist, but there are rules to keep things from getting monotonous.

The constraints for a valid playlist:
1. **Every song must appear at least once** - you need to use all `n` different songs somewhere in the playlist
2. **Cooldown period** - after playing a song, you must play `k` different songs before you can play it again

Given these rules, how many different valid playlists can you create?

Since the answer can be astronomically large, return it modulo `10⁹ + 7`.

Let's look at an example:
- If `n = 3, goal = 3, k = 1`, you have 3 songs and want a 3-song playlist
- Valid playlists: [1,2,3], [1,3,2], [2,1,3], [2,3,1], [3,1,2], [3,2,1]
- That's 6 different playlists (essentially all permutations since each song appears exactly once)

Another example:
- If `n = 2, goal = 3, k = 0` (no cooldown), you have 2 songs but need 3 slots
- One song must repeat immediately: [1,1,2], [1,2,1], [2,1,1], [2,2,1], [1,2,2], [2,1,2]
- That's 6 valid playlists

But with `n = 2, goal = 3, k = 1` (must wait 1 song before repeating):
- Can't do [1,1,2] anymore (immediate repeat)
- Valid: [1,2,1] and [2,1,2]
- Only 2 playlists work

## Why This Matters

This problem teaches combinatorial dynamic programming with constraints, a technique used in scheduling systems and recommendation engines. Music streaming services use similar algorithms (though more sophisticated) to generate playlists that balance variety with user preferences - ensuring popular songs appear multiple times while maintaining "freshness" by spacing out repeats. The same mathematical framework applies to job scheduling with cooldown periods (don't run the same backup task too frequently), ad rotation systems (show different ads before repeating), and course scheduling (students need diverse courses before retaking prerequisites). Understanding how to count valid sequences with repetition constraints helps you design better rotation and scheduling algorithms.

## Examples

**Example 1:**
- Input: `n = 3, goal = 3, k = 1`
- Output: `6`
- Explanation: There are 6 possible playlists: [1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], and [3, 2, 1].

**Example 2:**
- Input: `n = 2, goal = 3, k = 0`
- Output: `6`
- Explanation: There are 6 possible playlists: [1, 1, 2], [1, 2, 1], [2, 1, 1], [2, 2, 1], [2, 1, 2], and [1, 2, 2].

**Example 3:**
- Input: `n = 2, goal = 3, k = 1`
- Output: `2`
- Explanation: There are 2 possible playlists: [1, 2, 1] and [2, 1, 2].

## Constraints

- 0 <= k < n <= goal <= 100

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
This is a combinatorial problem with overlapping subproblems. At each position, you can either play a new song (if you haven't used all n songs yet) or replay an old song (if k other songs have been played since). The answer depends on how many songs have been used and the playlist length so far.
</details>

<details>
<summary>🎯 Main Approach</summary>
Use dynamic programming with state dp[i][j] representing the number of playlists of length i using exactly j different songs. For each position, you can add a new song (j+1 different songs) or replay an existing song (same j songs, but only if j > k). Apply modulo arithmetic throughout.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
When replaying songs, you can only choose from (j - k) songs since k songs must be different before replaying. Remember to handle the edge case where j <= k (no replays possible). Use space optimization by keeping only the previous row of the DP table.
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| 2D DP | O(n * goal) | O(n * goal) | Standard tabulation approach |
| Optimal | O(n * goal) | O(n) | Space-optimized using rolling array |

## Common Mistakes

1. **Forgetting modulo operation**
   ```python
   # Wrong: Result can overflow
   def numMusicPlaylists(self, n, goal, k):
       dp = [[0] * (n + 1) for _ in range(goal + 1)]
       dp[0][0] = 1
       for i in range(1, goal + 1):
           for j in range(1, min(i, n) + 1):
               dp[i][j] = dp[i-1][j-1] * (n - j + 1)
               if j > k:
                   dp[i][j] += dp[i-1][j] * (j - k)
       return dp[goal][n]

   # Correct: Apply modulo at each step
   def numMusicPlaylists(self, n, goal, k):
       MOD = 10**9 + 7
       dp = [[0] * (n + 1) for _ in range(goal + 1)]
       dp[0][0] = 1
       for i in range(1, goal + 1):
           for j in range(1, min(i, n) + 1):
               dp[i][j] = (dp[i-1][j-1] * (n - j + 1)) % MOD
               if j > k:
                   dp[i][j] = (dp[i][j] + dp[i-1][j] * (j - k)) % MOD
       return dp[goal][n]
   ```

2. **Not checking replay constraint properly**
   ```python
   # Wrong: Allows replays when j <= k
   for i in range(1, goal + 1):
       for j in range(1, min(i, n) + 1):
           dp[i][j] = dp[i-1][j-1] * (n - j + 1)
           dp[i][j] += dp[i-1][j] * (j - k)  # Bug: j-k could be negative

   # Correct: Only replay when j > k
   for i in range(1, goal + 1):
       for j in range(1, min(i, n) + 1):
           dp[i][j] = dp[i-1][j-1] * (n - j + 1)
           if j > k:  # Check condition first
               dp[i][j] += dp[i-1][j] * (j - k)
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Climbing Stairs | Easy | Simpler DP with fewer constraints |
| Unique Paths II | Medium | 2D grid DP with obstacles |
| Knight Dialer | Medium | Similar combinatorial DP with constraints |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Dynamic Programming](../../strategies/patterns/dynamic-programming.md)
