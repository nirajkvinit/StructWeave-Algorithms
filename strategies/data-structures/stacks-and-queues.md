---
title: "Stacks and Queues"
category: data-structures
difficulty: beginner
estimated_time_minutes: 25
prerequisites: []
---

# Stacks and Queues

## Overview

Stacks and queues are **abstract data types** that define behavior, not implementation. They're essential for managing ordered data with specific access patterns.

## Stack: Last In, First Out (LIFO)

### Real-World Examples
- Stack of plates (add/remove from top)
- Browser back button (most recent page first)
- Undo/redo functionality
- Function call stack in programming

### Visualization

```mermaid
graph TB
    subgraph "Stack Operations"
        TOP[Top] -.->|push/pop here| A[Element 3]
        A --> B[Element 2]
        B --> C[Element 1]
        C --> BOTTOM[Bottom]
    end

    style A fill:#90EE90
    style TOP fill:#FFD700
```

### Operations

| Operation | Description | Time Complexity |
|-----------|-------------|-----------------|
| `push(x)` | Add element to top | O(1) |
| `pop()` | Remove and return top element | O(1) |
| `peek()/top()` | View top element without removing | O(1) |
| `isEmpty()` | Check if stack is empty | O(1) |
| `size()` | Get number of elements | O(1) |

### Stack Behavior Example

```mermaid
graph LR
    subgraph "Push 5, 12, 7"
        direction TB
        A1[7<br/>top]
        A2[12]
        A3[5]
    end

    subgraph "Pop → returns 7"
        direction TB
        B1[12<br/>top]
        B2[5]
    end

    subgraph "Push 20"
        direction TB
        C1[20<br/>top]
        C2[12]
        C3[5]
    end
```

## Queue: First In, First Out (FIFO)

### Real-World Examples
- Line at a store (first person in is first served)
- Print job queue
- Breadth-First Search (BFS)
- Task scheduling

### Visualization

```mermaid
graph LR
    REAR[Rear<br/>enqueue] -.->|add here| A[Element 1]
    A --> B[Element 2]
    B --> C[Element 3]
    C -.->|remove here| FRONT[Front<br/>dequeue]

    style A fill:#e1f5ff
    style C fill:#90EE90
    style REAR fill:#FFD700
    style FRONT fill:#FFD700
```

### Operations

| Operation | Description | Time Complexity |
|-----------|-------------|-----------------|
| `enqueue(x)` | Add element to rear | O(1) |
| `dequeue()` | Remove and return front element | O(1) |
| `front()/peek()` | View front element without removing | O(1) |
| `isEmpty()` | Check if queue is empty | O(1) |
| `size()` | Get number of elements | O(1) |

### Queue Behavior Example

```mermaid
graph TB
    subgraph "Enqueue 5, 12, 7"
        direction LR
        A1[5<br/>front] --> A2[12] --> A3[7<br/>rear]
    end

    subgraph "Dequeue → returns 5"
        direction LR
        B1[12<br/>front] --> B2[7<br/>rear]
    end

    subgraph "Enqueue 20"
        direction LR
        C1[12<br/>front] --> C2[7] --> C3[20<br/>rear]
    end
```

## Implementation Options

### Stack Implementation

#### Option 1: Array-Based Stack
```
push: arr[++top] = x
pop:  return arr[top--]
```
**Pros:** Simple, cache-friendly
**Cons:** Fixed capacity (or need resizing)

#### Option 2: Linked List Stack
```
push: newNode.next = head; head = newNode
pop:  value = head.data; head = head.next
```
**Pros:** No capacity limit
**Cons:** Extra memory for pointers

### Queue Implementation

#### Option 1: Array-Based (Circular)
Use circular array with front and rear pointers.

```mermaid
graph LR
    A[0: 12] --> B[1: 7]
    B --> C[2: 20]
    C --> D[3: empty]
    D --> E[4: empty]

    FRONT[front=0] -.-> A
    REAR[rear=2] -.-> C
```

**Pros:** Cache-friendly, no pointer overhead
**Cons:** Fixed capacity (or need resizing)

#### Option 2: Linked List Queue
Maintain head (front) and tail (rear) pointers.

```mermaid
graph LR
    HEAD[head] --> A[12]
    A --> B[7]
    B --> C[20]
    TAIL[tail] -.-> C

    style A fill:#90EE90
    style C fill:#FFB6C1
```

**Pros:** No capacity limit, O(1) operations
**Cons:** Extra memory for pointers

## Deque: Double-Ended Queue

A **deque** (pronounced "deck") allows insertion and deletion at both ends.

```mermaid
graph LR
    LEFT[addFirst/<br/>removeFirst] -.-> A[10]
    A --> B[20]
    B --> C[30]
    C -.-> RIGHT[addLast/<br/>removeLast]

    style A fill:#90EE90
    style C fill:#90EE90
```

### Deque as Generalization
- Stack = Deque with operations on one end only
- Queue = Deque with enqueue at one end, dequeue at other

## Common Stack Use Cases

### 1. Parentheses Matching
Check if brackets are balanced: `{[()]}` ✓ vs `{[(])}` ✗

**Algorithm:**
- Push opening brackets
- Pop and match closing brackets
- Stack empty at end → balanced

### 2. Expression Evaluation
Convert infix to postfix or evaluate expressions.

### 3. Backtracking
DFS, path finding, puzzle solving.

### 4. Function Call Stack
How programming languages manage function calls.

### 5. Monotonic Stack
Maintain elements in monotonic order for problems like:
- Next greater element
- Largest rectangle in histogram

```mermaid
graph TB
    subgraph "Monotonic Decreasing Stack"
        direction TB
        A[9<br/>top]
        B[5]
        C[3]
    end
```

## Common Queue Use Cases

### 1. Breadth-First Search (BFS)
Level-order traversal of trees/graphs.

```mermaid
graph TB
    A[1] --> B[2]
    A --> C[3]
    B --> D[4]
    B --> E[5]

    Q[Queue: 1 → 2 → 3 → 4 → 5]

    style Q fill:#FFD700
```

### 2. Level-Order Traversal
Process tree/graph level by level.

### 3. Task Scheduling
First-come, first-served scheduling.

### 4. Buffer Management
Managing data streams, print spoolers.

### 5. Sliding Window
When combined with deque for optimization.

## Stack vs Queue Decision Guide

| Scenario | Use This |
|----------|----------|
| Process in reverse order | Stack |
| Undo/redo functionality | Stack |
| Depth-First Search (DFS) | Stack |
| Recursion simulation | Stack |
| Process in order received | Queue |
| Breadth-First Search (BFS) | Queue |
| Level-order traversal | Queue |
| Task scheduling (FCFS) | Queue |
| Need both ends access | Deque |

## Complexity Summary

### Time Complexity
Both stack and queue (with proper implementation):
- Insert: O(1)
- Delete: O(1)
- Peek: O(1)
- Search: O(n) - not designed for search

### Space Complexity
- O(n) for n elements
- Array implementation may have wasted space if not full

## Common Patterns and Techniques

### Pattern 1: Two Stacks to Simulate Queue
Use two stacks to implement queue operations in amortized O(1).

### Pattern 2: Queue with Two Stacks
Stack 1 for enqueue, Stack 2 for dequeue.

### Pattern 3: Monotonic Stack/Queue
Maintain monotonic order for optimization:
- Next greater/smaller element
- Sliding window maximum

### Pattern 4: Stack for Parsing
Use stack to parse expressions, HTML, etc.

### Pattern 5: Queue for BFS
Standard BFS template uses queue.

## Implementation Examples

### Stack Operations Flow
```mermaid
sequenceDiagram
    participant User
    participant Stack

    User->>Stack: push(5)
    Stack-->>User: success
    User->>Stack: push(12)
    Stack-->>User: success
    User->>Stack: peek()
    Stack-->>User: 12
    User->>Stack: pop()
    Stack-->>User: 12
    User->>Stack: pop()
    Stack-->>User: 5
    User->>Stack: isEmpty()
    Stack-->>User: true
```

### Queue Operations Flow
```mermaid
sequenceDiagram
    participant User
    participant Queue

    User->>Queue: enqueue(5)
    Queue-->>User: success
    User->>Queue: enqueue(12)
    Queue-->>User: success
    User->>Queue: front()
    Queue-->>User: 5
    User->>Queue: dequeue()
    Queue-->>User: 5
    User->>Queue: dequeue()
    Queue-->>User: 12
    User->>Queue: isEmpty()
    Queue-->>User: true
```

## Common Pitfalls

1. **Stack overflow**: Pushing too many elements (array-based)
2. **Queue underflow**: Dequeuing from empty queue
3. **Not checking isEmpty**: Before pop/dequeue operations
4. **Circular queue pointer arithmetic**: Getting front/rear indices wrong
5. **Memory leaks**: In linked list implementations, not freeing nodes

## Related Data Structures

### Priority Queue
Queue where elements have priorities, not FIFO order.
- Typically implemented with heap
- Used in Dijkstra's algorithm, task scheduling

### Circular Queue
Array-based queue that wraps around.
- Efficient use of array space
- Common in buffer implementations

## Practice Strategy

Master these problems in order:

**Stack:**
1. Valid Parentheses (basic stack usage)
2. Min Stack (stack with O(1) min operation)
3. Evaluate Reverse Polish Notation (expression evaluation)
4. Daily Temperatures (monotonic stack)

**Queue:**
1. Implement Queue using Stacks (understanding both structures)
2. Binary Tree Level Order Traversal (BFS)
3. Number of Recent Calls (queue for sliding window)
4. Sliding Window Maximum (monotonic deque)

**Combined:**
5. Design Browser History (stacks for back/forward)

Understanding stacks and queues is fundamental - they appear everywhere from parsing to graph algorithms to system design!
