# Go Generics

> Type parameters for flexible, type-safe code

Generics were introduced in Go 1.18 and have become essential to modern Go programming. This guide covers everything you need for interviews and production code.

---

## Table of Contents

1. [Why Generics?](#why-generics)
2. [Type Parameters](#type-parameters)
3. [Constraints](#constraints)
4. [Generic Functions](#generic-functions)
5. [Generic Types](#generic-types)
6. [Type Inference](#type-inference)
7. [Common Patterns](#common-patterns)
8. [Standard Library Generics](#standard-library-generics)
9. [When to Use Generics](#when-to-use-generics)
10. [Interview Examples](#interview-examples)

---

## Why Generics?

Before generics, you had two options for writing reusable code:

```go
// Option 1: interface{} - Type unsafe, requires type assertions
func ContainsAny(slice []interface{}, target interface{}) bool {
    for _, v := range slice {
        if v == target {
            return true
        }
    }
    return false
}
// Usage: ContainsAny([]interface{}{1, 2, 3}, 2)  // Awkward!

// Option 2: Code duplication
func ContainsInt(slice []int, target int) bool { ... }
func ContainsString(slice []string, target string) bool { ... }
// Repeat for every type...
```

With generics:

```go
// One function works for all comparable types
func Contains[T comparable](slice []T, target T) bool {
    for _, v := range slice {
        if v == target {
            return true
        }
    }
    return false
}

// Usage: Type-safe, no assertions needed
Contains([]int{1, 2, 3}, 2)           // true
Contains([]string{"a", "b"}, "b")     // true
```

### The Problem with Type Assertions

Before generics, `interface{}` required runtime type assertions that were verbose and error-prone:

```go
// Pre-generics approach: Runtime type checking
func Sum(values []interface{}) interface{} {
    var sum float64
    for _, v := range values {
        switch n := v.(type) {
        case int:
            sum += float64(n)
        case float64:
            sum += n
        case int64:
            sum += float64(n)
        default:
            panic("unsupported type")  // Runtime error!
        }
    }
    return sum
}

// Problems:
// 1. No compile-time type checking - errors happen at runtime
// 2. Verbose type switches for every type combination
// 3. Easy to forget a case, leading to panics
// 4. Loss of original type information in the return value
// 5. Caller must also use type assertions: result.(float64)
```

**Generics solve all of these:**

```go
// With generics: Compile-time type safety
func Sum[T Number](values []T) T {
    var sum T
    for _, v := range values {
        sum += v  // v is already type T, no assertion needed
    }
    return sum
}

// Benefits:
// 1. Type errors caught at compile time
// 2. No type switches or assertions needed
// 3. Return type is known (T, not interface{})
// 4. Cleaner, more readable code
```

### When Type Assertions Are Still Needed

Even with generics, type assertions remain necessary for:

1. **Legacy standard library interfaces** (`container/heap`, `container/list`, `sort.Interface`)
2. **JSON and external data** (parsed as `map[string]interface{}`)
3. **Context values** (`ctx.Value()` returns `any`)
4. **Reflection-based APIs** (testing frameworks, serialization)
5. **Plugin systems** where types aren't known at compile time

See [01-syntax-quick-reference.md#type-assertions--type-switches](01-syntax-quick-reference.md#type-assertions--type-switches) for safe usage patterns.

---

## Type Parameters

### Basic Syntax

```go
// Function with type parameter
func FunctionName[T constraint](param T) T {
    return param
}

// Type with type parameter
type TypeName[T constraint] struct {
    value T
}

// Method on generic type
func (t TypeName[T]) Method() T {
    return t.value
}
```

### Multiple Type Parameters

```go
// Multiple type parameters
func Map[T, U any](slice []T, f func(T) U) []U {
    result := make([]U, len(slice))
    for i, v := range slice {
        result[i] = f(v)
    }
    return result
}

// Usage
doubled := Map([]int{1, 2, 3}, func(x int) int { return x * 2 })
lengths := Map([]string{"a", "bb", "ccc"}, func(s string) int { return len(s) })
```

### Generic Type Aliases (Go 1.24+)

```go
// Type aliases can now have type parameters
type Set[T comparable] = map[T]struct{}

// Usage
var intSet Set[int] = make(Set[int])
intSet[42] = struct{}{}

// Useful for simplifying complex types
type Pair[T, U any] = struct {
    First  T
    Second U
}
```

---

## Constraints

Constraints define what operations are allowed on type parameters.

### Built-in Constraints

```go
// any - accepts any type (alias for interface{})
func Print[T any](v T) {
    fmt.Println(v)
}

// comparable - types that support == and !=
func Contains[T comparable](slice []T, target T) bool {
    for _, v := range slice {
        if v == target {
            return true
        }
    }
    return false
}
```

### Interface Constraints

```go
// Any interface can be used as a constraint
type Stringer interface {
    String() string
}

func Stringify[T Stringer](items []T) []string {
    result := make([]string, len(items))
    for i, item := range items {
        result[i] = item.String()
    }
    return result
}
```

### Type Set Constraints

```go
// Union of types (type set)
type Number interface {
    int | int8 | int16 | int32 | int64 |
    uint | uint8 | uint16 | uint32 | uint64 |
    float32 | float64
}

func Sum[T Number](nums []T) T {
    var sum T
    for _, n := range nums {
        sum += n
    }
    return sum
}

// Approximate constraint (~) includes underlying types
type Integer interface {
    ~int | ~int8 | ~int16 | ~int32 | ~int64
}

// This works with custom types based on int
type UserID int
var ids []UserID = []UserID{1, 2, 3}
// Sum(ids) works because UserID's underlying type is int
```

### Combining Constraints

```go
// Combine type sets with methods
type OrderedStringer interface {
    ~int | ~string
    String() string
}

// Embedding constraints
type SignedInteger interface {
    ~int | ~int8 | ~int16 | ~int32 | ~int64
}

type UnsignedInteger interface {
    ~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64
}

type Integer interface {
    SignedInteger | UnsignedInteger
}
```

### The cmp and constraints Packages

```go
import "cmp"

// cmp.Ordered - types that support < > <= >=
func Max[T cmp.Ordered](a, b T) T {
    if a > b {
        return a
    }
    return b
}

func Min[T cmp.Ordered](a, b T) T {
    if a < b {
        return a
    }
    return b
}

// cmp.Compare returns -1, 0, or 1
result := cmp.Compare(3, 5)  // -1
```

---

## Generic Functions

### Utility Functions

```go
// Swap two values
func Swap[T any](a, b *T) {
    *a, *b = *b, *a
}

// Pointer to value
func Ptr[T any](v T) *T {
    return &v
}

// Default value if nil
func Default[T any](ptr *T, defaultVal T) T {
    if ptr == nil {
        return defaultVal
    }
    return *ptr
}

// Filter slice
func Filter[T any](slice []T, predicate func(T) bool) []T {
    result := make([]T, 0, len(slice))
    for _, v := range slice {
        if predicate(v) {
            result = append(result, v)
        }
    }
    return result
}

// Reduce slice to single value
func Reduce[T, U any](slice []T, initial U, f func(U, T) U) U {
    result := initial
    for _, v := range slice {
        result = f(result, v)
    }
    return result
}
```

### Key Selection Pattern

```go
// Group by key
func GroupBy[T any, K comparable](items []T, keyFn func(T) K) map[K][]T {
    result := make(map[K][]T)
    for _, item := range items {
        key := keyFn(item)
        result[key] = append(result[key], item)
    }
    return result
}

// Usage
type Person struct {
    Name string
    Age  int
}

people := []Person{
    {"Alice", 30},
    {"Bob", 30},
    {"Charlie", 25},
}

byAge := GroupBy(people, func(p Person) int { return p.Age })
// map[25:[{Charlie 25}] 30:[{Alice 30} {Bob 30}]]
```

---

## Generic Types

### Generic Stack

```go
type Stack[T any] struct {
    items []T
}

func NewStack[T any]() *Stack[T] {
    return &Stack[T]{items: make([]T, 0)}
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

func (s *Stack[T]) Peek() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    return s.items[len(s.items)-1], true
}

func (s *Stack[T]) Len() int {
    return len(s.items)
}

func (s *Stack[T]) IsEmpty() bool {
    return len(s.items) == 0
}
```

### Generic Queue

```go
type Queue[T any] struct {
    items []T
}

func NewQueue[T any]() *Queue[T] {
    return &Queue[T]{items: make([]T, 0)}
}

func (q *Queue[T]) Enqueue(item T) {
    q.items = append(q.items, item)
}

func (q *Queue[T]) Dequeue() (T, bool) {
    if len(q.items) == 0 {
        var zero T
        return zero, false
    }
    item := q.items[0]
    q.items = q.items[1:]
    return item, true
}

func (q *Queue[T]) Len() int {
    return len(q.items)
}
```

### Generic Set

```go
type Set[T comparable] map[T]struct{}

func NewSet[T comparable](items ...T) Set[T] {
    s := make(Set[T])
    for _, item := range items {
        s.Add(item)
    }
    return s
}

func (s Set[T]) Add(item T) {
    s[item] = struct{}{}
}

func (s Set[T]) Remove(item T) {
    delete(s, item)
}

func (s Set[T]) Contains(item T) bool {
    _, exists := s[item]
    return exists
}

func (s Set[T]) Len() int {
    return len(s)
}

func (s Set[T]) Union(other Set[T]) Set[T] {
    result := NewSet[T]()
    for item := range s {
        result.Add(item)
    }
    for item := range other {
        result.Add(item)
    }
    return result
}

func (s Set[T]) Intersection(other Set[T]) Set[T] {
    result := NewSet[T]()
    for item := range s {
        if other.Contains(item) {
            result.Add(item)
        }
    }
    return result
}

func (s Set[T]) Difference(other Set[T]) Set[T] {
    result := NewSet[T]()
    for item := range s {
        if !other.Contains(item) {
            result.Add(item)
        }
    }
    return result
}
```

### Generic Pair/Tuple

```go
type Pair[T, U any] struct {
    First  T
    Second U
}

func NewPair[T, U any](first T, second U) Pair[T, U] {
    return Pair[T, U]{First: first, Second: second}
}

// Zip two slices into pairs
func Zip[T, U any](a []T, b []U) []Pair[T, U] {
    n := min(len(a), len(b))
    result := make([]Pair[T, U], n)
    for i := 0; i < n; i++ {
        result[i] = NewPair(a[i], b[i])
    }
    return result
}

// Unzip pairs into two slices
func Unzip[T, U any](pairs []Pair[T, U]) ([]T, []U) {
    first := make([]T, len(pairs))
    second := make([]U, len(pairs))
    for i, p := range pairs {
        first[i] = p.First
        second[i] = p.Second
    }
    return first, second
}
```

### Generic Result Type

```go
// Result type for error handling
type Result[T any] struct {
    value T
    err   error
}

func Ok[T any](value T) Result[T] {
    return Result[T]{value: value}
}

func Err[T any](err error) Result[T] {
    return Result[T]{err: err}
}

func (r Result[T]) IsOk() bool {
    return r.err == nil
}

func (r Result[T]) IsErr() bool {
    return r.err != nil
}

func (r Result[T]) Unwrap() T {
    if r.err != nil {
        panic(r.err)
    }
    return r.value
}

func (r Result[T]) UnwrapOr(defaultVal T) T {
    if r.err != nil {
        return defaultVal
    }
    return r.value
}

func (r Result[T]) Error() error {
    return r.err
}
```

---

## Type Inference

Go usually infers type parameters automatically:

```go
// Explicit type argument (rarely needed)
result := Contains[int]([]int{1, 2, 3}, 2)

// Inferred from arguments (preferred)
result := Contains([]int{1, 2, 3}, 2)

// Complex inference
doubled := Map([]int{1, 2, 3}, func(x int) int { return x * 2 })
// Infers T=int, U=int from the arguments

// Sometimes inference needs help
var fn func(int) string = func(x int) string { return fmt.Sprint(x) }
strs := Map([]int{1, 2, 3}, fn)  // Infers T=int, U=string
```

---

## Common Patterns

### Optional Value

```go
type Optional[T any] struct {
    value T
    valid bool
}

func Some[T any](value T) Optional[T] {
    return Optional[T]{value: value, valid: true}
}

func None[T any]() Optional[T] {
    return Optional[T]{}
}

func (o Optional[T]) IsSome() bool {
    return o.valid
}

func (o Optional[T]) Unwrap() T {
    if !o.valid {
        panic("unwrap on None")
    }
    return o.value
}

func (o Optional[T]) UnwrapOr(defaultVal T) T {
    if !o.valid {
        return defaultVal
    }
    return o.value
}

func (o Optional[T]) Map(f func(T) T) Optional[T] {
    if !o.valid {
        return None[T]()
    }
    return Some(f(o.value))
}
```

### Lazy Evaluation

```go
type Lazy[T any] struct {
    once  sync.Once
    fn    func() T
    value T
}

func NewLazy[T any](fn func() T) *Lazy[T] {
    return &Lazy[T]{fn: fn}
}

func (l *Lazy[T]) Get() T {
    l.once.Do(func() {
        l.value = l.fn()
    })
    return l.value
}
```

### Generic Cache

```go
type Cache[K comparable, V any] struct {
    mu    sync.RWMutex
    items map[K]V
}

func NewCache[K comparable, V any]() *Cache[K, V] {
    return &Cache[K, V]{
        items: make(map[K]V),
    }
}

func (c *Cache[K, V]) Get(key K) (V, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    val, ok := c.items[key]
    return val, ok
}

func (c *Cache[K, V]) Set(key K, value V) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.items[key] = value
}

func (c *Cache[K, V]) GetOrSet(key K, fn func() V) V {
    c.mu.Lock()
    defer c.mu.Unlock()
    if val, ok := c.items[key]; ok {
        return val
    }
    val := fn()
    c.items[key] = val
    return val
}
```

---

## Standard Library Generics

### slices Package

```go
import "slices"

nums := []int{3, 1, 4, 1, 5, 9}

// Sort
slices.Sort(nums)                    // [1, 1, 3, 4, 5, 9]
slices.SortFunc(nums, func(a, b int) int {
    return b - a                      // Descending
})

// Search (requires sorted slice)
idx, found := slices.BinarySearch(nums, 4)

// Contains
slices.Contains(nums, 5)             // true

// Index
slices.Index(nums, 4)                // index or -1

// Min/Max
slices.Min(nums)                     // 1
slices.Max(nums)                     // 9

// Clone
copy := slices.Clone(nums)

// Compact (remove consecutive duplicates)
unique := slices.Compact(nums)

// Delete (remove elements at indices)
slices.Delete(nums, 1, 3)            // Remove indices 1 and 2

// Insert
slices.Insert(nums, 2, 100)          // Insert 100 at index 2

// Reverse
slices.Reverse(nums)

// Equal
slices.Equal([]int{1, 2}, []int{1, 2})  // true
```

### maps Package

```go
import "maps"

m := map[string]int{"a": 1, "b": 2, "c": 3}

// Clone
copy := maps.Clone(m)

// Equal
maps.Equal(m, copy)                   // true

// DeleteFunc
maps.DeleteFunc(m, func(k string, v int) bool {
    return v < 2
})

// Keys and Values (Go 1.23+)
for k := range maps.Keys(m) {
    fmt.Println(k)
}

for v := range maps.Values(m) {
    fmt.Println(v)
}

// Collect from iterator (Go 1.23+)
keys := slices.Collect(maps.Keys(m))
```

### cmp Package

```go
import "cmp"

// Compare returns -1, 0, or 1
cmp.Compare(3, 5)    // -1
cmp.Compare(5, 5)    // 0
cmp.Compare(7, 5)    // 1

// Less is shorthand for Compare() < 0
cmp.Less(3, 5)       // true

// Or returns first non-zero value
cmp.Or(0, 0, 1, 2)   // 1
cmp.Or("", "", "a")  // "a"

// Useful for multi-field sorting
type Person struct {
    Name string
    Age  int
}

slices.SortFunc(people, func(a, b Person) int {
    if c := cmp.Compare(a.Age, b.Age); c != 0 {
        return c
    }
    return cmp.Compare(a.Name, b.Name)
})
```

---

## When to Use Generics

### Use Generics When

1. **Writing collection operations** (slices, maps, sets)
2. **The same logic works for multiple types**
3. **Type safety is important** (avoid `interface{}`)
4. **Implementing data structures** (Stack, Queue, Tree)
5. **Writing utility functions** (Min, Max, Contains)

### Avoid Generics When

1. **Only one type is needed** - just use that type
2. **Interface methods are the core abstraction** - use interfaces
3. **Different types need different implementations** - use interfaces
4. **It makes code harder to read** - simplicity over flexibility

### Generics vs Interfaces

```go
// Use INTERFACE when behavior differs per type
type Stringer interface {
    String() string
}

func PrintAll(items []Stringer) {
    for _, item := range items {
        fmt.Println(item.String())  // Different implementations
    }
}

// Use GENERICS when implementation is identical
func Contains[T comparable](slice []T, target T) bool {
    for _, v := range slice {
        if v == target {  // Same logic for all types
            return true
        }
    }
    return false
}

// Use BOTH when appropriate
type Heap[T any] struct {
    items   []T
    less    func(a, b T) bool  // Behavior via function
}

// Or with constraint
type ComparableHeap[T cmp.Ordered] struct {
    items []T
}
```

---

## Interview Examples

### Generic Binary Search

```go
func BinarySearch[T cmp.Ordered](sorted []T, target T) int {
    left, right := 0, len(sorted)-1

    for left <= right {
        mid := left + (right-left)/2
        if sorted[mid] == target {
            return mid
        } else if sorted[mid] < target {
            left = mid + 1
        } else {
            right = mid - 1
        }
    }
    return -1
}
```

### Generic Min Heap

```go
type MinHeap[T cmp.Ordered] struct {
    items []T
}

func NewMinHeap[T cmp.Ordered]() *MinHeap[T] {
    return &MinHeap[T]{items: make([]T, 0)}
}

func (h *MinHeap[T]) Push(item T) {
    h.items = append(h.items, item)
    h.siftUp(len(h.items) - 1)
}

func (h *MinHeap[T]) Pop() (T, bool) {
    if len(h.items) == 0 {
        var zero T
        return zero, false
    }

    min := h.items[0]
    last := len(h.items) - 1
    h.items[0] = h.items[last]
    h.items = h.items[:last]

    if len(h.items) > 0 {
        h.siftDown(0)
    }
    return min, true
}

func (h *MinHeap[T]) Peek() (T, bool) {
    if len(h.items) == 0 {
        var zero T
        return zero, false
    }
    return h.items[0], true
}

func (h *MinHeap[T]) siftUp(i int) {
    for i > 0 {
        parent := (i - 1) / 2
        if h.items[i] >= h.items[parent] {
            break
        }
        h.items[i], h.items[parent] = h.items[parent], h.items[i]
        i = parent
    }
}

func (h *MinHeap[T]) siftDown(i int) {
    n := len(h.items)
    for {
        smallest := i
        left, right := 2*i+1, 2*i+2

        if left < n && h.items[left] < h.items[smallest] {
            smallest = left
        }
        if right < n && h.items[right] < h.items[smallest] {
            smallest = right
        }
        if smallest == i {
            break
        }
        h.items[i], h.items[smallest] = h.items[smallest], h.items[i]
        i = smallest
    }
}

func (h *MinHeap[T]) Len() int {
    return len(h.items)
}
```

### Generic LRU Cache

```go
type LRUCache[K comparable, V any] struct {
    capacity int
    items    map[K]*lruNode[K, V]
    head     *lruNode[K, V]  // Most recent
    tail     *lruNode[K, V]  // Least recent
}

type lruNode[K comparable, V any] struct {
    key   K
    value V
    prev  *lruNode[K, V]
    next  *lruNode[K, V]
}

func NewLRUCache[K comparable, V any](capacity int) *LRUCache[K, V] {
    return &LRUCache[K, V]{
        capacity: capacity,
        items:    make(map[K]*lruNode[K, V]),
    }
}

func (c *LRUCache[K, V]) Get(key K) (V, bool) {
    if node, ok := c.items[key]; ok {
        c.moveToFront(node)
        return node.value, true
    }
    var zero V
    return zero, false
}

func (c *LRUCache[K, V]) Put(key K, value V) {
    if node, ok := c.items[key]; ok {
        node.value = value
        c.moveToFront(node)
        return
    }

    node := &lruNode[K, V]{key: key, value: value}
    c.items[key] = node
    c.addToFront(node)

    if len(c.items) > c.capacity {
        c.removeLast()
    }
}

func (c *LRUCache[K, V]) moveToFront(node *lruNode[K, V]) {
    if node == c.head {
        return
    }
    c.removeNode(node)
    c.addToFront(node)
}

func (c *LRUCache[K, V]) addToFront(node *lruNode[K, V]) {
    node.prev = nil
    node.next = c.head
    if c.head != nil {
        c.head.prev = node
    }
    c.head = node
    if c.tail == nil {
        c.tail = node
    }
}

func (c *LRUCache[K, V]) removeNode(node *lruNode[K, V]) {
    if node.prev != nil {
        node.prev.next = node.next
    } else {
        c.head = node.next
    }
    if node.next != nil {
        node.next.prev = node.prev
    } else {
        c.tail = node.prev
    }
}

func (c *LRUCache[K, V]) removeLast() {
    if c.tail == nil {
        return
    }
    delete(c.items, c.tail.key)
    c.removeNode(c.tail)
}
```

---

## Quick Reference

### Syntax

```go
// Generic function
func Name[T constraint](param T) T { }

// Multiple type parameters
func Name[T, U constraint](a T, b U) { }

// Generic type
type Name[T constraint] struct { value T }

// Method on generic type
func (n Name[T]) Method() T { }

// Generic type alias (Go 1.24+)
type Alias[T constraint] = OriginalType[T]
```

### Common Constraints

| Constraint | Description |
|------------|-------------|
| `any` | Any type |
| `comparable` | Types supporting `==` and `!=` |
| `cmp.Ordered` | Types supporting `<`, `>`, `<=`, `>=` |
| `~int \| ~string` | Approximate types (includes derived types) |

### Standard Library Packages

| Package | Purpose |
|---------|---------|
| `slices` | Generic slice operations |
| `maps` | Generic map operations |
| `cmp` | Comparison utilities |

---

**Next:** [README.md](README.md) — Return to the guide overview
