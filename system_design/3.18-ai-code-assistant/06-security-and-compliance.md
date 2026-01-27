# Security and Compliance

## Threat Model

### Attack Surface Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          AI Code Assistant Threat Model                          │
│                                                                                  │
│                              EXTERNAL THREATS                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                                                                              ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        ││
│  │  │  Malicious  │  │   Account   │  │   Supply    │  │   Network   │        ││
│  │  │    User     │  │  Takeover   │  │   Chain     │  │   Attack    │        ││
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        ││
│  │         │                │                │                │                ││
│  └─────────┼────────────────┼────────────────┼────────────────┼────────────────┘│
│            │                │                │                │                 │
│            ▼                ▼                ▼                ▼                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                           ATTACK VECTORS                                     ││
│  │                                                                              ││
│  │  ┌─────────────────────────────────────────────────────────────────────────┐││
│  │  │ A1: Prompt Injection                                                    │││
│  │  │     Direct: User crafts malicious prompts                               │││
│  │  │     Indirect: Malicious content in repo/docs injected via RAG          │││
│  │  └─────────────────────────────────────────────────────────────────────────┘││
│  │  ┌─────────────────────────────────────────────────────────────────────────┐││
│  │  │ A2: Data Exfiltration                                                   │││
│  │  │     Code theft: Extract proprietary code via completions               │││
│  │  │     Training data: Model memorization attacks                          │││
│  │  │     Side channel: Timing attacks on cache                              │││
│  │  └─────────────────────────────────────────────────────────────────────────┘││
│  │  ┌─────────────────────────────────────────────────────────────────────────┐││
│  │  │ A3: Malicious Code Generation                                           │││
│  │  │     Backdoors: Generate code with hidden vulnerabilities               │││
│  │  │     Dependencies: Suggest malicious/hallucinated packages              │││
│  │  │     Secrets: Generate code with hardcoded credentials                  │││
│  │  └─────────────────────────────────────────────────────────────────────────┘││
│  │  ┌─────────────────────────────────────────────────────────────────────────┐││
│  │  │ A4: Agent Mode Exploitation                                             │││
│  │  │     Privilege escalation: Escape sandbox, access unauthorized files    │││
│  │  │     Command injection: Execute arbitrary shell commands                │││
│  │  │     Persistence: Install backdoors via terminal access                 │││
│  │  └─────────────────────────────────────────────────────────────────────────┘││
│  │  ┌─────────────────────────────────────────────────────────────────────────┐││
│  │  │ A5: Denial of Service                                                   │││
│  │  │     Resource exhaustion: Large context, complex queries                │││
│  │  │     API abuse: Rate limit bypass, concurrent request floods            │││
│  │  └─────────────────────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│                              PROTECTED ASSETS                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐││
│  │  │   User    │  │Proprietary│  │  Model    │  │  System   │  │  Service  │││
│  │  │   Code    │  │   Data    │  │  Weights  │  │  Prompts  │  │Availability│││
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘  └───────────┘││
│  └─────────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Threat Severity Matrix

| Threat | Likelihood | Impact | Risk Level | Priority |
|--------|------------|--------|------------|----------|
| **Indirect prompt injection** | High | High | Critical | P0 |
| **Malicious code generation** | High | High | Critical | P0 |
| **Data exfiltration** | Medium | Critical | High | P1 |
| **Agent mode exploitation** | Medium | Critical | High | P1 |
| **Account takeover** | Low | High | Medium | P2 |
| **DoS attacks** | Medium | Medium | Medium | P2 |
| **Model extraction** | Low | Medium | Low | P3 |

---

## Authentication and Authorization

### Authentication Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Authentication Flow                                │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │                        IDE Plugin                                 ││
│  │                                                                   ││
│  │  1. User initiates login                                         ││
│  │  2. Redirect to OAuth provider                                   ││
│  └─────────────────────────┬────────────────────────────────────────┘│
│                            │                                         │
│                            ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │                    Identity Provider                              ││
│  │             (OAuth 2.0 + OIDC / SAML for Enterprise)             ││
│  │                                                                   ││
│  │  3. User authenticates (SSO, MFA)                                ││
│  │  4. Return authorization code                                    ││
│  └─────────────────────────┬────────────────────────────────────────┘│
│                            │                                         │
│                            ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │                     Auth Service                                  ││
│  │                                                                   ││
│  │  5. Exchange code for tokens                                     ││
│  │  6. Issue session token (JWT)                                    ││
│  │  7. Return API key for IDE                                       ││
│  └─────────────────────────┬────────────────────────────────────────┘│
│                            │                                         │
│                            ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │                    API Gateway                                    ││
│  │                                                                   ││
│  │  8. Validate token on each request                               ││
│  │  9. Enforce rate limits                                          ││
│  │  10. Route to appropriate service                                ││
│  └──────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### Authorization Model (RBAC + ABAC)

```yaml
# Role-Based Access Control
roles:
  - name: free_user
    permissions:
      - completion:inline
      - completion:fim
      - chat:basic
    limits:
      requests_per_day: 2000
      context_tokens: 4000
      models: [fast_model]

  - name: pro_user
    permissions:
      - completion:*
      - chat:*
      - repository:index
    limits:
      requests_per_day: 10000
      context_tokens: 8000
      models: [fast_model, standard_model]

  - name: business_user
    permissions:
      - completion:*
      - chat:*
      - repository:*
      - agent:basic
    limits:
      requests_per_day: unlimited
      context_tokens: 32000
      models: [fast_model, standard_model, premium_model]

  - name: enterprise_admin
    permissions:
      - "*"
      - admin:user_management
      - admin:audit_logs
      - admin:policy_management

# Attribute-Based Access Control (contextual)
policies:
  - name: agent_file_access
    effect: allow
    action: agent:file_write
    condition:
      file_path:
        within: ${workspace.root}
        not_matching: ["*.env", "*credentials*", "*.pem", "*.key"]

  - name: agent_terminal_access
    effect: allow
    action: agent:terminal_execute
    condition:
      command:
        in_allowlist: ${workspace.allowed_commands}
      requires_approval: ${command.is_destructive}

  - name: sensitive_repo_access
    effect: deny
    action: repository:index
    condition:
      repository.classification: "confidential"
      user.clearance_level: < 3
```

### API Key Security

```
┌─────────────────────────────────────────────────────────────────────┐
│                    API Key Lifecycle                                 │
│                                                                      │
│  Generation:                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ • 256-bit cryptographically random                               ││
│  │ • Format: cc_[env]_[random32chars]                              ││
│  │ • Example: cc_prod_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6             ││
│  │ • Store: Only hash stored server-side (Argon2id)                ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  Rotation:                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ • Automatic: 90-day expiry warning                               ││
│  │ • Manual: User-initiated rotation                                ││
│  │ • Grace period: 24 hours overlap for migration                  ││
│  │ • Compromised: Immediate revocation                             ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  Scoping:                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ • Workspace-scoped: Access limited to specific workspace        ││
│  │ • IP restrictions: Optional IP allowlist                        ││
│  │ • Permission subset: Can limit below user's full permissions    ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Protection

### Data Classification

| Classification | Examples | Encryption | Retention | Access |
|----------------|----------|------------|-----------|--------|
| **Public** | Documentation, public repos | TLS only | Indefinite | All users |
| **Internal** | Usage analytics, performance data | TLS + At-rest | 1 year | Employees |
| **Confidential** | User code, completions | TLS + At-rest (AES-256) | 30 days | User only |
| **Restricted** | Credentials, PII | TLS + At-rest + Field-level | Minimal | Need-to-know |

### Code Privacy Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Code Privacy Guarantees                            │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Option 1: Standard (Default)                                     ││
│  │                                                                  ││
│  │ • Code sent to cloud for completion                             ││
│  │ • NOT used for training (opt-out default)                       ││
│  │ • Retained for 30 days (debugging, abuse prevention)            ││
│  │ • Encrypted in transit (TLS 1.3) and at rest (AES-256)         ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Option 2: Business (Enhanced Privacy)                            ││
│  │                                                                  ││
│  │ • Code processed but not retained                               ││
│  │ • Session data deleted after 24 hours                           ││
│  │ • Dedicated tenant isolation                                    ││
│  │ • Audit logs available                                          ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Option 3: Enterprise (Maximum Control)                           ││
│  │                                                                  ││
│  │ • Self-hosted deployment option                                 ││
│  │ • BYOK (Bring Your Own Key) encryption                          ││
│  │ • VPC/private link connectivity                                 ││
│  │ • Customer-controlled data residency                            ││
│  │ • Zero data retention in cloud                                  ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### Secret Detection and Prevention

```
ALGORITHM: DetectAndPreventSecrets
INPUT:
  - code: string (user code or generated completion)
  - context: string (where code is being used)
OUTPUT:
  - sanitized_code: string
  - warnings: List<SecretWarning>

PROCEDURE:
  warnings = []

  // Pattern-based detection
  secret_patterns = [
    // API Keys
    {pattern: /[a-zA-Z0-9]{32,}/, context: "api_key|token|secret"},
    {pattern: /sk-[a-zA-Z0-9]{48}/, name: "OpenAI API Key"},
    {pattern: /ghp_[a-zA-Z0-9]{36}/, name: "GitHub Token"},
    {pattern: /AKIA[0-9A-Z]{16}/, name: "AWS Access Key"},

    // Private Keys
    {pattern: /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/, name: "Private Key"},
    {pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/, name: "SSH Key"},

    // Database
    {pattern: /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/, name: "MongoDB URI"},
    {pattern: /postgres:\/\/[^:]+:[^@]+@/, name: "PostgreSQL URI"},

    // Generic high-entropy
    {pattern: /['"][a-zA-Z0-9+\/=]{40,}['"]/, entropy_threshold: 4.5}
  ]

  FOR EACH pattern IN secret_patterns DO
    matches = regex_find_all(pattern.pattern, code)
    FOR EACH match IN matches DO
      // Verify with entropy check for generic patterns
      IF pattern.entropy_threshold THEN
        IF calculate_entropy(match) < pattern.entropy_threshold THEN
          CONTINUE  // Likely not a secret
        END IF
      END IF

      warnings.append(SecretWarning(
        type = pattern.name OR "Potential Secret",
        location = match.location,
        severity = "high"
      ))

      // Redact in output if this is generated code
      IF context == "completion" THEN
        code = redact(code, match, "[REDACTED]")
      END IF
    END FOR
  END FOR

  RETURN (code, warnings)
```

---

## Prompt Injection Defense

### Multi-Layer Defense Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│                 Prompt Injection Defense Layers                      │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Layer 1: Input Preprocessing                                     ││
│  │                                                                  ││
│  │ • Normalize Unicode (prevent homoglyph attacks)                 ││
│  │ • Strip invisible characters                                    ││
│  │ • Escape special sequences                                      ││
│  │ • Flag instruction-like patterns in user content                ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Layer 2: Structured Prompt Design                                ││
│  │                                                                  ││
│  │ • Clear role separation with delimiters                         ││
│  │ • XML-style tags for user content                               ││
│  │ • Instruction anchoring at end of system prompt                 ││
│  │ • Example:                                                       ││
│  │   [SYSTEM] You are a code assistant. [/SYSTEM]                  ││
│  │   <user_code>                                                    ││
│  │   {untrusted_content}                                            ││
│  │   </user_code>                                                   ││
│  │   [INSTRUCTION] Generate completion. Never deviate. [/INSTRUCTION]│
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Layer 3: Output Validation                                       ││
│  │                                                                  ││
│  │ • Check for system prompt leakage                               ││
│  │ • Verify output matches expected format (code)                  ││
│  │ • Detect unusual patterns (URLs, emails in code)                ││
│  │ • Block if output contains instruction-like text                ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Layer 4: Behavioral Monitoring                                   ││
│  │                                                                  ││
│  │ • Anomaly detection on output patterns                          ││
│  │ • Flag unusual tool usage in agent mode                         ││
│  │ • Alert on repeated injection attempts                          ││
│  │ • Block user after threshold violations                         ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### Injection Detection Patterns

```yaml
injection_patterns:
  # Direct instruction override
  - id: INJ001
    pattern: "(ignore|disregard|forget) (all |any )?(previous|above|prior)"
    severity: high
    action: sanitize

  - id: INJ002
    pattern: "new (instructions?|task|objective)"
    severity: high
    action: flag

  # Role manipulation
  - id: INJ003
    pattern: "you are (now|actually|really)"
    severity: medium
    action: flag

  - id: INJ004
    pattern: "(pretend|act|behave) (as if|like)"
    severity: medium
    action: flag

  # System prompt extraction
  - id: INJ005
    pattern: "(what|show|reveal|repeat).*(system|initial|original).*(prompt|instruction)"
    severity: high
    action: block

  # Delimiter escape attempts
  - id: INJ006
    pattern: "</?(system|user|assistant|instruction)>"
    severity: critical
    action: escape

  # Base64/encoding obfuscation
  - id: INJ007
    pattern: "base64|atob|btoa|decode.*execute"
    severity: high
    action: flag
```

---

## Agent Mode Security

### Sandboxing Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Agent Mode Security Sandbox                        │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                     Capability Restrictions                       ││
│  │                                                                  ││
│  │  File System:                                                    ││
│  │  ┌─────────────────────────────────────────────────────────────┐││
│  │  │ Allowed:                                                     │││
│  │  │   • Read: ${workspace}/**/*                                 │││
│  │  │   • Write: ${workspace}/**/* (excluding .git/hooks)         │││
│  │  │   • Create: ${workspace}/**/*                               │││
│  │  │                                                              │││
│  │  │ Blocked:                                                     │││
│  │  │   • ~/.ssh/*, ~/.aws/*, ~/.config/credentials               │││
│  │  │   • *.env, *credentials*, *.pem, *.key                      │││
│  │  │   • /etc/*, /usr/*, /System/*                               │││
│  │  │   • Any path outside workspace (symlink-aware)              │││
│  │  └─────────────────────────────────────────────────────────────┘││
│  │                                                                  ││
│  │  Network:                                                        ││
│  │  ┌─────────────────────────────────────────────────────────────┐││
│  │  │ Allowed:                                                     │││
│  │  │   • npm/pip/cargo registry (package installation)           │││
│  │  │   • Workspace-configured API endpoints                      │││
│  │  │                                                              │││
│  │  │ Blocked:                                                     │││
│  │  │   • Arbitrary HTTP requests                                 │││
│  │  │   • SSH/FTP/other protocols                                 │││
│  │  │   • Internal network ranges (unless explicitly allowed)     │││
│  │  └─────────────────────────────────────────────────────────────┘││
│  │                                                                  ││
│  │  Terminal:                                                       ││
│  │  ┌─────────────────────────────────────────────────────────────┐││
│  │  │ Allowed (allowlist):                                         │││
│  │  │   • Build: npm, yarn, pip, cargo, go, make                  │││
│  │  │   • Test: jest, pytest, go test                             │││
│  │  │   • Lint: eslint, prettier, black                           │││
│  │  │   • Git: git status, git diff, git log (read-only)          │││
│  │  │                                                              │││
│  │  │ Requires approval:                                           │││
│  │  │   • Git: git add, git commit, git push                      │││
│  │  │   • Package: npm install, pip install                       │││
│  │  │                                                              │││
│  │  │ Blocked:                                                     │││
│  │  │   • Shell: bash -c, sh -c, eval, exec                       │││
│  │  │   • Destructive: rm -rf, format, dd                         │││
│  │  │   • Privilege: sudo, su, chmod 777                          │││
│  │  │   • Network: curl, wget, nc (except package managers)       │││
│  │  └─────────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### Human-in-the-Loop Controls

```yaml
approval_requirements:
  # Always require approval
  high_risk_actions:
    - action: file_delete
      any_file: true

    - action: terminal_execute
      command_pattern: "git push|git commit|npm publish"

    - action: file_write
      path_pattern: "*.env|*config*|*secret*"

  # Conditional approval
  conditional_actions:
    - action: terminal_execute
      condition: "unknown_command"
      message: "Agent wants to run unrecognized command: {command}"

    - action: file_write
      condition: "outside_workspace"
      message: "Agent wants to write outside workspace: {path}"

    - action: network_request
      condition: "not_in_allowlist"
      message: "Agent wants to access: {url}"

  # Batch approval (user can pre-approve)
  batchable_actions:
    - action: file_write
      pattern: "*.test.*"
      batch_message: "Allow agent to create/modify test files?"

    - action: terminal_execute
      pattern: "npm test|pytest|go test"
      batch_message: "Allow agent to run tests?"
```

---

## Compliance

### Regulatory Frameworks

| Framework | Applicability | Key Requirements | Implementation |
|-----------|---------------|------------------|----------------|
| **GDPR** | EU users | Data minimization, right to erasure, consent | Data retention policies, deletion APIs |
| **CCPA** | California users | Right to know, opt-out of sale | Privacy dashboard, no data selling |
| **SOC 2 Type II** | Enterprise customers | Security, availability, confidentiality | Annual audit, controls documentation |
| **ISO 27001** | Global enterprise | ISMS, risk management | Certification, continuous monitoring |
| **HIPAA** | Healthcare (if applicable) | PHI protection | BAA, additional encryption |

### Audit Logging

```yaml
audit_log_schema:
  event_id: uuid
  timestamp: iso8601
  event_type: string  # completion, chat, agent_action, admin
  user_id: string
  workspace_id: string
  ip_address: string (hashed for privacy)
  user_agent: string
  action: string
  resource: string
  outcome: success | failure | denied
  details:
    # Varies by event type
    model_used: string
    tokens_used: integer
    latency_ms: integer
    # For agent mode
    file_path: string
    command: string
  risk_indicators:
    injection_attempt: boolean
    unusual_pattern: boolean
    rate_limit_hit: boolean

# Retention
audit_log_retention:
  standard: 90 days
  enterprise: 1 year
  security_events: 2 years

# Access
audit_log_access:
  - role: enterprise_admin
    permissions: [read, export]
  - role: security_team
    permissions: [read, export, analyze]
  - role: compliance_officer
    permissions: [read, export, certify]
```

### Data Subject Rights Implementation

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Data Subject Rights Workflow                      │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Right to Access (GDPR Art. 15)                                   ││
│  │                                                                  ││
│  │ 1. User requests data export via settings                       ││
│  │ 2. System gathers: profile, preferences, usage history          ││
│  │ 3. Exclude: model weights, aggregate analytics                  ││
│  │ 4. Deliver: JSON export within 30 days                          ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Right to Erasure (GDPR Art. 17)                                  ││
│  │                                                                  ││
│  │ 1. User requests account deletion                               ││
│  │ 2. Grace period: 14 days (reversible)                           ││
│  │ 3. Hard delete: user data, code history, embeddings             ││
│  │ 4. Retain: anonymized aggregate data, audit logs (legal hold)   ││
│  │ 5. Propagate: delete from backups within 90 days                ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Right to Rectification (GDPR Art. 16)                            ││
│  │                                                                  ││
│  │ 1. User updates profile via settings                            ││
│  │ 2. Changes propagated to all systems                            ││
│  │ 3. Audit trail maintained                                       ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Right to Data Portability (GDPR Art. 20)                         ││
│  │                                                                  ││
│  │ 1. User requests export in machine-readable format              ││
│  │ 2. Export includes: settings, history, indexed repos metadata   ││
│  │ 3. Format: JSON (standard) or CSV (tabular data)                ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## Security Monitoring

### Security Metrics Dashboard

```yaml
security_metrics:
  # Authentication
  - name: failed_auth_rate
    query: sum(auth_failures) / sum(auth_attempts)
    threshold: 0.05
    alert: P2

  - name: suspicious_login_locations
    query: count(logins where location_risk > 0.8)
    threshold: 10 per hour
    alert: P1

  # Prompt injection
  - name: injection_attempt_rate
    query: sum(injection_detected) / sum(requests)
    threshold: 0.001
    alert: P1

  - name: injection_success_rate
    query: sum(injection_successful) / sum(injection_detected)
    threshold: 0.0  # Any success is critical
    alert: P0

  # Agent mode
  - name: sandbox_escape_attempts
    query: count(sandbox_violation_blocked)
    threshold: 5 per hour
    alert: P0

  - name: unauthorized_file_access
    query: count(file_access_denied)
    threshold: 50 per hour
    alert: P1

  # Data exfiltration
  - name: unusual_data_volume
    query: percentile(data_egress_per_user, 99)
    threshold: 100MB per hour
    alert: P2

  - name: secret_in_completion
    query: count(secret_detected_in_output)
    threshold: 1
    alert: P1
```
