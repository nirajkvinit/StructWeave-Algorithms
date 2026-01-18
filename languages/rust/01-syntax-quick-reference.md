# Rust Syntax Quick Reference

> Everything you need to write Rust code in interviews — nothing more

This is a concentrated reference for Rust syntax. Print it, bookmark it, or review it before interviews.

---

## Table of Contents

1. [Variables & Types](#variables--types)
2. [Basic Types](#basic-types)
3. [Control Flow](#control-flow)
4. [Functions](#functions)
5. [Structs & Enums](#structs--enums)
6. [Pattern Matching](#pattern-matching)
7. [Option & Result](#option--result)
8. [Traits](#traits)
9. [Generics](#generics)
10. [String Operations](#string-operations)
11. [Type Conversions](#type-conversions)
12. [Rust 2024 Edition Features](#rust-2024-edition-features)
13. [Upcoming Features (Nightly/Stabilizing)](#upcoming-features-nightlystabilizing)
14. [Quick Reference Card](#quick-reference-card)

---

## Variables & Types

### Declaration Patterns

```rust
// Immutable by default (most common)
let x = 10;
let name = "Alice";
let nums = vec![1, 2, 3];

// Mutable variables
let mut count = 0;
count += 1;

// Explicit type annotation
let x: i32 = 10;
let name: &str = "Alice";
let nums: Vec<i32> = Vec::new();

// Type inference works most of the time
let inferred = vec![1, 2, 3];  // Vec<i32> inferred

// Constants (must have type annotation)
const MAX_SIZE: usize = 100;
const PI: f64 = 3.14159;

// Static variables (global lifetime)
static GREETING: &str = "Hello";

// Shadowing (re-declare with same name)
let x = 5;
let x = x + 1;      // x is now 6
let x = "hello";    // x is now a string (type changed)
```

### Mutability Rules

```rust
// Immutable binding, immutable data
let x = 5;
// x = 6;  // Error: cannot assign twice

// Mutable binding
let mut y = 5;
y = 6;  // OK

// Mutable reference
let mut data = vec![1, 2, 3];
let r = &mut data;
r.push(4);  // OK: can modify through mutable reference
```

---

## Basic Types

| Type | Size | Range/Description | Example |
|------|------|-------------------|---------|
| `i8` | 1 byte | -128 to 127 | `let x: i8 = -10;` |
| `i16` | 2 bytes | -32,768 to 32,767 | `let x: i16 = 1000;` |
| `i32` | 4 bytes | -2³¹ to 2³¹-1 | `let x = 42;` (default) |
| `i64` | 8 bytes | -2⁶³ to 2⁶³-1 | `let x: i64 = 1_000_000;` |
| `i128` | 16 bytes | -2¹²⁷ to 2¹²⁷-1 | `let x: i128 = 0;` |
| `isize` | ptr size | Architecture dependent | `let x: isize = -5;` |
| `u8` | 1 byte | 0 to 255 | `let x: u8 = 255;` |
| `u16` | 2 bytes | 0 to 65,535 | `let x: u16 = 1000;` |
| `u32` | 4 bytes | 0 to 2³²-1 | `let x: u32 = 42;` |
| `u64` | 8 bytes | 0 to 2⁶⁴-1 | `let x: u64 = 0;` |
| `u128` | 16 bytes | 0 to 2¹²⁸-1 | `let x: u128 = 0;` |
| `usize` | ptr size | For indexing | `let i: usize = 0;` |
| `f32` | 4 bytes | IEEE 754 single | `let x: f32 = 3.14;` |
| `f64` | 8 bytes | IEEE 754 double | `let x = 3.14;` (default) |
| `bool` | 1 byte | `true` or `false` | `let flag = true;` |
| `char` | 4 bytes | Unicode scalar | `let c = 'A';` |
| `&str` | 2 ptrs | String slice | `let s = "hello";` |
| `String` | 3 ptrs | Owned string | `let s = String::from("hi");` |
| `()` | 0 bytes | Unit type (void) | `let nothing = ();` |

### Numeric Literals

```rust
// Integer literals
let decimal = 98_222;       // Underscores for readability
let hex = 0xff;             // Hexadecimal
let octal = 0o77;           // Octal
let binary = 0b1111_0000;   // Binary
let byte = b'A';            // u8 only

// Float literals
let float = 3.14;           // f64 by default
let explicit: f32 = 3.14;

// Type suffix
let x = 42u8;
let y = 100_i64;
let z = 3.14f32;
```

### Tuples and Arrays

```rust
// Tuples (fixed size, mixed types)
let tup: (i32, f64, char) = (500, 6.4, 'a');
let (x, y, z) = tup;        // Destructuring
let first = tup.0;          // Index access

// Arrays (fixed size, same type)
let arr: [i32; 5] = [1, 2, 3, 4, 5];
let zeros = [0; 10];        // [0, 0, 0, ... 10 times]
let first = arr[0];         // Index access
let len = arr.len();        // Length

// Slices (view into array/vec)
let slice: &[i32] = &arr[1..3];  // [2, 3]
let slice = &arr[..];            // Entire array
```

---

## Control Flow

### If Expressions

```rust
// Basic if
if x > 0 {
    println!("positive");
}

// If-else
if x > 0 {
    println!("positive");
} else if x < 0 {
    println!("negative");
} else {
    println!("zero");
}

// If as expression (returns value)
let sign = if x > 0 { 1 } else if x < 0 { -1 } else { 0 };

// If with let (pattern matching)
if let Some(value) = optional {
    println!("Got: {}", value);
}

// If let with else
if let Some(v) = opt {
    process(v);
} else {
    handle_none();
}
```

### Let Chains (Rust 2024 Edition, 1.88+)

Let chains allow combining multiple `let` patterns with boolean conditions in a single `if` or `while`:

```rust
// Before 2024: Nested if let statements
if let Some(a) = opt_a {
    if a > 10 {
        if let Some(b) = opt_b {
            process(a, b);
        }
    }
}

// 2024 Edition: Let chains with &&
if let Some(a) = opt_a && a > 10 && let Some(b) = opt_b {
    process(a, b);
}

// Mix let patterns and boolean conditions freely
if let Some(user) = get_user()
    && user.is_active
    && let Some(email) = user.email.as_ref()
    && email.ends_with("@company.com")
{
    send_notification(user, email);
}

// Works with while too
while let Some(item) = queue.pop() && !item.is_empty() {
    process(item);
}
```

**Note:** Let chains require `edition = "2024"` in your `Cargo.toml`.

### Loops

```rust
// Infinite loop
loop {
    // break to exit
    if done {
        break;
    }
}

// Loop with return value
let result = loop {
    if condition {
        break 42;  // Return 42 from loop
    }
};

// While loop
while condition {
    // body
}

// While let (pattern matching)
while let Some(value) = stack.pop() {
    println!("{}", value);
}

// For loop with range
for i in 0..10 {           // 0 to 9
    println!("{}", i);
}

for i in 0..=10 {          // 0 to 10 (inclusive)
    println!("{}", i);
}

// For loop with iterator
for item in collection.iter() {
    println!("{}", item);
}

// For with index
for (i, item) in collection.iter().enumerate() {
    println!("{}: {}", i, item);
}

// For with mutable reference
for item in collection.iter_mut() {
    *item += 1;
}

// For consuming ownership
for item in collection.into_iter() {
    // item is owned, collection is consumed
}

// Reverse iteration
for i in (0..10).rev() {
    println!("{}", i);  // 9, 8, 7, ...
}
```

### Break and Continue

```rust
// Basic break/continue
for i in 0..10 {
    if i == 5 {
        continue;  // Skip to next iteration
    }
    if i == 8 {
        break;     // Exit loop
    }
}

// Labeled loops (for nested loops)
'outer: for i in 0..10 {
    for j in 0..10 {
        if i * j > 50 {
            break 'outer;  // Break outer loop
        }
    }
}
```

---

## Functions

### Basic Functions

```rust
// Simple function
fn add(a: i32, b: i32) -> i32 {
    a + b  // No semicolon = return value
}

// Explicit return
fn divide(a: i32, b: i32) -> Option<i32> {
    if b == 0 {
        return None;  // Early return
    }
    Some(a / b)
}

// No return value (returns ())
fn greet(name: &str) {
    println!("Hello, {}!", name);
}

// Multiple return values via tuple
fn min_max(nums: &[i32]) -> (i32, i32) {
    let min = *nums.iter().min().unwrap();
    let max = *nums.iter().max().unwrap();
    (min, max)
}
```

### Closures

```rust
// Basic closure
let add_one = |x| x + 1;
let result = add_one(5);  // 6

// Closure with type annotations
let add = |x: i32, y: i32| -> i32 { x + y };

// Multi-line closure
let complex = |x| {
    let y = x + 1;
    y * 2
};

// Capturing environment
let factor = 2;
let multiply = |x| x * factor;  // Captures 'factor'

// Move closure (takes ownership of captured values)
let data = vec![1, 2, 3];
let closure = move || {
    println!("{:?}", data);  // data is moved into closure
};
// data is no longer accessible here

// Closure as argument
fn apply<F>(f: F, x: i32) -> i32
where
    F: Fn(i32) -> i32,
{
    f(x)
}

let doubled = apply(|x| x * 2, 5);  // 10
```

### Function Pointers

```rust
// Function as value
fn add(a: i32, b: i32) -> i32 { a + b }

let operation: fn(i32, i32) -> i32 = add;
let result = operation(2, 3);  // 5

// Passing function to another function
fn apply_twice(f: fn(i32) -> i32, x: i32) -> i32 {
    f(f(x))
}
```

---

## Structs & Enums

### Structs

```rust
// Basic struct
struct Point {
    x: i32,
    y: i32,
}

// Creating instances
let p1 = Point { x: 10, y: 20 };
let p2 = Point { x: 5, ..p1 };  // Struct update syntax

// Accessing fields
println!("{}, {}", p1.x, p1.y);

// Mutable struct
let mut p = Point { x: 0, y: 0 };
p.x = 10;

// Tuple struct
struct Color(u8, u8, u8);
let red = Color(255, 0, 0);
let r = red.0;  // Access by index

// Unit struct
struct Marker;

// Struct with methods
impl Point {
    // Associated function (constructor)
    fn new(x: i32, y: i32) -> Self {
        Point { x, y }
    }

    // Method (takes &self)
    fn distance_from_origin(&self) -> f64 {
        ((self.x.pow(2) + self.y.pow(2)) as f64).sqrt()
    }

    // Mutable method
    fn translate(&mut self, dx: i32, dy: i32) {
        self.x += dx;
        self.y += dy;
    }

    // Method that takes ownership
    fn into_tuple(self) -> (i32, i32) {
        (self.x, self.y)
    }
}

// Using methods
let p = Point::new(3, 4);
let dist = p.distance_from_origin();
```

### Enums

```rust
// Basic enum
enum Direction {
    Up,
    Down,
    Left,
    Right,
}

// Enum with data
enum Message {
    Quit,
    Move { x: i32, y: i32 },   // Named fields
    Write(String),              // Tuple variant
    ChangeColor(u8, u8, u8),   // Multiple values
}

// Using enums
let msg = Message::Write(String::from("hello"));
let dir = Direction::Up;

// Enum methods
impl Message {
    fn call(&self) {
        match self {
            Message::Quit => println!("Quit"),
            Message::Move { x, y } => println!("Move to {}, {}", x, y),
            Message::Write(s) => println!("Write: {}", s),
            Message::ChangeColor(r, g, b) => println!("Color: {}, {}, {}", r, g, b),
        }
    }
}
```

---

## Pattern Matching

### Match Expression

```rust
// Basic match
let x = 5;
match x {
    1 => println!("one"),
    2 => println!("two"),
    3..=5 => println!("three to five"),  // Range pattern
    _ => println!("other"),               // Catch-all
}

// Match with return value
let description = match x {
    0 => "zero",
    1 | 2 => "one or two",  // Multiple patterns
    n if n < 0 => "negative",  // Guard
    _ => "positive",
};

// Destructuring in match
let point = (3, 4);
match point {
    (0, 0) => println!("origin"),
    (x, 0) => println!("on x-axis at {}", x),
    (0, y) => println!("on y-axis at {}", y),
    (x, y) => println!("at ({}, {})", x, y),
}

// Match with structs
struct Point { x: i32, y: i32 }
let p = Point { x: 3, y: 4 };

match p {
    Point { x: 0, y } => println!("on y-axis at {}", y),
    Point { x, y: 0 } => println!("on x-axis at {}", x),
    Point { x, y } => println!("at ({}, {})", x, y),
}

// Match with enums
enum Color { Red, Green, Blue, Rgb(u8, u8, u8) }

match color {
    Color::Red => println!("red"),
    Color::Rgb(r, g, b) => println!("RGB: {}, {}, {}", r, g, b),
    _ => println!("other"),
}

// @ binding (capture while matching)
match x {
    n @ 1..=5 => println!("matched: {}", n),
    _ => println!("no match"),
}
```

### If Let and While Let

```rust
// If let (single pattern match)
let opt = Some(5);
if let Some(x) = opt {
    println!("Got: {}", x);
}

// If let with else
if let Some(x) = opt {
    println!("Got: {}", x);
} else {
    println!("Got nothing");
}

// While let
let mut stack = vec![1, 2, 3];
while let Some(top) = stack.pop() {
    println!("{}", top);
}

// Let else (Rust 1.65+)
fn get_value(opt: Option<i32>) -> i32 {
    let Some(x) = opt else {
        return 0;  // Must diverge (return, panic, etc.)
    };
    x * 2
}
```

---

## Option & Result

### Option

```rust
// Option is Some(value) or None
let some_number: Option<i32> = Some(5);
let no_number: Option<i32> = None;

// Unwrapping (panics if None)
let x = some_number.unwrap();

// Safe unwrapping
let x = some_number.unwrap_or(0);        // Default if None
let x = some_number.unwrap_or_default(); // Type's default
let x = some_number.unwrap_or_else(|| compute_default());

// Pattern matching
match some_number {
    Some(n) => println!("Got: {}", n),
    None => println!("Got nothing"),
}

// Methods
some_number.is_some();  // true
some_number.is_none();  // false

// Transform
let doubled = some_number.map(|x| x * 2);        // Some(10)
let result = some_number.and_then(|x| Some(x * 2));  // Chaining

// Filter
let positive = some_number.filter(|&x| x > 0);

// Convert to Result
let result: Result<i32, &str> = some_number.ok_or("no value");
```

### Result

```rust
// Result is Ok(value) or Err(error)
fn divide(a: i32, b: i32) -> Result<i32, String> {
    if b == 0 {
        Err(String::from("division by zero"))
    } else {
        Ok(a / b)
    }
}

// Handling Result
match divide(10, 2) {
    Ok(result) => println!("Result: {}", result),
    Err(e) => println!("Error: {}", e),
}

// Unwrapping
let x = result.unwrap();           // Panics on Err
let x = result.expect("msg");      // Panics with message
let x = result.unwrap_or(0);       // Default on Err
let x = result.unwrap_or_default();

// The ? operator (early return on Err)
fn read_and_parse() -> Result<i32, Error> {
    let content = read_file()?;    // Returns Err if error
    let number = content.parse()?;
    Ok(number)
}

// Methods
result.is_ok();
result.is_err();
result.ok();   // Option<T>
result.err();  // Option<E>

// Transform
result.map(|x| x * 2);              // Transform Ok value
result.map_err(|e| format!("{}", e));  // Transform Err value
result.and_then(|x| another_result(x));  // Chain Results
```

---

## Traits

### Defining and Implementing Traits

```rust
// Define a trait
trait Drawable {
    fn draw(&self);

    // Default implementation
    fn description(&self) -> String {
        String::from("A drawable object")
    }
}

// Implement trait for a type
struct Circle {
    radius: f64,
}

impl Drawable for Circle {
    fn draw(&self) {
        println!("Drawing circle with radius {}", self.radius);
    }
}

// Using the trait
let c = Circle { radius: 5.0 };
c.draw();
```

### Common Derivable Traits

```rust
// Derive common traits automatically
#[derive(Debug, Clone, PartialEq, Eq, Hash, Default)]
struct Point {
    x: i32,
    y: i32,
}

// Debug: enables {:?} formatting
println!("{:?}", point);

// Clone: enables .clone()
let p2 = point.clone();

// PartialEq/Eq: enables == comparison
if p1 == p2 { }

// Hash: enables use in HashMap/HashSet
let mut set: HashSet<Point> = HashSet::new();

// Default: enables Default::default()
let p = Point::default();

// Ord/PartialOrd: enables comparison and sorting
#[derive(PartialOrd, Ord)]
struct Score(i32);
```

### Trait Bounds

```rust
// Function with trait bound
fn print_debug<T: std::fmt::Debug>(item: T) {
    println!("{:?}", item);
}

// Multiple bounds
fn process<T: Clone + Debug>(item: T) { }

// Where clause (cleaner for complex bounds)
fn process<T, U>(t: T, u: U)
where
    T: Clone + Debug,
    U: Display + PartialOrd,
{
    // ...
}

// Returning trait objects
fn get_drawable() -> Box<dyn Drawable> {
    Box::new(Circle { radius: 5.0 })
}

// impl Trait (static dispatch)
fn get_iterator() -> impl Iterator<Item = i32> {
    vec![1, 2, 3].into_iter()
}
```

---

## Generics

### Generic Functions

```rust
// Generic function
fn largest<T: PartialOrd>(list: &[T]) -> &T {
    let mut largest = &list[0];
    for item in list {
        if item > largest {
            largest = item;
        }
    }
    largest
}

// Multiple type parameters
fn pair<T, U>(first: T, second: U) -> (T, U) {
    (first, second)
}
```

### Generic Structs

```rust
// Generic struct
struct Point<T> {
    x: T,
    y: T,
}

// Methods on generic struct
impl<T> Point<T> {
    fn x(&self) -> &T {
        &self.x
    }
}

// Methods only for specific types
impl Point<f64> {
    fn distance_from_origin(&self) -> f64 {
        (self.x.powi(2) + self.y.powi(2)).sqrt()
    }
}

// Multiple type parameters
struct Pair<T, U> {
    first: T,
    second: U,
}
```

### Generic Enums

```rust
// Option and Result are generic enums
enum Option<T> {
    Some(T),
    None,
}

enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

---

## String Operations

### String Types

```rust
// &str - string slice (borrowed, immutable)
let s: &str = "hello";

// String - owned, growable string
let s: String = String::from("hello");
let s: String = "hello".to_string();

// Converting between types
let slice: &str = &owned_string;     // String to &str
let owned: String = slice.to_string(); // &str to String
let owned: String = slice.to_owned();  // Alternative
```

### Common String Operations

```rust
let s = String::from("hello world");

// Length
s.len()                    // Bytes (11)
s.chars().count()          // Characters (11)

// Checking
s.is_empty()
s.contains("world")
s.starts_with("hello")
s.ends_with("world")

// Finding
s.find("world")            // Option<usize> -> Some(6)

// Slicing (be careful with UTF-8!)
&s[0..5]                   // "hello"
&s[6..]                    // "world"

// Iterating
for c in s.chars() { }     // By character
for b in s.bytes() { }     // By byte

// Splitting
s.split_whitespace()       // Iterator over words
s.split(',')               // Split by delimiter
s.lines()                  // Iterator over lines

// Transforming
s.to_uppercase()
s.to_lowercase()
s.trim()                   // Remove whitespace
s.trim_start()
s.trim_end()
s.replace("world", "rust")

// Building strings
let mut s = String::new();
s.push('H');               // Add char
s.push_str("ello");        // Add &str
s += " world";             // Concatenate

// Format macro
let s = format!("{} {}", "hello", "world");
```

### String and Characters

```rust
// Character operations
let c = 'A';
c.is_alphabetic()
c.is_numeric()
c.is_alphanumeric()
c.is_whitespace()
c.to_lowercase()           // Iterator (some chars expand)
c.to_ascii_lowercase()     // char

// Parse from string
let num: i32 = "42".parse().unwrap();
let num: i32 = "42".parse::<i32>().unwrap();

// Convert to string
let s = 42.to_string();
let s = format!("{}", 42);
```

---

## Type Conversions

### Numeric Conversions

```rust
// Using 'as' for primitive types
let x: i32 = 10;
let y: i64 = x as i64;     // Widening (safe)
let z: i16 = x as i16;     // Narrowing (may truncate)

let f: f64 = x as f64;     // Int to float
let i: i32 = 3.9_f64 as i32;  // Float to int (truncates to 3)

// Safe conversions with From/Into
let x: i32 = 10;
let y: i64 = x.into();     // Guaranteed safe
let y: i64 = i64::from(x);
```

### String Conversions

```rust
// Parse strings
let n: i32 = "42".parse().unwrap();
let f: f64 = "3.14".parse().unwrap();

// Handle parse errors
match "42".parse::<i32>() {
    Ok(n) => println!("Parsed: {}", n),
    Err(e) => println!("Error: {}", e),
}

// To string
let s = 42.to_string();
let s = format!("{:?}", vec![1, 2, 3]);
```

### Collection Conversions

```rust
// Vec to slice
let v = vec![1, 2, 3];
let slice: &[i32] = &v;

// Slice to Vec
let v: Vec<i32> = slice.to_vec();

// Iterator to collection
let v: Vec<i32> = (0..10).collect();
let set: HashSet<i32> = v.iter().cloned().collect();

// Array to Vec
let arr = [1, 2, 3];
let v: Vec<i32> = arr.to_vec();
let v: Vec<i32> = arr.into();
```

---

## Rust 2024 Edition Features

The 2024 Edition (stabilized in Rust 1.85) introduces several new language features.

### Async Closures (Rust 1.85+)

Async closures are closures that can be `await`ed, returning a `Future` when called:

```rust
// Async closure syntax
let fetch = async |url: &str| {
    // async operations inside
    reqwest::get(url).await
};

// Use in async context
let response = fetch("https://api.example.com").await?;

// Async closures capture environment like regular closures
let client = reqwest::Client::new();
let fetch_with_client = async move |url: &str| {
    client.get(url).send().await
};

// Useful with async iterators and combinators
async fn process_urls(urls: Vec<String>) {
    let fetch = async |url: String| {
        reqwest::get(&url).await?.text().await
    };

    for url in urls {
        if let Ok(body) = fetch(url).await {
            println!("Got {} bytes", body.len());
        }
    }
}
```

### Unsafe Extern Blocks (Rust 1.85+)

Extern blocks can now be marked `unsafe` to be explicit about FFI safety:

```rust
// 2024 Edition: Explicit unsafe extern
unsafe extern "C" {
    fn external_function(x: i32) -> i32;
}

// Attributes like #[no_mangle] now require unsafe
#[unsafe(no_mangle)]
pub extern "C" fn my_c_function() {
    // ...
}
```

### Safe Target Feature (Rust 1.86+)

The `#[target_feature]` attribute can now be applied to safe functions:

```rust
// Before 1.86: Required unsafe
#[target_feature(enable = "avx2")]
unsafe fn fast_computation() { /* ... */ }

// 1.86+: Can be safe if the body is safe
#[target_feature(enable = "avx2")]
fn fast_computation() {
    // Safe code that benefits from AVX2
}
```

### Edition Migration

To use 2024 Edition features, update your `Cargo.toml`:

```toml
[package]
edition = "2024"
rust-version = "1.85"
```

Migrate existing code:

```bash
# Automatic migration
cargo fix --edition

# Check what needs to change
cargo fix --edition --allow-dirty --allow-staged
```

---

## Upcoming Features (Nightly/Stabilizing)

These features are in development and expected to stabilize in 2026-2027:

### Gen Blocks (RFC 3513)

Gen blocks allow writing iterators without manually implementing the `Iterator` trait:

```rust
#![feature(gen_blocks)]  // Nightly only (as of mid-2026)

// Instead of implementing Iterator manually...
fn fibonacci() -> impl Iterator<Item = u64> {
    gen {
        let (mut a, mut b) = (0, 1);
        loop {
            yield a;
            (a, b) = (b, a + b);
        }
    }
}

// Use like any iterator
for n in fibonacci().take(10) {
    println!("{}", n);
}

// Async gen blocks for async iterators
async fn fetch_pages() -> impl AsyncIterator<Item = Page> {
    async gen {
        for url in urls {
            yield fetch(url).await;
        }
    }
}
```

**Note:** The `gen` keyword is reserved in the 2024 Edition. Full stabilization expected in a future release.

### Polonius Borrow Checker

Polonius is an improved borrow checker that accepts more valid programs:

```rust
// Current borrow checker rejects this valid code:
fn get_or_insert(map: &mut HashMap<u32, String>, key: u32) -> &String {
    if let Some(v) = map.get(&key) {
        return v;  // Error: cannot return borrowed value
    }
    map.insert(key, String::new());
    map.get(&key).unwrap()
}

// Polonius understands this is safe and will accept it
// Try with: RUSTFLAGS="-Zpolonius" cargo +nightly build
```

Polonius resolves common "fighting the borrow checker" issues, especially:
- Returning borrowed values conditionally
- NLL Problem Case #3 patterns
- Lending iterators

**Status:** Working toward stabilization in 2026. Available on nightly with `-Zpolonius`.

### Never Type Stabilization

The `!` (never) type is being stabilized with careful fallback behavior:

```rust
// The never type represents computations that never complete
fn infinite_loop() -> ! {
    loop {}
}

// Useful in Result handling
let value: i32 = match result {
    Ok(v) => v,
    Err(_) => panic!("failed"),  // panic! returns !
};
```

---

## Quick Reference Card

```rust
// Variable declaration
let x = 10;                          // Immutable
let mut y = 10;                      // Mutable
const MAX: i32 = 100;                // Constant

// Collections
let v = vec![1, 2, 3];              // Vector
let map: HashMap<K, V> = HashMap::new();  // HashMap
let set: HashSet<T> = HashSet::new();     // HashSet

// Common operations
v.push(4);                           // Add to vector
v.pop();                             // Remove last
map.insert(key, value);              // Insert to map
map.get(&key);                       // Get from map
map.contains_key(&key);              // Check key exists

// Iteration
for x in &collection { }             // Borrow
for x in &mut collection { }         // Mutable borrow
for x in collection { }              // Take ownership
for (i, x) in v.iter().enumerate() { }  // With index

// Pattern matching
match value {
    Pattern => expression,
    _ => default,
}

// Option handling
opt.unwrap_or(default)               // Get or default
opt.map(|x| x * 2)                   // Transform
if let Some(x) = opt { }             // Conditional

// Result handling
result?                              // Propagate error
result.unwrap_or(default)            // Get or default
result.map_err(|e| new_error)        // Transform error

// Closures
let f = |x| x + 1;                   // Basic closure
let f = |x: i32| -> i32 { x + 1 };  // With types
let f = move |x| x + captured;       // Move closure

// Iterator chains
v.iter()
    .filter(|x| condition)
    .map(|x| transform)
    .collect::<Vec<_>>()

// Error propagation
fn fallible() -> Result<T, E> {
    let x = may_fail()?;             // Return early on error
    Ok(x)
}

// Struct definition
struct Name { field: Type }
impl Name {
    fn new() -> Self { }             // Constructor
    fn method(&self) { }             // Borrow self
    fn method_mut(&mut self) { }     // Mutable borrow
}

// Enum definition
enum Name { Variant1, Variant2(Type) }

// Trait definition
trait Name {
    fn method(&self);
}
impl Name for Type { }
```

---

**Next:** [02-ownership-borrowing.md](02-ownership-borrowing.md) — Master Rust's core concept
