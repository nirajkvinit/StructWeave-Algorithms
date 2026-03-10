# 12.18 Marketplace Platform — Low-Level Design

## Core Data Models

### Listing

```
Listing {
  listing_id:          UUID (PK)
  seller_id:           UUID (FK → User)
  title:               string (max 140 chars)
  description:         text (max 5,000 chars)
  category_path:       string[]  // ["Electronics", "Cameras", "DSLRs"]
  price_cents:         int
  currency:            string (ISO 4217)
  quantity:            int
  quantity_reserved:   int  // sum of active soft reserves
  quantity_sold:       int
  condition:           enum (new | like_new | good | fair | parts_only)
  photo_ids:           UUID[]  // references to object storage
  shipping_options:    ShippingOption[]
  location:            GeoPoint
  tags:                string[]
  state:               enum (draft | pending_review | active | sold | expired | suspended)
  trust_flags:         string[]  // ["counterfeit_suspected", "price_anomaly"]
  created_at:          timestamp
  activated_at:        timestamp
  sold_at:             timestamp (nullable)
  version:             int  // optimistic concurrency control
}

ShippingOption {
  carrier:             string
  service_level:       string
  price_cents:         int
  estimated_days_min:  int
  estimated_days_max:  int
  ships_from_country:  string
}
```

### Order

```
Order {
  order_id:            UUID (PK)
  buyer_id:            UUID (FK → User)
  seller_id:           UUID (FK → User)
  listing_id:          UUID (FK → Listing)
  listing_snapshot:    JSON  // immutable copy at order time
  quantity:            int
  item_price_cents:    int
  shipping_price_cents: int
  tax_cents:           int
  total_cents:         int
  platform_fee_cents:  int   // take rate applied
  seller_net_cents:    int   // total - fee - processing_fee - tax_remittance
  state:               enum (pending_payment | paid | shipped | delivered | completed | disputed | refunded | cancelled)
  payment_token:       string  // tokenized payment reference
  escrow_id:           UUID (FK → EscrowRecord)
  tracking_number:     string (nullable)
  carrier:             string (nullable)
  shipped_at:          timestamp (nullable)
  delivered_at:        timestamp (nullable)
  protection_expires_at: timestamp  // buyer protection window end
  created_at:          timestamp
}
```

### EscrowRecord

```
EscrowRecord {
  escrow_id:         UUID (PK)
  order_id:          UUID (FK → Order)
  buyer_id:          UUID
  seller_id:         UUID
  held_amount_cents: int
  currency:          string
  state:             enum (holding | released_to_seller | refunded_to_buyer | partially_refunded)
  hold_reason:       string  // "standard" | "new_seller" | "dispute_pending" | "fraud_review"
  release_trigger:   enum (delivery_confirmed | protection_expired | dispute_resolved | manual_override)
  created_at:        timestamp
  released_at:       timestamp (nullable)
  events:            EscrowEvent[]  // append-only log of all state changes
}

EscrowEvent {
  event_id:    UUID
  escrow_id:   UUID
  event_type:  enum (held | hold_extended | released | refunded | partially_refunded)
  amount_cents: int
  actor:       string  // "system" | "dispute_service" | "admin"
  reason:      string
  timestamp:   timestamp
}
```

### SellerQualityScore

```
SellerQualityScore {
  seller_id:              UUID (PK)
  overall_score:          float  // 0.0–1.0; normalized composite
  review_score:           float  // recency-weighted avg star rating / 5.0
  review_count:           int
  on_time_shipping_rate:  float  // orders shipped within handling time / total orders
  dispute_rate:           float  // disputes opened / total orders (90-day window)
  response_time_hours:    float  // avg hours to first response on buyer messages
  policy_violation_count: int    // active violations (decay over time)
  trust_tier:             enum (new | standard | trusted | verified_pro)
  payout_hold_days:       int    // derived from trust_tier
  search_boost:           float  // multiplicative modifier applied in ranking (0.5–1.5)
  computed_at:            timestamp
  next_refresh_at:        timestamp  // TTL for async recomputation
  score_version:          int
}
```

### Review

```
Review {
  review_id:     UUID (PK)
  order_id:      UUID (FK → Order; one review per order per direction)
  reviewer_id:   UUID (FK → User)
  reviewee_id:   UUID (FK → User)
  listing_id:    UUID
  direction:     enum (buyer_to_seller | seller_to_buyer)
  rating:        int (1–5)
  title:         string (max 100 chars)
  body:          text (max 1,000 chars)
  photos:        UUID[] (optional)
  fraud_score:   float  // 0.0–1.0; computed async
  fraud_flags:   string[]  // ["velocity_burst", "reviewer_cluster", "unverified_purchase"]
  state:         enum (pending_fraud_check | published | suppressed | removed)
  created_at:    timestamp
  published_at:  timestamp (nullable)
}
```

---

## Search Document Schema

```
SearchDocument {
  listing_id:        string (PK)
  title:             string  (full-text indexed)
  title_tokens:      string[]  (analyzed, stemmed)
  description_excerpt: string  (first 200 chars; full-text indexed)
  category_ids:      string[]  (hierarchical; filter field)
  price_cents:       int  (range filter field)
  currency:          string
  condition:         string  (filter field)
  ships_from:        string  (filter field)
  estimated_delivery_days_min: int  (filter field)
  seller_id:         string
  seller_score:      float  (ranking feature)
  seller_trust_tier: string  (filter field)
  listing_age_hours: int  (freshness signal)
  view_count_7d:     int  (popularity signal)
  click_through_rate_7d: float  (behavioral ranking feature)
  conversion_rate_7d: float  (behavioral ranking feature)
  is_available:      bool  (hard filter: state == active AND quantity > quantity_reserved + quantity_sold)
  title_embedding:   float[384]  (dense vector for semantic ANN search)
  last_indexed_at:   timestamp
}
```

---

## API Contracts

### Search API

```
GET /v1/search

Query parameters:
  q:              string   (keyword query; optional for browse)
  category:       string   (category path filter)
  price_min:      int      (cents)
  price_max:      int      (cents)
  condition:      string[] (multi-select)
  ships_from:     string
  sort:           enum (relevance | price_asc | price_desc | newest | top_rated)
  page_token:     string   (cursor-based pagination)
  limit:          int      (max 48)

Response:
  {
    results: SearchResult[]
    total_estimate: int      (approximate; ±10% acceptable for large result sets)
    next_page_token: string
    search_id: string        (for click/conversion tracking)
    facets: FacetGroup[]     (available filter options with counts)
  }

SearchResult:
  {
    listing_id: string
    title: string
    price_cents: int
    primary_photo_url: string
    seller_id: string
    seller_name: string
    seller_score: float
    seller_trust_tier: string
    shipping_price_cents: int
    estimated_delivery_days: [min, max]
    is_promoted: bool
    rank_position: int
  }
```

### Checkout API

```
POST /v1/checkout/reserve

Request:
  {
    listing_id: string
    quantity:   int
    buyer_id:   string  (from auth token)
  }

Response:
  {
    reservation_id: string
    listing_id: string
    reservation_expires_at: timestamp  // TTL: +10 minutes
    price_snapshot: PriceSnapshot
  }

POST /v1/checkout/complete

Request:
  {
    reservation_id: string
    payment_method_token: string  (tokenized card/wallet reference)
    shipping_option_id: string
    buyer_address: Address
  }

Response:
  {
    order_id: string
    state: "pending_payment" | "paid"
    total_cents: int
    estimated_delivery: [min_date, max_date]
    escrow_id: string
  }
```

### Dispute API

```
POST /v1/orders/{order_id}/disputes

Request:
  {
    reason:       enum (item_not_received | item_not_as_described | damaged | wrong_item | other)
    description:  string (max 2,000 chars)
    evidence:     EvidenceItem[]  // photo uploads, tracking references
  }

Response:
  {
    dispute_id: string
    state: "open"
    auto_resolve_estimate: string  // "within 24 hours" if auto-resolvable
    human_review: bool
    escrow_status: "frozen_pending_resolution"
  }

GET /v1/disputes/{dispute_id}

Response:
  {
    dispute_id: string
    order_id: string
    state: enum (open | pending_seller_response | under_review | resolved_buyer | resolved_seller | escalated)
    resolution: ResolutionDetail (nullable)
    timeline: DisputeEvent[]
    messages: DisputeMessage[]  // mediated communication channel
  }
```

---

## Core Algorithms

### Seller Quality Score Computation

```
FUNCTION compute_seller_quality_score(seller_id, window_days=90):

  // Review component (40% weight)
  recent_reviews = fetch_reviews(seller_id, last_n_days=180)
  review_score = weighted_avg(
    values  = [r.rating for r in recent_reviews],
    weights = [recency_weight(r.created_at) for r in recent_reviews]
  ) / 5.0
  // recency_weight: exponential decay; reviews from past 30 days weight 3×
  // reviews from 31–90 days weight 1.5×; older weight 0.5×

  // Shipping component (25% weight)
  orders = fetch_completed_orders(seller_id, last_n_days=window_days)
  on_time = count(o for o in orders if o.shipped_at <= o.handling_deadline)
  shipping_score = on_time / max(len(orders), 1)

  // Dispute component (20% weight)
  dispute_count = count(disputes opened against seller, last_n_days=window_days)
  dispute_rate = dispute_count / max(len(orders), 1)
  dispute_score = 1.0 - min(dispute_rate * 5, 1.0)
  // 20% dispute rate → score 0.0; 0% → score 1.0

  // Response time component (15% weight)
  avg_response_hours = compute_avg_first_response_time(seller_id, last_n_days=window_days)
  response_score = max(0, 1.0 - (avg_response_hours / 48))
  // 48h response time → score 0.0; instant → score 1.0

  overall = (0.40 * review_score) +
            (0.25 * shipping_score) +
            (0.20 * dispute_score) +
            (0.15 * response_score)

  // Apply policy violation penalty
  violation_penalty = 0.05 * active_violation_count(seller_id)
  overall = max(0, overall - violation_penalty)

  // Map to trust tier
  trust_tier = map_score_to_tier(overall, review_count)
  //   new:          review_count < 10
  //   standard:     overall >= 0.5
  //   trusted:      overall >= 0.75 AND review_count >= 50
  //   verified_pro: overall >= 0.9 AND review_count >= 200

  // Map to search boost
  search_boost = 0.5 + overall  // range: 0.5 to 1.5

  // Map to payout hold days
  payout_hold = {new: 7, standard: 5, trusted: 3, verified_pro: 2}[trust_tier]

  RETURN SellerQualityScore(overall, review_score, shipping_score, dispute_score,
                             response_score, trust_tier, search_boost, payout_hold)
```

### Review Fraud Detection

```
FUNCTION score_review_for_fraud(review_id):
  review = fetch(review_id)
  reviewer = fetch_user(review.reviewer_id)
  seller = fetch_user(review.seller_id)

  signals = {}

  // Signal 1: Verified purchase check (hard gate)
  IF review.order_id NOT IN verified_purchases(reviewer.user_id, seller.user_id):
    signals["unverified_purchase"] = 1.0  // hard flag; auto-suppress

  // Signal 2: Reviewer account age vs. review count
  account_age_days = days_since(reviewer.created_at)
  IF account_age_days < 30 AND reviewer.total_reviews > 5:
    signals["new_account_high_volume"] = 0.8

  // Signal 3: Review velocity burst on this seller
  reviews_last_7d = count_reviews_for_seller(seller.seller_id, last_n_days=7)
  IF reviews_last_7d > 3 * historical_7day_avg(seller.seller_id):
    signals["velocity_burst"] = 0.7

  // Signal 4: IP cluster (same IP subnet as other recent reviewers)
  recent_reviewer_ips = fetch_reviewer_ips(seller.seller_id, last_n_days=30)
  IF ip_subnet(reviewer.last_login_ip) IN cluster(recent_reviewer_ips, threshold=5):
    signals["ip_cluster"] = 0.85

  // Signal 5: Reviewer-seller social graph distance
  graph_distance = shortest_path(reviewer.user_id, seller.seller_id, social_graph)
  IF graph_distance <= 2:  // connected via messaging or shared purchases
    signals["close_graph_distance"] = 0.6

  // Signal 6: Review text similarity to existing reviews
  embedding = embed(review.body)
  similarity = max_cosine_similarity(embedding, recent_review_embeddings(seller.seller_id))
  IF similarity > 0.92:
    signals["near_duplicate_text"] = 0.75

  // Composite fraud score (max of signals, weighted)
  fraud_score = weighted_combination(signals)

  IF "unverified_purchase" IN signals:
    state = "suppressed"
  ELIF fraud_score > 0.7:
    state = "pending_human_review"
  ELSE:
    state = "published"

  RETURN (fraud_score, signals, state)
```

### Inventory Reservation (Optimistic Concurrency)

```
FUNCTION reserve_listing(listing_id, quantity, buyer_id):

  MAX_RETRIES = 3
  FOR attempt IN 1..MAX_RETRIES:
    listing = fetch_with_version(listing_id)

    available = listing.quantity - listing.quantity_reserved - listing.quantity_sold
    IF available < quantity:
      RETURN Error("insufficient_inventory")

    // Attempt optimistic update (fails if version changed since fetch)
    success = UPDATE listings
      SET quantity_reserved = quantity_reserved + quantity,
          version = version + 1
      WHERE listing_id = listing_id
        AND version = listing.version  // optimistic lock check
        AND (quantity - quantity_reserved - quantity_sold) >= quantity

    IF success:
      reservation = create_reservation(listing_id, quantity, buyer_id, ttl=10min)
      schedule_ttl_cleanup(reservation.reservation_id, delay=10min)
      RETURN reservation

  RETURN Error("reservation_conflict_retry_exceeded")
```
