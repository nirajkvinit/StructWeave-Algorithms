# Rust Programming Guide

> **The 80/20 Guide**: Master the 20% of Rust that solves 80% of problems

This guide is designed for developers who want to learn Rust quickly, retain knowledge effectively, and prepare for coding interviews. It follows the 80/20 principle—focusing on the essential concepts that give you maximum leverage.

---

## Prerequisites

- **Rust 1.85+** minimum (Rust 2024 Edition)
- **Rust 1.96+** recommended (current stable as of mid-2026)
- `rustup` and `cargo` installed
- Basic programming knowledge

---

## Why Rust for Interviews?

| Advantage | Details |
|-----------|---------|
| **Memory Safety** | No garbage collector, no null pointer exceptions, no data races—guaranteed at compile time |
| **Performance** | Zero-cost abstractions, compiled to native code, competitive with C/C++ |
| **Pattern Matching** | Exhaustive `match` expressions make complex logic clear and bug-free |
| **Error Handling** | `Result` and `Option` types force explicit handling—no forgotten edge cases |
| **Iterators** | Powerful functional-style chains that compile to efficient loops |
| **Type System** | Strong generics with trait bounds catch bugs before runtime |

---

## Learning Path (5-Week Plan)

```
Week 1: Foundations
├── Day 1-2: Syntax & Types (01-syntax-quick-reference.md)
├── Day 3-4: Ownership & Borrowing (02-ownership-borrowing.md)
└── Day 5-7: Practice easy problems in Rust

Week 2: Data Structures
├── Day 1-2: Collections & Custom Types (03-data-structures.md)
├── Day 3-4: Interview Patterns Part 1 (04-interview-patterns.md)
└── Day 5-7: Practice medium problems

Week 3: Patterns & Idioms
├── Day 1-2: Interview Patterns Part 2 (04-interview-patterns.md)
├── Day 3-4: Rust Idioms & Error Handling (05-idioms-best-practices.md)
└── Day 5-7: Practice hard problems

Week 4: Advanced & Interview Simulation
├── Day 1-2: Concurrency & Parallelism (06-concurrency.md)
├── Day 3: Tooling & Workflow (07-tooling-workflow.md)
├── Day 4-5: Timed problem solving
└── Day 6-7: Mock interviews

Week 5: Design Patterns & Interview Mastery
├── Day 1: SOLID Principles (08-solid-principles.md)
├── Day 2-3: Design Patterns (09, 10, 11-design-patterns-*.md)
├── Day 4: Anti-Patterns & Best Practices (12-anti-patterns-best-practices.md)
├── Day 5-6: Interview Trap Questions (13-interview-trap-questions.md)
└── Day 7: Final review and mock interviews

Week 6: Advanced Topics
├── Day 1-2: Macros (14-macros.md)
├── Day 3-4: Unsafe Rust & FFI (15-unsafe-ffi.md)
├── Day 5: WebAssembly (16-webassembly.md)
└── Day 6-7: Review and specialized practice
```

---

## Guide Contents

| File | Focus | Time |
|------|-------|------|
| [01-syntax-quick-reference.md](01-syntax-quick-reference.md) | Essential syntax, types, pattern matching | 45 min |
| [02-ownership-borrowing.md](02-ownership-borrowing.md) | Ownership, borrowing, lifetimes—Rust's core | 90 min |
| [03-data-structures.md](03-data-structures.md) | Vec, HashMap, BinaryHeap, custom types | 60 min |
| [04-interview-patterns.md](04-interview-patterns.md) | 17 algorithm patterns in idiomatic Rust | 120 min |
| [05-idioms-best-practices.md](05-idioms-best-practices.md) | Error handling, traits, iterators, testing | 45 min |
| [06-concurrency.md](06-concurrency.md) | Threads, channels, async, Rayon parallelism | 60 min |
| [07-tooling-workflow.md](07-tooling-workflow.md) | Cargo, Clippy, rustfmt, CI/CD | 30 min |
| [08-solid-principles.md](08-solid-principles.md) | SOLID principles adapted for Rust | 45 min |
| [09-design-patterns-creational.md](09-design-patterns-creational.md) | Builder, Factory, Singleton, Prototype | 45 min |
| [10-design-patterns-structural.md](10-design-patterns-structural.md) | Adapter, Decorator, Facade, Composite, Proxy | 45 min |
| [11-design-patterns-behavioral.md](11-design-patterns-behavioral.md) | Strategy, Observer, State, Command, Iterator | 60 min |
| [12-anti-patterns-best-practices.md](12-anti-patterns-best-practices.md) | Common pitfalls and idiomatic practices | 45 min |
| [13-interview-trap-questions.md](13-interview-trap-questions.md) | Tricky interview questions with deep explanations | 75 min |
| [14-macros.md](14-macros.md) | Declarative and procedural macros, metaprogramming | 60 min |
| [15-unsafe-ffi.md](15-unsafe-ffi.md) | Unsafe Rust, FFI, interfacing with C | 75 min |
| [16-webassembly.md](16-webassembly.md) | WebAssembly, WASI, Component Model | 45 min |

---

## The 80/20 of Rust

### 20% of Concepts That Matter Most

1. **Ownership** — Every value has exactly one owner; memory freed when owner goes out of scope
2. **Borrowing** — References (`&T`, `&mut T`) allow access without ownership transfer
3. **Vec<T>** — The dynamic array, your workhorse for algorithms
4. **HashMap<K, V>** — O(1) lookups, complement searching, counting
5. **Pattern Matching** — `match`, `if let`, destructuring for clean logic
6. **Result & Option** — Error and null handling without exceptions
7. **Iterators** — `map`, `filter`, `fold`, `collect` for functional transformations
8. **Traits** — Shared behavior, like interfaces but more powerful
9. **Enums** — Algebraic data types for state machines and variants
10. **Lifetimes** — `'a` annotations when the compiler needs help with references

### Essential Standard Library

```rust
use std::collections::{HashMap, HashSet, VecDeque, BinaryHeap, BTreeMap};
use std::cmp::{min, max, Ordering, Reverse};
use std::iter::FromIterator;

// Creating collections
let v: Vec<i32> = vec![1, 2, 3];
let map: HashMap<&str, i32> = HashMap::new();
let set: HashSet<i32> = HashSet::new();

// Useful methods
v.len()                    // Length
v.is_empty()               // Check empty
v.iter()                   // Iterator over &T
v.into_iter()              // Iterator over T (consumes)
v.iter_mut()               // Iterator over &mut T

// Iterator chains
nums.iter()
    .filter(|&x| x % 2 == 0)
    .map(|x| x * 2)
    .collect::<Vec<_>>()
```

---

## Quick Start: Your First Algorithm in Rust

### Two Sum Implementation

```rust
use std::collections::HashMap;

fn two_sum(nums: &[i32], target: i32) -> Option<(usize, usize)> {
    let mut seen: HashMap<i32, usize> = HashMap::new();

    for (i, &num) in nums.iter().enumerate() {
        let complement = target - num;
        if let Some(&j) = seen.get(&complement) {
            return Some((j, i));
        }
        seen.insert(num, i);
    }
    None
}

fn main() {
    let nums = vec![2, 7, 11, 15];
    let target = 9;

    match two_sum(&nums, target) {
        Some((i, j)) => println!("Indices: {}, {}", i, j),
        None => println!("No solution found"),
    }
}
```

**Key Rust concepts demonstrated:**
- `&[i32]` — Slice reference (borrows the data)
- `HashMap::new()` — Creating a hash map
- `.iter().enumerate()` — Iterate with indices
- `if let Some(&j)` — Pattern matching with destructuring
- `Option<(usize, usize)>` — Explicit null handling
- `match` expression — Exhaustive pattern matching

---

## Rust vs Other Languages

| Feature | Rust | Python | Go | C++ |
|---------|------|--------|-----|-----|
| Array declaration | `let nums = vec![1,2,3];` | `nums = [1,2,3]` | `nums := []int{1,2,3}` | `vector<int> nums = {1,2,3};` |
| Hash map | `HashMap::new()` | `{}` | `make(map[K]V)` | `unordered_map<K,V>` |
| For loop | `for i in 0..n` | `for i in range(n)` | `for i := 0; i < n; i++` | `for(int i=0; i<n; i++)` |
| Iteration | `for x in &arr` | `for x in arr` | `for _, x := range arr` | `for(auto& x : arr)` |
| Null check | `if let Some(x) = opt` | `if x is not None` | `if x != nil` | `if(x != nullptr)` |
| Error handling | `result?` | `try/except` | `if err != nil` | `try/catch` |
| Memory | Ownership | GC | GC | Manual/RAII |

---

## Interview Tips for Rust

### 1. Start with the Signature

```rust
// Always clarify input/output types first
fn solve(nums: &[i32], target: i32) -> Vec<i32> {
    // Implementation
    vec![]
}
```

### 2. Use Idiomatic Rust

```rust
// Good: Iterator chains
let sum: i32 = nums.iter().filter(|&&x| x > 0).sum();

// Good: Pattern matching
match result {
    Ok(value) => process(value),
    Err(e) => handle_error(e),
}

// Good: Option chaining
let result = map.get(&key)?.checked_add(1)?;
```

### 3. Know Your Complexities

```rust
// O(1) - HashMap operations
map.get(&key);
map.insert(key, value);
map.contains_key(&key);

// O(1) amortized - Vec push
vec.push(element);

// O(n) - Vec contains/search
vec.contains(&target);
vec.iter().position(|&x| x == target);

// O(log n) - BinaryHeap, BTreeMap
heap.push(value);
btree.get(&key);

// O(log n) - Binary search (sorted slice)
slice.binary_search(&target);

// O(n log n) - Sorting
vec.sort();
vec.sort_by(|a, b| a.cmp(b));
```

### 4. Handle Edge Cases

```rust
fn solve(nums: &[i32]) -> i32 {
    // Always check edge cases first
    if nums.is_empty() {
        return 0;
    }
    if nums.len() == 1 {
        return nums[0];
    }
    // Main logic...
    0
}
```

### 5. Ownership-Aware Patterns

```rust
// When you need to modify while iterating: indices
for i in 0..nums.len() {
    // Can modify nums[i]
}

// When building a result: collect
let result: Vec<_> = nums.iter().map(|x| x * 2).collect();

// When you need ownership: into_iter or clone
let owned: Vec<i32> = borrowed.to_vec();
```

---

## Practice Problems by Pattern

Start with these problems from the main repository, implementing solutions in Rust:

### Foundation (Start Here)
- [E001 Two Sum](../../problems/easy/E001_two_sum.md) — HashMap lookup
- [E014 Valid Parentheses](../../problems/easy/E014_valid_parentheses.md) — Stack with Vec

### Two Pointers
- [E006 Container With Most Water](../../problems/easy/E006_container_with_most_water.md)
- Practice with sorted slices, palindrome checking

### Sliding Window
- [M002 Longest Substring](../../problems/medium/M002_longest_substring_without_repeating.md)
- Practice with HashMap for tracking characters

### Binary Search
- Practice with `.binary_search()` and custom comparators

### Dynamic Programming
- Practice with 2D vectors (`Vec<Vec<i32>>`)

---

## Resources

### Official Documentation
- [The Rust Book](https://doc.rust-lang.org/book/) — Comprehensive official guide
- [Rust by Example](https://doc.rust-lang.org/rust-by-example/) — Learn by annotated examples
- [Standard Library Docs](https://doc.rust-lang.org/std/) — API reference

### Interactive Learning
- [Rustlings](https://github.com/rust-lang/rustlings) — Small exercises to learn Rust
- [Exercism Rust Track](https://exercism.org/tracks/rust) — Practice problems with mentorship

### Interview Preparation

- [Rust Cookbook](https://rust-lang-nursery.github.io/rust-cookbook/) — Common tasks and patterns
- [Algorithms in Rust](https://github.com/TheAlgorithms/Rust) — Algorithm implementations

---

## Essential Ecosystem Crates

These are the must-know crates in the Rust ecosystem (2025):

### Core Libraries

| Category | Crate | Purpose |
|----------|-------|---------|
| **Async** | [tokio](https://tokio.rs/) | Async runtime (industry standard) |
| **Serialization** | [serde](https://serde.rs/) | Serialization framework |
| **JSON** | [serde_json](https://docs.rs/serde_json) | JSON parsing/generation |
| **Error (lib)** | [thiserror](https://docs.rs/thiserror) | Derive Error for libraries |
| **Error (app)** | [anyhow](https://docs.rs/anyhow) | Error handling for apps |
| **Parallelism** | [rayon](https://docs.rs/rayon) | Data parallelism |
| **Logging** | [tracing](https://docs.rs/tracing) | Structured logging |

### Web & Network

| Category | Crate | Purpose |
|----------|-------|---------|
| **Web Framework** | [axum](https://docs.rs/axum) | Web framework (Tokio) |
| **HTTP Client** | [reqwest](https://docs.rs/reqwest) | HTTP client |
| **gRPC** | [tonic](https://docs.rs/tonic) | gRPC framework |

### Database & CLI

| Category | Crate | Purpose |
|----------|-------|---------|
| **SQL** | [sqlx](https://docs.rs/sqlx) | Async SQL toolkit |
| **CLI** | [clap](https://docs.rs/clap) | Command-line parsing |

### Testing

| Category | Crate | Purpose |
|----------|-------|---------|
| **Property Testing** | [proptest](https://docs.rs/proptest) | Property-based testing |
| **Mocking** | [mockall](https://docs.rs/mockall) | Mocking framework |
| **Benchmarking** | [criterion](https://docs.rs/criterion) | Statistical benchmarks |

---

## Spaced Repetition Schedule

Use this schedule to retain Rust knowledge:

| Day | Review |
|-----|--------|
| 1 | Write Two Sum from memory |
| 3 | Implement stack with Vec, explain ownership |
| 7 | Write binary search, explain borrowing |
| 14 | Implement graph BFS with ownership handling |
| 21 | Code a DP solution with 2D Vec |
| 30 | Timed mock interview in Rust |

---

## The Rust Mindset

```
"If it compiles, it works."
```

Rust's strict compiler catches bugs at compile time that would be runtime errors in other languages. Embrace the compiler as your pair programmer:

1. **Read error messages carefully** — Rust's errors are famously helpful
2. **Trust the borrow checker** — It's protecting you from data races and dangling pointers
3. **Prefer iterators** — They're zero-cost abstractions that often compile to the same code as manual loops
4. **Use `clippy`** — `cargo clippy` catches common mistakes and suggests improvements

---

<p align="center">
<b>Rust is hard to learn but easy to use correctly.</b><br>
Master ownership, and everything else follows.
</p>
