# Interview Guide

[← Back to Index](./00-index.md)

---

## 45-Minute Interview Pacing

### Timeline

| Time | Phase | Focus | Key Actions |
|------|-------|-------|-------------|
| 0-5 min | **Clarification** | Scope & requirements | Ask about scale, use cases, security posture |
| 5-15 min | **High-Level Design** | Architecture | Draw auth/authz split, control/data plane |
| 15-30 min | **Deep Dive** | Core component | Token strategy OR policy engine OR MFA |
| 30-40 min | **Scalability & Trade-offs** | Scale, reliability | Discuss caching, multi-region, failure modes |
| 40-45 min | **Wrap-up** | Security, observability | Touch on threats, compliance, monitoring |

### Phase Details

#### Phase 1: Clarification (0-5 min)

**Questions to ask:**

1. "What's the primary use case - workforce identity (employees) or customer identity (end users)?"
2. "What scale are we designing for - thousands or millions of users?"
3. "Do we need to support existing identity systems like Active Directory or LDAP?"
4. "What authentication methods are required - password, SSO, passwordless, MFA?"
5. "What's the authorization model - simple roles or fine-grained permissions?"
6. "Are there specific compliance requirements - HIPAA, SOC2, GDPR?"

**Calibrate your design:**

| Scenario | Design Focus |
|----------|--------------|
| Workforce identity (10K users) | AD/LDAP integration, SAML SSO, RBAC |
| Consumer identity (10M users) | Social login, passwordless, scalable sessions |
| B2B SaaS (multi-tenant) | Tenant isolation, SCIM provisioning, custom IdPs |
| High-security (financial) | MFA enforcement, short sessions, comprehensive audit |
| Collaborative app (Google Docs-like) | ReBAC, fine-grained sharing, sub-10ms authz |

#### Phase 2: High-Level Design (5-15 min)

**Must cover:**
1. Separation of authentication and authorization
2. Control plane (admin) vs data plane (runtime)
3. Core components: Identity Provider, Policy Engine, Session Manager
4. Key data stores: User directory, session store, policy store
5. At least one protocol flow (OAuth2/OIDC or SAML)

**Whiteboard structure:**

```
┌─────────────────────────────────────────────────────────────────┐
│                        CONTROL PLANE                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │  User    │  │  Policy  │  │  IdP     │  │   Tenant     │    │
│  │ Manager  │  │ Manager  │  │ Manager  │  │   Manager    │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘    │
└───────┼─────────────┼─────────────┼───────────────┼─────────────┘
        │             │             │               │
        ▼             ▼             ▼               ▼
    ┌─────────────────────────────────────────────────────────┐
    │                    DATA STORES                           │
    │  [User Directory]  [Policy Store]  [Session Store]      │
    └─────────────────────────────────────────────────────────┘
        ▲             ▲             ▲
        │             │             │
┌───────┼─────────────┼─────────────┼─────────────────────────────┐
│       │             │             │                              │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐                      │
│  │  Auth    │  │  Policy  │  │  Token   │  MFA Service         │
│  │ Service  │  │  Engine  │  │ Service  │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
│                        DATA PLANE                              │
└─────────────────────────────────────────────────────────────────┘
```

#### Phase 3: Deep Dive (15-30 min)

**Option A: Token Strategy Deep Dive**
- JWT vs opaque token trade-offs
- Refresh token rotation with reuse detection
- Token validation on hot path (millions/sec)
- Key rotation without downtime

**Option B: Policy Engine Deep Dive**
- RBAC vs ABAC vs ReBAC comparison
- Multi-tier caching for sub-10ms latency
- Policy evaluation algorithm
- Handling policy updates without downtime

**Option C: MFA/Passkeys Deep Dive**
- WebAuthn ceremony flow
- Phishing resistance properties
- Fallback mechanisms (TOTP, SMS)
- Risk-based authentication triggers

#### Phase 4: Scalability & Trade-offs (30-40 min)

**Must cover:**
1. Token validation scalability (JWT local vs introspection)
2. Policy caching hierarchy (L1/L2/L3)
3. Multi-region session handling
4. Graceful degradation during outages
5. Database read replica strategy

#### Phase 5: Wrap-up (40-45 min)

**Quick touch on:**
- Security: Brute force protection, credential stuffing detection
- Compliance: Audit logging, data residency
- Observability: Key metrics (login latency, MFA adoption, error rate)

---

## Clarification Questions

### Must-Ask Questions

1. **Use case**: "Is this workforce identity or customer identity?"
2. **Scale**: "How many users? Daily logins? Token validations per second?"
3. **Auth methods**: "Password, SSO, social login, passwordless?"
4. **Authorization complexity**: "Simple roles or fine-grained permissions?"
5. **Security requirements**: "MFA required? Compliance frameworks?"

### Follow-up Based on Answers

| If they say... | Then ask/design for... |
|----------------|------------------------|
| "Millions of users" | Horizontal scaling, JWT validation, session sharding |
| "Enterprise SSO" | SAML support, federation, SCIM provisioning |
| "Fine-grained sharing" | ReBAC (Zanzibar-style), relationship tuples |
| "High security" | MFA enforcement, short sessions, comprehensive audit |
| "Multi-tenant SaaS" | Tenant isolation, per-tenant policies, custom IdPs |
| "Global users" | Multi-region, session sync, latency optimization |

---

## Trade-off Discussions

### JWT vs Opaque Tokens

| Aspect | JWT | Opaque |
|--------|-----|--------|
| **Validation** | Local (no network) | Requires introspection |
| **Revocation** | Delayed (until expiry) | Immediate |
| **Size** | Large (claims inside) | Small (just reference) |
| **Stateless** | Yes | No |
| **When to use** | External APIs, high-volume | Admin sessions, sensitive ops |

**Recommended hybrid:** Use JWT for API access (validated at edge), opaque for admin/sensitive sessions (immediate revocation).

### Centralized vs Distributed Policy Engine

| Aspect | Centralized | Distributed/Sidecar |
|--------|-------------|---------------------|
| **Consistency** | Strong | Eventually consistent |
| **Latency** | Network hop | Local evaluation |
| **Updates** | Immediate | Propagation delay |
| **Complexity** | Lower | Higher |
| **When to use** | Complex policies, infrequent | High-volume, simple rules |

**Recommended hybrid:** Sidecar cache for hot path (simple RBAC), centralized OPA for complex ABAC/ReBAC.

### RBAC vs ABAC vs ReBAC

| Aspect | RBAC | ABAC | ReBAC |
|--------|------|------|-------|
| **Complexity** | Low | Medium | High |
| **Flexibility** | Low | High | Very High |
| **Performance** | Fast | Medium | Variable |
| **Best for** | Clear hierarchies | Dynamic rules | Collaborative apps |

**Recommendation:** Start with RBAC, add ABAC for policies, enable ReBAC for sharing.

---

## Trap Questions & Answers

### "Why not just use JWTs for everything?"

**Trap:** Missing the revocation challenge.

**Good answer:**
"JWTs are great for stateless validation, but they can't be instantly revoked - you have to wait for expiry. This is a problem for security-sensitive scenarios like:

1. User changes password - old sessions should be invalid immediately
2. Admin revokes a compromised session
3. User explicitly logs out from all devices

So we use a hybrid approach:
- JWTs for API access tokens (short-lived, 15 minutes)
- Opaque tokens or session IDs for things that need instant revocation
- Optional: add JTI to a revocation list, but that trades off statelessness"

### "How do you handle a million token validations per second?"

**Trap:** Suggesting introspection for every request.

**Good answer:**
"At a million validations per second, we can't make a network call for each one. Here's the strategy:

1. **Use JWTs** - They're self-contained, so validation is just signature verification (0.1ms per validation, 10K/core)

2. **Cache the JWKS** - Fetch public keys once, cache locally, validate signatures without network calls

3. **Key rotation without downtime** - When rotating keys, keep old key in JWKS for token lifetime, so cached keys stay valid

4. **Distribute validation** - Push validation to edge/API gateway, not a central service

5. **For introspection (opaque tokens)** - Cache results briefly (30s-60s), accept that revocation might have a small window

At 1M/second with 100 cores, each core handles 10K/sec - well within JWT validation capacity."

### "How do you prevent a brute force attack?"

**Trap:** Only mentioning account lockout.

**Good answer:**
"Defense in depth with multiple layers:

1. **IP-based rate limiting** - 100 requests/minute per IP, blocks automated attacks

2. **Account lockout** - Lock after 5 failed attempts for 15 minutes, but this can be a DoS vector itself

3. **CAPTCHA** - Trigger after suspicious patterns, not just failure count

4. **Credential stuffing detection** - If we see many different usernames from one IP, or same username from many IPs, it's likely an attack

5. **Argon2id hashing** - Slow password verification (~200ms) makes attacks expensive

6. **Monitoring and alerting** - Detect patterns in real-time, alert security team

7. **WebAuthn/Passkeys** - Best defense - no password to steal, phishing-resistant

The key insight is: don't just protect accounts, protect the system. Rate limits stop volume attacks; detection finds sophisticated ones."

### "A customer wants instant session revocation across all regions. How?"

**Trap:** Suggesting synchronous replication everywhere.

**Good answer:**
"There's a fundamental trade-off between instant revocation and availability. Here are the options:

**Option 1: Synchronous session store** - Session writes replicate to all regions before acknowledging. Instant revocation but adds 100-200ms latency to every login.

**Option 2: Short token lifetime + async sync** - Use 5-minute access tokens, async session sync. Revocation takes at most 5 minutes to propagate. Usually acceptable.

**Option 3: Revocation broadcast** - On revoke, push invalidation event to all regions immediately. Sessions check a revocation list. Sub-second propagation, but adds a check to every request.

**Option 4: Token generation counter** - Store a counter on the user record. Include counter in tokens. Increment counter on revoke. Old tokens fail validation. Works if user data is globally consistent.

**My recommendation:** Option 2 or 3 depending on requirements. Most systems accept a small revocation window. For truly instant (banking), use option 3 with a bloom filter for the revocation list to keep lookups fast."

---

## Common Mistakes to Avoid

### Design Mistakes

| Mistake | Why It's Wrong | Better Approach |
|---------|---------------|-----------------|
| Introspection for every API call | Network hop, doesn't scale | JWTs for stateless validation |
| Single token type for everything | Can't optimize for different needs | JWT for APIs, opaque for sessions |
| No MFA design | Security gap | Phishing-resistant MFA (WebAuthn) as primary |
| Ignoring policy caching | Slow authorization | Multi-tier cache (L1/L2/L3) |
| Storing passwords in plaintext | Security disaster | Argon2id with proper parameters |
| Same session for all regions | Complex sync, consistency issues | Regional sessions with cross-region replication |

### Interview Mistakes

| Mistake | Impact | Correction |
|---------|--------|------------|
| Jumping to OAuth details | Miss the big picture | Start with auth vs authz, then protocols |
| Ignoring security | Incomplete design | Mention brute force, token security, audit |
| Not discussing trade-offs | Seems inexperienced | Explicitly compare JWT vs opaque, RBAC vs ReBAC |
| Forgetting multi-tenancy | Missing enterprise requirement | Discuss tenant isolation early |
| No numbers | Vague capacity | Mention: logins/day, validations/sec, session count |

---

## Quick Reference Card

### Key Numbers to Remember

| Metric | Value | Context |
|--------|-------|---------|
| JWT validation | 0.1ms | Local, with cached key |
| Token introspection | 5-10ms | Network call |
| Policy evaluation (cached) | <5ms | L1/L2 cache hit |
| Policy evaluation (cold) | 50-100ms | Database lookup |
| Login latency target | <500ms p99 | Including password hash |
| Argon2id hashing | ~200ms | Intentionally slow |
| WebAuthn ceremony | 60s timeout | Hardware interaction |
| Session store size | ~1KB | Per session |
| Daily active logins | 500M+ | Large platform |
| Token validations/day | 50B+ | 100:1 ratio to logins |

### Architecture Decision Flowchart

```
START: "Design an IAM system"
  │
  ├── Workforce or Consumer?
  │     ├── Workforce → SAML SSO, AD integration, SCIM
  │     └── Consumer → Social login, passwordless, scalable sessions
  │
  ├── Scale (users)?
  │     ├── < 100K → Single region, simple architecture
  │     └── > 1M → Multi-region, JWT validation, session sharding
  │
  ├── Authorization complexity?
  │     ├── Simple roles → RBAC only
  │     ├── Dynamic rules → Add ABAC
  │     └── Collaborative → Need ReBAC
  │
  ├── Security requirements?
  │     ├── Standard → MFA optional, TOTP
  │     └── High security → MFA required, Passkeys, short sessions
  │
  └── Compliance?
        ├── None → Basic audit logging
        └── HIPAA/SOC2/GDPR → Comprehensive audit, data residency
```

### Interview Talking Points Checklist

**Clarification Phase:**
- [ ] Workforce vs consumer identity
- [ ] Scale (users, logins/day)
- [ ] Auth methods required
- [ ] Authorization complexity
- [ ] Compliance requirements

**High-Level Design:**
- [ ] Auth vs AuthZ separation
- [ ] Control plane / data plane
- [ ] OAuth2/OIDC flow diagram
- [ ] Core components (IdP, Policy Engine, Session Manager)
- [ ] Data stores (directory, sessions, policies)

**Deep Dive:**
- [ ] Token strategy (JWT vs opaque, rotation)
- [ ] OR Policy engine (caching, evaluation)
- [ ] OR MFA implementation (WebAuthn)
- [ ] Explain trade-offs explicitly

**Scalability:**
- [ ] JWT for stateless validation at scale
- [ ] Policy caching hierarchy
- [ ] Multi-region considerations
- [ ] Graceful degradation

**Wrap-up:**
- [ ] Security: brute force, credential stuffing
- [ ] Compliance: audit logging, data residency
- [ ] Observability: key metrics

---

## Sample Interview Dialogue

**Interviewer:** "Design an identity and access management system."

**Candidate:** "Before diving in, I'd like to understand the requirements better.

First, is this for workforce identity - like employees logging into internal apps - or consumer identity - like users signing up for a product?

Second, what scale are we designing for - tens of thousands of users or millions?

Third, what authentication methods do we need - just passwords, or SSO with existing identity providers, social login, passwordless options?"

**Interviewer:** "It's a B2B SaaS platform. Customers are businesses with 100-10,000 employees each. We have about 500 customer organizations. They want to use their existing identity providers like Okta or Azure AD for SSO."

**Candidate:** "Got it. So we're looking at roughly 500 tenants with maybe 2-3 million total users. Multi-tenant B2B with enterprise SSO requirements.

Let me sketch the high-level architecture.

[Draws diagram]

The system has two main planes. The **control plane** handles administrative operations - managing users, configuring identity providers per tenant, and defining access policies. The **data plane** handles the high-volume runtime operations - authentication, token validation, and authorization decisions.

For authentication, since customers want to use their existing IdPs, we need to act as a Service Provider in SAML terms, or as an OIDC Relying Party. When a user from Company A logs in, we redirect them to Company A's IdP (say, Okta), they authenticate there, and we get back a SAML assertion or OIDC ID token with their identity and attributes.

For multi-tenancy, each tenant has isolated configuration - their own IdP settings, their own roles and policies, their own users. We use a tenant_id column throughout, and I'd recommend per-tenant encryption keys for sensitive data.

Should I dive deeper into the SSO flow, or would you like to discuss the authorization model?"

**Interviewer:** "Let's talk about authorization. Some customers want simple role-based access, but others want the ability to share individual documents with specific users, like Google Docs."

**Candidate:** "This is a great example of needing multiple authorization models.

For simple role-based access, we use RBAC - roles like Admin, Editor, Viewer assigned to users. The check is fast: 'is user in this role?' We can cache role membership and evaluate in microseconds.

But for document-level sharing like Google Docs, RBAC doesn't scale - you'd need a role per document. This is where Relationship-Based Access Control (ReBAC) comes in, similar to Google's Zanzibar system.

In ReBAC, we store relationships as tuples: 'document:doc123 has viewer user:alice'. To check if Alice can read doc123, we check for a direct tuple, then traverse relationships - maybe Alice is in a group that has access, or the document is in a folder she can access.

For the policy engine, I'd use a hybrid approach:
1. **L1 cache (in-process)**: Hot permissions cached locally, sub-millisecond
2. **L2 cache (Redis)**: Shared cache across instances, 1-5ms
3. **L3 (database)**: Relationship tuples, 10-50ms

For RBAC checks, we almost always hit L1. For ReBAC with graph traversal, we cache computed permissions so repeated checks are fast.

The key challenge is cache invalidation - when a permission changes, we need to invalidate affected cache entries. We use a change notification system: when a relationship is added or removed, we publish an event, and affected caches update within seconds."

**Interviewer:** "How do you ensure sub-10ms authorization decisions at scale?"

**Candidate:** "The key insight is that most authorization decisions are repetitive. The same user accessing the same resource multiple times doesn't need fresh computation each time.

Here's how we achieve sub-10ms p99:

1. **Pre-compute common checks** - For RBAC, we materialize 'user -> effective roles' at login time and cache it with the session. Role check becomes a set membership test.

2. **Multi-tier caching** - L1 (in-process, 100ms TTL) catches repeated requests within a request burst. L2 (Redis, 5-minute TTL) catches across instances.

3. **Bounded graph traversal** - For ReBAC, we limit traversal depth (say, 5 hops) and have timeouts. If traversal is too deep, we fall back to denying with an explanation.

4. **Decision caching** - Cache the final decision, not just intermediate data. Key = hash(subject, resource, action). Hit rate should be 90%+.

5. **Async cache warming** - When a user logs in, we proactively compute permissions for likely resources they'll access.

With these strategies, 95% of decisions come from cache at 1-2ms. The remaining 5% cold evaluations might hit 20-30ms but stay under 50ms p99."

[Interview continues...]
