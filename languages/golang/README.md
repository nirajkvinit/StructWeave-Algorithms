# Go (Golang) Programming Guide

> **The 80/20 Guide**: Master the 20% of Go that solves 80% of problems

This guide is designed for developers who want to learn Go quickly, retain knowledge effectively, and prepare for coding interviews. It follows the 80/20 principle—focusing on the essential concepts that give you maximum leverage.

---

## Prerequisites

- **Go 1.21+** minimum (for `slices`, `maps`, `cmp` packages)
- **Go 1.25+** recommended (for `WaitGroup.Go()`, container-aware runtime)
- Basic programming knowledge

---

## Why Go for Interviews?

| Advantage | Details |
|-----------|---------|
| **Simplicity** | Small language spec (~50 keywords), easy to write clean code under pressure |
| **Performance** | Compiled to native code, competitive with C/C++ in many scenarios |
| **Concurrency** | First-class goroutines and channels—interviewers love concurrency questions |
| **Generics** | Type-safe, reusable code with `slices`, `maps`, `cmp` packages (Go 1.18+) |
| **Standard Library** | Rich built-in packages (`sort`, `slices`, `maps`, `container/heap`) |
| **Readable** | No inheritance, explicit error handling, clear control flow |

---

## Learning Path (5-Week Plan)

```
Week 1: Foundations
├── Day 1-2: Syntax & Types (01-syntax-quick-reference.md)
├── Day 3-4: Data Structures (02-data-structures.md)
└── Day 5-7: Practice easy problems in Go

Week 2: Core Patterns
├── Day 1-2: Generics & Utility Functions (06-generics.md)
├── Day 3-4: Interview Patterns (04-interview-patterns.md)
├── Day 5: Concurrency Basics (03-concurrency-patterns.md)
└── Day 6-7: Practice medium problems

Week 3: Advanced Topics
├── Day 1-2: Advanced Concurrency (WaitGroup.Go, synctest)
├── Day 3-4: Go Idioms & Tooling (05-idioms-best-practices.md)
├── Day 5: Trap Questions (07-trap-questions.md)
└── Day 6-7: Practice hard problems

Week 4: Design Patterns & Principles
├── Day 1: SOLID Principles (08-solid-principles.md)
├── Day 2-3: Creational Patterns (09-design-patterns-creational.md)
├── Day 4: Structural Patterns (10-design-patterns-structural.md)
├── Day 5-6: Behavioral Patterns (11-design-patterns-behavioral.md)
└── Day 7: Anti-Patterns (12-anti-patterns.md)

Week 5: System Design & Interview
├── Day 1-2: System Design & Architecture (13-system-design.md)
├── Day 3-4: Timed problem solving
├── Day 5-6: System design practice
└── Day 7: Mock interviews
```

---

## Guide Contents

| File | Focus | Time |
|------|-------|------|
| [01-syntax-quick-reference.md](01-syntax-quick-reference.md) | Essential syntax, types, control flow, generics basics | 45 min |
| [02-data-structures.md](02-data-structures.md) | Slices, maps, structs, `slices`/`maps` packages | 60 min |
| [03-concurrency-patterns.md](03-concurrency-patterns.md) | Goroutines, channels, `WaitGroup.Go()` (Go 1.25+) | 90 min |
| [04-interview-patterns.md](04-interview-patterns.md) | Algorithm patterns with generic utilities | 120 min |
| [05-idioms-best-practices.md](05-idioms-best-practices.md) | Go idioms, `log/slog`, fuzz testing, tooling | 45 min |
| [06-generics.md](06-generics.md) | Type parameters, constraints, generic patterns | 60 min |
| [07-trap-questions.md](07-trap-questions.md) | Interview gotchas, edge cases, language quirks | 60-90 min |
| [08-solid-principles.md](08-solid-principles.md) | SOLID principles adapted for Go | 60-75 min |
| [09-design-patterns-creational.md](09-design-patterns-creational.md) | Singleton, Factory, Builder, Object Pool, Functional Options | 60-75 min |
| [10-design-patterns-structural.md](10-design-patterns-structural.md) | Adapter, Decorator, Facade, Proxy, Composite | 50-60 min |
| [11-design-patterns-behavioral.md](11-design-patterns-behavioral.md) | Strategy, Observer, State, Command, Iterator | 75-90 min |
| [12-anti-patterns.md](12-anti-patterns.md) | Anti-patterns, code smells, detection tools | 75-90 min |
| [13-system-design.md](13-system-design.md) | Project layout, Clean/Hexagonal architecture, DDD | 90-100 min |

---

## The 80/20 of Go

### 20% of Concepts That Matter Most

1. **Slices** — Dynamic arrays, the workhorse of Go algorithms
2. **Maps** — O(1) lookups, complement searching, counting
3. **Structs** — Custom types, method receivers
4. **Interfaces** — Implicit implementation, polymorphism
5. **Generics** — Type parameters, `slices`/`maps`/`cmp` packages
6. **Error Handling** — `if err != nil` pattern
7. **Goroutines & Channels** — Lightweight concurrency
8. **Pointers** — When to use `*` and `&`
9. **The `range` Keyword** — Iterating over slices, maps, channels, iterators
10. **Defer** — Cleanup operations, stack-based execution

### Built-in Functions You Must Know

```go
// Length and capacity
len(slice)    // Number of elements
cap(slice)    // Underlying array capacity

// Creating data structures
make([]int, length, capacity)  // Slices
make(map[K]V)                  // Maps
make(chan T, bufferSize)       // Channels

// Modifying slices
append(slice, elements...)     // Add elements
copy(dst, src)                 // Copy elements

// Type assertions
value, ok := x.(Type)          // Safe type assertion

// Panic and recover
panic("error message")         // Crash the program
recover()                      // Catch panics (in defer)
```

### Standard Library Essentials

```go
import (
    "fmt"            // Printing, formatting
    "slices"         // Generic slice operations (Go 1.21+)
    "maps"           // Generic map operations (Go 1.21+)
    "cmp"            // Comparison utilities (Go 1.21+)
    "sort"           // Sorting (legacy, use slices for new code)
    "strings"        // String manipulation
    "strconv"        // String ↔ number conversion
    "math"           // Math operations
    "container/heap" // Priority queues
    "log/slog"       // Structured logging (Go 1.21+)
)
```

---

## Quick Start: Your First Algorithm in Go

### Two Sum Implementation

```go
package main

import "fmt"

func twoSum(nums []int, target int) []int {
    seen := make(map[int]int) // value → index

    for i, num := range nums {
        complement := target - num
        if j, exists := seen[complement]; exists {
            return []int{j, i}
        }
        seen[num] = i
    }
    return nil
}

func main() {
    nums := []int{2, 7, 11, 15}
    target := 9
    result := twoSum(nums, target)
    fmt.Println(result) // [0 1]
}
```

**Key Go concepts demonstrated:**
- `make()` to create a map
- `range` to iterate with index and value
- Map lookup with comma-ok idiom (`j, exists := seen[complement]`)
- Multiple return values
- Slice literals (`[]int{j, i}`)

---

## Go vs Other Languages

| Feature | Go | Python | Java |
|---------|-----|--------|------|
| Array declaration | `nums := []int{1,2,3}` | `nums = [1,2,3]` | `int[] nums = {1,2,3}` |
| Hash map | `m := make(map[K]V)` | `m = {}` | `Map<K,V> m = new HashMap<>()` |
| For loop | `for i := 0; i < n; i++` | `for i in range(n)` | `for(int i=0; i<n; i++)` |
| Range iteration | `for i, v := range arr` | `for i, v in enumerate(arr)` | `for(int v : arr)` |
| Null check | `if x == nil` | `if x is None` | `if(x == null)` |
| Error handling | `if err != nil` | `try/except` | `try/catch` |
| Concurrency | `go func()` | `threading/asyncio` | `Thread/ExecutorService` |

---

## Interview Tips for Go

### 1. Start with the Signature

```go
// Always clarify input/output types first
func solve(nums []int, target int) []int {
    // Implementation
}
```

### 2. Use Idiomatic Go

```go
// Good: Multiple return with error
func divide(a, b int) (int, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}

// Good: Named return values for clarity
func minMax(nums []int) (min, max int) {
    min, max = nums[0], nums[0]
    for _, n := range nums[1:] {
        if n < min { min = n }
        if n > max { max = n }
    }
    return // naked return
}
```

### 3. Know Your Complexities

```go
// O(1) - Map lookup
value, exists := m[key]

// O(1) amortized - Slice append
slice = append(slice, element)

// O(n) - Slice contains
slices.Contains(nums, target)  // Go 1.21+

// O(log n) - Binary search (sorted slice)
idx, found := slices.BinarySearch(nums, target)

// O(n log n) - Sorting
slices.Sort(nums)              // Go 1.21+ (preferred)
slices.SortFunc(items, func(a, b Item) int {
    return cmp.Compare(a.Value, b.Value)
})
```

### 4. Handle Edge Cases

```go
func solve(nums []int) int {
    // Always check edge cases first
    if len(nums) == 0 {
        return 0
    }
    if len(nums) == 1 {
        return nums[0]
    }
    // Main logic...
}
```

---

## Practice Problems by Pattern

Start with these problems from the main repository, implementing solutions in Go:

### Foundation (Start Here)
- [E001 Two Sum](../../problems/easy/E001_two_sum.md) — Hash map lookup
- [E014 Valid Parentheses](../../problems/easy/E014_valid_parentheses.md) — Stack operations

### Two Pointers
- [E006 Container With Most Water](../../problems/easy/E006_container_with_most_water.md)
- Practice with sorted arrays, palindrome checking

### Sliding Window
- [M002 Longest Substring](../../problems/medium/M002_longest_substring_without_repeating.md)
- Practice with maps for tracking characters

### Binary Search
- Practice with `sort.Search()` function

### Dynamic Programming
- Practice with 2D slices (`[][]int`)

---

## Resources

### Official Documentation
- [Effective Go](https://go.dev/doc/effective_go) — Official style guide
- [Go by Example](https://gobyexample.com/) — Learn by annotated examples
- [Go Standard Library](https://pkg.go.dev/std) — Package documentation

### Interview Preparation
- [TheAlgorithms/Go](https://github.com/TheAlgorithms/Go) — Algorithm implementations
- [go-dsa](https://github.com/spring1843/go-dsa) — Data structures and algorithms

### Concurrency Deep Dives
- [Go Concurrency Patterns](https://go.dev/blog/pipelines) — Official blog
- [Practical Concurrency Guide](https://github.com/luk4z7/go-concurrency-guide)

---

## Spaced Repetition Schedule

Use this schedule to retain Go knowledge:

| Day | Review |
|-----|--------|
| 1 | Write Two Sum from memory |
| 3 | Implement stack with slice |
| 7 | Write binary search variations |
| 14 | Implement producer-consumer with channels |
| 21 | Code a complete graph algorithm |
| 30 | Timed mock interview in Go |

---

<p align="center">
<b>Go is simple by design.</b><br>
Master the fundamentals, and the language gets out of your way.
</p>
