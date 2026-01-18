# Concurrency in Rust

> Fearless concurrency — Rust's compile-time guarantees prevent data races

Rust's ownership system extends to concurrency, preventing data races at compile time. This guide covers the fundamentals needed for interviews.

---

## Table of Contents

1. [Threading Basics](#threading-basics)
2. [Move Closures](#move-closures)
3. [Message Passing](#message-passing)
4. [Shared State](#shared-state)
5. [Send and Sync Traits](#send-and-sync-traits)
6. [Async/Await Basics](#asyncawait-basics)
7. [Data Parallelism with Rayon](#data-parallelism-with-rayon)
8. [Common Patterns](#common-patterns)
9. [Interview Problems](#interview-problems)

---

## Threading Basics

### Spawning Threads

```rust
use std::thread;
use std::time::Duration;

fn main() {
    // Spawn a new thread
    let handle = thread::spawn(|| {
        for i in 1..10 {
            println!("hi number {} from spawned thread!", i);
            thread::sleep(Duration::from_millis(1));
        }
    });

    // Main thread work
    for i in 1..5 {
        println!("hi number {} from main thread!", i);
        thread::sleep(Duration::from_millis(1));
    }

    // Wait for spawned thread to finish
    handle.join().unwrap();
}
```

### Getting Thread Results

```rust
use std::thread;

fn main() {
    let handle = thread::spawn(|| {
        // Thread can return a value
        let sum: i32 = (1..=100).sum();
        sum
    });

    // join() returns Result<T, E> where T is the thread's return value
    let result = handle.join().unwrap();
    println!("Sum: {}", result);
}
```

### Multiple Threads

```rust
use std::thread;

fn main() {
    let mut handles = vec![];

    for i in 0..10 {
        let handle = thread::spawn(move || {
            println!("Thread {} starting", i);
            i * i
        });
        handles.push(handle);
    }

    let results: Vec<i32> = handles
        .into_iter()
        .map(|h| h.join().unwrap())
        .collect();

    println!("Results: {:?}", results);
}
```

---

## Move Closures

Threads need to own their data — use `move` to transfer ownership:

```rust
use std::thread;

fn main() {
    let v = vec![1, 2, 3];

    // Error: closure may outlive v
    // let handle = thread::spawn(|| {
    //     println!("{:?}", v);
    // });

    // Solution: move ownership to thread
    let handle = thread::spawn(move || {
        println!("{:?}", v);
    });

    // v is no longer accessible here
    // println!("{:?}", v);  // Error: v was moved

    handle.join().unwrap();
}
```

### Cloning for Multiple Threads

```rust
use std::thread;

fn main() {
    let data = vec![1, 2, 3, 4, 5];
    let mut handles = vec![];

    for i in 0..3 {
        let data_clone = data.clone();  // Each thread gets its own copy
        let handle = thread::spawn(move || {
            let sum: i32 = data_clone.iter().sum();
            println!("Thread {}: sum = {}", i, sum);
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }
}
```

---

## Message Passing

Channels for thread communication — "Share memory by communicating."

### Basic Channel

```rust
use std::sync::mpsc;  // Multiple Producer, Single Consumer
use std::thread;

fn main() {
    // Create channel
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        let val = String::from("hello");
        tx.send(val).unwrap();
        // val is moved, can't use it here
    });

    // Receive blocks until message arrives
    let received = rx.recv().unwrap();
    println!("Got: {}", received);
}
```

### Multiple Messages

```rust
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

fn main() {
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        let vals = vec!["hi", "from", "the", "thread"];
        for val in vals {
            tx.send(val).unwrap();
            thread::sleep(Duration::from_millis(100));
        }
    });

    // Iterate over received messages
    for received in rx {
        println!("Got: {}", received);
    }
}
```

### Multiple Producers

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();

    for i in 0..3 {
        let tx_clone = tx.clone();  // Clone transmitter for each thread
        thread::spawn(move || {
            tx_clone.send(format!("Message from thread {}", i)).unwrap();
        });
    }

    // Drop original tx so rx knows when all senders are done
    drop(tx);

    for received in rx {
        println!("{}", received);
    }
}
```

### Non-blocking Receive

```rust
use std::sync::mpsc;

let (tx, rx) = mpsc::channel();

// Try to receive without blocking
match rx.try_recv() {
    Ok(msg) => println!("Got: {}", msg),
    Err(mpsc::TryRecvError::Empty) => println!("No message yet"),
    Err(mpsc::TryRecvError::Disconnected) => println!("Channel closed"),
}

// Receive with timeout
match rx.recv_timeout(Duration::from_secs(1)) {
    Ok(msg) => println!("Got: {}", msg),
    Err(_) => println!("Timed out"),
}
```

---

## Shared State

### Mutex — Mutual Exclusion

```rust
use std::sync::Mutex;

fn main() {
    let m = Mutex::new(5);

    {
        // lock() returns MutexGuard, a smart pointer
        let mut num = m.lock().unwrap();
        *num = 6;
    }  // MutexGuard dropped, lock released

    println!("m = {:?}", m);
}
```

### Arc + Mutex for Shared Mutable State

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    // Arc: Atomic Reference Counted (thread-safe Rc)
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter_clone = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            let mut num = counter_clone.lock().unwrap();
            *num += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Result: {}", *counter.lock().unwrap());  // 10
}
```

### RwLock — Read-Write Lock

```rust
use std::sync::{Arc, RwLock};
use std::thread;

fn main() {
    let data = Arc::new(RwLock::new(vec![1, 2, 3]));
    let mut handles = vec![];

    // Multiple readers
    for i in 0..3 {
        let data_clone = Arc::clone(&data);
        handles.push(thread::spawn(move || {
            let read = data_clone.read().unwrap();
            println!("Reader {}: {:?}", i, *read);
        }));
    }

    // Single writer
    let data_clone = Arc::clone(&data);
    handles.push(thread::spawn(move || {
        let mut write = data_clone.write().unwrap();
        write.push(4);
        println!("Writer: {:?}", *write);
    }));

    for handle in handles {
        handle.join().unwrap();
    }
}
```

### Avoiding Deadlocks

```rust
// Deadlock: Thread 1 holds A, waits for B
//           Thread 2 holds B, waits for A

// Solutions:
// 1. Always acquire locks in the same order
// 2. Use try_lock() to avoid blocking
// 3. Use channels instead of shared state

use std::sync::Mutex;

let lock = Mutex::new(0);

// try_lock() returns immediately
match lock.try_lock() {
    Ok(mut guard) => {
        *guard += 1;
    }
    Err(_) => {
        println!("Could not acquire lock");
    }
}
```

---

## Send and Sync Traits

Rust's compile-time concurrency safety comes from two marker traits:

### Send

A type is `Send` if it's safe to transfer ownership to another thread.

```rust
// Most types are Send:
// - Primitive types (i32, bool, etc.)
// - String, Vec<T> (if T: Send)
// - Arc<T> (if T: Send + Sync)

// NOT Send:
// - Rc<T> — not thread-safe reference counting
// - Raw pointers
```

### Sync

A type is `Sync` if it's safe to reference from multiple threads (`&T` is Send).

```rust
// Most types are Sync:
// - Primitive types
// - Mutex<T>, RwLock<T>
// - Arc<T> (if T: Send + Sync)

// NOT Sync:
// - RefCell<T> — not thread-safe interior mutability
// - Cell<T>
// - Rc<T>
```

### Type Safety Examples

```rust
use std::rc::Rc;
use std::sync::Arc;
use std::cell::RefCell;
use std::sync::Mutex;

// Rc is not Send — compile error
// let rc = Rc::new(5);
// thread::spawn(move || { println!("{}", rc); });

// Arc is Send + Sync — works
let arc = Arc::new(5);
thread::spawn(move || { println!("{}", arc); });

// RefCell is not Sync — compile error
// let cell = Arc::new(RefCell::new(5));
// share_across_threads(cell);

// Mutex is Sync — works
let mutex = Arc::new(Mutex::new(5));
share_across_threads(mutex);
```

---

## Async/Await Basics

Async programming for I/O-bound tasks. Rust's standard library provides the `async`/`await` syntax but requires an external runtime to execute futures.

### The Async Ecosystem (2025)

> **Important**: As of March 2025, **async-std has been discontinued**. The Rust async ecosystem has consolidated around **Tokio** as the primary runtime.

| Runtime | Status | Use Case |
|---------|--------|----------|
| **Tokio** | ✅ Active, dominant | Production web servers, networking, most projects |
| **smol** | ✅ Active | Lightweight alternative, simpler codebase |
| async-std | ❌ Discontinued | Do not use for new projects |

### Async Functions

```rust
// async fn returns a Future
async fn fetch_data() -> String {
    // Simulate async I/O
    String::from("data")
}

// .await pauses until Future completes
async fn process() {
    let data = fetch_data().await;
    println!("Got: {}", data);
}
```

### Running Async Code with Tokio

```rust
// Add to Cargo.toml:
// [dependencies]
// tokio = { version = "1", features = ["full"] }

use tokio;

// The #[tokio::main] macro sets up the runtime
#[tokio::main]
async fn main() {
    let result = fetch_data().await;
    println!("{}", result);
}

// For library code or custom runtime configuration:
fn main() {
    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        let result = fetch_data().await;
        println!("{}", result);
    });
}

// Single-threaded runtime (lighter weight)
#[tokio::main(flavor = "current_thread")]
async fn main() {
    // ...
}
```

### Async Closures (Rust 1.85+)

```rust
// Async closures stabilized in Rust 1.85 (2024 Edition)
let fetch = async |url: &str| {
    // async operation
    format!("fetched {}", url)
};

// Use in async context
let result = fetch("https://example.com").await;

// Async closures capture their environment like regular closures
let prefix = "Response: ";
let process = async move |data: String| {
    format!("{}{}", prefix, data)
};
```

### Concurrent Futures with Tokio

```rust
use tokio;

#[tokio::main]
async fn main() {
    // Join: Run multiple futures concurrently, wait for all
    let (result1, result2) = tokio::join!(
        fetch_data("url1"),
        fetch_data("url2")
    );
    println!("Got: {} and {}", result1, result2);

    // Select: Race futures, return first to complete
    tokio::select! {
        result = fetch_data("fast") => println!("Fast: {}", result),
        result = fetch_data("slow") => println!("Slow: {}", result),
    }

    // Spawn: Run a future on a separate task
    let handle = tokio::spawn(async {
        fetch_data("background").await
    });
    let result = handle.await.unwrap();
}

async fn fetch_data(url: &str) -> String {
    // Simulate network delay
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    format!("data from {}", url)
}
```

### Async Streams

```rust
// For iterating over async sequences, use tokio-stream or futures
use tokio_stream::{self as stream, StreamExt};

#[tokio::main]
async fn main() {
    let mut stream = stream::iter(vec![1, 2, 3]);

    while let Some(value) = stream.next().await {
        println!("Got: {}", value);
    }
}
```

---

## Data Parallelism with Rayon

For CPU-bound parallel computation, **Rayon** provides a simple way to parallelize iterators with minimal code changes.

### Getting Started

```rust
// Add to Cargo.toml:
// [dependencies]
// rayon = "1.11"

use rayon::prelude::*;

fn main() {
    let nums: Vec<i32> = (0..1_000_000).collect();

    // Sequential: iter()
    let sum: i32 = nums.iter().sum();

    // Parallel: par_iter() - just add "par_"!
    let sum: i32 = nums.par_iter().sum();
}
```

### Parallel Iterators

```rust
use rayon::prelude::*;

let data = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Parallel map
let doubled: Vec<i32> = data.par_iter()
    .map(|x| x * 2)
    .collect();

// Parallel filter
let evens: Vec<&i32> = data.par_iter()
    .filter(|&&x| x % 2 == 0)
    .collect();

// Parallel fold (reduce)
let sum: i32 = data.par_iter()
    .copied()
    .reduce(|| 0, |a, b| a + b);

// Parallel for_each (side effects)
data.par_iter().for_each(|x| {
    println!("Processing: {}", x);  // Order not guaranteed!
});

// Parallel find_any (returns first match found, not necessarily first in order)
let found = data.par_iter().find_any(|&&x| x > 5);

// Parallel any/all
let has_large = data.par_iter().any(|&x| x > 5);  // true
let all_positive = data.par_iter().all(|&x| x > 0);  // true
```

### Mutable Parallel Iteration

```rust
use rayon::prelude::*;

let mut data = vec![1, 2, 3, 4, 5];

// Parallel mutable iteration
data.par_iter_mut().for_each(|x| {
    *x *= 2;
});

// Result: [2, 4, 6, 8, 10]
```

### Parallel Sorting

```rust
use rayon::prelude::*;

let mut data = vec![5, 2, 8, 1, 9, 3, 7, 4, 6];

// Parallel sort (faster for large arrays)
data.par_sort();

// Parallel sort with custom comparator
data.par_sort_by(|a, b| b.cmp(a));  // Descending

// Parallel sort by key
data.par_sort_by_key(|x| -x);
```

### When to Use Rayon vs Threads

| Use Rayon When | Use Threads When |
|----------------|------------------|
| Data parallelism (same operation on many items) | Task parallelism (different operations) |
| CPU-bound computation | I/O-bound work (use async instead) |
| Processing large collections | Long-running background tasks |
| Embarrassingly parallel problems | Need fine-grained control |

### Performance Considerations

```rust
use rayon::prelude::*;

// ❌ Bad: Overhead exceeds benefit for small data
let small = vec![1, 2, 3, 4, 5];
let sum: i32 = small.par_iter().sum();  // Sequential is faster!

// ✅ Good: Large data benefits from parallelism
let large: Vec<i32> = (0..1_000_000).collect();
let sum: i32 = large.par_iter().sum();  // Much faster!

// ❌ Bad: Trivial per-element work
data.par_iter().map(|x| x + 1).collect::<Vec<_>>();

// ✅ Good: Expensive per-element computation
data.par_iter().map(|x| expensive_computation(x)).collect::<Vec<_>>();
```

**Rule of thumb**: Use Rayon when you have >10,000 elements OR expensive per-element computation.

### New in Rayon 1.11

```rust
use rayon::prelude::*;

let data: Vec<i32> = (0..1000).collect();

// Unordered take/skip (faster than ordered versions)
let first_100: Vec<_> = data.par_iter().take_any(100).collect();
let skip_100: Vec<_> = data.par_iter().skip_any(100).collect();

// Unordered take/skip with condition
let under_500: Vec<_> = data.par_iter()
    .take_any_while(|&&x| x < 500)
    .collect();

// Cooperative yielding - yield execution to Rayon
use rayon::{yield_now, yield_local};

data.par_iter().for_each(|x| {
    expensive_work(x);
    yield_now();  // Let other tasks run (from entire pool)
});

// Fold with fixed-size chunks (predictable batching)
let chunk_sums: Vec<i32> = data.par_iter()
    .copied()
    .fold_chunks(100, || 0, |acc, x| acc + x)
    .collect();

// Broadcast - run function on ALL threads in pool
let thread_ids: Vec<_> = rayon::broadcast(|ctx| {
    ctx.index()  // Returns thread index
});
println!("Pool has {} threads", thread_ids.len());
```

---

## Common Patterns

### Producer-Consumer

```rust
use std::sync::mpsc;
use std::thread;

fn producer_consumer() {
    let (tx, rx) = mpsc::channel();

    // Producer
    let producer = thread::spawn(move || {
        for i in 0..10 {
            tx.send(i).unwrap();
        }
    });

    // Consumer
    let consumer = thread::spawn(move || {
        let mut sum = 0;
        for received in rx {
            sum += received;
        }
        sum
    });

    producer.join().unwrap();
    let total = consumer.join().unwrap();
    println!("Total: {}", total);
}
```

### Thread Pool Pattern

```rust
use std::sync::{mpsc, Arc, Mutex};
use std::thread;

struct ThreadPool {
    workers: Vec<thread::JoinHandle<()>>,
    sender: mpsc::Sender<Box<dyn FnOnce() + Send>>,
}

impl ThreadPool {
    fn new(size: usize) -> Self {
        let (sender, receiver) = mpsc::channel();
        let receiver = Arc::new(Mutex::new(receiver));

        let mut workers = Vec::with_capacity(size);

        for _ in 0..size {
            let receiver = Arc::clone(&receiver);
            workers.push(thread::spawn(move || loop {
                let job = receiver.lock().unwrap().recv();
                match job {
                    Ok(job) => job(),
                    Err(_) => break,
                }
            }));
        }

        ThreadPool { workers, sender }
    }

    fn execute<F>(&self, f: F)
    where
        F: FnOnce() + Send + 'static,
    {
        self.sender.send(Box::new(f)).unwrap();
    }
}
```

### Parallel Map

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn parallel_map<T, U, F>(data: Vec<T>, f: F, num_threads: usize) -> Vec<U>
where
    T: Send + 'static,
    U: Send + 'static,
    F: Fn(T) -> U + Send + Sync + 'static,
{
    let f = Arc::new(f);
    let results = Arc::new(Mutex::new(Vec::with_capacity(data.len())));
    let data = Arc::new(Mutex::new(data.into_iter().enumerate()));

    let mut handles = vec![];

    for _ in 0..num_threads {
        let f = Arc::clone(&f);
        let data = Arc::clone(&data);
        let results = Arc::clone(&results);

        handles.push(thread::spawn(move || {
            loop {
                let item = data.lock().unwrap().next();
                match item {
                    Some((i, val)) => {
                        let result = f(val);
                        results.lock().unwrap().push((i, result));
                    }
                    None => break,
                }
            }
        }));
    }

    for handle in handles {
        handle.join().unwrap();
    }

    let mut results: Vec<_> = Arc::try_unwrap(results)
        .unwrap()
        .into_inner()
        .unwrap();
    results.sort_by_key(|(i, _)| *i);
    results.into_iter().map(|(_, v)| v).collect()
}
```

---

## Interview Problems

### Problem 1: Print Numbers Alternately

Two threads printing odd and even numbers alternately.

```rust
use std::sync::{Arc, Mutex, Condvar};
use std::thread;

fn print_alternately(n: i32) {
    let pair = Arc::new((Mutex::new(1), Condvar::new()));
    let pair_clone = Arc::clone(&pair);

    // Odd thread
    let odd = thread::spawn(move || {
        let (lock, cvar) = &*pair;
        let mut num = lock.lock().unwrap();
        while *num <= n {
            while *num % 2 == 0 && *num <= n {
                num = cvar.wait(num).unwrap();
            }
            if *num <= n {
                println!("Odd: {}", *num);
                *num += 1;
                cvar.notify_one();
            }
        }
    });

    // Even thread
    let even = thread::spawn(move || {
        let (lock, cvar) = &*pair_clone;
        let mut num = lock.lock().unwrap();
        while *num <= n {
            while *num % 2 == 1 && *num <= n {
                num = cvar.wait(num).unwrap();
            }
            if *num <= n {
                println!("Even: {}", *num);
                *num += 1;
                cvar.notify_one();
            }
        }
    });

    odd.join().unwrap();
    even.join().unwrap();
}
```

### Problem 2: Bounded Buffer (Producer-Consumer)

```rust
use std::sync::{Arc, Mutex, Condvar};
use std::collections::VecDeque;

struct BoundedBuffer<T> {
    buffer: Mutex<VecDeque<T>>,
    capacity: usize,
    not_empty: Condvar,
    not_full: Condvar,
}

impl<T> BoundedBuffer<T> {
    fn new(capacity: usize) -> Self {
        BoundedBuffer {
            buffer: Mutex::new(VecDeque::with_capacity(capacity)),
            capacity,
            not_empty: Condvar::new(),
            not_full: Condvar::new(),
        }
    }

    fn put(&self, item: T) {
        let mut buffer = self.buffer.lock().unwrap();
        while buffer.len() == self.capacity {
            buffer = self.not_full.wait(buffer).unwrap();
        }
        buffer.push_back(item);
        self.not_empty.notify_one();
    }

    fn take(&self) -> T {
        let mut buffer = self.buffer.lock().unwrap();
        while buffer.is_empty() {
            buffer = self.not_empty.wait(buffer).unwrap();
        }
        let item = buffer.pop_front().unwrap();
        self.not_full.notify_one();
        item
    }
}
```

### Problem 3: Parallel Sum

```rust
use std::thread;

fn parallel_sum(nums: Vec<i32>, num_threads: usize) -> i32 {
    let chunk_size = (nums.len() + num_threads - 1) / num_threads;
    let mut handles = vec![];

    for chunk in nums.chunks(chunk_size) {
        let chunk = chunk.to_vec();
        handles.push(thread::spawn(move || {
            chunk.iter().sum::<i32>()
        }));
    }

    handles.into_iter()
        .map(|h| h.join().unwrap())
        .sum()
}
```

---

## Quick Reference

### When to Use What

| Pattern | Use Case |
|---------|----------|
| `thread::spawn` | CPU-bound parallel work, task parallelism |
| `rayon::par_iter()` | Data parallelism (same operation on many items) |
| Channels (`mpsc`) | Communication between threads |
| `Arc<Mutex<T>>` | Shared mutable state |
| `Arc<RwLock<T>>` | Many readers, few writers |
| `async/await` + Tokio | I/O-bound concurrent tasks, networking |

### Type Safety Summary

| Type | Thread-Safe | Notes |
|------|-------------|-------|
| `Rc<T>` | No | Use `Arc<T>` for threads |
| `RefCell<T>` | No | Use `Mutex<T>` for threads |
| `Cell<T>` | No | Use atomic types |
| `Arc<T>` | Yes | Shared ownership across threads |
| `Mutex<T>` | Yes | Exclusive access |
| `RwLock<T>` | Yes | Multiple readers or one writer |
| `mpsc::channel` | Yes | Message passing |

### Common Mistakes

```rust
// 1. Forgetting move in spawn closure
// thread::spawn(|| use_data(&v));  // Error: v doesn't live long enough
thread::spawn(move || use_data(&v));  // OK

// 2. Using Rc instead of Arc
// let rc = Rc::new(data);
let arc = Arc::new(data);

// 3. Holding lock across await
// let guard = mutex.lock().unwrap();
// some_async_fn().await;  // Deadlock risk!
// Better: release lock before await

// 4. Forgetting to join threads
// Spawned threads are detached if handle is dropped
let handle = thread::spawn(|| work());
handle.join().unwrap();  // Don't forget!
```

---

## Summary

Rust's concurrency model provides:

1. **Compile-time safety** — Data races are impossible
2. **Flexibility** — Channels OR shared state, your choice
3. **Zero-cost abstractions** — Safe concurrent code with no runtime overhead
4. **Fearless refactoring** — The compiler catches threading bugs

The key insight: **Ownership rules extend to threads**. If you understand ownership, you understand Rust concurrency.

---

<p align="center">
<b>Fearless concurrency:</b> If it compiles, it's thread-safe.
</p>
