# Go Concurrency Patterns

> Goroutines, channels, and the patterns that make Go shine

Concurrency is Go's superpower. This guide covers the essential patterns you need for interviews and real-world applications.

---

## Table of Contents

1. [Goroutines](#goroutines)
2. [Channels](#channels)
3. [Select Statement](#select-statement)
4. [Sync Package](#sync-package)
5. [Common Patterns](#common-patterns)
6. [Context Package](#context-package)
7. [Race Conditions](#race-conditions)
8. [Modern Concurrency (Go 1.24+)](#modern-concurrency-go-124)

---

## Goroutines

Goroutines are lightweight threads managed by the Go runtime. They start with ~2KB of stack (vs ~1MB for OS threads).

### Starting Goroutines

```go
// Anonymous function
go func() {
    fmt.Println("Hello from goroutine")
}()

// Named function
go processItem(item)

// Method call
go obj.Method()

// IMPORTANT: Main function won't wait for goroutines
func main() {
    go fmt.Println("might not print!")
    // Program exits immediately
}
```

### Waiting for Goroutines

```go
import "sync"

func main() {
    var wg sync.WaitGroup

    for i := 0; i < 5; i++ {
        wg.Add(1)  // Increment before goroutine

        go func(id int) {
            defer wg.Done()  // Decrement when done
            fmt.Println("Worker", id)
        }(i)  // Pass i as argument to avoid closure issue!
    }

    wg.Wait()  // Block until counter reaches 0
    fmt.Println("All workers done")
}
```

### WaitGroup.Go() (Go 1.25+)

Go 1.25 introduced `WaitGroup.Go()` for cleaner goroutine management:

```go
import "sync"

func main() {
    var wg sync.WaitGroup

    for i := 0; i < 5; i++ {
        id := i
        wg.Go(func() {
            // No Add(1) or Done() needed!
            fmt.Println("Worker", id)
        })
    }

    wg.Wait()
    fmt.Println("All workers done")
}
```

### Closure Gotcha

```go
// WRONG: All goroutines see the same i
for i := 0; i < 5; i++ {
    go func() {
        fmt.Println(i)  // Likely prints 5, 5, 5, 5, 5
    }()
}

// CORRECT: Pass as parameter
for i := 0; i < 5; i++ {
    go func(n int) {
        fmt.Println(n)  // Prints 0, 1, 2, 3, 4 (in some order)
    }(i)
}

// CORRECT (Go 1.22+): Loop variables are per-iteration
// for i := 0; i < 5; i++ {
//     go func() { fmt.Println(i) }()  // Works correctly
// }
```

---

## Channels

Channels are typed conduits for communication between goroutines.

### Creating Channels

```go
// Unbuffered channel (synchronous)
ch := make(chan int)

// Buffered channel (asynchronous up to capacity)
ch := make(chan int, 10)  // buffer size 10

// Directional channels (for function signatures)
func send(ch chan<- int) { ch <- 42 }      // send-only
func receive(ch <-chan int) { x := <-ch }  // receive-only
```

### Channel Operations

```go
// Send (blocks if buffer full or no receiver)
ch <- value

// Receive (blocks if buffer empty or no sender)
value := <-ch

// Receive with ok (check if channel closed)
value, ok := <-ch
if !ok {
    // channel is closed and empty
}

// Close channel (only sender should close)
close(ch)

// Range over channel (until closed)
for value := range ch {
    fmt.Println(value)
}
```

### Buffered vs Unbuffered

```go
// Unbuffered: Sender blocks until receiver is ready
ch := make(chan int)
go func() {
    ch <- 42  // Blocks until main receives
}()
fmt.Println(<-ch)

// Buffered: Sender only blocks when buffer is full
ch := make(chan int, 2)
ch <- 1  // Doesn't block
ch <- 2  // Doesn't block
ch <- 3  // Would block (buffer full)
```

### Channel Patterns

```go
// 1. Done channel (signaling completion)
done := make(chan struct{})
go func() {
    // do work
    close(done)  // Signal completion
}()
<-done  // Wait for signal

// 2. Return channel (get result from goroutine)
func compute() <-chan int {
    ch := make(chan int)
    go func() {
        // expensive computation
        ch <- result
    }()
    return ch
}
result := <-compute()

// 3. Timeout pattern
select {
case result := <-ch:
    fmt.Println(result)
case <-time.After(1 * time.Second):
    fmt.Println("timeout")
}
```

---

## Select Statement

Select lets you wait on multiple channel operations.

### Basic Select

```go
select {
case msg := <-ch1:
    fmt.Println("Received from ch1:", msg)
case msg := <-ch2:
    fmt.Println("Received from ch2:", msg)
case ch3 <- value:
    fmt.Println("Sent to ch3")
default:
    fmt.Println("No channel ready")
}
```

### Select Patterns

```go
// 1. Non-blocking receive
select {
case msg := <-ch:
    fmt.Println(msg)
default:
    fmt.Println("no message available")
}

// 2. Non-blocking send
select {
case ch <- msg:
    fmt.Println("sent")
default:
    fmt.Println("channel full, dropping")
}

// 3. Timeout
select {
case res := <-ch:
    return res
case <-time.After(time.Second):
    return errors.New("timeout")
}

// 4. Cancellation with context
select {
case res := <-ch:
    return res, nil
case <-ctx.Done():
    return nil, ctx.Err()
}

// 5. Priority (check important channel first)
for {
    select {
    case <-important:
        handleImportant()
    default:
        select {
        case <-important:
            handleImportant()
        case <-regular:
            handleRegular()
        }
    }
}
```

### Select Loop

```go
// Process until done
for {
    select {
    case msg := <-msgs:
        process(msg)
    case <-done:
        return
    }
}

// With ticker
ticker := time.NewTicker(time.Second)
defer ticker.Stop()

for {
    select {
    case <-ticker.C:
        doPeriodicWork()
    case <-done:
        return
    }
}
```

---

## Sync Package

### Mutex (Mutual Exclusion)

```go
import "sync"

type Counter struct {
    mu    sync.Mutex
    count int
}

func (c *Counter) Increment() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.count++
}

func (c *Counter) Value() int {
    c.mu.Lock()
    defer c.mu.Unlock()
    return c.count
}
```

### RWMutex (Read-Write Mutex)

```go
type Cache struct {
    mu   sync.RWMutex
    data map[string]string
}

func (c *Cache) Get(key string) (string, bool) {
    c.mu.RLock()         // Multiple readers allowed
    defer c.mu.RUnlock()
    val, ok := c.data[key]
    return val, ok
}

func (c *Cache) Set(key, value string) {
    c.mu.Lock()          // Exclusive access for writing
    defer c.mu.Unlock()
    c.data[key] = value
}
```

### Once (Execute Once)

```go
var once sync.Once
var instance *Singleton

func GetInstance() *Singleton {
    once.Do(func() {
        instance = &Singleton{}
    })
    return instance
}
```

### Cond (Condition Variable)

```go
type Queue struct {
    mu    sync.Mutex
    cond  *sync.Cond
    items []int
}

func NewQueue() *Queue {
    q := &Queue{}
    q.cond = sync.NewCond(&q.mu)
    return q
}

func (q *Queue) Enqueue(item int) {
    q.mu.Lock()
    defer q.mu.Unlock()
    q.items = append(q.items, item)
    q.cond.Signal()  // Wake one waiting goroutine
}

func (q *Queue) Dequeue() int {
    q.mu.Lock()
    defer q.mu.Unlock()
    for len(q.items) == 0 {
        q.cond.Wait()  // Release lock and wait
    }
    item := q.items[0]
    q.items = q.items[1:]
    return item
}
```

### Atomic Operations

```go
import "sync/atomic"

var counter int64

// Atomic increment
atomic.AddInt64(&counter, 1)

// Atomic load
value := atomic.LoadInt64(&counter)

// Atomic store
atomic.StoreInt64(&counter, 100)

// Compare and swap
swapped := atomic.CompareAndSwapInt64(&counter, 100, 200)
```

---

## Common Patterns

### 1. Worker Pool

```go
func workerPool(numWorkers int, jobs <-chan int, results chan<- int) {
    var wg sync.WaitGroup

    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go func(workerID int) {
            defer wg.Done()
            for job := range jobs {
                result := process(job)
                results <- result
            }
        }(i)
    }

    wg.Wait()
    close(results)
}

// Usage
jobs := make(chan int, 100)
results := make(chan int, 100)

go workerPool(5, jobs, results)

// Send jobs
for i := 0; i < 50; i++ {
    jobs <- i
}
close(jobs)

// Collect results
for result := range results {
    fmt.Println(result)
}
```

### 2. Fan-Out, Fan-In

```go
// Fan-out: Distribute work to multiple goroutines
func fanOut(input <-chan int, n int) []<-chan int {
    outputs := make([]<-chan int, n)
    for i := 0; i < n; i++ {
        outputs[i] = worker(input)
    }
    return outputs
}

func worker(input <-chan int) <-chan int {
    output := make(chan int)
    go func() {
        defer close(output)
        for n := range input {
            output <- process(n)
        }
    }()
    return output
}

// Fan-in: Merge multiple channels into one
func fanIn(channels ...<-chan int) <-chan int {
    var wg sync.WaitGroup
    merged := make(chan int)

    output := func(ch <-chan int) {
        defer wg.Done()
        for n := range ch {
            merged <- n
        }
    }

    wg.Add(len(channels))
    for _, ch := range channels {
        go output(ch)
    }

    go func() {
        wg.Wait()
        close(merged)
    }()

    return merged
}
```

### 3. Pipeline

```go
// Stage 1: Generate numbers
func generate(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            out <- n
        }
    }()
    return out
}

// Stage 2: Square numbers
func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            out <- n * n
        }
    }()
    return out
}

// Stage 3: Filter
func filter(in <-chan int, predicate func(int) bool) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            if predicate(n) {
                out <- n
            }
        }
    }()
    return out
}

// Usage: Pipeline composition
nums := generate(1, 2, 3, 4, 5)
squared := square(nums)
filtered := filter(squared, func(n int) bool { return n > 10 })

for n := range filtered {
    fmt.Println(n)  // 16, 25
}
```

### 4. Semaphore (Limit Concurrency)

```go
// Using buffered channel as semaphore
type Semaphore chan struct{}

func NewSemaphore(n int) Semaphore {
    return make(chan struct{}, n)
}

func (s Semaphore) Acquire() {
    s <- struct{}{}
}

func (s Semaphore) Release() {
    <-s
}

// Usage
sem := NewSemaphore(10)  // Max 10 concurrent

for _, url := range urls {
    sem.Acquire()
    go func(u string) {
        defer sem.Release()
        fetch(u)
    }(url)
}
```

### 5. Rate Limiter

```go
// Simple rate limiter using ticker
func rateLimitedRequests(requests []Request, rps int) {
    ticker := time.NewTicker(time.Second / time.Duration(rps))
    defer ticker.Stop()

    for _, req := range requests {
        <-ticker.C  // Wait for tick
        go process(req)
    }
}

// Token bucket rate limiter
type RateLimiter struct {
    tokens chan struct{}
}

func NewRateLimiter(rate int, burst int) *RateLimiter {
    rl := &RateLimiter{
        tokens: make(chan struct{}, burst),
    }

    // Fill bucket initially
    for i := 0; i < burst; i++ {
        rl.tokens <- struct{}{}
    }

    // Refill tokens at rate
    go func() {
        ticker := time.NewTicker(time.Second / time.Duration(rate))
        for range ticker.C {
            select {
            case rl.tokens <- struct{}{}:
            default:  // Bucket full
            }
        }
    }()

    return rl
}

func (rl *RateLimiter) Allow() bool {
    select {
    case <-rl.tokens:
        return true
    default:
        return false
    }
}
```

### 6. Pub/Sub

```go
type PubSub struct {
    mu     sync.RWMutex
    subs   map[string][]chan string
}

func NewPubSub() *PubSub {
    return &PubSub{
        subs: make(map[string][]chan string),
    }
}

func (ps *PubSub) Subscribe(topic string) <-chan string {
    ps.mu.Lock()
    defer ps.mu.Unlock()

    ch := make(chan string, 1)
    ps.subs[topic] = append(ps.subs[topic], ch)
    return ch
}

func (ps *PubSub) Publish(topic, msg string) {
    ps.mu.RLock()
    defer ps.mu.RUnlock()

    for _, ch := range ps.subs[topic] {
        select {
        case ch <- msg:
        default:  // Don't block if subscriber slow
        }
    }
}
```

---

## Context Package

Context provides cancellation, deadlines, and request-scoped values.

### Creating Contexts

```go
import "context"

// Background context (root, never cancelled)
ctx := context.Background()

// TODO context (placeholder)
ctx := context.TODO()

// With cancellation
ctx, cancel := context.WithCancel(parent)
defer cancel()  // Always call cancel to release resources

// With timeout
ctx, cancel := context.WithTimeout(parent, 5*time.Second)
defer cancel()

// With deadline
deadline := time.Now().Add(10 * time.Second)
ctx, cancel := context.WithDeadline(parent, deadline)
defer cancel()

// With value (use sparingly!)
ctx := context.WithValue(parent, "key", "value")
```

### Using Context

```go
// In functions that can be cancelled
func doWork(ctx context.Context) error {
    for {
        select {
        case <-ctx.Done():
            return ctx.Err()  // Cancelled or deadline exceeded
        default:
            // Do work
        }
    }
}

// With HTTP requests
req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
resp, err := http.DefaultClient.Do(req)

// Pass context as first parameter (convention)
func Process(ctx context.Context, data Data) error {
    // Use ctx...
}
```

### Context Pattern Example

```go
func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
    defer cancel()

    results := make(chan string)

    go func() {
        result, err := fetchData(ctx)
        if err != nil {
            return
        }
        results <- result
    }()

    select {
    case result := <-results:
        fmt.Println("Got result:", result)
    case <-ctx.Done():
        fmt.Println("Timeout:", ctx.Err())
    }
}
```

---

## Race Conditions

### Detecting Races

```go
// Run with race detector
// go run -race main.go
// go test -race ./...

// Example race condition
var counter int

func main() {
    for i := 0; i < 1000; i++ {
        go func() {
            counter++  // DATA RACE!
        }()
    }
    time.Sleep(time.Second)
    fmt.Println(counter)  // Incorrect result
}
```

### Fixing Races

```go
// 1. Using mutex
var mu sync.Mutex
var counter int

func increment() {
    mu.Lock()
    counter++
    mu.Unlock()
}

// 2. Using atomic
var counter int64

func increment() {
    atomic.AddInt64(&counter, 1)
}

// 3. Using channels
counter := make(chan int, 1)
counter <- 0

func increment() {
    val := <-counter
    counter <- val + 1
}
```

### Common Race Scenarios

```go
// 1. Map concurrent access (panic!)
m := make(map[string]int)
go func() { m["a"] = 1 }()
go func() { m["b"] = 2 }()
// Use sync.Map or mutex

// 2. Slice append
var s []int
go func() { s = append(s, 1) }()
go func() { s = append(s, 2) }()
// Use mutex or channels

// 3. Read during modification
var data string
go func() { data = "hello" }()
go func() { fmt.Println(data) }()
// Use mutex or atomic.Value
```

---

## Interview Questions

### Q1: What's the difference between buffered and unbuffered channels?

**Unbuffered:**
- Send blocks until receive is ready
- Synchronous communication
- `ch := make(chan int)`

**Buffered:**
- Send only blocks when buffer full
- Asynchronous up to capacity
- `ch := make(chan int, 10)`

### Q2: How do you prevent goroutine leaks?

1. Always close channels when done sending
2. Use context for cancellation
3. Use `select` with done/quit channels
4. Ensure all spawned goroutines can terminate

### Q3: When would you use sync.Mutex vs channels?

**Mutex:** Protecting shared state, simple critical sections
**Channels:** Communication, coordination, passing data

*"Share memory by communicating, don't communicate by sharing memory"*

### Q4: What happens if you close a channel twice?

**Panic!** Only close channels once, and only from the sender side.

### Q5: How do you implement a timeout?

```go
select {
case result := <-ch:
    return result
case <-time.After(timeout):
    return ErrTimeout
}
```

---

## Cheat Sheet

```go
// Goroutine
go func() { }()

// WaitGroup
var wg sync.WaitGroup
wg.Add(1)
go func() { defer wg.Done(); ... }()
wg.Wait()

// Channel
ch := make(chan int)     // unbuffered
ch := make(chan int, n)  // buffered
ch <- value              // send
value := <-ch            // receive
close(ch)                // close

// Select
select {
case v := <-ch:
case ch <- v:
case <-time.After(t):
default:
}

// Mutex
var mu sync.Mutex
mu.Lock()
defer mu.Unlock()

// Context
ctx, cancel := context.WithTimeout(ctx, time.Second)
defer cancel()
```

---

## Modern Concurrency (Go 1.24+)

### WaitGroup.Go() Patterns (Go 1.25+)

The new `WaitGroup.Go()` method simplifies common patterns:

```go
// Worker pool with WaitGroup.Go()
func processItems(items []Item) {
    var wg sync.WaitGroup

    for _, item := range items {
        item := item  // Capture for closure
        wg.Go(func() {
            process(item)
        })
    }

    wg.Wait()
}

// Fan-out pattern
func fanOut(urls []string) []Result {
    results := make([]Result, len(urls))
    var wg sync.WaitGroup

    for i, url := range urls {
        i, url := i, url
        wg.Go(func() {
            results[i] = fetch(url)
        })
    }

    wg.Wait()
    return results
}
```

### Testing Concurrent Code (Go 1.24+)

The `testing/synctest` package provides deterministic testing for concurrent code:

```go
import (
    "testing"
    "testing/synctest"
)

func TestConcurrentCounter(t *testing.T) {
    synctest.Run(func() {
        var counter int64
        var wg sync.WaitGroup

        for i := 0; i < 100; i++ {
            wg.Go(func() {
                atomic.AddInt64(&counter, 1)
            })
        }

        // Wait for all goroutines to block
        synctest.Wait()

        wg.Wait()

        if counter != 100 {
            t.Errorf("expected 100, got %d", counter)
        }
    })
}

// Test with simulated time
func TestTimeout(t *testing.T) {
    synctest.Run(func() {
        done := make(chan bool)

        go func() {
            time.Sleep(5 * time.Second)
            done <- true
        }()

        // Advance simulated time without waiting
        synctest.Wait()

        select {
        case <-done:
            // Success
        default:
            t.Error("expected completion")
        }
    })
}
```

### Container-Aware GOMAXPROCS (Go 1.25+)

Go 1.25 automatically detects container CPU limits:

```go
// Before Go 1.25: Manual detection needed
import _ "go.uber.org/automaxprocs"  // Third-party library

// Go 1.25+: Automatic detection
// GOMAXPROCS automatically respects:
// - Kubernetes CPU limits
// - Docker --cpus flag
// - cgroup v2 CPU quotas

// Check current setting
fmt.Println(runtime.GOMAXPROCS(0))
```

### Green Tea GC (Go 1.25+ Experimental)

The new "Green Tea" garbage collector reduces memory overhead:

```bash
# Enable experimental Green Tea GC
GOEXPERIMENT=greenteagc go build

# Typical improvements:
# - 10-40% reduction in memory usage
# - Lower GC pause times
# - Better cache locality
```

```go
// No code changes needed - it's transparent
// But you can tune GC settings if needed
import "runtime/debug"

func init() {
    // Set target heap size (default is 100%)
    debug.SetMemoryLimit(512 * 1024 * 1024)  // 512 MB limit

    // Set GC percentage (default 100)
    debug.SetGCPercent(50)  // More aggressive collection
}
```

### sync.Map with Range (Go 1.23+)

`sync.Map` now supports the new range-over-func pattern:

```go
import "sync"

var cache sync.Map

// Store values
cache.Store("key1", "value1")
cache.Store("key2", "value2")

// Go 1.23+: Range over sync.Map directly
for key, value := range cache.Range {
    fmt.Printf("%v: %v\n", key, value)
}

// Before Go 1.23:
cache.Range(func(key, value any) bool {
    fmt.Printf("%v: %v\n", key, value)
    return true  // Continue iteration
})
```

### Improved Channel Patterns (Go 1.23+)

New iterator patterns with channels:

```go
// Generator with iter package (Go 1.23+)
import "iter"

func Generate(n int) iter.Seq[int] {
    return func(yield func(int) bool) {
        for i := 0; i < n; i++ {
            if !yield(i) {
                return
            }
        }
    }
}

// Usage with range
for v := range Generate(5) {
    fmt.Println(v)  // 0, 1, 2, 3, 4
}
```

---

## Cheat Sheet Update (Go 1.25+)

```go
// Traditional WaitGroup
var wg sync.WaitGroup
wg.Add(1)
go func() { defer wg.Done(); work() }()
wg.Wait()

// New WaitGroup.Go() (Go 1.25+)
var wg sync.WaitGroup
wg.Go(func() { work() })  // Simpler!
wg.Wait()

// Deterministic testing (Go 1.24+)
synctest.Run(func() {
    // Concurrent code here
    synctest.Wait()  // Wait for goroutines to block
})

// Container-aware (Go 1.25+ automatic)
runtime.GOMAXPROCS(0)  // Returns container-aware value
```

---

**Next:** [04-interview-patterns.md](04-interview-patterns.md) — Algorithm patterns implemented in Go
