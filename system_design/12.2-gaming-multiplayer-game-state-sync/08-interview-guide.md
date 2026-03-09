# Interview Guide

## 1. 45-Minute Pacing Strategy

### 1.1 Recommended Timeline

| Phase | Time | Duration | Focus |
|-------|------|----------|-------|
| **Clarify** | 0:00–3:00 | 3 min | Scope the problem; confirm game type, player count, latency requirements |
| **Requirements** | 3:00–7:00 | 4 min | Functional requirements (state sync, prediction, lag comp); non-functional (tick rate, latency, bandwidth) |
| **High-Level Design** | 7:00–18:00 | 11 min | Architecture diagram; authoritative server model; tick cycle; client prediction flow |
| **Deep Dive** | 18:00–35:00 | 17 min | Pick 2-3 areas: lag compensation, delta compression, interest management |
| **Scaling & Trade-offs** | 35:00–42:00 | 7 min | Fleet management, edge relays, dynamic tick rate, bandwidth budgeting |
| **Wrap-up** | 42:00–45:00 | 3 min | Summarize key decisions; mention observability, anti-cheat, failure modes |

### 1.2 Opening Statement Template

> "I'll design a multiplayer game state synchronization system for a 100-player Battle Royale game. The core challenge is keeping all clients in sync with an authoritative server while masking network latency through client-side prediction — all within strict bandwidth and compute budgets. Let me start by clarifying requirements."

### 1.3 Key Questions to Ask

| Question | Why It Matters |
|----------|---------------|
| "What's the player count per match?" | Determines tick rate feasibility and bandwidth model |
| "What's the target tick rate?" | Defines the entire compute budget |
| "Is this a competitive game? How important is anti-cheat?" | Drives authoritative-server vs. P2P decision |
| "What's the acceptable perceived latency?" | Sets interpolation delay and rewind window |
| "Is there destructible environment?" | Adds significant state replication complexity |
| "Do we need replay/spectator support?" | Adds recording and delayed-stream requirements |

---

## 2. Trap Questions and How to Handle Them

### 2.1 "Why not use TCP?"

**The Trap**: Candidate says "UDP is faster" without explaining *why* for this use case.

**Strong Answer**:
> "TCP has head-of-line blocking — if one packet is lost, all subsequent data waits for retransmission, even though we've already received newer state that supersedes the lost data. For game state, a missed snapshot at tick 100 is irrelevant once tick 101's snapshot arrives. We want to drop stale data, not wait for it.
>
> Additionally, TCP's congestion control can throttle below our minimum send rate during congestion, while we need guaranteed bandwidth for game responsiveness. We build a custom reliability layer on UDP: unreliable-sequenced for state (drop stale), reliable-ordered for events (kills, score changes)."

### 2.2 "Why not peer-to-peer? It eliminates server latency."

**The Trap**: Candidate dismisses P2P entirely or only mentions cheating.

**Strong Answer**:
> "P2P has lower latency for 2 players, but doesn't scale to 100 players — you'd need N² connections. More critically, with 100 untrusted clients, there's no single source of truth. Any client could modify their local state (speed hacks, damage manipulation) and there's no authority to reject it.
>
> For a competitive game, we need server authority. The added RTT to the server is compensated by client-side prediction — your own character moves instantly, and reconciliation corrections are typically invisible."

### 2.3 "Can you just send the full game state every tick?"

**The Trap**: Tests understanding of bandwidth constraints.

**Strong Answer**:
> "Let's do the math. 100 players × 200 bytes state each = 20 KB per tick. At 60 Hz, that's 1.2 MB/s raw. Sending to 100 clients: 120 MB/s — far exceeding typical game server bandwidth.
>
> Instead, we use three techniques: (1) interest management reduces relevant entities from 100 to ~30-50 per client, (2) delta compression sends only changes since the last acknowledged snapshot (typically 70% reduction), and (3) quantization reduces float precision to the minimum perceptible (position in 20 bits instead of 32). Combined, we get ~10-30 KB/s per client."

### 2.4 "What happens when the server crashes mid-match?"

**The Trap**: Candidate tries to design a distributed, fault-tolerant game server.

**Strong Answer**:
> "Unlike a database or web service, a game match is an ephemeral session lasting 15-30 minutes. Building hot standby replicas for each match would double server costs for a transient workload. Instead, we accept that a server crash terminates the match — players return to lobby and queue again.
>
> The mitigation is at the fleet level: high match completion rates (target 99.5%), monitoring for crash patterns, and rapid fleet scaling so new matches are immediately available. For long-running sessions (creative modes), we can implement live server migration, but this is not justified for standard Battle Royale matches."

### 2.5 "How do you prevent wallhacks?"

**The Trap**: Candidate says "encrypt the packets" (wallhacks read client memory, not network).

**Strong Answer**:
> "Encrypting packets doesn't help — the wallhack reads data from the game client's memory after it's decrypted. The real defense is *not sending the data at all*. Through interest management with visibility filtering, we only replicate enemy positions to a client when that enemy is within line-of-sight (plus a short linger period to prevent pop-in).
>
> If the server never sends an enemy's position when they're behind a wall, no amount of client-side hacking can reveal them. The trade-off is that line-of-sight checks are expensive — we optimize with spatial pre-filtering and cached results."

### 2.6 "Why not make the simulation deterministic and just sync inputs?"

**The Trap**: Tests understanding of deterministic lockstep limitations.

**Strong Answer**:
> "Deterministic lockstep works well for RTS games with few players, but has three critical issues for our use case. First, it requires *bitwise-identical* simulation across all platforms — different CPUs, GPUs, and compilers produce different floating-point results, making this nearly impossible with physics engines. Second, it doesn't scale beyond ~8-16 players because everyone must receive everyone else's inputs before advancing. Third, late joins and reconnections require replaying the entire match history from the beginning, which is impractical for a 30-minute match.
>
> State synchronization with an authoritative server avoids all three: no determinism requirement, scales to 100+ players, and supports reconnection via full state snapshot."

---

## 3. Deep Dive Discussion Points

### 3.1 How to Navigate Deep Dive Selection

When the interviewer asks to go deeper, prioritize based on their interest signals. The three strongest deep-dive areas are:

| Topic | Best For | Opens Discussion On |
|-------|----------|-------------------|
| **Lag Compensation** | Demonstrating real-time systems expertise | Rewind/replay, consistency vs. fairness, peeker's advantage |
| **Delta Compression** | Demonstrating systems engineering | Bandwidth budgeting, quantization, per-client baseline management |
| **Interest Management** | Demonstrating scalability thinking | Spatial partitioning, priority accumulators, wallhack prevention |

### 3.2 Lag Compensation Deep Dive Script

> "Let me walk through how we handle hit detection for a player with 100ms RTT.
>
> When Player B fires, they see Player A at where A was about 100ms ago (50ms one-way latency + 50ms interpolation delay). Their input travels to the server — another 50ms. So by the time the server processes the shot, Player A has moved about 150ms ahead of where B saw them.
>
> The server maintains a ring buffer of world state snapshots — the last 256 ticks. On receiving B's fire event, the server calculates B's perceived time: current tick minus B's half-RTT minus interpolation delay. It then retrieves the historical world state from that tick and performs hit detection against Player A's hitbox *at the position B saw them*.
>
> This 'favor-the-shooter' model means that if it looked like a hit on your screen, it registers as a hit — within a 200ms cap. The trade-off is 'peeker's advantage': the peeking player sees the target before the target sees them, giving a timing edge proportional to the combined latency."

### 3.3 Delta Compression Deep Dive Script

> "Each client tracks an independent 'baseline' — the tick number of the last snapshot they acknowledged. The server can only delta-encode relative to a baseline the client confirmed receiving.
>
> For a client with 30ms RTT, their baseline might be 2-3 ticks old, so deltas are small. For a client with 200ms RTT, the baseline could be 12 ticks old, accumulating more changes and producing larger deltas.
>
> The compression pipeline has three stages: first, quantization reduces floating-point values to fixed-point with minimum necessary bits — position uses 20 bits per axis instead of 32, rotation uses the 'smallest three' technique with 29 bits total. Second, delta encoding compares each field against the baseline and only transmits changes — typically 30% of fields change per tick. Third, bit-packing eliminates padding between fields.
>
> Overall: 100 bytes raw → 60 bytes after quantization → 18 bytes after delta → 14 bytes after bit-packing. That's 86% compression."

---

## 4. Trade-Off Discussions

### 4.1 Bandwidth vs. Accuracy

| Approach | Bandwidth | Accuracy | When to Choose |
|----------|-----------|----------|----------------|
| **Full state every tick** | Very high (~1 MB/s per client) | Perfect | LAN tournaments only |
| **Delta compression** | Low (~10 KB/s) | High (quantization artifacts) | Standard competitive play |
| **Aggressive LoD** | Very low (~3 KB/s) | Reduced for distant entities | Mobile / low-bandwidth clients |
| **Input-only sync** | Minimal (~1 KB/s) | Perfect if deterministic | RTS games, small player count |

> "The right point depends on the minimum acceptable quality. For a competitive shooter, we need ~30 updates/second for nearby players with position precision of ~3cm. That dictates ~30 Kbps baseline. We can reduce distant entity updates to 3-6 Hz with coarser quantization, saving ~40% bandwidth without perceptible quality loss."

### 4.2 Tick Rate vs. Server Cost

| Tick Rate | Server CPU Use | Feel | Cost Implication |
|-----------|---------------|------|-----------------|
| **20 Hz** | Low | Acceptable for casual / early-game | Baseline cost |
| **30 Hz** | Medium | Good for most gameplay | +50% CPU vs. 20 Hz |
| **60 Hz** | High | Excellent for competitive | +200% CPU vs. 20 Hz |
| **128 Hz** | Very high | Tournament-grade precision | +540% CPU vs. 20 Hz |

> "This is where dynamic tick rate shines. Starting at 20 Hz with 100 players and ramping to 60 Hz as players are eliminated means we spend CPU budget where it matters most — the intense late-game fights. Over a full match, this averages ~35 Hz effective, saving ~40% vs. a constant 60 Hz."

### 4.3 Prediction Quality vs. Correction Jarring

| Strategy | Prediction Quality | Correction Visibility | Trade-off |
|----------|-------------------|-----------------------|-----------|
| **Aggressive prediction** | Moves feel instant | Larger corrections when wrong | Best feel, worst corrections |
| **Conservative prediction** | Slight input delay | Smaller corrections | Worse feel, better corrections |
| **Blended** | Near-instant with slight damping | Medium corrections, smoothed | Balanced — industry standard |

> "The key insight is that correction *smoothing* matters more than correction *magnitude*. A 2-unit correction applied over 200ms is invisible, while a 0.5-unit instant snap is jarring. We interpolate corrections over 100-200ms, which hides most mispredictions from the player."

### 4.4 Favor-the-Shooter vs. Favor-the-Defender

| Model | Description | Pro | Con |
|-------|-------------|-----|-----|
| **Favor-the-Shooter** | Hits validated against shooter's perceived time | Shooting feels responsive | "I was behind cover!" — defender frustration |
| **Favor-the-Defender** | No rewind; shooter must lead targets | Current position always authoritative | "I clearly hit them!" — shooter frustration |
| **Hybrid** | Rewind with reduced window (100ms cap) | Compromise | Neither side fully satisfied |

> "Most successful competitive games favor the shooter with a capped rewind window (150-200ms). The reason: shooters actively aim and time their shots, so denying clear hits feels worse than the occasional 'shot behind cover' experience. The cap prevents abuse by artificially high-latency clients."

---

## 5. Common Mistakes to Avoid

### 5.1 Architecture Mistakes

| Mistake | Why It's Wrong | Correct Approach |
|---------|---------------|-----------------|
| Using TCP for game state | Head-of-line blocking kills responsiveness | UDP with custom reliability layer |
| Sending full state every tick | Exceeds bandwidth budget by 10-50× | Delta compression + interest management |
| Single global server | Unacceptable latency for distant players | Regional fleet with edge relays |
| Treating it like a web service | Request/response model doesn't fit | Continuous streaming with fixed-timestep simulation |
| Designing fault-tolerant game servers | Over-engineering for ephemeral sessions | Accept match loss; invest in fleet reliability |

### 5.2 Conceptual Mistakes

| Mistake | Why It's Wrong | Correct Understanding |
|---------|---------------|----------------------|
| "Client prediction predicts the future" | Prediction means the client predicts the *server's* result for its own inputs | Client applies its own inputs locally; reconciles against server state |
| "Interpolation adds latency" | Interpolation doesn't add latency — it smooths already-present latency | It converts discretized server updates into smooth motion at the rendering frame rate |
| "Higher tick rate is always better" | Diminishing returns; most humans can't perceive beyond 60-128 Hz | Balance tick rate against CPU cost and player count |
| "Encryption prevents cheating" | Cheats run on the client, after decryption | Server authority + interest management is the real defense |

---

## 6. Scoring Rubric (What Interviewers Look For)

### 6.1 Junior Level (Entry → Meets Bar)

- [x] Identifies need for authoritative server
- [x] Understands client-server RTT problem
- [x] Mentions client-side prediction conceptually
- [x] Acknowledges bandwidth constraints
- [x] Draws basic architecture diagram

### 6.2 Senior Level (Strong Hire)

- [x] Explains full prediction + reconciliation cycle
- [x] Designs delta compression pipeline with math
- [x] Articulates lag compensation with rewind
- [x] Calculates bandwidth budget per player
- [x] Discusses interest management strategies
- [x] Makes informed UDP vs. TCP decision with reasoning
- [x] Discusses tick rate trade-offs

### 6.3 Staff Level (Exceptional)

- [x] Designs dynamic tick rate system with phase-awareness
- [x] Explains priority accumulator for fair bandwidth allocation
- [x] Discusses wallhack prevention via server-side visibility filtering
- [x] Analyzes serialization bottleneck and parallelization strategy
- [x] Proposes edge relay architecture for global latency optimization
- [x] Discusses human perception thresholds as SLAs
- [x] Connects technical decisions to player experience metrics

---

## 7. Variant Questions

### 7.1 Common Variations

| Variant | Key Difference from Base Design |
|---------|-------------------------------|
| **"Design a fighting game netcode"** | 1v1; rollback netcode (re-simulate on rollback); tight latency (<50ms); deterministic possible |
| **"Design an MMO world sync"** | Persistent world; spatial sharding across servers; thousands of concurrent players per shard |
| **"Design a racing game sync"** | Continuous high-speed movement; dead reckoning critical; collision resolution for close contacts |
| **"Design a turn-based multiplayer game"** | No real-time sync needed; action validation only; can use TCP; much simpler |
| **"Design a real-time strategy game sync"** | Deterministic lockstep viable; send inputs only; thousands of units but few players |

### 7.2 Follow-Up Questions to Prepare For

| Question | Key Points |
|----------|-----------|
| "How would you handle 200 players?" | Spatial sharding; split map across servers; boundary entity replication |
| "How would you support spectators at scale?" | Delayed stream (30s); spectator server re-broadcasts; CDN for esports |
| "How would you implement a kill cam?" | Extract 5s replay segment around kill event; re-render from victim's POV |
| "How would you handle cross-platform play?" | Input device detection; aim assist balancing; shared matchmaking with opt-in |
| "How would you reduce infrastructure cost by 50%?" | Dynamic tick rate; spot instances; regional consolidation during off-peak; aggressive compression |
