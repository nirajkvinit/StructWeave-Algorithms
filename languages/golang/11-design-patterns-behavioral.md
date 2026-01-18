# Go Behavioral Design Patterns

> Patterns for object collaboration and communication

Behavioral patterns are concerned with algorithms and the assignment of responsibilities between objects. They describe not just patterns of objects or classes but also the patterns of communication between them. In Go, these patterns often leverage channels, interfaces, and first-class functions.

**Reading time**: 75-90 minutes

---

## Table of Contents

1. [Pattern Selection Guide](#pattern-selection-guide)
2. [Chain of Responsibility](#chain-of-responsibility)
3. [Command](#command)
4. [Iterator](#iterator)
5. [Mediator](#mediator)
6. [Memento](#memento)
7. [Observer](#observer)
8. [State](#state)
9. [Strategy](#strategy)
10. [Template Method](#template-method)
11. [Visitor](#visitor)
12. [Concurrency Patterns](#concurrency-patterns)
13. [Interview Questions](#interview-questions)
14. [Quick Reference](#quick-reference)

---

## Pattern Selection Guide

| Scenario | Pattern | Go Implementation |
|----------|---------|-------------------|
| Sequential processing with optional handling | Chain of Responsibility | Middleware chain |
| Encapsulate operations for undo/redo | Command | Command interface |
| Traverse collection without exposing internals | Iterator | `iter.Seq` or channel |
| Reduce many-to-many dependencies | Mediator | Event bus |
| Save and restore object state | Memento | Snapshot struct |
| Notify multiple objects of changes | Observer | Channels or callbacks |
| Object behavior changes with state | State | State interface |
| Swap algorithms at runtime | Strategy | Interface or function type |
| Define algorithm skeleton | Template Method | Embedding + hooks |
| Add operations without modifying types | Visitor | Type switch or interface |

---

## Chain of Responsibility

> Pass requests along a chain of handlers until one handles it.

### When to Use

- HTTP middleware
- Event processing pipelines
- Validation chains
- Logging and authentication

### HTTP Middleware Chain

```go
package middleware

import (
    "context"
    "log/slog"
    "net/http"
    "time"
)

// Middleware type
type Middleware func(http.Handler) http.Handler

// Chain applies middlewares in order
func Chain(h http.Handler, middlewares ...Middleware) http.Handler {
    for i := len(middlewares) - 1; i >= 0; i-- {
        h = middlewares[i](h)
    }
    return h
}

// Logging middleware
func Logging(logger *slog.Logger) Middleware {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            start := time.Now()
            next.ServeHTTP(w, r)
            logger.Info("request",
                "method", r.Method,
                "path", r.URL.Path,
                "duration", time.Since(start),
            )
        })
    }
}

// Authentication middleware
func Authentication(validator TokenValidator) Middleware {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            token := r.Header.Get("Authorization")
            if token == "" {
                http.Error(w, "Unauthorized", http.StatusUnauthorized)
                return // Chain stops here
            }

            user, err := validator.Validate(token)
            if err != nil {
                http.Error(w, "Invalid token", http.StatusUnauthorized)
                return
            }

            ctx := context.WithValue(r.Context(), userKey, user)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

// RateLimit middleware
func RateLimit(rps int) Middleware {
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

// Recovery middleware
func Recovery(logger *slog.Logger) Middleware {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            defer func() {
                if err := recover(); err != nil {
                    logger.Error("panic recovered", "error", err)
                    http.Error(w, "Internal Server Error", http.StatusInternalServerError)
                }
            }()
            next.ServeHTTP(w, r)
        })
    }
}

// Usage
func main() {
    logger := slog.Default()
    handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("Hello, World!"))
    })

    // Build chain: Recovery -> Logging -> RateLimit -> Auth -> Handler
    protected := Chain(
        handler,
        Recovery(logger),
        Logging(logger),
        RateLimit(100),
        Authentication(&JWTValidator{}),
    )

    http.Handle("/api/", protected)
}
```

### Validation Chain

```go
package validation

// Validator interface
type Validator interface {
    Validate(data any) error
    SetNext(v Validator) Validator
}

// BaseValidator provides chain functionality
type BaseValidator struct {
    next Validator
}

func (v *BaseValidator) SetNext(next Validator) Validator {
    v.next = next
    return next
}

func (v *BaseValidator) ValidateNext(data any) error {
    if v.next != nil {
        return v.next.Validate(data)
    }
    return nil
}

// Concrete validators
type RequiredFieldsValidator struct {
    BaseValidator
    fields []string
}

func (v *RequiredFieldsValidator) Validate(data any) error {
    m := data.(map[string]any)
    for _, field := range v.fields {
        if _, ok := m[field]; !ok {
            return fmt.Errorf("missing required field: %s", field)
        }
    }
    return v.ValidateNext(data)
}

type TypeValidator struct {
    BaseValidator
    typeRules map[string]string // field -> expected type
}

func (v *TypeValidator) Validate(data any) error {
    m := data.(map[string]any)
    for field, expectedType := range v.typeRules {
        val, ok := m[field]
        if !ok {
            continue
        }
        actualType := fmt.Sprintf("%T", val)
        if actualType != expectedType {
            return fmt.Errorf("field %s: expected %s, got %s", field, expectedType, actualType)
        }
    }
    return v.ValidateNext(data)
}

type RangeValidator struct {
    BaseValidator
    rules map[string][2]float64 // field -> [min, max]
}

func (v *RangeValidator) Validate(data any) error {
    m := data.(map[string]any)
    for field, bounds := range v.rules {
        val, ok := m[field].(float64)
        if !ok {
            continue
        }
        if val < bounds[0] || val > bounds[1] {
            return fmt.Errorf("field %s: value %f out of range [%f, %f]",
                field, val, bounds[0], bounds[1])
        }
    }
    return v.ValidateNext(data)
}

// Usage
func main() {
    required := &RequiredFieldsValidator{fields: []string{"name", "age", "email"}}
    typeCheck := &TypeValidator{typeRules: map[string]string{"age": "float64"}}
    rangeCheck := &RangeValidator{rules: map[string][2]float64{"age": {0, 150}}}

    // Build chain
    required.SetNext(typeCheck).SetNext(rangeCheck)

    data := map[string]any{
        "name":  "John",
        "age":   25.0,
        "email": "john@example.com",
    }

    if err := required.Validate(data); err != nil {
        fmt.Println("Validation failed:", err)
    } else {
        fmt.Println("Validation passed!")
    }
}
```

---

## Command

> Encapsulate a request as an object, allowing parameterization, queuing, and undo/redo.

### When to Use

- Undo/redo functionality
- Transaction logging
- Macro recording
- Job queues

### Text Editor with Undo/Redo

```go
package editor

// Command interface
type Command interface {
    Execute()
    Undo()
    String() string
}

// Editor is the receiver
type Editor struct {
    text string
}

func NewEditor() *Editor {
    return &Editor{}
}

func (e *Editor) GetText() string {
    return e.text
}

// InsertCommand
type InsertCommand struct {
    editor   *Editor
    position int
    text     string
}

func NewInsertCommand(e *Editor, pos int, text string) *InsertCommand {
    return &InsertCommand{editor: e, position: pos, text: text}
}

func (c *InsertCommand) Execute() {
    if c.position > len(c.editor.text) {
        c.position = len(c.editor.text)
    }
    c.editor.text = c.editor.text[:c.position] + c.text + c.editor.text[c.position:]
}

func (c *InsertCommand) Undo() {
    c.editor.text = c.editor.text[:c.position] + c.editor.text[c.position+len(c.text):]
}

func (c *InsertCommand) String() string {
    return fmt.Sprintf("Insert '%s' at %d", c.text, c.position)
}

// DeleteCommand
type DeleteCommand struct {
    editor      *Editor
    position    int
    length      int
    deletedText string
}

func NewDeleteCommand(e *Editor, pos, length int) *DeleteCommand {
    return &DeleteCommand{editor: e, position: pos, length: length}
}

func (c *DeleteCommand) Execute() {
    end := c.position + c.length
    if end > len(c.editor.text) {
        end = len(c.editor.text)
    }
    c.deletedText = c.editor.text[c.position:end]
    c.editor.text = c.editor.text[:c.position] + c.editor.text[end:]
}

func (c *DeleteCommand) Undo() {
    c.editor.text = c.editor.text[:c.position] + c.deletedText + c.editor.text[c.position:]
}

func (c *DeleteCommand) String() string {
    return fmt.Sprintf("Delete %d chars at %d", c.length, c.position)
}

// CommandManager handles undo/redo
type CommandManager struct {
    history []Command
    future  []Command
}

func NewCommandManager() *CommandManager {
    return &CommandManager{}
}

func (m *CommandManager) Execute(cmd Command) {
    cmd.Execute()
    m.history = append(m.history, cmd)
    m.future = nil // Clear redo stack
}

func (m *CommandManager) Undo() bool {
    if len(m.history) == 0 {
        return false
    }
    cmd := m.history[len(m.history)-1]
    m.history = m.history[:len(m.history)-1]
    cmd.Undo()
    m.future = append(m.future, cmd)
    return true
}

func (m *CommandManager) Redo() bool {
    if len(m.future) == 0 {
        return false
    }
    cmd := m.future[len(m.future)-1]
    m.future = m.future[:len(m.future)-1]
    cmd.Execute()
    m.history = append(m.history, cmd)
    return true
}

func (m *CommandManager) History() []string {
    result := make([]string, len(m.history))
    for i, cmd := range m.history {
        result[i] = cmd.String()
    }
    return result
}

// Usage
func main() {
    editor := NewEditor()
    manager := NewCommandManager()

    manager.Execute(NewInsertCommand(editor, 0, "Hello"))
    fmt.Println(editor.GetText()) // "Hello"

    manager.Execute(NewInsertCommand(editor, 5, " World"))
    fmt.Println(editor.GetText()) // "Hello World"

    manager.Execute(NewDeleteCommand(editor, 5, 6))
    fmt.Println(editor.GetText()) // "Hello"

    manager.Undo()
    fmt.Println(editor.GetText()) // "Hello World"

    manager.Undo()
    fmt.Println(editor.GetText()) // "Hello"

    manager.Redo()
    fmt.Println(editor.GetText()) // "Hello World"

    fmt.Println("History:", manager.History())
}
```

### Job Queue with Commands

```go
package jobs

import (
    "context"
    "sync"
)

// Job interface
type Job interface {
    Execute(ctx context.Context) error
    Name() string
}

// JobQueue processes jobs
type JobQueue struct {
    jobs    chan Job
    results chan JobResult
    workers int
    wg      sync.WaitGroup
}

type JobResult struct {
    Job   Job
    Error error
}

func NewJobQueue(workers, bufferSize int) *JobQueue {
    return &JobQueue{
        jobs:    make(chan Job, bufferSize),
        results: make(chan JobResult, bufferSize),
        workers: workers,
    }
}

func (q *JobQueue) Start(ctx context.Context) {
    for i := 0; i < q.workers; i++ {
        q.wg.Add(1)
        go q.worker(ctx)
    }
}

func (q *JobQueue) worker(ctx context.Context) {
    defer q.wg.Done()
    for {
        select {
        case job, ok := <-q.jobs:
            if !ok {
                return
            }
            err := job.Execute(ctx)
            q.results <- JobResult{Job: job, Error: err}
        case <-ctx.Done():
            return
        }
    }
}

func (q *JobQueue) Submit(job Job) {
    q.jobs <- job
}

func (q *JobQueue) Results() <-chan JobResult {
    return q.results
}

func (q *JobQueue) Close() {
    close(q.jobs)
    q.wg.Wait()
    close(q.results)
}

// Concrete jobs
type EmailJob struct {
    To      string
    Subject string
    Body    string
}

func (j *EmailJob) Execute(ctx context.Context) error {
    fmt.Printf("Sending email to %s: %s\n", j.To, j.Subject)
    return nil
}

func (j *EmailJob) Name() string {
    return fmt.Sprintf("Email to %s", j.To)
}

type ResizeImageJob struct {
    Path   string
    Width  int
    Height int
}

func (j *ResizeImageJob) Execute(ctx context.Context) error {
    fmt.Printf("Resizing %s to %dx%d\n", j.Path, j.Width, j.Height)
    return nil
}

func (j *ResizeImageJob) Name() string {
    return fmt.Sprintf("Resize %s", j.Path)
}

// Usage
func main() {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    queue := NewJobQueue(5, 100)
    queue.Start(ctx)

    // Submit various jobs
    queue.Submit(&EmailJob{To: "user@example.com", Subject: "Hello"})
    queue.Submit(&ResizeImageJob{Path: "/images/photo.jpg", Width: 800, Height: 600})

    // Process results
    go func() {
        for result := range queue.Results() {
            if result.Error != nil {
                fmt.Printf("Job %s failed: %v\n", result.Job.Name(), result.Error)
            } else {
                fmt.Printf("Job %s completed\n", result.Job.Name())
            }
        }
    }()

    // ... shutdown
    queue.Close()
}
```

---

## Iterator

> Provide a way to access elements of an aggregate object sequentially.

### When to Use

- Custom collections
- Lazy evaluation
- Paginated data
- Tree/graph traversal

### Go 1.23+ Iterator (iter.Seq)

```go
package iterator

import "iter"

// Fibonacci returns an iterator over Fibonacci numbers
func Fibonacci(max int) iter.Seq[int] {
    return func(yield func(int) bool) {
        a, b := 0, 1
        for a <= max {
            if !yield(a) {
                return
            }
            a, b = b, a+b
        }
    }
}

// Filter returns an iterator that yields only elements matching predicate
func Filter[T any](seq iter.Seq[T], predicate func(T) bool) iter.Seq[T] {
    return func(yield func(T) bool) {
        for v := range seq {
            if predicate(v) {
                if !yield(v) {
                    return
                }
            }
        }
    }
}

// Map transforms each element
func Map[T, U any](seq iter.Seq[T], transform func(T) U) iter.Seq[U] {
    return func(yield func(U) bool) {
        for v := range seq {
            if !yield(transform(v)) {
                return
            }
        }
    }
}

// Take returns first n elements
func Take[T any](seq iter.Seq[T], n int) iter.Seq[T] {
    return func(yield func(T) bool) {
        count := 0
        for v := range seq {
            if count >= n {
                return
            }
            if !yield(v) {
                return
            }
            count++
        }
    }
}

// Usage
func main() {
    // Basic iteration
    for n := range Fibonacci(100) {
        fmt.Println(n)
    }

    // Chained operations
    result := Take(
        Filter(Fibonacci(1000), func(n int) bool { return n%2 == 0 }),
        5,
    )
    for n := range result {
        fmt.Println(n) // 0, 2, 8, 34, 144
    }
}
```

### Paginated API Iterator

```go
package iterator

import (
    "context"
    "iter"
)

type User struct {
    ID   int
    Name string
}

type UserAPI struct {
    client HTTPClient
}

// FetchPage fetches a single page
func (api *UserAPI) FetchPage(ctx context.Context, page, pageSize int) ([]User, bool, error) {
    // API call
    resp, err := api.client.Get(fmt.Sprintf("/users?page=%d&size=%d", page, pageSize))
    if err != nil {
        return nil, false, err
    }
    hasMore := len(resp.Users) == pageSize
    return resp.Users, hasMore, nil
}

// AllUsers returns an iterator over all users (handles pagination)
func (api *UserAPI) AllUsers(ctx context.Context, pageSize int) iter.Seq2[User, error] {
    return func(yield func(User, error) bool) {
        page := 1
        for {
            users, hasMore, err := api.FetchPage(ctx, page, pageSize)
            if err != nil {
                yield(User{}, err)
                return
            }

            for _, user := range users {
                if !yield(user, nil) {
                    return
                }
            }

            if !hasMore {
                return
            }
            page++
        }
    }
}

// Usage
func main() {
    api := &UserAPI{client: httpClient}
    ctx := context.Background()

    // Iterate over all users (pagination handled automatically)
    for user, err := range api.AllUsers(ctx, 100) {
        if err != nil {
            log.Fatal(err)
        }
        fmt.Printf("User: %s\n", user.Name)
    }
}
```

### Tree Iterator

```go
package tree

import "iter"

type TreeNode struct {
    Value int
    Left  *TreeNode
    Right *TreeNode
}

// InOrder returns an in-order traversal iterator
func (n *TreeNode) InOrder() iter.Seq[int] {
    return func(yield func(int) bool) {
        var traverse func(*TreeNode) bool
        traverse = func(node *TreeNode) bool {
            if node == nil {
                return true
            }
            if !traverse(node.Left) {
                return false
            }
            if !yield(node.Value) {
                return false
            }
            return traverse(node.Right)
        }
        traverse(n)
    }
}

// PreOrder returns a pre-order traversal iterator
func (n *TreeNode) PreOrder() iter.Seq[int] {
    return func(yield func(int) bool) {
        var traverse func(*TreeNode) bool
        traverse = func(node *TreeNode) bool {
            if node == nil {
                return true
            }
            if !yield(node.Value) {
                return false
            }
            if !traverse(node.Left) {
                return false
            }
            return traverse(node.Right)
        }
        traverse(n)
    }
}

// LevelOrder returns a level-order (BFS) iterator
func (n *TreeNode) LevelOrder() iter.Seq[int] {
    return func(yield func(int) bool) {
        if n == nil {
            return
        }
        queue := []*TreeNode{n}
        for len(queue) > 0 {
            node := queue[0]
            queue = queue[1:]

            if !yield(node.Value) {
                return
            }

            if node.Left != nil {
                queue = append(queue, node.Left)
            }
            if node.Right != nil {
                queue = append(queue, node.Right)
            }
        }
    }
}

// Usage
func main() {
    root := &TreeNode{
        Value: 4,
        Left: &TreeNode{
            Value: 2,
            Left:  &TreeNode{Value: 1},
            Right: &TreeNode{Value: 3},
        },
        Right: &TreeNode{
            Value: 6,
            Left:  &TreeNode{Value: 5},
            Right: &TreeNode{Value: 7},
        },
    }

    fmt.Print("InOrder: ")
    for v := range root.InOrder() {
        fmt.Printf("%d ", v)
    }
    // InOrder: 1 2 3 4 5 6 7

    fmt.Print("\nPreOrder: ")
    for v := range root.PreOrder() {
        fmt.Printf("%d ", v)
    }
    // PreOrder: 4 2 1 3 6 5 7
}
```

---

## Mediator

> Define an object that encapsulates how a set of objects interact.

### When to Use

- Chat rooms
- Air traffic control
- GUI components coordination
- Event buses

### Event Bus (Mediator)

```go
package mediator

import (
    "reflect"
    "sync"
)

// Event interface
type Event interface {
    Name() string
}

// Handler function type
type Handler func(event Event)

// EventBus mediates between publishers and subscribers
type EventBus struct {
    handlers map[string][]Handler
    mu       sync.RWMutex
}

func NewEventBus() *EventBus {
    return &EventBus{
        handlers: make(map[string][]Handler),
    }
}

// Subscribe registers a handler for an event type
func (bus *EventBus) Subscribe(eventName string, handler Handler) {
    bus.mu.Lock()
    defer bus.mu.Unlock()
    bus.handlers[eventName] = append(bus.handlers[eventName], handler)
}

// Publish sends an event to all subscribers
func (bus *EventBus) Publish(event Event) {
    bus.mu.RLock()
    handlers := bus.handlers[event.Name()]
    bus.mu.RUnlock()

    for _, handler := range handlers {
        handler(event)
    }
}

// PublishAsync sends event asynchronously
func (bus *EventBus) PublishAsync(event Event) {
    bus.mu.RLock()
    handlers := bus.handlers[event.Name()]
    bus.mu.RUnlock()

    for _, handler := range handlers {
        go handler(event)
    }
}

// Concrete events
type UserCreatedEvent struct {
    UserID int
    Email  string
}

func (e UserCreatedEvent) Name() string { return "user.created" }

type OrderPlacedEvent struct {
    OrderID    string
    CustomerID int
    Amount     float64
}

func (e OrderPlacedEvent) Name() string { return "order.placed" }

// Services that communicate via mediator
type EmailService struct{}

func (s *EmailService) HandleUserCreated(event Event) {
    e := event.(UserCreatedEvent)
    fmt.Printf("EmailService: Sending welcome email to %s\n", e.Email)
}

type AnalyticsService struct{}

func (s *AnalyticsService) HandleUserCreated(event Event) {
    e := event.(UserCreatedEvent)
    fmt.Printf("AnalyticsService: Tracking new user %d\n", e.UserID)
}

func (s *AnalyticsService) HandleOrderPlaced(event Event) {
    e := event.(OrderPlacedEvent)
    fmt.Printf("AnalyticsService: Recording order %s for $%.2f\n", e.OrderID, e.Amount)
}

type InventoryService struct{}

func (s *InventoryService) HandleOrderPlaced(event Event) {
    e := event.(OrderPlacedEvent)
    fmt.Printf("InventoryService: Updating inventory for order %s\n", e.OrderID)
}

// Usage
func main() {
    bus := NewEventBus()

    // Services subscribe to events
    emailService := &EmailService{}
    analyticsService := &AnalyticsService{}
    inventoryService := &InventoryService{}

    bus.Subscribe("user.created", emailService.HandleUserCreated)
    bus.Subscribe("user.created", analyticsService.HandleUserCreated)
    bus.Subscribe("order.placed", analyticsService.HandleOrderPlaced)
    bus.Subscribe("order.placed", inventoryService.HandleOrderPlaced)

    // Publish events - services are decoupled
    bus.Publish(UserCreatedEvent{UserID: 1, Email: "john@example.com"})
    bus.Publish(OrderPlacedEvent{OrderID: "ORD-123", CustomerID: 1, Amount: 99.99})
}
```

### Chat Room Mediator

```go
package chat

import (
    "fmt"
    "sync"
)

// Mediator interface
type ChatRoom interface {
    Register(user *User)
    Send(message string, from *User)
    SendTo(message string, from, to *User)
}

// Concrete mediator
type PublicChatRoom struct {
    users map[string]*User
    mu    sync.RWMutex
}

func NewPublicChatRoom() *PublicChatRoom {
    return &PublicChatRoom{users: make(map[string]*User)}
}

func (r *PublicChatRoom) Register(user *User) {
    r.mu.Lock()
    defer r.mu.Unlock()
    r.users[user.Name] = user
    user.room = r
    fmt.Printf("[%s joined the chat]\n", user.Name)
}

func (r *PublicChatRoom) Send(message string, from *User) {
    r.mu.RLock()
    defer r.mu.RUnlock()

    for _, user := range r.users {
        if user != from {
            user.Receive(message, from)
        }
    }
}

func (r *PublicChatRoom) SendTo(message string, from, to *User) {
    to.Receive(fmt.Sprintf("(private) %s", message), from)
}

// Colleague
type User struct {
    Name string
    room ChatRoom
}

func NewUser(name string) *User {
    return &User{Name: name}
}

func (u *User) Send(message string) {
    fmt.Printf("%s: %s\n", u.Name, message)
    u.room.Send(message, u)
}

func (u *User) SendPrivate(message string, to *User) {
    fmt.Printf("%s -> %s: %s\n", u.Name, to.Name, message)
    u.room.SendTo(message, u, to)
}

func (u *User) Receive(message string, from *User) {
    fmt.Printf("[%s received from %s]: %s\n", u.Name, from.Name, message)
}

// Usage
func main() {
    room := NewPublicChatRoom()

    alice := NewUser("Alice")
    bob := NewUser("Bob")
    charlie := NewUser("Charlie")

    room.Register(alice)
    room.Register(bob)
    room.Register(charlie)

    alice.Send("Hello everyone!")
    bob.SendPrivate("Hi Alice!", alice)
}
```

---

## Memento

> Capture and restore an object's internal state without violating encapsulation.

### When to Use

- Undo functionality
- Checkpoints/snapshots
- State recovery

### Editor State Memento

```go
package memento

import "time"

// Memento stores editor state
type EditorMemento struct {
    content   string
    cursorPos int
    timestamp time.Time
}

func (m *EditorMemento) GetTimestamp() time.Time {
    return m.timestamp
}

// Originator: Editor
type Editor struct {
    content   string
    cursorPos int
}

func NewEditor() *Editor {
    return &Editor{}
}

func (e *Editor) SetContent(content string) {
    e.content = content
}

func (e *Editor) GetContent() string {
    return e.content
}

func (e *Editor) SetCursor(pos int) {
    e.cursorPos = pos
}

func (e *Editor) GetCursor() int {
    return e.cursorPos
}

// Save creates a memento of current state
func (e *Editor) Save() *EditorMemento {
    return &EditorMemento{
        content:   e.content,
        cursorPos: e.cursorPos,
        timestamp: time.Now(),
    }
}

// Restore restores state from memento
func (e *Editor) Restore(m *EditorMemento) {
    e.content = m.content
    e.cursorPos = m.cursorPos
}

// Caretaker: History manager
type History struct {
    snapshots []*EditorMemento
    maxSize   int
}

func NewHistory(maxSize int) *History {
    return &History{maxSize: maxSize}
}

func (h *History) Push(m *EditorMemento) {
    if len(h.snapshots) >= h.maxSize {
        h.snapshots = h.snapshots[1:] // Remove oldest
    }
    h.snapshots = append(h.snapshots, m)
}

func (h *History) Pop() *EditorMemento {
    if len(h.snapshots) == 0 {
        return nil
    }
    m := h.snapshots[len(h.snapshots)-1]
    h.snapshots = h.snapshots[:len(h.snapshots)-1]
    return m
}

func (h *History) List() []time.Time {
    times := make([]time.Time, len(h.snapshots))
    for i, s := range h.snapshots {
        times[i] = s.GetTimestamp()
    }
    return times
}

// Usage
func main() {
    editor := NewEditor()
    history := NewHistory(10)

    // Edit and save snapshots
    editor.SetContent("Hello")
    editor.SetCursor(5)
    history.Push(editor.Save())

    editor.SetContent("Hello World")
    editor.SetCursor(11)
    history.Push(editor.Save())

    editor.SetContent("Hello World!")
    editor.SetCursor(12)

    fmt.Println("Current:", editor.GetContent()) // "Hello World!"

    // Undo
    if m := history.Pop(); m != nil {
        editor.Restore(m)
        fmt.Println("After undo:", editor.GetContent()) // "Hello World"
    }

    // Undo again
    if m := history.Pop(); m != nil {
        editor.Restore(m)
        fmt.Println("After undo:", editor.GetContent()) // "Hello"
    }
}
```

### Game Save System

```go
package game

import (
    "encoding/gob"
    "os"
)

// GameState memento
type GameState struct {
    Level       int
    Health      int
    Position    Position
    Inventory   []Item
    Achievements []string
}

type Position struct {
    X, Y float64
}

type Item struct {
    ID   string
    Name string
}

// Game originator
type Game struct {
    level        int
    playerHealth int
    playerPos    Position
    inventory    []Item
    achievements []string
}

func (g *Game) Save() *GameState {
    // Deep copy inventory
    inv := make([]Item, len(g.inventory))
    copy(inv, g.inventory)

    ach := make([]string, len(g.achievements))
    copy(ach, g.achievements)

    return &GameState{
        Level:        g.level,
        Health:       g.playerHealth,
        Position:     g.playerPos,
        Inventory:    inv,
        Achievements: ach,
    }
}

func (g *Game) Load(state *GameState) {
    g.level = state.Level
    g.playerHealth = state.Health
    g.playerPos = state.Position
    g.inventory = make([]Item, len(state.Inventory))
    copy(g.inventory, state.Inventory)
    g.achievements = make([]string, len(state.Achievements))
    copy(g.achievements, state.Achievements)
}

// SaveManager caretaker with persistence
type SaveManager struct {
    savePath string
}

func NewSaveManager(path string) *SaveManager {
    return &SaveManager{savePath: path}
}

func (m *SaveManager) SaveToFile(state *GameState, slot int) error {
    filename := fmt.Sprintf("%s/save_%d.gob", m.savePath, slot)
    file, err := os.Create(filename)
    if err != nil {
        return err
    }
    defer file.Close()

    encoder := gob.NewEncoder(file)
    return encoder.Encode(state)
}

func (m *SaveManager) LoadFromFile(slot int) (*GameState, error) {
    filename := fmt.Sprintf("%s/save_%d.gob", m.savePath, slot)
    file, err := os.Open(filename)
    if err != nil {
        return nil, err
    }
    defer file.Close()

    var state GameState
    decoder := gob.NewDecoder(file)
    err = decoder.Decode(&state)
    return &state, err
}
```

---

## Observer

> Define a one-to-many dependency so that when one object changes state, all dependents are notified.

### When to Use

- Event systems
- Data binding
- Pub/sub patterns
- Reactive programming

### Channel-Based Observer

```go
package observer

import (
    "context"
    "sync"
)

// Event type
type StockPrice struct {
    Symbol string
    Price  float64
}

// Subject: Stock ticker
type StockTicker struct {
    observers map[chan StockPrice]struct{}
    mu        sync.RWMutex
}

func NewStockTicker() *StockTicker {
    return &StockTicker{
        observers: make(map[chan StockPrice]struct{}),
    }
}

// Subscribe returns a channel for receiving updates
func (t *StockTicker) Subscribe() chan StockPrice {
    ch := make(chan StockPrice, 10) // Buffered to avoid blocking
    t.mu.Lock()
    t.observers[ch] = struct{}{}
    t.mu.Unlock()
    return ch
}

// Unsubscribe removes an observer
func (t *StockTicker) Unsubscribe(ch chan StockPrice) {
    t.mu.Lock()
    delete(t.observers, ch)
    close(ch)
    t.mu.Unlock()
}

// UpdatePrice notifies all observers
func (t *StockTicker) UpdatePrice(symbol string, price float64) {
    event := StockPrice{Symbol: symbol, Price: price}

    t.mu.RLock()
    defer t.mu.RUnlock()

    for ch := range t.observers {
        select {
        case ch <- event:
        default:
            // Skip slow consumers
        }
    }
}

// Observer: Stock monitor
type StockMonitor struct {
    name      string
    threshold float64
}

func (m *StockMonitor) Watch(ctx context.Context, ticker *StockTicker) {
    ch := ticker.Subscribe()
    defer ticker.Unsubscribe(ch)

    for {
        select {
        case price, ok := <-ch:
            if !ok {
                return
            }
            if price.Price > m.threshold {
                fmt.Printf("[%s] Alert! %s is at $%.2f (above $%.2f)\n",
                    m.name, price.Symbol, price.Price, m.threshold)
            }
        case <-ctx.Done():
            return
        }
    }
}

// Usage
func main() {
    ticker := NewStockTicker()
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    // Multiple observers
    go (&StockMonitor{name: "Monitor1", threshold: 150}).Watch(ctx, ticker)
    go (&StockMonitor{name: "Monitor2", threshold: 200}).Watch(ctx, ticker)

    // Simulate price updates
    ticker.UpdatePrice("AAPL", 145.50)
    ticker.UpdatePrice("AAPL", 155.00) // Triggers Monitor1
    ticker.UpdatePrice("AAPL", 210.00) // Triggers both
}
```

### Callback-Based Observer

```go
package observer

import "sync"

// Observer callback type
type Observer[T any] func(event T)

// Subject with generics
type Subject[T any] struct {
    observers map[int]Observer[T]
    nextID    int
    mu        sync.RWMutex
}

func NewSubject[T any]() *Subject[T] {
    return &Subject[T]{
        observers: make(map[int]Observer[T]),
    }
}

// Subscribe returns an unsubscribe function
func (s *Subject[T]) Subscribe(observer Observer[T]) func() {
    s.mu.Lock()
    id := s.nextID
    s.nextID++
    s.observers[id] = observer
    s.mu.Unlock()

    return func() {
        s.mu.Lock()
        delete(s.observers, id)
        s.mu.Unlock()
    }
}

// Notify sends event to all observers
func (s *Subject[T]) Notify(event T) {
    s.mu.RLock()
    defer s.mu.RUnlock()

    for _, observer := range s.observers {
        observer(event)
    }
}

// Usage with typed events
type UserEvent struct {
    Type string
    User User
}

func main() {
    userEvents := NewSubject[UserEvent]()

    // Subscribe with automatic cleanup
    unsubscribe := userEvents.Subscribe(func(e UserEvent) {
        fmt.Printf("User %s: %s\n", e.Type, e.User.Name)
    })
    defer unsubscribe()

    // Another subscriber
    userEvents.Subscribe(func(e UserEvent) {
        if e.Type == "created" {
            sendWelcomeEmail(e.User)
        }
    })

    userEvents.Notify(UserEvent{Type: "created", User: User{Name: "John"}})
}
```

---

## State

> Allow an object to alter its behavior when its internal state changes.

### When to Use

- Workflow/process states
- UI state machines
- Protocol implementations
- Game states

### Order State Machine

```go
package order

import (
    "errors"
    "fmt"
    "time"
)

// State interface
type OrderState interface {
    Name() string
    Pay(o *Order) error
    Ship(o *Order) error
    Deliver(o *Order) error
    Cancel(o *Order) error
}

// Order context
type Order struct {
    ID        string
    Items     []Item
    Total     float64
    state     OrderState
    CreatedAt time.Time
    UpdatedAt time.Time
}

func NewOrder(id string, items []Item, total float64) *Order {
    o := &Order{
        ID:        id,
        Items:     items,
        Total:     total,
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    }
    o.state = &PendingState{}
    return o
}

func (o *Order) SetState(state OrderState) {
    fmt.Printf("Order %s: %s -> %s\n", o.ID, o.state.Name(), state.Name())
    o.state = state
    o.UpdatedAt = time.Now()
}

func (o *Order) GetState() string {
    return o.state.Name()
}

func (o *Order) Pay() error     { return o.state.Pay(o) }
func (o *Order) Ship() error    { return o.state.Ship(o) }
func (o *Order) Deliver() error { return o.state.Deliver(o) }
func (o *Order) Cancel() error  { return o.state.Cancel(o) }

// Concrete states
type PendingState struct{}

func (s *PendingState) Name() string { return "pending" }

func (s *PendingState) Pay(o *Order) error {
    // Process payment...
    o.SetState(&PaidState{})
    return nil
}

func (s *PendingState) Ship(o *Order) error {
    return errors.New("cannot ship: order not paid")
}

func (s *PendingState) Deliver(o *Order) error {
    return errors.New("cannot deliver: order not shipped")
}

func (s *PendingState) Cancel(o *Order) error {
    o.SetState(&CancelledState{})
    return nil
}

type PaidState struct{}

func (s *PaidState) Name() string { return "paid" }

func (s *PaidState) Pay(o *Order) error {
    return errors.New("order already paid")
}

func (s *PaidState) Ship(o *Order) error {
    o.SetState(&ShippedState{})
    return nil
}

func (s *PaidState) Deliver(o *Order) error {
    return errors.New("cannot deliver: order not shipped")
}

func (s *PaidState) Cancel(o *Order) error {
    // Refund payment...
    o.SetState(&CancelledState{})
    return nil
}

type ShippedState struct{}

func (s *ShippedState) Name() string { return "shipped" }

func (s *ShippedState) Pay(o *Order) error {
    return errors.New("order already paid")
}

func (s *ShippedState) Ship(o *Order) error {
    return errors.New("order already shipped")
}

func (s *ShippedState) Deliver(o *Order) error {
    o.SetState(&DeliveredState{})
    return nil
}

func (s *ShippedState) Cancel(o *Order) error {
    return errors.New("cannot cancel shipped order")
}

type DeliveredState struct{}

func (s *DeliveredState) Name() string { return "delivered" }

func (s *DeliveredState) Pay(o *Order) error {
    return errors.New("order already paid")
}

func (s *DeliveredState) Ship(o *Order) error {
    return errors.New("order already delivered")
}

func (s *DeliveredState) Deliver(o *Order) error {
    return errors.New("order already delivered")
}

func (s *DeliveredState) Cancel(o *Order) error {
    return errors.New("cannot cancel delivered order")
}

type CancelledState struct{}

func (s *CancelledState) Name() string { return "cancelled" }

func (s *CancelledState) Pay(o *Order) error {
    return errors.New("order is cancelled")
}

func (s *CancelledState) Ship(o *Order) error {
    return errors.New("order is cancelled")
}

func (s *CancelledState) Deliver(o *Order) error {
    return errors.New("order is cancelled")
}

func (s *CancelledState) Cancel(o *Order) error {
    return errors.New("order already cancelled")
}

// Usage
func main() {
    order := NewOrder("ORD-001", []Item{{Name: "Widget"}}, 99.99)

    fmt.Println("State:", order.GetState()) // pending

    order.Pay()
    fmt.Println("State:", order.GetState()) // paid

    order.Ship()
    fmt.Println("State:", order.GetState()) // shipped

    order.Deliver()
    fmt.Println("State:", order.GetState()) // delivered

    // Invalid transitions
    err := order.Cancel()
    fmt.Println("Cancel error:", err) // cannot cancel delivered order
}
```

---

## Strategy

> Define a family of algorithms, encapsulate each one, and make them interchangeable.

### When to Use

- Multiple algorithms for the same task
- Avoid conditionals for algorithm selection
- Runtime algorithm selection

### Payment Processing Strategy

```go
package payment

import (
    "context"
    "fmt"
)

// Strategy interface
type PaymentStrategy interface {
    Pay(ctx context.Context, amount float64) (string, error)
    Name() string
}

// Concrete strategies
type CreditCardStrategy struct {
    cardNumber string
    cvv        string
    expiry     string
}

func NewCreditCardStrategy(card, cvv, expiry string) *CreditCardStrategy {
    return &CreditCardStrategy{cardNumber: card, cvv: cvv, expiry: expiry}
}

func (s *CreditCardStrategy) Pay(ctx context.Context, amount float64) (string, error) {
    fmt.Printf("Processing $%.2f via credit card ending in %s\n",
        amount, s.cardNumber[len(s.cardNumber)-4:])
    return fmt.Sprintf("CC-TXN-%d", time.Now().UnixNano()), nil
}

func (s *CreditCardStrategy) Name() string { return "credit_card" }

type PayPalStrategy struct {
    email string
}

func NewPayPalStrategy(email string) *PayPalStrategy {
    return &PayPalStrategy{email: email}
}

func (s *PayPalStrategy) Pay(ctx context.Context, amount float64) (string, error) {
    fmt.Printf("Processing $%.2f via PayPal (%s)\n", amount, s.email)
    return fmt.Sprintf("PP-TXN-%d", time.Now().UnixNano()), nil
}

func (s *PayPalStrategy) Name() string { return "paypal" }

type CryptoStrategy struct {
    wallet  string
    network string
}

func NewCryptoStrategy(wallet, network string) *CryptoStrategy {
    return &CryptoStrategy{wallet: wallet, network: network}
}

func (s *CryptoStrategy) Pay(ctx context.Context, amount float64) (string, error) {
    fmt.Printf("Processing $%.2f via crypto (%s on %s)\n",
        amount, s.wallet[:8]+"...", s.network)
    return fmt.Sprintf("CRYPTO-TXN-%d", time.Now().UnixNano()), nil
}

func (s *CryptoStrategy) Name() string { return "crypto" }

// Context: PaymentProcessor
type PaymentProcessor struct {
    strategy PaymentStrategy
}

func NewPaymentProcessor(strategy PaymentStrategy) *PaymentProcessor {
    return &PaymentProcessor{strategy: strategy}
}

func (p *PaymentProcessor) SetStrategy(strategy PaymentStrategy) {
    p.strategy = strategy
}

func (p *PaymentProcessor) ProcessPayment(ctx context.Context, amount float64) (string, error) {
    if p.strategy == nil {
        return "", errors.New("no payment strategy set")
    }
    return p.strategy.Pay(ctx, amount)
}

// Usage
func main() {
    ctx := context.Background()

    // Credit card payment
    processor := NewPaymentProcessor(NewCreditCardStrategy("4111111111111111", "123", "12/25"))
    txn, _ := processor.ProcessPayment(ctx, 99.99)
    fmt.Println("Transaction:", txn)

    // Switch to PayPal at runtime
    processor.SetStrategy(NewPayPalStrategy("user@example.com"))
    txn, _ = processor.ProcessPayment(ctx, 149.99)
    fmt.Println("Transaction:", txn)

    // Switch to crypto
    processor.SetStrategy(NewCryptoStrategy("0x1234abcd...", "ethereum"))
    txn, _ = processor.ProcessPayment(ctx, 299.99)
    fmt.Println("Transaction:", txn)
}
```

### Function-Based Strategy (Go Idiom)

```go
package sort

// Strategy as function type
type SortStrategy[T any] func([]T)

// Predefined strategies
func BubbleSort[T cmp.Ordered](data []T) {
    n := len(data)
    for i := 0; i < n-1; i++ {
        for j := 0; j < n-i-1; j++ {
            if data[j] > data[j+1] {
                data[j], data[j+1] = data[j+1], data[j]
            }
        }
    }
}

func QuickSort[T cmp.Ordered](data []T) {
    if len(data) < 2 {
        return
    }
    pivot := len(data) / 2
    // ... quicksort implementation
    slices.Sort(data) // Using stdlib for simplicity
}

func MergeSort[T cmp.Ordered](data []T) {
    // ... mergesort implementation
    slices.Sort(data)
}

// Sorter context
type Sorter[T cmp.Ordered] struct {
    strategy SortStrategy[T]
}

func NewSorter[T cmp.Ordered](strategy SortStrategy[T]) *Sorter[T] {
    return &Sorter[T]{strategy: strategy}
}

func (s *Sorter[T]) Sort(data []T) {
    s.strategy(data)
}

// Usage
func main() {
    data := []int{5, 2, 8, 1, 9, 3}

    // Use bubble sort for small data
    sorter := NewSorter(BubbleSort[int])
    sorter.Sort(data)

    // Switch to quicksort for large data
    largeData := make([]int, 10000)
    sorter.strategy = QuickSort[int]
    sorter.Sort(largeData)
}
```

### Compression Strategy

```go
package compression

// CompressionStrategy as function type
type CompressionStrategy func([]byte) ([]byte, error)

func GzipCompress(data []byte) ([]byte, error) {
    var buf bytes.Buffer
    w := gzip.NewWriter(&buf)
    w.Write(data)
    w.Close()
    return buf.Bytes(), nil
}

func ZlibCompress(data []byte) ([]byte, error) {
    var buf bytes.Buffer
    w := zlib.NewWriter(&buf)
    w.Write(data)
    w.Close()
    return buf.Bytes(), nil
}

func NoCompress(data []byte) ([]byte, error) {
    return data, nil
}

// File archiver with configurable compression
type Archiver struct {
    compress CompressionStrategy
}

func NewArchiver(strategy CompressionStrategy) *Archiver {
    return &Archiver{compress: strategy}
}

func (a *Archiver) Archive(files map[string][]byte) ([]byte, error) {
    // Combine and compress files
    var combined bytes.Buffer
    for name, data := range files {
        compressed, err := a.compress(data)
        if err != nil {
            return nil, err
        }
        combined.Write(compressed)
    }
    return combined.Bytes(), nil
}

// Usage
func main() {
    // Choose strategy based on network conditions
    var strategy CompressionStrategy
    if networkBandwidth < 1_000_000 { // Slow network
        strategy = GzipCompress
    } else {
        strategy = NoCompress
    }

    archiver := NewArchiver(strategy)
    data, _ := archiver.Archive(files)
}
```

---

## Template Method

> Define the skeleton of an algorithm, deferring some steps to subclasses.

### When to Use

- Algorithm skeleton with customizable steps
- Code reuse with variation
- Framework extensibility

### Data Pipeline Template

```go
package pipeline

import (
    "encoding/csv"
    "encoding/json"
    "io"
)

// Template interface for customizable steps
type DataProcessor interface {
    ReadData(source io.Reader) ([]map[string]any, error)
    ValidateData(data []map[string]any) error
    TransformData(data []map[string]any) ([]map[string]any, error)
    WriteData(data []map[string]any, dest io.Writer) error
}

// Template method implementation
type Pipeline struct {
    processor DataProcessor
}

func NewPipeline(processor DataProcessor) *Pipeline {
    return &Pipeline{processor: processor}
}

// Process is the template method - defines the algorithm skeleton
func (p *Pipeline) Process(source io.Reader, dest io.Writer) error {
    // Step 1: Read (customizable)
    data, err := p.processor.ReadData(source)
    if err != nil {
        return fmt.Errorf("reading data: %w", err)
    }

    // Step 2: Validate (customizable)
    if err := p.processor.ValidateData(data); err != nil {
        return fmt.Errorf("validating data: %w", err)
    }

    // Step 3: Transform (customizable)
    transformed, err := p.processor.TransformData(data)
    if err != nil {
        return fmt.Errorf("transforming data: %w", err)
    }

    // Step 4: Write (customizable)
    if err := p.processor.WriteData(transformed, dest); err != nil {
        return fmt.Errorf("writing data: %w", err)
    }

    return nil
}

// CSV to JSON processor
type CSVToJSONProcessor struct {
    columns []string
}

func (p *CSVToJSONProcessor) ReadData(source io.Reader) ([]map[string]any, error) {
    reader := csv.NewReader(source)
    records, err := reader.ReadAll()
    if err != nil {
        return nil, err
    }

    if len(records) == 0 {
        return nil, nil
    }

    p.columns = records[0]
    var result []map[string]any

    for _, row := range records[1:] {
        record := make(map[string]any)
        for i, col := range p.columns {
            if i < len(row) {
                record[col] = row[i]
            }
        }
        result = append(result, record)
    }

    return result, nil
}

func (p *CSVToJSONProcessor) ValidateData(data []map[string]any) error {
    for i, record := range data {
        if _, ok := record["id"]; !ok {
            return fmt.Errorf("row %d: missing required field 'id'", i)
        }
    }
    return nil
}

func (p *CSVToJSONProcessor) TransformData(data []map[string]any) ([]map[string]any, error) {
    // Add computed fields, normalize data, etc.
    for _, record := range data {
        record["processed_at"] = time.Now().Format(time.RFC3339)
    }
    return data, nil
}

func (p *CSVToJSONProcessor) WriteData(data []map[string]any, dest io.Writer) error {
    encoder := json.NewEncoder(dest)
    encoder.SetIndent("", "  ")
    return encoder.Encode(data)
}

// Usage
func main() {
    processor := &CSVToJSONProcessor{}
    pipeline := NewPipeline(processor)

    input := strings.NewReader("id,name,email\n1,John,john@example.com\n2,Jane,jane@example.com")
    var output bytes.Buffer

    if err := pipeline.Process(input, &output); err != nil {
        log.Fatal(err)
    }

    fmt.Println(output.String())
}
```

### Embedding for Template Method

```go
package report

// BaseReport provides common functionality
type BaseReport struct {
    title    string
    sections []string
}

func (r *BaseReport) SetTitle(title string) {
    r.title = title
}

func (r *BaseReport) AddSection(section string) {
    r.sections = append(r.sections, section)
}

// Hook: Override in concrete types
func (r *BaseReport) FormatTitle() string {
    return r.title
}

// Hook: Override in concrete types
func (r *BaseReport) FormatSection(section string) string {
    return section
}

// Template method
func (r *BaseReport) Generate() string {
    var sb strings.Builder
    sb.WriteString(r.FormatTitle())
    sb.WriteString("\n\n")
    for _, section := range r.sections {
        sb.WriteString(r.FormatSection(section))
        sb.WriteString("\n")
    }
    return sb.String()
}

// Concrete: HTML Report
type HTMLReport struct {
    BaseReport
}

func (r *HTMLReport) FormatTitle() string {
    return fmt.Sprintf("<h1>%s</h1>", r.title)
}

func (r *HTMLReport) FormatSection(section string) string {
    return fmt.Sprintf("<p>%s</p>", section)
}

// Concrete: Markdown Report
type MarkdownReport struct {
    BaseReport
}

func (r *MarkdownReport) FormatTitle() string {
    return fmt.Sprintf("# %s", r.title)
}

func (r *MarkdownReport) FormatSection(section string) string {
    return fmt.Sprintf("- %s", section)
}

// Usage
func main() {
    html := &HTMLReport{}
    html.SetTitle("Monthly Report")
    html.AddSection("Revenue increased by 15%")
    html.AddSection("New users: 1000")
    fmt.Println(html.Generate())

    md := &MarkdownReport{}
    md.SetTitle("Monthly Report")
    md.AddSection("Revenue increased by 15%")
    md.AddSection("New users: 1000")
    fmt.Println(md.Generate())
}
```

---

## Visitor

> Represent an operation to be performed on elements of an object structure.

### When to Use

- Operations on complex object structures
- Adding operations without modifying types
- AST processing

### Type Switch Visitor (Go Idiom)

```go
package visitor

// Shape types
type Shape interface {
    Accept(v ShapeVisitor)
}

type Circle struct {
    Radius float64
}

func (c *Circle) Accept(v ShapeVisitor) { v.VisitCircle(c) }

type Rectangle struct {
    Width, Height float64
}

func (r *Rectangle) Accept(v ShapeVisitor) { v.VisitRectangle(r) }

type Triangle struct {
    Base, Height float64
}

func (t *Triangle) Accept(v ShapeVisitor) { v.VisitTriangle(t) }

// Visitor interface
type ShapeVisitor interface {
    VisitCircle(c *Circle)
    VisitRectangle(r *Rectangle)
    VisitTriangle(t *Triangle)
}

// Area calculator visitor
type AreaCalculator struct {
    TotalArea float64
}

func (v *AreaCalculator) VisitCircle(c *Circle) {
    v.TotalArea += math.Pi * c.Radius * c.Radius
}

func (v *AreaCalculator) VisitRectangle(r *Rectangle) {
    v.TotalArea += r.Width * r.Height
}

func (v *AreaCalculator) VisitTriangle(t *Triangle) {
    v.TotalArea += 0.5 * t.Base * t.Height
}

// Drawing visitor
type DrawingVisitor struct {
    Output []string
}

func (v *DrawingVisitor) VisitCircle(c *Circle) {
    v.Output = append(v.Output, fmt.Sprintf("Drawing circle with radius %.2f", c.Radius))
}

func (v *DrawingVisitor) VisitRectangle(r *Rectangle) {
    v.Output = append(v.Output, fmt.Sprintf("Drawing rectangle %.2fx%.2f", r.Width, r.Height))
}

func (v *DrawingVisitor) VisitTriangle(t *Triangle) {
    v.Output = append(v.Output, fmt.Sprintf("Drawing triangle base=%.2f height=%.2f", t.Base, t.Height))
}

// Usage
func main() {
    shapes := []Shape{
        &Circle{Radius: 5},
        &Rectangle{Width: 4, Height: 3},
        &Triangle{Base: 6, Height: 4},
    }

    // Calculate total area
    areaCalc := &AreaCalculator{}
    for _, shape := range shapes {
        shape.Accept(areaCalc)
    }
    fmt.Printf("Total area: %.2f\n", areaCalc.TotalArea)

    // Draw all shapes
    drawer := &DrawingVisitor{}
    for _, shape := range shapes {
        shape.Accept(drawer)
    }
    for _, line := range drawer.Output {
        fmt.Println(line)
    }
}
```

### AST Visitor

```go
package ast

// AST Node interface
type Node interface {
    Accept(v Visitor) any
}

// Expression types
type NumberExpr struct {
    Value float64
}

func (n *NumberExpr) Accept(v Visitor) any {
    return v.VisitNumber(n)
}

type BinaryExpr struct {
    Left     Node
    Operator string
    Right    Node
}

func (b *BinaryExpr) Accept(v Visitor) any {
    return v.VisitBinary(b)
}

type UnaryExpr struct {
    Operator string
    Operand  Node
}

func (u *UnaryExpr) Accept(v Visitor) any {
    return v.VisitUnary(u)
}

// Visitor interface
type Visitor interface {
    VisitNumber(n *NumberExpr) any
    VisitBinary(b *BinaryExpr) any
    VisitUnary(u *UnaryExpr) any
}

// Evaluator visitor
type Evaluator struct{}

func (e *Evaluator) VisitNumber(n *NumberExpr) any {
    return n.Value
}

func (e *Evaluator) VisitBinary(b *BinaryExpr) any {
    left := b.Left.Accept(e).(float64)
    right := b.Right.Accept(e).(float64)

    switch b.Operator {
    case "+":
        return left + right
    case "-":
        return left - right
    case "*":
        return left * right
    case "/":
        return left / right
    default:
        panic("unknown operator: " + b.Operator)
    }
}

func (e *Evaluator) VisitUnary(u *UnaryExpr) any {
    operand := u.Operand.Accept(e).(float64)
    switch u.Operator {
    case "-":
        return -operand
    default:
        panic("unknown operator: " + u.Operator)
    }
}

// Printer visitor
type Printer struct{}

func (p *Printer) VisitNumber(n *NumberExpr) any {
    return fmt.Sprintf("%.2f", n.Value)
}

func (p *Printer) VisitBinary(b *BinaryExpr) any {
    left := b.Left.Accept(p).(string)
    right := b.Right.Accept(p).(string)
    return fmt.Sprintf("(%s %s %s)", left, b.Operator, right)
}

func (p *Printer) VisitUnary(u *UnaryExpr) any {
    operand := u.Operand.Accept(p).(string)
    return fmt.Sprintf("(%s%s)", u.Operator, operand)
}

// Usage: Expression tree for: (3 + 4) * 2
func main() {
    expr := &BinaryExpr{
        Left: &BinaryExpr{
            Left:     &NumberExpr{Value: 3},
            Operator: "+",
            Right:    &NumberExpr{Value: 4},
        },
        Operator: "*",
        Right:    &NumberExpr{Value: 2},
    }

    evaluator := &Evaluator{}
    result := expr.Accept(evaluator).(float64)
    fmt.Printf("Result: %.2f\n", result) // 14.00

    printer := &Printer{}
    str := expr.Accept(printer).(string)
    fmt.Printf("Expression: %s\n", str) // ((3.00 + 4.00) * 2.00)
}
```

---

## Concurrency Patterns

### Circuit Breaker

```go
package circuit

import (
    "errors"
    "sync"
    "time"
)

type State int

const (
    StateClosed State = iota
    StateOpen
    StateHalfOpen
)

var ErrCircuitOpen = errors.New("circuit breaker is open")

type CircuitBreaker struct {
    maxFailures   int
    resetTimeout  time.Duration
    halfOpenMax   int

    mu            sync.RWMutex
    state         State
    failures      int
    lastFailure   time.Time
    halfOpenCount int
}

func NewCircuitBreaker(maxFailures int, resetTimeout time.Duration) *CircuitBreaker {
    return &CircuitBreaker{
        maxFailures:  maxFailures,
        resetTimeout: resetTimeout,
        halfOpenMax:  1,
        state:        StateClosed,
    }
}

func (cb *CircuitBreaker) Execute(fn func() error) error {
    if !cb.allowRequest() {
        return ErrCircuitOpen
    }

    err := fn()

    cb.recordResult(err)
    return err
}

func (cb *CircuitBreaker) allowRequest() bool {
    cb.mu.Lock()
    defer cb.mu.Unlock()

    switch cb.state {
    case StateClosed:
        return true
    case StateOpen:
        if time.Since(cb.lastFailure) > cb.resetTimeout {
            cb.state = StateHalfOpen
            cb.halfOpenCount = 0
            return true
        }
        return false
    case StateHalfOpen:
        if cb.halfOpenCount < cb.halfOpenMax {
            cb.halfOpenCount++
            return true
        }
        return false
    }
    return false
}

func (cb *CircuitBreaker) recordResult(err error) {
    cb.mu.Lock()
    defer cb.mu.Unlock()

    if err != nil {
        cb.failures++
        cb.lastFailure = time.Now()

        if cb.failures >= cb.maxFailures {
            cb.state = StateOpen
        }
    } else {
        if cb.state == StateHalfOpen {
            cb.state = StateClosed
        }
        cb.failures = 0
    }
}

// Usage
func main() {
    cb := NewCircuitBreaker(3, 10*time.Second)

    callExternalAPI := func() error {
        return cb.Execute(func() error {
            resp, err := http.Get("https://api.example.com/data")
            if err != nil {
                return err
            }
            defer resp.Body.Close()
            return nil
        })
    }

    for i := 0; i < 10; i++ {
        err := callExternalAPI()
        if errors.Is(err, ErrCircuitOpen) {
            fmt.Println("Circuit open, skipping request")
        } else if err != nil {
            fmt.Println("Request failed:", err)
        }
    }
}
```

### Retry with Backoff

```go
package retry

import (
    "context"
    "math"
    "time"
)

type BackoffStrategy func(attempt int) time.Duration

func ConstantBackoff(d time.Duration) BackoffStrategy {
    return func(attempt int) time.Duration {
        return d
    }
}

func ExponentialBackoff(base time.Duration, maxDelay time.Duration) BackoffStrategy {
    return func(attempt int) time.Duration {
        delay := base * time.Duration(math.Pow(2, float64(attempt)))
        if delay > maxDelay {
            return maxDelay
        }
        return delay
    }
}

func Retry[T any](
    ctx context.Context,
    maxAttempts int,
    backoff BackoffStrategy,
    fn func() (T, error),
) (T, error) {
    var lastErr error
    var zero T

    for attempt := 0; attempt < maxAttempts; attempt++ {
        result, err := fn()
        if err == nil {
            return result, nil
        }

        lastErr = err

        if attempt < maxAttempts-1 {
            delay := backoff(attempt)
            select {
            case <-time.After(delay):
            case <-ctx.Done():
                return zero, ctx.Err()
            }
        }
    }

    return zero, fmt.Errorf("max attempts reached: %w", lastErr)
}

// Usage
func main() {
    ctx := context.Background()

    result, err := Retry(ctx, 5, ExponentialBackoff(100*time.Millisecond, 5*time.Second), func() (string, error) {
        resp, err := http.Get("https://api.example.com/data")
        if err != nil {
            return "", err
        }
        defer resp.Body.Close()
        // ...
        return "success", nil
    })

    if err != nil {
        log.Fatal(err)
    }
    fmt.Println(result)
}
```

---

## Interview Questions

### Q1: When would you use Strategy vs State pattern?

**Answer**:
- **Strategy**: Client explicitly chooses the algorithm. The algorithms are independent and interchangeable.
- **State**: State changes automatically based on context. The object's behavior changes transparently.

```go
// Strategy: Client chooses
processor.SetStrategy(NewCreditCardStrategy(card))
processor.ProcessPayment(amount)

// State: Transitions happen internally
order.Pay()   // pending -> paid (automatic)
order.Ship()  // paid -> shipped (automatic)
```

### Q2: How does Go's middleware pattern implement Chain of Responsibility?

**Answer**: Each middleware is a handler that can either handle the request or pass it to the next handler in the chain:

```go
func AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if !isAuthorized(r) {
            http.Error(w, "Unauthorized", 401)
            return // Chain stops
        }
        next.ServeHTTP(w, r) // Pass to next handler
    })
}
```

### Q3: What's the difference between Observer with channels vs callbacks?

**Answer**:

| Aspect | Channels | Callbacks |
|--------|----------|-----------|
| Decoupling | Higher (no function reference) | Lower (needs function reference) |
| Async | Built-in (goroutines) | Manual |
| Flow control | Buffered channels | None |
| Unsubscribe | Close channel | Track and remove callback |

### Q4: How would you implement undo functionality for a drawing app?

**Answer**: Use Command pattern:

```go
type DrawCommand interface {
    Execute(*Canvas)
    Undo(*Canvas)
}

type DrawLineCommand struct {
    from, to   Point
    previousPixels []Pixel // For undo
}

func (c *DrawLineCommand) Execute(canvas *Canvas) {
    c.previousPixels = canvas.GetPixels(c.from, c.to) // Save state
    canvas.DrawLine(c.from, c.to)
}

func (c *DrawLineCommand) Undo(canvas *Canvas) {
    canvas.RestorePixels(c.previousPixels)
}
```

---

## Quick Reference

### Pattern Summary

| Pattern | Purpose | Go Implementation |
|---------|---------|-------------------|
| Chain of Responsibility | Sequential handlers | Middleware chain |
| Command | Encapsulate operations | Command interface |
| Iterator | Sequential access | `iter.Seq`, channels |
| Mediator | Centralize communication | Event bus |
| Memento | State snapshots | Snapshot struct |
| Observer | Event notification | Channels, callbacks |
| State | State-dependent behavior | State interface |
| Strategy | Swappable algorithms | Interface or func type |
| Template Method | Algorithm skeleton | Embedding + hooks |
| Visitor | External operations | Visitor interface |

### Go-Specific Patterns

```go
// Middleware (Chain of Responsibility)
type Middleware func(http.Handler) http.Handler

// Strategy as function
type Strategy func(input) output

// Observer with channels
ch := subject.Subscribe()
for event := range ch { ... }

// Iterator (Go 1.23+)
func Items() iter.Seq[Item] {
    return func(yield func(Item) bool) { ... }
}
```

---

## Resources

- [Go Patterns - Behavioral](https://github.com/tmrts/go-patterns#behavioral-patterns)
- [iter package documentation](https://pkg.go.dev/iter) — Go 1.23+ iterators
- [Go Concurrency Patterns](https://go.dev/blog/pipelines) — Fan-in/Fan-out
- [Context package](https://pkg.go.dev/context) — Cancellation and timeouts

---

**Previous**: [10-design-patterns-structural.md](10-design-patterns-structural.md) — Structural Design Patterns

**Next**: [12-anti-patterns.md](12-anti-patterns.md) — Anti-Patterns and Best Practices to Avoid
