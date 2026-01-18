# Creational Design Patterns in Rust

> Building objects idiomatically using Rust's ownership model and type system

Creational patterns abstract the instantiation process, making systems independent of how objects are created and composed. In Rust, these patterns work differently than in traditional OOP due to ownership, the lack of inheritance, and Rust's powerful type system.

**Reading time**: 45-60 minutes | **Difficulty**: Intermediate

---

## Table of Contents

1. [Overview](#overview)
2. [Builder Pattern](#builder-pattern)
3. [Factory Method Pattern](#factory-method-pattern)
4. [Abstract Factory Pattern](#abstract-factory-pattern)
5. [Singleton Pattern](#singleton-pattern)
6. [Prototype Pattern](#prototype-pattern)
7. [Comparison and When to Use](#comparison-and-when-to-use)
8. [Interview Questions](#interview-questions)
9. [Quick Reference](#quick-reference)

---

## Overview

### Creational Patterns in Rust vs OOP

| Traditional OOP | Rust Equivalent |
|-----------------|-----------------|
| Constructor overloading | Builder pattern, `Default` trait |
| Static factory methods | Associated functions (`new()`, `from()`) |
| Abstract factory | Trait with associated types |
| Singleton class | `lazy_static!`, `OnceLock`, `const` |
| Prototype/clone | `Clone` trait |

### When to Use Each Pattern

```
Need complex object construction? → Builder
Need to hide concrete types? → Factory Method
Need families of related objects? → Abstract Factory
Need exactly one instance? → Singleton (rarely)
Need to copy existing objects? → Prototype (Clone)
```

---

## Builder Pattern

The Builder pattern separates the construction of a complex object from its representation, allowing the same construction process to create different representations.

### The Problem

```rust
// BAD: Constructor with too many parameters
struct Request {
    method: Method,
    url: String,
    headers: HashMap<String, String>,
    body: Option<Vec<u8>>,
    timeout: Duration,
    follow_redirects: bool,
    max_redirects: u32,
    proxy: Option<String>,
    auth: Option<(String, String)>,
}

impl Request {
    // Impossible to remember parameter order!
    fn new(
        method: Method,
        url: String,
        headers: HashMap<String, String>,
        body: Option<Vec<u8>>,
        timeout: Duration,
        follow_redirects: bool,
        max_redirects: u32,
        proxy: Option<String>,
        auth: Option<(String, String)>,
    ) -> Self {
        // ...
    }
}
```

### Basic Builder

```rust
/// The product we're building
#[derive(Debug, Clone)]
pub struct Request {
    method: Method,
    url: String,
    headers: HashMap<String, String>,
    body: Option<Vec<u8>>,
    timeout: Duration,
}

/// The builder with sensible defaults
#[derive(Default)]
pub struct RequestBuilder {
    method: Method,
    url: String,
    headers: HashMap<String, String>,
    body: Option<Vec<u8>>,
    timeout: Duration,
}

impl RequestBuilder {
    /// Create a new builder with defaults
    pub fn new() -> Self {
        Self {
            method: Method::Get,
            url: String::new(),
            headers: HashMap::new(),
            body: None,
            timeout: Duration::from_secs(30),
        }
    }

    /// Set the HTTP method
    pub fn method(mut self, method: Method) -> Self {
        self.method = method;
        self
    }

    /// Set the URL
    pub fn url(mut self, url: impl Into<String>) -> Self {
        self.url = url.into();
        self
    }

    /// Add a header
    pub fn header(mut self, name: impl Into<String>, value: impl Into<String>) -> Self {
        self.headers.insert(name.into(), value.into());
        self
    }

    /// Set the request body
    pub fn body(mut self, body: impl Into<Vec<u8>>) -> Self {
        self.body = Some(body.into());
        self
    }

    /// Set the timeout
    pub fn timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }

    /// Build the final Request
    pub fn build(self) -> Result<Request, BuildError> {
        if self.url.is_empty() {
            return Err(BuildError::MissingUrl);
        }

        Ok(Request {
            method: self.method,
            url: self.url,
            headers: self.headers,
            body: self.body,
            timeout: self.timeout,
        })
    }
}

// Usage
let request = RequestBuilder::new()
    .method(Method::Post)
    .url("https://api.example.com/users")
    .header("Content-Type", "application/json")
    .header("Authorization", "Bearer token123")
    .body(r#"{"name": "John"}"#)
    .timeout(Duration::from_secs(10))
    .build()?;
```

### Type-State Builder (Compile-Time Validation)

Enforce required fields at compile time using type states:

```rust
use std::marker::PhantomData;

/// Marker types for builder states
pub struct NoUrl;
pub struct HasUrl;

/// Type-state builder ensures URL is set before build
pub struct RequestBuilder<UrlState> {
    method: Method,
    url: String,
    headers: HashMap<String, String>,
    _url_state: PhantomData<UrlState>,
}

impl RequestBuilder<NoUrl> {
    pub fn new() -> Self {
        Self {
            method: Method::Get,
            url: String::new(),
            headers: HashMap::new(),
            _url_state: PhantomData,
        }
    }

    /// Setting URL transitions to HasUrl state
    pub fn url(self, url: impl Into<String>) -> RequestBuilder<HasUrl> {
        RequestBuilder {
            method: self.method,
            url: url.into(),
            headers: self.headers,
            _url_state: PhantomData,
        }
    }
}

impl<S> RequestBuilder<S> {
    /// Method can be set in any state
    pub fn method(mut self, method: Method) -> Self {
        self.method = method;
        self
    }

    /// Headers can be added in any state
    pub fn header(mut self, name: impl Into<String>, value: impl Into<String>) -> Self {
        self.headers.insert(name.into(), value.into());
        self
    }
}

impl RequestBuilder<HasUrl> {
    /// Build is only available when URL is set
    pub fn build(self) -> Request {
        Request {
            method: self.method,
            url: self.url,
            headers: self.headers,
            body: None,
            timeout: Duration::from_secs(30),
        }
    }
}

// Usage
let request = RequestBuilder::new()
    .method(Method::Post)
    .url("https://api.example.com")  // Required!
    .header("Accept", "application/json")
    .build();  // Always succeeds

// This won't compile:
// let request = RequestBuilder::new()
//     .method(Method::Post)
//     .build();  // Error: build() not available for NoUrl state
```

### Builder with bon Crate (Derive Macro)

For simpler cases, use the `bon` crate:

```rust
use bon::Builder;

#[derive(Builder)]
pub struct Request {
    #[builder(default = Method::Get)]
    method: Method,

    url: String,  // Required

    #[builder(default)]
    headers: HashMap<String, String>,

    #[builder(default)]
    body: Option<Vec<u8>>,

    #[builder(default = Duration::from_secs(30))]
    timeout: Duration,
}

// Auto-generated builder
let request = Request::builder()
    .url("https://api.example.com")
    .method(Method::Post)
    .build();
```

### Real-World Example: Database Connection

```rust
pub struct DatabaseConnection {
    host: String,
    port: u16,
    database: String,
    username: String,
    password: String,
    pool_size: u32,
    timeout: Duration,
    ssl_mode: SslMode,
}

pub struct DatabaseConnectionBuilder {
    host: Option<String>,
    port: u16,
    database: Option<String>,
    username: Option<String>,
    password: Option<String>,
    pool_size: u32,
    timeout: Duration,
    ssl_mode: SslMode,
}

impl DatabaseConnectionBuilder {
    pub fn new() -> Self {
        Self {
            host: None,
            port: 5432,  // Default PostgreSQL port
            database: None,
            username: None,
            password: None,
            pool_size: 10,
            timeout: Duration::from_secs(30),
            ssl_mode: SslMode::Prefer,
        }
    }

    pub fn host(mut self, host: impl Into<String>) -> Self {
        self.host = Some(host.into());
        self
    }

    pub fn port(mut self, port: u16) -> Self {
        self.port = port;
        self
    }

    pub fn database(mut self, database: impl Into<String>) -> Self {
        self.database = Some(database.into());
        self
    }

    pub fn credentials(mut self, username: impl Into<String>, password: impl Into<String>) -> Self {
        self.username = Some(username.into());
        self.password = Some(password.into());
        self
    }

    pub fn pool_size(mut self, size: u32) -> Self {
        self.pool_size = size;
        self
    }

    pub fn timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }

    pub fn ssl_mode(mut self, mode: SslMode) -> Self {
        self.ssl_mode = mode;
        self
    }

    pub fn build(self) -> Result<DatabaseConnection, ConfigError> {
        Ok(DatabaseConnection {
            host: self.host.ok_or(ConfigError::MissingHost)?,
            port: self.port,
            database: self.database.ok_or(ConfigError::MissingDatabase)?,
            username: self.username.ok_or(ConfigError::MissingUsername)?,
            password: self.password.ok_or(ConfigError::MissingPassword)?,
            pool_size: self.pool_size,
            timeout: self.timeout,
            ssl_mode: self.ssl_mode,
        })
    }
}

// Usage
let conn = DatabaseConnectionBuilder::new()
    .host("localhost")
    .database("myapp")
    .credentials("admin", "secret")
    .pool_size(20)
    .ssl_mode(SslMode::Require)
    .build()?;
```

---

## Factory Method Pattern

The Factory Method pattern defines an interface for creating objects but lets subclasses decide which class to instantiate. In Rust, we use traits and associated functions.

### Basic Factory with Enum

```rust
/// The product types
pub enum Transport {
    Truck(Truck),
    Ship(Ship),
    Airplane(Airplane),
}

pub struct Truck {
    capacity_kg: u32,
}

pub struct Ship {
    capacity_containers: u32,
}

pub struct Airplane {
    capacity_kg: u32,
    range_km: u32,
}

/// Factory method pattern using enum
impl Transport {
    /// Factory method
    pub fn create(kind: &str, capacity: u32) -> Result<Self, TransportError> {
        match kind {
            "truck" => Ok(Transport::Truck(Truck { capacity_kg: capacity })),
            "ship" => Ok(Transport::Ship(Ship { capacity_containers: capacity })),
            "airplane" => Ok(Transport::Airplane(Airplane {
                capacity_kg: capacity,
                range_km: 10000,
            })),
            _ => Err(TransportError::UnknownType(kind.to_string())),
        }
    }

    pub fn deliver(&self, cargo: &Cargo) {
        match self {
            Transport::Truck(t) => println!("Delivering by truck, capacity: {}kg", t.capacity_kg),
            Transport::Ship(s) => println!("Delivering by ship, containers: {}", s.capacity_containers),
            Transport::Airplane(a) => println!("Delivering by air, range: {}km", a.range_km),
        }
    }
}
```

### Factory with Traits (More Flexible)

```rust
/// Product trait
pub trait Transport {
    fn deliver(&self, cargo: &Cargo) -> Result<(), DeliveryError>;
    fn capacity(&self) -> u32;
}

/// Concrete products
pub struct Truck {
    capacity_kg: u32,
}

impl Transport for Truck {
    fn deliver(&self, cargo: &Cargo) -> Result<(), DeliveryError> {
        println!("Delivering by road...");
        Ok(())
    }

    fn capacity(&self) -> u32 {
        self.capacity_kg
    }
}

pub struct Ship {
    capacity_containers: u32,
}

impl Transport for Ship {
    fn deliver(&self, cargo: &Cargo) -> Result<(), DeliveryError> {
        println!("Delivering by sea...");
        Ok(())
    }

    fn capacity(&self) -> u32 {
        self.capacity_containers * 20_000  // ~20 tons per container
    }
}

/// Factory trait
pub trait TransportFactory {
    fn create_transport(&self) -> Box<dyn Transport>;
}

/// Concrete factories
pub struct TruckFactory;

impl TransportFactory for TruckFactory {
    fn create_transport(&self) -> Box<dyn Transport> {
        Box::new(Truck { capacity_kg: 10_000 })
    }
}

pub struct ShipFactory;

impl TransportFactory for ShipFactory {
    fn create_transport(&self) -> Box<dyn Transport> {
        Box::new(Ship { capacity_containers: 100 })
    }
}

/// Client code
fn plan_delivery(factory: &dyn TransportFactory, cargo: &Cargo) -> Result<(), DeliveryError> {
    let transport = factory.create_transport();
    transport.deliver(cargo)
}
```

### Factory with Generics (Static Dispatch)

```rust
/// Factory using generics for static dispatch
pub trait TransportFactory {
    type Product: Transport;

    fn create(&self) -> Self::Product;
}

pub struct TruckFactory {
    default_capacity: u32,
}

impl TransportFactory for TruckFactory {
    type Product = Truck;

    fn create(&self) -> Truck {
        Truck { capacity_kg: self.default_capacity }
    }
}

pub struct ShipFactory {
    default_containers: u32,
}

impl TransportFactory for ShipFactory {
    type Product = Ship;

    fn create(&self) -> Ship {
        Ship { capacity_containers: self.default_containers }
    }
}

/// Client with generics - no dynamic dispatch!
fn plan_delivery<F: TransportFactory>(factory: &F, cargo: &Cargo) -> Result<(), DeliveryError>
where
    F::Product: Transport,
{
    let transport = factory.create();
    transport.deliver(cargo)
}
```

### Real-World Example: Logger Factory

```rust
pub trait Logger: Send + Sync {
    fn log(&self, level: Level, message: &str);
    fn flush(&self);
}

pub struct ConsoleLogger;

impl Logger for ConsoleLogger {
    fn log(&self, level: Level, message: &str) {
        println!("[{:?}] {}", level, message);
    }

    fn flush(&self) {}
}

pub struct FileLogger {
    file: Mutex<File>,
}

impl Logger for FileLogger {
    fn log(&self, level: Level, message: &str) {
        let mut file = self.file.lock().unwrap();
        writeln!(file, "[{:?}] {}", level, message).unwrap();
    }

    fn flush(&self) {
        self.file.lock().unwrap().flush().unwrap();
    }
}

/// Factory function (simple factory)
pub fn create_logger(config: &LogConfig) -> Box<dyn Logger> {
    match config.output {
        LogOutput::Console => Box::new(ConsoleLogger),
        LogOutput::File(ref path) => {
            let file = File::create(path).expect("Failed to create log file");
            Box::new(FileLogger { file: Mutex::new(file) })
        }
    }
}
```

---

## Abstract Factory Pattern

The Abstract Factory provides an interface for creating families of related objects without specifying their concrete classes.

### UI Components Example

```rust
/// Abstract products
pub trait Button {
    fn render(&self);
    fn on_click(&self, handler: Box<dyn Fn()>);
}

pub trait Checkbox {
    fn render(&self);
    fn is_checked(&self) -> bool;
    fn set_checked(&mut self, checked: bool);
}

pub trait TextInput {
    fn render(&self);
    fn get_value(&self) -> &str;
    fn set_value(&mut self, value: &str);
}

/// Abstract factory
pub trait UIFactory {
    fn create_button(&self, label: &str) -> Box<dyn Button>;
    fn create_checkbox(&self, label: &str) -> Box<dyn Checkbox>;
    fn create_text_input(&self, placeholder: &str) -> Box<dyn TextInput>;
}

/// Concrete products - Windows theme
pub struct WindowsButton {
    label: String,
}

impl Button for WindowsButton {
    fn render(&self) {
        println!("[Windows Button: {}]", self.label);
    }

    fn on_click(&self, handler: Box<dyn Fn()>) {
        handler();
    }
}

pub struct WindowsCheckbox {
    label: String,
    checked: bool,
}

impl Checkbox for WindowsCheckbox {
    fn render(&self) {
        let mark = if self.checked { "☑" } else { "☐" };
        println!("{} {}", mark, self.label);
    }

    fn is_checked(&self) -> bool {
        self.checked
    }

    fn set_checked(&mut self, checked: bool) {
        self.checked = checked;
    }
}

/// Concrete factory - Windows
pub struct WindowsUIFactory;

impl UIFactory for WindowsUIFactory {
    fn create_button(&self, label: &str) -> Box<dyn Button> {
        Box::new(WindowsButton { label: label.to_string() })
    }

    fn create_checkbox(&self, label: &str) -> Box<dyn Checkbox> {
        Box::new(WindowsCheckbox {
            label: label.to_string(),
            checked: false,
        })
    }

    fn create_text_input(&self, placeholder: &str) -> Box<dyn TextInput> {
        Box::new(WindowsTextInput {
            placeholder: placeholder.to_string(),
            value: String::new(),
        })
    }
}

/// Concrete products - macOS theme
pub struct MacButton {
    label: String,
}

impl Button for MacButton {
    fn render(&self) {
        println!("( {} )", self.label);  // Rounded button style
    }

    fn on_click(&self, handler: Box<dyn Fn()>) {
        handler();
    }
}

/// Concrete factory - macOS
pub struct MacUIFactory;

impl UIFactory for MacUIFactory {
    fn create_button(&self, label: &str) -> Box<dyn Button> {
        Box::new(MacButton { label: label.to_string() })
    }

    // ... other methods
}

/// Client code - works with any factory
fn create_login_form(factory: &dyn UIFactory) {
    let username = factory.create_text_input("Username");
    let password = factory.create_text_input("Password");
    let remember = factory.create_checkbox("Remember me");
    let submit = factory.create_button("Login");

    username.render();
    password.render();
    remember.render();
    submit.render();
}

/// Factory selection based on platform
fn get_ui_factory() -> Box<dyn UIFactory> {
    #[cfg(target_os = "windows")]
    return Box::new(WindowsUIFactory);

    #[cfg(target_os = "macos")]
    return Box::new(MacUIFactory);

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    return Box::new(LinuxUIFactory);
}
```

### Database Abstraction Example

```rust
/// Abstract products
pub trait Connection {
    fn execute(&mut self, query: &str) -> Result<(), DbError>;
    fn query(&mut self, query: &str) -> Result<Vec<Row>, DbError>;
}

pub trait Transaction {
    fn commit(self) -> Result<(), DbError>;
    fn rollback(self) -> Result<(), DbError>;
}

pub trait ConnectionPool {
    fn get(&self) -> Result<Box<dyn Connection>, PoolError>;
    fn size(&self) -> usize;
}

/// Abstract factory
pub trait DatabaseFactory {
    fn create_connection(&self, url: &str) -> Result<Box<dyn Connection>, DbError>;
    fn create_pool(&self, url: &str, size: usize) -> Result<Box<dyn ConnectionPool>, DbError>;
}

/// PostgreSQL implementation
pub struct PostgresConnection { /* ... */ }
pub struct PostgresPool { /* ... */ }
pub struct PostgresFactory;

impl DatabaseFactory for PostgresFactory {
    fn create_connection(&self, url: &str) -> Result<Box<dyn Connection>, DbError> {
        Ok(Box::new(PostgresConnection::connect(url)?))
    }

    fn create_pool(&self, url: &str, size: usize) -> Result<Box<dyn ConnectionPool>, DbError> {
        Ok(Box::new(PostgresPool::new(url, size)?))
    }
}

/// MySQL implementation
pub struct MySqlConnection { /* ... */ }
pub struct MySqlPool { /* ... */ }
pub struct MySqlFactory;

impl DatabaseFactory for MySqlFactory {
    fn create_connection(&self, url: &str) -> Result<Box<dyn Connection>, DbError> {
        Ok(Box::new(MySqlConnection::connect(url)?))
    }

    fn create_pool(&self, url: &str, size: usize) -> Result<Box<dyn ConnectionPool>, DbError> {
        Ok(Box::new(MySqlPool::new(url, size)?))
    }
}

/// Client code
fn run_migrations(factory: &dyn DatabaseFactory, db_url: &str) -> Result<(), MigrationError> {
    let mut conn = factory.create_connection(db_url)?;
    conn.execute("CREATE TABLE IF NOT EXISTS migrations (...)")?;
    // ...
    Ok(())
}
```

---

## Singleton Pattern

The Singleton ensures a class has only one instance and provides global access to it. In Rust, this is achieved through `static` with `OnceLock` or `lazy_static!`.

### Using OnceLock (Rust 1.70+, Standard Library)

```rust
use std::sync::OnceLock;

/// Configuration singleton
pub struct Config {
    pub database_url: String,
    pub api_key: String,
    pub debug_mode: bool,
}

/// Global singleton instance
static CONFIG: OnceLock<Config> = OnceLock::new();

impl Config {
    /// Initialize the singleton (call once at startup)
    pub fn init(database_url: String, api_key: String, debug_mode: bool) -> Result<(), ConfigError> {
        CONFIG.set(Config {
            database_url,
            api_key,
            debug_mode,
        }).map_err(|_| ConfigError::AlreadyInitialized)
    }

    /// Get the singleton instance
    pub fn get() -> &'static Config {
        CONFIG.get().expect("Config not initialized")
    }

    /// Try to get (returns None if not initialized)
    pub fn try_get() -> Option<&'static Config> {
        CONFIG.get()
    }
}

// Usage
fn main() {
    // Initialize once at startup
    Config::init(
        "postgres://localhost/mydb".into(),
        "api-key-123".into(),
        true,
    ).expect("Failed to initialize config");

    // Access from anywhere
    let config = Config::get();
    println!("Database: {}", config.database_url);
}
```

### Using lazy_static (For Complex Initialization)

```rust
use lazy_static::lazy_static;
use std::sync::RwLock;

/// Mutable singleton using RwLock
pub struct AppState {
    pub user_count: u64,
    pub request_count: u64,
}

lazy_static! {
    static ref APP_STATE: RwLock<AppState> = RwLock::new(AppState {
        user_count: 0,
        request_count: 0,
    });
}

impl AppState {
    pub fn increment_users() {
        let mut state = APP_STATE.write().unwrap();
        state.user_count += 1;
    }

    pub fn increment_requests() {
        let mut state = APP_STATE.write().unwrap();
        state.request_count += 1;
    }

    pub fn get_stats() -> (u64, u64) {
        let state = APP_STATE.read().unwrap();
        (state.user_count, state.request_count)
    }
}
```

### Using once_cell (Popular Crate)

```rust
use once_cell::sync::Lazy;
use std::sync::Mutex;

/// Logger singleton
pub struct Logger {
    level: LogLevel,
    output: Mutex<Box<dyn Write + Send>>,
}

static LOGGER: Lazy<Logger> = Lazy::new(|| {
    Logger {
        level: LogLevel::Info,
        output: Mutex::new(Box::new(std::io::stdout())),
    }
});

impl Logger {
    pub fn info(message: &str) {
        LOGGER.log(LogLevel::Info, message);
    }

    pub fn error(message: &str) {
        LOGGER.log(LogLevel::Error, message);
    }

    fn log(&self, level: LogLevel, message: &str) {
        if level >= self.level {
            let mut output = self.output.lock().unwrap();
            writeln!(output, "[{:?}] {}", level, message).unwrap();
        }
    }
}
```

### When to Avoid Singleton

Singletons are often considered an anti-pattern because they:
- Create hidden dependencies
- Make testing difficult
- Introduce global mutable state

**Prefer dependency injection instead:**

```rust
// Instead of singleton:
fn process_request() {
    let config = Config::get();  // Hidden dependency
    // ...
}

// Use dependency injection:
fn process_request(config: &Config) {
    // Explicit dependency
    // ...
}

// Or use a context/state pattern:
struct AppContext {
    config: Config,
    db: DatabasePool,
    logger: Logger,
}

fn process_request(ctx: &AppContext) {
    // All dependencies explicit
}
```

---

## Prototype Pattern

The Prototype pattern creates new objects by cloning existing ones. In Rust, this is implemented through the `Clone` trait.

### Basic Prototype with Clone

```rust
/// Prototype trait (Clone is the built-in version)
#[derive(Clone, Debug)]
pub struct Document {
    pub title: String,
    pub content: String,
    pub author: String,
    pub created_at: DateTime<Utc>,
    pub metadata: HashMap<String, String>,
}

impl Document {
    /// Create a copy with a new title
    pub fn clone_with_title(&self, title: impl Into<String>) -> Self {
        let mut doc = self.clone();
        doc.title = title.into();
        doc.created_at = Utc::now();
        doc
    }

    /// Create a template document
    pub fn template(author: &str) -> Self {
        Self {
            title: String::new(),
            content: String::new(),
            author: author.to_string(),
            created_at: Utc::now(),
            metadata: HashMap::new(),
        }
    }
}

// Usage
let template = Document::template("John Doe");
let doc1 = template.clone_with_title("First Document");
let doc2 = template.clone_with_title("Second Document");
```

### Prototype Registry

```rust
use std::collections::HashMap;

/// Registry of prototypes
pub struct ShapeRegistry {
    prototypes: HashMap<String, Box<dyn Shape>>,
}

/// Shape must be cloneable
pub trait Shape: ShapeClone {
    fn draw(&self);
    fn area(&self) -> f64;
}

/// Helper trait for cloning trait objects
pub trait ShapeClone {
    fn clone_box(&self) -> Box<dyn Shape>;
}

impl<T: Shape + Clone + 'static> ShapeClone for T {
    fn clone_box(&self) -> Box<dyn Shape> {
        Box::new(self.clone())
    }
}

impl Clone for Box<dyn Shape> {
    fn clone(&self) -> Self {
        self.clone_box()
    }
}

/// Concrete shapes
#[derive(Clone)]
pub struct Circle {
    radius: f64,
    color: String,
}

impl Shape for Circle {
    fn draw(&self) {
        println!("Drawing circle with radius {} in {}", self.radius, self.color);
    }

    fn area(&self) -> f64 {
        std::f64::consts::PI * self.radius * self.radius
    }
}

#[derive(Clone)]
pub struct Rectangle {
    width: f64,
    height: f64,
    color: String,
}

impl Shape for Rectangle {
    fn draw(&self) {
        println!("Drawing {}x{} rectangle in {}", self.width, self.height, self.color);
    }

    fn area(&self) -> f64 {
        self.width * self.height
    }
}

impl ShapeRegistry {
    pub fn new() -> Self {
        Self { prototypes: HashMap::new() }
    }

    pub fn register(&mut self, name: &str, shape: Box<dyn Shape>) {
        self.prototypes.insert(name.to_string(), shape);
    }

    pub fn create(&self, name: &str) -> Option<Box<dyn Shape>> {
        self.prototypes.get(name).map(|s| s.clone_box())
    }
}

// Usage
let mut registry = ShapeRegistry::new();
registry.register("red-circle", Box::new(Circle { radius: 10.0, color: "red".into() }));
registry.register("blue-rect", Box::new(Rectangle { width: 5.0, height: 3.0, color: "blue".into() }));

let shape1 = registry.create("red-circle").unwrap();
let shape2 = registry.create("red-circle").unwrap();
shape1.draw();
shape2.draw();
```

---

## Comparison and When to Use

### Pattern Selection Guide

```
Creating complex objects with many optional parameters?
├── Few options → Constructor with Default
├── Many options → Builder pattern
└── Must validate combinations → Type-state Builder

Creating objects without specifying exact type?
├── Single product type → Factory Method
├── Family of products → Abstract Factory
└── Based on existing object → Prototype

Need exactly one instance?
├── Configuration/settings → OnceLock singleton
├── Can be injected → Prefer dependency injection
└── Must be mutable → RwLock or Mutex
```

### Complexity vs Flexibility Trade-offs

| Pattern | Complexity | Flexibility | Use When |
|---------|------------|-------------|----------|
| Constructor | Low | Low | Simple objects |
| Builder | Medium | High | Complex construction |
| Factory Method | Medium | Medium | Polymorphic creation |
| Abstract Factory | High | High | Product families |
| Singleton | Low | Low | Global state (avoid!) |
| Prototype | Low | Medium | Cloning complex objects |

---

## Interview Questions

### Q1: When would you use Builder vs Constructor?

**Answer**: Use Builder when:
- Object has many optional parameters
- Construction requires validation
- Object is immutable after construction
- You want a fluent API

Use Constructor (associated function) when:
- Object has few required parameters
- Construction is straightforward
- Default trait covers optional fields

### Q2: How do you implement the Singleton pattern in Rust?

**Answer**: Use `OnceLock` (standard library) or `lazy_static!`:

```rust
use std::sync::OnceLock;

static INSTANCE: OnceLock<Config> = OnceLock::new();

impl Config {
    pub fn get() -> &'static Config {
        INSTANCE.get_or_init(|| Config::load())
    }
}
```

However, prefer dependency injection over singletons for testability.

### Q3: What's the difference between Factory Method and Abstract Factory?

**Answer**:
- **Factory Method**: Creates a single product; uses inheritance/traits
- **Abstract Factory**: Creates families of related products; uses composition

Factory Method:
```rust
trait Factory { fn create(&self) -> Box<dyn Product>; }
```

Abstract Factory:
```rust
trait Factory {
    fn create_button(&self) -> Box<dyn Button>;
    fn create_checkbox(&self) -> Box<dyn Checkbox>;
}
```

---

## Quick Reference

### Pattern Cheat Sheet

| Pattern | Rust Implementation | Key Types |
|---------|---------------------|-----------|
| Builder | Fluent methods, `build()` | `XxxBuilder` struct |
| Factory Method | Trait with creation method | `trait Factory { fn create() }` |
| Abstract Factory | Trait with multiple creation methods | Multiple associated types |
| Singleton | `OnceLock`, `lazy_static!` | `static` with sync primitive |
| Prototype | `Clone` trait | `#[derive(Clone)]` |

### When to Use

| Pattern | Use When | Avoid When |
|---------|----------|------------|
| Builder | Complex construction | Simple objects |
| Factory | Polymorphic creation | Known concrete types |
| Abstract Factory | Product families | Single products |
| Singleton | True global state | Testable code needed |
| Prototype | Clone with modifications | Creation is cheap |

---

## Resources

- [Rust Design Patterns - Creational](https://rust-unofficial.github.io/patterns/patterns/creational/index.html)
- [Refactoring.Guru - Creational Patterns](https://refactoring.guru/design-patterns/creational-patterns)
- [bon crate - Builder derive](https://docs.rs/bon/)

---

**Next**: [10-design-patterns-structural.md](10-design-patterns-structural.md) — Structural Design Patterns

---

<p align="center">
<b>Creational patterns in Rust:</b> Traits for abstraction, composition for flexibility.
</p>
