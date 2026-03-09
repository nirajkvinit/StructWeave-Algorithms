# Scalability & Reliability — WebRTC Infrastructure

## Scalability

### SFU Horizontal Scaling

**Single-Node Capacity:**

A single SFU node with a 10 Gbps NIC can handle approximately 1,000-1,500 concurrent media tracks. The limiting factor is network bandwidth, not CPU (since SFU forwards packets without transcoding). A typical breakdown:

```
10 Gbps NIC capacity
- Reserve 20% for overhead (RTCP, signaling, management): 8 Gbps usable
- Average track bandwidth (mixed audio + video): 1.2 Mbps
- Tracks per node: 8,000 Mbps / 1.2 Mbps ≈ 6,600 track subscriptions
- With fan-out ratio of 5 (each published track forwarded to 5 subscribers):
  Published tracks: 6,600 / 5 ≈ 1,320 published tracks
  Participants (2 tracks each): ~660 participants per node
```

**Room-to-Node Assignment:**

```
FUNCTION assign_room_to_node(room, available_nodes):
    // Filter nodes by region (prefer co-located with first participant)
    regional_nodes = available_nodes.FILTER(n => n.region == room.region)

    // Score each node
    FOR each node IN regional_nodes:
        node.score = compute_score(node):
            capacity_remaining = node.max_tracks - node.current_tracks
            utilization = node.current_tracks / node.max_tracks

            // Prefer nodes with headroom but not empty (warm cache)
            IF utilization < 0.3:
                score = 50 + capacity_remaining * 0.1  // Slightly penalize cold nodes
            ELSE IF utilization < 0.7:
                score = 100 + capacity_remaining * 0.1  // Sweet spot
            ELSE:
                score = capacity_remaining * 0.1  // Avoid near-capacity nodes

    // Select highest scoring node
    selected = regional_nodes.MAX_BY(score)

    // If no regional node has capacity, select from adjacent regions
    IF selected.score < MINIMUM_THRESHOLD:
        selected = find_adjacent_region_node(room.region, available_nodes)

    RETURN selected
```

**Multi-Node Rooms (Room Splitting):**

When a room exceeds a single node's capacity, the SFU system must split the room across multiple nodes:

```
Room with 200 participants:
  Node A (Region US-East): Participants 1-70
  Node B (Region US-East): Participants 71-140
  Node C (Region EU-West): Participants 141-200

Each node:
  - Handles local participants' publish/subscribe
  - Establishes relay connections to other nodes hosting the same room
  - Subscribes to remote tracks that local participants want
  - Publishes local tracks that remote participants want
```

### SFU Cascading Architecture

Cascading enables rooms to span multiple SFU nodes and regions. The key design decisions are: what protocol to use between SFUs, how to manage the topology, and how to handle fault tolerance.

**Cascading Topology Types:**

```
1. Full Mesh (Small Scale):
   Every SFU node connects to every other SFU node in the room.

   Pros: Minimum latency (1 hop between any two nodes)
   Cons: O(N²) connections; doesn't scale beyond ~5 nodes
   Use: Small rooms spanning 2-3 regions

2. Star Topology (Medium Scale):
   One "origin" SFU node acts as the hub; others connect to it.

   Pros: O(N) connections; simple routing
   Cons: Origin is a bottleneck and SPOF; 2-hop latency for edge-to-edge
   Use: Webinar-style rooms with a clear origin (presenter's region)

3. Hierarchical Relay (Large Scale):
   Tree structure with regional hubs that aggregate and redistribute.

   Pros: Efficient bandwidth use; logarithmic hop count
   Cons: Higher latency for leaf-to-leaf; complex topology management
   Use: Livestreams with 10K+ viewers across many regions

4. Intelligent Mesh (Production):
   Dynamic topology that adapts based on subscription patterns.

   Algorithm:
   - Each node independently determines which remote tracks it needs
   - Node fetches tracks from the nearest node that has them
   - If a node has subscribers for a remote track but no relay, it requests one
   - Relay paths are optimized for minimum latency (not minimum hops)
   - Unused relay connections are torn down after 30 seconds of inactivity
```

**Inter-SFU Relay Protocol:**

```
Relay Packet Format:
  [Header: 16 bytes]
    room_id_hash:     4 bytes (fast room lookup)
    track_id:         4 bytes (identifies source track)
    sequence_number:  4 bytes (relay-level sequencing)
    flags:            2 bytes (keyframe, layer_id, priority)
    reserved:         2 bytes
  [RTP Packet: variable]
    Standard RTP header + encrypted payload
    (No SRTP re-encryption needed between trusted servers)

Why not use WebRTC between SFUs:
  - ICE negotiation adds 200-500ms per connection (servers have known IPs)
  - SDP exchange is unnecessary (track capabilities are known)
  - DTLS handshake adds latency (servers use mutual TLS at the transport layer)
  - Custom metadata (track_id, room context) can be embedded in headers
```

### TURN Server Geo-Distribution

**Deployment Strategy:**

```
Tier 1 Regions (always on): 6 locations
  - US-East, US-West, EU-West, EU-Central, APAC-Southeast, APAC-Northeast
  - 20+ TURN servers per region
  - Handles ~80% of global TURN traffic

Tier 2 Regions (demand-based): 8 locations
  - South America, Middle East, India, Australia, Africa, Canada, UK, Japan
  - 5-10 TURN servers per region
  - Auto-scales based on active allocations

TURN Server Selection:
  1. Client sends STUN request to multiple TURN servers (anycast or geo-DNS)
  2. Measure RTT to each server
  3. Select lowest-RTT server for allocation
  4. If allocation fails, try next-closest server
```

**TURN Server Capacity Planning:**

```
Per-server capacity:
  NIC: 10 Gbps
  Usable bandwidth: 8 Gbps (80% of NIC)
  Average relay bandwidth per session: 6.7 Mbps × 2 (ingress + egress) = 13.4 Mbps
  Concurrent sessions per server: 8,000 / 13.4 ≈ 600 sessions
  Memory per allocation: ~10 KB (relay state, permissions, channels)
  Total memory for 600 sessions: ~6 MB (trivial)

  Bottleneck: Network bandwidth, not CPU or memory
```

**TURN Credential Management:**

```
FUNCTION generate_turn_credentials(user_id, ttl=86400):
    timestamp = CURRENT_TIME + ttl
    username = STRING(timestamp) + ":" + user_id
    password = HMAC_SHA1(shared_secret, username)

    RETURN {
        urls: ["turn:turn1.example.com:3478", "turn:turn2.example.com:443?transport=tcp"],
        username: username,
        credential: password,
        credential_type: "password"
    }

// Credentials are time-limited — embedded timestamp checked by TURN server
// No database lookup needed — TURN server can verify HMAC locally
// Shared secret rotated monthly via configuration management
```

### Signaling Server Scaling

**Horizontal Scaling Architecture:**

```
                    Load Balancer
                   (WebSocket-aware,
                    sticky sessions)
                    /     |      \
                   /      |       \
            Sig-1      Sig-2      Sig-3
              |          |          |
              +-----+----+----+-----+
                    |         |
              Message Bus   Session Store
              (Pub/Sub)     (Key-Value)
```

**Scaling Challenges and Solutions:**

| Challenge | Solution |
|---|---|
| WebSocket connections are stateful | Sticky sessions via load balancer (hash participant token) |
| Room events must reach all participants | Pub/sub: each signaling server subscribes to topics for its rooms |
| Signaling server crash | Participant reconnects to any server; session store has room state |
| Hot rooms (1000+ participants) | Shard room across multiple signaling servers; each handles a partition |
| Message ordering | Per-room message sequence numbers; clients reorder on receipt |

**Signaling Message Batching:**

```
FUNCTION batch_room_events(room_id, event):
    // Collect events for 50ms before broadcasting
    room_batch = pending_batches[room_id]
    room_batch.APPEND(event)

    IF NOT room_batch.timer_active:
        room_batch.timer_active = TRUE
        SET_TIMER(50ms, FUNCTION():
            batch = pending_batches[room_id].DRAIN()
            message = {
                type: "batch",
                events: batch,
                seq: room_seq_counter.INCREMENT()
            }

            // Fan-out to all participants in room
            FOR each participant IN room.participants:
                participant.websocket.SEND(message)

            room_batch.timer_active = FALSE
        )
```

---

## Reliability

### Call Recovery on SFU Failure

**Scenario:** An SFU node crashes while hosting 50 active rooms with 500 total participants.

**Recovery Sequence:**

```
1. Detection (< 5 seconds):
   - Health check failure: load balancer marks node unhealthy after 3 failed probes (1s interval)
   - Heartbeat timeout: signaling server detects missing SFU heartbeat after 5 seconds
   - Participant detection: RTCP timeout after 5 seconds of no media

2. Signaling Notification (< 1 second after detection):
   - Signaling server broadcasts "server_migration" event to all affected participants
   - Event includes new SFU node assignment per room

3. Room Re-Assignment (< 2 seconds):
   - Room coordinator selects new SFU nodes for affected rooms
   - Selection prioritizes: same region > adjacent region > any available
   - Rooms are distributed across multiple nodes to avoid cascading failure

4. Participant Reconnection (< 3 seconds):
   - Clients receive "server_migration" event with new SFU endpoint
   - Clients perform ICE restart (re-gather candidates for new SFU address)
   - DTLS handshake with new SFU (new SRTP keys)
   - Republish tracks and resubscribe

5. Media Restoration (< 5 seconds total):
   - First audio packets flow within 1-2 seconds of reconnection
   - Video keyframe requested and received within 3 seconds
   - Full quality restoration within 5 seconds

Total disruption: 5-8 seconds (mostly ICE + DTLS overhead)
```

**Live Migration (Zero-Downtime):**

For planned maintenance or load rebalancing, live migration avoids disruption:

```
FUNCTION live_migrate_room(room, source_node, target_node):
    // Step 1: Set up target node
    target_node.create_room_context(room.id, room.settings)

    // Step 2: Establish inter-node relay
    relay = create_relay(source_node, target_node, room.id)
    // Target node now receives all tracks via relay

    // Step 3: Migrate participants one at a time
    FOR each participant IN room.participants:
        // Signal participant to perform ICE restart to target node
        participant.send_signal({
            type: "migration",
            target_sfu: target_node.address,
            ice_servers: get_ice_servers(target_node.region)
        })

        // Participant connects to target node via ICE restart
        // During transition: participant receives media from source via relay
        // After reconnection: participant receives directly from target

        WAIT_FOR participant.connected_to(target_node) TIMEOUT 10s

        // Remove participant from source node
        source_node.remove_participant(participant.id)

    // Step 4: Tear down relay and source room
    relay.close()
    source_node.close_room(room.id)

// Total migration time: ~30 seconds for a 20-participant room
// Per-participant disruption: < 1 second (ICE restart)
```

### Oeer Reconnection on Network Change

**Mobile Network Handoff (WiFi → Cellular):**

```
FUNCTION handle_network_change(peer_connection):
    // Triggered by ICE connection state change to "disconnected"

    // Step 1: Wait briefly — might be transient
    WAIT 1 second
    IF peer_connection.ice_state == CONNECTED:
        RETURN  // Recovered on its own

    // Step 2: ICE restart
    // Re-gather candidates on new network interface
    new_offer = peer_connection.create_offer({ice_restart: true})
    // New offer has new ice-ufrag and ice-pwd

    // Step 3: Send new offer via signaling
    signaling.send({type: "offer", sdp: new_offer, restart: true})

    // Step 4: Server responds with new answer
    // ICE checks run against new candidates
    // Best new candidate pair is nominated

    // Step 5: DTLS renegotiation (if needed)
    // Existing SRTP keys may be reused if DTLS connection survives

    // Total reconnection time: 1-3 seconds
    // Media gap: 1-3 seconds of silence/freeze
```

**Connection State Machine:**

```
CONNECTED ──(packet timeout 5s)──> DISCONNECTED
     ^                                    |
     |                              (ICE restart)
     |                                    |
     |                                    v
     +────(new pair succeeds)────── RECONNECTING
                                          |
                                    (30s timeout)
                                          |
                                          v
                                       FAILED
                                          |
                                    (full reconnect)
                                          |
                                          v
                                    NEW CONNECTION
```

### Disaster Recovery

**Region-Level Failure Handling:**

```
Scenario: US-East region goes offline (all SFU, TURN, signaling servers)

Impact:
  - Active calls hosted in US-East lose media flow
  - Users worldwide who were connected to US-East SFU nodes are disconnected
  - TURN allocations in US-East become invalid

Recovery:
  1. DNS/Anycast failover routes new connections to next-closest region (< 30 seconds)
  2. Signaling reconnection: clients connect to US-West or EU-West (< 10 seconds)
  3. Room state reconstructed from distributed session store (replicated across regions)
  4. Active calls: participants reconnect to new region's SFU
     - 1:1 calls: both parties reconnect, new ICE negotiation
     - Group calls: participants reconnect individually; room reforms as each joins
  5. TURN: clients re-allocate on TURN servers in available regions

  Total recovery time: 30-60 seconds for most users
  Data loss: active call state (in-flight packets); no persistent data lost
```

**Multi-Region Data Replication:**

```
Component           Replication Strategy              RPO        RTO
Session Store       Multi-region active-active        0          < 5s
Room State          Pub/sub event replay              ~1s        < 10s
TURN Credentials    Shared secret (config-level)      0          0
Recording Egress    Write to regional storage first   0          < 30s
                    then replicate to other regions
User Tokens         Stateless (HMAC verification)     0          0
Metrics/Logs        Async streaming to central store  < 5min     < 1hr
```

---

## Scaling Patterns Summary

| Pattern | Application | Benefit |
|---|---|---|
| **Horizontal SFU scaling** | Add nodes as concurrent tracks increase | Linear capacity growth |
| **SFU cascading mesh** | Large rooms spanning multiple nodes/regions | Room size unbounded by single node |
| **TURN geo-distribution** | Place relay servers near users globally | Minimize relay latency overhead |
| **Signaling sharding** | Distribute WebSocket connections across servers | Handle millions of concurrent connections |
| **Last-N optimization** | Only forward active speakers' video | Dramatic bandwidth reduction in large rooms |
| **Simulcast layer selection** | Match quality to subscriber bandwidth | Efficient bandwidth utilization per subscriber |
| **Connection pooling** | Reuse inter-SFU relay connections | Reduce connection establishment overhead |
| **Graceful degradation** | Audio-only mode when bandwidth is critically low | Maintain communication even in poor conditions |
