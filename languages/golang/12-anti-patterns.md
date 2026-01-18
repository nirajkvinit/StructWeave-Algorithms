# Go Anti-Patterns and Best Practices to Avoid

> Recognize and avoid patterns that cause bugs, performance issues, and maintainability problems

This guide catalogs common Go anti-patterns—coding practices that seem reasonable but lead to subtle bugs, performance issues, or unmaintainable code. Each anti-pattern includes code examples showing the problem and the fix.

**Reading time**: 75-90 minutes

---

## Table of Contents

1. [Concurrency Anti-Patterns](#concurrency-anti-patterns)
2. [Error Handling Anti-Patterns](#error-handling-anti-patterns)
3. [Interface Anti-Patterns](#interface-anti-patterns)
4. [Memory and Performance Anti-Patterns](#memory-and-performance-anti-patterns)
5. [Package Design Anti-Patterns](#package-design-anti-patterns)
6. [Code Style Anti-Patterns](#code-style-anti-patterns)
7. [Testing Anti-Patterns](#testing-anti-patterns)
8. [Detection Tools](#detection-tools)
9. [Quick Reference](#quick-reference)

---

## Concurrency Anti-Patterns

### 1. Goroutine Leaks

Goroutines that never terminate consume memory indefinitely.

**Problem: Unbuffered channel with no receiver**

```go
// BAD: Goroutine blocks forever if caller doesn't receive
func processAsync() chan int {
    ch := make(chan int) // Unbuffered
    go func() {
        result := expensiveOperation()
        ch <- result // Blocks forever if no receiver
    }()
    return ch
}

// Usage that causes leak:
func handler(w http.ResponseWriter, r *http.Request) {
    ch := processAsync()
    if r.Context().Err() != nil {
        return // Goroutine leaks! No one reads from ch
    }
    result := <-ch
    // ...
}
```

**Fix: Use buffered channel or context cancellation**

```go
// GOOD: Buffered channel - goroutine can always send
func processAsync() chan int {
    ch := make(chan int, 1) // Buffered
    go func() {
        ch <- expensiveOperation()
    }()
    return ch
}

// BETTER: Context cancellation
func processAsync(ctx context.Context) chan int {
    ch := make(chan int, 1)
    go func() {
        select {
        case ch <- expensiveOperation():
        case <-ctx.Done():
            // Clean exit on cancellation
        }
    }()
    return ch
}
```

### 2. Unbounded Goroutine Spawning

Spawning unlimited goroutines leads to resource exhaustion.

```go
// BAD: Spawns goroutine per request with no limit
func handleRequests(requests []Request) {
    for _, req := range requests {
        go process(req) // 1 million requests = 1 million goroutines
    }
}
```

**Fix: Use worker pool or semaphore**

```go
// GOOD: Worker pool with bounded concurrency
func handleRequests(requests []Request) {
    numWorkers := runtime.GOMAXPROCS(0) * 2
    jobs := make(chan Request, len(requests))
    var wg sync.WaitGroup

    // Start fixed number of workers
    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for req := range jobs {
                process(req)
            }
        }()
    }

    // Send jobs
    for _, req := range requests {
        jobs <- req
    }
    close(jobs)
    wg.Wait()
}

// GOOD: Semaphore pattern
func handleRequests(requests []Request) {
    sem := make(chan struct{}, 100) // Max 100 concurrent
    var wg sync.WaitGroup

    for _, req := range requests {
        wg.Add(1)
        sem <- struct{}{} // Acquire
        go func(r Request) {
            defer wg.Done()
            defer func() { <-sem }() // Release
            process(r)
        }(req)
    }
    wg.Wait()
}
```

### 3. WaitGroup.Add Inside Goroutine

Adding to WaitGroup inside the goroutine causes race conditions.

```go
// BAD: Race between Add and Wait
func process(items []Item) {
    var wg sync.WaitGroup
    for _, item := range items {
        go func(i Item) {
            wg.Add(1) // Race! May happen after Wait()
            defer wg.Done()
            handle(i)
        }(item)
    }
    wg.Wait() // May return before all Add() calls
}
```

**Fix: Add before spawning goroutine**

```go
// GOOD: Add before goroutine
func process(items []Item) {
    var wg sync.WaitGroup
    for _, item := range items {
        wg.Add(1) // Add in main goroutine
        go func(i Item) {
            defer wg.Done()
            handle(i)
        }(item)
    }
    wg.Wait()
}
```

### 4. Copying Sync Primitives

Sync types contain internal state that cannot be copied.

```go
// BAD: Copying mutex via value receiver
type Counter struct {
    mu    sync.Mutex
    count int
}

func (c Counter) Increment() { // Value receiver - copies mutex!
    c.mu.Lock()
    c.count++
    c.mu.Unlock()
}

// BAD: Assigning struct with mutex
c1 := Counter{}
c2 := c1 // Copies mutex - undefined behavior!
```

**Fix: Use pointer receivers, don't copy**

```go
// GOOD: Pointer receiver
func (c *Counter) Increment() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.count++
}

// GOOD: Use pointers for structs containing sync types
c1 := &Counter{}
// Pass c1, don't copy
```

### 5. Channel Send to Closed Channel

Sending to a closed channel panics.

```go
// BAD: Potential panic
func producer(ch chan<- int) {
    for i := 0; i < 10; i++ {
        ch <- i
    }
}

func consumer(ch chan int) {
    for i := 0; i < 5; i++ {
        <-ch
    }
    close(ch) // Consumer closes
}

// If producer sends after close: panic!
```

**Fix: Only sender should close**

```go
// GOOD: Sender closes
func producer(ch chan<- int) {
    defer close(ch) // Sender closes when done
    for i := 0; i < 10; i++ {
        ch <- i
    }
}

func consumer(ch <-chan int) {
    for v := range ch { // Reads until closed
        process(v)
    }
}
```

### 6. Data Race on Shared Variables

Concurrent access without synchronization causes undefined behavior.

```go
// BAD: Data race
var counter int

func increment() {
    for i := 0; i < 1000; i++ {
        counter++ // Race condition
    }
}

func main() {
    go increment()
    go increment()
    time.Sleep(time.Second)
    fmt.Println(counter) // Undefined result
}
```

**Fix: Use mutex or atomic**

```go
// GOOD: Mutex
var (
    counter int
    mu      sync.Mutex
)

func increment() {
    for i := 0; i < 1000; i++ {
        mu.Lock()
        counter++
        mu.Unlock()
    }
}

// BETTER: Atomic for simple counters
var counter atomic.Int64

func increment() {
    for i := 0; i < 1000; i++ {
        counter.Add(1)
    }
}
```

---

## Error Handling Anti-Patterns

### 1. Swallowing Errors

Ignoring errors hides bugs and makes debugging impossible.

```go
// BAD: Silently ignoring errors
result, _ := doSomething()
json.Unmarshal(data, &obj) // Error ignored!

file, _ := os.Open(path)
file.Read(buf) // file might be nil!
```

**Fix: Handle or explicitly acknowledge every error**

```go
// GOOD: Handle errors
result, err := doSomething()
if err != nil {
    return fmt.Errorf("doing something: %w", err)
}

// GOOD: If truly ignorable, document why
_ = writer.Close() // Error intentionally ignored: best-effort cleanup
```

### 2. Returning nil Instead of Error

Returning nil makes it impossible to distinguish success from failure.

```go
// BAD: Caller can't tell "not found" from "error"
func findUser(id int) *User {
    user, err := db.Query(id)
    if err != nil {
        return nil // Was it not found or a DB error?
    }
    return user
}
```

**Fix: Return explicit error**

```go
// GOOD: Explicit error types
var ErrNotFound = errors.New("user not found")

func findUser(id int) (*User, error) {
    user, err := db.Query(id)
    if errors.Is(err, sql.ErrNoRows) {
        return nil, ErrNotFound
    }
    if err != nil {
        return nil, fmt.Errorf("querying user %d: %w", id, err)
    }
    return user, nil
}
```

### 3. Panicking for Recoverable Errors

Panic is for unrecoverable errors, not input validation.

```go
// BAD: Panicking on user input
func parseConfig(data []byte) Config {
    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        panic(err) // Crashes the server on bad input!
    }
    return cfg
}
```

**Fix: Return error**

```go
// GOOD: Return error for recoverable issues
func parseConfig(data []byte) (Config, error) {
    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        return Config{}, fmt.Errorf("parsing config: %w", err)
    }
    return cfg, nil
}

// Panic is OK for programmer errors:
func MustParseConfig(data []byte) Config {
    cfg, err := parseConfig(data)
    if err != nil {
        panic(err) // Use Must* prefix to indicate panic
    }
    return cfg
}
```

### 4. Not Wrapping Errors with Context

Raw errors lose call stack context.

```go
// BAD: Lost context
func processFile(path string) error {
    data, err := os.ReadFile(path)
    if err != nil {
        return err // What file? What operation?
    }
    return parse(data)
}
```

**Fix: Wrap with context using %w**

```go
// GOOD: Add context
func processFile(path string) error {
    data, err := os.ReadFile(path)
    if err != nil {
        return fmt.Errorf("reading file %s: %w", path, err)
    }

    if err := parse(data); err != nil {
        return fmt.Errorf("parsing file %s: %w", path, err)
    }

    return nil
}

// Error message: "parsing file config.json: reading file config.json: open config.json: no such file"
```

### 5. Checking Error String Instead of Type

String comparison is fragile and breaks with message changes.

```go
// BAD: Fragile string comparison
if err.Error() == "connection refused" {
    // Breaks if error message changes
}

if strings.Contains(err.Error(), "timeout") {
    // Also fragile
}
```

**Fix: Use errors.Is or errors.As**

```go
// GOOD: Type-safe error checking
if errors.Is(err, context.DeadlineExceeded) {
    // Timeout
}

var netErr *net.OpError
if errors.As(err, &netErr) {
    fmt.Println("Network error:", netErr.Op)
}
```

### 6. Defer Before Error Check

Resource might not exist if error occurred.

```go
// BAD: Potential nil pointer dereference
func readFile(path string) ([]byte, error) {
    f, err := os.Open(path)
    defer f.Close() // f might be nil!
    if err != nil {
        return nil, err
    }
    return io.ReadAll(f)
}
```

**Fix: Defer after error check**

```go
// GOOD: Check error first
func readFile(path string) ([]byte, error) {
    f, err := os.Open(path)
    if err != nil {
        return nil, err
    }
    defer f.Close() // f is definitely not nil here

    return io.ReadAll(f)
}
```

---

## Interface Anti-Patterns

### 1. Exporting Functions with Unexported Return Types

Callers cannot use the returned type.

```go
// BAD: Unexported type in exported function
type handler struct {
    db *sql.DB
}

func NewHandler(db *sql.DB) *handler { // Returns unexported type!
    return &handler{db: db}
}

// Caller code:
h := pkg.NewHandler(db)
// h has type *pkg.handler which caller can't reference
```

**Fix: Export the type or return an interface**

```go
// GOOD: Export the type
type Handler struct {
    db *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
    return &Handler{db: db}
}

// OR return an interface
type Handler interface {
    ServeHTTP(w http.ResponseWriter, r *http.Request)
}

func NewHandler(db *sql.DB) Handler {
    return &handler{db: db}
}
```

### 2. Giant Interfaces

Large interfaces are hard to implement and mock.

```go
// BAD: Kitchen sink interface
type DataManager interface {
    Create(data []byte) (string, error)
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
    Compress(data []byte) ([]byte, error)
    // Testing requires mocking 12 methods!
}
```

**Fix: Small, focused interfaces**

```go
// GOOD: Interface segregation
type Reader interface {
    Read(id string) ([]byte, error)
}

type Writer interface {
    Create(data []byte) (string, error)
    Update(id string, data []byte) error
    Delete(id string) error
}

type Searcher interface {
    List() ([]string, error)
    Search(query string) ([]string, error)
}

// Compose when needed
type ReadWriter interface {
    Reader
    Writer
}

// Functions accept only what they need
func exportData(r Reader, ids []string) ([]byte, error) {
    // Only needs Read
}
```

### 3. Interface Pollution (Premature Abstraction)

Creating interfaces before you need them.

```go
// BAD: Interface with single implementation
type UserRepository interface {
    FindByID(id int) (*User, error)
    Save(u *User) error
}

type PostgresUserRepository struct {
    db *sql.DB
}

// Only one implementation exists - why the interface?
```

**Fix: Start with concrete types, abstract later**

```go
// GOOD: Start concrete
type UserRepository struct {
    db *sql.DB
}

func (r *UserRepository) FindByID(id int) (*User, error) { ... }
func (r *UserRepository) Save(u *User) error { ... }

// Add interface only when you have a second implementation
// or need it for testing
```

### 4. Returning Interfaces Instead of Concrete Types

Hides available functionality and makes extension harder.

```go
// BAD: Returns interface, hides concrete type
func NewService() Service {
    return &service{}
}

// Caller can't access methods not in Service interface
```

**Fix: Return concrete type, accept interfaces**

```go
// GOOD: Return concrete type
func NewService() *Service {
    return &Service{}
}

// Functions accept interfaces
func Process(s ServiceReader) error {
    // Accept minimal interface
}
```

---

## Memory and Performance Anti-Patterns

### 1. Slice Memory Leak (Backing Array Retention)

Slices retain reference to the original backing array.

```go
// BAD: Retains entire 1GB array
func getHeader(data []byte) []byte {
    return data[:100] // Still references original 1GB array!
}

func main() {
    bigData := make([]byte, 1<<30) // 1GB
    header := getHeader(bigData)
    bigData = nil // Won't be GC'd - header still references it!
    // header keeps 1GB alive for 100 bytes
}
```

**Fix: Copy to new slice**

```go
// GOOD: Copy to new slice
func getHeader(data []byte) []byte {
    header := make([]byte, 100)
    copy(header, data[:100])
    return header // Only 100 bytes, original can be GC'd
}

// OR use append trick
func getHeader(data []byte) []byte {
    return append([]byte{}, data[:100]...)
}
```

### 2. Map Memory Never Shrinks

Go maps don't release memory when keys are deleted.

```go
// BAD: Map holds memory forever
cache := make(map[string][]byte)

// Add 1 million entries
for i := 0; i < 1_000_000; i++ {
    cache[fmt.Sprintf("key%d", i)] = make([]byte, 1024)
}

// Delete all entries
for k := range cache {
    delete(cache, k)
}

// Memory is NOT released! Map buckets still allocated
```

**Fix: Recreate map or use sync.Pool**

```go
// GOOD: Recreate map periodically
if shouldCompact(cache) {
    newCache := make(map[string][]byte, len(cache))
    for k, v := range cache {
        newCache[k] = v
    }
    cache = newCache // Old map can be GC'd
}

// GOOD: Use clear() (Go 1.21+) and recreate if needed
clear(cache) // Doesn't release memory but resets entries
cache = make(map[string][]byte) // Releases memory
```

### 3. String Concatenation in Loops

String concatenation creates new strings each iteration.

```go
// BAD: O(n²) allocations
func join(parts []string) string {
    result := ""
    for _, p := range parts {
        result += p // New allocation each time!
    }
    return result
}
```

**Fix: Use strings.Builder**

```go
// GOOD: strings.Builder - O(n)
func join(parts []string) string {
    var sb strings.Builder
    for _, p := range parts {
        sb.WriteString(p)
    }
    return sb.String()
}

// BETTER: Use strings.Join for simple cases
result := strings.Join(parts, "")
```

### 4. Unnecessary Allocations

Not pre-allocating slices when size is known.

```go
// BAD: Multiple reallocations
func collect(n int) []int {
    var result []int // len=0, cap=0
    for i := 0; i < n; i++ {
        result = append(result, i) // Reallocates when cap exceeded
    }
    return result
}
```

**Fix: Pre-allocate**

```go
// GOOD: Pre-allocate with known size
func collect(n int) []int {
    result := make([]int, 0, n) // len=0, cap=n
    for i := 0; i < n; i++ {
        result = append(result, i) // No reallocation
    }
    return result
}

// BETTER: Direct assignment if indices known
func collect(n int) []int {
    result := make([]int, n)
    for i := 0; i < n; i++ {
        result[i] = i
    }
    return result
}
```

### 5. Excessive Pointer Usage

Using pointers for small structs increases GC pressure.

```go
// BAD: Pointer to small struct
type Point struct {
    X, Y int // 16 bytes
}

func process(points []*Point) { // Slice of pointers
    for _, p := range points {
        // Each Point is a separate heap allocation
        // GC must track each pointer
    }
}
```

**Fix: Use values for small structs**

```go
// GOOD: Value semantics for small structs
func process(points []Point) { // Slice of values
    for _, p := range points {
        // Contiguous memory, fewer allocations
        // Better cache locality
    }
}

// Rule of thumb: Use pointers when:
// - Struct is large (>64 bytes typically)
// - You need to modify the original
// - Struct is shared across goroutines
// - Implementing an interface with pointer receiver
```

### 6. Defer in Tight Loops

Deferred calls accumulate until function returns.

```go
// BAD: All defers stack up
func processFiles(paths []string) error {
    for _, path := range paths {
        f, err := os.Open(path)
        if err != nil {
            return err
        }
        defer f.Close() // Accumulates! 1000 files = 1000 defers
        // ... process
    }
    return nil
}
```

**Fix: Use helper function or explicit close**

```go
// GOOD: Helper function scopes the defer
func processFiles(paths []string) error {
    for _, path := range paths {
        if err := processFile(path); err != nil {
            return err
        }
    }
    return nil
}

func processFile(path string) error {
    f, err := os.Open(path)
    if err != nil {
        return err
    }
    defer f.Close() // Executes when this function returns
    // ... process
    return nil
}
```

---

## Package Design Anti-Patterns

### 1. Generic Package Names

Names like "util", "common", "helpers" don't convey purpose.

```go
// BAD: What does utils do?
package utils

func ParseJSON(data []byte) (any, error) { ... }
func FormatDate(t time.Time) string { ... }
func HashPassword(p string) string { ... }
func ValidateEmail(e string) bool { ... }
```

**Fix: Name by purpose, not implementation**

```go
// GOOD: Descriptive package names
package jsonutil   // jsonutil.Parse()
package timeformat // timeformat.Date()
package auth       // auth.HashPassword()
package validator  // validator.Email()
```

### 2. Circular Dependencies

Package A imports B, B imports A.

```go
// BAD: Circular dependency
// package user
import "myapp/order"

func (u *User) GetOrders() []order.Order { ... }

// package order
import "myapp/user"

func (o *Order) GetUser() *user.User { ... }
// Compile error!
```

**Fix: Extract shared interface or restructure**

```go
// GOOD: Extract interface to separate package
// package domain
type User interface { ... }
type Order interface { ... }

// package user
import "myapp/domain"
// Uses domain.Order interface

// package order
import "myapp/domain"
// Uses domain.User interface

// OR: Merge related packages
// package commerce
type User struct { ... }
type Order struct { ... }
```

### 3. Over-Exported API

Exporting internal implementation details.

```go
// BAD: Too much exported
package user

type User struct {
    ID            int
    Email         string
    PasswordHash  string    // Should be private!
    InternalState int       // Should be private!
}

func HashPassword(p string) string { ... }  // Internal utility
func ValidateHash(h, p string) bool { ... } // Internal utility
```

**Fix: Only export what clients need**

```go
// GOOD: Minimal public API
package user

type User struct {
    ID    int
    Email string
    passwordHash string // Unexported
}

func New(email, password string) (*User, error) { ... }
func (u *User) Authenticate(password string) bool { ... }

// Internal helpers are unexported
func hashPassword(p string) string { ... }
func validateHash(h, p string) bool { ... }
```

---

## Code Style Anti-Patterns

### 1. Unnecessary Nil Check Before len()

`len()` handles nil slices and maps.

```go
// BAD: Redundant nil check
if slice != nil && len(slice) > 0 {
    // ...
}

if m != nil && len(m) > 0 {
    // ...
}
```

**Fix: len() is sufficient**

```go
// GOOD: len(nil) == 0
if len(slice) > 0 {
    // ...
}

if len(m) > 0 {
    // ...
}
```

### 2. Redundant Break in Switch

Go doesn't fall through by default.

```go
// BAD: Unnecessary break
switch x {
case 1:
    doSomething()
    break // Redundant!
case 2:
    doOther()
    break // Redundant!
}
```

**Fix: Omit break**

```go
// GOOD: No break needed
switch x {
case 1:
    doSomething()
case 2:
    doOther()
}

// Use fallthrough when you want C-style behavior
switch x {
case 1:
    doSomething()
    fallthrough // Explicitly fall through
case 2:
    doOther()
}
```

### 3. Loop-Based Slice Concatenation

Appending element by element is inefficient.

```go
// BAD: Inefficient
func concat(slices [][]int) []int {
    var result []int
    for _, s := range slices {
        for _, v := range s {
            result = append(result, v)
        }
    }
    return result
}
```

**Fix: Use slices.Concat or variadic append**

```go
// GOOD: slices.Concat (Go 1.22+)
func concat(slices [][]int) []int {
    return slices.Concat(slices...)
}

// GOOD: Variadic append
func concat(slices [][]int) []int {
    var result []int
    for _, s := range slices {
        result = append(result, s...) // Append entire slice
    }
    return result
}

// BETTER: Pre-allocate
func concat(slices [][]int) []int {
    total := 0
    for _, s := range slices {
        total += len(s)
    }
    result := make([]int, 0, total)
    for _, s := range slices {
        result = append(result, s...)
    }
    return result
}
```

### 4. Named Return Value Abuse

Named returns in complex functions cause confusion.

```go
// BAD: Confusing in long functions
func process(data []byte) (result Result, count int, err error) {
    // 100 lines of code
    if something {
        result.Value = x
        return // What's being returned?
    }
    // More code...
    count = n
    return // Still confusing
}
```

**Fix: Explicit returns or short functions**

```go
// GOOD: Explicit returns
func process(data []byte) (Result, int, error) {
    // ...
    if something {
        return Result{Value: x}, 0, nil
    }
    // ...
    return result, count, nil
}

// Named returns OK for short functions (documentation)
func divide(a, b float64) (quotient float64, err error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}
```

### 5. Using init() for Complex Initialization

Complex init() makes testing and debugging difficult.

```go
// BAD: Complex init()
var db *sql.DB
var cache *redis.Client
var config Config

func init() {
    var err error
    config = loadConfig() // What if this fails?

    db, err = sql.Open("postgres", config.DBURL)
    if err != nil {
        panic(err) // Hard to test
    }

    cache = redis.NewClient(&redis.Options{
        Addr: config.RedisURL,
    })
}
```

**Fix: Explicit initialization**

```go
// GOOD: Explicit initialization functions
type App struct {
    DB     *sql.DB
    Cache  *redis.Client
    Config Config
}

func NewApp(configPath string) (*App, error) {
    config, err := loadConfig(configPath)
    if err != nil {
        return nil, fmt.Errorf("loading config: %w", err)
    }

    db, err := sql.Open("postgres", config.DBURL)
    if err != nil {
        return nil, fmt.Errorf("connecting to database: %w", err)
    }

    cache := redis.NewClient(&redis.Options{
        Addr: config.RedisURL,
    })

    return &App{DB: db, Cache: cache, Config: config}, nil
}

// init() OK for simple registration
func init() {
    sql.Register("mydriver", &MyDriver{})
}
```

### 6. Overuse of Blank Identifier

Using `_` to ignore values you should check.

```go
// BAD: Ignoring important values
for _, _ = range items { // Why not len(items)?
    count++
}

result, _ := compute() // Ignoring error
_ = json.Unmarshal(data, &obj) // Ignoring error
```

**Fix: Handle or use simpler constructs**

```go
// GOOD: Simpler alternatives
count := len(items)

// GOOD: Handle errors
result, err := compute()
if err != nil {
    return err
}

// OK: Explicitly acknowledging ignored error
_ = file.Close() // Best-effort cleanup (commented)
```

---

## Testing Anti-Patterns

### 1. Testing Implementation Details

Testing private methods or internal state.

```go
// BAD: Testing private method via reflection
func TestPrivateHelper(t *testing.T) {
    obj := &MyType{}
    method := reflect.ValueOf(obj).MethodByName("privateHelper")
    // Breaks when implementation changes
}

// BAD: Testing internal state
func TestProcessor(t *testing.T) {
    p := &Processor{}
    p.Process(data)
    if p.internalCounter != 5 { // Coupling to implementation
        t.Error("wrong counter")
    }
}
```

**Fix: Test public behavior**

```go
// GOOD: Test observable behavior
func TestProcessor(t *testing.T) {
    p := &Processor{}
    result := p.Process(data)

    if result.Count != 5 { // Test output, not internals
        t.Errorf("got count %d, want 5", result.Count)
    }
}
```

### 2. Flaky Concurrent Tests

Tests that depend on timing or goroutine ordering.

```go
// BAD: Flaky - depends on timing
func TestConcurrent(t *testing.T) {
    go producer()
    time.Sleep(100 * time.Millisecond) // Hope it's done
    if result != expected {
        t.Error("wrong result")
    }
}
```

**Fix: Use proper synchronization**

```go
// GOOD: Proper synchronization
func TestConcurrent(t *testing.T) {
    done := make(chan struct{})
    go func() {
        producer()
        close(done)
    }()

    select {
    case <-done:
        // Continue
    case <-time.After(5 * time.Second):
        t.Fatal("timeout")
    }

    if result != expected {
        t.Error("wrong result")
    }
}
```

### 3. Not Using Table-Driven Tests

Repetitive test cases.

```go
// BAD: Repetitive
func TestAdd(t *testing.T) {
    if Add(1, 2) != 3 {
        t.Error("1+2 should be 3")
    }
    if Add(0, 0) != 0 {
        t.Error("0+0 should be 0")
    }
    if Add(-1, 1) != 0 {
        t.Error("-1+1 should be 0")
    }
    // ... many more
}
```

**Fix: Table-driven tests**

```go
// GOOD: Table-driven
func TestAdd(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"positive", 1, 2, 3},
        {"zeros", 0, 0, 0},
        {"negative", -1, 1, 0},
        {"large", 1000000, 1000000, 2000000},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := Add(tt.a, tt.b)
            if got != tt.expected {
                t.Errorf("Add(%d, %d) = %d, want %d",
                    tt.a, tt.b, got, tt.expected)
            }
        })
    }
}
```

### 4. Ignoring Race Detector

Not running tests with race detection.

```go
// Running tests without -race misses data races
// go test ./...  // BAD
```

**Fix: Always use race detector in CI**

```bash
# GOOD: Run with race detector
go test -race ./...

# In CI pipeline
- name: Test
  run: go test -race -coverprofile=coverage.out ./...
```

---

## Detection Tools

### go vet

Built-in static analyzer catches common mistakes.

```bash
go vet ./...
```

Catches:
- Printf format mismatches
- Unreachable code
- Mutex copying
- Invalid struct tags

### staticcheck

More comprehensive than go vet.

```bash
# Install
go install honnef.co/go/tools/cmd/staticcheck@latest

# Run
staticcheck ./...
```

### golangci-lint

Meta-linter combining many tools.

```bash
# Install
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Run
golangci-lint run
```

**Recommended configuration (`.golangci.yml`):**

```yaml
run:
  timeout: 5m
  go: "1.21"

linters:
  enable:
    # Default
    - errcheck      # Check error returns
    - gosimple      # Simplify code
    - govet         # Suspicious constructs
    - ineffassign   # Unused assignments
    - staticcheck   # Static analysis
    - unused        # Unused code

    # Additional
    - gocritic      # Opinionated checks
    - gofmt         # Format checking
    - goimports     # Import organization
    - misspell      # Spelling
    - unconvert     # Unnecessary conversions
    - bodyclose     # HTTP body close
    - nilerr        # nil error returns
    - rowserrcheck  # sql.Rows.Err check
    - sqlclosecheck # sql.Rows/Stmt close
    - errname       # Error naming convention

linters-settings:
  gocritic:
    enabled-tags:
      - diagnostic
      - style
      - performance

issues:
  exclude-rules:
    - path: _test\.go
      linters:
        - errcheck
```

### Race Detector

Finds data races at runtime.

```bash
# Run tests with race detector
go test -race ./...

# Run application with race detector
go run -race main.go
```

### Profile Memory Leaks

```bash
# Run with memory profiling
go test -memprofile=mem.out ./...

# Analyze
go tool pprof mem.out
```

---

## Quick Reference

### Anti-Pattern Detection Checklist

| Anti-Pattern | Detection | Fix |
|--------------|-----------|-----|
| Goroutine leak | pprof, leaktest | Context cancellation, buffered channels |
| Data race | `-race` flag | Mutex, atomic, channels |
| Error swallowing | errcheck linter | Handle all errors |
| Giant interface | Review (>5 methods) | Split into smaller interfaces |
| Mutex copying | go vet | Pointer receivers |
| Slice memory leak | Code review | Copy needed data |
| Map memory leak | Monitor memory | Recreate map |
| String concat loop | staticcheck | strings.Builder |

### Quick Fixes

```go
// Goroutine leak → Buffered channel
ch := make(chan int, 1) // Not: make(chan int)

// Data race → Atomic
var counter atomic.Int64
counter.Add(1) // Not: counter++

// Error handling → Wrap with context
return fmt.Errorf("doing X: %w", err) // Not: return err

// Slice memory → Copy
return append([]byte{}, data[:n]...) // Not: return data[:n]

// String concat → Builder
var sb strings.Builder
sb.WriteString(s) // Not: result += s
```

### Code Review Checklist

- [ ] No unbounded goroutine spawning
- [ ] All errors handled or explicitly ignored with comment
- [ ] No mutex in value receivers
- [ ] Interfaces have ≤5 methods
- [ ] No generic package names (util, common)
- [ ] Pre-allocate slices when size known
- [ ] strings.Builder for loop concatenation
- [ ] Tests use `-race` flag
- [ ] Table-driven tests for multiple cases

---

## Resources

- [Go Code Review Comments](https://go.dev/wiki/CodeReviewComments) — Official style guide
- [Effective Go](https://go.dev/doc/effective_go) — Best practices
- [golangci-lint](https://golangci-lint.run/) — Meta-linter
- [Go Race Detector](https://go.dev/doc/articles/race_detector) — Finding races

---

**Previous**: [11-design-patterns-behavioral.md](11-design-patterns-behavioral.md) — Behavioral Design Patterns
