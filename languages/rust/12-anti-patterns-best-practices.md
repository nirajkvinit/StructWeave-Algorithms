# Rust Anti-Patterns and Best Practices

> **Reading time**: 45-60 minutes | **Difficulty**: Intermediate to Advanced | **Rust Edition**: 2024

Master the common pitfalls that trip up Rust developers and learn the best practices that distinguish production-quality code from novice mistakes.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
   - [Excessive Cloning](#excessive-cloning)
   - [Unwrap Abuse](#unwrap-abuse)
   - [Fighting the Borrow Checker](#fighting-the-borrow-checker)
   - [Stringly Typed Code](#stringly-typed-code)
   - [Ignoring Results](#ignoring-results)
   - [Blocking in Async](#blocking-in-async)
   - [Overusing Unsafe](#overusing-unsafe)
   - [Reference Cycles](#reference-cycles)
   - [Inefficient String Usage](#inefficient-string-usage)
   - [Premature Optimization](#premature-optimization)
3. [Best Practices to Apply](#best-practices-to-apply)
   - [Error Handling](#error-handling)
   - [API Design](#api-design)
   - [Performance Patterns](#performance-patterns)
   - [Testing Patterns](#testing-patterns)
   - [Documentation Standards](#documentation-standards)
4. [Quick Reference](#quick-reference)

---

## Introduction

Anti-patterns are common programming practices that appear to solve a problem but actually create more issues—bugs, performance problems, or maintenance nightmares. Understanding these pitfalls is essential for:

- **Writing reliable code** that doesn't surprise you at runtime
- **Code reviews** where you'll spot these issues in others' code
- **Interviews** where these are frequently tested
- **Debugging** when mysterious behavior originates from these traps

### The Cost of Anti-Patterns

| Anti-Pattern | Common Symptom | Impact |
|--------------|----------------|--------|
| Excessive cloning | Slow code, high memory | Performance |
| Unwrap abuse | Panics in production | Reliability |
| Fighting borrow checker | Ugly code, Rc everywhere | Maintainability |
| Stringly typed | Runtime errors | Type safety |
| Ignoring Results | Silent failures | Correctness |
| Blocking in async | Deadlocks, starvation | Concurrency |

---

## Anti-Patterns to Avoid

### Excessive Cloning

The most common anti-pattern when learning Rust is adding `.clone()` everywhere to make the borrow checker happy.

#### The Problem

```rust
// BAD: Cloning to avoid borrow issues
fn process_users(users: Vec<User>) {
    let users_copy = users.clone();  // Unnecessary clone

    for user in users_copy {
        println!("{}", user.name.clone());  // Unnecessary clone
        send_email(user.email.clone());     // Unnecessary clone
    }
}

// BAD: Cloning in a loop
fn find_matching(items: &[String], pattern: &str) -> Vec<String> {
    let mut results = Vec::new();
    for item in items {
        if item.contains(pattern) {
            results.push(item.clone());  // Clone on every match
        }
    }
    results
}
```

#### Why It's Bad

- **Performance**: Cloning allocates new memory and copies data
- **Memory**: Duplicates data unnecessarily
- **Signal**: Often indicates misunderstanding of ownership

#### The Fix

```rust
// GOOD: Take ownership when you need it
fn process_users(users: Vec<User>) {
    for user in users {  // Move into loop
        println!("{}", user.name);  // No clone needed
        send_email(&user.email);    // Borrow instead of clone
    }
}

// GOOD: Use references when you don't need ownership
fn process_users(users: &[User]) {
    for user in users {
        println!("{}", user.name);
        send_email(&user.email);
    }
}

// GOOD: Use iterators and collect
fn find_matching(items: &[String], pattern: &str) -> Vec<&String> {
    items.iter()
        .filter(|item| item.contains(pattern))
        .collect()
}

// Or if you need owned strings:
fn find_matching(items: &[String], pattern: &str) -> Vec<String> {
    items.iter()
        .filter(|item| item.contains(pattern))
        .cloned()  // Clone only matches, not all items
        .collect()
}
```

#### When Cloning IS Appropriate

```rust
// Clone for thread safety (moving to another thread)
let data = Arc::new(data);
let data_clone = Arc::clone(&data);  // Cheap reference count increment
thread::spawn(move || process(data_clone));

// Clone for caching/storing a copy
let backup = current_state.clone();

// Clone small types (Copy types don't even need clone)
let x: i32 = y;  // Implicit copy for Copy types
```

---

### Unwrap Abuse

Using `.unwrap()` or `.expect()` carelessly leads to panics in production.

#### The Problem

```rust
// BAD: Unwrap in production code
fn get_user_email(id: u64) -> String {
    let user = database.find_user(id).unwrap();  // Panics if user not found!
    user.email.unwrap()  // Panics if email is None!
}

// BAD: Unwrap on user input
fn parse_config(input: &str) -> Config {
    let value: i32 = input.parse().unwrap();  // Panics on invalid input!
    Config { value }
}

// BAD: Expect without useful message
fn load_file(path: &str) -> String {
    std::fs::read_to_string(path).expect("failed")  // Unhelpful message
}
```

#### Why It's Bad

- **Production panics**: Crashes instead of graceful error handling
- **Poor UX**: Users see panic messages instead of helpful errors
- **Debugging difficulty**: Often unclear why the panic occurred

#### The Fix

```rust
// GOOD: Propagate errors with ?
fn get_user_email(id: u64) -> Result<String, Error> {
    let user = database.find_user(id)?;
    let email = user.email.ok_or(Error::NoEmail)?;
    Ok(email)
}

// GOOD: Handle the error case
fn parse_config(input: &str) -> Result<Config, ConfigError> {
    let value: i32 = input.parse()
        .map_err(|_| ConfigError::InvalidValue(input.to_string()))?;
    Ok(Config { value })
}

// GOOD: Match on Option/Result
fn get_user_email(id: u64) -> Option<String> {
    database.find_user(id)
        .and_then(|user| user.email)
}

// ACCEPTABLE: Expect with descriptive message (for programming errors)
fn load_config() -> Config {
    let path = std::env::var("CONFIG_PATH")
        .expect("CONFIG_PATH environment variable must be set");
    // ...
}
```

#### When Unwrap IS Appropriate

```rust
// Tests - panics are fine
#[test]
fn test_parsing() {
    let result = parse("valid").unwrap();
    assert_eq!(result, expected);
}

// After validation
fn process(s: &str) {
    if s.is_empty() {
        return;
    }
    let first = s.chars().next().unwrap();  // Safe: we checked is_empty
}

// Const/static initialization (compile-time verified)
static REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^\d+$").unwrap()  // Compile-time regex
});

// When proof of correctness is clear
let pos: u32 = neg.abs().try_into().unwrap();  // We know abs() is positive
```

---

### Fighting the Borrow Checker

When the borrow checker complains, some developers use `Rc<RefCell<T>>` or `Arc<Mutex<T>>` everywhere.

#### The Problem

```rust
// BAD: Using Rc<RefCell> to avoid restructuring
struct Graph {
    nodes: Rc<RefCell<Vec<Rc<RefCell<Node>>>>>,
}

impl Graph {
    fn add_edge(&self, from: usize, to: usize) {
        let nodes = self.nodes.borrow();
        let from_node = nodes[from].borrow_mut();
        // Now try to borrow another node...
        let to_node = nodes[to].borrow_mut();  // Might panic!
    }
}

// BAD: Mutex where not needed
struct Counter {
    value: Arc<Mutex<i32>>,  // Overkill for single-threaded code
}
```

#### Why It's Bad

- **Runtime panics**: `RefCell` panics on double mutable borrow
- **Performance overhead**: Mutex has locking overhead
- **Hidden complexity**: Moves compile-time checks to runtime
- **Code smell**: Usually indicates design issue

#### The Fix

```rust
// GOOD: Restructure to avoid shared mutability
struct Graph {
    nodes: Vec<Node>,
    edges: Vec<(usize, usize)>,  // Store edges separately
}

impl Graph {
    fn add_edge(&mut self, from: usize, to: usize) {
        self.edges.push((from, to));
    }
}

// GOOD: Use indices instead of references
struct Arena<T> {
    items: Vec<T>,
}

impl<T> Arena<T> {
    fn add(&mut self, item: T) -> usize {
        let index = self.items.len();
        self.items.push(item);
        index
    }

    fn get(&self, index: usize) -> Option<&T> {
        self.items.get(index)
    }

    fn get_mut(&mut self, index: usize) -> Option<&mut T> {
        self.items.get_mut(index)
    }
}

// GOOD: Use Cell for simple interior mutability
use std::cell::Cell;

struct Counter {
    value: Cell<i32>,  // No runtime borrow checking needed
}

impl Counter {
    fn increment(&self) {
        self.value.set(self.value.get() + 1);
    }
}
```

#### When Rc/RefCell ARE Appropriate

```rust
// Tree structures with parent references
struct Node {
    value: i32,
    parent: Option<Weak<RefCell<Node>>>,
    children: Vec<Rc<RefCell<Node>>>,
}

// Shared state in callbacks (where ownership is unclear)
let state = Rc::new(RefCell::new(AppState::new()));
button.on_click({
    let state = Rc::clone(&state);
    move || {
        state.borrow_mut().count += 1;
    }
});
```

---

### Stringly Typed Code

Using strings where you should use types.

#### The Problem

```rust
// BAD: Using strings for fixed values
fn set_status(status: &str) {
    match status {
        "pending" => { /* ... */ }
        "approved" => { /* ... */ }
        "rejected" => { /* ... */ }
        _ => panic!("Invalid status"),  // Runtime error!
    }
}

// BAD: Stringly typed configuration
fn connect(config: HashMap<String, String>) {
    let host = config.get("host").unwrap();
    let port: u16 = config.get("port").unwrap().parse().unwrap();
    // Typos like "hots" or "prot" are silent bugs!
}

// BAD: String identifiers
fn find_user(role: &str) -> User {
    match role {
        "admin" => { /* ... */ }
        "user" => { /* ... */ }
        "Admin" => { /* ... */ }  // Oops, case sensitivity bug!
        _ => panic!(),
    }
}
```

#### Why It's Bad

- **No compile-time checking**: Typos become runtime errors
- **Refactoring danger**: Can't use IDE rename
- **No exhaustiveness**: Easy to miss cases

#### The Fix

```rust
// GOOD: Use enums
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Status {
    Pending,
    Approved,
    Rejected,
}

fn set_status(status: Status) {
    match status {
        Status::Pending => { /* ... */ }
        Status::Approved => { /* ... */ }
        Status::Rejected => { /* ... */ }
        // No default case needed - compiler ensures exhaustiveness
    }
}

// GOOD: Use typed configuration
struct DatabaseConfig {
    host: String,
    port: u16,
    username: String,
    password: String,
}

fn connect(config: DatabaseConfig) {
    // All fields are guaranteed to exist and have correct types
}

// GOOD: Newtype pattern for type safety
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
struct UserId(String);

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
struct OrderId(String);

fn find_user(id: UserId) -> User { /* ... */ }
fn find_order(id: OrderId) -> Order { /* ... */ }

// Can't accidentally pass OrderId to find_user!
// find_user(OrderId("123".into()));  // Compile error!
```

---

### Ignoring Results

Silently ignoring `Result` values hides errors.

#### The Problem

```rust
// BAD: Ignoring Result
fn save_data(data: &Data) {
    fs::write("data.json", serde_json::to_string(data).unwrap());
    // What if write fails? We'll never know!
}

// BAD: Silently swallowing errors
fn log_message(msg: &str) {
    let _ = file.write_all(msg.as_bytes());
    // Error silently ignored
}

// BAD: Not handling all Result variants
fn process() {
    if let Ok(data) = load_data() {
        // What about the Err case?
    }
}
```

#### Why It's Bad

- **Silent failures**: Bugs hide until production
- **Data loss**: Failed writes go unnoticed
- **Debugging difficulty**: Hard to trace issues

#### The Fix

```rust
// GOOD: Propagate errors
fn save_data(data: &Data) -> Result<(), SaveError> {
    let json = serde_json::to_string(data)?;
    fs::write("data.json", json)?;
    Ok(())
}

// GOOD: Log non-critical errors
fn log_message(msg: &str) {
    if let Err(e) = file.write_all(msg.as_bytes()) {
        eprintln!("Failed to write log: {}", e);
    }
}

// GOOD: Handle both cases explicitly
fn process() -> Result<(), Error> {
    let data = load_data()?;  // Propagates error
    // ...
    Ok(())
}

// GOOD: Use expect for intentional ignoring (with reason)
fn optional_cleanup() {
    // Cleanup is best-effort, failure is acceptable
    let _ = fs::remove_file("temp.txt");  // Explicit ignore
}
```

#### Compiler Help

```rust
// Enable these lints in Cargo.toml or lib.rs
#![warn(unused_must_use)]
#![deny(unused_results)]

// Or use clippy
// cargo clippy -- -W clippy::unused_io_amount
```

---

### Blocking in Async

Calling blocking operations in async code starves the runtime.

#### The Problem

```rust
// BAD: Blocking sleep in async
async fn process_request() {
    // Blocks the entire runtime thread!
    std::thread::sleep(Duration::from_secs(1));

    // Other tasks on this thread are starved
}

// BAD: Blocking I/O in async
async fn read_file() -> String {
    // This blocks!
    std::fs::read_to_string("data.txt").unwrap()
}

// BAD: Blocking database query in async
async fn query_db() -> Vec<Row> {
    // If the DB client is synchronous, this blocks!
    sync_db_client.query("SELECT * FROM users")
}
```

#### Why It's Bad

- **Thread starvation**: Other tasks can't run
- **Deadlocks**: If waiting for something on the same thread
- **Poor throughput**: Negates async benefits

#### The Fix

```rust
// GOOD: Use async sleep
async fn process_request() {
    tokio::time::sleep(Duration::from_secs(1)).await;
}

// GOOD: Use async file I/O
async fn read_file() -> Result<String, std::io::Error> {
    tokio::fs::read_to_string("data.txt").await
}

// GOOD: Use spawn_blocking for CPU-intensive work
async fn compute_hash(data: Vec<u8>) -> String {
    tokio::task::spawn_blocking(move || {
        // CPU-intensive work runs on dedicated thread pool
        expensive_hash(&data)
    }).await.unwrap()
}

// GOOD: Use async database clients
async fn query_db() -> Result<Vec<Row>, Error> {
    sqlx::query("SELECT * FROM users")
        .fetch_all(&pool)
        .await
}
```

---

### Overusing Unsafe

Using `unsafe` when safe alternatives exist.

#### The Problem

```rust
// BAD: Unnecessary unsafe for performance myths
fn sum(slice: &[i32]) -> i32 {
    let mut sum = 0;
    unsafe {
        for i in 0..slice.len() {
            sum += *slice.get_unchecked(i);  // Unnecessary!
        }
    }
    sum
}

// BAD: Unsafe for convenience
fn get_string_ptr(s: &str) -> *const u8 {
    unsafe {
        std::mem::transmute(s.as_ptr())  // Wrong use of transmute!
    }
}

// BAD: Unsafe with incorrect invariants
fn split_at_unsafe(s: &str, mid: usize) -> (&str, &str) {
    unsafe {
        // Doesn't check if mid is at char boundary!
        (s.get_unchecked(..mid), s.get_unchecked(mid..))
    }
}
```

#### Why It's Bad

- **Undefined behavior**: Memory corruption, crashes
- **Security vulnerabilities**: Buffer overflows, etc.
- **Maintenance burden**: Unsafe code requires careful auditing

#### The Fix

```rust
// GOOD: Safe version is just as fast
fn sum(slice: &[i32]) -> i32 {
    slice.iter().sum()  // LLVM optimizes this identically!
}

// GOOD: Use safe pointer operations
fn get_string_ptr(s: &str) -> *const u8 {
    s.as_ptr()  // No unsafe needed
}

// GOOD: Use safe string operations
fn split_at(s: &str, mid: usize) -> Option<(&str, &str)> {
    if s.is_char_boundary(mid) {
        Some(s.split_at(mid))
    } else {
        None
    }
}
```

#### When Unsafe IS Appropriate

```rust
// FFI bindings
extern "C" {
    fn external_function(ptr: *const c_char) -> c_int;
}

// Implementing unsafe traits with care
unsafe impl Send for MyType {}  // Only if truly safe!

// Performance-critical inner loops (with benchmarks!)
// AND only after profiling shows it's the bottleneck
// AND with extensive testing
// AND with clear documentation
```

---

### Reference Cycles

Creating cycles with `Rc` that cause memory leaks.

#### The Problem

```rust
// BAD: Reference cycle causes memory leak
use std::cell::RefCell;
use std::rc::Rc;

struct Node {
    value: i32,
    next: Option<Rc<RefCell<Node>>>,
}

fn create_cycle() {
    let a = Rc::new(RefCell::new(Node { value: 1, next: None }));
    let b = Rc::new(RefCell::new(Node { value: 2, next: None }));

    a.borrow_mut().next = Some(Rc::clone(&b));
    b.borrow_mut().next = Some(Rc::clone(&a));  // Cycle!

    // a and b will NEVER be deallocated!
}
```

#### Why It's Bad

- **Memory leak**: Cyclic references prevent deallocation
- **Resource leak**: Files, connections never closed
- **Growing memory**: Program slowly consumes all memory

#### The Fix

```rust
// GOOD: Use Weak for back-references
use std::rc::Weak;

struct Node {
    value: i32,
    next: Option<Rc<RefCell<Node>>>,
    prev: Option<Weak<RefCell<Node>>>,  // Weak reference
}

fn create_list() {
    let a = Rc::new(RefCell::new(Node { value: 1, next: None, prev: None }));
    let b = Rc::new(RefCell::new(Node { value: 2, next: None, prev: None }));

    a.borrow_mut().next = Some(Rc::clone(&b));
    b.borrow_mut().prev = Some(Rc::downgrade(&a));  // Weak, no cycle!
}

// GOOD: Use indices instead of references
struct Graph {
    nodes: Vec<NodeData>,
    edges: Vec<(usize, usize)>,
}

// GOOD: Use arenas
struct Arena<T> {
    items: Vec<T>,
}

struct TreeNode {
    value: i32,
    children: Vec<usize>,  // Indices into arena
}
```

---

### Inefficient String Usage

Using strings inefficiently, causing unnecessary allocations.

#### The Problem

```rust
// BAD: Using &String instead of &str
fn process(s: &String) {  // Unnecessarily restrictive
    println!("{}", s);
}

// BAD: Concatenation in a loop
fn join_strings(items: &[&str]) -> String {
    let mut result = String::new();
    for item in items {
        result = result + item + ", ";  // Allocates new String each iteration!
    }
    result
}

// BAD: Unnecessary to_string()
fn check_prefix(s: &str) -> bool {
    s.to_string().starts_with("prefix")  // Useless allocation
}
```

#### The Fix

```rust
// GOOD: Accept &str (works with String and &str)
fn process(s: &str) {
    println!("{}", s);
}

// GOOD: Use push_str or format!
fn join_strings(items: &[&str]) -> String {
    items.join(", ")  // Single allocation
}

// Or with more control:
fn join_strings(items: &[&str]) -> String {
    let capacity: usize = items.iter().map(|s| s.len()).sum();
    let mut result = String::with_capacity(capacity + items.len() * 2);
    for (i, item) in items.iter().enumerate() {
        if i > 0 { result.push_str(", "); }
        result.push_str(item);
    }
    result
}

// GOOD: Work with &str directly
fn check_prefix(s: &str) -> bool {
    s.starts_with("prefix")  // No allocation!
}

// GOOD: Use Cow for conditional ownership
use std::borrow::Cow;

fn normalize(s: &str) -> Cow<str> {
    if s.contains(' ') {
        Cow::Owned(s.replace(' ', "_"))  // Only allocate when needed
    } else {
        Cow::Borrowed(s)  // No allocation
    }
}
```

---

### Premature Optimization

Optimizing before measuring.

#### The Problem

```rust
// BAD: Assuming unsafe is faster
fn sum(data: &[i32]) -> i32 {
    unsafe {
        // "This must be faster, it's unsafe!"
        data.iter().fold(0, |acc, &x| acc + x)
    }
}

// BAD: Avoiding allocations at cost of clarity
fn process(data: &[u8]) -> Vec<u8> {
    let mut result = Vec::new();
    // Complex manual memory management instead of:
    // data.iter().filter(...).copied().collect()
}

// BAD: Premature parallelization
fn simple_sum(numbers: &[i32]) -> i32 {
    numbers.par_iter().sum()  // Overhead > benefit for small data
}
```

#### The Fix

```rust
// GOOD: Write clear code first
fn sum(data: &[i32]) -> i32 {
    data.iter().sum()  // Clear and fast
}

// GOOD: Use idiomatic code
fn process(data: &[u8]) -> Vec<u8> {
    data.iter()
        .filter(|&&b| b != 0)
        .copied()
        .collect()
}

// GOOD: Profile before optimizing
fn sum_large(numbers: &[i32]) -> i32 {
    if numbers.len() > 10_000 {
        numbers.par_iter().sum()  // Worth it for large data
    } else {
        numbers.iter().sum()  // Sequential for small data
    }
}
```

#### The Right Approach

1. **Write clear, idiomatic code first**
2. **Measure performance** (benchmarks, profiling)
3. **Identify actual bottlenecks**
4. **Optimize only what matters**
5. **Measure again** to verify improvement

---

## Best Practices to Apply

### Error Handling

#### Use thiserror for Library Errors

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DatabaseError {
    #[error("connection failed: {0}")]
    Connection(#[from] std::io::Error),

    #[error("query failed: {query}")]
    Query { query: String, #[source] source: SqlError },

    #[error("record not found: {0}")]
    NotFound(String),
}

// Automatic From implementations and Display
```

#### Use anyhow for Application Errors

```rust
use anyhow::{Context, Result};

fn load_config() -> Result<Config> {
    let path = std::env::var("CONFIG_PATH")
        .context("CONFIG_PATH not set")?;

    let content = std::fs::read_to_string(&path)
        .with_context(|| format!("Failed to read config from {}", path))?;

    let config: Config = serde_json::from_str(&content)
        .context("Failed to parse config")?;

    Ok(config)
}
```

#### Error Propagation Patterns

```rust
// Use ? for propagation
fn process() -> Result<Output, Error> {
    let data = load()?;
    let transformed = transform(data)?;
    let result = save(transformed)?;
    Ok(result)
}

// Map errors when crossing boundaries
fn api_handler() -> ApiResult<Response> {
    let data = internal_function()
        .map_err(|e| ApiError::Internal(e.to_string()))?;
    Ok(Response::ok(data))
}
```

---

### API Design

#### Accept Borrowed, Return Owned

```rust
// GOOD: Accept references, return owned
fn process(input: &str) -> String {
    input.to_uppercase()
}

// GOOD: Accept AsRef for flexibility
fn read_file(path: impl AsRef<Path>) -> std::io::Result<String> {
    std::fs::read_to_string(path)
}

// Usage:
read_file("foo.txt");       // Works
read_file(Path::new("x"));  // Works
read_file(PathBuf::from("y"));  // Works
```

#### Use the Builder Pattern for Complex Construction

```rust
#[derive(Default)]
struct RequestBuilder {
    method: Option<Method>,
    url: Option<String>,
    headers: Vec<(String, String)>,
    body: Option<Vec<u8>>,
}

impl RequestBuilder {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn method(mut self, method: Method) -> Self {
        self.method = Some(method);
        self
    }

    pub fn url(mut self, url: impl Into<String>) -> Self {
        self.url = Some(url.into());
        self
    }

    pub fn header(mut self, name: impl Into<String>, value: impl Into<String>) -> Self {
        self.headers.push((name.into(), value.into()));
        self
    }

    pub fn body(mut self, body: impl Into<Vec<u8>>) -> Self {
        self.body = Some(body.into());
        self
    }

    pub fn build(self) -> Result<Request, BuildError> {
        Ok(Request {
            method: self.method.ok_or(BuildError::MissingMethod)?,
            url: self.url.ok_or(BuildError::MissingUrl)?,
            headers: self.headers,
            body: self.body.unwrap_or_default(),
        })
    }
}

// Usage:
let request = RequestBuilder::new()
    .method(Method::POST)
    .url("https://api.example.com")
    .header("Content-Type", "application/json")
    .body(json_bytes)
    .build()?;
```

#### Use Type-State Pattern for Safety

```rust
struct Connection<State> {
    inner: TcpStream,
    _state: PhantomData<State>,
}

struct Disconnected;
struct Connected;
struct Authenticated;

impl Connection<Disconnected> {
    pub fn connect(addr: &str) -> Result<Connection<Connected>, Error> {
        let stream = TcpStream::connect(addr)?;
        Ok(Connection {
            inner: stream,
            _state: PhantomData,
        })
    }
}

impl Connection<Connected> {
    pub fn authenticate(self, credentials: &Credentials) -> Result<Connection<Authenticated>, Error> {
        // Authenticate...
        Ok(Connection {
            inner: self.inner,
            _state: PhantomData,
        })
    }
}

impl Connection<Authenticated> {
    pub fn query(&mut self, sql: &str) -> Result<Vec<Row>, Error> {
        // Only authenticated connections can query
    }
}

// Can't call query() without authenticating first!
// Connection::<Connected>::query();  // Compile error!
```

---

### Performance Patterns

#### Pre-allocate Collections

```rust
// GOOD: Reserve capacity upfront
fn process_items(items: &[Item]) -> Vec<Result> {
    let mut results = Vec::with_capacity(items.len());
    for item in items {
        results.push(process(item));
    }
    results
}

// GOOD: Use collect with size hint
fn transform(items: impl Iterator<Item = i32> + ExactSizeIterator) -> Vec<i32> {
    items.map(|x| x * 2).collect()  // collect() uses size_hint
}
```

#### Use Iterators Over Loops

```rust
// Iterators often optimize better than manual loops
fn sum_squares(data: &[i32]) -> i32 {
    data.iter().map(|x| x * x).sum()
}

// Lazy evaluation
fn first_match<'a>(data: &'a [String], prefix: &str) -> Option<&'a str> {
    data.iter()
        .find(|s| s.starts_with(prefix))  // Stops at first match
        .map(|s| s.as_str())
}
```

#### Avoid Unnecessary Work

```rust
// GOOD: Short-circuit evaluation
fn validate(items: &[Item]) -> bool {
    items.iter().all(|item| item.is_valid())  // Stops on first false
}

// GOOD: Use entry API for maps
use std::collections::HashMap;

fn count_words(words: &[&str]) -> HashMap<&str, usize> {
    let mut counts = HashMap::new();
    for word in words {
        *counts.entry(*word).or_insert(0) += 1;
    }
    counts
}
```

---

### Testing Patterns

#### Use Test Fixtures

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn sample_user() -> User {
        User {
            id: 1,
            name: "Test User".to_string(),
            email: "test@example.com".to_string(),
        }
    }

    fn sample_order() -> Order {
        Order {
            id: 1,
            user_id: 1,
            items: vec![],
            total: 0.0,
        }
    }

    #[test]
    fn test_user_creation() {
        let user = sample_user();
        assert_eq!(user.name, "Test User");
    }
}
```

#### Test Error Cases

```rust
#[test]
fn test_parse_invalid_input() {
    let result = parse("invalid");
    assert!(result.is_err());
    assert!(matches!(result, Err(ParseError::InvalidFormat(_))));
}

#[test]
#[should_panic(expected = "index out of bounds")]
fn test_panic_condition() {
    let v: Vec<i32> = vec![];
    let _ = v[0];
}
```

#### Use Property-Based Testing

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn test_roundtrip(s in "\\PC*") {
        let encoded = encode(&s);
        let decoded = decode(&encoded).unwrap();
        assert_eq!(s, decoded);
    }

    #[test]
    fn test_sort_is_sorted(mut v in prop::collection::vec(any::<i32>(), 0..100)) {
        v.sort();
        for window in v.windows(2) {
            assert!(window[0] <= window[1]);
        }
    }
}
```

---

### Documentation Standards

#### Document Public APIs

```rust
/// Creates a new `Widget` with the given configuration.
///
/// # Arguments
///
/// * `config` - Configuration options for the widget
///
/// # Returns
///
/// A new `Widget` instance, or an error if configuration is invalid.
///
/// # Errors
///
/// Returns `WidgetError::InvalidConfig` if the configuration is invalid.
///
/// # Examples
///
/// ```
/// use mylib::Widget;
///
/// let config = WidgetConfig::default();
/// let widget = Widget::new(config)?;
/// # Ok::<(), mylib::WidgetError>(())
/// ```
///
/// # Panics
///
/// Panics if called from within a `Widget` callback (to avoid reentrancy).
pub fn new(config: WidgetConfig) -> Result<Widget, WidgetError> {
    // ...
}
```

#### Document Unsafe Code

```rust
/// Converts a raw pointer to a reference.
///
/// # Safety
///
/// - `ptr` must be non-null
/// - `ptr` must be properly aligned for `T`
/// - `ptr` must point to a valid `T`
/// - The memory must not be mutated while the reference exists
pub unsafe fn ptr_to_ref<'a, T>(ptr: *const T) -> &'a T {
    &*ptr
}
```

---

## Quick Reference

### Anti-Patterns Summary

| Anti-Pattern | Symptom | Fix |
|--------------|---------|-----|
| Excessive cloning | `.clone()` everywhere | Use references, take ownership |
| Unwrap abuse | Panics in production | Use `?`, `Result`, `Option` |
| Fighting borrow checker | `Rc<RefCell<T>>` everywhere | Restructure data, use indices |
| Stringly typed | Match on strings | Use enums, newtypes |
| Ignoring Results | `let _ = fallible()` | Handle or propagate errors |
| Blocking in async | `std::thread::sleep` | Use async alternatives |
| Overusing unsafe | `unsafe` for performance | Profile first, trust safe code |
| Reference cycles | `Rc` cycles | Use `Weak`, indices |
| Inefficient strings | `&String`, loop concat | Use `&str`, `join()` |
| Premature optimization | Micro-optimizations | Profile, then optimize |

### Best Practices Summary

| Area | Practice |
|------|----------|
| Error Handling | `thiserror` for libs, `anyhow` for apps |
| API Design | Accept `&str`, return `String` |
| Performance | Pre-allocate, use iterators |
| Testing | Fixtures, error cases, property tests |
| Documentation | Examples, safety docs for unsafe |

### Lints to Enable

```rust
// In lib.rs or main.rs
#![warn(
    clippy::all,
    clippy::pedantic,
    clippy::nursery,
    rust_2018_idioms,
    missing_docs,
    unused_results,
)]

// Or in Cargo.toml
[lints.rust]
unused_must_use = "warn"

[lints.clippy]
all = "warn"
pedantic = "warn"
```

---

## Resources

- [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- [Effective Rust](https://www.lurklurk.org/effective-rust/)
- [Rust Design Patterns - Anti-Patterns](https://rust-unofficial.github.io/patterns/anti_patterns/index.html)
- [Clippy Lints](https://rust-lang.github.io/rust-clippy/master/)

---

**Next**: [09-design-patterns-creational.md](09-design-patterns-creational.md) — Creational Design Patterns

---

<p align="center">
<b>The best Rust code:</b> Clear, idiomatic, and measured before optimized.
</p>
