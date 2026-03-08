# Security & Compliance

## 1. Authentication

### Authentication Methods

| Method | Use Case | Security Level | Protocol |
|--------|----------|---------------|----------|
| **SSH Keys** | Git operations (push/fetch) | High | SSH |
| **Personal Access Tokens (PAT)** | API access, Git over HTTPS | Medium | HTTPS |
| **OAuth Apps** | Third-party integrations | Medium | OAuth 2.0 |
| **GitHub Apps** | First-party integrations, CI/CD | High | JWT + Installation tokens |
| **SAML SSO** | Enterprise identity federation | High | SAML 2.0 |
| **Device Flow** | CLI tools, headless environments | Medium | OAuth 2.0 Device Flow |
| **Web Session** | Browser-based access | Medium | Cookie-based + CSRF token |

### SSH Key Authentication Flow

```
PSEUDOCODE: SSH Authentication

FUNCTION authenticate_ssh(public_key_fingerprint, signature):
    // Step 1: Look up key in database
    key_record = db.query(
        "SELECT user_id, key_type, expires_at, last_used_at
         FROM ssh_keys
         WHERE fingerprint = ?",
        public_key_fingerprint
    )

    IF key_record IS null:
        REJECT "Key not found"

    // Step 2: Check key validity
    IF key_record.expires_at < now():
        REJECT "Key expired"

    // Step 3: Verify signature (proves possession of private key)
    IF NOT verify_signature(key_record.public_key, signature):
        REJECT "Invalid signature"

    // Step 4: Check if user account is active
    user = get_user(key_record.user_id)
    IF user.suspended OR user.disabled:
        REJECT "Account suspended"

    // Step 5: Check SSO requirements (enterprise)
    IF user.requires_sso:
        sso_session = get_sso_session(user, key_record)
        IF sso_session IS null OR sso_session.expired:
            REJECT "SSO session required. Visit web to authenticate."

    // Step 6: Update last-used timestamp (async)
    async update_key_last_used(key_record.id)

    RETURN AuthResult(user_id=user.id, scopes=key_record.scopes)
```

### GitHub App Authentication

```
GitHub App Authentication Flow

1. App Installation:
   Org admin installs App → selects repositories → grants permissions

2. Token Request:
   App creates JWT (signed with private key, 10-min expiry)
   → POST /app/installations/{id}/access_tokens
   → Receives installation token (1-hour expiry, scoped to selected repos)

3. API Call:
   Authorization: token ghs_xxxxxxxxxxxx
   → Server validates token, checks permissions, routes to correct org

Token Scopes (fine-grained):
├── contents: read/write (repository content)
├── pull_requests: read/write
├── issues: read/write
├── actions: read/write
├── checks: read/write
├── metadata: read (always granted)
└── ... 30+ permission scopes
```

---

## 2. Authorization

### Permission Model

```
Permission Hierarchy
├── Repository Level
│   ├── Read: Clone, browse, list issues/PRs
│   ├── Triage: Manage issues/PRs, no code push
│   ├── Write: Push to non-protected branches, merge PRs
│   ├── Maintain: Manage repo settings (no destructive ops)
│   └── Admin: Full control including delete, transfer
│
├── Organization Level
│   ├── Member: Default org permissions
│   ├── Moderator: Manage interactions, block users
│   ├── Billing Manager: Manage billing only
│   └── Owner: Full org control
│
└── Enterprise Level
    ├── Enterprise Owner: Cross-org admin
    ├── Billing Manager: Enterprise billing
    └── Guest Collaborator: Limited external access
```

### CODEOWNERS

```
PSEUDOCODE: CODEOWNERS Evaluation

FILE: .github/CODEOWNERS

# Each line: pattern → owner(s)
# Evaluated bottom-up (last match wins)

*.js           @frontend-team
*.go           @backend-team
/docs/         @docs-team
/src/auth/     @security-team @backend-team
/src/billing/  @billing-team

FUNCTION get_required_reviewers(changed_files):
    codeowners = parse_codeowners_file()
    required_reviewers = Set()

    FOR file IN changed_files:
        FOR rule IN reversed(codeowners.rules):
            IF matches_pattern(file.path, rule.pattern):
                required_reviewers.add_all(rule.owners)
                BREAK  // Last matching rule wins per file

    RETURN required_reviewers

FUNCTION check_pr_approval(pr, reviews):
    required = get_required_reviewers(pr.changed_files)

    FOR owner IN required:
        IF owner IS team:
            IF NOT any_team_member_approved(owner, reviews):
                RETURN Blocked("Waiting for review from " + owner)
        ELSE:
            IF NOT user_approved(owner, reviews):
                RETURN Blocked("Waiting for review from " + owner)

    RETURN Approved
```

### Branch Protection Rules

```
PSEUDOCODE: Branch Protection Evaluation

FUNCTION evaluate_branch_protection(branch, action, user, pr):
    rules = get_protection_rules(branch)

    // Rule 1: Require pull request before merging
    IF rules.require_pull_request:
        IF action == "direct_push":
            REJECT "Direct pushes not allowed; create a PR"

        // Required approving reviews
        IF pr.approving_reviews < rules.required_approving_reviews:
            REJECT "Need " + rules.required_approving_reviews + " approvals"

        // Dismiss stale reviews on new push
        IF rules.dismiss_stale_reviews:
            IF pr.has_new_commits_since_last_review:
                dismiss_approvals(pr)

        // Require review from CODEOWNERS
        IF rules.require_code_owner_reviews:
            IF NOT all_codeowners_approved(pr):
                REJECT "CODEOWNERS review required"

    // Rule 2: Require status checks
    IF rules.required_status_checks:
        FOR check IN rules.required_status_checks:
            status = get_check_status(pr.head_sha, check.name)
            IF status != "success":
                REJECT "Required check '" + check.name + "' not passing"

        IF rules.require_branch_up_to_date:
            IF NOT is_up_to_date(pr.head, branch):
                REJECT "Branch must be up to date with " + branch

    // Rule 3: Require signed commits
    IF rules.require_signed_commits:
        FOR commit IN pr.commits:
            IF NOT commit.signature_verified:
                REJECT "All commits must be signed"

    // Rule 4: Require linear history
    IF rules.require_linear_history:
        IF merge_would_create_merge_commit(pr):
            REJECT "Only squash or rebase merge allowed"

    // Rule 5: Lock branch
    IF rules.lock_branch:
        IF user NOT IN rules.bypass_actors:
            REJECT "Branch is locked"

    ALLOW
```

---

## 3. Secret Scanning

### Push Protection

```
PSEUDOCODE: Secret Scanning on Push

FUNCTION scan_push_for_secrets(pack_data, repository):
    new_blobs = extract_new_blobs(pack_data)

    FOR blob IN new_blobs:
        IF is_binary(blob):
            CONTINUE

        content = decompress(blob)
        matches = []

        // Scan against known patterns
        FOR pattern IN SECRET_PATTERNS:
            // Patterns: API keys, tokens, private keys, passwords
            regex_matches = pattern.regex.find_all(content)
            FOR match IN regex_matches:
                // Verify it's a real secret (not a test/example)
                IF NOT is_false_positive(match, pattern):
                    matches.append(SecretMatch(
                        pattern=pattern.name,
                        value_hash=hash(match.value),
                        file_path=get_file_path(blob, pack_data),
                        line_number=get_line_number(content, match.offset)
                    ))

        IF matches AND repository.push_protection_enabled:
            REJECT PushBlocked(
                message="Push blocked: secrets detected",
                matches=matches,
                bypass_url=generate_bypass_url(matches)
            )

    RETURN PushAllowed

// Known secret patterns (200+ patterns from partners)
SECRET_PATTERNS = [
    Pattern(name="github_pat",
            regex=/ghp_[A-Za-z0-9_]{36}/,
            verifier=verify_github_token),
    Pattern(name="aws_access_key",
            regex=/AKIA[0-9A-Z]{16}/,
            verifier=verify_aws_key),
    Pattern(name="private_key",
            regex=/-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----/,
            verifier=null),
    Pattern(name="generic_secret",
            regex=/(?i)(password|secret|token)\s*[:=]\s*['"][^'"]{8,}/,
            verifier=entropy_check),
    // ... 200+ patterns
]
```

### Historical Secret Scanning

For repositories that enable secret scanning after creation, a background job scans the entire git history:

```
PSEUDOCODE: Historical Secret Scan

FUNCTION scan_repository_history(repository):
    // Walk all reachable objects, deduplicate blobs
    scanned_blobs = Set()
    alerts = []

    FOR ref IN repository.all_refs():
        FOR commit IN walk_history(ref):
            FOR blob IN commit.tree.all_blobs():
                IF blob.sha IN scanned_blobs:
                    CONTINUE
                scanned_blobs.add(blob.sha)

                matches = scan_blob_for_secrets(blob)
                FOR match IN matches:
                    // Check if secret is still active (partner verification)
                    is_active = verify_with_partner(match)
                    alerts.append(SecretAlert(
                        match=match,
                        commit=commit.sha,
                        introduced_at=find_introducing_commit(blob.sha),
                        is_active=is_active
                    ))

    // Notify repository admins
    create_security_alerts(repository, alerts)
    IF any(a.is_active FOR a IN alerts):
        notify_admins(repository, "Active secrets found in repository history")
```

---

## 4. Dependency Scanning

### Vulnerability Detection Pipeline

```
PSEUDOCODE: Dependency Scanning (Dependabot)

FUNCTION scan_dependencies(repository, manifest_file):
    // Step 1: Parse dependency manifest
    manifest = parse_manifest(manifest_file)
    // Supports: package.json, Gemfile.lock, requirements.txt,
    //           go.sum, pom.xml, Cargo.lock, etc.

    dependencies = manifest.resolved_dependencies()

    // Step 2: Check against vulnerability database
    vulnerabilities = []
    FOR dep IN dependencies:
        advisories = vulnerability_db.query(
            ecosystem=dep.ecosystem,
            package=dep.name,
            version_range=dep.version
        )
        FOR advisory IN advisories:
            IF advisory.affects_version(dep.version):
                vulnerabilities.append(VulnAlert(
                    dependency=dep,
                    advisory=advisory,
                    severity=advisory.severity,  // critical, high, medium, low
                    fixed_version=advisory.patched_versions,
                    cve=advisory.cve_id
                ))

    // Step 3: Create security alerts
    FOR vuln IN vulnerabilities:
        create_or_update_alert(repository, vuln)

    // Step 4: Generate auto-fix PRs (if enabled)
    IF repository.dependabot_auto_prs_enabled:
        FOR vuln IN vulnerabilities:
            IF vuln.fixed_version:
                create_update_pr(repository, vuln.dependency, vuln.fixed_version)

    RETURN vulnerabilities
```

---

## 5. Actions Security

### OIDC for Cloud Authentication

```
PSEUDOCODE: OIDC Token Issuance for Actions

FUNCTION issue_oidc_token(workflow_run, audience):
    // Create a short-lived JWT that cloud providers trust
    claims = {
        "iss": "https://token.github.example.com",
        "sub": "repo:" + workflow_run.repository.full_name +
               ":ref:" + workflow_run.ref,
        "aud": audience,  // e.g., cloud provider's OIDC audience
        "repository": workflow_run.repository.full_name,
        "repository_owner": workflow_run.repository.owner,
        "actor": workflow_run.triggering_actor,
        "ref": workflow_run.ref,
        "sha": workflow_run.head_sha,
        "workflow": workflow_run.workflow_path,
        "event_name": workflow_run.event,
        "environment": workflow_run.environment,
        "runner_environment": "github-hosted",
        "iat": now(),
        "exp": now() + 5_minutes,  // Very short-lived
        "nbf": now()
    }

    token = jwt_sign(claims, github_oidc_signing_key)
    RETURN token

// Cloud provider validates:
// 1. Token signature (using GitHub's JWKS endpoint)
// 2. Issuer matches expected value
// 3. Subject matches allowed repository/branch pattern
// 4. Token is not expired
// → No long-lived secrets needed in Actions workflows
```

### Secrets Management

```
Secrets Hierarchy
├── Organization Secrets
│   ├── Scoped to: all repos, private repos, or selected repos
│   ├── Encrypted at rest with org-specific key
│   └── Injected as environment variables in Actions
│
├── Repository Secrets
│   ├── Available to all workflows in the repo
│   └── Encrypted with repo-specific key
│
├── Environment Secrets
│   ├── Available only to jobs targeting the environment
│   ├── Environment protection rules (reviewers, wait timer)
│   └── Most restrictive scope
│
└── Encryption
    ├── Secrets encrypted with libsodium sealed box
    ├── Per-repo public key for encryption
    ├── Private key stored in HSM
    ├── Secrets never exposed in logs (auto-masked)
    └── Secrets not available to workflows from forks
```

### Workflow Permission Scopes

```
PSEUDOCODE: Actions Permission Enforcement

FUNCTION check_action_permission(workflow_run, operation, resource):
    // Get permissions from workflow YAML
    permissions = workflow_run.permissions
    // Default: read-only for GITHUB_TOKEN

    required_scope = get_required_scope(operation)
    // e.g., "contents: write" for pushing code
    //        "pull-requests: write" for commenting on PRs

    IF required_scope NOT IN permissions:
        REJECT "Insufficient permissions: " + required_scope + " not granted"

    // Additional checks for fork PRs
    IF workflow_run.is_fork_pr:
        // Fork PRs have restricted permissions by default
        IF operation IN ["write_contents", "write_secrets", "admin"]:
            REJECT "Fork PR workflows cannot write to repository"

    ALLOW
```

---

## 6. Code Signing and Provenance

### Commit Signing Verification

```
Commit Signature Verification
├── GPG Signatures
│   ├── Developer signs commits with GPG key
│   ├── Public key uploaded to GitHub profile
│   └── GitHub verifies signature on display
│
├── SSH Signatures (newer)
│   ├── Developer signs with SSH key (same key used for auth)
│   ├── git config gpg.format ssh
│   └── Simpler key management (one key for auth + signing)
│
└── Vigilant Mode
    ├── All unsigned commits marked as "Unverified"
    ├── Branch protection can require signed commits
    └── Helps identify commits not from claimed author
```

### Build Provenance (Supply Chain Security)

```
PSEUDOCODE: Artifact Attestation

FUNCTION create_build_attestation(artifact, workflow_run):
    provenance = {
        "builder": {
            "id": "https://github.example.com/actions/runner"
        },
        "buildType": "https://github.example.com/actions/workflow@v1",
        "invocation": {
            "configSource": {
                "uri": workflow_run.repository.url,
                "digest": {"sha1": workflow_run.head_sha},
                "entryPoint": workflow_run.workflow_path
            },
            "environment": {
                "runner_os": workflow_run.runner_os,
                "runner_arch": workflow_run.runner_arch
            }
        },
        "materials": [
            {
                "uri": workflow_run.repository.url,
                "digest": {"sha1": workflow_run.head_sha}
            }
        ]
    }

    // Sign with Sigstore (keyless signing)
    attestation = sigstore_sign(provenance,
        identity=workflow_run.oidc_identity)

    // Store attestation alongside artifact
    store_attestation(artifact.id, attestation)

    RETURN attestation
```

---

## 7. Compliance

### Compliance Certifications

| Certification | Scope | Key Requirements |
|--------------|-------|-----------------|
| **SOC 2 Type II** | All services | Security, availability, confidentiality controls |
| **FedRAMP** | Government cloud | US government security standards |
| **GDPR** | EU users | Data protection, right to erasure, data portability |
| **HIPAA** | Healthcare customers | PHI protection (Enterprise only) |
| **ISO 27001** | Information security | ISMS framework compliance |

### Audit Logging

```
PSEUDOCODE: Audit Log Entry

STRUCTURE AuditLogEntry:
    timestamp: DateTime
    actor_id: String         // User who performed the action
    actor_type: String       // "user", "integration", "system"
    action: String           // "repo.create", "org.invite_member", "repo.destroy"
    target_type: String      // "repository", "user", "team"
    target_id: String
    org_id: String           // Organization context
    actor_ip: String         // Source IP (anonymized after 90 days)
    actor_location: String   // Country/region
    user_agent: String
    transport: String        // "http", "ssh", "oauth"
    metadata: Map            // Action-specific details

// Audit events are:
// - Immutable (append-only)
// - Retained for 7 years (enterprise)
// - Queryable via API and UI
// - Streamable to external SIEM systems
// - Cannot be deleted by org admins (tamper-proof)
```

### Data Residency

```
Data Residency for Enterprise
├── Repository data: stored in specified region
├── Metadata: replicated globally (with PII masking outside region)
├── Search index: maintained in-region
├── Actions runners: available in-region
├── Audit logs: stored in-region
└── Backups: cross-region within same compliance boundary
```
