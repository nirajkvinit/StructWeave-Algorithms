# SOLID Principles in Rust

> Applying object-oriented design principles using Rust's traits, composition, and type system

SOLID principles were originally defined for statically-typed object-oriented languages with classes and inheritance. Rust takes a different approach — no inheritance, trait-based polymorphism, and composition over inheritance. This guide shows how each principle applies idiomatically in Rust.

**Reading time**: 45-60 minutes | **Difficulty**: Intermediate

---

## Table of Contents

1. [SOLID Overview for Rust](#solid-overview-for-rust)
2. [Single Responsibility Principle (SRP)](#single-responsibility-principle-srp)
3. [Open/Closed Principle (OCP)](#openclosed-principle-ocp)
4. [Liskov Substitution Principle (LSP)](#liskov-substitution-principle-lsp)
5. [Interface Segregation Principle (ISP)](#interface-segregation-principle-isp)
6. [Dependency Inversion Principle (DIP)](#dependency-inversion-principle-dip)
7. [SOLID in Practice: Complete Example](#solid-in-practice-complete-example)
8. [Interview Questions](#interview-questions)
9. [Quick Reference](#quick-reference)

---

## SOLID Overview for Rust

### Why SOLID Matters

SOLID principles help you write code that is:
- **Maintainable**: Easy to modify without breaking other parts
- **Testable**: Components can be tested in isolation
- **Extensible**: New features added without changing existing code
- **Understandable**: Clear boundaries and responsibilities

### Rust vs Traditional OOP

Rust doesn't have classes or inheritance, but SOLID principles still apply:

| Traditional OOP | Rust Equivalent |
|-----------------|-----------------|
| Interface | `trait` |
| Abstract class | `trait` with default implementations |
| Inheritance | Composition + trait bounds |
| Polymorphism | Trait objects (`dyn Trait`) or generics (`impl Trait`) |
| Constructor | Associated functions (`new()`, `from()`) |
| Private/Public | `pub` visibility modifiers |
| Multiple inheritance | Multiple trait implementations |
| Dependency injection | Generic parameters or trait objects |

### The SOLID Principles

| Principle | One-Line Summary |
|-----------|------------------|
| **S**ingle Responsibility | One reason to change |
| **O**pen/Closed | Open for extension, closed for modification |
| **L**iskov Substitution | Subtypes must be substitutable |
| **I**nterface Segregation | Many small traits > one large trait |
| **D**ependency Inversion | Depend on abstractions, not concretions |

---

## Single Responsibility Principle (SRP)

> "A module should have one, and only one, reason to change."
> — Robert C. Martin

In Rust, SRP applies at three levels: **modules**, **structs**, and **functions**.

### Module-Level SRP

Each module should have a focused, cohesive purpose.

```rust
// BAD: lib.rs does too many unrelated things
mod lib {
    pub fn parse_json(data: &str) -> Result<Value, Error> { ... }
    pub fn send_http_request(url: &str) -> Result<Response, Error> { ... }
    pub fn validate_email(email: &str) -> bool { ... }
    pub fn hash_password(password: &str) -> String { ... }
    pub fn format_date(dt: DateTime) -> String { ... }
}
```

```rust
// GOOD: Separate modules with focused responsibilities
// src/
// ├── json.rs       - parse(), serialize()
// ├── http.rs       - get(), post(), request()
// ├── validation.rs - email(), phone(), url()
// ├── auth.rs       - hash_password(), verify_password()
// └── formatting.rs - date(), currency(), duration()

mod json {
    pub fn parse(data: &str) -> Result<Value, ParseError> { ... }
    pub fn serialize(value: &Value) -> String { ... }
}

mod http {
    pub async fn get(url: &str) -> Result<Response, HttpError> { ... }
    pub async fn post(url: &str, body: &[u8]) -> Result<Response, HttpError> { ... }
}

mod validation {
    pub fn email(email: &str) -> bool { ... }
    pub fn phone(phone: &str) -> bool { ... }
}
```

### Struct-Level SRP

Each struct should represent one concept and have one responsibility.

```rust
// BAD: User struct does too many things
struct User {
    id: u64,
    email: String,
    password_hash: String,
    db: Database,
    mailer: EmailClient,
}

impl User {
    // Persistence - reason to change #1
    fn save(&self) -> Result<(), DbError> {
        self.db.execute("INSERT INTO users...", &[&self.id, &self.email])
    }

    // Notification - reason to change #2
    fn send_welcome_email(&self) -> Result<(), EmailError> {
        self.mailer.send(&self.email, "Welcome!", "...")
    }

    // Validation - reason to change #3
    fn validate_password(&self, password: &str) -> bool {
        verify_hash(password, &self.password_hash)
    }
}
```

```rust
// GOOD: Separate responsibilities into focused types

/// Pure data structure - represents a user
#[derive(Debug, Clone)]
struct User {
    id: u64,
    email: String,
    password_hash: String,
}

/// Handles persistence only
struct UserRepository {
    db: Database,
}

impl UserRepository {
    fn save(&self, user: &User) -> Result<(), DbError> {
        self.db.execute(
            "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
            &[&user.id, &user.email, &user.password_hash],
        )
    }

    fn find_by_id(&self, id: u64) -> Result<Option<User>, DbError> {
        // ...
    }
}

/// Handles email notifications only
struct EmailService {
    client: EmailClient,
}

impl EmailService {
    fn send_welcome(&self, user: &User) -> Result<(), EmailError> {
        self.client.send(&user.email, "Welcome!", "...")
    }
}

/// Handles password validation only
struct PasswordValidator {
    min_length: usize,
}

impl PasswordValidator {
    fn validate(&self, password: &str, hash: &str) -> bool {
        password.len() >= self.min_length && verify_hash(password, hash)
    }
}
```

### Function-Level SRP

Each function should do one thing well.

```rust
// BAD: Function does too many things
fn process_order(order: &mut Order) -> Result<(), Error> {
    // Validate
    if order.total <= 0.0 {
        return Err(Error::InvalidTotal);
    }
    if order.items.is_empty() {
        return Err(Error::NoItems);
    }

    // Calculate tax
    let tax = order.total * 0.08;
    order.tax = tax;
    order.grand_total = order.total + tax;

    // Save to database
    db::execute("INSERT INTO orders...", order)?;

    // Send confirmation
    email::send(&order.customer_email, "Order Confirmed", "...")?;

    // Update inventory
    for item in &order.items {
        db::execute("UPDATE inventory SET qty = qty - ?", item.qty)?;
    }

    Ok(())
}
```

```rust
// GOOD: Separate functions with single responsibilities
fn validate_order(order: &Order) -> Result<(), ValidationError> {
    if order.total <= 0.0 {
        return Err(ValidationError::InvalidTotal);
    }
    if order.items.is_empty() {
        return Err(ValidationError::NoItems);
    }
    Ok(())
}

fn calculate_tax(order: &mut Order, tax_rate: f64) {
    order.tax = order.total * tax_rate;
    order.grand_total = order.total + order.tax;
}

fn save_order(repo: &OrderRepository, order: &Order) -> Result<(), DbError> {
    repo.insert(order)
}

fn send_confirmation(mailer: &EmailService, order: &Order) -> Result<(), EmailError> {
    mailer.send(&order.customer_email, "Order Confirmed", "...")
}

fn update_inventory(repo: &InventoryRepository, items: &[OrderItem]) -> Result<(), DbError> {
    for item in items {
        repo.decrement(&item.product_id, item.qty)?;
    }
    Ok(())
}

// Orchestrating function that composes the others
fn process_order(
    order: &mut Order,
    order_repo: &OrderRepository,
    inventory_repo: &InventoryRepository,
    mailer: &EmailService,
) -> Result<(), ProcessError> {
    validate_order(order)?;
    calculate_tax(order, 0.08);
    save_order(order_repo, order)?;
    let _ = send_confirmation(mailer, order);  // Non-critical
    update_inventory(inventory_repo, &order.items)?;
    Ok(())
}
```

### Signs of SRP Violation

| Code Smell | What It Indicates |
|------------|-------------------|
| Module named `utils.rs`, `common.rs`, `helpers.rs` | No clear responsibility |
| Struct with 10+ methods | Too many responsibilities |
| Function longer than 30 lines | Doing too much |
| Multiple reasons to modify a file | Mixed concerns |
| Difficulty writing unit tests | Too many dependencies |
| Struct name includes "And" or "Manager" | Multiple responsibilities |

---

## Open/Closed Principle (OCP)

> "Software entities should be open for extension, but closed for modification."
> — Bertrand Meyer

In Rust, we achieve OCP through **traits**, **generics**, and **composition**.

### Extension Through Traits

```rust
// The trait defines the contract
// CLOSED: This interface won't change when we add new notification types
trait NotificationSender {
    fn send(&self, message: &str) -> Result<(), SendError>;
}

// The service uses the trait
// CLOSED: This service won't change when we add new senders
struct NotificationService<S: NotificationSender> {
    sender: S,
}

impl<S: NotificationSender> NotificationService<S> {
    fn new(sender: S) -> Self {
        Self { sender }
    }

    fn notify(&self, message: &str) -> Result<(), SendError> {
        self.sender.send(message)
    }
}

// OPEN: Add new notification types by implementing the trait
struct EmailSender {
    smtp_client: SmtpClient,
}

impl NotificationSender for EmailSender {
    fn send(&self, message: &str) -> Result<(), SendError> {
        self.smtp_client.send_mail("notifications@example.com", message)
    }
}

struct SmsSender {
    twilio_client: TwilioClient,
}

impl NotificationSender for SmsSender {
    fn send(&self, message: &str) -> Result<(), SendError> {
        self.twilio_client.send_sms("+1234567890", message)
    }
}

struct SlackSender {
    webhook_url: String,
}

impl NotificationSender for SlackSender {
    fn send(&self, message: &str) -> Result<(), SendError> {
        // POST to webhook
        Ok(())
    }
}

// Adding PushNotificationSender requires:
// 1. Create new struct implementing NotificationSender
// 2. NO changes to NotificationService!
```

### Extension Through Trait Objects

When you need heterogeneous collections:

```rust
// CLOSED: This function works with any combination of senders
fn broadcast(senders: &[Box<dyn NotificationSender>], message: &str) {
    for sender in senders {
        let _ = sender.send(message);
    }
}

// OPEN: Add new senders without changing broadcast()
fn main() {
    let senders: Vec<Box<dyn NotificationSender>> = vec![
        Box::new(EmailSender::new()),
        Box::new(SmsSender::new()),
        Box::new(SlackSender::new()),
    ];

    broadcast(&senders, "Hello everyone!");
}
```

### Extension Through Enums

For a closed set of variants (when you control all cases):

```rust
enum PaymentMethod {
    CreditCard { number: String, cvv: String },
    PayPal { email: String },
    BankTransfer { iban: String },
}

impl PaymentMethod {
    fn process(&self, amount: f64) -> Result<(), PaymentError> {
        match self {
            PaymentMethod::CreditCard { number, cvv } => {
                // Process credit card
                Ok(())
            }
            PaymentMethod::PayPal { email } => {
                // Process PayPal
                Ok(())
            }
            PaymentMethod::BankTransfer { iban } => {
                // Process bank transfer
                Ok(())
            }
        }
    }
}

// Adding new variant requires modifying the enum
// Use this when you own and control all variants
```

### Strategy Pattern for OCP

```rust
// Strategy trait
trait PricingStrategy {
    fn calculate(&self, base_price: f64) -> f64;
}

// Context uses strategy
struct PriceCalculator {
    strategy: Box<dyn PricingStrategy>,
}

impl PriceCalculator {
    fn new(strategy: Box<dyn PricingStrategy>) -> Self {
        Self { strategy }
    }

    fn calculate(&self, base_price: f64) -> f64 {
        self.strategy.calculate(base_price)
    }
}

// OPEN: Add new strategies without modifying PriceCalculator
struct RegularPricing;
impl PricingStrategy for RegularPricing {
    fn calculate(&self, base_price: f64) -> f64 {
        base_price
    }
}

struct DiscountPricing {
    discount_percent: f64,
}
impl PricingStrategy for DiscountPricing {
    fn calculate(&self, base_price: f64) -> f64 {
        base_price * (1.0 - self.discount_percent / 100.0)
    }
}

struct PremiumPricing {
    markup_percent: f64,
}
impl PricingStrategy for PremiumPricing {
    fn calculate(&self, base_price: f64) -> f64 {
        base_price * (1.0 + self.markup_percent / 100.0)
    }
}
```

---

## Liskov Substitution Principle (LSP)

> "If S is a subtype of T, then objects of type T may be replaced with objects of type S without altering program correctness."
> — Barbara Liskov

In Rust, LSP means: **implementations must honor the trait's behavioral contract**.

### Trait Contracts

```rust
/// A cache that stores key-value pairs.
///
/// # Contract
/// - `get` returns `Some(value)` if key exists, `None` otherwise
/// - `set` stores the value; subsequent `get` with same key returns `Some`
/// - `set` with TTL of 0 should store permanently
/// - Implementations must be thread-safe if marked Send + Sync
trait Cache {
    fn get(&self, key: &str) -> Option<String>;
    fn set(&mut self, key: &str, value: String, ttl_secs: u64);
    fn delete(&mut self, key: &str);
}

// MemoryCache honors the contract
struct MemoryCache {
    data: HashMap<String, (String, Option<Instant>)>,
}

impl Cache for MemoryCache {
    fn get(&self, key: &str) -> Option<String> {
        self.data.get(key).and_then(|(value, expires)| {
            match expires {
                Some(exp) if *exp < Instant::now() => None,
                _ => Some(value.clone()),
            }
        })
    }

    fn set(&mut self, key: &str, value: String, ttl_secs: u64) {
        let expires = if ttl_secs == 0 {
            None  // Permanent
        } else {
            Some(Instant::now() + Duration::from_secs(ttl_secs))
        };
        self.data.insert(key.to_string(), (value, expires));
    }

    fn delete(&mut self, key: &str) {
        self.data.remove(key);
    }
}

// RedisCache can substitute MemoryCache anywhere Cache is expected
struct RedisCache {
    client: redis::Client,
}

impl Cache for RedisCache {
    fn get(&self, key: &str) -> Option<String> {
        // Same contract: Some if exists, None if not
        self.client.get(key).ok()
    }

    fn set(&mut self, key: &str, value: String, ttl_secs: u64) {
        if ttl_secs == 0 {
            self.client.set(key, value).ok();
        } else {
            self.client.set_ex(key, value, ttl_secs).ok();
        }
    }

    fn delete(&mut self, key: &str) {
        self.client.del(key).ok();
    }
}
```

### LSP Violations to Avoid

#### Violation 1: Stricter Preconditions

```rust
trait DataStore {
    /// Save data and return ID.
    fn save(&mut self, data: &[u8]) -> Result<String, StoreError>;
}

// BAD: Adds stricter precondition than trait promises
struct LimitedStore {
    max_size: usize,
    data: HashMap<String, Vec<u8>>,
}

impl DataStore for LimitedStore {
    fn save(&mut self, data: &[u8]) -> Result<String, StoreError> {
        // Violates LSP: trait doesn't promise a size limit
        if data.len() > self.max_size {
            return Err(StoreError::TooLarge);
        }
        let id = generate_id();
        self.data.insert(id.clone(), data.to_vec());
        Ok(id)
    }
}

// GOOD: Document limit in trait or handle gracefully
trait DataStore {
    /// Save data and return ID.
    /// Implementations may chunk data if too large.
    fn save(&mut self, data: &[u8]) -> Result<String, StoreError>;

    /// Returns maximum single-write size, or None if unlimited.
    fn max_size(&self) -> Option<usize>;
}

impl DataStore for LimitedStore {
    fn save(&mut self, data: &[u8]) -> Result<String, StoreError> {
        // Chunk if too large instead of failing
        if data.len() > self.max_size {
            return self.save_chunked(data);
        }
        // ...
    }

    fn max_size(&self) -> Option<usize> {
        Some(self.max_size)
    }
}
```

#### Violation 2: Weaker Postconditions

```rust
trait Repository {
    /// Save data and return ID.
    /// Postcondition: Returned ID can be used to retrieve data.
    fn save(&mut self, data: Data) -> String;
    fn get(&self, id: &str) -> Option<&Data>;
}

// BAD: Weaker postcondition - ID might not work
struct VolatileRepository {
    data: WeakMap<String, Data>,  // Data may be garbage collected!
}

impl Repository for VolatileRepository {
    fn save(&mut self, data: Data) -> String {
        let id = generate_id();
        self.data.insert(id.clone(), data);
        id  // Violates postcondition: may not be retrievable later!
    }

    fn get(&self, id: &str) -> Option<&Data> {
        self.data.get(id)  // Might return None even after save!
    }
}

// GOOD: Honor the postcondition
struct PersistentRepository {
    data: HashMap<String, Data>,
}

impl Repository for PersistentRepository {
    fn save(&mut self, data: Data) -> String {
        let id = generate_id();
        self.data.insert(id.clone(), data);
        id  // Guaranteed retrievable until explicitly deleted
    }

    fn get(&self, id: &str) -> Option<&Data> {
        self.data.get(id)
    }
}
```

#### Violation 3: Unexpected Panics

```rust
trait Parser {
    /// Parse input, returning parsed value or error.
    /// Should not panic.
    fn parse(&self, input: &str) -> Result<Value, ParseError>;
}

// BAD: Panics instead of returning error
struct StrictParser;

impl Parser for StrictParser {
    fn parse(&self, input: &str) -> Result<Value, ParseError> {
        if input.is_empty() {
            panic!("Input cannot be empty!");  // Violates contract!
        }
        // ...
    }
}

// GOOD: Return error as promised
struct SafeParser;

impl Parser for SafeParser {
    fn parse(&self, input: &str) -> Result<Value, ParseError> {
        if input.is_empty() {
            return Err(ParseError::EmptyInput);
        }
        // ...
    }
}
```

### The Rectangle-Square Problem in Rust

```rust
// Classic LSP violation example
trait Rectangle {
    fn set_width(&mut self, width: u32);
    fn set_height(&mut self, height: u32);
    fn area(&self) -> u32;
}

struct Rect {
    width: u32,
    height: u32,
}

impl Rectangle for Rect {
    fn set_width(&mut self, width: u32) { self.width = width; }
    fn set_height(&mut self, height: u32) { self.height = height; }
    fn area(&self) -> u32 { self.width * self.height }
}

// BAD: Square violates Rectangle's behavioral contract
struct Square {
    side: u32,
}

impl Rectangle for Square {
    fn set_width(&mut self, width: u32) {
        self.side = width;  // Also changes height!
    }
    fn set_height(&mut self, height: u32) {
        self.side = height;  // Also changes width!
    }
    fn area(&self) -> u32 { self.side * self.side }
}

// This test passes for Rect but fails for Square:
fn test_rectangle<R: Rectangle>(rect: &mut R) {
    rect.set_width(5);
    rect.set_height(10);
    assert_eq!(rect.area(), 50);  // Fails for Square!
}

// GOOD: Separate abstractions
trait Shape {
    fn area(&self) -> u32;
}

struct Rect { width: u32, height: u32 }
impl Shape for Rect {
    fn area(&self) -> u32 { self.width * self.height }
}

struct Square { side: u32 }
impl Shape for Square {
    fn area(&self) -> u32 { self.side * self.side }
}
```

---

## Interface Segregation Principle (ISP)

> "Clients should not be forced to depend on methods they do not use."
> — Robert C. Martin

Rust's trait system naturally supports ISP through small, composable traits.

### Small Traits

```rust
// Small, focused traits
trait Reader {
    fn read(&mut self, buf: &mut [u8]) -> io::Result<usize>;
}

trait Writer {
    fn write(&mut self, buf: &[u8]) -> io::Result<usize>;
}

trait Closer {
    fn close(&mut self) -> io::Result<()>;
}

trait Seeker {
    fn seek(&mut self, pos: SeekFrom) -> io::Result<u64>;
}

// Compose when needed using trait bounds
fn copy<R: Reader, W: Writer>(reader: &mut R, writer: &mut W) -> io::Result<u64> {
    let mut buf = [0u8; 8192];
    let mut total = 0;
    loop {
        let n = reader.read(&mut buf)?;
        if n == 0 { break; }
        writer.write_all(&buf[..n])?;
        total += n as u64;
    }
    Ok(total)
}

// Or use supertraits for common combinations
trait ReadWrite: Reader + Writer {}
impl<T: Reader + Writer> ReadWrite for T {}

trait ReadSeek: Reader + Seeker {}
impl<T: Reader + Seeker> ReadSeek for T {}
```

### Kitchen Sink Anti-Pattern

```rust
// BAD: Giant trait forces implementations to include unused methods
trait DataManager {
    fn create(&mut self, data: Data) -> Result<Id, Error>;
    fn read(&self, id: Id) -> Result<Data, Error>;
    fn update(&mut self, id: Id, data: Data) -> Result<(), Error>;
    fn delete(&mut self, id: Id) -> Result<(), Error>;
    fn list(&self) -> Result<Vec<Data>, Error>;
    fn search(&self, query: &str) -> Result<Vec<Data>, Error>;
    fn export(&self, format: ExportFormat) -> Result<Vec<u8>, Error>;
    fn import(&mut self, data: &[u8]) -> Result<(), Error>;
    fn backup(&self) -> Result<Vec<u8>, Error>;
    fn restore(&mut self, backup: &[u8]) -> Result<(), Error>;
    fn validate(&self, data: &Data) -> Result<(), ValidationError>;
    fn transform(&self, data: Data, rules: &[Rule]) -> Result<Data, Error>;
}

// Implementation must provide ALL methods!
// Testing requires mocking 12 methods!
```

```rust
// GOOD: Segregated traits
trait Creator {
    fn create(&mut self, data: Data) -> Result<Id, Error>;
}

trait Reader {
    fn read(&self, id: Id) -> Result<Data, Error>;
}

trait Updater {
    fn update(&mut self, id: Id, data: Data) -> Result<(), Error>;
}

trait Deleter {
    fn delete(&mut self, id: Id) -> Result<(), Error>;
}

trait Lister {
    fn list(&self) -> Result<Vec<Data>, Error>;
}

trait Searcher {
    fn search(&self, query: &str) -> Result<Vec<Data>, Error>;
}

// Compose for specific use cases
trait Crud: Creator + Reader + Updater + Deleter {}
impl<T: Creator + Reader + Updater + Deleter> Crud for T {}

trait ReadOnlyStore: Reader + Lister + Searcher {}
impl<T: Reader + Lister + Searcher> ReadOnlyStore for T {}

// Functions accept only what they need
fn import_data<C: Creator>(store: &mut C, records: Vec<Data>) -> Result<Vec<Id>, Error> {
    records.into_iter()
        .map(|data| store.create(data))
        .collect()
}

fn generate_report<R: Reader + Lister>(store: &R) -> Result<Report, Error> {
    let ids = store.list()?;
    let items: Vec<Data> = ids.iter()
        .map(|id| store.read(*id))
        .collect::<Result<_, _>>()?;
    Ok(Report::from(items))
}

// Testing is trivial - only mock what you need
#[cfg(test)]
mod tests {
    struct MockCreator {
        created: Vec<Data>,
    }

    impl Creator for MockCreator {
        fn create(&mut self, data: Data) -> Result<Id, Error> {
            let id = Id(self.created.len() as u64);
            self.created.push(data);
            Ok(id)
        }
    }

    #[test]
    fn test_import() {
        let mut mock = MockCreator { created: vec![] };
        let result = import_data(&mut mock, vec![Data::new(), Data::new()]);
        assert_eq!(result.unwrap().len(), 2);
        assert_eq!(mock.created.len(), 2);
    }
}
```

### Standard Library Examples

Rust's standard library demonstrates ISP beautifully:

```rust
// std::io uses segregated traits
use std::io::{Read, Write, Seek, BufRead};

// File implements all of them
let file = File::open("data.txt")?;
// file: Read + Write + Seek

// BufReader adds BufRead
let reader = BufReader::new(file);
// reader: Read + BufRead

// Functions accept minimal requirements
fn read_lines<R: BufRead>(reader: R) -> Vec<String> {
    reader.lines().filter_map(Result::ok).collect()
}

fn copy_data<R: Read, W: Write>(src: &mut R, dst: &mut W) -> io::Result<u64> {
    io::copy(src, dst)
}
```

---

## Dependency Inversion Principle (DIP)

> "High-level modules should not depend on low-level modules. Both should depend on abstractions."
> — Robert C. Martin

In Rust:
- Define traits where they're consumed (high-level module owns the abstraction)
- Use generics or trait objects for injection
- Wire concrete implementations at the application entry point

### Traditional vs Inverted Dependencies

```
Traditional (BAD):
┌─────────────────┐          ┌───────────────────┐
│   UserService   │ ────────>│ PostgresUserStore │
└─────────────────┘          └───────────────────┘
High-level depends on low-level

Inverted (GOOD):
┌─────────────────┐          ┌─────────────┐
│   UserService   │ ────────>│  UserStore  │ (trait)
└─────────────────┘          └─────────────┘
                                    ▲
                                    │ implements
                             ┌───────────────────┐
                             │ PostgresUserStore │
                             └───────────────────┘
Both depend on abstraction
```

### Generic Parameters (Static Dispatch)

```rust
// Define trait in the high-level module
trait UserStore {
    fn get(&self, id: u64) -> Result<Option<User>, StoreError>;
    fn save(&mut self, user: &User) -> Result<(), StoreError>;
}

// High-level service depends on abstraction via generics
struct UserService<S: UserStore> {
    store: S,
}

impl<S: UserStore> UserService<S> {
    pub fn new(store: S) -> Self {
        Self { store }
    }

    pub fn update_email(&mut self, user_id: u64, new_email: String) -> Result<User, ServiceError> {
        let mut user = self.store.get(user_id)?
            .ok_or(ServiceError::NotFound)?;
        user.email = new_email;
        self.store.save(&user)?;
        Ok(user)
    }
}

// Low-level implementation
struct PostgresUserStore {
    pool: PgPool,
}

impl UserStore for PostgresUserStore {
    fn get(&self, id: u64) -> Result<Option<User>, StoreError> {
        // Query database
        Ok(None)
    }

    fn save(&mut self, user: &User) -> Result<(), StoreError> {
        // Insert/update database
        Ok(())
    }
}

// Wire at application entry point
fn main() {
    let pool = PgPool::connect("postgres://...").unwrap();
    let store = PostgresUserStore { pool };
    let service = UserService::new(store);
}
```

### Trait Objects (Dynamic Dispatch)

When you need runtime flexibility:

```rust
// Use Box<dyn Trait> for runtime polymorphism
struct UserService {
    store: Box<dyn UserStore>,
}

impl UserService {
    pub fn new(store: Box<dyn UserStore>) -> Self {
        Self { store }
    }

    pub fn update_email(&mut self, user_id: u64, new_email: String) -> Result<User, ServiceError> {
        let mut user = self.store.get(user_id)?
            .ok_or(ServiceError::NotFound)?;
        user.email = new_email;
        self.store.save(&user)?;
        Ok(user)
    }
}

// Can switch implementations at runtime
fn create_service(use_postgres: bool) -> UserService {
    if use_postgres {
        UserService::new(Box::new(PostgresUserStore::new()))
    } else {
        UserService::new(Box::new(InMemoryUserStore::new()))
    }
}
```

### Complete DIP Example

```rust
// === Domain Layer (highest level) ===

/// Domain entity
#[derive(Clone, Debug)]
struct Order {
    id: String,
    customer_id: String,
    items: Vec<OrderItem>,
    total: f64,
}

/// Repository trait - defined where it's USED
trait OrderRepository {
    fn get(&self, id: &str) -> Result<Option<Order>, RepositoryError>;
    fn save(&self, order: &Order) -> Result<(), RepositoryError>;
}

/// Notification trait - defined where it's USED
trait Notifier {
    fn notify(&self, customer_id: &str, message: &str) -> Result<(), NotifyError>;
}

// === Application Layer ===

struct OrderService<R: OrderRepository, N: Notifier> {
    repo: R,
    notifier: N,
}

impl<R: OrderRepository, N: Notifier> OrderService<R, N> {
    fn new(repo: R, notifier: N) -> Self {
        Self { repo, notifier }
    }

    fn place_order(&self, order: Order) -> Result<(), ServiceError> {
        self.repo.save(&order)?;
        self.notifier.notify(&order.customer_id, "Order placed!")?;
        Ok(())
    }
}

// === Infrastructure Layer (lowest level) ===

struct PostgresOrderRepo {
    pool: PgPool,
}

impl OrderRepository for PostgresOrderRepo {
    fn get(&self, id: &str) -> Result<Option<Order>, RepositoryError> {
        // SQL query
        Ok(None)
    }

    fn save(&self, order: &Order) -> Result<(), RepositoryError> {
        // SQL insert
        Ok(())
    }
}

struct EmailNotifier {
    smtp: SmtpClient,
}

impl Notifier for EmailNotifier {
    fn notify(&self, customer_id: &str, message: &str) -> Result<(), NotifyError> {
        // Send email
        Ok(())
    }
}

// === Composition Root (main.rs) ===

fn main() {
    // Wire all dependencies
    let pool = PgPool::connect("postgres://...").unwrap();
    let smtp = SmtpClient::new("smtp://...");

    let repo = PostgresOrderRepo { pool };
    let notifier = EmailNotifier { smtp };

    let service = OrderService::new(repo, notifier);

    // Use the service
    let order = Order { /* ... */ };
    service.place_order(order).unwrap();
}
```

---

## SOLID in Practice: Complete Example

Let's build a notification system applying all SOLID principles:

```rust
//! Notification System demonstrating all SOLID principles.
//!
//! SRP: Each struct has one responsibility
//! OCP: New notification types added without modifying existing code
//! LSP: All senders honor the NotificationSender contract
//! ISP: Small, focused traits
//! DIP: High-level NotificationService depends on abstractions

use std::error::Error;
use std::fmt;

// === Error Types ===

#[derive(Debug)]
struct SendError(String);

impl fmt::Display for SendError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Send error: {}", self.0)
    }
}

impl Error for SendError {}

// === Domain Models (SRP: pure data) ===

#[derive(Clone, Debug)]
struct Notification {
    id: String,
    recipient: String,
    subject: String,
    body: String,
}

#[derive(Debug)]
struct NotificationResult {
    notification_id: String,
    success: bool,
    error: Option<String>,
}

// === Traits (ISP: small, focused interfaces) ===

/// Send a notification (SRP: single responsibility)
trait NotificationSender {
    fn send(&self, notification: &Notification) -> Result<(), SendError>;
}

/// Store notification records (SRP: single responsibility)
trait NotificationStore {
    fn save(&self, notification: &Notification) -> Result<(), Box<dyn Error>>;
}

/// Log notification events (SRP: single responsibility)
trait NotificationLogger {
    fn log_sent(&self, notification: &Notification, success: bool);
}

// === Service (DIP: depends on abstractions) ===

struct NotificationService<S, T, L>
where
    S: NotificationSender,
    T: NotificationStore,
    L: NotificationLogger,
{
    sender: S,
    store: T,
    logger: L,
}

impl<S, T, L> NotificationService<S, T, L>
where
    S: NotificationSender,
    T: NotificationStore,
    L: NotificationLogger,
{
    fn new(sender: S, store: T, logger: L) -> Self {
        Self { sender, store, logger }
    }

    fn send(&self, notification: Notification) -> NotificationResult {
        // Store first
        if let Err(e) = self.store.save(&notification) {
            return NotificationResult {
                notification_id: notification.id,
                success: false,
                error: Some(e.to_string()),
            };
        }

        // Send
        let result = self.sender.send(&notification);
        let success = result.is_ok();

        // Log
        self.logger.log_sent(&notification, success);

        NotificationResult {
            notification_id: notification.id,
            success,
            error: result.err().map(|e| e.to_string()),
        }
    }
}

// === Implementations (OCP: open for extension) ===

/// Email sender (LSP: honors NotificationSender contract)
struct EmailSender;

impl NotificationSender for EmailSender {
    fn send(&self, notification: &Notification) -> Result<(), SendError> {
        println!("Sending email to {}: {}", notification.recipient, notification.subject);
        Ok(())
    }
}

/// SMS sender (OCP: added without modifying EmailSender)
struct SmsSender;

impl NotificationSender for SmsSender {
    fn send(&self, notification: &Notification) -> Result<(), SendError> {
        println!("Sending SMS to {}: {}", notification.recipient, notification.body);
        Ok(())
    }
}

/// Slack sender (OCP: added without modifying existing senders)
struct SlackSender {
    webhook_url: String,
}

impl NotificationSender for SlackSender {
    fn send(&self, notification: &Notification) -> Result<(), SendError> {
        println!("Posting to Slack: {}", notification.body);
        Ok(())
    }
}

/// In-memory store
struct MemoryStore {
    // In real code, would use interior mutability
}

impl NotificationStore for MemoryStore {
    fn save(&self, notification: &Notification) -> Result<(), Box<dyn Error>> {
        println!("Stored notification {}", notification.id);
        Ok(())
    }
}

/// Console logger
struct ConsoleLogger;

impl NotificationLogger for ConsoleLogger {
    fn log_sent(&self, notification: &Notification, success: bool) {
        println!("Notification {}: {}", notification.id, if success { "sent" } else { "failed" });
    }
}

// === Composition Root ===

fn main() {
    // Wire dependencies (DIP: concrete types only here)
    let sender = EmailSender;
    let store = MemoryStore {};
    let logger = ConsoleLogger;

    let service = NotificationService::new(sender, store, logger);

    // Use the service
    let notification = Notification {
        id: "notif-001".to_string(),
        recipient: "user@example.com".to_string(),
        subject: "Welcome!".to_string(),
        body: "Welcome to our platform.".to_string(),
    };

    let result = service.send(notification);
    println!("Result: {:?}", result);
}
```

---

## Interview Questions

### Q1: How does Rust's lack of inheritance affect SOLID principles?

**Answer**: Rust achieves the same goals through different mechanisms:

- **SRP**: Same as other languages - use modules and focused structs
- **OCP**: Use traits instead of abstract classes; composition instead of inheritance
- **LSP**: Trait implementations must honor behavioral contracts
- **ISP**: Multiple small traits instead of one large interface
- **DIP**: Use generics (`T: Trait`) or trait objects (`dyn Trait`) for injection

Rust's approach often leads to more explicit and safer code because:
1. No implicit inheritance hierarchy to reason about
2. Trait bounds make dependencies explicit at compile time
3. No virtual method table surprises

### Q2: When should you use generics vs trait objects?

**Answer**:

| Use Generics When | Use Trait Objects When |
|-------------------|------------------------|
| Performance is critical | Need heterogeneous collections |
| Type is known at compile time | Type determined at runtime |
| You want monomorphization | Binary size is a concern |
| Static dispatch is acceptable | Need to store different types together |

```rust
// Generics: Fast, type-safe, larger binary
fn process<P: Processor>(p: P) { ... }

// Trait objects: Flexible, smaller binary, runtime dispatch
fn process(p: &dyn Processor) { ... }
```

### Q3: What's wrong with this code from a SOLID perspective?

```rust
struct ReportGenerator {
    db: PostgresDatabase,
    cache: RedisCache,
}

impl ReportGenerator {
    fn new() -> Self {
        Self {
            db: PostgresDatabase::connect("..."),
            cache: RedisCache::connect("..."),
        }
    }

    fn generate(&self, report_type: &str) -> String {
        match report_type {
            "sales" => self.generate_sales(),
            "inventory" => self.generate_inventory(),
            _ => panic!("Unknown report type"),
        }
    }
}
```

**Answer**: Multiple violations:

1. **DIP violated**: Directly creates `PostgresDatabase` and `RedisCache` - high-level module depends on low-level modules
2. **OCP violated**: Adding new report types requires modifying `generate()` method
3. **SRP violated**: Knows about connection strings, caching, AND report generation
4. **Testability**: Cannot test without real database and cache

**Fix**:
```rust
trait DataSource {
    fn query(&self, sql: &str) -> Result<Vec<Row>, Error>;
}

trait ReportFormatter {
    fn format(&self, data: Vec<Row>) -> String;
}

struct ReportGenerator<D: DataSource> {
    data_source: D,
    formatters: HashMap<String, Box<dyn ReportFormatter>>,
}

impl<D: DataSource> ReportGenerator<D> {
    fn new(data_source: D, formatters: HashMap<String, Box<dyn ReportFormatter>>) -> Self {
        Self { data_source, formatters }
    }

    fn generate(&self, report_type: &str, query: &str) -> Result<String, Error> {
        let formatter = self.formatters.get(report_type)
            .ok_or(Error::UnknownReportType)?;
        let data = self.data_source.query(query)?;
        Ok(formatter.format(data))
    }
}
```

---

## Quick Reference

### SOLID Mapping to Rust

| Principle | Rust Implementation |
|-----------|---------------------|
| **SRP** | Focused modules, single-purpose structs, small functions |
| **OCP** | Traits, generics, composition |
| **LSP** | Honor trait contracts, consistent behavior |
| **ISP** | Multiple small traits, trait bounds |
| **DIP** | Traits owned by consumers, generic parameters, trait objects |

### Code Smells

| Smell | Violation | Fix |
|-------|-----------|-----|
| `utils.rs` module | SRP | Split by domain |
| 10+ method struct | SRP, ISP | Split responsibilities |
| `Database::connect()` in constructor | DIP | Inject dependency |
| `match type_string` chains | OCP | Use trait dispatch |
| Panic on invalid input | LSP | Return Result |

### Decision Guide

```
Should I use a trait?
├── Multiple implementations? → Yes
├── Need to mock for testing? → Yes
├── Hide implementation details? → Yes
└── Single, unchanging implementation? → Maybe not (YAGNI)

Should I use generics or trait objects?
├── Need Vec<Box<dyn Trait>>? → Trait objects
├── Performance critical? → Generics
├── Compile times a concern? → Trait objects
└── Want to avoid dyn? → Generics
```

---

## Resources

- [Rust Design Patterns Book](https://rust-unofficial.github.io/patterns/)
- [SOLID Principles in Rust (The Angry Dev)](https://www.darrenhorrocks.co.uk/solid-principles-rust-with-examples/)
- [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- [Effective Rust](https://www.lurklurk.org/effective-rust/)

---

**Next**: [09-design-patterns-creational.md](09-design-patterns-creational.md) — Creational Design Patterns

---

<p align="center">
<b>SOLID in Rust:</b> Traits are your interfaces, composition is your inheritance.
</p>
