# Low-Level Design — eBPF-based Observability Platform

## Data Model

### Core Entities

```mermaid
erDiagram
    EBPF_PROGRAM {
        string program_id PK
        string program_type "kprobe|tracepoint|tc|xdp|lsm|perf_event"
        string attach_point "e.g., sys_enter_write, tc_egress"
        int instruction_count
        int verified_at_epoch
        string btf_hash
        string status "loaded|attached|detached|error"
    }
    EBPF_MAP {
        string map_id PK
        string map_type "hash|array|ringbuf|percpu_array|lpm_trie"
        int key_size_bytes
        int value_size_bytes
        int max_entries
        int memory_bytes
        string program_id FK
    }
    KERNEL_EVENT {
        long timestamp_ns
        int cpu_id
        int pid
        int tgid
        string event_type "syscall|network|security|profile"
        bytes payload
        string node_id FK
    }
    NETWORK_FLOW {
        string flow_id PK
        string src_ip
        int src_port
        string dst_ip
        int dst_port
        string protocol "tcp|udp|icmp"
        string l7_protocol "http|grpc|dns|kafka|redis"
        long bytes_sent
        long bytes_received
        int packets_sent
        int packets_received
        long latency_ns
        int http_status
        string http_method
        string http_path
        string src_pod FK
        string dst_pod FK
    }
    K8S_IDENTITY {
        string pod_id PK
        string pod_name
        string namespace
        string service_name
        string node_name
        string service_account
        string labels_json
        int cgroup_id
        long created_at
    }
    SECURITY_EVENT {
        string event_id PK
        long timestamp_ns
        string event_type "process_exec|file_access|network_connect|capability_use"
        string policy_name
        string action_taken "allow|alert|deny|kill"
        int pid
        string binary_path
        string arguments
        string pod_id FK
    }
    PROFILE_SAMPLE {
        long timestamp_ns
        string node_id
        int cpu_id
        int pid
        string stack_trace_hash
        string profile_type "cpu|alloc|lock|off_cpu"
    }
    STACK_TRACE {
        string stack_hash PK
        string frames_json "array of (address, symbol, file, line)"
        int depth
    }

    EBPF_PROGRAM ||--o{ EBPF_MAP : "owns"
    KERNEL_EVENT }o--|| K8S_IDENTITY : "enriched_with"
    NETWORK_FLOW }o--|| K8S_IDENTITY : "src_pod"
    NETWORK_FLOW }o--|| K8S_IDENTITY : "dst_pod"
    SECURITY_EVENT }o--|| K8S_IDENTITY : "pod"
    PROFILE_SAMPLE }o--|| STACK_TRACE : "references"
```

### eBPF Map Schemas (In-Kernel Data Structures)

#### Connection Tracking Map

```
Map Type: BPF_MAP_TYPE_HASH
Key Size: 16 bytes
Value Size: 64 bytes
Max Entries: 262,144 (per node)

Key (connection_key):
  src_ip:     4 bytes (u32, network byte order)
  dst_ip:     4 bytes
  src_port:   2 bytes (u16)
  dst_port:   2 bytes
  protocol:   1 byte  (TCP=6, UDP=17)
  _padding:   3 bytes

Value (connection_info):
  request_ts:      8 bytes (u64, kernel timestamp ns)
  response_ts:     8 bytes
  bytes_sent:      8 bytes (u64)
  bytes_received:  8 bytes
  packets_sent:    4 bytes (u32)
  packets_received:4 bytes
  http_status:     2 bytes (u16)
  l7_protocol:     1 byte  (enum: HTTP=1, gRPC=2, DNS=3, ...)
  flags:           1 byte  (bit flags: request_seen, response_seen, ...)
  src_cgroup_id:   8 bytes (u64, for K8s identity lookup)
  dst_cgroup_id:   8 bytes
  _reserved:       4 bytes
```

#### PID-to-Pod Identity Map

```
Map Type: BPF_MAP_TYPE_HASH
Key Size: 4 bytes (pid as u32)
Value Size: 128 bytes
Max Entries: 65,536

Value (pod_identity):
  pod_name:        64 bytes (null-terminated string)
  namespace:       32 bytes
  service_name:    32 bytes
```

#### Security Policy Map

```
Map Type: BPF_MAP_TYPE_HASH
Key Size: 256 bytes (binary_path as string)
Value Size: 16 bytes
Max Entries: 4,096

Value (policy_decision):
  action:          1 byte (ALLOW=0, ALERT=1, DENY=2, KILL=3)
  policy_id:       4 bytes (u32)
  match_flags:     1 byte (bit flags: exact_match, prefix_match, ...)
  _padding:        2 bytes
  audit_counter:   8 bytes (per-CPU atomic, for rate limiting alerts)
```

---

## API Design

### Agent-to-Collector gRPC API

```
Service: ObservabilityCollector

RPC: StreamEvents
  Request (stream): EventBatch
    - node_id: string
    - batch_id: string (for deduplication)
    - events: repeated Event
    - compression: enum (NONE, ZSTD, LZ4)
    - timestamp_range: TimeRange
  Response: StreamAck
    - batch_id: string
    - accepted_count: int
    - back_pressure_signal: enum (NONE, SLOW_DOWN, PAUSE)

RPC: StreamProfiles
  Request (stream): ProfileBatch
    - node_id: string
    - profile_type: enum (CPU, ALLOC, LOCK, OFF_CPU)
    - samples: repeated ProfileSample
    - stack_traces: map<string, StackTrace>  (hash → frames)
  Response: ProfileAck
    - batch_id: string
    - accepted: bool

RPC: ReportAgentStatus
  Request: AgentStatus
    - node_id: string
    - loaded_programs: repeated ProgramStatus
    - map_memory_bytes: int64
    - ring_buffer_drops: int64
    - events_per_second: float
    - kernel_version: string
    - btf_available: bool
  Response: AgentDirective
    - programs_to_load: repeated ProgramSpec
    - programs_to_unload: repeated string
    - sampling_rate_override: float (0.0 = no override)
```

### Query API (Dashboard / External Consumers)

```
Service: ObservabilityQuery

RPC: QueryMetrics
  Request: MetricQuery
    - query: string (PromQL-compatible)
    - time_range: TimeRange
    - step: Duration
    - filters: map<string, string> (namespace, pod, service)
  Response: MetricResult
    - series: repeated TimeSeries

RPC: QueryFlows
  Request: FlowQuery
    - source_filter: IdentityFilter (namespace, pod, labels)
    - destination_filter: IdentityFilter
    - protocol_filter: repeated string (http, grpc, dns)
    - time_range: TimeRange
    - aggregation: enum (NONE, BY_SERVICE, BY_POD, BY_ENDPOINT)
    - limit: int
  Response: FlowResult
    - flows: repeated AggregatedFlow

RPC: QueryTraces
  Request: TraceQuery
    - trace_id: string (optional, for direct lookup)
    - service_filter: string
    - min_duration_ms: int
    - status_filter: enum (ALL, ERROR, SLOW)
    - time_range: TimeRange
    - limit: int
  Response: TraceResult
    - traces: repeated Trace
    - spans: repeated Span

RPC: QueryProfiles
  Request: ProfileQuery
    - service_filter: string
    - pod_filter: string
    - profile_type: enum (CPU, ALLOC, LOCK, OFF_CPU)
    - time_range: TimeRange
    - diff_base_range: TimeRange (optional, for differential flame graphs)
  Response: ProfileResult
    - flame_graph: FlameGraph
    - total_samples: int64
    - top_functions: repeated FunctionSummary

RPC: QuerySecurityEvents
  Request: SecurityQuery
    - event_type_filter: repeated string
    - action_filter: repeated string (allow, alert, deny, kill)
    - pod_filter: IdentityFilter
    - time_range: TimeRange
    - limit: int
  Response: SecurityResult
    - events: repeated SecurityEvent
    - policy_hit_counts: map<string, int64>
```

### Idempotency Handling

- **Event deduplication**: Each `EventBatch` carries a `batch_id` (composed of `node_id + sequence_number`). The collector maintains a sliding window of seen batch IDs (last 5 minutes) in a Bloom filter, with a backing hash set for false-positive resolution. Duplicate batches receive an ACK without re-processing.
- **Profile deduplication**: Stack trace hashes ensure the same trace is stored once regardless of how many times it appears across batches.
- **Security event guarantee**: Security events use a separate high-priority stream with explicit ACK. Unacknowledged events are retransmitted with exponential backoff.

### Rate Limiting

| Endpoint | Rate Limit | Strategy |
|----------|-----------|----------|
| StreamEvents | 100K events/sec per node | Token bucket with burst allowance (2x sustained rate) |
| StreamProfiles | 10K samples/sec per node | Fixed window; excess samples are downsampled |
| QueryMetrics | 100 queries/sec per user | Sliding window with complexity weighting |
| QueryFlows | 50 queries/sec per user | Sliding window |
| QuerySecurityEvents | 200 queries/sec per user | Token bucket (security events are high priority) |

---

## Core Algorithms

### Algorithm 1: In-Kernel HTTP Protocol Detection and Parsing

**Purpose:** Detect HTTP/1.1 requests and responses in TCP payload and extract method, path, and status code — entirely within eBPF (no user-space round-trip).

```
FUNCTION detect_and_parse_http(skb, payload_offset):
    // Read first 8 bytes of TCP payload
    data = skb_load_bytes(skb, payload_offset, 8)

    // HTTP request detection: check for method signatures
    IF data[0:3] == "GET" AND data[3] == ' ':
        method = HTTP_GET
        path_start = 4
    ELSE IF data[0:4] == "POST" AND data[4] == ' ':
        method = HTTP_POST
        path_start = 5
    ELSE IF data[0:3] == "PUT" AND data[3] == ' ':
        method = HTTP_PUT
        path_start = 4
    ELSE IF data[0:4] == "HTTP":
        // This is a response: "HTTP/1.1 200 OK"
        RETURN parse_http_response(skb, payload_offset)
    ELSE:
        RETURN PROTOCOL_UNKNOWN

    // Extract path (bounded loop for verifier)
    path_buf = ARRAY[128]
    FOR i = 0 TO 127:  // Fixed upper bound required by verifier
        byte = skb_load_byte(skb, payload_offset + path_start + i)
        IF byte == ' ' OR byte == '?' OR byte == '\0':
            path_buf[i] = '\0'
            BREAK
        path_buf[i] = byte

    // Store in connection map for later correlation with response
    key = extract_connection_key(skb)
    value = {
        request_ts: bpf_ktime_get_ns(),
        method: method,
        path: path_buf,
        path_len: i
    }
    bpf_map_update_elem(connection_map, key, value, BPF_ANY)

    RETURN HTTP_REQUEST_PARSED


FUNCTION parse_http_response(skb, payload_offset):
    // Parse "HTTP/1.1 XXX" — extract 3-digit status code
    status_hundreds = skb_load_byte(skb, payload_offset + 9) - '0'
    status_tens     = skb_load_byte(skb, payload_offset + 10) - '0'
    status_ones     = skb_load_byte(skb, payload_offset + 11) - '0'

    IF status_hundreds < 1 OR status_hundreds > 5:
        RETURN PROTOCOL_UNKNOWN

    status_code = status_hundreds * 100 + status_tens * 10 + status_ones

    // Correlate with stored request
    key = extract_reverse_connection_key(skb)  // Swap src/dst
    request = bpf_map_lookup_elem(connection_map, key)

    IF request IS NOT NULL:
        latency_ns = bpf_ktime_get_ns() - request.request_ts
        event = {
            type: EVENT_HTTP,
            method: request.method,
            path: request.path,
            status_code: status_code,
            latency_ns: latency_ns,
            src_cgroup: get_cgroup_id(),
            dst_cgroup: request.dst_cgroup
        }
        bpf_ringbuf_output(ring_buffer, event, sizeof(event), 0)
        bpf_map_delete_elem(connection_map, key)

    RETURN HTTP_RESPONSE_PARSED
```

**Complexity:** O(1) for detection, O(n) for path extraction where n is bounded at 128 characters. Total per-packet cost: ~200ns.

### Algorithm 2: CPU Stack Trace Sampling and Aggregation

**Purpose:** Sample CPU stack traces at 19 Hz and aggregate identical traces in-kernel using stack trace hashing to reduce user-space transfer volume by 100-1000x.

```
FUNCTION on_perf_event(ctx):  // Attached to perf_event (CPU cycles, 19 Hz)
    pid = bpf_get_current_pid_tgid() >> 32

    // Skip kernel threads and idle
    IF pid == 0:
        RETURN 0

    // Capture kernel + user stack traces
    kernel_stack_id = bpf_get_stackid(ctx, kernel_stack_map, 0)
    user_stack_id   = bpf_get_stackid(ctx, user_stack_map, BPF_F_USER_STACK)

    // Create composite key: (pid, kernel_stack_id, user_stack_id)
    key = {
        pid: pid,
        kernel_stack_id: kernel_stack_id,
        user_stack_id: user_stack_id
    }

    // Increment count in per-CPU hash map (no lock contention)
    count = bpf_map_lookup_elem(profile_counts, key)
    IF count IS NOT NULL:
        *count += 1  // Atomic per-CPU increment
    ELSE:
        initial = 1
        bpf_map_update_elem(profile_counts, key, initial, BPF_NOEXIST)

    RETURN 0


// User-space periodic flush (every 10 seconds)
FUNCTION flush_profiles():
    FOR EACH (key, count) IN profile_counts:
        // Resolve stack trace symbols from stack_map
        kernel_frames = resolve_stack(kernel_stack_map, key.kernel_stack_id)
        user_frames   = resolve_stack(user_stack_map, key.user_stack_id)

        // Emit aggregated profile sample
        sample = {
            pid: key.pid,
            kernel_frames: kernel_frames,
            user_frames: user_frames,
            count: count,
            timestamp: current_time()
        }
        send_to_collector(sample)

    // Clear maps for next interval
    clear_map(profile_counts)
    // Note: stack_maps are cleared by bpf_get_stackid when full (LRU behavior)
```

**Complexity:** O(1) per sample (hash map lookup + increment). User-space flush is O(unique_stacks) which is typically 1,000-10,000 per 10-second interval — far less than the 190 raw samples/sec × 10s = 1,900 raw events.

### Algorithm 3: Security Policy Evaluation with Tail Call Chaining

**Purpose:** Evaluate multi-stage security policies using eBPF tail calls to chain policy evaluations without exceeding the instruction limit in a single program.

```
// Program 0: Entry point — attached to LSM hook (e.g., bprm_check_security)
FUNCTION security_entry(ctx):
    // Extract process info
    binary_path = bpf_get_current_comm()  // 16 bytes
    full_path = read_file_path(ctx)       // From LSM context
    pid = bpf_get_current_pid_tgid() >> 32

    // Stage 1: Fast path — check binary allowlist
    policy = bpf_map_lookup_elem(binary_allowlist, full_path)
    IF policy IS NOT NULL AND policy.action == ALLOW:
        emit_audit_event(ctx, ALLOW, "allowlist_match")
        RETURN LSM_ALLOW

    // Stage 2: Check binary denylist
    policy = bpf_map_lookup_elem(binary_denylist, full_path)
    IF policy IS NOT NULL AND policy.action == DENY:
        emit_audit_event(ctx, DENY, "denylist_match")
        RETURN LSM_DENY

    // Stage 3: Complex policy — tail call to next program
    // Store context in per-CPU scratch map for tail call chain
    scratch = bpf_map_lookup_elem(percpu_scratch, 0)
    IF scratch IS NOT NULL:
        scratch.pid = pid
        scratch.path = full_path
        scratch.stage = STAGE_NAMESPACE_CHECK

    bpf_tail_call(ctx, prog_array, PROGRAM_NAMESPACE_CHECK)

    // Tail call failed (program not loaded) — default allow
    RETURN LSM_ALLOW


// Program 1: Namespace-based policy check
FUNCTION namespace_policy_check(ctx):
    scratch = bpf_map_lookup_elem(percpu_scratch, 0)
    IF scratch IS NULL:
        RETURN LSM_ALLOW

    // Get cgroup ID → pod namespace
    cgroup_id = bpf_get_current_cgroup_id()
    identity = bpf_map_lookup_elem(cgroup_to_namespace, cgroup_id)

    IF identity IS NOT NULL:
        // Check namespace-specific policy
        ns_policy = bpf_map_lookup_elem(namespace_policies, identity.namespace)
        IF ns_policy IS NOT NULL:
            IF ns_policy.deny_binary_execution:
                emit_audit_event(ctx, DENY, "namespace_policy")
                RETURN LSM_DENY

    // Continue to next stage
    scratch.stage = STAGE_CAPABILITY_CHECK
    bpf_tail_call(ctx, prog_array, PROGRAM_CAPABILITY_CHECK)

    RETURN LSM_ALLOW
```

**Complexity:** O(1) per stage (hash map lookups). Tail call chain depth is bounded (max 33 tail calls). Total policy evaluation: <5μs for 3-stage chain.

### Algorithm 4: Ring Buffer Back-Pressure with Adaptive Sampling

**Purpose:** Prevent ring buffer overflow under burst load by dynamically adjusting the sampling rate based on ring buffer fill level.

```
FUNCTION adaptive_sample_check(event_type):
    // Read ring buffer fill level from per-CPU stats map
    stats = bpf_map_lookup_percpu_elem(stats_map, RINGBUF_STATS_KEY)
    IF stats IS NULL:
        RETURN SAMPLE  // Default to sampling if stats unavailable

    // Calculate fill ratio (updated by user-space agent periodically)
    fill_ratio = stats.ring_buf_used / stats.ring_buf_size

    // Tiered sampling based on fill level
    IF fill_ratio < 0.5:
        RETURN SAMPLE  // Normal: capture everything

    IF fill_ratio < 0.75:
        // Moderate pressure: sample non-critical events
        IF event_type == EVENT_NETWORK_FLOW:
            // Sample 50% using hash of connection key
            hash = bpf_get_prandom_u32()
            IF hash % 2 == 0:
                RETURN DROP
        RETURN SAMPLE

    IF fill_ratio < 0.9:
        // High pressure: aggressive sampling
        IF event_type == EVENT_NETWORK_FLOW:
            // Sample 10%
            IF bpf_get_prandom_u32() % 10 != 0:
                RETURN DROP
        IF event_type == EVENT_SYSCALL_TRACE:
            // Sample 25%
            IF bpf_get_prandom_u32() % 4 != 0:
                RETURN DROP
        RETURN SAMPLE  // Always keep security events

    // Critical pressure (>90%): only security events
    IF event_type == EVENT_SECURITY:
        RETURN SAMPLE
    RETURN DROP


// Usage in eBPF program:
FUNCTION on_syscall_enter(ctx):
    IF adaptive_sample_check(EVENT_SYSCALL_TRACE) == DROP:
        // Increment drop counter (always, for observability)
        increment_percpu_counter(dropped_events_counter)
        RETURN 0

    // ... normal event processing ...
```

**Complexity:** O(1) per event. The sampling decision adds ~10ns overhead per event.

---

## Indexing Strategy

| Data Type | Primary Index | Secondary Indices | Partitioning |
|-----------|--------------|-------------------|-------------|
| Network Flows | (timestamp, flow_id) | (src_service, dst_service), (l7_protocol, http_status), (namespace) | Time-based (hourly buckets) |
| Security Events | (timestamp, event_id) | (event_type, action), (policy_name), (pod_id) | Time-based (hourly) + action-based (deny events in hot tier) |
| Profile Samples | (timestamp, node_id) | (pid, profile_type), (stack_hash) | Time-based (10-minute buckets) |
| Trace Spans | (trace_id, span_id) | (service_name, operation), (duration), (status) | Time-based (hourly) + trace_id hash |
| K8s Identity | (pod_id) | (namespace, pod_name), (cgroup_id), (node_name) | None (small dataset, fully cached) |

## Data Retention Policy

| Tier | Duration | Storage | Resolution |
|------|----------|---------|------------|
| Hot | 3 days | SSD-backed time-series DB | Full resolution |
| Warm | 30 days | Compressed columnar storage | 1-minute aggregation for metrics; sampled events |
| Cold | 1 year | Object storage | 5-minute aggregation; security events only at full resolution |
| Archive | 7 years (compliance) | Object storage (immutable) | Security audit events only |
