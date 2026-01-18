# Go Interview Trap Questions

> Quick-fire questions that test deep Go knowledge. These "gotcha" questions are favorites among interviewers because they reveal whether a candidate truly understands Go's internals or just knows the syntax.

**Time estimate**: 60-90 minutes to review all questions

---

## Table of Contents

1. [Slices & Arrays](#1-slices--arrays)
2. [Maps](#2-maps)
3. [Channels](#3-channels)
4. [Interface Nil Trap](#4-interface-nil-trap)
5. [Defer](#5-defer)
6. [Strings & Runes](#6-strings--runes)
7. [Closures & Loop Variables](#7-closures--loop-variables)
8. [Method Receivers](#8-method-receivers)
9. [init() Functions](#9-init-functions)
10. [Comparison & Equality](#10-comparison--equality)
11. [Error Handling](#11-error-handling)
12. [Type System](#12-type-system)
13. [Concurrency](#13-concurrency)
14. [Shadowing](#14-shadowing)
15. [Numeric Types](#15-numeric-types)

---

## 1. Slices & Arrays

### Q1: Slice Append Modifies Original

**What does this print?**

```go
a := []int{1, 2, 3, 4, 5}
b := a[1:3]
b = append(b, 100)
fmt.Println(a)
```

<details>
<summary>Answer</summary>

**Output:** `[1 2 3 100 5]`

**Why:** `b` shares the underlying array with `a`. When we create `b := a[1:3]`, we get:
- `b` contains `[2, 3]`
- `cap(b) == 4` (from index 1 to end of `a`)

Since there's room in the capacity, `append(b, 100)` writes directly into the shared backing array at position `a[3]`, overwriting `4` with `100`.

**Key insight:** Slicing doesn't copy data; it creates a new slice header pointing to the same array.

</details>

---

### Q2: Append Reallocation Breaks Sharing

**What's the output?**

```go
a := []int{1, 2, 3}
b := a[:]
a = append(a, 4, 5, 6, 7, 8)
b[0] = 999
fmt.Println(a[0])
```

<details>
<summary>Answer</summary>

**Output:** `1`

**Why:** After the large append, `a` exceeds its original capacity and gets a new backing array. Now `a` and `b` point to different arrays. Modifying `b[0]` only affects `b`'s (old) array.

**Key insight:** Append may or may not reallocate. When it does, the old and new slices become independent.

</details>

---

### Q3: Memory Leak via Slice

**What's wrong with this function?**

```go
func getFirstThree(data []byte) []byte {
    return data[:3]
}
```

<details>
<summary>Answer</summary>

**Problem:** Returns a slice that still references the entire backing array.

If `data` is 1GB, the returned 3-byte slice keeps that 1GB allocated in memory. The garbage collector can't reclaim it because the slice header still points to the large array.

**Fix:**
```go
func getFirstThree(data []byte) []byte {
    result := make([]byte, 3)
    copy(result, data[:3])
    return result
}
// Or using append:
// return append([]byte{}, data[:3]...)
```

</details>

---

### Q4: Nil Slice vs Empty Slice

**What's the output?**

```go
var a []int          // nil slice
b := []int{}         // empty slice
c := make([]int, 0)  // empty slice

fmt.Println(a == nil, b == nil, c == nil)
fmt.Println(len(a), len(b), len(c))
```

<details>
<summary>Answer</summary>

**Output:**
```
true false false
0 0 0
```

**Why:** All three have length 0, but only `a` is nil. An empty slice literal `[]int{}` and `make([]int, 0)` create non-nil slices with zero length.

**Practical difference:**
```go
json.Marshal(a)  // Output: null
json.Marshal(b)  // Output: []
```

**Key insight:** `len(nil_slice) == 0` is safe, but `nil_slice == nil` behaves differently from empty slices.

</details>

---

### Q5: 2D Slice Initialization Bug

**What does this print?**

```go
matrix := make([][]int, 3)
row := make([]int, 3)
for i := range matrix {
    matrix[i] = row
}
matrix[0][0] = 1
fmt.Println(matrix[1][0])
```

<details>
<summary>Answer</summary>

**Output:** `1`

**Why:** All three rows point to the same underlying slice `row`. Modifying `matrix[0][0]` also changes `matrix[1][0]` and `matrix[2][0]`.

**Fix:**
```go
matrix := make([][]int, 3)
for i := range matrix {
    matrix[i] = make([]int, 3)  // Create new slice for each row
}
```

</details>

---

## 2. Maps

### Q6: Writing to Nil Map

**What happens?**

```go
var m map[string]int
m["key"] = 1
```

<details>
<summary>Answer</summary>

**Result:** `panic: assignment to entry in nil map`

**Why:** A nil map has no underlying hash table structure. Writing requires memory allocation, which a nil map can't do.

**Fix:**
```go
m := make(map[string]int)
m["key"] = 1
```

</details>

---

### Q7: Reading from Nil Map

**Is this safe?**

```go
var m map[string]int
val := m["nonexistent"]
fmt.Println(val)
```

<details>
<summary>Answer</summary>

**Output:** `0` (safe!)

**Why:** Reading from a nil map returns the zero value for the value type. It doesn't panic.

**Key insight:** Reading is safe, writing panics. This is asymmetric behavior that trips up many developers.

</details>

---

### Q8: Map Iteration Order

**What's the output?**

```go
m := map[int]string{1: "a", 2: "b", 3: "c"}
for k, v := range m {
    fmt.Print(k, v, " ")
}
```

<details>
<summary>Answer</summary>

**Output:** Unpredictable! Could be `1a 2b 3c` or `3c 1a 2b` or any permutation.

**Why:** Go intentionally randomizes map iteration order to prevent developers from depending on it. The order may differ between runs, between Go versions, and even between iterations in the same program.

**Key insight:** If you need ordered iteration, sort the keys first or use a different data structure.

</details>

---

### Q9: Concurrent Map Access

**What happens when this runs?**

```go
m := make(map[int]int)
go func() { m[1] = 1 }()
go func() { _ = m[1] }()
time.Sleep(time.Second)
```

<details>
<summary>Answer</summary>

**Result:** `fatal error: concurrent map read and map write`

**Why:** Go's built-in maps are not thread-safe. Concurrent read+write (or write+write) causes a runtime panic, not just a data race.

**Fix:** Use `sync.RWMutex` or `sync.Map`:
```go
var mu sync.RWMutex
mu.Lock()
m[1] = 1
mu.Unlock()
```

</details>

---

### Q10: Map Element Address

**Does this compile?**

```go
m := map[string]int{"a": 1}
p := &m["a"]
```

<details>
<summary>Answer</summary>

**Result:** Compile error: `cannot take address of m["a"]`

**Why:** Map elements are not addressable because the map may relocate values during growth. Taking an address would create a dangling pointer.

**Workaround:** Store pointers as values:
```go
m := map[string]*int{"a": new(int)}
*m["a"] = 1
```

</details>

---

## 3. Channels

### Q11: Channel Operations Matrix

**Complete this table: what happens for each operation?**

| Operation | Nil Channel | Open Channel | Closed Channel |
|-----------|-------------|--------------|----------------|
| `ch <- v` | ? | ? | ? |
| `<-ch` | ? | ? | ? |
| `close(ch)` | ? | ? | ? |

<details>
<summary>Answer</summary>

| Operation | Nil Channel | Open Channel | Closed Channel |
|-----------|-------------|--------------|----------------|
| `ch <- v` | **Block forever** | Send (may block if full) | **PANIC** |
| `<-ch` | **Block forever** | Receive (may block if empty) | Zero value (immediate) |
| `close(ch)` | **PANIC** | Close successfully | **PANIC** |

**Key insights:**
- Nil channels block forever (useful in select for disabling cases)
- Sending to closed channel panics (producer error)
- Receiving from closed channel returns zero value (signals completion)
- Closing twice panics

</details>

---

### Q12: Closed Buffered Channel

**What's the output?**

```go
ch := make(chan int, 2)
ch <- 1
ch <- 2
close(ch)
fmt.Println(<-ch, <-ch, <-ch)
```

<details>
<summary>Answer</summary>

**Output:** `1 2 0`

**Why:** A closed buffered channel first drains its buffer (1, 2), then returns zero values for subsequent receives. The third receive gets `0` (zero value for int).

**Detecting closed channel:**
```go
v, ok := <-ch
// ok is false when channel is closed and empty
```

</details>

---

### Q13: Goroutine Leak

**What's wrong with this code?**

```go
func process() chan int {
    ch := make(chan int)
    go func() {
        result := expensiveOp()
        ch <- result  // Blocks forever if no receiver
    }()
    return ch
}

// Caller never reads:
process()
```

<details>
<summary>Answer</summary>

**Problem:** Goroutine leak. The goroutine blocks forever on the unbuffered channel send because no one reads from it.

**Fix:** Use a buffered channel with capacity 1:
```go
ch := make(chan int, 1)  // Can send without blocking
```

Or ensure callers always read (or use context for cancellation).

</details>

---

## 4. Interface Nil Trap

### Q14: The Classic Nil Interface Gotcha

**What does this print?**

```go
func returnsError() error {
    var p *os.PathError = nil
    return p
}

func main() {
    err := returnsError()
    fmt.Println(err == nil)
}
```

<details>
<summary>Answer</summary>

**Output:** `false`

**Why:** An interface value consists of two parts: `(type, value)`. Here:
- `returnsError()` returns `(*os.PathError, nil)`
- Comparing to `nil` checks for `(nil, nil)`
- `(*os.PathError, nil) != (nil, nil)`

The interface holds a typed nil pointer, which is not the same as a nil interface.

</details>

---

### Q15: Fixing the Nil Interface Trap

**How do you fix Q14?**

<details>
<summary>Answer</summary>

**Return untyped nil explicitly:**
```go
func returnsError() error {
    var p *os.PathError = nil
    if p == nil {
        return nil  // Returns (nil, nil)
    }
    return p
}
```

**Or use the interface type directly:**
```go
func returnsError() error {
    var err error = nil  // Directly use interface type
    return err
}
```

**Best practice:** When returning interfaces, return `nil` directly rather than a nil pointer of a concrete type.

</details>

---

### Q16: Proper Nil Interface Check

**How to check if an interface contains nil?**

<details>
<summary>Answer</summary>

```go
func isNil(i interface{}) bool {
    if i == nil {
        return true
    }
    v := reflect.ValueOf(i)
    switch v.Kind() {
    case reflect.Ptr, reflect.Map, reflect.Slice, reflect.Chan, reflect.Func:
        return v.IsNil()
    }
    return false
}
```

**Usage:**
```go
var p *int = nil
var i interface{} = p
fmt.Println(i == nil)     // false
fmt.Println(isNil(i))     // true
```

</details>

---

## 5. Defer

### Q17: Defer Execution Order

**What's the output?**

```go
func main() {
    for i := 0; i < 3; i++ {
        defer fmt.Print(i)
    }
}
```

<details>
<summary>Answer</summary>

**Output:** `210`

**Why:**
1. Defers execute in LIFO (Last In, First Out) order
2. Arguments are evaluated when defer is encountered, not when executed

So the defers are queued as: `defer Print(0)`, `defer Print(1)`, `defer Print(2)`, then executed in reverse: `2`, `1`, `0`.

</details>

---

### Q18: Defer with Named Returns

**What does this return?**

```go
func foo() (result int) {
    defer func() { result++ }()
    return 0
}
```

<details>
<summary>Answer</summary>

**Returns:** `1`

**Why:** The execution order is:
1. `return 0` sets `result = 0`
2. Deferred function runs, incrementing `result` to `1`
3. Function actually returns `result` (which is now `1`)

**Key insight:** Deferred functions can modify named return values because they execute after the return value is set but before the function actually returns.

</details>

---

### Q19: Defer in Loops

**What's wrong with this code?**

```go
func readFiles(paths []string) error {
    for _, path := range paths {
        f, err := os.Open(path)
        if err != nil {
            return err
        }
        defer f.Close()
    }
    return nil
}
```

<details>
<summary>Answer</summary>

**Problem:** All defers accumulate until the function returns. With 1000 files, you'll have 1000 open file handles simultaneously, potentially hitting OS limits.

**Fix 1:** Extract to helper function:
```go
func processFile(path string) error {
    f, err := os.Open(path)
    if err != nil {
        return err
    }
    defer f.Close()
    // process file
    return nil
}
```

**Fix 2:** Close explicitly in the loop:
```go
for _, path := range paths {
    f, err := os.Open(path)
    if err != nil {
        return err
    }
    // process file
    f.Close()  // Close immediately
}
```

</details>

---

### Q20: Defer with Nil Function

**When does this panic?**

```go
var f func()
defer f()
f = func() { fmt.Println("called") }
```

<details>
<summary>Answer</summary>

**Panics:** At defer execution time (when function returns), not when the defer statement is encountered.

**Why:** The defer statement evaluates `f` immediately (getting nil), but doesn't call it until the function returns. At execution time, calling nil function panics.

**Key insight:** Defer arguments are evaluated immediately, but nil function calls panic at invocation time.

</details>

---

### Q21: Defer and os.Exit

**What gets printed?**

```go
func main() {
    defer fmt.Println("cleanup")
    os.Exit(0)
}
```

<details>
<summary>Answer</summary>

**Output:** Nothing!

**Why:** `os.Exit` terminates the process immediately, bypassing all deferred functions. Same applies to `log.Fatal` (which calls `os.Exit(1)`).

**Key insight:** For graceful cleanup, use a different pattern:
```go
func main() {
    code := run()
    os.Exit(code)
}

func run() int {
    defer fmt.Println("cleanup")  // This will run
    // ... your code
    return 0
}
```

</details>

---

## 6. Strings & Runes

### Q22: String Length

**What's the output?**

```go
s := "cafe"
fmt.Println(len(s))
```

<details>
<summary>Answer</summary>

**Output:** `5` (not `4`)

**Why:** The `e` character is encoded as 2 bytes in UTF-8. `len()` returns byte count, not character count.

**To get character count:**
```go
import "unicode/utf8"
fmt.Println(utf8.RuneCountInString(s))  // 4
```

</details>

---

### Q23: String Indexing

**What does this print?**

```go
s := "hello"
fmt.Println(s[0])
fmt.Printf("%c\n", s[0])
```

<details>
<summary>Answer</summary>

**Output:**
```
230
?  // (Unicode replacement character or first byte of multi-byte char)
```

Wait, let me reconsider with a better example:

```go
s := "hello"
fmt.Println(s[0])      // 104 (byte value of 'h')
fmt.Printf("%c\n", s[0])  // h
```

**For non-ASCII:**
```go
s := "hello"
fmt.Println(s[0])  // 230 (first byte of 3-byte sequence)
```

**Why:** String indexing returns bytes, not characters. Non-ASCII characters span multiple bytes.

</details>

---

### Q24: Iterating Over Strings

**What's the output?**

```go
for i, r := range "Go!" {
    fmt.Printf("%d: %c\n", i, r)
}
```

<details>
<summary>Answer</summary>

**Output:**
```
0: G  // ASCII: 1 byte
3: o  // Starts at byte 3 (after 3-byte )
6:
8: !  // Starts at byte 8
```

**Why:** `range` on a string iterates over runes (characters), but `i` is the byte index, not the rune index. Multi-byte characters cause gaps in indices.

**To get rune indices:**
```go
runes := []rune("Go!")
for i, r := range runes {
    fmt.Printf("%d: %c\n", i, r)  // Sequential: 0, 1, 2, 3
}
```

</details>

---

### Q25: String Slicing Danger

**What's wrong here?**

```go
s := "Hello, world"
substr := s[7:8]
fmt.Println(substr)
```

<details>
<summary>Answer</summary>

**Output:** Garbled character (invalid UTF-8)

**Why:** Byte index 7 lands in the middle of the 3-byte `world` character. Slicing by byte index can split multi-byte characters.

**Safe slicing:**
```go
runes := []rune(s)
substr := string(runes[7:8])  // Gets '' correctly
```

</details>

---

## 7. Closures & Loop Variables

### Q26: Closure Captures Variable (Pre-Go 1.22)

**What's the output in Go < 1.22?**

```go
funcs := make([]func(), 3)
for i := 0; i < 3; i++ {
    funcs[i] = func() { fmt.Print(i) }
}
for _, f := range funcs {
    f()
}
```

<details>
<summary>Answer</summary>

**Go < 1.22:** `333`
**Go 1.22+:** `012`

**Why (pre-1.22):** All closures capture the same variable `i`. By the time they execute, `i` is `3` (loop termination value).

**Key insight:** Go 1.22 (Feb 2024) changed this behavior. Each iteration now gets its own copy of loop variables.

</details>

---

### Q27: Fixing Closure Capture (Pre-1.22)

**How to fix Q26 in older Go versions?**

<details>
<summary>Answer</summary>

**Method 1: Shadow the variable:**
```go
for i := 0; i < 3; i++ {
    i := i  // Creates new variable in each iteration
    funcs[i] = func() { fmt.Print(i) }
}
```

**Method 2: Pass as parameter:**
```go
for i := 0; i < 3; i++ {
    funcs[i] = func(i int) func() {
        return func() { fmt.Print(i) }
    }(i)
}
```

</details>

---

### Q28: Goroutines and Loop Variables (Pre-1.22)

**What might this print in Go < 1.22?**

```go
for i := 0; i < 3; i++ {
    go func() { fmt.Print(i) }()
}
time.Sleep(time.Second)
```

<details>
<summary>Answer</summary>

**Likely output (pre-1.22):** `333` or some combination with duplicates

**Why:** The goroutines start asynchronously. By the time they run, the loop has often completed and `i` equals `3`.

**Fix:** Pass `i` as parameter:
```go
for i := 0; i < 3; i++ {
    go func(i int) { fmt.Print(i) }(i)
}
```

</details>

---

## 8. Method Receivers

### Q29: Value Receiver Doesn't Mutate

**What's printed?**

```go
type Counter struct { count int }

func (c Counter) Increment() {
    c.count++
}

func main() {
    c := Counter{}
    c.Increment()
    fmt.Println(c.count)
}
```

<details>
<summary>Answer</summary>

**Output:** `0`

**Why:** Value receiver `(c Counter)` receives a copy. The increment modifies the copy, not the original.

**Fix:** Use pointer receiver:
```go
func (c *Counter) Increment() {
    c.count++
}
```

</details>

---

### Q30: Nil Receiver Methods

**Does this work?**

```go
type MyType struct{}

func (m *MyType) Method() string {
    if m == nil {
        return "nil receiver"
    }
    return "not nil"
}

func main() {
    var m *MyType  // nil pointer
    fmt.Println(m.Method())
}
```

<details>
<summary>Answer</summary>

**Output:** `nil receiver`

**Why:** Methods can be called on nil pointers! The method receives nil as its receiver, which it can check and handle.

**Key insight:** This is valid Go and sometimes useful for implementing null object patterns or optional functionality.

</details>

---

### Q31: Interface Method Sets

**Does this compile?**

```go
type Stringer interface {
    String() string
}

type MyInt int

func (m *MyInt) String() string {
    return "MyInt"
}

func main() {
    var x MyInt = 5
    var s Stringer = x  // Compile error?
}
```

<details>
<summary>Answer</summary>

**Result:** Compile error!

```
cannot use x (type MyInt) as type Stringer:
    MyInt does not implement Stringer (String method has pointer receiver)
```

**Why:** `MyInt` doesn't implement `Stringer`; only `*MyInt` does. The method set of `MyInt` (value type) doesn't include pointer receiver methods.

**Fix:**
```go
var s Stringer = &x  // Use pointer
```

**Key insight:** Value types can't automatically satisfy interfaces that require pointer receiver methods because Go can't always take an address (e.g., map values, return values).

</details>

---

## 9. init() Functions

### Q32: Multiple init() Functions

**How many `init()` functions can a single file have?**

<details>
<summary>Answer</summary>

**Answer:** Unlimited!

Unlike `main()`, you can have multiple `init()` functions in a single file, and they all execute in order of appearance.

```go
func init() { fmt.Println("first") }
func init() { fmt.Println("second") }
func init() { fmt.Println("third") }
// Output: first, second, third
```

</details>

---

### Q33: init() Execution Order Across Files

**Given two files in the same package, what's the execution order?**

```go
// file: a.go
func init() { fmt.Print("a") }

// file: b.go
func init() { fmt.Print("b") }
```

<details>
<summary>Answer</summary>

**Output:** `ab` (usually)

**Why:** Files are processed in lexical (alphabetical) filename order. But this is implementation-defined, not guaranteed by the spec!

**Key insight:** Never rely on init() order across files. Design your initialization to be order-independent.

</details>

---

### Q34: Calling init() Directly

**Does this compile?**

```go
func init() { fmt.Println("init") }

func main() {
    init()  // Call init directly
}
```

<details>
<summary>Answer</summary>

**Result:** Compile error!

```
undefined: init
```

**Why:** `init` is a reserved identifier. You cannot reference or call it directly. It's only called automatically by the runtime.

</details>

---

## 10. Comparison & Equality

### Q35: Struct with Slice

**Does this compile?**

```go
type Person struct {
    Name string
    Tags []string
}

p1 := Person{Name: "Alice", Tags: []string{"a"}}
p2 := Person{Name: "Alice", Tags: []string{"a"}}
fmt.Println(p1 == p2)
```

<details>
<summary>Answer</summary>

**Result:** Compile error!

```
invalid operation: p1 == p2 (struct containing []string cannot be compared)
```

**Why:** Structs containing slices, maps, or functions are not comparable with `==`. These types don't have equality operators.

**Fix:** Use `reflect.DeepEqual`:
```go
fmt.Println(reflect.DeepEqual(p1, p2))  // true
```

</details>

---

### Q36: Interface Comparison Panic

**What happens?**

```go
var a interface{} = []int{1, 2}
var b interface{} = []int{1, 2}
fmt.Println(a == b)
```

<details>
<summary>Answer</summary>

**Result:** Runtime panic!

```
panic: runtime error: comparing uncomparable type []int
```

**Why:** Interfaces can hold any type, but comparing interfaces with uncomparable dynamic types (slices, maps, functions) causes a runtime panic.

**Key insight:** Struct comparison fails at compile time; interface comparison fails at runtime. This makes the interface case more dangerous.

</details>

---

### Q37: NaN Comparison

**What's the output?**

```go
f := math.NaN()
fmt.Println(f == f)
```

<details>
<summary>Answer</summary>

**Output:** `false`

**Why:** Per IEEE 754, NaN is not equal to anything, including itself. This is standard floating-point behavior.

**To check for NaN:**
```go
fmt.Println(math.IsNaN(f))  // true
```

</details>

---

## 11. Error Handling

### Q38: Defer Before Error Check

**What's wrong?**

```go
func process() error {
    f, err := os.Open("file.txt")
    defer f.Close()
    if err != nil {
        return err
    }
    // process file
    return nil
}
```

<details>
<summary>Answer</summary>

**Problem:** If `os.Open` fails, `f` is nil, and `defer f.Close()` will panic when the function returns.

**Fix:** Defer AFTER the error check:
```go
func process() error {
    f, err := os.Open("file.txt")
    if err != nil {
        return err
    }
    defer f.Close()
    // process file
    return nil
}
```

</details>

---

### Q39: Error Wrapping Comparison

**What's the output?**

```go
import (
    "errors"
    "fmt"
    "io"
)

err := fmt.Errorf("wrapped: %w", io.EOF)
fmt.Println(err == io.EOF)
fmt.Println(errors.Is(err, io.EOF))
```

<details>
<summary>Answer</summary>

**Output:**
```
false
true
```

**Why:** `%w` wraps the error, creating a new error that contains `io.EOF`. Direct comparison (`==`) fails because they're different error values. `errors.Is()` unwraps the chain and finds `io.EOF`.

**Key insight:** Always use `errors.Is()` for error comparison when dealing with wrapped errors.

</details>

---

## 12. Type System

### Q40: Type Alias vs Type Definition

**Which lines compile?**

```go
type MyInt1 = int  // Type alias
type MyInt2 int    // Type definition

func takesInt(i int) {}

func main() {
    var x MyInt1 = 5
    var y MyInt2 = 5
    takesInt(x)  // Line A
    takesInt(y)  // Line B
}
```

<details>
<summary>Answer</summary>

**Line A:** Compiles (alias is identical to int)
**Line B:** Compile error (new type requires conversion)

**Why:**
- `MyInt1 = int` creates an alias. `MyInt1` IS `int`.
- `MyInt2 int` creates a new distinct type. It has the same underlying type but is not interchangeable.

**Fix for Line B:**
```go
takesInt(int(y))  // Explicit conversion required
```

</details>

---

### Q41: Unexported Embedded Fields

**Does this work from another package?**

```go
// package a
type inner struct { Val int }
type Outer struct { inner }

// package main
func main() {
    o := a.Outer{}
    o.Val = 5  // Works?
}
```

<details>
<summary>Answer</summary>

**Result:** Compile error from another package!

```
o.Val undefined (type a.Outer has no field or method Val)
```

**Why:** Even though `Val` is promoted through embedding, the embedded type `inner` is unexported. From another package, unexported embedded fields and their members are inaccessible.

**Within the same package:** This works fine!

</details>

---

## 13. Concurrency

### Q42: WaitGroup Add Location

**What's wrong?**

```go
var wg sync.WaitGroup
for i := 0; i < 3; i++ {
    go func() {
        wg.Add(1)  // Wrong location!
        defer wg.Done()
        // work
    }()
}
wg.Wait()
```

<details>
<summary>Answer</summary>

**Problem:** Race condition! `wg.Wait()` might complete before any goroutine calls `wg.Add(1)`.

**Why:** Goroutines start asynchronously. The main goroutine might reach `wg.Wait()` before the spawned goroutines have called `wg.Add(1)`.

**Fix:** Call `Add` before starting the goroutine:
```go
var wg sync.WaitGroup
for i := 0; i < 3; i++ {
    wg.Add(1)  // Add BEFORE starting goroutine
    go func() {
        defer wg.Done()
        // work
    }()
}
wg.Wait()
```

</details>

---

### Q43: Mutex Copy

**What's wrong with this code?**

```go
type SafeCounter struct {
    mu sync.Mutex
    v  int
}

func (c SafeCounter) Inc() {
    c.mu.Lock()
    c.v++
    c.mu.Unlock()
}
```

<details>
<summary>Answer</summary>

**Problem:** Value receiver copies the mutex!

Each call to `Inc()` gets a fresh copy of the entire struct, including a new copy of the mutex. This breaks all synchronization guarantees.

**Fix:** Use pointer receiver:
```go
func (c *SafeCounter) Inc() {
    c.mu.Lock()
    c.v++
    c.mu.Unlock()
}
```

**Bonus:** `go vet` catches this: "Inc passes lock by value: SafeCounter contains sync.Mutex"

</details>

---

### Q44: Select with Default

**What gets printed?**

```go
ch := make(chan int)
select {
case v := <-ch:
    fmt.Println(v)
default:
    fmt.Println("no value")
}
```

<details>
<summary>Answer</summary>

**Output:** `no value`

**Why:** The `default` case makes select non-blocking. Since `ch` is an unbuffered channel with no sender, the receive would block. With `default`, it immediately falls through to the default case.

**Key insight:** `default` in select means "don't block, do this instead."

</details>

---

## 14. Shadowing

### Q45: Variable Shadowing with :=

**What's the output?**

```go
x := 1
if true {
    x, y := 2, 3
    fmt.Println(x, y)
}
fmt.Println(x)
```

<details>
<summary>Answer</summary>

**Output:**
```
2 3
1
```

**Why:** The `:=` inside the if block creates a NEW `x` that shadows the outer `x`. The outer `x` is unchanged.

**To modify outer `x`:**
```go
x := 1
if true {
    var y int
    x, y = 2, 3  // Assignment, not declaration
    fmt.Println(x, y)
}
fmt.Println(x)  // Now prints 2
```

</details>

---

### Q46: Import Shadowing

**Does this compile?**

```go
import "fmt"

func main() {
    fmt := "oops"
    fmt.Println("hello")
}
```

<details>
<summary>Answer</summary>

**Result:** Compile error!

```
fmt.Println undefined (type string has no field or method Println)
```

**Why:** The local variable `fmt` shadows the imported package. Now `fmt` is a string, which has no `Println` method.

**Key insight:** Package names can be shadowed like any other identifier. Use different names or rename imports:
```go
import format "fmt"
```

</details>

---

## 15. Numeric Types

### Q47: Integer Overflow

**What's the output?**

```go
var x int8 = 127
x++
fmt.Println(x)
```

<details>
<summary>Answer</summary>

**Output:** `-128`

**Why:** Signed integer overflow wraps around silently. `127 + 1` in int8 wraps to `-128` (the minimum value). Go doesn't panic on integer overflow.

**Key insight:** This is different from some languages that throw exceptions. Always check bounds when overflow matters.

</details>

---

### Q48: Float Comparison

**What's the output?**

```go
var a float64 = 0.1 + 0.2
var b float64 = 0.3
fmt.Println(a == b)
```

<details>
<summary>Answer</summary>

**Output:** `false`

**Why:** Floating-point arithmetic has precision limitations. `0.1 + 0.2` actually equals `0.30000000000000004` in IEEE 754.

**Fix:** Use epsilon comparison:
```go
const epsilon = 1e-9
fmt.Println(math.Abs(a-b) < epsilon)  // true
```

</details>

---

### Q49: Division by Zero

**What happens?**

```go
var a int = 5 / 0      // Line A
var b float64 = 5.0 / 0  // Line B
```

<details>
<summary>Answer</summary>

**Line A:** Compile error! Integer division by zero is caught at compile time.

**Line B:** Runtime value `+Inf` (positive infinity). Float division by zero is valid and produces infinity.

```go
fmt.Println(5.0 / 0)   // +Inf
fmt.Println(-5.0 / 0)  // -Inf
fmt.Println(0.0 / 0)   // NaN
```

</details>

---

## Quick Reference: Danger Zones

| Category | Trap | Safe Alternative |
|----------|------|------------------|
| Slices | Shared backing array | `copy()` or new slice |
| Maps | Nil map write | `make(map[K]V)` |
| Maps | Concurrent access | `sync.Map` or mutex |
| Channels | Send to closed | Only sender closes |
| Interfaces | Typed nil vs nil | Return untyped `nil` |
| Defer | Arguments evaluated early | Use closure |
| Strings | Byte indexing | `[]rune` conversion |
| Loops | Variable capture (pre-1.22) | Shadow variable |
| Methods | Value receiver mutation | Pointer receiver |
| Sync | Mutex copy | Pointer receiver |
| Comparison | Slice/map in struct | `reflect.DeepEqual` |

---

## Version-Specific Behavior

| Go Version | Change |
|------------|--------|
| Go 1.22+ | Loop variables get new copy each iteration |
| Go 1.21+ | `clear()` builtin for maps/slices |
| Go 1.20+ | Comparable constraint includes interface types |
| Go 1.18+ | Generics introduced |

---

## Study Tips

1. **Run each example** in Go Playground to verify behavior
2. **Explain why** not just what happens
3. **Know the fixes** for each trap
4. **Understand the design** - most "gotchas" are intentional tradeoffs
5. **Check Go version** - some behaviors changed in recent releases
