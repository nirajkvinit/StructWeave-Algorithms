# Low-Level Design

[← Back to Index](./00-index.md)

---

## Table of Contents
- [Data Model](#data-model)
- [DNS Message Format](#dns-message-format)
- [Core Algorithms](#core-algorithms)
- [API Design](#api-design)
- [Storage Design](#storage-design)

---

## Data Model

### DNS Record Structure

```
┌────────────────────────────────────────────────────────────────────┐
│ DNS RESOURCE RECORD FORMAT                                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+                  │
│ |                      NAME                     |                  │
│ +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+                  │
│ |         TYPE        |         CLASS           |                  │
│ +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+                  │
│ |                      TTL                      |                  │
│ +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+                  │
│ |        RDLENGTH     |         RDATA           |                  │
│ +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+                  │
│                                                                     │
│ NAME:     Domain name (variable length, label format)              │
│ TYPE:     Record type (A=1, AAAA=28, CNAME=5, MX=15, etc.)        │
│ CLASS:    Usually IN (Internet) = 1                                │
│ TTL:      Time to live in seconds (32-bit unsigned)               │
│ RDLENGTH: Length of RDATA field                                    │
│ RDATA:    Record-specific data                                     │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Record Type Definitions

| Type | Value | RDATA Format | Example |
|------|-------|--------------|---------|
| **A** | 1 | 4-byte IPv4 address | `93.184.216.34` |
| **AAAA** | 28 | 16-byte IPv6 address | `2606:2800:220:1:248:1893:25c8:1946` |
| **CNAME** | 5 | Domain name | `www.example.com` → `example.com` |
| **MX** | 15 | Preference + domain | `10 mail.example.com` |
| **TXT** | 16 | Text string(s) | `"v=spf1 include:_spf.google.com ~all"` |
| **NS** | 2 | Domain name | `ns1.example.com` |
| **SOA** | 6 | MNAME, RNAME, serial, timers | Zone authority metadata |
| **SRV** | 33 | Priority, weight, port, target | `10 5 5060 sip.example.com` |
| **PTR** | 12 | Domain name | Reverse lookup |
| **CAA** | 257 | Flags, tag, value | Certificate authority authorization |

### Zone Data Model

```python
class Zone:
    """
    Represents a DNS zone.
    """
    zone_id: str           # Unique identifier
    name: str              # Zone name (e.g., "example.com")
    soa: SOARecord         # Start of Authority
    nameservers: list[str] # NS records for delegation
    records: list[Record]  # All records in zone
    dnssec_enabled: bool   # DNSSEC signing enabled
    created_at: datetime
    updated_at: datetime

class SOARecord:
    """
    Start of Authority record.
    """
    mname: str      # Primary nameserver
    rname: str      # Admin email (hostmaster.example.com)
    serial: int     # Zone serial number (YYYYMMDDNN format)
    refresh: int    # Secondary refresh interval (seconds)
    retry: int      # Retry interval after failed refresh
    expire: int     # When secondary stops answering
    minimum: int    # Negative caching TTL

class Record:
    """
    Generic DNS record.
    """
    record_id: str
    zone_id: str
    name: str           # Full domain name
    type: RecordType    # A, AAAA, CNAME, MX, etc.
    ttl: int            # Time to live
    rdata: str          # Record-specific data

    # GSLB-specific fields (optional)
    routing_policy: RoutingPolicy
    health_check_id: str
    weight: int
    region: str

class RoutingPolicy:
    """
    GSLB routing configuration.
    """
    policy_type: str     # simple, weighted, latency, geolocation, failover
    set_identifier: str  # Unique ID for weighted/latency records

    # Policy-specific fields
    weight: int              # For weighted routing
    region: str              # For geolocation routing
    health_check_id: str     # For failover routing
    failover_type: str       # primary or secondary
```

### Cache Entry Model

```python
class CacheEntry:
    """
    Cached DNS response.
    """
    key: str              # domain_name + record_type
    records: list[Record] # Cached records
    ttl: int              # Original TTL from response
    inserted_at: int      # Timestamp when cached
    expires_at: int       # When entry expires

    # Metadata
    authoritative: bool   # From authoritative server
    authenticated: bool   # DNSSEC validated
    source_server: str    # Server that provided response

    def is_expired(self) -> bool:
        return time.time() > self.expires_at

    def remaining_ttl(self) -> int:
        remaining = self.expires_at - time.time()
        return max(0, int(remaining))
```

---

## DNS Message Format

### Message Structure

```
┌────────────────────────────────────────────────────────────────────┐
│ DNS MESSAGE FORMAT                                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ +---------------------+                                            │
│ |       Header        |  12 bytes, always present                 │
│ +---------------------+                                            │
│ |      Question       |  Query section                            │
│ +---------------------+                                            │
│ |       Answer        |  Answer RRs                               │
│ +---------------------+                                            │
│ |      Authority      |  NS RRs pointing to authority             │
│ +---------------------+                                            │
│ |     Additional      |  Additional helpful RRs                   │
│ +---------------------+                                            │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Header Format

```
┌────────────────────────────────────────────────────────────────────┐
│ DNS HEADER (12 bytes)                                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15                   │
│ +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+                  │
│ |                      ID                       |  Query ID        │
│ +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+                  │
│ |QR|   Opcode  |AA|TC|RD|RA|   Z    |   RCODE   |  Flags          │
│ +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+                  │
│ |                    QDCOUNT                    |  Questions       │
│ +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+                  │
│ |                    ANCOUNT                    |  Answers         │
│ +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+                  │
│ |                    NSCOUNT                    |  Authority       │
│ +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+                  │
│ |                    ARCOUNT                    |  Additional      │
│ +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+                  │
│                                                                     │
│ QR:     Query (0) or Response (1)                                  │
│ Opcode: 0=Query, 1=IQuery, 2=Status                                │
│ AA:     Authoritative Answer                                       │
│ TC:     Truncated (response > 512 bytes)                           │
│ RD:     Recursion Desired                                          │
│ RA:     Recursion Available                                        │
│ RCODE:  0=NoError, 2=ServFail, 3=NXDomain, 5=Refused              │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### RCODE Values

| Code | Name | Description |
|------|------|-------------|
| 0 | NOERROR | No error |
| 1 | FORMERR | Format error |
| 2 | SERVFAIL | Server failure |
| 3 | NXDOMAIN | Name does not exist |
| 4 | NOTIMP | Not implemented |
| 5 | REFUSED | Query refused |

### EDNS0 Extension (OPT Record)

```
┌────────────────────────────────────────────────────────────────────┐
│ EDNS0 OPT PSEUDO-RR                                                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ NAME:     0 (root)                                                 │
│ TYPE:     OPT (41)                                                 │
│ CLASS:    UDP payload size (e.g., 4096)                           │
│ TTL:      Extended RCODE + flags (DO bit for DNSSEC)              │
│ RDATA:    Option code + length + data                             │
│                                                                     │
│ Common Options:                                                     │
│ • EDNS-Client-Subnet (8): Client IP prefix for GeoIP              │
│ • Cookie (10): Anti-spoofing                                       │
│ • TCP Keepalive (11): Connection reuse                            │
│ • Padding (12): Query size obfuscation                            │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## Core Algorithms

### Recursive Resolution Algorithm

```python
class RecursiveResolver:
    """
    Recursive DNS resolver implementation.
    """

    def __init__(self):
        self.cache = DNSCache()
        self.root_hints = load_root_hints()

    async def resolve(
        self,
        qname: str,
        qtype: RecordType,
        client_ip: str
    ) -> DNSResponse:
        """
        Resolve a DNS query recursively.
        """
        # Step 1: Check cache
        cached = self.cache.lookup(qname, qtype)
        if cached and not cached.is_expired():
            return self._build_response(cached, from_cache=True)

        # Step 2: Find best starting point
        # Look for cached NS records for parent zones
        nameservers = self._find_closest_nameservers(qname)

        # Step 3: Iterative resolution
        response = await self._iterate(qname, qtype, nameservers)

        # Step 4: Cache response
        if response.rcode == NOERROR:
            self.cache.store(qname, qtype, response.answers)
        elif response.rcode == NXDOMAIN:
            self.cache.store_negative(qname, qtype, response.soa)

        return response

    def _find_closest_nameservers(self, qname: str) -> list[str]:
        """
        Find cached NS records for closest ancestor zone.
        """
        labels = qname.split('.')

        for i in range(len(labels)):
            zone = '.'.join(labels[i:])
            cached_ns = self.cache.lookup(zone, NS)
            if cached_ns:
                return cached_ns.records

        # Fall back to root hints
        return self.root_hints

    async def _iterate(
        self,
        qname: str,
        qtype: RecordType,
        nameservers: list[str]
    ) -> DNSResponse:
        """
        Perform iterative queries until answer found.
        """
        max_depth = 10  # Prevent infinite loops

        for depth in range(max_depth):
            # Query one of the nameservers
            for ns in nameservers:
                try:
                    response = await self._query_server(ns, qname, qtype)
                    break
                except Exception:
                    continue
            else:
                raise ResolutionError("All nameservers failed")

            # Check response type
            if response.is_answer():
                # Got the answer
                return response

            elif response.is_referral():
                # Got referral to more specific nameservers
                nameservers = self._extract_nameservers(response)

                # Cache the referral
                self.cache.store_referral(response)

            elif response.is_cname():
                # Follow CNAME chain
                cname_target = response.get_cname_target()
                return await self.resolve(cname_target, qtype)

            else:
                return response

        raise ResolutionError("Max depth exceeded")
```

### Cache Eviction Algorithm

```python
class DNSCache:
    """
    DNS cache with TTL-based expiration and LRU fallback.
    """

    def __init__(self, max_entries: int = 1_000_000):
        self.max_entries = max_entries
        self.entries: dict[str, CacheEntry] = {}
        self.lru_order: OrderedDict = OrderedDict()
        self.lock = threading.RLock()

    def lookup(self, qname: str, qtype: RecordType) -> CacheEntry | None:
        """
        Look up entry in cache.
        """
        key = f"{qname.lower()}:{qtype}"

        with self.lock:
            entry = self.entries.get(key)

            if entry is None:
                return None

            if entry.is_expired():
                self._remove(key)
                return None

            # Update LRU order
            self.lru_order.move_to_end(key)

            return entry

    def store(
        self,
        qname: str,
        qtype: RecordType,
        records: list[Record]
    ):
        """
        Store records in cache.
        """
        if not records:
            return

        key = f"{qname.lower()}:{qtype}"
        ttl = min(r.ttl for r in records)

        # Enforce minimum and maximum TTL
        ttl = max(ttl, MIN_TTL)  # Minimum 30 seconds
        ttl = min(ttl, MAX_TTL)  # Maximum 1 week

        entry = CacheEntry(
            key=key,
            records=records,
            ttl=ttl,
            inserted_at=time.time(),
            expires_at=time.time() + ttl
        )

        with self.lock:
            # Evict if necessary
            while len(self.entries) >= self.max_entries:
                self._evict_one()

            self.entries[key] = entry
            self.lru_order[key] = True

    def store_negative(
        self,
        qname: str,
        qtype: RecordType,
        soa: SOARecord
    ):
        """
        Store negative cache entry (NXDOMAIN).
        """
        key = f"{qname.lower()}:{qtype}:NEG"
        ttl = soa.minimum  # SOA minimum field is negative TTL

        entry = CacheEntry(
            key=key,
            records=[],
            ttl=ttl,
            inserted_at=time.time(),
            expires_at=time.time() + ttl,
            negative=True
        )

        with self.lock:
            self.entries[key] = entry

    def _evict_one(self):
        """
        Evict one entry (LRU policy).
        """
        # First try to evict expired entries
        for key, entry in list(self.entries.items()):
            if entry.is_expired():
                self._remove(key)
                return

        # Fall back to LRU eviction
        if self.lru_order:
            oldest_key = next(iter(self.lru_order))
            self._remove(oldest_key)

    def _remove(self, key: str):
        """
        Remove entry from cache.
        """
        self.entries.pop(key, None)
        self.lru_order.pop(key, None)
```

### GSLB Routing Algorithm

```python
class GSLBRouter:
    """
    Global Server Load Balancing router.
    """

    def __init__(self):
        self.geoip_db = GeoIPDatabase()
        self.health_checker = HealthChecker()
        self.latency_db = LatencyDatabase()

    def route(
        self,
        records: list[Record],
        client_subnet: str,
        policy: RoutingPolicy
    ) -> list[Record]:
        """
        Select records based on routing policy.
        """
        # Filter out unhealthy endpoints
        healthy_records = [
            r for r in records
            if self.health_checker.is_healthy(r.health_check_id)
        ]

        if not healthy_records:
            # Fallback: return all records (best effort)
            healthy_records = records

        # Apply routing policy
        if policy.policy_type == 'simple':
            return healthy_records

        elif policy.policy_type == 'weighted':
            return self._weighted_selection(healthy_records)

        elif policy.policy_type == 'latency':
            return self._latency_selection(healthy_records, client_subnet)

        elif policy.policy_type == 'geolocation':
            return self._geo_selection(healthy_records, client_subnet)

        elif policy.policy_type == 'failover':
            return self._failover_selection(healthy_records)

        return healthy_records

    def _weighted_selection(
        self,
        records: list[Record]
    ) -> list[Record]:
        """
        Weighted random selection.
        """
        total_weight = sum(r.weight for r in records)
        rand = random.random() * total_weight

        cumulative = 0
        for record in records:
            cumulative += record.weight
            if rand <= cumulative:
                return [record]

        return [records[-1]]

    def _latency_selection(
        self,
        records: list[Record],
        client_subnet: str
    ) -> list[Record]:
        """
        Select endpoint with lowest latency to client.
        """
        client_region = self.geoip_db.get_region(client_subnet)

        best_record = None
        best_latency = float('inf')

        for record in records:
            endpoint_region = record.region
            latency = self.latency_db.get_latency(
                client_region,
                endpoint_region
            )

            if latency < best_latency:
                best_latency = latency
                best_record = record

        return [best_record] if best_record else records

    def _geo_selection(
        self,
        records: list[Record],
        client_subnet: str
    ) -> list[Record]:
        """
        Select endpoint based on client geography.
        """
        client_location = self.geoip_db.get_location(client_subnet)

        # Find matching region
        for record in records:
            if self._matches_location(record.region, client_location):
                return [record]

        # Fall back to default (no region match)
        default_records = [r for r in records if r.region == 'default']
        return default_records if default_records else records

    def _failover_selection(
        self,
        records: list[Record]
    ) -> list[Record]:
        """
        Return primary if healthy, otherwise secondary.
        """
        primary = [r for r in records if r.failover_type == 'primary']
        secondary = [r for r in records if r.failover_type == 'secondary']

        for record in primary:
            if self.health_checker.is_healthy(record.health_check_id):
                return [record]

        return secondary if secondary else primary
```

### Zone Transfer Algorithm (IXFR)

```python
class ZoneTransferServer:
    """
    Handles AXFR and IXFR zone transfers.
    """

    async def handle_ixfr(
        self,
        zone_name: str,
        client_serial: int
    ) -> AsyncIterator[Record]:
        """
        Incremental zone transfer.
        """
        zone = await self.zone_store.get_zone(zone_name)
        current_serial = zone.soa.serial

        if client_serial >= current_serial:
            # Client is up to date
            yield zone.soa
            return

        # Get changes since client's serial
        changes = await self.zone_store.get_changes(
            zone_name,
            since_serial=client_serial
        )

        if not changes or self._should_use_axfr(changes, zone):
            # Fall back to full transfer
            async for record in self.handle_axfr(zone_name):
                yield record
            return

        # Send IXFR response
        # Format: SOA (new) -> deletions -> SOA (old) -> additions -> SOA (new)

        yield zone.soa  # Current SOA (start)

        for change in changes:
            if change.type == 'delete':
                yield change.old_soa
                for record in change.deleted_records:
                    yield record

            yield change.new_soa
            for record in change.added_records:
                yield record

        yield zone.soa  # Current SOA (end)

    async def handle_axfr(
        self,
        zone_name: str
    ) -> AsyncIterator[Record]:
        """
        Full zone transfer.
        """
        zone = await self.zone_store.get_zone(zone_name)

        # Start with SOA
        yield zone.soa

        # All records
        async for record in self.zone_store.iterate_records(zone_name):
            yield record

        # End with SOA
        yield zone.soa
```

---

## API Design

### Management API

```yaml
# Zone Management
POST /v1/zones:
  description: Create a new hosted zone
  request:
    name: "example.com"
    comment: "Production zone"
  response:
    zone_id: "Z1234567890"
    name_servers:
      - "ns1.dns-provider.com"
      - "ns2.dns-provider.com"

GET /v1/zones/{zone_id}:
  description: Get zone details
  response:
    zone_id: "Z1234567890"
    name: "example.com"
    record_count: 150
    name_servers: [...]

DELETE /v1/zones/{zone_id}:
  description: Delete a zone

# Record Management
POST /v1/zones/{zone_id}/records:
  description: Create or update records
  request:
    changes:
      - action: "CREATE"
        record:
          name: "www.example.com"
          type: "A"
          ttl: 300
          values: ["192.0.2.1", "192.0.2.2"]
      - action: "DELETE"
        record:
          name: "old.example.com"
          type: "A"

GET /v1/zones/{zone_id}/records:
  description: List records in zone
  parameters:
    - name: type (optional filter)
    - max_items: 100
    - start_record_name: pagination

# Health Checks
POST /v1/health-checks:
  description: Create health check
  request:
    type: "HTTP"
    target: "203.0.113.1"
    port: 80
    path: "/health"
    interval_seconds: 30
    failure_threshold: 3

GET /v1/health-checks/{check_id}/status:
  description: Get health check status
  response:
    status: "HEALTHY"
    last_checked: "2024-01-15T10:30:00Z"
    failure_reason: null

# Traffic Policies
POST /v1/traffic-policies:
  description: Create traffic routing policy
  request:
    name: "geo-policy"
    document:
      rules:
        - geo_match: "NA"
          endpoint: "us-east.example.com"
        - geo_match: "EU"
          endpoint: "eu-west.example.com"
        - geo_match: "*"
          endpoint: "default.example.com"
```

### Query Logging API

```yaml
GET /v1/zones/{zone_id}/query-logs:
  description: Get query logs
  parameters:
    - start_time: ISO8601
    - end_time: ISO8601
    - source_ip: (optional filter)
  response:
    logs:
      - timestamp: "2024-01-15T10:30:45.123Z"
        query_name: "www.example.com"
        query_type: "A"
        response_code: "NOERROR"
        source_ip: "203.0.113.50"
        edge_location: "IAD"
        latency_ms: 2.3

GET /v1/zones/{zone_id}/metrics:
  description: Get zone metrics
  parameters:
    - period: "1h" | "24h" | "7d"
  response:
    total_queries: 1234567
    queries_by_type:
      A: 890000
      AAAA: 234567
      CNAME: 100000
    queries_by_response:
      NOERROR: 1200000
      NXDOMAIN: 34567
```

---

## Storage Design

### Zone Database Schema

```sql
-- Zones table
CREATE TABLE zones (
    zone_id         UUID PRIMARY KEY,
    name            VARCHAR(255) NOT NULL UNIQUE,
    comment         TEXT,
    dnssec_enabled  BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- SOA records
CREATE TABLE zone_soa (
    zone_id     UUID PRIMARY KEY REFERENCES zones(zone_id),
    mname       VARCHAR(255) NOT NULL,
    rname       VARCHAR(255) NOT NULL,
    serial      BIGINT NOT NULL,
    refresh     INTEGER NOT NULL DEFAULT 7200,
    retry       INTEGER NOT NULL DEFAULT 3600,
    expire      INTEGER NOT NULL DEFAULT 1209600,
    minimum     INTEGER NOT NULL DEFAULT 300
);

-- DNS records
CREATE TABLE records (
    record_id       UUID PRIMARY KEY,
    zone_id         UUID NOT NULL REFERENCES zones(zone_id),
    name            VARCHAR(255) NOT NULL,
    type            VARCHAR(10) NOT NULL,
    ttl             INTEGER NOT NULL,
    rdata           TEXT NOT NULL,

    -- GSLB fields
    set_identifier  VARCHAR(128),
    weight          INTEGER,
    region          VARCHAR(64),
    health_check_id UUID,
    failover_type   VARCHAR(16),

    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),

    INDEX idx_zone_name (zone_id, name),
    INDEX idx_zone_type (zone_id, type)
);

-- Zone change history (for IXFR)
CREATE TABLE zone_changes (
    change_id       UUID PRIMARY KEY,
    zone_id         UUID NOT NULL REFERENCES zones(zone_id),
    serial_before   BIGINT NOT NULL,
    serial_after    BIGINT NOT NULL,
    change_type     VARCHAR(16) NOT NULL, -- 'ADD', 'DELETE', 'UPDATE'
    record_data     JSONB NOT NULL,
    changed_at      TIMESTAMP DEFAULT NOW(),

    INDEX idx_zone_serial (zone_id, serial_after)
);

-- Health checks
CREATE TABLE health_checks (
    check_id            UUID PRIMARY KEY,
    type                VARCHAR(16) NOT NULL, -- HTTP, HTTPS, TCP
    target              VARCHAR(255) NOT NULL,
    port                INTEGER NOT NULL,
    path                VARCHAR(1024),
    interval_seconds    INTEGER NOT NULL DEFAULT 30,
    failure_threshold   INTEGER NOT NULL DEFAULT 3,
    enabled             BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT NOW()
);

-- Health check status
CREATE TABLE health_status (
    check_id        UUID PRIMARY KEY REFERENCES health_checks(check_id),
    status          VARCHAR(16) NOT NULL, -- HEALTHY, UNHEALTHY, UNKNOWN
    last_checked    TIMESTAMP,
    failure_reason  TEXT,
    consecutive_failures INTEGER DEFAULT 0
);
```

### Cache Storage Structure

```python
class CacheStorage:
    """
    Multi-tier cache storage.
    """

    def __init__(self):
        # L1: Hot cache (in-memory, per-process)
        self.hot_cache = LRUCache(max_size=100_000)

        # L2: Warm cache (shared memory or Redis)
        self.warm_cache = SharedMemoryCache(max_size=10_000_000)

    def get(self, key: str) -> CacheEntry | None:
        """
        Look up in cache tiers.
        """
        # Try L1 first
        entry = self.hot_cache.get(key)
        if entry:
            return entry

        # Try L2
        entry = self.warm_cache.get(key)
        if entry:
            # Promote to L1
            self.hot_cache.set(key, entry)
            return entry

        return None

    def set(self, key: str, entry: CacheEntry):
        """
        Store in cache.
        """
        # Store in both tiers
        self.hot_cache.set(key, entry)
        self.warm_cache.set(key, entry)
```

### DNSSEC Key Storage

```sql
-- DNSSEC keys
CREATE TABLE dnssec_keys (
    key_id          UUID PRIMARY KEY,
    zone_id         UUID NOT NULL REFERENCES zones(zone_id),
    key_type        VARCHAR(3) NOT NULL, -- KSK or ZSK
    algorithm       INTEGER NOT NULL,    -- 13=ECDSAP256SHA256
    public_key      TEXT NOT NULL,
    private_key     TEXT NOT NULL,       -- Encrypted
    key_tag         INTEGER NOT NULL,
    active          BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW(),
    activated_at    TIMESTAMP,
    retired_at      TIMESTAMP,

    INDEX idx_zone_active (zone_id, active)
);

-- DS records published to parent
CREATE TABLE ds_records (
    ds_id           UUID PRIMARY KEY,
    zone_id         UUID NOT NULL REFERENCES zones(zone_id),
    key_tag         INTEGER NOT NULL,
    algorithm       INTEGER NOT NULL,
    digest_type     INTEGER NOT NULL,  -- 2=SHA-256
    digest          TEXT NOT NULL,
    published       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW()
);
```
