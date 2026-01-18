# Rust Idioms and Best Practices

> Write idiomatic, professional Rust code that impresses interviewers

This guide covers the patterns and practices that distinguish Rust experts from beginners.

---

## Table of Contents

1. [Error Handling](#error-handling)
2. [Error Handling Libraries (Production Code)](#error-handling-libraries-production-code)
3. [Option Handling](#option-handling)
4. [Iterator Patterns](#iterator-patterns)
5. [Trait Design](#trait-design)
6. [Builder Pattern](#builder-pattern)
7. [Newtype Pattern](#newtype-pattern)
8. [From/Into Conversions](#frominto-conversions)
9. [Testing](#testing)
10. [Advanced Testing](#advanced-testing)
11. [Documentation](#documentation)
12. [Common Clippy Lints](#common-clippy-lints)

---

## Error Handling

### The ? Operator

The `?` operator is the idiomatic way to propagate errors:

```rust
use std::fs::File;
use std::io::{self, Read};

// Idiomatic: Use ? for error propagation
fn read_file(path: &str) -> io::Result<String> {
    let mut file = File::open(path)?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    Ok(contents)
}

// Even more concise
fn read_file_short(path: &str) -> io::Result<String> {
    std::fs::read_to_string(path)
}
```

### Result Combinators

```rust
// Map success value
let doubled = result.map(|x| x * 2);

// Map error value
let better_error = result.map_err(|e| format!("Failed: {}", e));

// Chain fallible operations
let final_result = result.and_then(|x| another_operation(x));

// Provide default on error
let value = result.unwrap_or(default);
let value = result.unwrap_or_default();
let value = result.unwrap_or_else(|_| compute_default());

// Convert to Option
let opt = result.ok();  // Discards error
```

### Custom Error Types

```rust
use std::fmt;

#[derive(Debug)]
enum AppError {
    NotFound(String),
    ParseError(String),
    IoError(std::io::Error),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::NotFound(s) => write!(f, "Not found: {}", s),
            AppError::ParseError(s) => write!(f, "Parse error: {}", s),
            AppError::IoError(e) => write!(f, "IO error: {}", e),
        }
    }
}

impl std::error::Error for AppError {}

// Automatic conversion from io::Error
impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::IoError(err)
    }
}

// Now ? works with io::Error in functions returning AppError
fn process() -> Result<(), AppError> {
    let _file = std::fs::File::open("file.txt")?;  // Converts automatically
    Ok(())
}
```

### Error Handling in Interviews

```rust
// For quick interview code, these are acceptable:
let value = result.unwrap();        // If you're certain it won't fail
let value = result.expect("msg");   // With context for debugging

// Better: Handle errors explicitly
match result {
    Ok(value) => process(value),
    Err(e) => handle_error(e),
}

// Best: Return Result and let caller decide
fn solve(input: &str) -> Result<i32, &'static str> {
    let num: i32 = input.parse().map_err(|_| "Invalid number")?;
    Ok(num * 2)
}
```

---

## Error Handling Libraries (Production Code)

For real-world Rust code, two crates dominate error handling:

### thiserror — For Libraries

Use `thiserror` when defining error types in libraries. It derives `std::error::Error` with minimal boilerplate.

```toml
# Cargo.toml
[dependencies]
thiserror = "2.0"
```

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DataError {
    #[error("Failed to read file: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Invalid format at line {line}: {message}")]
    ParseError { line: usize, message: String },

    #[error("Item not found: {0}")]
    NotFound(String),

    #[error("Permission denied")]
    PermissionDenied,
}

// The #[from] attribute auto-implements From<std::io::Error>
fn read_data(path: &str) -> Result<String, DataError> {
    let content = std::fs::read_to_string(path)?;  // io::Error -> DataError
    if content.is_empty() {
        return Err(DataError::NotFound(path.to_string()));
    }
    Ok(content)
}
```

### anyhow — For Applications

Use `anyhow` in applications when you don't need callers to match on specific error types. It provides rich context and backtraces.

```toml
# Cargo.toml
[dependencies]
anyhow = "1.0"
```

```rust
use anyhow::{Context, Result, bail, anyhow};

// Result is an alias for anyhow::Result<T>
fn process_file(path: &str) -> Result<i32> {
    let content = std::fs::read_to_string(path)
        .context("Failed to read configuration file")?;

    let value: i32 = content.trim().parse()
        .context("Configuration must be a valid integer")?;

    if value < 0 {
        bail!("Value must be non-negative, got {}", value);
    }

    Ok(value)
}

fn main() -> Result<()> {
    let value = process_file("config.txt")
        .context("Failed to load configuration")?;

    println!("Value: {}", value);
    Ok(())
}

// Create ad-hoc errors
fn validate(x: i32) -> Result<()> {
    if x < 0 {
        return Err(anyhow!("Invalid value: {}", x));
    }
    Ok(())
}
```

### When to Use Which

| Scenario | Use |
|----------|-----|
| **Library crate** | `thiserror` — Callers may need to match error variants |
| **Application binary** | `anyhow` — Simpler, add context as errors propagate |
| **Public API** | `thiserror` — Explicit error types are part of your API |
| **Internal code** | `anyhow` — Quick prototyping, error context more important than type |
| **Interview code** | Either works, or just use `Result<T, Box<dyn Error>>` |

### Combining Both

A common pattern: use `thiserror` at library boundaries, `anyhow` in the application layer.

```rust
// In your library (my_lib/src/lib.rs)
use thiserror::Error;

#[derive(Error, Debug)]
pub enum LibError {
    #[error("Connection failed: {0}")]
    Connection(String),
}

// In your application (src/main.rs)
use anyhow::{Context, Result};
use my_lib::LibError;

fn main() -> Result<()> {
    my_lib::connect()
        .context("Failed to initialize connection")?;
    Ok(())
}
```

---

## Option Handling

### Pattern Matching

```rust
let opt: Option<i32> = Some(5);

// Full match
match opt {
    Some(x) => println!("Got: {}", x),
    None => println!("Nothing"),
}

// If let for single case
if let Some(x) = opt {
    println!("Got: {}", x);
}

// Let-else for early return (Rust 1.65+)
fn process(opt: Option<i32>) -> i32 {
    let Some(x) = opt else {
        return 0;  // Must diverge
    };
    x * 2
}
```

### Option Combinators

```rust
let opt = Some(5);

// Transform value
let doubled = opt.map(|x| x * 2);  // Some(10)

// Chain Options
let result = opt.and_then(|x| if x > 0 { Some(x) } else { None });

// Filter
let positive = opt.filter(|&x| x > 0);  // Some(5)

// Provide default
let value = opt.unwrap_or(0);
let value = opt.unwrap_or_default();
let value = opt.unwrap_or_else(|| expensive_computation());

// Convert to Result
let result: Result<i32, &str> = opt.ok_or("missing value");

// Check and get
if opt.is_some() { }
if opt.is_none() { }
let value = opt.as_ref();  // Option<&i32>
let value = opt.as_mut();  // Option<&mut i32>
```

### Idiomatic Option Chains

```rust
// Instead of nested if-lets:
// if let Some(a) = get_a() {
//     if let Some(b) = get_b(a) {
//         process(b);
//     }
// }

// Use and_then:
get_a()
    .and_then(get_b)
    .map(process);

// Or the ? operator with Option (needs to return Option)
fn chain() -> Option<i32> {
    let a = get_a()?;
    let b = get_b(a)?;
    Some(process(b))
}
```

---

## Iterator Patterns

### Prefer Iterators Over Manual Loops

```rust
// Instead of:
let mut sum = 0;
for i in 0..nums.len() {
    sum += nums[i];
}

// Use:
let sum: i32 = nums.iter().sum();

// Instead of:
let mut result = Vec::new();
for x in &nums {
    if x % 2 == 0 {
        result.push(x * 2);
    }
}

// Use:
let result: Vec<i32> = nums.iter()
    .filter(|&&x| x % 2 == 0)
    .map(|&x| x * 2)
    .collect();
```

### Common Iterator Methods

```rust
let nums = vec![1, 2, 3, 4, 5];

// Transformation
nums.iter().map(|x| x * 2);           // [2, 4, 6, 8, 10]
nums.iter().filter(|&&x| x > 2);      // [3, 4, 5]
nums.iter().filter_map(|x| some_fn(x));  // Filter None, unwrap Some

// Aggregation
nums.iter().sum::<i32>();             // 15
nums.iter().product::<i32>();         // 120
nums.iter().count();                  // 5
nums.iter().max();                    // Some(&5)
nums.iter().min();                    // Some(&1)

// Folding
nums.iter().fold(0, |acc, x| acc + x);  // 15

// Finding
nums.iter().find(|&&x| x > 3);        // Some(&4)
nums.iter().position(|&x| x == 3);    // Some(2)
nums.iter().any(|&x| x > 3);          // true
nums.iter().all(|&x| x > 0);          // true

// Taking
nums.iter().take(3);                  // [1, 2, 3]
nums.iter().skip(2);                  // [3, 4, 5]
nums.iter().take_while(|&&x| x < 4);  // [1, 2, 3]

// Combining
nums.iter().enumerate();              // [(0, 1), (1, 2), ...]
nums.iter().zip(other.iter());        // Pairs
nums.iter().chain(other.iter());      // Concatenate

// Collecting
let v: Vec<_> = iter.collect();
let s: String = chars.collect();
let set: HashSet<_> = iter.collect();
```

### Iterator Ownership

```rust
let v = vec![1, 2, 3];

// Borrow: iter() -> Iterator<Item = &T>
for x in v.iter() { }         // x is &i32, v still usable

// Mutable borrow: iter_mut() -> Iterator<Item = &mut T>
for x in v.iter_mut() { }     // x is &mut i32

// Take ownership: into_iter() -> Iterator<Item = T>
for x in v.into_iter() { }    // x is i32, v is consumed

// Shorthand in for loops:
for x in &v { }               // Same as v.iter()
for x in &mut v { }           // Same as v.iter_mut()
for x in v { }                // Same as v.into_iter()
```

### Useful Iterator Patterns

```rust
// Enumerate for index access
for (i, x) in nums.iter().enumerate() {
    println!("{}: {}", i, x);
}

// Windows for sliding window
for window in nums.windows(3) {
    println!("{:?}", window);  // Slices of 3 consecutive elements
}

// Chunks for batching
for chunk in nums.chunks(2) {
    println!("{:?}", chunk);  // [1,2], [3,4], [5]
}

// Peekable for lookahead
let mut iter = nums.iter().peekable();
while let Some(&x) = iter.next() {
    if let Some(&&next) = iter.peek() {
        // Can see next element without consuming
    }
}

// Zip for parallel iteration
for (a, b) in vec1.iter().zip(vec2.iter()) {
    println!("{} {}", a, b);
}

// Flatten nested iterators
let nested = vec![vec![1, 2], vec![3, 4]];
let flat: Vec<_> = nested.into_iter().flatten().collect();  // [1,2,3,4]
```

---

## Trait Design

### Implement Common Traits

```rust
// Derive common traits when possible
#[derive(Debug, Clone, PartialEq, Eq, Hash, Default)]
struct Point {
    x: i32,
    y: i32,
}

// Manual implementation when needed
impl std::fmt::Display for Point {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}
```

### When to Derive vs Implement

| Trait | Derive When | Implement When |
|-------|-------------|----------------|
| `Debug` | Almost always | Custom format needed |
| `Clone` | All fields are Clone | Selective cloning |
| `PartialEq` | Field-by-field comparison | Custom equality logic |
| `Eq` | Type has no NaN-like values | Never (marker trait) |
| `Hash` | Need HashMap/HashSet keys | Custom hashing |
| `Default` | All fields have Default | Custom defaults |
| `Ord` | Natural ordering by fields | Custom ordering |

### Define Traits for Abstraction

```rust
// Define trait for algorithm patterns
trait Searchable {
    type Item;
    fn search(&self, target: &Self::Item) -> Option<usize>;
}

impl Searchable for Vec<i32> {
    type Item = i32;

    fn search(&self, target: &i32) -> Option<usize> {
        self.iter().position(|x| x == target)
    }
}

// Generic function using trait bound
fn find_all<T: Searchable>(container: &T, targets: &[T::Item]) -> Vec<Option<usize>>
where
    T::Item: Clone,
{
    targets.iter().map(|t| container.search(t)).collect()
}
```

---

## Builder Pattern

Use for complex struct initialization:

```rust
#[derive(Default)]
struct Request {
    url: String,
    method: String,
    headers: Vec<(String, String)>,
    body: Option<String>,
}

struct RequestBuilder {
    request: Request,
}

impl RequestBuilder {
    fn new() -> Self {
        RequestBuilder {
            request: Request::default(),
        }
    }

    fn url(mut self, url: &str) -> Self {
        self.request.url = url.to_string();
        self
    }

    fn method(mut self, method: &str) -> Self {
        self.request.method = method.to_string();
        self
    }

    fn header(mut self, key: &str, value: &str) -> Self {
        self.request.headers.push((key.to_string(), value.to_string()));
        self
    }

    fn body(mut self, body: &str) -> Self {
        self.request.body = Some(body.to_string());
        self
    }

    fn build(self) -> Request {
        self.request
    }
}

// Usage
let request = RequestBuilder::new()
    .url("https://api.example.com")
    .method("POST")
    .header("Content-Type", "application/json")
    .body(r#"{"key": "value"}"#)
    .build();
```

---

## Newtype Pattern

Wrap types for type safety:

```rust
// Without newtype: easy to confuse
fn transfer(from: u64, to: u64, amount: u64) { }
transfer(100, 200, 50);  // Which is which?

// With newtype: type-safe
struct AccountId(u64);
struct Amount(u64);

fn transfer(from: AccountId, to: AccountId, amount: Amount) { }

let from = AccountId(100);
let to = AccountId(200);
let amount = Amount(50);
transfer(from, to, amount);  // Clear!

// Add methods to newtype
impl AccountId {
    fn new(id: u64) -> Self {
        AccountId(id)
    }

    fn value(&self) -> u64 {
        self.0
    }
}
```

---

## From/Into Conversions

### Implement From for Automatic Conversions

```rust
struct Meters(f64);
struct Feet(f64);

impl From<Feet> for Meters {
    fn from(feet: Feet) -> Self {
        Meters(feet.0 * 0.3048)
    }
}

// Into is automatically implemented
let feet = Feet(10.0);
let meters: Meters = feet.into();

// From works too
let meters = Meters::from(Feet(10.0));

// Use in function signatures
fn process(meters: impl Into<Meters>) {
    let m: Meters = meters.into();
    // ...
}

process(Feet(10.0));  // Automatic conversion
process(Meters(3.0)); // Direct
```

### String Conversions

```rust
// Implement FromStr for parsing
use std::str::FromStr;

struct Point { x: i32, y: i32 }

impl FromStr for Point {
    type Err = &'static str;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let parts: Vec<&str> = s.split(',').collect();
        if parts.len() != 2 {
            return Err("Invalid format");
        }
        let x = parts[0].parse().map_err(|_| "Invalid x")?;
        let y = parts[1].parse().map_err(|_| "Invalid y")?;
        Ok(Point { x, y })
    }
}

let point: Point = "10,20".parse().unwrap();
```

---

## Testing

### Unit Tests

```rust
fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add() {
        assert_eq!(add(2, 3), 5);
    }

    #[test]
    fn test_add_negative() {
        assert_eq!(add(-1, 1), 0);
    }

    #[test]
    #[should_panic(expected = "overflow")]
    fn test_overflow() {
        let _ = add(i32::MAX, 1);  // Should panic
    }

    #[test]
    fn test_with_result() -> Result<(), String> {
        let result = add(2, 3);
        if result == 5 {
            Ok(())
        } else {
            Err(format!("Expected 5, got {}", result))
        }
    }
}
```

### Test Organization

```rust
#[cfg(test)]
mod tests {
    use super::*;

    // Setup helper
    fn setup() -> Vec<i32> {
        vec![1, 2, 3, 4, 5]
    }

    // Group related tests
    mod addition {
        use super::*;

        #[test]
        fn positive_numbers() {
            assert_eq!(add(2, 3), 5);
        }

        #[test]
        fn negative_numbers() {
            assert_eq!(add(-2, -3), -5);
        }
    }

    mod subtraction {
        // ...
    }
}
```

### Assertion Macros

```rust
#[test]
fn test_assertions() {
    assert!(true);
    assert_eq!(1 + 1, 2);
    assert_ne!(1, 2);

    // With custom message
    assert!(result.is_ok(), "Expected Ok, got {:?}", result);
    assert_eq!(value, 42, "Value should be 42");

    // For floats (approximate equality)
    let a = 0.1 + 0.2;
    let b = 0.3;
    assert!((a - b).abs() < 1e-10);
}
```

---

## Advanced Testing

### Property-Based Testing with proptest

Property-based testing generates many random inputs to find edge cases you might miss.

```toml
# Cargo.toml
[dev-dependencies]
proptest = "1.4"
```

```rust
use proptest::prelude::*;

fn reverse<T: Clone>(v: &[T]) -> Vec<T> {
    v.iter().rev().cloned().collect()
}

proptest! {
    // Test that reversing twice gives original
    #[test]
    fn test_reverse_twice(v: Vec<i32>) {
        let reversed_twice = reverse(&reverse(&v));
        prop_assert_eq!(reversed_twice, v);
    }

    // Test with constrained inputs
    #[test]
    fn test_positive_numbers(x in 1..1000i32, y in 1..1000i32) {
        prop_assert!(x + y > x);
        prop_assert!(x + y > y);
    }

    // Test strings
    #[test]
    fn test_string_length(s: String) {
        prop_assert!(s.len() <= s.as_bytes().len());
    }
}
```

### Mocking with mockall

Mock dependencies for isolated unit testing.

```toml
# Cargo.toml
[dev-dependencies]
mockall = "0.13"
```

```rust
use mockall::automock;

// Define a trait for the dependency
#[automock]
trait Database {
    fn get(&self, key: &str) -> Option<String>;
    fn set(&mut self, key: &str, value: &str) -> bool;
}

// Code that uses the trait
fn fetch_or_default(db: &impl Database, key: &str) -> String {
    db.get(key).unwrap_or_else(|| "default".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fetch_found() {
        let mut mock = MockDatabase::new();
        mock.expect_get()
            .with(mockall::predicate::eq("key1"))
            .returning(|_| Some("value1".to_string()));

        assert_eq!(fetch_or_default(&mock, "key1"), "value1");
    }

    #[test]
    fn test_fetch_not_found() {
        let mut mock = MockDatabase::new();
        mock.expect_get()
            .returning(|_| None);

        assert_eq!(fetch_or_default(&mock, "missing"), "default");
    }
}
```

### Benchmarking with criterion

Measure performance with statistically rigorous benchmarks.

```toml
# Cargo.toml
[dev-dependencies]
criterion = { version = "0.5", features = ["html_reports"] }

[[bench]]
name = "my_benchmark"
harness = false
```

```rust
// benches/my_benchmark.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn fibonacci(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}

fn criterion_benchmark(c: &mut Criterion) {
    c.bench_function("fib 20", |b| {
        b.iter(|| fibonacci(black_box(20)))
    });

    // Compare multiple functions
    let mut group = c.benchmark_group("sorting");
    let data: Vec<i32> = (0..1000).rev().collect();

    group.bench_function("sort", |b| {
        b.iter_batched(
            || data.clone(),
            |mut v| v.sort(),
            criterion::BatchSize::SmallInput,
        )
    });

    group.bench_function("sort_unstable", |b| {
        b.iter_batched(
            || data.clone(),
            |mut v| v.sort_unstable(),
            criterion::BatchSize::SmallInput,
        )
    });
    group.finish();
}

criterion_group!(benches, criterion_benchmark);
criterion_main!(benches);
```

Run benchmarks with `cargo bench`.

### Integration Tests

Integration tests live in the `tests/` directory and test your crate as a black box.

```
my_crate/
├── src/
│   └── lib.rs
├── tests/
│   ├── common/
│   │   └── mod.rs      # Shared test utilities
│   ├── integration_test.rs
│   └── another_test.rs
└── Cargo.toml
```

```rust
// tests/common/mod.rs
pub fn setup() -> TestContext {
    // Setup code shared across integration tests
    TestContext::new()
}

// tests/integration_test.rs
mod common;

#[test]
fn test_full_workflow() {
    let ctx = common::setup();
    // Test your public API
    let result = my_crate::process(&ctx.data);
    assert!(result.is_ok());
}
```

### Test Coverage

Use `cargo-tarpaulin` for code coverage reports:

```bash
# Install
cargo install cargo-tarpaulin

# Run with coverage
cargo tarpaulin --out Html

# Ignore certain files
cargo tarpaulin --ignore-tests --out Lcov
```

---

## Documentation

### Doc Comments

```rust
/// Adds two numbers together.
///
/// # Arguments
///
/// * `a` - The first number
/// * `b` - The second number
///
/// # Returns
///
/// The sum of `a` and `b`
///
/// # Examples
///
/// ```
/// let result = add(2, 3);
/// assert_eq!(result, 5);
/// ```
///
/// # Panics
///
/// This function does not panic.
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

/// A point in 2D space.
///
/// # Examples
///
/// ```
/// let p = Point::new(3, 4);
/// assert_eq!(p.distance_from_origin(), 5.0);
/// ```
pub struct Point {
    /// The x coordinate
    pub x: i32,
    /// The y coordinate
    pub y: i32,
}
```

### Module Documentation

```rust
//! # My Module
//!
//! This module provides utilities for...
//!
//! ## Examples
//!
//! ```
//! use my_crate::my_module;
//! // ...
//! ```

pub fn function() { }
```

---

## Common Clippy Lints

Run `cargo clippy` to catch common issues:

### Redundant Clone

```rust
// Bad
let s = String::from("hello");
let s2 = s.clone();  // Unnecessary if s is not used after

// Good
let s = String::from("hello");
let s2 = s;  // Move instead of clone
```

### Unnecessary Collect

```rust
// Bad
let v: Vec<_> = iter.collect();
for x in v { }

// Good
for x in iter { }
```

### Map Then Unwrap

```rust
// Bad
opt.map(|x| x.foo()).unwrap()

// Good
opt.unwrap().foo()
// Or if None is possible:
opt.map(|x| x.foo())
```

### Manual is_some/is_none

```rust
// Bad
match opt {
    Some(_) => true,
    None => false,
}

// Good
opt.is_some()
```

### Len Zero Check

```rust
// Bad
if v.len() == 0 { }
if v.len() > 0 { }

// Good
if v.is_empty() { }
if !v.is_empty() { }
```

### Single Match

```rust
// Bad
match opt {
    Some(x) => do_something(x),
    _ => {},
}

// Good
if let Some(x) = opt {
    do_something(x);
}
```

### Needless Return

```rust
// Bad
fn foo() -> i32 {
    return 42;
}

// Good
fn foo() -> i32 {
    42
}
```

### Manual Entry

```rust
use std::collections::HashMap;

// Bad
if !map.contains_key(&key) {
    map.insert(key, value);
}

// Good
map.entry(key).or_insert(value);
```

---

## Interview Code Style Tips

### Be Explicit When It Helps

```rust
// Type annotations when collection type isn't obvious
let counts: HashMap<char, i32> = HashMap::new();
let result: Vec<Vec<i32>> = vec![];

// Turbofish when needed
let nums: Vec<i32> = "1 2 3".split(' ')
    .map(|s| s.parse::<i32>().unwrap())
    .collect();
```

### Use Early Returns

```rust
// Instead of deeply nested code
fn process(opt: Option<i32>) -> i32 {
    let Some(x) = opt else { return 0; };
    if x < 0 { return 0; }
    x * 2
}
```

### Prefer Standard Library

```rust
// Instead of manual implementation
nums.iter().max();        // Not: manual loop finding max
nums.iter().sum::<i32>(); // Not: manual accumulation
nums.sort();              // Not: bubble sort
```

### Name Things Clearly

```rust
// Good names for interview clarity
let mut visited: HashSet<usize> = HashSet::new();
let mut queue: VecDeque<usize> = VecDeque::new();
let mut result: Vec<i32> = Vec::new();

// Closure parameter names
nums.iter().filter(|&num| *num > 0);  // Not: |&x| *x > 0
```

---

**Next:** [06-concurrency.md](06-concurrency.md) — Fearless concurrency in Rust
