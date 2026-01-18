# TypeScript Syntax Quick Reference

> Essential syntax for coding interviews — TypeScript 5.8+

---

## Table of Contents

1. [Variables & Declarations](#variables--declarations)
2. [Primitive Types](#primitive-types)
3. [Type Annotations & Inference](#type-annotations--inference)
4. [Arrays & Tuples](#arrays--tuples)
5. [Objects & Interfaces](#objects--interfaces)
6. [Functions](#functions)
7. [Classes](#classes)
8. [Enums](#enums)
9. [Control Flow](#control-flow)
10. [Loops](#loops)
11. [Modules](#modules)
12. [Modern Syntax](#modern-syntax)
13. [Quick Reference Card](#quick-reference-card)

---

## Variables & Declarations

### let, const, var

```typescript
// const - immutable binding (preferred)
const PI = 3.14159;
const nums: number[] = [1, 2, 3];  // Array reference is const, contents aren't
nums.push(4);  // OK - modifying contents
// nums = [5, 6];  // Error - can't reassign

// let - mutable binding
let count = 0;
count = 1;  // OK

// var - function-scoped (avoid in modern code)
var legacy = "avoid";
```

### Destructuring

```typescript
// Array destructuring
const [first, second, ...rest] = [1, 2, 3, 4, 5];
// first = 1, second = 2, rest = [3, 4, 5]

// Object destructuring
const { name, age, city = "Unknown" } = { name: "Alice", age: 30 };
// name = "Alice", age = 30, city = "Unknown" (default)

// Renaming during destructuring
const { name: userName } = { name: "Bob" };
// userName = "Bob"

// Swap variables
let a = 1, b = 2;
[a, b] = [b, a];
```

---

## Primitive Types

| Type | Description | Example |
|------|-------------|---------|
| `number` | All numbers (int & float) | `42`, `3.14`, `Infinity`, `NaN` |
| `string` | Text | `"hello"`, `'world'`, `` `template` `` |
| `boolean` | True/false | `true`, `false` |
| `null` | Intentional absence | `null` |
| `undefined` | Uninitialized | `undefined` |
| `bigint` | Large integers | `9007199254740991n` |
| `symbol` | Unique identifiers | `Symbol("id")` |

### Number Specifics

```typescript
// All are type 'number'
const int = 42;
const float = 3.14;
const negative = -10;
const hex = 0xff;           // 255
const binary = 0b1010;      // 10
const octal = 0o744;        // 484
const scientific = 1e6;     // 1000000

// Special values
const inf = Infinity;
const negInf = -Infinity;
const notANumber = NaN;

// Checking
Number.isInteger(42);       // true
Number.isFinite(Infinity);  // false
Number.isNaN(NaN);          // true

// Limits
Number.MAX_SAFE_INTEGER;    // 9007199254740991
Number.MIN_SAFE_INTEGER;    // -9007199254740991
```

### String Specifics

```typescript
const single = 'hello';
const double = "world";
const template = `Hello, ${name}!`;  // Template literal

// Multiline strings
const multiline = `
    Line 1
    Line 2
`;

// String methods (commonly used in interviews)
str.length;                  // Length
str[0];                      // First character
str.charAt(0);               // Same as str[0]
str.slice(1, 4);             // Substring [1, 4)
str.substring(1, 4);         // Same as slice for positive indices
str.split("");               // To character array
str.split(" ");              // Split by space
str.toLowerCase();
str.toUpperCase();
str.trim();                  // Remove whitespace
str.includes("sub");         // Contains substring
str.startsWith("he");
str.endsWith("lo");
str.indexOf("l");            // First occurrence (-1 if not found)
str.lastIndexOf("l");        // Last occurrence
str.replace("a", "b");       // Replace first
str.replaceAll("a", "b");    // Replace all
str.repeat(3);               // "aaa"
str.padStart(5, "0");        // "00abc"
str.padEnd(5, "0");          // "abc00"

// Character codes
"a".charCodeAt(0);           // 97
String.fromCharCode(97);     // "a"
```

---

## Type Annotations & Inference

### Explicit Annotations

```typescript
// Variables
const name: string = "Alice";
const age: number = 30;
const isActive: boolean = true;

// Arrays
const nums: number[] = [1, 2, 3];
const strs: Array<string> = ["a", "b", "c"];  // Generic syntax

// Functions
function add(a: number, b: number): number {
    return a + b;
}

// Arrow functions
const multiply = (a: number, b: number): number => a * b;
```

### Type Inference (Let TypeScript Work)

```typescript
// TypeScript infers types - don't over-annotate
const name = "Alice";          // string
const age = 30;                // number
const nums = [1, 2, 3];        // number[]
const mixed = [1, "two"];      // (string | number)[]

// Inference with functions
const double = (x: number) => x * 2;  // Return type inferred as number

// When to annotate explicitly:
// 1. Function parameters (required)
// 2. Empty arrays
// 3. Complex return types
// 4. When inference is wrong

const empty: number[] = [];     // Must annotate empty arrays
```

---

## Arrays & Tuples

### Arrays

```typescript
// Creation
const nums: number[] = [1, 2, 3];
const strs: string[] = ["a", "b", "c"];
const filled = new Array(5).fill(0);    // [0, 0, 0, 0, 0]
const range = Array.from({ length: 5 }, (_, i) => i);  // [0, 1, 2, 3, 4]

// 2D Arrays
const matrix: number[][] = [
    [1, 2, 3],
    [4, 5, 6],
];
const grid = Array.from({ length: 3 }, () => new Array(3).fill(0));

// Access
nums[0];                     // First element
nums[nums.length - 1];       // Last element
nums.at(-1);                 // Last element (ES2022)
nums.at(-2);                 // Second to last

// Modification (mutating)
nums.push(4);                // Add to end, returns new length
nums.pop();                  // Remove from end, returns element
nums.unshift(0);             // Add to front (O(n))
nums.shift();                // Remove from front (O(n))
nums.splice(1, 2);           // Remove 2 elements starting at index 1
nums.splice(1, 0, 10, 20);   // Insert 10, 20 at index 1
nums.reverse();              // Reverse in-place
nums.sort((a, b) => a - b);  // Sort numbers ascending

// Non-mutating
nums.slice(1, 3);            // Copy [1, 3)
nums.concat([4, 5]);         // Concatenate
nums.join(", ");             // "1, 2, 3"
[...nums];                   // Shallow copy
nums.toReversed();           // Reversed copy (ES2023)
nums.toSorted((a, b) => a - b);  // Sorted copy (ES2023)
nums.toSpliced(1, 2);        // Spliced copy (ES2023)

// Searching
nums.includes(2);            // true
nums.indexOf(2);             // Index or -1
nums.findIndex(x => x > 2);  // Index of first match or -1
nums.find(x => x > 2);       // First matching element or undefined

// Iteration (returns new array)
nums.map(x => x * 2);        // Transform each element
nums.filter(x => x > 1);     // Keep elements matching predicate
nums.reduce((acc, x) => acc + x, 0);  // Fold to single value

// Boolean checks
nums.every(x => x > 0);      // All positive?
nums.some(x => x > 5);       // Any > 5?
```

### Tuples

```typescript
// Fixed-length, typed arrays
const pair: [number, string] = [1, "one"];
const triple: [number, number, number] = [1, 2, 3];

// Destructuring
const [id, name] = pair;

// Optional elements
const optionalTuple: [number, string?] = [1];

// Rest elements
const restTuple: [number, ...string[]] = [1, "a", "b", "c"];

// Readonly tuples
const point: readonly [number, number] = [0, 0];
// point[0] = 1;  // Error

// Common use: multiple return values
function minMax(nums: number[]): [number, number] {
    return [Math.min(...nums), Math.max(...nums)];
}
const [min, max] = minMax([3, 1, 4, 1, 5]);
```

---

## Objects & Interfaces

### Object Types

```typescript
// Inline object type
const user: { name: string; age: number } = {
    name: "Alice",
    age: 30,
};

// Optional properties
const config: { host: string; port?: number } = {
    host: "localhost",
};

// Readonly properties
const point: { readonly x: number; readonly y: number } = {
    x: 0,
    y: 0,
};
```

### Interfaces

```typescript
// Interface definition
interface User {
    id: number;
    name: string;
    email?: string;      // Optional
    readonly createdAt: Date;  // Readonly
}

// Using the interface
const user: User = {
    id: 1,
    name: "Alice",
    createdAt: new Date(),
};

// Extending interfaces
interface Admin extends User {
    permissions: string[];
}

// Index signatures
interface StringMap {
    [key: string]: string;
}

// Method signatures
interface Calculator {
    add(a: number, b: number): number;
    subtract: (a: number, b: number) => number;  // Arrow syntax
}
```

### Type Aliases

```typescript
// Type alias (similar to interface)
type Point = {
    x: number;
    y: number;
};

// Union types (can't do this with interface)
type ID = string | number;
type Status = "pending" | "active" | "closed";

// Intersection types
type Employee = User & { department: string };

// When to use interface vs type:
// - interface: Objects, classes, extending
// - type: Unions, primitives, tuples, computed types
```

---

## Functions

### Function Declarations

```typescript
// Named function
function add(a: number, b: number): number {
    return a + b;
}

// Arrow function
const multiply = (a: number, b: number): number => a * b;

// Arrow function with implicit return
const double = (x: number): number => x * 2;

// Function type
type BinaryOp = (a: number, b: number) => number;
const subtract: BinaryOp = (a, b) => a - b;
```

### Parameters

```typescript
// Optional parameters
function greet(name: string, greeting?: string): string {
    return `${greeting ?? "Hello"}, ${name}!`;
}

// Default parameters
function greet2(name: string, greeting = "Hello"): string {
    return `${greeting}, ${name}!`;
}

// Rest parameters
function sum(...nums: number[]): number {
    return nums.reduce((a, b) => a + b, 0);
}

// Destructured parameters
function printUser({ name, age }: { name: string; age: number }): void {
    console.log(`${name} is ${age}`);
}
```

### Overloads

```typescript
// Function overloads for different signatures
function parse(input: string): number;
function parse(input: number): string;
function parse(input: string | number): number | string {
    if (typeof input === "string") {
        return parseInt(input, 10);
    }
    return input.toString();
}
```

### Generic Functions

```typescript
// Generic function
function first<T>(arr: T[]): T | undefined {
    return arr[0];
}

// Usage (type inferred)
const n = first([1, 2, 3]);     // number | undefined
const s = first(["a", "b"]);    // string | undefined

// Constrained generics
function longest<T extends { length: number }>(a: T, b: T): T {
    return a.length >= b.length ? a : b;
}
```

---

## Classes

### Basic Class

```typescript
class Point {
    // Properties
    x: number;
    y: number;

    // Constructor
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    // Method
    distanceFromOrigin(): number {
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    }
}

const p = new Point(3, 4);
console.log(p.distanceFromOrigin());  // 5
```

### Shorthand Constructor

```typescript
class Point {
    // Parameter properties
    constructor(
        public x: number,
        public y: number,
    ) {}

    distanceFromOrigin(): number {
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    }
}
```

### Access Modifiers

```typescript
class User {
    public name: string;        // Accessible anywhere (default)
    private password: string;   // Only accessible within class
    protected email: string;    // Accessible in class and subclasses
    readonly id: number;        // Can't be modified after construction

    constructor(name: string, password: string, email: string, id: number) {
        this.name = name;
        this.password = password;
        this.email = email;
        this.id = id;
    }
}
```

### Inheritance

```typescript
class Animal {
    constructor(public name: string) {}

    speak(): void {
        console.log(`${this.name} makes a sound`);
    }
}

class Dog extends Animal {
    constructor(name: string, public breed: string) {
        super(name);  // Must call parent constructor
    }

    speak(): void {
        console.log(`${this.name} barks`);
    }
}
```

### Static Members

```typescript
class Counter {
    static count = 0;

    static increment(): void {
        Counter.count++;
    }
}

Counter.increment();
console.log(Counter.count);  // 1
```

### Abstract Classes

```typescript
abstract class Shape {
    abstract area(): number;  // Must be implemented

    describe(): string {      // Can have implementations
        return `Area: ${this.area()}`;
    }
}

class Circle extends Shape {
    constructor(public radius: number) {
        super();
    }

    area(): number {
        return Math.PI * this.radius ** 2;
    }
}
```

---

## Enums

### Numeric Enums

```typescript
enum Direction {
    Up,      // 0
    Down,    // 1
    Left,    // 2
    Right,   // 3
}

const dir: Direction = Direction.Up;

// Custom values
enum Status {
    Pending = 1,
    Active = 2,
    Closed = 10,
}
```

### String Enums

```typescript
enum Direction {
    Up = "UP",
    Down = "DOWN",
    Left = "LEFT",
    Right = "RIGHT",
}
```

### Const Enums (More Efficient)

```typescript
const enum Direction {
    Up,
    Down,
    Left,
    Right,
}

// Inlined at compile time
const dir = Direction.Up;  // Compiles to: const dir = 0;
```

### Alternative: String Literal Types

```typescript
// Often preferred over enums for simplicity
type Direction = "up" | "down" | "left" | "right";

const dir: Direction = "up";
```

---

## Control Flow

### Conditionals

```typescript
// if-else
if (condition) {
    // ...
} else if (otherCondition) {
    // ...
} else {
    // ...
}

// Ternary operator
const result = condition ? valueIfTrue : valueIfFalse;

// Nullish coalescing (for null/undefined)
const value = maybeNull ?? defaultValue;

// Optional chaining
const city = user?.address?.city;

// Logical AND (short-circuit)
const result = condition && computeValue();

// Logical OR (fallback)
const result = value || defaultValue;  // Careful: false, 0, "" are falsy
```

### Switch

```typescript
switch (status) {
    case "pending":
        handlePending();
        break;
    case "active":
        handleActive();
        break;
    case "closed":
        handleClosed();
        break;
    default:
        handleUnknown();
}

// Exhaustiveness checking
type Status = "pending" | "active" | "closed";

function handleStatus(status: Status): string {
    switch (status) {
        case "pending":
            return "Waiting";
        case "active":
            return "Running";
        case "closed":
            return "Done";
        default:
            // TypeScript knows this is unreachable
            const _exhaustive: never = status;
            return _exhaustive;
    }
}
```

---

## Loops

### For Loops

```typescript
// Classic for loop
for (let i = 0; i < 10; i++) {
    console.log(i);
}

// for...of (iterate values)
for (const num of nums) {
    console.log(num);
}

// for...of with index
for (const [i, num] of nums.entries()) {
    console.log(i, num);
}

// for...in (iterate keys - usually avoid for arrays)
for (const key in obj) {
    console.log(key, obj[key]);
}
```

### While Loops

```typescript
// while
let i = 0;
while (i < 10) {
    console.log(i);
    i++;
}

// do-while
let j = 0;
do {
    console.log(j);
    j++;
} while (j < 10);
```

### Iteration Methods

```typescript
// forEach (no return value, can't break)
nums.forEach((num, index) => {
    console.log(index, num);
});

// map (transform)
const doubled = nums.map(x => x * 2);

// filter (select)
const evens = nums.filter(x => x % 2 === 0);

// reduce (aggregate)
const sum = nums.reduce((acc, x) => acc + x, 0);

// find (first match)
const found = nums.find(x => x > 5);

// some/every (boolean)
const hasPositive = nums.some(x => x > 0);
const allPositive = nums.every(x => x > 0);
```

---

## Modules

### Export

```typescript
// Named exports
export const PI = 3.14159;
export function add(a: number, b: number): number {
    return a + b;
}
export interface User {
    name: string;
}

// Default export
export default class Calculator {
    // ...
}

// Re-exports
export { something } from "./other-module";
export * from "./other-module";
export type { SomeType } from "./types";
```

### Import

```typescript
// Named imports
import { PI, add, User } from "./math";

// Default import
import Calculator from "./calculator";

// Namespace import
import * as math from "./math";

// Combined
import Calculator, { add, PI } from "./calculator";

// Type-only imports (removed at runtime)
import type { User } from "./types";
import { type User, someFunction } from "./module";

// Dynamic import
const module = await import("./module");
```

---

## Modern Syntax

### Optional Chaining (?.)

```typescript
const city = user?.address?.city;  // undefined if any step is nullish

// Method calls
const result = obj.method?.();

// Array access
const first = arr?.[0];

// With nullish coalescing
const city = user?.address?.city ?? "Unknown";
```

### Nullish Coalescing (??)

```typescript
// Only for null/undefined (not falsy values)
const value = maybeNull ?? "default";

// vs logical OR (which treats all falsy values as false)
const value2 = maybeZero || "default";  // "default" if maybeZero is 0

// Assignment form
let value: string | null = null;
value ??= "default";  // Assign if nullish
```

### Spread Operator

```typescript
// Array spread
const combined = [...arr1, ...arr2];
const copy = [...original];
const withNew = [...arr, newElement];

// Object spread
const updated = { ...original, newProp: "value" };
const merged = { ...defaults, ...overrides };

// Function arguments
Math.max(...nums);
```

### Template Literals

```typescript
// String interpolation
const greeting = `Hello, ${name}!`;

// Multiline
const html = `
    <div>
        <h1>${title}</h1>
    </div>
`;

// Tagged templates
const query = sql`SELECT * FROM users WHERE id = ${id}`;
```

### Logical Assignment

```typescript
// OR assignment (assign if falsy)
x ||= defaultValue;

// AND assignment (assign if truthy)
x &&= transform(x);

// Nullish assignment (assign if nullish)
x ??= defaultValue;
```

---

## Quick Reference Card

### Common Patterns

```typescript
// Initialize Map with entries
const map = new Map<string, number>([
    ["a", 1],
    ["b", 2],
]);

// Initialize Set with values
const set = new Set<number>([1, 2, 3]);

// Get with default
const value = map.get(key) ?? defaultValue;

// Increment in Map
map.set(key, (map.get(key) ?? 0) + 1);

// Create range [0, n)
const range = Array.from({ length: n }, (_, i) => i);

// Create filled array
const zeros = new Array(n).fill(0);
const grid = Array.from({ length: m }, () => new Array(n).fill(0));

// Min/Max of array
const min = Math.min(...nums);
const max = Math.max(...nums);

// Sum of array
const sum = nums.reduce((a, b) => a + b, 0);

// Sort numbers (MUST provide comparator)
nums.sort((a, b) => a - b);  // Ascending
nums.sort((a, b) => b - a);  // Descending

// Swap
[a, b] = [b, a];

// Integer division
const quotient = Math.floor(a / b);
const quotient2 = Math.trunc(a / b);  // Rounds toward zero

// Check if integer
Number.isInteger(x);

// Convert string to number
parseInt(str, 10);    // Integer
parseFloat(str);      // Float
Number(str);          // General

// Convert number to string
num.toString();
String(num);
`${num}`;
```

### Type Assertions

```typescript
// as syntax (preferred)
const element = document.getElementById("app") as HTMLDivElement;

// Angle bracket syntax (not in .tsx files)
const element2 = <HTMLDivElement>document.getElementById("app");

// Non-null assertion (use sparingly)
const value = map.get(key)!;  // Assert not undefined
```

### Common Type Utilities

```typescript
// Typeof (get type of value)
const user = { name: "Alice", age: 30 };
type User = typeof user;  // { name: string; age: number }

// Keyof (get keys as union)
type UserKeys = keyof User;  // "name" | "age"

// Partial (all optional)
type PartialUser = Partial<User>;

// Required (all required)
type RequiredUser = Required<PartialUser>;

// Readonly (all readonly)
type ReadonlyUser = Readonly<User>;

// Pick (select properties)
type NameOnly = Pick<User, "name">;

// Omit (exclude properties)
type WithoutAge = Omit<User, "age">;

// Record (typed object)
type StringToNumber = Record<string, number>;
```
