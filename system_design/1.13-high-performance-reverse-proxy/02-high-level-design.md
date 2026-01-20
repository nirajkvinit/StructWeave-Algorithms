# High-Level Design

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [Key Design Decisions](#key-design-decisions)
- [Communication Patterns](#communication-patterns)

---

## Architecture Overview

```mermaid
flowchart TB
    subgraph "Client Layer"
        C1[Browser]
        C2[Mobile]
        C3[API Client]
    end

    subgraph "Reverse Proxy Cluster"
        subgraph "Proxy Node 1"
            MP1[Master Process]
            WP1A[Worker 1]
            WP1B[Worker 2]
            WP1C[Worker N]
        end
        subgraph "Proxy Node 2"
            MP2[Master Process]
            WP2A[Worker 1]
            WP2B[Worker 2]
        end
    end

    subgraph "Upstream Layer"
        US1[App Server Pool A]
        US2[App Server Pool B]
        US3[App Server Pool C]
    end

    C1 & C2 & C3 --> |"TLS/TCP"| WP1A & WP1B & WP2A & WP2B

    WP1A & WP1B & WP1C --> US1 & US2 & US3
    WP2A & WP2B --> US1 & US2 & US3

    MP1 -.-> |"Manage"| WP1A & WP1B & WP1C
    MP2 -.-> |"Manage"| WP2A & WP2B
```

---

## Core Components

### 1. Master Process

The master process is the parent process responsible for orchestration, not request handling.

**Responsibilities:**
- Configuration loading and validation
- Worker process lifecycle management
- Signal handling (SIGHUP for reload, SIGTERM for shutdown)
- Privileged operations (binding to ports < 1024)
- Log file management

```mermaid
flowchart TB
    subgraph Master["Master Process (PID 1)"]
        CM[Config Manager]
        WM[Worker Manager]
        SH[Signal Handler]
        LM[Log Manager]
    end

    CF[Config File] --> CM
    CM --> |"Validated Config"| WM
    WM --> |"Fork"| W1[Worker 1]
    WM --> |"Fork"| W2[Worker 2]
    WM --> |"Fork"| WN[Worker N]

    SH --> |"SIGHUP"| CM
    SH --> |"SIGTERM"| WM
```

### 2. Worker Process

Workers handle actual client connections and request processing. Each worker is independent.

**Responsibilities:**
- Accept new connections (shared listen socket)
- Event loop for I/O multiplexing
- TLS handshake and termination
- Request parsing and routing
- Upstream connection management
- Response forwarding

```mermaid
flowchart TB
    subgraph Worker["Worker Process"]
        EL[Event Loop]

        subgraph "Connection Handlers"
            CH1[Client Handler]
            CH2[Client Handler]
            CHN[Client Handler]
        end

        subgraph "Upstream Management"
            UP[Upstream Pools]
            HC[Health Checker]
        end

        TLSC[TLS Context]
        CONF[Config Cache]
    end

    EL --> CH1 & CH2 & CHN
    CH1 & CH2 & CHN --> UP
    UP --> HC
    TLSC --> CH1 & CH2 & CHN
```

### 3. Event Loop

The heart of the worker process - handles all I/O operations without blocking.

**Key Operations:**
- `epoll_wait()` / `kqueue()` for event notification
- Non-blocking accept for new connections
- Non-blocking read/write for data transfer
- Timer management for timeouts

```mermaid
flowchart TB
    START([Start]) --> EPOLL[epoll_wait/kqueue]
    EPOLL --> |"Events Ready"| PROCESS[Process Events]

    PROCESS --> ACCEPT{Accept Event?}
    ACCEPT --> |Yes| NEWCONN[Create Connection]
    ACCEPT --> |No| READ{Read Event?}

    READ --> |Yes| READDATA[Read Data]
    READ --> |No| WRITE{Write Event?}

    WRITE --> |Yes| WRITEDATA[Write Data]
    WRITE --> |No| TIMER{Timer Event?}

    TIMER --> |Yes| TIMEOUT[Handle Timeout]
    TIMER --> |No| NEXT[Next Event]

    NEWCONN & READDATA & WRITEDATA & TIMEOUT & NEXT --> EPOLL
```

### 4. Connection Manager

Manages the lifecycle of both client and upstream connections.

**Client Connections:**
- Accept and TLS handshake
- Keep-alive management
- Request parsing
- Timeout enforcement

**Upstream Connections:**
- Connection pooling per upstream
- Health status tracking
- Keep-alive and reuse
- Load balancer integration

### 5. Upstream Pool

Manages connections to a group of backend servers.

```mermaid
flowchart LR
    subgraph "Upstream Pool: API Servers"
        LB[Load Balancer]

        subgraph "Server 1 (Healthy)"
            S1[10.0.1.1:8080]
            CP1[Conn Pool: 5/10]
        end

        subgraph "Server 2 (Healthy)"
            S2[10.0.1.2:8080]
            CP2[Conn Pool: 3/10]
        end

        subgraph "Server 3 (Unhealthy)"
            S3[10.0.1.3:8080]
            CP3[Conn Pool: 0/10]
        end
    end

    REQ[Request] --> LB
    LB --> |"Least Conn"| CP2
    LB -.-> |"Excluded"| CP3
```

### 6. Configuration System

Handles configuration loading, validation, and hot reload.

```mermaid
sequenceDiagram
    participant Admin
    participant Master
    participant OldWorkers as Old Workers
    participant NewWorkers as New Workers

    Admin->>Master: SIGHUP (reload)
    Master->>Master: Load new config
    Master->>Master: Validate config

    alt Config Valid
        Master->>NewWorkers: Fork with new config
        Master->>OldWorkers: Graceful shutdown signal
        OldWorkers->>OldWorkers: Finish existing requests
        OldWorkers->>Master: Exit
    else Config Invalid
        Master->>Admin: Log error, keep old config
    end
```

---

## Data Flow

### Request Flow (Happy Path)

```mermaid
sequenceDiagram
    participant Client
    participant Worker as Worker Process
    participant EL as Event Loop
    participant TLS as TLS Engine
    participant Router
    participant Pool as Upstream Pool
    participant Backend

    Client->>Worker: TCP SYN
    Worker->>Client: TCP SYN-ACK
    Client->>Worker: TCP ACK

    Client->>Worker: TLS ClientHello
    TLS->>Client: TLS ServerHello, Certificate
    Client->>TLS: TLS Finished

    Client->>Worker: HTTP Request (encrypted)
    Worker->>TLS: Decrypt
    TLS->>Router: HTTP Request

    Router->>Router: Match route
    Router->>Pool: Get connection
    Pool->>Backend: Forward request (reused conn)

    Backend->>Pool: HTTP Response
    Pool->>TLS: Response
    TLS->>Client: Encrypted response
```

### Connection State Machine

```mermaid
stateDiagram-v2
    [*] --> Accepting: Listen socket ready
    Accepting --> TLSHandshake: Accept (non-TLS skips)
    TLSHandshake --> ReadingRequest: Handshake complete
    TLSHandshake --> Closed: Handshake failed

    ReadingRequest --> ParsingHeaders: Data received
    ParsingHeaders --> ReadingBody: Headers complete
    ParsingHeaders --> Closed: Parse error

    ReadingBody --> Routing: Body complete
    Routing --> WaitingUpstream: Upstream selected

    WaitingUpstream --> ForwardingRequest: Connection acquired
    ForwardingRequest --> ReadingResponse: Request sent

    ReadingResponse --> SendingResponse: Response received
    SendingResponse --> ReadingRequest: Keep-alive
    SendingResponse --> Closed: Connection: close

    Closed --> [*]
```

---

## Key Design Decisions

### Decision 1: Event-Driven vs Thread-per-Connection

| Approach | Pros | Cons |
|----------|------|------|
| **Thread-per-Connection** | Simple programming model, blocking I/O | High memory (1MB stack/thread), context switch overhead |
| **Event-Driven** | Low memory (~10KB/conn), no context switches | Complex state machines, callback complexity |

**Decision: Event-Driven**

**Rationale:**
- At 100K connections, thread-per-connection needs ~100GB for stacks alone
- Context switching 100K threads causes severe CPU overhead
- Event-driven handles 100K+ connections with minimal resources

### Decision 2: Multi-Process vs Multi-Threaded Workers

| Approach | Pros | Cons |
|----------|------|------|
| **Multi-Process (NGINX style)** | Process isolation, simpler debugging, no locks | Memory overhead, IPC needed for shared state |
| **Multi-Threaded (HAProxy style)** | Shared memory, lower overhead | Lock contention, harder debugging |

**Decision: Multi-Process with Optional Threading**

**Rationale:**
- Process isolation prevents one bad request from crashing all workers
- Modern approach: multi-threaded workers (HAProxy, Envoy) with careful locking
- Choose based on your operational preference

### Decision 3: Buffering vs Streaming

| Approach | Pros | Cons |
|----------|------|------|
| **Full Buffering** | Simpler retry logic, protects upstream from slow clients | Memory usage, latency for large bodies |
| **Streaming** | Low latency, constant memory | Can't retry, upstream exposed to slow clients |

**Decision: Configurable per route**

**Rationale:**
- Small requests (< 1MB): Buffer for retry capability
- Large uploads/downloads: Stream to minimize memory and latency
- WebSocket: Always streaming

### Decision 4: Connection Pooling Strategy

| Approach | Pros | Cons |
|----------|------|------|
| **Per-Worker Pools** | No locking, simple | Uneven distribution, more total connections |
| **Shared Pool (multi-threaded)** | Efficient resource use | Lock contention |
| **No Pooling** | Simplest | TLS handshake overhead, TCP slow start |

**Decision: Per-Worker Pools**

**Rationale:**
- Avoids cross-worker locking
- Each worker maintains connections to all upstreams
- Worker count × Pool size = Total connections to upstream

### Decision 5: Configuration Reload Strategy

| Approach | Pros | Cons |
|----------|------|------|
| **Full Restart** | Clean slate | Drops connections |
| **Graceful Restart (new workers)** | No dropped connections | Brief resource spike |
| **In-Place Reload** | Fastest, no new processes | Complex, risky |

**Decision: Graceful Restart**

**Rationale:**
- New workers created with new config
- Old workers finish existing requests then exit
- No connections dropped during reload

---

## Communication Patterns

### Client-to-Proxy Communication

```
Client                         Proxy
   |                             |
   |---- TCP Handshake --------->|
   |<--- TCP Handshake ----------|
   |                             |
   |---- TLS ClientHello ------->|
   |<--- TLS ServerHello --------|
   |<--- Certificate ------------|
   |---- TLS Finished ---------->|
   |<--- TLS Finished -----------|
   |                             |
   |==== Encrypted Channel ======|
   |                             |
   |---- HTTP Request ---------->|
   |<--- HTTP Response ----------|
   |                             |
   |---- HTTP Request 2 -------->|  (keep-alive reuse)
   |<--- HTTP Response 2 --------|
```

### Proxy-to-Upstream Communication

```
Proxy                          Upstream
   |                              |
   |-- Get pooled connection ---->|
   |                              |
   |---- HTTP Request ----------->|
   |<--- HTTP Response -----------|
   |                              |
   |-- Return conn to pool ------>|
   |                              |
   (Connection kept alive for reuse)
```

### Health Check Flow

```mermaid
sequenceDiagram
    participant HC as Health Checker
    participant Pool as Upstream Pool
    participant S1 as Server 1
    participant S2 as Server 2

    loop Every 5 seconds
        HC->>S1: GET /health
        S1->>HC: 200 OK
        HC->>Pool: Mark S1 healthy

        HC->>S2: GET /health
        S2--xHC: Timeout
        HC->>Pool: Mark S2 unhealthy
    end
```

---

## Component Interaction Diagram

```mermaid
flowchart TB
    subgraph "External"
        Clients[Clients]
        Backends[Backend Servers]
        Config[Config Files]
        Metrics[Metrics System]
    end

    subgraph "Master Process"
        ConfigMgr[Config Manager]
        WorkerMgr[Worker Manager]
        SignalHandler[Signal Handler]
    end

    subgraph "Worker Process"
        EventLoop[Event Loop]
        ConnMgr[Connection Manager]
        TLSEngine[TLS Engine]
        HTTPParser[HTTP Parser]
        Router[Router]
        UpstreamMgr[Upstream Manager]
        HealthCheck[Health Checker]
        MetricsCollector[Metrics Collector]
    end

    Config --> ConfigMgr
    ConfigMgr --> WorkerMgr
    WorkerMgr --> EventLoop

    Clients <--> ConnMgr
    ConnMgr <--> TLSEngine
    TLSEngine <--> HTTPParser
    HTTPParser <--> Router
    Router <--> UpstreamMgr
    UpstreamMgr <--> Backends
    UpstreamMgr <--> HealthCheck
    HealthCheck <--> Backends

    EventLoop --> ConnMgr
    EventLoop --> HealthCheck
    MetricsCollector --> Metrics
```

---

## System Boundaries

### What the Reverse Proxy Handles

| Responsibility | Details |
|----------------|---------|
| Connection termination | TCP, TLS from clients |
| Protocol translation | HTTP/1.1 ↔ HTTP/2 |
| Request routing | Host, path, header-based |
| Load balancing | Algorithm-based server selection |
| Health checking | Upstream availability |
| Request forwarding | To upstream servers |
| Response forwarding | To clients |

### What the Reverse Proxy Does NOT Handle

| Responsibility | Where It Belongs |
|----------------|------------------|
| Business logic | Application servers |
| Database queries | Backend services |
| User authentication | Auth service (can integrate) |
| Rate limiting | Dedicated rate limiter (can integrate) |
| Long-term caching | Dedicated cache layer |
| DNS resolution | DNS infrastructure |
