# Ownership and Borrowing

> The 80/20 of Rust's core concept — master this, and everything else follows

Ownership is what makes Rust unique. It's the system that guarantees memory safety without a garbage collector. Understanding ownership is the key to writing correct Rust code and acing Rust interviews.

---

## Table of Contents

1. [The Three Ownership Rules](#the-three-ownership-rules)
2. [Move Semantics](#move-semantics)
3. [Clone vs Copy](#clone-vs-copy)
4. [Borrowing](#borrowing)
5. [The Two Borrowing Rules](#the-two-borrowing-rules)
6. [Lifetimes](#lifetimes)
7. [Lifetime Elision Rules](#lifetime-elision-rules)
8. [Smart Pointers](#smart-pointers)
9. [Interior Mutability](#interior-mutability)
10. [Common Patterns in Interviews](#common-patterns-in-interviews)
11. [Common Compiler Errors & Fixes](#common-compiler-errors--fixes)

---

## The Three Ownership Rules

Memorize these three rules — they govern all of Rust:

1. **Each value has exactly one owner**
2. **When the owner goes out of scope, the value is dropped**
3. **There can only be one owner at a time**

```rust
fn main() {
    let s1 = String::from("hello");  // s1 owns the String
    let s2 = s1;                      // Ownership moves to s2
    // println!("{}", s1);            // Error! s1 no longer valid
    println!("{}", s2);               // OK: s2 is the owner
}   // s2 goes out of scope, String is dropped (freed)
```

### Why Ownership Matters

```
Stack                    Heap
┌─────────────┐         ┌───────────────┐
│ s1 (moved)  │    ╳    │ "hello"       │
├─────────────┤         └───────────────┘
│ s2          │────────────────┘
│ ptr: ───────┼────────────────┘
│ len: 5      │
│ cap: 5      │
└─────────────┘

After move: Only s2 has a valid pointer. No double-free possible.
```

---

## Move Semantics

When you assign or pass a value, ownership **moves** by default (for non-Copy types):

```rust
fn take_ownership(s: String) {
    println!("{}", s);
}   // s is dropped here

fn main() {
    let s = String::from("hello");
    take_ownership(s);         // s is moved into the function
    // println!("{}", s);      // Error! s is no longer valid
}
```

### Returning Ownership

Functions can return ownership:

```rust
fn give_ownership() -> String {
    String::from("hello")      // Ownership is returned
}

fn take_and_give_back(s: String) -> String {
    s                          // Ownership is returned
}

fn main() {
    let s1 = give_ownership();
    let s2 = String::from("world");
    let s3 = take_and_give_back(s2);
    // s2 is invalid, s3 is valid
}
```

### Move in Collections

```rust
let v = vec![String::from("a"), String::from("b")];

// This moves OUT of the vector - v[0] is now invalid
// let s = v[0];  // Error: cannot move out of index

// Solutions:
let s = v[0].clone();           // Clone the value
let s = &v[0];                  // Borrow instead
let s = v.into_iter().next();   // Consume the vector
```

---

## Clone vs Copy

### Copy Trait

Types that implement `Copy` are duplicated on assignment (no move):

```rust
let x = 5;
let y = x;      // x is copied, not moved
println!("{} {}", x, y);  // Both valid!

// Copy types include:
// - All integers (i32, u64, etc.)
// - All floats (f32, f64)
// - bool
// - char
// - Tuples of Copy types: (i32, i32)
// - Arrays of Copy types: [i32; 5]
// - References: &T
```

### Clone Trait

For non-Copy types, use `.clone()` to explicitly duplicate:

```rust
let s1 = String::from("hello");
let s2 = s1.clone();           // Explicit deep copy
println!("{} {}", s1, s2);     // Both valid!

// Clone creates a full copy:
// - Heap allocation for s2
// - Copies all bytes from s1's buffer
// - s1 and s2 are independent
```

### When to Clone

```rust
// Clone when you need independent copies
let mut data = original.clone();
data.modify();  // Doesn't affect original

// Avoid cloning in hot loops (performance)
// Prefer borrowing when possible
for item in &collection {  // Borrow, don't clone
    process(item);
}
```

---

## Borrowing

Borrowing lets you access data without taking ownership:

### Immutable Borrowing (`&T`)

```rust
fn calculate_length(s: &String) -> usize {
    s.len()
}   // s goes out of scope, but doesn't drop the String

fn main() {
    let s = String::from("hello");
    let len = calculate_length(&s);  // Borrow s
    println!("{} has length {}", s, len);  // s still valid!
}
```

### Mutable Borrowing (`&mut T`)

```rust
fn append_world(s: &mut String) {
    s.push_str(" world");
}

fn main() {
    let mut s = String::from("hello");
    append_world(&mut s);
    println!("{}", s);  // "hello world"
}
```

### Borrowing Rules Visualized

```
Immutable borrows (&T):
┌──────────────────────────────────────────┐
│ let r1 = &s;    // OK                    │
│ let r2 = &s;    // OK - multiple allowed │
│ let r3 = &s;    // OK                    │
│ println!("{} {} {}", r1, r2, r3);        │
└──────────────────────────────────────────┘

Mutable borrow (&mut T):
┌──────────────────────────────────────────┐
│ let r1 = &mut s;  // OK                  │
│ // let r2 = &mut s;  // Error! Only one  │
│ // let r3 = &s;      // Error! Can't mix │
│ r1.push_str("!");                        │
└──────────────────────────────────────────┘
```

---

## The Two Borrowing Rules

1. **You can have either:**
   - Any number of immutable references (`&T`), OR
   - Exactly one mutable reference (`&mut T`)

2. **References must always be valid** (no dangling references)

```rust
// Rule 1 examples:

// OK: Multiple immutable borrows
let r1 = &s;
let r2 = &s;
println!("{} {}", r1, r2);

// OK: Single mutable borrow
let r = &mut s;
r.push_str("!");

// Error: Can't have mutable and immutable at same time
let r1 = &s;
let r2 = &mut s;  // Error while r1 is still in use
println!("{}", r1);
```

### Non-Lexical Lifetimes (NLL)

Rust's borrow checker is smart — references end at last use, not at scope end:

```rust
let mut s = String::from("hello");

let r1 = &s;
let r2 = &s;
println!("{} {}", r1, r2);
// r1 and r2 are no longer used after this point

let r3 = &mut s;  // OK! r1 and r2 are "dead"
r3.push_str(" world");
```

---

## Lifetimes

Lifetimes ensure references don't outlive the data they point to.

### The Problem

```rust
fn longest(x: &str, y: &str) -> &str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}
// Error: missing lifetime specifier
// Compiler doesn't know if return value lives as long as x or y
```

### The Solution: Lifetime Annotations

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}
// 'a means: the return value lives at least as long as
// both x and y (the shorter of the two lifetimes)
```

### Using Functions with Lifetimes

```rust
fn main() {
    let s1 = String::from("long string");
    let result;
    {
        let s2 = String::from("xyz");
        result = longest(&s1, &s2);
        println!("Longest: {}", result);  // OK: s2 still alive
    }
    // println!("{}", result);  // Error: s2 is dead, result might point to it
}
```

### Lifetime Annotations in Structs

```rust
// Struct that holds a reference needs lifetime annotation
struct ImportantExcerpt<'a> {
    part: &'a str,
}

impl<'a> ImportantExcerpt<'a> {
    fn level(&self) -> i32 {
        3
    }

    fn announce(&self, announcement: &str) -> &str {
        println!("Attention: {}", announcement);
        self.part
    }
}

fn main() {
    let novel = String::from("Call me Ishmael. Some years ago...");
    let first_sentence = novel.split('.').next().unwrap();
    let excerpt = ImportantExcerpt { part: first_sentence };
    // excerpt cannot outlive novel
}
```

### Static Lifetime

`'static` means the reference lives for the entire program:

```rust
let s: &'static str = "hello";  // String literals are 'static

// Beware: 'static in trait bounds often means "owned or 'static"
fn process<T: 'static>(data: T) {
    // T owns its data or has only 'static references
}
```

---

## Lifetime Elision Rules

The compiler infers lifetimes in common cases. You don't need to write them:

### Rule 1: Each reference parameter gets its own lifetime

```rust
fn foo(x: &str, y: &str)
// becomes
fn foo<'a, 'b>(x: &'a str, y: &'b str)
```

### Rule 2: If exactly one input lifetime, it's assigned to all outputs

```rust
fn foo(x: &str) -> &str
// becomes
fn foo<'a>(x: &'a str) -> &'a str
```

### Rule 3: If `&self` or `&mut self`, its lifetime is assigned to outputs

```rust
impl MyStruct {
    fn get_part(&self) -> &str
    // becomes
    fn get_part<'a>(&'a self) -> &'a str
}
```

### When You MUST Annotate

```rust
// Multiple input references with output reference
fn longest(x: &str, y: &str) -> &str  // Error: ambiguous
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str  // OK

// Struct holding references
struct Holder<'a> { data: &'a str }  // Required
```

---

## Smart Pointers

Smart pointers provide additional capabilities beyond references.

### `Box<T>` — Heap Allocation

```rust
// Allocate on heap
let b = Box::new(5);
println!("{}", b);  // Dereferences automatically

// Use cases:
// 1. Large data you don't want to copy
let large_data = Box::new([0u8; 1_000_000]);

// 2. Recursive types
enum List {
    Cons(i32, Box<List>),
    Nil,
}
let list = List::Cons(1, Box::new(List::Cons(2, Box::new(List::Nil))));

// 3. Trait objects
let animal: Box<dyn Animal> = Box::new(Dog {});
```

### `Rc<T>` — Reference Counting

```rust
use std::rc::Rc;

// Multiple owners of the same data
let a = Rc::new(String::from("hello"));
let b = Rc::clone(&a);  // Doesn't deep copy, just increments count
let c = Rc::clone(&a);

println!("Count: {}", Rc::strong_count(&a));  // 3

// When all Rc pointers go out of scope, data is dropped
```

### `Arc<T>` — Atomic Reference Counting

```rust
use std::sync::Arc;

// Thread-safe version of Rc
let data = Arc::new(vec![1, 2, 3]);

let data_clone = Arc::clone(&data);
std::thread::spawn(move || {
    println!("{:?}", data_clone);
});
```

### `RefCell<T>` — Interior Mutability

```rust
use std::cell::RefCell;

// Mutable borrow checked at runtime, not compile time
let data = RefCell::new(5);

{
    let mut borrowed = data.borrow_mut();
    *borrowed += 1;
}

println!("{}", data.borrow());  // 6

// Panic if borrowing rules violated at runtime!
// let r1 = data.borrow();
// let r2 = data.borrow_mut();  // Panic! Already borrowed immutably
```

### Common Combinations

```rust
// Rc<RefCell<T>> — Multiple owners with mutation
use std::rc::Rc;
use std::cell::RefCell;

let shared = Rc::new(RefCell::new(vec![1, 2, 3]));
let shared2 = Rc::clone(&shared);

shared.borrow_mut().push(4);
shared2.borrow_mut().push(5);
println!("{:?}", shared.borrow());  // [1, 2, 3, 4, 5]

// Arc<Mutex<T>> — Thread-safe shared mutation
use std::sync::{Arc, Mutex};

let counter = Arc::new(Mutex::new(0));
```

---

## Interior Mutability

Interior mutability allows mutation through immutable references.

### `Cell<T>` — For Copy Types

```rust
use std::cell::Cell;

struct Counter {
    value: Cell<i32>,
}

impl Counter {
    fn increment(&self) {  // Note: &self, not &mut self
        self.value.set(self.value.get() + 1);
    }
}

let counter = Counter { value: Cell::new(0) };
counter.increment();
counter.increment();
println!("{}", counter.value.get());  // 2
```

### `RefCell<T>` — For Any Type

```rust
use std::cell::RefCell;

struct Cache {
    data: RefCell<Vec<String>>,
}

impl Cache {
    fn add(&self, item: String) {  // &self, not &mut self
        self.data.borrow_mut().push(item);
    }
}
```

### When to Use Each

| Type | Use Case |
|------|----------|
| `Cell<T>` | Small Copy types, no borrowing needed |
| `RefCell<T>` | Complex types, need to borrow |
| `Mutex<T>` | Thread-safe interior mutability |
| `RwLock<T>` | Thread-safe, many readers or one writer |

---

## Common Patterns in Interviews

### Pattern 1: Return Index Instead of Reference

```rust
// Problem: Can't return reference to local data
fn find_index(v: &[i32], target: i32) -> Option<usize> {
    v.iter().position(|&x| x == target)
}

// Use the index later
if let Some(i) = find_index(&nums, 5) {
    println!("Found at index {}", i);
    // Can still use nums[i]
}
```

### Pattern 2: Clone to Avoid Borrow Issues

```rust
// When iterating and modifying
let mut items: Vec<String> = get_items();

// Clone keys to avoid borrowing issues
let keys: Vec<String> = items.iter().cloned().collect();
for key in keys {
    if should_remove(&key) {
        items.retain(|x| x != &key);
    }
}
```

### Pattern 3: Indices for Graph/Tree Problems

```rust
// Instead of references (which cause lifetime issues)
struct Graph {
    nodes: Vec<Node>,
    edges: Vec<(usize, usize)>,  // Indices, not references
}

impl Graph {
    fn neighbors(&self, node: usize) -> Vec<usize> {
        self.edges
            .iter()
            .filter(|(from, _)| *from == node)
            .map(|(_, to)| *to)
            .collect()
    }
}
```

### Pattern 4: Entry API for HashMap

```rust
use std::collections::HashMap;

let mut map: HashMap<String, i32> = HashMap::new();

// Avoid double lookup
*map.entry("key".to_string()).or_insert(0) += 1;

// With custom initialization
map.entry("key".to_string())
    .or_insert_with(|| expensive_computation());
```

### Pattern 5: Iterating with Modification

```rust
// Can't modify while iterating by reference
let mut nums = vec![1, 2, 3, 4, 5];

// Solution 1: Use indices
for i in 0..nums.len() {
    nums[i] *= 2;
}

// Solution 2: iter_mut for in-place modification
for num in nums.iter_mut() {
    *num *= 2;
}

// Solution 3: Collect and replace
nums = nums.into_iter().map(|x| x * 2).collect();
```

---

## Common Compiler Errors & Fixes

### Error: "cannot move out of borrowed content"

```rust
// Problem
fn get_first(v: &Vec<String>) -> String {
    v[0]  // Error: trying to move out of borrowed content
}

// Fix 1: Return a reference
fn get_first(v: &Vec<String>) -> &String {
    &v[0]
}

// Fix 2: Clone
fn get_first(v: &Vec<String>) -> String {
    v[0].clone()
}
```

### Error: "borrowed value does not live long enough"

```rust
// Problem
fn dangling() -> &String {
    let s = String::from("hello");
    &s  // Error: s is dropped at end of function
}

// Fix: Return owned value
fn not_dangling() -> String {
    String::from("hello")
}
```

### Error: "cannot borrow as mutable more than once"

```rust
// Problem
let mut s = String::from("hello");
let r1 = &mut s;
let r2 = &mut s;  // Error!

// Fix: Limit scope of first borrow
let mut s = String::from("hello");
{
    let r1 = &mut s;
    r1.push_str(" world");
}  // r1 goes out of scope
let r2 = &mut s;  // OK now
```

### Error: "cannot borrow as mutable because it is also borrowed as immutable"

```rust
// Problem
let mut v = vec![1, 2, 3];
let first = &v[0];
v.push(4);  // Error: v is borrowed immutably
println!("{}", first);

// Fix: Don't use immutable borrow after mutation
let mut v = vec![1, 2, 3];
let first = v[0];  // Copy the value instead of borrowing
v.push(4);
println!("{}", first);
```

### Error: "use of moved value"

```rust
// Problem
let s = String::from("hello");
let s2 = s;
println!("{}", s);  // Error: s was moved

// Fix 1: Clone
let s = String::from("hello");
let s2 = s.clone();
println!("{}", s);

// Fix 2: Use reference
let s = String::from("hello");
let s2 = &s;
println!("{}", s);
```

---

## Quick Reference: Ownership Decision Tree

```
Do I need to own the data?
├── Yes: Take T (ownership)
│   └── Will I give it back?
│       ├── Yes: fn(x: T) -> T
│       └── No: fn(x: T)
│
└── No: Borrow
    └── Do I need to mutate?
        ├── Yes: &mut T
        └── No: &T
            └── Multiple owners?
                ├── Single thread: Rc<T>
                └── Multi thread: Arc<T>
```

---

## Lifetime Annotation Cheat Sheet

```rust
// No annotation needed (elision)
fn first(s: &str) -> &str { &s[0..1] }

// Annotation needed: multiple inputs
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str

// Struct with reference
struct Excerpt<'a> { part: &'a str }

// Multiple lifetimes
fn complex<'a, 'b>(x: &'a str, y: &'b str) -> &'a str

// Static lifetime
fn static_str() -> &'static str { "hello" }

// Lifetime bounds
fn print<'a, T: 'a>(x: &'a T) where T: Display
```

---

**Next:** [03-data-structures.md](03-data-structures.md) — Standard library collections for interviews
