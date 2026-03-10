# 14.16 AI-Native ONDC Commerce Platform — Low-Level Design

## Core Data Models

### Beckn Context Object

The context object is present in every Beckn protocol message and establishes the transaction identity.

```
BecknContext:
  domain:           string          # "ONDC:RET10" (grocery), "ONDC:RET12" (fashion), etc.
  country:          string          # "IND"
  city:             string          # "std:080" (Bangalore), "std:011" (Delhi)
  action:           enum            # search | select | init | confirm | status | track | cancel | update | rating | support
  core_version:     string          # "1.2.5"
  bap_id:           string          # Buyer app subscriber ID (registered in ONDC registry)
  bap_uri:          string          # Buyer app callback URI
  bpp_id:           string          # Seller app subscriber ID
  bpp_uri:          string          # Seller app callback URI
  transaction_id:   string(UUID)    # Unique ID for the entire transaction lifecycle
  message_id:       string(UUID)    # Unique ID for this specific request-callback pair
  timestamp:        ISO8601         # Message creation timestamp
  ttl:              ISO8601Duration # Time-to-live for the message (e.g., "PT30S")
  key:              string          # Encryption public key (for encrypted payloads)
```

### Catalog Item Model

```
CatalogItem:
  id:               string(UUID)    # Platform-internal item ID
  beckn_item_id:    string          # Beckn-protocol item identifier
  seller_id:        string(UUID)    # Reference to seller
  seller_np_id:     string          # Seller NP subscriber ID

  # Product core
  name:             string          # Product name (max 200 chars)
  short_desc:       string          # Short description (max 500 chars)
  long_desc:        string          # Detailed description (max 5000 chars)
  category_id:      string          # ONDC taxonomy category ID
  category_path:    string[]        # Full category hierarchy ["Fashion", "Men", "Shirts", "Casual"]
  hsn_code:         string          # Harmonized System Nomenclature code for GST

  # AI-enriched fields
  ai_generated:     boolean         # Whether descriptions were AI-generated
  ai_category_confidence: float     # Confidence score for category mapping (0-1)
  ai_attributes:    Map<string, string>  # Extracted attributes (color, material, size, etc.)
  embedding_vector: float[384]      # Semantic embedding for cross-lingual search
  quality_score:    float           # Catalog completeness/quality score (0-100)

  # Pricing
  price:            Money           # { value: decimal, currency: "INR" }
  max_price:        Money           # Maximum price (for variable pricing)
  price_breakup:    PriceBreakup[]  # Tax, packaging, delivery charge breakdown

  # Inventory
  quantity_available: integer       # Current stock count
  quantity_maximum:   integer       # Maximum orderable quantity
  is_available:     boolean         # Explicitly marked available/unavailable

  # Fulfillment
  fulfillment_ids:  string[]        # Supported fulfillment modes
  location_ids:     string[]        # Seller locations that can fulfill
  serviceability:   Serviceability  # Geographic serviceability definition

  # Media
  images:           Image[]         # { url, size_variant, alt_text }

  # Metadata
  created_at:       timestamp
  updated_at:       timestamp
  catalog_version:  integer         # Optimistic concurrency version
  language:         string          # Original catalog language ("hi", "en", "ta", etc.)
  translations:     Map<string, TranslatedFields>  # Translated name, descriptions per language
```

### Order State Machine

```
OrderStateMachine:
  states:
    CREATED         # Buyer selected items (select received)
    QUOTED          # Seller provided quote (on_select sent)
    INITIALIZED     # Buyer provided billing/shipping (init received)
    READY           # Seller confirmed logistics and final quote (on_init sent)
    CONFIRMED       # Payment verified, order confirmed (confirm/on_confirm)
    PACKED          # Seller packed the order
    PICKUP_PENDING  # Logistics assigned, awaiting pickup
    PICKED_UP       # Logistics picked up from seller
    IN_TRANSIT      # In logistics transit
    OUT_FOR_DELIVERY # Last-mile delivery in progress
    DELIVERED       # Successfully delivered
    COMPLETED       # Post-delivery window passed; settlement eligible
    CANCELLED       # Order cancelled (pre-fulfillment)
    RETURN_INITIATED # Buyer initiated return
    RETURN_PICKED   # Return pickup completed
    RETURN_DELIVERED # Return received by seller
    REFUNDED        # Refund processed

  transitions:
    CREATED         -> QUOTED           on: on_select received
    QUOTED          -> INITIALIZED      on: init received
    INITIALIZED     -> READY            on: on_init sent
    READY           -> CONFIRMED        on: confirm received + payment verified
    CONFIRMED       -> PACKED           on: seller marks packed
    CONFIRMED       -> CANCELLED        on: cancel received (pre-ship)
    PACKED          -> PICKUP_PENDING   on: logistics confirmed
    PICKUP_PENDING  -> PICKED_UP        on: logistics on_status (picked_up)
    PICKED_UP       -> IN_TRANSIT       on: logistics on_status (in_transit)
    IN_TRANSIT      -> OUT_FOR_DELIVERY on: logistics on_status (out_for_delivery)
    OUT_FOR_DELIVERY -> DELIVERED       on: logistics on_status (delivered)
    DELIVERED       -> COMPLETED        on: return_window_expired (auto, 7 days)
    DELIVERED       -> RETURN_INITIATED on: buyer raises return
    RETURN_INITIATED -> RETURN_PICKED   on: reverse logistics pickup
    RETURN_PICKED   -> RETURN_DELIVERED on: return received
    RETURN_DELIVERED -> REFUNDED        on: refund processed
    CANCELLED       -> REFUNDED        on: refund processed (if prepaid)

  timeout_rules:
    CREATED -> auto_cancel:      30 minutes (no on_select)
    QUOTED -> auto_cancel:       15 minutes (no init)
    INITIALIZED -> auto_cancel:  10 minutes (no on_init)
    READY -> auto_cancel:        30 minutes (no confirm)
    CONFIRMED -> escalate:       24 hours (no packed status)
    PICKUP_PENDING -> reassign:  4 hours (logistics no-show)
```

### Order Record

```
Order:
  id:               string(UUID)
  transaction_id:   string(UUID)    # Beckn transaction ID
  network_order_id: string          # ONDC-assigned order ID

  # Participants
  buyer_np_id:      string          # BAP subscriber ID
  seller_np_id:     string          # BPP subscriber ID
  seller_id:        string(UUID)    # Internal seller reference
  logistics_np_id:  string          # Logistics NP subscriber ID (nullable)

  # Order details
  items:            OrderItem[]     # { item_id, quantity, price, fulfillment_id }
  billing:          BillingInfo     # { name, phone, email, address, gst_number }
  fulfillment:      Fulfillment     # { type, tracking, delivery_address, estimated_delivery }

  # Financial
  quote:            Quote           # { price, breakup: [item, tax, delivery, packing] }
  payment:          Payment         # { type, status, transaction_id, settlement_details }
  settlement_status: enum           # PENDING | PARTIAL | SETTLED | DISPUTED

  # State
  state:            OrderState      # Current state from state machine
  state_history:    StateTransition[] # [{from, to, timestamp, trigger, actor}]

  # Protocol audit
  message_log:      MessageRef[]    # References to signed protocol messages

  # Timestamps
  created_at:       timestamp
  confirmed_at:     timestamp
  delivered_at:     timestamp
  completed_at:     timestamp
```

### Trust Score Model

```
TrustScore:
  np_id:            string          # Network participant ID
  seller_id:        string(UUID)    # Specific seller (for seller NPs)

  # Dimension scores (0-100)
  fulfillment_score:    float       # Order completion rate, on-time delivery
  quality_score:        float       # Return rate, "not as described" complaints
  responsiveness_score: float       # Protocol response latency, grievance resolution speed
  compliance_score:     float       # Schema adherence, protocol version currency
  payment_score:        float       # Settlement reliability, refund timeliness
  catalog_score:        float       # Catalog completeness, accuracy, freshness

  # Composite
  composite_score:      float       # Weighted aggregate of dimension scores
  confidence_level:     float       # Based on sample size (higher orders = higher confidence)

  # Temporal
  score_window:         string      # "30d" — trailing window for computation
  computed_at:          timestamp
  version:              integer     # Score version for change tracking

  # Anti-gaming
  anomaly_flags:        string[]    # ["rapid_order_spike", "review_pattern_suspicious"]
  manual_override:      float       # Admin-imposed adjustment (nullable)

  # Computation inputs
  total_orders:         integer     # Orders in window
  fulfilled_orders:     integer
  cancelled_orders:     integer
  returned_orders:      integer
  avg_delivery_delta:   duration    # Avg(actual_delivery - promised_delivery)
  grievance_count:      integer
  avg_grievance_resolution: duration
  protocol_error_rate:  float       # % of protocol messages with schema violations
```

---

## Settlement Algorithm

### Multi-Party Settlement Flow

Each ONDC transaction involves settlement across multiple parties:

```
SettlementComputation:
  input:
    order:            Order
    order_amount:     Money         # Total order value (paid by buyer)
    payment_method:   enum          # UPI | CARD | COD | WALLET

  computation:
    # Step 1: GST computation
    item_gst = sum(item.price * item.gst_rate for item in order.items)
    total_with_gst = order_amount  # GST is inclusive in listed price

    # Step 2: Commission splits
    buyer_np_commission = order_amount * buyer_np_commission_rate   # Typically 2-5%
    seller_np_commission = order_amount * seller_np_commission_rate # Typically 3-8%
    ondc_network_fee = order_amount * 0.001                        # 0.1% network fee

    # Step 3: Logistics cost
    logistics_charge = order.fulfillment.logistics_quote
    logistics_gst = logistics_charge * 0.18                         # 18% GST on logistics

    # Step 4: Tax deduction at source
    tcs_amount = order_amount * 0.01    # 1% TCS under Section 52 of CGST Act
    tds_amount = seller_np_commission * 0.01  # 1% TDS if applicable

    # Step 5: Seller payout
    seller_payout = order_amount
                    - buyer_np_commission
                    - seller_np_commission
                    - ondc_network_fee
                    - logistics_charge
                    - tcs_amount

  settlement_timeline:
    digital_payment:  T+1 business day (buyer NP → collector → settlement to all parties)
    cod_payment:      T+3 business days (logistics NP collects → remits → settlement)
    refund:           T+5 business days (reverse flow)

  reconciliation:
    # Daily reconciliation job
    for each order settled today:
      verify: sum(all_party_payouts) == order_amount
      verify: gst_collected == gst_reported_to_gstn
      verify: tcs_deducted == tcs_reported_to_income_tax
      flag_discrepancy if any verification fails
```

### Settlement State Machine

```
SettlementStateMachine:
  PENDING          # Order confirmed, awaiting delivery
  DELIVERY_CONFIRMED  # Delivery verified, settlement eligible
  COMPUTATION_DONE    # Settlement amounts computed for all parties
  BUYER_NP_SETTLED    # Buyer NP commission settled
  SELLER_NP_SETTLED   # Seller NP commission settled
  LOGISTICS_SETTLED   # Logistics charges settled
  NETWORK_FEE_SETTLED # ONDC network fee settled
  SELLER_PAID         # Seller payout completed
  RECONCILED          # All amounts verified and reconciled
  DISPUTED            # Discrepancy detected, under investigation
```

---

## API Contracts (Internal)

### Catalog Enrichment API

```
POST /internal/catalog/enrich

Request:
  seller_id:        string(UUID)
  items:            RawCatalogItem[]   # Seller's raw product data
    - name:         string             # Raw product name
    - description:  string             # Raw description (may be empty)
    - images:       string[]           # Image URLs
    - price:        decimal
    - category_hint: string            # Seller's category (free-form)
    - attributes:   Map<string, string> # Raw attributes

Response:
  enriched_items:   EnrichedItem[]
    - original_id:    string
    - enriched_name:  string           # AI-improved product name
    - short_desc:     string           # AI-generated short description
    - long_desc:      string           # AI-generated detailed description
    - category_id:    string           # Mapped ONDC category
    - category_confidence: float
    - hsn_code:       string           # Inferred HSN code
    - extracted_attributes: Map<string, string>  # AI-extracted attributes
    - quality_score:  float
    - issues:         ValidationIssue[] # Schema compliance issues
    - translations:   Map<string, TranslatedFields>

  processing_time_ms: integer
```

### Federated Search API

```
POST /internal/search/federated

Request:
  query:            string             # Natural language or structured query
  location:         GeoPoint           # Buyer's location
  category:         string             # Category filter (optional)
  filters:          Map<string, string> # Attribute filters
  sort_by:          enum               # RELEVANCE | PRICE_LOW | PRICE_HIGH | RATING | DELIVERY_SPEED
  page:             integer
  page_size:        integer
  buyer_context:    BuyerContext        # History, preferences for personalization

Response:
  results:          SearchResult[]
    - item:           CatalogItem
    - seller_trust:   float            # Composite trust score
    - relevance:      float            # AI relevance score
    - delivery_estimate: Duration      # Estimated delivery time
    - source_np:      string           # Seller NP that provided this result
    - price_freshness: timestamp       # When price was last confirmed

  total_count:      integer
  aggregations:     Map<string, Facet[]> # Category, price range, brand facets
  query_latency_ms: integer
  np_response_stats: NPResponseStat[]  # Which NPs responded, latency per NP
```

### Trust Score API

```
GET /internal/trust/score/{np_id}?seller_id={seller_id}

Response:
  composite_score:    float
  dimensions:
    fulfillment:      { score: float, sample_size: integer, trend: string }
    quality:          { score: float, sample_size: integer, trend: string }
    responsiveness:   { score: float, sample_size: integer, trend: string }
    compliance:       { score: float, sample_size: integer, trend: string }
    payment:          { score: float, sample_size: integer, trend: string }
    catalog:          { score: float, sample_size: integer, trend: string }
  confidence:         float
  anomaly_flags:      string[]
  computed_at:        timestamp
  order_volume_30d:   integer
```

---

## Cross-Lingual Search Pipeline

```
CrossLingualSearchPipeline:
  input: buyer_query (any of 22 Indian languages)

  step_1_language_detection:
    detected_language = detect_language(buyer_query)
    # Output: "hi" (Hindi), "ta" (Tamil), "en" (English), etc.

  step_2_query_embedding:
    query_vector = multilingual_encoder.encode(buyer_query)
    # Uses multilingual model trained on Indian language corpus
    # Output: float[384] dense vector

  step_3_approximate_index_search:
    candidate_items = vector_index.search(
      query_vector,
      top_k=500,
      filters={location: buyer_location, category: category_filter}
    )
    # Searches pre-computed item embeddings regardless of source language

  step_4_reranking:
    for each candidate in candidate_items:
      relevance_score = cross_encoder.score(buyer_query, candidate.name + candidate.description)
      trust_boost = candidate.seller_trust_score * 0.15
      freshness_boost = recency_score(candidate.updated_at) * 0.05
      delivery_boost = delivery_speed_score(candidate, buyer_location) * 0.10
      final_score = relevance_score * 0.70 + trust_boost + freshness_boost + delivery_boost

    ranked_results = sort(candidates, by=final_score, descending=True)[:page_size]

  step_5_response_translation:
    if detected_language != "en":
      for result in ranked_results:
        if result.translations[detected_language] exists:
          use cached translation
        else:
          result.display_name = translate(result.name, target=detected_language)
          result.display_desc = translate(result.short_desc, target=detected_language)

    return ranked_results
```

---

## Fraud Detection Signals

```
FraudSignalMatrix:
  seller_signals:
    - catalog_inflation:      Sudden 10× increase in catalog size within 24 hours
    - price_manipulation:     Listing high price, immediately "discounting" to normal
    - fake_order_patterns:    Orders from related buyer accounts (device/IP clustering)
    - fulfillment_gaming:     Marking delivered without logistics tracking confirmation
    - category_misuse:        Listing items in wrong category for visibility

  buyer_signals:
    - return_abuse:           Return rate > 40% over trailing 30 orders
    - address_anomaly:        Multiple orders to different addresses from same account
    - payment_cycling:        Repeated failed payments followed by COD selection
    - review_manipulation:    Positive reviews from accounts with no purchase history

  network_signals:
    - collusion_detection:    Buyer NP and seller NP with statistically improbable order volumes
    - wash_trading:           Circular orders between related entities
    - protocol_abuse:         NP sending malformed messages to trigger error-handling bugs

  detection_algorithm:
    risk_score = weighted_sum(
      catalog_inflation_score * 0.15,
      price_manipulation_score * 0.15,
      fake_order_score * 0.20,
      fulfillment_gaming_score * 0.20,
      historical_trust_score * 0.15,
      network_anomaly_score * 0.15
    )

    action_thresholds:
      risk_score < 30:   ALLOW (normal processing)
      risk_score 30-60:  FLAG (additional verification, human review queue)
      risk_score 60-80:  RESTRICT (limit order volume, require prepayment only)
      risk_score > 80:   SUSPEND (temporary suspension, notify ONDC)
```
