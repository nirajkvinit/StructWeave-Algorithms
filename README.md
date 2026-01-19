# StructWeave

> Weaving robust data structures with elegant algorithms — one carefully crafted solution at a time.

![StructWeave - Algorithm Learning Platform with 986 Practice Problems and 17 Patterns](assets/structweave.jpg)

**StructWeave** is an algorithm course and coding interview preparation resource featuring data structures and algorithms practice problems. Designed for steady, deliberate improvement, the focus is on solutions that are *correct*, *readable*, and *educational* — the kind that actually stick.

Master DSA practice through pattern recognition — learn 17 patterns that solve 90% of interview problems.

---

## TL;DR

- **986 practice problems** across 4 difficulty levels (Foundation, Easy, Medium, Hard)
- **17 algorithmic patterns** that solve 90% of coding interview problems
- **4 language guides** with 61 total guides (Python, Go, TypeScript, Rust)
- **Pattern-first learning** approach with spaced repetition support
- **Self-assessment system** with entry assessment and 4 phase assessments
- **Free and open-source** under MIT License

---

## Choose Your Path

```
Complete beginner?     → Start with prerequisites/
New to algorithms?     → Try problems/foundation/ for computational thinking
Know basics?           → Take assessments/entry-assessment.md
Interview prep?        → Follow tracks/roadmap.md
Targeting an industry? → See problems/REAL_WORLD_APPLICATIONS.md
Just refreshing?       → Jump to strategies/patterns/
```

---

## Table of Contents

- [StructWeave](#structweave)
  - [Choose Your Path](#choose-your-path)
  - [Table of Contents](#table-of-contents)
  - [Quick Start](#quick-start)
    - [5-Minute First Problem](#5-minute-first-problem)
    - [Recommended First Problems](#recommended-first-problems)
    - [Detailed Walkthroughs](#detailed-walkthroughs)
  - [Features](#features)
  - [The 17 Patterns](#the-17-patterns)
  - [Learning Paths](#learning-paths)
  - [Language Guides](#language-guides)
  - [Quick Reference](#quick-reference)
  - [How to Use This Repository](#how-to-use-this-repository)
    - [For Daily Practice](#for-daily-practice)
    - [For Interview Prep](#for-interview-prep)
    - [For Targeted Learning](#for-targeted-learning)
  - [Directory Structure](#directory-structure)
  - [Tips for Success](#tips-for-success)
  - [FAQ](#faq)
  - [Philosophy](#philosophy)
    - [The Three Pillars](#the-three-pillars)
    - [Guiding Principles](#guiding-principles)
    - [It's Not Talent. It's Practice](#its-not-talent-its-practice)
    - [What Deliberate Practice Actually Means](#what-deliberate-practice-actually-means)
    - [Why It Matters](#why-it-matters)
  - [Contributing](#contributing)
  - [License](#license)
  - [Acknowledgments](#acknowledgments)

---

## Quick Start

### 5-Minute First Problem

1. **Pick a Pattern** — Start with [Two Pointers](strategies/patterns/two-pointers.md) (beginner-friendly)
2. **Read the Guide** (3 min) — Understand when and how to use it
3. **Solve a Problem** — Open [E006 Container With Most Water](problems/easy/E006_container_with_most_water.md)
4. **Use Hints if Stuck** — Each problem has a 3-tier hint system

### Recommended First Problems

| Problem | Pattern | Time | Why Start Here |
|---------|---------|------|----------------|
| [F001 Multiples of 3 or 5](problems/foundation/F001_multiples_of_3_or_5.md) | Math | 10 min | Modulo, loops, inclusion-exclusion |
| [E001 Two Sum](problems/easy/E001_two_sum.md) | Hash Map | 15 min | Classic, teaches complement search |
| [E014 Valid Parentheses](problems/easy/E014_valid_parentheses.md) | Stack | 15 min | Fundamental data structure |
| [M002 Longest Substring](problems/medium/M002_longest_substring_without_repeating_characters.md) | Sliding Window | 25 min | Core interview pattern |

### Detailed Walkthroughs

Work through step-by-step problem solutions:

| Problem | Pattern | Difficulty |
|---------|---------|------------|
| [Two Sum](examples/two-sum-walkthrough.md) | Hash Map | Easy |
| [Valid Parentheses](examples/valid-parentheses-walkthrough.md) | Stack | Easy |
| [Merge Intervals](examples/merge-intervals-walkthrough.md) | Intervals | Medium |
| [Course Schedule](examples/course-schedule-walkthrough.md) | Topological Sort | Medium |
| [LRU Cache](examples/lru-cache-walkthrough.md) | Design | Medium |

---

## Features

- **986 Practice Problems** — Organized by difficulty (21 foundation, 271 easy, 576 medium, 118 hard)
- **4 Language Guides** — Comprehensive guides for Python, Go, TypeScript, and Rust
- **17 Pattern Guides** — Master the core patterns that solve 90% of interview problems
- **Foundation Tier** — Computational thinking problems for building mathematical intuition
- **[Real-World Applications Index](problems/REAL_WORLD_APPLICATIONS.md)** — Problems mapped to industry domains
- **Multiple Solution Approaches** — From brute force to optimal, with complexity analysis
- **3-Tier Hint System** — Nudge → Direction → Skeleton (learn without spoilers)
- **Spaced Repetition Support** — Built-in review schedules and practice checklists
- **Self-Assessment System** — Entry assessment + 4 phase assessments to track progress
- **Pure Markdown** — Pure markdown, works anywhere, forever

---

## By The Numbers

| Metric | Count |
|--------|-------|
| Total Practice Problems | 986 |
| Algorithmic Patterns | 17 |
| Data Structure Guides | 8 |
| Language Guides | 61 |
| Foundation Problems | 21 |
| Easy Problems | 271 |
| Medium Problems | 576 |
| Hard Problems | 118 |

---

## The 17 Patterns

These patterns solve the vast majority of algorithm problems:

| Pattern | When to Use | Guide |
|---------|-------------|-------|
| Two Pointers | Sorted arrays, pair finding | [two-pointers.md](strategies/patterns/two-pointers.md) |
| Sliding Window | Contiguous subarrays/substrings | [sliding-window.md](strategies/patterns/sliding-window.md) |
| Binary Search | Sorted data, monotonic functions | [binary-search.md](strategies/patterns/binary-search.md) |
| Prefix Sum | Range sum queries | [prefix-sum.md](strategies/patterns/prefix-sum.md) |
| Monotonic Stack | Next greater/smaller element | [monotonic-stack.md](strategies/patterns/monotonic-stack.md) |
| Cyclic Sort | Numbers 1-n, missing/duplicate | [cyclic-sort.md](strategies/patterns/cyclic-sort.md) |
| Merge Intervals | Overlapping ranges | [merge-intervals.md](strategies/patterns/merge-intervals.md) |
| Two Heaps | Median, balanced partitions | [two-heaps.md](strategies/patterns/two-heaps.md) |
| K-way Merge | Merge K sorted sequences | [k-way-merge.md](strategies/patterns/k-way-merge.md) |
| Top K Elements | Kth largest/smallest | [heaps.md](strategies/data-structures/heaps.md) |
| Graph BFS/DFS | Traversal, shortest path | [graph-traversal.md](strategies/patterns/graph-traversal.md) |
| Topological Sort | Dependencies, ordering | [topological-sort.md](strategies/patterns/topological-sort.md) |
| Backtracking | All combinations/permutations | [backtracking.md](strategies/patterns/backtracking.md) |
| Dynamic Programming | Optimal substructure | [dynamic-programming.md](strategies/patterns/dynamic-programming.md) |
| Greedy | Local optimal → global optimal | [greedy.md](strategies/patterns/greedy.md) |
| Divide & Conquer | Split, solve, combine | [divide-and-conquer.md](strategies/patterns/divide-and-conquer.md) |
| Bitwise XOR | Find unique elements | [bitwise-xor.md](strategies/patterns/bitwise-xor.md) |

See the [Pattern Decision Guide](strategies/patterns/README.md) for a flowchart on choosing the right pattern.

---

## Learning Paths

![StructWeave 4-Phase Competency Roadmap for Algorithm Mastery](assets/the_competency_roadmap.jpg)

| Track | Duration | For Who | Start Here |
|-------|----------|---------|------------|
| **Beginner** | 10-12 weeks | Complete beginners, bootcamp grads | [Prerequisites](prerequisites/) |
| **Foundation** | 2-3 weeks | Build computational thinking first | [Foundation Problems](problems/foundation/) |
| **Interview Prep** | 8-10 weeks | Experienced devs preparing for interviews | [Entry Assessment](assessments/entry-assessment.md) |
| **Refresher** | 4 weeks | Rusty engineers getting back in shape | [Pattern Guides](strategies/patterns/) |
| **Maintenance** | 3-5 hrs/week | Staying sharp long-term | [Mixed Practice](practice/mixed-practice/) |

See [tracks/roadmap.md](tracks/roadmap.md) for the complete 4-phase learning path.

---

## Language Guides

Master algorithms in your preferred language with comprehensive, language-specific guides. See the [Language Guides Overview](languages/README.md) for detailed comparisons and learning paths.

| Language | Guides | Duration | Focus Areas | Start Here |
|----------|--------|----------|-------------|------------|
| **Python** | 15 | 5 weeks | Idioms, async, SOLID, design patterns, system design | [Python Guide](languages/python/README.md) |
| **Go** | 14 | 5 weeks | Concurrency, generics, SOLID, design patterns | [Go Guide](languages/golang/README.md) |
| **TypeScript** | 15 | 6 weeks | Type system, generics, async, design patterns | [TypeScript Guide](languages/typescript/README.md) |
| **Rust** | 17 | 5-6 weeks | Ownership, concurrency, macros, unsafe FFI, WebAssembly | [Rust Guide](languages/rust/README.md) |

Each guide follows the **80/20 principle** and includes:

- Syntax quick reference and data structures
- 17 algorithm patterns with language-specific idioms
- SOLID principles and design patterns
- Anti-patterns and interview trap questions
- Spaced repetition schedules

---

## Quick Reference

- **[Algorithm Glossary](GLOSSARY.md)** — Key terminology and definitions
- **[Pattern Decision Guide](strategies/patterns/README.md)** — Flowchart for choosing patterns
- **[Real-World Applications](problems/REAL_WORLD_APPLICATIONS.md)** — Problems mapped to industry domains
- **[Assessment Overview](assessments/README.md)** — Self-evaluation tools

---

## How to Use This Repository

### For Daily Practice

1. Choose a problem from your target difficulty level
2. Set a timer (15 min for easy, 25 min for medium, 40 min for hard)
3. Attempt the problem
4. Review the strategy reference if stuck
5. Mark problems you've completed in `practice/review/`

### For Interview Prep

1. Start with the [Entry Assessment](assessments/entry-assessment.md)
2. Follow the [Roadmap](tracks/roadmap.md)
3. Complete pattern-specific drills in `practice/drills/`
4. Take mock interviews from `assessments/mock_interviews/`
5. Review weak areas using spaced repetition

### For Targeted Learning

1. Identify your weak pattern using [Phase Assessments](assessments/README.md)
2. Study the pattern guide in `strategies/patterns/`
3. Complete all easy problems with that pattern tag
4. Graduate to medium problems
5. Test yourself with pattern-specific drills

---

## Directory Structure

```
├── problems/              # 986 practice problems by difficulty
│   ├── foundation/        # F001-F021 (21 problems) - Computational thinking
│   ├── easy/              # E001-E271 (271 problems)
│   ├── medium/            # M001-M576 (576 problems)
│   └── hard/              # H001-H118 (118 problems)
│
├── strategies/            # Learning resources
│   ├── fundamentals/      # Time/space complexity, problem-solving frameworks
│   ├── data-structures/   # Arrays, trees, graphs, heaps, etc.
│   └── patterns/          # 17 core algorithmic patterns
│
├── assessments/           # Skill evaluation tools
│   ├── entry_assessment.md
│   ├── pattern_mastery.md
│   └── mock_interviews/
│
├── practice/              # Structured practice resources
│   ├── drills/            # Focused skill-building exercises
│   └── review/            # Spaced repetition schedules
│
├── languages/             # Language-specific learning guides
│   ├── python/            # 15 guides: syntax → system design (5 weeks)
│   ├── golang/            # 14 guides: concurrency, generics (5 weeks)
│   ├── typescript/        # 15 guides: type system mastery (6 weeks)
│   └── rust/              # 17 guides: ownership → WebAssembly (5-6 weeks)
│
├── prerequisites/         # Foundational knowledge for beginners
├── examples/              # Worked problem walkthroughs
└── tracks/                # Curated learning paths
```

---

## Tips for Success

**Consistency Over Intensity**

- 30 minutes daily beats 3 hours on Sunday
- Use spaced repetition to retain patterns
- Review problems 1 week, 1 month, and 3 months later

**Focus on Understanding, Not Memorization**

- Don't memorize solutions — understand the pattern
- Ask "why this approach?" not "what is the solution?"
- Explain your thinking process out loud

**When You Get Stuck**

1. Read the "Think About" section
2. Review the pattern guide referenced
3. Try solving a simpler version first
4. Draw diagrams to visualize the problem
5. Take a break and return with fresh eyes

---

## FAQ

**Q: What is StructWeave?**
A: StructWeave is a free, open-source algorithm learning resource and coding interview preparation course featuring 986 practice problems, 17 algorithmic patterns, and comprehensive guides for Python, Go, TypeScript, and Rust. It uses pattern-first learning with spaced repetition support.

**Q: What are the 17 algorithmic patterns for coding interviews?**
A: The 17 patterns are: Two Pointers, Sliding Window, Binary Search, Prefix Sum, Monotonic Stack, Cyclic Sort, Merge Intervals, Two Heaps, K-way Merge, Top K Elements, Graph BFS/DFS, Topological Sort, Backtracking, Dynamic Programming, Greedy, Divide & Conquer, and Bitwise XOR. These patterns solve approximately 90% of coding interview problems.

**Q: Is StructWeave free?**
A: Yes, StructWeave is completely free and open-source under the MIT License. All 986 problems, 17 pattern guides, and 61 language guides are freely available.

**Q: What programming languages does StructWeave support?**
A: StructWeave provides comprehensive guides for four languages: Python (15 guides), Go (14 guides), TypeScript (15 guides), and Rust (17 guides). Each guide covers language-specific idioms, data structure implementations, and algorithm patterns.

**Q: Should I solve problems in order?**
A: Not necessarily. Use the roadmap as a guide, but jump around based on your needs.

**Q: How many problems should I solve per day?**
A: Quality over quantity. 1-2 problems deeply understood beats 5 problems rushed.

**Q: What if I can't solve a problem?**
A: That's normal! Use the hints, review the pattern guide, and try again. Struggling is part of learning.

**Q: How do I know when I'm ready for interviews?**
A: Complete the [Phase Assessments](assessments/README.md). If you can solve 70%+ of medium problems across all patterns, you're ready.

**Q: How long does it take to complete StructWeave?**
A: It depends on your starting point. The Interview Prep track takes 8-10 weeks for experienced developers. Complete beginners should expect 10-12 weeks starting with prerequisites.

**Q: What makes StructWeave different from other algorithm resources?**
A: StructWeave emphasizes pattern-first learning (recognizing which pattern to apply) over problem memorization. It includes a 3-tier hint system, spaced repetition schedules, self-assessment tools, and maps problems to real-world industry applications.

---

## Philosophy

### The Three Pillars

1. **First Principles Thinking** — Understand *why* patterns work, not just *how*
2. **Pattern-First Learning** — Pattern recognition beats problem memorization
3. **Science-Backed Practice** — Spaced repetition, active recall, deliberate practice

### Guiding Principles

- **Clarity over cleverness** — One-liners that no one understands help no one
- **Understanding over speed** — Quiet competence beats flashy tricks
- **Progress over perfection** — Steady improvement, one problem at a time

<details>
<summary><strong>Why Regular DSA Practice Works</strong></summary>

### It's Not Talent. It's Practice

Research consistently shows that [deliberate practice](https://geoffcolvin.com/books/talent-is-overrated/), not innate talent, separates world-class performers from everyone else.

| Book | Core Insight |
|------|--------------|
| [Peak](https://angeladuckworth.com/grit-book/) (Ericsson & Pool) | Deliberate practice builds mental representations that enable expertise |
| [Talent Is Overrated](https://geoffcolvin.com/books/talent-is-overrated/) (Colvin) | Excellence comes from continually identifying and improving weak points |
| [Grit](https://angeladuckworth.com/grit-book/) (Duckworth) | Passion + perseverance beats talent every time |
| [So Good They Can't Ignore You](https://www.calnewport.com/books/so-good/) (Newport) | Career capital comes from stretching beyond your current abilities |

### What Deliberate Practice Actually Means

1. **Work at the edge of ability** — Growth happens in the learning zone
2. **Get immediate feedback** — Know whether your approach works before moving on
3. **Focus on weaknesses** — Not just what you're already good at
4. **Repeat with intention** — Each attempt should be a conscious effort to improve

### Why It Matters

Your brain physically changes through practice. [Neuroscience research](https://pmc.ncbi.nlm.nih.gov/articles/PMC6996130/) shows mathematical practice increases grey matter density in regions critical for reasoning.

**30 minutes daily beats 4 hours weekly.** Consistency builds neural pathways.

</details>

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Ways to help:**

- Improve problem explanations for clarity
- Add alternative solution approaches
- Fix typos and broken links
- Enhance pattern guides with examples
- Add practice drills

**Important:** All content must be original or properly paraphrased. No direct copying from any platform.

---

## License

[MIT License](LICENSE) — Use freely.

---

## Acknowledgments

This repository synthesizes wisdom from classic algorithm textbooks (CLRS, Skiena), research on deliberate practice and spaced repetition, and the open-source algorithm education community.

*If you find this useful, pay it forward. Teach someone else.*

---

<p align="center">
<b>StructWeave</b> — Interlacing data structures with algorithmic insight.<br>
Practice problems · Clean implementations · Progressive difficulty<br>
One carefully woven solution at a time.
</p>
