# Go Structural Design Patterns

> Patterns for composing types to form larger structures

Structural patterns explain how to assemble objects and classes into larger structures while keeping these structures flexible and efficient. Go's composition-over-inheritance philosophy makes these patterns particularly elegant and powerful.

**Reading time**: 50-60 minutes

---

## Table of Contents

1. [Pattern Selection Guide](#pattern-selection-guide)
2. [Adapter](#adapter)
3. [Bridge](#bridge)
4. [Composite](#composite)
5. [Decorator](#decorator)
6. [Facade](#facade)
7. [Flyweight](#flyweight)
8. [Proxy](#proxy)
9. [Accept Interfaces Return Structs](#accept-interfaces-return-structs)
10. [Interview Questions](#interview-questions)
11. [Quick Reference](#quick-reference)

---

## Pattern Selection Guide

```
                ┌────────────────────────────────┐
                │ Need to compose objects/types? │
                └───────────────┬────────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ Incompatible    │   │ Add behavior    │   │ Simplify        │
│ interfaces?     │   │ dynamically?    │   │ complex system? │
└────────┬────────┘   └────────┬────────┘   └────────┬────────┘
         │                     │                     │
         ▼                     ▼                     ▼
    ┌─────────┐          ┌───────────┐          ┌─────────┐
    │ ADAPTER │          │ DECORATOR │          │ FACADE  │
    └─────────┘          └───────────┘          └─────────┘

         ┌──────────────────────┼──────────────────────┐
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ Tree structure  │   │ Control access  │   │ Many similar    │
│ part-whole?     │   │ or lazy load?   │   │ objects?        │
└────────┬────────┘   └────────┬────────┘   └────────┬────────┘
         │                     │                     │
         ▼                     ▼                     ▼
    ┌───────────┐          ┌─────────┐          ┌───────────┐
    │ COMPOSITE │          │  PROXY  │          │ FLYWEIGHT │
    └───────────┘          └─────────┘          └───────────┘
```

### Quick Decision Table

| Scenario | Pattern | Go Implementation |
|----------|---------|-------------------|
| Third-party library doesn't match your interface | Adapter | Wrapper struct with embedding |
| Separate abstraction from implementation | Bridge | Interface + multiple implementations |
| Tree structures (files, menus, organizations) | Composite | Shared interface for leaf and container |
| Add behavior without modifying code | Decorator | Wrapping with same interface |
| Simplify complex subsystem | Facade | Single entry point function/struct |
| Share data among many objects | Flyweight | Shared immutable state + `sync.Map` |
| Lazy loading, caching, or access control | Proxy | Same interface, different behavior |

---

## Adapter

> Convert the interface of a type into another interface clients expect.

### When to Use

- Integrating third-party libraries with different interfaces
- Wrapping legacy code
- Making incompatible interfaces work together

### Object Adapter (Embedding)

```go
package adapter

import (
    "encoding/json"
    "encoding/xml"
)

// Target interface that our system uses
type DataProcessor interface {
    Process(data []byte) (map[string]any, error)
}

// Adaptee: Third-party XML library with different interface
type XMLParser struct{}

func (p *XMLParser) ParseXML(xmlData []byte) (*XMLDocument, error) {
    var doc XMLDocument
    err := xml.Unmarshal(xmlData, &doc)
    return &doc, err
}

type XMLDocument struct {
    Root map[string]any `xml:"root"`
}

// Adapter: Wraps XMLParser to implement DataProcessor
type XMLAdapter struct {
    parser *XMLParser // Composition, not inheritance
}

func NewXMLAdapter() *XMLAdapter {
    return &XMLAdapter{parser: &XMLParser{}}
}

// Process adapts XMLParser.ParseXML to DataProcessor interface
func (a *XMLAdapter) Process(data []byte) (map[string]any, error) {
    doc, err := a.parser.ParseXML(data)
    if err != nil {
        return nil, err
    }
    return doc.Root, nil
}

// JSON processor already matches our interface
type JSONProcessor struct{}

func (p *JSONProcessor) Process(data []byte) (map[string]any, error) {
    var result map[string]any
    err := json.Unmarshal(data, &result)
    return result, err
}

// Client code works with any DataProcessor
func HandleData(processor DataProcessor, data []byte) error {
    result, err := processor.Process(data)
    if err != nil {
        return err
    }
    // Use result...
    fmt.Printf("Processed: %v\n", result)
    return nil
}

// Usage
func main() {
    jsonData := []byte(`{"name": "John", "age": 30}`)
    xmlData := []byte(`<root><name>Jane</name><age>25</age></root>`)

    // Both work with the same interface
    HandleData(&JSONProcessor{}, jsonData)
    HandleData(NewXMLAdapter(), xmlData)
}
```

### Function Adapter (http.HandlerFunc Pattern)

Go's standard library uses this pattern extensively:

```go
package main

import "net/http"

// Handler is the target interface
type Handler interface {
    ServeHTTP(ResponseWriter, *Request)
}

// HandlerFunc is an adapter that allows functions to be used as handlers
type HandlerFunc func(ResponseWriter, *Request)

// ServeHTTP calls the function itself
func (f HandlerFunc) ServeHTTP(w ResponseWriter, r *Request) {
    f(w, r)
}

// Usage: Ordinary function adapted to Handler interface
func helloHandler(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte("Hello, World!"))
}

func main() {
    // http.HandlerFunc adapts the function to http.Handler
    http.Handle("/hello", http.HandlerFunc(helloHandler))

    // Shortcut: http.HandleFunc does this automatically
    http.HandleFunc("/hello2", helloHandler)
}
```

### Type Adapter

```go
package storage

import "io"

// Our interface
type Storage interface {
    Store(key string, data io.Reader) error
    Retrieve(key string) (io.ReadCloser, error)
}

// Third-party S3 client with different method names
type S3Client struct {
    bucket string
}

func (c *S3Client) PutObject(bucket, key string, body io.Reader) error {
    // S3-specific implementation
    return nil
}

func (c *S3Client) GetObject(bucket, key string) (io.ReadCloser, error) {
    // S3-specific implementation
    return nil, nil
}

// Adapter wraps S3Client to implement Storage
type S3StorageAdapter struct {
    client *S3Client
    bucket string
}

func NewS3Storage(bucket string) *S3StorageAdapter {
    return &S3StorageAdapter{
        client: &S3Client{bucket: bucket},
        bucket: bucket,
    }
}

func (a *S3StorageAdapter) Store(key string, data io.Reader) error {
    return a.client.PutObject(a.bucket, key, data)
}

func (a *S3StorageAdapter) Retrieve(key string) (io.ReadCloser, error) {
    return a.client.GetObject(a.bucket, key)
}

// Now S3 can be used anywhere Storage is expected
func backup(s Storage, data io.Reader) error {
    return s.Store("backup-"+time.Now().Format("2006-01-02"), data)
}
```

---

## Bridge

> Decouple an abstraction from its implementation so the two can vary independently.

### When to Use

- Platform-independent code (notifications, rendering, persistence)
- When both abstraction and implementation should be extensible
- Avoiding class explosion from combinations

### Notification System Example

```go
package notification

// Implementation interface (the "bridge")
type MessageSender interface {
    Send(to, message string) error
}

// Concrete implementations
type EmailSender struct {
    smtpHost string
    smtpPort int
}

func (e *EmailSender) Send(to, message string) error {
    fmt.Printf("Sending email to %s: %s\n", to, message)
    // SMTP implementation
    return nil
}

type SMSSender struct {
    apiKey string
}

func (s *SMSSender) Send(to, message string) error {
    fmt.Printf("Sending SMS to %s: %s\n", to, message)
    // Twilio/SMS gateway implementation
    return nil
}

type SlackSender struct {
    webhookURL string
}

func (s *SlackSender) Send(to, message string) error {
    fmt.Printf("Sending Slack message to %s: %s\n", to, message)
    // Slack webhook implementation
    return nil
}

type PushSender struct {
    appID string
}

func (p *PushSender) Send(to, message string) error {
    fmt.Printf("Sending push notification to %s: %s\n", to, message)
    // Firebase/APNs implementation
    return nil
}

// Abstraction: Different notification types use the same sender interface
type Notification struct {
    sender MessageSender
}

func NewNotification(sender MessageSender) *Notification {
    return &Notification{sender: sender}
}

func (n *Notification) Send(to, message string) error {
    return n.sender.Send(to, message)
}

// Extended abstractions
type UrgentNotification struct {
    Notification
}

func NewUrgentNotification(sender MessageSender) *UrgentNotification {
    return &UrgentNotification{Notification{sender: sender}}
}

func (u *UrgentNotification) Send(to, message string) error {
    urgentMessage := "🚨 URGENT: " + message
    return u.sender.Send(to, urgentMessage)
}

type ScheduledNotification struct {
    Notification
    sendAt time.Time
}

func NewScheduledNotification(sender MessageSender, sendAt time.Time) *ScheduledNotification {
    return &ScheduledNotification{
        Notification: Notification{sender: sender},
        sendAt:       sendAt,
    }
}

func (s *ScheduledNotification) Send(to, message string) error {
    time.Sleep(time.Until(s.sendAt)) // Simplified; use a scheduler in practice
    return s.sender.Send(to, message)
}

// Usage: Mix and match abstractions with implementations
func main() {
    // Any notification type can use any sender
    emailSender := &EmailSender{smtpHost: "smtp.example.com", smtpPort: 587}
    smsSender := &SMSSender{apiKey: "xxx"}
    slackSender := &SlackSender{webhookURL: "https://hooks.slack.com/..."}

    // Regular notification via email
    notification := NewNotification(emailSender)
    notification.Send("user@example.com", "Your order has shipped")

    // Urgent notification via SMS
    urgent := NewUrgentNotification(smsSender)
    urgent.Send("+1234567890", "Server is down!")

    // Urgent notification via Slack (same abstraction, different implementation)
    urgentSlack := NewUrgentNotification(slackSender)
    urgentSlack.Send("#alerts", "Database connection pool exhausted")
}
```

### Renderer Bridge Example

```go
package renderer

// Implementation: How to render
type RenderEngine interface {
    RenderText(text string) string
    RenderImage(src string, alt string) string
    RenderLink(href string, text string) string
}

// HTML implementation
type HTMLRenderer struct{}

func (r *HTMLRenderer) RenderText(text string) string {
    return fmt.Sprintf("<p>%s</p>", html.EscapeString(text))
}

func (r *HTMLRenderer) RenderImage(src, alt string) string {
    return fmt.Sprintf(`<img src="%s" alt="%s">`, src, alt)
}

func (r *HTMLRenderer) RenderLink(href, text string) string {
    return fmt.Sprintf(`<a href="%s">%s</a>`, href, text)
}

// Markdown implementation
type MarkdownRenderer struct{}

func (r *MarkdownRenderer) RenderText(text string) string {
    return text + "\n\n"
}

func (r *MarkdownRenderer) RenderImage(src, alt string) string {
    return fmt.Sprintf("![%s](%s)", alt, src)
}

func (r *MarkdownRenderer) RenderLink(href, text string) string {
    return fmt.Sprintf("[%s](%s)", text, href)
}

// JSON implementation
type JSONRenderer struct{}

func (r *JSONRenderer) RenderText(text string) string {
    return fmt.Sprintf(`{"type":"text","content":"%s"}`, text)
}

func (r *JSONRenderer) RenderImage(src, alt string) string {
    return fmt.Sprintf(`{"type":"image","src":"%s","alt":"%s"}`, src, alt)
}

func (r *JSONRenderer) RenderLink(href, text string) string {
    return fmt.Sprintf(`{"type":"link","href":"%s","text":"%s"}`, href, text)
}

// Abstraction: What to render
type Document struct {
    renderer RenderEngine
    content  []string
}

func NewDocument(renderer RenderEngine) *Document {
    return &Document{renderer: renderer}
}

func (d *Document) AddParagraph(text string) {
    d.content = append(d.content, d.renderer.RenderText(text))
}

func (d *Document) AddImage(src, alt string) {
    d.content = append(d.content, d.renderer.RenderImage(src, alt))
}

func (d *Document) AddLink(href, text string) {
    d.content = append(d.content, d.renderer.RenderLink(href, text))
}

func (d *Document) Render() string {
    return strings.Join(d.content, "\n")
}

// Usage
func main() {
    // Same document, different output formats
    htmlDoc := NewDocument(&HTMLRenderer{})
    htmlDoc.AddParagraph("Hello, World!")
    htmlDoc.AddImage("/logo.png", "Logo")
    htmlDoc.AddLink("https://go.dev", "Go Website")
    fmt.Println(htmlDoc.Render())

    mdDoc := NewDocument(&MarkdownRenderer{})
    mdDoc.AddParagraph("Hello, World!")
    mdDoc.AddImage("/logo.png", "Logo")
    mdDoc.AddLink("https://go.dev", "Go Website")
    fmt.Println(mdDoc.Render())
}
```

---

## Composite

> Compose objects into tree structures to represent part-whole hierarchies.

### When to Use

- Tree structures (file systems, menus, organizations)
- Treating individual objects and compositions uniformly
- Recursive structures

### File System Example

```go
package filesystem

// Component interface - common for files and directories
type FileSystemNode interface {
    Name() string
    Size() int64
    Print(indent string)
    IsDir() bool
}

// Leaf: File
type File struct {
    name string
    size int64
}

func NewFile(name string, size int64) *File {
    return &File{name: name, size: size}
}

func (f *File) Name() string { return f.name }
func (f *File) Size() int64  { return f.size }
func (f *File) IsDir() bool  { return false }

func (f *File) Print(indent string) {
    fmt.Printf("%s📄 %s (%d bytes)\n", indent, f.name, f.size)
}

// Composite: Directory
type Directory struct {
    name     string
    children []FileSystemNode
}

func NewDirectory(name string) *Directory {
    return &Directory{name: name, children: []FileSystemNode{}}
}

func (d *Directory) Name() string { return d.name }
func (d *Directory) IsDir() bool  { return true }

// Size recursively calculates total size
func (d *Directory) Size() int64 {
    var total int64
    for _, child := range d.children {
        total += child.Size()
    }
    return total
}

func (d *Directory) Add(node FileSystemNode) {
    d.children = append(d.children, node)
}

func (d *Directory) Remove(name string) {
    for i, child := range d.children {
        if child.Name() == name {
            d.children = append(d.children[:i], d.children[i+1:]...)
            return
        }
    }
}

func (d *Directory) Print(indent string) {
    fmt.Printf("%s📁 %s/ (%d bytes total)\n", indent, d.name, d.Size())
    for _, child := range d.children {
        child.Print(indent + "  ")
    }
}

// Find searches recursively
func (d *Directory) Find(name string) FileSystemNode {
    for _, child := range d.children {
        if child.Name() == name {
            return child
        }
        if dir, ok := child.(*Directory); ok {
            if found := dir.Find(name); found != nil {
                return found
            }
        }
    }
    return nil
}

// Usage
func main() {
    // Build tree structure
    root := NewDirectory("project")

    src := NewDirectory("src")
    src.Add(NewFile("main.go", 1024))
    src.Add(NewFile("utils.go", 512))

    handlers := NewDirectory("handlers")
    handlers.Add(NewFile("user.go", 2048))
    handlers.Add(NewFile("order.go", 1536))
    src.Add(handlers)

    tests := NewDirectory("tests")
    tests.Add(NewFile("main_test.go", 768))
    tests.Add(NewFile("utils_test.go", 256))

    root.Add(src)
    root.Add(tests)
    root.Add(NewFile("go.mod", 128))
    root.Add(NewFile("README.md", 2048))

    // Uniform interface for files and directories
    root.Print("")
    // 📁 project/ (8320 bytes total)
    //   📁 src/ (5120 bytes total)
    //     📄 main.go (1024 bytes)
    //     📄 utils.go (512 bytes)
    //     📁 handlers/ (3584 bytes total)
    //       📄 user.go (2048 bytes)
    //       📄 order.go (1536 bytes)
    //   📁 tests/ (1024 bytes total)
    //     📄 main_test.go (768 bytes)
    //     📄 utils_test.go (256 bytes)
    //   📄 go.mod (128 bytes)
    //   📄 README.md (2048 bytes)
}
```

### Menu System Example

```go
package menu

// MenuItem interface
type MenuItem interface {
    Name() string
    Execute()
    Print(indent int)
}

// Leaf: Action item
type ActionItem struct {
    name   string
    action func()
}

func NewActionItem(name string, action func()) *ActionItem {
    return &ActionItem{name: name, action: action}
}

func (a *ActionItem) Name() string { return a.name }
func (a *ActionItem) Execute()     { a.action() }

func (a *ActionItem) Print(indent int) {
    fmt.Printf("%s• %s\n", strings.Repeat("  ", indent), a.name)
}

// Composite: Submenu
type SubMenu struct {
    name  string
    items []MenuItem
}

func NewSubMenu(name string) *SubMenu {
    return &SubMenu{name: name}
}

func (s *SubMenu) Name() string { return s.name }

func (s *SubMenu) Add(item MenuItem) {
    s.items = append(s.items, item)
}

func (s *SubMenu) Execute() {
    fmt.Printf("Opening submenu: %s\n", s.name)
    for i, item := range s.items {
        fmt.Printf("  [%d] %s\n", i+1, item.Name())
    }
}

func (s *SubMenu) Print(indent int) {
    fmt.Printf("%s▶ %s\n", strings.Repeat("  ", indent), s.name)
    for _, item := range s.items {
        item.Print(indent + 1)
    }
}

// Usage
func main() {
    // File menu
    fileMenu := NewSubMenu("File")
    fileMenu.Add(NewActionItem("New", func() { fmt.Println("Creating new file...") }))
    fileMenu.Add(NewActionItem("Open", func() { fmt.Println("Opening file...") }))
    fileMenu.Add(NewActionItem("Save", func() { fmt.Println("Saving file...") }))

    // Recent submenu inside File
    recentMenu := NewSubMenu("Recent Files")
    recentMenu.Add(NewActionItem("document.txt", func() { fmt.Println("Opening document.txt") }))
    recentMenu.Add(NewActionItem("notes.md", func() { fmt.Println("Opening notes.md") }))
    fileMenu.Add(recentMenu)

    // Edit menu
    editMenu := NewSubMenu("Edit")
    editMenu.Add(NewActionItem("Undo", func() { fmt.Println("Undo...") }))
    editMenu.Add(NewActionItem("Redo", func() { fmt.Println("Redo...") }))
    editMenu.Add(NewActionItem("Cut", func() { fmt.Println("Cut...") }))
    editMenu.Add(NewActionItem("Copy", func() { fmt.Println("Copy...") }))
    editMenu.Add(NewActionItem("Paste", func() { fmt.Println("Paste...") }))

    // Main menu bar
    menuBar := NewSubMenu("Menu Bar")
    menuBar.Add(fileMenu)
    menuBar.Add(editMenu)

    menuBar.Print(0)
}
```

---

## Decorator

> Attach additional responsibilities to an object dynamically.

### When to Use

- Adding behavior without modifying existing code
- Combining behaviors flexibly
- Middleware chains

### io.Reader Decorator Chain

```go
package decorator

import (
    "compress/gzip"
    "crypto/aes"
    "crypto/cipher"
    "encoding/base64"
    "io"
)

// Base reader decoration using io.Reader interface

// CountingReader tracks bytes read
type CountingReader struct {
    reader    io.Reader
    BytesRead int64
}

func NewCountingReader(r io.Reader) *CountingReader {
    return &CountingReader{reader: r}
}

func (c *CountingReader) Read(p []byte) (int, error) {
    n, err := c.reader.Read(p)
    c.BytesRead += int64(n)
    return n, err
}

// LoggingReader logs read operations
type LoggingReader struct {
    reader io.Reader
    logger *slog.Logger
}

func NewLoggingReader(r io.Reader, logger *slog.Logger) *LoggingReader {
    return &LoggingReader{reader: r, logger: logger}
}

func (l *LoggingReader) Read(p []byte) (int, error) {
    n, err := l.reader.Read(p)
    l.logger.Debug("read operation", "bytes", n, "error", err)
    return n, err
}

// LimitedReader limits total bytes read
type LimitedReader struct {
    reader    io.Reader
    remaining int64
}

func NewLimitedReader(r io.Reader, limit int64) *LimitedReader {
    return &LimitedReader{reader: r, remaining: limit}
}

func (l *LimitedReader) Read(p []byte) (int, error) {
    if l.remaining <= 0 {
        return 0, io.EOF
    }
    if int64(len(p)) > l.remaining {
        p = p[:l.remaining]
    }
    n, err := l.reader.Read(p)
    l.remaining -= int64(n)
    return n, err
}

// Usage: Stack decorators
func main() {
    file, _ := os.Open("data.txt")
    defer file.Close()

    // Decorate: file -> limited -> counting -> logging
    limited := NewLimitedReader(file, 1024*1024) // 1MB limit
    counting := NewCountingReader(limited)
    logged := NewLoggingReader(counting, slog.Default())

    // Read through the decorator chain
    data, _ := io.ReadAll(logged)

    fmt.Printf("Read %d bytes\n", counting.BytesRead)
    fmt.Printf("Data: %s\n", data[:100])
}
```

### HTTP Middleware Decorator

```go
package middleware

import (
    "log/slog"
    "net/http"
    "time"
)

// Decorator pattern for HTTP handlers

// Logging middleware
func WithLogging(logger *slog.Logger) func(http.Handler) http.Handler {
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

// Response wrapper to capture status code
type responseWriter struct {
    http.ResponseWriter
    status int
}

func (rw *responseWriter) WriteHeader(code int) {
    rw.status = code
    rw.ResponseWriter.WriteHeader(code)
}

// Metrics middleware
func WithMetrics(collector MetricsCollector) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            start := time.Now()
            rw := &responseWriter{ResponseWriter: w, status: http.StatusOK}

            next.ServeHTTP(rw, r)

            collector.RecordRequest(r.Method, r.URL.Path, rw.status, time.Since(start))
        })
    }
}

// Authentication middleware
func WithAuth(validator TokenValidator) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            token := r.Header.Get("Authorization")
            if token == "" {
                http.Error(w, "Unauthorized", http.StatusUnauthorized)
                return
            }

            user, err := validator.Validate(token)
            if err != nil {
                http.Error(w, "Invalid token", http.StatusUnauthorized)
                return
            }

            // Add user to context
            ctx := context.WithValue(r.Context(), userKey, user)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

// Rate limiting middleware
func WithRateLimit(rps int) func(http.Handler) http.Handler {
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
func WithRecovery(logger *slog.Logger) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            defer func() {
                if err := recover(); err != nil {
                    logger.Error("panic recovered", "error", err, "stack", debug.Stack())
                    http.Error(w, "Internal Server Error", http.StatusInternalServerError)
                }
            }()
            next.ServeHTTP(w, r)
        })
    }
}

// Chain helper function
func Chain(h http.Handler, middlewares ...func(http.Handler) http.Handler) http.Handler {
    for i := len(middlewares) - 1; i >= 0; i-- {
        h = middlewares[i](h)
    }
    return h
}

// Usage
func main() {
    logger := slog.Default()
    handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("Hello, World!"))
    })

    // Stack decorators
    decorated := Chain(
        handler,
        WithRecovery(logger),
        WithLogging(logger),
        WithRateLimit(100),
        WithAuth(&JWTValidator{}),
    )

    http.Handle("/api/", decorated)
    http.ListenAndServe(":8080", nil)
}
```

### Caching Decorator

```go
package cache

import (
    "sync"
    "time"
)

// DataFetcher interface
type DataFetcher interface {
    Fetch(key string) ([]byte, error)
}

// SlowFetcher - the real implementation
type SlowFetcher struct {
    baseURL string
}

func (f *SlowFetcher) Fetch(key string) ([]byte, error) {
    // Expensive operation (API call, database query, etc.)
    time.Sleep(100 * time.Millisecond)
    return []byte("data for " + key), nil
}

// CachingFetcher decorates any DataFetcher with caching
type CachingFetcher struct {
    fetcher DataFetcher
    cache   map[string]cacheEntry
    ttl     time.Duration
    mu      sync.RWMutex
}

type cacheEntry struct {
    data      []byte
    expiresAt time.Time
}

func NewCachingFetcher(f DataFetcher, ttl time.Duration) *CachingFetcher {
    return &CachingFetcher{
        fetcher: f,
        cache:   make(map[string]cacheEntry),
        ttl:     ttl,
    }
}

func (c *CachingFetcher) Fetch(key string) ([]byte, error) {
    // Check cache first
    c.mu.RLock()
    entry, ok := c.cache[key]
    c.mu.RUnlock()

    if ok && time.Now().Before(entry.expiresAt) {
        return entry.data, nil // Cache hit
    }

    // Cache miss - fetch from underlying fetcher
    data, err := c.fetcher.Fetch(key)
    if err != nil {
        return nil, err
    }

    // Store in cache
    c.mu.Lock()
    c.cache[key] = cacheEntry{
        data:      data,
        expiresAt: time.Now().Add(c.ttl),
    }
    c.mu.Unlock()

    return data, nil
}

// Usage
func main() {
    slowFetcher := &SlowFetcher{baseURL: "https://api.example.com"}
    cachedFetcher := NewCachingFetcher(slowFetcher, 5*time.Minute)

    // First call: slow (cache miss)
    start := time.Now()
    data, _ := cachedFetcher.Fetch("user:123")
    fmt.Printf("First call: %v (%s)\n", time.Since(start), data)

    // Second call: fast (cache hit)
    start = time.Now()
    data, _ = cachedFetcher.Fetch("user:123")
    fmt.Printf("Second call: %v (%s)\n", time.Since(start), data)
}
```

---

## Facade

> Provide a unified interface to a set of interfaces in a subsystem.

### When to Use

- Simplifying complex subsystems
- Reducing dependencies on external libraries
- Creating higher-level APIs

### Email Service Facade

```go
package email

import (
    "bytes"
    "html/template"
)

// Complex subsystem classes
type SMTPClient struct {
    host     string
    port     int
    username string
    password string
}

func (c *SMTPClient) Connect() error { /* ... */ return nil }
func (c *SMTPClient) Authenticate() error { /* ... */ return nil }
func (c *SMTPClient) SendMessage(from, to, subject, body string) error { /* ... */ return nil }
func (c *SMTPClient) Disconnect() error { /* ... */ return nil }

type TemplateEngine struct {
    templates map[string]*template.Template
}

func (e *TemplateEngine) Load(name, content string) error { /* ... */ return nil }
func (e *TemplateEngine) Render(name string, data any) (string, error) { /* ... */ return "", nil }

type AddressValidator struct{}

func (v *AddressValidator) Validate(email string) error { /* ... */ return nil }

type AttachmentHandler struct{}

func (h *AttachmentHandler) Encode(data []byte) string { /* ... */ return "" }
func (h *AttachmentHandler) CreateMIME(filename, contentType string, data []byte) string { /* ... */ return "" }

// Facade: Simple interface to the complex subsystem
type EmailService struct {
    smtp       *SMTPClient
    templates  *TemplateEngine
    validator  *AddressValidator
    attachment *AttachmentHandler
}

func NewEmailService(config EmailConfig) *EmailService {
    return &EmailService{
        smtp: &SMTPClient{
            host:     config.SMTPHost,
            port:     config.SMTPPort,
            username: config.Username,
            password: config.Password,
        },
        templates:  &TemplateEngine{templates: make(map[string]*template.Template)},
        validator:  &AddressValidator{},
        attachment: &AttachmentHandler{},
    }
}

// Simple method that orchestrates complex operations
func (s *EmailService) SendWelcomeEmail(to string, userData WelcomeData) error {
    // Validate
    if err := s.validator.Validate(to); err != nil {
        return fmt.Errorf("invalid email: %w", err)
    }

    // Render template
    body, err := s.templates.Render("welcome", userData)
    if err != nil {
        return fmt.Errorf("rendering template: %w", err)
    }

    // Connect and send
    if err := s.smtp.Connect(); err != nil {
        return fmt.Errorf("connecting to SMTP: %w", err)
    }
    defer s.smtp.Disconnect()

    if err := s.smtp.Authenticate(); err != nil {
        return fmt.Errorf("authenticating: %w", err)
    }

    if err := s.smtp.SendMessage("noreply@example.com", to, "Welcome!", body); err != nil {
        return fmt.Errorf("sending email: %w", err)
    }

    return nil
}

func (s *EmailService) SendWithAttachment(to, subject, body string, attachment []byte, filename string) error {
    if err := s.validator.Validate(to); err != nil {
        return err
    }

    mime := s.attachment.CreateMIME(filename, "application/octet-stream", attachment)
    fullBody := body + "\n\n" + mime

    if err := s.smtp.Connect(); err != nil {
        return err
    }
    defer s.smtp.Disconnect()

    if err := s.smtp.Authenticate(); err != nil {
        return err
    }

    return s.smtp.SendMessage("noreply@example.com", to, subject, fullBody)
}

// Usage: Client only interacts with the facade
func main() {
    emailService := NewEmailService(EmailConfig{
        SMTPHost: "smtp.example.com",
        SMTPPort: 587,
        Username: "user",
        Password: "pass",
    })

    // Simple API, complex internals hidden
    err := emailService.SendWelcomeEmail("user@example.com", WelcomeData{
        Name: "John",
        Link: "https://example.com/verify/abc123",
    })
    if err != nil {
        log.Fatal(err)
    }
}
```

### Database Migration Facade

```go
package migrations

// Complex subsystem
type SchemaReader struct{}
type SQLGenerator struct{}
type ConnectionPool struct{}
type TransactionManager struct{}
type VersionTracker struct{}

// Facade
type Migrator struct {
    schema      *SchemaReader
    generator   *SQLGenerator
    pool        *ConnectionPool
    transactions *TransactionManager
    versions    *VersionTracker
}

func NewMigrator(dsn string) *Migrator {
    return &Migrator{
        schema:       &SchemaReader{},
        generator:    &SQLGenerator{},
        pool:         NewConnectionPool(dsn),
        transactions: &TransactionManager{},
        versions:     &VersionTracker{},
    }
}

// Simple methods hide complexity
func (m *Migrator) Migrate() error {
    // Get current version
    current, err := m.versions.Current()
    if err != nil {
        return err
    }

    // Get pending migrations
    pending, err := m.schema.GetPendingMigrations(current)
    if err != nil {
        return err
    }

    // Apply each migration in a transaction
    for _, migration := range pending {
        tx, err := m.transactions.Begin()
        if err != nil {
            return err
        }

        sql := m.generator.Generate(migration)
        if err := tx.Exec(sql); err != nil {
            tx.Rollback()
            return err
        }

        if err := m.versions.Record(migration.Version); err != nil {
            tx.Rollback()
            return err
        }

        if err := tx.Commit(); err != nil {
            return err
        }
    }

    return nil
}

func (m *Migrator) Rollback(steps int) error {
    // Similar complexity hidden
    return nil
}

func (m *Migrator) Status() ([]MigrationStatus, error) {
    return m.versions.List()
}

// Usage
func main() {
    migrator := NewMigrator("postgres://localhost/mydb")

    // Simple API
    if err := migrator.Migrate(); err != nil {
        log.Fatal(err)
    }

    status, _ := migrator.Status()
    for _, s := range status {
        fmt.Printf("%s: %s\n", s.Version, s.AppliedAt)
    }
}
```

---

## Flyweight

> Share common parts of state between multiple objects to reduce memory usage.

### When to Use

- Large numbers of similar objects
- Objects share significant common data
- Memory optimization is critical

### Text Formatting Example

```go
package text

import "sync"

// Intrinsic state (shared): Character formatting
type CharacterStyle struct {
    FontFamily string
    FontSize   int
    Bold       bool
    Italic     bool
    Color      string
}

// Flyweight factory
type StyleFactory struct {
    styles map[string]*CharacterStyle
    mu     sync.RWMutex
}

func NewStyleFactory() *StyleFactory {
    return &StyleFactory{
        styles: make(map[string]*CharacterStyle),
    }
}

func (f *StyleFactory) GetStyle(family string, size int, bold, italic bool, color string) *CharacterStyle {
    key := fmt.Sprintf("%s-%d-%t-%t-%s", family, size, bold, italic, color)

    f.mu.RLock()
    if style, ok := f.styles[key]; ok {
        f.mu.RUnlock()
        return style
    }
    f.mu.RUnlock()

    f.mu.Lock()
    defer f.mu.Unlock()

    // Double-check after acquiring write lock
    if style, ok := f.styles[key]; ok {
        return style
    }

    style := &CharacterStyle{
        FontFamily: family,
        FontSize:   size,
        Bold:       bold,
        Italic:     italic,
        Color:      color,
    }
    f.styles[key] = style
    return style
}

// Extrinsic state (unique per character): Position, actual character
type Character struct {
    Char   rune
    X, Y   int
    Style  *CharacterStyle // Shared flyweight
}

// Document uses flyweights for styling
type Document struct {
    characters []*Character
    factory    *StyleFactory
}

func NewDocument() *Document {
    return &Document{
        factory: NewStyleFactory(),
    }
}

func (d *Document) AddCharacter(char rune, x, y int, family string, size int, bold, italic bool, color string) {
    style := d.factory.GetStyle(family, size, bold, italic, color)
    d.characters = append(d.characters, &Character{
        Char:  char,
        X:     x,
        Y:     y,
        Style: style, // Shared reference
    })
}

func (d *Document) Render() {
    for _, c := range d.characters {
        fmt.Printf("'%c' at (%d,%d) with %s %dpt\n",
            c.Char, c.X, c.Y, c.Style.FontFamily, c.Style.FontSize)
    }
}

func (d *Document) Stats() {
    fmt.Printf("Characters: %d\n", len(d.characters))
    fmt.Printf("Unique styles: %d\n", len(d.factory.styles))
    // Memory saved = (characters - unique styles) * size of CharacterStyle
}

// Usage
func main() {
    doc := NewDocument()

    // Many characters, few styles
    text := "Hello, World!"
    for i, char := range text {
        doc.AddCharacter(char, i*10, 0, "Arial", 12, false, false, "black")
    }

    doc.Stats()
    // Characters: 13
    // Unique styles: 1 (all share the same style!)
}
```

### Icon/Image Cache Example

```go
package icons

import (
    "image"
    "sync"
)

// Flyweight: Shared icon image data
type Icon struct {
    Name   string
    Image  image.Image
    Width  int
    Height int
}

// Flyweight factory with sync.Map for concurrent access
type IconCache struct {
    icons sync.Map // map[string]*Icon
    loader func(name string) (image.Image, error)
}

func NewIconCache(loader func(string) (image.Image, error)) *IconCache {
    return &IconCache{loader: loader}
}

func (c *IconCache) GetIcon(name string) (*Icon, error) {
    // Check cache
    if cached, ok := c.icons.Load(name); ok {
        return cached.(*Icon), nil
    }

    // Load icon
    img, err := c.loader(name)
    if err != nil {
        return nil, err
    }

    icon := &Icon{
        Name:   name,
        Image:  img,
        Width:  img.Bounds().Dx(),
        Height: img.Bounds().Dy(),
    }

    // Store (might race, but sync.Map handles it)
    actual, _ := c.icons.LoadOrStore(name, icon)
    return actual.(*Icon), nil
}

// Context: Position where icon is displayed (extrinsic state)
type IconInstance struct {
    Icon *Icon // Shared flyweight
    X, Y int   // Unique per instance
}

// Toolbar uses many icons, but they share image data
type Toolbar struct {
    icons []*IconInstance
    cache *IconCache
}

func NewToolbar(cache *IconCache) *Toolbar {
    return &Toolbar{cache: cache}
}

func (t *Toolbar) AddIcon(name string, x, y int) error {
    icon, err := t.cache.GetIcon(name)
    if err != nil {
        return err
    }
    t.icons = append(t.icons, &IconInstance{
        Icon: icon,
        X:    x,
        Y:    y,
    })
    return nil
}

// Usage
func main() {
    cache := NewIconCache(func(name string) (image.Image, error) {
        // Load from file or resources
        return loadIconFromDisk(name)
    })

    toolbar1 := NewToolbar(cache)
    toolbar1.AddIcon("save", 0, 0)
    toolbar1.AddIcon("open", 30, 0)
    toolbar1.AddIcon("save", 60, 0) // Reuses same Icon instance

    toolbar2 := NewToolbar(cache)
    toolbar2.AddIcon("save", 0, 0) // Still reuses the same Icon from cache

    // Two toolbars, multiple "save" buttons, but only ONE loaded image
}
```

---

## Proxy

> Provide a surrogate or placeholder for another object to control access.

### When to Use

- Lazy loading (virtual proxy)
- Access control (protection proxy)
- Caching (caching proxy)
- Logging/monitoring (logging proxy)
- Remote access (remote proxy)

### Virtual Proxy (Lazy Loading)

```go
package proxy

import (
    "fmt"
    "time"
)

// Subject interface
type Image interface {
    Display()
    GetInfo() string
}

// RealSubject: Expensive to create
type HighResImage struct {
    filename string
    data     []byte
}

func NewHighResImage(filename string) *HighResImage {
    fmt.Printf("Loading %s from disk...\n", filename)
    time.Sleep(2 * time.Second) // Simulate slow loading
    return &HighResImage{
        filename: filename,
        data:     loadImageData(filename),
    }
}

func (i *HighResImage) Display() {
    fmt.Printf("Displaying %s (%d bytes)\n", i.filename, len(i.data))
}

func (i *HighResImage) GetInfo() string {
    return fmt.Sprintf("Image: %s, Size: %d bytes", i.filename, len(i.data))
}

// Proxy: Delays loading until actually needed
type ImageProxy struct {
    filename string
    image    *HighResImage
}

func NewImageProxy(filename string) *ImageProxy {
    return &ImageProxy{filename: filename}
    // Note: Does NOT load the image yet
}

func (p *ImageProxy) Display() {
    if p.image == nil {
        p.image = NewHighResImage(p.filename) // Load on first use
    }
    p.image.Display()
}

func (p *ImageProxy) GetInfo() string {
    if p.image == nil {
        return fmt.Sprintf("Image: %s (not loaded)", p.filename)
    }
    return p.image.GetInfo()
}

// Usage
func main() {
    // Create proxies - instant, no loading
    images := []Image{
        NewImageProxy("photo1.jpg"),
        NewImageProxy("photo2.jpg"),
        NewImageProxy("photo3.jpg"),
    }

    fmt.Println("Proxies created, no images loaded yet")

    // Only load when displayed
    images[0].Display() // Loads photo1.jpg now

    // Other images still not loaded
    fmt.Println(images[1].GetInfo()) // "Image: photo2.jpg (not loaded)"
}
```

### Protection Proxy (Access Control)

```go
package proxy

// Document interface
type Document interface {
    Read() string
    Write(content string) error
    Delete() error
}

// RealDocument
type RealDocument struct {
    id      string
    content string
}

func (d *RealDocument) Read() string {
    return d.content
}

func (d *RealDocument) Write(content string) error {
    d.content = content
    return nil
}

func (d *RealDocument) Delete() error {
    d.content = ""
    return nil
}

// Permission levels
type Permission int

const (
    PermRead Permission = 1 << iota
    PermWrite
    PermDelete

    PermReadWrite = PermRead | PermWrite
    PermAll       = PermRead | PermWrite | PermDelete
)

// ProtectionProxy controls access based on permissions
type ProtectionProxy struct {
    document   *RealDocument
    userPerms  Permission
}

func NewProtectionProxy(doc *RealDocument, perms Permission) *ProtectionProxy {
    return &ProtectionProxy{
        document:  doc,
        userPerms: perms,
    }
}

func (p *ProtectionProxy) Read() string {
    if p.userPerms&PermRead == 0 {
        return "Access denied: no read permission"
    }
    return p.document.Read()
}

func (p *ProtectionProxy) Write(content string) error {
    if p.userPerms&PermWrite == 0 {
        return errors.New("access denied: no write permission")
    }
    return p.document.Write(content)
}

func (p *ProtectionProxy) Delete() error {
    if p.userPerms&PermDelete == 0 {
        return errors.New("access denied: no delete permission")
    }
    return p.document.Delete()
}

// Usage
func main() {
    doc := &RealDocument{id: "doc1", content: "Secret content"}

    // Read-only user
    readOnlyProxy := NewProtectionProxy(doc, PermRead)
    fmt.Println(readOnlyProxy.Read()) // Works
    readOnlyProxy.Write("New content") // Error: no write permission

    // Admin user
    adminProxy := NewProtectionProxy(doc, PermAll)
    adminProxy.Write("Updated content") // Works
    adminProxy.Delete() // Works
}
```

### Caching Proxy

```go
package proxy

import (
    "sync"
    "time"
)

// DataSource interface
type DataSource interface {
    Query(id string) (*Record, error)
}

// SlowDataSource: Database or API
type SlowDataSource struct {
    connectionString string
}

func (s *SlowDataSource) Query(id string) (*Record, error) {
    time.Sleep(100 * time.Millisecond) // Simulate slow query
    return &Record{ID: id, Data: "data for " + id}, nil
}

// CachingProxy caches results
type CachingProxy struct {
    source DataSource
    cache  map[string]*cacheEntry
    ttl    time.Duration
    mu     sync.RWMutex
}

type cacheEntry struct {
    record    *Record
    expiresAt time.Time
}

func NewCachingProxy(source DataSource, ttl time.Duration) *CachingProxy {
    return &CachingProxy{
        source: source,
        cache:  make(map[string]*cacheEntry),
        ttl:    ttl,
    }
}

func (p *CachingProxy) Query(id string) (*Record, error) {
    // Check cache
    p.mu.RLock()
    entry, ok := p.cache[id]
    p.mu.RUnlock()

    if ok && time.Now().Before(entry.expiresAt) {
        return entry.record, nil // Cache hit
    }

    // Cache miss - query source
    record, err := p.source.Query(id)
    if err != nil {
        return nil, err
    }

    // Update cache
    p.mu.Lock()
    p.cache[id] = &cacheEntry{
        record:    record,
        expiresAt: time.Now().Add(p.ttl),
    }
    p.mu.Unlock()

    return record, nil
}

// Invalidate removes entry from cache
func (p *CachingProxy) Invalidate(id string) {
    p.mu.Lock()
    delete(p.cache, id)
    p.mu.Unlock()
}
```

### Logging Proxy

```go
package proxy

import (
    "log/slog"
    "time"
)

// Service interface
type UserService interface {
    GetUser(id int) (*User, error)
    CreateUser(user *User) error
    DeleteUser(id int) error
}

// RealUserService
type RealUserService struct {
    db Database
}

func (s *RealUserService) GetUser(id int) (*User, error) { /* ... */ }
func (s *RealUserService) CreateUser(user *User) error { /* ... */ }
func (s *RealUserService) DeleteUser(id int) error { /* ... */ }

// LoggingProxy adds logging to any UserService
type LoggingProxy struct {
    service UserService
    logger  *slog.Logger
}

func NewLoggingProxy(service UserService, logger *slog.Logger) *LoggingProxy {
    return &LoggingProxy{service: service, logger: logger}
}

func (p *LoggingProxy) GetUser(id int) (*User, error) {
    start := time.Now()
    p.logger.Info("GetUser called", "userID", id)

    user, err := p.service.GetUser(id)

    p.logger.Info("GetUser completed",
        "userID", id,
        "duration", time.Since(start),
        "error", err,
    )
    return user, err
}

func (p *LoggingProxy) CreateUser(user *User) error {
    start := time.Now()
    p.logger.Info("CreateUser called", "email", user.Email)

    err := p.service.CreateUser(user)

    p.logger.Info("CreateUser completed",
        "email", user.Email,
        "duration", time.Since(start),
        "error", err,
    )
    return err
}

func (p *LoggingProxy) DeleteUser(id int) error {
    start := time.Now()
    p.logger.Warn("DeleteUser called", "userID", id)

    err := p.service.DeleteUser(id)

    p.logger.Warn("DeleteUser completed",
        "userID", id,
        "duration", time.Since(start),
        "error", err,
    )
    return err
}

// Usage
func main() {
    realService := &RealUserService{db: db}
    loggedService := NewLoggingProxy(realService, slog.Default())

    // Use loggedService - all calls are logged
    user, _ := loggedService.GetUser(123)
}
```

---

## Accept Interfaces Return Structs

> A Go idiom that embodies multiple structural patterns.

### The Principle

- **Accept interfaces**: Functions should accept the minimal interface they need
- **Return structs**: Functions should return concrete types, not interfaces

### Why It Matters

```go
// BAD: Accepts concrete type
func ProcessFile(f *os.File) error {
    data, err := io.ReadAll(f)
    // ...
}
// Can ONLY work with *os.File

// GOOD: Accepts interface
func ProcessFile(r io.Reader) error {
    data, err := io.ReadAll(r)
    // ...
}
// Works with: *os.File, *bytes.Reader, *strings.Reader, http.Response.Body, gzip.Reader, etc.
```

```go
// BAD: Returns interface
func NewStorage() Storage {
    return &FileStorage{}
}
// Hides concrete type, harder to extend

// GOOD: Returns concrete type
func NewFileStorage(path string) *FileStorage {
    return &FileStorage{path: path}
}
// Caller can use full *FileStorage API, still satisfies Storage interface
```

### Practical Example

```go
package repository

// Accept minimal interface
type UserReader interface {
    GetUser(id int) (*User, error)
}

type UserWriter interface {
    SaveUser(u *User) error
}

type UserDeleter interface {
    DeleteUser(id int) error
}

// Compose interfaces
type UserReadWriter interface {
    UserReader
    UserWriter
}

// Return concrete type
type PostgresUserRepository struct {
    db *sql.DB
}

func NewPostgresUserRepository(db *sql.DB) *PostgresUserRepository {
    return &PostgresUserRepository{db: db}
}

// Implements all interfaces
func (r *PostgresUserRepository) GetUser(id int) (*User, error) { /* ... */ }
func (r *PostgresUserRepository) SaveUser(u *User) error { /* ... */ }
func (r *PostgresUserRepository) DeleteUser(id int) error { /* ... */ }

// Additional methods available on concrete type
func (r *PostgresUserRepository) BulkInsert(users []*User) error { /* ... */ }
func (r *PostgresUserRepository) WithTransaction(tx *sql.Tx) *PostgresUserRepository { /* ... */ }

// Functions accept only what they need
func GetUserProfile(reader UserReader, id int) (*Profile, error) {
    user, err := reader.GetUser(id)
    // ...
}

func UpdateUser(rw UserReadWriter, id int, updates map[string]any) error {
    user, err := rw.GetUser(id)
    // ... apply updates
    return rw.SaveUser(user)
}

// Works with any implementation
func main() {
    repo := NewPostgresUserRepository(db)

    // Use as reader
    GetUserProfile(repo, 123)

    // Use as read-writer
    UpdateUser(repo, 123, updates)

    // Use concrete-only methods
    repo.BulkInsert(users)
}
```

---

## Interview Questions

### Q1: What's the difference between Adapter and Decorator?

**Answer**:
- **Adapter**: Changes the interface of an object to match what the client expects. The adapted object has a different interface.
- **Decorator**: Keeps the same interface but adds behavior. Decorators can be stacked.

```go
// Adapter: Different interface -> target interface
type XMLToJSONAdapter struct {
    xmlParser *XMLParser
}
func (a *XMLToJSONAdapter) Parse(data []byte) (map[string]any, error) {
    // Converts XML methods to JSON interface
}

// Decorator: Same interface, added behavior
type LoggingReader struct {
    reader io.Reader // Same interface
}
func (l *LoggingReader) Read(p []byte) (int, error) {
    n, err := l.reader.Read(p) // Delegates
    log.Printf("Read %d bytes", n) // Adds behavior
    return n, err
}
```

### Q2: When would you use Composite vs just a slice?

**Answer**: Use Composite when:
- You need to treat individual items and groups uniformly
- The structure is hierarchical (tree-like)
- Operations should propagate through the hierarchy

```go
// Just a slice: Flat structure
files := []*File{file1, file2, file3}
for _, f := range files {
    f.Process()
}

// Composite: Hierarchical, uniform interface
var node FileSystemNode = directory // Could be file or directory
node.Size() // Works recursively for directories
```

### Q3: How does Go's io.Reader/Writer demonstrate the Decorator pattern?

**Answer**: Go's io package uses decorators extensively:

```go
// Base reader
file, _ := os.Open("data.gz")

// Stack decorators
gzipReader, _ := gzip.NewReader(file)         // Decompression decorator
bufferedReader := bufio.NewReader(gzipReader) // Buffering decorator
limitedReader := io.LimitReader(bufferedReader, 1024) // Limiting decorator

// All have the same io.Reader interface
data, _ := io.ReadAll(limitedReader)
```

### Q4: Why return concrete types instead of interfaces in Go?

**Answer**:
1. **Flexibility**: Caller can use concrete-specific methods
2. **Documentation**: Clearer what type is returned
3. **Extensibility**: Can add methods without breaking interface contracts
4. **Testing**: Still mockable where interface is accepted

```go
// Return concrete
func NewServer() *Server { return &Server{} }

// Caller has full access
server := NewServer()
server.EnableTLS() // Concrete method
server.SetTimeout(time.Minute) // Concrete method

// Still works with interface
var h http.Handler = server // *Server implements http.Handler
```

### Q5: Implement a Proxy that combines lazy loading, caching, and logging.

**Answer**:

```go
type CombinedProxy struct {
    loader    func(id string) (*Data, error)
    cache     map[string]*Data
    logger    *slog.Logger
    mu        sync.RWMutex
}

func (p *CombinedProxy) Get(id string) (*Data, error) {
    // Logging
    p.logger.Info("Get called", "id", id)
    start := time.Now()
    defer func() {
        p.logger.Info("Get completed", "id", id, "duration", time.Since(start))
    }()

    // Caching
    p.mu.RLock()
    if data, ok := p.cache[id]; ok {
        p.mu.RUnlock()
        p.logger.Debug("Cache hit", "id", id)
        return data, nil
    }
    p.mu.RUnlock()

    // Lazy loading
    p.logger.Debug("Cache miss, loading", "id", id)
    data, err := p.loader(id)
    if err != nil {
        return nil, err
    }

    // Store in cache
    p.mu.Lock()
    p.cache[id] = data
    p.mu.Unlock()

    return data, nil
}
```

---

## Quick Reference

### Pattern Summary

| Pattern | Purpose | Go Implementation |
|---------|---------|-------------------|
| Adapter | Convert interface | Wrapper struct |
| Bridge | Separate abstraction/impl | Interface + implementations |
| Composite | Tree structures | Shared interface for leaf/container |
| Decorator | Add behavior | Wrapper with same interface |
| Facade | Simplify subsystem | High-level struct |
| Flyweight | Share common state | `sync.Map` + factory |
| Proxy | Control access | Same interface, different behavior |

### Common Go Patterns

```go
// Adapter (http.HandlerFunc style)
type HandlerFunc func(w, r)
func (f HandlerFunc) ServeHTTP(w, r) { f(w, r) }

// Decorator (middleware)
func WithLogging(h Handler) Handler {
    return HandlerFunc(func(w, r) {
        log.Println(r.URL)
        h.ServeHTTP(w, r)
    })
}

// Composite (recursive interface)
type Node interface {
    Size() int64
}
func (d *Dir) Size() int64 {
    var total int64
    for _, child := range d.children {
        total += child.Size()
    }
    return total
}

// Proxy (lazy loading)
func (p *Proxy) Get() *Real {
    if p.real == nil {
        p.real = loadExpensive()
    }
    return p.real
}
```

### When to Use Each Pattern

| Scenario | Pattern |
|----------|---------|
| Third-party library mismatch | Adapter |
| Multiple implementations swappable | Bridge |
| File system, menus, organizations | Composite |
| HTTP middleware, io.Reader chain | Decorator |
| Complex library with simple API | Facade |
| Many similar objects (icons, styles) | Flyweight |
| Lazy load, cache, or access control | Proxy |

---

## Resources

- [Go Patterns - Structural](https://github.com/tmrts/go-patterns#structural-patterns)
- [Refactoring Guru - Structural Patterns](https://refactoring.guru/design-patterns/structural-patterns)
- [io package documentation](https://pkg.go.dev/io) — Decorator pattern examples
- [net/http package](https://pkg.go.dev/net/http) — Adapter pattern (HandlerFunc)

---

**Previous**: [09-design-patterns-creational.md](09-design-patterns-creational.md) — Creational Design Patterns

**Next**: [11-design-patterns-behavioral.md](11-design-patterns-behavioral.md) — Behavioral Design Patterns
