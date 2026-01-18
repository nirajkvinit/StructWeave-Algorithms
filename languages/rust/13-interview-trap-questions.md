# Rust Interview Trap Questions

> **Reading time**: 75-90 minutes | **Difficulty**: Intermediate to Advanced | **Rust Edition**: 2024

Master the tricky questions interviewers use to test your deep understanding of Rust's ownership system, lifetimes, type system, and concurrency model.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Ownership & Borrowing Traps](#ownership--borrowing-traps)
3. [Lifetime Traps](#lifetime-traps)
4. [Type System Traps](#type-system-traps)
5. [Concurrency Traps](#concurrency-traps)
6. [Memory & Performance Traps](#memory--performance-traps)
7. [Standard Library Traps](#standard-library-traps)
8. [Macro & Compile-Time Traps](#macro--compile-time-traps)
9. [Quick Reference](#quick-reference)

---

## Introduction

These questions are specifically designed to test your understanding of Rust's internal mechanics. They're common in senior-level interviews and help distinguish developers who truly understand the language from those who just use it.

### Why These Questions Matter

| Question Type | What It Tests |
|--------------|---------------|
| Ownership/Borrowing | Memory safety model understanding |
| Lifetimes | Reference validity and scope semantics |
| Send/Sync | Thread safety guarantees |
| Object Safety | Dynamic dispatch limitations |
| NLL | Modern borrow checker behavior |
| Integer Overflow | Debug vs release behavior |

### The Rust Interview Mindset

Rust interviews differ from other languages because:
- **Compile-time guarantees**: Most "trap questions" are about what compiles vs what doesn't
- **Zero-cost abstractions**: Understanding when abstractions have runtime cost
- **Ownership semantics**: Move vs copy vs borrow decisions
- **Unsafe boundaries**: When and why unsafe is needed

---

## Ownership & Borrowing Traps

### Moving Out of Borrowed Content

#### The Trap Question

```rust
fn take(v: Vec<i32>) {
    println!("{:?}", v);
}

fn main() {
    let v = vec![1, 2, 3];
    let r = &v;
    take(v);
    println!("{:?}", r);
}
```

**Does this compile?**

#### The Answer

```
error[E0505]: cannot move out of `v` because it is borrowed
 --> src/main.rs:7:10
  |
6 |     let r = &v;
  |             -- borrow of `v` occurs here
7 |     take(v);
  |          ^ move out of `v` occurs here
8 |     println!("{:?}", r);
  |                      - borrow later used here
```

#### Why This Happens

Rust prevents moving a value while it's borrowed because:
1. `r` holds an immutable reference to `v`
2. `take(v)` attempts to move `v` into the function
3. After the move, `r` would point to deallocated memory
4. The `println!` on line 8 uses `r`, proving the borrow is still active

#### The Correct Approach

```rust
// Option 1: Use the reference before moving
fn main() {
    let v = vec![1, 2, 3];
    let r = &v;
    println!("{:?}", r);  // Use borrow first
    take(v);              // Then move
}

// Option 2: Clone if you need both
fn main() {
    let v = vec![1, 2, 3];
    let r = &v;
    take(v.clone());      // Move a clone
    println!("{:?}", r);  // Original still available
}

// Option 3: Pass by reference
fn take_ref(v: &Vec<i32>) {
    println!("{:?}", v);
}

fn main() {
    let v = vec![1, 2, 3];
    let r = &v;
    take_ref(&v);
    println!("{:?}", r);
}
```

---

### Non-Lexical Lifetimes (NLL) Surprise

#### The Trap Question

```rust
fn main() {
    let mut s = String::from("hello");

    let r1 = &s;
    let r2 = &s;
    println!("{} and {}", r1, r2);

    let r3 = &mut s;
    println!("{}", r3);
}
```

**Does this compile in modern Rust?**

#### The Answer

**Yes, this compiles!** (Since Rust 2018 with NLL)

#### Why This Happens

**Non-Lexical Lifetimes (NLL)** changed how the borrow checker analyzes lifetimes:

- **Before NLL**: Borrows lasted until the end of their lexical scope (the closing `}`)
- **After NLL**: Borrows end at their last use

```rust
let r1 = &s;      // Borrow starts
let r2 = &s;      // Another borrow starts
println!("{} and {}", r1, r2);  // Last use of r1 and r2
                                // Both borrows END here

let r3 = &mut s;  // Mutable borrow starts (no conflict!)
println!("{}", r3);
```

#### The Pre-NLL Version (Would Not Compile)

```rust
// This is what the OLD borrow checker saw:
fn main() {
    let mut s = String::from("hello");

    let r1 = &s;      // ─┐
    let r2 = &s;      //  │ r1 and r2 live until }
    println!("{} and {}", r1, r2);
                      //  │
    let r3 = &mut s;  //  │ ← ERROR: can't borrow mutably
    println!("{}", r3);
}                     // ─┘
```

#### Follow-Up: When NLL Doesn't Help

```rust
fn main() {
    let mut s = String::from("hello");
    let r1 = &s;
    let r2 = &mut s;  // ERROR: r1 still in scope
    println!("{}", r1);  // r1 used after r2 created
}
```

This still fails because `r1` is used *after* `r2` is created.

---

### The Partial Move Trap

#### The Trap Question

```rust
struct Person {
    name: String,
    age: u32,
}

fn main() {
    let person = Person {
        name: String::from("Alice"),
        age: 30,
    };

    let name = person.name;
    println!("Age: {}", person.age);
}
```

**Does this compile?**

#### The Answer

**Yes!** This compiles because Rust allows **partial moves**.

#### Why This Happens

Rust tracks ownership at the field level:
- `person.name` is moved out (String is not Copy)
- `person.age` remains valid (u32 is Copy)
- `person` as a whole cannot be used, but `person.age` can

```rust
let name = person.name;  // person.name moved
// person is now "partially moved"

println!("{}", person.age);  // OK: age is Copy and not moved
// println!("{:?}", person);  // ERROR: person partially moved
// println!("{}", person.name);  // ERROR: name was moved
```

#### The Trap Extension

```rust
fn main() {
    let person = Person {
        name: String::from("Alice"),
        age: 30,
    };

    let name = person.name;

    // Can we create a new Person?
    let person2 = Person {
        name: String::from("Bob"),
        age: person.age,  // This works!
    };
}
```

---

### Self-Referential Struct Impossibility

#### The Trap Question

```rust
struct SelfRef {
    data: String,
    slice: &str,  // Points to data
}

fn create() -> SelfRef {
    let data = String::from("hello");
    SelfRef {
        data,
        slice: &data[..],
    }
}
```

**Why doesn't this compile?**

#### The Answer

```
error[E0106]: missing lifetime specifier
 --> src/main.rs:3:12
  |
3 |     slice: &str,
  |            ^ expected named lifetime parameter
```

And even with lifetimes, it's fundamentally impossible:

```rust
struct SelfRef<'a> {
    data: String,
    slice: &'a str,
}

// This still doesn't work because:
// 1. data is owned by the struct
// 2. slice borrows from data
// 3. When the struct moves, data moves to a new address
// 4. slice would point to the old (invalid) address
```

#### Why This Happens

```
Before move:           After move:
┌─────────────┐        ┌─────────────┐
│ data: "hi"  │───┐    │ data: "hi"  │ (new address)
├─────────────┤   │    ├─────────────┤
│ slice: ptr ─│───┘    │ slice: ptr ─│──→ INVALID!
└─────────────┘        └─────────────┘
     ↑                      ↑
  Original              Moved to new location
  location              (old ptr is dangling)
```

#### The Correct Approaches

**Option 1: Use indices instead of references**
```rust
struct SelfRef {
    data: String,
    start: usize,
    end: usize,
}

impl SelfRef {
    fn slice(&self) -> &str {
        &self.data[self.start..self.end]
    }
}
```

**Option 2: Use `Pin` for self-referential async**
```rust
use std::pin::Pin;
use std::marker::PhantomPinned;

struct SelfRef {
    data: String,
    slice: *const str,  // Raw pointer
    _pin: PhantomPinned,
}

impl SelfRef {
    fn new(data: String) -> Pin<Box<Self>> {
        let res = SelfRef {
            data,
            slice: std::ptr::null(),
            _pin: PhantomPinned,
        };
        let mut boxed = Box::pin(res);

        let slice: *const str = &boxed.data[..];
        unsafe {
            let mut_ref = Pin::as_mut(&mut boxed);
            Pin::get_unchecked_mut(mut_ref).slice = slice;
        }
        boxed
    }
}
```

**Option 3: Use `ouroboros` or `self_cell` crates**
```rust
use ouroboros::self_referencing;

#[self_referencing]
struct SelfRef {
    data: String,
    #[borrows(data)]
    slice: &'this str,
}
```

---

### Return Reference to Local Variable

#### The Trap Question

```rust
fn longest() -> &str {
    let s = String::from("hello");
    &s
}
```

**What's the error?**

#### The Answer

```
error[E0106]: missing lifetime specifier
error[E0515]: cannot return reference to local variable `s`
```

#### Why This Happens

```
Function execution:          After return:
┌──────────────┐
│ s: "hello"   │             (deallocated)
│     ↑        │
│   &s ────────│─→ ???       → Dangling pointer!
└──────────────┘
     Stack frame
     destroyed
```

#### The Correct Approaches

```rust
// Option 1: Return owned data
fn longest() -> String {
    let s = String::from("hello");
    s  // Move ownership out
}

// Option 2: Borrow from input
fn longest<'a>(s: &'a str) -> &'a str {
    s
}

// Option 3: Return static reference
fn longest() -> &'static str {
    "hello"  // String literal has 'static lifetime
}

// Option 4: Use Box for heap allocation
fn longest() -> Box<str> {
    let s = String::from("hello");
    s.into_boxed_str()
}
```

---

### The Reborrow Trap

#### The Trap Question

```rust
fn main() {
    let mut s = String::from("hello");
    let r1 = &mut s;
    let r2 = &mut *r1;  // What happens here?

    r2.push_str(" world");
    println!("{}", r1);
}
```

**Does this compile?**

#### The Answer

**No!** After creating `r2`, you cannot use `r1`.

```
error[E0503]: cannot use `r1` because it was mutably borrowed
```

However, this **does** compile:

```rust
fn main() {
    let mut s = String::from("hello");
    let r1 = &mut s;
    let r2 = &mut *r1;  // Reborrow

    r2.push_str(" world");
    // r1.push_str("!");  // Would fail here
    println!("{}", s);  // But this works!
}
```

#### Why This Happens

`&mut *r1` creates a **reborrow**:
- Temporarily borrows from `r1`
- `r1` is "frozen" while `r2` exists
- After `r2` goes out of use, `r1` becomes usable again

```rust
fn main() {
    let mut s = String::from("hello");
    let r1 = &mut s;

    {
        let r2 = &mut *r1;  // Reborrow starts
        r2.push_str(" world");
    }  // Reborrow ends

    r1.push_str("!");  // r1 usable again
    println!("{}", s);  // "hello world!"
}
```

---

## Lifetime Traps

### Lifetime Elision Surprises

#### The Trap Question

```rust
fn first(s: &str, t: &str) -> &str {
    s
}
```

**Does this compile?**

#### The Answer

**No!**

```
error[E0106]: missing lifetime specifier
 --> src/lib.rs:1:33
  |
1 | fn first(s: &str, t: &str) -> &str {
  |             ----     ----     ^ expected named lifetime parameter
  |
  = help: this function's return type contains a borrowed value,
    but the signature does not say whether it is borrowed from `s` or `t`
```

#### Why This Happens

**Lifetime elision rules** don't apply when there are multiple input references:

1. Each input reference gets its own lifetime
2. If there's exactly ONE input lifetime, it's assigned to outputs
3. If there's `&self` or `&mut self`, that lifetime is assigned to outputs

```rust
// Rule 2 applies (one input):
fn first(s: &str) -> &str  // OK: return gets s's lifetime

// Rule 3 applies (self):
impl Foo {
    fn get(&self, s: &str) -> &str  // OK: return gets self's lifetime
}

// NO rule applies (multiple inputs, no self):
fn first(s: &str, t: &str) -> &str  // ERROR: ambiguous
```

#### The Fix

```rust
// Explicit lifetime annotation
fn first<'a>(s: &'a str, _t: &str) -> &'a str {
    s
}

// Or if both could be returned:
fn first<'a>(s: &'a str, t: &'a str) -> &'a str {
    if s.len() > t.len() { s } else { t }
}
```

---

### The 'static Misconception

#### The Trap Question

```rust
fn needs_static<T: 'static>(t: T) {
    // ...
}

fn main() {
    let s = String::from("hello");
    needs_static(s);  // Does this work?
}
```

**Does the String have `'static` lifetime?**

#### The Answer

**Yes, this compiles!**

#### Why This Happens

`T: 'static` does NOT mean "T must be a static variable" or "T must live forever."

It means: **T contains no non-`'static` references.**

```rust
// These all satisfy T: 'static:
String           // Owns its data, no references
i32              // Primitive, no references
Vec<String>      // Owns its data
Box<dyn Error>   // Owned trait object

// These do NOT satisfy T: 'static:
&str             // Has a lifetime (unless it's &'static str)
&String          // Reference with non-static lifetime
Struct<'a>       // Contains a lifetime parameter
```

#### The Key Insight

```rust
// This is the actual meaning:
T: 'static  ≡  T does not borrow anything with a non-'static lifetime

// NOT:
T: 'static  ≢  T is a static variable
T: 'static  ≢  T lives for the entire program
```

#### Common Use Case

```rust
// Thread spawning requires 'static because threads may outlive their spawner
fn spawn<F, T>(f: F) -> JoinHandle<T>
where
    F: FnOnce() -> T,
    F: Send + 'static,  // Closure can't borrow from spawning scope
    T: Send + 'static,  // Return value can't contain non-static refs
{
    // ...
}

fn main() {
    let s = String::from("hello");

    // This works - s is moved into the closure
    std::thread::spawn(move || {
        println!("{}", s);
    });

    // This fails - s is borrowed, closure is not 'static
    // std::thread::spawn(|| {
    //     println!("{}", s);  // ERROR: s doesn't live long enough
    // });
}
```

---

### Variance and Subtyping

#### The Trap Question

```rust
fn foo<'a>(x: &'a i32, y: &'a i32) -> &'a i32 {
    if *x > *y { x } else { y }
}

fn main() {
    let x = 5;
    let result;
    {
        let y = 10;
        result = foo(&x, &y);
    }
    println!("{}", result);
}
```

**Does this compile?**

#### The Answer

**No!**

```
error[E0597]: `y` does not live long enough
```

#### Why This Happens

Both `x` and `y` must have the SAME lifetime `'a` in the function signature. The compiler picks the **shorter** lifetime:

```rust
fn main() {
    let x = 5;           // 'long lifetime
    let result;
    {
        let y = 10;      // 'short lifetime
        // foo(&x, &y) requires both to have same lifetime
        // Compiler picks 'short (the intersection)
        result = foo(&x, &y);  // result has 'short lifetime
    }  // y and result's validity both end here
    println!("{}", result);  // ERROR: result doesn't live here
}
```

#### The Fix

```rust
// Option 1: Extend y's scope
fn main() {
    let x = 5;
    let y = 10;  // Same scope as x
    let result = foo(&x, &y);
    println!("{}", result);  // Works!
}

// Option 2: Different lifetimes (but can't return y)
fn foo<'a, 'b>(x: &'a i32, _y: &'b i32) -> &'a i32 {
    x  // Can only return x now
}
```

---

### HRTB (Higher-Ranked Trait Bounds)

#### The Trap Question

```rust
fn apply<F>(f: F)
where
    F: Fn(&str) -> &str,
{
    let s = String::from("hello");
    let result = f(&s);
    println!("{}", result);
}
```

**Why doesn't this compile?**

#### The Answer

```
error: implementation of `FnOnce` is not general enough
```

#### Why This Happens

The bound `F: Fn(&str) -> &str` with elided lifetimes becomes:

```rust
F: for<'a> Fn(&'a str) -> &'a str
```

This means: F must work for ANY lifetime `'a`. But within `apply`, we have a specific string with a specific lifetime. The compiler can't prove the closure works for all possible lifetimes.

#### The Fix

Use Higher-Ranked Trait Bounds (HRTB) explicitly:

```rust
fn apply<F>(f: F)
where
    F: for<'a> Fn(&'a str) -> &'a str,
{
    let s = String::from("hello");
    let result = f(&s);
    println!("{}", result);
}

// Or, return owned data:
fn apply<F>(f: F)
where
    F: Fn(&str) -> String,  // No lifetime issues
{
    let s = String::from("hello");
    let result = f(&s);
    println!("{}", result);
}
```

---

## Type System Traps

### Object Safety Rules

#### The Trap Question

```rust
trait Processor {
    fn process<T>(&self, item: T) -> T;
}

fn use_processor(p: &dyn Processor) {
    // ...
}
```

**Why doesn't this compile?**

#### The Answer

```
error[E0038]: the trait `Processor` cannot be made into an object
 --> src/lib.rs:5:21
  |
5 | fn use_processor(p: &dyn Processor) {
  |                     ^^^^^^^^^^^^^^ `Processor` cannot be made into an object
  |
note: for a trait to be "dyn-compatible" it needs to allow building a vtable
      to allow the call to be resolvable dynamically
  |
2 |     fn process<T>(&self, item: T) -> T;
  |                ^ ...because method `process` has generic type parameters
```

#### Why This Happens

Trait objects use **dynamic dispatch** via a vtable. The vtable contains function pointers for each method. But generic methods need different code for each type `T`, so there's no single function pointer to put in the vtable.

```
vtable for dyn Processor:
┌─────────────────────────┐
│ process<i32>: ???       │  ← Which version?
│ process<String>: ???    │  ← There could be infinite!
│ process<Vec<u8>>: ???   │
│ ...                     │
└─────────────────────────┘
```

#### Object Safety Rules

A trait is object-safe (dyn-compatible) if:

1. **No generic methods** (can't create vtable entries)
2. **No `Self` in method signatures** (except as receiver)
3. **No associated constants**
4. **No associated types with generics**
5. **Trait itself doesn't require `Self: Sized`**

```rust
// NOT object-safe examples:
trait NotSafe1 {
    fn generic<T>(&self);  // Generic method
}

trait NotSafe2 {
    fn returns_self(&self) -> Self;  // Self in return
}

trait NotSafe3 {
    fn compare(&self, other: Self);  // Self in parameter
}

trait NotSafe4: Sized {  // Requires Sized
    fn method(&self);
}

// Object-safe version:
trait Safe {
    fn process(&self, item: &dyn std::any::Any);
    fn clone_box(&self) -> Box<dyn Safe>;
}
```

#### The Fix

```rust
// Option 1: Use associated types instead of generics
trait Processor {
    type Item;
    fn process(&self, item: Self::Item) -> Self::Item;
}

// Option 2: Use &dyn Any for runtime type handling
trait Processor {
    fn process(&self, item: Box<dyn std::any::Any>) -> Box<dyn std::any::Any>;
}

// Option 3: Separate object-safe and generic parts
trait ProcessorBase {
    fn name(&self) -> &str;  // Object-safe
}

trait Processor: ProcessorBase {
    fn process<T>(&self, item: T) -> T;  // Not object-safe
}
```

---

### Static vs Dynamic Dispatch

#### The Trap Question

```rust
fn process_static(item: impl Display) {
    println!("{}", item);
}

fn process_dynamic(item: &dyn Display) {
    println!("{}", item);
}
```

**What's the difference in generated code?**

#### The Answer

| Aspect | `impl Trait` (Static) | `dyn Trait` (Dynamic) |
|--------|----------------------|----------------------|
| Dispatch | Compile-time | Runtime (vtable) |
| Code size | Larger (monomorphization) | Smaller (single fn) |
| Performance | Faster (inlining possible) | Slower (indirect call) |
| Flexibility | Homogeneous only | Heterogeneous collections |

#### Why This Matters

```rust
// Static dispatch: Compiler generates TWO functions
fn process_static<T: Display>(item: T) { ... }

// Calling with different types:
process_static(42i32);      // Generates process_static::<i32>
process_static("hello");    // Generates process_static::<&str>

// Dynamic dispatch: ONE function, vtable lookup
fn process_dynamic(item: &dyn Display) { ... }

// Calling with different types:
process_dynamic(&42i32);    // Same function, vtable for i32
process_dynamic(&"hello");  // Same function, vtable for &str
```

#### When to Use Each

```rust
// Use impl Trait / generics when:
// - Performance is critical
// - You need the concrete type
// - All items are the same type

fn fastest<I: Iterator<Item = i32>>(iter: I) -> i32 {
    iter.sum()
}

// Use dyn Trait when:
// - You need heterogeneous collections
// - Binary size matters
// - Compile times are a concern

fn handlers() -> Vec<Box<dyn Fn()>> {
    vec![
        Box::new(|| println!("handler 1")),
        Box::new(|| println!("handler 2")),
    ]
}
```

---

### The Orphan Rule Trap

#### The Trap Question

```rust
// In your crate:
impl std::fmt::Display for Vec<i32> {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}
```

**Why doesn't this compile?**

#### The Answer

```
error[E0117]: only traits defined in the current crate can be implemented
              for types defined outside of the crate
```

#### Why This Happens

The **orphan rule** prevents implementing external traits on external types:

```
Your crate:              std crate:
┌─────────────┐          ┌─────────────┐
│             │    ✗     │ Display     │
│             │ ←────────│ Vec<T>      │
│             │          │             │
└─────────────┘          └─────────────┘

Can't implement Display (from std) on Vec (from std)
```

This prevents conflicts: what if two crates both implemented `Display` for `Vec<i32>`?

#### The Fix: Newtype Pattern

```rust
// Wrap the external type in your own type
struct MyVec(Vec<i32>);

impl std::fmt::Display for MyVec {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "[")?;
        for (i, item) in self.0.iter().enumerate() {
            if i > 0 { write!(f, ", ")?; }
            write!(f, "{}", item)?;
        }
        write!(f, "]")
    }
}

// Use Deref for transparent access
impl std::ops::Deref for MyVec {
    type Target = Vec<i32>;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
```

---

### Associated Types vs Generic Parameters

#### The Trap Question

```rust
// Version 1: Generic parameter
trait Container<T> {
    fn get(&self) -> &T;
}

// Version 2: Associated type
trait Container {
    type Item;
    fn get(&self) -> &Self::Item;
}
```

**When should you use each?**

#### The Answer

| Generic Parameter | Associated Type |
|------------------|-----------------|
| Multiple impls per type possible | One impl per type |
| Type specified by caller | Type determined by implementor |
| `Container<i32>`, `Container<String>` | `Container` (Item = i32) |

#### Examples

```rust
// Generic: A type can implement for MULTIPLE type parameters
struct Wrapper<T>(T);

impl<T> Container<T> for Wrapper<T> {
    fn get(&self) -> &T { &self.0 }
}
// Wrapper<i32> implements Container<i32>
// Wrapper<String> implements Container<String>

// Associated: A type implements ONCE, determining its Item
impl Container for Vec<i32> {
    type Item = i32;
    fn get(&self) -> &Self::Item { &self[0] }
}
// Vec<i32> has Item = i32, period.
```

#### The Iterator Example

```rust
// Iterator uses associated type because:
// 1. A type should produce ONE kind of item
// 2. Caller doesn't need to specify the item type

pub trait Iterator {
    type Item;  // Associated type
    fn next(&mut self) -> Option<Self::Item>;
}

// Using it is cleaner:
fn sum<I: Iterator<Item = i32>>(iter: I) -> i32 { ... }

// vs with generics:
fn sum<T, I: Iterator<T>>(iter: I) -> i32 { ... }  // T is redundant
```

---

## Concurrency Traps

### Send and Sync Confusion

#### The Trap Question

```rust
use std::rc::Rc;
use std::cell::RefCell;
use std::sync::{Arc, Mutex};

// Which of these can be sent to another thread?
let a: Rc<i32> = Rc::new(5);
let b: RefCell<i32> = RefCell::new(5);
let c: Arc<i32> = Arc::new(5);
let d: Mutex<i32> = Mutex::new(5);
```

#### The Answer

| Type | Send? | Sync? | Why |
|------|-------|-------|-----|
| `Rc<i32>` | No | No | Non-atomic reference counting |
| `RefCell<i32>` | Yes | No | Runtime borrow checking isn't thread-safe |
| `Arc<i32>` | Yes | Yes | Atomic reference counting |
| `Mutex<i32>` | Yes | Yes | Thread-safe interior mutability |

#### Why This Happens

**Send**: Can ownership be transferred to another thread?
- `Rc`: No, because two threads could drop simultaneously, corrupting the count

**Sync**: Can `&T` be shared between threads?
- `RefCell`: No, because two threads could call `borrow_mut()` simultaneously

```rust
// Rc is not Send because:
let rc1 = Rc::new(5);
let rc2 = Rc::clone(&rc1);

// If both threads drop simultaneously:
// Thread 1: reads count (2), decrements to 1
// Thread 2: reads count (2), decrements to 1
// Result: count is 1, but should be 0!

// RefCell is not Sync because:
let cell = RefCell::new(5);
let ref1 = &cell;
let ref2 = &cell;

// Thread 1: ref1.borrow_mut() - gets mutable access
// Thread 2: ref2.borrow_mut() - also gets mutable access!
// Result: Two mutable references = undefined behavior
```

#### The Key Formulas

```rust
T: Send     ≡  T can be moved to another thread
T: Sync     ≡  &T can be sent to another thread
T: Sync     ≡  &T: Send
Arc<T>: Send ≡  T: Send + Sync
```

---

### Arc<Mutex<T>> vs Mutex<Arc<T>>

#### The Trap Question

```rust
// Version 1
let data1: Arc<Mutex<Vec<i32>>> = Arc::new(Mutex::new(vec![]));

// Version 2
let data2: Mutex<Arc<Vec<i32>>> = Mutex::new(Arc::new(vec![]));
```

**Which is correct for shared mutable state?**

#### The Answer

**Version 1: `Arc<Mutex<T>>`** is correct for shared mutable state.

#### Why This Happens

```
Arc<Mutex<T>>:
┌────────────────────────────────────┐
│          Arc (shared ownership)     │
│  ┌────────────────────────────────┐ │
│  │    Mutex (exclusive access)     │ │
│  │  ┌────────────────────────────┐ │ │
│  │  │         Data (T)           │ │ │
│  │  └────────────────────────────┘ │ │
│  └────────────────────────────────┘ │
└────────────────────────────────────┘
Share the Arc, lock the Mutex, access data ✓

Mutex<Arc<T>>:
┌────────────────────────────────────┐
│        Mutex (exclusive access)     │
│  ┌────────────────────────────────┐ │
│  │      Arc (shared ownership)     │ │
│  │  ┌────────────────────────────┐ │ │
│  │  │         Data (T)           │ │ │
│  │  └────────────────────────────┘ │ │
│  └────────────────────────────────┘ │
└────────────────────────────────────┘
Lock first, then get shared access to immutable data... useless for mutation!
```

#### Correct Usage

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);  // Clone Arc
        let handle = thread::spawn(move || {
            let mut num = counter.lock().unwrap();  // Lock Mutex
            *num += 1;  // Mutate
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Result: {}", *counter.lock().unwrap());  // 10
}
```

---

### Blocking in Async

#### The Trap Question

```rust
async fn fetch_and_process() -> Result<(), Box<dyn std::error::Error>> {
    let data = fetch_data().await?;

    // Process data (CPU-intensive)
    let result = std::thread::sleep(std::time::Duration::from_secs(5));

    save_result(result).await?;
    Ok(())
}
```

**What's wrong with this code?**

#### The Answer

`std::thread::sleep` **blocks the entire async runtime thread**, preventing other tasks from running!

#### Why This Happens

```
Async Runtime (single thread):
┌────────────────────────────────────────────┐
│  Task 1        Task 2        Task 3        │
│    ↓             ↓             ↓           │
│  fetch()      fetch()       fetch()        │
│    ↓                                       │
│  BLOCKED ██████████████████████████████    │
│  (5 seconds - nothing else can run!)       │
│                                            │
│  Tasks 2 & 3 are STARVED                   │
└────────────────────────────────────────────┘
```

#### The Fix

```rust
// Option 1: Use async sleep
async fn fetch_and_process() -> Result<(), Box<dyn std::error::Error>> {
    let data = fetch_data().await?;

    tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;  // Non-blocking!

    save_result(result).await?;
    Ok(())
}

// Option 2: For CPU-intensive work, use spawn_blocking
async fn fetch_and_process() -> Result<(), Box<dyn std::error::Error>> {
    let data = fetch_data().await?;

    // Run CPU-intensive work on a separate thread pool
    let result = tokio::task::spawn_blocking(move || {
        heavy_computation(data)  // Runs on blocking thread pool
    }).await?;

    save_result(result).await?;
    Ok(())
}
```

---

### Holding MutexGuard Across Await

#### The Trap Question

```rust
use tokio::sync::Mutex;

async fn increment(counter: &Mutex<i32>) {
    let mut guard = counter.lock().await;
    *guard += 1;

    do_async_work().await;  // Some async operation

    *guard += 1;  // Modify again
}
```

**What's the problem?**

#### The Answer

The `MutexGuard` is held **across an await point**, which can cause:
1. **Deadlocks**: If the same task tries to lock again
2. **Long lock holding**: Other tasks can't acquire the lock while awaiting
3. **Send issues**: `MutexGuard` from `std::sync::Mutex` is not `Send`

#### Why This Happens

```
Task 1:                          Task 2:
lock()
  ↓
*guard += 1
  ↓
do_async_work().await ───────→   Tries lock() - BLOCKED!
  │                              │
  │  (Task 1 is suspended        │
  │   holding the lock)          │
  │                              │
  ↓                              │
*guard += 1                      │ Still waiting...
unlock()                         │
                                 ↓
                                 Finally gets lock
```

#### The Fix

```rust
// Option 1: Release lock before await
async fn increment(counter: &Mutex<i32>) {
    {
        let mut guard = counter.lock().await;
        *guard += 1;
    }  // Lock released here

    do_async_work().await;

    {
        let mut guard = counter.lock().await;
        *guard += 1;
    }
}

// Option 2: Use tokio::sync::Mutex (designed for async)
use tokio::sync::Mutex;  // NOT std::sync::Mutex

async fn increment(counter: &Mutex<i32>) {
    let mut guard = counter.lock().await;
    *guard += 1;
    // tokio's Mutex is designed for holding across awaits
    // (but still avoid if possible)
}

// Option 3: Use atomic operations
use std::sync::atomic::{AtomicI32, Ordering};

async fn increment(counter: &AtomicI32) {
    counter.fetch_add(1, Ordering::SeqCst);
    do_async_work().await;
    counter.fetch_add(1, Ordering::SeqCst);
}
```

---

## Memory & Performance Traps

### Hidden Allocations

#### The Trap Question

```rust
fn process(s: &str) -> String {
    s.to_string()    // A
}

fn process2(s: &str) -> String {
    s.to_owned()     // B
}

fn process3(s: &str) -> String {
    String::from(s)  // C
}

fn process4(s: String) -> String {
    s.into()         // D
}
```

**Which ones allocate?**

#### The Answer

| Method | Allocates? | Notes |
|--------|------------|-------|
| A: `to_string()` | Yes | Formats and allocates |
| B: `to_owned()` | Yes | Clones borrowed data |
| C: `String::from()` | Yes | Creates new String |
| D: `into()` | **No** | Just type conversion (no-op) |

#### The Hidden Allocation Trap

```rust
// Subtle allocation difference:
let s: String = "hello".to_string();  // Allocates
let s: String = "hello".to_owned();   // Allocates
let s: String = "hello".into();       // Allocates (from &str)

// But:
let s = String::from("hello");
let s2: String = s.into();  // NO allocation! Just moves

// Watch out for these:
format!("{}", x)           // Always allocates
x.to_string()              // Allocates (uses Display)
[1,2,3].to_vec()           // Allocates
slice.to_owned()           // Allocates
```

---

### String vs &str vs Cow<str>

#### The Trap Question

```rust
fn greet(name: &str) -> String {
    if name.is_empty() {
        String::from("Hello, stranger!")
    } else {
        format!("Hello, {}!", name)
    }
}
```

**Can we avoid the allocation when name is empty?**

#### The Answer

Use `Cow<str>` (Clone on Write):

```rust
use std::borrow::Cow;

fn greet(name: &str) -> Cow<'static, str> {
    if name.is_empty() {
        Cow::Borrowed("Hello, stranger!")  // No allocation!
    } else {
        Cow::Owned(format!("Hello, {}!", name))  // Only allocates when needed
    }
}
```

#### Cow Explained

```rust
enum Cow<'a, T: ToOwned + ?Sized> {
    Borrowed(&'a T),    // Just a reference, no allocation
    Owned(T::Owned),    // Owned data, allocated
}

// Usage:
let borrowed: Cow<str> = Cow::Borrowed("static string");  // No alloc
let owned: Cow<str> = Cow::Owned(String::from("owned"));  // Allocated

// Cow implements Deref, so you can use it like &str:
fn print_cow(s: &Cow<str>) {
    println!("{}", s);  // Works like &str
}
```

#### When to Use Each

| Type | Use When |
|------|----------|
| `&str` | Just reading, don't need ownership |
| `String` | Need to own or modify the string |
| `Cow<str>` | Sometimes borrow, sometimes own (optimization) |

---

### Vec Capacity vs Length

#### The Trap Question

```rust
let mut v = Vec::with_capacity(100);
println!("Length: {}", v.len());
println!("Capacity: {}", v.capacity());

// Can we access v[0]?
```

#### The Answer

```
Length: 0
Capacity: 100
```

**No, `v[0]` would panic!** The vector has capacity for 100 elements but contains 0.

#### Why This Matters

```rust
// Capacity: space allocated on heap
// Length: number of initialized elements

let mut v = Vec::with_capacity(100);
// Heap: [uninitialized × 100]
// v.len() = 0, v.capacity() = 100

v.push(1);
// Heap: [1, uninitialized × 99]
// v.len() = 1, v.capacity() = 100

v.push(2);
// Heap: [1, 2, uninitialized × 98]
// v.len() = 2, v.capacity() = 100
```

#### Common Mistake

```rust
// WRONG: Trying to use capacity as length
let mut v = Vec::with_capacity(100);
for i in 0..100 {
    v[i] = i;  // PANIC: index out of bounds
}

// CORRECT: Use push or resize
let mut v = Vec::with_capacity(100);
for i in 0..100 {
    v.push(i);  // Properly adds elements
}

// Or pre-initialize with a value
let mut v = vec![0; 100];  // Length AND capacity = 100
for i in 0..100 {
    v[i] = i;  // Now this works
}
```

---

### Integer Overflow Behavior

#### The Trap Question

```rust
fn main() {
    let x: u8 = 255;
    let y = x + 1;
    println!("{}", y);
}
```

**What happens in debug vs release mode?**

#### The Answer

| Mode | Behavior |
|------|----------|
| Debug | **Panic**: "attempt to add with overflow" |
| Release | **Wraps**: prints `0` |

#### Why This Happens

Rust checks for overflow in debug mode but not in release mode (for performance):

```rust
// Debug mode: Checked arithmetic
let x: u8 = 255;
let y = x + 1;  // PANIC!

// Release mode: Wrapping arithmetic
let x: u8 = 255;
let y = x + 1;  // y = 0 (wrapped)
```

#### Explicit Overflow Handling

```rust
let x: u8 = 255;

// Wrapping (always wraps)
let a = x.wrapping_add(1);  // 0

// Saturating (clamps to max/min)
let b = x.saturating_add(1);  // 255

// Checked (returns Option)
let c = x.checked_add(1);  // None

// Overflowing (returns value + overflow flag)
let (d, overflowed) = x.overflowing_add(1);  // (0, true)
```

---

## Standard Library Traps

### HashMap Iteration Order

#### The Trap Question

```rust
use std::collections::HashMap;

fn main() {
    let mut map = HashMap::new();
    map.insert("a", 1);
    map.insert("b", 2);
    map.insert("c", 3);

    for (k, v) in &map {
        println!("{}: {}", k, v);
    }
}
```

**What order will this print?**

#### The Answer

**Undefined!** The order is not guaranteed and may vary between runs.

#### Why This Happens

`HashMap` uses randomized hashing for DoS protection. The iteration order depends on:
- Hash values of keys
- Insertion order
- Internal bucket layout
- Random seed (changes each run)

```rust
// These may print in different orders each time:
// c: 3, a: 1, b: 2
// b: 2, c: 3, a: 1
// etc.
```

#### When You Need Order

```rust
// Use BTreeMap for sorted order
use std::collections::BTreeMap;

let mut map = BTreeMap::new();
map.insert("a", 1);
map.insert("b", 2);
map.insert("c", 3);

for (k, v) in &map {
    println!("{}: {}", k, v);  // Always: a, b, c
}

// Use IndexMap for insertion order (from indexmap crate)
use indexmap::IndexMap;

let mut map = IndexMap::new();
map.insert("a", 1);
map.insert("b", 2);
map.insert("c", 3);

for (k, v) in &map {
    println!("{}: {}", k, v);  // Always: a, b, c (insertion order)
}
```

---

### Float Comparison

#### The Trap Question

```rust
fn main() {
    let x = 0.1 + 0.2;
    println!("{}", x == 0.3);

    let nan = f64::NAN;
    println!("{}", nan == nan);
}
```

**What does this print?**

#### The Answer

```
false
false
```

#### Why This Happens

**Floating-point arithmetic is not exact:**
```rust
let x = 0.1 + 0.2;
println!("{:.17}", x);  // 0.30000000000000004
println!("{:.17}", 0.3);  // 0.29999999999999999
// They're not equal!
```

**NaN is not equal to anything, including itself:**
```rust
let nan = f64::NAN;
nan == nan  // false (by IEEE 754 spec)
nan != nan  // true!
```

#### The Correct Approach

```rust
// For approximate equality:
fn approx_eq(a: f64, b: f64, epsilon: f64) -> bool {
    (a - b).abs() < epsilon
}

let x = 0.1 + 0.2;
println!("{}", approx_eq(x, 0.3, 1e-10));  // true

// For NaN checking:
let nan = f64::NAN;
println!("{}", nan.is_nan());  // true

// Beware in comparisons:
vec![1.0, f64::NAN, 2.0].iter().max();  // May not work as expected!
```

---

### Clone vs Copy

#### The Trap Question

```rust
#[derive(Clone)]
struct Data {
    values: Vec<i32>,
}

fn main() {
    let d1 = Data { values: vec![1, 2, 3] };
    let d2 = d1;  // What happens?

    println!("{:?}", d1.values);  // Does this work?
}
```

#### The Answer

**Error!** `d1` was moved, not copied.

```
error[E0382]: borrow of moved value: `d1`
```

#### Why This Happens

```
Clone vs Copy:

Copy (implicit copy on assignment):
- Implemented for simple types (i32, bool, etc.)
- Bit-for-bit copy
- Original still valid

Clone (explicit .clone() required):
- Implemented for complex types
- May involve allocation
- Must call explicitly
```

```rust
// Copy types - implicit copy
let x: i32 = 5;
let y = x;  // x is copied
println!("{}", x);  // x still valid

// Clone types - must be explicit
let d1 = Data { values: vec![1, 2, 3] };
let d2 = d1.clone();  // Explicit clone
println!("{:?}", d1.values);  // Now works!
```

#### The Rules

```rust
// Copy requires:
// 1. All fields are Copy
// 2. #[derive(Copy, Clone)] - Copy requires Clone

#[derive(Copy, Clone)]
struct Point {
    x: i32,  // i32 is Copy
    y: i32,  // i32 is Copy
}

// This CANNOT be Copy:
#[derive(Clone)]
struct Data {
    values: Vec<i32>,  // Vec is NOT Copy
}
```

---

## Macro & Compile-Time Traps

### Macro Hygiene

#### The Trap Question

```rust
macro_rules! create_var {
    () => {
        let x = 42;
    };
}

fn main() {
    create_var!();
    println!("{}", x);  // Does this work?
}
```

#### The Answer

**Error!** `x` is not in scope.

```
error[E0425]: cannot find value `x` in this scope
```

#### Why This Happens

Rust macros are **hygienic**: variables created inside a macro have different scope than the call site.

```rust
macro_rules! create_var {
    () => {
        let x = 42;  // This x is in the macro's scope
    };
}

fn main() {
    create_var!();
    // The macro's x is not visible here
    println!("{}", x);  // Error: x not found
}
```

#### How to "Export" Variables

```rust
// Option 1: Accept identifier as parameter
macro_rules! create_var {
    ($name:ident) => {
        let $name = 42;
    };
}

fn main() {
    create_var!(x);  // Now x is in main's scope
    println!("{}", x);  // Works! Prints 42
}

// Option 2: Return the value
macro_rules! get_value {
    () => {
        42
    };
}

fn main() {
    let x = get_value!();
    println!("{}", x);  // Works!
}
```

---

### Const Fn Limitations

#### The Trap Question

```rust
const fn fibonacci(n: u32) -> u32 {
    let mut a = 0;
    let mut b = 1;
    let mut i = 0;
    while i < n {
        let temp = a;
        a = b;
        b = temp + b;
        i += 1;
    }
    a
}

const FIB_10: u32 = fibonacci(10);  // Does this work?
```

#### The Answer

**Yes!** This works in modern Rust (1.46+).

But this doesn't:

```rust
const fn needs_alloc() -> Vec<i32> {
    vec![1, 2, 3]  // ERROR: allocation not allowed in const fn
}

const fn uses_trait_object(x: &dyn std::fmt::Display) {
    // ERROR: trait objects not allowed in const fn
}
```

#### Const Fn Rules

```rust
// Allowed in const fn:
const fn allowed() {
    let x = 5;                    // Let bindings
    let y = if x > 3 { 1 } else { 2 };  // If expressions
    let mut i = 0;
    while i < 10 { i += 1; }      // While loops (since 1.46)
    let arr = [1, 2, 3];          // Arrays
}

// NOT allowed in const fn:
const fn not_allowed() {
    let v = vec![1, 2, 3];        // Heap allocation
    let s = String::from("hi");   // Heap allocation
    let b = Box::new(5);          // Heap allocation
    println!("hi");               // I/O
    std::thread::spawn(|| {});    // Threading
    panic!("oh no");              // Panicking (allowed since 1.57 with features)
}
```

---

## Quick Reference

### Trap Questions Summary

| Topic | Trap | Key Insight |
|-------|------|-------------|
| Move + Borrow | Can't move while borrowed | Borrow must end before move |
| NLL | Old code may now compile | Borrows end at last use, not scope end |
| Partial Move | Can use unmoved fields | Rust tracks field-level moves |
| Self-Ref Struct | Can't have self-references | Use indices or Pin |
| Lifetime Elision | Multiple refs need annotation | Only single ref or &self gets elision |
| `'static` | Doesn't mean "static variable" | Means "contains no non-'static refs" |
| Object Safety | No generics in dyn traits | vtable can't have infinite entries |
| Send/Sync | Rc not Send, RefCell not Sync | Thread safety is compile-time checked |
| Arc<Mutex<T>> | Not Mutex<Arc<T>> | Outer=sharing, Inner=protecting |
| Blocking in Async | Blocks entire runtime | Use async sleep or spawn_blocking |
| Vec capacity | Capacity ≠ length | with_capacity doesn't initialize |
| Integer Overflow | Debug panics, release wraps | Use wrapping/saturating/checked |
| Float NaN | NaN != NaN | Use is_nan() |
| Macro Hygiene | Variables are scoped | Pass identifiers as parameters |

### Common Error Messages Decoded

| Error | Meaning |
|-------|---------|
| `E0382: borrow of moved value` | Using value after move |
| `E0502: cannot borrow as mutable because also borrowed as immutable` | Conflicting borrows |
| `E0505: cannot move out of X because it is borrowed` | Moving while borrowed |
| `E0106: missing lifetime specifier` | Ambiguous output lifetime |
| `E0038: trait cannot be made into an object` | Object safety violation |
| `E0277: X cannot be sent between threads safely` | Type is not Send |
| `E0277: X cannot be shared between threads safely` | Type is not Sync |

### Decision Guide

```
Do I need to move or borrow?
├── Need ownership → Move (pass by value)
├── Just reading → Immutable borrow (&T)
└── Need to modify → Mutable borrow (&mut T)

Do I need static or dynamic dispatch?
├── Same type everywhere → impl Trait (static)
├── Different types in collection → dyn Trait (dynamic)
└── Not sure → Start with impl Trait, refactor if needed

Do I need Send/Sync?
├── Threading with ownership → Send
├── Sharing references between threads → Sync
├── Rc → use Arc
└── RefCell → use Mutex or RwLock
```

---

## Resources

- [The Rustonomicon](https://doc.rust-lang.org/nomicon/) — Unsafe Rust and advanced topics
- [Rust Reference - Lifetime Elision](https://doc.rust-lang.org/reference/lifetime-elision.html)
- [RFC 2094 - NLL](https://rust-lang.github.io/rfcs/2094-nll.html)
- [Send and Sync](https://doc.rust-lang.org/nomicon/send-and-sync.html)
- [Object Safety](https://doc.rust-lang.org/reference/items/traits.html#object-safety)
- [Rust Quiz](https://dtolnay.github.io/rust-quiz/) — More tricky questions

---

**Next**: [14-macros.md](14-macros.md) — Rust Macros

---

<p align="center">
<b>The best Rust interview preparation:</b> Write lots of code and fight the borrow checker.
</p>
