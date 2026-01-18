# Go Creational Design Patterns

> Patterns for object creation that increase flexibility and reuse

Creational patterns abstract the instantiation process, making systems independent of how objects are created, composed, and represented. In Go, these patterns adapt elegantly to the language's philosophy of simplicity and explicit code.

**Reading time**: 60-75 minutes

---

## Table of Contents

1. [Pattern Selection Guide](#pattern-selection-guide)
2. [Singleton](#singleton)
3. [Factory Method](#factory-method)
4. [Abstract Factory](#abstract-factory)
5. [Builder](#builder)
6. [Prototype](#prototype)
7. [Object Pool](#object-pool)
8. [Functional Options](#functional-options)
9. [Interview Questions](#interview-questions)
10. [Quick Reference](#quick-reference)

---

## Pattern Selection Guide

Use this flowchart to choose the right creational pattern:

```
                    ┌─────────────────────────┐
                    │ Need to create objects? │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼───────────┐
                    │ Need exactly one      │
                    │ instance globally?    │
                    └───────────┬───────────┘
                                │
              ┌─────────────────┴─────────────────┐
              │ Yes                               │ No
              ▼                                   ▼
    ┌─────────────────┐               ┌─────────────────────┐
    │   SINGLETON     │               │ Complex multi-step  │
    │   (sync.Once)   │               │ construction?       │
    └─────────────────┘               └──────────┬──────────┘
                                                 │
                               ┌─────────────────┴────────────────┐
                               │ Yes                              │ No
                               ▼                                  ▼
                     ┌─────────────────┐              ┌───────────────────┐
                     │    BUILDER or   │              │ Need family of    │
                     │    FUNCTIONAL   │              │ related objects?  │
                     │    OPTIONS      │              └─────────┬─────────┘
                     └─────────────────┘                        │
                                                ┌───────────────┴───────────────┐
                                                │ Yes                           │ No
                                                ▼                               ▼
                                    ┌─────────────────┐           ┌─────────────────────┐
                                    │    ABSTRACT     │           │ Reuse expensive     │
                                    │    FACTORY      │           │ objects?            │
                                    └─────────────────┘           └──────────┬──────────┘
                                                                             │
                                                             ┌───────────────┴───────────────┐
                                                             │ Yes                           │ No
                                                             ▼                               ▼
                                                 ┌─────────────────┐           ┌─────────────────┐
                                                 │   OBJECT POOL   │           │ FACTORY METHOD  │
                                                 │   (sync.Pool)   │           │   (NewXxx)      │
                                                 └─────────────────┘           └─────────────────┘
```

### Quick Decision Table

| Scenario | Pattern | Go Idiom |
|----------|---------|----------|
| Global config, DB connection | Singleton | `sync.Once` |
| Create objects based on input | Factory Method | `NewXxx()` functions |
| Related objects that work together | Abstract Factory | Interface returning interfaces |
| Many optional parameters | Builder / Functional Options | `func(*Config)` |
| Expensive object initialization | Object Pool | `sync.Pool` |
| Clone existing objects | Prototype | Copy methods / `encoding/gob` |

---

## Singleton

> Ensure a type has only one instance and provide a global access point.

### When to Use

- Global configuration
- Database connection pools
- Loggers
- Caches
- Any resource that should exist exactly once

### Go Implementation with sync.Once

The idiomatic Go way uses `sync.Once` for thread-safe lazy initialization:

```go
package config

import (
    "os"
    "sync"
)

// Config holds application configuration
type Config struct {
    DatabaseURL string
    APIKey      string
    Debug       bool
    Port        int
}

var (
    instance *Config
    once     sync.Once
)

// Get returns the singleton Config instance
// Thread-safe: sync.Once guarantees initialization happens exactly once
func Get() *Config {
    once.Do(func() {
        instance = &Config{
            DatabaseURL: os.Getenv("DATABASE_URL"),
            APIKey:      os.Getenv("API_KEY"),
            Debug:       os.Getenv("DEBUG") == "true",
            Port:        8080,
        }
    })
    return instance
}
```

```go
// Usage
func main() {
    cfg := config.Get()
    fmt.Printf("Server starting on port %d\n", cfg.Port)

    // Same instance everywhere
    cfg2 := config.Get()
    fmt.Println(cfg == cfg2) // true
}
```

### Thread-Safe Singleton with Initialization Error

```go
package db

import (
    "database/sql"
    "sync"

    _ "github.com/lib/pq"
)

var (
    instance *sql.DB
    once     sync.Once
    initErr  error
)

// Get returns the database connection singleton
// Returns error if initialization failed
func Get() (*sql.DB, error) {
    once.Do(func() {
        instance, initErr = sql.Open("postgres", os.Getenv("DATABASE_URL"))
        if initErr != nil {
            return
        }
        initErr = instance.Ping()
    })
    return instance, initErr
}

// MustGet panics if initialization fails (use in main)
func MustGet() *sql.DB {
    db, err := Get()
    if err != nil {
        panic(fmt.Sprintf("failed to initialize database: %v", err))
    }
    return db
}
```

### Singleton with Interface (Testable)

```go
package logger

import (
    "io"
    "log/slog"
    "os"
    "sync"
)

// Logger interface for testability
type Logger interface {
    Info(msg string, args ...any)
    Error(msg string, args ...any)
    Debug(msg string, args ...any)
}

var (
    instance Logger
    once     sync.Once
)

// Get returns the singleton logger
func Get() Logger {
    once.Do(func() {
        instance = slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
            Level: slog.LevelInfo,
        }))
    })
    return instance
}

// SetForTesting allows replacing the logger in tests
// Call this before any Get() calls in tests
func SetForTesting(l Logger) {
    instance = l
    // Note: once is already "done" if Get() was called
    // For proper testing, use dependency injection instead
}
```

### When NOT to Use Singleton

- When you need multiple instances with different configurations
- When it makes testing difficult (prefer dependency injection)
- When the "single instance" requirement isn't actually global

**Better alternative for testability**:

```go
// Instead of singleton, use dependency injection
type Server struct {
    config *Config
    db     *sql.DB
    logger Logger
}

func NewServer(cfg *Config, db *sql.DB, logger Logger) *Server {
    return &Server{config: cfg, db: db, logger: logger}
}
```

---

## Factory Method

> Define an interface for creating objects, letting subclasses/implementations decide which class to instantiate.

### When to Use

- Creating objects based on runtime conditions
- Hiding complex construction logic
- Supporting multiple implementations of an interface

### Basic Factory Function (Go Convention)

The `NewXxx()` pattern is Go's idiomatic factory method:

```go
package user

import "time"

type User struct {
    ID        int
    Email     string
    CreatedAt time.Time
    verified  bool
}

// NewUser is the factory function
func NewUser(email string) *User {
    return &User{
        Email:     email,
        CreatedAt: time.Now(),
        verified:  false,
    }
}

// NewVerifiedUser creates a pre-verified user
func NewVerifiedUser(email string) *User {
    u := NewUser(email)
    u.verified = true
    return u
}
```

### Factory with Validation

```go
package order

import (
    "errors"
    "time"
)

var (
    ErrInvalidAmount = errors.New("amount must be positive")
    ErrEmptyItems    = errors.New("order must have at least one item")
)

type Order struct {
    ID        string
    Items     []Item
    Total     Money
    CreatedAt time.Time
}

// NewOrder creates an order with validation
func NewOrder(items []Item) (*Order, error) {
    if len(items) == 0 {
        return nil, ErrEmptyItems
    }

    total := Money(0)
    for _, item := range items {
        if item.Price <= 0 {
            return nil, ErrInvalidAmount
        }
        total += item.Price * Money(item.Quantity)
    }

    return &Order{
        ID:        generateID(),
        Items:     items,
        Total:     total,
        CreatedAt: time.Now(),
    }, nil
}
```

### Factory with Type Selection

```go
package storage

import (
    "errors"
    "fmt"
)

// Storage interface
type Storage interface {
    Get(key string) ([]byte, error)
    Set(key string, value []byte) error
    Delete(key string) error
}

// Factory function that returns different implementations
func New(storageType string, config map[string]string) (Storage, error) {
    switch storageType {
    case "memory":
        return NewMemoryStorage(), nil
    case "redis":
        addr := config["addr"]
        if addr == "" {
            return nil, errors.New("redis addr required")
        }
        return NewRedisStorage(addr)
    case "s3":
        bucket := config["bucket"]
        region := config["region"]
        if bucket == "" || region == "" {
            return nil, errors.New("s3 bucket and region required")
        }
        return NewS3Storage(bucket, region)
    default:
        return nil, fmt.Errorf("unknown storage type: %s", storageType)
    }
}

// Implementations
type MemoryStorage struct {
    data map[string][]byte
}

func NewMemoryStorage() *MemoryStorage {
    return &MemoryStorage{data: make(map[string][]byte)}
}

func (s *MemoryStorage) Get(key string) ([]byte, error) {
    v, ok := s.data[key]
    if !ok {
        return nil, ErrNotFound
    }
    return v, nil
}

func (s *MemoryStorage) Set(key string, value []byte) error {
    s.data[key] = value
    return nil
}

func (s *MemoryStorage) Delete(key string) error {
    delete(s.data, key)
    return nil
}
```

### Factory with Registration (Plugin Pattern)

```go
package parser

import (
    "fmt"
    "sync"
)

// Parser interface
type Parser interface {
    Parse(data []byte) (any, error)
    ContentType() string
}

// Factory function type
type ParserFactory func() Parser

// Registry of parser factories
var (
    registry = make(map[string]ParserFactory)
    mu       sync.RWMutex
)

// Register adds a parser factory to the registry
func Register(name string, factory ParserFactory) {
    mu.Lock()
    defer mu.Unlock()
    registry[name] = factory
}

// New creates a parser by name
func New(name string) (Parser, error) {
    mu.RLock()
    defer mu.RUnlock()

    factory, ok := registry[name]
    if !ok {
        return nil, fmt.Errorf("unknown parser: %s", name)
    }
    return factory(), nil
}

// Register parsers in init()
func init() {
    Register("json", func() Parser { return &JSONParser{} })
    Register("xml", func() Parser { return &XMLParser{} })
    Register("yaml", func() Parser { return &YAMLParser{} })
}

// Usage
func main() {
    parser, err := parser.New("json")
    if err != nil {
        log.Fatal(err)
    }
    result, _ := parser.Parse(data)
}
```

---

## Abstract Factory

> Provide an interface for creating families of related objects without specifying their concrete classes.

### When to Use

- Creating families of objects that work together
- Supporting multiple platforms or themes
- Ensuring consistent object creation across a system

### Database Factory Example

```go
package database

import "context"

// Abstract products
type Connection interface {
    Query(ctx context.Context, query string, args ...any) (Rows, error)
    Exec(ctx context.Context, query string, args ...any) (Result, error)
    Close() error
}

type Rows interface {
    Next() bool
    Scan(dest ...any) error
    Close() error
}

type Result interface {
    LastInsertId() (int64, error)
    RowsAffected() (int64, error)
}

type Transaction interface {
    Commit() error
    Rollback() error
    Connection
}

// Abstract factory
type DatabaseFactory interface {
    CreateConnection(dsn string) (Connection, error)
    CreateTransaction(conn Connection) (Transaction, error)
}

// PostgreSQL family
type PostgresFactory struct{}

func (f *PostgresFactory) CreateConnection(dsn string) (Connection, error) {
    return &PostgresConnection{dsn: dsn}, nil
}

func (f *PostgresFactory) CreateTransaction(conn Connection) (Transaction, error) {
    pgConn := conn.(*PostgresConnection)
    return &PostgresTransaction{conn: pgConn}, nil
}

type PostgresConnection struct {
    dsn string
    // ... postgres-specific fields
}

func (c *PostgresConnection) Query(ctx context.Context, query string, args ...any) (Rows, error) {
    // PostgreSQL-specific implementation
    return &PostgresRows{}, nil
}

func (c *PostgresConnection) Exec(ctx context.Context, query string, args ...any) (Result, error) {
    return &PostgresResult{}, nil
}

func (c *PostgresConnection) Close() error { return nil }

// MySQL family
type MySQLFactory struct{}

func (f *MySQLFactory) CreateConnection(dsn string) (Connection, error) {
    return &MySQLConnection{dsn: dsn}, nil
}

func (f *MySQLFactory) CreateTransaction(conn Connection) (Transaction, error) {
    myConn := conn.(*MySQLConnection)
    return &MySQLTransaction{conn: myConn}, nil
}

type MySQLConnection struct {
    dsn string
}

func (c *MySQLConnection) Query(ctx context.Context, query string, args ...any) (Rows, error) {
    // MySQL-specific implementation
    return &MySQLRows{}, nil
}

func (c *MySQLConnection) Exec(ctx context.Context, query string, args ...any) (Result, error) {
    return &MySQLResult{}, nil
}

func (c *MySQLConnection) Close() error { return nil }

// Factory function to get the right factory
func GetFactory(dbType string) (DatabaseFactory, error) {
    switch dbType {
    case "postgres":
        return &PostgresFactory{}, nil
    case "mysql":
        return &MySQLFactory{}, nil
    default:
        return nil, fmt.Errorf("unsupported database: %s", dbType)
    }
}

// Usage: Client code works with any database
func runMigrations(factory DatabaseFactory, dsn string) error {
    conn, err := factory.CreateConnection(dsn)
    if err != nil {
        return err
    }
    defer conn.Close()

    tx, err := factory.CreateTransaction(conn)
    if err != nil {
        return err
    }

    // Works with both PostgreSQL and MySQL
    _, err = tx.Exec(context.Background(), "CREATE TABLE users (...)")
    if err != nil {
        tx.Rollback()
        return err
    }

    return tx.Commit()
}
```

### UI Component Factory Example

```go
package ui

// Abstract products
type Button interface {
    Render() string
    OnClick(handler func())
}

type TextField interface {
    Render() string
    SetValue(v string)
    GetValue() string
}

type Dialog interface {
    Show()
    Hide()
    SetTitle(title string)
    AddButton(btn Button)
}

// Abstract factory
type UIFactory interface {
    CreateButton(label string) Button
    CreateTextField(placeholder string) TextField
    CreateDialog() Dialog
}

// Material Design family
type MaterialFactory struct{}

func (f *MaterialFactory) CreateButton(label string) Button {
    return &MaterialButton{label: label}
}

func (f *MaterialFactory) CreateTextField(placeholder string) TextField {
    return &MaterialTextField{placeholder: placeholder}
}

func (f *MaterialFactory) CreateDialog() Dialog {
    return &MaterialDialog{}
}

type MaterialButton struct {
    label   string
    onClick func()
}

func (b *MaterialButton) Render() string {
    return fmt.Sprintf(`<button class="mdc-button">%s</button>`, b.label)
}

func (b *MaterialButton) OnClick(handler func()) {
    b.onClick = handler
}

// Bootstrap family
type BootstrapFactory struct{}

func (f *BootstrapFactory) CreateButton(label string) Button {
    return &BootstrapButton{label: label}
}

func (f *BootstrapFactory) CreateTextField(placeholder string) TextField {
    return &BootstrapTextField{placeholder: placeholder}
}

func (f *BootstrapFactory) CreateDialog() Dialog {
    return &BootstrapDialog{}
}

type BootstrapButton struct {
    label   string
    onClick func()
}

func (b *BootstrapButton) Render() string {
    return fmt.Sprintf(`<button class="btn btn-primary">%s</button>`, b.label)
}

func (b *BootstrapButton) OnClick(handler func()) {
    b.onClick = handler
}

// Usage: Theme-agnostic form builder
func BuildLoginForm(factory UIFactory) string {
    dialog := factory.CreateDialog()
    dialog.SetTitle("Login")

    username := factory.CreateTextField("Username")
    password := factory.CreateTextField("Password")

    submitBtn := factory.CreateButton("Login")
    submitBtn.OnClick(func() {
        // Handle login
    })

    dialog.AddButton(submitBtn)

    return username.Render() + password.Render() + submitBtn.Render()
}
```

---

## Builder

> Separate the construction of a complex object from its representation.

### When to Use

- Objects with many optional parameters
- Step-by-step construction process
- Creating different representations of an object

### Traditional Builder Pattern

```go
package http

import (
    "bytes"
    "encoding/json"
    "io"
    "net/http"
    "time"
)

// Request is the product
type Request struct {
    method  string
    url     string
    headers map[string]string
    body    io.Reader
    timeout time.Duration
    retries int
}

// RequestBuilder builds HTTP requests
type RequestBuilder struct {
    request *Request
    err     error
}

// NewRequestBuilder creates a new builder
func NewRequestBuilder() *RequestBuilder {
    return &RequestBuilder{
        request: &Request{
            method:  "GET",
            headers: make(map[string]string),
            timeout: 30 * time.Second,
            retries: 0,
        },
    }
}

// Method sets the HTTP method
func (b *RequestBuilder) Method(method string) *RequestBuilder {
    if b.err != nil {
        return b
    }
    b.request.method = method
    return b
}

// URL sets the request URL
func (b *RequestBuilder) URL(url string) *RequestBuilder {
    if b.err != nil {
        return b
    }
    b.request.url = url
    return b
}

// Header adds a header
func (b *RequestBuilder) Header(key, value string) *RequestBuilder {
    if b.err != nil {
        return b
    }
    b.request.headers[key] = value
    return b
}

// JSONBody sets JSON body
func (b *RequestBuilder) JSONBody(data any) *RequestBuilder {
    if b.err != nil {
        return b
    }
    jsonBytes, err := json.Marshal(data)
    if err != nil {
        b.err = fmt.Errorf("marshaling JSON body: %w", err)
        return b
    }
    b.request.body = bytes.NewReader(jsonBytes)
    b.request.headers["Content-Type"] = "application/json"
    return b
}

// Timeout sets request timeout
func (b *RequestBuilder) Timeout(d time.Duration) *RequestBuilder {
    if b.err != nil {
        return b
    }
    b.request.timeout = d
    return b
}

// Retries sets retry count
func (b *RequestBuilder) Retries(n int) *RequestBuilder {
    if b.err != nil {
        return b
    }
    b.request.retries = n
    return b
}

// Build creates the final request
func (b *RequestBuilder) Build() (*Request, error) {
    if b.err != nil {
        return nil, b.err
    }
    if b.request.url == "" {
        return nil, errors.New("URL is required")
    }
    return b.request, nil
}

// Do executes the request
func (b *RequestBuilder) Do() (*http.Response, error) {
    req, err := b.Build()
    if err != nil {
        return nil, err
    }
    return req.Execute()
}

// Usage
func main() {
    resp, err := NewRequestBuilder().
        Method("POST").
        URL("https://api.example.com/users").
        Header("Authorization", "Bearer token123").
        JSONBody(map[string]string{"name": "John"}).
        Timeout(10 * time.Second).
        Retries(3).
        Do()

    if err != nil {
        log.Fatal(err)
    }
    defer resp.Body.Close()
}
```

### Builder with Director

```go
package query

import "strings"

// Query is the product
type Query struct {
    table      string
    columns    []string
    conditions []string
    orderBy    string
    limit      int
    offset     int
}

func (q *Query) String() string {
    var sb strings.Builder
    sb.WriteString("SELECT ")

    if len(q.columns) == 0 {
        sb.WriteString("*")
    } else {
        sb.WriteString(strings.Join(q.columns, ", "))
    }

    sb.WriteString(" FROM ")
    sb.WriteString(q.table)

    if len(q.conditions) > 0 {
        sb.WriteString(" WHERE ")
        sb.WriteString(strings.Join(q.conditions, " AND "))
    }

    if q.orderBy != "" {
        sb.WriteString(" ORDER BY ")
        sb.WriteString(q.orderBy)
    }

    if q.limit > 0 {
        sb.WriteString(fmt.Sprintf(" LIMIT %d", q.limit))
    }

    if q.offset > 0 {
        sb.WriteString(fmt.Sprintf(" OFFSET %d", q.offset))
    }

    return sb.String()
}

// QueryBuilder interface
type QueryBuilder interface {
    Select(columns ...string) QueryBuilder
    From(table string) QueryBuilder
    Where(condition string) QueryBuilder
    OrderBy(column string) QueryBuilder
    Limit(n int) QueryBuilder
    Offset(n int) QueryBuilder
    Build() *Query
}

// SQLQueryBuilder implementation
type SQLQueryBuilder struct {
    query *Query
}

func NewSQLQueryBuilder() *SQLQueryBuilder {
    return &SQLQueryBuilder{query: &Query{}}
}

func (b *SQLQueryBuilder) Select(columns ...string) QueryBuilder {
    b.query.columns = columns
    return b
}

func (b *SQLQueryBuilder) From(table string) QueryBuilder {
    b.query.table = table
    return b
}

func (b *SQLQueryBuilder) Where(condition string) QueryBuilder {
    b.query.conditions = append(b.query.conditions, condition)
    return b
}

func (b *SQLQueryBuilder) OrderBy(column string) QueryBuilder {
    b.query.orderBy = column
    return b
}

func (b *SQLQueryBuilder) Limit(n int) QueryBuilder {
    b.query.limit = n
    return b
}

func (b *SQLQueryBuilder) Offset(n int) QueryBuilder {
    b.query.offset = n
    return b
}

func (b *SQLQueryBuilder) Build() *Query {
    return b.query
}

// Director: Knows how to build common queries
type QueryDirector struct {
    builder QueryBuilder
}

func NewQueryDirector(builder QueryBuilder) *QueryDirector {
    return &QueryDirector{builder: builder}
}

func (d *QueryDirector) BuildUserListQuery() *Query {
    return d.builder.
        Select("id", "name", "email").
        From("users").
        Where("active = true").
        OrderBy("created_at DESC").
        Limit(100).
        Build()
}

func (d *QueryDirector) BuildUserSearchQuery(searchTerm string) *Query {
    return d.builder.
        Select("id", "name", "email").
        From("users").
        Where(fmt.Sprintf("name LIKE '%%%s%%'", searchTerm)).
        OrderBy("name").
        Build()
}

// Usage
func main() {
    builder := NewSQLQueryBuilder()
    director := NewQueryDirector(builder)

    userListQuery := director.BuildUserListQuery()
    fmt.Println(userListQuery.String())
    // SELECT id, name, email FROM users WHERE active = true ORDER BY created_at DESC LIMIT 100

    // Or build manually
    customQuery := NewSQLQueryBuilder().
        Select("*").
        From("orders").
        Where("status = 'pending'").
        Where("amount > 100").
        Limit(10).
        Build()
    fmt.Println(customQuery.String())
    // SELECT * FROM orders WHERE status = 'pending' AND amount > 100 LIMIT 10
}
```

---

## Prototype

> Create new objects by copying existing ones.

### When to Use

- Object creation is expensive (database queries, API calls)
- Objects have many shared properties
- Need to create variations of an object

### Basic Clone Method

```go
package document

import "time"

type Document struct {
    ID        string
    Title     string
    Content   string
    Author    string
    Tags      []string
    Metadata  map[string]string
    CreatedAt time.Time
    UpdatedAt time.Time
}

// Clone creates a deep copy of the document
func (d *Document) Clone() *Document {
    // Create new slices and maps to avoid shared references
    tagsCopy := make([]string, len(d.Tags))
    copy(tagsCopy, d.Tags)

    metadataCopy := make(map[string]string, len(d.Metadata))
    for k, v := range d.Metadata {
        metadataCopy[k] = v
    }

    return &Document{
        ID:        generateID(), // New ID for the clone
        Title:     d.Title + " (Copy)",
        Content:   d.Content,
        Author:    d.Author,
        Tags:      tagsCopy,
        Metadata:  metadataCopy,
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    }
}

// Usage
func main() {
    original := &Document{
        ID:       "doc-1",
        Title:    "Design Patterns",
        Content:  "...",
        Author:   "Gang of Four",
        Tags:     []string{"programming", "patterns"},
        Metadata: map[string]string{"version": "1.0"},
    }

    copy := original.Clone()
    copy.Title = "Design Patterns - Revised"
    copy.Tags = append(copy.Tags, "revised")

    // Original is unaffected
    fmt.Println(original.Title) // "Design Patterns"
    fmt.Println(copy.Title)     // "Design Patterns - Revised (Copy)"
}
```

### Generic Clone with encoding/gob

```go
package clone

import (
    "bytes"
    "encoding/gob"
)

// Deep performs a deep clone using gob encoding
// Type must be gob-encodable (exported fields, registered types)
func Deep[T any](src T) (T, error) {
    var buf bytes.Buffer
    var dst T

    enc := gob.NewEncoder(&buf)
    dec := gob.NewDecoder(&buf)

    if err := enc.Encode(src); err != nil {
        return dst, fmt.Errorf("encoding: %w", err)
    }

    if err := dec.Decode(&dst); err != nil {
        return dst, fmt.Errorf("decoding: %w", err)
    }

    return dst, nil
}

// MustDeep panics on error (use when you know type is clonable)
func MustDeep[T any](src T) T {
    dst, err := Deep(src)
    if err != nil {
        panic(err)
    }
    return dst
}

// Usage
type Config struct {
    Server   ServerConfig
    Database DatabaseConfig
    Features map[string]bool
}

type ServerConfig struct {
    Host string
    Port int
}

type DatabaseConfig struct {
    URL         string
    MaxConns    int
    Connections []string
}

func main() {
    original := Config{
        Server:   ServerConfig{Host: "localhost", Port: 8080},
        Database: DatabaseConfig{URL: "postgres://...", MaxConns: 10},
        Features: map[string]bool{"dark_mode": true},
    }

    cloned, err := clone.Deep(original)
    if err != nil {
        log.Fatal(err)
    }

    cloned.Features["new_feature"] = true
    cloned.Database.MaxConns = 20

    fmt.Println(original.Features) // map[dark_mode:true]
    fmt.Println(cloned.Features)   // map[dark_mode:true new_feature:true]
}
```

### Prototype Registry

```go
package shapes

// Shape interface with Clone method
type Shape interface {
    Clone() Shape
    Draw() string
}

// Concrete shapes
type Circle struct {
    Radius int
    Color  string
}

func (c *Circle) Clone() Shape {
    return &Circle{Radius: c.Radius, Color: c.Color}
}

func (c *Circle) Draw() string {
    return fmt.Sprintf("Circle(radius=%d, color=%s)", c.Radius, c.Color)
}

type Rectangle struct {
    Width  int
    Height int
    Color  string
}

func (r *Rectangle) Clone() Shape {
    return &Rectangle{Width: r.Width, Height: r.Height, Color: r.Color}
}

func (r *Rectangle) Draw() string {
    return fmt.Sprintf("Rectangle(%dx%d, color=%s)", r.Width, r.Height, r.Color)
}

// Registry of prototypes
type ShapeRegistry struct {
    prototypes map[string]Shape
}

func NewShapeRegistry() *ShapeRegistry {
    return &ShapeRegistry{
        prototypes: make(map[string]Shape),
    }
}

func (r *ShapeRegistry) Register(name string, shape Shape) {
    r.prototypes[name] = shape
}

func (r *ShapeRegistry) Get(name string) (Shape, error) {
    proto, ok := r.prototypes[name]
    if !ok {
        return nil, fmt.Errorf("unknown shape: %s", name)
    }
    return proto.Clone(), nil
}

// Usage
func main() {
    registry := NewShapeRegistry()

    // Register prototypes
    registry.Register("red-circle", &Circle{Radius: 10, Color: "red"})
    registry.Register("blue-rectangle", &Rectangle{Width: 20, Height: 10, Color: "blue"})

    // Clone from prototypes
    circle, _ := registry.Get("red-circle")
    fmt.Println(circle.Draw()) // Circle(radius=10, color=red)

    rect, _ := registry.Get("blue-rectangle")
    fmt.Println(rect.Draw()) // Rectangle(20x10, color=blue)
}
```

---

## Object Pool

> Reuse expensive objects instead of creating new ones.

### When to Use

- Object creation is expensive (connections, buffers, workers)
- Objects are frequently created and destroyed
- Objects can be reused after reset

### sync.Pool (Standard Library)

```go
package main

import (
    "bytes"
    "sync"
)

// Buffer pool
var bufferPool = sync.Pool{
    New: func() any {
        return new(bytes.Buffer)
    },
}

func processData(data []byte) string {
    // Get buffer from pool
    buf := bufferPool.Get().(*bytes.Buffer)

    // Always return to pool when done
    defer func() {
        buf.Reset() // Clear before returning
        bufferPool.Put(buf)
    }()

    // Use buffer
    buf.Write(data)
    buf.WriteString(" - processed")

    return buf.String()
}

func main() {
    result := processData([]byte("Hello"))
    fmt.Println(result)
}
```

### Custom Object Pool with Size Limit

```go
package pool

import (
    "context"
    "errors"
    "sync"
    "time"
)

var (
    ErrPoolExhausted = errors.New("pool exhausted")
    ErrPoolClosed    = errors.New("pool is closed")
)

// Poolable objects must implement this interface
type Poolable interface {
    Reset() // Called before returning to pool
    Close() error // Called when pool is closed
}

// Pool manages reusable objects
type Pool[T Poolable] struct {
    items   chan T
    factory func() T
    maxSize int
    closed  bool
    mu      sync.RWMutex
}

// NewPool creates a pool with a factory function
func NewPool[T Poolable](maxSize int, factory func() T) *Pool[T] {
    p := &Pool[T]{
        items:   make(chan T, maxSize),
        factory: factory,
        maxSize: maxSize,
    }

    // Pre-populate pool
    for i := 0; i < maxSize; i++ {
        p.items <- factory()
    }

    return p
}

// Acquire gets an object from the pool
func (p *Pool[T]) Acquire(ctx context.Context) (T, error) {
    var zero T

    p.mu.RLock()
    if p.closed {
        p.mu.RUnlock()
        return zero, ErrPoolClosed
    }
    p.mu.RUnlock()

    select {
    case item := <-p.items:
        return item, nil
    case <-ctx.Done():
        return zero, ctx.Err()
    }
}

// Release returns an object to the pool
func (p *Pool[T]) Release(item T) {
    p.mu.RLock()
    if p.closed {
        p.mu.RUnlock()
        item.Close()
        return
    }
    p.mu.RUnlock()

    item.Reset()

    select {
    case p.items <- item:
        // Returned to pool
    default:
        // Pool is full, close the item
        item.Close()
    }
}

// Close closes the pool and all items
func (p *Pool[T]) Close() error {
    p.mu.Lock()
    if p.closed {
        p.mu.Unlock()
        return nil
    }
    p.closed = true
    p.mu.Unlock()

    close(p.items)
    for item := range p.items {
        item.Close()
    }
    return nil
}

// Size returns current pool size
func (p *Pool[T]) Size() int {
    return len(p.items)
}
```

### Connection Pool Example

```go
package dbpool

import (
    "context"
    "database/sql"
    "time"
)

type Connection struct {
    db        *sql.DB
    createdAt time.Time
}

func (c *Connection) Reset() {
    // Reset any transaction state
}

func (c *Connection) Close() error {
    return c.db.Close()
}

func (c *Connection) Query(ctx context.Context, query string, args ...any) (*sql.Rows, error) {
    return c.db.QueryContext(ctx, query, args...)
}

// ConnectionPool manages database connections
type ConnectionPool struct {
    pool     *Pool[*Connection]
    dsn      string
    maxConns int
}

func NewConnectionPool(dsn string, maxConns int) (*ConnectionPool, error) {
    factory := func() *Connection {
        db, _ := sql.Open("postgres", dsn)
        return &Connection{db: db, createdAt: time.Now()}
    }

    return &ConnectionPool{
        pool:     NewPool(maxConns, factory),
        dsn:      dsn,
        maxConns: maxConns,
    }, nil
}

// WithConnection executes a function with a pooled connection
func (p *ConnectionPool) WithConnection(ctx context.Context, fn func(*Connection) error) error {
    conn, err := p.pool.Acquire(ctx)
    if err != nil {
        return err
    }
    defer p.pool.Release(conn)

    return fn(conn)
}

// Usage
func main() {
    pool, _ := NewConnectionPool("postgres://localhost/mydb", 10)
    defer pool.Close()

    ctx := context.Background()
    err := pool.WithConnection(ctx, func(conn *Connection) error {
        rows, err := conn.Query(ctx, "SELECT * FROM users")
        if err != nil {
            return err
        }
        defer rows.Close()
        // Process rows...
        return nil
    })

    if err != nil {
        log.Fatal(err)
    }
}
```

### Worker Pool

```go
package worker

import (
    "context"
    "sync"
)

// Job represents work to be done
type Job func(ctx context.Context) error

// Pool manages a pool of workers
type Pool struct {
    jobs    chan Job
    results chan error
    wg      sync.WaitGroup
}

// NewPool creates a worker pool
func NewPool(workerCount int) *Pool {
    p := &Pool{
        jobs:    make(chan Job, workerCount*2),
        results: make(chan error, workerCount*2),
    }

    p.wg.Add(workerCount)
    for i := 0; i < workerCount; i++ {
        go p.worker()
    }

    return p
}

func (p *Pool) worker() {
    defer p.wg.Done()
    ctx := context.Background()

    for job := range p.jobs {
        err := job(ctx)
        p.results <- err
    }
}

// Submit adds a job to the pool
func (p *Pool) Submit(job Job) {
    p.jobs <- job
}

// Close stops the pool and waits for workers to finish
func (p *Pool) Close() {
    close(p.jobs)
    p.wg.Wait()
    close(p.results)
}

// Results returns the results channel
func (p *Pool) Results() <-chan error {
    return p.results
}

// Usage
func main() {
    pool := NewPool(5)

    // Submit jobs
    for i := 0; i < 20; i++ {
        i := i
        pool.Submit(func(ctx context.Context) error {
            fmt.Printf("Processing job %d\n", i)
            time.Sleep(100 * time.Millisecond)
            return nil
        })
    }

    // Collect results
    go func() {
        for err := range pool.Results() {
            if err != nil {
                log.Printf("Job failed: %v", err)
            }
        }
    }()

    pool.Close()
}
```

---

## Functional Options

> Go's idiomatic pattern for configurable constructors with sensible defaults.

### When to Use

- Functions with many optional parameters
- Providing sensible defaults
- Clean, self-documenting APIs
- Avoiding boolean blindness (`NewServer(true, false, true)`)

### Basic Functional Options

```go
package server

import (
    "log/slog"
    "time"
)

// Server is the configured object
type Server struct {
    host         string
    port         int
    timeout      time.Duration
    maxConns     int
    logger       *slog.Logger
    tlsEnabled   bool
    certFile     string
    keyFile      string
}

// Option is a function that configures Server
type Option func(*Server)

// WithHost sets the server host
func WithHost(host string) Option {
    return func(s *Server) {
        s.host = host
    }
}

// WithPort sets the server port
func WithPort(port int) Option {
    return func(s *Server) {
        s.port = port
    }
}

// WithTimeout sets the request timeout
func WithTimeout(d time.Duration) Option {
    return func(s *Server) {
        s.timeout = d
    }
}

// WithMaxConnections sets the maximum connections
func WithMaxConnections(n int) Option {
    return func(s *Server) {
        s.maxConns = n
    }
}

// WithLogger sets the logger
func WithLogger(logger *slog.Logger) Option {
    return func(s *Server) {
        s.logger = logger
    }
}

// WithTLS enables TLS with the given cert and key files
func WithTLS(certFile, keyFile string) Option {
    return func(s *Server) {
        s.tlsEnabled = true
        s.certFile = certFile
        s.keyFile = keyFile
    }
}

// NewServer creates a server with sensible defaults
func NewServer(opts ...Option) *Server {
    // Sensible defaults
    s := &Server{
        host:     "localhost",
        port:     8080,
        timeout:  30 * time.Second,
        maxConns: 100,
        logger:   slog.Default(),
    }

    // Apply options
    for _, opt := range opts {
        opt(s)
    }

    return s
}

// Usage
func main() {
    // Default configuration
    server1 := NewServer()

    // Custom configuration - readable and self-documenting
    server2 := NewServer(
        WithHost("0.0.0.0"),
        WithPort(443),
        WithTimeout(60*time.Second),
        WithMaxConnections(1000),
        WithTLS("/path/to/cert.pem", "/path/to/key.pem"),
        WithLogger(slog.New(slog.NewJSONHandler(os.Stdout, nil))),
    )
}
```

### Functional Options with Validation

```go
package client

import (
    "errors"
    "net/url"
    "time"
)

type Client struct {
    baseURL    *url.URL
    timeout    time.Duration
    retries    int
    headers    map[string]string
    rateLimit  int
}

type Option func(*Client) error

// WithBaseURL sets and validates the base URL
func WithBaseURL(rawURL string) Option {
    return func(c *Client) error {
        u, err := url.Parse(rawURL)
        if err != nil {
            return fmt.Errorf("invalid base URL: %w", err)
        }
        if u.Scheme != "http" && u.Scheme != "https" {
            return errors.New("base URL must use http or https scheme")
        }
        c.baseURL = u
        return nil
    }
}

// WithTimeout sets the timeout with validation
func WithTimeout(d time.Duration) Option {
    return func(c *Client) error {
        if d <= 0 {
            return errors.New("timeout must be positive")
        }
        if d > 5*time.Minute {
            return errors.New("timeout cannot exceed 5 minutes")
        }
        c.timeout = d
        return nil
    }
}

// WithRetries sets the retry count
func WithRetries(n int) Option {
    return func(c *Client) error {
        if n < 0 || n > 10 {
            return errors.New("retries must be between 0 and 10")
        }
        c.retries = n
        return nil
    }
}

// WithHeader adds a custom header
func WithHeader(key, value string) Option {
    return func(c *Client) error {
        if key == "" {
            return errors.New("header key cannot be empty")
        }
        c.headers[key] = value
        return nil
    }
}

// WithRateLimit sets requests per second
func WithRateLimit(rps int) Option {
    return func(c *Client) error {
        if rps <= 0 {
            return errors.New("rate limit must be positive")
        }
        c.rateLimit = rps
        return nil
    }
}

// NewClient creates a client with validation
func NewClient(opts ...Option) (*Client, error) {
    c := &Client{
        timeout:   30 * time.Second,
        retries:   3,
        headers:   make(map[string]string),
        rateLimit: 100,
    }

    for _, opt := range opts {
        if err := opt(c); err != nil {
            return nil, err
        }
    }

    // Final validation
    if c.baseURL == nil {
        return nil, errors.New("base URL is required")
    }

    return c, nil
}

// Usage
func main() {
    client, err := NewClient(
        WithBaseURL("https://api.example.com"),
        WithTimeout(10*time.Second),
        WithRetries(5),
        WithHeader("Authorization", "Bearer token"),
        WithRateLimit(50),
    )
    if err != nil {
        log.Fatal(err)
    }
    // Use client...
}
```

### Options with Defaults Override

```go
package db

type Config struct {
    Host     string
    Port     int
    User     string
    Password string
    Database string
    SSLMode  string
    PoolSize int
}

// DefaultConfig returns production defaults
func DefaultConfig() *Config {
    return &Config{
        Host:     "localhost",
        Port:     5432,
        SSLMode:  "require",
        PoolSize: 10,
    }
}

// TestConfig returns test defaults
func TestConfig() *Config {
    return &Config{
        Host:     "localhost",
        Port:     5432,
        Database: "test_db",
        SSLMode:  "disable",
        PoolSize: 2,
    }
}

type Option func(*Config)

func WithHost(host string) Option {
    return func(c *Config) { c.Host = host }
}

func WithPort(port int) Option {
    return func(c *Config) { c.Port = port }
}

func WithCredentials(user, password string) Option {
    return func(c *Config) {
        c.User = user
        c.Password = password
    }
}

func WithDatabase(name string) Option {
    return func(c *Config) { c.Database = name }
}

func WithPoolSize(size int) Option {
    return func(c *Config) { c.PoolSize = size }
}

// NewConnection uses DefaultConfig as base
func NewConnection(opts ...Option) (*Connection, error) {
    cfg := DefaultConfig()
    for _, opt := range opts {
        opt(cfg)
    }
    return connect(cfg)
}

// NewTestConnection uses TestConfig as base
func NewTestConnection(opts ...Option) (*Connection, error) {
    cfg := TestConfig()
    for _, opt := range opts {
        opt(cfg)
    }
    return connect(cfg)
}

// Usage
func main() {
    // Production
    prodDB, _ := NewConnection(
        WithCredentials("admin", "secret"),
        WithDatabase("production"),
        WithPoolSize(50),
    )

    // Test (different defaults)
    testDB, _ := NewTestConnection(
        WithCredentials("test", "test"),
    )
}
```

---

## Interview Questions

### Q1: When would you use `sync.Once` vs a `init()` function for singleton initialization?

**Answer**: Use `sync.Once` when:
- Initialization might fail and you need to handle errors
- Initialization depends on runtime values (environment variables, config files)
- You want lazy initialization (only when first accessed)
- Testing requires resetting or mocking the singleton

Use `init()` when:
- Initialization is simple and cannot fail
- The singleton must be ready before `main()` runs
- No testing isolation is needed

### Q2: What's the difference between Builder pattern and Functional Options in Go?

**Answer**:
- **Builder**: Returns builder itself for chaining, separate `Build()` call, good for complex multi-step construction
- **Functional Options**: Pass options to constructor, single function call, Go's idiomatic approach

```go
// Builder
server := NewServerBuilder().
    WithHost("localhost").
    WithPort(8080).
    Build()

// Functional Options
server := NewServer(
    WithHost("localhost"),
    WithPort(8080),
)
```

Functional Options is preferred in Go because:
- Single function call (not two-step)
- Options are reusable and composable
- Self-documenting with IDE autocomplete
- No "builder" object to manage

### Q3: How do you handle initialization errors with `sync.Once`?

**Answer**: Store the error alongside the value:

```go
var (
    instance *DB
    initErr  error
    once     sync.Once
)

func Get() (*DB, error) {
    once.Do(func() {
        instance, initErr = connect()
    })
    return instance, initErr
}
```

### Q4: Why use `sync.Pool` instead of a custom pool?

**Answer**: `sync.Pool` is optimized for:
- Thread-local caching (reduces contention)
- Automatic cleanup during GC
- Zero configuration

Use custom pool when you need:
- Fixed size limits
- Blocking when exhausted
- Object lifetime control
- Custom metrics

### Q5: Implement a thread-safe lazy-initialized singleton with retry on failure.

**Answer**:

```go
var (
    instance *Service
    initOnce sync.Once
    initErr  error
    mu       sync.Mutex
)

func Get() (*Service, error) {
    initOnce.Do(func() {
        instance, initErr = initialize()
    })

    if initErr != nil {
        // Allow retry
        mu.Lock()
        defer mu.Unlock()
        if instance == nil {
            instance, initErr = initialize()
            if initErr == nil {
                initOnce = sync.Once{} // Reset for successful init
            }
        }
    }

    return instance, initErr
}
```

---

## Quick Reference

### Pattern Summary

| Pattern | Use When | Go Implementation |
|---------|----------|-------------------|
| Singleton | Single global instance | `sync.Once` + package-level var |
| Factory Method | Create based on type/config | `NewXxx()` functions |
| Abstract Factory | Families of related objects | Interface returning interfaces |
| Builder | Complex construction | Method chaining or Functional Options |
| Prototype | Clone expensive objects | `Clone()` method or `encoding/gob` |
| Object Pool | Reuse expensive objects | `sync.Pool` or channel-based |
| Functional Options | Many optional parameters | `func(*Config)` variadic |

### Go Idioms

```go
// Factory function naming
func NewServer(opts ...Option) *Server
func NewServerWithConfig(cfg Config) *Server
func MustNewServer(opts ...Option) *Server // panics on error

// Singleton access
func GetInstance() *T
func Default() *T
func Shared() *T

// Pool usage
buf := pool.Get().(*bytes.Buffer)
defer func() {
    buf.Reset()
    pool.Put(buf)
}()

// Functional options
type Option func(*Config)
func WithX(x int) Option {
    return func(c *Config) { c.X = x }
}
```

### Common Mistakes

| Mistake | Problem | Fix |
|---------|---------|-----|
| Non-thread-safe singleton | Race conditions | Use `sync.Once` |
| Forgetting to reset pooled objects | Data leaks | Always `Reset()` before `Put()` |
| Builder without validation | Invalid objects | Validate in `Build()` |
| Copying sync.Once | Doesn't work | Always use pointer |
| Hardcoded factory selection | Inflexible | Use registry or config |

---

## Resources

- [Go Patterns - Creational](https://github.com/tmrts/go-patterns#creational-patterns)
- [Functional Options for Friendly APIs](https://dave.cheney.net/2014/10/17/functional-options-for-friendly-apis)
- [sync.Pool documentation](https://pkg.go.dev/sync#Pool)
- [Effective Go - Constructors](https://go.dev/doc/effective_go#composite_literals)

---

**Previous**: [08-solid-principles.md](08-solid-principles.md) — SOLID Principles in Go

**Next**: [10-design-patterns-structural.md](10-design-patterns-structural.md) — Structural Design Patterns
