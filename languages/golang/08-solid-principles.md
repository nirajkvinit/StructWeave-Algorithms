# SOLID Principles in Go

> Applying object-oriented design principles to Go's unique type system

SOLID principles were originally defined for object-oriented languages with classes and inheritance. Go takes a different approach — no classes, no inheritance, implicit interfaces, and composition over inheritance. This guide shows how each principle applies in idiomatic Go, making your code more maintainable, testable, and extensible.

**Reading time**: 60-75 minutes

---

## Table of Contents

1. [SOLID Overview for Go](#solid-overview-for-go)
2. [Single Responsibility Principle (SRP)](#single-responsibility-principle-srp)
3. [Open/Closed Principle (OCP)](#openclosed-principle-ocp)
4. [Liskov Substitution Principle (LSP)](#liskov-substitution-principle-lsp)
5. [Interface Segregation Principle (ISP)](#interface-segregation-principle-isp)
6. [Dependency Inversion Principle (DIP)](#dependency-inversion-principle-dip)
7. [SOLID in Practice: Complete Example](#solid-in-practice-complete-example)
8. [Interview Questions](#interview-questions)
9. [Quick Reference](#quick-reference)

---

## SOLID Overview for Go

### Why SOLID Matters

SOLID principles help you write code that is:
- **Maintainable**: Easy to modify without breaking other parts
- **Testable**: Components can be tested in isolation
- **Extensible**: New features added without changing existing code
- **Understandable**: Clear boundaries and responsibilities

### Go vs Traditional OOP

Go doesn't have classes or inheritance, but SOLID still applies:

| Traditional OOP | Go Equivalent |
|----------------|---------------|
| Class | Struct + Methods |
| Inheritance | Embedding + Interfaces |
| Abstract class | Interface |
| Polymorphism | Interface satisfaction |
| Constructor | Factory functions (`NewXxx`) |
| Private/Public | Unexported/Exported (lowercase/uppercase) |

### The SOLID Principles

| Principle | One-Line Summary |
|-----------|-----------------|
| **S**ingle Responsibility | One reason to change |
| **O**pen/Closed | Open for extension, closed for modification |
| **L**iskov Substitution | Subtypes must be substitutable |
| **I**nterface Segregation | Many small interfaces > one large interface |
| **D**ependency Inversion | Depend on abstractions, not concretions |

---

## Single Responsibility Principle (SRP)

> "A module should have one, and only one, reason to change."
> — Robert C. Martin

In Go, SRP applies at three levels: **packages**, **structs**, and **functions**.

### Package-Level SRP

Each package should have a focused, cohesive purpose.

```go
// BAD: Package does too many unrelated things
package utils

func ParseJSON(data []byte) (map[string]any, error) { ... }
func SendHTTPRequest(url string) (*http.Response, error) { ... }
func ValidateEmail(email string) bool { ... }
func FormatDate(t time.Time) string { ... }
func HashPassword(password string) string { ... }
func GenerateUUID() string { ... }
```

```go
// GOOD: Separate packages with focused responsibilities
package jsonutil    // jsonutil.Parse(), jsonutil.Marshal()
package httpclient  // httpclient.Get(), httpclient.Post()
package validator   // validator.Email(), validator.Phone()
package timeformat  // timeformat.Date(), timeformat.Duration()
package auth        // auth.HashPassword(), auth.VerifyPassword()
package id          // id.NewUUID(), id.NewNanoID()
```

**Why it matters**: When JSON parsing logic changes, you only touch `jsonutil`. When validation rules change, you only touch `validator`. Changes are isolated.

### Struct-Level SRP

Each struct should represent one concept and have one responsibility.

```go
// BAD: User struct does too many things
type User struct {
    ID       int
    Email    string
    Password string
    db       *sql.DB
    mailer   *smtp.Client
}

func (u *User) Save() error {
    _, err := u.db.Exec("INSERT INTO users...", u.ID, u.Email, u.Password)
    return err
}

func (u *User) SendWelcomeEmail() error {
    return u.mailer.Send(u.Email, "Welcome!", "...")
}

func (u *User) ValidatePassword() bool {
    return len(u.Password) >= 8
}

func (u *User) GenerateReport() string {
    return fmt.Sprintf("User %d: %s", u.ID, u.Email)
}
```

```go
// GOOD: Separate responsibilities into focused types
type User struct {
    ID       int
    Email    string
    Password string
}

// Repository handles persistence
type UserRepository struct {
    db *sql.DB
}

func (r *UserRepository) Save(u *User) error {
    _, err := r.db.Exec("INSERT INTO users...", u.ID, u.Email, u.Password)
    return err
}

func (r *UserRepository) FindByID(id int) (*User, error) {
    // ...
}

// EmailService handles notifications
type EmailService struct {
    client *smtp.Client
}

func (s *EmailService) SendWelcome(u *User) error {
    return s.client.Send(u.Email, "Welcome!", "...")
}

// PasswordValidator handles validation
type PasswordValidator struct {
    MinLength int
}

func (v *PasswordValidator) Validate(password string) error {
    if len(password) < v.MinLength {
        return fmt.Errorf("password must be at least %d characters", v.MinLength)
    }
    return nil
}
```

### Function-Level SRP

Each function should do one thing well.

```go
// BAD: Function does too many things
func ProcessOrder(order *Order) error {
    // Validate
    if order.Total <= 0 {
        return errors.New("invalid total")
    }
    if len(order.Items) == 0 {
        return errors.New("no items")
    }

    // Calculate tax
    tax := order.Total * 0.08
    order.Tax = tax
    order.GrandTotal = order.Total + tax

    // Save to database
    _, err := db.Exec("INSERT INTO orders...", order.ID, order.GrandTotal)
    if err != nil {
        return err
    }

    // Send confirmation email
    err = mailer.Send(order.CustomerEmail, "Order Confirmed", "...")
    if err != nil {
        log.Printf("failed to send email: %v", err)
    }

    // Update inventory
    for _, item := range order.Items {
        _, err = db.Exec("UPDATE inventory SET qty = qty - ?...", item.Qty)
        if err != nil {
            return err
        }
    }

    return nil
}
```

```go
// GOOD: Separate functions with single responsibilities
func (s *OrderService) ProcessOrder(order *Order) error {
    if err := s.validator.Validate(order); err != nil {
        return fmt.Errorf("validation failed: %w", err)
    }

    s.calculator.ApplyTax(order)

    if err := s.repo.Save(order); err != nil {
        return fmt.Errorf("saving order: %w", err)
    }

    // Fire-and-forget notification (non-critical)
    go s.notifier.SendConfirmation(order)

    if err := s.inventory.Deduct(order.Items); err != nil {
        return fmt.Errorf("updating inventory: %w", err)
    }

    return nil
}

func (v *OrderValidator) Validate(order *Order) error {
    if order.Total <= 0 {
        return errors.New("invalid total")
    }
    if len(order.Items) == 0 {
        return errors.New("no items")
    }
    return nil
}

func (c *TaxCalculator) ApplyTax(order *Order) {
    order.Tax = order.Total * c.Rate
    order.GrandTotal = order.Total + order.Tax
}
```

### Signs of SRP Violation

| Code Smell | What It Indicates |
|------------|------------------|
| Package named `utils`, `common`, `helpers` | No clear responsibility |
| Struct with 10+ methods | Too many responsibilities |
| Function longer than 50 lines | Doing too much |
| Multiple reasons to modify a file | Mixed concerns |
| Difficulty writing unit tests | Too many dependencies |

---

## Open/Closed Principle (OCP)

> "Software entities should be open for extension, but closed for modification."
> — Bertrand Meyer

In Go, we achieve OCP through **interfaces**, **embedding**, and **function types**.

### Extension Through Interfaces

Define behavior as interfaces, then add new implementations without changing existing code.

```go
// NotificationSender defines the contract
// CLOSED: This interface won't change when we add new notification types
type NotificationSender interface {
    Send(message string) error
}

// NotificationService uses the interface
// CLOSED: This service won't change when we add new senders
type NotificationService struct {
    senders []NotificationSender
}

func (s *NotificationService) NotifyAll(msg string) error {
    for _, sender := range s.senders {
        if err := sender.Send(msg); err != nil {
            return fmt.Errorf("notification failed: %w", err)
        }
    }
    return nil
}

// OPEN: Add new notification types by implementing the interface
type EmailSender struct {
    client *smtp.Client
}

func (e *EmailSender) Send(msg string) error {
    return e.client.SendMail("notifications@example.com", msg)
}

type SMSSender struct {
    client *twilio.Client
}

func (s *SMSSender) Send(msg string) error {
    return s.client.SendSMS("+1234567890", msg)
}

type SlackSender struct {
    webhookURL string
}

func (s *SlackSender) Send(msg string) error {
    return postToWebhook(s.webhookURL, msg)
}

// Adding a new sender (PushNotificationSender) requires:
// 1. Create new struct implementing NotificationSender
// 2. No changes to NotificationService!
```

### Extension Through Embedding

Extend behavior by embedding existing types.

```go
// Base logger
type Logger struct {
    output io.Writer
}

func (l *Logger) Log(msg string) {
    fmt.Fprintln(l.output, msg)
}

// Extended with timestamps - no modification to Logger
type TimestampedLogger struct {
    Logger // Embedded
}

func (l *TimestampedLogger) Log(msg string) {
    timestamped := fmt.Sprintf("[%s] %s", time.Now().Format(time.RFC3339), msg)
    l.Logger.Log(timestamped)
}

// Further extended with levels - no modification to previous types
type LeveledLogger struct {
    TimestampedLogger
    MinLevel LogLevel
}

func (l *LeveledLogger) LogLevel(level LogLevel, msg string) {
    if level >= l.MinLevel {
        prefixed := fmt.Sprintf("[%s] %s", level, msg)
        l.TimestampedLogger.Log(prefixed)
    }
}

// Usage
logger := &LeveledLogger{
    TimestampedLogger: TimestampedLogger{
        Logger: Logger{output: os.Stdout},
    },
    MinLevel: LevelInfo,
}
```

### Extension Through Function Types

Use function types to allow behavior injection.

```go
// Middleware pattern - open for extension
type Middleware func(http.Handler) http.Handler

func LoggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        log.Printf("%s %s %v", r.Method, r.URL.Path, time.Since(start))
    })
}

func AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := r.Header.Get("Authorization")
        if !isValidToken(token) {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }
        next.ServeHTTP(w, r)
    })
}

func RateLimitMiddleware(rps int) Middleware {
    limiter := rate.NewLimiter(rate.Limit(rps), rps)
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            if !limiter.Allow() {
                http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
                return
            }
            next.ServeHTTP(w, r)
        })
    }
}

// Chain middlewares - no modification to any existing middleware
func Chain(h http.Handler, middlewares ...Middleware) http.Handler {
    for i := len(middlewares) - 1; i >= 0; i-- {
        h = middlewares[i](h)
    }
    return h
}

// Usage
handler := Chain(
    myHandler,
    LoggingMiddleware,
    AuthMiddleware,
    RateLimitMiddleware(100),
)
```

### Strategy Pattern for OCP

```go
// PaymentStrategy defines payment behavior
type PaymentStrategy interface {
    Pay(amount Money) (TransactionID, error)
}

// PaymentProcessor is closed for modification
type PaymentProcessor struct {
    strategy PaymentStrategy
}

func (p *PaymentProcessor) Process(amount Money) (TransactionID, error) {
    return p.strategy.Pay(amount)
}

// Open for extension: add new payment methods
type CreditCardPayment struct {
    cardNumber string
    gateway    *stripe.Client
}

func (c *CreditCardPayment) Pay(amount Money) (TransactionID, error) {
    // Process credit card
}

type CryptoPayment struct {
    walletAddress string
    network       string
}

func (c *CryptoPayment) Pay(amount Money) (TransactionID, error) {
    // Process crypto payment
}

// Adding Apple Pay, Google Pay, etc. doesn't touch PaymentProcessor
```

---

## Liskov Substitution Principle (LSP)

> "If S is a subtype of T, then objects of type T may be replaced with objects of type S without altering program correctness."
> — Barbara Liskov

In Go, LSP means: **implementations must honor the behavioral contract of the interface they satisfy**.

### Go's Implicit Interface Satisfaction

Go interfaces are satisfied implicitly. The compiler checks method signatures, but **you must ensure behavioral correctness**.

```go
// Cache interface defines the contract
type Cache interface {
    // Get returns the value and true if found, zero value and false if not
    Get(key string) (value any, found bool)

    // Set stores a value with a TTL, returns error on failure
    Set(key string, value any, ttl time.Duration) error
}

// All implementations must honor this contract
type MemoryCache struct {
    data map[string]cacheEntry
    mu   sync.RWMutex
}

func (c *MemoryCache) Get(key string) (any, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    entry, ok := c.data[key]
    if !ok || entry.expired() {
        return nil, false // Contract: return false if not found
    }
    return entry.value, true
}

func (c *MemoryCache) Set(key string, value any, ttl time.Duration) error {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.data[key] = cacheEntry{value: value, expiresAt: time.Now().Add(ttl)}
    return nil // Contract: return nil on success
}

// RedisCache can substitute MemoryCache anywhere Cache is expected
type RedisCache struct {
    client *redis.Client
}

func (c *RedisCache) Get(key string) (any, bool) {
    val, err := c.client.Get(context.Background(), key).Result()
    if err == redis.Nil {
        return nil, false // Same contract: false if not found
    }
    if err != nil {
        return nil, false // Treat errors as "not found" per contract
    }
    return val, true
}

func (c *RedisCache) Set(key string, value any, ttl time.Duration) error {
    return c.client.Set(context.Background(), key, value, ttl).Err()
}
```

### LSP Violations to Avoid

#### Violation 1: Stricter Preconditions

```go
type DataStore interface {
    Save(data []byte) error
}

// BAD: Stricter precondition than interface promises
type LimitedStore struct{}

func (s *LimitedStore) Save(data []byte) error {
    if len(data) > 1024 {
        return errors.New("data too large") // Interface doesn't promise a size limit!
    }
    // ...
}

// GOOD: Document limits in the interface, or handle gracefully
type DataStore interface {
    // Save stores data. Implementations may chunk large data.
    Save(data []byte) error
}

type ChunkingStore struct{}

func (s *ChunkingStore) Save(data []byte) error {
    // Chunk large data instead of rejecting
    for i := 0; i < len(data); i += 1024 {
        end := min(i+1024, len(data))
        if err := s.saveChunk(data[i:end]); err != nil {
            return err
        }
    }
    return nil
}
```

#### Violation 2: Weaker Postconditions

```go
type Repository interface {
    // Save persists data and returns an ID that can be used for retrieval
    Save(data []byte) (id string, err error)
}

// BAD: Weaker postcondition - ID might not work for retrieval
type VolatileRepo struct{}

func (r *VolatileRepo) Save(data []byte) (string, error) {
    id := generateID()
    // Data stored in memory, might be gone before retrieval!
    return id, nil // Violates implicit contract that ID enables retrieval
}

// GOOD: Honor the postcondition or change the interface
type PersistentRepo struct {
    storage Storage
}

func (r *PersistentRepo) Save(data []byte) (string, error) {
    id := generateID()
    if err := r.storage.Write(id, data); err != nil {
        return "", err
    }
    return id, nil // ID guarantees retrieval
}
```

#### Violation 3: Panic Instead of Error

```go
type Reader interface {
    Read(p []byte) (n int, err error)
}

// BAD: Panics instead of returning error
type PanickingReader struct{}

func (r *PanickingReader) Read(p []byte) (int, error) {
    panic("not implemented") // VIOLATION: Callers expect error, not panic
}

// GOOD: Return error as contract specifies
type UnimplementedReader struct{}

func (r *UnimplementedReader) Read(p []byte) (int, error) {
    return 0, errors.New("reader not implemented")
}
```

### The LSP Mantra

> **"Require no more, promise no less."**

| Aspect | Requirement |
|--------|-------------|
| **Preconditions** | Cannot be strengthened (can't require more than interface) |
| **Postconditions** | Cannot be weakened (must deliver what interface promises) |
| **Invariants** | Must be preserved |
| **History constraint** | Cannot allow state changes the interface doesn't permit |

---

## Interface Segregation Principle (ISP)

> "Clients should not be forced to depend on methods they do not use."
> — Robert C. Martin

This is where Go truly shines. Go's philosophy naturally promotes small, focused interfaces.

### The Go Proverb

> **"The bigger the interface, the weaker the abstraction."**
> — Rob Pike

### Standard Library Excellence

Go's standard library demonstrates ISP perfectly:

```go
// io package: Small, focused interfaces
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

type Closer interface {
    Close() error
}

// Compose when needed
type ReadWriter interface {
    Reader
    Writer
}

type ReadCloser interface {
    Reader
    Closer
}

type WriteCloser interface {
    Writer
    Closer
}

type ReadWriteCloser interface {
    Reader
    Writer
    Closer
}
```

```go
// More single-method interfaces from stdlib
type Stringer interface {
    String() string
}

type error interface {
    Error() string
}

type Handler interface {
    ServeHTTP(ResponseWriter, *Request)
}

type Marshaler interface {
    MarshalJSON() ([]byte, error)
}
```

### Accept Interfaces, Return Structs

This Go idiom embodies ISP:

```go
// BAD: Requires more than needed
func ProcessData(rw io.ReadWriteCloser) error {
    data, err := io.ReadAll(rw) // Only reading!
    if err != nil {
        return err
    }
    // Process data...
    return nil
}

// GOOD: Accept only what you need
func ProcessData(r io.Reader) error {
    data, err := io.ReadAll(r)
    if err != nil {
        return err
    }
    // Process data...
    return nil
}

// Now works with anything that can Read:
ProcessData(os.Stdin)                    // *os.File
ProcessData(bytes.NewReader(data))       // *bytes.Reader
ProcessData(strings.NewReader("hello"))  // *strings.Reader
ProcessData(resp.Body)                   // io.ReadCloser from HTTP
ProcessData(gzip.NewReader(compressed))  // *gzip.Reader
ProcessData(&myCustomReader{})           // Your own type
```

### Kitchen Sink Anti-Pattern

```go
// BAD: Giant interface forces implementations to include unused methods
type DataManager interface {
    Create(data []byte) (id string, err error)
    Read(id string) ([]byte, error)
    Update(id string, data []byte) error
    Delete(id string) error
    List() ([]string, error)
    Search(query string) ([]string, error)
    Export(format string) ([]byte, error)
    Import(data []byte) error
    Backup() error
    Restore(backup []byte) error
    Validate(data []byte) error
    Transform(data []byte, rules []Rule) ([]byte, error)
}

// Any implementation must provide ALL methods, even if unused
// Testing requires mocking 12 methods!
```

```go
// GOOD: Segregated interfaces
type Creator interface {
    Create(data []byte) (id string, err error)
}

type Reader interface {
    Read(id string) ([]byte, error)
}

type Updater interface {
    Update(id string, data []byte) error
}

type Deleter interface {
    Delete(id string) error
}

type Lister interface {
    List() ([]string, error)
}

type Searcher interface {
    Search(query string) ([]string, error)
}

// Compose for specific use cases
type CRUD interface {
    Creator
    Reader
    Updater
    Deleter
}

type ReadOnlyStore interface {
    Reader
    Lister
    Searcher
}

// Functions accept only what they need
func ImportData(c Creator, data [][]byte) error {
    for _, d := range data {
        if _, err := c.Create(d); err != nil {
            return err
        }
    }
    return nil
}

func GenerateReport(r Reader, l Lister) ([]byte, error) {
    ids, err := l.List()
    if err != nil {
        return nil, err
    }
    // Only needs Read and List, nothing else
}
```

### Define Interfaces Where They're Used

```go
// package service
// Define the interface where it's consumed, not where it's implemented

// UserStore defines what the service needs - nothing more
type UserStore interface {
    GetUser(id int) (*User, error)
    SaveUser(u *User) error
}

type UserService struct {
    store UserStore // Depends on minimal interface
}

// package postgres
// Implementation satisfies the interface defined elsewhere
type PostgresUserStore struct {
    db *sql.DB
}

func (s *PostgresUserStore) GetUser(id int) (*User, error) { /* ... */ }
func (s *PostgresUserStore) SaveUser(u *User) error { /* ... */ }
// May have additional methods, but UserService only sees what it needs
```

### Testing Benefits

Small interfaces make testing trivial:

```go
// Testing with large interface - painful
type mockDataManager struct{}
func (m *mockDataManager) Create(data []byte) (string, error) { return "", nil }
func (m *mockDataManager) Read(id string) ([]byte, error) { return nil, nil }
func (m *mockDataManager) Update(id string, data []byte) error { return nil }
func (m *mockDataManager) Delete(id string) error { return nil }
// ... 8 more methods to implement!

// Testing with small interface - easy
type mockCreator struct {
    created [][]byte
}

func (m *mockCreator) Create(data []byte) (string, error) {
    m.created = append(m.created, data)
    return fmt.Sprintf("id-%d", len(m.created)), nil
}

func TestImportData(t *testing.T) {
    mock := &mockCreator{}
    err := ImportData(mock, testData)
    if err != nil {
        t.Fatal(err)
    }
    if len(mock.created) != len(testData) {
        t.Errorf("expected %d creates, got %d", len(testData), len(mock.created))
    }
}
```

---

## Dependency Inversion Principle (DIP)

> "High-level modules should not depend on low-level modules. Both should depend on abstractions."
> — Robert C. Martin

In Go:
- **Define interfaces where they're consumed** (not where they're implemented)
- **Use constructor injection**
- **Push concrete dependencies to the composition root** (usually `main`)

### Traditional vs Inverted Dependencies

```
Traditional (BAD):
┌─────────────┐
│   Service   │ ──depends on──> ┌──────────┐
└─────────────┘                 │ postgres │
                                └──────────┘

Inverted (GOOD):
┌─────────────┐                 ┌──────────┐
│   Service   │ ──depends on──> │Interface │
└─────────────┘                 └──────────┘
                                     ▲
                                     │ implements
                                ┌──────────┐
                                │ postgres │
                                └──────────┘
```

### Interface Ownership

```go
// BAD: Low-level module defines the interface
// package database
type UserRepository interface {
    Find(id int) (*User, error)
    Save(u *User) error
}

type PostgresUserRepo struct { /* ... */ }

// package service
import "myapp/database" // High-level depends on low-level!

type UserService struct {
    repo database.UserRepository // Coupled to database package
}
```

```go
// GOOD: High-level module defines the interface
// package service
type UserStore interface { // Interface defined where it's USED
    GetUser(id int) (*User, error)
    SaveUser(u *User) error
}

type UserService struct {
    store UserStore // Depends on abstraction it owns
}

func NewUserService(store UserStore) *UserService {
    return &UserService{store: store}
}

// package postgres
import "myapp/service" // Low-level depends on high-level!

type UserStore struct {
    db *sql.DB
}

func (s *UserStore) GetUser(id int) (*service.User, error) { /* ... */ }
func (s *UserStore) SaveUser(u *service.User) error { /* ... */ }
// Implements service.UserStore
```

### Constructor Injection

```go
// package service
type EmailSender interface {
    Send(to, subject, body string) error
}

type Logger interface {
    Info(msg string, args ...any)
    Error(msg string, args ...any)
}

type OrderService struct {
    store  OrderStore
    email  EmailSender
    logger Logger
}

// Constructor accepts interfaces
func NewOrderService(store OrderStore, email EmailSender, logger Logger) *OrderService {
    return &OrderService{
        store:  store,
        email:  email,
        logger: logger,
    }
}

func (s *OrderService) PlaceOrder(order *Order) error {
    s.logger.Info("placing order", "orderID", order.ID)

    if err := s.store.Save(order); err != nil {
        s.logger.Error("failed to save order", "error", err)
        return fmt.Errorf("saving order: %w", err)
    }

    if err := s.email.Send(order.CustomerEmail, "Order Confirmed", "..."); err != nil {
        s.logger.Error("failed to send confirmation", "error", err)
        // Non-critical, don't fail the order
    }

    return nil
}
```

### Composition Root Pattern

Wire everything together in `main` (the composition root):

```go
// cmd/server/main.go
func main() {
    // Create low-level dependencies
    db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    redisClient := redis.NewClient(&redis.Options{
        Addr: os.Getenv("REDIS_URL"),
    })

    smtpClient := smtp.NewClient(os.Getenv("SMTP_HOST"))

    // Create concrete implementations
    orderStore := postgres.NewOrderStore(db)
    userStore := postgres.NewUserStore(db)
    cache := rediscache.New(redisClient)
    emailSender := sendgrid.NewSender(os.Getenv("SENDGRID_API_KEY"))
    logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

    // Wire up services with dependencies
    userService := service.NewUserService(userStore, cache, logger)
    orderService := service.NewOrderService(orderStore, emailSender, logger)

    // Create HTTP handlers
    handler := api.NewHandler(userService, orderService, logger)

    // Start server
    server := &http.Server{
        Addr:    ":8080",
        Handler: handler,
    }

    log.Fatal(server.ListenAndServe())
}
```

### Package Structure for DIP

```
myapp/
├── cmd/
│   └── server/
│       └── main.go              # Composition root
├── internal/
│   ├── service/                 # Business logic (high-level)
│   │   ├── user.go              # Defines UserStore interface
│   │   ├── order.go             # Defines OrderStore interface
│   │   └── interfaces.go        # Shared interfaces
│   ├── postgres/                # Implementation (low-level)
│   │   ├── user_store.go        # Implements service.UserStore
│   │   └── order_store.go       # Implements service.OrderStore
│   ├── redis/
│   │   └── cache.go             # Implements service.Cache
│   └── api/
│       └── handler.go           # HTTP handlers
└── pkg/                         # Public packages (if any)
```

### Functional Options for Optional Dependencies

```go
type ServerOption func(*Server)

func WithLogger(l Logger) ServerOption {
    return func(s *Server) {
        s.logger = l
    }
}

func WithCache(c Cache) ServerOption {
    return func(s *Server) {
        s.cache = c
    }
}

func WithMetrics(m MetricsCollector) ServerOption {
    return func(s *Server) {
        s.metrics = m
    }
}

type Server struct {
    store   DataStore // Required
    logger  Logger    // Optional
    cache   Cache     // Optional
    metrics MetricsCollector // Optional
}

func NewServer(store DataStore, opts ...ServerOption) *Server {
    s := &Server{
        store:   store,
        logger:  noopLogger{},   // Sensible default
        cache:   noopCache{},    // Sensible default
        metrics: noopMetrics{},  // Sensible default
    }
    for _, opt := range opts {
        opt(s)
    }
    return s
}

// Usage
server := NewServer(
    postgresStore,              // Required
    WithLogger(slogLogger),     // Optional
    WithCache(redisCache),      // Optional
)
```

---

## SOLID in Practice: Complete Example

Let's build a payment processing system applying all SOLID principles:

```go
// ============================================
// INTERFACES (ISP: Small, focused interfaces)
// ============================================

// package payment

// PaymentProcessor handles payment execution (ISP: single responsibility)
type PaymentProcessor interface {
    Process(ctx context.Context, amount Money, method PaymentMethod) (TransactionID, error)
}

// RefundProcessor handles refunds separately (ISP: segregated from payment)
type RefundProcessor interface {
    Refund(ctx context.Context, txID TransactionID, amount Money) error
}

// PaymentLogger logs payment events (ISP: focused interface)
type PaymentLogger interface {
    LogPayment(txID TransactionID, amount Money, status string)
    LogError(txID TransactionID, err error)
}

// ============================================
// SERVICE (SRP: Single responsibility - orchestration)
// ============================================

type PaymentService struct {
    processor PaymentProcessor // DIP: Depends on abstraction
    logger    PaymentLogger    // DIP: Depends on abstraction
    validator PaymentValidator // DIP: Depends on abstraction
}

// Constructor injection (DIP)
func NewPaymentService(
    processor PaymentProcessor,
    logger PaymentLogger,
    validator PaymentValidator,
) *PaymentService {
    return &PaymentService{
        processor: processor,
        logger:    logger,
        validator: validator,
    }
}

func (s *PaymentService) ProcessPayment(ctx context.Context, req PaymentRequest) (*PaymentResult, error) {
    // Validate (SRP: delegated to validator)
    if err := s.validator.Validate(req); err != nil {
        return nil, fmt.Errorf("validation failed: %w", err)
    }

    // Process (SRP: delegated to processor)
    txID, err := s.processor.Process(ctx, req.Amount, req.Method)
    if err != nil {
        s.logger.LogError("", err)
        return nil, fmt.Errorf("payment failed: %w", err)
    }

    // Log success (SRP: delegated to logger)
    s.logger.LogPayment(txID, req.Amount, "success")

    return &PaymentResult{TransactionID: txID, Status: "success"}, nil
}

// ============================================
// IMPLEMENTATIONS (OCP: Open for extension)
// ============================================

// StripeProcessor - one implementation
type StripeProcessor struct {
    client *stripe.Client
}

func NewStripeProcessor(apiKey string) *StripeProcessor {
    return &StripeProcessor{
        client: stripe.NewClient(apiKey),
    }
}

// LSP: Honors PaymentProcessor contract exactly
func (p *StripeProcessor) Process(ctx context.Context, amount Money, method PaymentMethod) (TransactionID, error) {
    charge, err := p.client.Charges.New(&stripe.ChargeParams{
        Amount:   stripe.Int64(int64(amount.Cents())),
        Currency: stripe.String(string(amount.Currency())),
    })
    if err != nil {
        return "", err // Returns error, never panics (LSP)
    }
    return TransactionID(charge.ID), nil
}

// PayPalProcessor - another implementation (OCP: extend without modifying service)
type PayPalProcessor struct {
    client *paypal.Client
}

func NewPayPalProcessor(clientID, secret string) *PayPalProcessor {
    client, _ := paypal.NewClient(clientID, secret, paypal.APIBaseSandBox)
    return &PayPalProcessor{client: client}
}

// LSP: Same contract, different implementation
func (p *PayPalProcessor) Process(ctx context.Context, amount Money, method PaymentMethod) (TransactionID, error) {
    order, err := p.client.CreateOrder(ctx, paypal.OrderIntentCapture, /* ... */)
    if err != nil {
        return "", err
    }
    return TransactionID(order.ID), nil
}

// CryptoProcessor - easy to add new payment methods (OCP)
type CryptoProcessor struct {
    network string
    wallet  string
}

func (p *CryptoProcessor) Process(ctx context.Context, amount Money, method PaymentMethod) (TransactionID, error) {
    // Different implementation, same interface
    return TransactionID(generateCryptoTxHash()), nil
}

// ============================================
// COMPOSITION ROOT (DIP: Wire in main)
// ============================================

func main() {
    // Choose processor based on config (OCP: easy to swap)
    var processor payment.PaymentProcessor
    switch os.Getenv("PAYMENT_PROVIDER") {
    case "stripe":
        processor = payment.NewStripeProcessor(os.Getenv("STRIPE_KEY"))
    case "paypal":
        processor = payment.NewPayPalProcessor(
            os.Getenv("PAYPAL_CLIENT_ID"),
            os.Getenv("PAYPAL_SECRET"),
        )
    case "crypto":
        processor = &payment.CryptoProcessor{
            network: os.Getenv("CRYPTO_NETWORK"),
            wallet:  os.Getenv("CRYPTO_WALLET"),
        }
    default:
        log.Fatal("unknown payment provider")
    }

    logger := payment.NewSlogLogger(slog.Default())
    validator := payment.NewDefaultValidator()

    // DIP: Wire dependencies
    service := payment.NewPaymentService(processor, logger, validator)

    // Use service
    handler := api.NewPaymentHandler(service)
    http.Handle("/pay", handler)
    http.ListenAndServe(":8080", nil)
}
```

---

## Interview Questions

### Q1: How does Go handle the Open/Closed Principle without inheritance?

**Answer**: Go uses interfaces and composition instead of inheritance. We define interfaces for extension points, and new behavior is added by implementing those interfaces or embedding existing types. The middleware pattern is a classic example—new middleware can be added without modifying the router or existing handlers. Embedding allows extending behavior by wrapping existing types.

### Q2: What's the Go equivalent of dependency injection frameworks?

**Answer**: Go typically uses manual constructor injection rather than frameworks. Dependencies are passed as interface parameters to `NewXxx()` constructor functions. The "composition root" pattern centralizes wiring in `main()`. For complex applications, Google's Wire tool generates dependency injection code at compile time, maintaining type safety without runtime reflection.

### Q3: How do Go interfaces naturally support ISP?

**Answer**: Go interfaces are implicitly satisfied and tend to be small by convention. A type automatically implements any interface whose methods it has. This encourages defining minimal interfaces—if a function only needs `Read()`, it accepts `io.Reader`, not `io.ReadWriteCloser`. The standard library exemplifies this with single-method interfaces like `io.Reader`, `fmt.Stringer`, `http.Handler`, and `error`.

### Q4: What's wrong with this code from a SOLID perspective?

```go
type UserService struct {
    db *sql.DB
}

func (s *UserService) CreateUser(u *User) error {
    _, err := s.db.Exec("INSERT INTO users...", u.ID, u.Email)
    if err != nil {
        log.Printf("Failed to create user: %v", err)
        sendErrorEmail("admin@example.com", err)
    }
    return err
}
```

**Answer**: Multiple violations:
- **SRP**: Service handles persistence, logging, AND email notifications
- **DIP**: Directly depends on `*sql.DB` (concrete) instead of interface
- **DIP**: Uses global `log` and hidden `sendErrorEmail` dependency
- **Testability**: Cannot test without real database

**Fix**:
```go
type UserStore interface {
    Save(u *User) error
}

type Logger interface {
    Error(msg string, args ...any)
}

type ErrorNotifier interface {
    NotifyAdmin(err error)
}

type UserService struct {
    store    UserStore
    logger   Logger
    notifier ErrorNotifier
}

func (s *UserService) CreateUser(u *User) error {
    err := s.store.Save(u)
    if err != nil {
        s.logger.Error("failed to create user", "error", err)
        s.notifier.NotifyAdmin(err)
    }
    return err
}
```

### Q5: When should you NOT apply SOLID principles?

**Answer**: SOLID can be over-applied:
- **Small scripts or prototypes**: Premature abstraction adds complexity
- **Performance-critical code**: Interfaces add indirection
- **Single implementations**: Creating interfaces for one implementation is YAGNI
- **Tight deadlines**: Get it working first, refactor later

The goal is maintainability, not dogmatic adherence. Apply SOLID when the complexity is warranted.

---

## Quick Reference

### SOLID Mapping to Go

| Principle | Go Implementation |
|-----------|-------------------|
| **SRP** | Focused packages, single-purpose structs, small functions |
| **OCP** | Interfaces, embedding, function types |
| **LSP** | Honor interface contracts, no surprises |
| **ISP** | Small interfaces, accept minimal interfaces |
| **DIP** | Define interfaces at consumer, constructor injection |

### Common Patterns

| Pattern | Principle | Go Implementation |
|---------|-----------|-------------------|
| Repository | SRP, DIP | Interface in service, impl in storage pkg |
| Middleware | OCP | `func(Handler) Handler` |
| Factory | DIP | `NewXxx(dependencies)` |
| Options | DIP | `func(*Config)` variadic |
| Decorator | OCP | Embedding + method shadowing |

### Code Smells

| Smell | Violation | Fix |
|-------|-----------|-----|
| "util" package | SRP | Split by domain |
| 10+ method interface | ISP | Split into smaller interfaces |
| `import "database/sql"` in service | DIP | Define interface, inject |
| Method panics instead of errors | LSP | Return error |
| Function accepts unused methods | ISP | Accept smaller interface |

### Questions to Ask

| Question | Helps With |
|----------|------------|
| "How many reasons could this change?" | SRP |
| "Can I add features without modifying this?" | OCP |
| "Can any implementation substitute here?" | LSP |
| "Does caller use all these methods?" | ISP |
| "Who owns this interface?" | DIP |

---

## Resources

- [Dave Cheney - SOLID Go Design](https://dave.cheney.net/2016/08/20/solid-go-design) — The foundational talk
- [Go Proverbs](https://go-proverbs.github.io/) — Rob Pike's design wisdom
- [Effective Go](https://go.dev/doc/effective_go) — Official style guide
- [Google Go Style Guide](https://google.github.io/styleguide/go/) — Production patterns

---

**Next**: [09-design-patterns-creational.md](09-design-patterns-creational.md) — Creational Design Patterns
