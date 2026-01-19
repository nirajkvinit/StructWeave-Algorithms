# Go Standard Library Essentials

> Master the packages that power production Go applications

Go's standard library is one of the language's greatest strengths. This guide covers the packages you'll use most frequently in production code and interviews, from basic I/O to concurrency primitives and modern structured logging.

**Reading time**: 90-120 minutes

---

## Table of Contents

- [Go Standard Library Essentials](#go-standard-library-essentials)
  - [Table of Contents](#table-of-contents)
  - [Philosophy: Batteries Included](#philosophy-batteries-included)
    - [When to Use Standard Library vs External Packages](#when-to-use-standard-library-vs-external-packages)
  - [Core I/O Packages](#core-io-packages)
    - [fmt — Formatted I/O](#fmt--formatted-io)
      - [Format Verbs Cheat Sheet](#format-verbs-cheat-sheet)
      - [Width and Precision](#width-and-precision)
      - [Print Functions](#print-functions)
      - [Common Interview Pattern: String Building](#common-interview-pattern-string-building)
    - [io — Reader and Writer Interfaces](#io--reader-and-writer-interfaces)
      - [Core Interfaces](#core-interfaces)
      - [Types Implementing Reader/Writer](#types-implementing-readerwriter)
      - [Essential io Functions](#essential-io-functions)
      - [io.EOF Pattern](#ioeof-pattern)
    - [bufio — Buffered I/O](#bufio--buffered-io)
      - [Scanner: Line-by-Line Reading](#scanner-line-by-line-reading)
      - [Buffered Reader](#buffered-reader)
      - [Buffered Writer](#buffered-writer)
    - [os — Operating System Interface](#os--operating-system-interface)
      - [File Operations](#file-operations)
      - [Directory Operations](#directory-operations)
      - [Environment Variables](#environment-variables)
      - [Process and Arguments](#process-and-arguments)
  - [String and Data Manipulation](#string-and-data-manipulation)
    - [strings — String Operations](#strings--string-operations)
      - [Searching](#searching)
      - [Transformation](#transformation)
      - [Splitting and Joining](#splitting-and-joining)
      - [strings.Builder (Efficient String Building)](#stringsbuilder-efficient-string-building)
      - [strings.Reader](#stringsreader)
      - [Go 1.24+ Iterator Functions](#go-124-iterator-functions)
    - [bytes — Byte Slice Operations](#bytes--byte-slice-operations)
    - [strconv — Type Conversions](#strconv--type-conversions)
      - [String to Number](#string-to-number)
      - [Number to String](#number-to-string)
      - [Quoting](#quoting)
      - [Append Functions (Allocation-Free)](#append-functions-allocation-free)
    - [regexp — Pattern Matching](#regexp--pattern-matching)
    - [unicode — Character Classification](#unicode--character-classification)
  - [Data Encoding](#data-encoding)
    - [encoding/json — JSON Processing](#encodingjson--json-processing)
      - [Basic Marshal/Unmarshal](#basic-marshalunmarshal)
      - [Struct Tags](#struct-tags)
      - [Dynamic JSON with map\[string\]any](#dynamic-json-with-mapstringany)
      - [Streaming with Encoder/Decoder](#streaming-with-encoderdecoder)
      - [Custom Marshaling](#custom-marshaling)
      - [json.RawMessage: Delay Parsing](#jsonrawmessage-delay-parsing)
    - [encoding/xml — XML Basics](#encodingxml--xml-basics)
    - [encoding/csv — CSV Processing](#encodingcsv--csv-processing)
    - [encoding/base64 — Base64 Encoding](#encodingbase64--base64-encoding)
    - [encoding/gob — Go Binary Format](#encodinggob--go-binary-format)
  - [Collections (Go 1.21+)](#collections-go-121)
    - [slices — Generic Slice Operations](#slices--generic-slice-operations)
      - [Searching and Sorting](#searching-and-sorting)
      - [Searching (Unsorted)](#searching-unsorted)
      - [Modification](#modification)
      - [Comparison](#comparison)
      - [Go 1.23+ Iterators](#go-123-iterators)
    - [maps — Generic Map Operations](#maps--generic-map-operations)
    - [sort — Sorting (Legacy)](#sort--sorting-legacy)
    - [container/heap — Priority Queues](#containerheap--priority-queues)
      - [Generic Priority Queue (Go 1.21+)](#generic-priority-queue-go-121)
    - [container/list — Doubly Linked List](#containerlist--doubly-linked-list)
  - [Time and Context](#time-and-context)
    - [time — Time and Duration](#time--time-and-duration)
      - [The Reference Time](#the-reference-time)
      - [Common Format Strings](#common-format-strings)
      - [Parsing and Formatting](#parsing-and-formatting)
      - [Duration](#duration)
      - [Time Operations](#time-operations)
      - [Timer and Ticker](#timer-and-ticker)
    - [context — Cancellation and Deadlines](#context--cancellation-and-deadlines)
      - [Creating Contexts](#creating-contexts)
      - [Using Contexts](#using-contexts)
      - [Context Decision Tree](#context-decision-tree)
      - [Context in HTTP Handlers](#context-in-http-handlers)
      - [WithoutCancel (Go 1.21+)](#withoutcancel-go-121)
      - [AfterFunc (Go 1.21+)](#afterfunc-go-121)
  - [Networking](#networking)
    - [net/http — HTTP Client and Server](#nethttp--http-client-and-server)
      - [HTTP Client](#http-client)
      - [HTTP Server (Go 1.22+ Routing)](#http-server-go-122-routing)
      - [Middleware Pattern](#middleware-pattern)
      - [Response Writing](#response-writing)
    - [net/url — URL Parsing](#neturl--url-parsing)
    - [net — Low-Level Networking](#net--low-level-networking)
  - [Concurrency Primitives](#concurrency-primitives)
    - [sync — Synchronization](#sync--synchronization)
      - [Mutex](#mutex)
      - [WaitGroup](#waitgroup)
      - [Once](#once)
      - [Pool](#pool)
      - [Map](#map)
      - [Cond](#cond)
    - [sync/atomic — Atomic Operations](#syncatomic--atomic-operations)
  - [Error Handling](#error-handling)
    - [errors — Error Creation and Wrapping](#errors--error-creation-and-wrapping)
  - [Logging](#logging)
    - [log — Basic Logging](#log--basic-logging)
    - [log/slog — Structured Logging (Go 1.21+)](#logslog--structured-logging-go-121)
      - [Basic Usage](#basic-usage)
      - [Handlers](#handlers)
      - [Structured Attributes](#structured-attributes)
      - [Logger With Context](#logger-with-context)
      - [Custom Handler](#custom-handler)
  - [Testing](#testing)
    - [testing — Test Framework](#testing--test-framework)
      - [Basic Tests](#basic-tests)
      - [Table-Driven Tests](#table-driven-tests)
      - [Subtests and Parallel](#subtests-and-parallel)
      - [Test Helpers](#test-helpers)
      - [Benchmarks](#benchmarks)
      - [Test Main](#test-main)
      - [Fuzzing (Go 1.18+)](#fuzzing-go-118)
    - [testing/fstest — File System Testing](#testingfstest--file-system-testing)
    - [testing/synctest — Concurrent Testing (Go 1.25)](#testingsynctest--concurrent-testing-go-125)
  - [File System Operations](#file-system-operations)
    - [path/filepath — Path Manipulation](#pathfilepath--path-manipulation)
    - [io/fs — File System Abstraction](#iofs--file-system-abstraction)
  - [Other Essential Packages](#other-essential-packages)
    - [flag — Command-Line Parsing](#flag--command-line-parsing)
    - [math and math/rand — Mathematics](#math-and-mathrand--mathematics)
      - [math/rand/v2 (Go 1.22+)](#mathrandv2-go-122)
    - [crypto — Hashing and Encryption](#crypto--hashing-and-encryption)
    - [database/sql — SQL Database Access](#databasesql--sql-database-access)
  - [Quick Reference Cards](#quick-reference-cards)
    - [Format Verbs Summary](#format-verbs-summary)
    - [Time Format Reference](#time-format-reference)
    - [Context Quick Reference](#context-quick-reference)
    - [sync Primitives](#sync-primitives)
    - [Testing Patterns](#testing-patterns)
  - [Interview Questions](#interview-questions)
    - [Q1: What are the differences between `%v`, `%+v`, and `%#v`?](#q1-what-are-the-differences-between-v-v-and-v)
    - [Q2: Explain Go's time format string design.](#q2-explain-gos-time-format-string-design)
    - [Q3: When should you use `context.Background()` vs `context.TODO()`?](#q3-when-should-you-use-contextbackground-vs-contexttodo)
    - [Q4: How do `errors.Is` and `errors.As` differ?](#q4-how-do-errorsis-and-errorsas-differ)
    - [Q5: What's the difference between `sync.Mutex` and `sync.RWMutex`?](#q5-whats-the-difference-between-syncmutex-and-syncrwmutex)
    - [Q6: How do you implement a priority queue in Go?](#q6-how-do-you-implement-a-priority-queue-in-go)
    - [Q7: What's the purpose of `json.RawMessage`?](#q7-whats-the-purpose-of-jsonrawmessage)
    - [Q8: Explain the difference between `log` and `log/slog`.](#q8-explain-the-difference-between-log-and-logslog)
    - [Q9: How does `strings.Builder` improve performance over string concatenation?](#q9-how-does-stringsbuilder-improve-performance-over-string-concatenation)
    - [Q10: When would you use `io.TeeReader`?](#q10-when-would-you-use-ioteereader)
  - [Resources](#resources)
    - [Official Documentation](#official-documentation)
    - [Package Deep Dives](#package-deep-dives)
    - [Release Notes](#release-notes)
    - [Tutorials](#tutorials)

---

## Philosophy: Batteries Included

Go's standard library follows key design principles:

| Principle | Description |
|-----------|-------------|
| **Minimal dependencies** | Prefer standard library over external packages when possible |
| **Composition over inheritance** | Small interfaces combine to build larger abstractions |
| **Explicit over implicit** | No magic—error handling, resource management are visible |
| **Concurrency-safe** | Many packages designed for concurrent use from the start |

### When to Use Standard Library vs External Packages

```go
// PREFER standard library for:
// - HTTP servers (net/http is production-ready since Go 1.22+)
// - JSON handling (encoding/json covers most cases)
// - Testing (testing package + subtests)
// - Logging (log/slog in Go 1.21+)
// - Basic CLI tools (flag package)

// CONSIDER external packages for:
// - Complex routing with middleware (chi, echo)
// - Database ORM (sqlx, gorm)
// - Validation (go-playground/validator)
// - Configuration (viper, envconfig)
// - CLI frameworks (cobra, urfave/cli)
```

---

## Core I/O Packages

### fmt — Formatted I/O

The `fmt` package provides formatted I/O similar to C's printf/scanf.

#### Format Verbs Cheat Sheet

| Verb | Description | Example |
|------|-------------|---------|
| `%v` | Default format | `fmt.Printf("%v", user)` → `{Alice 30}` |
| `%+v` | Include field names | `fmt.Printf("%+v", user)` → `{Name:Alice Age:30}` |
| `%#v` | Go syntax representation | `fmt.Printf("%#v", user)` → `main.User{Name:"Alice", Age:30}` |
| `%T` | Type of value | `fmt.Printf("%T", user)` → `main.User` |
| `%d` | Decimal integer | `fmt.Printf("%d", 42)` → `42` |
| `%b` | Binary | `fmt.Printf("%b", 5)` → `101` |
| `%x` | Hexadecimal (lowercase) | `fmt.Printf("%x", 255)` → `ff` |
| `%X` | Hexadecimal (uppercase) | `fmt.Printf("%X", 255)` → `FF` |
| `%f` | Floating point | `fmt.Printf("%f", 3.14)` → `3.140000` |
| `%.2f` | Float with precision | `fmt.Printf("%.2f", 3.14159)` → `3.14` |
| `%e` | Scientific notation | `fmt.Printf("%e", 1234.5)` → `1.234500e+03` |
| `%s` | String | `fmt.Printf("%s", "hello")` → `hello` |
| `%q` | Quoted string | `fmt.Printf("%q", "hello")` → `"hello"` |
| `%p` | Pointer address | `fmt.Printf("%p", &x)` → `0xc0000b4008` |
| `%t` | Boolean | `fmt.Printf("%t", true)` → `true` |
| `%%` | Literal percent sign | `fmt.Printf("100%%")` → `100%` |

#### Width and Precision

```go
// Width: minimum characters, padded with spaces
fmt.Printf("|%6d|", 42)      // |    42|  (right-aligned)
fmt.Printf("|%-6d|", 42)     // |42    |  (left-aligned)
fmt.Printf("|%06d|", 42)     // |000042|  (zero-padded)

// Precision for floats
fmt.Printf("|%8.2f|", 3.14159)  // |    3.14|  (width 8, 2 decimal places)
fmt.Printf("|%-8.2f|", 3.14159) // |3.14    |  (left-aligned)

// Precision for strings (truncation)
fmt.Printf("|%.5s|", "hello world") // |hello|  (max 5 chars)
fmt.Printf("|%8.5s|", "hello world") // |   hello|  (width 8, max 5 chars)
```

#### Print Functions

```go
// Print to stdout
fmt.Print("no newline")          // Print without newline
fmt.Println("with newline")      // Print with newline
fmt.Printf("formatted: %d\n", 42) // Printf with format string

// Return string instead of printing
s := fmt.Sprint("value: ", 42)           // "value: 42"
s = fmt.Sprintf("value: %d", 42)         // "value: 42"
s = fmt.Sprintln("value:", 42)           // "value: 42\n"

// Print to io.Writer
fmt.Fprint(os.Stderr, "error")
fmt.Fprintf(w, "Hello, %s!", name)
fmt.Fprintln(file, "log entry")

// Scanning input
var name string
var age int
fmt.Scan(&name, &age)                    // Space-separated input
fmt.Scanf("%s %d", &name, &age)          // Formatted input
fmt.Sscanf("Alice 30", "%s %d", &name, &age) // From string
```

#### Common Interview Pattern: String Building

```go
// BAD: String concatenation in loop (O(n²))
result := ""
for i := 0; i < n; i++ {
    result += fmt.Sprintf("%d", i) // Creates new string each time
}

// GOOD: Use strings.Builder or bytes.Buffer
var sb strings.Builder
for i := 0; i < n; i++ {
    fmt.Fprintf(&sb, "%d", i)
}
result := sb.String()
```

---

### io — Reader and Writer Interfaces

The `io` package defines the fundamental interfaces for I/O operations.

#### Core Interfaces

```go
// Reader: source of bytes
type Reader interface {
    Read(p []byte) (n int, err error)
}

// Writer: destination for bytes
type Writer interface {
    Write(p []byte) (n int, err error)
}

// Closer: resource that can be closed
type Closer interface {
    Close() error
}

// Combined interfaces
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

#### Types Implementing Reader/Writer

| Type | Reader | Writer | Package |
|------|--------|--------|---------|
| `*os.File` | Yes | Yes | os |
| `*bytes.Buffer` | Yes | Yes | bytes |
| `*bytes.Reader` | Yes | No | bytes |
| `*strings.Reader` | Yes | No | strings |
| `*strings.Builder` | No | Yes | strings |
| `*bufio.Reader` | Yes | No | bufio |
| `*bufio.Writer` | No | Yes | bufio |
| `http.Response.Body` | Yes | No | net/http |
| `http.Request.Body` | Yes | No | net/http |
| `net.Conn` | Yes | Yes | net |

#### Essential io Functions

```go
// Read all bytes from a reader
data, err := io.ReadAll(reader) // Returns []byte

// Copy all data from reader to writer
written, err := io.Copy(dst, src)

// Copy with a buffer size limit
written, err := io.CopyN(dst, src, 1024) // Max 1024 bytes

// Create a pipe (connected reader/writer)
pr, pw := io.Pipe()
go func() {
    fmt.Fprint(pw, "hello")
    pw.Close()
}()
data, _ := io.ReadAll(pr)

// Multi-reader: concatenate readers
r := io.MultiReader(reader1, reader2, reader3)

// Multi-writer: write to multiple destinations
w := io.MultiWriter(file, os.Stdout)

// Tee reader: read and write simultaneously
tee := io.TeeReader(src, dst) // Reads from src, writes to dst

// Limit reader: restrict bytes read
limited := io.LimitReader(reader, 1024) // Max 1024 bytes

// Section reader: read portion of a ReaderAt
section := io.NewSectionReader(readerAt, offset, length)

// Discard: writer that discards all data
io.Copy(io.Discard, reader) // Consume without storing
```

#### io.EOF Pattern

```go
// EOF is the expected end of input, not an error
for {
    n, err := reader.Read(buf)
    if err == io.EOF {
        break // Normal termination
    }
    if err != nil {
        return err // Actual error
    }
    process(buf[:n])
}
```

---

### bufio — Buffered I/O

The `bufio` package implements buffered I/O for efficient reading and writing.

#### Scanner: Line-by-Line Reading

```go
// Read file line by line (most common pattern)
file, err := os.Open("data.txt")
if err != nil {
    return err
}
defer file.Close()

scanner := bufio.NewScanner(file)
for scanner.Scan() {
    line := scanner.Text() // Current line (without \n)
    fmt.Println(line)
}
if err := scanner.Err(); err != nil {
    return err
}

// Scan words instead of lines
scanner.Split(bufio.ScanWords)

// Scan bytes
scanner.Split(bufio.ScanBytes)

// Scan runes (Unicode code points)
scanner.Split(bufio.ScanRunes)

// Custom scanner with larger buffer (default 64KB max)
scanner := bufio.NewScanner(file)
buf := make([]byte, 0, 1024*1024) // 1MB buffer
scanner.Buffer(buf, 10*1024*1024) // 10MB max token size
```

#### Buffered Reader

```go
reader := bufio.NewReader(file)

// Read until delimiter
line, err := reader.ReadString('\n') // Includes delimiter
line, err := reader.ReadBytes('\n')  // Returns []byte

// Peek without consuming
peek, err := reader.Peek(10) // Look at next 10 bytes

// Read single byte or rune
b, err := reader.ReadByte()
r, size, err := reader.ReadRune()

// Unread (put back)
reader.UnreadByte()
reader.UnreadRune()

// Check buffered data
n := reader.Buffered() // Bytes available in buffer
```

#### Buffered Writer

```go
writer := bufio.NewWriter(file)
// Or with custom buffer size
writer := bufio.NewWriterSize(file, 64*1024) // 64KB buffer

writer.WriteString("Hello\n")
writer.Write([]byte("World\n"))
writer.WriteByte('!')
writer.WriteRune('!')

// CRITICAL: Always flush before closing
writer.Flush() // Write buffered data to underlying writer

// Check available buffer space
available := writer.Available()
buffered := writer.Buffered()
```

---

### os — Operating System Interface

The `os` package provides platform-independent OS functionality.

#### File Operations

```go
// Read entire file (simple cases)
data, err := os.ReadFile("config.json")

// Write entire file (simple cases)
err := os.WriteFile("output.txt", data, 0644)

// Open file for reading
file, err := os.Open("data.txt") // Read-only
defer file.Close()

// Create/truncate file for writing
file, err := os.Create("output.txt") // Write-only, creates or truncates
defer file.Close()

// Open with full control
file, err := os.OpenFile("data.txt",
    os.O_RDWR|os.O_CREATE|os.O_APPEND, // Flags
    0644,                               // Permissions
)

// File flags
os.O_RDONLY // Read-only
os.O_WRONLY // Write-only
os.O_RDWR   // Read-write
os.O_CREATE // Create if not exists
os.O_TRUNC  // Truncate if exists
os.O_APPEND // Append to end
os.O_EXCL   // Error if exists (with O_CREATE)
```

#### Directory Operations

```go
// Create directory
err := os.Mkdir("newdir", 0755)

// Create nested directories
err := os.MkdirAll("path/to/newdir", 0755)

// Remove file or empty directory
err := os.Remove("file.txt")

// Remove directory and contents
err := os.RemoveAll("directory")

// Rename/move file
err := os.Rename("old.txt", "new.txt")

// Get current directory
cwd, err := os.Getwd()

// Change directory
err := os.Chdir("/path/to/dir")

// Read directory entries
entries, err := os.ReadDir(".")
for _, entry := range entries {
    fmt.Println(entry.Name(), entry.IsDir())
}
```

#### Environment Variables

```go
// Get environment variable
value := os.Getenv("HOME")        // Empty string if not set
value, exists := os.LookupEnv("HOME") // Check if set

// Set environment variable
err := os.Setenv("MY_VAR", "value")

// Unset environment variable
err := os.Unsetenv("MY_VAR")

// Get all environment variables
environ := os.Environ() // []string{"KEY=value", ...}

// Expand environment variables in string
expanded := os.ExpandEnv("$HOME/config") // /Users/alice/config
```

#### Process and Arguments

```go
// Command-line arguments
args := os.Args    // []string{program, arg1, arg2, ...}
program := os.Args[0]
args := os.Args[1:]

// Exit program
os.Exit(0) // Success
os.Exit(1) // Error (does NOT run deferred functions)

// Process info
pid := os.Getpid()   // Process ID
ppid := os.Getppid() // Parent process ID
uid := os.Getuid()   // User ID
gid := os.Getgid()   // Group ID

// Standard I/O
os.Stdin  // *os.File for standard input
os.Stdout // *os.File for standard output
os.Stderr // *os.File for standard error
```

---

## String and Data Manipulation

### strings — String Operations

The `strings` package provides string manipulation functions.

#### Searching

```go
strings.Contains("hello", "ell")      // true
strings.ContainsAny("hello", "xyz")   // false (no x, y, or z)
strings.ContainsRune("hello", 'e')    // true

strings.HasPrefix("hello", "he")      // true
strings.HasSuffix("hello", "lo")      // true

strings.Index("hello", "l")           // 2 (first occurrence)
strings.LastIndex("hello", "l")       // 3 (last occurrence)
strings.IndexAny("hello", "aeiou")    // 1 (first vowel)
strings.IndexRune("hello", 'o')       // 4

strings.Count("hello", "l")           // 2
```

#### Transformation

```go
strings.ToUpper("Hello")              // "HELLO"
strings.ToLower("Hello")              // "hello"
strings.ToTitle("hello world")        // "HELLO WORLD"
strings.Title("hello world")          // "Hello World" (deprecated, use cases)

strings.TrimSpace("  hello  ")        // "hello"
strings.Trim("!!!hello!!!", "!")      // "hello"
strings.TrimLeft("!!!hello", "!")     // "hello"
strings.TrimRight("hello!!!", "!")    // "hello"
strings.TrimPrefix("hello.txt", "hello") // ".txt"
strings.TrimSuffix("hello.txt", ".txt")  // "hello"

strings.Replace("hello", "l", "L", 1)    // "heLlo" (first occurrence)
strings.Replace("hello", "l", "L", -1)   // "heLLo" (all occurrences)
strings.ReplaceAll("hello", "l", "L")    // "heLLo" (Go 1.12+)

strings.Repeat("ab", 3)               // "ababab"
```

#### Splitting and Joining

```go
strings.Split("a,b,c", ",")           // []string{"a", "b", "c"}
strings.SplitN("a,b,c", ",", 2)       // []string{"a", "b,c"} (max 2 parts)
strings.SplitAfter("a,b,c", ",")      // []string{"a,", "b,", "c"}
strings.Fields("  hello   world  ")   // []string{"hello", "world"}
strings.FieldsFunc("a1b2c", func(r rune) bool {
    return r >= '0' && r <= '9'
}) // []string{"a", "b", "c"}

strings.Join([]string{"a", "b", "c"}, ",") // "a,b,c"
```

#### strings.Builder (Efficient String Building)

```go
// GOOD: Use Builder for constructing strings
var sb strings.Builder
sb.Grow(100) // Pre-allocate if size is known

for i := 0; i < 10; i++ {
    sb.WriteString("hello")
    sb.WriteByte(' ')
    sb.WriteRune('!')
}

result := sb.String()
sb.Reset() // Reuse builder

// Builder implements io.Writer
fmt.Fprintf(&sb, "Value: %d", 42)
```

#### strings.Reader

```go
// Create reader from string
r := strings.NewReader("hello world")

// Implements: io.Reader, io.ReaderAt, io.Seeker, io.WriterTo, io.ByteScanner, io.RuneScanner
data := make([]byte, 5)
r.Read(data) // "hello"

r.Seek(0, io.SeekStart) // Reset to beginning
r.Len()                 // Remaining bytes
r.Size()                // Total size
```

#### Go 1.24+ Iterator Functions

```go
// Iterate over lines (Go 1.24+)
for line := range strings.Lines("a\nb\nc") {
    fmt.Println(line) // "a", "b", "c"
}

// Split with iterator
for part := range strings.SplitSeq("a,b,c", ",") {
    fmt.Println(part)
}

// Fields with iterator
for word := range strings.FieldsSeq("  hello   world  ") {
    fmt.Println(word)
}
```

---

### bytes — Byte Slice Operations

The `bytes` package mirrors `strings` for `[]byte` operations.

```go
// Similar to strings package
bytes.Contains([]byte("hello"), []byte("ell"))
bytes.HasPrefix([]byte("hello"), []byte("he"))
bytes.Split([]byte("a,b,c"), []byte(","))
bytes.Join([][]byte{b1, b2}, []byte(","))

// bytes.Buffer: read/write byte buffer
var buf bytes.Buffer
buf.Write([]byte("hello"))
buf.WriteString(" world")
buf.WriteByte('!')

data := buf.Bytes()  // []byte (no copy)
str := buf.String()  // string (copy)

// Read from buffer
p := make([]byte, 5)
buf.Read(p)

// bytes.Reader: read-only
r := bytes.NewReader([]byte("hello"))

// Compare byte slices
bytes.Equal(a, b)        // a == b
bytes.Compare(a, b)      // -1, 0, or 1
```

---

### strconv — Type Conversions

The `strconv` package converts between strings and basic types.

#### String to Number

```go
// Atoi: string to int (base 10)
i, err := strconv.Atoi("42")    // 42, nil
i, err := strconv.Atoi("abc")   // 0, error

// ParseInt: string to int64 with base and bit size
i, err := strconv.ParseInt("42", 10, 64)    // Base 10, 64-bit
i, err := strconv.ParseInt("2A", 16, 32)    // Hex, 32-bit → 42
i, err := strconv.ParseInt("101", 2, 8)     // Binary, 8-bit → 5
i, err := strconv.ParseInt("-42", 10, 64)   // Negative

// ParseUint: unsigned
u, err := strconv.ParseUint("42", 10, 64)

// ParseFloat: string to float
f, err := strconv.ParseFloat("3.14", 64)    // 64-bit float
f, err := strconv.ParseFloat("3.14e10", 64) // Scientific notation
f, err := strconv.ParseFloat("NaN", 64)     // NaN

// ParseBool: string to bool
b, err := strconv.ParseBool("true")   // true
b, err := strconv.ParseBool("1")      // true
b, err := strconv.ParseBool("false")  // false
b, err := strconv.ParseBool("0")      // false
```

#### Number to String

```go
// Itoa: int to string (base 10)
s := strconv.Itoa(42)           // "42"

// FormatInt: int64 to string with base
s := strconv.FormatInt(42, 10)  // "42" (decimal)
s := strconv.FormatInt(42, 16)  // "2a" (hex)
s := strconv.FormatInt(42, 2)   // "101010" (binary)

// FormatUint: unsigned
s := strconv.FormatUint(42, 10)

// FormatFloat: float to string
s := strconv.FormatFloat(3.14159, 'f', 2, 64) // "3.14"
// Format: 'f' decimal, 'e' scientific, 'g' compact
// Precision: decimal places (-1 for smallest representation)
// Bit size: 32 or 64

// FormatBool: bool to string
s := strconv.FormatBool(true)   // "true"
```

#### Quoting

```go
// Quote: add quotes and escape
s := strconv.Quote("hello\nworld")     // "\"hello\\nworld\""
s := strconv.QuoteRune('a')            // "'a'"
s := strconv.QuoteToASCII("héllo")     // "\"h\\u00e9llo\""

// Unquote: remove quotes and unescape
s, err := strconv.Unquote(`"hello"`)   // "hello"
s, err := strconv.Unquote(`'a'`)       // "a"
```

#### Append Functions (Allocation-Free)

```go
// Append to existing byte slice (avoids allocation)
buf := make([]byte, 0, 32)
buf = strconv.AppendInt(buf, 42, 10)
buf = strconv.AppendFloat(buf, 3.14, 'f', 2, 64)
buf = strconv.AppendBool(buf, true)
buf = strconv.AppendQuote(buf, "hello")
```

---

### regexp — Pattern Matching

The `regexp` package implements regular expression search.

```go
// Compile pattern (returns error)
re, err := regexp.Compile(`\d+`)

// MustCompile (panics on error, use for constants)
re := regexp.MustCompile(`\d+`)

// Match: check if pattern matches
matched := re.MatchString("abc123def") // true

// Find: first match
s := re.FindString("abc123def456")     // "123"
b := re.Find([]byte("abc123def456"))   // []byte("123")

// FindAll: all matches
ss := re.FindAllString("abc123def456", -1) // []string{"123", "456"}
ss = re.FindAllString("abc123def456", 1)   // []string{"123"} (limit)

// FindIndex: position of match
loc := re.FindStringIndex("abc123def")     // []int{3, 6}

// Submatch: capture groups
re := regexp.MustCompile(`(\w+)@(\w+)\.(\w+)`)
match := re.FindStringSubmatch("user@example.com")
// []string{"user@example.com", "user", "example", "com"}

// Replace
s := re.ReplaceAllString("abc123def", "X")     // "abcXdef"
s := re.ReplaceAllLiteralString("abc123", "$1") // "abc$1" (no expansion)
s := re.ReplaceAllStringFunc("abc123", strings.ToUpper) // "abcXYZdef"

// Split
parts := re.Split("a1b2c3", -1)  // []string{"a", "b", "c", ""}

// Common patterns
emailRe := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
phoneRe := regexp.MustCompile(`^\+?[1-9]\d{1,14}$`)
ipv4Re := regexp.MustCompile(`^(\d{1,3}\.){3}\d{1,3}$`)
```

---

### unicode — Character Classification

```go
import "unicode"

// Character classification
unicode.IsLetter('a')    // true
unicode.IsDigit('5')     // true
unicode.IsSpace(' ')     // true
unicode.IsPunct('!')     // true
unicode.IsUpper('A')     // true
unicode.IsLower('a')     // true

// Case conversion
unicode.ToUpper('a')     // 'A'
unicode.ToLower('A')     // 'a'
unicode.ToTitle('a')     // 'A'

// Unicode categories
unicode.Is(unicode.Latin, 'a')      // true
unicode.Is(unicode.Cyrillic, 'Д')   // true
unicode.Is(unicode.Han, '中')        // true
```

---

## Data Encoding

### encoding/json — JSON Processing

JSON encoding is critical for APIs and configuration. This is one of the most interview-relevant packages.

#### Basic Marshal/Unmarshal

```go
// Struct to JSON
type User struct {
    Name  string `json:"name"`
    Email string `json:"email"`
    Age   int    `json:"age,omitempty"` // Omit if zero
}

user := User{Name: "Alice", Email: "alice@example.com", Age: 30}
data, err := json.Marshal(user)
// {"name":"Alice","email":"alice@example.com","age":30}

// Pretty print
data, err := json.MarshalIndent(user, "", "  ")

// JSON to struct
var user User
err := json.Unmarshal(data, &user)
```

#### Struct Tags

| Tag | Effect |
|-----|--------|
| `json:"name"` | Use "name" as JSON key |
| `json:"name,omitempty"` | Omit if zero value |
| `json:"-"` | Never encode/decode |
| `json:",string"` | Encode number as string |

```go
type Config struct {
    Debug     bool   `json:"debug,omitempty"`
    Port      int    `json:"port,string"`      // "8080" instead of 8080
    Password  string `json:"-"`                // Never in JSON
    internal  string                           // Unexported, never in JSON
}
```

#### Dynamic JSON with map[string]any

```go
// Parse unknown JSON structure
var data map[string]any
err := json.Unmarshal(jsonBytes, &data)

name := data["name"].(string)
age := data["age"].(float64) // Numbers are float64 in any

// Nested access
nested := data["user"].(map[string]any)
email := nested["email"].(string)

// Type assertion with ok
if age, ok := data["age"].(float64); ok {
    fmt.Printf("Age: %d\n", int(age))
}
```

#### Streaming with Encoder/Decoder

```go
// Decoder: read JSON from io.Reader
decoder := json.NewDecoder(resp.Body)
var user User
if err := decoder.Decode(&user); err != nil {
    return err
}

// Encoder: write JSON to io.Writer
encoder := json.NewEncoder(os.Stdout)
encoder.SetIndent("", "  ")
encoder.Encode(user)

// Streaming multiple JSON objects
for decoder.More() {
    var item Item
    if err := decoder.Decode(&item); err != nil {
        break
    }
    process(item)
}
```

#### Custom Marshaling

```go
type Time struct {
    time.Time
}

func (t Time) MarshalJSON() ([]byte, error) {
    return json.Marshal(t.Format("2006-01-02"))
}

func (t *Time) UnmarshalJSON(data []byte) error {
    var s string
    if err := json.Unmarshal(data, &s); err != nil {
        return err
    }
    parsed, err := time.Parse("2006-01-02", s)
    if err != nil {
        return err
    }
    t.Time = parsed
    return nil
}
```

#### json.RawMessage: Delay Parsing

```go
type Message struct {
    Type    string          `json:"type"`
    Payload json.RawMessage `json:"payload"` // Parse later
}

var msg Message
json.Unmarshal(data, &msg)

switch msg.Type {
case "user":
    var user User
    json.Unmarshal(msg.Payload, &user)
case "order":
    var order Order
    json.Unmarshal(msg.Payload, &order)
}
```

---

### encoding/xml — XML Basics

```go
type Person struct {
    XMLName xml.Name `xml:"person"`
    Name    string   `xml:"name"`
    Age     int      `xml:"age,attr"`    // As attribute
    Email   string   `xml:"contact>email"` // Nested element
}

// Marshal
p := Person{Name: "Alice", Age: 30, Email: "alice@example.com"}
data, _ := xml.MarshalIndent(p, "", "  ")
// <person age="30">
//   <name>Alice</name>
//   <contact>
//     <email>alice@example.com</email>
//   </contact>
// </person>

// Unmarshal
var p Person
xml.Unmarshal(data, &p)
```

---

### encoding/csv — CSV Processing

```go
// Read CSV
file, _ := os.Open("data.csv")
reader := csv.NewReader(file)

// Read all records
records, err := reader.ReadAll()
for _, record := range records {
    fmt.Println(record) // []string{"field1", "field2", ...}
}

// Read record by record
for {
    record, err := reader.Read()
    if err == io.EOF {
        break
    }
    if err != nil {
        return err
    }
    fmt.Println(record)
}

// Write CSV
file, _ := os.Create("output.csv")
writer := csv.NewWriter(file)
writer.Write([]string{"name", "age", "email"})
writer.Write([]string{"Alice", "30", "alice@example.com"})
writer.Flush()
```

---

### encoding/base64 — Base64 Encoding

```go
import "encoding/base64"

// Standard encoding
encoded := base64.StdEncoding.EncodeToString([]byte("hello"))
decoded, _ := base64.StdEncoding.DecodeString(encoded)

// URL-safe encoding (- and _ instead of + and /)
encoded := base64.URLEncoding.EncodeToString([]byte("hello"))

// Raw encoding (no padding)
encoded := base64.RawStdEncoding.EncodeToString([]byte("hello"))
encoded := base64.RawURLEncoding.EncodeToString([]byte("hello"))

// Stream encoding
encoder := base64.NewEncoder(base64.StdEncoding, os.Stdout)
encoder.Write(data)
encoder.Close() // Required to flush
```

---

### encoding/gob — Go Binary Format

Gob is Go's native binary encoding, efficient for Go-to-Go communication.

```go
import "encoding/gob"

// Encode
var buf bytes.Buffer
encoder := gob.NewEncoder(&buf)
encoder.Encode(myStruct)

// Decode
decoder := gob.NewDecoder(&buf)
var result MyStruct
decoder.Decode(&result)

// Register types for interface values
gob.Register(MyConcreteType{})
```

---

## Collections (Go 1.21+)

### slices — Generic Slice Operations

The `slices` package (Go 1.21+) provides type-safe slice operations.

#### Searching and Sorting

```go
import "slices"

nums := []int{3, 1, 4, 1, 5, 9, 2, 6}

// Sort (modifies in place)
slices.Sort(nums)                    // [1 1 2 3 4 5 6 9]

// Sort with custom function
slices.SortFunc(nums, func(a, b int) int {
    return cmp.Compare(b, a) // Descending
})

// Sort stable (preserves order of equal elements)
slices.SortStableFunc(items, compareFunc)

// Check if sorted
slices.IsSorted(nums)                // true/false
slices.IsSortedFunc(nums, cmp)

// Binary search (requires sorted slice)
idx, found := slices.BinarySearch(nums, 5)
idx, found := slices.BinarySearchFunc(items, target, cmp)
```

#### Searching (Unsorted)

```go
// Contains
slices.Contains(nums, 5)              // true

// Index (linear search)
slices.Index(nums, 5)                 // Returns index or -1
slices.IndexFunc(nums, func(n int) bool {
    return n > 5
})

// Min and Max
min := slices.Min(nums)
max := slices.Max(nums)
minFunc := slices.MinFunc(items, cmp)
maxFunc := slices.MaxFunc(items, cmp)
```

#### Modification

```go
// Reverse (in place)
slices.Reverse(nums)

// Compact (remove consecutive duplicates)
nums := []int{1, 1, 2, 2, 2, 3}
nums = slices.Compact(nums)           // [1 2 3]
nums = slices.CompactFunc(nums, func(a, b int) bool {
    return a == b
})

// Insert
nums = slices.Insert(nums, 2, 10, 20) // Insert 10, 20 at index 2

// Delete
nums = slices.Delete(nums, 2, 4)      // Delete indices [2, 4)

// Replace
nums = slices.Replace(nums, 1, 3, 10, 20, 30) // Replace [1:3] with new values

// Clone
copy := slices.Clone(nums)

// Grow (increase capacity)
nums = slices.Grow(nums, 100)         // Ensure capacity for 100 more

// Clip (reduce capacity to length)
nums = slices.Clip(nums)
```

#### Comparison

```go
// Equal
slices.Equal([]int{1, 2, 3}, []int{1, 2, 3})     // true
slices.EqualFunc(a, b, func(x, y int) bool {
    return x == y
})

// Compare (lexicographic)
slices.Compare([]int{1, 2}, []int{1, 3})         // -1
```

#### Go 1.23+ Iterators

```go
// Iterate over values
for v := range slices.Values(nums) {
    fmt.Println(v)
}

// Iterate over indices and values
for i, v := range slices.All(nums) {
    fmt.Println(i, v)
}

// Iterate in reverse
for v := range slices.Backward(nums) {
    fmt.Println(v)
}

// Sorted iterator (doesn't modify original)
for v := range slices.Sorted(slices.Values(nums)) {
    fmt.Println(v)
}

// Collect iterator into slice
nums := slices.Collect(iterator)

// Append from iterator
nums = slices.AppendSeq(nums, iterator)
```

---

### maps — Generic Map Operations

```go
import "maps"

m := map[string]int{"a": 1, "b": 2, "c": 3}

// Clone
copy := maps.Clone(m)

// Copy entries from one map to another
maps.Copy(dst, src) // Overwrites existing keys in dst

// Delete matching entries
maps.DeleteFunc(m, func(k string, v int) bool {
    return v < 2
})

// Equal
maps.Equal(m1, m2)
maps.EqualFunc(m1, m2, func(v1, v2 int) bool {
    return v1 == v2
})

// Go 1.23+ Iterators
for k := range maps.Keys(m) {
    fmt.Println(k)
}

for v := range maps.Values(m) {
    fmt.Println(v)
}

for k, v := range maps.All(m) {
    fmt.Println(k, v)
}

// Collect from iterators
m := maps.Collect(iterator) // iter.Seq2[K, V] → map[K]V

// Insert from iterator
maps.Insert(m, iterator)
```

---

### sort — Sorting (Legacy)

The `sort` package is still useful for some patterns. Prefer `slices` for new code.

```go
import "sort"

// Sort slices of basic types
sort.Ints(nums)
sort.Strings(strs)
sort.Float64s(floats)

// Check if sorted
sort.IntsAreSorted(nums)

// Custom sort (implement sort.Interface)
type ByAge []Person

func (a ByAge) Len() int           { return len(a) }
func (a ByAge) Swap(i, j int)      { a[i], a[j] = a[j], a[i] }
func (a ByAge) Less(i, j int) bool { return a[i].Age < a[j].Age }

people := []Person{{Name: "Alice", Age: 30}, {Name: "Bob", Age: 25}}
sort.Sort(ByAge(people))

// Or use sort.Slice (easier)
sort.Slice(people, func(i, j int) bool {
    return people[i].Age < people[j].Age
})

// Binary search
idx := sort.SearchInts(nums, target)    // First index where nums[idx] >= target
idx := sort.SearchStrings(strs, target)
idx := sort.Search(len(nums), func(i int) bool {
    return nums[i] >= target
})
```

---

### container/heap — Priority Queues

The `container/heap` package provides heap operations. You implement the interface.

```go
import "container/heap"

// Implement heap.Interface
type IntHeap []int

func (h IntHeap) Len() int           { return len(h) }
func (h IntHeap) Less(i, j int) bool { return h[i] < h[j] } // Min-heap
func (h IntHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }

func (h *IntHeap) Push(x any) {
    *h = append(*h, x.(int))
}

func (h *IntHeap) Pop() any {
    old := *h
    n := len(old)
    x := old[n-1]
    *h = old[0 : n-1]
    return x
}

// Usage
h := &IntHeap{3, 1, 4, 1, 5, 9}
heap.Init(h)                    // Build heap: O(n)
heap.Push(h, 2)                 // Add element: O(log n)
min := heap.Pop(h).(int)        // Remove min: O(log n)
peek := (*h)[0]                 // Peek min: O(1)
heap.Fix(h, i)                  // Re-heapify after changing h[i]
heap.Remove(h, i)               // Remove element at index i
```

#### Generic Priority Queue (Go 1.21+)

```go
// Generic priority queue using slices package
type PQ[T any] struct {
    items    []T
    less     func(a, b T) bool
}

func (pq *PQ[T]) Push(item T) {
    pq.items = append(pq.items, item)
    pq.up(len(pq.items) - 1)
}

func (pq *PQ[T]) Pop() T {
    n := len(pq.items)
    pq.items[0], pq.items[n-1] = pq.items[n-1], pq.items[0]
    pq.down(0, n-1)
    item := pq.items[n-1]
    pq.items = pq.items[:n-1]
    return item
}
// ... (implement up/down helper methods)
```

---

### container/list — Doubly Linked List

```go
import "container/list"

l := list.New()

// Add elements
front := l.PushFront("first")
back := l.PushBack("last")
middle := l.InsertAfter("middle", front)

// Navigate
for e := l.Front(); e != nil; e = e.Next() {
    fmt.Println(e.Value)
}

// Remove
l.Remove(middle)

// Move elements
l.MoveToFront(back)
l.MoveToBack(front)
l.MoveBefore(front, back)
l.MoveAfter(back, front)

// Properties
l.Len()   // Length
l.Front() // First element
l.Back()  // Last element
```

---

## Time and Context

### time — Time and Duration

#### The Reference Time

Go uses a specific reference time for format strings:

```
Mon Jan 2 15:04:05 MST 2006
```

This is `01/02 03:04:05PM '06 -0700` — each component is unique.

| Component | Reference | Common Values |
|-----------|-----------|---------------|
| Year | 2006, 06 | 2006, 06 |
| Month | Jan, January, 01, 1 | Jan, January, 01, 1 |
| Day | 2, 02, _2 | 2, 02, _2 (space-padded) |
| Weekday | Mon, Monday | Mon, Monday |
| Hour | 15, 3, 03 | 15 (24h), 3/03 (12h) |
| Minute | 04, 4 | 04, 4 |
| Second | 05, 5 | 05, 5 |
| AM/PM | PM, pm | PM, pm |
| Timezone | MST, -0700 | MST, -0700, Z0700 |

#### Common Format Strings

```go
const (
    Layout      = "01/02 03:04:05PM '06 -0700"
    ANSIC       = "Mon Jan _2 15:04:05 2006"
    RFC822      = "02 Jan 06 15:04 MST"
    RFC850      = "Monday, 02-Jan-06 15:04:05 MST"
    RFC1123     = "Mon, 02 Jan 2006 15:04:05 MST"
    RFC3339     = "2006-01-02T15:04:05Z07:00"
    RFC3339Nano = "2006-01-02T15:04:05.999999999Z07:00"
    Kitchen     = "3:04PM"
    Stamp       = "Jan _2 15:04:05"
)
```

#### Parsing and Formatting

```go
// Current time
now := time.Now()
utc := time.Now().UTC()

// Create specific time
t := time.Date(2024, time.January, 15, 14, 30, 0, 0, time.UTC)

// Parse string to time
t, err := time.Parse(time.RFC3339, "2024-01-15T14:30:00Z")
t, err := time.Parse("2006-01-02", "2024-01-15")

// Parse with location
loc, _ := time.LoadLocation("America/New_York")
t, err := time.ParseInLocation("2006-01-02 15:04", "2024-01-15 14:30", loc)

// Format time to string
s := t.Format(time.RFC3339)           // "2024-01-15T14:30:00Z"
s := t.Format("2006-01-02")           // "2024-01-15"
s := t.Format("Monday, January 2")    // "Monday, January 15"
s := t.Format("3:04 PM")              // "2:30 PM"
```

#### Duration

```go
// Duration constants
time.Nanosecond
time.Microsecond
time.Millisecond
time.Second
time.Minute
time.Hour

// Create duration
d := 5 * time.Second
d := time.Duration(500) * time.Millisecond

// Parse duration string
d, err := time.ParseDuration("1h30m")
d, err := time.ParseDuration("2.5s")

// Duration methods
d.Hours()       // float64
d.Minutes()     // float64
d.Seconds()     // float64
d.Milliseconds() // int64
d.String()      // "1h30m0s"
```

#### Time Operations

```go
// Add duration
future := t.Add(24 * time.Hour)
past := t.Add(-1 * time.Hour)

// Add date components
nextMonth := t.AddDate(0, 1, 0)  // years, months, days

// Difference between times
duration := t2.Sub(t1)          // time.Duration
duration := time.Since(t)       // time.Now().Sub(t)
duration := time.Until(t)       // t.Sub(time.Now())

// Comparison
t1.Before(t2)   // bool
t1.After(t2)    // bool
t1.Equal(t2)    // bool
t.IsZero()      // bool

// Components
t.Year(), t.Month(), t.Day()
t.Hour(), t.Minute(), t.Second()
t.Weekday()     // time.Weekday (Sunday = 0)
t.YearDay()     // 1-366
t.Unix()        // Unix timestamp (seconds)
t.UnixMilli()   // Unix timestamp (milliseconds)
t.UnixNano()    // Unix timestamp (nanoseconds)

// Truncation and rounding
t.Truncate(time.Hour)   // Round down to hour
t.Round(time.Hour)      // Round to nearest hour
```

#### Timer and Ticker

```go
// Timer: fires once after duration
timer := time.NewTimer(5 * time.Second)
<-timer.C                    // Block until timer fires
timer.Stop()                 // Cancel timer
timer.Reset(10 * time.Second) // Reset for reuse

// Shortcut for simple delays
<-time.After(5 * time.Second)

// Ticker: fires repeatedly
ticker := time.NewTicker(1 * time.Second)
defer ticker.Stop()          // Always stop when done
for t := range ticker.C {
    fmt.Println("Tick at", t)
}

// AfterFunc: call function after delay
timer := time.AfterFunc(5*time.Second, func() {
    fmt.Println("Timer fired!")
})
```

---

### context — Cancellation and Deadlines

The `context` package provides request-scoped values, cancellation, and deadlines.

#### Creating Contexts

```go
// Background: root context (for main, init, tests)
ctx := context.Background()

// TODO: placeholder when unsure which context to use
ctx := context.TODO()

// WithCancel: manual cancellation
ctx, cancel := context.WithCancel(parent)
defer cancel() // Always call cancel to release resources

// WithTimeout: auto-cancel after duration
ctx, cancel := context.WithTimeout(parent, 5*time.Second)
defer cancel()

// WithDeadline: auto-cancel at specific time
deadline := time.Now().Add(5 * time.Second)
ctx, cancel := context.WithDeadline(parent, deadline)
defer cancel()

// WithValue: carry request-scoped data
ctx := context.WithValue(parent, "userID", "123")
```

#### Using Contexts

```go
// Check if canceled
select {
case <-ctx.Done():
    return ctx.Err() // context.Canceled or context.DeadlineExceeded
default:
    // Continue working
}

// Get deadline (if set)
deadline, ok := ctx.Deadline()
if ok {
    fmt.Println("Deadline:", deadline)
}

// Get value
userID := ctx.Value("userID").(string)

// Pass to blocking operations
result, err := doWork(ctx) // Function should respect ctx.Done()
```

#### Context Decision Tree

| Situation | Context to Use |
|-----------|----------------|
| Starting a new request | `context.Background()` |
| HTTP handler | `r.Context()` |
| Don't know which to use | `context.TODO()` |
| Need to cancel manually | `context.WithCancel(parent)` |
| Need timeout | `context.WithTimeout(parent, duration)` |
| Passing request data | `context.WithValue(parent, key, value)` |

#### Context in HTTP Handlers

```go
func handler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()

    // Add timeout for database query
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    result, err := db.QueryContext(ctx, "SELECT ...")
    if err != nil {
        if ctx.Err() == context.DeadlineExceeded {
            http.Error(w, "Request timeout", http.StatusGatewayTimeout)
            return
        }
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    // Use result
}
```

#### WithoutCancel (Go 1.21+)

```go
// Create context that won't be canceled when parent is canceled
// Useful for cleanup operations that must complete
ctx := context.WithoutCancel(parent)
```

#### AfterFunc (Go 1.21+)

```go
// Register callback when context is done
stop := context.AfterFunc(ctx, func() {
    fmt.Println("Context canceled!")
})
// Call stop() to prevent callback if context isn't canceled
```

---

## Networking

### net/http — HTTP Client and Server

#### HTTP Client

```go
// Simple GET
resp, err := http.Get("https://api.example.com/users")
if err != nil {
    return err
}
defer resp.Body.Close()

body, err := io.ReadAll(resp.Body)
if err != nil {
    return err
}

// Check status
if resp.StatusCode != http.StatusOK {
    return fmt.Errorf("unexpected status: %d", resp.StatusCode)
}

// Simple POST with JSON
data := map[string]string{"name": "Alice"}
jsonData, _ := json.Marshal(data)
resp, err := http.Post(
    "https://api.example.com/users",
    "application/json",
    bytes.NewReader(jsonData),
)

// Custom request
req, err := http.NewRequestWithContext(ctx, "PUT", url, body)
req.Header.Set("Authorization", "Bearer "+token)
req.Header.Set("Content-Type", "application/json")

client := &http.Client{Timeout: 10 * time.Second}
resp, err := client.Do(req)
```

#### HTTP Server (Go 1.22+ Routing)

```go
mux := http.NewServeMux()

// Method-specific routes (Go 1.22+)
mux.HandleFunc("GET /users", listUsers)
mux.HandleFunc("POST /users", createUser)
mux.HandleFunc("GET /users/{id}", getUser)       // Path parameter
mux.HandleFunc("DELETE /users/{id}", deleteUser)

// Wildcard (Go 1.22+)
mux.HandleFunc("GET /files/{path...}", serveFile) // Matches rest of path

// Get path parameter
func getUser(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id") // Go 1.22+
    // ...
}

// Start server
http.ListenAndServe(":8080", mux)

// With TLS
http.ListenAndServeTLS(":443", "cert.pem", "key.pem", mux)
```

#### Middleware Pattern

```go
// Middleware function type
type Middleware func(http.Handler) http.Handler

// Logging middleware
func LoggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        log.Printf("%s %s %v", r.Method, r.URL.Path, time.Since(start))
    })
}

// Auth middleware
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

// Chain middleware
handler := AuthMiddleware(LoggingMiddleware(mux))
http.ListenAndServe(":8080", handler)
```

#### Response Writing

```go
func handler(w http.ResponseWriter, r *http.Request) {
    // Set headers (must be before WriteHeader or Write)
    w.Header().Set("Content-Type", "application/json")
    w.Header().Set("X-Custom-Header", "value")

    // Set status code
    w.WriteHeader(http.StatusCreated) // 201

    // Write body
    json.NewEncoder(w).Encode(response)
}

// Common status codes
http.StatusOK                  // 200
http.StatusCreated             // 201
http.StatusNoContent           // 204
http.StatusBadRequest          // 400
http.StatusUnauthorized        // 401
http.StatusForbidden           // 403
http.StatusNotFound            // 404
http.StatusInternalServerError // 500
```

---

### net/url — URL Parsing

```go
import "net/url"

// Parse URL
u, err := url.Parse("https://user:pass@example.com:8080/path?q=go#section")

u.Scheme   // "https"
u.User     // url.Userinfo{username: "user", password: "pass"}
u.Host     // "example.com:8080"
u.Hostname() // "example.com"
u.Port()   // "8080"
u.Path     // "/path"
u.RawQuery // "q=go"
u.Fragment // "section"

// Parse query parameters
values := u.Query()              // url.Values (map[string][]string)
q := values.Get("q")             // "go"
values.Set("page", "1")
values.Add("tag", "tutorial")
u.RawQuery = values.Encode()     // "q=go&page=1&tag=tutorial"

// Build URL
u := &url.URL{
    Scheme: "https",
    Host:   "example.com",
    Path:   "/search",
}
q := u.Query()
q.Set("q", "golang")
u.RawQuery = q.Encode()
fmt.Println(u.String()) // "https://example.com/search?q=golang"

// URL encoding
encoded := url.QueryEscape("hello world")  // "hello+world"
decoded, _ := url.QueryUnescape("hello+world") // "hello world"

encoded := url.PathEscape("path/with spaces")   // "path%2Fwith%20spaces"
decoded, _ := url.PathUnescape("path%2Fwith%20spaces")
```

---

### net — Low-Level Networking

```go
import "net"

// TCP Server
listener, err := net.Listen("tcp", ":8080")
if err != nil {
    return err
}
defer listener.Close()

for {
    conn, err := listener.Accept()
    if err != nil {
        continue
    }
    go handleConnection(conn)
}

func handleConnection(conn net.Conn) {
    defer conn.Close()

    // Set deadlines
    conn.SetDeadline(time.Now().Add(30 * time.Second))

    // Read/write
    buf := make([]byte, 1024)
    n, err := conn.Read(buf)
    conn.Write([]byte("response"))
}

// TCP Client
conn, err := net.Dial("tcp", "example.com:80")
conn, err := net.DialTimeout("tcp", "example.com:80", 5*time.Second)

// UDP
conn, err := net.ListenPacket("udp", ":8080")
n, addr, err := conn.ReadFrom(buf)
conn.WriteTo(data, addr)

// DNS lookup
addrs, err := net.LookupHost("example.com")
ips, err := net.LookupIP("example.com")
```

---

## Concurrency Primitives

### sync — Synchronization

#### Mutex

```go
import "sync"

var (
    mu      sync.Mutex
    counter int
)

func increment() {
    mu.Lock()
    defer mu.Unlock()
    counter++
}

// RWMutex: multiple readers, single writer
var rwmu sync.RWMutex

func read() int {
    rwmu.RLock()
    defer rwmu.RUnlock()
    return counter
}

func write(val int) {
    rwmu.Lock()
    defer rwmu.Unlock()
    counter = val
}
```

#### WaitGroup

```go
var wg sync.WaitGroup

for i := 0; i < 10; i++ {
    wg.Add(1)
    go func(i int) {
        defer wg.Done()
        process(i)
    }(i)
}

wg.Wait() // Block until all goroutines complete

// Go 1.25+: WaitGroup.Go()
for i := 0; i < 10; i++ {
    wg.Go(func() {
        process(i) // Captures i correctly
    })
}
wg.Wait()
```

#### Once

```go
var (
    once     sync.Once
    instance *Singleton
)

func getInstance() *Singleton {
    once.Do(func() {
        instance = &Singleton{}
        instance.init()
    })
    return instance
}

// OnceValue (Go 1.21+): returns value
var getConfig = sync.OnceValue(func() *Config {
    return loadConfig()
})

config := getConfig() // Loads once, returns cached value

// OnceValues: returns value and error
var loadDB = sync.OnceValues(func() (*sql.DB, error) {
    return sql.Open("postgres", connStr)
})

db, err := loadDB()
```

#### Pool

```go
var bufferPool = sync.Pool{
    New: func() any {
        return make([]byte, 4096)
    },
}

func process(data []byte) {
    buf := bufferPool.Get().([]byte)
    defer bufferPool.Put(buf)

    // Use buf...
    copy(buf, data)
}
```

#### Map

```go
var cache sync.Map

// Store
cache.Store("key", "value")

// Load
value, ok := cache.Load("key")
if ok {
    s := value.(string)
}

// LoadOrStore: load or store if not exists
actual, loaded := cache.LoadOrStore("key", "default")

// LoadAndDelete: load and delete atomically
value, loaded := cache.LoadAndDelete("key")

// Delete
cache.Delete("key")

// Range: iterate
cache.Range(func(key, value any) bool {
    fmt.Println(key, value)
    return true // Continue iteration
})

// CompareAndSwap/CompareAndDelete (Go 1.20+)
cache.CompareAndSwap("key", oldValue, newValue)
cache.CompareAndDelete("key", expectedValue)
```

#### Cond

```go
var (
    mu    sync.Mutex
    cond  = sync.NewCond(&mu)
    ready bool
)

// Waiter
func waiter() {
    mu.Lock()
    for !ready {
        cond.Wait() // Releases lock while waiting
    }
    // ready is true
    mu.Unlock()
}

// Signaler
func signal() {
    mu.Lock()
    ready = true
    mu.Unlock()
    cond.Signal()    // Wake one waiter
    // cond.Broadcast() // Wake all waiters
}
```

---

### sync/atomic — Atomic Operations

```go
import "sync/atomic"

// Atomic integers
var counter int64

atomic.AddInt64(&counter, 1)      // Increment
atomic.AddInt64(&counter, -1)     // Decrement
val := atomic.LoadInt64(&counter) // Read
atomic.StoreInt64(&counter, 100)  // Write
swapped := atomic.CompareAndSwapInt64(&counter, old, new)

// Atomic pointer (Go 1.19+)
var ptr atomic.Pointer[Config]
ptr.Store(&Config{})
config := ptr.Load()
ptr.CompareAndSwap(old, new)

// Atomic value (any type)
var value atomic.Value
value.Store(config)
config := value.Load().(*Config)

// Atomic bool (Go 1.19+)
var flag atomic.Bool
flag.Store(true)
if flag.Load() {
    // ...
}
flag.Swap(false) // Returns old value
```

---

## Error Handling

### errors — Error Creation and Wrapping

```go
import "errors"

// Create error
err := errors.New("something went wrong")

// Wrap error with context (Go 1.13+)
err := fmt.Errorf("failed to open file: %w", originalErr)

// Unwrap error chain
unwrapped := errors.Unwrap(err)

// Check if error is specific type
if errors.Is(err, os.ErrNotExist) {
    // Handle file not found
}

// Get specific error type
var pathErr *os.PathError
if errors.As(err, &pathErr) {
    fmt.Println("Path:", pathErr.Path)
}

// Join multiple errors (Go 1.20+)
err := errors.Join(err1, err2, err3)
// All wrapped errors are accessible via Is/As

// Custom error type
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

// Sentinel errors
var (
    ErrNotFound   = errors.New("not found")
    ErrPermission = errors.New("permission denied")
)

// Usage pattern
func FindUser(id string) (*User, error) {
    user, found := db.Get(id)
    if !found {
        return nil, fmt.Errorf("user %s: %w", id, ErrNotFound)
    }
    return user, nil
}

// Caller
user, err := FindUser("123")
if errors.Is(err, ErrNotFound) {
    // Handle not found
}
```

---

## Logging

### log — Basic Logging

```go
import "log"

// Default logger (writes to stderr)
log.Println("message")
log.Printf("value: %d", 42)
log.Fatal("fatal error")  // Logs and calls os.Exit(1)
log.Panic("panic!")       // Logs and panics

// Configure default logger
log.SetPrefix("[APP] ")
log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)

// Flags
log.Ldate         // 2024/01/15
log.Ltime         // 14:30:00
log.Lmicroseconds // 14:30:00.123456
log.Llongfile     // /full/path/file.go:123
log.Lshortfile    // file.go:123
log.LUTC          // Use UTC
log.Lmsgprefix    // Move prefix to before message
log.LstdFlags     // Ldate | Ltime

// Custom logger
logger := log.New(os.Stdout, "[MYAPP] ", log.LstdFlags|log.Lshortfile)
logger.Println("custom logger message")

// Log to file
file, _ := os.OpenFile("app.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
logger := log.New(file, "", log.LstdFlags)
```

---

### log/slog — Structured Logging (Go 1.21+)

The `log/slog` package provides structured, leveled logging.

#### Basic Usage

```go
import "log/slog"

// Default text output
slog.Info("user logged in", "user_id", "123", "ip", "192.168.1.1")
// Output: 2024/01/15 14:30:00 INFO user logged in user_id=123 ip=192.168.1.1

slog.Debug("debug message")
slog.Info("info message")
slog.Warn("warning message")
slog.Error("error message", "err", err)

// With context
slog.InfoContext(ctx, "request handled", "path", r.URL.Path)
```

#### Handlers

```go
// JSON handler (for production)
handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
    Level: slog.LevelInfo,
})
logger := slog.New(handler)
logger.Info("request", "method", "GET", "path", "/users")
// {"time":"2024-01-15T14:30:00Z","level":"INFO","msg":"request","method":"GET","path":"/users"}

// Text handler (for development)
handler := slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
    Level: slog.LevelDebug,
    AddSource: true, // Add file:line
})
logger := slog.New(handler)

// Set default logger
slog.SetDefault(logger)
slog.Info("now uses custom logger")
```

#### Structured Attributes

```go
// Key-value pairs
slog.Info("request", "method", "GET", "status", 200, "duration", 150*time.Millisecond)

// Typed attributes (more efficient)
slog.Info("request",
    slog.String("method", "GET"),
    slog.Int("status", 200),
    slog.Duration("duration", 150*time.Millisecond),
    slog.Time("timestamp", time.Now()),
    slog.Any("headers", headers),
)

// Group attributes
slog.Info("request",
    slog.Group("http",
        slog.String("method", "GET"),
        slog.Int("status", 200),
    ),
    slog.Group("user",
        slog.String("id", "123"),
        slog.String("role", "admin"),
    ),
)
// {"msg":"request","http":{"method":"GET","status":200},"user":{"id":"123","role":"admin"}}
```

#### Logger With Context

```go
// Create logger with default attributes
logger := slog.Default().With(
    slog.String("service", "api"),
    slog.String("version", "1.0.0"),
)

// All logs include service and version
logger.Info("started")
logger.Error("failed", "err", err)

// Logger with group
userLogger := logger.WithGroup("user").With(
    slog.String("id", userID),
)
userLogger.Info("action", "type", "login")
```

#### Custom Handler

```go
type CustomHandler struct {
    slog.Handler
}

func (h *CustomHandler) Handle(ctx context.Context, r slog.Record) error {
    // Add custom processing
    r.Add(slog.String("host", hostname))
    return h.Handler.Handle(ctx, r)
}
```

---

## Testing

### testing — Test Framework

#### Basic Tests

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

// Run: go test
// Run verbose: go test -v
// Run specific test: go test -run TestAdd
```

#### Table-Driven Tests

```go
func TestAdd(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"positive", 2, 3, 5},
        {"negative", -2, -3, -5},
        {"mixed", -2, 3, 1},
        {"zero", 0, 0, 0},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := Add(tt.a, tt.b)
            if result != tt.expected {
                t.Errorf("Add(%d, %d) = %d; want %d", tt.a, tt.b, result, tt.expected)
            }
        })
    }
}
```

#### Subtests and Parallel

```go
func TestUser(t *testing.T) {
    // Setup
    db := setupTestDB(t)

    t.Run("Create", func(t *testing.T) {
        t.Parallel() // Run in parallel with other parallel tests
        // test create
    })

    t.Run("Update", func(t *testing.T) {
        t.Parallel()
        // test update
    })

    // Run: go test -parallel 4
}
```

#### Test Helpers

```go
func TestSomething(t *testing.T) {
    // Skip test
    if testing.Short() {
        t.Skip("skipping in short mode")
    }

    // Fail immediately
    t.Fatal("fatal error")
    t.Fatalf("fatal: %v", err)

    // Mark failed but continue
    t.Error("error")
    t.Errorf("error: %v", err)

    // Log (only shown with -v)
    t.Log("debug info")
    t.Logf("value: %d", x)

    // Cleanup (runs after test completes)
    t.Cleanup(func() {
        db.Close()
    })

    // Helper function (line numbers point to caller)
    assertEqual(t, got, want)
}

func assertEqual(t *testing.T, got, want int) {
    t.Helper() // Mark as helper
    if got != want {
        t.Errorf("got %d; want %d", got, want)
    }
}
```

#### Benchmarks

```go
func BenchmarkAdd(b *testing.B) {
    for i := 0; i < b.N; i++ {
        Add(2, 3)
    }
}

// Run: go test -bench=.
// Run with memory: go test -bench=. -benchmem

func BenchmarkWithSetup(b *testing.B) {
    // Setup (not measured)
    data := generateData()

    b.ResetTimer() // Start timing here

    for i := 0; i < b.N; i++ {
        process(data)
    }
}

func BenchmarkParallel(b *testing.B) {
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            doWork()
        }
    })
}
```

#### Test Main

```go
func TestMain(m *testing.M) {
    // Setup before all tests
    setup()

    // Run tests
    code := m.Run()

    // Cleanup after all tests
    cleanup()

    os.Exit(code)
}
```

#### Fuzzing (Go 1.18+)

```go
func FuzzParseJSON(f *testing.F) {
    // Seed corpus
    f.Add([]byte(`{"name": "Alice"}`))
    f.Add([]byte(`{}`))
    f.Add([]byte(`invalid`))

    f.Fuzz(func(t *testing.T, data []byte) {
        var v map[string]any
        // Should not panic
        _ = json.Unmarshal(data, &v)
    })
}

// Run: go test -fuzz=FuzzParseJSON
```

---

### testing/fstest — File System Testing

```go
import "testing/fstest"

// Create in-memory file system
fsys := fstest.MapFS{
    "config/app.json": &fstest.MapFile{
        Data: []byte(`{"debug": true}`),
        Mode: 0644,
    },
    "data/users.csv": &fstest.MapFile{
        Data: []byte("name,age\nAlice,30"),
    },
}

// Use with any fs.FS consumer
data, err := fs.ReadFile(fsys, "config/app.json")

// Walk directory
fs.WalkDir(fsys, ".", func(path string, d fs.DirEntry, err error) error {
    fmt.Println(path)
    return nil
})
```

---

### testing/synctest — Concurrent Testing (Go 1.25)

```go
import "testing/synctest"

func TestConcurrent(t *testing.T) {
    synctest.Run(func() {
        var counter int
        var mu sync.Mutex

        for i := 0; i < 100; i++ {
            go func() {
                mu.Lock()
                counter++
                mu.Unlock()
            }()
        }

        // Wait for all goroutines (synthetic time)
        synctest.Wait()

        if counter != 100 {
            t.Errorf("counter = %d; want 100", counter)
        }
    })
}
```

---

## File System Operations

### path/filepath — Path Manipulation

```go
import "path/filepath"

// Join paths (OS-specific separator)
path := filepath.Join("dir", "subdir", "file.txt")
// Unix: "dir/subdir/file.txt"
// Windows: "dir\subdir\file.txt"

// Split into directory and file
dir, file := filepath.Split("/path/to/file.txt")
// dir: "/path/to/", file: "file.txt"

// Get directory
dir := filepath.Dir("/path/to/file.txt")  // "/path/to"

// Get file name
base := filepath.Base("/path/to/file.txt") // "file.txt"

// Get extension
ext := filepath.Ext("file.txt")  // ".txt"

// Remove extension
name := strings.TrimSuffix("file.txt", filepath.Ext("file.txt")) // "file"

// Clean path (remove . and ..)
clean := filepath.Clean("/path/./to/../file.txt") // "/path/file.txt"

// Absolute path
abs, err := filepath.Abs("relative/path")

// Relative path
rel, err := filepath.Rel("/base", "/base/sub/file.txt") // "sub/file.txt"

// Match pattern
matched, err := filepath.Match("*.txt", "file.txt") // true

// Glob (find files)
matches, err := filepath.Glob("*.go")
matches, err := filepath.Glob("**/*.go") // Recursive (limited)

// Walk directory tree
err := filepath.WalkDir(".", func(path string, d fs.DirEntry, err error) error {
    if err != nil {
        return err
    }
    if !d.IsDir() && filepath.Ext(path) == ".go" {
        fmt.Println(path)
    }
    return nil
})
```

---

### io/fs — File System Abstraction

```go
import "io/fs"

// fs.FS interface: minimal file system
type FS interface {
    Open(name string) (File, error)
}

// Read file from any FS
data, err := fs.ReadFile(fsys, "config.json")

// Walk directory
fs.WalkDir(fsys, ".", func(path string, d fs.DirEntry, err error) error {
    fmt.Println(path)
    return nil
})

// Glob pattern matching
matches, err := fs.Glob(fsys, "*.go")

// Sub-filesystem
sub, err := fs.Sub(fsys, "subdir")

// Embedded files (with embed package)
//go:embed static/*
var staticFS embed.FS

// Use embedded files
data, _ := fs.ReadFile(staticFS, "static/index.html")
```

---

## Other Essential Packages

### flag — Command-Line Parsing

```go
import "flag"

// Define flags
name := flag.String("name", "World", "name to greet")
count := flag.Int("count", 1, "number of greetings")
verbose := flag.Bool("v", false, "verbose output")

// Custom flag type
var port int
flag.IntVar(&port, "port", 8080, "server port")

// Parse command line
flag.Parse()

// Use flags
fmt.Printf("Hello, %s!\n", *name)

// Non-flag arguments
args := flag.Args() // []string of remaining args
n := flag.NArg()    // Number of non-flag args
arg := flag.Arg(0)  // First non-flag arg

// Custom usage
flag.Usage = func() {
    fmt.Fprintf(os.Stderr, "Usage: %s [options] <file>\n", os.Args[0])
    flag.PrintDefaults()
}

// Example: myapp -name=Alice -count=3 file1.txt file2.txt
// *name = "Alice", *count = 3, flag.Args() = ["file1.txt", "file2.txt"]
```

---

### math and math/rand — Mathematics

```go
import "math"

// Constants
math.Pi        // 3.141592653589793
math.E         // 2.718281828459045
math.MaxInt    // Max int for platform
math.MaxFloat64
math.Inf(1)    // +Inf
math.Inf(-1)   // -Inf
math.NaN()     // Not a Number

// Basic functions
math.Abs(-5)          // 5
math.Max(3, 5)        // 5
math.Min(3, 5)        // 3
math.Ceil(3.2)        // 4
math.Floor(3.8)       // 3
math.Round(3.5)       // 4
math.Trunc(3.9)       // 3

// Power and roots
math.Pow(2, 10)       // 1024
math.Sqrt(16)         // 4
math.Cbrt(27)         // 3
math.Exp(1)           // e^1 = 2.718...
math.Log(math.E)      // 1
math.Log10(100)       // 2
math.Log2(8)          // 3

// Trigonometry
math.Sin(math.Pi / 2) // 1
math.Cos(0)           // 1
math.Tan(math.Pi / 4) // ~1

// Checks
math.IsNaN(x)
math.IsInf(x, 1)      // +Inf
math.IsInf(x, -1)     // -Inf
math.IsInf(x, 0)      // Either infinity
```

#### math/rand/v2 (Go 1.22+)

```go
import "math/rand/v2"

// No seeding required (auto-seeded)

// Random numbers
n := rand.IntN(100)           // [0, 100)
n := rand.Int64N(1000)        // [0, 1000)
f := rand.Float64()           // [0.0, 1.0)

// Random from slice
choice := rand.N(len(choices))
item := choices[choice]

// Shuffle slice
rand.Shuffle(len(nums), func(i, j int) {
    nums[i], nums[j] = nums[j], nums[i]
})

// Deterministic (for testing)
r := rand.New(rand.NewPCG(1, 2)) // Seeded generator
n := r.IntN(100)
```

---

### crypto — Hashing and Encryption

```go
import (
    "crypto/sha256"
    "crypto/sha512"
    "crypto/md5"
    "crypto/hmac"
    "encoding/hex"
)

// SHA-256 hash
data := []byte("hello world")
hash := sha256.Sum256(data)
hexHash := hex.EncodeToString(hash[:])

// Streaming hash (for large data)
h := sha256.New()
h.Write([]byte("hello "))
h.Write([]byte("world"))
hash := h.Sum(nil)

// HMAC
key := []byte("secret-key")
h := hmac.New(sha256.New, key)
h.Write(data)
mac := h.Sum(nil)

// Verify HMAC
expected, _ := hex.DecodeString(expectedHex)
if hmac.Equal(mac, expected) {
    // Valid
}

// Secure random bytes
import "crypto/rand"

bytes := make([]byte, 32)
_, err := rand.Read(bytes)

// Generate random token
token := make([]byte, 32)
rand.Read(token)
tokenStr := hex.EncodeToString(token)
```

---

### database/sql — SQL Database Access

```go
import (
    "database/sql"
    _ "github.com/lib/pq" // PostgreSQL driver
)

// Open connection
db, err := sql.Open("postgres", "postgres://user:pass@localhost/dbname?sslmode=disable")
if err != nil {
    return err
}
defer db.Close()

// Verify connection
if err := db.Ping(); err != nil {
    return err
}

// Configure pool
db.SetMaxOpenConns(25)
db.SetMaxIdleConns(5)
db.SetConnMaxLifetime(5 * time.Minute)

// Query single row
var name string
var age int
err := db.QueryRowContext(ctx,
    "SELECT name, age FROM users WHERE id = $1",
    userID,
).Scan(&name, &age)

if err == sql.ErrNoRows {
    // Not found
}

// Query multiple rows
rows, err := db.QueryContext(ctx,
    "SELECT id, name FROM users WHERE age > $1",
    18,
)
if err != nil {
    return err
}
defer rows.Close()

for rows.Next() {
    var id int
    var name string
    if err := rows.Scan(&id, &name); err != nil {
        return err
    }
    fmt.Println(id, name)
}
if err := rows.Err(); err != nil {
    return err
}

// Execute (INSERT, UPDATE, DELETE)
result, err := db.ExecContext(ctx,
    "INSERT INTO users (name, age) VALUES ($1, $2)",
    "Alice", 30,
)
if err != nil {
    return err
}
id, _ := result.LastInsertId()    // May not be supported
affected, _ := result.RowsAffected()

// Transaction
tx, err := db.BeginTx(ctx, nil)
if err != nil {
    return err
}
defer tx.Rollback() // No-op if committed

// Use tx instead of db
_, err = tx.ExecContext(ctx, "UPDATE accounts SET balance = balance - $1 WHERE id = $2", amount, fromID)
if err != nil {
    return err
}
_, err = tx.ExecContext(ctx, "UPDATE accounts SET balance = balance + $1 WHERE id = $2", amount, toID)
if err != nil {
    return err
}

if err := tx.Commit(); err != nil {
    return err
}

// Prepared statement
stmt, err := db.PrepareContext(ctx, "SELECT name FROM users WHERE id = $1")
if err != nil {
    return err
}
defer stmt.Close()

// Reuse for multiple queries
var name1, name2 string
stmt.QueryRowContext(ctx, 1).Scan(&name1)
stmt.QueryRowContext(ctx, 2).Scan(&name2)
```

---

## Quick Reference Cards

### Format Verbs Summary

| Category | Verbs | Example |
|----------|-------|---------|
| General | `%v`, `%+v`, `%#v`, `%T` | Default, with fields, Go syntax, type |
| Boolean | `%t` | `true` or `false` |
| Integer | `%d`, `%b`, `%o`, `%x`, `%X` | Decimal, binary, octal, hex |
| Float | `%f`, `%e`, `%g` | Decimal, scientific, compact |
| String | `%s`, `%q` | Plain, quoted |
| Pointer | `%p` | `0x...` |
| Width | `%6d`, `%-6d`, `%06d` | Right, left, zero-padded |
| Precision | `%.2f`, `%8.2f` | 2 decimals, width 8 |

### Time Format Reference

| Component | Values |
|-----------|--------|
| Year | `2006`, `06` |
| Month | `Jan`, `January`, `01`, `1` |
| Day | `2`, `02`, `_2` |
| Weekday | `Mon`, `Monday` |
| Hour | `15` (24h), `3`, `03` (12h) |
| Minute | `04`, `4` |
| Second | `05`, `5` |
| AM/PM | `PM`, `pm` |
| Timezone | `MST`, `-0700`, `Z0700` |

### Context Quick Reference

| Function | Use Case |
|----------|----------|
| `context.Background()` | Root context for main/init |
| `context.TODO()` | Placeholder when unsure |
| `context.WithCancel(parent)` | Manual cancellation |
| `context.WithTimeout(parent, d)` | Auto-cancel after duration |
| `context.WithDeadline(parent, t)` | Auto-cancel at time |
| `context.WithValue(parent, k, v)` | Pass request-scoped data |

### sync Primitives

| Type | Use Case |
|------|----------|
| `sync.Mutex` | Exclusive access |
| `sync.RWMutex` | Multiple readers, single writer |
| `sync.WaitGroup` | Wait for goroutines |
| `sync.Once` | Execute once |
| `sync.Pool` | Object pooling |
| `sync.Map` | Concurrent map |
| `sync.Cond` | Wait for condition |

### Testing Patterns

| Pattern | Example |
|---------|---------|
| Table-driven | `tests := []struct{...}` |
| Subtests | `t.Run("name", func(t *testing.T){})` |
| Parallel | `t.Parallel()` |
| Helper | `t.Helper()` |
| Cleanup | `t.Cleanup(func(){})` |
| Skip | `t.Skip("reason")` |
| Benchmark | `func BenchmarkX(b *testing.B)` |
| Fuzz | `func FuzzX(f *testing.F)` |

---

## Interview Questions

### Q1: What are the differences between `%v`, `%+v`, and `%#v`?

**Answer**:
- `%v` — Default format. For structs, prints field values only
- `%+v` — Includes field names for structs
- `%#v` — Go syntax representation (can be copy-pasted as code)

```go
type User struct { Name string; Age int }
u := User{"Alice", 30}

fmt.Printf("%v\n", u)   // {Alice 30}
fmt.Printf("%+v\n", u)  // {Name:Alice Age:30}
fmt.Printf("%#v\n", u)  // main.User{Name:"Alice", Age:30}
```

### Q2: Explain Go's time format string design.

**Answer**: Go uses a reference time instead of format codes like `%Y-%m-%d`. The reference time is:

```
Mon Jan 2 15:04:05 MST 2006
```

This is `01/02 03:04:05PM '06 -0700` — each component has a unique value making it unambiguous. For example:
- Month is `01` (January)
- Day is `02`
- Hour is `03` (12h) or `15` (24h)
- Year is `2006` or `06`

This design makes formats readable: `"2006-01-02"` clearly means ISO date format.

### Q3: When should you use `context.Background()` vs `context.TODO()`?

**Answer**:
- **`context.Background()`** — Use at the top level: `main()`, `init()`, incoming requests, tests
- **`context.TODO()`** — Placeholder when you're unsure which context to use or plan to add proper context later

`TODO()` signals technical debt — code that should be updated to accept context from the caller.

### Q4: How do `errors.Is` and `errors.As` differ?

**Answer**:
- **`errors.Is(err, target)`** — Checks if any error in the chain matches the target value (for sentinel errors)
- **`errors.As(err, &target)`** — Extracts the first error in the chain that matches the target type (for error types)

```go
// Is: value comparison
if errors.Is(err, os.ErrNotExist) {
    // Handle file not found
}

// As: type extraction
var pathErr *os.PathError
if errors.As(err, &pathErr) {
    fmt.Println("Path:", pathErr.Path)
}
```

### Q5: What's the difference between `sync.Mutex` and `sync.RWMutex`?

**Answer**:
- **`sync.Mutex`** — Exclusive lock. Only one goroutine can hold it.
- **`sync.RWMutex`** — Reader-writer lock. Multiple readers OR one writer.

Use `RWMutex` when reads are much more frequent than writes:

```go
var rwmu sync.RWMutex
var data map[string]string

func Read(key string) string {
    rwmu.RLock()         // Multiple readers allowed
    defer rwmu.RUnlock()
    return data[key]
}

func Write(key, value string) {
    rwmu.Lock()          // Exclusive access
    defer rwmu.Unlock()
    data[key] = value
}
```

### Q6: How do you implement a priority queue in Go?

**Answer**: Use `container/heap` with a custom type implementing `heap.Interface`:

```go
type Item struct {
    value    string
    priority int
}

type PriorityQueue []*Item

func (pq PriorityQueue) Len() int { return len(pq) }
func (pq PriorityQueue) Less(i, j int) bool { return pq[i].priority < pq[j].priority }
func (pq PriorityQueue) Swap(i, j int) { pq[i], pq[j] = pq[j], pq[i] }
func (pq *PriorityQueue) Push(x any) { *pq = append(*pq, x.(*Item)) }
func (pq *PriorityQueue) Pop() any {
    old := *pq
    n := len(old)
    item := old[n-1]
    *pq = old[0 : n-1]
    return item
}

// Usage
pq := &PriorityQueue{}
heap.Init(pq)
heap.Push(pq, &Item{"task", 2})
item := heap.Pop(pq).(*Item)
```

### Q7: What's the purpose of `json.RawMessage`?

**Answer**: `json.RawMessage` delays JSON parsing, useful when:
1. The structure depends on another field (polymorphic JSON)
2. You want to forward JSON without parsing
3. Performance optimization (parse only what you need)

```go
type Message struct {
    Type    string          `json:"type"`
    Payload json.RawMessage `json:"payload"`
}

var msg Message
json.Unmarshal(data, &msg)

switch msg.Type {
case "user":
    var user User
    json.Unmarshal(msg.Payload, &user)
case "order":
    var order Order
    json.Unmarshal(msg.Payload, &order)
}
```

### Q8: Explain the difference between `log` and `log/slog`.

**Answer**:
- **`log`** — Simple, unstructured logging. Text-only, no levels, limited configuration.
- **`log/slog`** — Structured, leveled logging (Go 1.21+). Supports JSON output, typed attributes, context, and custom handlers.

```go
// log (unstructured)
log.Printf("user %s logged in from %s", userID, ip)

// slog (structured)
slog.Info("user logged in", "user_id", userID, "ip", ip)
// JSON: {"level":"INFO","msg":"user logged in","user_id":"123","ip":"..."}
```

Use `slog` for production applications where you need machine-parseable logs.

### Q9: How does `strings.Builder` improve performance over string concatenation?

**Answer**: String concatenation creates a new string on each operation (O(n²) for n operations). `strings.Builder` uses a growing byte buffer internally, achieving O(n) overall.

```go
// BAD: O(n²)
s := ""
for i := 0; i < 1000; i++ {
    s += "x"
}

// GOOD: O(n)
var sb strings.Builder
sb.Grow(1000) // Pre-allocate if size known
for i := 0; i < 1000; i++ {
    sb.WriteString("x")
}
result := sb.String()
```

### Q10: When would you use `io.TeeReader`?

**Answer**: `io.TeeReader` reads from a source and simultaneously writes to a destination. Use cases:
- Logging request/response bodies while processing
- Computing checksums while writing to disk
- Debugging by printing data as it flows

```go
// Log HTTP response while parsing
var logBuf bytes.Buffer
tee := io.TeeReader(resp.Body, &logBuf)

// Parse JSON (data also written to logBuf)
json.NewDecoder(tee).Decode(&result)

// Now logBuf contains the raw response
log.Println("Response:", logBuf.String())
```

---

## Resources

### Official Documentation
- [Go Standard Library](https://pkg.go.dev/std) — Complete package reference
- [Effective Go](https://go.dev/doc/effective_go) — Official style guide
- [Go Blog: slog](https://go.dev/blog/slog) — Structured logging introduction

### Package Deep Dives
- [encoding/json](https://pkg.go.dev/encoding/json) — JSON encoding and decoding
- [context](https://pkg.go.dev/context) — Request cancellation and values
- [sync](https://pkg.go.dev/sync) — Synchronization primitives

### Release Notes
- [Go 1.25](https://go.dev/doc/go1.25) — WaitGroup.Go, synctest
- [Go 1.24](https://go.dev/doc/go1.24) — Swiss Tables, strings iterators
- [Go 1.23](https://go.dev/doc/go1.23) — Range over func, iter package
- [Go 1.22](https://go.dev/doc/go1.22) — Enhanced HTTP routing, math/rand/v2
- [Go 1.21](https://go.dev/doc/go1.21) — slices, maps, slog packages

### Tutorials
- [Go by Example](https://gobyexample.com/) — Annotated examples
- [Practical Go Lessons](https://www.practical-go-lessons.com/) — Comprehensive tutorials
- [Better Stack: Logging in Go](https://betterstack.com/community/guides/logging/logging-in-go/) — slog best practices

---

**Previous:** [13-system-design.md](13-system-design.md) — Project Architecture and Design Patterns

**Next:** [15-test-driven-development.md](15-test-driven-development.md) — Test-Driven Development and QA Mindset

---

<p align="center">
<b>The standard library is your first dependency.</b><br>
Master it before reaching for external packages.
</p>
