# Behavioral Design Patterns in Rust

> Managing algorithms, communication, and state using Rust's traits, closures, and type system

Behavioral patterns are concerned with algorithms and the assignment of responsibilities between objects. Rust's ownership model, closures, and traits provide powerful ways to implement these patterns safely and efficiently.

**Reading time**: 60-75 minutes | **Difficulty**: Intermediate to Advanced

---

## Table of Contents

1. [Overview](#overview)
2. [Strategy Pattern](#strategy-pattern)
3. [Observer Pattern](#observer-pattern)
4. [State Pattern](#state-pattern)
5. [Command Pattern](#command-pattern)
6. [Iterator Pattern](#iterator-pattern)
7. [Chain of Responsibility](#chain-of-responsibility)
8. [Visitor Pattern](#visitor-pattern)
9. [Rust-Specific Patterns](#rust-specific-patterns)
   - [Type-State Pattern](#type-state-pattern)
   - [RAII Pattern](#raii-pattern)
   - [Newtype Pattern](#newtype-pattern)
10. [Interview Questions](#interview-questions)
11. [Quick Reference](#quick-reference)

---

## Overview

### Behavioral Patterns in Rust

| Traditional OOP | Rust Equivalent |
|-----------------|-----------------|
| Strategy with interfaces | Traits, closures, enums |
| Observer with listeners | Callbacks, channels |
| State with inheritance | Type-state (compile-time) or enums (runtime) |
| Command with objects | Closures, trait objects |
| Iterator with interface | Iterator trait |
| Chain of responsibility | Option chaining, Result |

### Key Rust Features

- **Closures**: First-class functions for callbacks and strategies
- **Enums**: Discriminated unions for state machines
- **Channels**: Safe communication between threads
- **Iterator trait**: Lazy, composable data processing
- **Type-state**: Compile-time state machine validation

---

## Strategy Pattern

The Strategy pattern defines a family of algorithms and makes them interchangeable. Rust offers three approaches: traits, closures, and enums.

### Trait-Based Strategy

```rust
/// Strategy trait
pub trait SortStrategy {
    fn sort(&self, data: &mut [i32]);
}

/// Concrete strategies
pub struct QuickSort;

impl SortStrategy for QuickSort {
    fn sort(&self, data: &mut [i32]) {
        data.sort_unstable();  // Simplified
    }
}

pub struct MergeSort;

impl SortStrategy for MergeSort {
    fn sort(&self, data: &mut [i32]) {
        data.sort();  // Stable sort
    }
}

pub struct BubbleSort;

impl SortStrategy for BubbleSort {
    fn sort(&self, data: &mut [i32]) {
        for i in 0..data.len() {
            for j in 0..data.len() - 1 - i {
                if data[j] > data[j + 1] {
                    data.swap(j, j + 1);
                }
            }
        }
    }
}

/// Context using strategy
pub struct Sorter<S: SortStrategy> {
    strategy: S,
}

impl<S: SortStrategy> Sorter<S> {
    pub fn new(strategy: S) -> Self {
        Self { strategy }
    }

    pub fn sort(&self, data: &mut [i32]) {
        self.strategy.sort(data);
    }
}

// Usage
let mut data = vec![5, 2, 8, 1, 9];
let sorter = Sorter::new(QuickSort);
sorter.sort(&mut data);
```

### Closure-Based Strategy

```rust
/// Using closures for simple strategies
pub struct Processor<F>
where
    F: Fn(&str) -> String,
{
    transform: F,
}

impl<F> Processor<F>
where
    F: Fn(&str) -> String,
{
    pub fn new(transform: F) -> Self {
        Self { transform }
    }

    pub fn process(&self, input: &str) -> String {
        (self.transform)(input)
    }
}

// Usage with closures
let uppercase = Processor::new(|s| s.to_uppercase());
let reverse = Processor::new(|s| s.chars().rev().collect());
let truncate = Processor::new(|s| s.chars().take(10).collect());

println!("{}", uppercase.process("hello"));  // HELLO
println!("{}", reverse.process("hello"));    // olleh
```

### Enum-Based Strategy (Closed Set)

```rust
/// When strategies are known at compile time
pub enum CompressionStrategy {
    Gzip { level: u32 },
    Lz4,
    Zstd { level: i32 },
    None,
}

impl CompressionStrategy {
    pub fn compress(&self, data: &[u8]) -> Vec<u8> {
        match self {
            Self::Gzip { level } => {
                println!("Compressing with gzip level {}", level);
                // gzip compression
                data.to_vec()
            }
            Self::Lz4 => {
                println!("Compressing with lz4");
                // lz4 compression
                data.to_vec()
            }
            Self::Zstd { level } => {
                println!("Compressing with zstd level {}", level);
                // zstd compression
                data.to_vec()
            }
            Self::None => data.to_vec(),
        }
    }
}

// Usage
let strategy = CompressionStrategy::Gzip { level: 6 };
let compressed = strategy.compress(&data);
```

### Dynamic Strategy Selection

```rust
/// Runtime strategy selection with trait objects
pub struct DynamicProcessor {
    strategy: Box<dyn Fn(&str) -> String>,
}

impl DynamicProcessor {
    pub fn new(strategy: Box<dyn Fn(&str) -> String>) -> Self {
        Self { strategy }
    }

    pub fn set_strategy(&mut self, strategy: Box<dyn Fn(&str) -> String>) {
        self.strategy = strategy;
    }

    pub fn process(&self, input: &str) -> String {
        (self.strategy)(input)
    }
}

// Usage
let mut processor = DynamicProcessor::new(Box::new(|s| s.to_uppercase()));
println!("{}", processor.process("hello"));  // HELLO

processor.set_strategy(Box::new(|s| s.to_lowercase()));
println!("{}", processor.process("HELLO"));  // hello
```

---

## Observer Pattern

The Observer pattern defines a one-to-many dependency between objects. In Rust, use callbacks, channels, or the `tokio::sync::broadcast` channel.

### Callback-Based Observer

```rust
use std::collections::HashMap;

/// Event types
#[derive(Debug, Clone, Hash, Eq, PartialEq)]
pub enum Event {
    UserCreated,
    UserUpdated,
    UserDeleted,
}

/// Event data
#[derive(Debug, Clone)]
pub struct EventData {
    pub user_id: u64,
    pub timestamp: u64,
}

/// Observer using callbacks
pub struct EventEmitter {
    listeners: HashMap<Event, Vec<Box<dyn Fn(&EventData) + Send + Sync>>>,
}

impl EventEmitter {
    pub fn new() -> Self {
        Self { listeners: HashMap::new() }
    }

    pub fn on<F>(&mut self, event: Event, callback: F)
    where
        F: Fn(&EventData) + Send + Sync + 'static,
    {
        self.listeners
            .entry(event)
            .or_default()
            .push(Box::new(callback));
    }

    pub fn emit(&self, event: Event, data: EventData) {
        if let Some(callbacks) = self.listeners.get(&event) {
            for callback in callbacks {
                callback(&data);
            }
        }
    }
}

// Usage
let mut emitter = EventEmitter::new();

emitter.on(Event::UserCreated, |data| {
    println!("User {} created at {}", data.user_id, data.timestamp);
});

emitter.on(Event::UserCreated, |data| {
    println!("Sending welcome email to user {}", data.user_id);
});

emitter.emit(Event::UserCreated, EventData {
    user_id: 123,
    timestamp: 1234567890,
});
```

### Channel-Based Observer (Async)

```rust
use tokio::sync::broadcast;

/// Event for broadcasting
#[derive(Debug, Clone)]
pub enum AppEvent {
    UserLoggedIn { user_id: u64 },
    DataUpdated { key: String },
    Error { message: String },
}

/// Publisher
pub struct EventBus {
    sender: broadcast::Sender<AppEvent>,
}

impl EventBus {
    pub fn new(capacity: usize) -> Self {
        let (sender, _) = broadcast::channel(capacity);
        Self { sender }
    }

    pub fn subscribe(&self) -> broadcast::Receiver<AppEvent> {
        self.sender.subscribe()
    }

    pub fn publish(&self, event: AppEvent) {
        let _ = self.sender.send(event);
    }
}

// Usage
#[tokio::main]
async fn main() {
    let bus = EventBus::new(100);

    // Subscriber 1
    let mut rx1 = bus.subscribe();
    tokio::spawn(async move {
        while let Ok(event) = rx1.recv().await {
            println!("Subscriber 1: {:?}", event);
        }
    });

    // Subscriber 2
    let mut rx2 = bus.subscribe();
    tokio::spawn(async move {
        while let Ok(event) = rx2.recv().await {
            println!("Subscriber 2: {:?}", event);
        }
    });

    // Publish events
    bus.publish(AppEvent::UserLoggedIn { user_id: 42 });
    bus.publish(AppEvent::DataUpdated { key: "config".into() });
}
```

### Typed Observer with Traits

```rust
/// Observer trait
pub trait Observer<T> {
    fn on_event(&self, event: &T);
}

/// Subject that can be observed
pub struct Subject<T> {
    observers: Vec<Box<dyn Observer<T>>>,
}

impl<T> Subject<T> {
    pub fn new() -> Self {
        Self { observers: Vec::new() }
    }

    pub fn attach(&mut self, observer: Box<dyn Observer<T>>) {
        self.observers.push(observer);
    }

    pub fn notify(&self, event: &T) {
        for observer in &self.observers {
            observer.on_event(event);
        }
    }
}

/// Example usage with stock prices
pub struct StockPrice {
    symbol: String,
    price: f64,
}

pub struct PriceLogger;

impl Observer<StockPrice> for PriceLogger {
    fn on_event(&self, event: &StockPrice) {
        println!("{}: ${:.2}", event.symbol, event.price);
    }
}

pub struct PriceAlert {
    threshold: f64,
}

impl Observer<StockPrice> for PriceAlert {
    fn on_event(&self, event: &StockPrice) {
        if event.price > self.threshold {
            println!("ALERT: {} exceeded ${:.2}!", event.symbol, self.threshold);
        }
    }
}
```

---

## State Pattern

The State pattern allows an object to alter its behavior when its internal state changes. Rust offers compile-time (type-state) and runtime (enum) approaches.

### Enum-Based State (Runtime)

```rust
/// States for a document workflow
#[derive(Debug, Clone)]
pub enum DocumentState {
    Draft {
        content: String,
    },
    Review {
        content: String,
        reviewer: String,
    },
    Published {
        content: String,
        published_at: u64,
    },
    Archived {
        content: String,
        archived_at: u64,
    },
}

/// Document with state machine
pub struct Document {
    state: DocumentState,
}

impl Document {
    pub fn new(content: String) -> Self {
        Self {
            state: DocumentState::Draft { content },
        }
    }

    pub fn submit_for_review(&mut self, reviewer: String) -> Result<(), StateError> {
        self.state = match &self.state {
            DocumentState::Draft { content } => {
                DocumentState::Review {
                    content: content.clone(),
                    reviewer,
                }
            }
            _ => return Err(StateError::InvalidTransition),
        };
        Ok(())
    }

    pub fn approve(&mut self) -> Result<(), StateError> {
        self.state = match &self.state {
            DocumentState::Review { content, .. } => {
                DocumentState::Published {
                    content: content.clone(),
                    published_at: current_timestamp(),
                }
            }
            _ => return Err(StateError::InvalidTransition),
        };
        Ok(())
    }

    pub fn reject(&mut self) -> Result<(), StateError> {
        self.state = match &self.state {
            DocumentState::Review { content, .. } => {
                DocumentState::Draft { content: content.clone() }
            }
            _ => return Err(StateError::InvalidTransition),
        };
        Ok(())
    }

    pub fn archive(&mut self) -> Result<(), StateError> {
        self.state = match &self.state {
            DocumentState::Published { content, .. } => {
                DocumentState::Archived {
                    content: content.clone(),
                    archived_at: current_timestamp(),
                }
            }
            _ => return Err(StateError::InvalidTransition),
        };
        Ok(())
    }

    pub fn can_edit(&self) -> bool {
        matches!(self.state, DocumentState::Draft { .. })
    }

    pub fn content(&self) -> &str {
        match &self.state {
            DocumentState::Draft { content } => content,
            DocumentState::Review { content, .. } => content,
            DocumentState::Published { content, .. } => content,
            DocumentState::Archived { content, .. } => content,
        }
    }
}
```

### Trait-Based State (Dynamic)

```rust
/// State trait
pub trait ConnectionState {
    fn connect(self: Box<Self>) -> Box<dyn ConnectionState>;
    fn disconnect(self: Box<Self>) -> Box<dyn ConnectionState>;
    fn send(&self, data: &[u8]) -> Result<(), SendError>;
    fn state_name(&self) -> &'static str;
}

/// Disconnected state
pub struct Disconnected;

impl ConnectionState for Disconnected {
    fn connect(self: Box<Self>) -> Box<dyn ConnectionState> {
        println!("Connecting...");
        Box::new(Connected { socket: Socket::new() })
    }

    fn disconnect(self: Box<Self>) -> Box<dyn ConnectionState> {
        println!("Already disconnected");
        self
    }

    fn send(&self, _data: &[u8]) -> Result<(), SendError> {
        Err(SendError::NotConnected)
    }

    fn state_name(&self) -> &'static str {
        "Disconnected"
    }
}

/// Connected state
pub struct Connected {
    socket: Socket,
}

impl ConnectionState for Connected {
    fn connect(self: Box<Self>) -> Box<dyn ConnectionState> {
        println!("Already connected");
        self
    }

    fn disconnect(self: Box<Self>) -> Box<dyn ConnectionState> {
        println!("Disconnecting...");
        Box::new(Disconnected)
    }

    fn send(&self, data: &[u8]) -> Result<(), SendError> {
        self.socket.write(data)?;
        Ok(())
    }

    fn state_name(&self) -> &'static str {
        "Connected"
    }
}

/// Context
pub struct Connection {
    state: Box<dyn ConnectionState>,
}

impl Connection {
    pub fn new() -> Self {
        Self { state: Box::new(Disconnected) }
    }

    pub fn connect(&mut self) {
        let state = std::mem::replace(&mut self.state, Box::new(Disconnected));
        self.state = state.connect();
    }

    pub fn disconnect(&mut self) {
        let state = std::mem::replace(&mut self.state, Box::new(Disconnected));
        self.state = state.disconnect();
    }

    pub fn send(&self, data: &[u8]) -> Result<(), SendError> {
        self.state.send(data)
    }
}
```

---

## Command Pattern

The Command pattern encapsulates a request as an object. In Rust, closures and trait objects work well.

### Closure-Based Command

```rust
/// Simple command using closures
pub struct CommandHistory {
    commands: Vec<Box<dyn Fn()>>,
    undo_commands: Vec<Box<dyn Fn()>>,
}

impl CommandHistory {
    pub fn new() -> Self {
        Self {
            commands: Vec::new(),
            undo_commands: Vec::new(),
        }
    }

    pub fn execute<F, U>(&mut self, command: F, undo: U)
    where
        F: Fn() + 'static,
        U: Fn() + 'static,
    {
        command();
        self.commands.push(Box::new(command));
        self.undo_commands.push(Box::new(undo));
    }

    pub fn undo(&mut self) {
        if let Some(undo) = self.undo_commands.pop() {
            undo();
            self.commands.pop();
        }
    }
}
```

### Trait-Based Command

```rust
/// Command trait
pub trait Command {
    fn execute(&mut self);
    fn undo(&mut self);
    fn description(&self) -> &str;
}

/// Text editor context
pub struct TextEditor {
    content: String,
    cursor: usize,
}

impl TextEditor {
    pub fn new() -> Self {
        Self { content: String::new(), cursor: 0 }
    }
}

/// Insert command
pub struct InsertCommand {
    editor: Rc<RefCell<TextEditor>>,
    text: String,
    position: usize,
}

impl Command for InsertCommand {
    fn execute(&mut self) {
        let mut editor = self.editor.borrow_mut();
        self.position = editor.cursor;
        editor.content.insert_str(self.position, &self.text);
        editor.cursor += self.text.len();
    }

    fn undo(&mut self) {
        let mut editor = self.editor.borrow_mut();
        editor.content.drain(self.position..self.position + self.text.len());
        editor.cursor = self.position;
    }

    fn description(&self) -> &str {
        "Insert text"
    }
}

/// Delete command
pub struct DeleteCommand {
    editor: Rc<RefCell<TextEditor>>,
    deleted: String,
    position: usize,
    count: usize,
}

impl Command for DeleteCommand {
    fn execute(&mut self) {
        let mut editor = self.editor.borrow_mut();
        self.position = editor.cursor;
        self.deleted = editor.content[self.position..self.position + self.count].to_string();
        editor.content.drain(self.position..self.position + self.count);
    }

    fn undo(&mut self) {
        let mut editor = self.editor.borrow_mut();
        editor.content.insert_str(self.position, &self.deleted);
        editor.cursor = self.position + self.deleted.len();
    }

    fn description(&self) -> &str {
        "Delete text"
    }
}

/// Command invoker with history
pub struct CommandInvoker {
    history: Vec<Box<dyn Command>>,
    current: usize,
}

impl CommandInvoker {
    pub fn new() -> Self {
        Self { history: Vec::new(), current: 0 }
    }

    pub fn execute(&mut self, mut command: Box<dyn Command>) {
        command.execute();
        self.history.truncate(self.current);
        self.history.push(command);
        self.current += 1;
    }

    pub fn undo(&mut self) {
        if self.current > 0 {
            self.current -= 1;
            self.history[self.current].undo();
        }
    }

    pub fn redo(&mut self) {
        if self.current < self.history.len() {
            self.history[self.current].execute();
            self.current += 1;
        }
    }
}
```

---

## Iterator Pattern

Rust has the Iterator pattern built into the standard library. Here's how to create custom iterators.

### Custom Iterator

```rust
/// Binary tree for iteration
pub struct BinaryTree<T> {
    root: Option<Box<Node<T>>>,
}

struct Node<T> {
    value: T,
    left: Option<Box<Node<T>>>,
    right: Option<Box<Node<T>>>,
}

/// In-order iterator
pub struct InOrderIter<'a, T> {
    stack: Vec<&'a Node<T>>,
}

impl<'a, T> Iterator for InOrderIter<'a, T> {
    type Item = &'a T;

    fn next(&mut self) -> Option<Self::Item> {
        while let Some(node) = self.stack.last() {
            if let Some(ref left) = node.left {
                // Check if we need to go left
                // (simplified - actual impl needs visited tracking)
            }
        }
        self.stack.pop().map(|node| &node.value)
    }
}

impl<T> BinaryTree<T> {
    pub fn iter(&self) -> InOrderIter<'_, T> {
        let mut stack = Vec::new();
        if let Some(ref root) = self.root {
            stack.push(root.as_ref());
        }
        InOrderIter { stack }
    }
}

impl<T> IntoIterator for BinaryTree<T> {
    type Item = T;
    type IntoIter = IntoIter<T>;

    fn into_iter(self) -> Self::IntoIter {
        IntoIter { tree: self }
    }
}
```

### Iterator Adapters

```rust
/// Custom iterator adapter
pub struct Chunks<I: Iterator> {
    iter: I,
    size: usize,
}

impl<I: Iterator> Iterator for Chunks<I> {
    type Item = Vec<I::Item>;

    fn next(&mut self) -> Option<Self::Item> {
        let mut chunk = Vec::with_capacity(self.size);
        for _ in 0..self.size {
            match self.iter.next() {
                Some(item) => chunk.push(item),
                None => break,
            }
        }
        if chunk.is_empty() {
            None
        } else {
            Some(chunk)
        }
    }
}

/// Extension trait
pub trait ChunkExt: Iterator + Sized {
    fn chunks(self, size: usize) -> Chunks<Self> {
        Chunks { iter: self, size }
    }
}

impl<I: Iterator> ChunkExt for I {}

// Usage
for chunk in (0..10).chunks(3) {
    println!("{:?}", chunk);
}
// [0, 1, 2]
// [3, 4, 5]
// [6, 7, 8]
// [9]
```

---

## Chain of Responsibility

The Chain of Responsibility passes requests along a chain of handlers. In Rust, this works well with `Option` chaining and trait objects.

### Linked Handler Chain

```rust
/// Handler trait
pub trait Handler {
    fn handle(&self, request: &Request) -> Option<Response>;
    fn set_next(&mut self, next: Box<dyn Handler>);
}

/// Base handler implementation
pub struct BaseHandler {
    next: Option<Box<dyn Handler>>,
}

impl BaseHandler {
    pub fn new() -> Self {
        Self { next: None }
    }

    fn handle_next(&self, request: &Request) -> Option<Response> {
        self.next.as_ref()?.handle(request)
    }
}

/// Authentication handler
pub struct AuthHandler {
    base: BaseHandler,
}

impl Handler for AuthHandler {
    fn handle(&self, request: &Request) -> Option<Response> {
        if request.has_valid_token() {
            println!("Auth: Token valid");
            self.base.handle_next(request)
        } else {
            println!("Auth: Invalid token");
            Some(Response::unauthorized())
        }
    }

    fn set_next(&mut self, next: Box<dyn Handler>) {
        self.base.next = Some(next);
    }
}

/// Rate limiting handler
pub struct RateLimitHandler {
    base: BaseHandler,
    limit: u32,
}

impl Handler for RateLimitHandler {
    fn handle(&self, request: &Request) -> Option<Response> {
        if self.is_within_limit(request) {
            println!("RateLimit: Within limit");
            self.base.handle_next(request)
        } else {
            println!("RateLimit: Exceeded");
            Some(Response::too_many_requests())
        }
    }

    fn set_next(&mut self, next: Box<dyn Handler>) {
        self.base.next = Some(next);
    }
}

/// Final handler
pub struct RequestHandler {
    base: BaseHandler,
}

impl Handler for RequestHandler {
    fn handle(&self, request: &Request) -> Option<Response> {
        println!("Processing request...");
        Some(Response::ok())
    }

    fn set_next(&mut self, _next: Box<dyn Handler>) {}
}

// Build chain
let mut auth = AuthHandler { base: BaseHandler::new() };
let mut rate_limit = RateLimitHandler { base: BaseHandler::new(), limit: 100 };
let handler = RequestHandler { base: BaseHandler::new() };

rate_limit.set_next(Box::new(handler));
auth.set_next(Box::new(rate_limit));

// Use chain
let response = auth.handle(&request);
```

### Functional Chain with Closures

```rust
/// Middleware type
type Middleware = Box<dyn Fn(Request, &dyn Fn(Request) -> Response) -> Response>;

/// Chain middleware
pub struct MiddlewareChain {
    middlewares: Vec<Middleware>,
}

impl MiddlewareChain {
    pub fn new() -> Self {
        Self { middlewares: Vec::new() }
    }

    pub fn add<F>(&mut self, middleware: F)
    where
        F: Fn(Request, &dyn Fn(Request) -> Response) -> Response + 'static,
    {
        self.middlewares.push(Box::new(middleware));
    }

    pub fn handle(&self, request: Request, final_handler: impl Fn(Request) -> Response) -> Response {
        let mut next: Box<dyn Fn(Request) -> Response> = Box::new(final_handler);

        for middleware in self.middlewares.iter().rev() {
            let prev_next = next;
            let mw = middleware;
            next = Box::new(move |req| mw(req, &*prev_next));
        }

        next(request)
    }
}

// Usage
let mut chain = MiddlewareChain::new();

chain.add(|req, next| {
    println!("Logging request...");
    let response = next(req);
    println!("Logging response...");
    response
});

chain.add(|req, next| {
    println!("Checking auth...");
    if req.is_authenticated() {
        next(req)
    } else {
        Response::unauthorized()
    }
});

let response = chain.handle(request, |_| Response::ok());
```

---

## Visitor Pattern

The Visitor pattern separates algorithms from object structure. In Rust, use double dispatch with traits.

### Classic Visitor

```rust
/// Element trait
pub trait Element {
    fn accept(&self, visitor: &dyn Visitor);
}

/// Visitor trait
pub trait Visitor {
    fn visit_file(&self, file: &File);
    fn visit_directory(&self, dir: &Directory);
}

/// Concrete elements
pub struct File {
    pub name: String,
    pub size: u64,
}

impl Element for File {
    fn accept(&self, visitor: &dyn Visitor) {
        visitor.visit_file(self);
    }
}

pub struct Directory {
    pub name: String,
    pub children: Vec<Box<dyn Element>>,
}

impl Element for Directory {
    fn accept(&self, visitor: &dyn Visitor) {
        visitor.visit_directory(self);
        for child in &self.children {
            child.accept(visitor);
        }
    }
}

/// Concrete visitors
pub struct SizeCalculator {
    total: Cell<u64>,
}

impl Visitor for SizeCalculator {
    fn visit_file(&self, file: &File) {
        self.total.set(self.total.get() + file.size);
    }

    fn visit_directory(&self, _dir: &Directory) {
        // Directories have no intrinsic size
    }
}

pub struct FileLister {
    files: RefCell<Vec<String>>,
}

impl Visitor for FileLister {
    fn visit_file(&self, file: &File) {
        self.files.borrow_mut().push(file.name.clone());
    }

    fn visit_directory(&self, _dir: &Directory) {}
}

// Usage
let root = Directory {
    name: "project".into(),
    children: vec![
        Box::new(File { name: "main.rs".into(), size: 1024 }),
        Box::new(File { name: "lib.rs".into(), size: 512 }),
    ],
};

let calculator = SizeCalculator { total: Cell::new(0) };
root.accept(&calculator);
println!("Total size: {} bytes", calculator.total.get());
```

---

## Rust-Specific Patterns

### Type-State Pattern

The Type-State pattern uses Rust's type system to enforce state machine transitions at compile time.

```rust
use std::marker::PhantomData;

/// State markers
pub struct Locked;
pub struct Unlocked;

/// Door with type-state
pub struct Door<State> {
    _state: PhantomData<State>,
}

impl Door<Locked> {
    pub fn new() -> Self {
        Self { _state: PhantomData }
    }

    /// Unlock returns a new Door in Unlocked state
    pub fn unlock(self, key: &Key) -> Result<Door<Unlocked>, DoorError> {
        if key.is_valid() {
            Ok(Door { _state: PhantomData })
        } else {
            Err(DoorError::InvalidKey)
        }
    }
}

impl Door<Unlocked> {
    /// Open is only available on unlocked doors
    pub fn open(&mut self) {
        println!("Door opened");
    }

    /// Lock returns a new Door in Locked state
    pub fn lock(self) -> Door<Locked> {
        Door { _state: PhantomData }
    }
}

// Usage - compiler prevents invalid states
let door = Door::<Locked>::new();
// door.open();  // Error! open() not available for Locked

let door = door.unlock(&key)?;
door.open();  // OK

let door = door.lock();
// door.open();  // Error! Locked again
```

### Complex Type-State Example

```rust
use std::marker::PhantomData;

/// Builder states
pub struct NoConnection;
pub struct HasConnection;
pub struct Authenticated;

/// Database client with type-state
pub struct DbClient<State> {
    connection_string: Option<String>,
    pool: Option<Pool>,
    _state: PhantomData<State>,
}

impl DbClient<NoConnection> {
    pub fn new() -> Self {
        Self {
            connection_string: None,
            pool: None,
            _state: PhantomData,
        }
    }

    pub fn connect(self, conn_str: &str) -> Result<DbClient<HasConnection>, DbError> {
        let pool = Pool::connect(conn_str)?;
        Ok(DbClient {
            connection_string: Some(conn_str.to_string()),
            pool: Some(pool),
            _state: PhantomData,
        })
    }
}

impl DbClient<HasConnection> {
    pub fn authenticate(self, user: &str, pass: &str) -> Result<DbClient<Authenticated>, AuthError> {
        // Verify credentials
        Ok(DbClient {
            connection_string: self.connection_string,
            pool: self.pool,
            _state: PhantomData,
        })
    }
}

impl DbClient<Authenticated> {
    /// Query only available after authentication
    pub fn query(&self, sql: &str) -> Result<Vec<Row>, QueryError> {
        self.pool.as_ref().unwrap().query(sql)
    }

    /// Execute only available after authentication
    pub fn execute(&self, sql: &str) -> Result<u64, QueryError> {
        self.pool.as_ref().unwrap().execute(sql)
    }
}

// Compile-time safety
let client = DbClient::new();
// client.query("SELECT 1");  // Error! Not connected

let client = client.connect("postgres://localhost/db")?;
// client.query("SELECT 1");  // Error! Not authenticated

let client = client.authenticate("admin", "secret")?;
client.query("SELECT 1")?;  // OK!
```

### RAII Pattern (Resource Acquisition Is Initialization)

Rust's ownership system naturally implements RAII. Resources are acquired in constructors and released in `Drop`.

```rust
/// File lock using RAII
pub struct FileLock {
    path: PathBuf,
    file: File,
}

impl FileLock {
    pub fn acquire(path: impl AsRef<Path>) -> io::Result<Self> {
        let path = path.as_ref().to_path_buf();
        let file = File::create(&path)?;
        file.lock_exclusive()?;  // Acquire lock
        println!("Lock acquired: {:?}", path);
        Ok(Self { path, file })
    }
}

impl Drop for FileLock {
    fn drop(&mut self) {
        println!("Releasing lock: {:?}", self.path);
        let _ = self.file.unlock();
        let _ = std::fs::remove_file(&self.path);
    }
}

// Usage - lock automatically released when out of scope
fn process_with_lock() -> Result<(), Error> {
    let _lock = FileLock::acquire("/tmp/myapp.lock")?;

    // Do work...

    Ok(())
}  // Lock released here, even on early return or panic

/// Database transaction using RAII
pub struct Transaction<'a> {
    conn: &'a mut Connection,
    committed: bool,
}

impl<'a> Transaction<'a> {
    pub fn begin(conn: &'a mut Connection) -> Result<Self, DbError> {
        conn.execute("BEGIN")?;
        Ok(Self { conn, committed: false })
    }

    pub fn commit(mut self) -> Result<(), DbError> {
        self.conn.execute("COMMIT")?;
        self.committed = true;
        Ok(())
    }

    pub fn execute(&mut self, sql: &str) -> Result<(), DbError> {
        self.conn.execute(sql)
    }
}

impl Drop for Transaction<'_> {
    fn drop(&mut self) {
        if !self.committed {
            let _ = self.conn.execute("ROLLBACK");
        }
    }
}

// Usage - automatic rollback on error
fn transfer_funds(conn: &mut Connection, from: u64, to: u64, amount: f64) -> Result<(), Error> {
    let mut tx = Transaction::begin(conn)?;

    tx.execute(&format!("UPDATE accounts SET balance = balance - {} WHERE id = {}", amount, from))?;
    tx.execute(&format!("UPDATE accounts SET balance = balance + {} WHERE id = {}", amount, to))?;

    tx.commit()?;  // Only commits if both succeed
    Ok(())
}  // If commit not reached, Drop rollbacks
```

### Newtype Pattern

The Newtype pattern wraps types to provide type safety and additional semantics.

```rust
/// Newtypes for type safety
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct UserId(pub u64);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct OrderId(pub u64);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct ProductId(pub u64);

/// Can't accidentally mix them up
fn find_user(id: UserId) -> Option<User> { ... }
fn find_order(id: OrderId) -> Option<Order> { ... }

// This won't compile:
// find_user(OrderId(123));

/// Newtype with validation
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Email(String);

impl Email {
    pub fn new(s: impl Into<String>) -> Result<Self, ValidationError> {
        let s = s.into();
        if s.contains('@') && s.len() >= 3 {
            Ok(Self(s))
        } else {
            Err(ValidationError::InvalidEmail)
        }
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl std::fmt::Display for Email {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Newtype with unit semantics
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Meters(pub f64);

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Feet(pub f64);

impl Meters {
    pub fn to_feet(self) -> Feet {
        Feet(self.0 * 3.28084)
    }
}

impl Feet {
    pub fn to_meters(self) -> Meters {
        Meters(self.0 / 3.28084)
    }
}

impl std::ops::Add for Meters {
    type Output = Self;
    fn add(self, other: Self) -> Self {
        Meters(self.0 + other.0)
    }
}

// Can't add meters to feet directly:
// Meters(5.0) + Feet(10.0);  // Error!

// Must convert first:
let total = Meters(5.0) + Feet(10.0).to_meters();
```

---

## Interview Questions

### Q1: When would you use type-state vs runtime state?

**Answer**:
- **Type-state**: When states are known at compile time and invalid transitions should be compile errors. More rigid but safer.
- **Runtime state**: When states are determined dynamically or transitions happen based on runtime data. More flexible.

### Q2: How do you implement the Observer pattern in multi-threaded Rust?

**Answer**: Use `tokio::sync::broadcast` for async or `crossbeam::channel` for sync:

```rust
use tokio::sync::broadcast;

let (tx, _rx) = broadcast::channel(16);
let mut rx1 = tx.subscribe();
let mut rx2 = tx.subscribe();

tx.send(event).unwrap();
```

### Q3: What's the difference between RAII and explicit cleanup?

**Answer**: RAII uses `Drop` for automatic cleanup when values go out of scope:
- **Automatic**: No forgotten cleanup
- **Exception-safe**: Works even on panic
- **Composable**: Nesting naturally works

---

## Quick Reference

| Pattern | Rust Mechanism | Use Case |
|---------|---------------|----------|
| Strategy | Traits, closures, enums | Interchangeable algorithms |
| Observer | Callbacks, channels | Event notification |
| State | Type-state, enums | State machines |
| Command | Closures, trait objects | Undo/redo, queuing |
| Iterator | Iterator trait | Collection traversal |
| Chain | Option chaining, linked handlers | Request processing |
| Visitor | Double dispatch | Operations on structure |
| Type-State | PhantomData, generics | Compile-time state |
| RAII | Drop trait | Resource management |
| Newtype | Tuple struct | Type safety |

---

## Resources

- [Rust Design Patterns - Behavioral](https://rust-unofficial.github.io/patterns/patterns/behavioural/index.html)
- [Type-State Pattern in Rust](https://cliffle.com/blog/rust-typestate/)
- [RAII in Rust](https://doc.rust-lang.org/rust-by-example/scope/raii.html)

---

**Next**: [12-anti-patterns-best-practices.md](12-anti-patterns-best-practices.md) — Anti-Patterns and Best Practices
