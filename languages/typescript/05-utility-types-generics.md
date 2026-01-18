# TypeScript Utility Types & Generics

> Master TypeScript's built-in type utilities and generic patterns

---

## Table of Contents

1. [Built-in Utility Types](#built-in-utility-types)
2. [Generic Functions](#generic-functions)
3. [Generic Classes](#generic-classes)
4. [Generic Constraints](#generic-constraints)
5. [Conditional Type Utilities](#conditional-type-utilities)
6. [Creating Custom Utility Types](#creating-custom-utility-types)
7. [Real-World Patterns](#real-world-patterns)
8. [Quick Reference](#quick-reference)

---

## Built-in Utility Types

### Partial\<T\>

Makes all properties optional.

```typescript
interface User {
    name: string;
    age: number;
    email: string;
}

type PartialUser = Partial<User>;
// { name?: string; age?: number; email?: string; }

// Use case: Update function that accepts partial data
function updateUser(id: number, updates: Partial<User>): User {
    const current = getUser(id);
    return { ...current, ...updates };
}

updateUser(1, { name: "Alice" });  // Only update name
```

### Required\<T\>

Makes all properties required.

```typescript
interface Config {
    host?: string;
    port?: number;
    debug?: boolean;
}

type RequiredConfig = Required<Config>;
// { host: string; port: number; debug: boolean; }

// Use case: Ensure all config options are set
function validateConfig(config: Config): RequiredConfig {
    return {
        host: config.host ?? "localhost",
        port: config.port ?? 3000,
        debug: config.debug ?? false,
    };
}
```

### Readonly\<T\>

Makes all properties readonly.

```typescript
interface State {
    count: number;
    items: string[];
}

type ReadonlyState = Readonly<State>;
// { readonly count: number; readonly items: string[]; }

// Use case: Immutable state
function createState(initial: State): ReadonlyState {
    return Object.freeze(initial);
}

const state = createState({ count: 0, items: [] });
// state.count = 1;  // Error: Cannot assign to 'count'
```

### Record\<K, T\>

Creates an object type with keys of type K and values of type T.

```typescript
// String keys
type StringRecord = Record<string, number>;
const counts: StringRecord = { a: 1, b: 2 };

// Literal keys
type Role = "admin" | "user" | "guest";
type Permissions = Record<Role, boolean>;

const permissions: Permissions = {
    admin: true,
    user: true,
    guest: false,
};

// Use case: Lookup table
type StatusCode = 200 | 201 | 400 | 404 | 500;
type StatusMessage = Record<StatusCode, string>;

const messages: StatusMessage = {
    200: "OK",
    201: "Created",
    400: "Bad Request",
    404: "Not Found",
    500: "Internal Server Error",
};
```

### Pick\<T, K\>

Creates a type with only selected properties.

```typescript
interface User {
    id: number;
    name: string;
    email: string;
    password: string;
    createdAt: Date;
}

type PublicUser = Pick<User, "id" | "name" | "email">;
// { id: number; name: string; email: string; }

// Use case: API response (exclude sensitive data)
function getPublicProfile(user: User): PublicUser {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
    };
}
```

### Omit\<T, K\>

Creates a type excluding specified properties.

```typescript
interface User {
    id: number;
    name: string;
    email: string;
    password: string;
}

type UserWithoutPassword = Omit<User, "password">;
// { id: number; name: string; email: string; }

// Use case: Create input (without auto-generated fields)
type CreateUserInput = Omit<User, "id">;
// { name: string; email: string; password: string; }
```

### Exclude\<T, U\>

Removes types from a union.

```typescript
type Status = "pending" | "active" | "archived" | "deleted";

type ActiveStatus = Exclude<Status, "deleted">;
// "pending" | "active" | "archived"

type NonNullableStatus = Exclude<Status | null | undefined, null | undefined>;
// "pending" | "active" | "archived" | "deleted"

// Use case: Filter event types
type Event = "click" | "scroll" | "keypress" | "mousemove";
type KeyboardEvent = Exclude<Event, "click" | "scroll" | "mousemove">;
// "keypress"
```

### Extract\<T, U\>

Extracts types that are assignable to U.

```typescript
type Status = "pending" | "active" | "archived" | "deleted";

type EditableStatus = Extract<Status, "pending" | "active">;
// "pending" | "active"

// Use case: Filter function types
type Mixed = string | number | (() => void) | (() => string);
type Functions = Extract<Mixed, Function>;
// (() => void) | (() => string)
```

### NonNullable\<T\>

Removes null and undefined.

```typescript
type MaybeString = string | null | undefined;

type DefiniteString = NonNullable<MaybeString>;
// string

// Use case: After null check
function process(value: string | null | undefined): void {
    if (value != null) {
        const definite: NonNullable<typeof value> = value;
        console.log(definite.toUpperCase());
    }
}
```

### ReturnType\<T\>

Extracts the return type of a function.

```typescript
function createUser(name: string, age: number) {
    return { id: Math.random(), name, age, createdAt: new Date() };
}

type User = ReturnType<typeof createUser>;
// { id: number; name: string; age: number; createdAt: Date; }

// Use case: Infer types from factory functions
const factories = {
    user: (name: string) => ({ type: "user" as const, name }),
    admin: (name: string) => ({ type: "admin" as const, name, isAdmin: true }),
};

type UserResult = ReturnType<typeof factories.user>;
type AdminResult = ReturnType<typeof factories.admin>;
```

### Parameters\<T\>

Extracts parameter types as a tuple.

```typescript
function greet(name: string, age: number, active: boolean): string {
    return `${name} is ${age}`;
}

type GreetParams = Parameters<typeof greet>;
// [string, number, boolean]

// Use case: Wrapper functions
function logged<T extends (...args: any[]) => any>(
    fn: T,
    ...args: Parameters<T>
): ReturnType<T> {
    console.log("Calling with:", args);
    return fn(...args);
}
```

### Awaited\<T\>

Unwraps Promise types.

```typescript
type P1 = Awaited<Promise<string>>;
// string

type P2 = Awaited<Promise<Promise<number>>>;
// number (recursively unwrapped)

// Use case: Async function result types
async function fetchUser(): Promise<{ name: string }> {
    return { name: "Alice" };
}

type UserData = Awaited<ReturnType<typeof fetchUser>>;
// { name: string }
```

### InstanceType\<T\>

Gets the instance type of a constructor function.

```typescript
class User {
    constructor(public name: string, public age: number) {}
}

type UserInstance = InstanceType<typeof User>;
// User

// Use case: Factory functions
function createInstance<T extends new (...args: any[]) => any>(
    Constructor: T,
    ...args: ConstructorParameters<T>
): InstanceType<T> {
    return new Constructor(...args);
}

const user = createInstance(User, "Alice", 30);
```

---

## Generic Functions

### Basic Generic Function

```typescript
// Type parameter T
function identity<T>(value: T): T {
    return value;
}

// TypeScript infers T from argument
const str = identity("hello");    // string
const num = identity(42);          // number

// Explicit type parameter
const explicit = identity<string>("hello");
```

### Multiple Type Parameters

```typescript
function pair<T, U>(first: T, second: U): [T, U] {
    return [first, second];
}

const p = pair("hello", 42);  // [string, number]

// Swap
function swap<T, U>(tuple: [T, U]): [U, T] {
    return [tuple[1], tuple[0]];
}
```

### Generic Array Functions

```typescript
function first<T>(arr: T[]): T | undefined {
    return arr[0];
}

function last<T>(arr: T[]): T | undefined {
    return arr[arr.length - 1];
}

function map<T, U>(arr: T[], fn: (item: T) => U): U[] {
    return arr.map(fn);
}

function filter<T>(arr: T[], predicate: (item: T) => boolean): T[] {
    return arr.filter(predicate);
}

function reduce<T, U>(arr: T[], fn: (acc: U, item: T) => U, initial: U): U {
    return arr.reduce(fn, initial);
}
```

### Generic with Callbacks

```typescript
function transform<T, U>(
    value: T,
    transformer: (input: T) => U
): U {
    return transformer(value);
}

const result = transform(42, n => n.toString());  // string
```

---

## Generic Classes

### Basic Generic Class

```typescript
class Container<T> {
    private value: T;

    constructor(value: T) {
        this.value = value;
    }

    get(): T {
        return this.value;
    }

    set(value: T): void {
        this.value = value;
    }
}

const strContainer = new Container("hello");
const numContainer = new Container(42);
```

### Generic Stack

```typescript
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
}

const stack = new Stack<number>();
stack.push(1);
stack.push(2);
stack.pop();  // 2
```

### Generic Map Wrapper

```typescript
class TypedMap<K, V> {
    private map = new Map<K, V>();

    set(key: K, value: V): void {
        this.map.set(key, value);
    }

    get(key: K): V | undefined {
        return this.map.get(key);
    }

    getOrDefault(key: K, defaultValue: V): V {
        return this.map.get(key) ?? defaultValue;
    }

    has(key: K): boolean {
        return this.map.has(key);
    }
}
```

---

## Generic Constraints

### extends Constraint

```typescript
// T must have a length property
function logLength<T extends { length: number }>(arg: T): void {
    console.log(arg.length);
}

logLength("hello");     // OK: string has length
logLength([1, 2, 3]);   // OK: array has length
// logLength(42);       // Error: number doesn't have length

// T must be an object
function keys<T extends object>(obj: T): (keyof T)[] {
    return Object.keys(obj) as (keyof T)[];
}
```

### keyof Constraint

```typescript
// K must be a key of T
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key];
}

const user = { name: "Alice", age: 30 };
const name = getProperty(user, "name");  // string
const age = getProperty(user, "age");    // number
// getProperty(user, "invalid");          // Error
```

### Multiple Constraints

```typescript
interface Printable {
    print(): void;
}

interface Serializable {
    serialize(): string;
}

// T must implement both interfaces
function processItem<T extends Printable & Serializable>(item: T): void {
    item.print();
    const json = item.serialize();
}
```

### Constructor Constraint

```typescript
// T must be constructable
type Constructor<T = {}> = new (...args: any[]) => T;

function createInstance<T>(ctor: Constructor<T>): T {
    return new ctor();
}

class User {
    name = "default";
}

const user = createInstance(User);  // User
```

### Default Type Parameters

```typescript
// Default to string if not specified
interface Container<T = string> {
    value: T;
}

const strContainer: Container = { value: "hello" };
const numContainer: Container<number> = { value: 42 };

// Function with default
function createArray<T = number>(length: number, fill: T): T[] {
    return new Array(length).fill(fill);
}

const nums = createArray(3, 0);       // number[]
const strs = createArray(3, "a");     // string[]
```

---

## Conditional Type Utilities

### Basic Conditional Types

```typescript
// If T is assignable to U, result is X, else Y
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;   // true
type B = IsString<number>;   // false

// Nullable check
type IsNullable<T> = null extends T ? true : false;

type C = IsNullable<string | null>;  // true
type D = IsNullable<string>;          // false
```

### Type Filtering

```typescript
// Keep only function types
type FunctionOnly<T> = T extends (...args: any[]) => any ? T : never;

type Mixed = string | number | (() => void) | ((x: number) => string);
type Funcs = FunctionOnly<Mixed>;  // (() => void) | ((x: number) => string)

// Keep only string keys
type StringKeysOnly<T> = {
    [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];

interface User {
    name: string;
    age: number;
    email: string;
}

type StringKeys = StringKeysOnly<User>;  // "name" | "email"
```

### Recursive Conditional Types

```typescript
// Deep readonly
type DeepReadonly<T> = T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

interface NestedObject {
    a: {
        b: {
            c: string;
        };
    };
}

type ReadonlyNested = DeepReadonly<NestedObject>;

// Deep partial
type DeepPartial<T> = T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;
```

### Advanced Type-Level Patterns

#### Deep Path Types

Create type-safe dot notation paths for nested objects:

```typescript
type Primitive = string | number | boolean | null | undefined;

type PathImpl<T, K extends keyof T> = K extends string
    ? T[K] extends Primitive
        ? K
        : T[K] extends Array<infer U>
            ? K | `${K}[${number}]` | `${K}[${number}].${PathImpl<U, keyof U & string>}`
            : K | `${K}.${PathImpl<T[K], keyof T[K] & string>}`
    : never;

type Path<T> = PathImpl<T, keyof T & string>;

// Usage
interface User {
    name: string;
    address: {
        street: string;
        city: string;
    };
    orders: Array<{
        id: number;
        items: string[];
    }>;
}

type UserPath = Path<User>;
// "name" | "address" | "address.street" | "address.city" |
// "orders" | "orders[0]" | "orders[0].id" | ...

// Type-safe getter function
function get<T, P extends Path<T>>(obj: T, path: P): unknown {
    return path
        .split(/[.\[\]]/)
        .filter(Boolean)
        .reduce((o: unknown, k) => (o as Record<string, unknown>)?.[k], obj);
}
```

#### Template Literal String Manipulation

```typescript
// Parse route parameters from URL pattern
type ParseRoute<T extends string> =
    T extends `${string}:${infer Param}/${infer Rest}`
        ? Param | ParseRoute<Rest>
        : T extends `${string}:${infer Param}`
            ? Param
            : never;

type Params = ParseRoute<"/users/:userId/posts/:postId">;
// "userId" | "postId"

// Type-safe event names
type EventName<T extends string> = `on${Capitalize<T>}`;
type MouseEvents = EventName<"click" | "mousedown" | "mouseup">;
// "onClick" | "onMousedown" | "onMouseup"

// Join array elements at type level
type Join<T extends string[], D extends string> =
    T extends []
        ? ""
        : T extends [infer F extends string]
            ? F
            : T extends [infer F extends string, ...infer R extends string[]]
                ? `${F}${D}${Join<R, D>}`
                : never;

type Joined = Join<["a", "b", "c"], "-">;  // "a-b-c"

// Split string at type level
type Split<S extends string, D extends string> =
    S extends `${infer F}${D}${infer R}`
        ? [F, ...Split<R, D>]
        : [S];

type Parts = Split<"a-b-c", "-">;  // ["a", "b", "c"]
```

#### Builder Pattern with Type Accumulation

```typescript
// Query builder that accumulates selected fields in the type
type QueryConfig<
    Selected extends string = never,
    Filtered extends string = never,
    Ordered extends string = never
> = {
    select: Selected;
    where: Filtered;
    orderBy: Ordered;
};

class TypedQueryBuilder<
    T extends Record<string, unknown>,
    Config extends QueryConfig = QueryConfig
> {
    private _select: string[] = [];
    private _where: Record<string, unknown> = {};
    private _orderBy: string[] = [];

    select<K extends keyof T & string>(
        ...fields: K[]
    ): TypedQueryBuilder<T, QueryConfig<Config["select"] | K, Config["where"], Config["orderBy"]>> {
        this._select.push(...fields);
        return this as any;
    }

    where<K extends keyof T & string>(
        field: K,
        value: T[K]
    ): TypedQueryBuilder<T, QueryConfig<Config["select"], Config["where"] | K, Config["orderBy"]>> {
        this._where[field] = value;
        return this as any;
    }

    orderBy<K extends keyof T & string>(
        field: K
    ): TypedQueryBuilder<T, QueryConfig<Config["select"], Config["where"], Config["orderBy"] | K>> {
        this._orderBy.push(field);
        return this as any;
    }

    build(): {
        select: Config["select"];
        where: Config["where"];
        orderBy: Config["orderBy"];
    } {
        return {
            select: this._select as any,
            where: this._where as any,
            orderBy: this._orderBy as any,
        };
    }
}

// Usage - types accumulate through the chain
interface User {
    id: string;
    name: string;
    email: string;
    age: number;
}

const query = new TypedQueryBuilder<User>()
    .select("name", "email")
    .where("age", 25)
    .orderBy("name")
    .build();

// query type: { select: "name" | "email"; where: "age"; orderBy: "name" }
```

#### Variadic Tuple Types

```typescript
// Concat two tuples
type Concat<T extends unknown[], U extends unknown[]> = [...T, ...U];

type Combined = Concat<[1, 2], [3, 4]>;  // [1, 2, 3, 4]

// Function that preserves argument types
function concat<T extends unknown[], U extends unknown[]>(
    arr1: [...T],
    arr2: [...U]
): [...T, ...U] {
    return [...arr1, ...arr2];
}

const result = concat([1, "a"] as const, [true, 2] as const);
// result: [1, "a", true, 2]

// Typed curry function
type Curry<F> = F extends (...args: infer A) => infer R
    ? A extends [infer First, ...infer Rest]
        ? (arg: First) => Curry<(...args: Rest) => R>
        : R
    : never;

function curry<F extends (...args: any[]) => any>(fn: F): Curry<F> {
    return function curried(...args: unknown[]): unknown {
        if (args.length >= fn.length) {
            return fn(...args);
        }
        return (...more: unknown[]) => curried(...args, ...more);
    } as Curry<F>;
}

const add = (a: number, b: number, c: number) => a + b + c;
const curriedAdd = curry(add);
// curriedAdd: (arg: number) => (arg: number) => (arg: number) => number
```

---

## Creating Custom Utility Types

### Nullable

```typescript
type Nullable<T> = T | null | undefined;

function getValue<T>(value: Nullable<T>, defaultValue: T): T {
    return value ?? defaultValue;
}
```

### ValueOf

```typescript
type ValueOf<T> = T[keyof T];

interface Colors {
    red: "#ff0000";
    green: "#00ff00";
    blue: "#0000ff";
}

type ColorValue = ValueOf<Colors>;  // "#ff0000" | "#00ff00" | "#0000ff"
```

### PromiseType

```typescript
type PromiseType<T> = T extends Promise<infer U> ? U : never;

type P = PromiseType<Promise<string>>;  // string

// Recursive version
type UnwrapPromise<T> = T extends Promise<infer U> ? UnwrapPromise<U> : T;
```

### Mutable

```typescript
type Mutable<T> = {
    -readonly [K in keyof T]: T[K];
};

interface ReadonlyUser {
    readonly name: string;
    readonly age: number;
}

type MutableUser = Mutable<ReadonlyUser>;
// { name: string; age: number; }
```

### RequireAtLeastOne

```typescript
type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
    T,
    Exclude<keyof T, Keys>
> &
    {
        [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
    }[Keys];

interface SearchParams {
    id?: string;
    name?: string;
    email?: string;
}

type ValidSearch = RequireAtLeastOne<SearchParams, "id" | "name" | "email">;
```

### Tuple Utilities

```typescript
// Get first element type
type Head<T extends any[]> = T extends [infer H, ...any[]] ? H : never;

// Get rest of tuple
type Tail<T extends any[]> = T extends [any, ...infer R] ? R : never;

// Get last element type
type Last<T extends any[]> = T extends [...any[], infer L] ? L : never;

// Tuple length
type Length<T extends any[]> = T["length"];

type Tuple = [string, number, boolean];
type First = Head<Tuple>;    // string
type Rest = Tail<Tuple>;     // [number, boolean]
type End = Last<Tuple>;      // boolean
type Len = Length<Tuple>;    // 3
```

---

## Real-World Patterns

### API Response Wrapper

```typescript
type ApiResponse<T> =
    | { status: "success"; data: T }
    | { status: "error"; error: string };

async function fetchData<T>(url: string): Promise<ApiResponse<T>> {
    try {
        const response = await fetch(url);
        const data = await response.json();
        return { status: "success", data };
    } catch (e) {
        return { status: "error", error: String(e) };
    }
}

// Usage
const result = await fetchData<User[]>("/api/users");
if (result.status === "success") {
    console.log(result.data);  // User[]
}
```

### Event Emitter

```typescript
type EventMap = {
    click: { x: number; y: number };
    keypress: { key: string };
    scroll: { position: number };
};

class TypedEventEmitter<T extends Record<string, any>> {
    private listeners = new Map<keyof T, Set<(event: any) => void>>();

    on<K extends keyof T>(event: K, callback: (event: T[K]) => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    emit<K extends keyof T>(event: K, data: T[K]): void {
        this.listeners.get(event)?.forEach(cb => cb(data));
    }
}

const emitter = new TypedEventEmitter<EventMap>();
emitter.on("click", e => console.log(e.x, e.y));  // Fully typed
emitter.emit("click", { x: 100, y: 200 });
```

### Form Validation

```typescript
type ValidationResult<T> = {
    [K in keyof T]: string | null;  // null means valid
};

type Validator<T> = {
    [K in keyof T]?: (value: T[K]) => string | null;
};

function validate<T>(data: T, validators: Validator<T>): ValidationResult<T> {
    const result = {} as ValidationResult<T>;

    for (const key in data) {
        const validator = validators[key];
        result[key] = validator ? validator(data[key]) : null;
    }

    return result;
}

interface FormData {
    email: string;
    age: number;
}

const errors = validate<FormData>(
    { email: "test", age: -5 },
    {
        email: v => v.includes("@") ? null : "Invalid email",
        age: v => v > 0 ? null : "Age must be positive",
    }
);
```

### Builder Pattern

```typescript
class QueryBuilder<T extends Record<string, any>> {
    private conditions: Partial<T> = {};
    private ordering: { field: keyof T; direction: "asc" | "desc" }[] = [];

    where<K extends keyof T>(field: K, value: T[K]): this {
        this.conditions[field] = value;
        return this;
    }

    orderBy(field: keyof T, direction: "asc" | "desc" = "asc"): this {
        this.ordering.push({ field, direction });
        return this;
    }

    build(): { conditions: Partial<T>; ordering: typeof this.ordering } {
        return { conditions: this.conditions, ordering: this.ordering };
    }
}

interface User {
    name: string;
    age: number;
    active: boolean;
}

const query = new QueryBuilder<User>()
    .where("active", true)
    .where("age", 30)
    .orderBy("name")
    .build();
```

---

## Quick Reference

### Built-in Utility Types

| Type | Purpose |
|------|---------|
| `Partial<T>` | All properties optional |
| `Required<T>` | All properties required |
| `Readonly<T>` | All properties readonly |
| `Record<K, T>` | Object type with keys K, values T |
| `Pick<T, K>` | Select properties |
| `Omit<T, K>` | Exclude properties |
| `Exclude<T, U>` | Remove from union |
| `Extract<T, U>` | Keep from union |
| `NonNullable<T>` | Remove null/undefined |
| `ReturnType<T>` | Function return type |
| `Parameters<T>` | Function parameters tuple |
| `Awaited<T>` | Unwrap Promise |
| `InstanceType<T>` | Class instance type |
| `ConstructorParameters<T>` | Constructor parameters tuple |
| `ThisParameterType<T>` | this parameter type |
| `OmitThisParameter<T>` | Remove this parameter |
| `Uppercase<T>` | Uppercase string literal |
| `Lowercase<T>` | Lowercase string literal |
| `Capitalize<T>` | Capitalize first char |
| `Uncapitalize<T>` | Uncapitalize first char |

### Generic Syntax

```typescript
// Function
function fn<T>(arg: T): T { ... }

// Arrow function
const fn = <T>(arg: T): T => arg;

// Interface
interface Container<T> { value: T; }

// Type alias
type Box<T> = { value: T };

// Class
class Stack<T> { ... }

// Constraint
function fn<T extends string>(arg: T): T { ... }

// Default
function fn<T = string>(arg?: T): T { ... }

// Multiple
function fn<T, U>(a: T, b: U): [T, U] { ... }
```

### Common Patterns

```typescript
// Readonly object
const config = { ... } as const;

// Type from value
type Config = typeof config;

// Keys from type
type ConfigKeys = keyof Config;

// Value types from object
type ConfigValues = Config[keyof Config];

// Infer from function
type Result = ReturnType<typeof someFunction>;

// Make property required
type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Make property optional
type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
```
