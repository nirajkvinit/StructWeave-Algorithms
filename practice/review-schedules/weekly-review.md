---
title: Weekly Algorithm Review Session
type: practice-guide
frequency: weekly
time_required: 2-3 hours
---

# Weekly Algorithm Review Session

The weekly review is your opportunity to consolidate learning, identify patterns across problems, and push your boundaries with challenging material. This deep practice session transforms daily work into lasting mastery.

## When to Schedule

**Recommended Times:**
- **Saturday morning** (9am-12pm): Fresh mind, uninterrupted time
- **Sunday afternoon** (2pm-5pm): Reflective, lower pressure

**Block Calendar:** Treat this like an important meeting with yourself. No interruptions.

---

## Session Overview

```
┌───────────────────────────────────────────────────────┐
│ Phase 1: Weekly Retrospective (30 min)                │
│ Phase 2: Pattern Consolidation (45 min)               │
│ Phase 3: Stretch Problem (45-60 min)                  │
│ Phase 4: Mock Interview Simulation (30 min)           │
│ Phase 5: Planning & Reflection (15 min)               │
└───────────────────────────────────────────────────────┘
Total: 2.5 - 3 hours
```

---

## Phase 1: Weekly Retrospective (30 minutes)

### Goal
Identify patterns in your learning, celebrate progress, and course-correct.

### Retrospective Process

#### 1. Review Daily Logs (10 minutes)

Open your daily practice logs from the past week and tally:

**Quantitative Metrics**
```
Problems Solved: ___
- Easy: ___
- Medium: ___
- Hard: ___

Average Time per Problem: ___
Problems Solved Without Hints: ___
Patterns Encountered: [list]
```

**Qualitative Analysis**
```
Most Difficult Problem: [ID + Why]
Biggest Breakthrough: ___________________________
Pattern I'm Most Comfortable With: _______________
Pattern I Struggle With: _________________________
Concept I Need to Review: ________________________
```

#### 2. Create Your Struggle List (10 minutes)

List problems rated 4-5 difficulty:
- [ ] [Problem ID] - Issue: _______________________
- [ ] [Problem ID] - Issue: _______________________
- [ ] [Problem ID] - Issue: _______________________

For each, identify **why** you struggled:
- [ ] Didn't recognize the pattern
- [ ] Recognized pattern but couldn't implement
- [ ] Implementation bugs/edge cases
- [ ] Complexity analysis confusion
- [ ] Fundamental concept gap

#### 3. Celebrate Wins (5 minutes)

**Don't skip this!** Positive reinforcement matters.

Write down:
- One problem you're proud of solving
- One insight that "clicked" this week
- One improvement from last week

#### 4. Set This Week's Intention (5 minutes)

Based on your analysis:
```
This week I will focus on: _______________________
To improve this, I will: _________________________
I'll know I've succeeded when: ___________________
```

---

## Phase 2: Pattern Consolidation (45 minutes)

### Goal
Connect the dots between problems you solved this week.

### Pattern Review by Week

**Use this rotation to match your daily practice pattern (see [Daily Review](./daily-review.md)):**

#### Week 1: Two Pointers Pattern

**Core Concept Review** (10 min)
- When to use: Sorted arrays, linked lists, finding pairs/triplets
- Signatures: Move towards each other, same direction, fast/slow
- Read: [Two Pointers Guide](../../strategies/patterns/two-pointers.md)

**Problem Set** (35 min - 10-12 min each)
1. [E067](../../problems/easy/E067_two_sum_ii_input_array_is_sorted.md) - Classic converging pointers
2. [E052](../../problems/easy/E052_valid_palindrome.md) - String validation
3. [M001](../../problems/medium/M001_add_two_numbers.md) - Linked list iteration

**Reflection Questions:**
- What's the common setup for two pointer problems?
- When do pointers move towards vs. away from each other?
- How do I handle edge cases (empty, single element)?

---

#### Week 2: Sliding Window Pattern

**Core Concept Review** (10 min)
- When to use: Contiguous subarrays/substrings, optimization over ranges
- Signatures: Fixed vs. variable window size, expand-contract
- Read: [Sliding Window Guide](../../strategies/patterns/sliding-window.md)

**Problem Set** (35 min)
1. [M081](../../problems/medium/M081_minimum_size_subarray_sum.md) - Variable window
2. [M067](../../problems/medium/M067_longest_substring_with_at_most_two_distinct_characters.md) - Constraint-based window
3. [E084](../../problems/easy/E084_contains_duplicate_ii.md) - Fixed-size window

**Reflection Questions:**
- How do I know when to expand vs. shrink the window?
- What data structures help track window state?
- How do I handle the window constraint condition?

---

#### Week 3: Binary Search Pattern

**Core Concept Review** (10 min)
- When to use: Sorted data, search space reduction, optimization problems
- Signatures: Classic search, finding boundaries, answer space search
- Read: [Binary Search Guide](../../strategies/patterns/binary-search.md)

**Problem Set** (35 min)
1. [E032](../../problems/easy/E032_sqrtx.md) - Search in answer space
2. [E106](../../problems/easy/E106_first_bad_version.md) - Find boundary
3. [M063](../../problems/medium/M063_find_minimum_in_rotated_sorted_array.md) - Modified array

**Reflection Questions:**
- How do I handle the mid calculation to avoid overflow?
- When should I use `left < right` vs. `left <= right`?
- How do I know if I should return left or right?

---

#### Week 4: Backtracking Pattern

**Core Concept Review** (10 min)
- When to use: Generate all possibilities, combinatorial problems, constraint satisfaction
- Signatures: Choose-explore-unchoose, pruning, depth-first exploration
- Read: [Backtracking Guide](../../strategies/patterns/backtracking.md)

**Problem Set** (35 min)
1. [E036](../../problems/easy/E036_subsets.md) - Generate all subsets
2. [M086](../../problems/medium/M086_combination_sum_iii.md) - Combinations with constraints
3. [M034](../../problems/medium/M034_subsets_ii.md) - Avoiding duplicates

**Reflection Questions:**
- What's the base case in backtracking problems?
- How do I avoid duplicate solutions?
- When should I prune the search space?

---

#### Week 5: Dynamic Programming Foundations

**Core Concept Review** (10 min)
- When to use: Optimal substructure, overlapping subproblems
- Signatures: Top-down (memoization) vs. bottom-up (tabulation)
- Read: [Dynamic Programming Guide](../../strategies/patterns/dynamic-programming.md)

**Problem Set** (35 min)
1. [E033](../../problems/easy/E033_climbing_stairs.md) - Classic DP intro
2. [E077](../../problems/easy/E077_house_robber.md) - Decision-based DP
3. [M050](../../problems/medium/M050_triangle.md) - 2D DP

**Reflection Questions:**
- What's the recurrence relation?
- Can I reduce space complexity?
- How do I identify overlapping subproblems?

---

#### Week 6: Graph Traversal (BFS/DFS)

**Core Concept Review** (10 min)
- When to use: Connected components, shortest path, reachability
- Signatures: BFS (queue, level-order), DFS (stack/recursion, depth-first)
- Read: [Graph Traversal Guide](../../strategies/patterns/graph-traversal.md)

**Problem Set** (35 min)
1. [M077](../../problems/medium/M077_number_of_islands.md) - DFS grid traversal
2. [M055](../../problems/medium/M055_clone_graph.md) - Graph cloning
3. [M079](../../problems/medium/M079_course_schedule.md) - Cycle detection

**Reflection Questions:**
- BFS vs. DFS: when should I use each?
- How do I handle visited nodes?
- What's the graph representation (adjacency list vs. matrix)?

---

#### Week 7: Tree Algorithms

**Core Concept Review** (10 min)
- When to use: Hierarchical data, recursive structure
- Signatures: Preorder, inorder, postorder, level-order, recursive vs. iterative
- Read: [Trees Guide](../../strategies/data-structures/trees.md)

**Problem Set** (35 min)
1. [E044](../../problems/easy/E044_symmetric_tree.md) - Tree property checking
2. [M039](../../problems/medium/M039_binary_tree_level_order_traversal.md) - Level-order BFS
3. [M095](../../problems/medium/M095_lowest_common_ancestor_of_a_binary_tree.md) - Tree recursion

**Reflection Questions:**
- What traversal order does this problem require?
- Can I solve this with both recursion and iteration?
- How do I handle null nodes?

---

#### Week 8: Greedy Algorithms

**Core Concept Review** (10 min)
- When to use: Local optimal leads to global optimal, proof of correctness
- Signatures: Sorting + greedy choice, exchange argument
- Read: [Greedy Guide](../../strategies/patterns/greedy.md)

**Problem Set** (35 min)
1. [M051](../../problems/medium/M051_best_time_to_buy_and_sell_stock_ii.md) - Greedy trading
2. [M085](../../problems/medium/M085_kth_largest_element_in_an_array.md) - Selection with heaps
3. [E054](../../problems/easy/E054_gas_station.md) - Greedy choice validation

**Reflection Questions:**
- Why does the greedy choice work here?
- Could dynamic programming also work? Why is greedy better?
- How do I prove this greedy approach is correct?

---

## Phase 3: Stretch Problem (45-60 minutes)

### Goal
Push beyond your comfort zone. Struggle is growth.

### Hard Problem Selection Strategy

**Choose based on your current level:**

**If you're new (Month 1-3):**
Pick a medium problem outside your comfort zone
- [M062](../../problems/medium/M062_maximum_product_subarray.md) - DP with twist
- [M072](../../problems/medium/M072_binary_search_tree_iterator.md) - Design problem
- [M096](../../problems/medium/M096_search_a_2d_matrix_ii.md) - 2D binary search

**If you're intermediate (Month 4-8):**
Pick an easier hard problem
- [H023](../../problems/hard/H023_word_ladder.md) - BFS graph problem
- [H024](../../problems/hard/H024_longest_consecutive_sequence.md) - Hash table + clever approach
- [H028](../../problems/hard/H028_lru_cache.md) - Design problem (famous!)

**If you're advanced (Month 9+):**
Pick a challenging hard problem
- [H001](../../problems/hard/H001_median_of_two_sorted_arrays.md) - Binary search mastery
- [H021](../../problems/hard/H021_binary_tree_maximum_path_sum.md) - Tree recursion
- [H042](../../problems/hard/H042_find_median_from_data_stream.md) - Two heaps pattern

### Stretch Problem Protocol

**Phase 1: Struggle (20 minutes)**
- [ ] Read problem carefully, identify examples
- [ ] Brainstorm approaches (brute force → optimal)
- [ ] Attempt implementation without hints
- [ ] **Embrace struggle** - this is where learning happens

**Phase 2: Strategic Help (10 minutes)**
- [ ] If stuck, read "Think About" section only
- [ ] Re-attempt for 10 more minutes
- [ ] If still stuck, read first hint

**Phase 3: Learn (20 minutes)**
- [ ] Study the optimal approach
- [ ] Implement from understanding (not memorization)
- [ ] Analyze complexity
- [ ] Ask: "What concept/pattern did I miss?"

**Phase 4: Document (10 minutes)**
- [ ] Write down the key insight in your own words
- [ ] Add to spaced repetition queue for review in 3 days
- [ ] Note related problems to practice this pattern

### Success Metrics

**Don't measure success by solving it.** Measure by:
- Did I identify the right approach eventually?
- Do I understand why this solution works?
- Can I explain this to someone else?
- Did I learn a new pattern or technique?

---

## Phase 4: Mock Interview Simulation (30 minutes)

### Goal
Practice performing under pressure.

### Setup (5 minutes)

**Tools:**
- Timer (visible countdown)
- Blank editor (no autocomplete)
- Whiteboard or paper for planning
- Voice recorder (optional but recommended)

**Environment:**
- Quiet space
- Stand or sit as you would in interview
- Verbalize your thinking out loud

### Problem Selection (Pick ONE)

**Week 1-4:** Easy-Medium problems
- [E038](../../problems/easy/E038_merge_sorted_array.md) + [M021](../../problems/medium/M021_rotate_list.md)

**Week 5-8:** Medium problems
- [M077](../../problems/medium/M077_number_of_islands.md)
- [M081](../../problems/medium/M081_minimum_size_subarray_sum.md)
- [M085](../../problems/medium/M085_kth_largest_element_in_an_array.md)

**Week 9+:** Medium-Hard problems
- [M062](../../problems/medium/M062_maximum_product_subarray.md)
- [H024](../../problems/hard/H024_longest_consecutive_sequence.md)
- [H028](../../problems/hard/H028_lru_cache.md)

### Interview Simulation Flow (25 minutes)

**Minute 0-5: Problem Understanding**
- [ ] Read problem out loud
- [ ] Restate in your own words
- [ ] Clarify constraints and edge cases
- [ ] Give 1-2 example inputs

**Minute 5-10: Approach Discussion**
- [ ] Describe brute force approach
- [ ] State time/space complexity
- [ ] Propose optimization
- [ ] Discuss trade-offs

**Minute 10-20: Implementation**
- [ ] Code while narrating your thinking
- [ ] Handle edge cases
- [ ] Write clean, readable code

**Minute 20-25: Testing & Analysis**
- [ ] Trace through example
- [ ] Check edge cases
- [ ] State final complexity
- [ ] Discuss potential improvements

### Self-Evaluation Checklist

**Communication** (1-5 rating)
- [ ] Thought process was clear
- [ ] Asked clarifying questions
- [ ] Explained trade-offs
- [ ] Remained calm and organized

**Technical** (1-5 rating)
- [ ] Identified correct approach
- [ ] Implemented working solution
- [ ] Handled edge cases
- [ ] Accurate complexity analysis

**Areas for Improvement:**
```
What went well: _________________________________
What to improve: ________________________________
Next week focus: ________________________________
```

---

## Phase 5: Planning & Reflection (15 minutes)

### Goal
Set clear intentions for the upcoming week.

### Weekly Planning Worksheet

**1. Pattern Focus for Next Week**
```
Pattern: _______________________________________
Why I chose this: ______________________________
Related problems to solve: ____________________
Strategy guide to review: ______________________
```

**2. Spaced Repetition Queue**

Review problems due this week from your [Spaced Repetition System](./spaced-repetition-guide.md):

```
Due for review this week:
- [ ] [Problem ID] - Last solved: ___ (due day ___)
- [ ] [Problem ID] - Last solved: ___ (due day ___)
- [ ] [Problem ID] - Last solved: ___ (due day ___)
```

**3. Weak Areas to Address**
```
Concept I need to strengthen: _________________
Resources to review: __________________________
Practice problems: ____________________________
```

**4. Next Week's Daily Schedule**

Map out your daily practice:

| Day | Warm-up | Pattern Focus | Notes |
|-----|---------|---------------|-------|
| Mon | [ID] | [ID] | Review [pattern] |
| Tue | [ID] | [ID] | |
| Wed | [ID] | [ID] | |
| Thu | [ID] | [ID] | |
| Fri | [ID] | [ID] | |
| Sat | Weekly Review | | |
| Sun | Rest/Catch-up | | |

**5. Accountability Commitment**
```
I commit to:
- Practicing ___ days this week
- Completing weekly review on ___
- Reviewing spaced repetition problems
- [One specific improvement goal]

If I miss a day, I will: _______________________
```

---

## Tracking Progress Over Time

### Monthly Progress Review

At the end of each month (on your Week 4 or 8 review):

**Problem Statistics**
```
Month: ___________
Total Problems Solved: ___
- Easy: ___ Medium: ___ Hard: ___
Patterns Mastered: [list]
Average Daily Streak: ___
```

**Pattern Confidence Self-Assessment (1-10)**
```
Two Pointers: ___/10
Sliding Window: ___/10
Binary Search: ___/10
Backtracking: ___/10
Dynamic Programming: ___/10
Graph Traversal: ___/10
Tree Algorithms: ___/10
Greedy: ___/10
```

**Reflection Questions**
1. What pattern am I most confident with?
2. What pattern needs more work?
3. Am I consistently practicing?
4. What's blocking my progress?
5. What motivates me to continue?

---

## Advanced Weekly Review Variations

### Power Hour (1 hour condensed version)

For busy weeks:
- 15 min: Retrospective (condensed)
- 30 min: Solve 2-3 problems from this week's pattern
- 15 min: Planning for next week

### Deep Dive (4 hour extended version)

For weeks before interviews:
- 30 min: Retrospective
- 60 min: Pattern consolidation (6-8 problems)
- 90 min: Two hard problems
- 30 min: Two mock interviews back-to-back
- 30 min: Reflection and planning

---

## Common Pitfalls

### Pitfall 1: Skipping Retrospective
**Problem:** Jumping straight to solving problems without reflection
**Fix:** The retrospective is the most valuable part. It builds meta-cognitive skills.

### Pitfall 2: Avoiding Stretch Problems
**Problem:** Only solving problems within comfort zone
**Fix:** Struggle is necessary. Embrace the "I don't know" feeling.

### Pitfall 3: Inconsistent Weekly Review
**Problem:** Missing weekly reviews, relying only on daily practice
**Fix:** Daily practice builds habits. Weekly review builds mastery. Both are essential.

### Pitfall 4: Not Simulating Interview Pressure
**Problem:** Only solving problems casually
**Fix:** Interview performance is a skill. Practice with timer and out loud.

---

## Integration with Learning Systems

### Connect to Spaced Repetition
- After weekly review, update your [Spaced Repetition Queue](./spaced-repetition-guide.md)
- Schedule problem reviews at optimal intervals
- Track which problems need more reinforcement

### Connect to Daily Practice
- Use insights from weekly review to adjust [Daily Review](./daily-review.md)
- Update warm-up rotation based on weak areas
- Set daily intentions based on weekly goals

### Connect to Study Groups
- Share weekly retrospective with study partner
- Compare patterns and approaches
- Teach what you learned to solidify understanding

---

## Motivation & Mindset

### Weekly Affirmations

**Before the session:**
> "This time is an investment in my future. I deserve this focus."

**During struggle:**
> "Confusion is the first step to clarity. I'm exactly where I need to be."

**After completion:**
> "I showed up. That's what matters. Progress is cumulative."

### When You Feel Stuck

If you consistently struggle with the same concepts:
1. This is normal - algorithms are hard
2. Consider spending 2 weeks on one pattern instead of rotating
3. Watch video explanations of the pattern
4. Teach the concept to someone (even a rubber duck)
5. Take a break - your brain consolidates during rest

### Celebrate Milestones

- First hard problem solved: Celebrate!
- Solved problem without hints: Celebrate!
- Recognized pattern immediately: Celebrate!
- Explained solution clearly in mock interview: Celebrate!

Small wins compound into mastery.

---

## Quick Reference Checklist

Print and use this each week:

```
WEEKLY REVIEW CHECKLIST

□ Phase 1: Retrospective (30 min)
  □ Review daily logs
  □ Create struggle list
  □ Celebrate wins
  □ Set intention

□ Phase 2: Pattern Consolidation (45 min)
  □ Review strategy guide
  □ Solve 3 pattern problems
  □ Answer reflection questions

□ Phase 3: Stretch Problem (45-60 min)
  □ Attempt hard/medium problem
  □ Struggle for 20 min
  □ Learn from solution
  □ Document insights

□ Phase 4: Mock Interview (30 min)
  □ Set up environment
  □ Solve under time pressure
  □ Verbalize thinking
  □ Self-evaluate

□ Phase 5: Planning (15 min)
  □ Choose next week's pattern
  □ Update spaced repetition queue
  □ Plan daily schedule
  □ Set accountability commitment

Total Time: _____ (goal: 2.5-3 hours)
```

---

**Resources:**
- [Daily Review Guide](./daily-review.md) - Complement this with daily practice
- [Spaced Repetition Guide](./spaced-repetition-guide.md) - Systematic review intervals
- [Pattern Guides](../../strategies/patterns/) - Deep dives into each algorithmic pattern
- [Roadmap](../../tracks/roadmap.md) - Long-term learning path

**Start your first weekly review next Saturday. Block the calendar now.**
