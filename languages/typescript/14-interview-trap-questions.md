# TypeScript Interview Trap Questions

> Master the tricky questions that test deep TypeScript understanding

Interviewers love asking questions that test whether you truly understand TypeScript or just use it superficially. This guide covers the most common trap questions, tricky behaviors, and nuanced concepts.

---

## Table of Contents

1. [type vs interface](#type-vs-interface)
2. [unknown vs any vs never](#unknown-vs-any-vs-never)
3. [Type Coercion and Equality](#type-coercion-and-equality)
4. [Optional Chaining vs Nullish Coalescing](#optional-chaining-vs-nullish-coalescing)
5. [Generics Gotchas](#generics-gotchas)
6. [Enums Pitfalls](#enums-pitfalls)
7. [Declaration Merging](#declaration-merging)
8. [The this Keyword](#the-this-keyword)
9. [satisfies vs Type Annotation](#satisfies-vs-type-annotation)
10. [The infer Keyword](#the-infer-keyword)
11. [Readonly and Immutability](#readonly-and-immutability)
12. [Type Narrowing Edge Cases](#type-narrowing-edge-cases)
13. [Module Augmentation](#module-augmentation)
14. [Variance: Covariance and Contravariance](#variance-covariance-and-contravariance)
15. [Miscellaneous Traps](#miscellaneous-traps)
16. [Quick Reference](#quick-reference)

---

## type vs interface

### Trap: "They're basically the same"

**Wrong answer:** "Use whichever you prefer, they're interchangeable."

**Correct answer:** They have important differences:

### Declaration Merging

```typescript
// Interfaces CAN merge
interface User {
    name: string;
}

interface User {
    age: number;
}

// Result: User has both name and age
const user: User = { name: "Alice", age: 30 };

// Type aliases CANNOT merge
type Person = {
    name: string;
};

type Person = {  // Error: Duplicate identifier 'Person'
    age: number;
};
```

### Extending vs Intersection

```typescript
// Interface uses extends
interface Animal {
    name: string;
}

interface Dog extends Animal {
    breed: string;
}

// Type uses intersection
type Animal = {
    name: string;
};

type Dog = Animal & {
    breed: string;
};

// Both work, but error messages differ
// Interface: "Property 'x' is missing in type..."
// Type intersection: Shows the full intersection type in errors
```

### Computed Properties

```typescript
// Type can use computed properties
type Keys = "firstName" | "lastName";

type Person = {
    [K in Keys]: string;  // Mapped type - only in type alias
};

// Interface cannot use mapped types directly
// interface Person {
//     [K in Keys]: string;  // Error!
// }
```

### Union Types

```typescript
// Type can be a union
type Result = Success | Failure;
type ID = string | number;

// Interface cannot be a union
// interface Result = Success | Failure;  // Syntax error
```

### Performance

```typescript
// Interface: Faster type checking (cached by name)
interface User {
    id: string;
    name: string;
}

// Type: Computed each time (especially with intersections)
type User = BaseUser & WithTimestamps & WithPermissions;
// Each intersection is evaluated
```

### When to Use Which

| Use `interface` when... | Use `type` when... |
|------------------------|-------------------|
| Defining object shapes | Union types needed |
| Want declaration merging | Mapped types needed |
| Extending other interfaces | Tuple types needed |
| Public API definitions | Complex type operations |
| Class implementations | Utility type compositions |

---

## unknown vs any vs never

### Trap: "unknown is just a stricter any"

**Partial truth, but missing key behavior:**

### `any` - Opt Out

```typescript
// any: TypeScript doesn't check anything
let value: any = "hello";
value.foo.bar.baz();  // No error! (crashes at runtime)
value = 42;
value.toUpperCase();  // No error! (crashes at runtime)

// any is contagious
const result = value + 1;  // result is any
```

### `unknown` - Type-Safe Any

```typescript
// unknown: Must narrow before use
let value: unknown = "hello";

// value.toUpperCase();  // Error: Object is of type 'unknown'
// value + 1;            // Error: Object is of type 'unknown'

// Must narrow first
if (typeof value === "string") {
    value.toUpperCase();  // OK - value is string
}

// unknown is NOT contagious
const result: unknown = value;  // Still unknown
```

### `never` - Impossible Type

```typescript
// never: No value can have this type
function throwError(msg: string): never {
    throw new Error(msg);  // Function never returns
}

function infiniteLoop(): never {
    while (true) {}  // Never terminates
}

// never in exhaustiveness checking
type Shape = "circle" | "square";

function getArea(shape: Shape): number {
    switch (shape) {
        case "circle":
            return Math.PI;
        case "square":
            return 1;
        default:
            // If we add "triangle" to Shape, this errors
            const _exhaustive: never = shape;
            return _exhaustive;
    }
}

// never in conditional types
type ExtractString<T> = T extends string ? T : never;

type Result = ExtractString<string | number>;  // string
// number becomes never, never disappears from union
```

### The Hierarchy

```typescript
// Type hierarchy:
// unknown (top) - all types assignable TO unknown
// any (escape hatch) - disables checking
// specific types (string, number, etc.)
// never (bottom) - assignable TO all types, nothing assignable to it

let u: unknown;
let a: any;
let s: string;
let n: never;

// Assignments to unknown
u = "hello";  // OK
u = 42;       // OK
u = {};       // OK

// Assignments from unknown
// s = u;     // Error!
s = u as string;  // OK (assertion)

// never is assignable to anything
function getDefault(): never {
    throw new Error();
}
s = getDefault();  // OK - never is bottom type

// Nothing is assignable to never (except never)
// n = "hello";  // Error!
// n = undefined; // Error!
```

---

## Type Coercion and Equality

### Trap: "TypeScript prevents type coercion bugs"

**Wrong!** TypeScript doesn't change JavaScript runtime behavior.

### `==` vs `===`

```typescript
// TypeScript allows this (types are compatible):
const a: number | string = 5;
const b: number | string = "5";

if (a == b) {
    // TypeScript doesn't warn, but this is true due to coercion!
    console.log("Equal with ==");
}

if (a === b) {
    // This is false (different types)
    console.log("Equal with ===");
}

// TypeScript DOES help with obviously wrong comparisons:
const num = 5;
const str = "5";
// if (num === str) {}  // Error: This comparison appears unintentional
```

### Truthy/Falsy Narrowing

```typescript
function process(value: string | null) {
    if (value) {
        // value is string here
        console.log(value.toUpperCase());
    }
}

// TRAP: Empty string is falsy!
process("");  // Doesn't log anything

// Better:
function processBetter(value: string | null) {
    if (value !== null) {
        // Now empty string is handled
        console.log(value.toUpperCase());  // Logs ""
    }
}
```

### Object Equality

```typescript
// Objects compared by reference
const obj1 = { a: 1 };
const obj2 = { a: 1 };

console.log(obj1 === obj2);  // false!
console.log(obj1 == obj2);   // false!

// TypeScript doesn't help here
type Config = { value: number };
const config1: Config = { value: 1 };
const config2: Config = { value: 1 };

// Both comparisons are "valid" to TypeScript
if (config1 === config2) {  // Always false, but no warning
    console.log("Same config");
}
```

---

## Optional Chaining vs Nullish Coalescing

### Trap: Confusing `?.` with `??` with `||`

### Optional Chaining (`?.`)

```typescript
const user: { profile?: { name?: string } } | null = null;

// Without optional chaining
const name1 = user && user.profile && user.profile.name;

// With optional chaining
const name2 = user?.profile?.name;

// TRAP: Returns undefined, not the last truthy value
const obj = { a: { b: 0 } };
console.log(obj?.a?.b);  // 0 (not undefined)
console.log(obj?.a?.c);  // undefined
console.log(obj?.x?.y);  // undefined (short-circuits)
```

### Nullish Coalescing (`??`)

```typescript
// Only null and undefined trigger fallback
const value1 = null ?? "default";      // "default"
const value2 = undefined ?? "default"; // "default"
const value3 = 0 ?? "default";         // 0 (not "default"!)
const value4 = "" ?? "default";        // "" (not "default"!)
const value5 = false ?? "default";     // false (not "default"!)

// Compare with ||
const value6 = 0 || "default";         // "default" (0 is falsy)
const value7 = "" || "default";        // "default" ('' is falsy)
const value8 = false || "default";     // "default" (false is falsy)
```

### Combining Them

```typescript
interface User {
    settings?: {
        theme?: string;
        fontSize?: number;
    };
}

function getTheme(user: User | null): string {
    // Chain then coalesce
    return user?.settings?.theme ?? "light";
}

// TRAP: Operator precedence
// ?? has lower precedence than ||
// const bad = a || b ?? c;  // Error: Cannot mix || and ?? without parens

const correct = (a || b) ?? c;  // OK
const alsoCorrect = a || (b ?? c);  // OK
```

### Common Mistake

```typescript
// TRAP: Using ?? when you wanted ||
function getPort(env: string | undefined): number {
    // If env is "", parseInt returns NaN
    return parseInt(env ?? "3000");
}

getPort("");  // NaN, not 3000!

// Fix: Check for empty string too
function getPortFixed(env: string | undefined): number {
    return parseInt(env || "3000");  // "" is falsy, falls back
}
```

---

## Generics Gotchas

### Trap: "Generic defaults work like function defaults"

```typescript
// Function defaults use the passed value
function greet(name = "World") {
    return `Hello, ${name}`;
}
greet();        // Uses default
greet("Alice"); // Uses passed value

// Generic defaults DON'T infer from arguments
function wrap<T = string>(value: T): { value: T } {
    return { value };
}

const a = wrap("hello");  // T is inferred as string (from argument)
const b = wrap(42);       // T is inferred as number (from argument)
const c = wrap<number>(42); // T is explicitly number

// Default is ONLY used when T can't be inferred AND isn't specified
function createArray<T = string>(): T[] {
    return [];
}

const arr = createArray();  // T = string (uses default)
```

### Constraint Inference

```typescript
// TRAP: Constraints don't narrow the inferred type
function getLength<T extends { length: number }>(item: T): number {
    return item.length;
}

const len = getLength("hello");  // T is "hello", not { length: number }

// But the constraint still applies:
// getLength(42);  // Error: number doesn't have length
```

### extends in Different Contexts

```typescript
// In interface: inheritance
interface Animal { name: string }
interface Dog extends Animal { breed: string }

// In generic constraint: "must be assignable to"
function process<T extends Animal>(animal: T) {}

// In conditional type: "is assignable to"
type IsString<T> = T extends string ? true : false;
type A = IsString<"hello">;  // true
type B = IsString<number>;   // false

// TRAP: Distributive behavior
type ToArray<T> = T extends unknown ? T[] : never;
type C = ToArray<string | number>;  // string[] | number[] (not (string | number)[])

// Prevent distribution with tuple
type ToArrayNonDist<T> = [T] extends [unknown] ? T[] : never;
type D = ToArrayNonDist<string | number>;  // (string | number)[]
```

---

## Enums Pitfalls

### Trap: "Enums are just like union types"

### Numeric Enum Reverse Mapping

```typescript
enum Direction {
    Up = 0,
    Down = 1,
    Left = 2,
    Right = 3,
}

// Numeric enums have REVERSE MAPPING
console.log(Direction.Up);    // 0
console.log(Direction[0]);    // "Up" (reverse mapping!)

// This can cause issues:
function isValidDirection(value: number): boolean {
    return value in Direction;  // True for 0, 1, 2, 3... and "Up", "Down"!
}

isValidDirection(0);     // true
isValidDirection(100);   // false
// But also:
console.log("Up" in Direction);  // true!
```

### String Enums - No Reverse Mapping

```typescript
enum Status {
    Active = "ACTIVE",
    Inactive = "INACTIVE",
}

console.log(Status.Active);      // "ACTIVE"
console.log(Status["ACTIVE"]);   // undefined! (no reverse mapping)

// Safer, but still has issues
```

### const enum

```typescript
const enum Color {
    Red = "RED",
    Green = "GREEN",
    Blue = "BLUE",
}

// const enum is inlined at compile time
const myColor = Color.Red;  // Becomes: const myColor = "RED"

// TRAP: Can't use at runtime
// Object.values(Color);  // Error: 'const' enums can only be used in property access

// TRAP: With isolatedModules, const enum behaves differently
```

### Better Alternative: `as const`

```typescript
// Prefer const object for most cases
const Direction = {
    Up: "UP",
    Down: "DOWN",
    Left: "LEFT",
    Right: "RIGHT",
} as const;

type Direction = typeof Direction[keyof typeof Direction];
// "UP" | "DOWN" | "LEFT" | "RIGHT"

// Benefits:
// - No runtime code generated
// - Works with isolatedModules
// - Full object available at runtime
// - Type-safe string literals
```

---

## Declaration Merging

### Trap: "Only interfaces merge"

**Wrong!** Several things merge:

### Interface Merging

```typescript
interface Box {
    width: number;
}

interface Box {
    height: number;
}

// Merged:
const box: Box = { width: 10, height: 20 };

// TRAP: Property types must be identical
interface Bad {
    value: string;
}

interface Bad {
    value: number;  // Error: Subsequent property declarations must have same type
}
```

### Namespace Merging

```typescript
namespace Validation {
    export function isEmail(s: string): boolean {
        return s.includes("@");
    }
}

namespace Validation {
    export function isPhone(s: string): boolean {
        return /^\d{10}$/.test(s);
    }
}

// Both functions available:
Validation.isEmail("test@example.com");
Validation.isPhone("1234567890");
```

### Class + Namespace Merging

```typescript
class Album {
    label: Album.AlbumLabel;

    constructor(label: Album.AlbumLabel) {
        this.label = label;
    }
}

namespace Album {
    export interface AlbumLabel {
        name: string;
    }
}

const album = new Album({ name: "EMI" });
```

### Function + Namespace Merging

```typescript
function buildLabel(name: string): string {
    return buildLabel.prefix + name + buildLabel.suffix;
}

namespace buildLabel {
    export let prefix = "Hello, ";
    export let suffix = "!";
}

console.log(buildLabel("World"));  // "Hello, World!"
```

### TRAP: Type Aliases Don't Merge

```typescript
type Point = { x: number };
type Point = { y: number };  // Error: Duplicate identifier
```

---

## The this Keyword

### Trap: "Arrow functions fix all this problems"

### Arrow Functions Capture `this`

```typescript
class Timer {
    seconds = 0;

    // BAD: Regular function loses 'this'
    startBad() {
        setInterval(function() {
            this.seconds++;  // 'this' is undefined or window!
        }, 1000);
    }

    // GOOD: Arrow function captures 'this'
    startGood() {
        setInterval(() => {
            this.seconds++;  // 'this' is Timer instance
        }, 1000);
    }
}
```

### Class Method Binding

```typescript
class Button {
    label = "Click me";

    // Method - 'this' depends on how it's called
    handleClick() {
        console.log(this.label);
    }

    // Arrow property - 'this' always bound
    handleClickArrow = () => {
        console.log(this.label);
    };
}

const btn = new Button();

// Direct call - works
btn.handleClick();  // "Click me"

// Callback - loses 'this'
const handler = btn.handleClick;
handler();  // undefined (or error in strict mode)

// Arrow property always works
const arrowHandler = btn.handleClickArrow;
arrowHandler();  // "Click me"

// Alternative: bind in constructor
class ButtonWithBind {
    label = "Click me";

    constructor() {
        this.handleClick = this.handleClick.bind(this);
    }

    handleClick() {
        console.log(this.label);
    }
}
```

### `this` Parameter in Functions

```typescript
// Explicitly type 'this'
interface User {
    name: string;
    greet(this: User): string;
}

const user: User = {
    name: "Alice",
    greet() {
        return `Hello, ${this.name}`;
    },
};

user.greet();  // OK

const greet = user.greet;
// greet();  // Error: 'this' context of type 'void' is not assignable
```

### `ThisType<T>`

```typescript
// Helper type for object methods
type ObjectWithMethods = {
    data: { value: number };
    methods: {
        increment(): void;
        getValue(): number;
    };
};

// ThisType sets 'this' for methods
type Methods = ThisType<{ data: { value: number } }>;

const obj: ObjectWithMethods & Methods = {
    data: { value: 0 },
    methods: {
        increment() {
            this.data.value++;  // 'this' is typed correctly
        },
        getValue() {
            return this.data.value;
        },
    },
};
```

---

## satisfies vs Type Annotation

### Trap: "They do the same thing"

### Type Annotation Widens

```typescript
type Colors = Record<string, string | number[]>;

// With type annotation: type is widened
const colorsAnnotated: Colors = {
    red: "#ff0000",
    green: [0, 255, 0],
};

colorsAnnotated.red.toUpperCase();
// Error: Property 'toUpperCase' does not exist on type 'string | number[]'

// TypeScript sees: { red: string | number[], green: string | number[] }
```

### satisfies Validates Without Widening

```typescript
// With satisfies: validates but keeps specific types
const colorsSatisfies = {
    red: "#ff0000",
    green: [0, 255, 0],
} satisfies Colors;

colorsSatisfies.red.toUpperCase();  // OK! TypeScript knows red is string
colorsSatisfies.green.map(n => n * 2);  // OK! TypeScript knows green is number[]

// TypeScript sees: { red: string, green: number[] }
```

### Practical Examples

```typescript
// Config validation
const config = {
    apiUrl: "https://api.example.com",
    timeout: 5000,
    retries: 3,
} satisfies Record<string, string | number>;

// Now apiUrl is known to be string
const url = new URL(config.apiUrl);  // OK!

// Route definitions
type Routes = Record<string, { path: string; auth?: boolean }>;

const routes = {
    home: { path: "/" },
    dashboard: { path: "/dashboard", auth: true },
    profile: { path: "/profile", auth: true },
} satisfies Routes;

// TypeScript knows exact keys exist
routes.home;      // OK
routes.dashboard; // OK
// routes.unknown;  // Error: Property 'unknown' does not exist
```

---

## The infer Keyword

### Trap: "`infer` works anywhere in conditional types"

### Basic Usage

```typescript
// infer extracts a type within conditional
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

type Fn = () => string;
type R = ReturnType<Fn>;  // string

// How it works:
// 1. Check if T extends (...args: any[]) => [something]
// 2. If yes, capture that [something] as R
// 3. Return R
```

### TRAP: `infer` Only in True Branch

```typescript
// BAD: Can't use infer in false branch
type Bad<T> = T extends string ? T : infer U;  // Error!

// infer must be in the extends clause
type ExtractArray<T> = T extends (infer U)[] ? U : never;

// Multiple infers
type First<T> = T extends [infer F, ...any[]] ? F : never;
type Rest<T> = T extends [any, ...infer R] ? R : never;

type Tuple = [string, number, boolean];
type F = First<Tuple>;  // string
type R = Rest<Tuple>;   // [number, boolean]
```

### infer with Constraints

```typescript
// TypeScript 4.7+: Constraints on inferred types
type GetString<T> = T extends { value: infer V extends string } ? V : never;

type A = GetString<{ value: "hello" }>;  // "hello"
type B = GetString<{ value: 42 }>;       // never (42 doesn't extend string)
```

### Common Patterns

```typescript
// Extract function parameter types
type Parameters<T> = T extends (...args: infer P) => any ? P : never;

// Extract promise value
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

// Extract array element
type ElementType<T> = T extends (infer E)[] ? E : never;

// Extract property value
type PropertyType<T, K extends keyof T> = T extends { [P in K]: infer V } ? V : never;
```

---

## Readonly and Immutability

### Trap: "`Readonly<T>` makes everything immutable"

### Shallow Readonly

```typescript
interface User {
    name: string;
    settings: {
        theme: string;
        notifications: boolean;
    };
}

type ReadonlyUser = Readonly<User>;

const user: ReadonlyUser = {
    name: "Alice",
    settings: { theme: "dark", notifications: true },
};

// user.name = "Bob";  // Error: Cannot assign to 'name' because it is read-only

// BUT nested objects are still mutable!
user.settings.theme = "light";  // No error! Settings object itself isn't readonly
```

### Deep Readonly

```typescript
// Custom DeepReadonly
type DeepReadonly<T> = T extends (infer U)[]
    ? ReadonlyArray<DeepReadonly<U>>
    : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

type DeepReadonlyUser = DeepReadonly<User>;

const user: DeepReadonlyUser = {
    name: "Alice",
    settings: { theme: "dark", notifications: true },
};

// user.name = "Bob";           // Error
// user.settings.theme = "light"; // Error - now it's deep readonly!
```

### `as const` for Deep Readonly

```typescript
const config = {
    api: {
        url: "https://api.example.com",
        timeout: 5000,
    },
    features: ["auth", "logging"],
} as const;

// Type: {
//     readonly api: {
//         readonly url: "https://api.example.com";
//         readonly timeout: 5000;
//     };
//     readonly features: readonly ["auth", "logging"];
// }

// config.api.url = "new";  // Error
// config.features.push("new");  // Error: Property 'push' does not exist on readonly array
```

### TRAP: Runtime Mutability

```typescript
// TypeScript's readonly is compile-time only!
const obj: Readonly<{ x: number }> = { x: 1 };

// At runtime, JavaScript can still mutate:
(obj as any).x = 2;  // Works at runtime!
Object.assign(obj, { x: 3 });  // Also works!

// For true immutability, use Object.freeze:
const frozen = Object.freeze({ x: 1 });
// frozen.x = 2;  // Runtime error in strict mode

// But freeze is also shallow!
const deepObj = Object.freeze({ nested: { value: 1 } });
deepObj.nested.value = 2;  // Works! Nested object not frozen
```

---

## Type Narrowing Edge Cases

### Control Flow Limitations

```typescript
// TypeScript tracks narrowing within control flow
function process(value: string | number) {
    if (typeof value === "string") {
        console.log(value.toUpperCase());  // OK
    }
}

// BUT: Callbacks don't narrow
function processWithCallback(value: string | number) {
    if (typeof value === "string") {
        setTimeout(() => {
            // value.toUpperCase();  // Error! Value might have changed
            // TypeScript doesn't know callback runs after narrowing
        }, 100);
    }
}

// Fix: Store in const
function processFixed(value: string | number) {
    if (typeof value === "string") {
        const str = value;  // Captured as string
        setTimeout(() => {
            console.log(str.toUpperCase());  // OK
        }, 100);
    }
}
```

### Array Method Narrowing

```typescript
const items: (string | number)[] = ["a", 1, "b", 2];

// filter narrows with type predicate
const strings = items.filter((item): item is string => typeof item === "string");
// strings: string[]

// Without type predicate, no narrowing
const strings2 = items.filter(item => typeof item === "string");
// strings2: (string | number)[]  // Still union!
```

### Narrowing with `in`

```typescript
interface Cat { meow(): void }
interface Dog { bark(): void }

function speak(animal: Cat | Dog) {
    if ("meow" in animal) {
        animal.meow();  // animal is Cat
    } else {
        animal.bark();  // animal is Dog
    }
}

// TRAP: 'in' checks for property existence, not truthiness
interface MaybeOptional {
    required: string;
    optional?: string;
}

function check(obj: MaybeOptional | { other: string }) {
    if ("required" in obj) {
        // obj is MaybeOptional
        console.log(obj.required);
    }
}
```

---

## Module Augmentation

### TRAP: Must Export Something

```typescript
// BAD: This won't work
// my-types.d.ts
declare module "some-library" {
    interface SomeInterface {
        newProperty: string;
    }
}
// Nothing exported - this is treated as a script, not a module!

// GOOD: Export something (even if empty)
// my-types.d.ts
declare module "some-library" {
    interface SomeInterface {
        newProperty: string;
    }
}
export {};  // Makes this a module
```

### Global Augmentation

```typescript
// Adding to global types
// global.d.ts
declare global {
    interface Window {
        myApp: {
            version: string;
            config: Record<string, unknown>;
        };
    }

    // Add to Array prototype
    interface Array<T> {
        customMethod(): T[];
    }
}

export {};  // Must export to make it a module

// Usage
window.myApp.version;  // TypeScript knows this exists
```

### Augmenting Third-Party Modules

```typescript
// Extend Express Request
// express.d.ts
import "express";

declare module "express" {
    interface Request {
        user?: {
            id: string;
            role: string;
        };
    }
}

// Now in your code:
import { Request } from "express";

function handler(req: Request) {
    console.log(req.user?.id);  // TypeScript knows about user
}
```

---

## Variance: Covariance and Contravariance

### Trap: "TypeScript arrays are type-safe"

### Covariance (Return Types)

```typescript
// Return types are covariant - can be more specific
interface Animal { name: string }
interface Dog extends Animal { breed: string }

type AnimalGetter = () => Animal;
type DogGetter = () => Dog;

const getDog: DogGetter = () => ({ name: "Buddy", breed: "Lab" });
const getAnimal: AnimalGetter = getDog;  // OK - Dog is more specific than Animal
```

### Contravariance (Parameter Types)

```typescript
// Parameter types are contravariant - can be more general
type AnimalHandler = (animal: Animal) => void;
type DogHandler = (dog: Dog) => void;

const handleAnimal: AnimalHandler = (animal) => console.log(animal.name);
// const handleDog: DogHandler = handleAnimal;  // Error with strictFunctionTypes!

// Why? If handleDog expects a Dog, but handleAnimal only handles Animal,
// handleAnimal might not handle dog-specific properties
```

### TRAP: Arrays are Unsafely Covariant

```typescript
const dogs: Dog[] = [{ name: "Buddy", breed: "Lab" }];
const animals: Animal[] = dogs;  // OK - this is unsafe!

animals.push({ name: "Cat" });  // No breed! But TypeScript allows it

// Now dogs[1] has no breed, but TypeScript thinks it does
console.log(dogs[1].breed);  // Runtime: undefined, TypeScript thinks: string
```

### strictFunctionTypes

```typescript
// tsconfig.json
{
    "compilerOptions": {
        "strictFunctionTypes": true  // Enable contravariance checking
    }
}

// With strictFunctionTypes: true
type Logger = (message: string | number) => void;
type StringLogger = (message: string) => void;

// const logger: Logger = (msg: string) => console.log(msg);  // Error!
// StringLogger is NOT assignable to Logger because string is narrower than string | number
```

---

## Miscellaneous Traps

### Object.keys Returns string[]

```typescript
interface Person {
    name: string;
    age: number;
}

const person: Person = { name: "Alice", age: 30 };

// TRAP: keys is string[], not (keyof Person)[]
const keys = Object.keys(person);  // string[]

keys.forEach(key => {
    // person[key];  // Error: Element implicitly has 'any' type
});

// Fix: Type assertion (if you're sure object has no extra properties)
const typedKeys = Object.keys(person) as (keyof Person)[];
typedKeys.forEach(key => {
    console.log(person[key]);  // OK
});

// Or use type guard
function isKeyOf<T extends object>(key: string, obj: T): key is keyof T & string {
    return key in obj;
}
```

### Empty Object Type `{}`

```typescript
// {} doesn't mean "empty object"!
// It means "any non-nullish value"

const a: {} = "hello";     // OK
const b: {} = 42;          // OK
const c: {} = { x: 1 };    // OK
// const d: {} = null;     // Error
// const e: {} = undefined; // Error

// For "object with no properties", use:
type EmptyObject = Record<string, never>;

// const empty: EmptyObject = { x: 1 };  // Error
const empty: EmptyObject = {};  // OK
```

### Excess Property Checking

```typescript
interface Config {
    name: string;
    value: number;
}

// Direct object literal - excess properties checked
// const config: Config = { name: "test", value: 1, extra: true };  // Error!

// Through variable - no excess check
const obj = { name: "test", value: 1, extra: true };
const config: Config = obj;  // OK! Extra property ignored

// This is intentional - allows structural typing to work
```

### Function Overloads Order

```typescript
// Overloads are checked in order - put specific ones first!

// BAD: General overload first
function bad(x: unknown): unknown;
function bad(x: string): string;
function bad(x: unknown): unknown {
    return x;
}

const result = bad("hello");  // unknown - matched first overload!

// GOOD: Specific overload first
function good(x: string): string;
function good(x: unknown): unknown;
function good(x: unknown): unknown {
    return x;
}

const result2 = good("hello");  // string - matched first overload
```

---

## Quick Reference

### Common Traps Summary

| Question | Trap Answer | Correct Answer |
|----------|-------------|----------------|
| type vs interface? | "Same thing" | Merging, unions, mapped types differ |
| `any` vs `unknown`? | "unknown is stricter any" | unknown requires narrowing |
| `==` vs `===`? | "TypeScript prevents coercion" | Runtime behavior unchanged |
| `??` vs `\|\|`? | "Same thing" | `??` only for null/undefined |
| Readonly deep? | "Yes" | No, it's shallow |
| Enums safe? | "Yes, type-safe" | Reverse mapping, runtime issues |
| `{}` means empty? | "Yes" | No, means non-nullish |
| Arrays covariant? | "Type-safe" | Unsafely covariant |

### Interview Response Tips

1. **Acknowledge complexity** - "It depends on the use case"
2. **Show depth** - Mention edge cases and gotchas
3. **Give examples** - Concrete code beats abstract explanations
4. **Know the "why"** - Understand design decisions
5. **Mention alternatives** - Show you know multiple approaches

### Key Flags to Know

| Flag | Effect |
|------|--------|
| `strict` | Enable all strict checks |
| `strictNullChecks` | null/undefined not assignable to other types |
| `strictFunctionTypes` | Enable parameter contravariance |
| `noImplicitAny` | Error on implied any |
| `exactOptionalPropertyTypes` | Distinguish undefined from missing |
| `noUncheckedIndexedAccess` | Index access may be undefined |
