---
id: E187
old_id: A006
slug: relative-ranks
title: Relative Ranks
difficulty: easy
category: easy
topics: ["array", "sorting", "hash-table"]
patterns: ["sorting-with-index", "mapping"]
estimated_time_minutes: 15
frequency: medium
prerequisites: ["sorting", "index-tracking", "hash-maps"]
related_problems: ["E001", "M075", "M347"]
strategy_ref: ../strategies/patterns/sorting-patterns.md
---
# Relative Ranks

## Problem

You're given an integer array `score` where each `score[i]` represents the competition score for the athlete at position `i`. All scores are distinct (no ties). Your task is to rank these athletes by their scores in descending order (highest score gets rank 1, second-highest gets rank 2, etc.) and return an array showing each athlete's rank in their original array position.

The ranking system has special formatting for the top three positions:
- 1st place receives `"Gold Medal"`
- 2nd place receives `"Silver Medal"`
- 3rd place receives `"Bronze Medal"`
- 4th place onward receives their numeric rank as a string (e.g., `"4"`, `"5"`, etc.)

The challenge is maintaining the connection between original positions and ranks. If you simply sort the scores, you lose track of which score belonged to which athlete. You need a strategy to sort the scores while preserving enough information to map ranks back to the original positions. This is a common pattern in scenarios where you need to reorder data for processing but report results in the original order.

## Why This Matters

This problem teaches the essential technique of sorting with index tracking—a pattern that appears throughout data processing and algorithm design. The core challenge is maintaining the relationship between positions and values when reordering data, which is fundamental to ranking systems, leaderboards, priority-based processing, and any scenario where you transform data but need to report results relative to the original structure.

Real-world applications include sports statistics systems (exactly this problem), academic grading curves (converting scores to letter grades by ranking), search engine result ordering (ranking documents by relevance score but displaying in that order), recommendation systems (scoring items then presenting top-K), and auction systems (ranking bids while tracking bidder identities). The problem also demonstrates the trade-off between mutating input (fast but destructive) versus creating auxiliary structures (preserves original, uses more space). Learning to preserve index-value relationships during sorting is a foundational skill for data transformation pipelines and report generation systems.

## Examples

**Example 1:**
- Input: `score = [5,4,3,2,1]`
- Output: `["Gold Medal","Silver Medal","Bronze Medal","4","5"]`
- Explanation: The placements are [1st, 2nd, 3rd, 4th, 5th].

**Example 2:**
- Input: `score = [10,3,8,9,4]`
- Output: `["Gold Medal","5","Bronze Medal","Silver Medal","4"]`
- Explanation: The placements are [1st, 5th, 3rd, 2nd, 4th].

## Constraints

- n == score.length
- 1 <= n <= 10⁴
- 0 <= score[i] <= 10⁶
- All the values in score are **unique**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

### Hint 1: Preserving Original Positions
If you sort the scores, how do you remember which rank belongs to which original position? Think about what additional information you need to track alongside each score before sorting.

### Hint 2: Efficient Rank Lookup
After determining the ranking order, how can you quickly assign the correct rank to each original position? Consider using a data structure that maps scores to their ranks.

### Hint 3: Direct Assignment
Instead of sorting the original array, what if you created index-score pairs? How would sorting these pairs help you assign ranks while maintaining the connection to original positions?

## Complexity Analysis

| Approach | Time Complexity | Space Complexity | Notes |
|----------|----------------|------------------|-------|
| Sort with Index Pairs | O(n log n) | O(n) | Create pairs, sort, assign ranks |
| HashMap Mapping | O(n log n) | O(n) | Sort copy, build score→rank map |
| Priority Queue | O(n log n) | O(n) | Max heap to extract in rank order |

## Common Mistakes

### Mistake 1: Losing original positions after sorting
```python
# Wrong: Direct sorting loses original indices
def findRelativeRanks(score):
    sorted_scores = sorted(score, reverse=True)
    result = []
    for s in score:
        rank = sorted_scores.index(s) + 1  # O(n) lookup each time!
        result.append(str(rank))
    return result
```
**Why it's wrong**: This approach has O(n²) time complexity due to repeated linear searches. Also, it doesn't handle the medal strings correctly.

### Mistake 2: Modifying input array
```python
# Wrong: Sorting in place destroys original order
def findRelativeRanks(score):
    score.sort(reverse=True)  # Lost original positions!
    # No way to reconstruct original order
    return score
```
**Why it's wrong**: Once you sort the input array in place, you lose the mapping between original positions and scores.

### Mistake 3: Incorrect rank assignment
```python
# Wrong: Off-by-one error and missing medal logic
def findRelativeRanks(score):
    score_to_rank = {}
    for i, s in enumerate(sorted(score, reverse=True)):
        score_to_rank[s] = i  # Should be i+1
    return [str(score_to_rank[s]) for s in score]  # Missing medals
```
**Why it's wrong**: Ranks are 1-indexed (1st, 2nd, 3rd) not 0-indexed. Also, top 3 ranks need special medal strings instead of numbers.

## Variations

| Variation | Difficulty | Description |
|-----------|----------|-------------|
| Top K Elements | Medium | Find only top K ranked athletes |
| Rank with Ties | Medium | Handle duplicate scores with same rank |
| Dynamic Ranking | Medium | Maintain ranks as scores are added/removed |
| Weighted Rankings | Medium | Rank based on multiple score categories |
| Percentile Ranks | Medium | Convert to percentile rankings |

## Practice Checklist

Track your progress on mastering this problem:

**Initial Practice**
- [ ] Solve with index-score pairs approach
- [ ] Implement using hash map for score-to-rank mapping
- [ ] Handle edge cases (single element, all equal, etc.)

**After 1 Day**
- [ ] Implement without looking at previous solution
- [ ] Can you explain why sorting is necessary?
- [ ] Optimize to use minimal extra space

**After 1 Week**
- [ ] Solve in under 12 minutes
- [ ] Implement using priority queue/heap
- [ ] Write helper function for medal assignment

**After 1 Month**
- [ ] Solve variation with duplicate scores
- [ ] Implement with custom comparator
- [ ] Apply pattern to other ranking problems

## Strategy

**Pattern**: Sorting with Index Tracking
**Key Insight**: Create auxiliary data structure to preserve original positions while sorting to determine ranks.

See [Sorting Patterns](../strategies/patterns/sorting-patterns.md) for more on maintaining index relationships during sort operations.
