# Security & Compliance — Chaos Engineering Platform

## The Security Paradox

A chaos engineering platform occupies a unique position in the security landscape: it is an **authorized tool for causing system failures.** The same capabilities that make it valuable for resilience testing — injecting network partitions, killing processes, corrupting state — make it a devastating attack vector if compromised. A hostile actor with access to the chaos platform can cause arbitrary production outages that look like "chaos experiments." Security is therefore not just a compliance concern — it is an existential design requirement.

---

## Authentication & Authorization

### Who Can Run Chaos Experiments?

The platform uses a tiered authorization model that gates access based on environment sensitivity and blast radius:

```
RBAC Model for Chaos Engineering Platform:

Roles:
  - platform-admin:
      Permissions: manage platform configuration, create/modify guardrails,
                   manage agent fleet, create/delete teams, override blast radius limits
      Cannot: approve their own experiments (separation of duties)

  - chaos-engineer:
      Permissions: create experiments for any environment, execute approved experiments,
                   create experiment templates, run GameDays
      Requires: approval from team-lead or platform-admin for production experiments

  - team-lead:
      Permissions: approve experiments for their team's services,
                   set team-level guardrails, view all team experiment results
      Cannot: approve experiments targeting services outside their team

  - developer:
      Permissions: create and execute experiments in development/staging
                   for their own services, view experiment results
      Cannot: target production, target other teams' services

  - viewer:
      Permissions: view experiment results, dashboards, and reports
      Cannot: create, modify, or execute any experiment

  - ci-cd-service-account:
      Permissions: execute pre-approved experiment templates in CI/CD pipelines
      Constraints: limited to approved templates, staging environment only
                   (unless promoted to production via approval)
```

### Environment-Based Access Control

| Environment | Who Can Run | Approval Required | Blast Radius Limit |
|------------|-------------|-------------------|-------------------|
| Development | Developer (own services) | None | 100% of dev instances |
| Staging | Developer, Chaos Engineer | None (pre-approved templates) | 50% of staging instances |
| Pre-production | Chaos Engineer | Team lead approval | 25% of instances |
| Production | Chaos Engineer | Team lead + platform admin | Organization-defined (typically 5-10%) |
| Production (GameDay) | Chaos Engineer | VP-level approval + GameDay checklist | Up to 25% (with enhanced monitoring) |

### Separation of Duties

Critical safety rule: **the person who creates an experiment cannot be the sole approver.** This prevents a single compromised account or malicious insider from injecting arbitrary faults into production.

```
Approval Workflow:
  1. Creator submits experiment
  2. System validates blast radius (automated)
  3. If production target:
     a. Team lead reviews and approves
     b. If blast radius > 10%: additional platform-admin approval
     c. If targeting shared infrastructure (databases, queues):
        additional approval from infrastructure team
  4. Experiment is marked "approved" only after all required approvals
  5. Creator (or scheduler) can then execute the approved experiment
  6. All approvals are recorded in the audit log with approver identity and timestamp
```

### Agent Authentication

- Agents authenticate to the control plane using **mutual TLS (mTLS)** with certificates issued by the organization's PKI or a Kubernetes cert-manager
- Certificate Common Name (CN) encodes the agent's host identity and deployment region
- Certificates rotate automatically every 24 hours with zero-downtime rollover
- The control plane maintains an allowlist of valid certificate fingerprints — revoked agents cannot reconnect
- Agent-to-agent communication is not permitted (agents only communicate with the control plane)

### API Authentication

- All API endpoints require authentication via OIDC tokens or API keys
- API keys are scoped to specific permissions (e.g., a CI/CD key can only execute pre-approved templates)
- API keys have configurable expiration (default: 90 days) and are rotatable without downtime
- Rate limiting: 100 requests/minute per user, 1,000 requests/minute per CI/CD service account

---

## Audit Trail

### What Is Audited

Every action in the platform is recorded in an immutable, append-only audit log:

| Event Category | Events Captured | Retention |
|---------------|-----------------|-----------|
| **Experiment lifecycle** | Created, approved, rejected, started, completed, failed, aborted | 7 years |
| **Fault injection** | Fault applied (agent, target, type, parameters), fault reverted (trigger reason) | 7 years |
| **Blast radius** | Blast radius calculated, approved, rejected (with full computation details) | 7 years |
| **Hypothesis evaluation** | Every metric query result, hypothesis pass/fail, grace period state | 1 year |
| **Access control** | Login, logout, role changes, API key creation/revocation | 7 years |
| **Configuration changes** | Guardrail changes, template changes, agent fleet changes | 7 years |
| **GameDay events** | Start, phase transitions, participant actions, abort, debrief notes | 7 years |
| **Agent lifecycle** | Registration, heartbeats (summary), autonomous reverts, crashes | 1 year |

### Audit Log Properties

- **Immutability:** Once written, audit entries cannot be modified or deleted. The storage layer enforces append-only semantics using WORM (Write Once Read Many) storage or cryptographic chaining.
- **Tamper evidence:** Each audit entry includes a cryptographic hash of the previous entry (hash chain). Any modification to historical entries breaks the chain and is detectable.
- **Non-repudiation:** All entries include the authenticated identity of the actor (user, service account, or system component). Actors cannot deny performing recorded actions.

### Audit Log Schema

```
AuditEntry:
    entry_id:         string (UUID)
    previous_hash:    string (hash chain)
    timestamp:        timestamp (microsecond precision, UTC)
    actor_id:         string (user ID, service account, or "system")
    actor_ip:         string
    action:           string (e.g., "experiment.created", "fault.injected")
    resource_type:    string (e.g., "experiment", "agent", "guardrail")
    resource_id:      string
    details:          map<string, any> (action-specific metadata)
    environment:      string
    outcome:          string ("success", "denied", "error")
```

---

## Compliance Considerations

### SOC2 Implications of Intentional Fault Injection

Chaos engineering creates a unique compliance challenge: **SOC2 requires controls to prevent unauthorized system disruption, yet the chaos platform's purpose is authorized disruption.** The key distinction for auditors:

| SOC2 Concern | How the Platform Addresses It |
|-------------|------------------------------|
| **Unauthorized access** | RBAC with environment-based gating; production requires multi-party approval |
| **Uncontrolled changes** | All experiments are pre-validated (blast radius), time-bounded, and automatically rolled back |
| **Audit trail** | Every action is logged immutably with actor identity, timestamp, and full context |
| **Availability impact** | Blast radius limits prevent experiments from exceeding organizational risk tolerance |
| **Change management** | Experiments follow the same approval workflow as production changes (with additional safety controls) |
| **Incident response** | Platform integrates with incident management; experiments auto-abort during active incidents |

### Compliance-Relevant Features

1. **Experiment pre-registration:** All experiments must be defined and approved before execution. Ad-hoc fault injection (without a corresponding experiment record) is impossible through the platform.

2. **Automatic incident correlation:** The platform publishes experiment timelines to the organization's incident management system. If an incident occurs during an experiment, the timeline is immediately available for RCA.

3. **Exclusion windows:** The platform supports "freeze periods" (code freezes, compliance audit windows, peak business periods) during which all experiments are automatically suspended.

4. **Geographic restrictions:** Experiments can be restricted to specific regions for data sovereignty compliance (e.g., EU-only experiments cannot affect infrastructure in non-EU regions).

5. **Data protection:** The chaos platform does not access, modify, or transmit application data. Fault injection operates at the infrastructure level (network, compute, storage) and does not interact with business data.

### Regulatory Framework Mapping

| Framework | Relevant Controls | Platform Compliance Mechanism |
|-----------|------------------|------------------------------|
| SOC2 (CC6.1) | Logical and physical access controls | RBAC, mTLS, audit logging |
| SOC2 (CC7.2) | System operations monitoring | Continuous hypothesis monitoring, automated rollback |
| SOC2 (CC8.1) | Change management | Experiment approval workflows, blast radius validation |
| ISO 27001 (A.12.1) | Operational procedures | Documented experiment templates, runbooks, GameDay procedures |
| PCI DSS (6.4) | Change control processes | Production gating, multi-party approval |
| HIPAA (164.312) | Audit controls | Immutable audit log, 7-year retention |

---

## Threat Model

### Attack Vectors

| Threat | Attack Description | Mitigation |
|--------|-------------------|------------|
| **Compromised user account** | Attacker uses stolen credentials to create destructive experiments | MFA required for production experiments; multi-party approval; anomaly detection on experiment patterns |
| **Compromised CI/CD pipeline** | Malicious code injects chaos experiments via CI/CD integration | CI/CD keys scoped to approved templates only; templates cannot be modified via CI/CD |
| **Compromised agent** | Attacker gains control of a fault injector agent | Agent cannot initiate experiments (only execute commands from authenticated control plane); mTLS with certificate pinning |
| **Insider threat** | Malicious employee creates experiments designed to cause outages | Separation of duties; approval workflow; blast radius limits; audit trail; anomaly detection |
| **Supply chain attack** | Compromised experiment template in the community library | Template review and approval before import; templates execute in a sandbox before production use |
| **Denial of service against the platform** | Attacker floods the experiment API to prevent legitimate experiments | Rate limiting; authentication required for all endpoints |

### Security Monitoring

The platform itself should be monitored for suspicious activity:

| Signal | Trigger | Response |
|--------|---------|----------|
| Experiment targeting critical infrastructure | Experiment targets databases, message queues, or the chaos platform itself | Elevated approval (infrastructure team + VP) |
| Unusual experiment frequency | >5 experiments/hour by a single user (vs. baseline of 1-2/day) | Alert to platform admin; auto-block after threshold |
| Experiment outside business hours | Production experiment created at 3 AM on a weekend | Require additional approval; alert on-call |
| Failed approval attempts | >3 rejected experiments for the same target in 24 hours | Alert to security team; investigate intent |
| Agent anomaly | Agent reporting faults that don't match any experiment | Quarantine agent; investigate for compromise |
