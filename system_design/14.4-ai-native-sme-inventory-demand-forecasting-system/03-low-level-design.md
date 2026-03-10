# 14.4 AI-Native SME Inventory & Demand Forecasting System — Low-Level Design

## Data Models

### Unified Inventory Position

The unified inventory position is the core abstraction—a real-time representation of each SKU's state across all locations and channels, updated within seconds of any stock movement.

```
InventoryPosition:
  tenant_id:              string          # tenant identifier (SME merchant)
  sku_id:                 string          # platform-internal SKU identifier
  location_id:            string          # warehouse/store/fulfillment center
  version:                uint64          # monotonically increasing on every mutation
  last_updated:           datetime_us     # microsecond precision

  quantities:
    on_hand:              int             # physically present, includes allocated
    allocated:            int             # reserved for pending orders not yet shipped
    in_transit:           int             # ordered from supplier, not yet received
    committed:            int             # held for channel reservations or backorders
    available:            int             # on_hand - allocated - committed (can go negative during oversell)
    damaged:              int             # quarantined, not available for sale
    returned_pending:     int             # returned items awaiting inspection

  thresholds:
    reorder_point:        int             # trigger reorder when available + in_transit ≤ this value
    reorder_quantity:     int             # recommended order quantity (Q from optimization)
    safety_stock:         int             # minimum buffer stock for target service level
    max_stock:            int             # maximum stock level (storage/cash flow constraint)
    service_level:        float64         # target service level (0.90 - 0.99)

  channel_allocation:
    - channel_id:         string          # channel identifier
      safety_buffer:      int             # units withheld from this channel for oversell protection
      allocated_cap:      int             # maximum units allocated to this channel (null = unlimited)
      published_quantity: int             # quantity currently published on this channel
      last_sync:          datetime        # last successful sync timestamp
      sync_status:        enum[SYNCED, PENDING, FAILED, STALE]

  perishable:
    is_perishable:        boolean
    min_remaining_life_days: int          # minimum shelf life for saleable allocation
    total_batches:        int             # number of active batches at this location

  computed:
    days_of_supply:       float64         # on_hand / avg_daily_demand
    stockout_risk:        float64         # P(stockout within lead_time) from forecast
    overstock_flag:       boolean         # days_of_supply > 2x target
    dead_stock_flag:      boolean         # zero sales in 90+ days with on_hand > 0
```

### Product Catalog Entry

```
ProductCatalog:
  tenant_id:              string
  sku_id:                 string          # platform-internal identifier
  sku_code:               string          # merchant-assigned SKU code
  barcode:                string          # UPC/EAN/ISBN if available
  name:                   string
  description:            string
  category_path:          string[]        # hierarchical category (e.g., ["Food", "Snacks", "Chips"])
  brand:                  string
  unit_of_measure:        string          # "each", "kg", "liter", "box_of_12"
  unit_weight_grams:      float64
  created_at:             datetime

  pricing:
    cost_price:           float64         # landed cost per unit
    selling_price:        float64         # base selling price
    currency:             string
    tax_rate:             float64         # applicable tax percentage
    margin_percent:       float64         # (selling - cost) / selling

  attributes:
    is_perishable:        boolean
    default_shelf_life_days: int          # standard shelf life from manufacturing
    storage_requirements: enum[AMBIENT, REFRIGERATED, FROZEN]
    is_serialized:        boolean         # requires individual unit tracking (pharma)
    is_batch_tracked:     boolean         # requires batch/lot tracking
    is_fragile:           boolean
    hazmat_class:         string          # hazardous material classification if applicable

  classification:
    abc_class:            enum[A, B, C]   # revenue contribution class
    xyz_class:            enum[X, Y, Z]   # demand variability class
    demand_pattern:       enum[SMOOTH, ERRATIC, INTERMITTENT, LUMPY]
    seasonal_profile:     string          # seasonal cluster ID (null if non-seasonal)
    velocity_tier:        enum[FAST, MEDIUM, SLOW, DEAD]

  channel_mappings:
    - channel_id:         string
      channel_sku_id:     string          # SKU identifier on the channel
      channel_listing_id: string          # listing/product ID on the channel
      listing_status:     enum[ACTIVE, PAUSED, ARCHIVED]
      channel_price:      float64         # may differ from base selling_price

  supplier_mappings:
    - supplier_id:        string
      supplier_sku:       string          # supplier's product code
      supplier_price:     float64         # purchase price from this supplier
      moq:                int             # minimum order quantity
      pack_size:          int             # units per pack for ordering
      lead_time_mean_days: float64
      lead_time_std_days: float64
      is_primary:         boolean         # preferred supplier
```

### Batch/Lot Record

```
BatchRecord:
  tenant_id:              string
  batch_id:               string          # globally unique batch identifier
  sku_id:                 string
  location_id:            string
  lot_number:             string          # manufacturer's lot/batch number
  serial_numbers:         string[]        # for serialized products (pharma)

  dates:
    manufacturing_date:   date
    expiry_date:          date
    received_date:        date            # when received into inventory
    days_to_expiry:       int             # computed daily

  quantities:
    initial_quantity:     int             # quantity when batch was received
    current_quantity:     int             # current on-hand for this batch
    allocated_quantity:   int             # allocated from this batch for pending orders
    available_quantity:   int             # current - allocated
    sold_quantity:        int             # total units sold from this batch
    wasted_quantity:      int             # expired/damaged/disposed units
    recalled_quantity:    int             # units pulled for recall

  status:                 enum[ACTIVE, LOW_LIFE, NEAR_EXPIRY, EXPIRED, RECALLED, DEPLETED]
  quarantine_reason:      string          # null if not quarantined
  disposal_date:          date            # null if not disposed

  traceability:
    supplier_id:          string
    purchase_order_id:    string
    receiving_note_id:    string
    temperature_log_ref:  string          # reference to cold chain temperature log
```

### Demand Forecast Record

```
DemandForecast:
  tenant_id:              string
  sku_id:                 string
  location_id:            string
  forecast_date:          date            # the date this forecast was generated
  forecast_version:       uint64          # increments on each forecast run

  model:
    selected_model:       enum[ETS, CROSTON, SBA, TSB, HIER_BAYES, GBT, TRANSFER]
    model_version:        string          # version of the trained model
    selection_score:      float64         # cross-validation WAPE of selected model
    runner_up_model:      string          # second-best model
    runner_up_score:      float64

  daily_forecasts:
    - target_date:        date            # forecasted date
      horizon_days:       int             # days ahead from forecast_date
      mean:               float64         # expected demand (units)
      std_dev:            float64         # standard deviation
      p5:                 float64         # 5th percentile
      p25:                float64         # 25th percentile
      p50:                float64         # median
      p75:                float64         # 75th percentile
      p95:                float64         # 95th percentile
      prob_zero:          float64         # probability of zero demand (for intermittent)

  aggregates:
    next_7d_mean:         float64
    next_7d_p95:          float64
    next_14d_mean:        float64
    next_14d_p95:         float64
    next_30d_mean:        float64
    next_30d_p95:         float64
    lead_time_demand_mean: float64        # demand during expected lead time
    lead_time_demand_std: float64

  accuracy_tracking:
    last_7d_wape:         float64         # WAPE of previous 7-day forecast vs. actual
    last_28d_wape:        float64         # WAPE of previous 28-day forecast vs. actual
    bias:                 float64         # systematic over/under-forecasting
    forecast_value_add:   float64         # improvement over naive forecast (random walk)

  external_signals:
    promotion_active:     boolean         # promotion uplift applied
    promotion_multiplier: float64         # demand multiplier from promotion model
    seasonal_component:   float64         # seasonal adjustment factor
    event_flag:           string          # special event affecting forecast (e.g., "festival_diwali")
```

### Supplier Profile

```
SupplierProfile:
  tenant_id:              string
  supplier_id:            string
  supplier_name:          string
  contact_info:
    email:                string
    phone:                string
    address:              string
    country:              string

  ordering:
    order_channels:       enum[EMAIL, API, PHONE, PORTAL][]
    order_window:         string          # e.g., "Mon-Fri 9AM-5PM"
    min_order_value:      float64         # minimum total PO value
    payment_terms:        string          # e.g., "Net 30", "COD"
    currency:             string

  performance:
    overall_score:        float64         # 0.0 - 1.0 composite score
    on_time_delivery_rate: float64        # % of POs delivered within promised window
    fill_rate:            float64         # % of ordered quantity actually delivered
    quality_rejection_rate: float64       # % of received items rejected for quality
    avg_lead_time_days:   float64
    lead_time_std_days:   float64
    lead_time_trend:      enum[IMPROVING, STABLE, DETERIORATING]
    total_pos_last_12m:   int
    total_value_last_12m: float64

  lead_time_distribution:
    - sku_id:             string
      sample_count:       int             # number of observed deliveries
      mean_days:          float64
      std_days:           float64
      min_days:           int
      max_days:           int
      p50_days:           float64
      p90_days:           float64
      last_observed:      date
```

### Purchase Order

```
PurchaseOrder:
  tenant_id:              string
  po_id:                  string
  supplier_id:            string
  location_id:            string          # receiving location
  status:                 enum[DRAFT, SUBMITTED, CONFIRMED, PARTIALLY_RECEIVED, FULLY_RECEIVED, CANCELLED]
  created_at:             datetime
  submitted_at:           datetime
  expected_delivery:      date
  actual_delivery:        date

  line_items:
    - line_id:            string
      sku_id:             string
      ordered_quantity:   int
      received_quantity:  int
      unit_cost:          float64
      total_cost:         float64
      batch_number:       string          # assigned on receipt
      expiry_date:        date            # recorded on receipt

  totals:
    subtotal:             float64
    tax:                  float64
    shipping:             float64
    total:                float64

  trigger:
    auto_generated:       boolean         # true if generated by reorder optimizer
    auto_approved:        boolean         # true if below auto-approve threshold
    triggered_by:         string          # "reorder_optimizer", "manual", "low_stock_alert"

  notes:                  string
```

### Sales Event

```
SalesEvent:
  tenant_id:              string
  event_id:               string          # globally unique event ID
  idempotency_key:        string          # channel_id + event_type + channel_event_id
  event_type:             enum[ORDER, CANCELLATION, RETURN, AMENDMENT]
  received_at:            datetime_us
  processed_at:           datetime_us

  channel:
    channel_id:           string
    channel_order_id:     string
    channel_name:         string

  line_items:
    - sku_id:             string
      channel_sku_id:     string
      quantity:           int             # positive for orders, negative for cancellations/returns
      unit_price:         float64
      discount:           float64
      location_id:        string          # fulfillment location
      batch_id:           string          # allocated batch (for perishable)

  customer:
    customer_id_hash:     string          # hashed for privacy
    shipping_region:      string          # for demand geography analysis

  processing:
    dedup_status:         enum[NEW, DUPLICATE]
    inventory_updated:    boolean
    sync_triggered:       boolean
    forecast_signal:      boolean         # true if this event contributes to demand signal
```

### Channel Sync State

```
ChannelSyncState:
  tenant_id:              string
  channel_id:             string
  sku_id:                 string
  location_id:            string

  state:
    platform_quantity:    int             # quantity in platform's inventory engine
    published_quantity:   int             # quantity published to the channel
    channel_reported:     int             # quantity channel reports (from reconciliation)
    drift:                int             # channel_reported - published_quantity
    drift_detected_at:    datetime

  sync:
    last_sync_attempt:    datetime
    last_sync_success:    datetime
    consecutive_failures: int
    last_error:           string
    sync_latency_ms:      int             # time from inventory change to channel acknowledgment
    circuit_breaker_state: enum[CLOSED, HALF_OPEN, OPEN]

  reconciliation:
    last_reconciliation:  datetime
    reconciliation_status: enum[MATCHED, DRIFT_DETECTED, CORRECTION_APPLIED]
    correction_applied:   int             # quantity adjustment from reconciliation
```

### Promotion Event

```
PromotionEvent:
  tenant_id:              string
  promotion_id:           string
  name:                   string
  type:                   enum[PERCENTAGE_OFF, FLAT_OFF, BOGO, BUNDLE, FREE_SHIPPING]
  discount_depth:         float64         # e.g., 0.20 for 20% off

  timing:
    start_date:           datetime
    end_date:             datetime
    channels:             string[]        # which channels run this promotion

  scope:
    sku_ids:              string[]        # affected SKUs
    category_path:        string          # or entire category

  demand_model:
    estimated_uplift:     float64         # multiplier (e.g., 2.5 = 150% increase)
    historical_reference: string[]        # past promotion_ids used for estimation
    cannibalization_skus: string[]        # SKUs expected to see demand decrease
    post_promo_dip_days:  int             # expected demand dip duration after promotion
    post_promo_dip_factor: float64        # demand multiplier during dip (e.g., 0.7)

  actuals:
    actual_uplift:        float64         # computed after promotion ends
    units_sold:           int
    revenue:              float64
```

---

## API Contracts

### 1. Get Inventory Position

```
GET /api/v1/inventory/{sku_id}
  Query Parameters:
    location_id:    string (optional, returns all locations if omitted)
    include_batches: boolean (default: false)
    include_channels: boolean (default: false)

  Response 200:
    {
      sku_id: string,
      locations: [
        {
          location_id: string,
          on_hand: int,
          allocated: int,
          in_transit: int,
          committed: int,
          available: int,
          reorder_point: int,
          days_of_supply: float,
          stockout_risk: float,
          batches: [                       # if include_batches=true
            {
              batch_id: string,
              lot_number: string,
              expiry_date: date,
              available_quantity: int,
              days_to_expiry: int,
              status: string
            }
          ],
          channels: [                      # if include_channels=true
            {
              channel_id: string,
              published_quantity: int,
              sync_status: string,
              last_sync: datetime
            }
          ]
        }
      ],
      version: uint64,
      last_updated: datetime
    }
```

### 2. Record Inventory Adjustment

```
POST /api/v1/inventory/{sku_id}/adjust
  Request Body:
    {
      location_id: string,
      adjustment_type: enum[DAMAGE, THEFT, FOUND, SAMPLING, COUNT_CORRECTION, DONATION, OTHER],
      quantity: int,                        # positive for additions, negative for reductions
      batch_id: string (optional),         # specific batch for perishable adjustments
      reason: string,
      reference_id: string (optional)      # external reference (e.g., count sheet number)
    }

  Response 200:
    {
      adjustment_id: string,
      sku_id: string,
      location_id: string,
      previous_on_hand: int,
      new_on_hand: int,
      adjustment_quantity: int,
      new_available: int,
      sync_triggered: boolean,
      timestamp: datetime
    }
```

### 3. Get Demand Forecast

```
GET /api/v1/forecasts/{sku_id}
  Query Parameters:
    location_id:    string (optional)
    horizon_days:   int (default: 30, max: 90)
    granularity:    enum[DAILY, WEEKLY] (default: DAILY)
    include_distribution: boolean (default: false)

  Response 200:
    {
      sku_id: string,
      location_id: string,
      forecast_date: date,
      model_used: string,
      model_accuracy_wape: float,
      demand_pattern: string,
      forecasts: [
        {
          date: date,
          mean: float,
          p50: float,
          p5: float (if include_distribution),
          p95: float (if include_distribution),
          prob_zero: float (if include_distribution),
          promotion_active: boolean
        }
      ],
      aggregates: {
        next_7d: { mean: float, p95: float },
        next_14d: { mean: float, p95: float },
        next_30d: { mean: float, p95: float }
      },
      insight: string                      # natural language summary
    }
```

### 4. Get Reorder Recommendations

```
GET /api/v1/reorder/recommendations
  Query Parameters:
    location_id:    string (optional)
    supplier_id:    string (optional)
    urgency:        enum[CRITICAL, HIGH, MEDIUM, LOW] (optional)
    page:           int (default: 1)
    page_size:      int (default: 50, max: 200)

  Response 200:
    {
      recommendations: [
        {
          sku_id: string,
          sku_name: string,
          location_id: string,
          supplier_id: string,
          supplier_name: string,
          urgency: string,
          current_available: int,
          reorder_point: int,
          recommended_quantity: int,
          unit_cost: float,
          total_cost: float,
          expected_lead_time_days: float,
          estimated_stockout_date: date,
          days_until_stockout: int,
          service_level_target: float,
          explanation: string              # "Demand trending 15% above average; current stock covers 4 days vs. 7-day lead time"
        }
      ],
      summary: {
        total_recommendations: int,
        total_cost: float,
        critical_count: int
      },
      pagination: { page: int, page_size: int, total_pages: int }
    }
```

### 5. Create Purchase Order

```
POST /api/v1/purchase-orders
  Request Body:
    {
      supplier_id: string,
      location_id: string,
      line_items: [
        {
          sku_id: string,
          quantity: int,
          unit_cost: float (optional, defaults to supplier catalog price)
        }
      ],
      expected_delivery: date (optional),
      notes: string (optional),
      auto_approve: boolean (default: false)
    }

  Response 201:
    {
      po_id: string,
      status: string,                      # "DRAFT" or "SUBMITTED" if auto_approve
      supplier_id: string,
      line_items: [...],
      totals: { subtotal: float, tax: float, total: float },
      expected_delivery: date,
      created_at: datetime
    }
```

### 6. Receive Goods Against Purchase Order

```
POST /api/v1/purchase-orders/{po_id}/receive
  Request Body:
    {
      line_items: [
        {
          line_id: string,
          received_quantity: int,
          batch_number: string (optional),
          manufacturing_date: date (optional),
          expiry_date: date (optional),
          condition: enum[GOOD, DAMAGED, REJECTED],
          notes: string (optional)
        }
      ],
      received_at: datetime (optional, defaults to now)
    }

  Response 200:
    {
      po_id: string,
      status: string,                      # "PARTIALLY_RECEIVED" or "FULLY_RECEIVED"
      received_line_items: [...],
      inventory_updates: [
        {
          sku_id: string,
          location_id: string,
          previous_on_hand: int,
          new_on_hand: int,
          batch_id: string
        }
      ],
      discrepancies: [                     # if received != ordered
        {
          sku_id: string,
          ordered: int,
          received: int,
          difference: int,
          type: enum[SHORT_SHIPMENT, OVER_SHIPMENT]
        }
      ]
    }
```

### 7. Register Promotion

```
POST /api/v1/promotions
  Request Body:
    {
      name: string,
      type: enum[PERCENTAGE_OFF, FLAT_OFF, BOGO, BUNDLE, FREE_SHIPPING],
      discount_depth: float,
      start_date: datetime,
      end_date: datetime,
      channels: string[],
      sku_ids: string[] (optional),
      category: string (optional),
      notes: string (optional)
    }

  Response 201:
    {
      promotion_id: string,
      estimated_demand_uplift: float,
      affected_skus: [
        {
          sku_id: string,
          current_stock: int,
          estimated_demand_during_promo: int,
          stock_sufficient: boolean,
          recommended_additional_stock: int
        }
      ],
      cannibalization_warnings: [
        {
          sku_id: string,
          expected_demand_reduction: float,
          reason: string
        }
      ]
    }
```

### 8. Sync Channel Inventory

```
POST /api/v1/channels/{channel_id}/sync
  Request Body:
    {
      sku_ids: string[] (optional, sync all if omitted),
      force_full_reconciliation: boolean (default: false)
    }

  Response 200:
    {
      channel_id: string,
      sync_results: [
        {
          sku_id: string,
          previous_published: int,
          new_published: int,
          platform_available: int,
          status: enum[UPDATED, NO_CHANGE, FAILED],
          error: string (optional)
        }
      ],
      summary: {
        total_skus: int,
        updated: int,
        no_change: int,
        failed: int,
        sync_duration_ms: int
      }
    }
```

### 9. Get Portfolio Analytics

```
GET /api/v1/analytics/portfolio
  Query Parameters:
    location_id:    string (optional)
    abc_class:      string (optional, filter by class)
    period_days:    int (default: 30)

  Response 200:
    {
      period: { start: date, end: date },
      summary: {
        total_skus: int,
        total_inventory_value: float,
        avg_inventory_turnover: float,
        stockout_rate: float,              # % of SKU-days with zero available
        overstock_rate: float,             # % of SKUs with days_of_supply > 2x target
        dead_stock_skus: int,
        dead_stock_value: float,
        expiry_waste_value: float          # value of expired/wasted inventory
      },
      abc_xyz_matrix: {
        AX: { count: int, revenue_share: float, avg_turnover: float },
        AY: { ... },
        AZ: { ... },
        BX: { ... },
        BY: { ... },
        BZ: { ... },
        CX: { ... },
        CY: { ... },
        CZ: { ... }
      },
      top_stockout_risk: [
        { sku_id: string, name: string, days_until_stockout: int, stockout_risk: float }
      ],
      top_overstock: [
        { sku_id: string, name: string, days_of_supply: float, excess_value: float }
      ],
      approaching_expiry: [
        { sku_id: string, batch_id: string, expiry_date: date, quantity: int, value: float }
      ]
    }
```

### 10. Batch Recall Initiation

```
POST /api/v1/batches/recall
  Request Body:
    {
      batch_id: string (optional),
      lot_number: string (optional),       # recall by lot across all locations
      sku_id: string,
      reason: string,
      severity: enum[VOLUNTARY, MANDATORY, URGENT],
      action: enum[QUARANTINE, DISPOSE, RETURN_TO_SUPPLIER]
    }

  Response 200:
    {
      recall_id: string,
      affected_batches: [
        {
          batch_id: string,
          location_id: string,
          on_hand_quantity: int,
          allocated_quantity: int,          # orders in progress using this batch
          status: string                   # "QUARANTINED"
        }
      ],
      affected_orders: [
        {
          order_id: string,
          channel: string,
          quantity: int,
          status: string,                  # "SHIPPED" or "PENDING"
          customer_notification_required: boolean
        }
      ],
      total_affected_units: int,
      total_affected_orders: int,
      estimated_financial_impact: float
    }
```

---

## Core Algorithms

### 1. Probabilistic Demand Forecasting — Model Selection Pipeline

```
ALGORITHM AutomaticModelSelection(sku_id, location_id, sales_history, external_signals):
    // Step 1: Classify demand pattern
    recent_data ← sales_history.last(84_days)  // 12 weeks
    non_zero_days ← count(d in recent_data where d.units_sold > 0)
    intermittency ← 1 - (non_zero_days / 84)
    cv ← std_dev(recent_data.units_sold) / mean(recent_data.units_sold)

    IF intermittency < 0.20 AND cv < 0.50:
        pattern ← SMOOTH
    ELSE IF intermittency < 0.20 AND cv >= 0.50:
        pattern ← ERRATIC
    ELSE IF intermittency >= 0.20 AND cv < 0.50:
        pattern ← INTERMITTENT
    ELSE:
        pattern ← LUMPY

    // Step 2: Select candidate models based on pattern
    candidates ← []
    IF pattern IN [SMOOTH, ERRATIC]:
        candidates.add(ExponentialSmoothing)
        candidates.add(GradientBoostedTrees)
    IF pattern IN [INTERMITTENT, LUMPY]:
        candidates.add(CrostonSBA)
        candidates.add(TSBMethod)
    candidates.add(HierarchicalBayesian)    // always a candidate

    IF len(sales_history) < 90_days:        // sparse history
        candidates.add(TransferLearning)
        // increase weight for HierarchicalBayesian

    IF external_signals.has_upcoming_promotion:
        candidates.add(GradientBoostedTrees)  // handles covariates well

    // Step 3: Rolling-origin cross-validation
    best_model ← null
    best_wape ← infinity

    FOR each model IN candidates:
        wape_scores ← []
        FOR week IN range(8):               // 8-week evaluation window
            train_end ← today - (8 - week) * 7
            test_period ← 7_days starting from train_end
            model.fit(sales_history up to train_end, external_signals)
            predictions ← model.predict(test_period)
            actuals ← sales_history[test_period]
            wape ← sum(|actuals - predictions|) / sum(actuals)
            wape_scores.add(wape)

        avg_wape ← mean(wape_scores)

        IF avg_wape < best_wape:
            best_wape ← avg_wape
            best_model ← model

    // Step 4: Parsimony preference — prefer simpler model if within 5% of best
    IF best_model is complex (GBT, HierBayes):
        FOR simple_model IN candidates where simple_model is simpler:
            IF simple_model.avg_wape <= best_wape * 1.05:
                best_model ← simple_model
                BREAK

    // Step 5: Generate probabilistic forecast
    best_model.fit(full sales_history, external_signals)
    forecast_distribution ← best_model.predict_distribution(horizon=90_days)

    RETURN ForecastResult(
        model=best_model.name,
        pattern=pattern,
        accuracy_wape=best_wape,
        daily_distributions=forecast_distribution
    )
```

### 2. Safety Stock and Reorder Point Optimization

```
ALGORITHM ComputeReorderPolicy(sku_id, location_id, forecast, supplier_profile, cost_params):
    // Step 1: Get demand distribution during lead time
    lt_mean ← supplier_profile.lead_time_mean_days
    lt_std ← supplier_profile.lead_time_std_days

    // Convolve demand uncertainty with lead time uncertainty
    // Demand during lead time ~ compound distribution
    daily_demand_mean ← forecast.next_30d_mean / 30
    daily_demand_std ← forecast.daily_distributions.avg_std_dev

    // Lead time demand distribution (assuming independence)
    lt_demand_mean ← daily_demand_mean * lt_mean
    lt_demand_std ← sqrt(
        lt_mean * daily_demand_std^2 +        // demand variability over expected lead time
        daily_demand_mean^2 * lt_std^2         // lead time variability scaled by demand rate
    )

    // Step 2: Compute safety stock for target service level
    service_level ← sku.service_level         // e.g., 0.95 for B-class items
    z_score ← inverse_normal_cdf(service_level)
    safety_stock ← ceiling(z_score * lt_demand_std)

    // Step 3: Apply shelf life constraint for perishable items
    IF sku.is_perishable:
        max_order_cover_days ← sku.default_shelf_life_days - sku.min_remaining_life_days
        max_stock ← ceiling(daily_demand_mean * max_order_cover_days)
        safety_stock ← min(safety_stock, max_stock * 0.3)  // cap safety stock at 30% of max

    // Step 4: Compute reorder point
    reorder_point ← ceiling(lt_demand_mean + safety_stock)

    // Step 5: Compute optimal order quantity (modified EOQ with constraints)
    D ← daily_demand_mean * 365             // annual demand
    S ← cost_params.ordering_cost           // cost per order (admin + shipping)
    H ← cost_params.holding_cost_per_unit_year  // annual holding cost per unit
    eoq ← sqrt(2 * D * S / H)

    // Apply MOQ constraint
    moq ← supplier_profile.moq
    IF eoq < moq:
        order_quantity ← moq
    ELSE:
        order_quantity ← ceiling(eoq / moq) * moq  // round up to nearest MOQ multiple

    // Apply shelf life constraint
    IF sku.is_perishable:
        max_order_qty ← max_stock - safety_stock
        order_quantity ← min(order_quantity, max_order_qty)

    // Apply cash flow constraint
    order_value ← order_quantity * sku.cost_price
    IF order_value > tenant.max_single_po_value:
        order_quantity ← floor(tenant.max_single_po_value / sku.cost_price)
        order_quantity ← max(order_quantity, moq)  // but never below MOQ

    // Step 6: Check volume discount tiers
    FOR tier IN supplier_profile.discount_tiers sorted by quantity DESC:
        IF order_quantity >= tier.quantity:
            // already qualifies
            BREAK
        tier_value ← tier.quantity * sku.cost_price * (1 - tier.discount)
        base_value ← order_quantity * sku.cost_price
        extra_holding ← (tier.quantity - order_quantity) * H * (tier.quantity - order_quantity) / (2 * D)
        IF tier_value + extra_holding < base_value:
            order_quantity ← tier.quantity   // worth ordering more for the discount

    RETURN ReorderPolicy(
        reorder_point=reorder_point,
        order_quantity=order_quantity,
        safety_stock=safety_stock,
        service_level=service_level,
        estimated_stockout_date=today + (available_stock / daily_demand_mean)
    )
```

### 3. FEFO Batch Allocation

```
ALGORITHM AllocateBatchesFEFO(sku_id, location_id, requested_quantity, order_channel):
    // Step 1: Fetch available batches sorted by expiry (earliest first)
    batches ← get_batches(sku_id, location_id)
                .filter(status IN [ACTIVE, LOW_LIFE])
                .sort_by(expiry_date ASC)

    min_remaining_life ← sku.min_remaining_life_days
    allocations ← []
    remaining_qty ← requested_quantity

    // Step 2: Allocate from earliest-expiring batch first
    FOR batch IN batches:
        IF remaining_qty <= 0:
            BREAK

        // Check minimum remaining shelf life
        days_to_expiry ← batch.expiry_date - today
        IF days_to_expiry < min_remaining_life:
            // Skip batch — too close to expiry for customer delivery
            log_warning("Batch {batch.batch_id} skipped: {days_to_expiry} days remaining < minimum {min_remaining_life}")
            CONTINUE

        // Allocate from this batch
        allocate_qty ← min(remaining_qty, batch.available_quantity)
        allocations.add(Allocation(
            batch_id=batch.batch_id,
            lot_number=batch.lot_number,
            quantity=allocate_qty,
            expiry_date=batch.expiry_date
        ))

        batch.allocated_quantity += allocate_qty
        batch.available_quantity -= allocate_qty
        remaining_qty -= allocate_qty

    // Step 3: Handle insufficient stock
    IF remaining_qty > 0:
        // Check other locations for cross-location fulfillment
        alt_locations ← find_alternative_locations(sku_id, remaining_qty, min_remaining_life)
        IF alt_locations is not empty:
            RETURN AllocationResult(
                status=PARTIAL_WITH_SPLIT,
                primary_allocations=allocations,
                split_fulfillment=alt_locations,
                shortfall=0
            )
        ELSE:
            RETURN AllocationResult(
                status=PARTIAL_SHORTFALL,
                allocations=allocations,
                shortfall=remaining_qty
            )

    RETURN AllocationResult(
        status=FULLY_ALLOCATED,
        allocations=allocations,
        shortfall=0
    )
```

### 4. Multi-Channel Inventory Reconciliation

```
ALGORITHM ReconcileChannelInventory(tenant_id, channel_id):
    // Step 1: Fetch all SKUs mapped to this channel
    mapped_skus ← get_channel_mappings(tenant_id, channel_id)

    discrepancies ← []
    corrections ← []

    // Step 2: Fetch channel-reported quantities (paginated API call)
    channel_inventory ← channel_adapter.fetch_inventory(channel_id, mapped_skus)

    // Step 3: Compare platform state vs. channel state
    FOR sku IN mapped_skus:
        platform_atp ← get_atp(tenant_id, sku.sku_id, sku.location_id, channel_id)
        published_qty ← get_published_quantity(tenant_id, sku.sku_id, channel_id)
        channel_reported ← channel_inventory.get(sku.channel_sku_id, null)

        IF channel_reported IS null:
            // SKU exists on platform but not found on channel — possible delisting
            discrepancies.add(Discrepancy(
                type=MISSING_ON_CHANNEL,
                sku_id=sku.sku_id,
                platform_qty=platform_atp,
                channel_qty=0
            ))
            CONTINUE

        drift ← channel_reported - published_qty

        IF abs(drift) > 0:
            discrepancies.add(Discrepancy(
                type=QUANTITY_DRIFT,
                sku_id=sku.sku_id,
                platform_atp=platform_atp,
                published_qty=published_qty,
                channel_reported=channel_reported,
                drift=drift
            ))

            // Determine correction strategy
            IF channel_reported > platform_atp:
                // Channel shows more stock than platform knows about
                // This means channel didn't process our last update, or channel added stock independently
                // Correction: push platform ATP to channel
                corrections.add(Correction(
                    sku_id=sku.sku_id,
                    action=PUSH_TO_CHANNEL,
                    target_qty=platform_atp
                ))

            ELSE IF channel_reported < platform_atp:
                // Channel shows less stock — possible unprocessed orders on channel
                // Check for recent orders from this channel that might not have been webhoooked
                missing_orders ← channel_adapter.fetch_recent_orders(channel_id, sku.channel_sku_id, since=last_reconciliation)
                unprocessed ← missing_orders.filter(order not in processed_events)

                IF unprocessed is not empty:
                    // Process missing orders
                    FOR order IN unprocessed:
                        process_sale_event(order)
                    // Recalculate ATP after processing
                    new_atp ← get_atp(tenant_id, sku.sku_id, sku.location_id, channel_id)
                    corrections.add(Correction(
                        sku_id=sku.sku_id,
                        action=PROCESSED_MISSING_ORDERS,
                        orders_found=len(unprocessed),
                        new_atp=new_atp
                    ))
                ELSE:
                    // Unexplained drift — push platform ATP to channel
                    corrections.add(Correction(
                        sku_id=sku.sku_id,
                        action=PUSH_TO_CHANNEL,
                        target_qty=platform_atp
                    ))

    // Step 4: Apply corrections
    FOR correction IN corrections:
        IF correction.action == PUSH_TO_CHANNEL:
            sync_orchestrator.force_sync(tenant_id, channel_id, correction.sku_id, correction.target_qty)

    // Step 5: Record reconciliation results
    RETURN ReconciliationResult(
        tenant_id=tenant_id,
        channel_id=channel_id,
        skus_checked=len(mapped_skus),
        discrepancies_found=len(discrepancies),
        corrections_applied=len(corrections),
        missing_orders_recovered=sum(c.orders_found for c in corrections where c.action == PROCESSED_MISSING_ORDERS)
    )
```

### 5. Cold-Start Demand Forecasting via Transfer Learning

```
ALGORITHM ColdStartForecast(new_sku, tenant_id, catalog):
    // Step 1: Extract new SKU attributes
    attributes ← {
        category: new_sku.category_path,
        price_point: new_sku.selling_price,
        brand: new_sku.brand,
        is_perishable: new_sku.is_perishable,
        shelf_life: new_sku.default_shelf_life_days,
        unit_of_measure: new_sku.unit_of_measure
    }

    // Step 2: Find analogous SKUs with sufficient history
    candidates ← catalog.filter(
        sku.category_path shares ≥ 2 levels with new_sku.category_path
        AND sku has ≥ 90 days sales history
        AND sku.velocity_tier != DEAD
    )

    // Step 3: Compute similarity scores
    similarities ← []
    FOR candidate IN candidates:
        sim_score ← 0.0

        // Category similarity (Jaccard on path elements)
        category_sim ← jaccard(new_sku.category_path, candidate.category_path)
        sim_score += 0.35 * category_sim

        // Price similarity (1 - normalized absolute difference)
        price_ratio ← min(new_sku.selling_price, candidate.selling_price) /
                       max(new_sku.selling_price, candidate.selling_price)
        sim_score += 0.25 * price_ratio

        // Brand match
        IF new_sku.brand == candidate.brand:
            sim_score += 0.15

        // Perishability match
        IF new_sku.is_perishable == candidate.is_perishable:
            sim_score += 0.10

        // Same storage requirements
        IF new_sku.storage_requirements == candidate.storage_requirements:
            sim_score += 0.05

        // Unit of measure match
        IF new_sku.unit_of_measure == candidate.unit_of_measure:
            sim_score += 0.10

        similarities.add((candidate, sim_score))

    // Step 4: Select top-K analogous SKUs
    top_k ← similarities.sort_by(score DESC).take(5)

    IF top_k is empty OR top_k[0].score < 0.3:
        // No good analogues — fall back to category average
        RETURN CategoryAverageForecast(new_sku.category_path, confidence=LOW)

    // Step 5: Build weighted prior from analogous SKUs
    weights ← normalize([sim.score for sim in top_k])  // sum to 1.0
    prior_mean ← sum(weights[i] * mean_daily_demand(top_k[i].sku) for i in range(K))
    prior_std ← sum(weights[i] * std_daily_demand(top_k[i].sku) for i in range(K))

    // Inflate uncertainty for transfer learning (we're less certain than direct observation)
    prior_std ← prior_std * 1.5

    // Step 6: If new SKU has some initial sales data, do Bayesian update
    IF new_sku.sales_history_days > 0:
        observed_mean ← mean(new_sku.daily_sales)
        observed_std ← std(new_sku.daily_sales)
        n_observations ← new_sku.sales_history_days

        // Bayesian posterior (conjugate normal-normal update)
        prior_precision ← 1 / (prior_std^2)
        data_precision ← n_observations / (observed_std^2)
        posterior_precision ← prior_precision + data_precision
        posterior_mean ← (prior_precision * prior_mean + data_precision * observed_mean) / posterior_precision
        posterior_std ← sqrt(1 / posterior_precision)

        // As n_observations grows, posterior converges to data-driven estimate
        RETURN BayesianForecast(
            mean=posterior_mean,
            std=posterior_std,
            confidence=HIGH if n_observations > 28 else MEDIUM if n_observations > 7 else LOW,
            prior_source=top_k.sku_ids,
            prior_weight=prior_precision / posterior_precision
        )

    ELSE:
        // Pure transfer — no observations yet
        RETURN TransferForecast(
            mean=prior_mean,
            std=prior_std,
            confidence=LOW,
            analogous_skus=top_k.sku_ids,
            recommendation="Monitor actual sales closely for first 2 weeks; forecast will auto-adjust"
        )
```
