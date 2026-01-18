# Structural Design Patterns in Rust

> Composing types using Rust's traits, generics, and smart pointers

Structural patterns deal with the composition of types to form larger structures while keeping them flexible and efficient. In Rust, these patterns leverage traits, generics, and smart pointers instead of inheritance.

**Reading time**: 45-60 minutes | **Difficulty**: Intermediate

---

## Table of Contents

1. [Overview](#overview)
2. [Adapter Pattern](#adapter-pattern)
3. [Decorator Pattern](#decorator-pattern)
4. [Facade Pattern](#facade-pattern)
5. [Composite Pattern](#composite-pattern)
6. [Proxy Pattern](#proxy-pattern)
7. [Flyweight Pattern](#flyweight-pattern)
8. [Bridge Pattern](#bridge-pattern)
9. [Comparison and When to Use](#comparison-and-when-to-use)
10. [Interview Questions](#interview-questions)
11. [Quick Reference](#quick-reference)

---

## Overview

### Structural Patterns in Rust vs OOP

| Traditional OOP | Rust Equivalent |
|-----------------|-----------------|
| Inheritance-based adapter | Wrapper struct with trait impl |
| Decorator inheritance | Wrapper with delegating methods |
| Facade class | Module with public API |
| Composite with inheritance | Enum or trait objects |
| Proxy with inheritance | Smart pointers, `Deref` |
| Flyweight with factories | Interning, `Rc`/`Arc` |

### Key Rust Mechanisms

- **Newtype pattern**: Wrapping types for adaptation
- **Trait implementation**: Providing interfaces to wrapped types
- **Smart pointers**: `Box`, `Rc`, `Arc` for indirection
- **Deref coercion**: Transparent access through wrappers

---

## Adapter Pattern

The Adapter pattern allows incompatible interfaces to work together. In Rust, we wrap types and implement the expected trait.

### Basic Adapter

```rust
/// External library types we can't modify
mod external_lib {
    pub struct LegacyPrinter {
        model: String,
    }

    impl LegacyPrinter {
        pub fn new(model: &str) -> Self {
            Self { model: model.to_string() }
        }

        pub fn print_line(&self, text: &str) {
            println!("[{}]: {}", self.model, text);
        }
    }
}

/// Our application's printer interface
pub trait Printer {
    fn print(&self, document: &str);
}

/// Modern printer that implements our trait
pub struct ModernPrinter;

impl Printer for ModernPrinter {
    fn print(&self, document: &str) {
        println!("Printing: {}", document);
    }
}

/// Adapter for the legacy printer
pub struct LegacyPrinterAdapter {
    legacy: external_lib::LegacyPrinter,
}

impl LegacyPrinterAdapter {
    pub fn new(legacy: external_lib::LegacyPrinter) -> Self {
        Self { legacy }
    }
}

impl Printer for LegacyPrinterAdapter {
    fn print(&self, document: &str) {
        // Adapt: split document into lines and use legacy method
        for line in document.lines() {
            self.legacy.print_line(line);
        }
    }
}

/// Client code works with any Printer
fn print_document(printer: &dyn Printer, doc: &str) {
    printer.print(doc);
}

// Usage
fn main() {
    let modern = ModernPrinter;
    let legacy = LegacyPrinterAdapter::new(
        external_lib::LegacyPrinter::new("HP-1000")
    );

    print_document(&modern, "Hello, World!");
    print_document(&legacy, "Hello, Legacy!");
}
```

### Two-Way Adapter

```rust
/// European plug (220V)
pub trait EuropeanPlug {
    fn provide_power_220v(&self) -> Power;
}

/// American plug (110V)
pub trait AmericanPlug {
    fn provide_power_110v(&self) -> Power;
}

/// Adapter that works both ways
pub struct PowerAdapter<P> {
    plug: P,
}

impl<P> PowerAdapter<P> {
    pub fn new(plug: P) -> Self {
        Self { plug }
    }
}

/// Adapt European to American
impl<P: EuropeanPlug> AmericanPlug for PowerAdapter<P> {
    fn provide_power_110v(&self) -> Power {
        let power = self.plug.provide_power_220v();
        Power { voltage: 110, amps: power.amps * 2.0 }
    }
}

/// Adapt American to European
impl<P: AmericanPlug> EuropeanPlug for PowerAdapter<P> {
    fn provide_power_220v(&self) -> Power {
        let power = self.plug.provide_power_110v();
        Power { voltage: 220, amps: power.amps / 2.0 }
    }
}
```

### Iterator Adapter Example

```rust
/// Custom collection
pub struct Tree<T> {
    root: Option<Box<TreeNode<T>>>,
}

struct TreeNode<T> {
    value: T,
    left: Option<Box<TreeNode<T>>>,
    right: Option<Box<TreeNode<T>>>,
}

/// Adapter to make Tree work with standard iterator interface
pub struct InOrderIterator<'a, T> {
    stack: Vec<&'a TreeNode<T>>,
    current: Option<&'a TreeNode<T>>,
}

impl<'a, T> Iterator for InOrderIterator<'a, T> {
    type Item = &'a T;

    fn next(&mut self) -> Option<Self::Item> {
        while let Some(node) = self.current {
            self.stack.push(node);
            self.current = node.left.as_deref();
        }

        self.stack.pop().map(|node| {
            self.current = node.right.as_deref();
            &node.value
        })
    }
}

impl<T> Tree<T> {
    /// Adapt tree to standard iteration
    pub fn iter(&self) -> InOrderIterator<'_, T> {
        InOrderIterator {
            stack: Vec::new(),
            current: self.root.as_deref(),
        }
    }
}

// Now works with standard for loops!
for value in tree.iter() {
    println!("{}", value);
}
```

---

## Decorator Pattern

The Decorator pattern adds responsibilities to objects dynamically. In Rust, we use wrapper types that implement the same trait.

### Basic Decorator

```rust
/// Component trait
pub trait Coffee {
    fn cost(&self) -> f64;
    fn description(&self) -> String;
}

/// Concrete component
pub struct Espresso;

impl Coffee for Espresso {
    fn cost(&self) -> f64 {
        2.00
    }

    fn description(&self) -> String {
        "Espresso".to_string()
    }
}

pub struct Americano;

impl Coffee for Americano {
    fn cost(&self) -> f64 {
        2.50
    }

    fn description(&self) -> String {
        "Americano".to_string()
    }
}

/// Decorators
pub struct WithMilk<C: Coffee> {
    coffee: C,
}

impl<C: Coffee> WithMilk<C> {
    pub fn new(coffee: C) -> Self {
        Self { coffee }
    }
}

impl<C: Coffee> Coffee for WithMilk<C> {
    fn cost(&self) -> f64 {
        self.coffee.cost() + 0.50
    }

    fn description(&self) -> String {
        format!("{} with milk", self.coffee.description())
    }
}

pub struct WithSugar<C: Coffee> {
    coffee: C,
    cubes: u32,
}

impl<C: Coffee> WithSugar<C> {
    pub fn new(coffee: C, cubes: u32) -> Self {
        Self { coffee, cubes }
    }
}

impl<C: Coffee> Coffee for WithSugar<C> {
    fn cost(&self) -> f64 {
        self.coffee.cost() + (self.cubes as f64 * 0.10)
    }

    fn description(&self) -> String {
        format!("{} with {} sugar", self.coffee.description(), self.cubes)
    }
}

pub struct WithWhippedCream<C: Coffee> {
    coffee: C,
}

impl<C: Coffee> WithWhippedCream<C> {
    pub fn new(coffee: C) -> Self {
        Self { coffee }
    }
}

impl<C: Coffee> Coffee for WithWhippedCream<C> {
    fn cost(&self) -> f64 {
        self.coffee.cost() + 0.75
    }

    fn description(&self) -> String {
        format!("{} with whipped cream", self.coffee.description())
    }
}

// Usage - decorators compose
fn main() {
    let coffee = Espresso;
    let coffee = WithMilk::new(coffee);
    let coffee = WithSugar::new(coffee, 2);
    let coffee = WithWhippedCream::new(coffee);

    println!("{}: ${:.2}", coffee.description(), coffee.cost());
    // "Espresso with milk with 2 sugar with whipped cream: $3.45"
}
```

### IO Decorators (Real-World Example)

```rust
use std::io::{Read, Write, Result};

/// Buffered reader decorator
pub struct BufferedReader<R: Read> {
    inner: R,
    buffer: Vec<u8>,
    pos: usize,
    cap: usize,
}

impl<R: Read> BufferedReader<R> {
    pub fn new(inner: R) -> Self {
        Self::with_capacity(8192, inner)
    }

    pub fn with_capacity(capacity: usize, inner: R) -> Self {
        Self {
            inner,
            buffer: vec![0; capacity],
            pos: 0,
            cap: 0,
        }
    }
}

impl<R: Read> Read for BufferedReader<R> {
    fn read(&mut self, buf: &mut [u8]) -> Result<usize> {
        if self.pos >= self.cap {
            self.cap = self.inner.read(&mut self.buffer)?;
            self.pos = 0;
        }

        let available = self.cap - self.pos;
        let to_copy = buf.len().min(available);
        buf[..to_copy].copy_from_slice(&self.buffer[self.pos..self.pos + to_copy]);
        self.pos += to_copy;
        Ok(to_copy)
    }
}

/// Logging decorator
pub struct LoggingWriter<W: Write> {
    inner: W,
    bytes_written: u64,
}

impl<W: Write> LoggingWriter<W> {
    pub fn new(inner: W) -> Self {
        Self { inner, bytes_written: 0 }
    }

    pub fn bytes_written(&self) -> u64 {
        self.bytes_written
    }
}

impl<W: Write> Write for LoggingWriter<W> {
    fn write(&mut self, buf: &[u8]) -> Result<usize> {
        let n = self.inner.write(buf)?;
        self.bytes_written += n as u64;
        println!("Wrote {} bytes (total: {})", n, self.bytes_written);
        Ok(n)
    }

    fn flush(&mut self) -> Result<()> {
        self.inner.flush()
    }
}

// Usage - compose decorators
let file = File::create("output.txt")?;
let writer = LoggingWriter::new(file);
let mut writer = BufWriter::new(writer);
writer.write_all(b"Hello, decorated world!")?;
```

### Dynamic Decorators with Trait Objects

```rust
pub trait Notifier {
    fn send(&self, message: &str);
}

pub struct EmailNotifier {
    email: String,
}

impl Notifier for EmailNotifier {
    fn send(&self, message: &str) {
        println!("Sending email to {}: {}", self.email, message);
    }
}

/// Dynamic decorator
pub struct SlackDecorator {
    inner: Box<dyn Notifier>,
    channel: String,
}

impl SlackDecorator {
    pub fn new(inner: Box<dyn Notifier>, channel: &str) -> Self {
        Self {
            inner,
            channel: channel.to_string(),
        }
    }
}

impl Notifier for SlackDecorator {
    fn send(&self, message: &str) {
        self.inner.send(message);
        println!("Also posting to Slack #{}: {}", self.channel, message);
    }
}

pub struct SmsDecorator {
    inner: Box<dyn Notifier>,
    phone: String,
}

impl Notifier for SmsDecorator {
    fn send(&self, message: &str) {
        self.inner.send(message);
        println!("Also sending SMS to {}: {}", self.phone, message);
    }
}

// Dynamic composition
let notifier: Box<dyn Notifier> = Box::new(EmailNotifier { email: "user@example.com".into() });
let notifier: Box<dyn Notifier> = Box::new(SlackDecorator::new(notifier, "general"));
let notifier: Box<dyn Notifier> = Box::new(SmsDecorator { inner: notifier, phone: "+1234567890".into() });

notifier.send("Important notification!");
```

---

## Facade Pattern

The Facade pattern provides a simplified interface to a complex subsystem. In Rust, this is typically a module or struct that wraps complex internals.

### Subsystem Facade

```rust
/// Complex subsystems
mod video {
    pub struct VideoCodec;

    impl VideoCodec {
        pub fn encode(&self, data: &[u8]) -> Vec<u8> {
            println!("Encoding video...");
            data.to_vec() // Simplified
        }

        pub fn decode(&self, data: &[u8]) -> Vec<u8> {
            println!("Decoding video...");
            data.to_vec()
        }
    }
}

mod audio {
    pub struct AudioCodec;

    impl AudioCodec {
        pub fn encode(&self, data: &[u8]) -> Vec<u8> {
            println!("Encoding audio...");
            data.to_vec()
        }

        pub fn decode(&self, data: &[u8]) -> Vec<u8> {
            println!("Decoding audio...");
            data.to_vec()
        }
    }
}

mod container {
    pub struct Mp4Container;

    impl Mp4Container {
        pub fn pack(&self, video: &[u8], audio: &[u8]) -> Vec<u8> {
            println!("Packing into MP4...");
            [video, audio].concat()
        }

        pub fn unpack(&self, data: &[u8]) -> (Vec<u8>, Vec<u8>) {
            println!("Unpacking MP4...");
            let mid = data.len() / 2;
            (data[..mid].to_vec(), data[mid..].to_vec())
        }
    }
}

/// Facade - simple interface to complex subsystem
pub struct VideoConverter {
    video_codec: video::VideoCodec,
    audio_codec: audio::AudioCodec,
    container: container::Mp4Container,
}

impl VideoConverter {
    pub fn new() -> Self {
        Self {
            video_codec: video::VideoCodec,
            audio_codec: audio::AudioCodec,
            container: container::Mp4Container,
        }
    }

    /// Simple interface - hides all the complexity
    pub fn convert(&self, filename: &str) -> Result<Vec<u8>, ConvertError> {
        println!("Converting {}...", filename);

        // Read file (simplified)
        let raw_data = std::fs::read(filename)?;

        // Unpack
        let (video_data, audio_data) = self.container.unpack(&raw_data);

        // Decode
        let video = self.video_codec.decode(&video_data);
        let audio = self.audio_codec.decode(&audio_data);

        // Process (simplified)
        let processed_video = video;
        let processed_audio = audio;

        // Re-encode
        let encoded_video = self.video_codec.encode(&processed_video);
        let encoded_audio = self.audio_codec.encode(&processed_audio);

        // Pack
        let result = self.container.pack(&encoded_video, &encoded_audio);

        Ok(result)
    }
}

// Client uses simple interface
let converter = VideoConverter::new();
let result = converter.convert("input.mp4")?;
```

### API Client Facade

```rust
/// Complex HTTP client internals
mod http {
    pub struct Client { /* connection pool, etc. */ }
    pub struct Request { /* headers, body, etc. */ }
    pub struct Response { /* status, headers, body */ }
}

mod auth {
    pub struct OAuth2 { /* tokens, refresh, etc. */ }
    pub struct ApiKey { /* key management */ }
}

mod retry {
    pub struct RetryPolicy { /* backoff, max attempts */ }
}

/// Facade for API interactions
pub struct ApiClient {
    http: http::Client,
    auth: auth::OAuth2,
    retry: retry::RetryPolicy,
    base_url: String,
}

impl ApiClient {
    pub fn new(base_url: &str, client_id: &str, client_secret: &str) -> Self {
        Self {
            http: http::Client::new(),
            auth: auth::OAuth2::new(client_id, client_secret),
            retry: retry::RetryPolicy::default(),
            base_url: base_url.to_string(),
        }
    }

    /// Simple interface for GET
    pub async fn get<T: DeserializeOwned>(&self, path: &str) -> Result<T, ApiError> {
        let token = self.auth.get_token().await?;
        let url = format!("{}{}", self.base_url, path);

        self.retry.execute(|| async {
            let response = self.http.get(&url)
                .header("Authorization", format!("Bearer {}", token))
                .send()
                .await?;

            response.json().await
        }).await
    }

    /// Simple interface for POST
    pub async fn post<T, R>(&self, path: &str, body: &T) -> Result<R, ApiError>
    where
        T: Serialize,
        R: DeserializeOwned,
    {
        let token = self.auth.get_token().await?;
        let url = format!("{}{}", self.base_url, path);

        self.retry.execute(|| async {
            let response = self.http.post(&url)
                .header("Authorization", format!("Bearer {}", token))
                .json(body)
                .send()
                .await?;

            response.json().await
        }).await
    }
}

// Client uses simple interface
let api = ApiClient::new("https://api.example.com", "client_id", "secret");
let users: Vec<User> = api.get("/users").await?;
let new_user: User = api.post("/users", &CreateUser { name: "John" }).await?;
```

---

## Composite Pattern

The Composite pattern composes objects into tree structures. In Rust, use enums for closed sets or trait objects for open sets.

### Enum-Based Composite (Closed)

```rust
/// File system composite using enum
#[derive(Debug)]
pub enum FileSystemEntry {
    File {
        name: String,
        size: u64,
    },
    Directory {
        name: String,
        children: Vec<FileSystemEntry>,
    },
}

impl FileSystemEntry {
    pub fn file(name: impl Into<String>, size: u64) -> Self {
        Self::File { name: name.into(), size }
    }

    pub fn directory(name: impl Into<String>) -> Self {
        Self::Directory { name: name.into(), children: Vec::new() }
    }

    pub fn add(&mut self, entry: FileSystemEntry) {
        if let Self::Directory { children, .. } = self {
            children.push(entry);
        }
    }

    pub fn name(&self) -> &str {
        match self {
            Self::File { name, .. } => name,
            Self::Directory { name, .. } => name,
        }
    }

    /// Recursive operation
    pub fn total_size(&self) -> u64 {
        match self {
            Self::File { size, .. } => *size,
            Self::Directory { children, .. } => {
                children.iter().map(|c| c.total_size()).sum()
            }
        }
    }

    /// Tree printing
    pub fn print(&self, indent: usize) {
        let prefix = "  ".repeat(indent);
        match self {
            Self::File { name, size } => {
                println!("{}📄 {} ({} bytes)", prefix, name, size);
            }
            Self::Directory { name, children } => {
                println!("{}📁 {}/", prefix, name);
                for child in children {
                    child.print(indent + 1);
                }
            }
        }
    }
}

// Usage
let mut root = FileSystemEntry::directory("project");

let mut src = FileSystemEntry::directory("src");
src.add(FileSystemEntry::file("main.rs", 1024));
src.add(FileSystemEntry::file("lib.rs", 512));

root.add(src);
root.add(FileSystemEntry::file("Cargo.toml", 256));

root.print(0);
println!("Total size: {} bytes", root.total_size());
```

### Trait-Based Composite (Open)

```rust
/// Component trait
pub trait Graphic {
    fn draw(&self);
    fn bounds(&self) -> Rect;
}

/// Leaf: Circle
pub struct Circle {
    x: f64,
    y: f64,
    radius: f64,
}

impl Graphic for Circle {
    fn draw(&self) {
        println!("Drawing circle at ({}, {}) r={}", self.x, self.y, self.radius);
    }

    fn bounds(&self) -> Rect {
        Rect {
            x: self.x - self.radius,
            y: self.y - self.radius,
            width: self.radius * 2.0,
            height: self.radius * 2.0,
        }
    }
}

/// Leaf: Rectangle
pub struct Rectangle {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

impl Graphic for Rectangle {
    fn draw(&self) {
        println!("Drawing rect at ({}, {}) {}x{}", self.x, self.y, self.width, self.height);
    }

    fn bounds(&self) -> Rect {
        Rect { x: self.x, y: self.y, width: self.width, height: self.height }
    }
}

/// Composite: Group of graphics
pub struct Group {
    children: Vec<Box<dyn Graphic>>,
}

impl Group {
    pub fn new() -> Self {
        Self { children: Vec::new() }
    }

    pub fn add(&mut self, graphic: impl Graphic + 'static) {
        self.children.push(Box::new(graphic));
    }
}

impl Graphic for Group {
    fn draw(&self) {
        println!("Drawing group:");
        for child in &self.children {
            child.draw();
        }
    }

    fn bounds(&self) -> Rect {
        if self.children.is_empty() {
            return Rect::default();
        }

        let mut result = self.children[0].bounds();
        for child in &self.children[1..] {
            result = result.union(&child.bounds());
        }
        result
    }
}

// Usage
let mut scene = Group::new();
scene.add(Circle { x: 100.0, y: 100.0, radius: 50.0 });
scene.add(Rectangle { x: 200.0, y: 200.0, width: 100.0, height: 50.0 });

let mut sub_group = Group::new();
sub_group.add(Circle { x: 300.0, y: 300.0, radius: 25.0 });
scene.add(sub_group);

scene.draw();
```

---

## Proxy Pattern

The Proxy pattern provides a surrogate for another object. In Rust, smart pointers and `Deref` are the primary mechanisms.

### Lazy Initialization Proxy

```rust
use std::sync::OnceLock;

/// Expensive resource
pub struct ExpensiveResource {
    data: Vec<u8>,
}

impl ExpensiveResource {
    pub fn load() -> Self {
        println!("Loading expensive resource...");
        std::thread::sleep(std::time::Duration::from_secs(2));
        Self {
            data: vec![0; 1_000_000],
        }
    }

    pub fn process(&self) -> usize {
        self.data.len()
    }
}

/// Lazy proxy - only loads when needed
pub struct LazyResource {
    inner: OnceLock<ExpensiveResource>,
}

impl LazyResource {
    pub fn new() -> Self {
        Self { inner: OnceLock::new() }
    }

    fn get(&self) -> &ExpensiveResource {
        self.inner.get_or_init(ExpensiveResource::load)
    }

    pub fn process(&self) -> usize {
        self.get().process()
    }
}

// Usage
let resource = LazyResource::new();  // Instant - no loading
// ... later ...
println!("Processing: {}", resource.process());  // Now it loads
```

### Protection Proxy

```rust
/// Protected resource
pub struct SecureDocument {
    content: String,
    classification: SecurityLevel,
}

#[derive(PartialOrd, Ord, PartialEq, Eq)]
pub enum SecurityLevel {
    Public,
    Internal,
    Confidential,
    Secret,
}

/// Protection proxy
pub struct SecureDocumentProxy {
    document: SecureDocument,
}

impl SecureDocumentProxy {
    pub fn new(document: SecureDocument) -> Self {
        Self { document }
    }

    pub fn read(&self, user: &User) -> Result<&str, AccessError> {
        if user.clearance >= self.document.classification {
            Ok(&self.document.content)
        } else {
            Err(AccessError::InsufficientClearance)
        }
    }

    pub fn write(&mut self, user: &User, content: String) -> Result<(), AccessError> {
        if user.clearance >= self.document.classification && user.can_write {
            self.document.content = content;
            Ok(())
        } else {
            Err(AccessError::InsufficientPermissions)
        }
    }
}
```

### Caching Proxy

```rust
use std::collections::HashMap;
use std::hash::Hash;
use std::sync::Mutex;

/// Expensive computation service
pub trait DataService {
    fn fetch(&self, key: &str) -> Result<String, FetchError>;
}

/// Remote service implementation
pub struct RemoteDataService {
    endpoint: String,
}

impl DataService for RemoteDataService {
    fn fetch(&self, key: &str) -> Result<String, FetchError> {
        println!("Fetching {} from {}...", key, self.endpoint);
        // Expensive network call
        Ok(format!("data for {}", key))
    }
}

/// Caching proxy
pub struct CachingProxy<S: DataService> {
    service: S,
    cache: Mutex<HashMap<String, String>>,
}

impl<S: DataService> CachingProxy<S> {
    pub fn new(service: S) -> Self {
        Self {
            service,
            cache: Mutex::new(HashMap::new()),
        }
    }
}

impl<S: DataService> DataService for CachingProxy<S> {
    fn fetch(&self, key: &str) -> Result<String, FetchError> {
        let mut cache = self.cache.lock().unwrap();

        if let Some(cached) = cache.get(key) {
            println!("Cache hit for {}", key);
            return Ok(cached.clone());
        }

        println!("Cache miss for {}", key);
        let result = self.service.fetch(key)?;
        cache.insert(key.to_string(), result.clone());
        Ok(result)
    }
}

// Usage
let service = RemoteDataService { endpoint: "https://api.example.com".into() };
let cached = CachingProxy::new(service);

cached.fetch("user:123")?;  // Network call
cached.fetch("user:123")?;  // Cache hit
cached.fetch("user:456")?;  // Network call
```

### Smart Pointer as Proxy (Deref)

```rust
use std::ops::{Deref, DerefMut};

/// Logging proxy using Deref
pub struct Logged<T> {
    inner: T,
    name: &'static str,
}

impl<T> Logged<T> {
    pub fn new(inner: T, name: &'static str) -> Self {
        println!("[{}] Created", name);
        Self { inner, name }
    }
}

impl<T> Deref for Logged<T> {
    type Target = T;

    fn deref(&self) -> &Self::Target {
        println!("[{}] Accessed", self.name);
        &self.inner
    }
}

impl<T> DerefMut for Logged<T> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        println!("[{}] Mutated", self.name);
        &mut self.inner
    }
}

impl<T> Drop for Logged<T> {
    fn drop(&mut self) {
        println!("[{}] Dropped", self.name);
    }
}

// Usage
let mut vec = Logged::new(Vec::new(), "my_vec");
vec.push(1);  // Logs: [my_vec] Mutated
vec.push(2);
println!("Length: {}", vec.len());  // Logs: [my_vec] Accessed
```

---

## Flyweight Pattern

The Flyweight pattern shares common state to support large numbers of objects efficiently. In Rust, use `Rc`/`Arc` and interning.

### String Interning

```rust
use std::collections::HashSet;
use std::rc::Rc;

/// String interner - shares string allocations
pub struct Interner {
    strings: HashSet<Rc<str>>,
}

impl Interner {
    pub fn new() -> Self {
        Self { strings: HashSet::new() }
    }

    pub fn intern(&mut self, s: &str) -> Rc<str> {
        if let Some(existing) = self.strings.get(s) {
            Rc::clone(existing)
        } else {
            let rc: Rc<str> = s.into();
            self.strings.insert(Rc::clone(&rc));
            rc
        }
    }
}

// Usage - many objects share same string
let mut interner = Interner::new();

let names: Vec<Rc<str>> = (0..1000)
    .map(|i| interner.intern(if i % 2 == 0 { "Alice" } else { "Bob" }))
    .collect();

// Only 2 String allocations, not 1000!
```

### Game Character Flyweight

```rust
use std::collections::HashMap;
use std::rc::Rc;

/// Shared state (intrinsic) - same for all characters of this type
#[derive(Debug)]
pub struct CharacterType {
    name: String,
    sprite: Sprite,
    base_health: u32,
    base_damage: u32,
}

/// Unique state (extrinsic) - different for each instance
pub struct Character {
    type_: Rc<CharacterType>,  // Shared
    x: f64,                    // Unique
    y: f64,                    // Unique
    current_health: u32,       // Unique
}

/// Flyweight factory
pub struct CharacterFactory {
    types: HashMap<String, Rc<CharacterType>>,
}

impl CharacterFactory {
    pub fn new() -> Self {
        Self { types: HashMap::new() }
    }

    pub fn get_type(&mut self, name: &str) -> Rc<CharacterType> {
        self.types.entry(name.to_string()).or_insert_with(|| {
            println!("Loading character type: {}", name);
            Rc::new(CharacterType {
                name: name.to_string(),
                sprite: load_sprite(name),
                base_health: 100,
                base_damage: 10,
            })
        }).clone()
    }

    pub fn create_character(&mut self, type_name: &str, x: f64, y: f64) -> Character {
        let type_ = self.get_type(type_name);
        Character {
            current_health: type_.base_health,
            type_,
            x,
            y,
        }
    }
}

// Usage
let mut factory = CharacterFactory::new();

// Create 1000 orcs - only loads sprite once!
let orcs: Vec<Character> = (0..1000)
    .map(|i| factory.create_character("orc", i as f64 * 10.0, 0.0))
    .collect();

// Create 500 goblins - only loads sprite once!
let goblins: Vec<Character> = (0..500)
    .map(|i| factory.create_character("goblin", 0.0, i as f64 * 10.0))
    .collect();
```

---

## Bridge Pattern

The Bridge pattern separates an abstraction from its implementation. In Rust, this uses trait objects or generics.

### Basic Bridge

```rust
/// Implementation trait
pub trait Renderer {
    fn render_circle(&self, x: f64, y: f64, radius: f64);
    fn render_rect(&self, x: f64, y: f64, width: f64, height: f64);
}

/// Concrete implementations
pub struct SvgRenderer;

impl Renderer for SvgRenderer {
    fn render_circle(&self, x: f64, y: f64, radius: f64) {
        println!("<circle cx=\"{}\" cy=\"{}\" r=\"{}\" />", x, y, radius);
    }

    fn render_rect(&self, x: f64, y: f64, width: f64, height: f64) {
        println!("<rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" />",
            x, y, width, height);
    }
}

pub struct CanvasRenderer;

impl Renderer for CanvasRenderer {
    fn render_circle(&self, x: f64, y: f64, radius: f64) {
        println!("ctx.arc({}, {}, {}, 0, 2 * Math.PI);", x, y, radius);
    }

    fn render_rect(&self, x: f64, y: f64, width: f64, height: f64) {
        println!("ctx.fillRect({}, {}, {}, {});", x, y, width, height);
    }
}

/// Abstraction
pub trait Shape {
    fn draw(&self, renderer: &dyn Renderer);
}

/// Refined abstractions
pub struct Circle {
    x: f64,
    y: f64,
    radius: f64,
}

impl Shape for Circle {
    fn draw(&self, renderer: &dyn Renderer) {
        renderer.render_circle(self.x, self.y, self.radius);
    }
}

pub struct Rectangle {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

impl Shape for Rectangle {
    fn draw(&self, renderer: &dyn Renderer) {
        renderer.render_rect(self.x, self.y, self.width, self.height);
    }
}

// Usage - shapes and renderers vary independently
let shapes: Vec<Box<dyn Shape>> = vec![
    Box::new(Circle { x: 100.0, y: 100.0, radius: 50.0 }),
    Box::new(Rectangle { x: 200.0, y: 200.0, width: 100.0, height: 50.0 }),
];

let svg = SvgRenderer;
let canvas = CanvasRenderer;

println!("SVG output:");
for shape in &shapes {
    shape.draw(&svg);
}

println!("\nCanvas output:");
for shape in &shapes {
    shape.draw(&canvas);
}
```

---

## Comparison and When to Use

| Pattern | Use When | Rust Mechanism |
|---------|----------|----------------|
| Adapter | Incompatible interfaces | Wrapper + trait impl |
| Decorator | Add behavior dynamically | Wrapper + same trait |
| Facade | Simplify complex subsystem | Module/struct |
| Composite | Tree structures | Enum or trait objects |
| Proxy | Control access, lazy load | Smart pointers, Deref |
| Flyweight | Share common state | Rc/Arc, interning |
| Bridge | Vary abstraction and impl | Trait objects, generics |

---

## Interview Questions

### Q1: How is Decorator different from simple composition?

**Answer**: Decorator implements the same trait as the wrapped type, allowing it to be used interchangeably. Simple composition hides the inner type.

```rust
// Decorator: implements same trait
impl<C: Coffee> Coffee for WithMilk<C> { ... }

// Composition: different interface
struct CoffeeShop { coffee: Coffee, milk: Milk }
```

### Q2: When would you use enum vs trait objects for Composite?

**Answer**:
- **Enum**: When variants are fixed and known at compile time. More efficient (no vtable), exhaustive matching.
- **Trait objects**: When the set is open and extensible. More flexible, runtime cost.

### Q3: How do you implement lazy initialization in Rust?

**Answer**: Use `OnceLock` (std) or `Lazy` (once_cell):

```rust
use std::sync::OnceLock;
static RESOURCE: OnceLock<ExpensiveType> = OnceLock::new();
let r = RESOURCE.get_or_init(|| ExpensiveType::load());
```

---

## Quick Reference

| Pattern | Key Trait/Type | Example Use |
|---------|---------------|-------------|
| Adapter | `impl TargetTrait for Wrapper` | Legacy API integration |
| Decorator | `impl Trait for Wrapper<T: Trait>` | Logging, buffering |
| Facade | `pub struct Facade` | Library API |
| Composite | `enum Node { Leaf, Branch(Vec<Node>) }` | File system, UI |
| Proxy | `impl Deref`, `OnceLock` | Lazy loading, caching |
| Flyweight | `Rc<T>`, `Arc<T>` | Game sprites |
| Bridge | `trait Impl`, `trait Abstraction` | Cross-platform |

---

## Resources

- [Rust Design Patterns - Structural](https://rust-unofficial.github.io/patterns/patterns/structural/index.html)
- [Refactoring.Guru - Structural Patterns](https://refactoring.guru/design-patterns/structural-patterns)

---

**Next**: [11-design-patterns-behavioral.md](11-design-patterns-behavioral.md) — Behavioral Design Patterns
