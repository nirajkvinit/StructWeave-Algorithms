# Low-Level Design — RTB System

## 1. OpenRTB Bid Request Schema

### 1.1 Bid Request Structure

The OpenRTB 2.6 bid request is a hierarchical JSON object. Below is the simplified schema with the most critical fields for system design discussion.

```
BidRequest
├── id: string              // Unique auction ID
├── imp[]                   // Array of impression opportunities
│   ├── id: string          // Impression ID within this request
│   ├── banner              // Banner format details
│   │   ├── w: int          // Width in pixels
│   │   ├── h: int          // Height in pixels
│   │   └── pos: int        // Ad position (above fold, below fold)
│   ├── video               // Video format details
│   │   ├── mimes[]         // Supported MIME types
│   │   ├── maxduration     // Max video duration (seconds)
│   │   └── protocols[]     // Supported protocols (VAST 4.x)
│   ├── bidfloor: float     // Minimum bid price (CPM)
│   ├── bidfloorcur: string // Floor currency (default "USD")
│   └── pmp                 // Private marketplace deals
│       └── deals[]
│           ├── id: string  // Deal ID
│           ├── bidfloor    // Deal-specific floor
│           └── at: int     // Auction type for this deal
├── site                    // Web context (mutually exclusive with app)
│   ├── domain: string      // Publisher domain
│   ├── page: string        // Page URL
│   ├── cat[]               // IAB content categories
│   └── publisher
│       └── id: string      // Publisher ID
├── app                     // Mobile app context
│   ├── bundle: string      // App bundle ID
│   ├── storeurl: string    // App store URL
│   └── cat[]               // IAB content categories
├── device
│   ├── ua: string          // User agent
│   ├── ip: string          // IPv4 address (truncated for privacy)
│   ├── geo                 // Geographic data
│   │   ├── country         // ISO-3166-1 Alpha-3
│   │   ├── region          // Region code
│   │   └── city            // City name
│   ├── devicetype: int     // Mobile, tablet, desktop, CTV
│   └── os: string          // Operating system
├── user
│   ├── id: string          // Exchange-specific user ID
│   ├── buyeruid: string    // DSP-specific user ID (cookie sync)
│   ├── data[]              // User segments from data providers
│   └── consent: string     // GDPR consent string (TCF 2.0)
├── regs                    // Regulatory signals
│   ├── coppa: int          // COPPA flag
│   └── gdpr: int           // GDPR applies flag
└── source
    └── schain              // SupplyChain object for transparency
        └── nodes[]
            ├── asi: string // Seller's ads.txt domain
            ├── sid: string // Seller ID
            └── hp: int     // Payment handled by this node
```

### 1.2 Bid Response Structure

```
BidResponse
├── id: string              // Echo back the BidRequest.id
├── seatbid[]               // Bids grouped by seat (advertiser account)
│   ├── seat: string        // Buyer seat ID
│   └── bid[]
│       ├── id: string      // Bid ID
│       ├── impid: string   // Maps to BidRequest.imp[].id
│       ├── price: float    // Bid price (CPM)
│       ├── adid: string    // Pre-registered creative ID
│       ├── nurl: string    // Win notice URL (exchange calls on win)
│       ├── lurl: string    // Loss notice URL
│       ├── adm: string     // Ad markup (HTML/VAST/Native JSON)
│       ├── adomain[]       // Advertiser domains for blocklist check
│       ├── crid: string    // Creative ID for reporting
│       ├── w: int          // Creative width
│       ├── h: int          // Creative height
│       └── dealid: string  // Deal ID if responding to PMP deal
└── cur: string             // Bid currency
```

---

## 2. Data Models

### 2.1 Campaign Hierarchy

```
Advertiser (1) ──→ (N) Campaign ──→ (N) AdGroup ──→ (N) Creative
                       │                   │
                       ├── Budget           ├── Targeting Rules
                       ├── Flight Dates     ├── Bid Strategy
                       ├── Pacing Strategy  └── Frequency Cap
                       └── Daily Cap

Advertiser
├── id: UUID
├── name: string
├── domain: string
├── category: IABCategory
├── billing_account_id: UUID
└── status: ACTIVE | PAUSED | SUSPENDED

Campaign
├── id: UUID
├── advertiser_id: UUID (FK)
├── name: string
├── objective: AWARENESS | TRAFFIC | CONVERSIONS
├── lifetime_budget: decimal
├── daily_budget: decimal
├── spent_lifetime: decimal
├── spent_today: decimal
├── pacing_strategy: EVEN | ACCELERATED | FRONT_LOADED
├── start_date: timestamp
├── end_date: timestamp
├── status: ACTIVE | PAUSED | COMPLETED | DRAFT
└── created_at: timestamp

AdGroup
├── id: UUID
├── campaign_id: UUID (FK)
├── name: string
├── bid_strategy: MAX_CLICKS | MAX_CONVERSIONS | TARGET_CPA | MANUAL_CPM
├── bid_amount: decimal          // Manual bid or target CPA
├── bid_modifier_geo: map        // Geo-based bid adjustments
├── bid_modifier_device: map     // Device-based bid adjustments
├── frequency_cap_impressions: int
├── frequency_cap_window_hours: int
├── daypart_schedule: bitmap     // 168 bits (24h × 7 days)
└── status: ACTIVE | PAUSED

TargetingRule
├── id: UUID
├── ad_group_id: UUID (FK)
├── dimension: GEO | DEVICE | OS | BROWSER | CATEGORY | AUDIENCE | DEAL
├── operator: INCLUDE | EXCLUDE
└── values: string[]             // e.g., ["US", "CA", "UK"] for geo

Creative
├── id: UUID
├── ad_group_id: UUID (FK)
├── format: BANNER | VIDEO | NATIVE
├── width: int
├── height: int
├── markup: text                 // HTML/VAST/Native JSON template
├── landing_url: string
├── review_status: PENDING | APPROVED | REJECTED
├── iab_categories: string[]
└── adomain: string              // Advertiser domain for blocklists
```

### 2.2 Impression Event Schema

```
ImpressionEvent
├── event_id: UUID               // Globally unique, idempotency key
├── auction_id: string           // From BidRequest.id
├── impression_id: string        // From BidRequest.imp[].id
├── timestamp: epoch_ms
├── dsp_id: string
├── campaign_id: UUID
├── ad_group_id: UUID
├── creative_id: UUID
├── bid_price_cpm: decimal       // What DSP bid
├── settlement_price_cpm: decimal // What DSP pays (first-price = bid)
├── publisher_domain: string
├── page_url: string
├── device_type: string
├── geo_country: string
├── geo_region: string
├── user_id_hashed: string       // Privacy-safe hashed identifier
├── is_viewable: boolean         // Updated async when viewability confirmed
├── fraud_score: float           // IVT probability from fraud detector
└── deal_id: string              // Null for open exchange
```

### 2.3 Budget Ledger

```
BudgetLedger
├── campaign_id: UUID (PK)
├── date: date (PK)
├── daily_budget: decimal
├── daily_spend: decimal         // Monotonically increasing counter
├── lifetime_budget: decimal
├── lifetime_spend: decimal
├── last_updated: timestamp
├── pacing_multiplier: float     // Current PID output (0.0 to 2.0)
└── version: int                 // Optimistic concurrency control

BudgetTransaction
├── tx_id: UUID
├── campaign_id: UUID
├── amount_cpm: decimal
├── impression_id: string
├── bidder_node_id: string       // Which bidder committed this spend
├── timestamp: epoch_ms
└── reconciled: boolean          // Post-reconciliation flag
```

---

## 3. API Design

### 3.1 Bid Endpoint (Exchange → DSP)

```
POST /bid
Content-Type: application/json
x-openrtb-version: 2.6

Request:  OpenRTB BidRequest (see schema above)
Response: OpenRTB BidResponse (see schema above)

Success: HTTP 200 with BidResponse body
No-Bid:  HTTP 204 (no content)
Error:   HTTP 400 (malformed request) — never retry

Timeout: 80-120ms (configured per DSP by exchange)
```

### 3.2 Win/Loss Notice Endpoints

```
Win Notice (Exchange → DSP):
  GET {nurl}?auction_id={id}&price=${AUCTION_PRICE}&currency=USD
  — Exchange replaces ${AUCTION_PRICE} macro with settlement price
  — DSP records win, triggers budget deduction

Loss Notice (Exchange → DSP):
  GET {lurl}?auction_id={id}&reason={AUCTION_LOSS}
  — Loss reasons: 1=internal_error, 2=imp_expired, 3=invalid_bid,
    100=bid_below_floor, 101=outbid, 102=lost_to_deal
  — DSP uses loss data for bid shading model training
```

### 3.3 Campaign Management API

```
Campaigns:
  GET    /api/v1/campaigns                    — List campaigns (paginated)
  POST   /api/v1/campaigns                    — Create campaign
  GET    /api/v1/campaigns/{id}               — Get campaign details
  PUT    /api/v1/campaigns/{id}               — Update campaign
  PATCH  /api/v1/campaigns/{id}/status        — Pause/resume/archive
  GET    /api/v1/campaigns/{id}/stats         — Campaign performance metrics

AdGroups:
  GET    /api/v1/campaigns/{id}/adgroups      — List ad groups
  POST   /api/v1/campaigns/{id}/adgroups      — Create ad group
  PUT    /api/v1/adgroups/{id}                — Update ad group
  PUT    /api/v1/adgroups/{id}/targeting      — Update targeting rules

Creatives:
  POST   /api/v1/adgroups/{id}/creatives      — Upload creative
  GET    /api/v1/creatives/{id}/review-status  — Check creative review

Reporting:
  POST   /api/v1/reports                       — Generate report
  GET    /api/v1/reports/{id}                  — Fetch report results
  GET    /api/v1/campaigns/{id}/realtime       — Live metrics stream (SSE)
```

---

## 4. Core Algorithms

### 4.1 First-Price Auction (Exchange Side)

```
FUNCTION RunAuction(bidRequest, bidResponses[], floorPrice):
    validBids = []

    FOR EACH response IN bidResponses:
        FOR EACH seatbid IN response.seatbid:
            FOR EACH bid IN seatbid.bid:
                // Validate bid
                IF bid.price < floorPrice:
                    CONTINUE                        // Below floor
                IF bid.adomain IN publisher.blocklist:
                    CONTINUE                        // Blocked advertiser
                IF NOT IsCreativeApproved(bid.crid):
                    CONTINUE                        // Unapproved creative
                IF bid.w != impression.w OR bid.h != impression.h:
                    CONTINUE                        // Size mismatch

                validBids.APPEND(bid)

    IF validBids IS EMPTY:
        RETURN NoBidResult                          // No eligible bids

    // Sort by price descending
    SORT validBids BY price DESC

    winner = validBids[0]

    // First-price: settlement = bid price
    settlementPrice = winner.price

    // Apply exchange fee (typically 10-20%)
    publisherRevenue = settlementPrice × (1 - exchangeFee)

    // Send win notice asynchronously
    ASYNC SendWinNotice(winner.nurl, settlementPrice)

    // Send loss notices to all losers
    FOR EACH loser IN validBids[1:]:
        ASYNC SendLossNotice(loser.lurl, REASON_OUTBID)

    RETURN AuctionResult(winner, settlementPrice, publisherRevenue)
```

### 4.2 Bid Price Calculation (DSP Side)

```
FUNCTION CalculateBid(bidRequest, campaign, adGroup, userFeatures):
    // Step 1: Predict engagement probability
    features = ExtractFeatures(bidRequest, userFeatures)
    pCTR = MLService.PredictCTR(features)        // P(click | impression)
    pCVR = MLService.PredictCVR(features)         // P(conversion | click)

    // Step 2: Calculate expected value based on bid strategy
    IF adGroup.bidStrategy == TARGET_CPA:
        // Expected value = P(conversion) × target CPA value
        expectedValue = pCTR × pCVR × adGroup.targetCPA
    ELSE IF adGroup.bidStrategy == MAX_CLICKS:
        // Bid proportional to CTR, scaled by daily budget
        expectedValue = pCTR × adGroup.dailyBudget / expectedDailyImpressions
    ELSE IF adGroup.bidStrategy == MANUAL_CPM:
        expectedValue = adGroup.manualBidCPM / 1000

    // Step 3: Apply budget pacing multiplier
    pacingMultiplier = BudgetPacer.GetMultiplier(campaign.id)
    // pacingMultiplier ranges 0.0 (stop) to 2.0 (accelerate)

    bidPrice = expectedValue × pacingMultiplier

    // Step 4: Apply bid modifiers
    bidPrice = bidPrice × GetGeoModifier(bidRequest.device.geo)
    bidPrice = bidPrice × GetDeviceModifier(bidRequest.device.devicetype)
    bidPrice = bidPrice × GetDaypartModifier(currentHour)

    // Step 5: Apply bid shading (first-price auction optimization)
    shadedBid = BidShader.Shade(bidPrice, bidRequest.imp.bidfloor)

    // Step 6: Enforce floor and ceiling
    finalBid = MAX(shadedBid, bidRequest.imp.bidfloor + 0.01)
    finalBid = MIN(finalBid, campaign.maxBidCPM)

    RETURN finalBid
```

### 4.3 Budget Pacing — PID Controller

```
// PID controller adjusts bid multiplier to pace spend evenly across the day
// Runs every T seconds (e.g., T = 60 seconds)

FUNCTION UpdatePacingMultiplier(campaign):
    currentHour = GetCurrentHour(campaign.timezone)
    elapsedFraction = currentHour / 24.0

    // Target: spend should be proportional to time elapsed
    targetSpend = campaign.dailyBudget × elapsedFraction
    actualSpend = campaign.spentToday

    // Error: positive means underspending, negative means overspending
    error = targetSpend - actualSpend
    normalizedError = error / campaign.dailyBudget    // Normalize to [-1, 1]

    // PID terms
    P = Kp × normalizedError                          // Proportional
    I = Ki × campaign.cumulativeError                  // Integral (accumulated)
    D = Kd × (normalizedError - campaign.prevError) / T  // Derivative

    // Update state
    campaign.cumulativeError += normalizedError × T
    campaign.cumulativeError = CLAMP(campaign.cumulativeError, -I_MAX, I_MAX)
    campaign.prevError = normalizedError

    // Compute multiplier
    rawMultiplier = 1.0 + P + I + D

    // Clamp to safe range
    multiplier = CLAMP(rawMultiplier, 0.05, 2.0)

    // Hard stop: if daily budget exhausted
    IF actualSpend >= campaign.dailyBudget × 1.02:
        multiplier = 0.0                              // Stop bidding

    campaign.pacingMultiplier = multiplier

    // Tuning constants (typical values):
    // Kp = 2.0  (aggressive response to current error)
    // Ki = 0.1  (slow correction of accumulated drift)
    // Kd = 0.5  (dampen oscillations)
    // I_MAX = 5.0  (prevent integral windup)
```

### 4.4 Bid Shading Algorithm

```
// Bid shading reduces first-price bids toward estimated market price
// to avoid overpayment while maintaining competitive win rate

FUNCTION ShadeBid(rawBid, floorPrice, marketFeatures):
    // Estimate the "market clearing price" — what the second-highest
    // bidder would have paid in a second-price auction

    // Features: publisher, ad format, geo, time-of-day, device
    estimatedSecondPrice = WinPriceModel.Predict(marketFeatures)

    // Shading target: weighted blend between raw bid and estimated 2nd price
    // alpha closer to 0 = more aggressive shading (lower bids)
    // alpha closer to 1 = less shading (bid closer to true value)
    alpha = GetShadingAlpha(campaign.winRateTarget, currentWinRate)

    shadedBid = alpha × rawBid + (1 - alpha) × estimatedSecondPrice

    // Never shade below floor
    shadedBid = MAX(shadedBid, floorPrice + 0.01)

    // Never shade above raw bid (shading only reduces)
    shadedBid = MIN(shadedBid, rawBid)

    RETURN shadedBid

FUNCTION GetShadingAlpha(targetWinRate, currentWinRate):
    // If winning too much → shade more aggressively (lower alpha)
    // If winning too little → shade less (higher alpha)
    IF currentWinRate > targetWinRate × 1.2:
        RETURN 0.3    // Aggressive shading — likely overpaying
    ELSE IF currentWinRate < targetWinRate × 0.8:
        RETURN 0.8    // Minimal shading — need more wins
    ELSE:
        RETURN 0.5    // Balanced
```

### 4.5 Frequency Capping

```
FUNCTION CheckFrequencyCap(userId, campaignId, adGroupId):
    // Distributed approximate counter using probabilistic data structure

    capKey = HASH(userId + "|" + adGroupId)
    windowStart = FloorToHour(NOW()) - adGroup.frequencyCapWindowHours × HOUR

    // Lookup in distributed counter store (sub-ms latency)
    impressionCount = FrequencyStore.GetCount(capKey, windowStart, NOW())

    IF impressionCount >= adGroup.frequencyCapImpressions:
        RETURN CAPPED    // Do not bid

    RETURN ELIGIBLE      // OK to bid

    // Note: Count is eventually consistent across bidder nodes.
    // Brief over-delivery (1-2 extra impressions) is acceptable.
    // Post-reconciliation adjusts counts every 60 seconds.

FUNCTION IncrementFrequencyCount(userId, adGroupId, impressionId):
    // Called asynchronously after win notification
    capKey = HASH(userId + "|" + adGroupId)
    FrequencyStore.Increment(capKey, NOW(), impressionId)
    // impressionId used for deduplication (at-least-once delivery)
```

---

## 5. Targeting Evaluation Pipeline

```
FUNCTION EvaluateTargeting(bidRequest, campaigns[]):
    eligibleCampaigns = []

    // Layer 1: Index-based pre-filtering (sub-ms)
    // Uses inverted indexes: geo → campaigns, format → campaigns
    geoMatches = GeoIndex.Lookup(bidRequest.device.geo.country)
    formatMatches = FormatIndex.Lookup(bidRequest.imp[0].banner OR video)
    candidates = geoMatches INTERSECT formatMatches

    // Layer 2: Rule evaluation (per campaign)
    FOR EACH campaign IN candidates:
        IF campaign.status != ACTIVE: CONTINUE
        IF campaign.spentToday >= campaign.dailyBudget: CONTINUE
        IF NOT InFlightDates(campaign): CONTINUE

        FOR EACH adGroup IN campaign.adGroups:
            IF NOT EvaluateTargetingRules(adGroup.rules, bidRequest):
                CONTINUE
            IF NOT InDaypartWindow(adGroup.daypartSchedule):
                CONTINUE
            IF CheckFrequencyCap(bidRequest.user.buyeruid, campaign.id, adGroup.id) == CAPPED:
                CONTINUE

            eligibleCampaigns.APPEND((campaign, adGroup))

    // Layer 3: Rank by expected value (parallelized ML inference)
    scored = []
    FOR EACH (campaign, adGroup) IN eligibleCampaigns:
        score = PredictValue(bidRequest, campaign, adGroup)
        scored.APPEND((campaign, adGroup, score))

    // Return top candidate (highest expected value)
    SORT scored BY score DESC
    RETURN scored[0] IF scored IS NOT EMPTY ELSE NULL
```

---

## 6. Feature Store Schema

The feature store serves pre-computed features for real-time ML inference.

```
UserProfile (key: user_id_hash)
├── segments: string[]           // Audience segment IDs
├── interest_vector: float[128]  // Embedding from browsing history
├── recency_scores: map          // category → days_since_last_visit
├── device_history: string[]     // Known device types
├── geo_history: string[]        // Frequently seen geos
├── conversion_history: map      // advertiser_id → conversion_count
└── ttl: 30 days

ContextualFeatures (key: page_url_hash)
├── iab_categories: string[]     // Page content categories
├── sentiment_score: float       // Page sentiment (-1 to 1)
├── brand_safety_score: float    // Safety rating (0 to 1)
├── historical_ctr: float        // Avg CTR for this page
└── ttl: 24 hours

CampaignFeatures (key: campaign_id)
├── historical_ctr: float        // Campaign average CTR
├── historical_cvr: float        // Campaign average CVR
├── avg_win_price: float         // Average winning CPM
├── win_rate: float              // Fraction of bids that win
├── spend_velocity: float        // Current $/hour spend rate
└── ttl: 5 minutes               // Refreshed frequently
```

---

## 7. Database Selection Rationale

| Data Type | Storage | Rationale |
|---|---|---|
| **User profiles (feature store)** | Distributed in-memory KV store | Sub-millisecond reads at millions of QPS; sharded by user_id |
| **Campaign metadata** | Relational database | Strong consistency for budget/status; moderate read volume |
| **Campaign cache (bidder-local)** | In-process memory | Replicated from relational DB every 30 seconds; zero network latency |
| **Impression events** | Distributed event log | Append-only, high throughput, replayable for reprocessing |
| **Aggregated metrics** | Time-series database | Efficient for windowed queries (hourly/daily aggregations) |
| **Historical logs** | Columnar store on object storage | Cost-effective for petabyte-scale ad-hoc analytics |
| **Frequency counters** | Distributed counter store | Sub-ms increment/read; TTL-based expiry; approximate counts acceptable |
| **Bid landscape data** | In-memory sorted sets | Win price distributions per segment for bid shading model |
