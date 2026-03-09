# Interview Guide — Gaming Matchmaking System

## 1. Forty-Five-Minute Pacing Strategy

### 1.1 Time Allocation

| Phase | Time | Focus | Key Deliverables |
|---|---|---|---|
| **Requirements & Scope** | 0:00 - 5:00 | Clarify what "matchmaking" means, define scale, identify game mode | Functional requirements, scale numbers, game type (5v5, battle royale, etc.) |
| **High-Level Architecture** | 5:00 - 15:00 | Core components, data flow, regional topology | Architecture diagram, queue→match→server→rating pipeline |
| **Low-Level Design** | 15:00 - 28:00 | Rating algorithm, matching strategy, data models, APIs | TrueSkill overview, expanding window, ticket schema, key APIs |
| **Deep Dive** | 28:00 - 38:00 | Interviewer-chosen deep dive (typically concurrency, fairness, or scaling) | Detailed solution for one or two specific challenges |
| **Trade-offs & Discussion** | 38:00 - 45:00 | Justify decisions, discuss alternatives, address edge cases | Clear trade-off analysis, alternative approaches considered |

### 1.2 Phase Details

**Phase 1: Requirements (5 min)**

Start by asking clarifying questions to scope the problem:

| Question | Why It Matters | Good Default |
|---|---|---|
| "What type of game? (5v5, battle royale, 1v1)" | Match size changes everything about the matching algorithm | Assume 5v5 competitive shooter |
| "What scale? How many concurrent players?" | Determines architectural complexity | 10M concurrent, 800K queuing |
| "Do we need party support?" | Parties add significant complexity | Yes, up to 5-stack |
| "Is this ranked or casual, or both?" | Ranked requires much stricter matching | Both, with separate rating per mode |
| "What queue time is acceptable?" | The primary constraint to optimize against | <30s median, <2min P99 |
| "Do we care about smurf/boost detection?" | May come up as a deep dive topic | Yes, as a secondary system |

**Phase 2: High-Level Architecture (10 min)**

Draw the core pipeline and explain each component:

```
[Client] → [API Gateway] → [Queue Service] → [Match Workers (per region)]
                                                    ↓
[Rating Engine] ← [Game Session Manager] ← [Server Allocator]
```

Key points to cover:
1. **Regionalized architecture** — why global matching doesn't work (latency)
2. **Queue Service as the coordination hub** — stateful, in-memory, replicated
3. **Match Workers as the compute engine** — scan pools every 1-2s, form matches
4. **Asynchronous rating updates** — decouple match completion from rating recalculation
5. **Server allocation as the final step** — latency-optimal, capacity-aware

**Phase 3: Low-Level Design (13 min)**

Deep dive into two or three of:
- **Rating system:** Explain TrueSkill 2 (μ, σ, Bayesian updates). Don't need full math—explain the intuition of uncertainty tracking.
- **Expanding window:** Show how tolerance widens over time (skill ±50 at t=0, ±200 at t=30s, ±400 at t=60s).
- **Data model:** Match ticket schema, player profile, match record.
- **Match quality function:** Multi-factor scoring (skill + latency + party + role).
- **Double-matching prevention:** Optimistic concurrency with atomic dequeue.

**Phase 4: Deep Dive (10 min)**

The interviewer picks a topic. Be ready for:
- "How do you handle the top 0.1% who can't find matches?" → Cross-region overflow, fill matches
- "What happens if a match worker crashes mid-formation?" → Atomic dequeue, heartbeat, standby workers
- "How do you detect and handle smurfs?" → Multi-signal detection, accelerated convergence
- "How do you ensure parties are fairly matched?" → Weighted skill aggregation, party symmetry scoring

**Phase 5: Trade-offs (7 min)**

Show you understand the tensions inherent in matchmaking—there is no perfect answer.

---

## 2. Key Trade-Offs

### 2.1 Queue Time vs Match Quality

This is THE fundamental trade-off in matchmaking. Every interviewer will probe it.

| Factor | Favor Speed | Favor Quality | Real-World Resolution |
|---|---|---|---|
| **Skill window** | Wide (±400 from start) | Narrow (±50 always) | Start narrow, expand over time |
| **Region scope** | All regions from t=0 | Home region only | Regional-first, overflow after 60s |
| **Quality floor** | Accept any valid match | Reject unless quality > 0.75 | Quality floor decays with wait time |
| **Fill matches** | Allow 8/10 or 4v5 | Always 5v5 | Only after extreme wait (>120s) |
| **Off-peak** | Drastically relax criteria | Maintain standards (long queues) | Mode-dependent (casual relaxes more) |

**Key interview insight:** The expanding window is the elegant resolution. It's not a static trade-off—it's a dynamic function of time. You get the best of both worlds: high quality for players who find matches quickly, acceptable quality for outliers who wait longer.

### 2.2 Fairness vs Speed

| Dimension | Fair | Fast |
|---|---|---|
| **Party matching** | Only 3-stack vs 3-stack | Any composition that fills the match |
| **Role queue** | Everyone gets their preferred role | Roles assigned to minimize queue time |
| **Rematch avoidance** | Never face same opponent twice in a row | Ignore recent opponents if pool is small |
| **Latency fairness** | All players must have similar ping | Tolerate 50ms+ ping variance |

**Why it matters in interviews:** Interviewers want to see that you recognize fairness is subjective and measurable. A "fair" match where both teams have the same average skill but one team is a coordinated 5-stack is perceived as unfair by the solo players. Show you understand the gap between mathematical fairness and perceived fairness.

### 2.3 Skill Accuracy vs Rating Stability

| Favor Accuracy | Favor Stability | Resolution |
|---|---|---|
| Large K-factor (big rating swings) | Small K-factor (gradual changes) | Uncertainty-based: K is high when σ is high, low when σ is low |
| Include individual performance | Only use win/loss | Performance adjusts ±5% of base change (prevents stat-padding) |
| Rapid smurf detection | Smooth new-player experience | Accelerate only high-confidence detections (>0.60 score) |
| Frequent season resets | Stable long-term progression | Soft reset: increase σ, slightly regress μ toward mean |

### 2.4 Regional Isolation vs Pool Size

| Favor Isolation | Favor Pool Size | Resolution |
|---|---|---|
| Strict regional pools | Global matching | Regional-first with overflow |
| Low latency cap (40ms) | No latency restriction | Adaptive cap: 40ms → 120ms over time |
| Independent region failure domains | Shared infrastructure for efficiency | Independent with cross-region health monitoring |
| Data residency compliance | Global player database | Regional primary with opt-in cross-region play |

---

## 3. Common Trap Questions

### 3.1 Trap: "Just use Elo"

**The trap:** Candidate picks Elo because it's familiar, doesn't address team games, uncertainty, or performance features.

**Strong answer:** "Elo is designed for 1v1 with fixed uncertainty. For team games, we need a system that handles team compositions, tracks uncertainty (σ), and converges quickly for new players. TrueSkill 2 addresses all of these. The key insight is that a new player's σ=350 means their rating changes rapidly, while an established player's σ=40 means their rating is stable—this is not possible with fixed-K Elo."

### 3.2 Trap: "Maximize match quality"

**The trap:** Candidate optimizes purely for quality without considering queue time, leading to infinite queues for outlier players.

**Strong answer:** "There's an inherent tension. A system that maximizes quality will have unacceptable queue times for players outside the peak of the skill bell curve. The key design decision is the expanding window: we start with high quality standards and progressively relax them. The function is configurable per mode—ranked tolerates longer queues for quality, casual prioritizes speed. The quality floor never drops below 0.40, which ensures even degraded matches are better than random."

### 3.3 Trap: "Use a single global matcher"

**The trap:** Candidate proposes a centralized matchmaker for the largest possible pool.

**Strong answer:** "A global matcher maximizes pool size but ignores the most important non-skill factor: latency. A player in Tokyo matched against a player in London will have 200ms+ latency—competitive games become unplayable above 80-100ms. Regional matchers give us latency isolation, fault isolation, and independent scaling. For the top 0.1% where regional pools are too small, we use cross-region overflow as a fallback, not the default."

### 3.4 Trap: "Ban all smurfs"

**The trap:** Candidate takes an aggressive enforcement approach without considering false positives.

**Strong answer:** "Banning has a critical false-positive cost. If we incorrectly ban a legitimate new player who happens to be naturally talented, we've lost a customer and created a PR issue. Instead, the primary response is accelerated convergence—if someone's truly a smurf, they'll be at their correct rank within 5-8 matches. We use banning only for confirmed, repeated smurf account creation (hardware fingerprint matches multiple banned accounts). The philosophy is: minimize disruption to legitimate players, not maximize punishment."

### 3.5 Trap: "Party skill = average of members"

**The trap:** Candidate uses simple average, not accounting for coordination advantages.

**Strong answer:** "Simple averaging underestimates coordinated parties. A 3-stack with voice comms has a significant advantage over 3 random solos of the same skill. We use a weighted formula: 70% average + 30% highest player, plus a synergy bonus that scales with party size. This means a party of 3 Gold players effectively matches as mid-Platinum. We also enforce rank spread limits at higher tiers to prevent boosting through wide-spread parties."

---

## 4. Scoring Rubric

### 4.1 Junior → Senior Differentiators

| Dimension | Junior Response | Senior/Staff Response |
|---|---|---|
| **Rating System** | "Use Elo to rank players" | "TrueSkill 2 with uncertainty tracking, performance features, and mode-specific ratings" |
| **Queue Strategy** | "Find 10 players of similar skill" | "Expanding window with configurable parameters, quality function, starvation prevention" |
| **Concurrency** | "Use a lock on the queue" | "Optimistic concurrency with atomic batch dequeue, conflict detection, and retry" |
| **Scaling** | "Use more servers" | "Regionalized pools with cross-region overflow, pool partitioning by rank tier, predictive auto-scaling" |
| **Fairness** | "Match by skill only" | "Multi-factor quality scoring: skill, latency, party symmetry, role coverage, rematch avoidance" |
| **Failure Handling** | "Retry on failure" | "Replicated queue state, client heartbeats, priority re-queue on server failure, graceful degradation levels" |
| **Trade-offs** | Picks one extreme | "Here's the tension, here's how the expanding window resolves it dynamically" |

### 4.2 What Impresses Interviewers

1. **Immediately identifying queue time vs quality as the core tension** — shows domain understanding
2. **Drawing the expanding window diagram unprompted** — shows you understand the elegant resolution
3. **Mentioning double-matching as a concurrency risk** — shows real-world systems thinking
4. **Discussing perceived vs actual fairness** — shows product awareness beyond engineering
5. **Quantifying the problem** (10M players → 800K in queue → 32K entries/sec) — shows estimation comfort
6. **Acknowledging that top 0.1% is fundamentally hard** — honest about limitations

---

## 5. Follow-Up Deep Dives

### 5.1 If the Interviewer Goes Deeper on Algorithms

Be prepared to discuss:
- **Factor graph basics:** Prior → Performance → Team → Outcome factors, message passing
- **Why Gaussian distribution:** Conjugate prior, closed-form updates, naturally models uncertainty
- **NP-hardness of team formation:** With constraints (parties, roles), optimal team assignment is a variant of balanced partition—show you know greedy heuristic + local search is the practical approach
- **O(n log n) matching with sorted sets:** Binary search to find skill window, not O(n²) pairwise comparison

### 5.2 If the Interviewer Goes Deeper on Operations

Be prepared to discuss:
- **Season start thundering herd:** Staggered rollout, pre-scaling, relaxed thresholds during calibration
- **What happens during a partial outage:** Graceful degradation levels (widen tolerance → disable features → maintenance mode)
- **How to deploy rating algorithm changes safely:** Shadow mode (run new algorithm in parallel, compare outputs, only switch when validated)
- **Monitoring match quality over time:** Stomp rate, win prediction accuracy, player churn after loss streaks

### 5.3 If the Interviewer Goes Deeper on Fairness

Be prepared to discuss:
- **Is a 50% win rate actually fair?** For most players yes, but top players should have >50% (they're better). The system should give them tougher games while still being winnable.
- **How to handle losing streaks:** After 3 losses, consider tilt protection: temporarily give the player a slight skill window bias toward easier matches
- **Role queue impact:** Role queue dramatically increases queue time for popular roles (DPS). How to incentivize tank/support queues without perverse effects.
- **Should smurfs know they're detected?** Transparency vs gaming the detection. Generally: don't tell them, just converge their rating faster.

---

## 6. Extended Problem Variants

### 6.1 Battle Royale Matchmaking (60-100 players per match)

Key differences from 5v5:
- Much larger match size → easier to fill matches, harder to skill-balance all 100 players
- Solo, duo, squad (4) modes all on the same map
- No "teams" in the traditional sense—everyone vs everyone
- Skill bracket lobbies: group by skill tier, fill with bots if needed (battle royale tolerance for bot opponents is higher)
- TrueSkill operates on "placement" (1st-100th) rather than win/loss

### 6.2 1v1 Fighting Game Matchmaking

Key differences:
- Perfect use case for Glicko-2 (1v1 native)
- Much smaller pool per skill bracket (need fewer players per match)
- Latency is critical—fighting games are frame-sensitive (< 50ms max)
- Rematch avoidance is less important (players accept re-facing opponents)
- Connection quality (rollback vs delay netcode) affects acceptable latency bounds

### 6.3 Cross-Platform Matchmaking

Additional considerations:
- Input method fairness (controller vs mouse/keyboard)
- Platform-specific pools by default, cross-platform opt-in
- Skill calibration differs by platform (same player may be Gold on console, Platinum on PC)
- Separate ratings per platform with cross-platform adjustment factor

---

## 7. Red Flags to Avoid

| Red Flag | Why It's Bad | Better Approach |
|---|---|---|
| Jumping to Elo without discussion | Shows lack of awareness of modern rating systems | Acknowledge Elo, explain why TrueSkill 2 is better for team games |
| Ignoring latency entirely | Matchmaking without latency consideration is incomplete | Latency should be a first-class matching criterion alongside skill |
| No mention of parties | Parties are fundamental to multiplayer gaming | Address party handling early, including skill aggregation |
| Proposing real-time optimal matching | NP-hard problem, impractical at scale | Acknowledge the theoretical problem, propose practical heuristics |
| Over-engineering from the start | Adding complexity before establishing the core | Start simple (greedy matching), layer in complexity as requirements demand |
| Ignoring the queue time constraint | Match quality means nothing if players wait 10 minutes | Always tie quality decisions back to queue time impact |
| Treating all modes the same | Ranked ≠ casual ≠ tournament | Show awareness that parameters differ by mode |

---

## 8. Quick Reference: Numbers to Remember

These are useful estimates to cite during an interview to demonstrate quantitative thinking:

| Metric | Value | Source/Derivation |
|---|---|---|
| Concurrent players (major title) | 10M | Industry benchmark for top-tier competitive titles |
| Fraction in queue at any moment | ~8% | Players spend ~25s in queue vs ~25min in-game = 25/(25+1500) ≈ 1.6%, but many queue between games |
| Queue entries per second | 32K | 800K queued ÷ 25s avg queue time |
| Matches formed per minute | 192K | 32K/s ÷ 10 players/match × 60s |
| Rating updates per second | 32K | 10 players per completed match × match rate |
| Match ticket size | ~400 bytes | Player IDs + skill + latency + metadata |
| Queue memory footprint | ~320 MB | 800K tickets × 400B |
| Player skill profile size | ~1.9 KB | 5 modes × 24B ratings + history refs + metadata |
| Match record size | ~2 KB | 10 players × stats + outcome + metadata |
| TrueSkill default μ | 1500 | Industry convention |
| TrueSkill default σ | 350 | High uncertainty for new players |
| TrueSkill σ floor | 25 | Prevents over-confidence |
| Acceptable ping variance | < 30ms | Within a match, for competitive fairness |
| Cross-region latency (NA↔EU) | ~100ms | Transatlantic round-trip |
| Adjacent region latency (NA-E↔NA-W) | ~40-80ms | Cross-continental |
| Matching cycle frequency | 1-2 seconds | Per pool, per match worker |
| Expanding window skill rate | ~3 pts/sec | Widens from ±50 to ±500 over ~150s |
| Season reset σ multiplier | 1.5x | Standard soft reset |
| Smurf convergence target | 5-8 matches | With accelerated σ |
| Top 0.1% global population | ~10K | 10M × 0.001 |
| Top 0.1% in single regional ranked queue | ~15-25 | After region/mode/online-time splits |

---

## 9. Whiteboard Template

If you're drawing on a whiteboard, here's an efficient layout:

```
LEFT SIDE (Architecture):

┌──────────────────────────────────────────────┐
│  [Client] → [API GW] → [Queue Service]      │
│                             │                │
│                    ┌────────┴──────────┐     │
│                    │                   │     │
│              [MW: NA-East]      [MW: EU-West]│
│                    │                   │     │
│                    └────────┬──────────┘     │
│                             │                │
│                    [Server Allocator]         │
│                             │                │
│                    [Game Server]              │
│                             │                │
│                    [Rating Engine]            │
└──────────────────────────────────────────────┘

RIGHT SIDE (Key Concepts):

Expanding Window:
  t=0:  skill ±50,  ping <40ms,  quality >0.70
  t=30: skill ±200, ping <80ms,  quality >0.60
  t=60: skill ±350, ping <120ms, quality >0.50
  t=90: skill ±500, any region,  quality >0.40

TrueSkill 2:
  μ = mean skill (default 1500)
  σ = uncertainty (default 350, floor 25)
  ordinal = μ - 3σ (conservative estimate)

Quality Function:
  Q = 0.40×skill + 0.25×latency + 0.15×party + 0.10×role + 0.10×rematch
```

---

## 10. Mock Interview Dialogue

**Interviewer:** "Design a matchmaking system for a competitive 5v5 shooter."

**Candidate (strong opening):** "Before I start, let me clarify a few things. Are we targeting a specific scale—like a top-tier competitive title with millions of players? And should I include both ranked and casual modes, or focus on one?"

**Interviewer:** "Assume 10 million concurrent players, both ranked and casual."

**Candidate:** "Great. The core challenge here is the fundamental trade-off between queue time and match quality. Let me start with requirements, then the architecture.

For a 5v5 game at this scale, we're looking at roughly 800K players in queue at any instant, forming about 3,200 matches per second. The key non-functional requirements are sub-30-second median queue time and team skill variance under 200 rating points.

The architecture is regionalized—I'll draw the main components. [Draws pipeline.] The flow is: player enters queue via API Gateway, the Queue Service creates a match ticket and places it in a regional pool, Match Workers scan the pool every 1-2 seconds to form matches, the Server Allocator assigns the optimal game server, and after the game ends, the Rating Engine updates player skills.

For the rating system, I'd use TrueSkill 2 rather than Elo because it natively handles team games and tracks uncertainty. Each player has a μ—mean skill, defaulting to 1500—and σ—uncertainty, starting at 350. High σ means big rating changes per match, so new players converge quickly. This also solves smurf detection naturally: a smurf's high σ means they rocket through low tiers in 5-8 matches.

The matching algorithm uses an expanding window. At t=0, I search within ±50 skill points in the player's home region. Every second, the window widens by about 3 rating points, the latency cap increases by 1.5ms, and the quality floor decays slightly. By t=60, I'm searching ±350 across adjacent regions. This elegantly resolves the queue time vs quality trade-off—start strict, relax over time.

For the quality function, I'd use a weighted multi-factor score..."

*This demonstrates: quantitative estimation, correct trade-off identification, appropriate technology choice with justification, and natural progression from requirements to architecture to detail.*
