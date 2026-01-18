# TypeScript Anti-Patterns and Best Practices

> Recognize patterns that cause bugs and learn modern best practices

Understanding what NOT to do is as important as knowing what to do. This guide covers common TypeScript anti-patterns, why they're problematic, and the best practices to use instead.

---

## Table of Contents

1. [Type System Anti-Patterns](#type-system-anti-patterns)
2. [Runtime vs Compile-Time Confusion](#runtime-vs-compile-time-confusion)
3. [Class Design Anti-Patterns](#class-design-anti-patterns)
4. [Error Handling Anti-Patterns](#error-handling-anti-patterns)
5. [Async Anti-Patterns](#async-anti-patterns)
6. [Code Organization Anti-Patterns](#code-organization-anti-patterns)
7. [Performance Anti-Patterns](#performance-anti-patterns)
8. [Best Practices to Apply](#best-practices-to-apply)
9. [Detection Tools](#detection-tools)
10. [Quick Reference](#quick-reference)

---

## Type System Anti-Patterns

### 1. Overusing `any`

The `any` type disables TypeScript's type checking entirely.

```typescript
// BAD: Using any everywhere
function processData(data: any): any {
    return data.items.map((item: any) => item.value);
}

const result: any = processData(someData);
result.nonExistent.method(); // No error at compile time, crashes at runtime

// GOOD: Define proper types
interface Item {
    value: number;
}

interface Data {
    items: Item[];
}

function processData(data: Data): number[] {
    return data.items.map(item => item.value);
}
```

**Why it's bad:**
- Defeats the purpose of TypeScript
- Bugs surface at runtime instead of compile time
- No IDE autocomplete or refactoring support
- Spreads through codebase ("any infection")

### 2. Using `any` Instead of `unknown` for External Data

```typescript
// BAD: Trusting external data
async function fetchUser(id: string): Promise<any> {
    const response = await fetch(`/api/users/${id}`);
    return response.json(); // Returns any
}

const user = await fetchUser("123");
console.log(user.name.toUpperCase()); // Could crash if name is null

// GOOD: Use unknown and validate
interface User {
    id: string;
    name: string;
    email: string;
}

function isUser(data: unknown): data is User {
    return (
        typeof data === "object" &&
        data !== null &&
        "id" in data &&
        "name" in data &&
        "email" in data &&
        typeof (data as User).id === "string" &&
        typeof (data as User).name === "string" &&
        typeof (data as User).email === "string"
    );
}

async function fetchUser(id: string): Promise<User> {
    const response = await fetch(`/api/users/${id}`);
    const data: unknown = await response.json();

    if (!isUser(data)) {
        throw new Error("Invalid user data from API");
    }

    return data; // Now safely typed as User
}
```

### 3. Excessive Type Assertions (`as`)

```typescript
// BAD: Forcing types with assertions
interface User {
    id: string;
    name: string;
    role: "admin" | "user";
}

const user = {} as User; // Empty object pretending to be User
console.log(user.name.toUpperCase()); // Runtime error!

// Even worse: Double assertion to bypass errors
const badData = "not a user" as unknown as User;

// GOOD: Properly construct objects
const user: User = {
    id: "1",
    name: "Alice",
    role: "admin",
};

// Or use factory function with validation
function createUser(data: unknown): User {
    // Validate and construct properly
}
```

**When assertions are acceptable:**
```typescript
// OK: DOM elements (you know the type)
const input = document.getElementById("email") as HTMLInputElement;

// OK: Narrowing from broader type you control
function handleEvent(event: Event): void {
    if (event.type === "click") {
        const mouseEvent = event as MouseEvent;
        console.log(mouseEvent.clientX);
    }
}

// OK: Test mocks
const mockService = {
    getData: jest.fn(),
} as unknown as DataService;
```

### 4. Over-Typing (Excessive Annotations)

```typescript
// BAD: Redundant type annotations
const name: string = "Alice";                    // Inferred
const count: number = 42;                        // Inferred
const items: string[] = ["a", "b", "c"];         // Inferred
const user: { name: string } = { name: "Bob" };  // Inferred

function add(a: number, b: number): number {     // Return type inferred
    const result: number = a + b;                // Redundant
    return result;
}

// GOOD: Let TypeScript infer when obvious
const name = "Alice";
const count = 42;
const items = ["a", "b", "c"];
const user = { name: "Bob" };

function add(a: number, b: number) {  // Return type inferred
    return a + b;
}

// DO annotate when needed:
// 1. Function parameters (required)
function greet(name: string) { }

// 2. Empty arrays
const numbers: number[] = [];

// 3. Variables initialized to null/undefined
let user: User | null = null;

// 4. Public API return types (for documentation)
export function fetchUsers(): Promise<User[]> { }

// 5. When inference is wrong
const id: string | number = 123;  // Want flexibility
```

### 5. Ignoring Strict Mode

```typescript
// tsconfig.json
{
    "compilerOptions": {
        // BAD: Loose mode (defaults or explicit false)
        "strict": false,
        "strictNullChecks": false,
        "noImplicitAny": false
    }
}

// With strict: false, this compiles but crashes:
function getLength(str) {     // str is implicitly 'any'
    return str.length;
}

getLength(null);              // Runtime error!

// GOOD: Enable strict mode
{
    "compilerOptions": {
        "strict": true        // Enables all strict checks
    }
}

// Now TypeScript catches issues:
function getLength(str: string): number {
    return str.length;
}

getLength(null);  // Compile error: null is not assignable to string
```

### 6. Not Using Discriminated Unions for State

```typescript
// BAD: Multiple optional properties
interface ApiResponse {
    loading?: boolean;
    data?: User;
    error?: Error;
}

function handleResponse(response: ApiResponse): void {
    if (response.loading) {
        console.log("Loading...");
    } else if (response.error) {
        console.log("Error:", response.error.message);
    } else if (response.data) {
        console.log("User:", response.data.name);
    }
    // What if loading is false but no data or error?
    // Multiple states could be true simultaneously
}

// GOOD: Discriminated union for exclusive states
type ApiResponse =
    | { status: "loading" }
    | { status: "success"; data: User }
    | { status: "error"; error: Error };

function handleResponse(response: ApiResponse): void {
    switch (response.status) {
        case "loading":
            console.log("Loading...");
            break;
        case "success":
            console.log("User:", response.data.name);  // TypeScript knows data exists
            break;
        case "error":
            console.log("Error:", response.error.message);  // TypeScript knows error exists
            break;
    }
}
```

---

## Runtime vs Compile-Time Confusion

### Types Are Erased at Runtime

```typescript
// BAD: Trying to use types at runtime
interface User {
    name: string;
    age: number;
}

function isUser(obj: unknown): boolean {
    return obj instanceof User;  // Error! User doesn't exist at runtime
}

// Types are compile-time only - they don't exist in JavaScript
function checkType<T>(value: unknown): value is T {
    return typeof value === typeof T;  // Doesn't work!
}

// GOOD: Use runtime checks
function isUser(obj: unknown): obj is User {
    return (
        typeof obj === "object" &&
        obj !== null &&
        typeof (obj as User).name === "string" &&
        typeof (obj as User).age === "number"
    );
}

// Or use a validation library like Zod
import { z } from "zod";

const UserSchema = z.object({
    name: z.string(),
    age: z.number(),
});

type User = z.infer<typeof UserSchema>;

function parseUser(data: unknown): User {
    return UserSchema.parse(data);  // Throws if invalid
}
```

### Type Assertions Don't Validate

```typescript
// BAD: Assuming assertion validates data
const apiData: unknown = await fetch("/api/user").then(r => r.json());
const user = apiData as User;  // NO VALIDATION HAPPENS
console.log(user.name);  // Could be undefined/null/wrong type

// GOOD: Validate at runtime boundaries
import { z } from "zod";

const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    age: z.number().optional(),
});

type User = z.infer<typeof UserSchema>;

async function fetchUser(): Promise<User> {
    const response = await fetch("/api/user");
    const data = await response.json();

    // This actually validates the data
    const result = UserSchema.safeParse(data);

    if (!result.success) {
        throw new Error(`Invalid user data: ${result.error.message}`);
    }

    return result.data;
}
```

### `instanceof` Limitations

```typescript
// BAD: instanceof doesn't work with interfaces
interface Animal {
    name: string;
}

interface Dog extends Animal {
    breed: string;
}

function isDog(animal: Animal): animal is Dog {
    return animal instanceof Dog;  // Error! Dog is an interface
}

// GOOD: Use type guards with property checks
function isDog(animal: Animal): animal is Dog {
    return "breed" in animal;
}

// Or use discriminated unions
interface Cat {
    kind: "cat";
    name: string;
    meow(): void;
}

interface Dog {
    kind: "dog";
    name: string;
    breed: string;
    bark(): void;
}

type Pet = Cat | Dog;

function isDog(pet: Pet): pet is Dog {
    return pet.kind === "dog";
}
```

---

## Class Design Anti-Patterns

### God Classes

```typescript
// BAD: One class doing everything
class UserManager {
    // User CRUD
    createUser(data: UserData): User { }
    updateUser(id: string, data: Partial<UserData>): User { }
    deleteUser(id: string): void { }

    // Authentication
    login(email: string, password: string): Token { }
    logout(token: string): void { }
    refreshToken(token: string): Token { }

    // Password management
    hashPassword(password: string): string { }
    verifyPassword(password: string, hash: string): boolean { }
    resetPassword(email: string): void { }

    // Email
    sendWelcomeEmail(user: User): void { }
    sendPasswordResetEmail(user: User, token: string): void { }

    // Validation
    validateEmail(email: string): boolean { }
    validatePassword(password: string): boolean { }

    // Reporting
    generateUserReport(): Report { }
    getActiveUsers(): User[] { }
}

// GOOD: Separate responsibilities
class UserRepository {
    create(data: UserData): Promise<User> { }
    update(id: string, data: Partial<UserData>): Promise<User> { }
    delete(id: string): Promise<void> { }
    findById(id: string): Promise<User | null> { }
}

class AuthenticationService {
    constructor(
        private userRepo: UserRepository,
        private passwordService: PasswordService,
        private tokenService: TokenService
    ) {}

    login(email: string, password: string): Promise<AuthResult> { }
    logout(token: string): Promise<void> { }
}

class PasswordService {
    hash(password: string): Promise<string> { }
    verify(password: string, hash: string): Promise<boolean> { }
}

class EmailService {
    sendWelcome(user: User): Promise<void> { }
    sendPasswordReset(user: User, token: string): Promise<void> { }
}

class UserValidator {
    validateEmail(email: string): boolean { }
    validatePassword(password: string): ValidationResult { }
}
```

### Deep Inheritance Hierarchies

```typescript
// BAD: Deep inheritance chain
class Entity {
    id: string;
}

class TimestampedEntity extends Entity {
    createdAt: Date;
    updatedAt: Date;
}

class AuditedEntity extends TimestampedEntity {
    createdBy: string;
    updatedBy: string;
}

class SoftDeletableEntity extends AuditedEntity {
    deletedAt: Date | null;
}

class VersionedEntity extends SoftDeletableEntity {
    version: number;
}

class User extends VersionedEntity {
    // Finally, the actual entity
    name: string;
    email: string;
}

// Problems:
// - Hard to understand what User has
// - Changes to base classes affect everything
// - Can't mix and match features

// GOOD: Composition with interfaces
interface Entity {
    id: string;
}

interface Timestamped {
    createdAt: Date;
    updatedAt: Date;
}

interface Audited {
    createdBy: string;
    updatedBy: string;
}

interface SoftDeletable {
    deletedAt: Date | null;
}

interface Versioned {
    version: number;
}

// Compose what you need
interface User extends Entity, Timestamped, Audited, SoftDeletable {
    name: string;
    email: string;
}

// Or use utility type composition
type WithTimestamps<T> = T & Timestamped;
type WithAudit<T> = T & Audited;

interface BaseUser {
    id: string;
    name: string;
    email: string;
}

type User = WithTimestamps<WithAudit<BaseUser>>;
```

### Mutable Static State

```typescript
// BAD: Mutable static state
class ConfigManager {
    static config: Config = {};

    static set(key: string, value: unknown): void {
        ConfigManager.config[key] = value;
    }

    static get(key: string): unknown {
        return ConfigManager.config[key];
    }
}

// Problems:
// - State shared across tests (test pollution)
// - Hard to track who changes what
// - Race conditions in concurrent scenarios
// - Difficult to mock

// Usage that causes issues:
ConfigManager.set("apiUrl", "https://api.example.com");
// ... later, somewhere else
ConfigManager.set("apiUrl", "https://test.example.com"); // Overwrites!

// GOOD: Inject configuration
interface Config {
    apiUrl: string;
    timeout: number;
}

class ApiClient {
    constructor(private config: Config) {}

    async fetch(endpoint: string): Promise<Response> {
        return fetch(`${this.config.apiUrl}${endpoint}`, {
            signal: AbortSignal.timeout(this.config.timeout),
        });
    }
}

// Different configs for different contexts
const prodClient = new ApiClient({
    apiUrl: "https://api.example.com",
    timeout: 5000,
});

const testClient = new ApiClient({
    apiUrl: "https://test.example.com",
    timeout: 1000,
});
```

---

## Error Handling Anti-Patterns

### Empty Catch Blocks

```typescript
// BAD: Swallowing errors
try {
    await saveUser(user);
} catch (error) {
    // Silent failure - user thinks save worked
}

// BAD: Logging but not handling
try {
    await saveUser(user);
} catch (error) {
    console.error(error);  // Logged, but operation silently failed
}

// GOOD: Handle or propagate
try {
    await saveUser(user);
} catch (error) {
    // Option 1: Handle and recover
    showNotification("Failed to save. Retrying...");
    await retrySave(user);

    // Option 2: Handle and inform user
    showErrorDialog("Could not save user. Please try again.");

    // Option 3: Log and rethrow
    logger.error("Failed to save user", { error, user });
    throw error;

    // Option 4: Transform to application error
    throw new ApplicationError("USER_SAVE_FAILED", { cause: error });
}
```

### Untyped Error Handling

```typescript
// BAD: error is unknown in catch
try {
    await riskyOperation();
} catch (error) {
    console.log(error.message);  // Error: 'error' is of type 'unknown'
}

// BAD: Casting to any
try {
    await riskyOperation();
} catch (error: any) {
    console.log(error.message);  // Works but loses type safety
}

// GOOD: Type guard for errors
function isError(error: unknown): error is Error {
    return error instanceof Error;
}

try {
    await riskyOperation();
} catch (error) {
    if (isError(error)) {
        console.log(error.message);  // Type-safe access
    } else {
        console.log("Unknown error:", error);
    }
}

// BETTER: Custom error types
class ApiError extends Error {
    constructor(
        message: string,
        public statusCode: number,
        public code: string
    ) {
        super(message);
        this.name = "ApiError";
    }
}

function isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
}

try {
    await fetchData();
} catch (error) {
    if (isApiError(error)) {
        if (error.statusCode === 401) {
            redirectToLogin();
        } else if (error.statusCode === 404) {
            showNotFound();
        }
    }
    throw error;
}
```

### Ignoring Promise Rejections

```typescript
// BAD: Fire-and-forget promises
async function processQueue(): Promise<void> {
    items.forEach(item => {
        processItem(item);  // Promise not awaited or caught!
    });
}

// BAD: No error handling on promise
fetchData().then(data => {
    displayData(data);
});  // What if fetchData fails?

// GOOD: Handle all promises
async function processQueue(): Promise<void> {
    await Promise.all(
        items.map(async item => {
            try {
                await processItem(item);
            } catch (error) {
                logger.error("Failed to process item", { item, error });
            }
        })
    );
}

// GOOD: Always catch or use try/catch
fetchData()
    .then(data => displayData(data))
    .catch(error => showError(error));

// Or with async/await
try {
    const data = await fetchData();
    displayData(data);
} catch (error) {
    showError(error);
}

// Enable unhandled rejection tracking
process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled rejection", { reason, promise });
    process.exit(1);  // Or handle appropriately
});
```

### Result Pattern Alternative

```typescript
// Instead of throwing, return Result type
type Result<T, E = Error> =
    | { success: true; value: T }
    | { success: false; error: E };

function ok<T>(value: T): Result<T, never> {
    return { success: true, value };
}

function err<E>(error: E): Result<never, E> {
    return { success: false, error };
}

// Usage
interface ValidationError {
    field: string;
    message: string;
}

function validateEmail(email: string): Result<string, ValidationError> {
    if (!email.includes("@")) {
        return err({ field: "email", message: "Invalid email format" });
    }
    return ok(email);
}

function validateAge(age: number): Result<number, ValidationError> {
    if (age < 0 || age > 150) {
        return err({ field: "age", message: "Invalid age" });
    }
    return ok(age);
}

// Caller must handle both cases
const emailResult = validateEmail(input.email);
if (!emailResult.success) {
    showFieldError(emailResult.error.field, emailResult.error.message);
    return;
}

const validEmail = emailResult.value;  // Type is string
```

---

## Async Anti-Patterns

### Forgetting `await`

```typescript
// BAD: Missing await
async function saveAndNotify(user: User): Promise<void> {
    saveUser(user);  // Returns promise, not awaited!
    sendNotification(user.email);  // May run before save completes
}

// Even sneakier:
async function getUsers(): Promise<User[]> {
    const users = fetchUsers();  // Missing await
    return users;  // Returns Promise<Promise<User[]>> wrapped in Promise
}

// GOOD: Always await async operations
async function saveAndNotify(user: User): Promise<void> {
    await saveUser(user);
    await sendNotification(user.email);
}

// TypeScript 5.4+ helps catch this with better inference
// Enable @typescript-eslint/no-floating-promises
```

### Sequential When Parallel Possible

```typescript
// BAD: Sequential when operations are independent
async function loadDashboard(): Promise<Dashboard> {
    const user = await fetchUser();           // 200ms
    const orders = await fetchOrders();       // 300ms
    const notifications = await fetchNotifications();  // 100ms
    // Total: 600ms

    return { user, orders, notifications };
}

// GOOD: Parallel when independent
async function loadDashboard(): Promise<Dashboard> {
    const [user, orders, notifications] = await Promise.all([
        fetchUser(),           // 200ms
        fetchOrders(),         // 300ms  ─┐
        fetchNotifications(),  // 100ms  ─┴─ Total: 300ms (max)
    ]);

    return { user, orders, notifications };
}

// BETTER: Handle partial failures
async function loadDashboard(): Promise<Dashboard> {
    const results = await Promise.allSettled([
        fetchUser(),
        fetchOrders(),
        fetchNotifications(),
    ]);

    const [userResult, ordersResult, notificationsResult] = results;

    return {
        user: userResult.status === "fulfilled" ? userResult.value : null,
        orders: ordersResult.status === "fulfilled" ? ordersResult.value : [],
        notifications: notificationsResult.status === "fulfilled"
            ? notificationsResult.value
            : [],
    };
}
```

### Unbounded Concurrency

```typescript
// BAD: Processing all items concurrently
async function processAllUsers(userIds: string[]): Promise<void> {
    await Promise.all(
        userIds.map(id => processUser(id))  // 10,000 concurrent requests!
    );
}

// GOOD: Limit concurrency
async function processWithLimit<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    concurrency: number
): Promise<R[]> {
    const results: R[] = [];
    const executing: Promise<void>[] = [];

    for (const item of items) {
        const promise = fn(item).then(result => {
            results.push(result);
        });

        executing.push(promise);

        if (executing.length >= concurrency) {
            await Promise.race(executing);
            // Remove completed promises
            executing.splice(
                executing.findIndex(p => p === promise),
                1
            );
        }
    }

    await Promise.all(executing);
    return results;
}

// Usage
await processWithLimit(userIds, processUser, 10);  // Max 10 concurrent

// Or use a library like p-limit
import pLimit from "p-limit";

const limit = pLimit(10);
await Promise.all(
    userIds.map(id => limit(() => processUser(id)))
);
```

### Race Conditions

```typescript
// BAD: Race condition in state update
let currentUser: User | null = null;

async function loadUser(id: string): Promise<void> {
    const user = await fetchUser(id);
    currentUser = user;  // What if another loadUser finished first?
}

// User clicks "Load User 1" then "Load User 2"
loadUser("1");  // Takes 500ms
loadUser("2");  // Takes 200ms
// Result: currentUser is User 1 (wrong!)

// GOOD: Track request identity
let currentRequestId = 0;

async function loadUser(id: string): Promise<void> {
    const requestId = ++currentRequestId;
    const user = await fetchUser(id);

    // Only update if this is still the current request
    if (requestId === currentRequestId) {
        currentUser = user;
    }
}

// BETTER: Use AbortController
let abortController: AbortController | null = null;

async function loadUser(id: string): Promise<void> {
    // Cancel previous request
    abortController?.abort();
    abortController = new AbortController();

    try {
        const user = await fetchUser(id, {
            signal: abortController.signal,
        });
        currentUser = user;
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            // Request was cancelled, ignore
            return;
        }
        throw error;
    }
}
```

---

## Code Organization Anti-Patterns

### Barrel Files Causing Circular Dependencies

```typescript
// BAD: index.ts barrel file
// src/models/index.ts
export * from "./user";
export * from "./order";
export * from "./product";

// src/models/user.ts
import { Order } from "./index";  // Imports from barrel

// src/models/order.ts
import { User } from "./index";   // Circular through barrel!

// Result: Runtime errors, undefined imports

// GOOD: Direct imports
// src/models/user.ts
import { Order } from "./order";

// src/models/order.ts
import { User } from "./user";

// Or restructure to avoid circular deps
// src/models/types.ts - shared interfaces only
export interface UserId { id: string }
export interface OrderId { id: string }

// src/models/user.ts
import type { OrderId } from "./types";
```

### Over-Modularization

```typescript
// BAD: Every function in its own file
// src/utils/add.ts
export const add = (a: number, b: number) => a + b;

// src/utils/subtract.ts
export const subtract = (a: number, b: number) => a - b;

// src/utils/multiply.ts
export const multiply = (a: number, b: number) => a * b;

// src/utils/index.ts
export * from "./add";
export * from "./subtract";
export * from "./multiply";

// Result: 4 files for trivial functions

// GOOD: Group related functionality
// src/utils/math.ts
export const add = (a: number, b: number) => a + b;
export const subtract = (a: number, b: number) => a - b;
export const multiply = (a: number, b: number) => a * b;
export const divide = (a: number, b: number) => a / b;

// Or even simpler object export
export const math = {
    add: (a: number, b: number) => a + b,
    subtract: (a: number, b: number) => a - b,
    multiply: (a: number, b: number) => a * b,
    divide: (a: number, b: number) => a / b,
};
```

### Coupling to Implementation

```typescript
// BAD: Direct dependency on implementation
import { PostgresUserRepository } from "./postgres-user-repository";

class UserService {
    private repository = new PostgresUserRepository();

    async getUser(id: string): Promise<User | null> {
        return this.repository.findById(id);
    }
}

// Problems:
// - Can't switch databases
// - Can't test without real database
// - Tight coupling

// GOOD: Depend on interface
interface UserRepository {
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    save(user: User): Promise<void>;
}

class UserService {
    constructor(private repository: UserRepository) {}

    async getUser(id: string): Promise<User | null> {
        return this.repository.findById(id);
    }
}

// Easy to swap implementations
const userService = new UserService(new PostgresUserRepository());
const testUserService = new UserService(new InMemoryUserRepository());
```

### Large Project Architecture

#### Barrel Files: Pros and Cons

```typescript
// src/components/index.ts (barrel file)
export * from "./Button";
export * from "./Input";
export * from "./Modal";

// Allows cleaner imports
import { Button, Input, Modal } from "@/components";
```

**Advantages:**
- Cleaner imports: `import { Button, Input } from "@/components"`
- Encapsulation of internal structure
- Easier refactoring of internal file locations

**Disadvantages:**
- **Circular dependencies** - most common source of import errors
- **Larger bundles** - tree-shaking often fails with barrels
- **Slower builds** - TypeScript must process entire barrel on any import

**Recommendation for large codebases:**

```typescript
// PREFER: Direct imports in large projects
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

// CRITICAL: Never import from barrel within same library
// BAD (causes circular deps):
// src/components/Button.tsx
import { Icon } from "./index";  // Don't do this!

// GOOD:
import { Icon } from "./Icon";   // Direct import
```

#### TypeScript Project References

For monorepos with 10+ packages, use project references:

```json
// packages/shared/tsconfig.json
{
    "compilerOptions": {
        "composite": true,
        "declaration": true,
        "declarationMap": true,
        "outDir": "./dist"
    }
}

// packages/app/tsconfig.json
{
    "references": [
        { "path": "../shared" }
    ],
    "compilerOptions": {
        "noEmit": true
    }
}
```

**Benefits:**
- Faster incremental builds (only recompile changed packages)
- Enforced dependency boundaries
- Parallel compilation across packages

#### Circular Dependency Solutions

```typescript
// Solution 1: Extract shared types to separate file
// types.ts - no runtime dependencies
export interface User { id: string; name: string; }
export interface Order { id: string; userId: string; }

// user.ts
import type { User } from "./types";  // type-only import - no runtime dep

// order.ts
import type { Order, User } from "./types";

// Solution 2: Dependency injection
// BAD: Direct circular import
import { OrderService } from "./OrderService";  // OrderService imports UserService!

class UserService {
    private orders = new OrderService();  // Circular!
}

// GOOD: Inject dependency
interface IOrderService {
    getOrdersForUser(userId: string): Promise<Order[]>;
}

class UserService {
    constructor(private orders: IOrderService) {}

    async getUserWithOrders(id: string): Promise<UserWithOrders> {
        const user = await this.findById(id);
        const orders = await this.orders.getOrdersForUser(id);
        return { ...user, orders };
    }
}

// Solution 3: Move shared logic to third module
// Bad: user.ts and order.ts both need formatDate, import each other
// Good: utils.ts has formatDate, both import from utils (no cycle)
```

#### Modern Monorepo Structure (2026)

```
my-monorepo/
├── packages/
│   ├── shared/           # Shared types, utils
│   │   ├── src/
│   │   │   ├── types.ts
│   │   │   └── utils.ts
│   │   └── package.json
│   ├── api/              # Backend
│   │   └── src/
│   └── web/              # Frontend
│       └── src/
├── package.json          # Workspace root
├── pnpm-workspace.yaml   # or npm/yarn workspaces
└── tsconfig.base.json    # Shared TS config
```

**Internal Packages pattern (recommended):**

```json
// packages/shared/package.json
{
    "name": "@myorg/shared",
    "main": "./src/index.ts",   // Point to source, not dist
    "types": "./src/index.ts",
    "exports": {
        ".": "./src/index.ts"
    }
}
```

This approach:
- Eliminates build step for internal packages during development
- Works with modern bundlers (Vite, esbuild, turbopack)
- Provides instant type checking across packages

---

## Performance Anti-Patterns

### Excessive Object Spreading

```typescript
// BAD: Spreading in loops creates many objects
function updateAllItems(items: Item[], updates: Partial<Item>): Item[] {
    let result = items;
    for (const key of Object.keys(updates)) {
        result = result.map(item => ({
            ...item,                    // New object every time
            [key]: updates[key as keyof Item],
        }));
    }
    return result;
}

// GOOD: Single transformation
function updateAllItems(items: Item[], updates: Partial<Item>): Item[] {
    return items.map(item => ({
        ...item,
        ...updates,
    }));
}

// Or mutate when appropriate
function updateAllItemsInPlace(items: Item[], updates: Partial<Item>): void {
    for (const item of items) {
        Object.assign(item, updates);
    }
}
```

### Array.includes in Loops

```typescript
// BAD: O(n*m) complexity
function findCommon(arr1: number[], arr2: number[]): number[] {
    return arr1.filter(item => arr2.includes(item));  // includes is O(n)
}

// For arr1.length = 1000, arr2.length = 1000: 1,000,000 operations

// GOOD: Use Set for O(n+m)
function findCommon(arr1: number[], arr2: number[]): number[] {
    const set2 = new Set(arr2);  // O(m)
    return arr1.filter(item => set2.has(item));  // O(n), has is O(1)
}

// Total: O(n + m) = 2,000 operations
```

### Creating Functions in Loops

```typescript
// BAD: New function created every iteration
items.forEach(item => {
    button.addEventListener("click", () => {
        handleClick(item);  // New function for each item
    });
});

// GOOD: Use data attributes or delegation
items.forEach((item, index) => {
    button.dataset.index = String(index);
});

button.addEventListener("click", (event) => {
    const index = Number((event.target as HTMLElement).dataset.index);
    handleClick(items[index]);
});

// Or bind once outside loop
const handleClicks = items.map(item => () => handleClick(item));
items.forEach((_, index) => {
    buttons[index].addEventListener("click", handleClicks[index]);
});
```

### Not Using Proper Data Structures

```typescript
// BAD: Array for frequent lookups
class UserCache {
    private users: User[] = [];

    add(user: User): void {
        this.users.push(user);
    }

    find(id: string): User | undefined {
        return this.users.find(u => u.id === id);  // O(n)
    }

    remove(id: string): void {
        const index = this.users.findIndex(u => u.id === id);  // O(n)
        if (index > -1) {
            this.users.splice(index, 1);  // O(n)
        }
    }
}

// GOOD: Map for O(1) operations
class UserCache {
    private users = new Map<string, User>();

    add(user: User): void {
        this.users.set(user.id, user);  // O(1)
    }

    find(id: string): User | undefined {
        return this.users.get(id);  // O(1)
    }

    remove(id: string): void {
        this.users.delete(id);  // O(1)
    }
}
```

### V8 Inline Cache Optimization

V8 optimizes property access using inline caches (ICs). Understanding IC states helps write faster code.

#### Monomorphic vs Polymorphic Callsites

```typescript
// GOOD: Monomorphic - always same shape
// V8 generates specialized machine code
function getNameMono(user: { name: string }): string {
    return user.name;
}

const users = [
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 },
    { name: "Charlie", age: 35 },
];
users.forEach(u => getNameMono(u));  // All same shape - FAST

// BAD: Polymorphic - multiple shapes
// V8 must check multiple cases
function getNamePoly(obj: { name: string }): string {
    return obj.name;
}

const mixed = [
    { name: "Alice", age: 30 },           // Shape 1
    { name: "Bob", role: "admin" },       // Shape 2
    { name: "Charlie", active: true },    // Shape 3
    { name: "Dave", score: 100 },         // Shape 4
    { name: "Eve", level: 5 },            // Shape 5 - now MEGAMORPHIC!
];
mixed.forEach(m => getNamePoly(m));  // Different shapes - SLOW
```

**Key rules:**
1. Keep object shapes consistent (same properties, same order)
2. Initialize all properties in constructors
3. Avoid adding/deleting properties dynamically
4. After 4+ shapes, function becomes megamorphic (slowest)

#### Object vs Map: When to Choose

```typescript
// Small datasets (<100 entries) with string keys: Objects often faster
// - V8 optimizes object property access heavily
// - No overhead of Map's hashing
const smallLookup: Record<string, number> = { a: 1, b: 2, c: 3 };
smallLookup.a;  // Very fast - direct property access

// Large/dynamic datasets: Map wins
// - O(1) add/delete (Objects have notoriously slow delete)
// - Optimized for frequent changes
// - Maintains insertion order
// - Any type as key (not just strings)
const dynamicLookup = new Map<string, User>();
dynamicLookup.set(user.id, user);    // Fast
dynamicLookup.delete(user.id);       // Fast (Object.delete is slow!)

// RULE OF THUMB:
// - Object: Static config, known keys at author time
// - Map: Dynamic data, frequent add/delete, non-string keys
```

#### Hidden Class Stability

```typescript
// BAD: Changing object shape after creation
class User {
    name: string;
    constructor(name: string) {
        this.name = name;
    }
}

const user = new User("Alice");
(user as any).age = 30;  // SLOW: Creates new hidden class

// GOOD: Declare all properties upfront
class User {
    name: string;
    age: number | undefined;

    constructor(name: string, age?: number) {
        this.name = name;
        this.age = age;  // Always initialized, even if undefined
    }
}

// GOOD: Use consistent initialization order
class Point {
    constructor(
        public x: number,
        public y: number  // Always x first, then y
    ) {}
}
```

### Type System Performance

Complex types slow down the TypeScript compiler. Optimize for build speed in large codebases.

```typescript
// BAD: Deeply recursive types without limits
type DeepPath<T> = {
    [K in keyof T]: T[K] extends object
        ? K | `${K & string}.${DeepPath<T[K]> & string}`
        : K;
}[keyof T];  // Can cause TS compiler to hang on complex objects

// GOOD: Limit recursion depth
type DeepPath<T, Depth extends number[] = []> =
    Depth["length"] extends 5  // Max 5 levels
        ? never
        : {
            [K in keyof T]: T[K] extends object
                ? K | `${K & string}.${DeepPath<T[K], [...Depth, 1]> & string}`
                : K;
        }[keyof T];

// GOOD: Use simpler explicit types when possible
type UserPath = "name" | "email" | "address.street" | "address.city";

// GOOD: Avoid excessive conditional types in hot paths
// Cache complex type computations in type aliases
type CachedUserKeys = keyof User;  // Computed once, reused
```

---

## Best Practices to Apply

### 1. Strict Mode Configuration

```json
// tsconfig.json
{
    "compilerOptions": {
        "strict": true,
        "noUncheckedIndexedAccess": true,
        "noImplicitReturns": true,
        "noFallthroughCasesInSwitch": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "exactOptionalPropertyTypes": true
    }
}
```

### 2. Use `unknown` for External Data

```typescript
// Always validate external data
async function fetchData<T>(
    url: string,
    validator: (data: unknown) => T
): Promise<T> {
    const response = await fetch(url);
    const data: unknown = await response.json();
    return validator(data);
}
```

### 3. Prefer `const` Assertions

```typescript
// For immutable configuration
const ROUTES = {
    HOME: "/",
    ABOUT: "/about",
    USERS: "/users",
} as const;

type Route = typeof ROUTES[keyof typeof ROUTES];
// "/" | "/about" | "/users"
```

### 4. Use Type Predicates for Type Guards

```typescript
function isNonNull<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
}

const items = [1, null, 2, undefined, 3];
const validItems = items.filter(isNonNull);
// Type: number[]
```

### 5. Leverage `satisfies` Operator

```typescript
const config = {
    apiUrl: "https://api.example.com",
    timeout: 5000,
} satisfies Record<string, string | number>;

// TypeScript knows apiUrl is string, not string | number
config.apiUrl.toUpperCase();  // Works!
```

### 6. Composition Over Inheritance

```typescript
// Compose behaviors instead of inheriting
type Logger = { log: (msg: string) => void };
type Storage = { save: (key: string, value: string) => void };
type Analytics = { track: (event: string) => void };

function createService(
    logger: Logger,
    storage: Storage,
    analytics: Analytics
) {
    return {
        doWork(data: string) {
            logger.log("Starting work");
            storage.save("lastWork", data);
            analytics.track("work_done");
        },
    };
}
```

---

## Detection Tools

### ESLint Rules

```javascript
// .eslintrc.js
module.exports = {
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
    ],
    rules: {
        // Catch anti-patterns
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-unsafe-assignment": "error",
        "@typescript-eslint/no-unsafe-member-access": "error",
        "@typescript-eslint/no-unsafe-call": "error",
        "@typescript-eslint/no-unsafe-return": "error",
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/await-thenable": "error",
        "@typescript-eslint/no-misused-promises": "error",
        "@typescript-eslint/prefer-nullish-coalescing": "error",
        "@typescript-eslint/prefer-optional-chain": "error",
        "@typescript-eslint/strict-boolean-expressions": "error",
    },
};
```

### Biome Configuration

```json
// biome.json
{
    "linter": {
        "rules": {
            "suspicious": {
                "noExplicitAny": "error",
                "noConfusingVoidType": "error"
            },
            "correctness": {
                "noUnusedVariables": "error",
                "useExhaustiveDependencies": "warn"
            },
            "style": {
                "noNonNullAssertion": "warn"
            }
        }
    }
}
```

---

## Quick Reference

### Anti-Pattern Detection Checklist

| Anti-Pattern | Symptom | Fix |
|--------------|---------|-----|
| `any` overuse | Type errors at runtime | Use proper types or `unknown` |
| Type assertions | `as` on external data | Runtime validation |
| Empty catch | Silent failures | Handle or rethrow |
| Missing await | Unhandled promises | Enable lint rules |
| God classes | 500+ line classes | Split by responsibility |
| Deep inheritance | 4+ level chains | Use composition |
| Barrel circular deps | Undefined imports | Direct imports |

### Best Practice Quick Checks

- [ ] `strict: true` in tsconfig.json
- [ ] No `any` types (or explicitly justified)
- [ ] External data validated at boundaries
- [ ] All promises handled
- [ ] No empty catch blocks
- [ ] Classes < 300 lines
- [ ] No circular dependencies
- [ ] Tests can run independently

### TypeScript Compiler Flags

| Flag | Purpose |
|------|---------|
| `strict` | Enable all strict checks |
| `noImplicitAny` | Error on implied `any` |
| `strictNullChecks` | Null/undefined must be explicit |
| `noUncheckedIndexedAccess` | Array access may be undefined |
| `exactOptionalPropertyTypes` | Stricter optional properties |
