---
id: M502
old_id: A378
slug: online-election
title: Online Election
difficulty: medium
category: medium
topics: ["array"]
patterns: []
estimated_time_minutes: 30
---
# Online Election

## Problem

You're building a real-time election tracking system that processes votes as they come in and can answer queries about who was leading at any given moment in time.

You're given two arrays that record the voting history:
- `persons[i]` is the candidate who received the ith vote
- `times[i]` is the exact timestamp when that vote was cast

The voting happens sequentially, with timestamps in strictly increasing order. When someone queries for the leader at time `t`, you need to determine which candidate had the most votes at that moment (including any votes cast exactly at time `t`).

There's an important tiebreaker rule: if multiple candidates have the same number of votes, the candidate who most recently received a vote is considered the leader.

Your task is to implement the `TopVotedCandidate` class:
- `TopVotedCandidate(int[] persons, int[] times)`: Initialize with the complete voting record
- `int q(int t)`: Return the identifier of the leading candidate at time `t`

For example, if votes come in as: candidate 0 at time 0, candidate 1 at time 5, candidate 1 at time 10, then:
- At time 3, candidate 0 leads (only vote so far)
- At time 7, candidate 1 leads (2 votes to 1)
- At time 10, candidate 1 still leads

## Why This Matters

This problem mirrors real-world analytics systems that need to efficiently query historical states. Social media platforms use similar techniques to show trending topics at specific times, financial systems track stock leaders throughout trading hours, and monitoring dashboards display system metrics at any point in history. The key challenge is balancing preprocessing time against query performance - a fundamental tradeoff in time-series databases and caching systems. Learning to precompute and binary search through temporal data is essential for building responsive analytics dashboards.

## Constraints

- 1 <= persons.length <= 5000
- times.length == persons.length
- 0 <= persons[i] < persons.length
- 0 <= times[i] <= 10⁹
- times is sorted in a strictly increasing order.
- times[0] <= t <= 10⁹
- At most 10⁴ calls will be made to q.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>🔑 Key Insight</summary>
Pre-compute the leader at each timestamp during initialization. Since times are strictly increasing and there can be up to 10^4 queries, preprocessing is more efficient than computing on each query.
</details>

<details>
<summary>🎯 Main Approach</summary>
During initialization: track vote counts and maintain the current leader at each timestamp (with tiebreaker logic). Store the leader for each timestamp in an array. For queries: use binary search on the times array to find the largest timestamp ≤ t, then return the pre-computed leader for that time.
</details>

<details>
<summary>⚡ Optimization Tip</summary>
Use a dictionary/hash map to track vote counts and update the leader only when someone overtakes or ties the current leader. The tiebreaker rule (most recent vote wins) means you should update the leader when vote_count[person] >= vote_count[current_leader].
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Naive (compute per query) | O(n) per query | O(1) | Recount votes for each query - too slow |
| Optimal (preprocessing + binary search) | O(n) init, O(log n) per query | O(n) | Pre-compute leaders, binary search for queries |

## Common Mistakes

1. **Wrong tiebreaker implementation**
   ```python
   # Wrong: Not updating on ties
   if votes[person] > votes[leader]:
       leader = person

   # Correct: Update on ties (most recent wins)
   if votes[person] >= votes[leader]:
       leader = person
   ```

2. **Linear search instead of binary search for queries**
   ```python
   # Wrong: O(n) per query
   def q(self, t):
       for i in range(len(self.times)):
           if self.times[i] > t:
               return self.leaders[i-1]
       return self.leaders[-1]

   # Correct: O(log n) with binary search
   def q(self, t):
       idx = bisect.bisect_right(self.times, t) - 1
       return self.leaders[idx]
   ```

3. **Not handling query time exactly matching a vote time**
   ```python
   # Wrong: Using bisect_left incorrectly
   idx = bisect.bisect_left(self.times, t)
   return self.leaders[idx]

   # Correct: Use bisect_right to include votes at time t
   idx = bisect.bisect_right(self.times, t) - 1
   return self.leaders[idx]
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Time Based Key-Value Store | Medium | Store values with timestamps, retrieve at specific time |
| Stock Price Fluctuation | Medium | Track current, max, min prices with timestamp updates |
| Snapshot Array | Medium | Similar preprocessing for queries at different versions |
| Range Sum Query - Immutable | Easy | Prefix sum preprocessing for range queries |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Binary Search](../../strategies/patterns/binary-search.md)
