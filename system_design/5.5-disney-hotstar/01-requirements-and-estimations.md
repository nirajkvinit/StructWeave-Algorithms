# Requirements and Capacity Estimations

## Overview

This document outlines the functional and non-functional requirements for a live sports streaming platform capable of handling India's massive cricket viewership, along with detailed capacity estimations for peak events.

---

## Functional Requirements

### P0 - Must Have (Launch Blockers)

| ID | Requirement | Description |
|----|-------------|-------------|
| F-P0-01 | Live Streaming | Stream live sports with < 40s glass-to-glass latency |
| F-P0-02 | Adaptive Bitrate | Automatically adjust quality based on network conditions |
| F-P0-03 | Multi-Language Audio | Support 8+ commentary languages (Hindi, English, Tamil, Telugu, Kannada, Bengali, Marathi, Malayalam) |
| F-P0-04 | DVR / Catch-up | Allow seeking within live stream (up to 4 hours back) |
| F-P0-05 | Authentication | User login with subscription tier validation |
| F-P0-06 | DRM Protection | Widevine, FairPlay, PlayReady for content protection |
| F-P0-07 | Match Schedule | Display upcoming matches with notification support |
| F-P0-08 | Playback Controls | Play, pause, seek, quality selection, language switch |

### P1 - Should Have (Critical for Business)

| ID | Requirement | Description |
|----|-------------|-------------|
| F-P1-01 | SSAI | Server-Side Ad Insertion with targeting |
| F-P1-02 | Chromecast/AirPlay | Cast to TV from mobile devices |
| F-P1-03 | Offline Download | Download VOD content for offline viewing |
| F-P1-04 | Interactive Polls | Real-time polls during match (Watch'N Play) |
| F-P1-05 | Score Overlay | Live scores, ball-by-ball commentary |
| F-P1-06 | Multiple Profiles | Family sharing with separate profiles |
| F-P1-07 | Push Notifications | Match start, wicket alerts, score updates |

### P2 - Nice to Have (Future Enhancements)

| ID | Requirement | Description |
|----|-------------|-------------|
| F-P2-01 | Multi-View | Split screen for multiple matches/cameras |
| F-P2-02 | AR Overlays | Augmented reality statistics |
| F-P2-03 | VR Experience | 360-degree stadium view |
| F-P2-04 | Social Watch | Watch with friends (synchronized playback) |
| F-P2-05 | Fantasy Integration | In-app fantasy sports with live updates |

---

## Non-Functional Requirements

### Performance Requirements

| Metric | Target | Rationale |
|--------|--------|-----------|
| Glass-to-glass latency | 30-40 seconds | Balance stability vs. real-time for 59M users |
| Time to first frame | < 3 seconds | User expectation for playback start |
| Rebuffering ratio | < 0.5% | Critical for live sports engagement |
| Bitrate switching time | < 2 seconds | Seamless quality transitions |
| Language switch time | < 1 second | Instant audio track change |
| API response time (P99) | < 200ms | For auth, entitlements, metadata |

### Availability Requirements

| Scenario | Target | Notes |
|----------|--------|-------|
| During live events | 99.95% | ~22 min downtime/month max |
| Non-event periods | 99.9% | Standard SLA |
| Regional outage recovery | < 5 minutes | Multi-CDN failover |
| Single CDN failure | Zero user impact | Automatic steering |

### Scalability Requirements

| Metric | Requirement |
|--------|-------------|
| Concurrent viewers | Support 60M+ peak |
| Traffic surge handling | 20x in 10 minutes |
| Infrastructure scaling | 90 seconds to add capacity |
| Geographic coverage | 200+ countries (diaspora) |

### Security Requirements

| Requirement | Description |
|-------------|-------------|
| Content encryption | AES-128 for all streams |
| DRM enforcement | Multi-DRM based on device |
| Geo-restriction | Match-level rights enforcement |
| VPN detection | Block VPN access for restricted content |
| Concurrent streams | Limit per subscription tier |

---

## Traffic Pattern Analysis

### Typical Match Day Traffic

```
Traffic Pattern: IPL Match (8 PM IST Start)

Viewers (M)
60 ┤                                              ╭────────╮
55 ┤                                         ╭────╯        │
50 ┤                                    ╭────╯             │
45 ┤                               ╭────╯                  │
40 ┤                          ╭────╯                       │
35 ┤                     ╭────╯                            │
30 ┤                ╭────╯                                 │
25 ┤           ╭────╯                                      │
20 ┤      ╭────╯                                           │
15 ┤  ╭───╯                                                ╰───
10 ┤──╯
 5 ┤
 0 ┼──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬───
   7:00  7:30  8:00  8:30  9:00  9:30  10:00 10:30 11:00 PM
         │      │                            │
         │      └─ Toss (First Surge)        └─ End of Match
         │
         └─ Pre-match Build-up

Key Events:
├─ T-60 min: Pre-show starts (baseline × 2)
├─ T-30 min: Toss time (baseline × 5)
├─ T-0: Match starts (baseline × 10-15)
├─ T+15 min: Powerplay (peak engagement)
├─ Wicket: Bandwidth spike (replays)
├─ Strategic timeout: Ad break opportunity
└─ Last over: Second peak
```

### Traffic Spike Characteristics

| Phase | Time | Traffic Multiplier | Notes |
|-------|------|-------------------|-------|
| Baseline | Normal day | 1x | Non-event traffic |
| Pre-show | T-60 min | 2x | Studio coverage begins |
| Toss | T-30 min | 5x | First major surge |
| Match Start | T-0 | 10-15x | Rapid ramp-up |
| Steady State | T+30 min | 15-20x | Peak sustained load |
| Wicket Moments | Variable | +20% spike | Replay requests surge |
| Match End | T+3-4 hours | 2x → baseline | Gradual decline |

---

## Capacity Estimations

### Bandwidth Calculations

**Peak Scenario: 59M concurrent viewers**

```
Quality Distribution (Mobile-First):
├─ 4K (4 Mbps):     2% =  1.18M users
├─ 1080p (3 Mbps): 15% =  8.85M users
├─ 720p (1.5 Mbps): 35% = 20.65M users
├─ 480p (800 Kbps): 30% = 17.7M users
└─ 360p (400 Kbps): 18% = 10.62M users

Weighted Average Bitrate:
= (0.02 × 4) + (0.15 × 3) + (0.35 × 1.5) + (0.30 × 0.8) + (0.18 × 0.4)
= 0.08 + 0.45 + 0.525 + 0.24 + 0.072
= 1.367 Mbps average

Peak Egress Bandwidth:
= 59M × 1.367 Mbps
= 80.65 Pbps
≈ 80 Tbps peak egress from CDN edge

CDN Capacity Planning (with 30% headroom):
= 80 × 1.3
≈ 104 Tbps required CDN capacity
```

### Segment Storage

**Live Stream Segments**

```
Segment Configuration:
├─ Duration: 4 seconds (balance latency vs. ABR stability)
├─ Quality levels: 6 (360p, 480p, 720p, 1080p, 1080p+, 4K)
├─ Languages: 8 (audio tracks)
└─ DVR window: 4 hours

Segment Calculations per Match (3.5 hours):
Video segments = (3.5 × 60 × 60) / 4 × 6 qualities
               = 3150 × 6
               = 18,900 video segments

Audio segments = 3150 × 8 languages
               = 25,200 audio segments

Total segments = 44,100 per match

Storage per Match:
├─ Video: 18,900 × avg 2MB = ~38 GB
├─ Audio: 25,200 × avg 100KB = ~2.5 GB
└─ Total: ~40-50 GB per match

Origin Storage (10 concurrent matches):
= 50 GB × 10 = 500 GB active
= 4-hour DVR × 10 matches = 2 TB buffer
```

### API Capacity

**Auth and Metadata APIs**

```
Playback Start Storm (at match start):

Assumptions:
├─ 30M users join in 10 minutes
├─ Each user makes: Auth (1) + Entitlement (1) + Manifest (1) = 3 calls
└─ Plus heartbeats during playback

Peak API Load:
├─ Initial burst: 30M × 3 / 600s = 150,000 requests/second
├─ Sustained heartbeats: 59M / 30s = ~2M requests/second
└─ Total peak: ~2.15M requests/second

API Infrastructure:
├─ API Gateway instances: 200+ (auto-scaled)
├─ Auth service: 100+ instances
├─ Entitlement cache hit rate: 99%+ required
└─ Connection pooling: Essential
```

### Ad Decision Capacity

**SSAI Load**

```
Ad Break Frequency:
├─ Strategic timeouts: 2 per innings = 4 per match
├─ Between innings: 1
├─ Wicket replays: ~20 per match (with ads)
└─ Total ad breaks: ~25 per match

Ad Decision Load:
├─ Users requiring ad decisions: 25M (free tier)
├─ Demographic groups: 50-100 (not 1:1 targeting)
├─ Ad pods pre-computed per group: Yes
├─ Peak ad decision rate: 25M / 100 groups / 60s = 4,167 decisions/second per group
└─ Actual load with caching: ~50,000 requests/second to ad server

Ad Content Delivery:
├─ Ad segments cached at edge: Yes
├─ Ad manifest pre-stitched: Per demographic group
└─ Fallback: Generic ad pod if targeting fails
```

---

## SLOs and SLAs

### Service Level Objectives (Internal)

| Service | Metric | SLO |
|---------|--------|-----|
| Live Ingest | Feed availability | 99.99% |
| Transcoder | Processing latency | < 5 seconds |
| Packager | Segment availability | 99.99% |
| CDN Edge | Cache hit rate | > 95% |
| Origin Shield | Request coalescing | > 90% |
| SSAI | Ad decision latency | < 100ms |
| Auth Service | Response time P99 | < 50ms |
| Entitlement | Cache hit rate | > 99% |
| DRM License | Response time P99 | < 200ms |

### Service Level Agreements (External)

| Tier | Availability | Rebuffering | Compensation |
|------|--------------|-------------|--------------|
| Premium (4K) | 99.95% | < 0.3% | Pro-rata credit |
| Standard | 99.9% | < 0.5% | Pro-rata credit |
| Free | 99.5% | < 1% | None |

---

## CAP Theorem Positioning

```
                        Consistency
                            /\
                           /  \
                          /    \
                         /      \
                        /   CP   \
                       /          \
                      /            \
                     /______________\
                    /\              /\
                   /  \    CA     /  \
                  / AP \        /     \
                 /______\______/_______\
            Availability          Partition
                                 Tolerance

Hotstar Choice: AP (Availability + Partition Tolerance)

Rationale:
├─ Live streaming cannot wait for consistency
├─ Viewer count can be eventually consistent
├─ Ad impressions reconciled post-event
├─ Session state can be reconstructed
└─ Content itself is immutable (segments)

Consistency Trade-offs:
├─ Viewer count: ±5% acceptable during peak
├─ Ad impressions: Reconciled within 24 hours
├─ Watch history: Eventually consistent (minutes)
└─ Subscription status: Strong consistency required
```

---

## Estimation Summary

| Resource | Baseline | Peak Event |
|----------|----------|------------|
| Concurrent viewers | 2M | 59M |
| CDN egress | 4 Tbps | 80+ Tbps |
| API requests/sec | 100K | 2M+ |
| Ad decisions/sec | 10K | 50K+ |
| AWS instances | 100 | 500+ |
| CPU cores | 1,600 | 8,000+ |
| RAM | 3.2 TB | 16+ TB |
| Active segments | 50K | 500K+ |

---

## Next Steps

See [02-high-level-design.md](./02-high-level-design.md) for the system architecture that addresses these requirements.
