# Low-Level Design

## Table of Contents
- [Data Structures](#data-structures)
- [API Design](#api-design)
- [Core Algorithms](#core-algorithms)
- [State Machines](#state-machines)

---

## Data Structures

### Connection Structure

```
struct Connection:
    // Identity
    id: uint64                    // Unique connection ID
    socket_fd: int                // File descriptor

    // State
    state: ConnectionState        // Current state in state machine
    created_at: timestamp         // For timeout calculation
    last_activity: timestamp      // For idle timeout

    // Buffers
    read_buffer: Buffer           // Incoming data
    write_buffer: Buffer          // Outgoing data

    // TLS (if applicable)
    tls_context: TLSContext       // OpenSSL/BoringSSL context
    tls_handshake_complete: bool

    // HTTP State
    current_request: HTTPRequest
    current_response: HTTPResponse

    // Upstream Association
    upstream_connection: Connection  // Linked upstream conn
    upstream_pool: UpstreamPool

    // Metrics
    bytes_received: uint64
    bytes_sent: uint64
    requests_served: uint32
```

### Buffer Structure

```
struct Buffer:
    data: byte[]              // Actual byte storage
    capacity: size_t          // Total allocated size
    read_pos: size_t          // Current read position
    write_pos: size_t         // Current write position

    function available_read() -> size_t:
        return write_pos - read_pos

    function available_write() -> size_t:
        return capacity - write_pos

    function compact():
        // Move unread data to beginning
        if read_pos > 0:
            copy(data[read_pos:write_pos], data[0:])
            write_pos = write_pos - read_pos
            read_pos = 0
```

### Upstream Pool Configuration

```
struct UpstreamPool:
    name: string                      // Pool identifier
    servers: List<UpstreamServer>     // Backend servers
    load_balancer: LoadBalancer       // LB algorithm instance

    // Connection Pool Settings
    max_connections_per_server: int   // e.g., 100
    min_idle_connections: int         // e.g., 10
    connection_timeout_ms: int        // e.g., 5000
    idle_timeout_ms: int              // e.g., 60000

    // Health Check Settings
    health_check_path: string         // e.g., "/health"
    health_check_interval_ms: int     // e.g., 5000
    health_check_timeout_ms: int      // e.g., 2000
    unhealthy_threshold: int          // e.g., 3 failures
    healthy_threshold: int            // e.g., 2 successes

struct UpstreamServer:
    address: string                   // "10.0.1.1:8080"
    weight: int                       // For weighted algorithms
    is_healthy: bool                  // Current health status
    consecutive_failures: int         // For health tracking
    consecutive_successes: int

    // Connection Pool (per server)
    idle_connections: Queue<Connection>
    active_connections: Set<Connection>
    total_connections: int
```

### HTTP Request/Response

```
struct HTTPRequest:
    method: string                    // GET, POST, etc.
    path: string                      // /api/users
    query_string: string              // ?id=123
    http_version: string              // HTTP/1.1
    headers: Map<string, List<string>>
    body: Buffer
    content_length: int64
    is_chunked: bool
    host: string                      // Virtual host

struct HTTPResponse:
    status_code: int                  // 200, 404, etc.
    status_text: string               // OK, Not Found
    http_version: string
    headers: Map<string, List<string>>
    body: Buffer
    content_length: int64
    is_chunked: bool
```

### Route Configuration

```
struct Route:
    id: string
    priority: int                     // Higher = evaluated first

    // Matching Criteria
    match: RouteMatch

    // Action
    upstream_pool: string             // Target pool name
    timeout_ms: int
    retry_policy: RetryPolicy

    // Transformations
    request_headers_add: Map<string, string>
    request_headers_remove: List<string>
    path_rewrite: string              // Regex replacement

struct RouteMatch:
    hosts: List<string>               // ["api.example.com"]
    paths: List<PathMatch>            // [{prefix: "/api/v1"}]
    headers: List<HeaderMatch>        // [{name: "X-Version", exact: "2"}]
    methods: List<string>             // ["GET", "POST"]

struct PathMatch:
    type: enum {PREFIX, EXACT, REGEX}
    value: string
```

### Event Loop State

```
struct EventLoop:
    epoll_fd: int                     // epoll instance
    events: epoll_event[]             // Event buffer
    max_events: int                   // Buffer size

    // Connection Tracking
    connections: Map<int, Connection> // fd -> Connection

    // Timers
    timer_heap: MinHeap<Timer>        // Timeout management

    // Statistics
    events_processed: uint64
    accept_count: uint64
```

---

## API Design

### Configuration API (Control Plane)

#### Get Current Configuration
```
GET /api/v1/config

Response 200:
{
    "version": "1.2.3",
    "last_reload": "2024-01-15T10:30:00Z",
    "upstreams": [...],
    "routes": [...]
}
```

#### Update Upstream Pool
```
PUT /api/v1/upstreams/{pool_name}

Request:
{
    "servers": [
        {"address": "10.0.1.1:8080", "weight": 5},
        {"address": "10.0.1.2:8080", "weight": 3}
    ],
    "health_check": {
        "path": "/health",
        "interval_ms": 5000
    }
}

Response 200:
{
    "status": "applied",
    "effective_at": "2024-01-15T10:31:00Z"
}
```

#### Trigger Configuration Reload
```
POST /api/v1/config/reload

Response 200:
{
    "status": "reloading",
    "old_workers": [1234, 1235],
    "new_workers": [1236, 1237]
}
```

### Dynamic Configuration (xDS-style)

```
// Listener Discovery Service (LDS)
struct Listener:
    name: string
    address: string              // "0.0.0.0:443"
    filter_chains: List<FilterChain>

// Route Discovery Service (RDS)
struct RouteConfiguration:
    name: string
    virtual_hosts: List<VirtualHost>

// Cluster Discovery Service (CDS)
struct Cluster:
    name: string
    type: enum {STATIC, STRICT_DNS, LOGICAL_DNS, EDS}
    lb_policy: enum {ROUND_ROBIN, LEAST_CONN, RING_HASH}
    health_checks: List<HealthCheck>

// Endpoint Discovery Service (EDS)
struct ClusterLoadAssignment:
    cluster_name: string
    endpoints: List<LocalityLbEndpoints>
```

### Metrics Endpoint

```
GET /metrics

Response (Prometheus format):
# HELP proxy_connections_total Total connections accepted
# TYPE proxy_connections_total counter
proxy_connections_total{worker="1"} 1234567

# HELP proxy_requests_total Total requests processed
# TYPE proxy_requests_total counter
proxy_requests_total{upstream="api_pool",status="2xx"} 987654

# HELP proxy_request_duration_seconds Request duration histogram
# TYPE proxy_request_duration_seconds histogram
proxy_request_duration_seconds_bucket{le="0.001"} 500000
proxy_request_duration_seconds_bucket{le="0.005"} 800000
proxy_request_duration_seconds_bucket{le="0.01"} 900000
```

### Health Endpoint

```
GET /health

Response 200:
{
    "status": "healthy",
    "upstreams": {
        "api_pool": {
            "healthy_servers": 3,
            "unhealthy_servers": 1
        }
    },
    "connections": {
        "active": 50000,
        "idle": 10000
    }
}
```

---

## Core Algorithms

### Event Loop Implementation

```
function event_loop_run(loop: EventLoop):
    while not shutdown_requested:
        // Calculate timeout for next timer
        timeout_ms = get_next_timer_timeout(loop.timer_heap)

        // Wait for events (non-blocking with timeout)
        num_events = epoll_wait(loop.epoll_fd, loop.events,
                               loop.max_events, timeout_ms)

        if num_events < 0:
            if errno == EINTR:
                continue  // Interrupted by signal
            handle_error("epoll_wait failed")
            break

        // Process all ready events
        for i = 0 to num_events - 1:
            event = loop.events[i]
            fd = event.data.fd
            events = event.events

            if is_listen_socket(fd):
                handle_accept(loop, fd)
            else:
                conn = loop.connections[fd]
                if events & EPOLLIN:
                    handle_read(loop, conn)
                if events & EPOLLOUT:
                    handle_write(loop, conn)
                if events & (EPOLLERR | EPOLLHUP):
                    handle_close(loop, conn)

        // Process expired timers
        process_timers(loop)

        // Update statistics
        loop.events_processed += num_events
```

### Connection Accept Handler

```
function handle_accept(loop: EventLoop, listen_fd: int):
    while true:
        // Accept in loop until EAGAIN (non-blocking)
        client_fd, client_addr = accept4(listen_fd,
                                         SOCK_NONBLOCK | SOCK_CLOEXEC)

        if client_fd < 0:
            if errno == EAGAIN or errno == EWOULDBLOCK:
                break  // No more pending connections
            log_error("accept failed", errno)
            break

        // Create connection object
        conn = new Connection()
        conn.id = generate_connection_id()
        conn.socket_fd = client_fd
        conn.state = ACCEPTING
        conn.created_at = now()
        conn.last_activity = now()
        conn.read_buffer = allocate_buffer(16384)  // 16KB
        conn.write_buffer = allocate_buffer(16384)

        // Register with epoll (edge-triggered for efficiency)
        epoll_event = {
            events: EPOLLIN | EPOLLOUT | EPOLLET,
            data.fd: client_fd
        }
        epoll_ctl(loop.epoll_fd, EPOLL_CTL_ADD, client_fd, epoll_event)

        // Track connection
        loop.connections[client_fd] = conn
        loop.accept_count++

        // If TLS, start handshake
        if is_tls_listener(listen_fd):
            conn.tls_context = create_tls_context()
            conn.state = TLS_HANDSHAKE
        else:
            conn.state = READING_REQUEST
```

### Request Routing

```
function route_request(request: HTTPRequest, routes: List<Route>) -> Route:
    // Routes are pre-sorted by priority (descending)
    for route in routes:
        if matches_route(request, route.match):
            return route
    return default_route

function matches_route(request: HTTPRequest, match: RouteMatch) -> bool:
    // Check host
    if match.hosts is not empty:
        if request.host not in match.hosts:
            return false

    // Check path
    if match.paths is not empty:
        path_matched = false
        for path_match in match.paths:
            if matches_path(request.path, path_match):
                path_matched = true
                break
        if not path_matched:
            return false

    // Check method
    if match.methods is not empty:
        if request.method not in match.methods:
            return false

    // Check headers
    for header_match in match.headers:
        if not matches_header(request, header_match):
            return false

    return true

function matches_path(path: string, match: PathMatch) -> bool:
    switch match.type:
        case PREFIX:
            return path.starts_with(match.value)
        case EXACT:
            return path == match.value
        case REGEX:
            return regex_match(path, match.value)
```

### Upstream Selection (Load Balancing)

```
// Round Robin
struct RoundRobinBalancer:
    current_index: AtomicInt

function select_round_robin(pool: UpstreamPool) -> UpstreamServer:
    healthy_servers = filter(pool.servers, s -> s.is_healthy)
    if healthy_servers.is_empty():
        return null

    index = pool.load_balancer.current_index.fetch_add(1)
    return healthy_servers[index % healthy_servers.length]


// Weighted Round Robin
struct WeightedRoundRobinBalancer:
    current_weight: int
    max_weight: int
    gcd_weight: int

function select_weighted_round_robin(pool: UpstreamPool) -> UpstreamServer:
    healthy_servers = filter(pool.servers, s -> s.is_healthy)
    if healthy_servers.is_empty():
        return null

    balancer = pool.load_balancer

    while true:
        balancer.current_index = (balancer.current_index + 1) % healthy_servers.length

        if balancer.current_index == 0:
            balancer.current_weight = balancer.current_weight - balancer.gcd_weight
            if balancer.current_weight <= 0:
                balancer.current_weight = balancer.max_weight

        server = healthy_servers[balancer.current_index]
        if server.weight >= balancer.current_weight:
            return server


// Least Connections
function select_least_connections(pool: UpstreamPool) -> UpstreamServer:
    healthy_servers = filter(pool.servers, s -> s.is_healthy)
    if healthy_servers.is_empty():
        return null

    min_connections = MAX_INT
    selected = null

    for server in healthy_servers:
        active = server.active_connections.size()
        if active < min_connections:
            min_connections = active
            selected = server

    return selected


// Consistent Hash (for session affinity)
function select_consistent_hash(pool: UpstreamPool,
                                 key: string) -> UpstreamServer:
    healthy_servers = filter(pool.servers, s -> s.is_healthy)
    if healthy_servers.is_empty():
        return null

    hash = murmurhash3(key)
    ring = pool.load_balancer.hash_ring  // Pre-built ring

    // Binary search for first node >= hash
    index = ring.ceiling_index(hash)
    if index == -1:
        index = 0  // Wrap around

    return ring.nodes[index].server
```

### Connection Pooling

```
function get_upstream_connection(pool: UpstreamPool,
                                  server: UpstreamServer) -> Connection:
    // Try to get idle connection
    while not server.idle_connections.is_empty():
        conn = server.idle_connections.dequeue()

        // Validate connection is still alive
        if is_connection_alive(conn):
            server.active_connections.add(conn)
            return conn
        else:
            close_connection(conn)
            server.total_connections--

    // Create new connection if under limit
    if server.total_connections < pool.max_connections_per_server:
        conn = create_upstream_connection(server.address)
        if conn != null:
            server.total_connections++
            server.active_connections.add(conn)
            return conn

    // Pool exhausted - either wait or fail
    return null

function release_upstream_connection(pool: UpstreamPool,
                                      server: UpstreamServer,
                                      conn: Connection,
                                      reusable: bool):
    server.active_connections.remove(conn)

    if reusable and server.is_healthy:
        // Return to idle pool
        conn.last_activity = now()
        server.idle_connections.enqueue(conn)
    else:
        // Close and discard
        close_connection(conn)
        server.total_connections--
```

### Health Check Scheduler

```
function health_check_loop(pools: List<UpstreamPool>):
    while not shutdown_requested:
        for pool in pools:
            for server in pool.servers:
                schedule_health_check(pool, server)

        sleep(min_interval_ms)

function schedule_health_check(pool: UpstreamPool,
                                server: UpstreamServer):
    // Non-blocking health check
    result = perform_health_check(server, pool.health_check_path,
                                   pool.health_check_timeout_ms)

    if result.success:
        server.consecutive_failures = 0
        server.consecutive_successes++

        if not server.is_healthy:
            if server.consecutive_successes >= pool.healthy_threshold:
                server.is_healthy = true
                log_info("Server marked healthy", server.address)
    else:
        server.consecutive_successes = 0
        server.consecutive_failures++

        if server.is_healthy:
            if server.consecutive_failures >= pool.unhealthy_threshold:
                server.is_healthy = false
                log_warn("Server marked unhealthy", server.address)

function perform_health_check(server: UpstreamServer,
                              path: string,
                              timeout_ms: int) -> HealthCheckResult:
    conn = create_connection_with_timeout(server.address, timeout_ms)
    if conn == null:
        return HealthCheckResult{success: false, error: "connect timeout"}

    // Send HTTP request
    request = "GET " + path + " HTTP/1.1\r\nHost: " + server.address + "\r\n\r\n"
    send_with_timeout(conn, request, timeout_ms)

    // Read response
    response = read_with_timeout(conn, timeout_ms)
    close_connection(conn)

    if response.status_code >= 200 and response.status_code < 400:
        return HealthCheckResult{success: true, latency_ms: elapsed}
    else:
        return HealthCheckResult{success: false, error: "unhealthy status"}
```

### Graceful Shutdown

```
function graceful_shutdown(worker: Worker):
    // Stop accepting new connections
    for listen_fd in worker.listen_sockets:
        epoll_ctl(worker.event_loop.epoll_fd, EPOLL_CTL_DEL, listen_fd, null)

    // Set deadline for existing connections
    shutdown_deadline = now() + graceful_timeout

    // Mark worker as draining
    worker.state = DRAINING

    while worker.event_loop.connections.size() > 0:
        if now() > shutdown_deadline:
            log_warn("Forceful shutdown, connections remaining",
                    worker.event_loop.connections.size())
            break

        // Continue processing existing requests
        event_loop_iteration(worker.event_loop)

        // Close idle connections
        for conn in worker.event_loop.connections.values():
            if conn.state == IDLE and conn.last_activity < (now() - 5s):
                close_connection(conn)

    // Close all remaining connections
    for conn in worker.event_loop.connections.values():
        close_connection(conn)

    log_info("Worker shutdown complete")
```

---

## State Machines

### Client Connection State Machine

```
enum ConnectionState:
    ACCEPTING           // Just accepted, not yet reading
    TLS_HANDSHAKE       // Performing TLS handshake
    READING_REQUEST     // Reading HTTP request
    PARSING_HEADERS     // Parsing request headers
    READING_BODY        // Reading request body
    ROUTING             // Finding upstream
    WAITING_UPSTREAM    // Waiting for upstream connection
    FORWARDING_REQUEST  // Sending to upstream
    READING_RESPONSE    // Reading upstream response
    SENDING_RESPONSE    // Sending to client
    IDLE                // Keep-alive, waiting for next request
    DRAINING            // Graceful close after response
    CLOSED              // Connection closed

// State transitions
Transitions:
    ACCEPTING -> TLS_HANDSHAKE          // TLS listener
    ACCEPTING -> READING_REQUEST        // Plain HTTP
    TLS_HANDSHAKE -> READING_REQUEST    // Handshake success
    TLS_HANDSHAKE -> CLOSED             // Handshake failure
    READING_REQUEST -> PARSING_HEADERS  // Data received
    PARSING_HEADERS -> READING_BODY     // Headers complete, has body
    PARSING_HEADERS -> ROUTING          // Headers complete, no body
    PARSING_HEADERS -> CLOSED           // Parse error
    READING_BODY -> ROUTING             // Body complete
    ROUTING -> WAITING_UPSTREAM         // Route found
    ROUTING -> SENDING_RESPONSE         // 404/Error
    WAITING_UPSTREAM -> FORWARDING_REQUEST // Got upstream conn
    WAITING_UPSTREAM -> SENDING_RESPONSE   // Upstream failed (503)
    FORWARDING_REQUEST -> READING_RESPONSE // Request sent
    READING_RESPONSE -> SENDING_RESPONSE   // Response received
    SENDING_RESPONSE -> IDLE              // Keep-alive
    SENDING_RESPONSE -> DRAINING          // Connection: close
    IDLE -> READING_REQUEST               // New request
    IDLE -> CLOSED                        // Idle timeout
    DRAINING -> CLOSED                    // Drain complete
    * -> CLOSED                           // Error/timeout
```

### Upstream Connection State Machine

```
enum UpstreamConnectionState:
    CONNECTING          // TCP connect in progress
    TLS_HANDSHAKE       // TLS to upstream (if configured)
    IDLE                // In connection pool
    ACTIVE              // Handling request
    DRAINING            // Marked for close after response
    CLOSED

Transitions:
    CONNECTING -> TLS_HANDSHAKE         // TCP connected, need TLS
    CONNECTING -> IDLE                  // TCP connected, no TLS
    CONNECTING -> CLOSED                // Connect failed
    TLS_HANDSHAKE -> IDLE               // Handshake complete
    TLS_HANDSHAKE -> CLOSED             // Handshake failed
    IDLE -> ACTIVE                      // Acquired by request
    IDLE -> CLOSED                      // Idle timeout
    ACTIVE -> IDLE                      // Request complete, reusable
    ACTIVE -> DRAINING                  // Request complete, close pending
    ACTIVE -> CLOSED                    // Error during request
    DRAINING -> CLOSED                  // Drained
```

### HTTP/2 Stream State Machine

```
enum HTTP2StreamState:
    IDLE                // Stream not yet used
    RESERVED_LOCAL      // Server push reserved
    RESERVED_REMOTE     // Client push reserved
    OPEN                // Active bidirectional
    HALF_CLOSED_LOCAL   // We sent END_STREAM
    HALF_CLOSED_REMOTE  // They sent END_STREAM
    CLOSED              // Fully closed

// Per RFC 7540
Transitions:
    IDLE -> OPEN                        // Send/recv HEADERS
    IDLE -> RESERVED_LOCAL              // Send PUSH_PROMISE
    IDLE -> RESERVED_REMOTE             // Recv PUSH_PROMISE
    RESERVED_LOCAL -> HALF_CLOSED_REMOTE // Send HEADERS
    RESERVED_REMOTE -> HALF_CLOSED_LOCAL // Recv HEADERS
    OPEN -> HALF_CLOSED_LOCAL           // Send END_STREAM
    OPEN -> HALF_CLOSED_REMOTE          // Recv END_STREAM
    OPEN -> CLOSED                      // Send/recv RST_STREAM
    HALF_CLOSED_LOCAL -> CLOSED         // Recv END_STREAM/RST_STREAM
    HALF_CLOSED_REMOTE -> CLOSED        // Send END_STREAM/RST_STREAM
```
