# Low-Level Design

[← Back to Index](./00-index.md)

---

## Data Model

### Core Entities

```
┌─────────────────────────────────────────────────────────────────────┐
│  SERVICE DISCOVERY DATA MODEL                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ENTITY Service:                                                     │
│      name: String              // "payment-service"                 │
│      namespace: String         // "production" (optional)           │
│      instances: List<Instance> // Active instances                  │
│      metadata: Map<String, String> // Service-level tags           │
│      created_at: Timestamp                                          │
│      updated_at: Timestamp                                          │
│                                                                      │
│  ENTITY Instance:                                                    │
│      id: String                // UUID or "host:port"               │
│      service_name: String      // Parent service reference          │
│      host: String              // IP address or hostname            │
│      port: Integer             // Service port                       │
│      health_status: HealthStatus // UP, DOWN, UNKNOWN               │
│      health_check_url: String  // "/health" endpoint                │
│      metadata: Map<String, String> // Instance-level tags          │
│      weight: Integer           // Load balancing weight (1-100)     │
│      zone: String              // Availability zone                 │
│      registered_at: Timestamp                                       │
│      last_heartbeat: Timestamp                                      │
│      lease_id: String          // For TTL-based registration        │
│                                                                      │
│  ENUM HealthStatus:                                                  │
│      UNKNOWN                   // Initial state, not yet checked    │
│      UP                        // Healthy, serving traffic          │
│      DOWN                      // Failed health checks              │
│      OUT_OF_SERVICE            // Manually marked unavailable       │
│      STARTING                  // Warming up, not ready             │
│                                                                      │
│  ENTITY HealthCheck:                                                 │
│      instance_id: String                                            │
│      check_type: CheckType     // HTTP, TCP, gRPC, Script           │
│      endpoint: String          // URL or port                       │
│      interval: Duration        // Check frequency                   │
│      timeout: Duration         // Max wait time                     │
│      healthy_threshold: Integer // Consecutive passes needed        │
│      unhealthy_threshold: Integer // Consecutive fails to mark DOWN │
│                                                                      │
│  ENTITY Lease:                                                       │
│      id: String                // Lease identifier                  │
│      instance_id: String       // Associated instance               │
│      ttl: Duration             // Time-to-live                      │
│      granted_at: Timestamp                                          │
│      expires_at: Timestamp                                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Storage Schema

```
┌─────────────────────────────────────────────────────────────────────┐
│  IN-MEMORY DATA STRUCTURES                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Primary Index (service lookup):                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ serviceIndex: Map<ServiceName, Service>                      │   │
│  │                                                               │   │
│  │ "payment-service" → Service{instances: [...]}                │   │
│  │ "user-service" → Service{instances: [...]}                   │   │
│  │ "order-service" → Service{instances: [...]}                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Instance Index (direct instance lookup):                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ instanceIndex: Map<InstanceId, Instance>                     │   │
│  │                                                               │   │
│  │ "abc123" → Instance{host: "10.0.1.1", ...}                  │   │
│  │ "def456" → Instance{host: "10.0.1.2", ...}                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Zone Index (zone-aware queries):                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ zoneIndex: Map<Zone, Map<ServiceName, List<Instance>>>       │   │
│  │                                                               │   │
│  │ "us-east-1a" → {"payment": [inst1, inst2], "user": [inst3]} │   │
│  │ "us-east-1b" → {"payment": [inst4], "user": [inst5, inst6]} │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Lease Heap (TTL expiration):                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ leaseHeap: MinHeap<Lease> ordered by expires_at              │   │
│  │                                                               │   │
│  │ [lease1(exp:10:00), lease2(exp:10:01), lease3(exp:10:02)]   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  Watch Subscriptions:                                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ watchIndex: Map<ServiceName, List<WatchChannel>>             │   │
│  │                                                               │   │
│  │ "payment-service" → [channel1, channel2, channel3]           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## API Design

### REST API

```
┌─────────────────────────────────────────────────────────────────────┐
│  SERVICE DISCOVERY REST API                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  REGISTRATION                                                        │
│  ─────────────                                                       │
│  POST /v1/services/{service}/instances                               │
│  Request:                                                            │
│  {                                                                   │
│    "id": "payment-1",           // Optional, auto-generated         │
│    "host": "10.0.1.1",                                              │
│    "port": 8080,                                                     │
│    "health_check": {                                                 │
│      "type": "HTTP",                                                │
│      "endpoint": "/health",                                         │
│      "interval": "10s"                                              │
│    },                                                                │
│    "metadata": {                                                     │
│      "version": "2.1.0",                                            │
│      "zone": "us-east-1a",                                          │
│      "weight": 100                                                   │
│    }                                                                 │
│  }                                                                   │
│  Response: 201 Created                                               │
│  {                                                                   │
│    "instance_id": "payment-1",                                      │
│    "lease_id": "lease-abc123",                                      │
│    "lease_ttl": 30                                                   │
│  }                                                                   │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│  DEREGISTRATION                                                      │
│  ─────────────────                                                   │
│  DELETE /v1/services/{service}/instances/{instance_id}               │
│  Response: 204 No Content                                            │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│  HEARTBEAT (Lease Renewal)                                           │
│  ─────────────────────────────                                       │
│  PUT /v1/leases/{lease_id}/renew                                    │
│  Response: 200 OK                                                    │
│  {                                                                   │
│    "lease_id": "lease-abc123",                                      │
│    "ttl": 30,                                                        │
│    "expires_at": "2025-01-20T10:30:00Z"                             │
│  }                                                                   │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│  DISCOVERY (Lookup)                                                  │
│  ────────────────────                                                │
│  GET /v1/services/{service}/instances                                │
│  Query Parameters:                                                   │
│    ?health=UP                    // Filter by health status         │
│    ?zone=us-east-1a             // Filter by zone                   │
│    ?version=2.x                  // Filter by version (semver)      │
│    ?tags=canary,team:payments   // Filter by tags                   │
│  Response: 200 OK                                                    │
│  {                                                                   │
│    "service": "payment-service",                                    │
│    "instances": [                                                    │
│      {                                                               │
│        "id": "payment-1",                                           │
│        "host": "10.0.1.1",                                          │
│        "port": 8080,                                                 │
│        "health": "UP",                                               │
│        "metadata": {...}                                             │
│      },                                                              │
│      ...                                                             │
│    ]                                                                 │
│  }                                                                   │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│  WATCH (Long-poll or SSE)                                           │
│  ────────────────────────────                                        │
│  GET /v1/services/{service}/watch?index={last_index}                │
│  Response: 200 OK (blocks until change or timeout)                   │
│  {                                                                   │
│    "index": 12345,               // For next request                │
│    "instances": [...]            // Current state                   │
│  }                                                                   │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│  HEALTH STATUS UPDATE                                                │
│  ────────────────────────                                            │
│  PUT /v1/services/{service}/instances/{id}/status                   │
│  Request:                                                            │
│  {                                                                   │
│    "status": "OUT_OF_SERVICE"    // Manual override                 │
│  }                                                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### gRPC API

```
┌─────────────────────────────────────────────────────────────────────┐
│  SERVICE DISCOVERY gRPC API (Protobuf)                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  service DiscoveryService {                                          │
│    // Registration                                                   │
│    rpc Register(RegisterRequest) returns (RegisterResponse);         │
│    rpc Deregister(DeregisterRequest) returns (Empty);               │
│                                                                      │
│    // Heartbeat                                                      │
│    rpc Heartbeat(HeartbeatRequest) returns (HeartbeatResponse);     │
│                                                                      │
│    // Discovery                                                      │
│    rpc Discover(DiscoverRequest) returns (DiscoverResponse);        │
│                                                                      │
│    // Watch (server streaming)                                       │
│    rpc Watch(WatchRequest) returns (stream WatchResponse);          │
│                                                                      │
│    // Bidirectional streaming for high-frequency updates            │
│    rpc RegisterStream(stream Instance) returns (stream Event);      │
│  }                                                                   │
│                                                                      │
│  message Instance {                                                  │
│    string id = 1;                                                    │
│    string service_name = 2;                                         │
│    string host = 3;                                                  │
│    int32 port = 4;                                                   │
│    HealthStatus health = 5;                                         │
│    map<string, string> metadata = 6;                                │
│    HealthCheck health_check = 7;                                    │
│  }                                                                   │
│                                                                      │
│  message WatchResponse {                                             │
│    EventType type = 1;           // ADDED, MODIFIED, DELETED        │
│    Instance instance = 2;                                            │
│    int64 revision = 3;           // For ordering                    │
│  }                                                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### DNS Interface

```
┌─────────────────────────────────────────────────────────────────────┐
│  DNS INTERFACE (Consul-style)                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Standard A Record Query:                                            │
│  ─────────────────────────                                           │
│  Query: payment-service.service.consul                              │
│  Response:                                                           │
│    payment-service.service.consul. 30 IN A 10.0.1.1                 │
│    payment-service.service.consul. 30 IN A 10.0.1.2                 │
│                                                                      │
│  SRV Record (includes port):                                         │
│  ────────────────────────────                                        │
│  Query: _payment._tcp.service.consul                                │
│  Response:                                                           │
│    _payment._tcp.service.consul. 30 IN SRV 1 1 8080 payment-1.node │
│    _payment._tcp.service.consul. 30 IN SRV 1 1 8080 payment-2.node │
│                                                                      │
│  Zone-Filtered Query:                                                │
│  ────────────────────                                                │
│  Query: payment-service.service.us-east-1a.consul                   │
│  Response: Only instances in us-east-1a                              │
│                                                                      │
│  Tag-Filtered Query:                                                 │
│  ──────────────────                                                  │
│  Query: canary.payment-service.service.consul                       │
│  Response: Only instances with "canary" tag                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Algorithms

### Algorithm 1: Service Registration

```
ALGORITHM RegisterInstance(request: RegisterRequest) → RegisterResponse:
    // Register a new service instance with the registry

    INPUT:
        request: {service_name, host, port, metadata, health_check}

    PROCESS:
        // Step 1: Validate request
        IF service_name IS EMPTY OR host IS EMPTY:
            RETURN Error("Invalid request: missing required fields")

        // Step 2: Generate instance ID if not provided
        instance_id = request.id OR GenerateUUID()

        // Step 3: Create instance record
        instance = Instance{
            id: instance_id,
            service_name: request.service_name,
            host: request.host,
            port: request.port,
            health_status: UNKNOWN,
            metadata: request.metadata,
            registered_at: NOW(),
            last_heartbeat: NOW()
        }

        // Step 4: Create lease for TTL-based expiration
        lease = Lease{
            id: GenerateLeaseId(),
            instance_id: instance_id,
            ttl: DEFAULT_LEASE_TTL,  // e.g., 30 seconds
            granted_at: NOW(),
            expires_at: NOW() + DEFAULT_LEASE_TTL
        }

        // Step 5: Atomic write (with lock or CAS)
        LOCK(service_name):
            // Get or create service entry
            service = serviceIndex.GetOrCreate(service_name)

            // Check for duplicate
            IF instanceIndex.Contains(instance_id):
                RETURN Error("Instance already registered")

            // Add instance to indexes
            service.instances.Add(instance)
            instanceIndex.Put(instance_id, instance)
            zoneIndex.Add(instance.zone, service_name, instance)
            leaseHeap.Push(lease)
            leaseIndex.Put(lease.id, lease)

        // Step 6: Replicate to followers (async or sync based on config)
        ReplicateToFollowers(Operation.REGISTER, instance)

        // Step 7: Start health checking
        ScheduleHealthCheck(instance)

        // Step 8: Notify watchers
        NotifyWatchers(service_name, Event.INSTANCE_ADDED, instance)

    RETURN RegisterResponse{
        instance_id: instance_id,
        lease_id: lease.id,
        lease_ttl: lease.ttl
    }

    COMPLEXITY:
        Time: O(1) average, O(log n) for lease heap
        Space: O(1) per instance
```

### Algorithm 2: Service Discovery (Lookup)

```
ALGORITHM DiscoverService(request: DiscoverRequest) → DiscoverResponse:
    // Find healthy instances of a service

    INPUT:
        request: {service_name, filters: {health, zone, version, tags}}

    PROCESS:
        // Step 1: Get service from index
        service = serviceIndex.Get(request.service_name)
        IF service IS NULL:
            RETURN DiscoverResponse{instances: []}

        // Step 2: Get all instances
        instances = service.instances.Copy()  // Snapshot for consistency

        // Step 3: Apply filters
        result = []
        FOR EACH instance IN instances:
            // Health filter (default: only UP)
            IF request.filters.health IS SET:
                IF instance.health_status != request.filters.health:
                    CONTINUE
            ELSE:
                IF instance.health_status != UP:
                    CONTINUE

            // Zone filter
            IF request.filters.zone IS SET:
                IF instance.metadata["zone"] != request.filters.zone:
                    CONTINUE

            // Version filter (semver match)
            IF request.filters.version IS SET:
                IF NOT SemverMatch(instance.metadata["version"], request.filters.version):
                    CONTINUE

            // Tag filter
            IF request.filters.tags IS SET:
                IF NOT HasAllTags(instance.metadata, request.filters.tags):
                    CONTINUE

            result.Add(instance)

        // Step 4: Sort by preference (optional)
        IF request.prefer_zone IS SET:
            SortByZonePreference(result, request.prefer_zone)

    RETURN DiscoverResponse{
        service: service_name,
        instances: result,
        revision: service.revision
    }

    COMPLEXITY:
        Time: O(n) where n = number of instances
        Space: O(n) for result list

    OPTIMIZATION:
        - Use zone index for zone-filtered queries: O(1) lookup
        - Pre-compute healthy instance list: O(1) for health-only filter
```

### Algorithm 3: Heartbeat and Lease Renewal

```
ALGORITHM RenewLease(request: HeartbeatRequest) → HeartbeatResponse:
    // Renew a lease to keep instance registered

    INPUT:
        request: {lease_id} or {instance_id}

    PROCESS:
        // Step 1: Find lease
        lease = leaseIndex.Get(request.lease_id)
        IF lease IS NULL:
            // Try to find by instance_id
            instance = instanceIndex.Get(request.instance_id)
            IF instance IS NULL:
                RETURN Error("Instance not found")
            lease = leaseIndex.GetByInstance(instance.id)

        IF lease IS NULL:
            RETURN Error("Lease not found")

        // Step 2: Check if lease expired
        IF lease.expires_at < NOW():
            RETURN Error("Lease expired, re-register required")

        // Step 3: Renew lease
        old_expiry = lease.expires_at
        lease.expires_at = NOW() + lease.ttl

        // Step 4: Update instance heartbeat
        instance = instanceIndex.Get(lease.instance_id)
        instance.last_heartbeat = NOW()

        // Step 5: Reposition in lease heap
        leaseHeap.UpdateKey(lease, old_expiry, lease.expires_at)

    RETURN HeartbeatResponse{
        lease_id: lease.id,
        ttl: lease.ttl,
        expires_at: lease.expires_at
    }

    COMPLEXITY:
        Time: O(log n) for heap update
        Space: O(1)
```

### Algorithm 4: Lease Expiration (Background)

```
ALGORITHM LeaseExpirationChecker():
    // Background goroutine/thread that evicts expired instances

    PROCESS:
        LOOP FOREVER:
            // Sleep until next lease expiry or periodic check
            next_expiry = leaseHeap.Peek().expires_at
            sleep_duration = MIN(next_expiry - NOW(), MAX_SLEEP_INTERVAL)

            IF sleep_duration > 0:
                SLEEP(sleep_duration)

            // Process all expired leases
            WHILE NOT leaseHeap.IsEmpty() AND leaseHeap.Peek().expires_at <= NOW():
                expired_lease = leaseHeap.Pop()

                // Double-check expiry (could have been renewed)
                IF expired_lease.expires_at > NOW():
                    leaseHeap.Push(expired_lease)
                    CONTINUE

                // Evict instance
                EvictInstance(expired_lease.instance_id, "lease_expired")

ALGORITHM EvictInstance(instance_id: String, reason: String):
    // Remove instance from all indexes

    LOCK(instance.service_name):
        instance = instanceIndex.Get(instance_id)
        IF instance IS NULL:
            RETURN  // Already removed

        service = serviceIndex.Get(instance.service_name)

        // Remove from all indexes
        service.instances.Remove(instance)
        instanceIndex.Remove(instance_id)
        zoneIndex.Remove(instance.zone, instance.service_name, instance)
        leaseIndex.Remove(instance.lease_id)

    // Cancel health checks
    CancelHealthCheck(instance_id)

    // Notify watchers
    NotifyWatchers(instance.service_name, Event.INSTANCE_REMOVED, instance)

    // Log eviction
    Log.Info("Instance evicted", {
        instance_id: instance_id,
        service: instance.service_name,
        reason: reason
    })

    COMPLEXITY:
        Time: O(log n) for heap operations
        Space: O(1)
```

### Algorithm 5: Health Check Manager

```
ALGORITHM HealthCheckManager():
    // Manages health checks for all registered instances

    STRUCTURE HealthCheckState:
        instance_id: String
        consecutive_successes: Integer
        consecutive_failures: Integer
        last_check: Timestamp
        current_status: HealthStatus

    ALGORITHM ScheduleHealthCheck(instance: Instance):
        state = HealthCheckState{
            instance_id: instance.id,
            consecutive_successes: 0,
            consecutive_failures: 0,
            last_check: NULL,
            current_status: UNKNOWN
        }
        healthCheckStates.Put(instance.id, state)

        // Schedule periodic check
        scheduler.ScheduleAtFixedRate(
            () => PerformHealthCheck(instance.id),
            instance.health_check.interval
        )

    ALGORITHM PerformHealthCheck(instance_id: String):
        instance = instanceIndex.Get(instance_id)
        IF instance IS NULL:
            RETURN  // Instance was deregistered

        state = healthCheckStates.Get(instance_id)
        check_config = instance.health_check

        // Perform the actual health check
        TRY:
            result = ExecuteHealthCheck(instance, check_config)
            state.last_check = NOW()

            IF result.success:
                state.consecutive_successes++
                state.consecutive_failures = 0

                IF state.consecutive_successes >= check_config.healthy_threshold:
                    IF state.current_status != UP:
                        UpdateHealthStatus(instance, UP)
                        state.current_status = UP
            ELSE:
                state.consecutive_failures++
                state.consecutive_successes = 0

                IF state.consecutive_failures >= check_config.unhealthy_threshold:
                    IF state.current_status != DOWN:
                        UpdateHealthStatus(instance, DOWN)
                        state.current_status = DOWN

        CATCH Timeout:
            // Treat timeout as failure
            state.consecutive_failures++
            state.consecutive_successes = 0
            state.last_check = NOW()

    ALGORITHM ExecuteHealthCheck(instance: Instance, config: HealthCheck) → Result:
        SWITCH config.type:
            CASE HTTP:
                url = "http://" + instance.host + ":" + instance.port + config.endpoint
                response = HttpClient.Get(url, timeout: config.timeout)
                RETURN Result{
                    success: response.status >= 200 AND response.status < 300
                }

            CASE TCP:
                connection = TcpConnect(instance.host, instance.port, timeout: config.timeout)
                success = connection.IsOpen()
                connection.Close()
                RETURN Result{success: success}

            CASE gRPC:
                response = GrpcHealthClient.Check(instance.host, instance.port)
                RETURN Result{success: response.status == SERVING}

    ALGORITHM UpdateHealthStatus(instance: Instance, new_status: HealthStatus):
        old_status = instance.health_status
        instance.health_status = new_status

        // Notify watchers of health change
        NotifyWatchers(instance.service_name, Event.HEALTH_CHANGED, instance)

        Log.Info("Health status changed", {
            instance_id: instance.id,
            old_status: old_status,
            new_status: new_status
        })
```

### Algorithm 6: Watch/Subscription Management

```
ALGORITHM Watch(request: WatchRequest) → Stream<WatchResponse>:
    // Subscribe to changes for a service

    INPUT:
        request: {service_name, revision}

    PROCESS:
        // Step 1: Create watch channel
        channel = CreateChannel()

        // Step 2: Register watch
        LOCK(watchIndex):
            watches = watchIndex.GetOrCreate(request.service_name)
            watches.Add(channel)

        // Step 3: Send current state if requested
        IF request.revision == 0 OR request.send_initial:
            current = DiscoverService({service_name: request.service_name})
            channel.Send(WatchResponse{
                type: INITIAL,
                instances: current.instances,
                revision: current.revision
            })

        // Step 4: Stream changes until client disconnects
        TRY:
            WHILE channel.IsOpen():
                event = channel.Receive()  // Blocks until event
                channel.Send(event)
        FINALLY:
            // Cleanup on disconnect
            LOCK(watchIndex):
                watches = watchIndex.Get(request.service_name)
                watches.Remove(channel)

ALGORITHM NotifyWatchers(service_name: String, event_type: EventType, instance: Instance):
    // Notify all watchers of a service change

    watches = watchIndex.Get(service_name)
    IF watches IS NULL OR watches.IsEmpty():
        RETURN

    response = WatchResponse{
        type: event_type,
        instance: instance,
        revision: GetCurrentRevision(service_name)
    }

    FOR EACH channel IN watches:
        TRY:
            channel.SendNonBlocking(response)
        CATCH ChannelFull:
            Log.Warn("Watch channel full, dropping event", {
                service: service_name,
                event: event_type
            })

    COMPLEXITY:
        Time: O(w) where w = number of watchers
        Space: O(1) per notification
```

---

## Complexity Summary

| Operation | Time Complexity | Space Complexity |
|-----------|-----------------|------------------|
| Register | O(log n) | O(1) per instance |
| Deregister | O(log n) | O(1) |
| Discover (all) | O(k) | O(k) where k = instances |
| Discover (filtered) | O(k) | O(m) where m = matched |
| Heartbeat | O(log n) | O(1) |
| Watch Setup | O(1) | O(1) per watcher |
| Health Check | O(1) per check | O(1) |
| Lease Expiration | O(log n) | O(1) |

Where:
- n = Total number of leases/instances
- k = Instances of queried service
- m = Instances matching filter

---

## Implementation Considerations

### Thread Safety

```
┌─────────────────────────────────────────────────────────────────────┐
│  CONCURRENCY PATTERNS                                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Option 1: Coarse-Grained Locking                                   │
│  ────────────────────────────────                                    │
│  - Single lock for entire registry                                  │
│  - Simple to implement                                               │
│  - Limits concurrency                                                │
│                                                                      │
│  Option 2: Fine-Grained Locking                                     │
│  ──────────────────────────────                                      │
│  - Lock per service or per instance                                 │
│  - Higher concurrency                                                │
│  - More complex, deadlock risk                                       │
│                                                                      │
│  Option 3: Lock-Free with CAS                                       │
│  ─────────────────────────────                                       │
│  - Atomic operations for updates                                    │
│  - Copy-on-write for collections                                    │
│  - Best for read-heavy workloads                                    │
│                                                                      │
│  RECOMMENDATION:                                                     │
│  - Fine-grained locking per service                                 │
│  - Read-write locks (multiple readers, single writer)               │
│  - Copy-on-write for instance lists (consistent snapshots)          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Client-Side Caching

```
ALGORITHM ClientSideCache:
    STRUCTURE CacheEntry:
        service_name: String
        instances: List<Instance>
        fetched_at: Timestamp
        ttl: Duration
        revision: Integer

    ALGORITHM GetInstances(service_name: String) → List<Instance>:
        entry = cache.Get(service_name)

        IF entry IS NOT NULL AND NOT IsExpired(entry):
            RETURN entry.instances

        // Cache miss or expired - fetch from registry
        response = registry.Discover(service_name)

        cache.Put(service_name, CacheEntry{
            instances: response.instances,
            fetched_at: NOW(),
            ttl: CACHE_TTL,  // e.g., 30 seconds
            revision: response.revision
        })

        RETURN response.instances

    ALGORITHM HandleWatchEvent(event: WatchResponse):
        // Push invalidation from registry
        IF event.type == INITIAL:
            cache.Put(event.service_name, event.instances)
        ELSE:
            // Invalidate cache, will refetch on next access
            cache.Invalidate(event.service_name)
```
