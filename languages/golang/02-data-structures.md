# Go Data Structures for Interviews

> Master the essential data structures with Go-specific implementations

This guide covers the data structures you'll use in 90% of coding interviews, with Go-specific idioms and complexity analysis.

---

## Table of Contents

1. [Slices](#slices)
2. [Maps](#maps)
3. [Stacks](#stacks)
4. [Queues](#queues)
5. [Heaps (Priority Queues)](#heaps-priority-queues)
6. [Linked Lists](#linked-lists)
7. [Trees](#trees)
8. [Graphs](#graphs)
9. [Sets](#sets)
10. [Modern Generic Helpers](#modern-generic-helpers)

---

## Slices

Slices are Go's dynamic arrays — the most important data structure for interviews.

### Anatomy of a Slice

```go
// A slice is a struct with three fields:
// - pointer to underlying array
// - length (number of elements)
// - capacity (size of underlying array)

nums := make([]int, 5, 10)
// len(nums) = 5
// cap(nums) = 10
```

### Creating Slices

```go
// Literal
nums := []int{1, 2, 3, 4, 5}

// make(type, length, capacity)
nums := make([]int, 5)       // len=5, cap=5, all zeros
nums := make([]int, 0, 100)  // len=0, cap=100 (pre-allocated)

// From array
arr := [5]int{1, 2, 3, 4, 5}
slice := arr[1:4]  // [2, 3, 4]

// Nil slice (valid, len=0, cap=0)
var nums []int  // nums == nil is true
```

### Essential Operations

```go
// Access
first := nums[0]
last := nums[len(nums)-1]

// Modify
nums[0] = 100

// Length
n := len(nums)

// Append (may reallocate!)
nums = append(nums, 6)
nums = append(nums, 7, 8, 9)
nums = append(nums, otherSlice...)

// Copy
dst := make([]int, len(src))
copy(dst, src)

// Slicing [start:end] (end is exclusive)
subslice := nums[1:4]   // indices 1, 2, 3
prefix := nums[:3]       // indices 0, 1, 2
suffix := nums[3:]       // index 3 to end
clone := nums[:]         // full copy reference
```

### Common Slice Patterns

```go
// 1. Remove element at index i (order doesn't matter)
nums[i] = nums[len(nums)-1]
nums = nums[:len(nums)-1]

// 2. Remove element at index i (preserve order)
nums = append(nums[:i], nums[i+1:]...)

// 3. Insert element at index i
nums = append(nums[:i], append([]int{val}, nums[i:]...)...)
// Better: Use slices package (Go 1.21+)
nums = slices.Insert(nums, i, val)

// 4. Reverse in place
for i, j := 0, len(nums)-1; i < j; i, j = i+1, j-1 {
    nums[i], nums[j] = nums[j], nums[i]
}

// 5. Filter in place (no allocation)
n := 0
for _, x := range nums {
    if x > 0 { // keep positive numbers
        nums[n] = x
        n++
    }
}
nums = nums[:n]

// 6. Two-pointer technique
left, right := 0, len(nums)-1
for left < right {
    // process
}
```

### 2D Slices (Matrices)

```go
// Create m x n matrix
m, n := 3, 4
matrix := make([][]int, m)
for i := range matrix {
    matrix[i] = make([]int, n)
}

// Access
matrix[row][col] = 42

// Iterate
for i := 0; i < len(matrix); i++ {
    for j := 0; j < len(matrix[0]); j++ {
        fmt.Print(matrix[i][j], " ")
    }
    fmt.Println()
}
```

### Sorting Slices

```go
import "sort"

// Sort integers
sort.Ints(nums)

// Sort strings
sort.Strings(strs)

// Custom sort
sort.Slice(items, func(i, j int) bool {
    return items[i].Score > items[j].Score // descending
})

// Check if sorted
sort.IntsAreSorted(nums)

// Binary search (slice must be sorted!)
idx := sort.SearchInts(nums, target)
// Returns insertion point; check if nums[idx] == target
```

### slices Package (Go 1.21+)

The `slices` package provides generic slice operations:

```go
import "slices"

nums := []int{3, 1, 4, 1, 5, 9}

// Sort (generic, modifies in place)
slices.Sort(nums)                     // [1, 1, 3, 4, 5, 9]

// Sort with custom comparison
slices.SortFunc(nums, func(a, b int) int {
    return b - a                       // Descending
})

// Binary search (returns index, found)
idx, found := slices.BinarySearch(nums, 4)

// Contains, Index
slices.Contains(nums, 5)              // true
slices.Index(nums, 4)                 // index or -1

// Min, Max
slices.Min(nums)                      // 1
slices.Max(nums)                      // 9

// Clone (deep copy for simple types)
copy := slices.Clone(nums)

// Compact (remove consecutive duplicates)
compact := slices.Compact(slices.Clone(nums))

// Reverse
slices.Reverse(nums)

// Equal
slices.Equal([]int{1, 2}, []int{1, 2})  // true

// Insert, Delete
nums = slices.Insert(nums, 2, 100)    // Insert 100 at index 2
nums = slices.Delete(nums, 1, 3)      // Remove indices 1 and 2
```

### Complexity

| Operation | Time | Notes |
|-----------|------|-------|
| Access by index | O(1) | |
| Append | O(1) amortized | May reallocate |
| Insert/Delete at index | O(n) | Shifts elements |
| Copy | O(n) | |
| Slice expression | O(1) | Shares underlying array |

---

## Maps

Go's hash maps provide O(1) average lookup — essential for complement searching patterns.

### Creating Maps

```go
// make()
m := make(map[string]int)

// Literal
m := map[string]int{
    "alice": 30,
    "bob":   25,
}

// Nil map (read-only, panic on write!)
var m map[string]int  // m == nil is true
// m["key"] = 1  // panic!
```

### Essential Operations

```go
// Insert/Update
m["key"] = value

// Lookup
value := m["key"]  // returns zero value if not found

// Lookup with existence check (CRITICAL!)
value, exists := m["key"]
if exists {
    // key found
}

// Delete
delete(m, "key")

// Length
n := len(m)

// Iterate (random order!)
for key, value := range m {
    fmt.Printf("%s: %d\n", key, value)
}

// Keys only
for key := range m {
    fmt.Println(key)
}
```

### Common Map Patterns

```go
// 1. Counting / Frequency map
counts := make(map[string]int)
for _, word := range words {
    counts[word]++  // zero value of int is 0
}

// 2. Two Sum pattern (complement search)
seen := make(map[int]int)  // value -> index
for i, num := range nums {
    complement := target - num
    if j, exists := seen[complement]; exists {
        return []int{j, i}
    }
    seen[num] = i
}

// 3. Deduplication
unique := make(map[int]struct{})  // empty struct uses no memory
for _, num := range nums {
    unique[num] = struct{}{}
}

// 4. Grouping
groups := make(map[string][]int)
for _, item := range items {
    key := getKey(item)
    groups[key] = append(groups[key], item)
}

// 5. Memoization
memo := make(map[string]int)
var solve func(state string) int
solve = func(state string) int {
    if result, exists := memo[state]; exists {
        return result
    }
    // compute result...
    memo[state] = result
    return result
}
```

### Map with Struct Keys

```go
// Custom key type
type Point struct {
    X, Y int
}

visited := make(map[Point]bool)
visited[Point{0, 0}] = true

// Check
if visited[Point{1, 1}] {
    // been here
}
```

### Complexity

| Operation | Average | Worst |
|-----------|---------|-------|
| Insert | O(1) | O(n) |
| Lookup | O(1) | O(n) |
| Delete | O(1) | O(n) |
| Iterate | O(n) | O(n) |

---

## Stacks

Go doesn't have a built-in stack, but slices work perfectly.

### Stack Implementation

```go
// Stack using slice
type Stack []int

func (s *Stack) Push(v int) {
    *s = append(*s, v)
}

func (s *Stack) Pop() int {
    if len(*s) == 0 {
        panic("empty stack")
    }
    v := (*s)[len(*s)-1]
    *s = (*s)[:len(*s)-1]
    return v
}

func (s *Stack) Peek() int {
    return (*s)[len(*s)-1]
}

func (s *Stack) IsEmpty() bool {
    return len(*s) == 0
}
```

### Quick Stack Pattern (No Custom Type)

```go
// Just use a slice directly
stack := []int{}

// Push
stack = append(stack, value)

// Pop
top := stack[len(stack)-1]
stack = stack[:len(stack)-1]

// Peek
top := stack[len(stack)-1]

// IsEmpty
if len(stack) == 0 { }
```

### Stack Applications

```go
// 1. Valid Parentheses
func isValid(s string) bool {
    stack := []rune{}
    pairs := map[rune]rune{')': '(', '}': '{', ']': '['}

    for _, c := range s {
        if c == '(' || c == '{' || c == '[' {
            stack = append(stack, c)
        } else {
            if len(stack) == 0 || stack[len(stack)-1] != pairs[c] {
                return false
            }
            stack = stack[:len(stack)-1]
        }
    }
    return len(stack) == 0
}

// 2. Monotonic Stack (Next Greater Element)
func nextGreater(nums []int) []int {
    n := len(nums)
    result := make([]int, n)
    for i := range result {
        result[i] = -1
    }
    stack := []int{} // indices

    for i := 0; i < n; i++ {
        for len(stack) > 0 && nums[i] > nums[stack[len(stack)-1]] {
            idx := stack[len(stack)-1]
            stack = stack[:len(stack)-1]
            result[idx] = nums[i]
        }
        stack = append(stack, i)
    }
    return result
}
```

---

## Queues

### Queue Implementation

```go
// Simple queue using slice (inefficient for large queues)
queue := []int{}

// Enqueue
queue = append(queue, value)

// Dequeue
front := queue[0]
queue = queue[1:]  // O(n) - shifts all elements!

// Better: Use container/list or circular buffer for large queues
```

### Using container/list for Queue

```go
import "container/list"

queue := list.New()

// Enqueue
queue.PushBack(value)

// Dequeue
front := queue.Front()
queue.Remove(front)
value := front.Value.(int)  // type assertion

// IsEmpty
queue.Len() == 0
```

### BFS Pattern (Most Common Queue Use)

```go
// BFS Template
func bfs(start Node) {
    queue := []Node{start}
    visited := make(map[Node]bool)
    visited[start] = true

    for len(queue) > 0 {
        // Dequeue
        current := queue[0]
        queue = queue[1:]

        // Process current
        for _, neighbor := range current.Neighbors {
            if !visited[neighbor] {
                visited[neighbor] = true
                queue = append(queue, neighbor)
            }
        }
    }
}

// Level-order traversal
func levelOrder(root *TreeNode) [][]int {
    if root == nil {
        return nil
    }

    result := [][]int{}
    queue := []*TreeNode{root}

    for len(queue) > 0 {
        levelSize := len(queue)
        level := make([]int, levelSize)

        for i := 0; i < levelSize; i++ {
            node := queue[0]
            queue = queue[1:]
            level[i] = node.Val

            if node.Left != nil {
                queue = append(queue, node.Left)
            }
            if node.Right != nil {
                queue = append(queue, node.Right)
            }
        }
        result = append(result, level)
    }
    return result
}
```

---

## Heaps (Priority Queues)

Go provides `container/heap` — you implement the interface, the package handles the algorithm.

### Implementing heap.Interface

```go
import "container/heap"

// Min heap of integers
type MinHeap []int

func (h MinHeap) Len() int           { return len(h) }
func (h MinHeap) Less(i, j int) bool { return h[i] < h[j] } // Min: <, Max: >
func (h MinHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }

func (h *MinHeap) Push(x any) {
    *h = append(*h, x.(int))
}

func (h *MinHeap) Pop() any {
    old := *h
    n := len(old)
    x := old[n-1]
    *h = old[:n-1]
    return x
}
```

### Using the Heap

```go
// Create and initialize
h := &MinHeap{3, 1, 4, 1, 5}
heap.Init(h)

// Push
heap.Push(h, 2)

// Pop minimum
min := heap.Pop(h).(int)

// Peek minimum (don't pop)
min := (*h)[0]

// Remove at index
heap.Remove(h, i)
```

### Heap Applications

```go
// 1. Kth Largest Element (use min heap of size k)
func findKthLargest(nums []int, k int) int {
    h := &MinHeap{}
    heap.Init(h)

    for _, num := range nums {
        heap.Push(h, num)
        if h.Len() > k {
            heap.Pop(h)
        }
    }
    return (*h)[0]
}

// 2. Custom Heap (priority queue with struct)
type Item struct {
    Value    string
    Priority int
    Index    int  // needed for update
}

type PriorityQueue []*Item

func (pq PriorityQueue) Len() int { return len(pq) }
func (pq PriorityQueue) Less(i, j int) bool {
    return pq[i].Priority > pq[j].Priority // Max heap
}
func (pq PriorityQueue) Swap(i, j int) {
    pq[i], pq[j] = pq[j], pq[i]
    pq[i].Index = i
    pq[j].Index = j
}
func (pq *PriorityQueue) Push(x any) {
    item := x.(*Item)
    item.Index = len(*pq)
    *pq = append(*pq, item)
}
func (pq *PriorityQueue) Pop() any {
    old := *pq
    n := len(old)
    item := old[n-1]
    old[n-1] = nil
    item.Index = -1
    *pq = old[:n-1]
    return item
}

// Update priority
func (pq *PriorityQueue) Update(item *Item, priority int) {
    item.Priority = priority
    heap.Fix(pq, item.Index)
}
```

### Complexity

| Operation | Time |
|-----------|------|
| Push | O(log n) |
| Pop | O(log n) |
| Peek | O(1) |
| Init | O(n) |
| Fix | O(log n) |

---

## Linked Lists

### Node Definition

```go
type ListNode struct {
    Val  int
    Next *ListNode
}

// Create
head := &ListNode{Val: 1}
head.Next = &ListNode{Val: 2}
head.Next.Next = &ListNode{Val: 3}
```

### Common Operations

```go
// Traverse
for curr := head; curr != nil; curr = curr.Next {
    fmt.Println(curr.Val)
}

// Find length
func length(head *ListNode) int {
    count := 0
    for curr := head; curr != nil; curr = curr.Next {
        count++
    }
    return count
}

// Insert at head
newHead := &ListNode{Val: 0, Next: head}

// Insert after node
func insertAfter(node *ListNode, val int) {
    newNode := &ListNode{Val: val, Next: node.Next}
    node.Next = newNode
}

// Delete next node
func deleteNext(node *ListNode) {
    if node.Next != nil {
        node.Next = node.Next.Next
    }
}
```

### Linked List Patterns

```go
// 1. Dummy head (simplifies edge cases)
func removeElements(head *ListNode, val int) *ListNode {
    dummy := &ListNode{Next: head}
    prev := dummy

    for curr := head; curr != nil; curr = curr.Next {
        if curr.Val == val {
            prev.Next = curr.Next
        } else {
            prev = curr
        }
    }
    return dummy.Next
}

// 2. Two pointers: Find middle
func findMiddle(head *ListNode) *ListNode {
    slow, fast := head, head
    for fast != nil && fast.Next != nil {
        slow = slow.Next
        fast = fast.Next.Next
    }
    return slow
}

// 3. Detect cycle
func hasCycle(head *ListNode) bool {
    slow, fast := head, head
    for fast != nil && fast.Next != nil {
        slow = slow.Next
        fast = fast.Next.Next
        if slow == fast {
            return true
        }
    }
    return false
}

// 4. Reverse linked list
func reverseList(head *ListNode) *ListNode {
    var prev *ListNode
    curr := head
    for curr != nil {
        next := curr.Next
        curr.Next = prev
        prev = curr
        curr = next
    }
    return prev
}
```

---

## Trees

### Binary Tree Node

```go
type TreeNode struct {
    Val   int
    Left  *TreeNode
    Right *TreeNode
}

// Create
root := &TreeNode{Val: 1}
root.Left = &TreeNode{Val: 2}
root.Right = &TreeNode{Val: 3}
```

### Tree Traversals

```go
// Inorder (Left, Root, Right)
func inorder(root *TreeNode, result *[]int) {
    if root == nil {
        return
    }
    inorder(root.Left, result)
    *result = append(*result, root.Val)
    inorder(root.Right, result)
}

// Preorder (Root, Left, Right)
func preorder(root *TreeNode, result *[]int) {
    if root == nil {
        return
    }
    *result = append(*result, root.Val)
    preorder(root.Left, result)
    preorder(root.Right, result)
}

// Postorder (Left, Right, Root)
func postorder(root *TreeNode, result *[]int) {
    if root == nil {
        return
    }
    postorder(root.Left, result)
    postorder(root.Right, result)
    *result = append(*result, root.Val)
}

// Level order (BFS) - see Queue section
```

### Tree Patterns

```go
// 1. Max depth
func maxDepth(root *TreeNode) int {
    if root == nil {
        return 0
    }
    left := maxDepth(root.Left)
    right := maxDepth(root.Right)
    return max(left, right) + 1
}

// 2. Validate BST
func isValidBST(root *TreeNode) bool {
    return validate(root, nil, nil)
}

func validate(node *TreeNode, min, max *int) bool {
    if node == nil {
        return true
    }
    if min != nil && node.Val <= *min {
        return false
    }
    if max != nil && node.Val >= *max {
        return false
    }
    return validate(node.Left, min, &node.Val) &&
           validate(node.Right, &node.Val, max)
}

// 3. Lowest Common Ancestor
func lowestCommonAncestor(root, p, q *TreeNode) *TreeNode {
    if root == nil || root == p || root == q {
        return root
    }
    left := lowestCommonAncestor(root.Left, p, q)
    right := lowestCommonAncestor(root.Right, p, q)
    if left != nil && right != nil {
        return root
    }
    if left != nil {
        return left
    }
    return right
}
```

---

## Graphs

### Representations

```go
// Adjacency List (most common)
graph := make(map[int][]int)
graph[0] = []int{1, 2}
graph[1] = []int{0, 3}

// Edge List
type Edge struct {
    From, To, Weight int
}
edges := []Edge{{0, 1, 5}, {1, 2, 3}}

// Adjacency Matrix
n := 5
matrix := make([][]int, n)
for i := range matrix {
    matrix[i] = make([]int, n)
}
matrix[0][1] = 1  // edge from 0 to 1
```

### Graph Traversals

```go
// DFS (recursive)
func dfs(node int, graph map[int][]int, visited map[int]bool) {
    if visited[node] {
        return
    }
    visited[node] = true
    fmt.Println(node)

    for _, neighbor := range graph[node] {
        dfs(neighbor, graph, visited)
    }
}

// DFS (iterative with stack)
func dfsIterative(start int, graph map[int][]int) {
    visited := make(map[int]bool)
    stack := []int{start}

    for len(stack) > 0 {
        node := stack[len(stack)-1]
        stack = stack[:len(stack)-1]

        if visited[node] {
            continue
        }
        visited[node] = true
        fmt.Println(node)

        for _, neighbor := range graph[node] {
            if !visited[neighbor] {
                stack = append(stack, neighbor)
            }
        }
    }
}

// BFS
func bfs(start int, graph map[int][]int) {
    visited := make(map[int]bool)
    queue := []int{start}
    visited[start] = true

    for len(queue) > 0 {
        node := queue[0]
        queue = queue[1:]
        fmt.Println(node)

        for _, neighbor := range graph[node] {
            if !visited[neighbor] {
                visited[neighbor] = true
                queue = append(queue, neighbor)
            }
        }
    }
}
```

---

## Sets

Go doesn't have a built-in set, but `map[T]struct{}` is idiomatic.

### Set Implementation

```go
// Using map with empty struct (zero memory for values)
type Set map[int]struct{}

func NewSet() Set {
    return make(Set)
}

func (s Set) Add(val int) {
    s[val] = struct{}{}
}

func (s Set) Remove(val int) {
    delete(s, val)
}

func (s Set) Contains(val int) bool {
    _, exists := s[val]
    return exists
}

func (s Set) Len() int {
    return len(s)
}

// Set operations
func (s Set) Union(other Set) Set {
    result := NewSet()
    for k := range s {
        result.Add(k)
    }
    for k := range other {
        result.Add(k)
    }
    return result
}

func (s Set) Intersection(other Set) Set {
    result := NewSet()
    for k := range s {
        if other.Contains(k) {
            result.Add(k)
        }
    }
    return result
}
```

### Quick Set Pattern

```go
// Just use map directly
seen := make(map[int]struct{})

// Add
seen[value] = struct{}{}

// Check
if _, exists := seen[value]; exists {
    // already seen
}

// For simple cases, map[int]bool works too
seen := make(map[int]bool)
seen[value] = true
if seen[value] {
    // already seen
}
```

---

## Complexity Cheat Sheet

| Structure | Access | Search | Insert | Delete |
|-----------|--------|--------|--------|--------|
| Slice | O(1) | O(n) | O(n)* | O(n) |
| Map | - | O(1) | O(1) | O(1) |
| Stack | O(n) | O(n) | O(1) | O(1) |
| Queue | O(n) | O(n) | O(1) | O(1)** |
| Heap | - | O(n) | O(log n) | O(log n) |
| Linked List | O(n) | O(n) | O(1)*** | O(1)*** |
| BST | - | O(log n) | O(log n) | O(log n) |

\* Append is O(1) amortized
\** O(n) with slice, O(1) with container/list
\*** If you have the node reference

---

## Modern Generic Helpers

### maps Package (Go 1.21+)

```go
import "maps"

m := map[string]int{"a": 1, "b": 2, "c": 3}

// Clone a map
copy := maps.Clone(m)

// Equal (compares keys and values)
maps.Equal(m, copy)                   // true

// Delete by predicate
maps.DeleteFunc(m, func(k string, v int) bool {
    return v < 2                       // Delete where value < 2
})

// Copy into existing map
dst := make(map[string]int)
maps.Copy(dst, m)
```

### maps Package with Iterators (Go 1.23+)

```go
import (
    "maps"
    "slices"
)

m := map[string]int{"a": 1, "b": 2}

// Iterate over keys
for k := range maps.Keys(m) {
    fmt.Println(k)
}

// Iterate over values
for v := range maps.Values(m) {
    fmt.Println(v)
}

// Collect keys/values to slices
keys := slices.Collect(maps.Keys(m))
values := slices.Collect(maps.Values(m))

// Sorted keys
keys := slices.Sorted(maps.Keys(m))  // []string{"a", "b"}
```

### Generic Stack (Type-Safe)

```go
// See 06-generics.md for full implementation
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

// Usage
intStack := &Stack[int]{}
intStack.Push(1)
intStack.Push(2)
val, ok := intStack.Pop()  // 2, true

stringStack := &Stack[string]{}
stringStack.Push("hello")
```

### Generic Set (Type-Safe)

```go
type Set[T comparable] map[T]struct{}

func NewSet[T comparable](items ...T) Set[T] {
    s := make(Set[T])
    for _, item := range items {
        s[item] = struct{}{}
    }
    return s
}

func (s Set[T]) Add(item T)      { s[item] = struct{}{} }
func (s Set[T]) Remove(item T)   { delete(s, item) }
func (s Set[T]) Contains(item T) bool {
    _, ok := s[item]
    return ok
}

// Usage
intSet := NewSet(1, 2, 3)
intSet.Contains(2)  // true

stringSet := NewSet("a", "b")
stringSet.Add("c")
```

### Generic Type Aliases (Go 1.24+)

```go
// Type aliases with type parameters
type Set[T comparable] = map[T]struct{}
type Pair[T, U any] = struct{ First T; Second U }

// Usage
var mySet Set[int] = make(Set[int])
mySet[42] = struct{}{}

pair := Pair[string, int]{First: "age", Second: 30}
```

### weak Package (Go 1.24+)

For advanced memory patterns with weak references:

```go
import "weak"

type Cache[K comparable, V any] struct {
    items map[K]weak.Pointer[V]
}

// Weak references allow GC to collect values
// Useful for caches that shouldn't prevent garbage collection
func (c *Cache[K, V]) Get(key K) (V, bool) {
    if wp, ok := c.items[key]; ok {
        if v := wp.Value(); v != nil {
            return *v, true
        }
        // Value was garbage collected
        delete(c.items, key)
    }
    var zero V
    return zero, false
}

func (c *Cache[K, V]) Set(key K, value *V) {
    c.items[key] = weak.Make(value)
}
```

### cmp Package (Go 1.21+)

```go
import "cmp"

// Compare returns -1, 0, or 1
cmp.Compare(3, 5)     // -1
cmp.Compare(5, 5)     // 0
cmp.Compare(7, 5)     // 1

// Less is shorthand
cmp.Less(3, 5)        // true

// Or returns first non-zero value
cmp.Or(0, 0, 1, 2)    // 1
cmp.Or("", "", "a")   // "a"

// Multi-field sorting
slices.SortFunc(people, func(a, b Person) int {
    if c := cmp.Compare(a.Age, b.Age); c != 0 {
        return c
    }
    return cmp.Compare(a.Name, b.Name)
})
```

### Swiss Tables (Go 1.24+)

Go 1.24 introduced Swiss Tables as the new map implementation, providing:

- **~60% faster** map operations on average
- Better memory locality
- Improved cache efficiency

No code changes needed — it's automatic for all map types:

```go
// These all benefit from Swiss Tables automatically
m := make(map[string]int)
m["key"] = value
v, ok := m["key"]
delete(m, "key")
```

---

**Next:** [03-concurrency-patterns.md](03-concurrency-patterns.md) — Master goroutines, channels, and sync primitives
