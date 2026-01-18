# Unsafe Rust and FFI

> **Reading time**: 75-90 minutes | **Difficulty**: Advanced | **Rust Edition**: 2024

Understand Rust's escape hatch — the five superpowers `unsafe` grants, when it's justified, and how to write safe abstractions over unsafe code. Plus: interfacing with C and other languages through FFI.

---

## Table of Contents

1. [Introduction to Unsafe](#introduction-to-unsafe)
2. [The Five Unsafe Superpowers](#the-five-unsafe-superpowers)
3. [Undefined Behavior in Rust](#undefined-behavior-in-rust)
4. [Writing Safe Abstractions](#writing-safe-abstractions)
5. [FFI Basics](#ffi-basics)
6. [FFI Tools](#ffi-tools)
7. [Memory Safety in FFI](#memory-safety-in-ffi)
8. [Miri for UB Detection](#miri-for-ub-detection)
9. [Common Unsafe Patterns](#common-unsafe-patterns)
10. [Interview Trap Questions](#interview-trap-questions)
11. [Quick Reference](#quick-reference)

---

## Introduction to Unsafe

Rust's safety guarantees are enforced by the compiler. But some valid programs cannot be verified by the compiler — that's where `unsafe` comes in.

### What Unsafe Means (and Doesn't Mean)

```
┌────────────────────────────────────────────────────────────────┐
│                        RUST CODE                                │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                    SAFE RUST                            │    │
│  │  • All safety guaranteed by compiler                    │    │
│  │  • Borrow checker, type system, ownership              │    │
│  │  • Cannot cause undefined behavior                      │    │
│  │                                                         │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │              UNSAFE RUST                         │   │    │
│  │  │  • Safety is YOUR responsibility                 │   │    │
│  │  │  • Borrow checker still works                    │   │    │
│  │  │  • Only 5 extra capabilities unlocked            │   │    │
│  │  │  • Must manually uphold invariants               │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  └────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────┘
```

| Unsafe DOES | Unsafe DOES NOT |
|-------------|-----------------|
| Allow 5 specific operations | Disable the borrow checker |
| Shift safety responsibility to you | Make code faster automatically |
| Enable low-level memory access | Allow arbitrary behavior |
| Let you interface with C/hardware | Mean "dangerous" or "bad" |

### The Trust Contract

When you write `unsafe`, you're telling the compiler:

> "I've verified that this code upholds all safety invariants that you cannot check. Trust me."

```rust
// The compiler trusts you when you write this:
unsafe {
    // If this code violates safety invariants,
    // the resulting undefined behavior is YOUR fault
}
```

### When is Unsafe Necessary?

1. **FFI** — Calling C libraries, system calls
2. **Performance** — When you can prove bounds but the compiler can't
3. **Hardware** — Memory-mapped I/O, embedded systems
4. **Data structures** — Implementing intrusive lists, lock-free structures
5. **Standard library** — Much of `std` uses unsafe internally

---

## The Five Unsafe Superpowers

The `unsafe` keyword enables exactly five capabilities:

### 1. Dereferencing Raw Pointers

```rust
fn main() {
    let x = 42;
    let r1: *const i32 = &x;      // Create raw pointer (safe)
    let r2: *mut i32 = &x as *const i32 as *mut i32;

    // Dereferencing requires unsafe
    unsafe {
        println!("r1 points to: {}", *r1);

        // DANGER: This would be UB because x is not mutable
        // *r2 = 100;
    }

    // Raw pointers can be null (unlike references)
    let null_ptr: *const i32 = std::ptr::null();

    // Creating is safe, dereferencing would be UB
    // unsafe { println!("{}", *null_ptr); }  // UB!
}
```

**Raw pointers vs references:**

| Feature | `&T` / `&mut T` | `*const T` / `*mut T` |
|---------|-----------------|----------------------|
| Can be null | No | Yes |
| Guaranteed valid | Yes | No |
| Aliasing rules | Enforced | Not enforced |
| Auto-deref | Yes | No |
| Send/Sync | Inherited | Not Send, not Sync |

### 2. Calling Unsafe Functions or Methods

```rust
// Some functions are marked unsafe because the compiler
// cannot verify their safety requirements

// Standard library example
let v = vec![1, 2, 3, 4, 5];
unsafe {
    // SAFETY: index 2 is within bounds (length is 5)
    let third = v.get_unchecked(2);
    println!("Third element: {}", third);
}

// Defining your own unsafe function
/// Divides two numbers.
///
/// # Safety
///
/// `divisor` must not be zero.
unsafe fn divide_unchecked(dividend: i32, divisor: i32) -> i32 {
    // No zero-check: caller must guarantee divisor != 0
    dividend / divisor
}

fn main() {
    let result = unsafe {
        // SAFETY: 4 is not zero
        divide_unchecked(10, 4)
    };
    println!("Result: {}", result);
}
```

### 3. Accessing or Modifying Mutable Static Variables

```rust
static mut COUNTER: u32 = 0;

fn increment() {
    unsafe {
        // SAFETY: This function is only called from a single thread
        // in this example. In real code, use atomic or mutex.
        COUNTER += 1;
    }
}

fn get_count() -> u32 {
    unsafe {
        // SAFETY: Reading while no other thread is writing
        COUNTER
    }
}

fn main() {
    increment();
    increment();
    println!("Count: {}", get_count());  // 2
}
```

**Why is this unsafe?**
- Multiple threads could read/write simultaneously (data race)
- No synchronization by default
- Prefer `std::sync::atomic`, `Mutex`, or `RwLock` in real code

### 4. Implementing Unsafe Traits

```rust
// The Send trait indicates a type can be sent to another thread
// The Sync trait indicates a type can be shared between threads

// Some types aren't automatically Send/Sync but you know they're safe:
struct MyWrapper(*mut u8);  // Raw pointer: not Send, not Sync

// SAFETY: We ensure thread-safe access in our implementation
unsafe impl Send for MyWrapper {}
unsafe impl Sync for MyWrapper {}

// Common unsafe traits:
// - Send: Safe to transfer to another thread
// - Sync: Safe to share references between threads
// - GlobalAlloc: Custom memory allocators
```

### 5. Accessing Fields of Unions

```rust
#[repr(C)]
union IntOrFloat {
    i: i32,
    f: f32,
}

fn main() {
    let u = IntOrFloat { i: 42 };

    // Reading union fields is unsafe because the compiler
    // doesn't know which field was last written
    unsafe {
        // SAFETY: We just wrote to the i field
        println!("As int: {}", u.i);

        // This would interpret the bits differently (not UB, but may be wrong)
        println!("As float: {}", u.f);
    }
}
```

---

## Undefined Behavior in Rust

**Undefined Behavior (UB)** means the compiler makes no guarantees about program behavior. UB can cause crashes, wrong results, security vulnerabilities, or appear to work until it doesn't.

### Complete List of UB in Rust

According to the Rust Reference, these cause undefined behavior:

| Category | Examples |
|----------|----------|
| **Invalid values** | Null `&T`, invalid `bool` (not 0 or 1), invalid `char` |
| **Dangling pointers** | Using pointer after free, stack use-after-return |
| **Data races** | Unsynchronized read+write or write+write |
| **Aliasing violations** | Two `&mut T` to same data, `&mut T` and `&T` simultaneously |
| **Invalid memory access** | Out-of-bounds, misaligned access |
| **Uninitialized memory** | Reading `MaybeUninit` before init, padding bytes |
| **Breaking invariants** | Calling `str::from_utf8_unchecked` with non-UTF8 |
| **Unwinding across FFI** | Panic unwinding into C code |
| **Reentrancy** | Calling `&mut self` method recursively |

### Common UB Pitfalls

#### 1. Dangling Pointers

```rust
// BAD: Use after free
fn bad() -> *const i32 {
    let x = 42;
    &x as *const i32  // x is freed when function returns!
}

// GOOD: Ensure lifetime is valid
fn good() -> Box<i32> {
    Box::new(42)  // Heap allocated, returned with ownership
}
```

#### 2. Aliasing Violations

```rust
// BAD: Multiple mutable references
fn bad() {
    let mut x = 5;
    let r1 = &mut x as *mut i32;
    let r2 = &mut x as *mut i32;

    unsafe {
        *r1 = 10;
        *r2 = 20;  // UB: Two &mut pointing to same location
    }
}
```

#### 3. Invalid Values

```rust
// BAD: Invalid bool
fn bad() {
    let val: u8 = 2;
    let b: bool = unsafe { std::mem::transmute(val) };  // UB: bool must be 0 or 1
}

// BAD: Null reference
fn also_bad() {
    let ptr: *const i32 = std::ptr::null();
    let r: &i32 = unsafe { &*ptr };  // UB: References cannot be null
}
```

#### 4. Data Races

```rust
use std::thread;

static mut COUNTER: i32 = 0;

// BAD: Unsynchronized access from multiple threads
fn bad() {
    let handles: Vec<_> = (0..10)
        .map(|_| {
            thread::spawn(|| {
                unsafe { COUNTER += 1; }  // Data race!
            })
        })
        .collect();
}

// GOOD: Use atomic operations
use std::sync::atomic::{AtomicI32, Ordering};

static COUNTER: AtomicI32 = AtomicI32::new(0);

fn good() {
    let handles: Vec<_> = (0..10)
        .map(|_| {
            thread::spawn(|| {
                COUNTER.fetch_add(1, Ordering::SeqCst);
            })
        })
        .collect();
}
```

### UB vs Unspecified vs Implementation-Defined

| Term | Meaning | Example |
|------|---------|---------|
| **Undefined Behavior** | Anything can happen | Dereferencing null |
| **Unspecified** | One of several valid results | Evaluation order of function args |
| **Implementation-defined** | Documented per platform | Size of `usize` |

---

## Writing Safe Abstractions

The key pattern: **unsafe implementation, safe public API**.

### The Encapsulation Pattern

```rust
pub struct SafeVec<T> {
    ptr: *mut T,
    len: usize,
    capacity: usize,
}

impl<T> SafeVec<T> {
    /// Creates a new empty SafeVec.
    pub fn new() -> Self {
        SafeVec {
            ptr: std::ptr::NonNull::dangling().as_ptr(),
            len: 0,
            capacity: 0,
        }
    }

    /// Returns the element at index, or None if out of bounds.
    pub fn get(&self, index: usize) -> Option<&T> {
        if index < self.len {
            // SAFETY: We just checked that index < len,
            // and all elements 0..len are initialized.
            Some(unsafe { &*self.ptr.add(index) })
        } else {
            None
        }
    }

    /// Returns the element at index without bounds checking.
    ///
    /// # Safety
    ///
    /// `index` must be less than `self.len()`.
    pub unsafe fn get_unchecked(&self, index: usize) -> &T {
        // SAFETY: Caller guarantees index < len
        &*self.ptr.add(index)
    }
}
```

### SAFETY Comments Convention

Document every `unsafe` block with a `// SAFETY:` comment:

```rust
impl<T: Clone> Clone for SafeVec<T> {
    fn clone(&self) -> Self {
        let new_ptr = if self.capacity == 0 {
            std::ptr::NonNull::dangling().as_ptr()
        } else {
            // SAFETY: capacity > 0, so we allocate non-zero bytes
            let layout = std::alloc::Layout::array::<T>(self.capacity).unwrap();
            let ptr = unsafe { std::alloc::alloc(layout) as *mut T };

            // SAFETY: Both pointers are valid for len elements,
            // they don't overlap (new allocation), and T is Clone
            unsafe {
                for i in 0..self.len {
                    std::ptr::write(
                        ptr.add(i),
                        (*self.ptr.add(i)).clone(),
                    );
                }
            }
            ptr
        };

        SafeVec {
            ptr: new_ptr,
            len: self.len,
            capacity: self.capacity,
        }
    }
}
```

### Validity Invariants

Document invariants that must always hold:

```rust
/// A non-empty stack.
///
/// # Invariants
///
/// - `ptr` points to a valid allocation of at least `capacity * size_of::<T>()` bytes
/// - The first `len` elements are initialized
/// - `len > 0` (stack is never empty after construction)
/// - `len <= capacity`
pub struct NonEmptyStack<T> {
    ptr: *mut T,
    len: usize,
    capacity: usize,
}
```

---

## FFI Basics

**Foreign Function Interface (FFI)** allows Rust to call C code and vice versa.

### Calling C from Rust

```rust
// Declare external C functions
extern "C" {
    fn abs(input: i32) -> i32;
    fn strlen(s: *const i8) -> usize;

    // Can also link to specific libraries
    // #[link(name = "mylib")]
    // fn my_function();
}

fn main() {
    let result = unsafe {
        // SAFETY: abs() is a pure function with no preconditions
        abs(-42)
    };
    println!("Absolute value: {}", result);  // 42
}
```

### Exposing Rust to C

```rust
/// Adds two integers.
///
/// This function can be called from C.
#[no_mangle]
pub extern "C" fn rust_add(a: i32, b: i32) -> i32 {
    a + b
}

/// Struct with C-compatible layout
#[repr(C)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

#[no_mangle]
pub extern "C" fn point_distance(p: *const Point) -> f64 {
    // SAFETY: Caller guarantees p is valid and properly aligned
    let p = unsafe { &*p };
    (p.x * p.x + p.y * p.y).sqrt()
}
```

### #[repr(C)] and Data Layout

Rust's default struct layout is unspecified. Use `#[repr(C)]` for C compatibility:

```rust
// Rust's default layout: fields may be reordered
struct RustLayout {
    a: u8,    // Could be anywhere
    b: u32,   // Could be anywhere
    c: u8,    // Could be anywhere
}

// C-compatible layout: fields in order with C padding
#[repr(C)]
struct CLayout {
    a: u8,    // offset 0
    // 3 bytes padding
    b: u32,   // offset 4
    c: u8,    // offset 8
    // 3 bytes padding (to align size to 4)
}  // size = 12 bytes

// Packed: no padding (may cause misaligned access)
#[repr(C, packed)]
struct Packed {
    a: u8,    // offset 0
    b: u32,   // offset 1 (misaligned!)
    c: u8,    // offset 5
}  // size = 6 bytes
```

### Calling Conventions

| Convention | Syntax | Use |
|------------|--------|-----|
| C | `extern "C"` | Default for FFI, most compatible |
| System | `extern "system"` | Windows API (stdcall on x86, C on x64) |
| Rust | `extern "Rust"` or none | Rust-to-Rust (unstable ABI) |

### Null Pointers and Option<NonNull<T>>

```rust
use std::ptr::NonNull;

// C often uses NULL to indicate absence
extern "C" {
    fn maybe_returns_null() -> *mut i32;
}

fn safe_wrapper() -> Option<NonNull<i32>> {
    let ptr = unsafe { maybe_returns_null() };
    NonNull::new(ptr)  // Converts null to None
}

// When exposing to C, use explicit null checks
#[no_mangle]
pub extern "C" fn process(ptr: *const i32) -> i32 {
    if ptr.is_null() {
        return -1;  // Error code
    }
    // SAFETY: Just checked for null
    unsafe { *ptr }
}
```

---

## FFI Tools

### bindgen — C to Rust

`bindgen` automatically generates Rust bindings from C headers:

```bash
# Install
cargo install bindgen-cli

# Generate bindings
bindgen input.h -o bindings.rs
```

**Example:**

```c
// mylib.h
typedef struct {
    int x;
    int y;
} Point;

Point make_point(int x, int y);
int point_sum(const Point* p);
```

```bash
bindgen mylib.h -o bindings.rs
```

**Generated bindings.rs:**

```rust
#[repr(C)]
#[derive(Debug, Copy, Clone)]
pub struct Point {
    pub x: ::std::os::raw::c_int,
    pub y: ::std::os::raw::c_int,
}

extern "C" {
    pub fn make_point(x: ::std::os::raw::c_int, y: ::std::os::raw::c_int) -> Point;
    pub fn point_sum(p: *const Point) -> ::std::os::raw::c_int;
}
```

### cbindgen — Rust to C

`cbindgen` generates C/C++ headers from Rust code:

```bash
# Install
cargo install cbindgen

# Generate header
cbindgen --crate mylib --output mylib.h
```

**Example Rust code:**

```rust
// lib.rs
#[repr(C)]
pub struct Point {
    pub x: i32,
    pub y: i32,
}

#[no_mangle]
pub extern "C" fn add_points(a: Point, b: Point) -> Point {
    Point { x: a.x + b.x, y: a.y + b.y }
}
```

**Generated mylib.h:**

```c
typedef struct {
    int32_t x;
    int32_t y;
} Point;

Point add_points(Point a, Point b);
```

### safer_ffi — Safer FFI Helpers

The `safer_ffi` crate reduces boilerplate and catches common mistakes:

```rust
use safer_ffi::prelude::*;

#[derive_ReprC]
#[repr(C)]
pub struct Point {
    x: f64,
    y: f64,
}

#[ffi_export]
fn distance(p: &Point) -> f64 {
    (p.x * p.x + p.y * p.y).sqrt()
}

// Generate headers with:
// #[cfg(feature = "headers")]
// fn generate_headers() -> std::io::Result<()> {
//     safer_ffi::headers::builder()
//         .to_file("bindings.h")?
//         .generate()
// }
```

---

## Memory Safety in FFI

### Ownership Transfer with Box

```rust
// Allocate and transfer to C
#[no_mangle]
pub extern "C" fn create_string() -> *mut String {
    let s = Box::new(String::from("Hello from Rust"));
    Box::into_raw(s)  // Transfer ownership to C
}

// Receive back and free
#[no_mangle]
pub extern "C" fn free_string(ptr: *mut String) {
    if !ptr.is_null() {
        // SAFETY: ptr was created by Box::into_raw
        // and has not been freed yet
        unsafe {
            drop(Box::from_raw(ptr));
        }
    }
}

// Use without taking ownership
#[no_mangle]
pub extern "C" fn string_len(ptr: *const String) -> usize {
    if ptr.is_null() {
        return 0;
    }
    // SAFETY: ptr is valid and we're only reading
    unsafe { (*ptr).len() }
}
```

### String Handling with CString and CStr

```rust
use std::ffi::{CString, CStr};
use std::os::raw::c_char;

// Rust string to C string
fn rust_to_c(s: &str) -> CString {
    CString::new(s).expect("CString::new failed")
}

// C string to Rust string
unsafe fn c_to_rust(ptr: *const c_char) -> String {
    // SAFETY: Caller guarantees ptr is valid null-terminated string
    CStr::from_ptr(ptr)
        .to_str()
        .expect("Invalid UTF-8")
        .to_owned()
}

// Example FFI function
#[no_mangle]
pub extern "C" fn greet(name: *const c_char) -> *mut c_char {
    let name = if name.is_null() {
        "stranger".to_string()
    } else {
        // SAFETY: Caller guarantees valid C string
        unsafe { c_to_rust(name) }
    };

    let greeting = format!("Hello, {}!", name);

    // Convert to C string and transfer ownership
    let c_string = CString::new(greeting).unwrap();
    c_string.into_raw()
}

#[no_mangle]
pub extern "C" fn free_greeting(s: *mut c_char) {
    if !s.is_null() {
        // SAFETY: s was created by CString::into_raw
        unsafe {
            drop(CString::from_raw(s));
        }
    }
}
```

### Callbacks and Closures

```rust
// C-compatible function pointer type
type Callback = extern "C" fn(i32) -> i32;

#[no_mangle]
pub extern "C" fn apply_callback(x: i32, cb: Callback) -> i32 {
    cb(x)
}

// For closures, use trait objects with manual lifetime management
type ClosureCallback = Box<dyn Fn(i32) -> i32>;

#[no_mangle]
pub extern "C" fn create_closure() -> *mut ClosureCallback {
    let closure = Box::new(|x| x * 2);
    let boxed: Box<ClosureCallback> = Box::new(closure);
    Box::into_raw(boxed)
}

#[no_mangle]
pub extern "C" fn call_closure(cb: *mut ClosureCallback, x: i32) -> i32 {
    if cb.is_null() {
        return 0;
    }
    // SAFETY: cb is valid and not freed
    unsafe { (**cb)(x) }
}

#[no_mangle]
pub extern "C" fn free_closure(cb: *mut ClosureCallback) {
    if !cb.is_null() {
        // SAFETY: cb was created by create_closure and not freed
        unsafe { drop(Box::from_raw(cb)); }
    }
}
```

---

## Miri for UB Detection

**Miri** is an interpreter for Rust's Mid-level IR that can detect undefined behavior at runtime.

### What Miri Catches

| UB Type | Detected? |
|---------|-----------|
| Out-of-bounds access | Yes |
| Use-after-free | Yes |
| Invalid values | Yes |
| Data races | Yes (experimentally) |
| Memory leaks | Optional |
| Uninitialized reads | Yes |
| Aliasing violations | Yes (Stacked Borrows) |

### Using Miri

```bash
# Install Miri
rustup +nightly component add miri

# Run tests with Miri
cargo +nightly miri test

# Run a binary with Miri
cargo +nightly miri run
```

### Example: Miri Detecting UB

```rust
fn main() {
    let x = [1, 2, 3];
    let ptr = x.as_ptr();

    // This is UB: accessing out of bounds
    let val = unsafe { *ptr.add(10) };
    println!("{}", val);
}
```

**Miri output:**

```
error: Undefined Behavior: memory access outside bounds
  --> src/main.rs:5:21
   |
5  |     let val = unsafe { *ptr.add(10) };
   |                        ^^^^^^^^^^^^ memory access at alloc1+40, but alloc1 only has size 12
```

### Miri Flags

```bash
# Check for leaks
MIRIFLAGS="-Zmiri-leak-check" cargo +nightly miri test

# Stricter aliasing checks
MIRIFLAGS="-Zmiri-strict-provenance" cargo +nightly miri run

# Detect data races
MIRIFLAGS="-Zmiri-preemption-rate=0" cargo +nightly miri test
```

---

## Common Unsafe Patterns

### 1. Bounds-Checked get_unchecked

When you've already proven the index is valid:

```rust
fn sum_even_indices(slice: &[i32]) -> i32 {
    let mut sum = 0;
    let len = slice.len();

    for i in (0..len).step_by(2) {
        // SAFETY: i is always < len because step_by(2) starts at 0
        // and increments by 2, stopping before len
        sum += unsafe { *slice.get_unchecked(i) };
    }
    sum
}
```

### 2. Transmute for Type Punning

```rust
// Convert between types with same representation
fn u32_to_f32_bits(x: u32) -> f32 {
    // SAFETY: u32 and f32 have the same size and alignment
    unsafe { std::mem::transmute(x) }
}

// Better: use the safe methods when available
fn u32_to_f32_bits_safe(x: u32) -> f32 {
    f32::from_bits(x)  // Preferred!
}
```

### 3. Interfacing with Hardware

```rust
// Memory-mapped I/O for embedded systems
const GPIO_BASE: usize = 0x4000_0000;

#[repr(C)]
struct GpioRegisters {
    output: u32,
    input: u32,
    direction: u32,
}

fn get_gpio() -> &'static mut GpioRegisters {
    // SAFETY: GPIO_BASE is the correct memory-mapped address
    // for GPIO registers on this hardware
    unsafe { &mut *(GPIO_BASE as *mut GpioRegisters) }
}

fn set_pin_high(pin: u8) {
    let gpio = get_gpio();
    gpio.output |= 1 << pin;
}
```

### 4. Lock-Free Data Structures

```rust
use std::sync::atomic::{AtomicPtr, Ordering};

pub struct LockFreeStack<T> {
    head: AtomicPtr<Node<T>>,
}

struct Node<T> {
    value: T,
    next: *mut Node<T>,
}

impl<T> LockFreeStack<T> {
    pub fn push(&self, value: T) {
        let new_node = Box::into_raw(Box::new(Node {
            value,
            next: std::ptr::null_mut(),
        }));

        loop {
            let old_head = self.head.load(Ordering::Acquire);

            // SAFETY: new_node was just created and is valid
            unsafe { (*new_node).next = old_head; }

            if self.head.compare_exchange_weak(
                old_head,
                new_node,
                Ordering::Release,
                Ordering::Relaxed,
            ).is_ok() {
                break;
            }
        }
    }
}
```

### When is Unsafe Justified?

| Justified | Not Justified |
|-----------|---------------|
| FFI with proven-correct C code | "It's faster" without benchmarks |
| Hardware memory mapping | Avoiding borrow checker fights |
| Implementing collections | Simple application code |
| Performance-critical inner loops | Lazy coding |
| After exhausting safe alternatives | As first approach |

---

## Interview Trap Questions

### Q1: Unsafe Block Scope

```rust
fn main() {
    let mut x = 5;
    let r = &mut x;

    unsafe {
        *r = 10;  // Is this unsafe operation?
    }

    println!("{}", x);
}
```

**Does this need unsafe?**

**Answer**: No! Dereferencing a mutable reference is safe. The `unsafe` block here is misleading — nothing inside requires unsafe. The code compiles and prints `10`, but the `unsafe` block is unnecessary.

---

### Q2: Transmute Safety

```rust
let x: u64 = 42;
let y: [u8; 8] = unsafe { std::mem::transmute(x) };
```

**Is this safe?**

**Answer**: Technically yes — `u64` and `[u8; 8]` have the same size. However, the result depends on endianness. On little-endian machines: `[42, 0, 0, 0, 0, 0, 0, 0]`. On big-endian: `[0, 0, 0, 0, 0, 0, 0, 42]`.

Prefer `x.to_ne_bytes()` or `x.to_le_bytes()` / `x.to_be_bytes()`.

---

### Q3: Safe Abstraction Over Unsafe

```rust
pub fn get_index(slice: &[i32], index: usize) -> i32 {
    unsafe { *slice.get_unchecked(index) }
}
```

**Is this function sound?**

**Answer**: No! This is **unsound**. The function has a safe signature but can cause UB if `index >= slice.len()`. It should either:
1. Be marked `unsafe fn` with documented preconditions
2. Check bounds before the unsafe call

---

### Q4: Send and Sync with Raw Pointers

```rust
struct Wrapper(*mut i32);

// Is this safe?
unsafe impl Send for Wrapper {}
unsafe impl Sync for Wrapper {}
```

**When would this be safe?**

**Answer**: Only if:
- The pointer is never dereferenced, OR
- All access to the pointed data is properly synchronized (e.g., behind a Mutex)
- The data lives long enough (not stack-allocated in another thread)

Without these guarantees, it's unsound and can cause data races.

---

### Q5: Lifetime Extension with Transmute

```rust
fn extend_lifetime<'a, 'b>(r: &'a str) -> &'b str {
    unsafe { std::mem::transmute(r) }
}
```

**What's wrong with this?**

**Answer**: This is **always UB**! You cannot extend lifetimes. When `'a` ends, the reference becomes dangling, but `'b` might still be valid, allowing use-after-free.

Transmute cannot create valid references from invalid ones — lifetimes are a compile-time concept but the validity is a runtime property.

---

### Q6: Panic in FFI

```rust
#[no_mangle]
pub extern "C" fn process(x: i32) -> i32 {
    if x < 0 {
        panic!("x must be non-negative");
    }
    x * 2
}
```

**What's the problem?**

**Answer**: **Undefined Behavior!** Rust panics unwind the stack, but C doesn't understand Rust's unwinding mechanism. Unwinding across FFI boundaries is UB.

**Fix**: Use `catch_unwind` or avoid panicking:

```rust
use std::panic;

#[no_mangle]
pub extern "C" fn process(x: i32) -> i32 {
    let result = panic::catch_unwind(|| {
        if x < 0 { panic!("negative"); }
        x * 2
    });
    result.unwrap_or(-1)  // Return error code on panic
}
```

---

### Q7: The Stacked Borrows Model

```rust
let mut x = 42;
let p1 = &mut x as *mut i32;
let p2 = &mut x as *mut i32;

unsafe {
    *p1 = 1;
    *p2 = 2;  // Is this UB?
}
```

**Is this undefined behavior?**

**Answer**: **Yes, this is UB** under Stacked Borrows (Rust's aliasing model). Creating `p2` requires a new `&mut x`, which invalidates `p1`. Using `p1` after `p2` exists violates the aliasing rules.

Miri will catch this:
```
error: Undefined Behavior: attempting a write access using <tag> which is stale
```

---

## Quick Reference

### Unsafe Superpowers Summary

| Power | Syntax | Use Case |
|-------|--------|----------|
| Dereference raw pointers | `*ptr` | Low-level memory access |
| Call unsafe functions | `unsafe_fn()` | FFI, unchecked operations |
| Access mutable statics | `STATIC_MUT` | Global state (prefer atomics) |
| Implement unsafe traits | `unsafe impl Send` | Marker traits for types |
| Access union fields | `union.field` | C interop, type punning |

### FFI Cheatsheet

```rust
// Calling C from Rust
extern "C" {
    fn c_function(x: i32) -> i32;
}

// Exposing Rust to C
#[no_mangle]
pub extern "C" fn rust_function(x: i32) -> i32 { x }

// C-compatible struct
#[repr(C)]
pub struct MyStruct { field: i32 }

// String conversion
use std::ffi::{CString, CStr};
let c_str = CString::new("hello").unwrap();
let rust_str = unsafe { CStr::from_ptr(ptr).to_str().unwrap() };

// Ownership transfer
let ptr = Box::into_raw(Box::new(value));  // To C
let boxed = unsafe { Box::from_raw(ptr) }; // From C
```

### Common Tools

| Tool | Purpose | Command |
|------|---------|---------|
| Miri | UB detection | `cargo +nightly miri test` |
| bindgen | C → Rust bindings | `bindgen header.h -o bindings.rs` |
| cbindgen | Rust → C headers | `cbindgen --output header.h` |
| cargo-expand | Macro expansion | `cargo expand` |

---

## Resources

- [The Rustonomicon](https://doc.rust-lang.org/nomicon/) — The Dark Arts of Unsafe Rust
- [Rust Reference - Behavior Considered Undefined](https://doc.rust-lang.org/reference/behavior-considered-undefined.html)
- [Miri Documentation](https://github.com/rust-lang/miri)
- [bindgen User Guide](https://rust-lang.github.io/rust-bindgen/)
- [Effective Rust - FFI](https://www.effective-rust.com/ffi.html)
- [Learn Unsafe Rust](https://google.github.io/learn_unsafe_rust/)

---

**Next**: [16-webassembly.md](16-webassembly.md) — Rust and WebAssembly

---

<p align="center">
<b>Unsafe Rust is still Rust.</b><br>
The compiler trusts you — make sure you deserve that trust.
</p>
