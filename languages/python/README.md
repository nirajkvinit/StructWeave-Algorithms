# Python Programming Guide

> **The 80/20 Guide**: Master the 20% of Python that solves 80% of problems

This guide is designed for developers who want to learn Python quickly, retain knowledge effectively, and prepare for coding interviews. It follows the 80/20 principle—focusing on the essential concepts that give you maximum leverage.

---

## Prerequisites

- **Python 3.10+** minimum (for pattern matching)
- **Python 3.14+** recommended (current stable as of January 2026)
- `python` and `pip` installed (or `uv` for modern package management)
- Basic programming knowledge

---

## Why Python for Interviews?

| Advantage | Details |
|-----------|---------|
| **Readability** | Clean syntax lets you focus on algorithms, not language quirks |
| **Concise Code** | List comprehensions, unpacking, and built-ins reduce boilerplate |
| **Rich Standard Library** | `collections`, `itertools`, `heapq`, `bisect` solve common patterns |
| **Most Popular** | Widely accepted in interviews; interviewers are familiar with it |
| **Quick Prototyping** | Dynamic typing means faster iteration during timed problems |
| **Built-in Data Structures** | Lists, dicts, sets with O(1) operations out of the box |

---

## Learning Path (5-Week Plan)

```
Week 1: Foundations
├── Day 1-2: Syntax & Types (01-syntax-quick-reference.md)
├── Day 3-4: Data Structures (02-data-structures.md)
└── Day 5-7: Practice easy problems in Python

Week 2: Pythonic Patterns
├── Day 1-2: Pythonic Idioms (03-pythonic-idioms.md)
├── Day 3-4: Interview Patterns Part 1 (04-interview-patterns.md)
└── Day 5-7: Practice medium problems

Week 3: Patterns & Standard Library
├── Day 1-2: Interview Patterns Part 2 (04-interview-patterns.md)
├── Day 3-4: Standard Library Mastery (05-standard-library.md)
└── Day 5-7: Practice hard problems

Week 4: Advanced & Interview Simulation
├── Day 1: Type Hints & Modern Python (06-type-hints-modern.md)
├── Day 2: Concurrency & Async (07-concurrency-async.md)
├── Day 3: Tooling & Testing (08-tooling-testing.md)
├── Day 4-5: Timed problem solving
└── Day 6-7: Mock interviews

Week 5: Design Patterns & Deep Knowledge
├── Day 1: SOLID Principles (09-solid-principles.md)
├── Day 2: Creational Patterns (10-design-patterns-creational.md)
├── Day 3: Structural Patterns (11-design-patterns-structural.md)
├── Day 4: Behavioral Patterns (12-design-patterns-behavioral.md)
├── Day 5: Anti-Patterns & Best Practices (13-anti-patterns-best-practices.md)
├── Day 6: Trap Questions Review (14-interview-trap-questions.md)
└── Day 7: System Design (15-system-design.md) + mock interviews

Week 6 (Optional): Production Mastery
├── Day 1-2: Standard Library Essentials (16-standard-library-essentials.md)
├── Day 3-5: Test-Driven Development (17-test-driven-development.md)
└── Day 6-7: Practice and review
```

---

## Guide Contents

### Core Python (Weeks 1-4)

| File | Focus | Time |
|------|-------|------|
| [01-syntax-quick-reference.md](01-syntax-quick-reference.md) | Essential syntax, types, Python 3.14 features | 45 min |
| [02-data-structures.md](02-data-structures.md) | Lists, dicts, sets, heapq, deque, custom types | 60 min |
| [03-pythonic-idioms.md](03-pythonic-idioms.md) | Comprehensions, generators, decorators | 60 min |
| [04-interview-patterns.md](04-interview-patterns.md) | 17 algorithm patterns in idiomatic Python | 120 min |
| [05-standard-library.md](05-standard-library.md) | itertools, functools, collections, bisect | 45 min |
| [06-type-hints-modern.md](06-type-hints-modern.md) | Type annotations, typing module, PEP 649 | 30 min |
| [07-concurrency-async.md](07-concurrency-async.md) | asyncio, threading, free-threaded Python | 45 min |
| [08-tooling-testing.md](08-tooling-testing.md) | pytest, linting, debugging, CI/CD | 30 min |

### Design Patterns & Advanced Topics (Week 5)

| File | Focus | Time |
|------|-------|------|
| [09-solid-principles.md](09-solid-principles.md) | SRP, OCP, LSP, ISP, DIP with Python idioms | 60-75 min |
| [10-design-patterns-creational.md](10-design-patterns-creational.md) | Singleton, Factory, Builder, Prototype, Object Pool | 60-75 min |
| [11-design-patterns-structural.md](11-design-patterns-structural.md) | Adapter, Bridge, Composite, Decorator, Facade, Flyweight, Proxy | 50-60 min |
| [12-design-patterns-behavioral.md](12-design-patterns-behavioral.md) | Observer, Strategy, Command, State, Template Method, Visitor | 75-90 min |
| [13-anti-patterns-best-practices.md](13-anti-patterns-best-practices.md) | Common mistakes, code smells, production best practices | 75-90 min |
| [14-interview-trap-questions.md](14-interview-trap-questions.md) | Gotchas, tricky questions, deep knowledge tests | 60-75 min |
| [15-system-design.md](15-system-design.md) | WSGI/ASGI, FastAPI vs Django, Celery, project architecture | 90-100 min |

### Production Mastery (Week 6)

| File | Focus | Time |
|------|-------|------|
| [16-standard-library-essentials.md](16-standard-library-essentials.md) | pathlib, datetime, json, logging, dataclasses, regex | 60-90 min |
| [17-test-driven-development.md](17-test-driven-development.md) | TDD methodology, QA mindset, mocking, property-based testing, anti-patterns | 90-120 min |

---

## The 80/20 of Python

### 20% of Concepts That Matter Most

1. **Lists** — Dynamic arrays, your workhorse for algorithms (`append`, `pop`, slicing)
2. **Dictionaries** — O(1) lookups, complement searching, counting patterns
3. **Sets** — O(1) membership testing, deduplication, set operations
4. **List Comprehensions** — Concise loops: `[x*2 for x in nums if x > 0]`
5. **Generators** — Memory-efficient iteration with `yield`
6. **collections.deque** — O(1) operations on both ends for BFS/queues
7. **heapq** — Priority queues and top-k problems
8. **@functools.cache** — Automatic memoization for dynamic programming
9. **enumerate & zip** — Pythonic iteration patterns
10. **Slicing** — `arr[start:end:step]` for subsequences and reversal

### Essential Standard Library Imports

```python
from collections import defaultdict, Counter, deque
from heapq import heappush, heappop, heapify
from functools import cache, lru_cache, reduce
from itertools import permutations, combinations, accumulate
from bisect import bisect_left, bisect_right, insort
import math

# Creating collections
nums = [1, 2, 3]                           # List
seen = {1, 2, 3}                           # Set
freq = {"a": 1, "b": 2}                    # Dict
counts = Counter("aabbc")                   # Counter({'a': 2, 'b': 2, 'c': 1})
graph = defaultdict(list)                   # Auto-initializing dict
queue = deque([1, 2, 3])                   # Double-ended queue

# Useful operations
len(nums)                                   # Length
nums[-1]                                    # Last element
nums[::-1]                                  # Reversed copy
nums[::2]                                   # Every other element

# Comprehension
squares = [x**2 for x in range(10)]
evens = [x for x in nums if x % 2 == 0]
lookup = {x: i for i, x in enumerate(nums)}
```

---

## Quick Start: Your First Algorithm in Python

### Two Sum Implementation

```python
def two_sum(nums: list[int], target: int) -> list[int] | None:
    """Find two indices whose values sum to target."""
    seen: dict[int, int] = {}

    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i

    return None


# Example usage
nums = [2, 7, 11, 15]
target = 9
result = two_sum(nums, target)
print(f"Indices: {result}")  # Indices: [0, 1]
```

**Key Python concepts demonstrated:**
- `list[int]` — Type hints for readability
- `dict[int, int]` — Dictionary for O(1) lookups
- `enumerate()` — Iterate with indices
- `in` operator — O(1) dictionary membership check
- `|` union type — Modern Python 3.10+ syntax
- f-strings — String interpolation

---

## Python vs Other Languages

| Feature | Python | Rust | Go | C++ |
|---------|--------|------|-----|-----|
| Array declaration | `nums = [1,2,3]` | `vec![1,2,3]` | `[]int{1,2,3}` | `vector<int>{1,2,3}` |
| Hash map | `{}` or `dict()` | `HashMap::new()` | `make(map[K]V)` | `unordered_map<K,V>` |
| For loop | `for i in range(n)` | `for i in 0..n` | `for i := 0; i < n; i++` | `for(int i=0; i<n; i++)` |
| Iteration | `for x in arr` | `for x in &arr` | `for _, x := range arr` | `for(auto& x : arr)` |
| Null check | `if x is not None` | `if let Some(x) = opt` | `if x != nil` | `if(x != nullptr)` |
| Error handling | `try/except` | `result?` | `if err != nil` | `try/catch` |
| Memory | Garbage collected | Ownership | Garbage collected | Manual/RAII |
| Typing | Dynamic (optional hints) | Static | Static | Static |

---

## Interview Tips for Python

### 1. Start with the Signature

```python
# Always clarify input/output types first
def solve(nums: list[int], target: int) -> list[int]:
    """Return indices of two numbers that sum to target."""
    pass
```

### 2. Use Pythonic Patterns

```python
# Good: List comprehension
squares = [x**2 for x in nums]

# Good: enumerate for indices
for i, num in enumerate(nums):
    print(f"Index {i}: {num}")

# Good: Dictionary get with default
count = freq.get(key, 0)

# Good: Unpacking
a, b = b, a  # Swap without temp variable

# Good: any/all for boolean checks
if any(x > 10 for x in nums):
    print("Found large number")
```

### 3. Know Your Complexities

```python
# O(1) - Dictionary/set operations
d[key]                    # Get
d[key] = value           # Set
key in d                 # Membership

# O(1) amortized - List append
nums.append(x)

# O(n) - List operations
x in nums                # Membership (use set for O(1))
nums.insert(0, x)        # Insert at front
nums.remove(x)           # Remove first occurrence

# O(log n) - Heap operations
heappush(heap, x)
heappop(heap)

# O(log n) - Binary search
bisect_left(sorted_list, x)

# O(n log n) - Sorting
nums.sort()
sorted(nums)
```

### 4. Handle Edge Cases

```python
def solve(nums: list[int]) -> int:
    # Always check edge cases first
    if not nums:
        return 0
    if len(nums) == 1:
        return nums[0]

    # Main logic...
    return result
```

### 5. Leverage the Standard Library

```python
from collections import Counter, defaultdict, deque
from heapq import heappush, heappop
from functools import cache
from itertools import combinations

# Frequency counting
counts = Counter(nums)

# Auto-initializing dict
graph = defaultdict(list)
graph[u].append(v)

# BFS with deque
queue = deque([start])
while queue:
    node = queue.popleft()

# Memoization for DP
@cache
def dp(i, j):
    return dp(i-1, j) + dp(i, j-1)

# Generate combinations
for combo in combinations(nums, 2):
    print(combo)
```

---

## Practice Problems by Pattern

Start with these problems from the main repository, implementing solutions in Python:

### Foundation (Start Here)
- [E001 Two Sum](../../problems/easy/E001_two_sum.md) — Dictionary lookup
- [E014 Valid Parentheses](../../problems/easy/E014_valid_parentheses.md) — Stack with list

### Two Pointers
- [E006 Container With Most Water](../../problems/easy/E006_container_with_most_water.md)
- Practice with sorted lists, palindrome checking

### Sliding Window
- [M002 Longest Substring](../../problems/medium/M002_longest_substring_without_repeating.md)
- Practice with `defaultdict` for tracking

### Binary Search
- Practice with `bisect_left`, `bisect_right`

### Dynamic Programming
- Practice with `@cache` decorator for memoization

---

## Resources

### Official Documentation
- [Python Tutorial](https://docs.python.org/3/tutorial/) — Official beginner guide
- [Python Standard Library](https://docs.python.org/3/library/) — API reference
- [What's New in Python 3.14](https://docs.python.org/3/whatsnew/3.14.html) — Latest features

### Interactive Learning
- [Python.org Practice](https://www.python.org/about/gettingstarted/) — Getting started
- [Exercism Python Track](https://exercism.org/tracks/python) — Practice problems with mentorship

### Interview Preparation
- [Python Cookbook](https://docs.python.org/3/library/itertools.html#itertools-recipes) — itertools recipes
- [The Algorithms - Python](https://github.com/TheAlgorithms/Python) — Algorithm implementations

---

## Essential Third-Party Packages

While interviews focus on the standard library, these packages are essential in production:

| Category | Package | Purpose |
|----------|---------|---------|
| **Formatting** | [ruff](https://docs.astral.sh/ruff/) | Fast linter and formatter |
| **Testing** | [pytest](https://pytest.org/) | Testing framework |
| **Type Checking** | [mypy](https://mypy.readthedocs.io/) | Static type checker |
| **HTTP** | [httpx](https://www.python-httpx.org/) | Modern HTTP client |
| **Data** | [pydantic](https://docs.pydantic.dev/) | Data validation |
| **Async** | [asyncio](https://docs.python.org/3/library/asyncio.html) | Built-in async (stdlib) |

---

## Spaced Repetition Schedule

Use this schedule to retain Python knowledge:

| Day | Review |
|-----|--------|
| 1 | Write Two Sum from memory |
| 3 | Implement stack operations, explain list vs deque |
| 7 | Write binary search with bisect, explain complexity |
| 14 | Implement BFS with deque, use defaultdict for graph |
| 21 | Code a DP solution with @cache decorator |
| 30 | Timed mock interview in Python |

---

## The Python Mindset

```
"Simple is better than complex."
"Readability counts."
— The Zen of Python
```

Python's design philosophy emphasizes clarity and simplicity:

1. **Write readable code** — Your interviewer should understand your solution at a glance
2. **Use built-ins** — `Counter`, `defaultdict`, `heapq` solve 90% of auxiliary data structure needs
3. **Embrace comprehensions** — They're not just shorter, they're clearer
4. **Prefer explicit** — `enumerate(nums)` over manual index tracking
5. **Know your complexities** — Lists have O(n) insert/search; use sets and dicts for O(1)

---

<p align="center">
<b>Python lets you think about the problem, not the language.</b><br>
Master the standard library, and algorithms become straightforward.
</p>
