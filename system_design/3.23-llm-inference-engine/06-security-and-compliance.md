# Security and Compliance

## Memory Isolation

### KV Cache Cross-Request Leakage

**Risk:** KV cache from Request A visible to Request B through shared memory blocks.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MEMORY ISOLATION RISKS                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ATTACK SCENARIO:                                                   │
│  ─────────────────                                                  │
│  1. Request A processes sensitive prompt (SSN, API key)             │
│  2. Request A completes, blocks returned to free list               │
│  3. Request B allocated same physical blocks                        │
│  4. Malicious Request B reads uninitialized memory                  │
│  5. Sensitive data from Request A exposed                           │
│                                                                     │
│  MITIGATIONS:                                                       │
│  ────────────                                                       │
│                                                                     │
│  1. ZERO-ON-FREE (Recommended):                                     │
│     ─────────────────────────                                       │
│     def free_blocks(sequence):                                      │
│         for block_id in sequence.block_table:                       │
│             # Zero KV cache memory before returning to pool         │
│             k_cache[:, block_id, :, :, :].zero_()                   │
│             v_cache[:, block_id, :, :, :].zero_()                   │
│                                                                     │
│             physical_blocks[block_id].ref_count -= 1                │
│             if physical_blocks[block_id].ref_count == 0:            │
│                 free_list.push(block_id)                            │
│                                                                     │
│     Performance Impact: ~1% overhead (GPU memory clear is fast)     │
│                                                                     │
│  2. ZERO-ON-ALLOCATE (Alternative):                                 │
│     ──────────────────────────────                                  │
│     def allocate_blocks(sequence, num_blocks):                      │
│         blocks = []                                                 │
│         for _ in range(num_blocks):                                 │
│             block_id = free_list.pop()                              │
│             # Zero before use                                       │
│             k_cache[:, block_id, :, :, :].zero_()                   │
│             v_cache[:, block_id, :, :, :].zero_()                   │
│             blocks.append(block_id)                                 │
│         return blocks                                               │
│                                                                     │
│     Trade-off: Latency impact on request start vs completion        │
│                                                                     │
│  3. TENANT ISOLATION (Multi-tenant):                                │
│     ─────────────────────────────────                               │
│     Separate block pools per tenant:                                │
│                                                                     │
│     class TenantBlockManager:                                       │
│         def __init__(self):                                         │
│             self.tenant_pools = {}                                  │
│                                                                     │
│         def get_pool(self, tenant_id):                              │
│             if tenant_id not in self.tenant_pools:                  │
│                 self.tenant_pools[tenant_id] = BlockPool(           │
│                     max_blocks=self.per_tenant_limit                │
│                 )                                                   │
│             return self.tenant_pools[tenant_id]                     │
│                                                                     │
│     Trade-off: Lower memory efficiency (fragmentation per tenant)   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### GPU Memory Protection

```
NVIDIA CONFIDENTIAL COMPUTING (H100+)
─────────────────────────────────────

FEATURE: Hardware-enforced memory encryption and isolation

CAPABILITIES:
1. Memory Encryption:
   - AES-256 encryption of GPU memory
   - Keys managed by GPU hardware
   - Transparent to applications

2. Attestation:
   - Cryptographic proof of GPU state
   - Verify GPU hasn't been tampered with
   - Remote attestation for cloud deployment

3. Secure Boot:
   - Verify GPU firmware integrity
   - Prevent malicious driver injection

DEPLOYMENT:
    # Enable confidential computing mode
    nvidia-smi conf-compute -ecs 1

    # Verify attestation
    nvidia-attestation-tool --verify

LIMITATIONS:
- Performance overhead: 5-10%
- Requires H100 or newer
- Driver support required

USE CASES:
- Healthcare (HIPAA data)
- Finance (PII processing)
- Government (classified information)
```

---

## Model Weight Protection

### Preventing Model Extraction

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MODEL WEIGHT PROTECTION                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  THREAT MODEL:                                                      │
│  ─────────────                                                      │
│  - Attacker has access to inference API                             │
│  - Goal: Extract model weights through repeated queries             │
│  - Method: Analyze logits to reconstruct parameters                 │
│                                                                     │
│  MITIGATIONS:                                                       │
│  ────────────                                                       │
│                                                                     │
│  1. LOGIT PROCESSING:                                               │
│     ─────────────────                                               │
│     - Don't return raw logits (return top-k only)                   │
│     - Add noise to probability distributions                        │
│     - Rate limit logprobs requests                                  │
│                                                                     │
│     def process_logits(logits, return_logprobs=False):              │
│         if not return_logprobs:                                     │
│             return sample(logits)  # No logits exposed              │
│                                                                     │
│         # Only return top-k probabilities                           │
│         top_k = 5                                                   │
│         probs = softmax(logits)                                     │
│         top_probs, top_indices = probs.topk(top_k)                  │
│                                                                     │
│         # Add noise to prevent precise reconstruction               │
│         noise = torch.randn_like(top_probs) * 0.01                  │
│         noisy_probs = (top_probs + noise).clamp(0, 1)               │
│         noisy_probs = noisy_probs / noisy_probs.sum()               │
│                                                                     │
│         return top_indices, noisy_probs                             │
│                                                                     │
│  2. RATE LIMITING:                                                  │
│     ──────────────                                                  │
│     - Limit requests per user/API key                               │
│     - Higher limits for trusted users                               │
│     - Anomaly detection for extraction patterns                     │
│                                                                     │
│  3. WEIGHT ENCRYPTION AT REST:                                      │
│     ─────────────────────────────                                   │
│     - Encrypt model files on disk                                   │
│     - Decrypt only into GPU memory                                  │
│     - Key management via HSM or cloud KMS                           │
│                                                                     │
│  4. NO DIRECT MEMORY ACCESS:                                        │
│     ──────────────────────────                                      │
│     - Disable CUDA debugging in production                          │
│     - No /dev/mem access to GPU                                     │
│     - Container isolation                                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Secure Model Loading

```
SECURE MODEL LOADING PIPELINE
─────────────────────────────

1. ENCRYPTED STORAGE:
   - Model weights encrypted with AES-256-GCM
   - Keys stored in HSM or cloud KMS
   - Signed manifests for integrity verification

2. SECURE TRANSFER:
   - TLS 1.3 for network transfer
   - Checksum verification after download
   - No intermediate storage (stream to GPU)

3. DECRYPTION IN MEMORY:
   - Decrypt directly into GPU memory
   - Never write plaintext to disk
   - Clear CPU staging buffers after transfer

IMPLEMENTATION:
    class SecureModelLoader:
        def __init__(self, kms_client):
            self.kms = kms_client

        def load_model(self, model_path, model_key_id):
            # Get decryption key from KMS
            key = self.kms.get_key(model_key_id)

            # Stream encrypted model to GPU
            with open(model_path, 'rb') as f:
                for chunk in read_encrypted_chunks(f):
                    # Decrypt chunk
                    plaintext = decrypt_aes_gcm(chunk, key)

                    # Transfer directly to GPU
                    gpu_buffer = allocate_gpu_memory(len(plaintext))
                    copy_to_gpu(plaintext, gpu_buffer)

                    # Clear CPU buffer immediately
                    secure_zero(plaintext)

            # Clear key from memory
            secure_zero(key)
```

---

## Denial of Service Prevention

### Long Context Attacks

**Attack:** Submit extremely long prompts to exhaust KV cache memory.

```
LONG CONTEXT DOS MITIGATION
───────────────────────────

ATTACK PATTERN:
- Attacker sends max-length prompts repeatedly
- Each request consumes maximum KV cache
- Legitimate requests starved of memory

MITIGATIONS:

1. MAX CONTEXT ENFORCEMENT:
   def validate_request(prompt_tokens, max_context=4096):
       if len(prompt_tokens) > max_context:
           raise InvalidRequestError(
               f"Prompt exceeds maximum length of {max_context} tokens"
           )

2. PER-REQUEST MEMORY QUOTA:
   class MemoryQuotaManager:
       def __init__(self, max_tokens_per_request=8192):
           self.max_tokens = max_tokens_per_request

       def check_quota(self, prompt_len, max_output):
           total_tokens = prompt_len + max_output
           if total_tokens > self.max_tokens:
               raise QuotaExceededError(
                   f"Request would use {total_tokens} tokens, "
                   f"max is {self.max_tokens}"
               )

3. PER-USER CONCURRENT LIMITS:
   class ConcurrencyLimiter:
       def __init__(self, max_concurrent_per_user=10):
           self.user_counts = defaultdict(int)
           self.max_concurrent = max_concurrent_per_user

       def acquire(self, user_id):
           if self.user_counts[user_id] >= self.max_concurrent:
               raise TooManyRequestsError()
           self.user_counts[user_id] += 1

       def release(self, user_id):
           self.user_counts[user_id] -= 1

4. PREEMPTION FOR RUNAWAY REQUESTS:
   def preemption_policy(running_requests):
       for req in running_requests:
           # Kill requests exceeding time limit
           if req.elapsed_time > MAX_REQUEST_TIME:
               abort_request(req, reason="timeout")

           # Kill requests generating too many tokens
           if len(req.output_tokens) > MAX_OUTPUT_TOKENS:
               abort_request(req, reason="output_limit")
```

### Resource Exhaustion Prevention

```
┌─────────────────────────────────────────────────────────────────────┐
│                RESOURCE EXHAUSTION PREVENTION                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  MEMORY PROTECTION:                                                 │
│  ──────────────────                                                 │
│  - Reserve 10% GPU memory for system operations                     │
│  - Hard limit on KV cache pool size                                 │
│  - Graceful rejection when approaching limit                        │
│                                                                     │
│  COMPUTE PROTECTION:                                                │
│  ───────────────────                                                │
│  - Limit max batch size                                             │
│  - Timeout for individual forward passes                            │
│  - Circuit breaker for repeated failures                            │
│                                                                     │
│  NETWORK PROTECTION:                                                │
│  ───────────────────                                                │
│  - Rate limiting at API gateway                                     │
│  - Connection limits per client                                     │
│  - Request size limits                                              │
│                                                                     │
│  IMPLEMENTATION:                                                    │
│  ───────────────                                                    │
│  class ResourceGuard:                                               │
│      def __init__(self):                                            │
│          self.memory_limit = 0.90  # 90% max utilization            │
│          self.batch_limit = 64                                      │
│          self.request_timeout = 120  # seconds                      │
│                                                                     │
│      def can_accept_request(self, request):                         │
│          # Check memory                                             │
│          if self.memory_usage() > self.memory_limit:                │
│              return False, "Memory pressure"                        │
│                                                                     │
│          # Check batch size                                         │
│          if self.current_batch_size() >= self.batch_limit:          │
│              return False, "Batch full"                             │
│                                                                     │
│          # Check estimated completion time                          │
│          est_time = self.estimate_completion(request)               │
│          if est_time > self.request_timeout:                        │
│              return False, "Request too large"                      │
│                                                                     │
│          return True, None                                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Compliance Considerations

### Data Residency

```
DATA RESIDENCY FOR KV CACHE
───────────────────────────

REQUIREMENT:
Certain jurisdictions require data to remain within geographic boundaries
(GDPR, data localization laws)

KV CACHE IMPLICATIONS:
- KV cache contains derived representations of input data
- May be subject to same residency requirements as input
- Must ensure KV cache stays in compliant region

IMPLEMENTATION:
1. REGION-LOCKED INSTANCES:
   - Deploy inference instances per region
   - Route requests based on user location
   - No KV cache transfer across regions

2. DISAGGREGATED SERVING:
   - Extra care with KV cache transfer
   - Ensure prefill and decode workers in same region
   - Or disable disaggregation for regulated workloads

3. SWAP STORAGE:
   - CPU swap must be in same region
   - No cross-region memory offload
```

### Audit Logging

```
AUDIT LOG REQUIREMENTS
──────────────────────

WHAT TO LOG:
1. Request metadata:
   - Timestamp
   - User/API key identifier
   - Request ID
   - Source IP (hashed for privacy)

2. Processing metadata:
   - Model used
   - Token counts (input/output)
   - Latency metrics
   - Any errors

3. DO NOT LOG:
   - Actual prompt content (PII risk)
   - Actual response content
   - Full API keys

IMPLEMENTATION:
    class AuditLogger:
        def log_request(self, request, response, metrics):
            audit_record = {
                "timestamp": datetime.utcnow().isoformat(),
                "request_id": request.id,
                "user_id_hash": hash(request.user_id),
                "model": request.model,
                "input_tokens": metrics.input_tokens,
                "output_tokens": metrics.output_tokens,
                "ttft_ms": metrics.ttft_ms,
                "total_time_ms": metrics.total_time_ms,
                "status": response.status,
                # NO prompt or response content
            }

            self.audit_sink.write(audit_record)

RETENTION:
- Typical: 90 days for operational
- Compliance: 7 years for regulated industries
- Anonymize after retention period
```

### PII Handling

**Note:** PII detection and scrubbing should happen at the gateway layer (see 3.22 AI Guardrails). The inference engine should assume inputs are already sanitized.

```
ENGINE-LEVEL PII CONSIDERATIONS
───────────────────────────────

1. MEMORY CLEARING:
   - Zero KV cache on deallocation
   - Don't persist KV cache to disk
   - Clear activations after request

2. NO LOGGING OF CONTENT:
   - Never log prompts or responses
   - Only log metadata
   - Mask any accidental content leaks

3. ENCRYPTION:
   - TLS for all API communication
   - Encrypt swap storage if used
   - Consider GPU memory encryption (H100+)

4. ACCESS CONTROL:
   - Principle of least privilege
   - No direct GPU memory access
   - Audit all administrative actions
```

---

## Security Checklist

| Category | Control | Status |
|----------|---------|--------|
| **Memory Isolation** | Zero-on-free for KV cache | Required |
| **Memory Isolation** | Tenant-isolated block pools | Optional (multi-tenant) |
| **Memory Isolation** | GPU confidential computing | Recommended (H100+) |
| **Model Protection** | Weight encryption at rest | Required |
| **Model Protection** | Secure model loading | Required |
| **Model Protection** | Limited logprobs exposure | Recommended |
| **DoS Prevention** | Max context length | Required |
| **DoS Prevention** | Per-user rate limits | Required |
| **DoS Prevention** | Request timeout | Required |
| **DoS Prevention** | Memory quota per request | Required |
| **Compliance** | Audit logging | Required |
| **Compliance** | Data residency enforcement | Jurisdiction-dependent |
| **Compliance** | PII handling at gateway | Required (not engine) |
| **Network** | TLS 1.3 for all traffic | Required |
| **Network** | API authentication | Required |
