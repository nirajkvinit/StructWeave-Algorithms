# Go Syntax Quick Reference

> Everything you need to write Go code in interviews — nothing more

This is a concentrated reference for Go syntax. Print it, bookmark it, or review it before interviews.

---

## Table of Contents

1. [Variables & Types](#variables--types)
2. [Control Flow](#control-flow)
3. [Functions](#functions)
4. [Pointers](#pointers)
5. [Structs & Methods](#structs--methods)
6. [Interfaces](#interfaces)
7. [Generics](#generics)
8. [Error Handling](#error-handling)
9. [String Operations](#string-operations)
10. [Type Conversions](#type-conversions)

---

## Variables & Types

### Declaration Patterns

```go
// Short declaration (most common in functions)
x := 10
name := "Alice"
nums := []int{1, 2, 3}

// Explicit type declaration
var x int = 10
var name string = "Alice"
var nums []int

// Zero-value initialization
var count int      // 0
var flag bool      // false
var text string    // ""
var slice []int    // nil
var m map[int]int  // nil (must use make() before use!)

// Multiple declarations
a, b, c := 1, 2, 3
var x, y int = 10, 20

// Constants
const Pi = 3.14159
const (
    StatusOK    = 200
    StatusError = 500
)
```

### Basic Types

| Type | Zero Value | Example |
|------|------------|---------|
| `int`, `int8`, `int16`, `int32`, `int64` | 0 | `x := 42` |
| `uint`, `uint8` (byte), `uint16`, `uint32`, `uint64` | 0 | `var b byte = 255` |
| `float32`, `float64` | 0.0 | `f := 3.14` |
| `bool` | false | `ok := true` |
| `string` | "" | `s := "hello"` |
| `rune` (int32) | 0 | `r := 'A'` (Unicode code point) |

### Type Aliases to Know

```go
byte  // alias for uint8
rune  // alias for int32 (Unicode code point)
```

---

## Control Flow

### If Statements

```go
// Basic if
if x > 0 {
    fmt.Println("positive")
}

// If-else
if x > 0 {
    fmt.Println("positive")
} else if x < 0 {
    fmt.Println("negative")
} else {
    fmt.Println("zero")
}

// If with initialization (VERY common in Go)
if err := doSomething(); err != nil {
    return err
}

// Comma-ok idiom with if
if value, exists := m[key]; exists {
    fmt.Println(value)
}
```

### For Loops

Go has only `for` — no `while` or `do-while`.

```go
// Classic for loop
for i := 0; i < 10; i++ {
    fmt.Println(i)
}

// While-style loop
for condition {
    // body
}

// Infinite loop
for {
    // break when done
}

// Range over slice (index and value)
for i, v := range nums {
    fmt.Printf("nums[%d] = %d\n", i, v)
}

// Range over slice (value only)
for _, v := range nums {
    fmt.Println(v)
}

// Range over slice (index only)
for i := range nums {
    nums[i] *= 2
}

// Range over map
for key, value := range m {
    fmt.Printf("%s: %d\n", key, value)
}

// Range over string (runes, not bytes!)
for i, r := range "hello" {
    fmt.Printf("%d: %c\n", i, r)
}

// Range over channel
for msg := range ch {
    fmt.Println(msg)
}

// Range over iterator function (Go 1.23+)
for v := range slices.Values(nums) {
    fmt.Println(v)
}

// Range over maps.Keys (Go 1.23+)
for k := range maps.Keys(m) {
    fmt.Println(k)
}
```

### Switch

```go
// Basic switch (no break needed!)
switch day {
case "Monday":
    fmt.Println("Start of week")
case "Friday":
    fmt.Println("Almost weekend")
case "Saturday", "Sunday":  // Multiple values
    fmt.Println("Weekend!")
default:
    fmt.Println("Midweek")
}

// Switch with initialization
switch num := getNumber(); {
case num < 0:
    fmt.Println("negative")
case num == 0:
    fmt.Println("zero")
default:
    fmt.Println("positive")
}

// Type switch
switch v := x.(type) {
case int:
    fmt.Println("int:", v)
case string:
    fmt.Println("string:", v)
default:
    fmt.Println("unknown type")
}

// Fallthrough (rare, explicit)
switch n {
case 1:
    fmt.Println("one")
    fallthrough
case 2:
    fmt.Println("one or two")
}
```

### Break, Continue, Labels

```go
// Break from loop
for {
    if done {
        break
    }
}

// Continue to next iteration
for i := 0; i < 10; i++ {
    if i%2 == 0 {
        continue
    }
    fmt.Println(i) // odd numbers only
}

// Labeled break (for nested loops)
outer:
for i := 0; i < 10; i++ {
    for j := 0; j < 10; j++ {
        if i*j > 50 {
            break outer
        }
    }
}
```

---

## Functions

### Basic Functions

```go
// Simple function
func add(a, b int) int {
    return a + b
}

// Multiple return values
func divmod(a, b int) (int, int) {
    return a / b, a % b
}

// Named return values
func minMax(nums []int) (min, max int) {
    min, max = nums[0], nums[0]
    for _, n := range nums[1:] {
        if n < min {
            min = n
        }
        if n > max {
            max = n
        }
    }
    return // naked return
}

// Variadic function
func sum(nums ...int) int {
    total := 0
    for _, n := range nums {
        total += n
    }
    return total
}
// Usage: sum(1, 2, 3) or sum(slice...)
```

### Anonymous Functions & Closures

```go
// Anonymous function
square := func(x int) int {
    return x * x
}

// Closure (captures outer variables)
func counter() func() int {
    count := 0
    return func() int {
        count++
        return count
    }
}
c := counter()
fmt.Println(c(), c(), c()) // 1 2 3

// Immediately invoked
func() {
    fmt.Println("executed immediately")
}()
```

### Defer

```go
// Defer executes when function returns (LIFO order)
func example() {
    defer fmt.Println("cleanup") // runs last
    fmt.Println("work")
}

// Common pattern: close resources
func readFile(path string) error {
    f, err := os.Open(path)
    if err != nil {
        return err
    }
    defer f.Close() // always close, even on error

    // read file...
    return nil
}

// Defer with loop (careful!)
for _, f := range files {
    file, _ := os.Open(f)
    defer file.Close() // All close at function end!
}

// Better: wrap in function
for _, f := range files {
    func() {
        file, _ := os.Open(f)
        defer file.Close()
        // process file
    }()
}
```

---

## Pointers

### Basics

```go
// Get pointer
x := 10
p := &x    // p is *int, points to x

// Dereference
fmt.Println(*p)  // 10
*p = 20
fmt.Println(x)   // 20

// Nil pointer
var p *int       // p is nil
if p != nil {
    fmt.Println(*p)
}

// new() allocates zeroed memory and returns pointer
p := new(int)    // *int pointing to 0
```

### When to Use Pointers

```go
// 1. Modify the original value
func double(x *int) {
    *x *= 2
}

// 2. Avoid copying large structs
func process(data *LargeStruct) {
    // data is a pointer, no copy made
}

// 3. Indicate "no value" with nil
func find(items []int, target int) *int {
    for i, v := range items {
        if v == target {
            return &items[i]
        }
    }
    return nil // not found
}
```

### Pointer Gotchas

```go
// Slices are already references (pointer + length + capacity)
// No need to pass *[]int, just []int

func modify(nums []int) {
    nums[0] = 999 // modifies original!
}

// But append may not affect original
func appendItem(nums []int) {
    nums = append(nums, 100) // local change only!
}

// To fix: return the slice or use pointer
func appendItem(nums *[]int) {
    *nums = append(*nums, 100)
}
```

---

## Structs & Methods

### Defining Structs

```go
// Basic struct
type Person struct {
    Name string
    Age  int
}

// Creating instances
p1 := Person{Name: "Alice", Age: 30}
p2 := Person{"Bob", 25}  // positional (fragile)
p3 := Person{}           // zero values

// Pointer to struct
p4 := &Person{Name: "Charlie", Age: 35}

// Accessing fields
fmt.Println(p1.Name)
p4.Age = 36  // Go auto-dereferences: (*p4).Age = 36
```

### Methods

```go
// Value receiver (copy of struct)
func (p Person) Greet() string {
    return "Hello, " + p.Name
}

// Pointer receiver (can modify struct)
func (p *Person) Birthday() {
    p.Age++
}

// Usage
alice := Person{Name: "Alice", Age: 30}
fmt.Println(alice.Greet())
alice.Birthday()
fmt.Println(alice.Age) // 31
```

### Embedding (Composition)

```go
type Employee struct {
    Person    // Embedded (anonymous field)
    Company string
    Salary  int
}

e := Employee{
    Person:  Person{Name: "Alice", Age: 30},
    Company: "Tech Corp",
    Salary:  100000,
}

// Access embedded fields directly
fmt.Println(e.Name)    // Alice (not e.Person.Name)
fmt.Println(e.Greet()) // Methods are promoted too
```

---

## Interfaces

### Defining & Implementing

```go
// Interface definition
type Stringer interface {
    String() string
}

// Implicit implementation (no "implements" keyword)
type Person struct {
    Name string
}

func (p Person) String() string {
    return p.Name
}

// Person now implements Stringer automatically
var s Stringer = Person{Name: "Alice"}
fmt.Println(s.String())
```

### Common Interfaces

```go
// Empty interface (any type)
var x interface{} = 42
var y interface{} = "hello"
var z any = 3.14  // Go 1.18+: any = interface{}

// Type assertion
str, ok := x.(string)
if ok {
    fmt.Println(str)
}

// io.Reader and io.Writer
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

// sort.Interface
type Interface interface {
    Len() int
    Less(i, j int) bool
    Swap(i, j int)
}
```

### Interface Best Practices

```go
// Keep interfaces small (Go proverb)
type Closer interface {
    Close() error
}

// Compose interfaces
type ReadCloser interface {
    Reader
    Closer
}

// Accept interfaces, return structs
func Process(r io.Reader) *Result {
    // read from r...
    return &Result{}
}
```

---

## Generics

Generics were introduced in Go 1.18 for type-safe, reusable code.

### Basic Syntax

```go
// Generic function
func Min[T cmp.Ordered](a, b T) T {
    if a < b {
        return a
    }
    return b
}

// Usage (type inferred)
Min(3, 5)         // 3
Min("a", "b")     // "a"

// Generic type
type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(item T) {
    s.items = append(s.items, item)
}

func (s *Stack[T]) Pop() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    item := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return item, true
}
```

### Constraints

```go
import "cmp"

// any - accepts any type
func Print[T any](v T) { fmt.Println(v) }

// comparable - supports == and !=
func Contains[T comparable](s []T, v T) bool {
    for _, item := range s {
        if item == v {
            return true
        }
    }
    return false
}

// cmp.Ordered - supports < > <= >=
func Max[T cmp.Ordered](a, b T) T {
    if a > b {
        return a
    }
    return b
}

// Custom constraint
type Number interface {
    ~int | ~int64 | ~float64
}

func Sum[T Number](nums []T) T {
    var sum T
    for _, n := range nums {
        sum += n
    }
    return sum
}
```

### Common Generic Patterns

```go
// Map/Transform
func Map[T, U any](s []T, f func(T) U) []U {
    result := make([]U, len(s))
    for i, v := range s {
        result[i] = f(v)
    }
    return result
}

// Filter
func Filter[T any](s []T, pred func(T) bool) []T {
    var result []T
    for _, v := range s {
        if pred(v) {
            result = append(result, v)
        }
    }
    return result
}

// Usage
doubled := Map([]int{1, 2, 3}, func(x int) int { return x * 2 })
evens := Filter([]int{1, 2, 3, 4}, func(x int) bool { return x%2 == 0 })
```

### Generic Type Aliases (Go 1.24+)

```go
// Type alias with type parameter
type Set[T comparable] = map[T]struct{}

var s Set[int] = make(Set[int])
s[42] = struct{}{}
```

> **See also:** [06-generics.md](06-generics.md) for comprehensive generics coverage.

---

## Error Handling

### Basic Pattern

```go
// Functions return error as last value
func divide(a, b int) (int, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}

// Always check errors immediately
result, err := divide(10, 0)
if err != nil {
    log.Fatal(err) // or return err
}
fmt.Println(result)
```

### Creating Errors

```go
import (
    "errors"
    "fmt"
)

// Simple error
err := errors.New("something went wrong")

// Formatted error
err := fmt.Errorf("failed to process %s: %w", filename, originalErr)

// Custom error type
type ValidationError struct {
    Field   string
    Message string
}

func (e ValidationError) Error() string {
    return fmt.Sprintf("%s: %s", e.Field, e.Message)
}
```

### Error Wrapping (Go 1.13+)

```go
// Wrap error with context
if err != nil {
    return fmt.Errorf("failed to read config: %w", err)
}

// Unwrap and check
if errors.Is(err, os.ErrNotExist) {
    // file doesn't exist
}

// Extract specific error type
var pathErr *os.PathError
if errors.As(err, &pathErr) {
    fmt.Println("Path:", pathErr.Path)
}
```

---

## String Operations

### String Basics

```go
import "strings"

s := "Hello, World!"

// Length (bytes, not runes!)
len(s)                        // 13

// Rune count for Unicode
utf8.RuneCountInString(s)     // 13

// Indexing (returns byte)
s[0]                          // 'H' (byte)

// Slicing
s[0:5]                        // "Hello"
s[7:]                         // "World!"

// Strings are immutable
// s[0] = 'h'  // Error!

// Convert to byte slice for modification
b := []byte(s)
b[0] = 'h'
s = string(b)                 // "hello, World!"
```

### Common String Functions

```go
import "strings"

// Searching
strings.Contains(s, "World")   // true
strings.HasPrefix(s, "Hello")  // true
strings.HasSuffix(s, "!")      // true
strings.Index(s, "W")          // 7 (-1 if not found)
strings.Count(s, "l")          // 3

// Transforming
strings.ToLower(s)             // "hello, world!"
strings.ToUpper(s)             // "HELLO, WORLD!"
strings.TrimSpace("  hi  ")    // "hi"
strings.Trim(s, "!")           // "Hello, World"

// Splitting and joining
strings.Split("a,b,c", ",")    // []string{"a", "b", "c"}
strings.Join([]string{"a", "b"}, "-") // "a-b"

// Replacing
strings.Replace(s, "World", "Go", 1)  // "Hello, Go!"
strings.ReplaceAll(s, "l", "L")       // "HeLLo, WorLd!"
```

### String Builder (Efficient Concatenation)

```go
import "strings"

var sb strings.Builder
for i := 0; i < 1000; i++ {
    sb.WriteString("hello")
    sb.WriteByte(' ')
}
result := sb.String()
```

---

## Type Conversions

### Numeric Conversions

```go
// Between numeric types (explicit)
var i int = 42
var f float64 = float64(i)
var u uint = uint(i)

// Integer division vs float division
a, b := 7, 2
fmt.Println(a / b)           // 3 (integer division)
fmt.Println(float64(a) / float64(b)) // 3.5
```

### String Conversions

```go
import "strconv"

// String to int
i, err := strconv.Atoi("42")      // 42, nil

// Int to string
s := strconv.Itoa(42)             // "42"

// String to float
f, err := strconv.ParseFloat("3.14", 64)

// Float to string
s := strconv.FormatFloat(3.14, 'f', 2, 64) // "3.14"

// String to bool
b, err := strconv.ParseBool("true")

// Int to string (simple but allocates)
s := fmt.Sprintf("%d", 42)
```

### Byte Slice and String

```go
// String to byte slice
bytes := []byte("hello")

// Byte slice to string
s := string([]byte{104, 101, 108, 108, 111}) // "hello"

// String to rune slice (for Unicode manipulation)
runes := []rune("hello 世界")
fmt.Println(len(runes)) // 8 (not 12 bytes)
```

---

## Quick Reference Card

```go
// Variable declaration
x := 10                          // Short form
var x int = 10                   // Long form

// Slice operations
s := []int{1, 2, 3}             // Create
s = append(s, 4)                 // Append
s = s[1:3]                       // Slice [2, 3]

// Map operations
m := make(map[string]int)        // Create
m["key"] = 42                    // Set
v, ok := m["key"]                // Get with check
delete(m, "key")                 // Delete

// Error check
if err != nil {
    return err
}

// For loop
for i := 0; i < n; i++ { }       // Classic
for _, v := range slice { }     // Range

// Generics (Go 1.18+)
func Min[T cmp.Ordered](a, b T) T { }  // Generic function
type Stack[T any] struct { }           // Generic type

// Goroutine
go func() { ... }()

// Channel
ch := make(chan int)
ch <- 42                         // Send
x := <-ch                        // Receive
close(ch)                        // Close
```

---

**Next:** [02-data-structures.md](02-data-structures.md) — Master slices, maps, and custom types
