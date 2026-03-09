# Low-Level Design — Code Execution Sandbox

## 1. Data Model

### Submission Record

```
Submission {
    id:                 UUID            // Globally unique submission identifier
    user_id:            UUID            // Submitting user (from parent platform)
    problem_id:         UUID            // Problem being solved (optional for raw execution)
    language:           String          // Language identifier (e.g., "python3.11", "cpp17")
    source_code_ref:    String          // Object storage reference to source code
    compilation_flags:  String[]        // Optional compiler flags
    stdin:              String          // Optional standard input (for raw execution mode)
    status:             Enum            // QUEUED | COMPILING | RUNNING | JUDGING | COMPLETED | FAILED
    verdict:            Enum            // PENDING | AC | WA | TLE | MLE | RE | CE | SE (System Error)
    priority:           Integer         // 0 (low) to 100 (contest priority)
    created_at:         Timestamp
    started_at:         Timestamp       // When execution began
    completed_at:       Timestamp       // When final verdict was determined
    worker_id:          String          // Worker that processed this submission
    execution_metadata: ExecutionMeta   // Aggregate execution statistics
}
```

### Execution Result (per test case)

```
TestCaseResult {
    id:                 UUID
    submission_id:      UUID            // FK to Submission
    test_case_id:       UUID            // FK to TestCase
    test_case_number:   Integer         // Ordinal position (1-indexed)
    verdict:            Enum            // AC | WA | TLE | MLE | RE
    actual_output:      String          // Captured stdout (truncated to 64KB)
    stderr_output:      String          // Captured stderr (truncated to 16KB)
    exit_code:          Integer         // Process exit code
    cpu_time_ms:        Integer         // CPU time consumed
    wall_time_ms:       Integer         // Wall-clock time consumed
    memory_kb:          Integer         // Peak memory usage (RSS)
    signal:             Integer         // Signal that terminated process (if any)
}
```

### Execution Metadata (aggregate)

```
ExecutionMeta {
    total_test_cases:       Integer
    passed_test_cases:      Integer
    total_cpu_time_ms:      Integer     // Sum across all test cases
    total_wall_time_ms:     Integer
    peak_memory_kb:         Integer     // Max across all test cases
    compilation_time_ms:    Integer     // Time spent compiling (0 for interpreted)
    compilation_output:     String      // Compiler stdout/stderr (truncated to 16KB)
    sandbox_creation_ms:    Integer     // Time to lease/create sandbox
    queue_wait_ms:          Integer     // Time spent in queue
}
```

### Test Case

```
TestCase {
    id:                 UUID
    problem_id:         UUID
    number:             Integer         // Ordinal position
    input:              String          // stdin content (stored in Object Storage if > 1MB)
    expected_output:    String          // Expected stdout
    is_sample:          Boolean         // Visible to user before submission
    time_limit_ms:      Integer         // Per-test-case override (default: problem-level)
    memory_limit_kb:    Integer         // Per-test-case override
    comparison_mode:    Enum            // EXACT | WHITESPACE_TOLERANT | FLOAT_EPSILON | CUSTOM_JUDGE
    epsilon:            Float           // For FLOAT_EPSILON mode
    judge_source_ref:   String          // Object Storage ref for CUSTOM_JUDGE mode
    weight:             Float           // For partial scoring (default: 1.0)
}
```

### Language Runtime Configuration

```
LanguageRuntime {
    id:                 String          // e.g., "python3.11", "cpp17_gcc13"
    display_name:       String          // e.g., "Python 3.11.7", "C++17 (GCC 13.2)"
    runtime_image:      String          // Container/VM image reference
    compile_command:    String          // Template: "g++ -std=c++17 -O2 {source} -o {binary}"
    run_command:        String          // Template: "python3 {source}" or "./{binary}"
    source_filename:    String          // e.g., "solution.py", "solution.cpp"
    binary_filename:    String          // e.g., "solution" (for compiled languages)
    default_time_limit: Integer         // ms (e.g., 2000 for Python, 1000 for C++)
    default_mem_limit:  Integer         // KB (e.g., 262144 = 256MB)
    max_processes:      Integer         // PID limit (e.g., 64)
    max_file_size_kb:   Integer         // Max writable file size (e.g., 10240 = 10MB)
    allowed_syscalls:   String[]        // Seccomp profile identifier or explicit list
    env_vars:           Map             // Environment variables set in sandbox
    tier:               Enum            // TIER_1 (warm pool) | TIER_2 (cold start)
    is_compiled:        Boolean
    is_active:          Boolean
}
```

### Sandbox Lease

```
SandboxLease {
    lease_id:           UUID
    sandbox_id:         UUID
    worker_id:          String
    language_runtime:   String
    status:             Enum            // LEASED | RETURNED | EXPIRED | FAILED
    leased_at:          Timestamp
    returned_at:        Timestamp
    ttl_seconds:        Integer         // Max lease duration before force-reclaim
    scrub_duration_ms:  Integer         // Time spent scrubbing on return
}
```

---

## 2. API Design

### Submit Code

```
POST /v1/submissions

Request:
{
    "language":         "python3.11",
    "source_code":      "print('hello')",
    "problem_id":       "prob_abc123",          // Optional: for judging mode
    "stdin":            "test input",            // Optional: for raw execution mode
    "compilation_flags": ["-O2"],                // Optional
    "priority":         50,                      // Optional: 0-100
    "callback_url":     "https://..."            // Optional: webhook on completion
}

Response (202 Accepted):
{
    "submission_id":    "sub_xyz789",
    "status":           "QUEUED",
    "estimated_wait_ms": 500,
    "links": {
        "status":       "/v1/submissions/sub_xyz789",
        "stream":       "wss://stream.example.com/sub_xyz789"
    }
}

Error Responses:
  400: Invalid language, source code too large (> 100KB), invalid flags
  429: Rate limit exceeded (includes Retry-After header)
  503: Queue full, system overloaded (includes Retry-After header)
```

### Get Submission Status

```
GET /v1/submissions/{submission_id}

Response (200 OK):
{
    "submission_id":    "sub_xyz789",
    "status":           "COMPLETED",
    "verdict":          "AC",
    "language":         "python3.11",
    "created_at":       "2026-03-09T12:00:00Z",
    "completed_at":     "2026-03-09T12:00:01.5Z",
    "execution": {
        "total_test_cases":     15,
        "passed_test_cases":    15,
        "total_cpu_time_ms":    342,
        "peak_memory_kb":       14208,
        "compilation_time_ms":  0,
        "queue_wait_ms":        120,
        "sandbox_creation_ms":  45
    },
    "test_cases": [
        {
            "number":       1,
            "verdict":      "AC",
            "cpu_time_ms":  23,
            "memory_kb":    14208,
            "is_sample":    true
        },
        ...
    ]
}
```

### Stream Output (WebSocket)

```
CONNECT wss://stream.example.com/v1/stream/{submission_id}

Server → Client messages:
{
    "type":     "stdout",           // stdout | stderr | status | error | complete
    "data":     "Hello, World!\n",
    "test_case": 1,                 // Which test case this output belongs to
    "timestamp": 1709985600123
}

{
    "type":     "status",
    "data":     "COMPILING",        // Status transition notification
    "timestamp": 1709985600050
}

{
    "type":     "complete",
    "data":     {verdict: "AC", ...},
    "timestamp": 1709985601500
}
```

### List Languages

```
GET /v1/languages

Response (200 OK):
{
    "languages": [
        {
            "id":               "python3.11",
            "name":             "Python 3.11.7",
            "is_compiled":      false,
            "default_time_limit_ms": 5000,
            "default_memory_limit_kb": 262144,
            "tier":             "TIER_1",
            "source_filename":  "solution.py"
        },
        {
            "id":               "cpp17_gcc13",
            "name":             "C++17 (GCC 13.2)",
            "is_compiled":      true,
            "default_time_limit_ms": 2000,
            "default_memory_limit_kb": 262144,
            "tier":             "TIER_1",
            "source_filename":  "solution.cpp"
        },
        ...
    ]
}
```

### Cancel Submission

```
DELETE /v1/submissions/{submission_id}

Response (200 OK):
{
    "submission_id":    "sub_xyz789",
    "status":           "CANCELLED",
    "was_executing":    false           // true if sandbox was killed
}

Error:
  404: Submission not found
  409: Already completed, cannot cancel
```

---

## 3. Core Algorithms

### 3.1 Worker Scheduling Algorithm

The scheduler assigns queued submissions to available workers, optimizing for language affinity (reuse warm pool hits) and load balancing.

```
ALGORITHM WorkerScheduler:

    FUNCTION schedule(submission):
        language = submission.language

        // Phase 1: Find workers with warm sandbox for this language
        affine_workers = []
        FOR worker IN available_workers:
            IF worker.warm_pool_has(language) AND worker.load < 0.8:
                affine_workers.APPEND(worker)

        IF affine_workers IS NOT EMPTY:
            // Select least-loaded among affine workers
            SORT affine_workers BY load ASC
            RETURN affine_workers[0]

        // Phase 2: Fall back to any worker with capacity
        available = []
        FOR worker IN all_workers:
            IF worker.load < 0.9 AND worker.status == HEALTHY:
                available.APPEND(worker)

        IF available IS NOT EMPTY:
            // Select worker with most memory headroom
            SORT available BY available_memory DESC
            RETURN available[0]

        // Phase 3: No workers available — keep in queue
        RETURN NULL  // Message stays in queue, visibility timeout will re-surface it

    // Complexity: O(W) where W = number of workers
    // Called: Once per dequeued submission
    // Optimization: Maintain sorted index of workers by load; reduces to O(log W)
```

### 3.2 Warm Pool Management

```
ALGORITHM WarmPoolManager:

    STATE:
        pools: Map<language, Queue<Sandbox>>    // Available sandboxes per language
        target_sizes: Map<language, Integer>     // Desired pool size per language
        max_total: Integer                       // Cluster-wide sandbox limit
        active_leases: Map<lease_id, SandboxLease>

    FUNCTION lease(language) -> (Sandbox, lease_id):
        IF pools[language] IS NOT EMPTY:
            sandbox = pools[language].DEQUEUE()
            lease_id = generate_uuid()
            active_leases[lease_id] = SandboxLease(sandbox, NOW, TTL=120s)
            metrics.record("warm_pool.hit", language)
            RETURN (sandbox, lease_id)
        ELSE:
            // Cold path: create new sandbox synchronously
            sandbox = create_sandbox(language)
            lease_id = generate_uuid()
            active_leases[lease_id] = SandboxLease(sandbox, NOW, TTL=120s)
            metrics.record("warm_pool.miss", language)
            RETURN (sandbox, lease_id)

    FUNCTION return_lease(lease_id):
        lease = active_leases.REMOVE(lease_id)
        sandbox = lease.sandbox
        language = lease.language_runtime

        // Scrub sandbox for safe reuse
        scrub_start = NOW
        scrub_sandbox(sandbox)
        metrics.record("scrub_duration", NOW - scrub_start)

        // Return to pool if under target
        IF pools[language].SIZE < target_sizes[language]:
            pools[language].ENQUEUE(sandbox)
        ELSE:
            destroy_sandbox(sandbox)

    FUNCTION scrub_sandbox(sandbox):
        // Critical: must remove ALL traces of previous execution
        sandbox.run("rm -rf /workspace/*")          // Clear user files
        sandbox.run("rm -rf /tmp/*")                 // Clear temp files
        sandbox.reset_pid_namespace()                // Kill any lingering processes
        sandbox.reset_cgroup_counters()              // Reset CPU/memory accounting
        sandbox.verify_filesystem_integrity()        // Ensure no symlinks to host
        // Note: Network namespace is always isolated; no reset needed

    FUNCTION replenish():
        // Background thread: runs every 5 seconds
        LOOP FOREVER:
            FOR language IN target_sizes.KEYS:
                deficit = target_sizes[language] - pools[language].SIZE
                IF deficit > 0 AND total_sandboxes() < max_total:
                    batch_size = MIN(deficit, 10)    // Create up to 10 at a time
                    FOR i IN 1..batch_size:
                        sandbox = create_sandbox(language)
                        pools[language].ENQUEUE(sandbox)
            SLEEP(5 seconds)

    FUNCTION evict():
        // Background thread: runs every 30 seconds
        IF total_sandboxes() > max_total * 0.9:
            // Evict from lowest-demand language pools
            languages_by_demand = SORT languages BY recent_lease_rate ASC
            FOR language IN languages_by_demand:
                WHILE pools[language].SIZE > target_sizes[language] * 0.5:
                    sandbox = pools[language].DEQUEUE()
                    destroy_sandbox(sandbox)
                    IF total_sandboxes() <= max_total * 0.8:
                        RETURN

    FUNCTION recalibrate_targets():
        // Runs every 5 minutes: adjust pool sizes based on recent demand
        FOR language IN all_languages:
            recent_rate = get_lease_rate_last_5min(language)
            target_sizes[language] = CLAMP(
                recent_rate * 30,                    // 30 seconds of demand
                MIN_POOL_SIZE,                       // At least 5
                MAX_POOL_SIZE_PER_LANGUAGE            // At most 500
            )
```

### 3.3 Sandbox Creation (nsjail-based)

```
ALGORITHM create_sandbox(language):
    runtime = language_runtimes[language]

    config = NsjailConfig {
        // Namespace isolation
        clone_newuser:  true        // User namespace — map to unprivileged UID
        clone_newpid:   true        // PID namespace — process sees itself as PID 1
        clone_newns:    true        // Mount namespace — isolated filesystem view
        clone_newnet:   true        // Network namespace — no network access
        clone_newipc:   true        // IPC namespace — no shared memory/semaphores
        clone_newuts:   true        // UTS namespace — isolated hostname
        clone_newcgroup: true       // Cgroup namespace — isolated cgroup view

        // Filesystem
        mount_root:     runtime.image_path      // Read-only root from runtime image
        mount_tmpfs:    "/workspace", size=10MB  // Writable workspace (size-limited)
        mount_tmpfs:    "/tmp", size=5MB         // Writable temp directory
        mount_proc:     false                    // No /proc access (prevents info leaks)

        // Resource limits (cgroups v2)
        cgroup_mem_max: runtime.default_mem_limit * 1024  // Bytes
        cgroup_pids_max: runtime.max_processes            // Typically 64
        cgroup_cpu_ms_per_wall_ms: 1000                   // 1 CPU core equivalent

        // Time limits
        time_limit:     runtime.default_time_limit / 1000 + 5  // Wall-clock seconds (with buffer)

        // rlimits
        rlimit_fsize:   runtime.max_file_size_kb * 1024   // Max file size in bytes
        rlimit_nofile:  256                                // Max open file descriptors
        rlimit_stack:   8388608                            // 8MB stack

        // Security
        seccomp_policy: load_seccomp_profile(runtime.allowed_syscalls)
        uid_mapping:    "0:65534:1"            // Map container root to nobody
        gid_mapping:    "0:65534:1"
        no_new_privs:   true                   // PR_SET_NO_NEW_PRIVS
        drop_caps:      ALL                    // Drop all Linux capabilities
    }

    sandbox = Sandbox.create(config)
    sandbox.inject_file(runtime.source_filename, "")  // Empty source placeholder
    RETURN sandbox
```

### 3.4 Code Execution Pipeline

```
ALGORITHM execute_submission(submission):
    runtime = language_runtimes[submission.language]
    (sandbox, lease_id) = warm_pool.lease(submission.language)

    TRY:
        // Step 1: Inject source code into sandbox
        source_code = object_store.get(submission.source_code_ref)
        sandbox.write_file("/workspace/" + runtime.source_filename, source_code)

        // Step 2: Compile (if applicable)
        IF runtime.is_compiled:
            update_status(submission.id, COMPILING)
            compile_cmd = runtime.compile_command
                .replace("{source}", runtime.source_filename)
                .replace("{binary}", runtime.binary_filename)

            compile_result = sandbox.run_command(
                command:    compile_cmd,
                cwd:        "/workspace",
                timeout:    30_000,         // 30s compilation timeout
                memory:     512_MB          // Generous for compilation
            )

            IF compile_result.exit_code != 0:
                store_verdict(submission.id, CE, compile_result.stderr)
                RETURN

        // Step 3: Run against test cases
        update_status(submission.id, RUNNING)
        test_cases = test_case_store.get(submission.problem_id)
        run_cmd = runtime.run_command
            .replace("{source}", runtime.source_filename)
            .replace("{binary}", runtime.binary_filename)

        final_verdict = AC  // Optimistic; downgrade on first failure

        FOR tc IN test_cases:
            time_limit = tc.time_limit_ms OR runtime.default_time_limit
            mem_limit = tc.memory_limit_kb OR runtime.default_mem_limit

            result = sandbox.run_command(
                command:    run_cmd,
                cwd:        "/workspace",
                stdin:      tc.input,
                timeout:    time_limit + 1000,    // Buffer for wall-clock
                cpu_limit:  time_limit,            // Hard CPU limit
                memory:     mem_limit * 1024       // Bytes
            )

            // Stream output to client if WebSocket connected
            IF submission.has_stream_listener:
                stream_gateway.send(submission.id, result.stdout, tc.number)

            // Determine test case verdict
            tc_verdict = determine_verdict(result, tc)
            store_test_result(submission.id, tc, result, tc_verdict)

            IF tc_verdict != AC:
                final_verdict = tc_verdict
                IF submission.early_termination:
                    BREAK

        // Step 4: Store final result
        update_status(submission.id, COMPLETED)
        store_final_verdict(submission.id, final_verdict)

        IF submission.callback_url:
            webhook.send(submission.callback_url, get_result(submission.id))

    FINALLY:
        warm_pool.return_lease(lease_id)


FUNCTION determine_verdict(result, test_case) -> Verdict:
    // Priority: system signals > resource limits > correctness

    IF result.signal == SIGKILL AND result.memory_kb > test_case.memory_limit_kb:
        RETURN MLE       // OOM killed

    IF result.cpu_time_ms > test_case.time_limit_ms:
        RETURN TLE       // CPU time exceeded

    IF result.wall_time_ms > test_case.time_limit_ms * 3:
        RETURN TLE       // Wall-clock timeout (likely I/O or sleep)

    IF result.exit_code != 0 OR result.signal != 0:
        RETURN RE        // Runtime error (segfault, assertion, exception)

    // Output comparison
    SWITCH test_case.comparison_mode:
        CASE EXACT:
            RETURN AC IF result.stdout == test_case.expected_output ELSE WA

        CASE WHITESPACE_TOLERANT:
            RETURN AC IF normalize_whitespace(result.stdout) ==
                         normalize_whitespace(test_case.expected_output) ELSE WA

        CASE FLOAT_EPSILON:
            RETURN AC IF compare_floats(result.stdout, test_case.expected_output,
                                        test_case.epsilon) ELSE WA

        CASE CUSTOM_JUDGE:
            judge_code = object_store.get(test_case.judge_source_ref)
            judge_result = run_judge(judge_code, test_case.input,
                                     test_case.expected_output, result.stdout)
            RETURN AC IF judge_result.accepted ELSE WA

    // Complexity: O(T * (E + C)) where T = test cases, E = execution time, C = comparison time
```

### 3.5 Output Comparison Algorithms

```
FUNCTION normalize_whitespace(text) -> String:
    // Remove trailing whitespace per line, normalize line endings, strip trailing newlines
    lines = text.split("\n")
    normalized = []
    FOR line IN lines:
        normalized.APPEND(line.rstrip())

    // Remove trailing empty lines
    WHILE normalized IS NOT EMPTY AND normalized.LAST == "":
        normalized.POP()

    RETURN normalized.join("\n")


FUNCTION compare_floats(actual, expected, epsilon) -> Boolean:
    // Parse both outputs as sequences of tokens
    actual_tokens = tokenize(actual)
    expected_tokens = tokenize(expected)

    IF actual_tokens.LENGTH != expected_tokens.LENGTH:
        RETURN false

    FOR i IN 0..actual_tokens.LENGTH:
        IF is_number(expected_tokens[i]):
            a = parse_float(actual_tokens[i])
            e = parse_float(expected_tokens[i])
            IF a == NULL:
                RETURN false    // Expected a number, got non-numeric
            // Both absolute and relative error check
            IF ABS(a - e) > epsilon AND ABS(a - e) / MAX(1, ABS(e)) > epsilon:
                RETURN false
        ELSE:
            IF actual_tokens[i] != expected_tokens[i]:
                RETURN false

    RETURN true
```

---

## 4. Internal Component Design

### 4.1 Worker Process Architecture

```
Worker Process
├── Main Thread
│   ├── Queue Consumer (long-poll from message queue)
│   ├── Submission Executor (orchestrates sandbox lifecycle)
│   └── Result Publisher (writes to result store + cache)
├── Health Check Thread
│   ├── Self-liveness (heartbeat to scheduler)
│   └── Sandbox health (probe leased sandboxes)
├── Metrics Thread
│   └── Collects and exports execution metrics every 10s
└── Warm Pool Manager (if worker-local)
    ├── Pool Replenisher
    ├── Lease Tracker
    └── Scrubber
```

### 4.2 Sandbox Process Tree (inside nsjail)

```
nsjail (PID 1 in namespace)
└── User Process
    ├── Compiler (if compiled language) — killed after compilation
    └── Executed Binary / Interpreter
        └── User code runs here with:
            - UID 65534 (nobody)
            - No capabilities
            - Seccomp filter active
            - cgroup limits enforced
            - Read-only root filesystem
            - No network access
            - No /proc, /sys access
```

---

## 5. Database Schema Considerations

### Indexing Strategy

| Table | Index | Purpose |
|---|---|---|
| submissions | (user_id, created_at DESC) | User's submission history |
| submissions | (problem_id, verdict, created_at) | Problem acceptance rate analytics |
| submissions | (status) WHERE status IN ('QUEUED', 'RUNNING') | Active submission monitoring |
| test_case_results | (submission_id, test_case_number) | Ordered results per submission |
| sandbox_leases | (status, leased_at) WHERE status = 'LEASED' | Expired lease detection |

### Partitioning

| Table | Strategy | Rationale |
|---|---|---|
| submissions | Range by created_at (monthly) | Time-based queries; easy retention management |
| test_case_results | Range by created_at (monthly) | Co-located with parent submission |
| sandbox_leases | None (small table, high turnover) | Short-lived records, periodically purged |
