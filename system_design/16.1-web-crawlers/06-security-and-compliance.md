# Security & Compliance — Web Crawlers

## Authentication & Authorization

### AuthN Mechanism

The crawler itself does not authenticate with target websites (it crawls the public web). However, the crawler's internal APIs (admin, monitoring, frontier management) require authentication:

| Interface | AuthN Method | Details |
|-----------|-------------|---------|
| Admin API | OAuth2 + OIDC | Operators authenticate via identity provider; short-lived access tokens |
| Internal gRPC (frontier ↔ fetcher) | Mutual TLS (mTLS) | Both client and server present certificates; prevents unauthorized workers from joining the fleet |
| Monitoring dashboards | SSO via OIDC | Integrated with corporate identity provider |
| Seed URL injection | API key + IP allowlist | Restricted to authorized automation systems |

### AuthZ Model (RBAC)

| Role | Permissions |
|------|------------|
| **Crawler Admin** | Full access: pause/resume crawling, inject seeds, modify blocklists, manage frontier partitions |
| **Crawler Operator** | Monitor: view crawl stats, query URL status, view trap detections. Modify: adjust host priorities, add hosts to blocklist |
| **Viewer** | Read-only: view dashboards, query crawl statistics |
| **Automation (CI/CD)** | Seed injection, frontier status queries, crawl trigger |

### Token Management

- Internal services use mTLS with certificates rotated every 90 days
- Human operators use OIDC tokens with 1-hour expiry and refresh tokens
- API keys for automation are scoped per function and rotated every 30 days

---

## Data Security

### Encryption at Rest

| Data | Encryption | Key Management |
|------|-----------|----------------|
| URL database | AES-256 | Managed key rotation (90 days) |
| Crawled page content | AES-256 | Content-addressed keys; per-bucket encryption in object storage |
| Crawl logs | AES-256 | Same as URL database |
| Frontier state (disk checkpoints) | AES-256 | Node-local encryption keys |
| Bloom filter checkpoints | Not encrypted | Contains only hashes; no sensitive data |

### Encryption in Transit

- **Fetcher ↔ target hosts:** HTTPS where available; HTTP for hosts that do not support TLS
- **Internal communication:** mTLS for all service-to-service communication (frontier ↔ fetcher, fetcher ↔ content store, etc.)
- **Cross-region traffic:** VPN tunnels or private interconnects for frontier ↔ fetcher communication across regions

### PII Handling

The crawler inevitably fetches pages containing personal information (social media profiles, public directories, personal websites). Handling strategies:

| Concern | Strategy |
|---------|----------|
| PII in fetched content | Content is stored as-is (it is publicly available); PII extraction and masking is the indexer's responsibility, not the crawler's |
| PII in URLs | Some URLs contain email addresses or names (e.g., `/profile/john.doe@example.com`); the URL database does not specifically handle PII in URLs |
| Cookies and session data | The crawler does not store or forward cookies; each request is stateless |
| IP logging | Fetcher worker IP addresses are logged in target server access logs; this is expected behavior for web crawlers |

### Data Masking / Anonymization

- **Crawl logs:** Anonymize any user-agent strings that might reveal internal infrastructure details
- **Admin access logs:** Log operator identity and actions for audit trail; anonymize for external reporting

---

## Threat Model

### Top Attack Vectors

#### 1. Malicious Content Injection (Poisoning the Index)

**Threat:** An adversary creates web pages designed to exploit the crawler's parser, causing buffer overflows, code execution, or corrupted data in the content store.

**Mitigation:**
- Parse HTML in a sandboxed environment with resource limits (memory, CPU, execution time)
- Validate content type headers against actual content (reject mismatched types)
- Limit fetched page size (max 10 MB per page)
- Strip executable content (JavaScript, embedded objects) during parsing

#### 2. Crawler Trap / Resource Exhaustion

**Threat:** An adversary creates a spider trap (infinite URL generator) to consume the crawler's bandwidth and storage budget, diverting resources from legitimate pages.

**Mitigation:**
- Per-host URL budget (max 500,000 URLs per host in the frontier)
- URL depth and length limits
- Repeating path segment detection
- Content uniqueness monitoring per host (low unique content ratio triggers trap flag)
- Manual blocklist for confirmed adversarial hosts

#### 3. Denial of Service via Redirect Chains

**Threat:** A host returns an infinite chain of redirects, causing the fetcher to follow them indefinitely and waste connections.

**Mitigation:**
- Maximum redirect depth (e.g., 10 redirects per initial URL)
- Redirect loop detection (track visited URLs in the redirect chain)
- Timeout on total fetch time including all redirects (30 seconds)

#### 4. IP Spoofing / Impersonation of Crawler

**Threat:** An adversary impersonates the crawler's User-Agent to bypass access controls on target sites, or the crawler's IP ranges are used in abuse campaigns.

**Mitigation:**
- Publish official crawler IP ranges for site owners to verify
- Use consistent, well-documented User-Agent strings
- Respond to reverse DNS lookups (verify that the crawler's IP resolves to the expected domain)
- Monitor for unauthorized use of the crawler's User-Agent

#### 5. Internal Infrastructure Compromise

**Threat:** An attacker gains access to the crawler's control plane and uses it to target specific hosts (effectively weaponizing the crawler as a DDoS tool).

**Mitigation:**
- mTLS for all internal communication
- RBAC with least-privilege principle
- Rate limits on admin API (prevent mass host targeting)
- Audit logging of all administrative actions
- Anomaly detection on crawl patterns (sudden increase in requests to a single host)

### Rate Limiting & DDoS Protection

| Protection | Implementation |
|-----------|---------------|
| Per-host rate limiting | Politeness engine (primary defense — see Deep Dive) |
| Per-IP aggregate rate limiting | IP-based throttling across all hosts on shared IPs |
| Self-protection: admin API rate limit | 100 RPS per authenticated user |
| Self-protection: frontier API rate limit | Per-worker connection limits; mTLS prevents unauthorized workers |
| Outbound DDoS prevention | Global crawl throughput ceiling; cannot exceed configured pages/sec |

---

## Compliance

### robots.txt as a Legal/Ethical Standard

The Robots Exclusion Protocol (`robots.txt`) is not legally binding in all jurisdictions, but it is the de facto standard for communicating crawl preferences. The crawler treats robots.txt compliance as a hard requirement:

- **Always fetch before crawling:** Never crawl a host without a valid (or confirmed 404) robots.txt
- **Honor all directives:** Disallow, Allow, Crawl-delay, even if the site's content would be valuable
- **Respect meta tags:** `<meta name="robots" content="noindex, nofollow">` and `X-Robots-Tag` HTTP headers
- **Support opt-out:** Provide a mechanism for site owners to request complete removal from the index

### GDPR Considerations

| Requirement | Crawler Impact | Implementation |
|-------------|---------------|----------------|
| Right to erasure | Site owner requests removal of their content from the index | Provide a removal request endpoint; block the host and delete stored content |
| Data minimization | Only collect data necessary for indexing | Do not store cookies, login credentials, or form data; only store publicly accessible page content |
| Lawful basis | Legitimate interest in indexing publicly available information | Document the legitimate interest assessment; provide opt-out via robots.txt |
| Cross-border transfer | Fetcher workers in multiple countries fetch content from different jurisdictions | Content storage centralized in a GDPR-compliant region; fetcher workers do not persist content locally beyond buffering |

### Copyright and Content Licensing

| Concern | Strategy |
|---------|----------|
| Copyrighted content | The crawler fetches and stores publicly available content for indexing purposes; fair use / fair dealing applies in most jurisdictions |
| AI training opt-out | Respect `robots.txt` directives targeting AI crawlers (e.g., `User-agent: GPTBot`, `User-agent: CCBot`); honor the emerging `ai.txt` standard |
| Content licensing headers | Detect and store `X-Robots-Tag` and `<meta>` licensing directives; pass to the indexer for compliance |
| DMCA takedown requests | Integrate with a content removal pipeline for processing legal takedown notices |
