# TypeScript Data Structures

> Essential collections and data structures for coding interviews

---

## Table of Contents

1. [Array\<T\>](#arrayt)
2. [Map\<K, V\>](#mapk-v)
3. [Set\<T\>](#sett)
4. [Tuples](#tuples)
5. [Objects & Records](#objects--records)
6. [Stack Implementation](#stack-implementation)
7. [Queue Implementation](#queue-implementation)
8. [Priority Queue (Heap)](#priority-queue-heap)
9. [Custom Data Structures](#custom-data-structures)
10. [Complexity Cheat Sheet](#complexity-cheat-sheet)

---

## Array\<T\>

Arrays are the workhorse data structure for algorithms. TypeScript arrays are dynamic (like JavaScript).

### Creation

```typescript
// Literal syntax (preferred)
const nums: number[] = [1, 2, 3];
const strs: string[] = ["a", "b", "c"];

// Generic syntax
const arr: Array<number> = [1, 2, 3];

// Empty array (must annotate type)
const empty: number[] = [];

// Filled array
const zeros = new Array(5).fill(0);           // [0, 0, 0, 0, 0]
const nulls = new Array(5).fill(null);        // [null, null, null, null, null]

// Range [0, n)
const range = Array.from({ length: 5 }, (_, i) => i);  // [0, 1, 2, 3, 4]

// Range [1, n]
const oneIndexed = Array.from({ length: 5 }, (_, i) => i + 1);  // [1, 2, 3, 4, 5]

// 2D array (matrix)
const matrix: number[][] = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
];

// Create m x n matrix filled with 0
const rows = 3, cols = 4;
const grid = Array.from({ length: rows }, () => new Array(cols).fill(0));

// WARNING: Don't use this for 2D arrays (all rows share same reference)
// const BAD = new Array(3).fill(new Array(3).fill(0));
```

### Access & Modification

```typescript
const nums = [1, 2, 3, 4, 5];

// Access
nums[0];                     // 1 (first)
nums[nums.length - 1];       // 5 (last)
nums.at(-1);                 // 5 (last, ES2022)
nums.at(-2);                 // 4 (second to last)

// Modification (mutating)
nums[0] = 10;                // Replace at index
nums.push(6);                // Add to end - O(1)
nums.pop();                  // Remove from end - O(1)
nums.unshift(0);             // Add to front - O(n)
nums.shift();                // Remove from front - O(n)

// Insert at position
nums.splice(2, 0, 100);      // Insert 100 at index 2

// Remove at position
nums.splice(2, 1);           // Remove 1 element at index 2

// Replace at position
nums.splice(2, 1, 100);      // Replace 1 element at index 2 with 100
```

### Searching

```typescript
const nums = [1, 2, 3, 2, 4];

// Check existence - O(n)
nums.includes(2);            // true
nums.includes(10);           // false

// Find index - O(n)
nums.indexOf(2);             // 1 (first occurrence)
nums.lastIndexOf(2);         // 3 (last occurrence)
nums.indexOf(10);            // -1 (not found)

// Find with predicate - O(n)
nums.find(x => x > 2);       // 3 (first matching element)
nums.findIndex(x => x > 2);  // 2 (index of first match)
nums.findLast(x => x > 2);   // 4 (last matching element, ES2023)
nums.findLastIndex(x => x > 2);  // 4 (index of last match, ES2023)
```

### Transformation

```typescript
const nums = [1, 2, 3, 4, 5];

// Map - transform each element
const doubled = nums.map(x => x * 2);        // [2, 4, 6, 8, 10]
const withIndex = nums.map((x, i) => [i, x]);  // [[0,1], [1,2], ...]

// Filter - keep matching elements
const evens = nums.filter(x => x % 2 === 0);  // [2, 4]

// Reduce - aggregate to single value
const sum = nums.reduce((acc, x) => acc + x, 0);  // 15
const max = nums.reduce((a, b) => Math.max(a, b), -Infinity);

// flatMap - map and flatten
const nested = [[1, 2], [3, 4]];
const flat = nested.flatMap(x => x);         // [1, 2, 3, 4]

// Chaining
const result = nums
    .filter(x => x > 1)
    .map(x => x * 2)
    .reduce((a, b) => a + b, 0);
```

### Sorting

```typescript
const nums = [3, 1, 4, 1, 5, 9];

// IMPORTANT: sort() sorts as strings by default!
[10, 2, 1].sort();           // [1, 10, 2] - WRONG for numbers!

// Numeric sort (ascending)
nums.sort((a, b) => a - b);  // [1, 1, 3, 4, 5, 9]

// Numeric sort (descending)
nums.sort((a, b) => b - a);  // [9, 5, 4, 3, 1, 1]

// Sort strings
const strs = ["banana", "apple", "cherry"];
strs.sort();                 // ["apple", "banana", "cherry"]
strs.sort((a, b) => b.localeCompare(a));  // Descending

// Sort objects by property
interface Person { name: string; age: number; }
const people: Person[] = [
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 },
];
people.sort((a, b) => a.age - b.age);

// Non-mutating sort (ES2023)
const sorted = nums.toSorted((a, b) => a - b);  // Original unchanged
```

### Slicing & Copying

```typescript
const nums = [1, 2, 3, 4, 5];

// Slice - extract portion (non-mutating)
nums.slice(1, 3);            // [2, 3] - indices [1, 3)
nums.slice(2);               // [3, 4, 5] - from index 2 to end
nums.slice(-2);              // [4, 5] - last 2 elements
nums.slice(0, -1);           // [1, 2, 3, 4] - all but last

// Copy array
const copy1 = [...nums];             // Spread operator (preferred)
const copy2 = nums.slice();          // slice()
const copy3 = Array.from(nums);      // Array.from

// Reverse (mutating)
nums.reverse();

// Reverse (non-mutating)
const reversed = nums.toReversed();  // ES2023
const reversed2 = [...nums].reverse();
```

### Array Methods Summary

| Method | Mutates | Returns | Use Case |
|--------|---------|---------|----------|
| `push()` | Yes | length | Add to end |
| `pop()` | Yes | element | Remove from end |
| `unshift()` | Yes | length | Add to front |
| `shift()` | Yes | element | Remove from front |
| `splice()` | Yes | removed[] | Insert/remove at index |
| `sort()` | Yes | array | Sort in-place |
| `reverse()` | Yes | array | Reverse in-place |
| `slice()` | No | new array | Extract portion |
| `map()` | No | new array | Transform elements |
| `filter()` | No | new array | Select elements |
| `reduce()` | No | single value | Aggregate |
| `concat()` | No | new array | Combine arrays |
| `toSorted()` | No | new array | Sorted copy (ES2023) |
| `toReversed()` | No | new array | Reversed copy (ES2023) |

---

## Map\<K, V\>

`Map` provides O(1) key-value lookups. Prefer `Map` over plain objects for algorithm problems.

### Creation

```typescript
// Empty Map
const map = new Map<string, number>();

// From entries
const map2 = new Map<string, number>([
    ["a", 1],
    ["b", 2],
    ["c", 3],
]);

// From object
const obj = { a: 1, b: 2 };
const map3 = new Map(Object.entries(obj));

// From array (create index lookup)
const nums = [10, 20, 30];
const indexMap = new Map(nums.map((val, idx) => [val, idx]));
```

### Operations

```typescript
const map = new Map<string, number>();

// Set - O(1)
map.set("a", 1);
map.set("b", 2);

// Get - O(1)
map.get("a");                // 1
map.get("z");                // undefined

// Get with default
map.get("z") ?? 0;           // 0 (if key doesn't exist)

// Check existence - O(1)
map.has("a");                // true
map.has("z");                // false

// Delete - O(1)
map.delete("a");             // true (if existed)

// Size
map.size;                    // Number of entries

// Clear all
map.clear();
```

### Iteration

```typescript
const map = new Map<string, number>([
    ["a", 1],
    ["b", 2],
]);

// Iterate entries
for (const [key, value] of map) {
    console.log(key, value);
}

// Iterate keys
for (const key of map.keys()) {
    console.log(key);
}

// Iterate values
for (const value of map.values()) {
    console.log(value);
}

// Convert to array
const entries = [...map];           // [["a", 1], ["b", 2]]
const keys = [...map.keys()];       // ["a", "b"]
const values = [...map.values()];   // [1, 2]

// forEach
map.forEach((value, key) => {
    console.log(key, value);
});
```

### Common Patterns

```typescript
// Frequency counter
function countFrequency(arr: string[]): Map<string, number> {
    const freq = new Map<string, number>();
    for (const item of arr) {
        freq.set(item, (freq.get(item) ?? 0) + 1);
    }
    return freq;
}

// Two Sum with Map
function twoSum(nums: number[], target: number): [number, number] | null {
    const seen = new Map<number, number>();

    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (seen.has(complement)) {
            return [seen.get(complement)!, i];
        }
        seen.set(nums[i], i);
    }
    return null;
}

// Grouping
function groupBy<T, K>(arr: T[], keyFn: (item: T) => K): Map<K, T[]> {
    const groups = new Map<K, T[]>();
    for (const item of arr) {
        const key = keyFn(item);
        const group = groups.get(key) ?? [];
        group.push(item);
        groups.set(key, group);
    }
    return groups;
}
```

### Map vs Object

| Feature | `Map<K, V>` | `{ [key: string]: V }` |
|---------|-------------|------------------------|
| Key types | Any type | string, number, symbol |
| Size | `.size` property | `Object.keys(obj).length` |
| Iteration order | Insertion order | Not guaranteed (pre-ES6) |
| Performance | O(1) optimized | O(1) but less optimized |
| Prototype pollution | No | Possible |
| Serialization | Manual | `JSON.stringify()` |

**Rule of thumb:** Use `Map` for algorithm problems, plain objects for config/data.

---

## Set\<T\>

`Set` provides O(1) membership testing and automatic deduplication.

### Creation

```typescript
// Empty Set
const set = new Set<number>();

// From array
const set2 = new Set([1, 2, 3, 2, 1]);  // {1, 2, 3} (deduplicated)

// From string (character set)
const chars = new Set("hello");  // {"h", "e", "l", "o"}
```

### Operations

```typescript
const set = new Set<number>();

// Add - O(1)
set.add(1);
set.add(2);
set.add(1);  // Ignored (duplicate)

// Check existence - O(1)
set.has(1);  // true
set.has(10); // false

// Delete - O(1)
set.delete(1);  // true (if existed)

// Size
set.size;

// Clear all
set.clear();
```

### Iteration

```typescript
const set = new Set([1, 2, 3]);

// Iterate values
for (const value of set) {
    console.log(value);
}

// Convert to array
const arr = [...set];           // [1, 2, 3]
const arr2 = Array.from(set);   // [1, 2, 3]

// forEach
set.forEach(value => {
    console.log(value);
});
```

### Set Operations

```typescript
const a = new Set([1, 2, 3]);
const b = new Set([2, 3, 4]);

// Union
const union = new Set([...a, ...b]);  // {1, 2, 3, 4}

// Intersection
const intersection = new Set([...a].filter(x => b.has(x)));  // {2, 3}

// Difference (a - b)
const difference = new Set([...a].filter(x => !b.has(x)));  // {1}

// Symmetric difference
const symDiff = new Set(
    [...a].filter(x => !b.has(x)).concat([...b].filter(x => !a.has(x)))
);  // {1, 4}

// Subset check
const isSubset = [...a].every(x => b.has(x));

// Superset check
const isSuperset = [...b].every(x => a.has(x));
```

### Common Patterns

```typescript
// Remove duplicates from array
function deduplicate<T>(arr: T[]): T[] {
    return [...new Set(arr)];
}

// Check if array has duplicates
function hasDuplicates<T>(arr: T[]): boolean {
    return new Set(arr).size !== arr.length;
}

// Find first duplicate
function firstDuplicate(nums: number[]): number | null {
    const seen = new Set<number>();
    for (const num of nums) {
        if (seen.has(num)) {
            return num;
        }
        seen.add(num);
    }
    return null;
}

// Intersection of multiple arrays
function intersectAll<T>(...arrays: T[][]): T[] {
    if (arrays.length === 0) return [];

    const sets = arrays.map(arr => new Set(arr));
    const [first, ...rest] = sets;

    return [...first].filter(x => rest.every(set => set.has(x)));
}
```

---

## Tuples

Tuples are fixed-length arrays with typed positions.

```typescript
// Basic tuple
const point: [number, number] = [0, 0];
const named: [string, number] = ["Alice", 30];

// Destructuring
const [x, y] = point;
const [name, age] = named;

// Labeled tuples (for documentation)
type Point = [x: number, y: number];
type Range = [start: number, end: number];

// Optional elements
type Flex = [number, string?];
const flex1: Flex = [1];
const flex2: Flex = [1, "hello"];

// Rest elements
type AtLeastOne = [number, ...number[]];
const nums: AtLeastOne = [1, 2, 3, 4];

// Readonly tuples
const immutable: readonly [number, number] = [0, 0];
// immutable[0] = 1;  // Error

// Common use: returning multiple values
function minMax(nums: number[]): [number, number] {
    return [Math.min(...nums), Math.max(...nums)];
}

const [min, max] = minMax([3, 1, 4, 1, 5]);
```

---

## Objects & Records

### Object as Dictionary

```typescript
// Simple object dictionary
const ages: { [name: string]: number } = {
    alice: 30,
    bob: 25,
};

ages["charlie"] = 35;
ages["alice"];  // 30

// Using Record utility type
const ages2: Record<string, number> = {
    alice: 30,
    bob: 25,
};
```

### Object Operations

```typescript
const obj = { a: 1, b: 2, c: 3 };

// Get keys
Object.keys(obj);            // ["a", "b", "c"]

// Get values
Object.values(obj);          // [1, 2, 3]

// Get entries
Object.entries(obj);         // [["a", 1], ["b", 2], ["c", 3]]

// From entries
Object.fromEntries([["a", 1], ["b", 2]]);  // { a: 1, b: 2 }

// Check key existence
"a" in obj;                  // true
obj.hasOwnProperty("a");     // true

// Iterate
for (const key in obj) {
    console.log(key, obj[key]);
}

for (const [key, value] of Object.entries(obj)) {
    console.log(key, value);
}
```

---

## Stack Implementation

Arrays work naturally as stacks (LIFO).

```typescript
// Using array as stack
const stack: number[] = [];

// Push - O(1)
stack.push(1);
stack.push(2);
stack.push(3);

// Pop - O(1)
stack.pop();  // 3

// Peek (top element) - O(1)
stack[stack.length - 1];  // 2

// Check empty
stack.length === 0;

// Class implementation (for cleaner API)
class Stack<T> {
    private items: T[] = [];

    push(item: T): void {
        this.items.push(item);
    }

    pop(): T | undefined {
        return this.items.pop();
    }

    peek(): T | undefined {
        return this.items[this.items.length - 1];
    }

    isEmpty(): boolean {
        return this.items.length === 0;
    }

    size(): number {
        return this.items.length;
    }
}

// Example: Valid Parentheses
function isValidParentheses(s: string): boolean {
    const stack: string[] = [];
    const pairs: Record<string, string> = {
        ")": "(",
        "]": "[",
        "}": "{",
    };

    for (const char of s) {
        if (char in pairs) {
            if (stack.pop() !== pairs[char]) {
                return false;
            }
        } else {
            stack.push(char);
        }
    }

    return stack.length === 0;
}
```

---

## Queue Implementation

Arrays work as queues, but `shift()` is O(n). For performance-critical code, use a custom implementation.

```typescript
// Using array as queue (simple but slow shift)
const queue: number[] = [];

// Enqueue - O(1)
queue.push(1);
queue.push(2);
queue.push(3);

// Dequeue - O(n) due to shift
queue.shift();  // 1

// Front element
queue[0];

// Efficient queue using Map (for interviews)
class Queue<T> {
    private items = new Map<number, T>();
    private head = 0;
    private tail = 0;

    enqueue(item: T): void {
        this.items.set(this.tail, item);
        this.tail++;
    }

    dequeue(): T | undefined {
        if (this.isEmpty()) {
            return undefined;
        }
        const item = this.items.get(this.head);
        this.items.delete(this.head);
        this.head++;
        return item;
    }

    front(): T | undefined {
        return this.items.get(this.head);
    }

    isEmpty(): boolean {
        return this.head === this.tail;
    }

    size(): number {
        return this.tail - this.head;
    }
}

// Example: BFS with queue
function bfs(graph: Map<number, number[]>, start: number): number[] {
    const visited = new Set<number>();
    const result: number[] = [];
    const queue: number[] = [start];  // Simple array is fine for most interviews

    while (queue.length > 0) {
        const node = queue.shift()!;

        if (visited.has(node)) continue;
        visited.add(node);
        result.push(node);

        for (const neighbor of graph.get(node) ?? []) {
            if (!visited.has(neighbor)) {
                queue.push(neighbor);
            }
        }
    }

    return result;
}
```

---

## Priority Queue (Heap)

TypeScript doesn't have a built-in heap. Here's a minimal implementation.

```typescript
// Min Heap implementation
class MinHeap<T> {
    private heap: T[] = [];

    constructor(private compareFn: (a: T, b: T) => number = (a, b) => (a as number) - (b as number)) {}

    // Add element - O(log n)
    push(val: T): void {
        this.heap.push(val);
        this.bubbleUp(this.heap.length - 1);
    }

    // Remove and return min element - O(log n)
    pop(): T | undefined {
        if (this.heap.length === 0) return undefined;
        if (this.heap.length === 1) return this.heap.pop();

        const min = this.heap[0];
        this.heap[0] = this.heap.pop()!;
        this.bubbleDown(0);
        return min;
    }

    // View min element - O(1)
    peek(): T | undefined {
        return this.heap[0];
    }

    size(): number {
        return this.heap.length;
    }

    isEmpty(): boolean {
        return this.heap.length === 0;
    }

    private bubbleUp(index: number): void {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.compareFn(this.heap[index], this.heap[parentIndex]) >= 0) {
                break;
            }
            [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
            index = parentIndex;
        }
    }

    private bubbleDown(index: number): void {
        const length = this.heap.length;
        while (true) {
            const leftChild = 2 * index + 1;
            const rightChild = 2 * index + 2;
            let smallest = index;

            if (leftChild < length && this.compareFn(this.heap[leftChild], this.heap[smallest]) < 0) {
                smallest = leftChild;
            }
            if (rightChild < length && this.compareFn(this.heap[rightChild], this.heap[smallest]) < 0) {
                smallest = rightChild;
            }
            if (smallest === index) break;

            [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
            index = smallest;
        }
    }
}

// Usage: Find k smallest elements
function kSmallest(nums: number[], k: number): number[] {
    const heap = new MinHeap<number>();
    for (const num of nums) {
        heap.push(num);
    }

    const result: number[] = [];
    for (let i = 0; i < k && !heap.isEmpty(); i++) {
        result.push(heap.pop()!);
    }
    return result;
}

// Max Heap (using negated comparator)
const maxHeap = new MinHeap<number>((a, b) => b - a);

// Heap with custom objects
interface Task { priority: number; name: string; }
const taskHeap = new MinHeap<Task>((a, b) => a.priority - b.priority);
```

---

## Custom Data Structures

### Linked List

```typescript
class ListNode<T> {
    val: T;
    next: ListNode<T> | null = null;

    constructor(val: T) {
        this.val = val;
    }
}

class LinkedList<T> {
    head: ListNode<T> | null = null;
    tail: ListNode<T> | null = null;
    private _size = 0;

    // Add to end - O(1)
    append(val: T): void {
        const node = new ListNode(val);
        if (!this.tail) {
            this.head = this.tail = node;
        } else {
            this.tail.next = node;
            this.tail = node;
        }
        this._size++;
    }

    // Add to front - O(1)
    prepend(val: T): void {
        const node = new ListNode(val);
        node.next = this.head;
        this.head = node;
        if (!this.tail) {
            this.tail = node;
        }
        this._size++;
    }

    // Remove from front - O(1)
    removeFirst(): T | undefined {
        if (!this.head) return undefined;
        const val = this.head.val;
        this.head = this.head.next;
        if (!this.head) this.tail = null;
        this._size--;
        return val;
    }

    size(): number {
        return this._size;
    }

    *[Symbol.iterator](): Iterator<T> {
        let current = this.head;
        while (current) {
            yield current.val;
            current = current.next;
        }
    }
}
```

### Tree Node

```typescript
class TreeNode<T> {
    val: T;
    left: TreeNode<T> | null = null;
    right: TreeNode<T> | null = null;

    constructor(val: T) {
        this.val = val;
    }
}

// Tree traversals
function inorder<T>(root: TreeNode<T> | null, result: T[] = []): T[] {
    if (!root) return result;
    inorder(root.left, result);
    result.push(root.val);
    inorder(root.right, result);
    return result;
}

function preorder<T>(root: TreeNode<T> | null, result: T[] = []): T[] {
    if (!root) return result;
    result.push(root.val);
    preorder(root.left, result);
    preorder(root.right, result);
    return result;
}

function postorder<T>(root: TreeNode<T> | null, result: T[] = []): T[] {
    if (!root) return result;
    postorder(root.left, result);
    postorder(root.right, result);
    result.push(root.val);
    return result;
}

function levelOrder<T>(root: TreeNode<T> | null): T[][] {
    if (!root) return [];

    const result: T[][] = [];
    const queue: TreeNode<T>[] = [root];

    while (queue.length > 0) {
        const level: T[] = [];
        const size = queue.length;

        for (let i = 0; i < size; i++) {
            const node = queue.shift()!;
            level.push(node.val);
            if (node.left) queue.push(node.left);
            if (node.right) queue.push(node.right);
        }

        result.push(level);
    }

    return result;
}
```

### Graph Representations

```typescript
// Adjacency List (most common)
type Graph = Map<number, number[]>;

function createGraph(): Graph {
    return new Map();
}

function addEdge(graph: Graph, from: number, to: number, directed = false): void {
    if (!graph.has(from)) graph.set(from, []);
    graph.get(from)!.push(to);

    if (!directed) {
        if (!graph.has(to)) graph.set(to, []);
        graph.get(to)!.push(from);
    }
}

// Weighted Graph
type WeightedGraph = Map<number, [number, number][]>;  // Map<node, [neighbor, weight][]>

// Adjacency Matrix
function createMatrix(n: number): number[][] {
    return Array.from({ length: n }, () => new Array(n).fill(0));
}
```

---

## Complexity Cheat Sheet

### Array

| Operation | Time | Notes |
|-----------|------|-------|
| `arr[i]` | O(1) | Access by index |
| `push()` | O(1)* | Amortized |
| `pop()` | O(1) | |
| `unshift()` | O(n) | Shifts all elements |
| `shift()` | O(n) | Shifts all elements |
| `splice(i, 1)` | O(n) | Shifts elements after i |
| `includes()` | O(n) | Linear search |
| `indexOf()` | O(n) | Linear search |
| `slice()` | O(n) | Copies elements |
| `sort()` | O(n log n) | |
| `map/filter/reduce` | O(n) | |

### Map

| Operation | Time |
|-----------|------|
| `get()` | O(1) |
| `set()` | O(1) |
| `has()` | O(1) |
| `delete()` | O(1) |
| Iteration | O(n) |

### Set

| Operation | Time |
|-----------|------|
| `add()` | O(1) |
| `has()` | O(1) |
| `delete()` | O(1) |
| Iteration | O(n) |

### Heap (Priority Queue)

| Operation | Time |
|-----------|------|
| `push()` | O(log n) |
| `pop()` | O(log n) |
| `peek()` | O(1) |
| Build heap | O(n) |

### Summary Table

| Structure | Access | Search | Insert | Delete |
|-----------|--------|--------|--------|--------|
| Array | O(1) | O(n) | O(n)* | O(n) |
| Map | O(1) | O(1) | O(1) | O(1) |
| Set | - | O(1) | O(1) | O(1) |
| Stack | O(1)† | O(n) | O(1) | O(1) |
| Queue | O(1)† | O(n) | O(1) | O(n)‡ |
| Heap | O(1)† | O(n) | O(log n) | O(log n) |

*Array insert at end is O(1) amortized; at arbitrary position is O(n)
†Access to top/front only
‡Using array; O(1) with proper queue implementation
