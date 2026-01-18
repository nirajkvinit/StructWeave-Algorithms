# TypeScript Async Patterns

> Mastering Promises, async/await, and concurrent programming

---

## Table of Contents

1. [Promises Fundamentals](#promises-fundamentals)
2. [Async/Await Syntax](#asyncawait-syntax)
3. [Error Handling](#error-handling)
4. [Promise Combinators](#promise-combinators)
5. [Typed Async Functions](#typed-async-functions)
6. [Concurrency Patterns](#concurrency-patterns)
7. [Cancellation](#cancellation)
8. [Common Interview Patterns](#common-interview-patterns)
9. [Quick Reference](#quick-reference)

---

## Promises Fundamentals

### Creating Promises

```typescript
// Basic Promise
const promise = new Promise<string>((resolve, reject) => {
    setTimeout(() => {
        resolve("Success!");
    }, 1000);
});

// Promise that might reject
function fetchData(id: number): Promise<User> {
    return new Promise((resolve, reject) => {
        if (id < 0) {
            reject(new Error("Invalid ID"));
        } else {
            resolve({ id, name: "Alice" });
        }
    });
}

// Immediate resolution
const resolved = Promise.resolve(42);
const rejected = Promise.reject(new Error("Failed"));
```

### Promise Chaining

```typescript
fetchUser(1)
    .then(user => fetchOrders(user.id))
    .then(orders => processOrders(orders))
    .then(result => console.log(result))
    .catch(error => console.error(error))
    .finally(() => cleanup());

// Returning values in chain
Promise.resolve(1)
    .then(x => x + 1)      // 2
    .then(x => x * 2)      // 4
    .then(x => x.toString())  // "4"
    .then(s => console.log(s));
```

### Promise States

```typescript
// Pending → Fulfilled
const fulfilled = new Promise<number>(resolve => {
    setTimeout(() => resolve(42), 100);
});

// Pending → Rejected
const rejected = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Failed")), 100);
});

// Once settled, state cannot change
const settled = new Promise<number>(resolve => {
    resolve(1);
    resolve(2);  // Ignored
});
```

---

## Async/Await Syntax

### Basic Usage

```typescript
// Async function returns Promise
async function fetchUser(id: number): Promise<User> {
    const response = await fetch(`/api/users/${id}`);
    const user = await response.json();
    return user;
}

// Arrow function
const fetchUser2 = async (id: number): Promise<User> => {
    const response = await fetch(`/api/users/${id}`);
    return response.json();
};

// Method
class UserService {
    async getUser(id: number): Promise<User> {
        const response = await fetch(`/api/users/${id}`);
        return response.json();
    }
}
```

### Sequential vs Parallel

```typescript
// Sequential (slow) - each await blocks
async function sequential(): Promise<[User, Order[]]> {
    const user = await fetchUser(1);        // Wait...
    const orders = await fetchOrders(1);    // Then wait...
    return [user, orders];
}

// Parallel (fast) - start both, await together
async function parallel(): Promise<[User, Order[]]> {
    const userPromise = fetchUser(1);       // Start immediately
    const ordersPromise = fetchOrders(1);   // Start immediately

    const user = await userPromise;
    const orders = await ordersPromise;
    return [user, orders];
}

// Better: Use Promise.all
async function parallelAll(): Promise<[User, Order[]]> {
    return Promise.all([fetchUser(1), fetchOrders(1)]);
}
```

### Top-Level Await

```typescript
// In ES modules (Node.js with type: "module" or .mts files)
const config = await loadConfig();
const db = await connectDatabase(config);

export { db };
```

---

## Error Handling

### try/catch

```typescript
async function safetyFetch(url: string): Promise<Data | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Fetch failed:", error);
        return null;
    }
}
```

### Error Types

```typescript
// Typed error handling
class NetworkError extends Error {
    constructor(message: string, public statusCode: number) {
        super(message);
        this.name = "NetworkError";
    }
}

async function fetchWithError(url: string): Promise<Data> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new NetworkError("Request failed", response.status);
        }
        return response.json();
    } catch (error) {
        if (error instanceof NetworkError) {
            console.log(`Status: ${error.statusCode}`);
        }
        throw error;  // Re-throw
    }
}
```

### Result Type Pattern

```typescript
type Result<T, E = Error> =
    | { ok: true; value: T }
    | { ok: false; error: E };

async function safeFetch<T>(url: string): Promise<Result<T>> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            return { ok: false, error: new Error(`HTTP ${response.status}`) };
        }
        const data = await response.json();
        return { ok: true, value: data };
    } catch (error) {
        return { ok: false, error: error as Error };
    }
}

// Usage
const result = await safeFetch<User>("/api/user");
if (result.ok) {
    console.log(result.value.name);  // Type-safe access
} else {
    console.error(result.error.message);
}
```

### Handling Multiple Errors

```typescript
async function processItems(items: string[]): Promise<Results> {
    const results: Result<Data>[] = [];

    for (const item of items) {
        try {
            const data = await process(item);
            results.push({ ok: true, value: data });
        } catch (error) {
            results.push({ ok: false, error: error as Error });
        }
    }

    return results;
}
```

---

## Promise Combinators

### Promise.all

Waits for all promises. Rejects if any reject.

```typescript
async function fetchAllUsers(ids: number[]): Promise<User[]> {
    const promises = ids.map(id => fetchUser(id));
    return Promise.all(promises);  // Parallel execution
}

// With type inference
const [user, orders, settings] = await Promise.all([
    fetchUser(1),        // Promise<User>
    fetchOrders(1),      // Promise<Order[]>
    fetchSettings(),     // Promise<Settings>
]);
// Types: [User, Order[], Settings]
```

### Promise.allSettled

Waits for all promises, never rejects.

```typescript
interface PromiseSettledResult<T> {
    status: "fulfilled" | "rejected";
    value?: T;
    reason?: any;
}

async function fetchWithFallback(urls: string[]): Promise<Data[]> {
    const results = await Promise.allSettled(
        urls.map(url => fetch(url).then(r => r.json()))
    );

    return results
        .filter((r): r is PromiseFulfilledResult<Data> => r.status === "fulfilled")
        .map(r => r.value);
}
```

### Promise.race

Resolves/rejects with first settled promise.

```typescript
// Timeout pattern
async function fetchWithTimeout<T>(
    promise: Promise<T>,
    ms: number
): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Timeout")), ms);
    });

    return Promise.race([promise, timeout]);
}

const data = await fetchWithTimeout(fetchUser(1), 5000);
```

### Promise.any

Resolves with first fulfilled promise.

```typescript
// Fastest successful response
async function fetchFromMirrors(urls: string[]): Promise<Data> {
    return Promise.any(
        urls.map(url => fetch(url).then(r => r.json()))
    );
}

// All rejected → AggregateError
try {
    await Promise.any([
        Promise.reject("A"),
        Promise.reject("B"),
    ]);
} catch (error) {
    if (error instanceof AggregateError) {
        console.log(error.errors);  // ["A", "B"]
    }
}
```

---

## Typed Async Functions

### Return Types

```typescript
// Explicit Promise<T>
async function getUser(): Promise<User> {
    return { id: 1, name: "Alice" };
}

// Inferred (usually fine, but explicit is clearer)
async function getUsers() {
    return [{ id: 1, name: "Alice" }];  // Promise<{ id: number; name: string }[]>
}

// Void async
async function log(message: string): Promise<void> {
    await writeToLog(message);
    // No return needed
}
```

### Generic Async Functions

```typescript
async function fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    return response.json() as Promise<T>;
}

const user = await fetchJson<User>("/api/user");
const orders = await fetchJson<Order[]>("/api/orders");
```

### Async Callbacks

```typescript
// forEach doesn't await
const items = [1, 2, 3];

// WRONG - doesn't wait
items.forEach(async item => {
    await process(item);  // Fire and forget!
});

// CORRECT - use for...of
for (const item of items) {
    await process(item);  // Sequential
}

// CORRECT - use Promise.all for parallel
await Promise.all(items.map(item => process(item)));
```

### Async Iterators

```typescript
// Async generator
async function* fetchPages(url: string): AsyncGenerator<Page> {
    let page = 1;
    while (true) {
        const data = await fetch(`${url}?page=${page}`);
        const result = await data.json();

        if (result.items.length === 0) break;

        yield result;
        page++;
    }
}

// Consuming async iterator
for await (const page of fetchPages("/api/items")) {
    console.log(page.items);
}
```

---

## Concurrency Patterns

### Rate Limiting

```typescript
async function rateLimited<T>(
    tasks: (() => Promise<T>)[],
    limit: number
): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
        const promise = task().then(result => {
            results.push(result);
        });

        executing.push(promise);

        if (executing.length >= limit) {
            await Promise.race(executing);
            // Remove completed promises
            for (let i = executing.length - 1; i >= 0; i--) {
                // Check if promise is settled (simplified)
            }
        }
    }

    await Promise.all(executing);
    return results;
}

// Simple version with p-limit pattern
async function processWithLimit<T, R>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<R>
): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += limit) {
        const batch = items.slice(i, i + limit);
        const batchResults = await Promise.all(batch.map(fn));
        results.push(...batchResults);
    }

    return results;
}
```

### Retry Pattern

```typescript
async function retry<T>(
    fn: () => Promise<T>,
    retries: number,
    delay: number
): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt === retries) throw error;

            console.log(`Attempt ${attempt + 1} failed, retrying...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    throw new Error("Unreachable");
}

// Exponential backoff
async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number
): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt === maxRetries) throw error;

            const delay = Math.pow(2, attempt) * 1000;  // 1s, 2s, 4s, 8s...
            await new Promise(r => setTimeout(r, delay));
        }
    }
    throw new Error("Unreachable");
}
```

### Queue Processing

```typescript
class AsyncQueue<T, R> {
    private queue: T[] = [];
    private processing = false;
    private results: R[] = [];

    constructor(private processor: (item: T) => Promise<R>) {}

    enqueue(item: T): void {
        this.queue.push(item);
        this.processQueue();
    }

    private async processQueue(): Promise<void> {
        if (this.processing) return;
        this.processing = true;

        while (this.queue.length > 0) {
            const item = this.queue.shift()!;
            const result = await this.processor(item);
            this.results.push(result);
        }

        this.processing = false;
    }

    getResults(): R[] {
        return [...this.results];
    }
}
```

---

## Cancellation

### AbortController

```typescript
async function fetchWithCancel(
    url: string,
    signal: AbortSignal
): Promise<Data> {
    const response = await fetch(url, { signal });
    return response.json();
}

// Usage
const controller = new AbortController();

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
    const data = await fetchWithCancel("/api/data", controller.signal);
} catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
        console.log("Request was cancelled");
    }
}
```

### Manual Cancellation Token

```typescript
interface CancellationToken {
    isCancelled: boolean;
    cancel(): void;
    throwIfCancelled(): void;
}

function createCancellationToken(): CancellationToken {
    let isCancelled = false;

    return {
        get isCancelled() { return isCancelled; },
        cancel() { isCancelled = true; },
        throwIfCancelled() {
            if (isCancelled) throw new Error("Cancelled");
        },
    };
}

async function longRunningTask(token: CancellationToken): Promise<void> {
    for (let i = 0; i < 100; i++) {
        token.throwIfCancelled();
        await processStep(i);
    }
}
```

### Timeout with Cleanup

```typescript
async function withTimeout<T>(
    fn: (signal: AbortSignal) => Promise<T>,
    ms: number
): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ms);

    try {
        return await fn(controller.signal);
    } finally {
        clearTimeout(timeoutId);
    }
}
```

---

## Common Interview Patterns

### Sleep/Delay

```typescript
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function demo(): Promise<void> {
    console.log("Start");
    await sleep(1000);
    console.log("After 1 second");
}
```

### Promisify Callback

```typescript
function promisify<T>(
    fn: (callback: (err: Error | null, result: T) => void) => void
): () => Promise<T> {
    return () => new Promise((resolve, reject) => {
        fn((err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

// Usage
const readFileAsync = promisify(fs.readFile);
```

### Debounce Async

```typescript
function debounceAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    let timeoutId: NodeJS.Timeout | null = null;
    let pendingPromise: Promise<any> | null = null;

    return (...args) => {
        if (timeoutId) clearTimeout(timeoutId);

        return new Promise((resolve, reject) => {
            timeoutId = setTimeout(async () => {
                try {
                    const result = await fn(...args);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            }, delay);
        });
    };
}
```

### Mutex/Lock

```typescript
class Mutex {
    private locked = false;
    private queue: (() => void)[] = [];

    async acquire(): Promise<void> {
        if (!this.locked) {
            this.locked = true;
            return;
        }

        return new Promise(resolve => {
            this.queue.push(resolve);
        });
    }

    release(): void {
        if (this.queue.length > 0) {
            const next = this.queue.shift()!;
            next();
        } else {
            this.locked = false;
        }
    }

    async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
        await this.acquire();
        try {
            return await fn();
        } finally {
            this.release();
        }
    }
}
```

---

## Quick Reference

### Promise Methods

| Method | Description |
|--------|-------------|
| `Promise.resolve(value)` | Create fulfilled promise |
| `Promise.reject(error)` | Create rejected promise |
| `Promise.all(promises)` | Wait for all, fail on any rejection |
| `Promise.allSettled(promises)` | Wait for all, never fails |
| `Promise.race(promises)` | First to settle wins |
| `Promise.any(promises)` | First to fulfill wins |

### Async/Await Gotchas

```typescript
// WRONG: forEach doesn't await
array.forEach(async (x) => await process(x));

// RIGHT: for...of or Promise.all
for (const x of array) await process(x);
await Promise.all(array.map(x => process(x)));

// WRONG: Awaiting in sequence when parallel is possible
const a = await fetchA();
const b = await fetchB();

// RIGHT: Parallel when independent
const [a, b] = await Promise.all([fetchA(), fetchB()]);

// WRONG: Not handling errors
await riskyOperation();  // Unhandled rejection possible

// RIGHT: Always handle errors
try {
    await riskyOperation();
} catch (error) {
    handleError(error);
}
```

### Type Patterns

```typescript
// Extract promise result type
type PromiseResult<T> = T extends Promise<infer U> ? U : never;

// Async function type
type AsyncFn<T> = () => Promise<T>;

// Async function with args
type AsyncFnWithArgs<Args extends any[], R> = (...args: Args) => Promise<R>;

// Make function async
type Promisify<T> = T extends (...args: infer A) => infer R
    ? (...args: A) => Promise<Awaited<R>>
    : never;
```
