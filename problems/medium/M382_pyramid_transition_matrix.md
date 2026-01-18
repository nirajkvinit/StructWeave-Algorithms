---
id: M382
old_id: A223
slug: pyramid-transition-matrix
title: Pyramid Transition Matrix
difficulty: medium
category: medium
topics: ["string", "two-pointers"]
patterns: ["dp-2d"]
estimated_time_minutes: 30
strategy_ref: ../strategies/patterns/two-pointers.md
---
# Pyramid Transition Matrix

## Problem

Imagine building a pyramid from colored blocks (labeled with letters A-F), similar to stacking children's blocks. You start with a bottom row of blocks and need to build upward until you reach a single block at the top. Each level has one fewer block than the level below, creating a triangular shape.

The challenge is that you can't place blocks arbitrarily. You're given a list of `allowed` placement rules, where each rule is a three-character string like `"ABC"`. This means: if you have block `A` on the left and block `B` on the right as a base, you can place block `C` on top of them. Order matters - `"ABC"` is different from `"BAC"`.

Here's a concrete example: The rule `"BCC"` means that when you see blocks `B` and `C` sitting next to each other (B on left, C on right), you're allowed to place a `C` block on top of them. Without a matching rule, you cannot place anything on top of that pair.

You're given:
- `bottom`: The base row of the pyramid (a string like `"BCD"`)
- `allowed`: A list of three-character placement rules (like `["BCC", "CDE", "CEA"]`)

Your task is to determine whether you can successfully build a complete pyramid from the given base to a single top block, following only the allowed rules. Each pair of adjacent blocks in every row must have a matching rule in the `allowed` list for the block to be placed above them.


**Diagram:**

```
Example pyramid construction:

Bottom: "BCD"
Allowed: ["BCC", "CDE", "CEA", "FFF"]

Valid pyramid:
     A        ← Top (single block)
    C E       ← Built using "BCC"→C and "CDE"→E
   B C D      ← Bottom (given)

Rule application:
  B C → C   (using "BCC")
  C D → E   (using "CDE")
  C E → A   (using "CEA")

Invalid attempt:
Bottom: "AAAA"
Allowed: ["AAB", "AAC", "BCD"]

    ?        ← Cannot determine
   ? ? ?     ← Needs "AAB" or "AAC" for each pair
  A A A A    ← Bottom

Cannot build complete pyramid - no valid rules for all positions.
```


## Why This Matters

This problem combines backtracking with constraint satisfaction, fundamental techniques in AI planning, game solvers, and configuration systems. Similar logic appears in chemical synthesis planning (can we build this molecule from available reactions?), assembly line optimization (can we construct this product with available parts?), and puzzle solvers (Sudoku, N-Queens). The recursive decomposition strategy - building level by level while trying all valid options - is a cornerstone pattern in search algorithms and will prepare you for more complex backtracking scenarios in interviews and real-world applications.

## Constraints

- 2 <= bottom.length <= 6
- 0 <= allowed.length <= 216
- allowed[i].length == 3
- The letters in all input strings are from the set {'A', 'B', 'C', 'D', 'E', 'F'}.
- All the values of allowed are **unique**.

## Think About

1. What makes this problem challenging? What's the core difficulty?
2. Can you identify subproblems? Do they overlap?
3. What invariants must be maintained?
4. Is there a mathematical relationship to exploit?

## Approach Hints

<details>
<summary>Key Insight</summary>
This is a recursive backtracking problem. Each level of the pyramid depends only on the level below it. Build the pyramid bottom-up: for each pair of adjacent blocks in the current row, there may be multiple valid blocks that can go on top. Try all possibilities recursively.
</details>

<details>
<summary>Main Approach</summary>
Preprocess allowed rules into a map: {(left, right): [possible_tops]}. Use DFS/backtracking to build each level: iterate through adjacent pairs in current row, lookup possible top blocks, recursively try each possibility. Base case: when row has length 1, pyramid is complete. Optimize with memoization on row states.
</details>

<details>
<summary>Optimization Tip</summary>
Convert the allowed list into a dictionary mapping (char1, char2) -> list of valid top characters. This makes lookup O(1) instead of O(allowed.length). Also, use memoization to cache whether a given row string can be completed to a pyramid (avoid recomputing the same subproblems).
</details>

## Complexity Analysis

| Approach | Time | Space | Notes |
|----------|------|-------|-------|
| Brute Force DFS | O(k^(n*(n-1)/2)) | O(n) | k options per position, exponential |
| DFS with Memoization | O(6^n * n) | O(6^n) | Cache results for each row state |

## Common Mistakes

1. **Not preprocessing the allowed rules**
   ```python
   # Wrong: Linear search through allowed for each pair
   for rule in allowed:
       if rule[:2] == left + right:
           top = rule[2]

   # Correct: Build lookup map once
   rules = {}
   for rule in allowed:
       rules[(rule[0], rule[1])] = rules.get((rule[0], rule[1]), []) + [rule[2]]
   ```

2. **Building entire pyramid before validation**
   ```python
   # Wrong: Build full pyramid then check if valid
   pyramid = build_full_pyramid()
   if is_valid(pyramid):
       return True

   # Correct: Validate and backtrack level by level
   def build_level(current_row):
       if len(current_row) == 1:
           return True
       # try all valid next levels
   ```

3. **Forgetting to try all possibilities**
   ```python
   # Wrong: Take first valid option only
   if (left, right) in rules:
       next_row += rules[(left, right)][0]  # first only

   # Correct: Backtrack through all options
   for top in rules.get((left, right), []):
       if build_next_level(next_row + top):
           return True
   ```

## Variations

| Variation | Difficulty | Key Difference |
|-----------|------------|----------------|
| Triangle Minimum Path Sum | Medium | Sum paths instead of rule matching |
| Number of Ways to Build House | Medium | Count valid configurations |
| Word Break | Medium | Similar backtracking with string matching |

## Practice Checklist

- [ ] Solved without hints
- [ ] Optimal time complexity achieved
- [ ] Clean, readable code
- [ ] Handled all edge cases
- [ ] Can explain approach clearly

**Spaced Repetition:** Review in 1 day → 3 days → 7 days → 14 days → 30 days

---
**Strategy Reference:** [Backtracking](../../strategies/patterns/backtracking.md)
