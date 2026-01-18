# Data Structures in Rust

> Standard library collections and custom types for coding interviews

Master these data structures to solve algorithm problems efficiently in Rust.

---

## Table of Contents

1. [Vec — Dynamic Array](#vec--dynamic-array)
2. [HashMap & HashSet](#hashmap--hashset)
3. [String & str](#string--str)
4. [VecDeque — Double-Ended Queue](#vecdeque--double-ended-queue)
5. [BinaryHeap — Priority Queue](#binaryheap--priority-queue)
6. [BTreeMap & BTreeSet](#btreemap--btreeset)
7. [LinkedList](#linkedlist)
8. [Custom Structs for Interviews](#custom-structs-for-interviews)
9. [Implementing Iterator](#implementing-iterator)
10. [Graph Representations](#graph-representations)
11. [Complexity Reference](#complexity-reference)

---

## Vec — Dynamic Array

`Vec<T>` is the most commonly used collection in Rust — your go-to for array-based problems.

### Creation

```rust
// Empty vector
let mut v: Vec<i32> = Vec::new();
let mut v: Vec<i32> = vec![];

// With initial values
let v = vec![1, 2, 3, 4, 5];

// With capacity (avoids reallocations)
let mut v: Vec<i32> = Vec::with_capacity(100);

// Filled with same value
let v = vec![0; 10];  // [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

// From range
let v: Vec<i32> = (0..10).collect();

// 2D vector
let grid: Vec<Vec<i32>> = vec![vec![0; cols]; rows];
```

### Basic Operations

```rust
let mut v = vec![1, 2, 3];

// Access
let first = v[0];           // Panics if out of bounds
let first = v.get(0);       // Returns Option<&i32>
let last = v.last();        // Option<&i32>
let first = v.first();      // Option<&i32>

// Modification
v.push(4);                  // Add to end: [1, 2, 3, 4]
let last = v.pop();         // Remove from end: Some(4)
v.insert(1, 10);            // Insert at index: [1, 10, 2, 3]
v.remove(1);                // Remove at index: [1, 2, 3]

// Bulk operations
v.append(&mut other);       // Move all from other
v.extend([4, 5, 6]);        // Add multiple
v.clear();                  // Remove all
v.truncate(2);              // Keep first 2

// Properties
v.len();                    // Number of elements
v.is_empty();               // len() == 0
v.capacity();               // Allocated space
```

### Searching

```rust
let v = vec![3, 1, 4, 1, 5, 9];

// Linear search
v.contains(&4);             // true
v.iter().position(|&x| x == 4);  // Some(2)
v.iter().find(|&&x| x > 3);      // Some(&4)

// Binary search (sorted slice only!)
let sorted = vec![1, 2, 3, 4, 5];
sorted.binary_search(&3);   // Ok(2) - found at index 2
sorted.binary_search(&6);   // Err(5) - would insert at 5
```

### Sorting

```rust
let mut v = vec![3, 1, 4, 1, 5];

// Sort ascending
v.sort();                   // [1, 1, 3, 4, 5]

// Sort descending
v.sort_by(|a, b| b.cmp(a));

// Sort by key
v.sort_by_key(|x| -x);      // Descending

// Sort with custom comparator
v.sort_by(|a, b| {
    // Return Ordering::Less, Equal, or Greater
    a.cmp(b)
});

// Unstable sort (faster, doesn't preserve equal element order)
v.sort_unstable();

// Check if sorted
v.is_sorted();              // Rust 1.82+
```

### Slicing

```rust
let v = vec![0, 1, 2, 3, 4, 5];

// Slices (views, not copies)
let slice = &v[1..4];       // [1, 2, 3]
let slice = &v[..3];        // [0, 1, 2]
let slice = &v[3..];        // [3, 4, 5]
let slice = &v[..];         // Entire vector

// Split
let (left, right) = v.split_at(3);  // [0,1,2] and [3,4,5]

// Chunks
for chunk in v.chunks(2) {
    println!("{:?}", chunk);  // [0,1], [2,3], [4,5]
}

// Windows (sliding window)
for window in v.windows(3) {
    println!("{:?}", window);  // [0,1,2], [1,2,3], [2,3,4], [3,4,5]
}
```

### Iteration

```rust
let v = vec![1, 2, 3];

// Immutable iteration
for x in &v { }             // x is &i32
for x in v.iter() { }       // Same

// Mutable iteration
for x in &mut v { *x += 1; }
for x in v.iter_mut() { }

// Consuming iteration
for x in v { }              // v is moved, x is i32
for x in v.into_iter() { }  // Same

// With index
for (i, x) in v.iter().enumerate() {
    println!("{}: {}", i, x);
}

// Reverse
for x in v.iter().rev() { }
```

### Common Interview Patterns

```rust
// Reverse in place
v.reverse();

// Rotate
v.rotate_left(2);           // [3,4,5,1,2]
v.rotate_right(2);

// Deduplicate (sorted vector)
v.dedup();                  // Removes consecutive duplicates

// Filter in place
v.retain(|&x| x % 2 == 0);  // Keep only even

// Swap elements
v.swap(0, 2);

// Swap with last and remove (O(1) removal if order doesn't matter)
v.swap_remove(0);
```

---

## HashMap & HashSet

### HashMap<K, V>

```rust
use std::collections::HashMap;

// Creation
let mut map: HashMap<String, i32> = HashMap::new();
let mut map: HashMap<&str, i32> = HashMap::from([
    ("a", 1),
    ("b", 2),
]);

// Insert
map.insert("key".to_string(), 42);
map.insert("key".to_string(), 100);  // Overwrites

// Access
let val = map.get("key");           // Option<&i32>
let val = map["key"];               // Panics if not found

// Check existence
map.contains_key("key");            // bool

// Remove
let old = map.remove("key");        // Option<i32>

// Iteration
for (key, value) in &map { }
for key in map.keys() { }
for value in map.values() { }
for value in map.values_mut() { }

// Properties
map.len();
map.is_empty();
map.clear();
```

### Entry API (Crucial for Interviews!)

```rust
use std::collections::HashMap;

let mut map: HashMap<String, i32> = HashMap::new();

// Insert if absent
map.entry("key".to_string()).or_insert(0);

// Insert with computation
map.entry("key".to_string()).or_insert_with(|| expensive());

// Modify existing or insert
*map.entry("key".to_string()).or_insert(0) += 1;

// Common pattern: counting
let mut counts: HashMap<char, i32> = HashMap::new();
for c in "hello".chars() {
    *counts.entry(c).or_insert(0) += 1;
}
// {'h': 1, 'e': 1, 'l': 2, 'o': 1}

// Common pattern: grouping
let mut groups: HashMap<i32, Vec<String>> = HashMap::new();
groups.entry(key).or_default().push(value);
```

### HashSet<T>

```rust
use std::collections::HashSet;

// Creation
let mut set: HashSet<i32> = HashSet::new();
let set: HashSet<i32> = [1, 2, 3].into_iter().collect();

// Operations
set.insert(42);             // Returns true if new
set.remove(&42);            // Returns true if existed
set.contains(&42);          // bool

// Set operations
let a: HashSet<i32> = [1, 2, 3].into_iter().collect();
let b: HashSet<i32> = [2, 3, 4].into_iter().collect();

let union: HashSet<_> = a.union(&b).collect();        // {1,2,3,4}
let inter: HashSet<_> = a.intersection(&b).collect(); // {2,3}
let diff: HashSet<_> = a.difference(&b).collect();    // {1}
let sym: HashSet<_> = a.symmetric_difference(&b).collect(); // {1,4}

// Check subset/superset
a.is_subset(&b);
a.is_superset(&b);
a.is_disjoint(&b);          // No common elements
```

---

## String & str

### String Types

```rust
// &str - immutable string slice (borrowed)
let s: &str = "hello";              // String literal, stored in binary

// String - owned, growable string on heap
let s: String = String::from("hello");
let s: String = "hello".to_string();
let s: String = "hello".to_owned();
```

### String Operations

```rust
let mut s = String::from("hello");

// Append
s.push(' ');                // Add char
s.push_str("world");        // Add &str
s += "!";                   // Concatenate

// Access (careful with UTF-8!)
s.len();                    // Bytes, not chars!
s.chars().count();          // Character count
s.chars().nth(0);           // First char as Option<char>

// Slicing (byte indices, must be valid UTF-8 boundaries!)
let slice = &s[0..5];       // "hello"

// Iteration
for c in s.chars() { }      // By character
for b in s.bytes() { }      // By byte
for (i, c) in s.char_indices() { }  // With byte index

// Checking
s.is_empty();
s.contains("lo");
s.starts_with("he");
s.ends_with("ld");

// Finding
s.find("lo");               // Option<usize> - byte index

// Transforming
s.to_lowercase();
s.to_uppercase();
s.trim();
s.trim_start();
s.trim_end();
s.replace("old", "new");

// Splitting
s.split(' ');               // Iterator
s.split_whitespace();
s.lines();
let parts: Vec<&str> = s.split(',').collect();
```

### String Building

```rust
// For many concatenations, use String directly
let mut result = String::new();
for word in words {
    result.push_str(&word);
    result.push(' ');
}

// Or use format!
let s = format!("{} {}", first, second);

// Or collect
let s: String = words.iter().collect();
let s: String = chars.iter().collect();

// Join
let joined = vec!["a", "b", "c"].join(", ");  // "a, b, c"
```

### String vs &str in Functions

```rust
// Prefer &str for function parameters (more flexible)
fn process(s: &str) { }

process("literal");              // &str works
process(&String::from("owned")); // String works via Deref

// Return String if creating new data
fn create() -> String {
    String::from("new")
}

// Return &str if returning slice of input
fn first_word(s: &str) -> &str {
    s.split_whitespace().next().unwrap_or("")
}
```

---

## VecDeque — Double-Ended Queue

Use for queue (FIFO) or double-ended operations.

```rust
use std::collections::VecDeque;

let mut deque: VecDeque<i32> = VecDeque::new();
let mut deque: VecDeque<i32> = VecDeque::from([1, 2, 3]);

// Add elements
deque.push_back(4);         // [1, 2, 3, 4]
deque.push_front(0);        // [0, 1, 2, 3, 4]

// Remove elements
let front = deque.pop_front();  // Some(0), [1, 2, 3, 4]
let back = deque.pop_back();    // Some(4), [1, 2, 3]

// Access
deque.front();              // Option<&T>
deque.back();               // Option<&T>
deque.get(1);               // Option<&T>
deque[1];                   // Panics if out of bounds

// Common queue pattern
deque.push_back(item);      // Enqueue
let item = deque.pop_front(); // Dequeue

// Common deque pattern (sliding window)
while deque.back().map_or(false, |&x| x < threshold) {
    deque.pop_back();
}
```

---

## BinaryHeap — Priority Queue

Max-heap by default. Use `Reverse` for min-heap.

```rust
use std::collections::BinaryHeap;
use std::cmp::Reverse;

// Max heap (default)
let mut max_heap: BinaryHeap<i32> = BinaryHeap::new();
max_heap.push(3);
max_heap.push(1);
max_heap.push(4);
let max = max_heap.pop();   // Some(4) - always returns max

// Min heap (use Reverse wrapper)
let mut min_heap: BinaryHeap<Reverse<i32>> = BinaryHeap::new();
min_heap.push(Reverse(3));
min_heap.push(Reverse(1));
min_heap.push(Reverse(4));
let Reverse(min) = min_heap.pop().unwrap();  // 1

// Peek without removing
let top = max_heap.peek();  // Option<&i32>

// From iterator
let heap: BinaryHeap<i32> = vec![3, 1, 4].into_iter().collect();

// Into sorted vec (ascending for max heap)
let sorted: Vec<i32> = heap.into_sorted_vec();
```

### Custom Priority

```rust
use std::collections::BinaryHeap;
use std::cmp::Ordering;

#[derive(Eq, PartialEq)]
struct Task {
    priority: i32,
    name: String,
}

// Implement Ord for custom ordering
impl Ord for Task {
    fn cmp(&self, other: &Self) -> Ordering {
        // Reverse for min-heap behavior
        other.priority.cmp(&self.priority)
    }
}

impl PartialOrd for Task {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

let mut tasks: BinaryHeap<Task> = BinaryHeap::new();
tasks.push(Task { priority: 3, name: "low".into() });
tasks.push(Task { priority: 1, name: "high".into() });
// pop() returns "high" (lowest priority value due to reverse)
```

---

## BTreeMap & BTreeSet

Sorted collections using a B-Tree. O(log n) operations.

```rust
use std::collections::{BTreeMap, BTreeSet};

// BTreeMap - sorted by key
let mut map: BTreeMap<i32, &str> = BTreeMap::new();
map.insert(3, "three");
map.insert(1, "one");
map.insert(2, "two");

// Iteration is in sorted order
for (k, v) in &map {
    println!("{}: {}", k, v);  // 1: one, 2: two, 3: three
}

// Range queries
for (k, v) in map.range(1..3) { }  // Keys 1, 2

// First/last
map.first_key_value();      // Some((&1, &"one"))
map.last_key_value();       // Some((&3, &"three"))

// BTreeSet - sorted set
let mut set: BTreeSet<i32> = BTreeSet::new();
set.insert(3);
set.insert(1);
set.insert(2);

// Range
for &x in set.range(1..=2) { }  // 1, 2

// First/last
set.first();                // Some(&1)
set.last();                 // Some(&3)
```

---

## LinkedList

Generally avoid in Rust — Vec is usually better. Use only when O(1) middle insertion is critical.

```rust
use std::collections::LinkedList;

let mut list: LinkedList<i32> = LinkedList::new();

list.push_back(1);
list.push_front(0);
let front = list.pop_front();
let back = list.pop_back();

// Limited operations — can't get element by index efficiently
```

---

## Custom Structs for Interviews

### Stack

```rust
// Use Vec as stack
let mut stack: Vec<i32> = Vec::new();
stack.push(1);              // Push
let top = stack.pop();      // Pop
let top = stack.last();     // Peek
stack.is_empty();           // Empty check
```

### Queue

```rust
use std::collections::VecDeque;

let mut queue: VecDeque<i32> = VecDeque::new();
queue.push_back(1);         // Enqueue
let front = queue.pop_front(); // Dequeue
let front = queue.front();  // Peek
```

### TreeNode (Binary Tree)

```rust
use std::rc::Rc;
use std::cell::RefCell;

type TreeLink = Option<Rc<RefCell<TreeNode>>>;

#[derive(Debug)]
struct TreeNode {
    val: i32,
    left: TreeLink,
    right: TreeLink,
}

impl TreeNode {
    fn new(val: i32) -> Rc<RefCell<Self>> {
        Rc::new(RefCell::new(TreeNode {
            val,
            left: None,
            right: None,
        }))
    }
}

// Usage
let root = TreeNode::new(1);
root.borrow_mut().left = Some(TreeNode::new(2));
root.borrow_mut().right = Some(TreeNode::new(3));
```

### ListNode (Linked List)

```rust
// For interview problems, often use Box
#[derive(Debug)]
struct ListNode {
    val: i32,
    next: Option<Box<ListNode>>,
}

impl ListNode {
    fn new(val: i32) -> Self {
        ListNode { val, next: None }
    }
}

// Building a list
let mut head = Some(Box::new(ListNode::new(1)));
head.as_mut().unwrap().next = Some(Box::new(ListNode::new(2)));
```

---

## Implementing Iterator

Create custom iterators for interview solutions.

```rust
struct Counter {
    current: i32,
    max: i32,
}

impl Counter {
    fn new(max: i32) -> Self {
        Counter { current: 0, max }
    }
}

impl Iterator for Counter {
    type Item = i32;

    fn next(&mut self) -> Option<Self::Item> {
        if self.current < self.max {
            self.current += 1;
            Some(self.current)
        } else {
            None
        }
    }
}

// Usage
let counter = Counter::new(5);
for n in counter {
    println!("{}", n);  // 1, 2, 3, 4, 5
}

// As iterator chain
let sum: i32 = Counter::new(5).sum();  // 15
```

---

## Graph Representations

### Adjacency List (Most Common)

```rust
use std::collections::HashMap;

// Using Vec<Vec<usize>> for dense graphs with node indices 0..n
let mut graph: Vec<Vec<usize>> = vec![vec![]; n];
graph[0].push(1);  // Edge from 0 to 1
graph[1].push(0);  // Edge from 1 to 0 (undirected)

// Using HashMap for sparse graphs or non-integer nodes
let mut graph: HashMap<i32, Vec<i32>> = HashMap::new();
graph.entry(0).or_default().push(1);

// Weighted graph
let mut graph: Vec<Vec<(usize, i32)>> = vec![vec![]; n];
graph[0].push((1, 10));  // Edge from 0 to 1 with weight 10
```

### Edge List

```rust
// Simple for edge-based algorithms (Kruskal's, etc.)
struct Edge {
    from: usize,
    to: usize,
    weight: i32,
}

let edges: Vec<Edge> = vec![
    Edge { from: 0, to: 1, weight: 10 },
    Edge { from: 1, to: 2, weight: 20 },
];
```

### Adjacency Matrix

```rust
// Use for dense graphs or when O(1) edge lookup is needed
let mut matrix: Vec<Vec<bool>> = vec![vec![false; n]; n];
matrix[0][1] = true;  // Edge from 0 to 1

// Weighted
let mut matrix: Vec<Vec<i32>> = vec![vec![0; n]; n];
matrix[0][1] = 10;
```

---

## Complexity Reference

### Vec Operations

| Operation | Time | Notes |
|-----------|------|-------|
| `push` | O(1)* | Amortized |
| `pop` | O(1) | |
| `insert(i)` | O(n) | Shifts elements |
| `remove(i)` | O(n) | Shifts elements |
| `swap_remove` | O(1) | Doesn't preserve order |
| `get(i)` / `[i]` | O(1) | |
| `contains` | O(n) | Linear search |
| `binary_search` | O(log n) | Requires sorted |
| `sort` | O(n log n) | |
| `sort_unstable` | O(n log n) | Faster, no stability |

### HashMap Operations

| Operation | Average | Worst |
|-----------|---------|-------|
| `insert` | O(1) | O(n) |
| `get` | O(1) | O(n) |
| `remove` | O(1) | O(n) |
| `contains_key` | O(1) | O(n) |

### BinaryHeap Operations

| Operation | Time |
|-----------|------|
| `push` | O(log n) |
| `pop` | O(log n) |
| `peek` | O(1) |

### BTreeMap Operations

| Operation | Time |
|-----------|------|
| `insert` | O(log n) |
| `get` | O(log n) |
| `remove` | O(log n) |
| `range` | O(log n + k) |

### Collection Comparison

| Collection | Use Case |
|------------|----------|
| `Vec` | Default choice, dynamic array |
| `VecDeque` | Queue, double-ended access |
| `HashMap` | Fast key-value lookup |
| `HashSet` | Fast membership test |
| `BinaryHeap` | Priority queue |
| `BTreeMap` | Sorted key-value, range queries |
| `BTreeSet` | Sorted set, range queries |
| `String` | Owned text |
| `&str` | Borrowed text |

---

**Next:** [04-interview-patterns.md](04-interview-patterns.md) — Algorithm patterns in idiomatic Rust
