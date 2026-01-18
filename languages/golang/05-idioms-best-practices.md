# Go Idioms and Best Practices

> Write code that experienced Go developers will recognize and respect

This guide covers the conventions and idioms that make Go code clean, efficient, and maintainable. Following these practices will impress interviewers and make your code production-ready.

---

## Table of Contents

1. [Naming Conventions](#naming-conventions)
2. [Error Handling](#error-handling)
3. [Interface Design](#interface-design)
4. [Memory Management](#memory-management)
5. [Testing](#testing)
6. [Structured Logging](#structured-logging)
7. [Modern Tooling](#modern-tooling)
8. [Common Pitfalls](#common-pitfalls)
9. [Go Proverbs](#go-proverbs)
10. [Interview Code Style](#interview-code-style)

---

## Naming Conventions

### Variable Names

```go
// Short names for local scope
for i := 0; i < len(arr); i++ { }
for _, v := range items { }

// Descriptive names for larger scope
userCount := len(users)
maxRetryAttempts := 3

// Acronyms: all caps or all lowercase
httpClient := &http.Client{}  // or HTTPClient
userID := 123                  // not userId

// Receivers: short, consistent
func (s *Server) Start() { }   // not (server *Server)
func (s *Server) Stop() { }    // same receiver name

// Don't repeat package name
// Good
user.New()
// Bad
user.NewUser()
```

### Exported vs Unexported

```go
// Exported (public): PascalCase
type User struct {
    Name string   // Exported field
    age  int      // Unexported field
}

func ProcessData() { }  // Exported function

// Unexported (private): camelCase
type internalCache struct { }
func helperFunction() { }
```

### Interface Names

```go
// Single-method interfaces: verb + "er"
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Stringer interface {
    String() string
}

type Closer interface {
    Close() error
}

// Multi-method interfaces: descriptive noun
type ReadWriteCloser interface {
    Reader
    Writer
    Closer
}
```

---

## Error Handling

### The Basic Pattern

```go
// Always check errors
result, err := doSomething()
if err != nil {
    return err  // or handle appropriately
}
// use result

// Don't do this
result, _ := doSomething()  // Ignoring errors is almost always wrong
```

### Creating Errors

```go
import (
    "errors"
    "fmt"
)

// Simple error
var ErrNotFound = errors.New("item not found")

// Formatted error
func process(id int) error {
    return fmt.Errorf("failed to process item %d", id)
}

// Wrapped error (preserves original)
func readConfig(path string) error {
    data, err := os.ReadFile(path)
    if err != nil {
        return fmt.Errorf("reading config %s: %w", path, err)
    }
    // ...
}
```

### Checking Errors

```go
// Check for specific error
if errors.Is(err, os.ErrNotExist) {
    // file doesn't exist
}

// Check for error type
var pathErr *os.PathError
if errors.As(err, &pathErr) {
    fmt.Println("Path:", pathErr.Path)
}
```

### Custom Error Types

```go
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed on %s: %s", e.Field, e.Message)
}

func validate(data Data) error {
    if data.Email == "" {
        return &ValidationError{Field: "email", Message: "required"}
    }
    return nil
}
```

### Error Handling Patterns

```go
// 1. Early return (preferred)
func process(data Data) error {
    if err := validate(data); err != nil {
        return err
    }
    if err := save(data); err != nil {
        return err
    }
    if err := notify(data); err != nil {
        return err
    }
    return nil
}

// 2. Error variable for cleanup
func processFile(path string) (err error) {
    f, err := os.Open(path)
    if err != nil {
        return err
    }
    defer func() {
        if cerr := f.Close(); cerr != nil && err == nil {
            err = cerr
        }
    }()
    // process file...
    return nil
}
```

---

## Interface Design

### Accept Interfaces, Return Structs

```go
// Good: Accept interface
func Process(r io.Reader) error {
    data, err := io.ReadAll(r)
    // ...
}

// Good: Return concrete type
func NewServer(config Config) *Server {
    return &Server{config: config}
}

// This allows:
Process(os.Stdin)           // *os.File implements io.Reader
Process(bytes.NewReader(b)) // *bytes.Reader implements io.Reader
Process(strings.NewReader(s))
```

### Small Interfaces

```go
// Go's philosophy: many small interfaces

// Good: Single responsibility
type Closer interface {
    Close() error
}

// Compose when needed
type ReadCloser interface {
    Reader
    Closer
}

// Bad: Kitchen sink interface
type DataProcessor interface {
    Read(p []byte) (n int, err error)
    Write(p []byte) (n int, err error)
    Close() error
    Process() error
    Validate() error
    // ... too many methods
}
```

### Interface Satisfaction Check

```go
// Compile-time check that type implements interface
var _ io.Reader = (*MyReader)(nil)
var _ fmt.Stringer = MyType{}

// If MyReader doesn't implement io.Reader, compilation fails
```

### Empty Interface Usage

```go
// Use any (Go 1.18+) instead of interface{}
func Print(v any) {
    fmt.Println(v)
}

// Type switch for handling multiple types
func describe(v any) string {
    switch val := v.(type) {
    case int:
        return fmt.Sprintf("integer: %d", val)
    case string:
        return fmt.Sprintf("string: %s", val)
    default:
        return fmt.Sprintf("unknown: %v", val)
    }
}
```

---

## Memory Management

### Slice Capacity

```go
// Pre-allocate when size is known
items := make([]Item, 0, 1000)

// Avoid: Causes multiple reallocations
var items []Item
for i := 0; i < 1000; i++ {
    items = append(items, Item{})
}

// Good: Single allocation
items := make([]Item, 0, 1000)
for i := 0; i < 1000; i++ {
    items = append(items, Item{})
}
```

### Slice Memory Leak

```go
// Problem: Slice keeps reference to large underlying array
func getPrefix(s []byte) []byte {
    return s[:10]  // Still references original large array!
}

// Solution: Copy to new slice
func getPrefix(s []byte) []byte {
    prefix := make([]byte, 10)
    copy(prefix, s[:10])
    return prefix
}
```

### Map Memory

```go
// Maps don't shrink automatically
// If you delete many keys, consider creating a new map

// Clear map (Go 1.21+)
clear(m)

// Or create new map
m = make(map[string]int)
```

### String vs []byte

```go
// Strings are immutable
s := "hello"
// s[0] = 'H'  // Error!

// Convert to []byte for modification
b := []byte(s)
b[0] = 'H'
s = string(b)

// Efficient string building
var sb strings.Builder
for i := 0; i < 1000; i++ {
    sb.WriteString("hello")
}
result := sb.String()
```

### Defer in Loops

```go
// Problem: Defers accumulate until function returns
func processFiles(paths []string) error {
    for _, path := range paths {
        f, err := os.Open(path)
        if err != nil {
            return err
        }
        defer f.Close()  // All close at function end!
        // process...
    }
    return nil
}

// Solution: Wrap in function
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
    defer f.Close()
    // process...
    return nil
}
```

---

## Testing

### Basic Test

```go
// file: math_test.go
package math

import "testing"

func TestAdd(t *testing.T) {
    result := Add(2, 3)
    if result != 5 {
        t.Errorf("Add(2, 3) = %d; want 5", result)
    }
}
```

### Table-Driven Tests

```go
func TestAdd(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"positive", 2, 3, 5},
        {"negative", -1, -2, -3},
        {"zero", 0, 0, 0},
        {"mixed", -1, 5, 4},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := Add(tt.a, tt.b)
            if result != tt.expected {
                t.Errorf("Add(%d, %d) = %d; want %d",
                    tt.a, tt.b, result, tt.expected)
            }
        })
    }
}
```

### Benchmarks

```go
// Traditional benchmark (works in all versions)
func BenchmarkAdd(b *testing.B) {
    for i := 0; i < b.N; i++ {
        Add(100, 200)
    }
}

// Go 1.24+: Use b.Loop() for cleaner benchmarks
func BenchmarkAddLoop(b *testing.B) {
    for b.Loop() {
        Add(100, 200)
    }
}

// b.Loop() is preferred because:
// - More readable
// - Compiler optimizations work better
// - Handles benchmark setup/teardown correctly

// Run: go test -bench=.
```

### Fuzz Testing (Go 1.18+)

Fuzz testing automatically generates test inputs to find edge cases:

```go
// file: parse_test.go
func FuzzParseInt(f *testing.F) {
    // Seed corpus with initial values
    f.Add("123")
    f.Add("-456")
    f.Add("0")
    f.Add("")

    // Fuzz function receives generated inputs
    f.Fuzz(func(t *testing.T, input string) {
        n, err := strconv.Atoi(input)
        if err != nil {
            return  // Invalid input is expected
        }

        // Round-trip test: parse and format should match
        s := strconv.Itoa(n)
        n2, err := strconv.Atoi(s)
        if err != nil {
            t.Errorf("failed to parse formatted int: %v", err)
        }
        if n != n2 {
            t.Errorf("round trip failed: %d != %d", n, n2)
        }
    })
}

// Run fuzz tests:
// go test -fuzz=FuzzParseInt -fuzztime=30s

// Fuzz test for JSON parsing
func FuzzJSON(f *testing.F) {
    f.Add([]byte(`{"name": "test"}`))
    f.Add([]byte(`[]`))
    f.Add([]byte(`null`))

    f.Fuzz(func(t *testing.T, data []byte) {
        var v interface{}
        if err := json.Unmarshal(data, &v); err != nil {
            return  // Invalid JSON
        }

        // Marshal should succeed for valid JSON
        _, err := json.Marshal(v)
        if err != nil {
            t.Errorf("marshal failed: %v", err)
        }
    })
}
```

### Test Helpers

```go
func TestSomething(t *testing.T) {
    // Helper function
    assertEqual := func(t *testing.T, got, want int) {
        t.Helper()  // Marks as helper (better error locations)
        if got != want {
            t.Errorf("got %d; want %d", got, want)
        }
    }

    assertEqual(t, Add(1, 2), 3)
}
```

---

## Structured Logging

### log/slog (Go 1.21+)

The `log/slog` package provides structured, leveled logging:

```go
import "log/slog"

// Basic usage
slog.Info("user logged in", "user_id", 123, "ip", "192.168.1.1")
// Output: time=2025-01-15T10:00:00Z level=INFO msg="user logged in" user_id=123 ip=192.168.1.1

slog.Warn("slow query", "duration_ms", 1500, "query", "SELECT *...")
slog.Error("request failed", "error", err, "status", 500)

// Debug (only logged if level allows)
slog.Debug("cache hit", "key", "user:123")
```

### Configuring slog

```go
import (
    "log/slog"
    "os"
)

// JSON handler for production
jsonHandler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
    Level: slog.LevelInfo,
})
logger := slog.New(jsonHandler)
slog.SetDefault(logger)

// Output: {"time":"2025-01-15T10:00:00Z","level":"INFO","msg":"started"}

// Text handler for development
textHandler := slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{
    Level: slog.LevelDebug,
    AddSource: true,  // Include file:line
})
```

### Contextual Logging

```go
// Create child logger with common attributes
requestLogger := slog.With(
    "request_id", requestID,
    "user_id", userID,
)

requestLogger.Info("processing order", "order_id", orderID)
// All logs include request_id and user_id

// Group related attributes
slog.Info("request",
    slog.Group("http",
        slog.String("method", "POST"),
        slog.String("path", "/api/orders"),
    ),
    slog.Group("response",
        slog.Int("status", 201),
        slog.Duration("latency", latency),
    ),
)
```

### Best Practices

```go
// Use typed attributes for compile-time safety
slog.Info("event",
    slog.String("action", "created"),
    slog.Int("count", 42),
    slog.Duration("elapsed", time.Second),
    slog.Time("timestamp", time.Now()),
    slog.Any("data", complexObject),
)

// Log errors with context
if err := process(); err != nil {
    slog.Error("processing failed",
        "error", err,
        "input", input,
        "retries", retryCount,
    )
}

// Add logger to context for request tracing
type ctxKey struct{}

func WithLogger(ctx context.Context, logger *slog.Logger) context.Context {
    return context.WithValue(ctx, ctxKey{}, logger)
}

func LoggerFromContext(ctx context.Context) *slog.Logger {
    if logger, ok := ctx.Value(ctxKey{}).(*slog.Logger); ok {
        return logger
    }
    return slog.Default()
}
```

---

## Modern Tooling

### go.mod Tool Directive (Go 1.24+)

Manage development tools as module dependencies:

```go
// go.mod
module myproject

go 1.24

tool (
    golang.org/x/tools/cmd/stringer
    github.com/golangci/golangci-lint/cmd/golangci-lint
    github.com/air-verse/air
)
```

```bash
# Install tools defined in go.mod
go install tool

# Run a specific tool
go tool stringer -type=Status ./...
go tool golangci-lint run

# Add a new tool
go get -tool github.com/cosmtrek/air@latest
```

### golangci-lint Configuration

Create `.golangci.yml` for comprehensive linting:

```yaml
# .golangci.yml
run:
  timeout: 5m
  go: "1.25"

linters:
  enable:
    - errcheck       # Check error returns
    - gosimple       # Simplify code
    - govet          # Suspicious constructs
    - ineffassign    # Unused assignments
    - staticcheck    # Static analysis
    - unused         # Unused code
    - gofmt          # Format checking
    - goimports      # Import organization
    - misspell       # Spelling errors
    - unconvert      # Unnecessary conversions
    - gocritic       # Opinionated linter
    - revive         # Extensible linter
    - errname        # Error naming convention
    - errorlint      # Error handling patterns

linters-settings:
  govet:
    enable-all: true
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

```bash
# Run linter
golangci-lint run

# Run with fixes
golangci-lint run --fix

# Run specific linters
golangci-lint run --enable=gocritic,revive
```

### JSON Tags and omitzero (Go 1.24+)

```go
type Response struct {
    ID        int       `json:"id"`
    Name      string    `json:"name"`
    Count     int       `json:"count,omitempty"`   // Omit if zero value
    Score     float64   `json:"score,omitzero"`    // Go 1.24+: Same as omitempty for numbers
    CreatedAt time.Time `json:"created_at,omitzero"` // Omit zero time
    Data      []byte    `json:"data,omitempty"`
}

// With omitzero, zero-valued fields are omitted from JSON output
r := Response{ID: 1, Name: "test"}
// Output: {"id":1,"name":"test"}
```

### Development Workflow

```bash
# Format code
go fmt ./...
# Or with imports organization
goimports -w .

# Vet code for suspicious constructs
go vet ./...

# Run tests with coverage
go test -race -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# Build with version info
go build -ldflags="-X main.version=1.0.0" ./cmd/app

# Generate code
go generate ./...
```

### Profiling

```go
import (
    "net/http"
    _ "net/http/pprof"
    "runtime"
)

func main() {
    // Enable profiling endpoint
    go func() {
        http.ListenAndServe("localhost:6060", nil)
    }()

    // Your application...
}
```

```bash
# CPU profile
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30

# Memory profile
go tool pprof http://localhost:6060/debug/pprof/heap

# Goroutine profile
go tool pprof http://localhost:6060/debug/pprof/goroutine

# Block profile (contention)
go tool pprof http://localhost:6060/debug/pprof/block
```

---

## Common Pitfalls

### 1. Nil Slice vs Empty Slice

```go
var s1 []int     // nil slice: s1 == nil
s2 := []int{}    // empty slice: s2 != nil
s3 := make([]int, 0)  // empty slice: s3 != nil

// All have len() == 0 and work with append
// But JSON marshaling differs:
// nil slice  -> null
// empty slice -> []
```

### 2. Map Nil Check

```go
var m map[string]int  // nil map

// Reading from nil map is OK
v := m["key"]  // v = 0 (zero value)

// Writing to nil map panics!
m["key"] = 1  // panic!

// Always initialize
m = make(map[string]int)
m["key"] = 1  // OK
```

### 3. Range Loop Variable

```go
// Pre Go 1.22: Variable is reused
nums := []int{1, 2, 3}
var funcs []func()

for _, n := range nums {
    funcs = append(funcs, func() {
        fmt.Println(n)  // All print 3!
    })
}

// Fix: Create new variable
for _, n := range nums {
    n := n  // Shadow the loop variable
    funcs = append(funcs, func() {
        fmt.Println(n)  // Prints 1, 2, 3
    })
}

// Go 1.22+: Fixed - each iteration gets its own variable
```

### 4. Append Gotcha

```go
a := []int{1, 2, 3, 4, 5}
b := a[1:3]  // [2, 3], shares underlying array with a

b = append(b, 100)  // Modifies a!
fmt.Println(a)  // [1 2 3 100 5]

// Fix: Use full slice expression
b := a[1:3:3]  // len=2, cap=2, forces new allocation on append
```

### 5. Interface Nil Check

```go
type MyError struct{}
func (e *MyError) Error() string { return "error" }

func returnsError() error {
    var e *MyError = nil
    return e  // Returns non-nil interface!
}

err := returnsError()
if err != nil {
    fmt.Println("not nil!")  // This prints!
}

// Fix: Return nil directly
func returnsError() error {
    var e *MyError = nil
    if e == nil {
        return nil  // Return nil interface
    }
    return e
}
```

### 6. Struct Comparison

```go
// Structs with comparable fields can use ==
type Point struct{ X, Y int }
p1, p2 := Point{1, 2}, Point{1, 2}
fmt.Println(p1 == p2)  // true

// Structs with slices/maps cannot
type Data struct {
    Values []int
}
d1, d2 := Data{[]int{1}}, Data{[]int{1}}
// fmt.Println(d1 == d2)  // Compile error!

// Use reflect.DeepEqual (slow) or custom comparison
```

---

## Go Proverbs

These are guiding principles from Rob Pike:

1. **Don't communicate by sharing memory; share memory by communicating.**
   - Use channels instead of shared state with mutexes when possible.

2. **Concurrency is not parallelism.**
   - Concurrency is about structure; parallelism is about execution.

3. **Channels orchestrate; mutexes serialize.**
   - Channels for coordination, mutexes for protecting state.

4. **The bigger the interface, the weaker the abstraction.**
   - Keep interfaces small and focused.

5. **Make the zero value useful.**
   - Design types so their zero value is valid and useful.

6. **interface{} says nothing.**
   - Avoid empty interface when you can be more specific.

7. **Gofmt's style is no one's favorite, yet gofmt is everyone's favorite.**
   - Consistent formatting trumps personal preference.

8. **A little copying is better than a little dependency.**
   - Don't import a library for one small function.

9. **Clear is better than clever.**
   - Write obvious code over clever code.

10. **Errors are values.**
    - Handle errors as first-class values, not exceptions.

---

## Interview Code Style

### Structure Your Solution

```go
func solve(nums []int, target int) []int {
    // 1. Handle edge cases
    if len(nums) == 0 {
        return nil
    }

    // 2. Initialize data structures
    seen := make(map[int]int)

    // 3. Main logic
    for i, num := range nums {
        if j, exists := seen[target-num]; exists {
            return []int{j, i}
        }
        seen[num] = i
    }

    // 4. Return result
    return nil
}
```

### Comment Your Approach

```go
func maxProfit(prices []int) int {
    // Strategy: Track minimum price seen so far
    // For each price, calculate potential profit
    // Time: O(n), Space: O(1)

    if len(prices) == 0 {
        return 0
    }

    minPrice := prices[0]
    maxProfit := 0

    for _, price := range prices {
        minPrice = min(minPrice, price)
        maxProfit = max(maxProfit, price-minPrice)
    }

    return maxProfit
}
```

### Use Helper Functions

```go
func solve(matrix [][]int) int {
    rows, cols := len(matrix), len(matrix[0])

    // Helper: Check bounds
    inBounds := func(r, c int) bool {
        return r >= 0 && r < rows && c >= 0 && c < cols
    }

    // Helper: Get neighbors
    neighbors := func(r, c int) [][2]int {
        dirs := [][2]int{{0, 1}, {0, -1}, {1, 0}, {-1, 0}}
        result := make([][2]int, 0, 4)
        for _, d := range dirs {
            nr, nc := r+d[0], c+d[1]
            if inBounds(nr, nc) {
                result = append(result, [2]int{nr, nc})
            }
        }
        return result
    }

    // Main logic using helpers...
}
```

### State Your Complexity

```go
// twoSum finds two numbers that add up to target
// Time: O(n) - single pass through array
// Space: O(n) - hash map storing at most n elements
func twoSum(nums []int, target int) []int {
    // implementation
}
```

---

## Quick Reference

### Do's

- Handle all errors
- Use `gofmt` (or `goimports`)
- Write table-driven tests
- Keep functions short
- Use meaningful names
- Document exported functions
- Check nil before using pointers/maps

### Don'ts

- Ignore errors with `_`
- Use `panic` for normal errors
- Return `interface{}` when you can be specific
- Use global variables
- Write clever code over clear code
- Create massive interfaces

### Code Review Checklist

- [ ] All errors handled
- [ ] No data races (run `go test -race`)
- [ ] Resources properly closed (files, connections)
- [ ] No nil pointer dereferences
- [ ] Slices pre-allocated when size known
- [ ] Tests written and passing
- [ ] Code formatted with `gofmt`

---

## Resources

### Essential Reading

- [Effective Go](https://go.dev/doc/effective_go) — Official guide
- [Go Code Review Comments](https://go.dev/wiki/CodeReviewComments) — Style guide
- [Google Go Style Guide](https://google.github.io/styleguide/go/) — Production standards

### Tools

```bash
# Format code
gofmt -w .
goimports -w .

# Lint code
golangci-lint run

# Find race conditions
go test -race ./...

# Profile performance
go test -bench=. -cpuprofile=cpu.out
go tool pprof cpu.out
```

---

<p align="center">
<i>"Simplicity is the ultimate sophistication."</i><br>
— Leonardo da Vinci (and Go's design philosophy)
</p>
