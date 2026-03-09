# Security & Compliance — WebRTC Infrastructure

## 1. Authentication & Authorization

### 1.1 Room Access Control

WebRTC sessions require two levels of authentication: room-level access (can a participant join this room?) and track-level permissions (can they publish video, subscribe to screen shares, or record?). Unlike traditional HTTP APIs where each request is independently authenticated, WebRTC uses a single token at connection time that governs the entire session lifecycle.

**Token-Based Join Flow:**

```
Token Structure (JWT):
  Header:
    alg: HS256
    typ: JWT

  Payload:
    room_id:          string    (which room to join)
    participant_id:   string    (unique participant identity)
    identity:         string    (display name)
    permissions:
      can_publish:      boolean (publish audio/video tracks)
      can_subscribe:    boolean (receive other participants' tracks)
      can_publish_data: boolean (send data channel messages)
      can_record:       boolean (trigger recording egress)
    metadata:         object    (arbitrary app-specific data)
    iat:              timestamp (issued at)
    exp:              timestamp (expiration — typically 24 hours)
    nbf:              timestamp (not valid before)

  Signature:
    HMAC-SHA256(header + payload, api_secret)
```

**Token Validation Sequence:**

```
FUNCTION validate_join_token(token, room_id):
    // Step 1: Verify signature
    IF NOT verify_hmac(token, api_secret):
        RETURN error("invalid_token")

    // Step 2: Check temporal validity
    claims = decode_payload(token)
    IF NOW < claims.nbf OR NOW > claims.exp:
        RETURN error("token_expired")

    // Step 3: Verify room binding
    IF claims.room_id != room_id:
        RETURN error("room_mismatch")

    // Step 4: Check room capacity
    room = session_store.GET(room_id)
    IF room.participant_count >= room.max_participants:
        RETURN error("room_full")

    // Step 5: Check for duplicate participant
    IF room.has_participant(claims.participant_id):
        // Allow reconnection — revoke old connection
        room.evict_participant(claims.participant_id)

    RETURN claims

// Token is validated ONCE at WebSocket connection time.
// Permissions are cached for the session duration.
// Permission updates require server-side push (no re-auth needed).
```

**Runtime Permission Updates:**

```
Server-Initiated Permission Changes:
  The server can modify a participant's permissions mid-session via:

  1. Admin API: POST /rooms/{room_id}/participants/{pid}/permissions
     → Signaling server pushes updated permissions to the participant
     → SFU enforces immediately (drops tracks if publish revoked)

  2. Room policy changes: Room creator changes settings
     → All participants receive updated permissions
     → Already-published tracks remain until explicitly unpublished

  Use cases:
    - Muting a disruptive participant (revoke can_publish)
    - Promoting an attendee to presenter (grant can_publish)
    - Ending a recording session (revoke can_record)
    - Locking a room to prevent new subscriptions
```

### 1.2 TURN Credential Management

TURN servers must authenticate clients to prevent unauthorized relay usage, but the credential system must not add latency to the ICE negotiation process. The solution uses time-limited HMAC credentials that the TURN server can verify locally without any database lookup.

**Credential Generation (REST API):**

```
FUNCTION generate_turn_credentials(user_id, ttl=86400):
    // Embed expiration timestamp in the username
    timestamp = CURRENT_TIME + ttl
    username = STRING(timestamp) + ":" + user_id

    // HMAC generates the password from the username
    password = HMAC_SHA1(turn_shared_secret, username)

    // Return multiple TURN server endpoints for redundancy
    RETURN {
        ice_servers: [
            {
                urls: [
                    "turn:turn-us-east.example.com:3478?transport=udp",
                    "turn:turn-us-east.example.com:443?transport=tcp"
                ],
                username: username,
                credential: password
            },
            {
                urls: [
                    "turn:turn-eu-west.example.com:3478?transport=udp",
                    "turn:turn-eu-west.example.com:443?transport=tcp"
                ],
                username: username,
                credential: password
            }
        ]
    }

// TURN server verification (no DB lookup needed):
FUNCTION verify_turn_credential(username, password):
    // Extract timestamp from username
    parts = username.SPLIT(":")
    expiry_timestamp = INTEGER(parts[0])

    IF NOW > expiry_timestamp:
        RETURN DENY  // Credential expired

    // Recompute HMAC and compare
    expected_password = HMAC_SHA1(turn_shared_secret, username)
    IF password != expected_password:
        RETURN DENY  // Invalid credential

    RETURN ALLOW
```

**Credential Rotation Strategy:**

```
Turn Shared Secret Rotation:
  - Rotated monthly via configuration management
  - During rotation, TURN servers accept BOTH old and new secrets
    (dual-secret window: 24 hours)
  - Old secret is purged after all active allocations expire (max 10 min TTL)

Per-Session Credentials:
  - TTL: 24 hours (covers long meetings with reconnections)
  - Client requests new credentials via REST API before expiry
  - ICE restart uses new credentials seamlessly

Attack Surface Reduction:
  - Leaked credentials are time-bounded (24h max exposure)
  - No credential reuse across sessions (unique user_id per session)
  - Rate limiting on credential generation API (10 requests/minute/IP)
  - Max concurrent allocations per credential: 5
```

---

## 2. Data Security

### 2.1 Transport Encryption (DTLS-SRTP)

WebRTC mandates encryption for all media — there is no unencrypted mode. This is enforced at the protocol level, not as an application choice.

```
Encryption Stack:

Layer 1: DTLS Handshake (Key Exchange)
├── Runs over the ICE-selected UDP path
├── Uses DTLS 1.2 (or 1.3 where supported)
├── Handshake sequence:
│   Client → Server: ClientHello (with DTLS extensions)
│   Server → Client: ServerHello, Certificate, ServerKeyExchange, Done
│   Client → Server: ClientKeyExchange, ChangeCipherSpec, Finished
│   Server → Client: ChangeCipherSpec, Finished
├── Certificate fingerprint must match SDP a=fingerprint attribute
├── Provides: mutual authentication + shared secret derivation
├── Handshake adds ~50-100ms to call setup (one-time cost)
└── Certificate validation: fingerprint comparison (not CA-based PKI)

Layer 2: SRTP (Media Encryption)
├── Derives encryption keys from DTLS shared secret:
│   client_write_key (128-bit AES)
│   server_write_key (128-bit AES)
│   client_write_salt, server_write_salt
├── Algorithm: AES-128-CM (Counter Mode) with HMAC-SHA1-80 authentication
├── Encrypts RTP payload (NOT header — SFU reads headers for routing)
├── Per-packet IV: derived from SSRC + packet index + salt
├── 48-bit rollover counter prevents replay attacks
└── Per-packet overhead: ~10 bytes (authentication tag)

Layer 3: SRTCP (Control Channel Encryption)
├── Same key material as SRTP (derived from same DTLS handshake)
├── Encrypts RTCP packets (receiver reports, TWCC feedback)
├── Authentication prevents RTCP injection attacks
└── Protects bandwidth estimates from manipulation

Trust Model:
  Client A ←── SRTP (keys A) ──→ SFU ←── SRTP (keys B) ──→ Client B
  SFU terminates DTLS independently with each client.
  This means:
    ✓ Media encrypted on the wire (no passive eavesdropping)
    ✗ SFU has access to unencrypted media (can read/record/modify)
    ✗ SFU operator is a trusted party in the security model
```

### 2.2 End-to-End Encryption (Insertable Streams)

DTLS-SRTP provides hop-by-hop encryption — the SFU decrypts incoming packets and re-encrypts for each subscriber. For scenarios requiring true confidentiality (healthcare, legal, sensitive business), E2E encryption ensures only participants can decrypt the media.

```
Insertable Streams Architecture:

    Publisher                         SFU                          Subscriber
    ────────                       ─────────                      ──────────
    Camera/Mic                     Receives                       Receives
        |                          encrypted                      encrypted
        v                          RTP payload                    RTP payload
    Encoder (VP8/Opus)                |                               |
        |                             v                               v
        v                          Reads RTP                     SRTP Decrypt
    E2EE Transform                 headers only                  (outer layer)
    (AES-GCM encrypt              (SSRC, seq num,                     |
     media payload)               timestamp)                          v
        |                             |                          E2EE Decrypt
        v                             v                          (AES-GCM with
    SRTP Encrypt                   Forwards to                   shared group key)
    (outer layer)                  subscribers                        |
        |                          without touching                   v
        v                          payload                        Decoder
    → UDP to SFU →                                               Renderer

Double Encryption Layers:
  Outer: SRTP (SFU can decrypt — needed for routing)
  Inner: E2EE payload (SFU CANNOT decrypt — opaque ciphertext)
  SFU strips outer SRTP, re-encrypts outer layer for subscriber,
  but inner E2EE payload passes through untouched.
```

**E2EE Key Management:**

```
FUNCTION setup_e2ee_for_room(room_id, participants):
    // Each participant generates an asymmetric key pair
    FOR each participant IN participants:
        participant.key_pair = generate_key_pair(algorithm="ECDH-P256")
        participant.public_key = participant.key_pair.public

    // Exchange public keys via signaling (authenticated channel)
    FOR each participant IN participants:
        signaling.broadcast(room_id, {
            type: "e2ee_key",
            participant_id: participant.id,
            public_key: participant.public_key
        })

    // Derive shared symmetric key per sender
    FOR each sender IN participants:
        sender.frame_key = derive_frame_key(sender.key_pair, room_context)
        // Each sender uses their own key to encrypt their media
        // All receivers derive the same key using sender's public key

    // Key rotation events:
    //   - Participant joins: new epoch, new keys distributed
    //   - Participant leaves: new epoch, exclude departed participant
    //   - Timer-based: every 30 minutes for forward secrecy

// SFrame Protocol (standardized format):
SFrame Encrypted Frame:
  [Header: 1-9 bytes]
    config:   1 byte (key frame flag, counter length, key ID length)
    KID:      variable (identifies which sender's key was used)
    CTR:      variable (frame counter — prevents replay)
  [Encrypted Payload: variable]
    Ciphertext of the encoded media frame (AES-256-GCM)
  [Authentication Tag: 16 bytes]
    Integrity + authentication

What SFU Can Still Do With E2EE:
├── Read RTP headers (routing, sequencing, timing)
├── Switch simulcast layers (layer ID in RTP header extension)
├── Measure packet loss and jitter (via RTCP)
├── Detect active speakers (audio level header extension)
└── Forward packets selectively (its core function)

What SFU Cannot Do With E2EE:
├── Decode or view video frames
├── Listen to audio content
├── Record decrypted media (requires participant cooperation)
├── Modify media content (integrity protected by GCM tag)
└── Perform server-side processing (noise suppression, blur)
```

### 2.3 Signaling Channel Security

```
Signaling Security Layers:

Transport:
├── WSS (WebSocket Secure) — TLS 1.3 for all signaling
├── HSTS enforced (Strict-Transport-Security: max-age=31536000)
├── Certificate pinning for native SDKs
└── mTLS between signaling servers and backend services

Message Integrity:
├── All signaling messages include monotonic sequence numbers
├── Server rejects out-of-order or duplicate sequence numbers
├── SDP fingerprints bind signaling to DTLS (prevents SRTP key substitution)
├── ICE credentials (ufrag/pwd) unique per session — replay has no effect
└── CORS policy restricts WebSocket origin to allowed domains

Authentication Lifecycle:
├── JWT token validated at WebSocket upgrade (HTTP → WS)
├── Session bound to authenticated identity for WebSocket lifetime
├── Re-authentication required on reconnection
├── Server can invalidate sessions via session store update
└── Idle timeout: close WebSocket after 60 seconds of no signaling activity
```

---

## 3. Threat Model

### 3.1 Attack Vectors and Mitigations

| # | Attack Vector | Severity | Description | Mitigations |
|---|---|---|---|---|
| **1** | **Media Eavesdropping** | Critical | Intercepting UDP packets on the network path between client and SFU to access audio/video content | DTLS-SRTP mandatory encryption (AES-128-CM); SDP fingerprint verification prevents MITM on DTLS handshake; E2EE via Insertable Streams for maximum confidentiality; certificate pinning in native SDKs |
| **2** | **DDoS on TURN Servers** | High | Flooding TURN with Allocate requests to exhaust relay capacity, preventing legitimate users from connecting through symmetric NATs | Per-user allocation limits (max 5 concurrent); time-limited HMAC credentials (24h TTL); bandwidth quotas per allocation (50 Mbps cap); geo-distributed TURN fleet with independent capacity; rate limiting (1 allocation/sec/IP) |
| **3** | **Signaling Injection** | High | Injecting forged SDP offers or ICE candidates via compromised signaling channel to redirect media to attacker-controlled endpoint | WSS encryption prevents wire-level injection; JWT authentication gates all signaling; SDP fingerprint binding ensures DTLS peer matches signaled identity; ICE ufrag/pwd validated per session |
| **4** | **SRTP Replay Attack** | Medium | Capturing and replaying encrypted media packets to cause audio glitches, video artifacts, or bandwidth waste | SRTP 48-bit index (32-bit ROC + 16-bit seq) for replay detection; receiver maintains 128-packet replay window; duplicate indices silently dropped; index wrapping triggers DTLS renegotiation |
| **5** | **Unauthorized Room Joining** | High | Bypassing room authentication to eavesdrop on private meetings by guessing room IDs or forging tokens | JWT tokens with room-specific binding and HMAC signature; short-lived tokens (24h max); room IDs are UUIDs (128-bit — infeasible to guess); server-side room locks; anomaly detection on join patterns |
| **6** | **ICE Flooding** | Medium | Sending massive numbers of fake ICE candidates to overwhelm the ICE agent, delay connectivity, and prevent legitimate call establishment | Rate-limit ICE candidates per peer (max 50); validate candidate format before processing; ICE negotiation timeout (30s); prioritize local/reflexive over relay; drop candidates for completed connections |
| **7** | **SDP Manipulation** | High | Modifying SDP during offer/answer exchange to downgrade encryption, inject malicious codec parameters, or change media direction | SDP validated against allowlist of codecs and parameters; DTLS fingerprint must match certificate; a=setup attribute prevents DTLS role manipulation; WSS prevents in-transit SDP modification |
| **8** | **RTCP Feedback Manipulation** | Medium | Injecting false TWCC or REMB feedback to manipulate bandwidth estimation, causing quality degradation or bandwidth starvation | SRTCP authentication (HMAC-SHA1-80) prevents forged RTCP; per-sender RTCP rate limiting; SFU cross-validates feedback against observed traffic patterns; anomalous REMB values clamped to plausible range |

### 3.2 SFU Trust Model

```
Trust Boundaries:

Client ←→ SFU:
├── Client trusts SFU to route packets correctly (not inject, modify, or duplicate)
├── SFU trusts client identity based on JWT validation at signaling layer
├── With DTLS-SRTP only: SFU CAN read media (trusted intermediary model)
├── With E2EE: SFU CANNOT read media (zero-knowledge routing)
└── SFU enforces rate limits, permission checks, and bandwidth caps

SFU ←→ SFU (Cascaded):
├── Mutual TLS authentication between SFU nodes
├── Pre-shared certificates provisioned via configuration management
├── No DTLS/ICE between servers (known public addresses)
├── RTP forwarded without re-encryption (trusted internal network)
└── Room state synchronized via authenticated pub/sub messages

SFU ←→ Signaling Server:
├── Signaling server is the authority for room state and permissions
├── SFU trusts permission grants from signaling server
├── Communication over mTLS-authenticated internal RPC
└── SFU enforces permissions locally (does not re-check per packet)

Key Threat: Compromised SFU Node
├── Impact: Can read all non-E2EE media for rooms on that node
├── Mitigation: E2EE for sensitive rooms; node isolation (no shared memory)
├── Detection: Anomalous forwarding patterns (extra copies, unknown destinations)
├── Recovery: Migrate rooms to clean node; rotate all SRTP key material
└── Prevention: Minimal SFU code; no persistent storage; immutable deployments
```

### 3.3 Network-Level Protections

```
Firewall Rules:

Inbound to SFU:
├── UDP 10000-65535 from any (client media — cannot restrict by source IP)
├── TCP 443 from signaling servers only (management API)
├── Drop all other inbound traffic
└── Rate limit: Max 100 new connections/second per source IP

Inbound to TURN:
├── UDP 3478 from any (TURN allocation requests)
├── TCP 443 from any (TURN over TLS fallback)
├── UDP 49152-65535 from any (relay ports for allocated sessions)
└── Rate limit: Max 10 allocation requests/second per source IP

Inbound to Signaling:
├── TCP 443 from any (WebSocket over TLS)
├── Drop non-TLS connections
└── Rate limit: Max 50 WebSocket upgrades/second per source IP

Inter-Service Communication:
├── SFU ←→ SFU: Custom relay protocol over mTLS
├── SFU ←→ Signaling: Internal RPC over mTLS
├── Signaling ←→ Session Store: Private network only
└── All inter-service traffic on isolated network segment
```

---

## 4. Compliance

### 4.1 Recording Consent

```
Recording Consent Framework:

Legal Landscape:
├── One-party consent: Only one participant must consent to recording
│   (most US states, UK, Germany for business calls)
├── Two-party / all-party consent: ALL participants must be notified
│   (California, Illinois, Washington, ~15 other US states)
├── EU/GDPR: Explicit consent required + legitimate processing purpose
└── Industry-specific: HIPAA (healthcare), PCI-DSS (financial), FERPA (education)

Implementation:

FUNCTION handle_recording_consent(room, recording_request):
    consent_mode = room.settings.recording_consent_mode

    IF consent_mode == ALL_PARTY:
        // Notify all participants
        FOR each participant IN room.participants:
            signaling.send(participant, {
                type: "recording_consent_request",
                requested_by: recording_request.identity,
                recording_type: recording_request.type
            })

        // Wait for responses
        responses = WAIT_FOR_ALL(
            room.participants.MAP(p => p.consent_response),
            timeout = 30s
        )

        IF ALL(responses, r => r.consented):
            start_recording(room, recording_request)
            log_consent_event(room, responses)  // Audit trail
        ELSE:
            non_consenters = responses.FILTER(r => NOT r.consented)
            notify_requester("Declined by: " + non_consenters.identities)

    ELSE IF consent_mode == ONE_PARTY:
        // Requester's consent is sufficient
        start_recording(room, recording_request)
        // Still notify all participants (visual/audio indicator)
        broadcast_recording_indicator(room)

Late Joiner Handling:
├── Participant joining an active recording session:
│   → Notified immediately that recording is in progress
│   → Must acknowledge before media flows (in all-party mode)
│   → If they decline, they are not admitted to the room
└── Consent state logged: who, when, recording_id, room_id
```

### 4.2 GDPR Compliance

```
GDPR Data Processing for WebRTC:

Media Data Classification:
├── Audio/video of identifiable persons = personal data under GDPR
├── Applies to: recordings, screenshots, transcriptions
├── Real-time media (not recorded) = transient processing, not storage
├── SFU packet buffers (1-2 seconds) = ephemeral, not subject to storage rules
└── Signaling logs with participant names/IPs = personal data

Right to Access (Article 15):
├── Users can request copies of their recorded calls
├── Response time: 30 days
├── Includes: recordings, transcripts, metadata (join/leave times)
├── Redaction: Other participants' data must be redacted
└── Format: Standard media format + JSON metadata export

Right to Erasure (Article 17):
├── Users can request deletion of recordings containing their data
├── Multi-participant complexity:
│   Recording contains MULTIPLE participants' personal data
│   Options: blur/mute requesting participant, or delete entire recording
│   Decision depends on recording purpose (legal hold may override)
├── Metadata deletion: Remove participant identity, retain anonymized stats
├── Signaling logs: Anonymize after 90 days, delete after 1 year
└── TURN relay logs: IP addresses hashed after 30 days

Data Minimization (Article 5):
├── No persistent storage of media unless recording explicitly enabled
├── Signaling logs: participant_id, room_id, timestamps (not content)
├── Quality metrics: aggregated, not per-participant identifiable
├── IP addresses: hashed after 30 days, deleted after 90 days
└── Session metadata: retained for 90 days (troubleshooting), then purged

Breach Notification (Article 33):
├── Detection: Real-time alerting on anomalous access patterns
├── Response: Notify authorities within 72 hours of confirmed breach
├── User notification: Without undue delay if high risk to rights
├── Breach log: Maintained regardless of notification obligation
└── Incident playbook: Documented response procedure with escalation matrix
```

### 4.3 HIPAA Compliance (Telehealth)

```
HIPAA Requirements for WebRTC in Healthcare:

Technical Safeguards (§ 164.312):
├── Encryption: E2EE REQUIRED for patient-provider video calls
│   DTLS-SRTP alone is insufficient — SFU can access media
│   Insertable Streams / SFrame provides true end-to-end encryption
├── Access control: Provider authentication with MFA before room entry
├── Audit logging: All session access logged with identity + timestamps
├── Automatic session timeout: 15 minutes of inactivity → disconnect
└── Integrity controls: SRTP authentication tags verify media integrity

Administrative Safeguards (§ 164.308):
├── Business Associate Agreement (BAA) required with WebRTC provider
├── Risk assessment: Document threats to ePHI in video consultations
├── Workforce training: Providers trained on secure call practices
├── Incident response: Breach notification within 60 days
└── Minimum necessary: Only authorized personnel access recordings

Recording Handling:
├── Recordings encrypted at rest with customer-managed keys
├── Retention: Minimum 6 years (HIPAA requirement)
├── Access audit: Every recording access logged with accessor identity
├── Deletion: Cryptographic erasure (destroy encryption key)
└── Transfer: Only via encrypted channels to authorized recipients

Infrastructure Requirements:
├── SFU/TURN servers in SOC 2 Type II compliant data centers
├── Dedicated SFU nodes for healthcare rooms (tenant isolation)
├── Network segmentation: Healthcare traffic on isolated network segment
├── Media processing: Secure boot, encrypted disk, no persistent media
└── Penetration testing: Annual assessment focused on media path security
```

### 4.4 Data Residency

```
Data Residency for TURN and SFU:

Challenge:
  TURN servers relay media through their physical location.
  A participant in Germany connected to a TURN server in US-East
  means their audio/video traverses US infrastructure.
  Under GDPR, this may constitute unauthorized cross-border data transfer.

  Similarly, SFU nodes process and forward media — the region where
  the SFU runs determines where media is processed.

Solution — Region-Aware Routing:

  TURN Server Selection:
  ├── Client region determined via GeoIP at credential request time
  ├── Credential response includes ONLY region-compliant TURN servers
  │   EU participant → EU TURN servers only
  │   Configuration: data_residency_regions: ["eu-west", "eu-central"]
  ├── Fallback: If all compliant TURN servers are unavailable,
  │   fail the connection rather than route through non-compliant region
  └── Audit: Per-session log of TURN server location and participant region

  SFU Region Affinity:
  ├── Rooms created with region constraint:
  │   POST /rooms { "region": "eu-west", "geo_fence": true }
  ├── Geo-fenced rooms: ALL SFU nodes must be in compliant regions
  ├── Cascading restricted: No inter-SFU relay to non-compliant regions
  ├── Participants outside the region connect via higher-latency path
  │   to region-local SFU (acceptable trade-off for compliance)
  └── Enforcement: SFU node refuses room assignment if region mismatch

  Recording Storage:
  ├── Recordings stored in region-local object storage
  ├── Cross-region replication DISABLED for geo-fenced rooms
  ├── Metadata stored in region-local database partition
  └── Encryption keys managed in region-local key management service

Compliance Verification:
├── Per-room audit report: All servers (SFU, TURN) that touched media
├── Monitoring: Alert if geo-fenced room media routes outside allowed regions
├── Quarterly review: TURN/SFU locations vs. data residency commitments
└── Customer-facing compliance dashboard: Real-time data flow visibility
```

---

## 5. Security Monitoring

### 5.1 Security Events

```
Critical Events (Immediate Alert — Page On-Call):
├── DTLS fingerprint mismatch during handshake (potential MITM)
├── TURN allocation spike from single IP (>50 allocations/minute)
├── JWT token used after explicit revocation (session hijack attempt)
├── SFU forwarding media to unregistered subscriber (compromised node)
├── Signaling WebSocket connection from blacklisted IP range
├── E2EE key exchange failure rate > 5% (potential key injection attack)
└── Multiple rooms breaching geo-fence constraints in same time window

Warning Events (5-Minute Alert — Notify Team Channel):
├── ICE failure rate > 10% across all sessions (network issue or attack)
├── Unusual TURN bandwidth per allocation (> 25 Mbps sustained)
├── JWT tokens with anomalous claims (unexpected permissions escalation)
├── Multiple participants with same identity across different rooms
├── Certificate expiration within 14 days (DTLS or TLS)
├── TURN shared secret age > 25 days (rotation overdue)
└── Signaling WebSocket connection duration > 24 hours (stale session)

Informational Events (Daily Digest):
├── TURN credential generation volume and geographic distribution
├── E2EE adoption rate (% of rooms using Insertable Streams)
├── Failed join attempts by reason (expired, invalid, room_full)
├── SFU certificate rotation events
├── Signaling WebSocket connection duration distribution
└── TURN relay usage by region (capacity planning input)
```

### 5.2 Incident Response

```
Incident Severity Levels:

SEC-1 (Critical): Active Media Interception
├── Detection: DTLS fingerprint mismatch, unexpected media destinations
├── Response time: 5 minutes
├── Immediate: Terminate affected sessions; force DTLS renegotiation
├── Investigation: Trace network path; analyze packet captures
├── Recovery: Rotate all SFU certificates; notify affected participants
└── Post-incident: Full forensic analysis within 24 hours

SEC-2 (High): TURN Server Abuse / Exhaustion
├── Detection: Bandwidth spike, allocation exhaustion, unusual relay patterns
├── Response time: 15 minutes
├── Immediate: Rate-limit offending credentials; block source IPs
├── Investigation: Determine abuse vs legitimate high-bandwidth use
├── Recovery: Revoke compromised credentials; scale TURN capacity
└── Post-incident: Update allocation limits and anomaly thresholds

SEC-3 (High): Unauthorized Room Access
├── Detection: Valid token with revoked session; token from unexpected region
├── Response time: 30 minutes
├── Immediate: Terminate suspicious sessions; notify room owner
├── Investigation: Audit token generation logs; check for API key compromise
├── Recovery: Rotate API keys; invalidate all tokens for affected rooms
└── Post-incident: Review token validation; add geographic anomaly rules

SEC-4 (Critical): SFU Node Compromise
├── Detection: Anomalous forwarding (extra copies, unknown destinations)
├── Response time: 5 minutes
├── Immediate: Isolate node; migrate all rooms to verified clean nodes
├── Investigation: Forensic image; analyze access logs and binary integrity
├── Recovery: Rebuild from verified image; rotate inter-SFU certificates
└── Post-incident: Root cause analysis; harden deployment pipeline
```

---

## 6. Protocol-Level Security Summary

| Protocol | Encryption | Authentication | Integrity |
|---|---|---|---|
| **Signaling (WebSocket)** | TLS 1.3 | JWT (HMAC-SHA256) | TLS record MAC |
| **Media (RTP)** | SRTP (AES-128-CM) | DTLS certificate fingerprint | HMAC-SHA1-80 |
| **TURN** | Optional TLS wrapper | HMAC-SHA1 long-term credential | STUN message integrity |
| **Data Channel** | DTLS 1.2+ | Same as media (shared DTLS) | DTLS record MAC |
| **E2EE Payload** | AES-256-GCM (SFrame) | Per-sender key ID | GCM authentication tag |
| **Inter-SFU Relay** | Mutual TLS | Certificate-based | TLS record MAC |

---

## 7. Security Hardening Checklist

| Item | Priority | Notes |
|---|---|---|
| DTLS-SRTP mandatory for all media | Required | No unencrypted media paths exist in WebRTC spec |
| Signaling over WSS only | Required | Plain WS rejected in production environments |
| TURN credential TTL < 24h | Required | Limits exposure window for compromised credentials |
| Rate limiting on signaling endpoints | Required | Prevents WebSocket flood and resource exhaustion |
| ICE consent freshness checks | Required | 30-second consent expiry per RFC 7675 |
| SDP fingerprint validation | Required | Prevents DTLS man-in-the-middle attacks |
| CORS policy on signaling server | Required | Prevents cross-origin WebSocket hijacking |
| JWT token binding to room ID | Required | Prevents token reuse across rooms |
| Certificate rotation schedule | Quarterly | DTLS certificates and inter-service TLS |
| Dependency vulnerability scanning | Weekly | WebRTC libraries, TLS implementations, codecs |
| Penetration testing | Bi-annual | Focus on signaling injection, TURN abuse, SDP manipulation |
| E2EE key rotation on participant change | Required | Forward/backward secrecy for group calls |

---

*Previous: [Scalability & Reliability](./05-scalability-and-reliability.md) | Next: [Observability](./07-observability.md)*
