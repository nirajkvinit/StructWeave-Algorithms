# TypeScript Type System Mastery

> The 20% of type system features that solve 80% of problems

TypeScript's type system is its superpower. This chapter covers the essential type features for interviews and production code.

---

## Table of Contents

1. [Type Inference](#type-inference)
2. [Union & Intersection Types](#union--intersection-types)
3. [Type Guards & Narrowing](#type-guards--narrowing)
4. [Literal Types & Const Assertions](#literal-types--const-assertions)
5. [Discriminated Unions](#discriminated-unions)
6. [Index Signatures & Access Types](#index-signatures--access-types)
7. [keyof & typeof Operators](#keyof--typeof-operators)
8. [Mapped Types](#mapped-types)
9. [Conditional Types](#conditional-types)
10. [Template Literal Types](#template-literal-types)
11. [The infer Keyword](#the-infer-keyword)
12. [Type Predicates](#type-predicates)
13. [The satisfies Operator](#the-satisfies-operator)
14. [Common Interview Patterns](#common-interview-patterns)

---

## Type Inference

TypeScript infers types when you don't explicitly annotate. Trust the inference!

### Let TypeScript Work

```typescript
// Inferred types (preferred - don't over-annotate)
const name = "Alice";          // string
const age = 30;                // number
const active = true;           // boolean
const nums = [1, 2, 3];        // number[]
const mixed = [1, "two"];      // (string | number)[]

// Object inference
const user = {
    name: "Alice",
    age: 30,
};
// Type: { name: string; age: number; }

// Function return type inference
function add(a: number, b: number) {
    return a + b;  // Returns number (inferred)
}

// Arrow function with inferred return
const double = (x: number) => x * 2;  // Returns number
```

### When to Annotate Explicitly

```typescript
// 1. Empty arrays (TypeScript can't infer element type)
const empty: number[] = [];

// 2. Variables initialized to null/undefined
let user: User | null = null;

// 3. Function parameters (required)
function greet(name: string): string {
    return `Hello, ${name}`;
}

// 4. When inference is too narrow
const nums = [1, 2, 3];        // number[] (mutable)
const tuple: [number, number, number] = [1, 2, 3];  // Fixed tuple

// 5. When inference is wrong for your use case
let id: string | number = 123;  // Want flexibility
```

### Contextual Typing

```typescript
// TypeScript infers callback parameter types from context
const nums = [1, 2, 3];
nums.map(n => n * 2);          // n is inferred as number

// Event handlers
document.addEventListener("click", event => {
    // event is inferred as MouseEvent
    console.log(event.clientX);
});

// Array methods
const filtered = nums.filter(x => x > 1);  // x is number
```

---

## Union & Intersection Types

### Union Types (OR)

```typescript
// A value can be one of several types
type ID = string | number;

function printId(id: ID): void {
    console.log(id);
}

printId(101);      // OK
printId("abc");    // OK

// Nullable types
type MaybeString = string | null | undefined;

// Common pattern: success or error
type Result<T> = T | Error;
```

### Intersection Types (AND)

```typescript
// Combine multiple types into one
interface HasName {
    name: string;
}

interface HasAge {
    age: number;
}

type Person = HasName & HasAge;

const person: Person = {
    name: "Alice",
    age: 30,
};

// Extend with intersection
type Employee = Person & {
    department: string;
};
```

### Working with Unions

```typescript
type StringOrNumber = string | number;

function process(value: StringOrNumber): string {
    // Must narrow before using type-specific methods
    if (typeof value === "string") {
        return value.toUpperCase();  // string methods available
    } else {
        return value.toFixed(2);     // number methods available
    }
}

// Union of literals
type Direction = "up" | "down" | "left" | "right";
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
type Status = 200 | 201 | 400 | 404 | 500;
```

---

## Type Guards & Narrowing

Type guards narrow a type within a conditional block.

### typeof Guard

```typescript
function padLeft(value: string, padding: string | number): string {
    if (typeof padding === "number") {
        // padding is number here
        return " ".repeat(padding) + value;
    }
    // padding is string here
    return padding + value;
}
```

### instanceof Guard

```typescript
class Dog {
    bark(): void { console.log("Woof!"); }
}

class Cat {
    meow(): void { console.log("Meow!"); }
}

function makeSound(animal: Dog | Cat): void {
    if (animal instanceof Dog) {
        animal.bark();  // TypeScript knows it's Dog
    } else {
        animal.meow();  // TypeScript knows it's Cat
    }
}
```

### in Operator Guard

```typescript
interface Fish {
    swim(): void;
}

interface Bird {
    fly(): void;
}

function move(animal: Fish | Bird): void {
    if ("swim" in animal) {
        animal.swim();  // Fish
    } else {
        animal.fly();   // Bird
    }
}
```

### Truthiness Narrowing

```typescript
function print(value: string | null | undefined): void {
    if (value) {
        // value is string (truthy)
        console.log(value.toUpperCase());
    }
}

// With optional chaining
function getLength(str: string | undefined): number {
    return str?.length ?? 0;
}
```

### Equality Narrowing

```typescript
function compare(x: string | number, y: string | boolean): void {
    if (x === y) {
        // x and y are both string (only common type)
        console.log(x.toUpperCase());
    }
}

// Discriminating null
function printAll(strs: string | string[] | null): void {
    if (strs !== null) {
        if (typeof strs === "object") {
            // strs is string[]
            for (const s of strs) {
                console.log(s);
            }
        } else {
            // strs is string
            console.log(strs);
        }
    }
}
```

---

## Literal Types & Const Assertions

### Literal Types

```typescript
// String literals
type Direction = "up" | "down" | "left" | "right";
let dir: Direction = "up";  // Only these 4 values allowed

// Number literals
type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;
let roll: DiceRoll = 4;

// Boolean literal (rarely used directly)
type AlwaysTrue = true;

// Mixed literals
type EventType = "click" | "scroll" | 0 | 1;
```

### Const Assertions

```typescript
// Without as const - types are widened
const config = {
    endpoint: "https://api.example.com",
    port: 3000,
};
// Type: { endpoint: string; port: number; }

// With as const - types are narrowed to literals
const config2 = {
    endpoint: "https://api.example.com",
    port: 3000,
} as const;
// Type: { readonly endpoint: "https://api.example.com"; readonly port: 3000; }

// Array as const
const directions = ["up", "down", "left", "right"] as const;
// Type: readonly ["up", "down", "left", "right"]
type Direction = typeof directions[number];  // "up" | "down" | "left" | "right"

// Const assertion on variable
let x = "hello" as const;  // Type: "hello" (not string)
```

---

## Discriminated Unions

Also called "tagged unions" - powerful pattern for representing different states.

### Basic Pattern

```typescript
// Each variant has a discriminant property
interface Circle {
    kind: "circle";
    radius: number;
}

interface Rectangle {
    kind: "rectangle";
    width: number;
    height: number;
}

interface Triangle {
    kind: "triangle";
    base: number;
    height: number;
}

type Shape = Circle | Rectangle | Triangle;

function area(shape: Shape): number {
    switch (shape.kind) {
        case "circle":
            return Math.PI * shape.radius ** 2;
        case "rectangle":
            return shape.width * shape.height;
        case "triangle":
            return (shape.base * shape.height) / 2;
    }
}
```

### Result Type (Error Handling)

```typescript
type Success<T> = {
    success: true;
    value: T;
};

type Failure = {
    success: false;
    error: string;
};

type Result<T> = Success<T> | Failure;

function divide(a: number, b: number): Result<number> {
    if (b === 0) {
        return { success: false, error: "Division by zero" };
    }
    return { success: true, value: a / b };
}

const result = divide(10, 2);
if (result.success) {
    console.log(result.value);  // TypeScript knows value exists
} else {
    console.log(result.error);  // TypeScript knows error exists
}
```

### State Machine

```typescript
type LoadingState = {
    status: "loading";
};

type SuccessState<T> = {
    status: "success";
    data: T;
};

type ErrorState = {
    status: "error";
    error: Error;
};

type AsyncState<T> = LoadingState | SuccessState<T> | ErrorState;

function renderState<T>(state: AsyncState<T>): string {
    switch (state.status) {
        case "loading":
            return "Loading...";
        case "success":
            return `Data: ${JSON.stringify(state.data)}`;
        case "error":
            return `Error: ${state.error.message}`;
    }
}
```

### Exhaustiveness Checking

```typescript
type Shape = Circle | Rectangle | Triangle;

function area(shape: Shape): number {
    switch (shape.kind) {
        case "circle":
            return Math.PI * shape.radius ** 2;
        case "rectangle":
            return shape.width * shape.height;
        case "triangle":
            return (shape.base * shape.height) / 2;
        default:
            // If we add a new shape, TypeScript will error here
            const _exhaustive: never = shape;
            return _exhaustive;
    }
}
```

---

## Index Signatures & Access Types

### Index Signatures

```typescript
// String index signature
interface StringMap {
    [key: string]: string;
}

const dict: StringMap = {
    hello: "world",
    foo: "bar",
};

// Number index signature (for array-like objects)
interface NumberIndexed {
    [index: number]: string;
}

const arr: NumberIndexed = ["a", "b", "c"];

// Combined with known properties
interface Config {
    name: string;
    version: number;
    [key: string]: string | number;  // Must be compatible
}
```

### Indexed Access Types

```typescript
interface User {
    name: string;
    age: number;
    address: {
        city: string;
        country: string;
    };
}

// Access nested type
type UserName = User["name"];           // string
type UserAge = User["age"];             // number
type UserAddress = User["address"];     // { city: string; country: string; }
type City = User["address"]["city"];    // string

// Access with union
type NameOrAge = User["name" | "age"];  // string | number

// Access array element type
type First = [string, number, boolean][0];  // string
type Second = [string, number, boolean][1]; // number
type Element = string[][number];            // string
```

---

## keyof & typeof Operators

### keyof Operator

```typescript
interface User {
    name: string;
    age: number;
    email: string;
}

// Get union of keys
type UserKeys = keyof User;  // "name" | "age" | "email"

// Use with generics for type-safe property access
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key];
}

const user: User = { name: "Alice", age: 30, email: "alice@example.com" };
const name = getProperty(user, "name");  // string
const age = getProperty(user, "age");    // number
// getProperty(user, "invalid");         // Error!
```

### typeof Operator

```typescript
// Get type from value
const user = {
    name: "Alice",
    age: 30,
};

type User = typeof user;  // { name: string; age: number; }

// Combine with keyof
type UserKeys = keyof typeof user;  // "name" | "age"

// Get function type
function add(a: number, b: number): number {
    return a + b;
}

type AddFn = typeof add;  // (a: number, b: number) => number

// Get array element type
const colors = ["red", "green", "blue"] as const;
type Color = typeof colors[number];  // "red" | "green" | "blue"
```

---

## Mapped Types

Create new types by transforming properties of existing types.

### Basic Mapped Types

```typescript
interface User {
    name: string;
    age: number;
    email: string;
}

// Make all properties optional
type PartialUser = {
    [K in keyof User]?: User[K];
};

// Make all properties readonly
type ReadonlyUser = {
    readonly [K in keyof User]: User[K];
};

// Make all properties nullable
type NullableUser = {
    [K in keyof User]: User[K] | null;
};
```

### Generic Mapped Types

```typescript
// Generic Partial (like built-in)
type MyPartial<T> = {
    [K in keyof T]?: T[K];
};

// Generic Required (like built-in)
type MyRequired<T> = {
    [K in keyof T]-?: T[K];  // -? removes optionality
};

// Generic Readonly (like built-in)
type MyReadonly<T> = {
    readonly [K in keyof T]: T[K];
};

// Mutable (remove readonly)
type Mutable<T> = {
    -readonly [K in keyof T]: T[K];
};
```

### Key Remapping

```typescript
// Add prefix to keys
type Getters<T> = {
    [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface User {
    name: string;
    age: number;
}

type UserGetters = Getters<User>;
// { getName: () => string; getAge: () => number; }

// Filter keys by type
type OnlyStrings<T> = {
    [K in keyof T as T[K] extends string ? K : never]: T[K];
};

interface Mixed {
    name: string;
    age: number;
    email: string;
}

type StringProps = OnlyStrings<Mixed>;
// { name: string; email: string; }
```

---

## Conditional Types

Types that depend on conditions.

### Basic Syntax

```typescript
// T extends U ? X : Y
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;   // true
type B = IsString<number>;   // false
type C = IsString<"hello">;  // true
```

### Distributive Conditional Types

```typescript
// Distributes over union types
type ToArray<T> = T extends unknown ? T[] : never;

type Arr = ToArray<string | number>;  // string[] | number[]

// Exclude from union
type MyExclude<T, U> = T extends U ? never : T;

type WithoutString = MyExclude<string | number | boolean, string>;
// number | boolean

// Extract from union
type MyExtract<T, U> = T extends U ? T : never;

type OnlyString = MyExtract<string | number | boolean, string>;
// string
```

### Conditional Type Constraints

```typescript
// Flatten array types
type Flatten<T> = T extends Array<infer U> ? U : T;

type A = Flatten<string[]>;     // string
type B = Flatten<number[][]>;   // number[]
type C = Flatten<string>;       // string (not an array)

// Get return type
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

function foo(): string { return "hello"; }
type FooReturn = MyReturnType<typeof foo>;  // string
```

---

## Template Literal Types

Build string types from other types.

### Basic Template Literals

```typescript
// String concatenation at type level
type Greeting = `Hello, ${string}`;
const g1: Greeting = "Hello, World";   // OK
const g2: Greeting = "Hi, World";      // Error

// From union types
type Direction = "left" | "right" | "up" | "down";
type EventName = `on${Capitalize<Direction>}`;
// "onLeft" | "onRight" | "onUp" | "onDown"
```

### Practical Examples

```typescript
// CSS units
type Unit = "px" | "em" | "rem" | "%";
type Length = `${number}${Unit}`;

const width: Length = "100px";   // OK
const height: Length = "50%";    // OK
// const bad: Length = "100";    // Error

// Event handlers
type Event = "click" | "focus" | "blur";
type Handler = `on${Capitalize<Event>}`;  // "onClick" | "onFocus" | "onBlur"

// Dot notation paths
type Paths<T, Prefix extends string = ""> = {
    [K in keyof T]: K extends string
        ? T[K] extends object
            ? Paths<T[K], `${Prefix}${K}.`>
            : `${Prefix}${K}`
        : never;
}[keyof T];
```

### Intrinsic String Manipulation

```typescript
// Built-in type transformations
type Upper = Uppercase<"hello">;      // "HELLO"
type Lower = Lowercase<"HELLO">;      // "hello"
type Cap = Capitalize<"hello">;       // "Hello"
type Uncap = Uncapitalize<"Hello">;   // "hello"

// Combine with template literals
type Getters<T> = {
    [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
```

---

## The infer Keyword

Extract types from other types within conditional types.

### Basic Usage

```typescript
// Infer element type of array
type ElementOf<T> = T extends (infer E)[] ? E : never;

type A = ElementOf<string[]>;    // string
type B = ElementOf<number[]>;    // number
type C = ElementOf<string>;      // never

// Infer return type
type ReturnOf<T> = T extends (...args: any[]) => infer R ? R : never;

type Fn = (x: number) => string;
type R = ReturnOf<Fn>;           // string

// Infer parameters
type ParamsOf<T> = T extends (...args: infer P) => any ? P : never;

type P = ParamsOf<(a: number, b: string) => void>;  // [number, string]
```

### Multiple Inferences

```typescript
// First and rest of tuple
type First<T extends any[]> = T extends [infer F, ...any[]] ? F : never;
type Rest<T extends any[]> = T extends [any, ...infer R] ? R : never;

type Tuple = [string, number, boolean];
type F = First<Tuple>;    // string
type R = Rest<Tuple>;     // [number, boolean]

// Last element
type Last<T extends any[]> = T extends [...any[], infer L] ? L : never;
type L = Last<Tuple>;     // boolean
```

### Promise Unwrapping

```typescript
// Built-in Awaited<T> does this
type UnwrapPromise<T> = T extends Promise<infer U>
    ? UnwrapPromise<U>  // Recursive for nested promises
    : T;

type A = UnwrapPromise<Promise<string>>;           // string
type B = UnwrapPromise<Promise<Promise<number>>>;  // number
type C = UnwrapPromise<string>;                    // string
```

---

## Type Predicates

Create custom type guards with `is` keyword.

### Basic Type Predicates

```typescript
interface Fish {
    swim(): void;
}

interface Bird {
    fly(): void;
}

// Type predicate function
function isFish(animal: Fish | Bird): animal is Fish {
    return (animal as Fish).swim !== undefined;
}

function move(animal: Fish | Bird): void {
    if (isFish(animal)) {
        animal.swim();  // TypeScript knows it's Fish
    } else {
        animal.fly();   // TypeScript knows it's Bird
    }
}
```

### Array Filtering

```typescript
// Filter with type narrowing
interface User {
    id: number;
    name: string;
}

function isUser(value: unknown): value is User {
    return (
        typeof value === "object" &&
        value !== null &&
        "id" in value &&
        "name" in value
    );
}

const mixed: unknown[] = [
    { id: 1, name: "Alice" },
    "not a user",
    { id: 2, name: "Bob" },
    null,
];

// Filter returns User[]
const users = mixed.filter(isUser);
// users: User[]
```

### Assertion Functions

```typescript
// Assert function - throws if condition fails
function assertIsString(value: unknown): asserts value is string {
    if (typeof value !== "string") {
        throw new Error("Value is not a string");
    }
}

function process(value: unknown): void {
    assertIsString(value);
    // value is string from here on
    console.log(value.toUpperCase());
}
```

---

## The satisfies Operator

TypeScript 5.0+ feature for type validation without widening.

### Problem: Type Annotations Widen

```typescript
// With type annotation, we lose literal types
interface RGB { r: number; g: number; b: number; }
type Color = RGB | string;

const colors: Record<string, Color> = {
    red: "#ff0000",
    green: { r: 0, g: 255, b: 0 },
};

// Problem: TypeScript doesn't know red is string
colors.red.toUpperCase();  // Error: Property 'toUpperCase' does not exist on type 'Color'
```

### Solution: satisfies

```typescript
// With satisfies, we validate AND keep specific types
const colors = {
    red: "#ff0000",
    green: { r: 0, g: 255, b: 0 },
} satisfies Record<string, Color>;

// TypeScript knows red is string
colors.red.toUpperCase();  // OK!

// TypeScript knows green is RGB
colors.green.r;  // OK!
```

### Use Cases

```typescript
// 1. Validate config while keeping literal types
const config = {
    endpoint: "https://api.example.com",
    port: 3000,
    debug: true,
} satisfies Record<string, string | number | boolean>;

config.port.toFixed(2);  // OK - port is number

// 2. Exhaustive object keys
type Routes = "home" | "about" | "contact";

const routes = {
    home: "/",
    about: "/about",
    contact: "/contact",
} satisfies Record<Routes, string>;

// 3. Validate array contents
const colors = ["red", "green", "blue"] satisfies string[];
```

---

## Common Interview Patterns

### Type-Safe Event Handlers

```typescript
type EventMap = {
    click: { x: number; y: number };
    keypress: { key: string };
    scroll: { position: number };
};

type EventHandler<K extends keyof EventMap> = (event: EventMap[K]) => void;

function on<K extends keyof EventMap>(
    eventName: K,
    handler: EventHandler<K>
): void {
    // Implementation
}

on("click", event => {
    console.log(event.x, event.y);  // Typed!
});

on("keypress", event => {
    console.log(event.key);  // Typed!
});
```

### DeepPartial

```typescript
type DeepPartial<T> = T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

interface Config {
    server: {
        host: string;
        port: number;
    };
    logging: {
        level: string;
        format: string;
    };
}

// All nested properties are optional
type PartialConfig = DeepPartial<Config>;
```

### NonNullable Deep

```typescript
type DeepRequired<T> = T extends object
    ? { [K in keyof T]-?: DeepRequired<NonNullable<T[K]>> }
    : NonNullable<T>;
```

### Tuple to Union

```typescript
type TupleToUnion<T extends readonly unknown[]> = T[number];

const fruits = ["apple", "banana", "cherry"] as const;
type Fruit = TupleToUnion<typeof fruits>;  // "apple" | "banana" | "cherry"
```

### Object Entries Type

```typescript
type Entries<T> = {
    [K in keyof T]: [K, T[K]];
}[keyof T];

interface User {
    name: string;
    age: number;
}

type UserEntries = Entries<User>;
// ["name", string] | ["age", number]
```

### Type-Safe Pick by Value Type

```typescript
type PickByType<T, U> = {
    [K in keyof T as T[K] extends U ? K : never]: T[K];
};

interface Mixed {
    name: string;
    age: number;
    active: boolean;
    email: string;
}

type StringProps = PickByType<Mixed, string>;
// { name: string; email: string; }

type NumberProps = PickByType<Mixed, number>;
// { age: number; }
```

---

## Quick Reference

### Type Operators

| Operator | Purpose | Example |
|----------|---------|---------|
| `&` | Intersection | `A & B` |
| `\|` | Union | `A \| B` |
| `keyof` | Get keys | `keyof User` |
| `typeof` | Get type of value | `typeof user` |
| `extends` | Constraint/conditional | `T extends string` |
| `infer` | Extract type | `infer R` |
| `is` | Type predicate | `x is string` |
| `as` | Type assertion | `x as string` |
| `satisfies` | Validate type | `x satisfies T` |
| `as const` | Const assertion | `[1, 2] as const` |

### Common Utility Types

| Type | Purpose |
|------|---------|
| `Partial<T>` | All properties optional |
| `Required<T>` | All properties required |
| `Readonly<T>` | All properties readonly |
| `Pick<T, K>` | Select properties |
| `Omit<T, K>` | Exclude properties |
| `Record<K, T>` | Construct object type |
| `Exclude<T, U>` | Remove from union |
| `Extract<T, U>` | Keep from union |
| `NonNullable<T>` | Remove null/undefined |
| `ReturnType<T>` | Function return type |
| `Parameters<T>` | Function parameter types |
| `Awaited<T>` | Unwrap Promise |
