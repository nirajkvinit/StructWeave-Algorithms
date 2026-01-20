# Security and Compliance

[← Back to Index](./00-index.md)

---

## Threat Model

### Attack Surface

```
┌─────────────────────────────────────────────────────────────────┐
│                    ATTACK SURFACE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    EXTERNAL THREATS                        │ │
│  │                                                            │ │
│  │  1. Network Interception                                   │ │
│  │     • AMQP traffic (port 5672)                            │ │
│  │     • Management UI (port 15672)                          │ │
│  │     • Inter-node traffic (port 25672)                     │ │
│  │                                                            │ │
│  │  2. Unauthorized Access                                    │ │
│  │     • Weak credentials                                    │ │
│  │     • Default guest account                               │ │
│  │     • Exposed management interface                        │ │
│  │                                                            │ │
│  │  3. Denial of Service                                      │ │
│  │     • Connection flooding                                 │ │
│  │     • Queue depth explosion                               │ │
│  │     • Large message attacks                               │ │
│  │                                                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    INTERNAL THREATS                        │ │
│  │                                                            │ │
│  │  1. Privilege Escalation                                   │ │
│  │     • User accessing unauthorized queues                  │ │
│  │     • Admin actions by non-admin                          │ │
│  │                                                            │ │
│  │  2. Data Exfiltration                                      │ │
│  │     • Reading sensitive messages                          │ │
│  │     • Accessing message metadata                          │ │
│  │                                                            │ │
│  │  3. Message Tampering                                      │ │
│  │     • Modifying messages in transit                       │ │
│  │     • Injecting malicious messages                        │ │
│  │                                                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Threat Matrix

| Threat | Likelihood | Impact | Mitigation |
|--------|------------|--------|------------|
| Credential theft | Medium | High | Strong passwords, rotation, MFA for management |
| Network sniffing | Medium | High | TLS everywhere |
| Unauthorized queue access | Medium | High | Vhost isolation, fine-grained permissions |
| DoS via connection flood | Medium | Medium | Connection limits, rate limiting |
| Message injection | Low | High | Client authentication, input validation |
| Data at rest exposure | Low | High | Disk encryption, access controls |

---

## Authentication

### SASL Mechanisms

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION METHODS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. PLAIN (username/password over TLS)                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Client ──TLS──► Broker                                  │   │
│  │         ◄─SASL PLAIN─►                                   │   │
│  │                                                          │   │
│  │  Configuration:                                          │   │
│  │  • auth_mechanisms.1 = PLAIN                            │   │
│  │  • Requires TLS for security                            │   │
│  │                                                          │   │
│  │  Use: Simple deployments, internal services             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  2. EXTERNAL (x509 client certificates)                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Client ──mTLS──► Broker                                 │   │
│  │         (cert CN = username)                             │   │
│  │                                                          │   │
│  │  Configuration:                                          │   │
│  │  • auth_mechanisms.1 = EXTERNAL                         │   │
│  │  • ssl_cert_login_from = common_name                    │   │
│  │                                                          │   │
│  │  Use: High-security environments, service-to-service    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  3. LDAP/Active Directory                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Client ──► Broker ──► LDAP Server                       │   │
│  │                                                          │   │
│  │  Configuration:                                          │   │
│  │  • auth_backends.1 = rabbit_auth_backend_ldap           │   │
│  │  • auth_ldap.servers.1 = ldap.example.com               │   │
│  │  • auth_ldap.user_dn_pattern = uid=${username},ou=users │   │
│  │                                                          │   │
│  │  Use: Enterprise, centralized identity management       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  4. OAuth 2.0 / OIDC                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Client ──► Identity Provider ──► JWT                    │   │
│  │         ──JWT──► Broker                                  │   │
│  │                                                          │   │
│  │  Configuration:                                          │   │
│  │  • auth_backends.1 = rabbit_auth_backend_oauth2         │   │
│  │  • auth_oauth2.resource_server_id = rabbitmq            │   │
│  │  • auth_oauth2.preferred_username_claims = sub          │   │
│  │                                                          │   │
│  │  Use: Modern apps, cloud-native, SSO                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Credential Management

```
┌─────────────────────────────────────────────────────────────────┐
│                    CREDENTIAL BEST PRACTICES                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Disable Default Guest Account                               │
│     • Delete or restrict guest user                             │
│     • Guest only allowed from localhost by default              │
│                                                                  │
│  2. Strong Password Policy                                      │
│     • Minimum 16 characters                                     │
│     • Complexity requirements                                   │
│     • No password reuse                                         │
│                                                                  │
│  3. Service Account Naming                                      │
│     • svc-{service}-{environment}                              │
│     • Example: svc-order-service-prod                          │
│                                                                  │
│  4. Credential Rotation                                         │
│     • Rotate every 90 days minimum                             │
│     • Automate via secrets manager                             │
│     • Zero-downtime rotation:                                  │
│       a. Create new credentials                                 │
│       b. Update application config                              │
│       c. Verify connectivity                                    │
│       d. Delete old credentials                                 │
│                                                                  │
│  5. Secrets Storage                                             │
│     • Never in code or config files                            │
│     • Use secrets manager (Vault, AWS Secrets Manager)         │
│     • Environment variables (Kubernetes secrets)               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Authorization

### Virtual Host Isolation

```
┌─────────────────────────────────────────────────────────────────┐
│                    VIRTUAL HOST ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Virtual hosts provide namespace isolation:                     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   RabbitMQ Cluster                       │   │
│  │                                                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│  │  │  vhost: /   │  │ vhost:      │  │ vhost:      │     │   │
│  │  │  (default)  │  │ /orders     │  │ /analytics  │     │   │
│  │  │             │  │             │  │             │     │   │
│  │  │ [exchanges] │  │ [exchanges] │  │ [exchanges] │     │   │
│  │  │ [queues]    │  │ [queues]    │  │ [queues]    │     │   │
│  │  │ [bindings]  │  │ [bindings]  │  │ [bindings]  │     │   │
│  │  │ [users]     │  │ [users]     │  │ [users]     │     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│  │                                                          │   │
│  │  Isolation:                                              │   │
│  │  • Separate namespace (no cross-vhost access)           │   │
│  │  • Per-vhost permissions                                │   │
│  │  • Resource limits (queue count, connections)           │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Use Cases:                                                      │
│  • Multi-tenant applications                                    │
│  • Environment separation (dev/staging/prod queues)             │
│  • Team/department isolation                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Permission Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    PERMISSION MODEL                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Three permission types per vhost:                              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Permission   │  Applies To                              │   │
│  │───────────────│──────────────────────────────────────────│   │
│  │  CONFIGURE    │  Create/delete queues, exchanges, bindings│   │
│  │  WRITE        │  Publish to exchange, bind queue         │   │
│  │  READ         │  Consume from queue, get message         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Permission patterns (regex):                                    │
│                                                                  │
│  Example User: order-service                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Vhost: /orders                                          │   │
│  │  Configure: ^order\..*$     # Can create order.* queues │   │
│  │  Write: ^order\.exchange$   # Can publish to exchange   │   │
│  │  Read: ^order\.queue$       # Can consume from queue    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Common Patterns:                                                │
│  │ Pattern │ Meaning                                         │
│  │─────────│─────────────────────────────────────────────────│
│  │ .*      │ All resources (admin)                          │
│  │ ^$      │ No resources (deny all)                        │
│  │ ^foo\..*│ Resources starting with "foo."                 │
│  │ ^foo$   │ Exactly "foo"                                  │
│                                                                  │
│  Setting permissions:                                            │
│  rabbitmqctl set_permissions -p /orders order-service \        │
│      "^order\..*$" "^order\.exchange$" "^order\.queue$"        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Topic Authorization

```
┌─────────────────────────────────────────────────────────────────┐
│                    TOPIC AUTHORIZATION                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Fine-grained routing key authorization:                        │
│                                                                  │
│  Scenario: Multi-tenant topic exchange                          │
│                                                                  │
│  Exchange: events (type=topic)                                  │
│  Routing keys: tenant.{tenant_id}.{event_type}                 │
│                                                                  │
│  User: tenant-123-service                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Write permission: ^tenant\.123\..*$                     │   │
│  │  • Can publish: tenant.123.order.created      ✓         │   │
│  │  • Cannot publish: tenant.456.order.created   ✗         │   │
│  │                                                          │   │
│  │  Read permission: ^tenant\.123\..*$                      │   │
│  │  • Can subscribe: tenant.123.*               ✓          │   │
│  │  • Cannot subscribe: tenant.456.*            ✗          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Configuration (advanced.config):                               │
│  [                                                               │
│    {rabbit, [                                                   │
│      {topic_access_check, true}                                │
│    ]}                                                           │
│  ].                                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Security

### TLS/SSL Configuration

```
┌─────────────────────────────────────────────────────────────────┐
│                    TLS CONFIGURATION                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Ports:                                                          │
│  • 5671: AMQPS (TLS)                                            │
│  • 15671: Management HTTPS                                      │
│  • 25672: Inter-node (TLS)                                      │
│                                                                  │
│  Configuration (rabbitmq.conf):                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  # Listener configuration                               │   │
│  │  listeners.ssl.default = 5671                           │   │
│  │  listeners.tcp = none  # Disable non-TLS               │   │
│  │                                                          │   │
│  │  # Certificate paths                                     │   │
│  │  ssl_options.cacertfile = /certs/ca.crt                │   │
│  │  ssl_options.certfile = /certs/server.crt              │   │
│  │  ssl_options.keyfile = /certs/server.key               │   │
│  │                                                          │   │
│  │  # TLS settings                                          │   │
│  │  ssl_options.verify = verify_peer                       │   │
│  │  ssl_options.fail_if_no_peer_cert = true               │   │
│  │  ssl_options.versions.1 = tlsv1.3                      │   │
│  │  ssl_options.versions.2 = tlsv1.2                      │   │
│  │                                                          │   │
│  │  # Cipher suites (TLS 1.3)                              │   │
│  │  ssl_options.ciphers.1 = TLS_AES_256_GCM_SHA384        │   │
│  │  ssl_options.ciphers.2 = TLS_CHACHA20_POLY1305_SHA256  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Client connection (pseudocode):                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  connection = amqp.connect(                              │   │
│  │      host = "rabbitmq.example.com",                     │   │
│  │      port = 5671,                                       │   │
│  │      tls = {                                            │   │
│  │          ca_cert = "/certs/ca.crt",                    │   │
│  │          client_cert = "/certs/client.crt",            │   │
│  │          client_key = "/certs/client.key"              │   │
│  │      }                                                  │   │
│  │  )                                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Message Encryption

```
┌─────────────────────────────────────────────────────────────────┐
│                    MESSAGE-LEVEL ENCRYPTION                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Note: RabbitMQ does not encrypt message bodies                 │
│  Application-level encryption required for sensitive data       │
│                                                                  │
│  Option 1: Symmetric Encryption (AES)                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Producer:                                               │   │
│  │    key = get_key_from_vault()                           │   │
│  │    encrypted = AES_GCM.encrypt(plaintext, key)          │   │
│  │    publish(encrypted, headers={"encrypted": true})      │   │
│  │                                                          │   │
│  │  Consumer:                                               │   │
│  │    IF message.headers["encrypted"]:                     │   │
│  │        key = get_key_from_vault()                       │   │
│  │        plaintext = AES_GCM.decrypt(message.body, key)   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Option 2: Envelope Encryption                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • Generate random data encryption key (DEK)            │   │
│  │  • Encrypt message with DEK (AES)                       │   │
│  │  • Encrypt DEK with key encryption key (KEK)            │   │
│  │  • Send encrypted message + encrypted DEK               │   │
│  │                                                          │   │
│  │  Benefits:                                               │   │
│  │  • Key rotation without re-encrypting messages          │   │
│  │  • Per-message unique DEK                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Key Management:                                                 │
│  • Store keys in secrets manager (Vault, KMS)                  │
│  • Never log or expose keys                                    │
│  • Rotate KEK periodically                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data at Rest

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA AT REST PROTECTION                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  RabbitMQ stores messages on disk in:                           │
│  • /var/lib/rabbitmq/mnesia/                                   │
│  • Quorum queue Raft logs                                      │
│  • Classic queue message store                                  │
│                                                                  │
│  Protection Strategies:                                          │
│                                                                  │
│  1. Filesystem Encryption                                       │
│     • LUKS (Linux Unified Key Setup)                           │
│     • dm-crypt                                                 │
│     • Cloud provider disk encryption (EBS, Azure Disk)         │
│                                                                  │
│  2. Access Controls                                             │
│     • Restrict file permissions (700 for mnesia dir)           │
│     • Run RabbitMQ as non-root user                            │
│     • SELinux/AppArmor policies                                │
│                                                                  │
│  3. Secure Deletion                                             │
│     • Use secure delete for decommissioned disks               │
│     • Crypto-erase for SSDs                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Compliance

### Audit Logging

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUDIT LOGGING                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Built-in Logging Events:                                       │
│  • Connection open/close                                        │
│  • Channel open/close                                           │
│  • Queue/exchange declare/delete                                │
│  • Authentication success/failure                               │
│                                                                  │
│  Configuration (rabbitmq.conf):                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  log.connection.level = info                            │   │
│  │  log.channel.level = info                               │   │
│  │  log.queue.level = info                                 │   │
│  │  log.exchange.level = info                              │   │
│  │                                                          │   │
│  │  # Log to file with rotation                            │   │
│  │  log.file = /var/log/rabbitmq/rabbitmq.log             │   │
│  │  log.file.rotation.size = 10485760                      │   │
│  │  log.file.rotation.count = 10                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Log Format (JSON for parsing):                                 │
│  {                                                               │
│    "timestamp": "2024-01-15T10:30:00Z",                        │
│    "event": "connection.created",                               │
│    "user": "order-service",                                     │
│    "vhost": "/orders",                                          │
│    "client_ip": "10.0.1.50",                                   │
│    "connection_name": "order-service-1"                        │
│  }                                                               │
│                                                                  │
│  Log Shipping:                                                   │
│  • Forward to SIEM (Splunk, ELK)                               │
│  • Retain for compliance period (7 years for financial)        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Message Tracing

```
┌─────────────────────────────────────────────────────────────────┐
│                    MESSAGE TRACING                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Firehose Tracer (development/debugging):                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  # Enable tracing                                        │   │
│  │  rabbitmqctl trace_on -p /orders                        │   │
│  │                                                          │   │
│  │  # Traces published to: amq.rabbitmq.trace              │   │
│  │  # Routing key: publish.{exchange} or deliver.{queue}   │   │
│  │                                                          │   │
│  │  # Disable (IMPORTANT for production)                   │   │
│  │  rabbitmqctl trace_off -p /orders                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  WARNING: Firehose creates copy of every message               │
│           Never enable in production (performance impact)       │
│                                                                  │
│  Production Tracing (application-level):                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • Add correlation_id to every message                  │   │
│  │  • Add trace_id header for distributed tracing          │   │
│  │  • Log at publish and consume points                    │   │
│  │  • Integrate with OpenTelemetry                         │   │
│  │                                                          │   │
│  │  Example headers:                                        │   │
│  │  {                                                       │   │
│  │    "trace_id": "abc123",                                │   │
│  │    "span_id": "def456",                                 │   │
│  │    "correlation_id": "order-789"                        │   │
│  │  }                                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### GDPR Considerations

```
┌─────────────────────────────────────────────────────────────────┐
│                    GDPR COMPLIANCE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Personal Data in Messages:                                      │
│                                                                  │
│  1. Data Minimization                                           │
│     • Only include necessary personal data                      │
│     • Use references (user_id) instead of full PII             │
│     • Remove unnecessary fields before publishing               │
│                                                                  │
│  2. Retention Limits                                            │
│     • Set message TTL for queues with personal data            │
│     • Don't use infinite retention                             │
│     • Purge DLQs containing personal data                      │
│                                                                  │
│  3. Right to Erasure                                            │
│     • Messages are deleted after ACK (natural erasure)         │
│     • For delayed processing: implement purge mechanism        │
│     • Logs: implement log scrubbing for PII                    │
│                                                                  │
│  4. Data Processing Records                                     │
│     • Document what personal data flows through queues         │
│     • Log data lineage (source, destination)                   │
│     • Audit access to personal data                            │
│                                                                  │
│  5. Cross-Border Transfers                                      │
│     • Federation/shovel may cross borders                      │
│     • Ensure adequate protection in destination                │
│     • Document data flows in privacy impact assessment         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Checklist

### Pre-Production

- [ ] Disable guest account or restrict to localhost
- [ ] Create service-specific accounts with minimal permissions
- [ ] Enable TLS on all ports (5671, 15671, 25672)
- [ ] Configure strong TLS ciphers (TLS 1.2+)
- [ ] Set up certificate rotation process
- [ ] Configure vhosts for tenant isolation
- [ ] Enable audit logging

### Network Security

- [ ] Firewall rules restricting access to RabbitMQ ports
- [ ] Management UI accessible only from bastion/VPN
- [ ] Inter-node traffic on private network
- [ ] No public internet exposure

### Monitoring

- [ ] Alert on authentication failures
- [ ] Alert on unusual connection patterns
- [ ] Monitor for queue depth anomalies
- [ ] Track permission changes

### Ongoing

- [ ] Rotate credentials every 90 days
- [ ] Review permissions quarterly
- [ ] Update TLS certificates before expiry
- [ ] Apply security patches promptly
