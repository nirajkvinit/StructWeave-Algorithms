# Low-Level Design

## Table of Contents
- [Data Structures](#data-structures)
- [API Design](#api-design)
- [Core Algorithms](#core-algorithms)
- [Database Schema](#database-schema)
- [Protocol Specifications](#protocol-specifications)

---

## Data Structures

### Route Configuration

```
Route {
    id: string                    // "route-123"
    name: string                  // "user-api-v1"
    priority: int                 // Higher = matched first (default: 0)

    // Matching criteria
    hosts: string[]               // ["api.example.com", "*.example.com"]
    paths: string[]               // ["/api/v1/users", "/api/v1/users/{id}"]
    methods: string[]             // ["GET", "POST", "PUT"]
    headers: Map<string, string>  // {"X-Version": "v1"}

    // Target upstream
    upstream: UpstreamRef {
        service: string           // "user-service"
        path: string              // Optional path prefix to strip/add
        timeout: Duration         // Request timeout
        retries: int              // Number of retries
    }

    // Attached plugins (ordered)
    plugins: PluginConfig[]

    // Metadata
    tags: string[]
    createdAt: timestamp
    updatedAt: timestamp
    enabled: bool
}
```

### Plugin Configuration

```
PluginConfig {
    name: string                  // "jwt-auth"
    enabled: bool
    phase: ExecutionPhase         // REQUEST | RESPONSE | BOTH

    // Plugin-specific configuration
    config: Map<string, any> {
        // JWT Auth example
        "secret": "...",
        "claims_to_verify": ["exp", "iss"],
        "key_claim_name": "kid"
    }

    // Ordering within phase
    priority: int
}

enum ExecutionPhase {
    REQUEST       // Before upstream call
    RESPONSE      // After upstream response
    BOTH          // Both phases
}
```

### Consumer (API Client)

```
Consumer {
    id: string                    // "consumer-abc"
    username: string              // "acme-corp"
    customId: string              // External system ID

    // Credentials (one or more)
    credentials: Credential[]

    // Rate limit overrides
    rateLimits: RateLimitConfig[]

    // Metadata
    tags: string[]
    createdAt: timestamp
    enabled: bool
}

Credential {
    type: CredentialType          // JWT | API_KEY | BASIC | MTLS
    key: string                   // API key value, JWT issuer, etc.
    secret: string                // Hashed secret (if applicable)
    algorithm: string             // RS256, ES256 (for JWT)
    expiresAt: timestamp          // Optional expiration
}

enum CredentialType {
    API_KEY
    JWT
    BASIC
    MTLS
    OAUTH2
}
```

### Upstream Service

```
Upstream {
    id: string                    // "upstream-user-service"
    name: string                  // "user-service"

    // Discovery method
    discovery: DiscoveryConfig {
        type: DiscoveryType       // STATIC | DNS | CONSUL | K8S
        serviceName: string       // Service name for discovery
        namespace: string         // Kubernetes namespace
    }

    // Static targets (if discovery = STATIC)
    targets: Target[]

    // Load balancing
    loadBalancing: LoadBalanceConfig {
        algorithm: LBAlgorithm    // ROUND_ROBIN | LEAST_CONN | CONSISTENT_HASH
        hashOn: string            // Header name for consistent hashing
    }

    // Health checking
    healthCheck: HealthCheckConfig {
        enabled: bool
        interval: Duration        // 10s
        timeout: Duration         // 5s
        healthyThreshold: int     // 2 consecutive successes
        unhealthyThreshold: int   // 3 consecutive failures
        path: string              // "/health"
        expectedStatus: int[]     // [200, 201]
    }

    // Connection pooling
    connectionPool: PoolConfig {
        maxConnections: int       // 100
        maxIdleConnections: int   // 10
        idleTimeout: Duration     // 60s
    }

    // Circuit breaker
    circuitBreaker: CircuitBreakerConfig {
        enabled: bool
        errorThreshold: int       // 5 errors
        errorWindow: Duration     // 10 seconds
        sleepWindow: Duration     // 30 seconds
    }
}

Target {
    address: string               // "10.0.1.5"
    port: int                     // 8080
    weight: int                   // Load balancing weight
    healthy: bool                 // Current health status
}

enum LBAlgorithm {
    ROUND_ROBIN
    WEIGHTED_ROUND_ROBIN
    LEAST_CONNECTIONS
    CONSISTENT_HASH
    RANDOM
}
```

### Request Context

```
RequestContext {
    // Request identification
    requestId: string             // Generated unique ID
    traceId: string               // Distributed trace ID
    spanId: string                // Current span ID

    // Original request
    request: HttpRequest {
        method: string
        path: string
        query: Map<string, string>
        headers: Map<string, string[]>
        body: bytes
        remoteAddr: string
        protocol: string          // HTTP/1.1, HTTP/2
    }

    // Matched route (populated after routing)
    route: Route

    // Authenticated consumer (populated after auth)
    consumer: Consumer
    authenticatedAt: timestamp

    // Rate limit state
    rateLimit: RateLimitState {
        remaining: int
        limit: int
        resetAt: timestamp
    }

    // Timing measurements
    timing: TimingContext {
        receivedAt: timestamp
        routedAt: timestamp
        authenticatedAt: timestamp
        upstreamRequestAt: timestamp
        upstreamResponseAt: timestamp
        respondedAt: timestamp
    }

    // Plugin-specific data
    pluginData: Map<string, any>

    // Response (populated after upstream call)
    response: HttpResponse {
        status: int
        headers: Map<string, string[]>
        body: bytes
    }
}
```

### Router Trie Node

```
TrieNode {
    // Path segment
    segment: string               // "users", "{id}", "*"
    isParam: bool                 // True if path parameter
    isWildcard: bool              // True if catch-all

    // Children nodes
    children: Map<string, TrieNode>   // Static segments
    paramChild: TrieNode              // Single param child {id}
    wildcardChild: TrieNode           // Catch-all *

    // Routes at this node (method → route)
    routes: Map<string, Route[]>      // GET → [route1, route2]

    // Compiled regex for complex patterns
    regex: CompiledRegex
}
```

---

## API Design

### Admin API - Routes

```
# List all routes
GET /routes
Query params: ?page=1&size=100&tags=production

Response:
{
    "data": [Route],
    "pagination": {
        "page": 1,
        "size": 100,
        "total": 1523
    }
}

# Get single route
GET /routes/{route_id}

# Create route
POST /routes
Body: Route (without id)

Response:
{
    "id": "route-abc123",
    "name": "user-api",
    ...
}

# Update route
PUT /routes/{route_id}
Body: Route

# Patch route (partial update)
PATCH /routes/{route_id}
Body: Partial<Route>

# Delete route
DELETE /routes/{route_id}

# Get route plugins
GET /routes/{route_id}/plugins

# Add plugin to route
POST /routes/{route_id}/plugins
Body: PluginConfig
```

### Admin API - Upstreams

```
# List upstreams
GET /upstreams

# Create upstream
POST /upstreams
Body: Upstream

# Get upstream health
GET /upstreams/{upstream_id}/health

Response:
{
    "id": "upstream-abc",
    "healthy": true,
    "targets": [
        {
            "address": "10.0.1.5:8080",
            "healthy": true,
            "lastCheck": "2024-01-15T10:30:00Z",
            "latency": 5
        }
    ]
}

# Add target to upstream
POST /upstreams/{upstream_id}/targets
Body: Target

# Set target unhealthy (manual override)
POST /upstreams/{upstream_id}/targets/{target_id}/unhealthy
```

### Admin API - Consumers

```
# List consumers
GET /consumers

# Create consumer
POST /consumers
Body: Consumer

# Add credential to consumer
POST /consumers/{consumer_id}/credentials
Body: Credential

# Rotate credential
POST /consumers/{consumer_id}/credentials/{credential_id}/rotate
```

### Admin API - Configuration

```
# Export full configuration
GET /config
Accept: application/yaml

# Import configuration (declarative)
POST /config
Content-Type: application/yaml
Body: Full configuration YAML

# Validate configuration
POST /config/validate
Body: Configuration to validate

Response:
{
    "valid": false,
    "errors": [
        {
            "path": "routes[5].upstream",
            "message": "Upstream 'unknown-service' not found"
        }
    ]
}

# Reload configuration
POST /config/reload
```

### Health & Status Endpoints

```
# Gateway health (for load balancer)
GET /health
Response: 200 OK or 503 Unhealthy

# Detailed status
GET /status

Response:
{
    "status": "healthy",
    "version": "3.5.0",
    "uptime": 86400,
    "connections": {
        "active": 5432,
        "accepted": 1234567,
        "handled": 1234560
    },
    "requests": {
        "total": 98765432,
        "current": 150
    },
    "upstreams": {
        "healthy": 45,
        "unhealthy": 2
    }
}

# Prometheus metrics
GET /metrics

# Ready check (full initialization)
GET /ready
```

---

## Core Algorithms

### Route Matching Algorithm (Trie-Based)

```
function matchRoute(request):
    path = normalizePath(request.path)
    segments = splitPath(path)  // ["/", "api", "v1", "users", "123"]
    method = request.method
    host = request.host

    // First, filter by host
    candidateRoutes = filterByHost(allRoutes, host)

    // Traverse trie
    node = routeTrie.root
    params = {}

    for segment in segments:
        if node.children.has(segment):
            // Exact match
            node = node.children[segment]
        else if node.paramChild != null:
            // Parameter match {id}
            params[node.paramChild.paramName] = segment
            node = node.paramChild
        else if node.wildcardChild != null:
            // Wildcard match *
            params["*"] = remainingPath(segments)
            node = node.wildcardChild
            break
        else:
            return null  // No match

    // Get routes at this node for the method
    routes = node.routes.get(method) ?? node.routes.get("*")

    if routes.isEmpty():
        return null

    // Sort by priority and return highest
    routes.sortByDescending(r => r.priority)

    // Apply additional filters (headers, query params)
    for route in routes:
        if matchesHeaders(request, route) and matchesQueryParams(request, route):
            return {route, params}

    return null
```

### Token Bucket Rate Limiting

```
function checkRateLimit(consumerId, apiId, config):
    key = "ratelimit:" + consumerId + ":" + apiId

    // Token bucket state
    state = redis.hgetall(key)

    if state.isEmpty():
        // Initialize bucket
        state = {
            tokens: config.limit,
            lastRefill: now()
        }

    // Calculate tokens to add since last refill
    elapsed = now() - state.lastRefill
    tokensToAdd = (elapsed / config.window) * config.limit
    state.tokens = min(config.limit, state.tokens + tokensToAdd)
    state.lastRefill = now()

    // Try to consume a token
    if state.tokens >= 1:
        state.tokens -= 1

        // Update Redis atomically
        redis.multi()
            .hset(key, "tokens", state.tokens)
            .hset(key, "lastRefill", state.lastRefill)
            .expire(key, config.window * 2)
            .exec()

        return {
            allowed: true,
            remaining: floor(state.tokens),
            limit: config.limit,
            resetAt: state.lastRefill + config.window
        }
    else:
        return {
            allowed: false,
            remaining: 0,
            limit: config.limit,
            resetAt: state.lastRefill + config.window,
            retryAfter: (1 - state.tokens) * (config.window / config.limit)
        }
```

### Sliding Window Rate Limiting (Lua Script)

```
-- Redis Lua script for atomic sliding window rate limiting
-- KEYS[1] = rate limit key
-- ARGV[1] = current timestamp (ms)
-- ARGV[2] = window size (ms)
-- ARGV[3] = max requests in window

local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

-- Remove old entries outside window
local windowStart = now - window
redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

-- Count requests in current window
local count = redis.call('ZCARD', key)

if count < limit then
    -- Add current request
    redis.call('ZADD', key, now, now .. ':' .. math.random())
    redis.call('EXPIRE', key, math.ceil(window / 1000) + 1)

    return {1, limit - count - 1, 0}  -- allowed, remaining, retry_after
else
    -- Get oldest entry to calculate retry_after
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local retryAfter = 0
    if #oldest > 0 then
        retryAfter = oldest[2] + window - now
    end

    return {0, 0, retryAfter}  -- denied, remaining, retry_after
end
```

### JWT Validation Pipeline

```
function validateJWT(token, config):
    // 1. Parse token structure
    parts = token.split(".")
    if parts.length != 3:
        return {valid: false, error: "Invalid token format"}

    header = base64UrlDecode(parts[0])
    payload = base64UrlDecode(parts[1])
    signature = parts[2]

    // 2. Validate header
    if header.alg not in config.allowedAlgorithms:
        return {valid: false, error: "Algorithm not allowed"}

    // 3. Get signing key
    if header.alg in ["RS256", "RS384", "RS512", "ES256", "ES384", "ES512"]:
        // Asymmetric - fetch from JWK
        keyId = header.kid
        key = jwkCache.get(config.jwksUri, keyId)
        if key == null:
            return {valid: false, error: "Key not found"}
    else:
        // Symmetric
        key = config.secret

    // 4. Verify signature
    signatureInput = parts[0] + "." + parts[1]
    if not verifySignature(signatureInput, signature, key, header.alg):
        return {valid: false, error: "Invalid signature"}

    // 5. Validate claims
    now = currentTimestamp()

    if payload.exp and payload.exp < now:
        return {valid: false, error: "Token expired"}

    if payload.nbf and payload.nbf > now:
        return {valid: false, error: "Token not yet valid"}

    if config.issuer and payload.iss != config.issuer:
        return {valid: false, error: "Invalid issuer"}

    if config.audience and payload.aud != config.audience:
        return {valid: false, error: "Invalid audience"}

    // 6. Extract consumer identity
    consumerId = payload[config.consumerClaim] ?? payload.sub

    return {
        valid: true,
        consumer: consumerId,
        claims: payload
    }
```

### Consistent Hashing for Upstream Selection

```
function selectUpstream(request, upstream, hashKey):
    // Build hash key from request
    key = buildHashKey(request, hashKey)  // e.g., header value, cookie, IP

    // Hash to ring position
    hash = hashFunction(key)  // Use xxHash or similar

    // Find first node at or after hash position
    ring = upstream.hashRing  // Sorted list of (hash, target) pairs

    // Binary search for insertion point
    index = binarySearch(ring, hash)

    if index >= ring.length:
        index = 0  // Wrap around

    // Skip unhealthy targets
    for i in range(ring.length):
        candidateIndex = (index + i) % ring.length
        target = ring[candidateIndex].target

        if target.healthy:
            return target

    return null  // All targets unhealthy
```

### Circuit Breaker State Machine

```
class CircuitBreaker:
    state: State = CLOSED
    failureCount: int = 0
    lastFailureTime: timestamp
    lastStateChange: timestamp

    function recordSuccess():
        if state == HALF_OPEN:
            // Success in half-open, close the circuit
            state = CLOSED
            failureCount = 0
            lastStateChange = now()
        else if state == CLOSED:
            // Reset failure count on success
            failureCount = max(0, failureCount - 1)

    function recordFailure():
        failureCount += 1
        lastFailureTime = now()

        if state == CLOSED:
            if failureCount >= config.errorThreshold:
                state = OPEN
                lastStateChange = now()
        else if state == HALF_OPEN:
            // Failure in half-open, back to open
            state = OPEN
            lastStateChange = now()

    function canRequest():
        if state == CLOSED:
            return true

        if state == OPEN:
            // Check if sleep window elapsed
            if now() - lastStateChange >= config.sleepWindow:
                state = HALF_OPEN
                lastStateChange = now()
                return true  // Allow probe request
            return false

        if state == HALF_OPEN:
            // Only allow limited requests in half-open
            return shouldProbe()

    function shouldProbe():
        // Allow 1 request per probe interval
        return random() < config.probeRate
```

---

## Database Schema

### PostgreSQL Schema

```sql
-- Routes table
CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    priority INTEGER DEFAULT 0,
    hosts TEXT[],
    paths TEXT[] NOT NULL,
    methods TEXT[] DEFAULT ARRAY['GET', 'POST', 'PUT', 'DELETE'],
    headers JSONB DEFAULT '{}',
    upstream_service VARCHAR(255) NOT NULL,
    upstream_path VARCHAR(255),
    upstream_timeout_ms INTEGER DEFAULT 60000,
    upstream_retries INTEGER DEFAULT 3,
    tags TEXT[],
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_routes_enabled ON routes(enabled);
CREATE INDEX idx_routes_tags ON routes USING GIN(tags);
CREATE INDEX idx_routes_hosts ON routes USING GIN(hosts);

-- Plugins table
CREATE TABLE plugins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
    consumer_id UUID REFERENCES consumers(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT true,
    config JSONB NOT NULL,
    phase VARCHAR(20) DEFAULT 'REQUEST',
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_plugins_route ON plugins(route_id);
CREATE INDEX idx_plugins_consumer ON plugins(consumer_id);

-- Upstreams table
CREATE TABLE upstreams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    discovery_type VARCHAR(50) DEFAULT 'STATIC',
    discovery_service VARCHAR(255),
    discovery_namespace VARCHAR(255),
    lb_algorithm VARCHAR(50) DEFAULT 'ROUND_ROBIN',
    lb_hash_on VARCHAR(255),
    health_check_enabled BOOLEAN DEFAULT true,
    health_check_path VARCHAR(255) DEFAULT '/health',
    health_check_interval_ms INTEGER DEFAULT 10000,
    pool_max_connections INTEGER DEFAULT 100,
    circuit_breaker_enabled BOOLEAN DEFAULT false,
    circuit_breaker_threshold INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Targets table
CREATE TABLE targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upstream_id UUID NOT NULL REFERENCES upstreams(id) ON DELETE CASCADE,
    address VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    weight INTEGER DEFAULT 100,
    healthy BOOLEAN DEFAULT true,
    last_health_check TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(upstream_id, address, port)
);

CREATE INDEX idx_targets_upstream ON targets(upstream_id);

-- Consumers table
CREATE TABLE consumers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) NOT NULL UNIQUE,
    custom_id VARCHAR(255),
    tags TEXT[],
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credentials table
CREATE TABLE credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consumer_id UUID NOT NULL REFERENCES consumers(id) ON DELETE CASCADE,
    credential_type VARCHAR(50) NOT NULL,
    key VARCHAR(500) NOT NULL,
    secret_hash VARCHAR(500),
    algorithm VARCHAR(50),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(credential_type, key)
);

CREATE INDEX idx_credentials_consumer ON credentials(consumer_id);
CREATE INDEX idx_credentials_lookup ON credentials(credential_type, key);

-- Rate limit policies
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consumer_id UUID REFERENCES consumers(id) ON DELETE CASCADE,
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
    requests_per_second INTEGER,
    requests_per_minute INTEGER,
    requests_per_hour INTEGER,
    requests_per_day INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configuration versions (for audit)
CREATE TABLE config_versions (
    id SERIAL PRIMARY KEY,
    config_hash VARCHAR(64) NOT NULL,
    config_data JSONB NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    applied_by VARCHAR(255)
);
```

---

## Protocol Specifications

### Rate Limit Headers

```
# Standard rate limit headers (RFC draft)
X-RateLimit-Limit: 1000          # Requests allowed per window
X-RateLimit-Remaining: 456       # Requests remaining in window
X-RateLimit-Reset: 1704067200    # Unix timestamp when window resets

# Additional headers
RateLimit-Policy: "1000;w=3600"  # Policy description
Retry-After: 120                 # Seconds to wait (on 429)
```

### Request ID Propagation

```
# Incoming (or generated if missing)
X-Request-ID: "req-abc123"

# Trace context (W3C standard)
traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
tracestate: "vendor=value"

# Forwarding headers
X-Forwarded-For: "203.0.113.195, 70.41.3.18"
X-Forwarded-Proto: "https"
X-Forwarded-Host: "api.example.com"
X-Real-IP: "203.0.113.195"
```

### Error Response Format

```json
{
    "error": {
        "code": "RATE_LIMIT_EXCEEDED",
        "message": "API rate limit exceeded",
        "details": {
            "limit": 1000,
            "remaining": 0,
            "resetAt": "2024-01-15T10:00:00Z",
            "retryAfter": 120
        }
    },
    "requestId": "req-abc123",
    "timestamp": "2024-01-15T09:58:00Z"
}
```

### WebSocket Upgrade Handling

```
# Client request
GET /ws/chat HTTP/1.1
Host: api.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
Authorization: Bearer eyJhbG...

# Gateway validation
1. Validate Authorization header
2. Check rate limits
3. Match route to upstream
4. Forward upgrade request to upstream

# Gateway response (proxied from upstream)
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=

# After upgrade, gateway acts as TCP proxy
```
