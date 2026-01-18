---
title: Spaced Repetition Guide for Algorithms
type: practice-guide
frequency: ongoing
time_required: varies (10-30 min per review session)
---

# Spaced Repetition Guide for Algorithms

Spaced repetition is a scientifically-proven learning technique that combats the forgetting curve by reviewing material at optimal intervals. This guide adapts spaced repetition for algorithm mastery.

## Table of Contents

1. [The Science Behind Spaced Repetition](#the-science-behind-spaced-repetition)
2. [Adapting Spaced Repetition for Coding](#adapting-spaced-repetition-for-coding)
3. [The Leitner Box System for Algorithms](#the-leitner-box-system-for-algorithms)
4. [Optimal Review Intervals](#optimal-review-intervals)
5. [Tracking System Setup](#tracking-system-setup)
6. [12-Week Spaced Repetition Calendar](#12-week-spaced-repetition-calendar)
7. [Learning Style Adaptations](#learning-style-adaptations)
8. [Integration with Problem Difficulty](#integration-with-problem-difficulty)
9. [Tools and Templates](#tools-and-templates)

---

## The Science Behind Spaced Repetition

### The Forgetting Curve

German psychologist Hermann Ebbinghaus discovered that we forget information exponentially over time:

```
Memory Retention Without Review
100% |●
     |  ●
 75% |    ●
     |      ●
 50% |        ●
     |          ●●
 25% |            ●●●
     |               ●●●●●●
  0% |___________________●●●●●●
     Day: 1  3    7   14  30  60
```

**Key Insights:**
- We forget ~50% within 1 hour without review
- We forget ~70% within 24 hours
- The rate of forgetting slows over time
- Each successful review strengthens memory

### Spaced Repetition Effect

Reviewing at increasing intervals strengthens long-term retention:

```
Memory Retention With Spaced Reviews
100% |●    ●      ●        ●          ●
     | ╲  ╱ ╲    ╱ ╲      ╱ ╲        ╱
 75% |  ╲╱   ╲  ╱   ╲    ╱   ╲      ╱
     |        ╲╱     ╲  ╱     ╲    ╱
 50% |                ╲╱       ╲  ╱
     |                          ╲╱
 25% |
     |
  0% |_________________________________
     Day: 1   3      7       14        30
          ↑   ↑      ↑        ↑         ↑
        Solve R1     R2       R3        R4
```

**Why it works:**
- Reviews happen just as you're about to forget
- Each retrieval strengthens neural pathways
- Intervals increase as memory strengthens
- Effort during recall enhances learning (desirable difficulty)

### Application to Algorithms

**Traditional spaced repetition** (e.g., Anki flashcards):
- Memorize facts, vocabulary, formulas

**Algorithm spaced repetition:**
- Recognize patterns
- Rebuild problem-solving pathways
- Reinforce implementation skills
- Strengthen intuition for complexity analysis

**The difference:** You're not memorizing solutions (bad!). You're strengthening pattern recognition and problem-solving instincts (good!).

---

## Adapting Spaced Repetition for Coding

### What to Review

**DON'T review:**
- ❌ Memorized solutions (leads to brittle knowledge)
- ❌ Code copied from hints
- ❌ Problems you found trivial (rating 1/5)

**DO review:**
- ✅ Problems you struggled with (rating 3-5/5)
- ✅ Problems teaching key patterns
- ✅ Problems you solved but want to optimize
- ✅ Problems with common interview patterns

### How to Review Effectively

**Active Recall Method** (recommended):
1. Open the problem (don't look at your previous solution)
2. Attempt to solve from scratch
3. Compare your approach to previous solution
4. Note differences and improvements

**Conceptual Review Method** (for time-constrained days):
1. Read the problem
2. Verbally explain the approach
3. Write pseudocode only
4. Identify the pattern and complexity

**Teaching Method** (deepest learning):
1. Solve the problem
2. Explain solution to someone (or rubber duck)
3. Answer hypothetical questions about variations
4. Relate to other similar problems

### Review Success Criteria

**Successful review** (increase interval):
- Solved without hints
- Identified pattern immediately
- Implemented correctly on first try
- Can explain time/space complexity

**Struggling review** (decrease interval):
- Needed hints to proceed
- Forgot key insight
- Made implementation mistakes
- Confused about approach

---

## The Leitner Box System for Algorithms

The Leitner Box is a physical/digital system for managing review intervals. Here's how to adapt it for algorithms:

### Box Structure

```
┌─────────────────────────────────────────────────────┐
│ BOX 1: Daily Review (New/Struggling)                │
│ Review: Every day                                    │
│ Content: Problems solved yesterday, failed reviews  │
├─────────────────────────────────────────────────────┤
│ BOX 2: Short-term (Moderately Comfortable)          │
│ Review: Every 3 days                                 │
│ Content: Successfully reviewed once                  │
├─────────────────────────────────────────────────────┤
│ BOX 3: Medium-term (Comfortable)                     │
│ Review: Every 7 days                                 │
│ Content: Successfully reviewed twice                 │
├─────────────────────────────────────────────────────┤
│ BOX 4: Long-term (Strong Understanding)              │
│ Review: Every 14 days                                │
│ Content: Successfully reviewed three times           │
├─────────────────────────────────────────────────────┤
│ BOX 5: Mastered (Deep Understanding)                 │
│ Review: Every 30 days                                │
│ Content: Successfully reviewed four times            │
├─────────────────────────────────────────────────────┤
│ BOX 6: Expert Level (Permanent Memory)               │
│ Review: Every 60 days                                │
│ Content: Successfully reviewed five+ times           │
└─────────────────────────────────────────────────────┘
```

### Movement Rules

**Successful review:**
- Move problem to next box (longer interval)
- Example: Box 2 → Box 3

**Failed review:**
- Move problem back to Box 1 (daily review)
- Identify why you struggled and note it

**Graduation:**
- After Box 6 (60-day interval), archive the problem
- You've mastered this problem and pattern

### Digital Implementation

Use a simple spreadsheet or tracking system:

| Problem ID | Current Box | Last Review | Next Review | Pattern | Notes |
|------------|-------------|-------------|-------------|---------|-------|
| E001 | 3 | 2025-12-15 | 2025-12-22 | Hash Map | Solved quickly ✓ |
| M077 | 2 | 2025-12-17 | 2025-12-20 | DFS/BFS | Review grid traversal |
| H028 | 1 | 2025-12-19 | 2025-12-20 | Design | Still struggling with doubly-linked list |

---

## Optimal Review Intervals

### Research-Based Intervals

Based on cognitive science research and adapted for coding:

| Review # | Interval | Cumulative Days | Purpose |
|----------|----------|-----------------|---------|
| Initial Solve | Day 0 | 0 | Learn the pattern |
| Review 1 | +1 day | 1 | Reinforce within 24 hours |
| Review 2 | +2 days | 3 | Strengthen short-term memory |
| Review 3 | +4 days | 7 | Transition to medium-term |
| Review 4 | +7 days | 14 | Build long-term retention |
| Review 5 | +16 days | 30 | Solidify understanding |
| Review 6 | +30 days | 60 | Confirm mastery |
| Review 7 | +30 days | 90 | Archive (mastered) |

### Interval Adjustment Based on Performance

**If you crush the review** (solved in < 50% of original time):
- Skip one interval level
- Example: Day 3 review → Jump to Day 14

**If you struggle significantly** (needed multiple hints):
- Reset to Day 1
- Review tomorrow

**If you partially remember** (solved but slowly):
- Repeat current interval
- Example: Struggled on Day 7 → Review again in 4 days

### Pattern-Specific Intervals

Some patterns benefit from different intervals:

**Fast-cycling patterns** (review more frequently):
- Two Pointers: Day 1, 2, 5, 10, 20, 40
- Binary Search: Day 1, 2, 5, 10, 20, 40
- Sliding Window: Day 1, 2, 5, 10, 20, 40

**Slow-cycling patterns** (review less frequently once understood):
- Dynamic Programming: Day 1, 3, 7, 21, 45, 90
- Backtracking: Day 1, 3, 7, 21, 45, 90
- Graph Algorithms: Day 1, 3, 7, 21, 45, 90

---

## Tracking System Setup

### Option 1: Spreadsheet System (Recommended for Beginners)

Create a Google Sheet with these columns:

**Columns:**
1. Problem ID
2. Problem Title
3. Difficulty
4. Pattern(s)
5. Initial Difficulty Rating (1-5)
6. First Solve Date
7. Review 1 Date
8. Review 2 Date
9. Review 3 Date
10. Review 4 Date
11. Review 5 Date
12. Current Box (1-6)
13. Next Review Date
14. Notes

**Example Row:**
```
E001 | Two Sum | Easy | Hash Map | 3/5 | 2025-12-01 | 2025-12-02 | 2025-12-05 | 2025-12-12 | ... | Box 4 | 2025-12-26 | Good pattern recognition
```

**Automation:**
- Use formula: `=FIRST_SOLVE_DATE + DAYS_FOR_CURRENT_BOX`
- Conditional formatting: Highlight overdue reviews in red
- Filter view: "Due Today" shows problems to review

### Option 2: Notion Database

Create a database with these properties:
- Problem ID (text)
- Title (text)
- Difficulty (select: Easy/Medium/Hard)
- Patterns (multi-select)
- Box Number (select: 1-6)
- Last Review (date)
- Next Review (date - formula)
- Review Count (number)
- Notes (text)

**Views:**
- "Due Today" (filter: Next Review = Today)
- "By Pattern" (group by: Patterns)
- "By Box" (group by: Box Number)
- "Timeline" (calendar view of reviews)

### Option 3: Anki-Style Digital Flashcards

Create cards with:
- **Front:** Problem statement + constraints
- **Back:** Pattern(s), approach hint, complexity
- **Tags:** Difficulty, patterns, topics

**Anki settings for coding:**
- New interval: 1 day
- Graduating interval: 3 days
- Easy interval: 7 days
- Maximum interval: 90 days

### Option 4: Simple Text File (Minimalist)

```markdown
# Spaced Repetition Queue

## Box 1 (Review Daily)
- [ ] E001 - Last: 2025-12-19 - Next: 2025-12-20
- [ ] M077 - Last: 2025-12-19 - Next: 2025-12-20

## Box 2 (Review Every 3 Days)
- [ ] E067 - Last: 2025-12-17 - Next: 2025-12-20
- [ ] M021 - Last: 2025-12-15 - Next: 2025-12-18

## Box 3 (Review Every 7 Days)
...
```

Update daily, move problems between boxes manually.

---

## 12-Week Spaced Repetition Calendar

### Sample Week-by-Week Build-Up

This example assumes you solve 3-4 new problems per week and review on schedule.

#### Week 1: Bootstrap Phase

**Day 1 (Monday):**
- Solve E001 (Two Sum) → Add to Box 1

**Day 2:**
- Review E001 → Success → Move to Box 2
- Solve E008 (Roman to Integer) → Add to Box 1

**Day 3:**
- Review E008 → Success → Move to Box 2
- Solve E038 (Merge Sorted Array) → Add to Box 1

**Day 4:**
- Review E038 → Success → Move to Box 2
- Solve E052 (Valid Palindrome) → Add to Box 1

**Day 5:**
- E001 due (Box 2: +3 days) → Review → Move to Box 3
- Review E052 → Success → Move to Box 2

**Day 6 (Saturday):**
- Weekly review session
- Review all problems solved this week

**Day 7 (Sunday):**
- Rest or catch-up

**Box State End of Week 1:**
- Box 1: Empty
- Box 2: E008, E038, E052
- Box 3: E001
- Box 4+: Empty

---

#### Week 2: Expansion Phase

**Continuing pattern...**

**Daily reviews:** Problems from Box 1 (if any)
**Every 3 days:** Box 2 problems
**Every 7 days:** Box 3 problems

**New problems this week:** E057, M001, M021, E082

**Box State End of Week 2:**
- Box 1: 1-2 struggling problems
- Box 2: 3-4 problems
- Box 3: 4-5 problems
- Box 4: 1-2 problems (from week 1)

---

#### Week 3-4: Steady State

By week 3, you'll reach a steady state:

**Daily time allocation:**
- 5-10 min: Box 1 reviews (0-2 problems)
- 10 min: New problem
- 5-10 min: Scheduled Box 2/3 reviews

**Review load example (Day 15):**
- Box 1: 1 problem (struggling from yesterday)
- Box 2: 2 problems (due today, solved Day 12)
- Box 3: 1 problem (due today, solved Day 8)
- New: 1 problem

**Total:** ~30 minutes/day

---

#### Week 5-8: Acceleration Phase

By week 5, you'll have built momentum:

**Review distribution:**
- Box 1: 0-1 problems (you're getting better!)
- Box 2: 1-2 problems
- Box 3: 2-3 problems
- Box 4: 1-2 problems
- Box 5: 0-1 problems

**Pattern mastery:**
- You'll start recognizing patterns immediately
- Reviews become faster (10-15 min per problem)
- Can solve variations without hints

---

#### Week 9-12: Mastery Phase

**Characteristics:**
- Most problems in Box 4-6
- Reviews are quick (5-10 min)
- Focus shifts to new, harder problems
- Can teach patterns to others

**Typical day:**
- 5 min: Quick review of 1-2 problems from Box 5-6
- 20 min: New medium/hard problem
- 5 min: Update tracking system

---

### Visual Calendar Example (Week 5)

```
Monday (Day 29):
├─ Box 1: None
├─ Box 2: E108 (due Day 29)
├─ Box 3: E001, M021 (due Day 29)
├─ Box 4: None due
├─ New: M077 (Number of Islands)
└─ Total: ~30 min

Tuesday (Day 30):
├─ Box 1: M077 (review yesterday's)
├─ Box 2: None due
├─ Box 3: None due
├─ New: M081 (Sliding Window)
└─ Total: ~20 min

Wednesday (Day 31):
├─ Box 1: M081
├─ Box 2: E038 (due Day 31)
├─ Box 3: E008 (due Day 31)
├─ Box 4: None due
├─ New: None (catch-up day)
└─ Total: ~25 min

[... continues through week ...]
```

---

## Learning Style Adaptations

### Visual Learners

**Enhance reviews with:**
- Draw diagrams during review
- Use flowcharts to explain approach
- Color-code different patterns in tracking system
- Create visual progress charts (problems mastered over time)

**Recommended tracking:**
- Notion kanban board (visual boxes)
- Physical index cards with diagrams
- Mermaid diagrams in problem notes

---

### Auditory Learners

**Enhance reviews with:**
- Explain solution out loud before coding
- Record voice memos explaining approach
- Pair with study partner for verbal review
- Listen to algorithm explanation videos during commute

**Recommended tracking:**
- Voice notes attached to problems
- Podcast-style review sessions
- Verbal walkthroughs in mock interviews

---

### Kinesthetic Learners

**Enhance reviews with:**
- Whiteboard coding (physical writing)
- Walk while thinking through approach
- Use physical index cards in actual boxes
- Type solution from scratch (muscle memory)

**Recommended tracking:**
- Physical Leitner box with index cards
- Handwritten problem journal
- Standing desk for coding reviews

---

### Reading/Writing Learners

**Enhance reviews with:**
- Write detailed solution explanations
- Keep problem journal with notes
- Create summary documents by pattern
- Blog about problems solved

**Recommended tracking:**
- Markdown files with detailed notes
- Obsidian with bidirectional links
- GitHub repo with solution write-ups

---

## Integration with Problem Difficulty

### Foundation Problems (F001-F020)

**Review strategy:**
- Focus on mathematical insight and computational thinking
- Build intuition before patterns
- Should reach Box 6 within 20-30 days

**Typical progression:**
```
Day 0 → Day 1 → Day 3 → Day 7 → Day 14 → Day 30 → Archive
```

---

### Easy Problems (E001-E270)

**Review strategy:**
- Aggressive intervals (quick progression)
- Focus on pattern recognition, not implementation
- Should reach Box 6 within 30-45 days

**Typical progression:**
```
Day 0 → Day 1 → Day 3 → Day 7 → Day 21 → Day 45 → Archive
```

**When to archive:**
- Can solve in < 5 minutes
- Explain approach in < 2 minutes
- Recognize pattern immediately

---

### Medium Problems (M001-M575)

**Review strategy:**
- Standard intervals
- Focus on optimization and edge cases
- Should reach Box 6 within 60-90 days

**Typical progression:**
```
Day 0 → Day 1 → Day 3 → Day 7 → Day 14 → Day 30 → Day 60 → Archive
```

**When to archive:**
- Can solve in < 20 minutes
- Identify multiple approaches
- Explain time/space trade-offs

---

### Hard Problems (H001-H117)

**Review strategy:**
- Extended intervals
- Focus on understanding, not speed
- May never fully "archive" - periodic review indefinitely

**Typical progression:**
```
Day 0 → Day 2 → Day 5 → Day 10 → Day 21 → Day 45 → Day 90 → Day 180 → ...
```

**When to archive:**
- Can solve in < 45 minutes
- Explain to someone else clearly
- Recognize related patterns in other problems
- Have solved multiple times successfully

**Note:** Hard problems often stay in Box 5-6 for months. That's expected.

---

## Tools and Templates

### Daily Review Checklist

```markdown
# Daily Spaced Repetition Review

Date: ___________

## Box 1 (Daily) - Due Today
- [ ] [Problem ID] - Rating: __/5 - Result: ✓ / ✗
- [ ] [Problem ID] - Rating: __/5 - Result: ✓ / ✗

## Box 2 (Every 3 Days) - Due Today
- [ ] [Problem ID] - Rating: __/5 - Result: ✓ / ✗

## Box 3 (Every 7 Days) - Due Today
- [ ] [Problem ID] - Rating: __/5 - Result: ✓ / ✗

## Box 4 (Every 14 Days) - Due Today
- [ ] [Problem ID] - Rating: __/5 - Result: ✓ / ✗

## New Problems
- [ ] [Problem ID] - Initial Rating: __/5 - Add to Box 1

## Box Movements
- Promoted to higher box: [list]
- Demoted to Box 1: [list]

## Tomorrow's Queue
- Box 1: [count] problems
- Box 2: [count] problems
- Box 3: [count] problems
```

---

### Problem Review Template

Use this each time you review a problem:

```markdown
# Review: [Problem ID] - [Problem Title]

**Review Date:** ___________
**Last Review:** ___________
**Review Number:** ___
**Current Box:** ___

## Before Coding (5 min)
- [ ] Read problem statement
- [ ] Identified pattern: _______________
- [ ] Predicted complexity: Time ___ Space ___
- [ ] Recalled key insight: _______________

## Implementation (10-15 min)
- [ ] Coded without hints
- [ ] Handled edge cases
- [ ] Tested with examples

## After Coding (5 min)
- [ ] Solution works correctly
- [ ] Complexity matches expected
- [ ] Compared to previous solution
- [ ] Identified improvements

## Self-Assessment
**How difficult was this review?**
- [ ] 1 - Trivial (archive this problem)
- [ ] 2 - Easy (move to next box)
- [ ] 3 - Moderate (move to next box)
- [ ] 4 - Challenging (repeat current box)
- [ ] 5 - Very hard (move to Box 1)

**What I learned this review:**
_________________________________________________

**Next review scheduled:** ___________
**New box:** ___
```

---

### Weekly Spaced Repetition Report

```markdown
# Weekly Spaced Repetition Report

Week of: ___________

## Review Statistics
- Total reviews completed: ___
- Successful reviews (moved up): ___
- Failed reviews (moved to Box 1): ___
- Average time per review: ___ min

## Box Distribution
- Box 1: ___ problems
- Box 2: ___ problems
- Box 3: ___ problems
- Box 4: ___ problems
- Box 5: ___ problems
- Box 6: ___ problems
- Archived: ___ problems

## Problems Struggling With
1. [Problem ID] - Issue: _______________
2. [Problem ID] - Issue: _______________
3. [Problem ID] - Issue: _______________

## Next Week's Due Reviews
- Monday: ___ problems
- Tuesday: ___ problems
- Wednesday: ___ problems
- Thursday: ___ problems
- Friday: ___ problems
- Weekend: ___ problems

## Adjustments for Next Week
- Pattern to focus on: _______________
- Box to prioritize: _______________
- Goal: _______________
```

---

## Advanced Strategies

### Interleaving Practice

Instead of reviewing all Box 2 problems together, interleave:

**Traditional approach:**
1. Box 2: E001, E008, E038 (all in one session)
2. Box 3: M001, M021 (all in one session)

**Interleaved approach:**
1. E001 (Box 2 - Arrays)
2. M001 (Box 3 - Linked Lists)
3. E008 (Box 2 - Strings)
4. M021 (Box 3 - Linked Lists)
5. E038 (Box 2 - Arrays)

**Benefit:** Forces pattern switching, strengthens discrimination

---

### Retrieval Practice Enhancement

Make reviews harder than initial solving:

**Standard review:**
- Solve the problem again

**Enhanced review:**
1. Solve without looking at examples
2. Implement a variation
3. Optimize to a different complexity
4. Solve with a different approach
5. Explain to someone else

**Benefit:** Deeper encoding through effortful retrieval

---

### Pattern Clustering

Group related problems together in review:

**Example: Two Pointer cluster**
- E001 (Two Sum)
- E067 (Two Sum II - Sorted)
- E011 (3Sum Closest)
- M001 (Linked List Two Pointers)

Review these as a cluster every 14 days to strengthen pattern recognition.

---

## Common Questions

### Q: How many problems should be in my spaced repetition system?

**A:** Start small, build gradually.
- Week 1: 3-5 problems
- Month 1: 15-20 problems
- Month 3: 40-60 problems
- Month 6+: 80-120 problems

More than 120 active problems becomes hard to manage. Archive liberally.

---

### Q: What if I fall behind on reviews?

**A:** Triage and catch up strategically.

**Priority order:**
1. Box 1 problems (daily) - Do these first
2. Problems from key patterns you're learning
3. Medium problems over easy problems
4. Box 2-3 over Box 4-6

**Catch-up strategy:**
- Dedicate one weekend to catch up
- Or spread over next week (2-3 extra reviews/day)
- Or reset overdue problems to Box 1

**Don't:** Try to do everything in one day. Burnout kills consistency.

---

### Q: Should I add all problems I solve to spaced repetition?

**A:** No! Be selective.

**Add problems that:**
- You rated 3-5/5 difficulty
- Teach important patterns
- Are common in interviews
- You want to master deeply

**Don't add:**
- Problems rated 1-2/5 (too easy)
- Variations of problems you've mastered
- Trivial problems you'll never forget

---

### Q: How do I balance new problems vs. reviews?

**A:** Use the 70/30 rule.
- 70% of time: New problems and learning
- 30% of time: Reviews and consolidation

**Example daily 30-min session:**
- 20 min: New problem
- 10 min: Reviews

**Example weekly:**
- 5 days × 20 min new = 100 min new
- 5 days × 10 min review = 50 min review
- Weekend: 2-3 hour deep session

---

### Q: When should I remove a problem from the system?

**A:** Archive when you've reached true mastery.

**Criteria for archiving:**
- Reviewed successfully 5+ times
- Can solve in < 50% of original time
- Can explain approach clearly in 2 minutes
- Recognize the pattern in other problems

**Keep indefinitely:**
- Hard problems (H001-H117)
- Problems teaching rare but important patterns
- Problems you consistently struggle with

---

## Final Thoughts

### The Spaced Repetition Mindset

**Spaced repetition is not about:**
- Memorizing solutions (anti-pattern!)
- Grinding through reviews mindlessly
- Achieving a "streak" for its own sake

**Spaced repetition is about:**
- Building durable pattern recognition
- Strengthening problem-solving intuition
- Efficiently using your limited study time
- Trusting the process of memory consolidation

### The Long Game

**Month 1:** "This feels like so much overhead..."
- Setting up systems
- Learning the rhythm
- Building initial queue

**Month 2:** "I think I'm seeing patterns..."
- Reviews become faster
- Pattern recognition improves
- Confidence grows

**Month 3:** "Oh, this is like that problem I solved..."
- Transfer learning happens naturally
- Can solve variations easily
- Reviews feel effortless

**Month 6:** "I can't believe I struggled with this before..."
- Deep mastery of core patterns
- Interview-ready confidence
- Teaching others

### Your Spaced Repetition Journey Starts Now

1. **Today:** Set up your tracking system (spreadsheet or Notion)
2. **This week:** Add your first 3-5 problems to Box 1
3. **This month:** Build the daily review habit
4. **This quarter:** Reach steady state with 40-60 active problems
5. **This year:** Master core algorithms and patterns

**Remember:** Consistency beats intensity. 15 minutes every day beats 3 hours once a week.

---

## Quick Start Checklist

```
□ Choose tracking system (spreadsheet/Notion/text file)
□ Create Box 1-6 structure
□ Set up "Next Review Date" automation
□ Add first 3 problems from this week
□ Schedule 10 min daily review time
□ Complete first review session
□ Integrate with daily practice routine
□ Set weekly review calendar reminder
□ Commit to 30-day trial
```

---

**Resources:**
- [Daily Review Guide](./daily-review.md) - Daily practice routine
- [Weekly Review Guide](./weekly-review.md) - Consolidation and stretch practice
- [Problem Index](../../metadata/problem_index.json) - All 982 problems
- [Pattern Guides](../../strategies/patterns/) - Deep dives into patterns

**Start your spaced repetition journey today. Your future self will thank you.**
