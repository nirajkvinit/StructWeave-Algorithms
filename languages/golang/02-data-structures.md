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
var nums []int  // nums == nil is true, JSON: null

// Empty non-nil slice (len=0, cap=0)
nums := []int{} // nums != nil, JSON: []
```

> **Note: Nil vs. Empty Slices**
>
> While both have a length and capacity of 0, there are important differences:
>
> * **Nil Slice** (`var s []int`):
>   * No underlying array allocated.
>   * Marshals to `null` in JSON.
>   * Functional equality: `s == nil`.
>   * Preferred for "no result" or variable declaration.
>
> * **Empty Slice** (`s := []int{}` or `make([]int, 0)`):
>   * Pointer is non-nil.
>   * Marshals to `[]` in JSON.
>   * Functional equality: `s != nil`.
>   * Preferred when you need to explicitly return an empty list (e.g., to a JSON client).

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
// 1. Remove element at index i (Order doesn't matter)
// Efficiency: O(1) - Very fast!
// Logic: Since order doesn't matter, we can just fill the "hole" at index 'i'
// with the last element of the slice, then chop off the last element.
nums[i] = nums[len(nums)-1] // Copy last element to index i (overwrites target)
nums = nums[:len(nums)-1]   // Truncate slice by 1 (removes the duplicate at end)

// 2. Remove element at index i (Preserve order)
// Efficiency: O(n) - Slower, has to shift elements.
// Logic: "Cut" the slice at 'i' and rejoin the parts before and after it.
// append(part_before_i, part_after_i...)
nums = append(nums[:i], nums[i+1:]...)

// 3. Insert element at index i
// Efficiency: O(n) - Slower, triggers allocation and shifting.
// Logic: Create a new slice segment with [val, ...rest_of_elements] and append it
// to the start of the slice.
nums = append(nums[:i], append([]int{val}, nums[i:]...)...)
// Better: Use slices package (Go 1.21+) for readability and optimization
nums = slices.Insert(nums, i, val)

// 4. Reverse in place
// Logic: Walk inward from both ends (0 and len-1), swapping as we go.
// Stops when pointers meet or cross (i < j is false).
for i, j := 0, len(nums)-1; i < j; i, j = i+1, j-1 {
    nums[i], nums[j] = nums[j], nums[i] // Parallel assignment (swap)
}

// 5. Filter in place (Zero allocation)
// Logic: "Compact" the array. We maintain a pointer 'n' that tracks
// the position where the next "kept" item should go.
n := 0
for _, x := range nums {
    if x > 0 { // Condition: keep positive numbers
        nums[n] = x // Move valid item to position 'n'
        n++         // Advance the "write" head
    }
}
nums = nums[:n] // Reslice to keep only the valid items (0 to n)

// 6. Two-pointer technique
// Logic: Use two indices to traverse the slice, usually based on some condition.
// Often used for finding pairs (in sorted arrays), partitioning, or checking palindromes.
left, right := 0, len(nums)-1
for left < right {
    // Check condition (e.g., nums[left] + nums[right] == target)
    // Move left++ or right-- based on logic
}
```

### 2D Slices (Matrices)

```go
// Create m x n matrix (3 rows, 4 columns)
// Concept: A 2D slice is a "slice of slices".
// We must allocate the outer backbone first, then each row individually.
m, n := 3, 4
matrix := make([][]int, m) // 1. Allocate outer slice (holds 3 nil headers)

for i := range matrix {
    matrix[i] = make([]int, n) // 2. Allocate each inner slice (row)
}

/*
Visual Representation (Step-by-Step):
1. After make([][]int, m):
   matrix -> [ nil, nil, nil ]

2. After the loop runs:
   matrix
     |
     v
   [ ptr ] -> [ 0, 0, 0, 0 ] (Row 0)
   [ ptr ] -> [ 0, 0, 0, 0 ] (Row 1)
   [ ptr ] -> [ 0, 0, 0, 0 ] (Row 2)

Each row is independent in memory!
*/

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

// Equal (Value comparison, NOT reference comparison)
// Clarification: Although slices are reference types, Equal() compares the *content*.
// Logic: Checks length first, then compares elements one by one (O(n)).
// It returns true here even if the underlying arrays are at different memory addresses.
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

// Nil map (Be Careful!)
// Definition: A declared map without 'make' or literal initialization is nil.
var m map[string]int  // Just a pointer, nowhere to store data yet!

// READING is safe (Returns zero value)
val := m["key"]       // val = 0 (safe, no panic)
len(m)                // 0 (safe)

// WRITING panics (Crash!)
// m["key"] = 1       // PANIC: assignment to entry in nil map
// Why? There is no underlying hash table allocated to store the key-value pair.
// Analogy: Trying to put a book on a shelf that you haven't bought yet.
// Fix: Always initialize with 'make' before writing.
m = make(map[string]int)
m["key"] = 1          // Now it works
```

### Essential Operations

```go
// Insert/Update
m["key"] = value

// Lookup (The Ambiguity Problem)
value := m["key"]
// Returns value if key exists.
// If key is MISSING, it returns the "Zero Value" for the type:
// - int: 0
// - string: ""
// - bool: false
// - pointer: nil

// PROBLEM: If value == 0, is the real value 0, or is the key missing?
// You cannot tell just by looking at 'value'.

// Solution: "Comma-ok" idiom (Existence Check)
value, ok := m["key"] // 'ok' is a boolean
if !ok {
    // Key "key" does not exist in the map
} else {
    // Key exists (value might still be 0, but it's a "real" 0)
}

// Delete
delete(m, "key")

// Length
n := len(m)

// Iterate (Random Order Warning!)
// IMPORTANT: Go maps do NOT maintain insertion order.
// The iteration order is randomized by the runtime and changes between runs.
// Why? To force developers not to rely on implementation details (hash bucket order).
// Rule: If you need ordered data (e.g., sorted keys), do NOT use a map alone.
// Use a Slice alongside the map to track order.
for key, value := range m {
    fmt.Printf("%s: %d\n", key, value) // Output order is unpredictable
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

// ---------------------------------
// 2. Two Sum Pattern (The "Complement" Strategy)
// Goal: Find two numbers that add up to 'target'.
// Strategy: As we iterate, for every number 'x', we need 'target - x'.
// Instead of scanning back (O(n^2)), we check our "seen" map (O(1)).

seen := make(map[int]int)  // Map: [Number Value] -> [Index]

/*
Visual Walkthrough: nums = [2, 11, 7, 15], target = 9
------------------------------------------------------------------
Step | Current (num) | Needed (target-num)| Is Needed in Map? | Action
------------------------------------------------------------------
 1   | 2             | 7                  | No (map empty)    | Store 2: map{2:0}
 2   | 11            | -2                 | No                | Store 11: map{2:0, 11:1}
 3   | 7             | 2                  | YES! (at idx 0)   | Found pair! Return [0, 2]
------------------------------------------------------------------
*/

for i, num := range nums {
    complement := target - num // What number do we need to complete the pair?
    
    // Check if we've already seen that needed number
    if j, exists := seen[complement]; exists {
        return []int{j, i} // Found: j is index of complement, i is current index
    }
    
    // Remember this number and its index for future matches
    seen[num] = i
}

// ---------------------------------
// 3. Deduplication (Simulating a Set)
// Goal: Remove all duplicate values, keeping only unique ones.
// Logic: Maps require keys to be unique. If you add '5' twice, the second one just overwrites the first.
// The result is a collection of only unique keys.

// why struct{}?
// - bool: Uses 1 byte of memory per entry.
// - struct{}: Uses 0 bytes. It's truly empty. Ideally optimized.

unique := make(map[int]struct{})
for _, num := range nums {
    unique[num] = struct{}{} // "I have seen this number"
}
// Now 'unique' map keys are the strict set of numbers from 'nums'

// ---------------------------------
// 4. Grouping (The "Bucketing" Strategy)
// Goal: Organize items into categories, like specific bins.
// Real-World: Grouping orders by CustomerID, logs by ErrorLevel, or words by Anagrams.
// Logic: The Key is the "Category". The Value is a Slice (list) of items in that category.

groups := make(map[string][]string) // Map: [First Letter] -> [List of Names]

names := []string{"Alice", "Bob", "Anna", "Bill", "Charlie"}

for _, name := range names {
    // Logic: The "Key" is the first letter of the name.
    // In a real app, this could be customerID, date, category_id, etc.
    firstLetter := string(name[0]) 

    // Add name to that letter's bucket
    groups[firstLetter] = append(groups[firstLetter], name)
}
// Result:
// "A": ["Alice", "Anna"]
// "B": ["Bob", "Bill"]
// "C": ["Charlie"]

// ---------------------------------
// 5. Memoization (Caching Results)
// Goal: Avoid re-calculating expensive operations by remembering previous answers.
// Real-World: Dynamic Programming, caching database queries, recursive graph problems.
// Logic: Before doing work, check: "Have I seen this input before?"

memo := make(map[string]int) // Map: [Input State] -> [Computed Result]
var solve func(state string) int

solve = func(state string) int {
    // 1. Check Cache (O(1))
    if result, exists := memo[state]; exists {
        return result // Return saved answer immediately!
    }

    // 2. Compute (Expensive part)
    // result := heavyComputation(state)
    
    // 3. Save to Cache
    memo[state] = result 
    return result
}
```

### Map with Struct Keys (Composite Keys)

Go maps allow using structs as keys, provided all fields in the struct are comparable.

**Real-World Usefulness:**

* **Grid Systems**: Tracking visited coordinates in games or pathfinding algorithms (e.g., `x, y`).
* **Caches**: Memoizing functions with multiple arguments (e.g., `UserType` + `Region`).
* **Composite IDs**: Solving problems where uniqueness is defined by a combination of fields (e.g., `OrderID` + `ProductID`).

**Advantage**: You don't need to hack simple keys together (like `"1,2"`) which is error-prone and slow.

```go
// Example: 2D Grid Traversal (Visited Set)
type Point struct {
    X, Y int
}

// 1. Define map with Struct as the Key
visited := make(map[Point]bool)

// 2. Insert struct directly
current := Point{X: 0, Y: 0}
visited[current] = true

// 3. Lookup using a struct
next := Point{X: 1, Y: 1}
if visited[next] {
    // We have been here before
}

// WARNING: Struct keys must NOT contain slices, maps, or functions.
// Those types are not comparable using '==', so they break map lookups.
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

**Definition**: A Stack is a **LIFO** (Last-In, First-Out) data structure.
Think of a stack of plates in a cafeteria:

1. **Push**: You put a new plate on top.
2. **Pop**: You take the top plate off.
You can't grab the bottom plate without removing the top ones first!

**Real-World Use Cases**:

1. **Undo/Redo**: Editors store your actions in a stack. Ctrl+Z pops the last action.
2. **Browser History**: The "Back" button pops the current page to return to the previous one.
3. **Call Stack**: Programming languages use stacks to track function calls (recursion).
4. **Syntax Parsing**: Compilers check matching brackets `(( ))` using stacks.

Go doesn't have a built-in stack type, but **Slices** are perfect for this.

### Stack Implementation

```go
// Stack using slice
// Defines 'Stack' as a nickname for an integer slice.
type Stack []int

// PUSH
// Receiver '(s *Stack)' is a POINTER because we need to modify the actual slice.
// If we used '(s Stack)', we would modify a copy, and the original stack wouldn't change.
func (s *Stack) Push(v int) {
    *s = append(*s, v)
}

// POP
func (s *Stack) Pop() int {
    // 1. Safety Check: Don't pop from an empty stack!
    if len(*s) == 0 {
        panic("Stack Empty: Cannot Pop")
    }

    // 2. Get the last element (Top of stack)
    // Note on (*s): We must "dereference" the pointer to get the actual slice.
    lastIndex := len(*s) - 1
    v := (*s)[lastIndex]

    // 3. Remove the last element (Shrink the slice)
    *s = (*s)[:lastIndex]

    return v
}

// PEEK (Look at top without removing)
func (s *Stack) Peek() int {
    if len(*s) == 0 { return 0 } // Handle empty case gracefully or panic
    return (*s)[len(*s)-1]
}

func (s *Stack) IsEmpty() bool {
    return len(*s) == 0
}
```

### Quick Stack Pattern (No Custom Type)

```go
// Just use a slice directly
// Note: Why no pointers here?
// In this pattern, we are using the 'stack' variable directly in the function.
// We update it by REASSIGNING it: "stack = append(...)" or "stack = stack[...]".
// We only need pointers involved when we want a separate Function/Method to modify our variable.
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
// Problem: Check if string has valid open/close pairs: "()[]{}" is true, "(]" is false.
func isValid(s string) bool {
    // State: Use a stack to keep track of 'OPEN' brackets waiting for a match.
    stack := []rune{}
    
    // Map: Closing bracket -> Matching Open bracket
    pairs := map[rune]rune{')': '(', '}': '{', ']': '['}

    for _, c := range s {
        // CASE 1: Opening Bracket? Push to stack.
        // Logic: We expect to see the closing partner later.
        if c == '(' || c == '{' || c == '[' {
            stack = append(stack, c)
        } else {
            // CASE 2: Closing Bracket? Check match.
            // Check A: Is stack empty? (Means we have a closing bracket with NO opening partner)
            // Check B: Does the top of stack NOT match? (Means Mismatch type, e.g. "{]")
            if len(stack) == 0 || stack[len(stack)-1] != pairs[c] {
                return false // Invalid!
            }
            // Logic: Match found! Remove the opening bracket from stack (Problem solved for this pair).
            stack = stack[:len(stack)-1]
        }
    }
    // Final Check: Stack must be empty.
    // If not empty, we have leftover opening brackets like "(()" -> stack has "("
    return len(stack) == 0
}

// 2. Monotonic Stack (Next Greater Element)
// Goal: For each number, find the FIRST number to its right that is larger.
// Analogy: Think of it as people standing in line. You are looking for the first person taller than you behind you.

// Input:  [2, 1, 5]
// Result: [5, 5, -1]
// - 2 sees 5 is taller.
// - 1 sees 5 is taller.
// - 5 sees no one.

func nextGreater(nums []int) []int {
    n := len(nums)
    result := make([]int, n)
    for i := range result { result[i] = -1 } // Default: if no greater element found

    // Stack stores INDICES of numbers that are "waiting" for a greater element.
    // Why indices? Because we need to update the 'result' array at that specific position.
    stack := []int{} 

    /*
    Visual Trace: nums = [2, 1, 5]
    -------------------------------------------------------------------------------
    i | Val | Stack (Waitlist) | Action
    -------------------------------------------------------------------------------
    0 | 2   | [0(2)]           | 2 is unmatched. Wait. Push index 0.
    1 | 1   | [0(2), 1(1)]     | 1 is NOT > 2. Wait. Push index 1.
    2 | 5   | [0(2)]           | 5 > 1? YES! Pop 1. result[1] = 5 (1 found match!)
      |     | []               | 5 > 2? YES! Pop 0. result[0] = 5 (2 found match!)
      |     | [2(5)]           | 5 unmatched. Wait. Push index 2.
    -------------------------------------------------------------------------------
    */

    for i := 0; i < n; i++ {
        // While stack not empty AND current number is BIGGER than the waiting number:
        for len(stack) > 0 && nums[i] > nums[stack[len(stack)-1]] {
            idx := stack[len(stack)-1] // Get the index of the waiting number
            stack = stack[:len(stack)-1] // Pop it (It found a match!)
            result[idx] = nums[i]        // Record the match
        }
        stack = append(stack, i) // Current number joins the waitlist
    }
    return result
}
```

---

## Queues

**Definition**: A Queue is a **FIFO** (First-In, First-Out) data structure.
Think of a line of people waiting to buy tickets:

1. **Enqueue**: You join the back of the line.
2. **Dequeue**: The person at the front gets served and leaves.
Fairness is key: The first one to arrive is the first one served.

**Real-World Use Cases**:

1. **Task Processing**: Background jobs (like sending emails) are processed in order.
2. **Printer Spool**: Documents wait in a queue; the first file sent is printed first.
3. **Web Server Requests**: Handling incoming HTTP requests when the server is busy.
4. **Breadth-First Search (BFS)**: Exploring graphs level-by-level (closest nodes first).

### Queue Implementation

```go
// 1. Slice-based Queue (Easiest to write, but performance trap!)
// Pros: Simple, valid for small queues (e.g., BFS on small graphs).
// Cons: Dequeue is O(n). Removing the first element forces ALL other elements to shift left in memory.
// Analogy: If the person at the front of a line leaves, everyone else must physically take a step forward.
queue := []int{}

// Enqueue (Add to back) -> O(1)
queue = append(queue, value)

// Dequeue (Remove from front) -> O(n) - SLOW for large data!
front := queue[0]
queue = queue[1:] // Slicing merely moves the "window", but eventually the underlying array grows huge.
// (In some languages/cases, this triggers a full memory copy).

// Recommendation: For heavy queue usage (1000+ ops), use a Linked List (O(1) pop).

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

> **Note: Type Assertion Required**
>
> The `container/list` package stores values as `interface{}` (any type), so you must assert the type when retrieving:
> ```go
> value := front.Value.(int)  // Convert interface{} back to int
> ```
> If you're unsure of the type, use the safe form to avoid panics:
> ```go
> if num, ok := front.Value.(int); ok {
>     // num is an int, safe to use
> }
> ```
> See [01-syntax-quick-reference.md#type-assertions--type-switches](01-syntax-quick-reference.md#type-assertions--type-switches) for full explanation.

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

> **Why `x.(int)`?**
>
> The `heap.Interface` requires `Push(x any)` and `Pop() any` signatures. Since `any` (alias for `interface{}`) can hold any type, we must assert back to our expected type:
> ```go
> func (h *MinHeap) Push(x any) {
>     *h = append(*h, x.(int))  // x is interface{}, assert to int
> }
>
> min := heap.Pop(h).(int)  // Pop returns interface{}, assert to int
> ```
> This is a pre-generics pattern required by the standard library. For type-safe alternatives, see the generic Stack in [Modern Generic Helpers](#modern-generic-helpers) or [06-generics.md](06-generics.md).

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

* **~60% faster** map operations on average
* Better memory locality
* Improved cache efficiency

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
