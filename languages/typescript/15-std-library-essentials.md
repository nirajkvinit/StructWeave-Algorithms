# TypeScript Standard Library Essentials

> Master the built-in APIs that power production TypeScript applications — from collections to async primitives

JavaScript and TypeScript have evolved from a limited standard library to a rich set of built-in APIs. Unlike languages with minimal standard libraries, modern JavaScript provides powerful collections, async primitives, and utilities that cover most common use cases. This guide covers the APIs you'll use most frequently in production code and interviews.

**Reading time**: 90-120 minutes

---

## Table of Contents

- [TypeScript Standard Library Essentials](#typescript-standard-library-essentials)
  - [Table of Contents](#table-of-contents)
  - [Philosophy: The JavaScript Runtime](#philosophy-the-javascript-runtime)
    - [When to Use Built-ins vs External Libraries](#when-to-use-built-ins-vs-external-libraries)
  - [Collections \& Data Structures](#collections--data-structures)
    - [Array\<T\> — The Foundation](#arrayt--the-foundation)
      - [Creation Patterns](#creation-patterns)
      - [Essential Methods](#essential-methods)
      - [ES2023 Immutable Methods](#es2023-immutable-methods)
      - [Searching Methods](#searching-methods)
      - [Iteration Patterns](#iteration-patterns)
      - [Performance Considerations](#performance-considerations)
    - [Map\<K, V\> — O(1) Key-Value Store](#mapk-v--o1-key-value-store)
      - [Creation and Basic Operations](#creation-and-basic-operations)
      - [Entry Patterns — Your Secret Weapon](#entry-patterns--your-secret-weapon)
      - [Iteration](#iteration)
      - [When to Use Map vs Object](#when-to-use-map-vs-object)
    - [Set\<T\> — Unique Collections](#sett--unique-collections)
      - [Basic Operations](#basic-operations)
      - [Set Operations](#set-operations)
    - [WeakMap \& WeakSet — Memory-Efficient References](#weakmap--weakset--memory-efficient-references)
      - [WeakMap Use Cases](#weakmap-use-cases)
      - [WeakSet Use Cases](#weakset-use-cases)
      - [Limitations](#limitations)
    - [Object.groupBy \& Map.groupBy (ES2024)](#objectgroupby--mapgroupby-es2024)
    - [Collections Decision Tree](#collections-decision-tree)
  - [Iterators \& Generators](#iterators--generators)
    - [The Iterator Protocol](#the-iterator-protocol)
    - [Generator Functions](#generator-functions)
    - [ES2025 Iterator Helpers](#es2025-iterator-helpers)
    - [Practical Patterns](#practical-patterns)
  - [Strings \& Text Processing](#strings--text-processing)
    - [String Methods](#string-methods)
    - [Template Literals](#template-literals)
    - [ES2024 Well-Formed Unicode](#es2024-well-formed-unicode)
    - [Regular Expressions](#regular-expressions)
    - [Intl APIs](#intl-apis)
  - [Async Primitives](#async-primitives)
    - [Promise Combinators](#promise-combinators)
    - [Promise.withResolvers (ES2024)](#promisewithresolvers-es2024)
    - [Async Iteration](#async-iteration)
    - [Error Handling Patterns](#error-handling-patterns)
  - [Typed Arrays \& Binary Data](#typed-arrays--binary-data)
    - [ArrayBuffer and Views](#arraybuffer-and-views)
    - [Common Use Cases](#common-use-cases)
  - [Date \& Time](#date--time)
    - [Date Object Essentials](#date-object-essentials)
    - [Modern Date Handling Patterns](#modern-date-handling-patterns)
  - [Error Handling](#error-handling)
    - [Built-in Error Types](#built-in-error-types)
    - [Custom Error Classes](#custom-error-classes)
    - [Error.cause (ES2022)](#errorcause-es2022)
  - [Object \& Reflection](#object--reflection)
    - [Object Methods](#object-methods)
    - [Structured Clone](#structured-clone)
    - [Proxy \& Reflect](#proxy--reflect)
  - [Math \& Numbers](#math--numbers)
    - [Essential Math Methods](#essential-math-methods)
    - [Number Utilities](#number-utilities)
    - [BigInt for Large Integers](#bigint-for-large-integers)
  - [WeakRef \& FinalizationRegistry](#weakref--finalizationregistry)
    - [When to Use (Rarely!)](#when-to-use-rarely)
    - [Caching Pattern](#caching-pattern)
  - [JSON](#json)
    - [Serialization and Parsing](#serialization-and-parsing)
    - [Custom Serialization](#custom-serialization)
  - [Quick Reference Cards](#quick-reference-cards)
    - [Collections Methods Summary](#collections-methods-summary)
    - [Array Methods Cheat Sheet](#array-methods-cheat-sheet)
    - [Promise Combinators Reference](#promise-combinators-reference)
  - [Interview Questions](#interview-questions)
  - [Resources](#resources)

---

## Philosophy: The JavaScript Runtime

JavaScript's standard library has grown significantly through ECMAScript updates. TypeScript adds type safety on top, but the runtime APIs are the same.

```typescript
// No imports needed — these are globally available
const nums: number[] = [1, 2, 3];
const map = new Map<string, number>();
const set = new Set<number>();
const promise = Promise.resolve(42);
```

### When to Use Built-ins vs External Libraries

| Category | Built-in | External Library | When to Switch |
|----------|----------|------------------|----------------|
| **Collections** | `Array`, `Map`, `Set` | `immutable.js`, `immer` | Need persistent data structures |
| **Dates** | `Date` | `date-fns`, `luxon` | Complex date math, time zones |
| **Validation** | Type guards | `zod`, `yup` | Runtime schema validation |
| **HTTP** | `fetch` | `ky`, `axios` | Interceptors, retries, cancellation |
| **Async** | `Promise` | `rxjs` | Complex event streams |
| **Random** | `Math.random()` | `crypto.getRandomValues` | Cryptographic randomness |
| **Deep Clone** | `structuredClone` | `lodash.cloneDeep` | Rarely needed now |
| **UUID** | `crypto.randomUUID()` | — | Built-in is sufficient |

**Rule of thumb**: Start with built-ins, add libraries when you hit limitations.

---

## Collections & Data Structures

> "Map and Set are your best friends for O(1) operations."
> — Every algorithm interview

### Array\<T\> — The Foundation

`Array<T>` is JavaScript's dynamic array. It's your go-to for sequential data, stacks, and building results.

#### Creation Patterns

```typescript
// Empty array with type annotation
const v: number[] = [];

// Using array literal (most common)
const nums = [1, 2, 3];

// Using Array constructor
const zeros = new Array<number>(5).fill(0);  // [0, 0, 0, 0, 0]

// From an iterable
const fromSet = Array.from(new Set([1, 2, 3]));

// From array-like object with mapping
const squares = Array.from({ length: 5 }, (_, i) => i * i);  // [0, 1, 4, 9, 16]

// Spread to copy
const copy = [...nums];

// Range pattern (no built-in range!)
const range = Array.from({ length: 10 }, (_, i) => i);  // [0, 1, 2, ..., 9]
```

#### Essential Methods

```typescript
const nums = [1, 2, 3, 4, 5];

// Adding elements (mutating)
nums.push(6);                      // Add to end: [1, 2, 3, 4, 5, 6], returns new length
nums.unshift(0);                   // Add to front: [0, 1, 2, 3, 4, 5, 6], O(n)!

// Removing elements (mutating)
const last = nums.pop();           // Remove from end: 6, array is now shorter
const first = nums.shift();        // Remove from front: 0, O(n)!
nums.splice(2, 1);                 // Remove at index 2: removes 1 element

// Transformations (non-mutating, return new array)
const doubled = nums.map(x => x * 2);           // [2, 4, 6, 8, 10]
const evens = nums.filter(x => x % 2 === 0);    // [2, 4]
const sum = nums.reduce((acc, x) => acc + x, 0); // 15

// Combining
const flat = [[1, 2], [3, 4]].flat();           // [1, 2, 3, 4]
const flatMapped = nums.flatMap(x => [x, x]);   // [1, 1, 2, 2, 3, 3, 4, 4, 5, 5]

// Slicing (non-mutating)
const slice = nums.slice(1, 3);    // [2, 3] — start inclusive, end exclusive
const tail = nums.slice(1);        // [2, 3, 4, 5] — from index 1 to end
const last3 = nums.slice(-3);      // [3, 4, 5] — last 3 elements

// Access
const firstEl = nums[0];           // 1
const lastEl = nums[nums.length - 1];  // 5
const atIndex = nums.at(-1);       // 5 — negative indexing with .at()
const safe = nums.at(100);         // undefined — no error
```

#### ES2023 Immutable Methods

These methods return new arrays without modifying the original — essential for functional programming and React state:

```typescript
const nums = [3, 1, 4, 1, 5];

// toSorted() — non-mutating sort
const sorted = nums.toSorted((a, b) => a - b);  // [1, 1, 3, 4, 5]
console.log(nums);  // [3, 1, 4, 1, 5] — original unchanged!

// toReversed() — non-mutating reverse
const reversed = nums.toReversed();  // [5, 1, 4, 1, 3]
console.log(nums);  // [3, 1, 4, 1, 5] — original unchanged!

// toSpliced() — non-mutating splice
const spliced = nums.toSpliced(2, 1, 99);  // [3, 1, 99, 1, 5]
console.log(nums);  // [3, 1, 4, 1, 5] — original unchanged!

// with() — non-mutating index assignment
const withReplaced = nums.with(0, 100);  // [100, 1, 4, 1, 5]
console.log(nums);  // [3, 1, 4, 1, 5] — original unchanged!
```

**Comparison: Mutating vs Non-Mutating**

| Operation | Mutating | Non-Mutating (ES2023) |
|-----------|----------|----------------------|
| Sort | `arr.sort()` | `arr.toSorted()` |
| Reverse | `arr.reverse()` | `arr.toReversed()` |
| Splice | `arr.splice()` | `arr.toSpliced()` |
| Index assign | `arr[i] = x` | `arr.with(i, x)` |

#### Searching Methods

```typescript
const nums = [1, 2, 3, 4, 5, 3];

// Finding elements
const found = nums.find(x => x > 3);           // 4 — first match
const foundIndex = nums.findIndex(x => x > 3); // 3 — index of first match

// ES2023: Search from the end
const foundLast = nums.findLast(x => x === 3);      // 3 — last match
const foundLastIndex = nums.findLastIndex(x => x === 3);  // 5 — index of last match

// Existence checks
const hasThree = nums.includes(3);             // true — O(n)
const indexOf = nums.indexOf(3);               // 2 — first index, or -1
const lastIndexOf = nums.lastIndexOf(3);       // 5 — last index, or -1

// Predicate checks
const hasEven = nums.some(x => x % 2 === 0);   // true — any match?
const allPositive = nums.every(x => x > 0);    // true — all match?
```

#### Iteration Patterns

```typescript
const nums = [10, 20, 30];

// For-of (preferred for simple iteration)
for (const num of nums) {
    console.log(num);  // 10, 20, 30
}

// For-of with index
for (const [index, num] of nums.entries()) {
    console.log(`${index}: ${num}`);  // "0: 10", "1: 20", "2: 30"
}

// forEach (when you need side effects)
nums.forEach((num, index) => {
    console.log(`${index}: ${num}`);
});

// Classic for loop (when you need index control)
for (let i = 0; i < nums.length; i++) {
    console.log(nums[i]);
}

// Reverse iteration
for (let i = nums.length - 1; i >= 0; i--) {
    console.log(nums[i]);  // 30, 20, 10
}

// Keys only
for (const index of nums.keys()) {
    console.log(index);  // 0, 1, 2
}
```

#### Performance Considerations

```typescript
// O(1) operations
arr.push(x);           // Add to end
arr.pop();             // Remove from end
arr[i];                // Index access
arr.length;            // Length

// O(n) operations — use sparingly!
arr.unshift(x);        // Add to front — shifts all elements
arr.shift();           // Remove from front — shifts all elements
arr.includes(x);       // Linear search — use Set for O(1)
arr.indexOf(x);        // Linear search
arr.splice(i, 1);      // Remove at index — shifts elements

// O(n log n)
arr.sort();            // MUST provide comparator for numbers!
arr.toSorted();

// IMPORTANT: Default sort is lexicographic!
[10, 2, 1].sort();              // [1, 10, 2] — WRONG!
[10, 2, 1].sort((a, b) => a - b); // [1, 2, 10] — Correct
```

---

### Map\<K, V\> — O(1) Key-Value Store

`Map` provides O(1) average-case lookup, insertion, and removal with any key type.

#### Creation and Basic Operations

```typescript
// Creation
const scores = new Map<string, number>();
const fromEntries = new Map([["Alice", 100], ["Bob", 85]]);

// Basic operations
scores.set("Charlie", 92);
const aliceScore = scores.get("Alice");           // number | undefined
const exists = scores.has("Alice");               // boolean
scores.delete("Bob");
scores.clear();                                   // Remove all entries

// Size
console.log(scores.size);                         // Number of entries
```

#### Entry Patterns — Your Secret Weapon

```typescript
// Pattern 1: Counting (most common in interviews)
const wordCounts = new Map<string, number>();
const text = "hello world hello typescript world world";

for (const word of text.split(" ")) {
    wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
}
// Map { "hello" => 2, "world" => 3, "typescript" => 1 }

// Pattern 2: Get with default
function getOrDefault<K, V>(map: Map<K, V>, key: K, defaultValue: V): V {
    return map.has(key) ? map.get(key)! : defaultValue;
}

// Pattern 3: Grouping
const people = [
    { name: "Alice", department: "Engineering" },
    { name: "Bob", department: "Engineering" },
    { name: "Charlie", department: "Marketing" }
];

const byDepartment = new Map<string, typeof people>();
for (const person of people) {
    const group = byDepartment.get(person.department) ?? [];
    group.push(person);
    byDepartment.set(person.department, group);
}

// Pattern 4: Caching/Memoization
const cache = new Map<number, number>();

function fibonacci(n: number): number {
    if (n <= 1) return n;
    if (cache.has(n)) return cache.get(n)!;

    const result = fibonacci(n - 1) + fibonacci(n - 2);
    cache.set(n, result);
    return result;
}
```

#### Iteration

```typescript
const map = new Map([
    ["a", 1],
    ["b", 2],
    ["c", 3]
]);

// Keys
for (const key of map.keys()) {
    console.log(key);  // "a", "b", "c"
}

// Values
for (const value of map.values()) {
    console.log(value);  // 1, 2, 3
}

// Entries (key-value pairs)
for (const [key, value] of map.entries()) {
    console.log(`${key}: ${value}`);
}

// Or simply (Map is iterable over entries)
for (const [key, value] of map) {
    console.log(`${key}: ${value}`);
}

// Convert to arrays
const keys = [...map.keys()];      // ["a", "b", "c"]
const values = [...map.values()];  // [1, 2, 3]
const entries = [...map.entries()]; // [["a", 1], ["b", 2], ["c", 3]]
```

#### When to Use Map vs Object

| Feature | Map | Object |
|---------|-----|--------|
| **Key types** | Any type (objects, functions, primitives) | Strings and Symbols only |
| **Key order** | Insertion order preserved | Not guaranteed for integer keys |
| **Size** | `map.size` | `Object.keys(obj).length` |
| **Iteration** | Directly iterable | Need `Object.keys/values/entries` |
| **Performance** | Optimized for frequent additions/removals | Better for static structures |
| **Prototype** | No inherited keys | Has prototype chain |
| **JSON** | Not directly serializable | Directly serializable |

**Use Map when:**
- Keys aren't strings
- You need to preserve insertion order
- You're doing frequent additions/deletions
- You need to know the size quickly

**Use Object when:**
- You need JSON serialization
- You're defining a static structure
- Keys are known at compile time

---

### Set\<T\> — Unique Collections

`Set` provides O(1) membership testing and automatic deduplication.

#### Basic Operations

```typescript
// Creation
const set = new Set<number>();
const fromArray = new Set([1, 2, 2, 3, 3, 3]);  // Set { 1, 2, 3 }

// Operations
set.add(1);                // Add element
set.add(1);                // No effect — already present
const has = set.has(1);    // true — O(1)!
set.delete(1);             // Remove element
set.clear();               // Remove all

// Size
console.log(set.size);

// Convert to array (deduplication pattern)
const unique = [...new Set([1, 2, 2, 3, 3, 3])];  // [1, 2, 3]
```

#### Set Operations

```typescript
const a = new Set([1, 2, 3, 4]);
const b = new Set([3, 4, 5, 6]);

// Union — elements in either set
const union = new Set([...a, ...b]);  // Set { 1, 2, 3, 4, 5, 6 }

// Intersection — elements in both sets
const intersection = new Set([...a].filter(x => b.has(x)));  // Set { 3, 4 }

// Difference — elements in a but not in b
const difference = new Set([...a].filter(x => !b.has(x)));  // Set { 1, 2 }

// Symmetric difference — elements in either but not both
const symmetricDiff = new Set(
    [...a].filter(x => !b.has(x)).concat([...b].filter(x => !a.has(x)))
);  // Set { 1, 2, 5, 6 }

// Subset check
const isSubset = [...a].every(x => b.has(x));  // false

// Disjoint check (no common elements)
const isDisjoint = [...a].every(x => !b.has(x));  // false
```

---

### WeakMap & WeakSet — Memory-Efficient References

`WeakMap` and `WeakSet` hold weak references to objects, allowing garbage collection when no other references exist. Keys must be objects (not primitives).

#### WeakMap Use Cases

```typescript
// Use case 1: Private data for objects
const privateData = new WeakMap<object, { secret: string }>();

class User {
    constructor(name: string, secret: string) {
        privateData.set(this, { secret });
    }

    getSecret(): string {
        return privateData.get(this)!.secret;
    }
}

// Use case 2: Caching computed values
const cache = new WeakMap<object, number>();

function expensiveComputation(obj: object): number {
    if (cache.has(obj)) {
        return cache.get(obj)!;
    }
    const result = /* expensive computation */ 42;
    cache.set(obj, result);
    return result;
}

// When obj is garbage collected, cache entry is automatically removed

// Use case 3: DOM node metadata
const nodeData = new WeakMap<HTMLElement, { clicks: number }>();

function trackClicks(element: HTMLElement) {
    const data = nodeData.get(element) ?? { clicks: 0 };
    data.clicks++;
    nodeData.set(element, data);
}
```

#### WeakSet Use Cases

```typescript
// Use case: Tracking visited objects (cycle detection)
const visited = new WeakSet<object>();

function detectCycle(obj: object): boolean {
    if (visited.has(obj)) {
        return true;  // Cycle detected!
    }
    visited.add(obj);
    // ... traverse object
    return false;
}

// Use case: Marking objects without modifying them
const processed = new WeakSet<object>();

function processOnce(item: object) {
    if (processed.has(item)) {
        return;  // Already processed
    }
    processed.add(item);
    // ... process item
}
```

#### Limitations

```typescript
// WeakMap and WeakSet do NOT support:
// - Iteration (no keys(), values(), entries(), forEach)
// - Size property
// - Primitive keys

// This won't work:
// const weak = new WeakMap<string, number>();  // Error: string is not object

// This is fine:
const weak = new WeakMap<{ id: string }, number>();
```

---

### Object.groupBy & Map.groupBy (ES2024)

Modern grouping without manual loops:

```typescript
const inventory = [
    { name: "asparagus", type: "vegetables", quantity: 5 },
    { name: "bananas", type: "fruit", quantity: 0 },
    { name: "goat", type: "meat", quantity: 23 },
    { name: "cherries", type: "fruit", quantity: 5 },
    { name: "fish", type: "meat", quantity: 22 }
];

// Object.groupBy — returns plain object
const byType = Object.groupBy(inventory, item => item.type);
// {
//   vegetables: [{ name: "asparagus", ... }],
//   fruit: [{ name: "bananas", ... }, { name: "cherries", ... }],
//   meat: [{ name: "goat", ... }, { name: "fish", ... }]
// }

// Map.groupBy — returns Map (useful for non-string keys)
const byQuantity = Map.groupBy(inventory, item =>
    item.quantity > 5 ? "enough" : "restock"
);
// Map { "restock" => [...], "enough" => [...] }

// Grouping with computed keys
const byFirstLetter = Object.groupBy(inventory, item => item.name[0]);
```

---

### Collections Decision Tree

```
Need a sequence?
├── Yes → Need unique values?
│         ├── Yes → Set<T>
│         └── No → Array<T> (default choice)
└── No → Need key-value pairs?
          ├── Yes → Keys are strings and structure is static?
          │         ├── Yes → Plain object
          │         └── No → Map<K, V>
          └── No → Need to track objects without preventing GC?
                    ├── Yes → WeakSet<T> or WeakMap<K, V>
                    └── No → Set<T>
```

---

## Iterators & Generators

### The Iterator Protocol

Any object with a `[Symbol.iterator]` method that returns an iterator is iterable.

```typescript
// Built-in iterables
const arr = [1, 2, 3];
const set = new Set([1, 2, 3]);
const map = new Map([["a", 1], ["b", 2]]);
const str = "hello";

// All work with for-of
for (const x of arr) { }
for (const x of set) { }
for (const [k, v] of map) { }
for (const char of str) { }

// Manual iteration
const iterator = arr[Symbol.iterator]();
console.log(iterator.next());  // { value: 1, done: false }
console.log(iterator.next());  // { value: 2, done: false }
console.log(iterator.next());  // { value: 3, done: false }
console.log(iterator.next());  // { value: undefined, done: true }
```

### Generator Functions

Generators create iterators with `function*` syntax:

```typescript
// Basic generator
function* range(start: number, end: number): Generator<number> {
    for (let i = start; i < end; i++) {
        yield i;
    }
}

for (const n of range(0, 5)) {
    console.log(n);  // 0, 1, 2, 3, 4
}

// Infinite generator
function* infiniteCounter(): Generator<number> {
    let i = 0;
    while (true) {
        yield i++;
    }
}

// Fibonacci generator
function* fibonacci(): Generator<number> {
    let [a, b] = [0, 1];
    while (true) {
        yield a;
        [a, b] = [b, a + b];
    }
}

// Take first n from infinite generator
function take<T>(n: number, iterable: Iterable<T>): T[] {
    const result: T[] = [];
    for (const item of iterable) {
        if (result.length >= n) break;
        result.push(item);
    }
    return result;
}

const first10Fib = take(10, fibonacci());  // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
```

### ES2025 Iterator Helpers

Coming in ES2025, iterator methods that work lazily:

```typescript
// These methods will be available on iterators directly:
// (Currently available with polyfills or Iterator.from())

function* naturals() {
    let n = 1;
    while (true) yield n++;
}

// When ES2025 is available:
// const evens = naturals().filter(n => n % 2 === 0).take(5).toArray();
// [2, 4, 6, 8, 10]

// Until then, use arrays or custom implementations
const evensNow = [...take(10, naturals())].filter(n => n % 2 === 0).slice(0, 5);
```

### Practical Patterns

```typescript
// Chunking an array
function* chunks<T>(arr: T[], size: number): Generator<T[]> {
    for (let i = 0; i < arr.length; i += size) {
        yield arr.slice(i, i + size);
    }
}

for (const chunk of chunks([1, 2, 3, 4, 5], 2)) {
    console.log(chunk);  // [1, 2], [3, 4], [5]
}

// Windowing
function* windows<T>(arr: T[], size: number): Generator<T[]> {
    for (let i = 0; i <= arr.length - size; i++) {
        yield arr.slice(i, i + size);
    }
}

for (const window of windows([1, 2, 3, 4, 5], 3)) {
    console.log(window);  // [1, 2, 3], [2, 3, 4], [3, 4, 5]
}

// Zipping multiple iterables
function* zip<T>(...iterables: Iterable<T>[]): Generator<T[]> {
    const iterators = iterables.map(it => it[Symbol.iterator]());
    while (true) {
        const results = iterators.map(it => it.next());
        if (results.some(r => r.done)) return;
        yield results.map(r => r.value);
    }
}

for (const [a, b] of zip([1, 2, 3], ["a", "b", "c"])) {
    console.log(a, b);  // 1 "a", 2 "b", 3 "c"
}
```

---

## Strings & Text Processing

### String Methods

```typescript
const str = "Hello, World!";

// Length and access
str.length;                        // 13
str[0];                           // "H"
str.at(-1);                       // "!" — negative indexing

// Searching
str.indexOf("o");                  // 4 — first occurrence
str.lastIndexOf("o");             // 8 — last occurrence
str.includes("World");            // true
str.startsWith("Hello");          // true
str.endsWith("!");                // true

// Extraction
str.slice(0, 5);                  // "Hello" — start to end (exclusive)
str.slice(-6);                    // "World!" — from end
str.substring(0, 5);              // "Hello"

// Transformation
str.toLowerCase();                // "hello, world!"
str.toUpperCase();                // "HELLO, WORLD!"
str.replace("World", "TypeScript"); // "Hello, TypeScript!"
str.replaceAll("l", "L");         // "HeLLo, WorLd!"

// Whitespace
"  hello  ".trim();               // "hello"
"  hello  ".trimStart();          // "hello  "
"  hello  ".trimEnd();            // "  hello"

// Splitting and joining
str.split(", ");                  // ["Hello", "World!"]
["Hello", "World"].join(", ");    // "Hello, World"

// Padding
"5".padStart(3, "0");             // "005"
"5".padEnd(3, "0");               // "500"

// Repeating
"ab".repeat(3);                   // "ababab"
```

### Template Literals

```typescript
const name = "Alice";
const age = 30;

// Basic interpolation
const greeting = `Hello, ${name}!`;

// Expressions
const info = `${name} will be ${age + 10} in 10 years`;

// Multi-line
const html = `
  <div>
    <h1>${name}</h1>
    <p>Age: ${age}</p>
  </div>
`;

// Tagged templates
function highlight(strings: TemplateStringsArray, ...values: unknown[]) {
    return strings.reduce((result, str, i) =>
        result + str + (values[i] !== undefined ? `**${values[i]}**` : ""),
        ""
    );
}

const emphasized = highlight`Hello ${name}, you are ${age} years old`;
// "Hello **Alice**, you are **30** years old"
```

### ES2024 Well-Formed Unicode

```typescript
// Check if string is well-formed Unicode
const good = "Hello";
const bad = "\uD800";  // Lone surrogate

good.isWellFormed();  // true
bad.isWellFormed();   // false

// Convert to well-formed
bad.toWellFormed();   // "\uFFFD" — replacement character
```

### Regular Expressions

```typescript
// Basic patterns
const emailPattern = /^[\w.-]+@[\w.-]+\.\w+$/;
emailPattern.test("user@example.com");  // true

// Flags
const caseInsensitive = /hello/i;
const global = /o/g;
const multiLine = /^start/m;

// Common methods
const text = "The quick brown fox";

// test — returns boolean
/quick/.test(text);  // true

// match — returns matches
text.match(/o/g);  // ["o", "o"]

// matchAll — returns iterator of all matches with groups
const matches = [...text.matchAll(/(\w+)/g)];

// replace with capture groups
"hello world".replace(/(\w+) (\w+)/, "$2 $1");  // "world hello"

// Named capture groups (ES2018)
const datePattern = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/;
const match = "2024-03-15".match(datePattern);
match?.groups?.year;   // "2024"
match?.groups?.month;  // "03"
match?.groups?.day;    // "15"

// Lookbehind and lookahead
const price = /(?<=\$)\d+/;        // Lookbehind: match digits after $
"$100".match(price);               // ["100"]

const notBefore = /\d+(?!%)/;      // Negative lookahead: digits not followed by %
```

### Intl APIs

```typescript
// Number formatting
const num = 1234567.89;

new Intl.NumberFormat("en-US").format(num);           // "1,234,567.89"
new Intl.NumberFormat("de-DE").format(num);           // "1.234.567,89"
new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
}).format(num);  // "$1,234,567.89"

// Date formatting
const date = new Date();

new Intl.DateTimeFormat("en-US").format(date);        // "3/15/2024"
new Intl.DateTimeFormat("en-GB").format(date);        // "15/03/2024"
new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
}).format(date);  // "Friday, March 15, 2024"

// Relative time
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
rtf.format(-1, "day");    // "yesterday"
rtf.format(2, "week");    // "in 2 weeks"

// List formatting
const list = ["Alice", "Bob", "Charlie"];
new Intl.ListFormat("en").format(list);               // "Alice, Bob, and Charlie"
new Intl.ListFormat("en", { type: "disjunction" }).format(list);  // "Alice, Bob, or Charlie"

// Plural rules
const pr = new Intl.PluralRules("en");
pr.select(0);  // "other"
pr.select(1);  // "one"
pr.select(2);  // "other"
```

---

## Async Primitives

### Promise Combinators

```typescript
const fetchUser = (id: number) => Promise.resolve({ id, name: `User ${id}` });
const fetchPosts = (userId: number) => Promise.resolve([{ userId, title: "Post" }]);

// Promise.all — wait for all, fail fast
const [user, posts] = await Promise.all([
    fetchUser(1),
    fetchPosts(1)
]);
// If any promise rejects, the whole thing rejects

// Promise.allSettled — wait for all, get all results
const results = await Promise.allSettled([
    fetchUser(1),
    Promise.reject("error"),
    fetchUser(3)
]);
// [
//   { status: "fulfilled", value: { id: 1, name: "User 1" } },
//   { status: "rejected", reason: "error" },
//   { status: "fulfilled", value: { id: 3, name: "User 3" } }
// ]

// Promise.race — first to settle wins
const fastest = await Promise.race([
    fetch("https://server1.com/data"),
    fetch("https://server2.com/data")
]);

// Promise.any — first to fulfill wins (ignores rejections)
const firstSuccess = await Promise.any([
    fetch("https://server1.com/data"),  // might fail
    fetch("https://server2.com/data"),  // might fail
    fetch("https://server3.com/data")   // might succeed
]);
// Only rejects if ALL promises reject (AggregateError)
```

**Combinator Summary:**

| Combinator | Fulfills when | Rejects when |
|------------|---------------|--------------|
| `Promise.all` | All fulfill | Any rejects |
| `Promise.allSettled` | All settle | Never (always fulfills) |
| `Promise.race` | First settles | First rejects |
| `Promise.any` | First fulfills | All reject |

### Promise.withResolvers (ES2024)

Create a promise with external resolve/reject control:

```typescript
// Before ES2024
let resolve: (value: string) => void;
let reject: (reason: unknown) => void;
const promise = new Promise<string>((res, rej) => {
    resolve = res;
    reject = rej;
});

// ES2024 — cleaner!
const { promise, resolve, reject } = Promise.withResolvers<string>();

// Use case: Deferred execution
function createDeferred<T>() {
    return Promise.withResolvers<T>();
}

const deferred = createDeferred<number>();
// ... later
deferred.resolve(42);
// ... elsewhere
const value = await deferred.promise;  // 42
```

### Async Iteration

```typescript
// Async generators
async function* fetchPages(url: string): AsyncGenerator<Page> {
    let page = 1;
    while (true) {
        const response = await fetch(`${url}?page=${page}`);
        const data = await response.json();
        if (data.items.length === 0) return;
        yield data;
        page++;
    }
}

// Consume with for-await-of
for await (const page of fetchPages("https://api.example.com/items")) {
    console.log(page.items);
}

// Async iteration over ReadableStream
async function* readStream(stream: ReadableStream<Uint8Array>) {
    const reader = stream.getReader();
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) return;
            yield value;
        }
    } finally {
        reader.releaseLock();
    }
}
```

### Error Handling Patterns

```typescript
// Pattern 1: Try-catch with async/await
async function fetchData(url: string) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Fetch failed:", error);
        throw error;  // Re-throw or handle
    }
}

// Pattern 2: Result type (Go-style)
type Result<T, E = Error> =
    | { ok: true; value: T }
    | { ok: false; error: E };

async function safeFetch<T>(url: string): Promise<Result<T>> {
    try {
        const response = await fetch(url);
        const data = await response.json();
        return { ok: true, value: data };
    } catch (error) {
        return { ok: false, error: error as Error };
    }
}

const result = await safeFetch<User>("https://api.example.com/user");
if (result.ok) {
    console.log(result.value);
} else {
    console.error(result.error);
}

// Pattern 3: Promise wrapper
function wrapPromise<T>(promise: Promise<T>): Promise<[T, null] | [null, Error]> {
    return promise
        .then(data => [data, null] as [T, null])
        .catch(error => [null, error] as [null, Error]);
}

const [data, error] = await wrapPromise(fetch(url).then(r => r.json()));
if (error) {
    console.error(error);
}
```

---

## Typed Arrays & Binary Data

### ArrayBuffer and Views

```typescript
// Create a buffer (raw bytes)
const buffer = new ArrayBuffer(16);  // 16 bytes

// View as different types
const int32View = new Int32Array(buffer);    // 4 x 32-bit integers
const uint8View = new Uint8Array(buffer);    // 16 x 8-bit unsigned integers
const float64View = new Float64Array(buffer); // 2 x 64-bit floats

// Write data
int32View[0] = 42;

// DataView for mixed types
const dataView = new DataView(buffer);
dataView.setInt32(0, 42, true);  // little-endian
dataView.setFloat64(4, 3.14, true);

// Read back
const intValue = dataView.getInt32(0, true);
const floatValue = dataView.getFloat64(4, true);
```

### Common Use Cases

```typescript
// Converting string to bytes
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const bytes = encoder.encode("Hello, World!");  // Uint8Array
const text = decoder.decode(bytes);              // "Hello, World!"

// Working with binary file data
async function readBinaryFile(file: File): Promise<Uint8Array> {
    const buffer = await file.arrayBuffer();
    return new Uint8Array(buffer);
}

// Base64 encoding/decoding
function toBase64(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes));
}

function fromBase64(base64: string): Uint8Array {
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}
```

---

## Date & Time

### Date Object Essentials

```typescript
// Creation
const now = new Date();
const specific = new Date(2024, 2, 15);  // March 15, 2024 (month is 0-indexed!)
const fromString = new Date("2024-03-15T10:30:00Z");
const fromTimestamp = new Date(1710498600000);

// Getting components
now.getFullYear();     // 2024
now.getMonth();        // 0-11 (0 = January)
now.getDate();         // 1-31
now.getDay();          // 0-6 (0 = Sunday)
now.getHours();        // 0-23
now.getMinutes();      // 0-59
now.getSeconds();      // 0-59
now.getMilliseconds(); // 0-999
now.getTime();         // Unix timestamp in milliseconds

// UTC variants
now.getUTCFullYear();
now.getUTCMonth();
// ... etc

// Setting components
now.setFullYear(2025);
now.setMonth(5);       // June
now.setDate(20);

// Timestamps
Date.now();            // Current timestamp in ms
Date.parse("2024-03-15");  // Parse to timestamp
```

### Modern Date Handling Patterns

```typescript
// Add days
function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

// Difference in days
function daysBetween(date1: Date, date2: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((date2.getTime() - date1.getTime()) / msPerDay);
}

// Format to ISO string
const isoString = new Date().toISOString();  // "2024-03-15T10:30:00.000Z"

// Format with Intl
const formatted = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short"
}).format(new Date());

// Start of day
function startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

// End of day
function endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
}
```

---

## Error Handling

### Built-in Error Types

```typescript
// Base Error
throw new Error("Something went wrong");

// Type errors
throw new TypeError("Expected a string");

// Range errors
throw new RangeError("Index out of bounds");

// Reference errors (usually from runtime)
// throw new ReferenceError("x is not defined");

// Syntax errors (usually from eval/parsing)
// throw new SyntaxError("Unexpected token");

// URI errors
throw new URIError("Invalid URI");

// Aggregate errors (from Promise.any)
throw new AggregateError([error1, error2], "All promises rejected");
```

### Custom Error Classes

```typescript
class ValidationError extends Error {
    constructor(
        message: string,
        public field: string,
        public value: unknown
    ) {
        super(message);
        this.name = "ValidationError";

        // Fix prototype chain (needed for ES5 targets)
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

class NotFoundError extends Error {
    constructor(resource: string, id: string | number) {
        super(`${resource} with id ${id} not found`);
        this.name = "NotFoundError";
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

// Usage
function validateEmail(email: string): void {
    if (!email.includes("@")) {
        throw new ValidationError(
            "Invalid email format",
            "email",
            email
        );
    }
}

// Type-safe error handling
try {
    validateEmail("invalid");
} catch (error) {
    if (error instanceof ValidationError) {
        console.log(`Field ${error.field} has invalid value: ${error.value}`);
    } else {
        throw error;
    }
}
```

### Error.cause (ES2022)

Chain errors while preserving the original cause:

```typescript
async function fetchUserData(userId: string) {
    try {
        const response = await fetch(`/api/users/${userId}`);
        return await response.json();
    } catch (error) {
        throw new Error(`Failed to fetch user ${userId}`, { cause: error });
    }
}

// Access the cause
try {
    await fetchUserData("123");
} catch (error) {
    if (error instanceof Error) {
        console.log("Error:", error.message);
        console.log("Caused by:", error.cause);
    }
}
```

---

## Object & Reflection

### Object Methods

```typescript
const user = { name: "Alice", age: 30, city: "NYC" };

// Keys, values, entries
Object.keys(user);     // ["name", "age", "city"]
Object.values(user);   // ["Alice", 30, "NYC"]
Object.entries(user);  // [["name", "Alice"], ["age", 30], ["city", "NYC"]]

// From entries (inverse of Object.entries)
const obj = Object.fromEntries([
    ["name", "Bob"],
    ["age", 25]
]);  // { name: "Bob", age: 25 }

// Transform object
const doubled = Object.fromEntries(
    Object.entries({ a: 1, b: 2 }).map(([k, v]) => [k, v * 2])
);  // { a: 2, b: 4 }

// Property check (ES2022 — better than hasOwnProperty)
Object.hasOwn(user, "name");  // true
Object.hasOwn(user, "toString");  // false (inherited, not own)

// Assign/merge
const merged = Object.assign({}, user, { city: "LA" });
const spread = { ...user, city: "LA" };  // Preferred

// Freeze and seal
const frozen = Object.freeze({ x: 1 });  // Can't modify
const sealed = Object.seal({ x: 1 });    // Can modify values, not structure

// Property descriptors
Object.defineProperty(user, "id", {
    value: "123",
    writable: false,
    enumerable: false
});

// Get prototype
Object.getPrototypeOf([]);  // Array.prototype
```

### Structured Clone

Deep clone without external libraries:

```typescript
// structuredClone — built-in deep clone (ES2022+)
const original = {
    name: "Alice",
    nested: { a: 1, b: [2, 3] },
    date: new Date(),
    set: new Set([1, 2, 3]),
    map: new Map([["key", "value"]])
};

const clone = structuredClone(original);

// Limitations: Can't clone functions, DOM nodes, or certain objects
// const invalid = structuredClone({ fn: () => {} });  // Error!

// Works with circular references
const circular: { self?: object } = {};
circular.self = circular;
const clonedCircular = structuredClone(circular);  // Works!
```

### Proxy & Reflect

```typescript
// Proxy for validation
function createValidatedObject<T extends object>(
    target: T,
    validator: (key: string | symbol, value: unknown) => boolean
): T {
    return new Proxy(target, {
        set(obj, prop, value) {
            if (!validator(prop, value)) {
                throw new Error(`Invalid value for ${String(prop)}`);
            }
            return Reflect.set(obj, prop, value);
        }
    });
}

const user = createValidatedObject(
    { age: 0 },
    (key, value) => key !== "age" || (typeof value === "number" && value >= 0)
);

user.age = 25;  // OK
// user.age = -5;  // Throws!

// Proxy for logging
function createLoggingProxy<T extends object>(target: T): T {
    return new Proxy(target, {
        get(obj, prop) {
            console.log(`GET ${String(prop)}`);
            return Reflect.get(obj, prop);
        },
        set(obj, prop, value) {
            console.log(`SET ${String(prop)} = ${value}`);
            return Reflect.set(obj, prop, value);
        }
    });
}

// Proxy for caching
function createCachingProxy<T extends (...args: unknown[]) => unknown>(fn: T): T {
    const cache = new Map<string, unknown>();
    return new Proxy(fn, {
        apply(target, thisArg, args) {
            const key = JSON.stringify(args);
            if (cache.has(key)) {
                return cache.get(key);
            }
            const result = Reflect.apply(target, thisArg, args);
            cache.set(key, result);
            return result;
        }
    }) as T;
}
```

---

## Math & Numbers

### Essential Math Methods

```typescript
// Rounding
Math.floor(4.7);    // 4 — round down
Math.ceil(4.3);     // 5 — round up
Math.round(4.5);    // 5 — round to nearest
Math.trunc(4.7);    // 4 — remove decimal part

// Absolute value
Math.abs(-5);       // 5

// Power and roots
Math.pow(2, 3);     // 8 (or use 2 ** 3)
Math.sqrt(16);      // 4
Math.cbrt(27);      // 3

// Min/max
Math.min(1, 2, 3);  // 1
Math.max(1, 2, 3);  // 3
Math.min(...[1, 2, 3]);  // With arrays

// Random
Math.random();                              // [0, 1)
Math.floor(Math.random() * 10);            // [0, 9]
Math.floor(Math.random() * (max - min + 1)) + min;  // [min, max]

// Trigonometry
Math.sin(Math.PI / 2);  // 1
Math.cos(0);            // 1
Math.atan2(y, x);       // Angle from x-axis

// Logarithms
Math.log(Math.E);       // 1 (natural log)
Math.log10(100);        // 2
Math.log2(8);           // 3

// Constants
Math.PI;                // 3.141592653589793
Math.E;                 // 2.718281828459045
Math.SQRT2;             // 1.4142135623730951

// Sign
Math.sign(-5);          // -1
Math.sign(0);           // 0
Math.sign(5);           // 1

// Clamping (custom function needed)
const clamp = (num: number, min: number, max: number) =>
    Math.min(Math.max(num, min), max);
```

### Number Utilities

```typescript
// Type checks
Number.isNaN(NaN);           // true (better than global isNaN)
Number.isNaN("hello");       // false (global isNaN("hello") is true!)
Number.isFinite(Infinity);   // false
Number.isFinite(42);         // true
Number.isInteger(42.0);      // true
Number.isInteger(42.5);      // false
Number.isSafeInteger(2 ** 53);  // false (too large for precise integer)

// Parsing
Number.parseInt("42px");     // 42
Number.parseFloat("3.14abc"); // 3.14

// Limits
Number.MAX_VALUE;            // ~1.8e308
Number.MIN_VALUE;            // ~5e-324 (smallest positive)
Number.MAX_SAFE_INTEGER;     // 2^53 - 1 = 9007199254740991
Number.MIN_SAFE_INTEGER;     // -(2^53 - 1)
Number.POSITIVE_INFINITY;    // Infinity
Number.NEGATIVE_INFINITY;    // -Infinity

// Formatting
(1234.5).toFixed(2);         // "1234.50"
(1234.5).toPrecision(3);     // "1.23e+3"
(255).toString(16);          // "ff" (hex)
(255).toString(2);           // "11111111" (binary)

// Numeric separators (ES2021)
const billion = 1_000_000_000;
const bytes = 0xFF_FF_FF_FF;
```

### BigInt for Large Integers

```typescript
// BigInt for arbitrary precision integers
const big = 9007199254740993n;  // Note the 'n' suffix
const alsoBig = BigInt("9007199254740993");

// Operations
big + 1n;        // 9007199254740994n
big * 2n;        // 18014398509481986n
big ** 2n;       // Very large number

// Can't mix BigInt and Number
// big + 1;      // Error!
big + BigInt(1); // OK

// Comparison works
big > 1000n;     // true
big === 9007199254740993n;  // true

// Conversion
Number(big);     // Loses precision if too large
String(big);     // "9007199254740993"
```

---

## WeakRef & FinalizationRegistry

### When to Use (Rarely!)

`WeakRef` and `FinalizationRegistry` are advanced features for specific use cases. **Most applications never need them.**

```typescript
// WeakRef — holds a weak reference that doesn't prevent GC
const ref = new WeakRef(largeObject);

// Later, the object might have been collected
const obj = ref.deref();  // Returns object or undefined
if (obj) {
    // Object still exists
    console.log(obj);
}

// FinalizationRegistry — callback when object is collected
const registry = new FinalizationRegistry((heldValue: string) => {
    console.log(`Object with id ${heldValue} was collected`);
});

// Register an object
const obj = { data: "important" };
registry.register(obj, "object-123");
```

### Caching Pattern

```typescript
// Memory-efficient cache that allows GC
class WeakCache<T extends object> {
    private cache = new Map<string, WeakRef<T>>();
    private registry = new FinalizationRegistry((key: string) => {
        this.cache.delete(key);
    });

    set(key: string, value: T): void {
        this.cache.set(key, new WeakRef(value));
        this.registry.register(value, key);
    }

    get(key: string): T | undefined {
        const ref = this.cache.get(key);
        return ref?.deref();
    }

    has(key: string): boolean {
        const ref = this.cache.get(key);
        return ref?.deref() !== undefined;
    }
}

// Warning: Don't rely on finalization for critical logic!
// GC timing is non-deterministic
```

---

## JSON

### Serialization and Parsing

```typescript
// Stringify
const obj = { name: "Alice", age: 30 };
JSON.stringify(obj);                    // '{"name":"Alice","age":30}'
JSON.stringify(obj, null, 2);           // Pretty printed
JSON.stringify(obj, ["name"]);          // Only include "name" key

// Parse
const parsed = JSON.parse('{"name":"Alice","age":30}');

// With type assertion
interface User {
    name: string;
    age: number;
}
const user = JSON.parse(jsonString) as User;

// Type-safe parsing with validation
function parseUser(json: string): User | null {
    try {
        const obj = JSON.parse(json);
        if (typeof obj.name === "string" && typeof obj.age === "number") {
            return obj as User;
        }
        return null;
    } catch {
        return null;
    }
}
```

### Custom Serialization

```typescript
// toJSON method
class User {
    constructor(
        public name: string,
        public password: string
    ) {}

    toJSON() {
        return { name: this.name };  // Exclude password
    }
}

JSON.stringify(new User("Alice", "secret123"));  // '{"name":"Alice"}'

// Replacer function
const data = { name: "Alice", password: "secret", age: 30 };
JSON.stringify(data, (key, value) => {
    if (key === "password") return undefined;  // Exclude
    return value;
});  // '{"name":"Alice","age":30}'

// Reviver function (for parsing)
const jsonWithDate = '{"date":"2024-03-15T10:30:00.000Z"}';
const parsed = JSON.parse(jsonWithDate, (key, value) => {
    if (key === "date") return new Date(value);
    return value;
});  // { date: Date object }

// Handling Map and Set
function replacer(key: string, value: unknown) {
    if (value instanceof Map) {
        return { __type: "Map", entries: [...value.entries()] };
    }
    if (value instanceof Set) {
        return { __type: "Set", values: [...value.values()] };
    }
    return value;
}

function reviver(key: string, value: unknown) {
    if (value && typeof value === "object" && "__type" in value) {
        if (value.__type === "Map") {
            return new Map((value as { entries: [unknown, unknown][] }).entries);
        }
        if (value.__type === "Set") {
            return new Set((value as { values: unknown[] }).values);
        }
    }
    return value;
}
```

---

## Quick Reference Cards

### Collections Methods Summary

| Collection | Insert | Remove | Access | Search | Iterate |
|------------|--------|--------|--------|--------|---------|
| **Array** | `push`, `unshift` | `pop`, `shift`, `splice` | `[i]`, `at(i)` | `includes`, `indexOf`, `find` | `for-of`, `forEach` |
| **Map** | `set(k, v)` | `delete(k)`, `clear()` | `get(k)` | `has(k)` | `for-of`, `keys()`, `values()` |
| **Set** | `add(v)` | `delete(v)`, `clear()` | — | `has(v)` | `for-of` |
| **WeakMap** | `set(k, v)` | `delete(k)` | `get(k)` | `has(k)` | Not iterable |
| **WeakSet** | `add(v)` | `delete(v)` | — | `has(v)` | Not iterable |

### Array Methods Cheat Sheet

| Method | Mutates? | Returns | Description |
|--------|----------|---------|-------------|
| `push()` | Yes | Length | Add to end |
| `pop()` | Yes | Element | Remove from end |
| `shift()` | Yes | Element | Remove from front |
| `unshift()` | Yes | Length | Add to front |
| `splice()` | Yes | Removed | Insert/remove at index |
| `sort()` | Yes | Array | Sort in place |
| `reverse()` | Yes | Array | Reverse in place |
| `toSorted()` | No | New array | Sorted copy |
| `toReversed()` | No | New array | Reversed copy |
| `toSpliced()` | No | New array | Spliced copy |
| `with()` | No | New array | Copy with replacement |
| `map()` | No | New array | Transform elements |
| `filter()` | No | New array | Filter elements |
| `reduce()` | No | Value | Aggregate to single value |
| `slice()` | No | New array | Extract portion |

### Promise Combinators Reference

| Combinator | Resolves | Rejects | Use Case |
|------------|----------|---------|----------|
| `Promise.all` | All fulfill | First rejection | Parallel independent tasks |
| `Promise.allSettled` | All settle | Never | Need all results regardless |
| `Promise.race` | First to settle | First to settle | Timeout patterns |
| `Promise.any` | First fulfillment | All reject | First success wins |

---

## Interview Questions

### Q1: What's the difference between `Array.sort()` and `Array.toSorted()`?

`sort()` mutates the original array and returns it. `toSorted()` (ES2023) creates and returns a new sorted array without modifying the original. Use `toSorted()` when you need immutability, especially in React state or functional programming patterns.

### Q2: When should you use `Map` vs a plain object?

Use `Map` when: keys aren't strings, you need to preserve insertion order, you're doing frequent additions/deletions, or you need the `size` property. Use objects when: you need JSON serialization, the structure is static and known at compile time, or you're defining a type/interface.

### Q3: Explain the difference between `Promise.all` and `Promise.allSettled`.

`Promise.all` rejects immediately if any promise rejects — "fail fast." `Promise.allSettled` waits for all promises to settle and returns an array of result objects with `status: "fulfilled"` or `status: "rejected"`, never rejecting itself. Use `allSettled` when you need all results regardless of failures.

### Q4: What's the purpose of `WeakMap` and when would you use it?

`WeakMap` holds weak references to object keys, allowing them to be garbage collected when no other references exist. Use it for: associating metadata with objects without preventing their cleanup, caching computed values, or storing private data for instances. Keys must be objects, and it's not iterable.

### Q5: How does `structuredClone` differ from spread or `Object.assign`?

`structuredClone` performs a deep clone, copying nested objects, arrays, Maps, Sets, Dates, and handling circular references. Spread and `Object.assign` only do shallow copies — nested objects are still references. `structuredClone` can't clone functions or DOM nodes.

### Q6: What's the difference between `for-of` and `for-in` loops?

`for-of` iterates over iterable values (arrays, strings, Maps, Sets). `for-in` iterates over enumerable property keys (including inherited ones), and the iteration order isn't guaranteed for non-integer keys. Use `for-of` for arrays; `for-in` is mainly for objects (though `Object.keys()` is often preferred).

### Q7: Explain `Promise.withResolvers()`.

ES2024's `Promise.withResolvers()` returns an object with `{ promise, resolve, reject }`, giving you external control over when a promise resolves or rejects. It's cleaner than the old pattern of extracting resolver functions from the Promise constructor.

### Q8: What's the difference between `Number.isNaN()` and global `isNaN()`?

`Number.isNaN()` only returns `true` for the actual `NaN` value. Global `isNaN()` coerces its argument to a number first, so `isNaN("hello")` returns `true` (because `Number("hello")` is `NaN`). Always prefer `Number.isNaN()` for accurate checks.

### Q9: How do generators differ from regular functions?

Generators (declared with `function*`) can yield multiple values over time, pausing and resuming execution. They return an iterator object. Each `yield` produces a value and pauses until `next()` is called. Use them for lazy evaluation, infinite sequences, or custom iterators.

### Q10: What's the difference between `Object.freeze()` and `Object.seal()`?

`freeze` makes an object completely immutable — no property additions, deletions, or value changes. `seal` prevents additions and deletions but allows changing existing property values. Both are shallow; use `structuredClone` + freeze for deep immutability.

---

## Resources

### Official Documentation
- [MDN Web Docs - JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) — Comprehensive reference
- [ECMAScript Specification](https://tc39.es/ecma262/) — The official standard
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/) — Type system guide

### ES2023-2025 Features
- [ECMAScript proposals](https://github.com/tc39/proposals) — Upcoming features
- [ES2023 Features](https://2ality.com/2022/12/ecmascript-2023.html) — Immutable array methods
- [ES2024 Features](https://2ality.com/2024/01/ecmascript-2024.html) — groupBy, Promise.withResolvers

### Learning Resources
- [JavaScript.info](https://javascript.info/) — Modern JavaScript tutorial
- [Exploring ES2023-2024](https://exploringjs.com/) — Dr. Axel Rauschmayer's books

### Related Guides in This Series
- [02-data-structures.md](02-data-structures.md) — Collections for interview patterns
- [06-async-patterns.md](06-async-patterns.md) — Advanced async patterns
- [07-modern-typescript.md](07-modern-typescript.md) — Latest TypeScript features
