# Scalability & Reliability

## Scaling Strategy Overview

Stock trading platforms have a unique scaling profile: **predictable daily peaks** (market open/close), **zero tolerance for downtime during market hours**, and a stark difference between market-hours and after-hours load. The scaling strategy must account for the 6.25-hour daily window where availability is non-negotiable.

---

## Horizontal Scaling by Service

### Stateless Services (Scale Freely)

```
API Gateway:
    - Load-balanced across multiple instances
    - Scale based on request rate
    - Peak: 100K+ requests/sec at market open
    - Strategy: pre-provision 3× average capacity; auto-scale for sustained spike

Portfolio & Holdings Service:
    - Read-heavy, database-backed
    - Scale by adding read replicas
    - Cache aggressively (portfolio doesn't change without trades)
    - Peak: 50K requests/sec (users checking positions)

Chart & Historical Data Service:
    - Cacheable responses (OHLCV data is immutable once candle closes)
    - CDN-cacheable for completed candles
    - Scale horizontally behind load balancer
    - Peak: 100K requests/sec (chart renders)

Notification Service:
    - Fully async, event-driven
    - Scale based on event bus consumer lag
    - Spike: 10M+ notifications in first 30 minutes of trading
```

### Stateful Services (Scale with Care)

```
Order Management System (OMS):
    - Stateful per order (order lifecycle must be tracked)
    - Partition by user_id (all orders for a user go to same OMS instance)
    - Consistent hashing for user → OMS instance mapping
    - Number of instances: 20-50 (each handles ~2,500 users' orders/sec at peak)
    - Failover: hot standby per partition with shared PostgreSQL

Risk Engine:
    - Co-located with OMS (same process)
    - State: per-user margin and position data
    - Scales with OMS partitions
    - State recovery: replay from event log on failover

Position Service:
    - Stateful: per-user, per-instrument positions in Redis
    - Redis Cluster: sharded by user_id
    - 6 primary + 6 replica nodes
    - Each node handles ~1M position keys
```

### Exchange-Facing Services (Fixed Scale)

```
Order Gateway (Co-located):
    - Fixed number of FIX sessions per exchange
    - NSE: typically 10-20 FIX sessions per broker
    - Each session: ~5,000 orders/sec capacity
    - Cannot scale beyond exchange-allocated sessions
    - Strategy: use all allocated sessions; round-robin orders across sessions

Market Data Feed Handler:
    - 1 primary + 1 hot standby per exchange
    - Receives full market data feed (cannot partition)
    - Scales vertically: fast CPU, optimized binary parsing
    - Output: multicast to downstream services
```

---

## Market Hours vs. After-Hours Scaling

```
┌─────────────┬──────────────────────────────────────────┐
│ Time        │ Scale Profile                            │
├─────────────┼──────────────────────────────────────────┤
│ 00:00-08:00 │ Minimal: portfolio views, GTT management │
│             │ 5% of peak capacity                      │
│ 08:00-09:00 │ Warm-up: pre-provision to peak capacity  │
│             │ Load caches, warm connections             │
│ 09:00-09:15 │ Pre-market: AMO validation, WebSocket    │
│             │ connect storm begins                     │
│ 09:15-09:20 │ PEAK: 15× normal load, all hands        │
│             │ 100% capacity, backpressure active        │
│ 09:20-15:30 │ Market hours: sustained 2-3× average     │
│             │ 60% capacity, auto-scale ready            │
│ 15:30-16:00 │ Post-market: order cancellations,        │
│             │ final position snapshots                  │
│ 16:00-18:00 │ Settlement: batch reconciliation,        │
│             │ contract note generation                  │
│ 18:00-23:59 │ Low: after-hours AMO, portfolio viewing  │
│             │ 10% capacity, scale down                  │
└─────────────┴──────────────────────────────────────────┘
```

---

## Reliability Architecture

### Availability Target: 99.99% During Market Hours

```
Market hours per year:
    6.25 hours/day × 250 trading days = 1,562.5 hours/year

99.99% uptime during market hours:
    Allowed downtime = 1,562.5 × 0.0001 = 0.156 hours = 9.375 minutes/year

This means: less than 10 minutes of downtime per year during market hours
```

### Redundancy Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Exchange Colo                          │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐                    │
│  │ Feed Handler │    │ Feed Handler │                    │
│  │  (Primary)   │    │  (Standby)   │                    │
│  └──────┬───────┘    └──────┬───────┘                    │
│         │                   │                            │
│  ┌──────┴───────┐    ┌──────┴───────┐                    │
│  │Order Gateway │    │Order Gateway │                    │
│  │  (Primary)   │    │  (Standby)   │                    │
│  └──────┬───────┘    └──────┬───────┘                    │
│         │                   │                            │
│     Leased Line 1      Leased Line 2                     │
│         │                   │                            │
└─────────┼───────────────────┼────────────────────────────┘
          │                   │
┌─────────┼───────────────────┼────────────────────────────┐
│         ▼                   ▼       Broker Data Center   │
│  ┌──────────────┐    ┌──────────────┐                    │
│  │ OMS Cluster  │    │ OMS Cluster  │                    │
│  │  (Active)    │    │  (Standby)   │                    │
│  └──────┬───────┘    └──────┬───────┘                    │
│         │                   │                            │
│  ┌──────┴───────┐    ┌──────┴───────┐                    │
│  │ PostgreSQL   │    │ PostgreSQL   │                    │
│  │  (Primary)   │◄──►│  (Replica)   │                    │
│  └──────────────┘    └──────────────┘                    │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐                    │
│  │ Redis Primary│    │ Redis Replica│                    │
│  └──────────────┘    └──────────────┘                    │
│                                                          │
│  ┌──────────────────────────────────┐                    │
│  │     Ticker Servers (10 nodes)    │                    │
│  │     ~50K connections each        │                    │
│  └──────────────────────────────────┘                    │
└──────────────────────────────────────────────────────────┘
```

### FIX Session Failover

```
Problem: If the primary FIX session to NSE drops, orders cannot be routed

Solution: Hot standby FIX sessions

Primary FIX session:
    - Active, processing orders
    - Heartbeat every 30 seconds
    - Sequence number tracking

Standby FIX session:
    - Connected, authenticated, but not sending orders
    - Receiving market data and execution reports
    - Synchronized sequence numbers

Failover trigger:
    - Primary heartbeat timeout (3 missed heartbeats = 90 seconds)
    - Primary process crash (detected via process monitor)
    - Network link failure (detected via dedicated health check)

Failover process:
    1. Standby detects primary failure
    2. Standby sends FIX Resend Request for any missed messages
    3. Standby begins accepting new orders
    4. OMS redirects order routing to standby
    5. Total failover time: < 5 seconds

Sequence number recovery:
    - FIX protocol requires monotonically increasing sequence numbers
    - On failover: send SequenceReset-GapFill for missed range
    - Exchange acknowledges and allows continued trading
```

### Database Reliability

```
PostgreSQL High Availability:
    - Synchronous replication to standby (zero data loss)
    - Streaming replication to read replicas (< 100ms lag)
    - Connection pooler for connection management
    - WAL archiving for point-in-time recovery

Failure scenarios:
    1. Primary crash → promote synchronous standby (< 30 seconds)
    2. Disk failure → WAL replay on new disk from backup
    3. Data center failure → cross-DC standby promotion (manual, minutes)

Write-Ahead Guarantee:
    Every order is written to WAL before sending to exchange
    On crash recovery: replay WAL to reconstruct order state
    No order is ever lost once acknowledged to the user
```

### Redis Cluster Reliability

```
Redis Cluster (positions, margins, sessions):
    - 6 primary + 6 replica nodes
    - Automatic failover: sentinel-based detection
    - Failover time: < 15 seconds
    - Data persistence: RDB snapshots every 5 minutes + AOF

Position state recovery:
    If Redis state is lost:
    1. Replay trade events from Kafka (from last known checkpoint)
    2. Rebuild position state from trade history
    3. Verify against PostgreSQL trade records
    4. Total recovery: < 2 minutes
```

---

## Graceful Degradation

### Degradation Levels

```
Level 0 (Normal):
    - All services operational
    - Full market data streaming
    - All order types accepted

Level 1 (Elevated Load):
    - Throttle new WebSocket connections (queue with jitter)
    - Reduce market data mode (auto-downgrade "full" → "quote")
    - Prioritize order placement over portfolio queries
    - Disable GTT trigger processing temporarily

Level 2 (Partial Outage):
    - Market data streaming degraded (snapshot mode, every 1s)
    - Only MARKET and LIMIT orders accepted (no bracket/cover)
    - Portfolio views served from cache (may be stale)
    - Disable chart requests (serve cached candles only)

Level 3 (Critical):
    - Order placement only (all other services suspended)
    - Minimal market data (LTP only, no depth)
    - Static holdings page
    - Engage emergency notification to users

Level 4 (Exchange Connectivity Lost):
    - Halt new order acceptance
    - Display "Exchange unreachable" to users
    - Continue displaying last known positions
    - Queued orders held for reconnection
    - Regulatory notification triggered
```

---

## Capacity Planning

### Pre-Provisioning for Known Events

```
Budget Day (Union Budget):
    Expected: 3× normal market-open spike
    Action: pre-provision 5× normal capacity 2 hours before
    Additional: dedicated war room, all-hands engineering

Election Results Day:
    Expected: 5× normal volume, extreme volatility
    Action: pre-provision 8× capacity, circuit breaker awareness
    Additional: extended market hours possible (exchange decision)

IPO Listing Day (popular stock):
    Expected: concentrated volume on single instrument
    Action: pre-provision ticker capacity, increase per-instrument
            subscription limits
    Additional: dedicated market data priority for IPO instrument

F&O Expiry Day (monthly):
    Expected: 2× normal F&O volume, high cancellation rate
    Action: pre-provision OMS capacity, optimize cancel path
    Additional: settlement team on standby
```

### Auto-Scaling Rules

```
Service              Metric            Scale-Up Threshold  Scale-Down Threshold
API Gateway          Request rate      > 50K/sec           < 10K/sec
OMS                  Order queue depth > 1,000             < 100
Ticker               Connection count  > 40K per node      < 20K per node
Portfolio Service    Request rate      > 20K/sec           < 5K/sec
Chart Service        Request rate      > 50K/sec           < 10K/sec

Cooldown: 5 minutes between scale events
Scale-up: immediate (pre-provisioned instances in warm pool)
Scale-down: only during non-market hours (never scale down during 9:15-15:30)
```

---

## Disaster Recovery

```
RPO (Recovery Point Objective):
    Orders/Trades: 0 (zero data loss — synchronous replication)
    Positions: < 1 minute (Redis snapshot + event replay)
    Market data: N/A (re-consumed from exchange feed)
    Historical candles: < 5 minutes (periodic flush to time-series DB)

RTO (Recovery Time Objective):
    Single component failure: < 30 seconds (automatic failover)
    Full data center failure: < 15 minutes (manual switchover)
    Exchange connectivity loss: < 5 seconds (FIX session failover)

Backup Strategy:
    PostgreSQL: continuous WAL archiving + daily full backup
    Redis: RDB snapshots every 5 minutes, AOF for durability
    Time-series DB: daily backup to object storage
    Audit logs: replicated to separate data center in real-time
```
