# Strategy Guide

> Master the building blocks of algorithmic thinking

This directory contains everything you need to understand *how* algorithms work and *when* to apply them. Think of it as your algorithm toolkit—organized from foundational concepts to advanced techniques.

---

## Learning Path

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  FUNDAMENTALS   │────▶│  DATA STRUCTURES │────▶│    PATTERNS     │
│                 │     │                  │     │                 │
│ • Time/Space    │     │ • Arrays/Strings │     │ • Two Pointers  │
│ • Number Theory │     │ • Trees/Graphs   │     │ • Sliding Window│
│ • Probability   │     │ • Heaps/Tries    │     │ • DP/Greedy     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
     Week 1                  Weeks 2-3               Weeks 4-8
```

**Recommended order:**
1. Start with **Fundamentals** to understand complexity analysis
2. Review **Data Structures** you'll use most (arrays, hash tables, trees)
3. Dive into **Patterns** — this is where the magic happens

---

## Directory Contents

### 📐 Fundamentals (`fundamentals/`)

Core concepts every developer must master before tackling algorithms.

| Guide | Description | Time |
|-------|-------------|------|
| [Time Complexity](fundamentals/time-complexity.md) | Big-O notation, common complexities, how to analyze code | 30 min |
| [Space Complexity](fundamentals/space-complexity.md) | Memory analysis, auxiliary vs input space, trade-offs | 25 min |
| [Probability](fundamentals/probability.md) | Randomized algorithms, expected value, Monte Carlo methods | 35 min |
| [Number Theory](fundamentals/number-theory.md) | GCD, LCM, primes, modular arithmetic, divisor functions | 45 min |

---

### 🗃️ Data Structures (`data-structures/`)

Deep dives into each data structure with operations, use cases, and implementation tips.

| Guide | Key Operations | When to Use |
|-------|----------------|-------------|
| [Arrays & Strings](data-structures/arrays-and-strings.md) | Index, slice, search | Sequential data, text processing |
| [Hash Tables](data-structures/hash-tables.md) | O(1) lookup, insert | Fast lookups, counting, deduplication |
| [Linked Lists](data-structures/linked-lists.md) | Insert, delete, traverse | Dynamic size, frequent insertions |
| [Stacks & Queues](data-structures/stacks-and-queues.md) | Push, pop, peek | LIFO/FIFO processing, parsing |
| [Trees](data-structures/trees.md) | Traverse, search, insert | Hierarchical data, BST operations |
| [Heaps](data-structures/heaps.md) | Insert, extract-min/max | Priority queues, top-K problems |
| [Graphs](data-structures/graphs.md) | BFS, DFS, shortest path | Networks, relationships, dependencies |
| [Tries](data-structures/tries.md) | Insert, search, prefix | Autocomplete, spell check, IP routing |

---

### 🎯 Patterns (`patterns/`)

The 17+ algorithmic patterns that solve 90% of coding problems. Each guide includes:
- Mental model and key signals
- Template code you can reuse
- Worked examples with step-by-step solutions
- Practice progression (Day 1 → Day 7)

#### Core Patterns (Master These First)

| Pattern | Key Signal | Guide |
|---------|------------|-------|
| Two Pointers | Sorted array, find pair/triplet | [two-pointers.md](patterns/two-pointers.md) |
| Sliding Window | Contiguous subarray/substring | [sliding-window.md](patterns/sliding-window.md) |
| Binary Search | Sorted data, monotonic function | [binary-search.md](patterns/binary-search.md) |
| Prefix Sum | Range sum queries | [prefix-sum.md](patterns/prefix-sum.md) |
| Hash Map | O(1) lookup needed | [See hash-tables](data-structures/hash-tables.md) |

#### Intermediate Patterns

| Pattern | Key Signal | Guide |
|---------|------------|-------|
| Monotonic Stack | Next greater/smaller element | [monotonic-stack.md](patterns/monotonic-stack.md) |
| Merge Intervals | Overlapping ranges | [merge-intervals.md](patterns/merge-intervals.md) |
| Cyclic Sort | Numbers in range 1-n | [cyclic-sort.md](patterns/cyclic-sort.md) |
| Two Heaps | Median, balanced partitions | [two-heaps.md](patterns/two-heaps.md) |
| K-way Merge | Merge K sorted lists | [k-way-merge.md](patterns/k-way-merge.md) |

#### Advanced Patterns

| Pattern | Key Signal | Guide |
|---------|------------|-------|
| Backtracking | All combinations/permutations | [backtracking.md](patterns/backtracking.md) |
| Dynamic Programming | Optimal substructure, overlapping subproblems | [dynamic-programming.md](patterns/dynamic-programming.md) |
| Greedy | Local optimal → global optimal | [greedy.md](patterns/greedy.md) |
| Graph Traversal | Connected components, paths | [graph-traversal.md](patterns/graph-traversal.md) |
| Topological Sort | Dependencies, ordering | [topological-sort.md](patterns/topological-sort.md) |
| Divide & Conquer | Split, solve, combine | [divide-and-conquer.md](patterns/divide-and-conquer.md) |
| Bitwise XOR | Find unique/missing element | [bitwise-xor.md](patterns/bitwise-xor.md) |

#### Specialized Patterns

| Pattern | Key Signal | Guide |
|---------|------------|-------|
| Sorting Algorithms | Custom ordering, stability needs | [sorting.md](patterns/sorting.md) |
| Advanced Sorting | Radix, bucket, external sort | [advanced-sorting.md](patterns/advanced-sorting.md) |
| Geometry | Points, lines, distances | [geometry.md](patterns/geometry.md) |
| Math & Geometry | Coordinates, shapes, spatial | [math-geometry.md](patterns/math-geometry.md) |
| Computational Geometry | Convex hull, intersections | [computational-geometry.md](patterns/computational-geometry.md) |

**See the [Pattern Decision Flowchart](patterns/README.md)** for help choosing the right pattern.

---

## Recommended Reading Order

### For Beginners (Weeks 1-4)
1. `fundamentals/time-complexity.md` — Understand Big-O first
2. `data-structures/arrays-and-strings.md` — Most common structure
3. `data-structures/hash-tables.md` — Essential for O(1) lookups
4. `patterns/two-pointers.md` — Your first pattern
5. `patterns/sliding-window.md` — Builds on two pointers

### For Intermediate (Weeks 5-8)
1. `data-structures/trees.md` + `patterns/graph-traversal.md`
2. `patterns/binary-search.md` — Beyond simple search
3. `patterns/dynamic-programming.md` — The big one
4. `patterns/backtracking.md` — Generate all possibilities

### For Advanced
1. `patterns/topological-sort.md` + `patterns/k-way-merge.md`
2. `patterns/monotonic-stack.md` — Elegant solutions
3. `fundamentals/probability.md` — Randomized algorithms
4. `patterns/computational-geometry.md` — Specialized problems

---

## Practice Integration

Each pattern guide links to practice problems. For structured practice:

| After Reading | Practice With |
|---------------|---------------|
| Two Pointers | [Two Pointers Drill](../practice/pattern-drills/two-pointers-drill.md) |
| Sliding Window | [Sliding Window Drill](../practice/pattern-drills/sliding-window-drill.md) |
| Binary Search | [Binary Search Drill](../practice/pattern-drills/binary-search-drill.md) |
| DP | [DP Drill](../practice/pattern-drills/dp-drill.md) |
| Backtracking | [Backtracking Drill](../practice/pattern-drills/backtracking-drill.md) |

---

## Quick Reference

**Total Guides:** 34 files across 3 categories

| Category | Files | Focus |
|----------|-------|-------|
| Fundamentals | 4 | Complexity analysis, probability, number theory |
| Data Structures | 8 | Core structures and operations |
| Patterns | 22 | Algorithmic techniques |

**Estimated Study Time:** 40-60 hours for complete coverage

---

<p align="center">
<i>"First, solve the problem. Then, write the code."</i> — John Johnson
</p>
