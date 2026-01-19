# Rust Standard Library Essentials

> Master the modules that power production Rust applications — from collections to concurrency

The Rust standard library is compact yet powerful. Unlike languages with massive standard libraries, Rust's `std` focuses on foundational abstractions that are correct, performant, and composable. This guide covers the modules you'll use most frequently in production code and interviews.

**Reading time**: 90-120 minutes

---

## Table of Contents

- [Rust Standard Library Essentials](#rust-standard-library-essentials)
  - [Table of Contents](#table-of-contents)
  - [Philosophy: Zero-Cost Abstractions](#philosophy-zero-cost-abstractions)
    - [When to Use std vs External Crates](#when-to-use-std-vs-external-crates)
  - [Collections (std::collections)](#collections-stdcollections)
    - [Vec\<T\> — The Workhorse](#vect--the-workhorse)
      - [Creation Patterns](#creation-patterns)
      - [Essential Methods](#essential-methods)
      - [Iteration Patterns](#iteration-patterns)
      - [Memory Control](#memory-control)
    - [HashMap\<K, V\> and HashSet\<T\>](#hashmapk-v-and-hashsett)
      - [The Entry API — Your Secret Weapon](#the-entry-api--your-secret-weapon)
      - [HashSet for Uniqueness](#hashset-for-uniqueness)
    - [BTreeMap\<K, V\> and BTreeSet\<T\>](#btreemapk-v-and-btreesett)
    - [VecDeque\<T\> — Double-Ended Queue](#vecdequet--double-ended-queue)
    - [BinaryHeap\<T\> — Priority Queue](#binaryheapt--priority-queue)
      - [Min-Heap Pattern](#min-heap-pattern)
      - [Custom Priority](#custom-priority)
    - [LinkedList\<T\> — Rarely Used](#linkedlistt--rarely-used)
    - [Collections Decision Tree](#collections-decision-tree)
  - [Iterators (std::iter)](#iterators-stditer)
    - [The Iterator Trait](#the-iterator-trait)
    - [Essential Adapters](#essential-adapters)
      - [Transformation](#transformation)
      - [Filtering](#filtering)
      - [Taking and Skipping](#taking-and-skipping)
      - [Combination](#combination)
      - [Inspection](#inspection)
    - [Consumers (Terminal Operations)](#consumers-terminal-operations)
      - [Aggregation](#aggregation)
      - [Searching](#searching)
      - [Collection](#collection)
    - [FromIterator and collect()](#fromiterator-and-collect)
    - [Iterator Ownership: iter() vs iter\_mut() vs into\_iter()](#iterator-ownership-iter-vs-iter_mut-vs-into_iter)
  - [I/O (std::io)](#io-stdio)
    - [The Read and Write Traits](#the-read-and-write-traits)
    - [BufReader and BufWriter](#bufreader-and-bufwriter)
    - [Standard Streams](#standard-streams)
    - [Cursor for Testing](#cursor-for-testing)
  - [File System (std::fs)](#file-system-stdfs)
    - [Basic File Operations](#basic-file-operations)
    - [OpenOptions for Fine Control](#openoptions-for-fine-control)
    - [Directory Operations](#directory-operations)
    - [Metadata](#metadata)
  - [Paths (std::path)](#paths-stdpath)
    - [Path vs PathBuf](#path-vs-pathbuf)
    - [Path Manipulation](#path-manipulation)
    - [Generic Path Functions](#generic-path-functions)
  - [Environment (std::env)](#environment-stdenv)
    - [Environment Variables](#environment-variables)
    - [Process Information](#process-information)
  - [Time (std::time)](#time-stdtime)
    - [Instant — Monotonic Clock](#instant--monotonic-clock)
    - [SystemTime — Wall Clock](#systemtime--wall-clock)
    - [Duration](#duration)
  - [Synchronization (std::sync)](#synchronization-stdsync)
    - [Arc\<T\> — Atomic Reference Counting](#arct--atomic-reference-counting)
    - [Mutex\<T\> — Mutual Exclusion](#mutext--mutual-exclusion)
    - [RwLock\<T\> — Reader-Writer Lock](#rwlockt--reader-writer-lock)
    - [Channels (mpsc)](#channels-mpsc)
    - [Atomic Types](#atomic-types)
    - [Once and OnceLock](#once-and-oncelock)
  - [Formatting (std::fmt)](#formatting-stdfmt)
    - [Display vs Debug](#display-vs-debug)
    - [Format Specifiers](#format-specifiers)
    - [Implementing Display](#implementing-display)
  - [Conversions (std::convert)](#conversions-stdconvert)
    - [From and Into](#from-and-into)
    - [TryFrom and TryInto](#tryfrom-and-tryinto)
    - [AsRef and AsMut](#asref-and-asmut)
  - [Strings (std::str and std::string)](#strings-stdstr-and-stdstring)
    - [String vs \&str](#string-vs-str)
    - [String Operations](#string-operations)
    - [Parsing with FromStr](#parsing-with-fromstr)
  - [Quick Reference Cards](#quick-reference-cards)
    - [Collections Methods Summary](#collections-methods-summary)
    - [Iterator Adapters Quick Reference](#iterator-adapters-quick-reference)
    - [Format Specifiers Cheat Sheet](#format-specifiers-cheat-sheet)
  - [Interview Questions](#interview-questions)
  - [Resources](#resources)

---

## Philosophy: Zero-Cost Abstractions

Rust's standard library follows a core principle: **you don't pay for what you don't use**. Abstractions like iterators and trait objects compile down to code as efficient as hand-written loops.

```rust
// These compile to nearly identical assembly
let sum: i32 = (0..1000).filter(|x| x % 2 == 0).sum();

let mut sum = 0;
for x in 0..1000 {
    if x % 2 == 0 {
        sum += x;
    }
}
```

### When to Use std vs External Crates

| Category | std | External Crate | When to Switch |
|----------|-----|----------------|----------------|
| **HashMap** | `std::collections::HashMap` | `hashbrown` | Rarely needed; std uses hashbrown internally since Rust 1.36 |
| **Mutex** | `std::sync::Mutex` | `parking_lot` | High contention, need try_lock_for timeout |
| **Async** | — | `tokio`, `async-std` | Any async I/O (std has no async runtime) |
| **Serialization** | — | `serde` | Any serialization needs |
| **Error Handling** | `std::error::Error` | `thiserror`, `anyhow` | Custom errors (lib) or error context (app) |
| **Random** | — | `rand` | Any randomness (std has no random) |
| **Regex** | — | `regex` | Pattern matching beyond simple contains/starts_with |

**Rule of thumb**: Start with std, add crates when you hit limitations.

---

## Collections (std::collections)

> "You should probably just use `Vec` or `HashMap`. These two collections cover most use cases for generic data storage and processing."
> — Rust Documentation

### Vec\<T\> — The Workhorse

`Vec<T>` is Rust's dynamic array. It's your go-to for sequential data, stacks, and building results.

#### Creation Patterns

```rust
// Empty vector with type annotation
let v: Vec<i32> = Vec::new();

// Using the vec! macro (most common)
let v = vec![1, 2, 3];

// With pre-allocated capacity (optimization for known sizes)
let mut v: Vec<i32> = Vec::with_capacity(100);

// From an iterator
let v: Vec<i32> = (0..10).collect();

// From another collection
let v: Vec<i32> = [1, 2, 3].into();

// Filled with a value
let v = vec![0; 100];  // 100 zeros
```

#### Essential Methods

```rust
let mut v = vec![1, 2, 3, 4, 5];

// Adding elements
v.push(6);                    // Add to end: [1, 2, 3, 4, 5, 6]
v.insert(0, 0);               // Insert at index: [0, 1, 2, 3, 4, 5, 6]
v.extend([7, 8, 9]);          // Append multiple: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

// Removing elements
let last = v.pop();           // Remove from end: Some(9)
let at_index = v.remove(0);   // Remove at index (O(n)): 0
let swapped = v.swap_remove(0); // Swap with last, remove (O(1)): 1

// Filtering in-place
v.retain(|&x| x % 2 == 0);    // Keep only evens: [2, 4, 6, 8]

// Draining (removes and returns iterator)
let drained: Vec<_> = v.drain(0..2).collect(); // drained: [2, 4], v: [6, 8]

// Access
let first = v.first();        // Option<&T>
let last = v.last();          // Option<&T>
let slice = &v[1..3];         // Slice (panics if out of bounds)
let safe = v.get(100);        // Option<&T> (returns None if out of bounds)
```

#### Iteration Patterns

```rust
let v = vec![1, 2, 3];

// Immutable iteration (borrow)
for x in &v {
    println!("{}", x);        // x is &i32
}

// Mutable iteration (mutable borrow)
let mut v = vec![1, 2, 3];
for x in &mut v {
    *x *= 2;                  // x is &mut i32
}

// Consuming iteration (takes ownership)
for x in v {
    println!("{}", x);        // x is i32, v is gone after loop
}

// With indices
for (i, x) in v.iter().enumerate() {
    println!("{}: {}", i, x);
}

// Chunks and windows
let v = vec![1, 2, 3, 4, 5];
for chunk in v.chunks(2) {    // [1,2], [3,4], [5]
    println!("{:?}", chunk);
}
for window in v.windows(3) {  // [1,2,3], [2,3,4], [3,4,5]
    println!("{:?}", window);
}
```

#### Memory Control

```rust
let mut v = Vec::with_capacity(100);
println!("Capacity: {}", v.capacity());  // 100
println!("Length: {}", v.len());         // 0

v.extend(0..50);
println!("Capacity: {}", v.capacity());  // Still 100
println!("Length: {}", v.len());         // 50

v.shrink_to_fit();                       // Reduce capacity to match length
println!("Capacity: {}", v.capacity());  // ~50

v.reserve(100);                          // Ensure at least 100 more slots
```

---

### HashMap\<K, V\> and HashSet\<T\>

`HashMap` provides O(1) average-case lookup, insertion, and removal.

```rust
use std::collections::HashMap;

// Creation
let mut scores: HashMap<String, i32> = HashMap::new();
let scores: HashMap<_, _> = vec![("Alice", 100), ("Bob", 85)].into_iter().collect();

// Basic operations
scores.insert("Charlie".to_string(), 92);
let alice_score = scores.get("Alice");           // Option<&i32>
let exists = scores.contains_key("Alice");       // bool
scores.remove("Bob");

// Iteration
for (name, score) in &scores {
    println!("{}: {}", name, score);
}

// Keys and values separately
let names: Vec<_> = scores.keys().collect();
let all_scores: Vec<_> = scores.values().collect();
```

#### The Entry API — Your Secret Weapon

The Entry API is essential for efficient insert-or-update patterns:

```rust
use std::collections::HashMap;

let mut word_counts: HashMap<&str, i32> = HashMap::new();
let text = "hello world hello rust world world";

// Pattern 1: Counting (most common)
for word in text.split_whitespace() {
    *word_counts.entry(word).or_insert(0) += 1;
}
// {"hello": 2, "world": 3, "rust": 1}

// Pattern 2: Insert default if missing
let mut cache: HashMap<i32, Vec<i32>> = HashMap::new();
cache.entry(1).or_insert_with(Vec::new).push(10);
cache.entry(1).or_insert_with(Vec::new).push(20);
// {1: [10, 20]}

// Pattern 3: Insert or modify
let mut scores: HashMap<&str, i32> = HashMap::new();
scores.entry("Alice")
    .and_modify(|s| *s += 10)
    .or_insert(100);
// Alice gets 100 (new), or existing score + 10

// Pattern 4: Get or compute
let mut computed: HashMap<i32, i32> = HashMap::new();
let value = computed.entry(5).or_insert_with(|| {
    // Expensive computation only runs if key is missing
    5 * 5
});
```

#### HashSet for Uniqueness

```rust
use std::collections::HashSet;

let mut set: HashSet<i32> = HashSet::new();
set.insert(1);
set.insert(2);
set.insert(1);  // No effect, already present
println!("{:?}", set);  // {1, 2}

// From iterator (deduplication)
let v = vec![1, 2, 2, 3, 3, 3];
let unique: HashSet<_> = v.into_iter().collect();

// Set operations
let a: HashSet<_> = [1, 2, 3].into();
let b: HashSet<_> = [2, 3, 4].into();

let union: HashSet<_> = a.union(&b).cloned().collect();        // {1, 2, 3, 4}
let intersection: HashSet<_> = a.intersection(&b).cloned().collect(); // {2, 3}
let difference: HashSet<_> = a.difference(&b).cloned().collect();     // {1}
let symmetric: HashSet<_> = a.symmetric_difference(&b).cloned().collect(); // {1, 4}

// Membership
let contains = a.contains(&2);      // true
let is_subset = a.is_subset(&b);    // false
let is_disjoint = a.is_disjoint(&b); // false
```

---

### BTreeMap\<K, V\> and BTreeSet\<T\>

Use when you need **sorted keys** or **range queries**. O(log n) operations.

```rust
use std::collections::BTreeMap;

let mut map: BTreeMap<i32, &str> = BTreeMap::new();
map.insert(3, "three");
map.insert(1, "one");
map.insert(2, "two");

// Iteration is always sorted by key
for (k, v) in &map {
    println!("{}: {}", k, v);  // 1: one, 2: two, 3: three
}

// Range queries
for (k, v) in map.range(1..=2) {
    println!("{}: {}", k, v);  // 1: one, 2: two
}

// First and last
let first = map.first_key_value();  // Some((&1, &"one"))
let last = map.last_key_value();    // Some((&3, &"three"))

// Pop from ends
let first = map.pop_first();        // Some((1, "one"))
let last = map.pop_last();          // Some((3, "three"))
```

**When to use BTreeMap over HashMap:**
- You need keys in sorted order
- You need range queries (`range()`)
- You need first/last element access
- You need deterministic iteration order

---

### VecDeque\<T\> — Double-Ended Queue

Efficient O(1) push/pop at both ends. Perfect for BFS, sliding windows with both-end access.

```rust
use std::collections::VecDeque;

let mut deque: VecDeque<i32> = VecDeque::new();

// Add to both ends
deque.push_back(2);      // [2]
deque.push_back(3);      // [2, 3]
deque.push_front(1);     // [1, 2, 3]

// Remove from both ends
let front = deque.pop_front();  // Some(1), deque: [2, 3]
let back = deque.pop_back();    // Some(3), deque: [2]

// Access
let front_ref = deque.front();      // Option<&T>
let back_ref = deque.back();        // Option<&T>

// BFS pattern
let mut queue: VecDeque<(i32, i32)> = VecDeque::new();
queue.push_back((start_x, start_y));
while let Some((x, y)) = queue.pop_front() {
    // Process current
    // Push neighbors to back
    queue.push_back((x + 1, y));
}
```

---

### BinaryHeap\<T\> — Priority Queue

**Max-heap by default**. O(log n) push/pop, O(1) peek.

```rust
use std::collections::BinaryHeap;

let mut heap = BinaryHeap::new();
heap.push(3);
heap.push(1);
heap.push(4);
heap.push(1);
heap.push(5);

// Always pops the maximum
while let Some(max) = heap.pop() {
    println!("{}", max);  // 5, 4, 3, 1, 1
}

// Peek without removing
let max = heap.peek();  // Option<&T>
```

#### Min-Heap Pattern

Use `std::cmp::Reverse` to create a min-heap:

```rust
use std::collections::BinaryHeap;
use std::cmp::Reverse;

let mut min_heap: BinaryHeap<Reverse<i32>> = BinaryHeap::new();
min_heap.push(Reverse(3));
min_heap.push(Reverse(1));
min_heap.push(Reverse(4));

// Pops the minimum
while let Some(Reverse(min)) = min_heap.pop() {
    println!("{}", min);  // 1, 3, 4
}
```

#### Custom Priority

```rust
use std::collections::BinaryHeap;
use std::cmp::Ordering;

#[derive(Eq, PartialEq)]
struct Task {
    priority: i32,
    name: String,
}

// Higher priority = comes out first
impl Ord for Task {
    fn cmp(&self, other: &Self) -> Ordering {
        self.priority.cmp(&other.priority)
    }
}

impl PartialOrd for Task {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

let mut tasks = BinaryHeap::new();
tasks.push(Task { priority: 1, name: "Low".into() });
tasks.push(Task { priority: 10, name: "High".into() });
tasks.push(Task { priority: 5, name: "Medium".into() });

while let Some(task) = tasks.pop() {
    println!("{}: {}", task.priority, task.name);
    // High (10), Medium (5), Low (1)
}
```

---

### LinkedList\<T\> — Rarely Used

`LinkedList` exists but is almost never the right choice. `Vec` or `VecDeque` are faster for nearly all use cases due to cache locality.

```rust
use std::collections::LinkedList;

let mut list = LinkedList::new();
list.push_back(1);
list.push_front(0);
// Only use when you need O(1) splice operations
```

**Use LinkedList only when:**
- You need O(1) insert/remove at cursor positions
- You need to split/merge lists in O(1)

---

### Collections Decision Tree

```
Need a sequence?
├── Yes → Need double-ended access?
│         ├── Yes → VecDeque
│         └── No → Vec (default choice)
└── No → Need key-value pairs?
          ├── Yes → Need sorted keys?
          │         ├── Yes → BTreeMap
          │         └── No → HashMap (default choice)
          └── No → Need unique values?
                    ├── Yes → Need sorted?
                    │         ├── Yes → BTreeSet
                    │         └── No → HashSet
                    └── No → Need priority ordering?
                              ├── Yes → BinaryHeap
                              └── No → Vec
```

---

## Iterators (std::iter)

Iterators are Rust's composable, lazy, zero-cost abstraction for processing sequences.

### The Iterator Trait

```rust
pub trait Iterator {
    type Item;
    fn next(&mut self) -> Option<Self::Item>;
    // Plus 70+ provided methods...
}
```

All iterator methods are **lazy** — they don't execute until consumed.

```rust
let nums = vec![1, 2, 3, 4, 5];

// This does nothing yet - just creates an iterator chain
let iter = nums.iter()
    .filter(|&&x| x % 2 == 0)
    .map(|x| x * 2);

// Consumption triggers execution
let result: Vec<_> = iter.collect();  // [4, 8]
```

---

### Essential Adapters

#### Transformation

```rust
let nums = vec![1, 2, 3];

// map: Transform each element
let doubled: Vec<_> = nums.iter().map(|x| x * 2).collect();
// [2, 4, 6]

// flat_map: Transform and flatten
let nested = vec![vec![1, 2], vec![3, 4]];
let flat: Vec<_> = nested.iter().flat_map(|v| v.iter()).collect();
// [&1, &2, &3, &4]

// flatten: Flatten one level of nesting
let flat: Vec<_> = nested.into_iter().flatten().collect();
// [1, 2, 3, 4]
```

#### Filtering

```rust
let nums = vec![1, 2, 3, 4, 5, 6];

// filter: Keep elements matching predicate
let evens: Vec<_> = nums.iter().filter(|&&x| x % 2 == 0).collect();
// [&2, &4, &6]

// filter_map: Filter and transform in one step
let strings = vec!["1", "two", "3", "four"];
let numbers: Vec<i32> = strings.iter()
    .filter_map(|s| s.parse().ok())
    .collect();
// [1, 3]
```

#### Taking and Skipping

```rust
let nums = vec![1, 2, 3, 4, 5];

// take: First n elements
let first_three: Vec<_> = nums.iter().take(3).collect();
// [&1, &2, &3]

// skip: Skip first n elements
let last_two: Vec<_> = nums.iter().skip(3).collect();
// [&4, &5]

// take_while: Take while predicate is true
let small: Vec<_> = nums.iter().take_while(|&&x| x < 4).collect();
// [&1, &2, &3]

// skip_while: Skip while predicate is true
let rest: Vec<_> = nums.iter().skip_while(|&&x| x < 3).collect();
// [&3, &4, &5]

// step_by: Every nth element
let every_other: Vec<_> = nums.iter().step_by(2).collect();
// [&1, &3, &5]
```

#### Combination

```rust
let a = vec![1, 2, 3];
let b = vec!["a", "b", "c"];

// zip: Combine two iterators pairwise
let zipped: Vec<_> = a.iter().zip(b.iter()).collect();
// [(&1, &"a"), (&2, &"b"), (&3, &"c")]

// chain: Concatenate iterators
let chained: Vec<_> = a.iter().chain(&[4, 5]).collect();
// [&1, &2, &3, &4, &5]

// enumerate: Add indices
let indexed: Vec<_> = a.iter().enumerate().collect();
// [(0, &1), (1, &2), (2, &3)]

// cycle: Repeat infinitely (use with take!)
let repeated: Vec<_> = a.iter().cycle().take(7).collect();
// [&1, &2, &3, &1, &2, &3, &1]
```

#### Inspection

```rust
let nums = vec![1, 2, 3];

// inspect: Debug without consuming
let result: Vec<_> = nums.iter()
    .inspect(|x| println!("Before: {}", x))
    .map(|x| x * 2)
    .inspect(|x| println!("After: {}", x))
    .collect();

// peekable: Look ahead without consuming
let mut iter = nums.iter().peekable();
while let Some(&x) = iter.next() {
    if let Some(&&next) = iter.peek() {
        println!("{} followed by {}", x, next);
    }
}
```

---

### Consumers (Terminal Operations)

Consumers trigger iteration and produce a final result.

#### Aggregation

```rust
let nums = vec![1, 2, 3, 4, 5];

// Basic aggregations
let sum: i32 = nums.iter().sum();           // 15
let product: i32 = nums.iter().product();   // 120
let count = nums.iter().count();            // 5

// fold: Most flexible aggregation
let sum = nums.iter().fold(0, |acc, &x| acc + x);  // 15

// reduce: Like fold but uses first element as initial
let product = nums.iter().copied().reduce(|acc, x| acc * x);  // Some(120)

// scan: fold with intermediate values
let running_sum: Vec<i32> = nums.iter()
    .scan(0, |state, &x| {
        *state += x;
        Some(*state)
    })
    .collect();
// [1, 3, 6, 10, 15]
```

#### Searching

```rust
let nums = vec![1, 2, 3, 4, 5];

// find: First matching element
let first_even = nums.iter().find(|&&x| x % 2 == 0);  // Some(&2)

// position: Index of first match
let pos = nums.iter().position(|&x| x == 3);  // Some(2)

// any/all: Boolean predicates
let has_even = nums.iter().any(|&x| x % 2 == 0);  // true
let all_positive = nums.iter().all(|&x| x > 0);   // true

// max/min
let max = nums.iter().max();  // Some(&5)
let min = nums.iter().min();  // Some(&1)

// max_by/min_by: Custom comparison
let longest = ["a", "bbb", "cc"].iter()
    .max_by(|a, b| a.len().cmp(&b.len()));  // Some(&"bbb")

// max_by_key/min_by_key: Compare by derived value
let longest = ["a", "bbb", "cc"].iter()
    .max_by_key(|s| s.len());  // Some(&"bbb")
```

#### Collection

```rust
let nums = vec![1, 2, 3, 4, 5];

// partition: Split by predicate
let (evens, odds): (Vec<_>, Vec<_>) = nums.iter()
    .partition(|&&x| x % 2 == 0);
// evens: [&2, &4], odds: [&1, &3, &5]

// unzip: Inverse of zip
let pairs = vec![(1, "a"), (2, "b"), (3, "c")];
let (nums, letters): (Vec<_>, Vec<_>) = pairs.into_iter().unzip();
// nums: [1, 2, 3], letters: ["a", "b", "c"]

// for_each: Side effects
nums.iter().for_each(|x| println!("{}", x));
```

---

### FromIterator and collect()

`collect()` is incredibly versatile — it can produce different types based on context.

```rust
let nums = vec![1, 2, 3];

// Collect into Vec
let doubled: Vec<i32> = nums.iter().map(|x| x * 2).collect();

// Turbofish syntax when type can't be inferred
let doubled = nums.iter().map(|x| x * 2).collect::<Vec<_>>();

// Collect into HashSet (deduplication)
use std::collections::HashSet;
let unique: HashSet<i32> = vec![1, 1, 2, 2, 3].into_iter().collect();

// Collect into HashMap
use std::collections::HashMap;
let map: HashMap<_, _> = vec![("a", 1), ("b", 2)].into_iter().collect();

// Collect into String
let chars = vec!['h', 'e', 'l', 'l', 'o'];
let word: String = chars.into_iter().collect();

// Collect Results — fails fast on first error
let strings = vec!["1", "2", "three", "4"];
let numbers: Result<Vec<i32>, _> = strings.iter()
    .map(|s| s.parse::<i32>())
    .collect();
// Err(ParseIntError) because "three" fails
```

---

### Iterator Ownership: iter() vs iter\_mut() vs into\_iter()

```rust
let v = vec![1, 2, 3];

// iter() — borrows, yields &T
for x in v.iter() {
    println!("{}", x);  // x is &i32
}
// v is still usable here

// iter_mut() — mutably borrows, yields &mut T
let mut v = vec![1, 2, 3];
for x in v.iter_mut() {
    *x *= 2;  // x is &mut i32
}
// v is now [2, 4, 6]

// into_iter() — takes ownership, yields T
let v = vec![1, 2, 3];
for x in v.into_iter() {
    println!("{}", x);  // x is i32
}
// v is consumed, can't use it anymore

// Shorthand: for-in uses into_iter() by default
for x in v { }        // Same as v.into_iter()
for x in &v { }       // Same as v.iter()
for x in &mut v { }   // Same as v.iter_mut()
```

---

## I/O (std::io)

### The Read and Write Traits

```rust
use std::io::{Read, Write};

// Read trait methods
pub trait Read {
    fn read(&mut self, buf: &mut [u8]) -> Result<usize>;
    fn read_to_string(&mut self, buf: &mut String) -> Result<usize>;
    fn read_to_end(&mut self, buf: &mut Vec<u8>) -> Result<usize>;
    // ...
}

// Write trait methods
pub trait Write {
    fn write(&mut self, buf: &[u8]) -> Result<usize>;
    fn write_all(&mut self, buf: &[u8]) -> Result<()>;
    fn flush(&mut self) -> Result<()>;
    // ...
}
```

### BufReader and BufWriter

Always use buffered I/O for efficiency with small reads/writes:

```rust
use std::fs::File;
use std::io::{BufRead, BufReader, BufWriter, Write};

// Reading lines from a file
fn read_lines(path: &str) -> std::io::Result<Vec<String>> {
    let file = File::open(path)?;
    let reader = BufReader::new(file);
    reader.lines().collect()
}

// Reading lines one at a time (memory efficient)
fn process_file(path: &str) -> std::io::Result<()> {
    let file = File::open(path)?;
    let reader = BufReader::new(file);

    for line in reader.lines() {
        let line = line?;
        println!("{}", line);
    }
    Ok(())
}

// Buffered writing
fn write_lines(path: &str, lines: &[String]) -> std::io::Result<()> {
    let file = File::create(path)?;
    let mut writer = BufWriter::new(file);

    for line in lines {
        writeln!(writer, "{}", line)?;
    }
    writer.flush()?;
    Ok(())
}
```

### Standard Streams

```rust
use std::io::{self, BufRead, Write};

// Reading from stdin
fn read_input() -> io::Result<String> {
    let mut input = String::new();
    io::stdin().read_line(&mut input)?;
    Ok(input.trim().to_string())
}

// Reading multiple lines
fn read_all_lines() -> Vec<String> {
    io::stdin().lock().lines()
        .filter_map(Result::ok)
        .collect()
}

// Writing to stdout
fn output() -> io::Result<()> {
    let stdout = io::stdout();
    let mut handle = stdout.lock();  // Lock for performance
    writeln!(handle, "Hello, world!")?;
    Ok(())
}

// Writing to stderr
fn error_output() {
    eprintln!("Error: something went wrong");
}
```

### Cursor for Testing

`Cursor<T>` wraps in-memory buffers to implement Read/Write:

```rust
use std::io::{Cursor, Read, Write};

fn test_reader() {
    let data = b"Hello, world!";
    let mut cursor = Cursor::new(data.as_ref());

    let mut buf = String::new();
    cursor.read_to_string(&mut buf).unwrap();
    assert_eq!(buf, "Hello, world!");
}

fn test_writer() {
    let mut cursor = Cursor::new(Vec::new());
    write!(cursor, "Hello, ").unwrap();
    write!(cursor, "world!").unwrap();
    assert_eq!(cursor.into_inner(), b"Hello, world!");
}
```

---

## File System (std::fs)

### Basic File Operations

```rust
use std::fs;

// Read entire file to string
let content = fs::read_to_string("file.txt")?;

// Read entire file to bytes
let bytes = fs::read("image.png")?;

// Write string to file (creates or overwrites)
fs::write("output.txt", "Hello, world!")?;

// Write bytes to file
fs::write("output.bin", &[0u8; 100])?;

// Append to file
use std::fs::OpenOptions;
use std::io::Write;

let mut file = OpenOptions::new()
    .append(true)
    .open("log.txt")?;
writeln!(file, "New log entry")?;
```

### OpenOptions for Fine Control

```rust
use std::fs::OpenOptions;

let file = OpenOptions::new()
    .read(true)           // Open for reading
    .write(true)          // Open for writing
    .create(true)         // Create if doesn't exist
    .truncate(true)       // Truncate if exists
    .append(true)         // Append mode
    .open("file.txt")?;
```

### Directory Operations

```rust
use std::fs;

// Create directory
fs::create_dir("new_dir")?;

// Create directory and all parents
fs::create_dir_all("path/to/new/dir")?;

// Remove directory (must be empty)
fs::remove_dir("empty_dir")?;

// Remove directory and contents
fs::remove_dir_all("dir_with_contents")?;

// List directory contents
for entry in fs::read_dir(".")? {
    let entry = entry?;
    println!("{:?}", entry.path());
}

// Copy file
fs::copy("source.txt", "dest.txt")?;

// Rename/move file
fs::rename("old.txt", "new.txt")?;

// Remove file
fs::remove_file("file.txt")?;
```

### Metadata

```rust
use std::fs;

let metadata = fs::metadata("file.txt")?;

println!("Size: {} bytes", metadata.len());
println!("Is file: {}", metadata.is_file());
println!("Is dir: {}", metadata.is_dir());
println!("Is symlink: {}", metadata.is_symlink());
println!("Modified: {:?}", metadata.modified()?);
println!("Readonly: {}", metadata.permissions().readonly());
```

---

## Paths (std::path)

### Path vs PathBuf

`Path` is like `&str` — borrowed, immutable. `PathBuf` is like `String` — owned, mutable.

```rust
use std::path::{Path, PathBuf};

// Path — borrowed reference
let path: &Path = Path::new("/home/user/file.txt");

// PathBuf — owned
let mut path_buf = PathBuf::from("/home/user");
path_buf.push("file.txt");

// Convert between them
let path: &Path = &path_buf;         // PathBuf -> &Path (free)
let owned: PathBuf = path.to_owned(); // &Path -> PathBuf (allocates)
```

### Path Manipulation

```rust
use std::path::Path;

let path = Path::new("/home/user/documents/file.txt");

// Components
println!("{:?}", path.parent());       // Some("/home/user/documents")
println!("{:?}", path.file_name());    // Some("file.txt")
println!("{:?}", path.file_stem());    // Some("file")
println!("{:?}", path.extension());    // Some("txt")

// Predicates
println!("{}", path.exists());         // true/false
println!("{}", path.is_file());        // true/false
println!("{}", path.is_dir());         // true/false
println!("{}", path.is_absolute());    // true
println!("{}", path.is_relative());    // false

// Building paths
let mut path = PathBuf::from("/home/user");
path.push("documents");
path.push("file.txt");
// /home/user/documents/file.txt

// Or with join (creates new PathBuf)
let path = Path::new("/home/user").join("documents").join("file.txt");

// Set file name/extension
let mut path = PathBuf::from("/home/user/old.txt");
path.set_file_name("new.md");
// /home/user/new.md

path.set_extension("rs");
// /home/user/new.rs

// Canonicalize (resolve symlinks, make absolute)
let absolute = path.canonicalize()?;
```

### Generic Path Functions

Use `AsRef<Path>` to accept multiple path types:

```rust
use std::path::Path;
use std::fs;

// This function accepts &str, String, Path, PathBuf
fn read_file<P: AsRef<Path>>(path: P) -> std::io::Result<String> {
    fs::read_to_string(path)
}

// All of these work:
let content = read_file("file.txt")?;
let content = read_file(String::from("file.txt"))?;
let content = read_file(Path::new("file.txt"))?;
let content = read_file(PathBuf::from("file.txt"))?;
```

---

## Environment (std::env)

### Environment Variables

```rust
use std::env;

// Get single variable
match env::var("HOME") {
    Ok(val) => println!("HOME: {}", val),
    Err(_) => println!("HOME not set"),
}

// Get with default
let editor = env::var("EDITOR").unwrap_or_else(|_| "vim".to_string());

// Check if set
if env::var("DEBUG").is_ok() {
    println!("Debug mode enabled");
}

// Set variable (affects current process and children)
env::set_var("MY_VAR", "my_value");

// Remove variable
env::remove_var("MY_VAR");

// Iterate all variables
for (key, value) in env::vars() {
    println!("{}: {}", key, value);
}

// Get OS-specific string (OsString)
let path_os = env::var_os("PATH");  // Option<OsString>
```

### Process Information

```rust
use std::env;

// Command-line arguments
let args: Vec<String> = env::args().collect();
println!("Program: {}", args[0]);
for arg in args.iter().skip(1) {
    println!("Arg: {}", arg);
}

// Current working directory
let cwd = env::current_dir()?;
println!("CWD: {:?}", cwd);

// Change directory
env::set_current_dir("/tmp")?;

// Current executable path
let exe = env::current_exe()?;
println!("Executable: {:?}", exe);

// Temp directory
let tmp = env::temp_dir();
println!("Temp: {:?}", tmp);
```

---

## Time (std::time)

### Instant — Monotonic Clock

Use `Instant` for measuring elapsed time. It's guaranteed to never go backwards.

```rust
use std::time::Instant;

let start = Instant::now();

// Do some work
expensive_operation();

let duration = start.elapsed();
println!("Took: {:?}", duration);
println!("Took: {} ms", duration.as_millis());

// Compare instants
let earlier = Instant::now();
std::thread::sleep(std::time::Duration::from_millis(100));
let later = Instant::now();

let diff = later.duration_since(earlier);
println!("Difference: {:?}", diff);
```

### SystemTime — Wall Clock

Use `SystemTime` for timestamps and dates. Can go backwards (clock adjustments).

```rust
use std::time::{SystemTime, UNIX_EPOCH};

// Current time
let now = SystemTime::now();

// Unix timestamp
let duration = now.duration_since(UNIX_EPOCH)
    .expect("Time went backwards");
println!("Unix timestamp: {}", duration.as_secs());

// Compare times
let earlier = SystemTime::now();
std::thread::sleep(std::time::Duration::from_secs(1));
let later = SystemTime::now();

match later.duration_since(earlier) {
    Ok(d) => println!("Elapsed: {:?}", d),
    Err(e) => println!("Clock went backwards: {:?}", e.duration()),
}
```

### Duration

```rust
use std::time::Duration;

// Creation
let d1 = Duration::from_secs(5);
let d2 = Duration::from_millis(500);
let d3 = Duration::from_micros(1000);
let d4 = Duration::from_nanos(1_000_000);
let d5 = Duration::new(5, 500_000_000);  // 5.5 seconds

// Access components
println!("Seconds: {}", d5.as_secs());           // 5
println!("Millis: {}", d5.as_millis());          // 5500
println!("Subsec nanos: {}", d5.subsec_nanos()); // 500_000_000

// Arithmetic
let sum = d1 + d2;
let diff = d1.saturating_sub(d2);  // Won't underflow
let doubled = d1 * 2;
let halved = d1 / 2;

// Comparisons
if d1 > d2 {
    println!("d1 is longer");
}

// Zero check
if d1.is_zero() {
    println!("Zero duration");
}
```

---

## Synchronization (std::sync)

### Arc\<T\> — Atomic Reference Counting

`Arc` allows multiple ownership across threads.

```rust
use std::sync::Arc;
use std::thread;

let data = Arc::new(vec![1, 2, 3]);

let handles: Vec<_> = (0..3).map(|i| {
    let data = Arc::clone(&data);  // Clone the Arc, not the data
    thread::spawn(move || {
        println!("Thread {}: {:?}", i, data);
    })
}).collect();

for handle in handles {
    handle.join().unwrap();
}

// data is dropped when last Arc is dropped
```

### Mutex\<T\> — Mutual Exclusion

`Mutex` provides interior mutability with exclusive access.

```rust
use std::sync::{Arc, Mutex};
use std::thread;

let counter = Arc::new(Mutex::new(0));

let handles: Vec<_> = (0..10).map(|_| {
    let counter = Arc::clone(&counter);
    thread::spawn(move || {
        let mut num = counter.lock().unwrap();
        *num += 1;
        // MutexGuard is dropped here, releasing the lock
    })
}).collect();

for handle in handles {
    handle.join().unwrap();
}

println!("Result: {}", *counter.lock().unwrap());  // 10
```

**Handling poisoned locks:**

```rust
use std::sync::Mutex;

let mutex = Mutex::new(5);

// If a thread panics while holding the lock, it becomes poisoned
let result = mutex.lock();
match result {
    Ok(guard) => println!("Value: {}", *guard),
    Err(poisoned) => {
        // Still access the data (may be in inconsistent state)
        let guard = poisoned.into_inner();
        println!("Recovered value: {}", *guard);
    }
}
```

### RwLock\<T\> — Reader-Writer Lock

Multiple readers OR one writer.

```rust
use std::sync::RwLock;

let lock = RwLock::new(5);

// Multiple readers allowed
{
    let r1 = lock.read().unwrap();
    let r2 = lock.read().unwrap();
    println!("Readers: {}, {}", *r1, *r2);
}

// One writer at a time
{
    let mut w = lock.write().unwrap();
    *w += 1;
}

println!("Final: {}", *lock.read().unwrap());
```

### Channels (mpsc)

Multi-producer, single-consumer channels for message passing.

```rust
use std::sync::mpsc;
use std::thread;

// Unbounded channel
let (tx, rx) = mpsc::channel();

// Multiple producers
let tx2 = tx.clone();

thread::spawn(move || {
    tx.send("from thread 1").unwrap();
});

thread::spawn(move || {
    tx2.send("from thread 2").unwrap();
});

// Single consumer
for received in rx {
    println!("Got: {}", received);
}

// Bounded channel (blocks when full)
let (tx, rx) = mpsc::sync_channel(10);  // Buffer size 10
```

### Atomic Types

Lock-free primitives for simple shared state.

```rust
use std::sync::atomic::{AtomicUsize, AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;

let counter = Arc::new(AtomicUsize::new(0));
let flag = Arc::new(AtomicBool::new(false));

let handles: Vec<_> = (0..10).map(|_| {
    let counter = Arc::clone(&counter);
    thread::spawn(move || {
        counter.fetch_add(1, Ordering::SeqCst);
    })
}).collect();

for handle in handles {
    handle.join().unwrap();
}

println!("Counter: {}", counter.load(Ordering::SeqCst));

// Common operations
counter.store(0, Ordering::SeqCst);
let old = counter.swap(100, Ordering::SeqCst);
let success = counter.compare_exchange(100, 200, Ordering::SeqCst, Ordering::SeqCst);
```

### Once and OnceLock

One-time initialization.

```rust
use std::sync::{Once, OnceLock};

// Once — for running code exactly once
static INIT: Once = Once::new();

fn initialize() {
    INIT.call_once(|| {
        println!("Initialization code runs exactly once");
    });
}

// OnceLock — for lazy static values
static CONFIG: OnceLock<String> = OnceLock::new();

fn get_config() -> &'static String {
    CONFIG.get_or_init(|| {
        // Expensive initialization
        "configuration data".to_string()
    })
}
```

---

## Formatting (std::fmt)

### Display vs Debug

```rust
use std::fmt;

struct Point {
    x: i32,
    y: i32,
}

// Debug — for programmers, can be derived
#[derive(Debug)]
struct DebugPoint {
    x: i32,
    y: i32,
}

// Display — for users, must be implemented manually
impl fmt::Display for Point {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}

let p = Point { x: 1, y: 2 };
let dp = DebugPoint { x: 1, y: 2 };

println!("{}", p);    // Display: (1, 2)
println!("{:?}", dp); // Debug: DebugPoint { x: 1, y: 2 }
println!("{:#?}", dp); // Pretty Debug (indented)
```

### Format Specifiers

```rust
let x = 42;
let pi = 3.14159;
let name = "Alice";

// Basic
println!("{}", x);              // 42
println!("{:?}", x);            // 42 (debug)

// Width and alignment
println!("{:10}", x);           // "        42" (right-aligned)
println!("{:<10}", x);          // "42        " (left-aligned)
println!("{:^10}", x);          // "    42    " (centered)
println!("{:0>10}", x);         // "0000000042" (zero-padded)

// Precision (floats)
println!("{:.2}", pi);          // "3.14"
println!("{:10.2}", pi);        // "      3.14"

// Bases
println!("{:b}", x);            // "101010" (binary)
println!("{:o}", x);            // "52" (octal)
println!("{:x}", x);            // "2a" (hex lowercase)
println!("{:X}", x);            // "2A" (hex uppercase)
println!("{:#x}", x);           // "0x2a" (hex with prefix)
println!("{:#b}", x);           // "0b101010" (binary with prefix)

// Scientific notation
println!("{:e}", pi);           // "3.14159e0"
println!("{:E}", pi);           // "3.14159E0"

// Named parameters
println!("{name} is {age} years old", name = "Bob", age = 30);

// Positional
println!("{0} + {0} = {1}", 2, 4);  // "2 + 2 = 4"
```

### Implementing Display

```rust
use std::fmt;

struct Temperature {
    celsius: f64,
}

impl fmt::Display for Temperature {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        // Respect width and precision from format string
        let width = f.width().unwrap_or(0);
        let precision = f.precision().unwrap_or(1);
        write!(f, "{:width$.precision$}°C", self.celsius)
    }
}

let t = Temperature { celsius: 23.5 };
println!("{}", t);      // "23.5°C"
println!("{:10.2}", t); // "     23.50°C"
```

---

## Conversions (std::convert)

### From and Into

`From` is for infallible conversions. Implementing `From` gives you `Into` for free.

```rust
#[derive(Debug)]
struct Celsius(f64);

#[derive(Debug)]
struct Fahrenheit(f64);

// Implement From
impl From<Celsius> for Fahrenheit {
    fn from(c: Celsius) -> Self {
        Fahrenheit(c.0 * 9.0 / 5.0 + 32.0)
    }
}

impl From<Fahrenheit> for Celsius {
    fn from(f: Fahrenheit) -> Self {
        Celsius((f.0 - 32.0) * 5.0 / 9.0)
    }
}

// Use From
let c = Celsius(100.0);
let f = Fahrenheit::from(c);  // Explicit

// Use Into (comes free with From)
let c = Celsius(0.0);
let f: Fahrenheit = c.into(); // Implicit via type annotation

// Common std conversions
let s: String = "hello".into();        // &str -> String
let v: Vec<u8> = "hello".into();       // &str -> Vec<u8>
let boxed: Box<str> = "hello".into();  // &str -> Box<str>
```

### TryFrom and TryInto

For fallible conversions that might fail.

```rust
use std::convert::TryFrom;

#[derive(Debug)]
struct PositiveInt(u32);

#[derive(Debug)]
struct NegativeError;

impl TryFrom<i32> for PositiveInt {
    type Error = NegativeError;

    fn try_from(value: i32) -> Result<Self, Self::Error> {
        if value >= 0 {
            Ok(PositiveInt(value as u32))
        } else {
            Err(NegativeError)
        }
    }
}

// Usage
let p: Result<PositiveInt, _> = 42.try_into();     // Ok(PositiveInt(42))
let p: Result<PositiveInt, _> = (-1).try_into();   // Err(NegativeError)

// Common std TryFrom conversions
let small: Result<u8, _> = 256i32.try_into();      // Err (overflow)
let small: Result<u8, _> = 200i32.try_into();      // Ok(200)
```

### AsRef and AsMut

Cheap reference conversions for generic functions.

```rust
use std::path::Path;

// Function accepts anything convertible to &Path
fn read_file<P: AsRef<Path>>(path: P) -> std::io::Result<String> {
    std::fs::read_to_string(path.as_ref())
}

// All of these work:
read_file("file.txt");                // &str
read_file(String::from("file.txt")); // String
read_file(Path::new("file.txt"));     // &Path

// AsRef<[T]> for slice operations
fn sum_slice<T: AsRef<[i32]>>(data: T) -> i32 {
    data.as_ref().iter().sum()
}

sum_slice(&[1, 2, 3]);       // array
sum_slice(vec![1, 2, 3]);    // Vec
sum_slice(&vec![1, 2, 3]);   // &Vec
```

---

## Strings (std::str and std::string)

### String vs \&str

```rust
// &str — borrowed string slice, immutable
let s1: &str = "hello";        // String literal (in binary)
let s2: &str = &string[..];    // Slice of String

// String — owned, heap-allocated, mutable
let s3: String = String::new();
let s4: String = "hello".to_string();
let s5: String = String::from("hello");
let s6: String = format!("hello {}", "world");

// Convert between them
let owned: String = s1.to_owned();  // &str -> String
let borrowed: &str = &s3;           // String -> &str (free, via Deref)
```

### String Operations

```rust
let mut s = String::from("Hello");

// Building
s.push_str(", world");        // Append string slice
s.push('!');                  // Append char
let s2 = s + " More";         // Concatenate (consumes s)
let s3 = format!("{} {}", "a", "b"); // Format (doesn't consume)

// Iteration
for c in "hello".chars() {    // Characters
    println!("{}", c);
}
for b in "hello".bytes() {    // Bytes
    println!("{}", b);
}
for (i, c) in "hello".char_indices() {
    println!("{}: {}", i, c);
}

// Searching
let s = "hello world";
println!("{}", s.contains("world"));      // true
println!("{}", s.starts_with("hello"));   // true
println!("{}", s.ends_with("world"));     // true
println!("{:?}", s.find("o"));            // Some(4)
println!("{:?}", s.rfind("o"));           // Some(7)

// Splitting
for word in "hello world".split_whitespace() {
    println!("{}", word);
}
for part in "a,b,c".split(',') {
    println!("{}", part);
}
let parts: Vec<_> = "a::b::c".split("::").collect();

// Trimming
let s = "  hello  ";
println!("'{}'", s.trim());         // 'hello'
println!("'{}'", s.trim_start());   // 'hello  '
println!("'{}'", s.trim_end());     // '  hello'

// Case conversion
println!("{}", "Hello".to_lowercase());  // "hello"
println!("{}", "Hello".to_uppercase());  // "HELLO"

// Replacing
println!("{}", "hello".replace("l", "L"));     // "heLLo"
println!("{}", "hello".replacen("l", "L", 1)); // "heLlo" (first only)
```

### Parsing with FromStr

```rust
use std::str::FromStr;

// Built-in parsing
let n: i32 = "42".parse().unwrap();
let n: i32 = i32::from_str("42").unwrap();
let f: f64 = "3.14".parse().unwrap();
let b: bool = "true".parse().unwrap();

// Custom type with FromStr
use std::num::ParseIntError;

#[derive(Debug)]
struct Point {
    x: i32,
    y: i32,
}

impl FromStr for Point {
    type Err = ParseIntError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let coords: Vec<&str> = s.split(',').collect();
        let x = coords[0].trim().parse()?;
        let y = coords[1].trim().parse()?;
        Ok(Point { x, y })
    }
}

let p: Point = "10, 20".parse().unwrap();
println!("{:?}", p);  // Point { x: 10, y: 20 }
```

---

## Quick Reference Cards

### Collections Methods Summary

| Collection | Insert | Remove | Access | Search | Iterate |
|------------|--------|--------|--------|--------|---------|
| **Vec** | `push`, `insert` | `pop`, `remove`, `swap_remove` | `[i]`, `get(i)`, `first`, `last` | `contains`, `iter().position()` | `iter()` |
| **HashMap** | `insert`, `entry().or_insert()` | `remove` | `get`, `get_mut` | `contains_key` | `iter()`, `keys()`, `values()` |
| **HashSet** | `insert` | `remove` | — | `contains` | `iter()` |
| **BTreeMap** | `insert`, `entry()` | `remove`, `pop_first`, `pop_last` | `get`, `first_key_value`, `last_key_value` | `contains_key`, `range()` | `iter()` |
| **VecDeque** | `push_front`, `push_back` | `pop_front`, `pop_back` | `front`, `back`, `get(i)` | `contains` | `iter()` |
| **BinaryHeap** | `push` | `pop` | `peek` | — | `iter()` (unsorted) |

### Iterator Adapters Quick Reference

| Adapter | Purpose | Example |
|---------|---------|---------|
| `map(f)` | Transform each element | `.map(\|x\| x * 2)` |
| `filter(p)` | Keep matching elements | `.filter(\|x\| x > 0)` |
| `filter_map(f)` | Filter and transform | `.filter_map(\|x\| x.parse().ok())` |
| `flat_map(f)` | Transform and flatten | `.flat_map(\|v\| v.iter())` |
| `take(n)` | First n elements | `.take(5)` |
| `skip(n)` | Skip first n | `.skip(2)` |
| `enumerate()` | Add indices | `.enumerate()` |
| `zip(iter)` | Pair with another | `.zip(other.iter())` |
| `chain(iter)` | Concatenate | `.chain([4,5].iter())` |
| `peekable()` | Allow peeking ahead | `.peekable()` |
| `rev()` | Reverse (DoubleEndedIterator) | `.rev()` |
| `collect()` | Gather into collection | `.collect::<Vec<_>>()` |
| `fold(init, f)` | Reduce to single value | `.fold(0, \|acc, x\| acc + x)` |
| `find(p)` | First match | `.find(\|x\| x > 5)` |
| `any(p)` / `all(p)` | Boolean check | `.any(\|x\| x > 5)` |

### Format Specifiers Cheat Sheet

| Specifier | Output | Example |
|-----------|--------|---------|
| `{}` | Display | `42` |
| `{:?}` | Debug | `SomeStruct { x: 1 }` |
| `{:#?}` | Pretty Debug | (indented) |
| `{:b}` | Binary | `101010` |
| `{:#b}` | Binary with prefix | `0b101010` |
| `{:o}` | Octal | `52` |
| `{:x}` | Hex (lowercase) | `2a` |
| `{:X}` | Hex (uppercase) | `2A` |
| `{:#x}` | Hex with prefix | `0x2a` |
| `{:e}` | Scientific | `3.14e0` |
| `{:10}` | Width 10, right-aligned | `        42` |
| `{:<10}` | Width 10, left-aligned | `42        ` |
| `{:^10}` | Width 10, centered | `    42    ` |
| `{:0>10}` | Zero-padded | `0000000042` |
| `{:.2}` | 2 decimal places | `3.14` |

---

## Interview Questions

### Q1: What's the difference between `iter()`, `iter_mut()`, and `into_iter()`?

`iter()` borrows the collection and yields `&T` (immutable references). `iter_mut()` mutably borrows and yields `&mut T`. `into_iter()` consumes the collection and yields owned `T` values. Use `iter()` when you need to read, `iter_mut()` to modify in place, and `into_iter()` when building new collections.

### Q2: When would you use `BTreeMap` over `HashMap`?

Use `BTreeMap` when you need: sorted keys during iteration, range queries with `range()`, access to first/last elements, or deterministic iteration order. `HashMap` is faster (O(1) vs O(log n)) for pure key-value lookup without ordering requirements.

### Q3: Explain the Entry API and when to use it.

The Entry API (`map.entry(key)`) provides efficient insert-or-update patterns without double lookup. Use `or_insert(value)` to insert a default, `or_insert_with(|| expensive())` for lazy default computation, and `and_modify(|v| *v += 1)` to modify existing values. Essential for counting patterns.

### Q4: What's the difference between `Arc<Mutex<T>>` and `Mutex<Arc<T>>`?

`Arc<Mutex<T>>` is the standard pattern: multiple threads share ownership of a mutex-protected value. `Mutex<Arc<T>>` is rarely useful—it protects the Arc pointer itself, not the underlying data. Use `Arc<Mutex<T>>` for shared mutable state across threads.

### Q5: How do you create a min-heap with `BinaryHeap`?

`BinaryHeap` is a max-heap by default. Wrap values in `std::cmp::Reverse`: `BinaryHeap<Reverse<i32>>`. Push with `heap.push(Reverse(x))` and pop with `let Reverse(min) = heap.pop()`.

### Q6: Explain `From`/`Into` traits and their relationship.

`From<T>` defines how to create a type from `T`. Implementing `From<T> for U` automatically provides `Into<U> for T`. Use `From` for explicit conversion (`U::from(t)`) and `Into` for implicit conversion in generic contexts. `From` should be infallible; use `TryFrom` for fallible conversions.

### Q7: When should you use `BufReader` vs direct file reading?

Always use `BufReader` when making many small reads. Direct `File::read()` makes a system call per read. `BufReader` batches reads into a buffer, dramatically improving performance for line-by-line or byte-by-byte reading. Use `fs::read_to_string()` for reading entire files at once.

### Q8: What's the difference between `Instant` and `SystemTime`?

`Instant` is a monotonic clock for measuring elapsed time—it never goes backwards and is ideal for benchmarking. `SystemTime` is wall-clock time that can be adjusted (DST, NTP) and may go backwards. Use `Instant` for durations, `SystemTime` for timestamps.

### Q9: How do you handle poisoned mutex locks?

A mutex becomes poisoned if a thread panics while holding it. `lock()` returns `Result`—on `Err`, call `poisoned.into_inner()` to access the data anyway (which may be in an inconsistent state). Consider whether to propagate the panic or attempt recovery.

### Q10: Explain `AsRef` and its common use in function signatures.

`AsRef<T>` provides cheap reference conversion. Functions accepting `impl AsRef<Path>` can take `&str`, `String`, `Path`, or `PathBuf`. It makes APIs ergonomic without runtime cost. Common patterns: `AsRef<Path>` for paths, `AsRef<[u8]>` for byte slices, `AsRef<str>` for strings.

---

## Resources

### Official Documentation
- [The Rust Standard Library](https://doc.rust-lang.org/std/) — Complete API reference
- [std::collections](https://doc.rust-lang.org/std/collections/) — When to use which collection
- [std::iter](https://doc.rust-lang.org/std/iter/) — Iterator documentation

### Learning Resources
- [Rust by Example](https://doc.rust-lang.org/rust-by-example/) — Annotated examples
- [The Rust Book](https://doc.rust-lang.org/book/) — Comprehensive guide
- [Rust Cookbook](https://rust-lang-nursery.github.io/rust-cookbook/) — Common patterns

### Related Guides in This Series
- [03-data-structures.md](03-data-structures.md) — Collections for interview patterns
- [05-idioms-best-practices.md](05-idioms-best-practices.md) — Idiomatic Rust patterns
- [06-concurrency.md](06-concurrency.md) — Concurrent Rust patterns
