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

> [!CAUTION]
> **Gotcha: Defer Inside Loops**
>
> `defer` is bound to the **function scope**, not the loop block.
>
> - **Risk**: Loops with many iterations will stack up deferred calls, potentially exhausting resources (like file descriptors) or memory before cleanup happens.
> - **Fix**: Use an anonymous function (IIFE) as shown above. This creates a new function scope for each iteration, ensuring `defer` runs immediately after the iteration.

---

## Pointers

### Basics

```go
// Get the memory address of a variable
x := 10
p := &x    // '&' = "where is x?". p is the address (e.g. 0xc0000...)

// "Dereference": Go to that address and get/set the value
fmt.Println(*p)  // '*' = "value at address p" -> prints 10
*p = 20          // "Set value at address p to 20"
fmt.Println(x)   // x is also 20 (it's the same memory location!)

// Safety check: Pointers can be nil (pointing nowhere)
var ptr *int     // Declared but not assigned -> nil
if ptr != nil {  // Always check before using *ptr to avoid crash!
    fmt.Println(*ptr)
}

// Quick way to get a pointer to a zero value
p2 := new(int)   // Allocates memory for an int, initializes it to 0, and returns a pointer (*int) to it

// Note: new(T) is functionally equivalent to:
// var temp T
// return &temp

```

### When to Use Pointers

```go
// 1. Modify the original value
func double(x *int) { // Takes a pointer so we can modify the original variable, not just a local copy
    *x *= 2
}

/*
  Educational Note: Call by Value vs Pointers (Reference)
  - Go is strictly "Call by Value": Functions always receive a COPY of the arguments.
  - Without pointers: If you pass a variable, Go copies it. Changes to the copy only affect the local variable and are lost when the function returns.
  - With pointers: You pass the *address* (by value). This allows the function to go to that memory address and modify the *original* data.
  Purpose: 
  1. Mutability: To change the original variable (as seen above).
  2. Efficiency: To avoid copying large data structures (like big structs) which is slow and uses memory.
*/

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

/*
  Note: Valid returned pointer vs nil
  - Problem: If we just returned 'int', what do we return if the number isn't found?
    Returning 0 or -1 might be ambiguous if 0 or -1 are valid values in the list.
  - Solution: Return a pointer (*int).
    - If found: We return the address of the number.
    - If NOT found: We return 'nil' (explicitly "nothing").
  - Warning: ALWAYS check `if result != nil` before using the value (*result), otherwise your program will crash (panic).
*/
```

### Pointer Gotchas

```go
// Reference Types: Slices, Maps, Channels, Interfaces, Functions
// These types already contain pointers inside them.
// - Passing them implies passing a reference to the underlying data.

// - No need to pass *[]int, *map, etc. (unless you need to change the header, like appending - see next example).
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

// Reminder: Go is always "Call by Value".
// - For basic types (int, bool): The value is the data. Reference independent.
// - For reference types (slice, map): The "value" being copied is just the pointer/header,
//   so the function STILL sees the same underlying data.
```

---

## Structs & Methods

**What is a Struct?**

- **Definition**: A custom type that groups related variables (fields) together under one name.
- **Purpose**: To model real-world concepts (like a 'Person' having a Name and Age).
- **Value**: Keeps data organized. Instead of managing 'name1', 'age1', 'name2', 'age2', you just have 'person1' and 'person2'.

### Defining Structs

```go
// Basic struct
type Person struct {
    Name string
    Age  int
}

// Creating instances
p1 := Person{Name: "Alice", Age: 30}
p2 := Person{"Bob", 25}  // positional (fragile: breaks if you add fields or change their order)
p3 := Person{}           // zero values

// Pointer to struct
p4 := &Person{Name: "Charlie", Age: 35}

/*
  Why use a pointer to a struct?
  1. Efficiency: Structs can be large. Passing a pointer passes only the address (8 bytes), not the whole struct.
  2. Modifiability: Allows functions to change the original struct's fields.
*/

// Accessing fields
fmt.Println(p1.Name)
p4.Age = 36  // Go auto-dereferences: (*p4).Age = 36
```

> [!IMPORTANT]
> Structs are VALUE TYPES within Go.
>
> - If you assign a struct to a new variable, it copies the ENTIRE struct.
> - If you pass a struct to a function, it copies the ENTIRE struct.
> - This is why we often use *Person (pointer) instead of Person to avoid these expensive copies.

### Methods

```go
/*
  Receiver Types:
  1. Value Receiver (p Person):
     - Go makes a COPY of the struct.
     - Good for: Small structs, read-only methods.
     - Bad for: Large structs (copying is slow), or if you need to change fields.

  2. Pointer Receiver (p *Person):
     - Go passes the address (no copy).
     - MANDATORY if you want to modify fields (like p.Age++).
     - Good for: Large structs, methods that mutate data.
*/

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

- Embedding is Go's way of doing "inheritance" without the complexity.
- Instead of writing `type Employee struct { Person Person }`, you just write `type Employee struct { Person }`.
- This is called an "anonymous field".
- The fields and methods of the embedded type are "promoted" to the outer type.

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

**What is an Interface?**

- **Definition**: A contract that defines a set of method signatures (behaviors).
- **Purpose**: To allow different types to be treated the same way, as long as they satisfy the contract (polymorphism).
- **Key Features**:
  1. **Implicit Implementation**: You don't say `implements Interface`. If your struct has the methods, it *automatically* satisfies the interface.
  2. **Decoupling**: Functions can ask for behaviors (e.g., "Give me something that can Read") instead of specific types ("Give me a File").

- **Design Principles Satisfied (SOLID)**:
  - **LSP (Liskov Substitution Principle)**: Any type that implements the interface can be substituted wherever that interface is expected.
  - **ISP (Interface Segregation Principle)**: Go encourages small interfaces (like `Reader`, `Writer`) rather than one huge interface.
  - **DIP (Dependency Inversion Principle)**: Code depends on abstractions (contracts), not concrete details.

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
// NOTE: This interface is a Contract for sorting capability.
// If ANY collection (slice, custom struct) implements these 3 methods,
// the standard library 'sort.Sort()' function can sort it.
type Interface interface {
    Len() int           // How many elements?
    Less(i, j int) bool // Is element at index i smaller than j?
    Swap(i, j int)      // How to swap elements at i and j?
}

// Real-World Example: Sorting a list of users by name
/*
  type ByName []User

  func (a ByName) Len() int           { return len(a) }
  func (a ByName) Less(i, j int) bool { return a[i].Name < a[j].Name }
  func (a ByName) Swap(i, j int)      { a[i], a[j] = a[j], a[i] }

  // Usage:
  // users := []User{...}
  // sort.Sort(ByName(users))
*/
```

### Interface Best Practices

```go
// Keep interfaces small (Go proverb)
type Closer interface {
    Close() error
}

// Compose interfaces
// Benefit: Reusability. You build complex interfaces from simple ones.
type ReadCloser interface {
    Reader
    Closer
}

// Accept interfaces, return structs
// Benefit: "Be conservative in what you do, be liberal in what you accept from others" (Postel's Law).
// - Accepting Interface: Your function works with ANY type that satisfies the interface (Flexibility).
// - Returning Struct: You give the caller the concrete value, allowing them to use any extra methods/fields it might have.
func Process(r io.Reader) *Result {
    // read from r...
    return &Result{}
}
```

---

## Generics

Generics were introduced in Go 1.18 for type-safe, reusable code.

**What are Generics?**
Generics allow you to write functions and data structures that work with *any* type, while still maintaining strict type safety. They enable you to write code where the specific type is specified later (when the code is used), rather than when it is written.

Before Go 1.18, Go developers often had to choose between code duplication (writing the same function for `int`, `float64`, etc.) or sacrificing type safety by using `interface{}` (which requires runtime assertions and adds overhead).

**Why Generics?**

- **Type Safety**: Compile-time checking ensures you don't pass the wrong types.
- **Performance**: Avoids the runtime overhead of boxing/unboxing values (which happens with `interface{}`).
- **Reusability**: Write functions and data structures once, applicable to any type that satisfies constraints.

**Real-World Use Cases**:

- **Data Structures**: Trees, Graphs, Linked Lists, Sets, Stacks.
- **Utility Functions**: `Map`, `Filter`, `Reduce`, `Min`, `Max`.
- **Concurrent Patterns**: Worker pools or channels that can handle any data type.

### Before vs. After Generics

**Problem 1: Code Duplication**
Without generics, you needed separate functions for each type:

```go
func MinInt(a, b int) int { if a < b { return a }; return b }
func MinFloat(a, b float64) float64 { if a < b { return a }; return b }
```

**Problem 2: Type Safety Loss (`interface{}`)**
Using `interface{}` worked for any type but lost type safety and performance:

```go
func Min(a, b interface{}) interface{} {
    // Runtime crash possible if types aren't comparable!
    // Requires expensive type assertions.
}
```

**Solution: Generics**
One function, type-safe, no runtime overhead:

```go
func Min[T cmp.Ordered](a, b T) T {
    if a < b {
        return a
    }
    return b
}
```

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

// Compile-time Error (Type Mismatch):
// Min(3, "a")    // Error: default type int of 3 does not match inferred type string for T

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

> [!IMPORTANT]
> **Rules of Generics**
>
> 1. **No Generic Methods**: You cannot declare type parameters on specific methods. They must be declared on the receiver type (struct/interface).
>
>    ```go
>    // Invalid: method cannot have type parameter
>    // func (s *Stack[T]) Map[U any](f func(T) U) []U { ... }
>    
>    // Valid: Define U on the struct or use a top-level function
>    // type Stack[T, U any] struct { ... }
>    ```
>
> 2. **Operators Need Constraints**: You cannot use operators like `+`, `-`, or `>` on generic types unless a constraint allows it (e.g., `cmp.Ordered` for comparison).
>
>    ```go
>    // Invalid: operator + not defined on T (any)
>    // func Add[T any](a, b T) T { return a + b }
>    
>    // Valid: Constraint allows operator
>    // func Add[T Number](a, b T) T { return a + b }
>    ```
>
> 3. **Type Inference**: Go can often infer the type, but sometimes you must specify it explicitly if it's ambiguous.
>
>    ```go
>    // Ambiguous if T could be int or float64
>    // Calc(10) 
>    
>    // Explicit
>    // Calc[float64](10)
>    ```

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

**Why use `strings.Builder`?**

- **Efficiency**: In Go, strings are immutable. Using `+` in a loop creates a new string and copies data in every iteration (O(n²) performance). `strings.Builder` allocates memory intelligently and writes to a buffer, avoiding redundant copying.
- **Performance**: Minimizes memory allocations and garbage collection overhead.

```go
import "strings"

// EFFICIENT: Using strings.Builder
var sb strings.Builder
// Optional: Pre-allocate memory if you know the size (avoids resizing)
// sb.Grow(1000 * 6)

for i := 0; i < 1000; i++ {
    sb.WriteString("hello")
    sb.WriteByte(' ')
}
result := sb.String()

// INEFFICIENT: Using + operator in a loop
// Avoid this! It creates a new string object in every iteration.
var s string
for i := 0; i < 1000; i++ {
    s += "hello " // Bad practice for large loops
}
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

// GOTCHA 1: Truncation (Float -> Int)
// Decimal part is simply discarded (not rounded)
pi := 3.9999
fmt.Println(int(pi)) // Prints 3

// GOTCHA 2: Overflow/Wraparound (Large -> Small Int)
var big int16 = 1000
var small int8 = int8(big) 
// 1000 is 1111101000 in binary. int8 takes last 8 bits: 11101000 (-24)
fmt.Println(small) // Prints -24 (Data corrupted!)

// GOTCHA 3: Signed vs Unsigned (Negative -> Uint)
var neg int = -1
var unsigned uint = uint(neg)
// Bit pattern of -1 is all 1s. As uint, this is MaxUint.
fmt.Println(unsigned) // Huge number! (e.g., 18446744073709551615 on 64-bit)
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

> [!NOTE]
> **Byte vs Rune**
>
> - **`byte`** (`uint8`): Represents a single byte (8 bits). Strings are just read-only slices of bytes. In UTF-8, a single character (like '世') might take multiple bytes (up to 4).
> - **`rune`** (`int32`): Represents a Unicode Code Point.
>
> **Why convert to `[]rune`?**
> If you iterate a string by index (`s[i]`), you are accessing individual *bytes*. For multi-byte characters (emojis, non-English scripts), this cuts the character in half. Converting to `[]rune` allows you to access and manipulate whole characters safely.

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
