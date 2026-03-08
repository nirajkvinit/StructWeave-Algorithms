# Deep Dive & Bottlenecks

## Deep Dive 1: AI-Powered Ticket Routing

### Why This Is Critical

Routing determines whether a customer's issue reaches the right agent on the first try. Misrouting wastes agent time (context switching), increases resolution time, and degrades customer satisfaction. At 15M tickets/day, even a 5% improvement in first-contact resolution rate saves thousands of agent-hours daily.

### Intent Classification Architecture

The intent classifier must handle the open-ended nature of customer support queries, where the same issue can be expressed in hundreds of different ways across multiple languages.

```
PSEUDOCODE: Intent Classification Pipeline

STRUCTURE IntentClassifier:
    base_model: pre_trained_transformer  // Fine-tuned language model
    intent_heads: map[tenant_id → linear_layer]  // Per-tenant classification heads
    global_intents: list[string]  // Platform-wide intents (billing, technical, account, shipping, returns)
    tenant_intents: map[tenant_id → list[string]]  // Custom intents per tenant

FUNCTION classify(text, tenant_id):
    // Step 1: Generate text embedding using shared base model
    embedding = base_model.encode(text)  // 768-dim vector

    // Step 2: Global intent prediction
    global_scores = global_head.forward(embedding)  // softmax over global intents
    top_global = argmax(global_scores)

    // Step 3: Tenant-specific intent prediction (if tenant has custom intents)
    IF tenant_id IN tenant_intents:
        tenant_scores = intent_heads[tenant_id].forward(embedding)
        top_tenant = argmax(tenant_scores)

        // Use tenant intent if confidence is higher
        IF tenant_scores[top_tenant] > global_scores[top_global]:
            RETURN {intent: top_tenant, confidence: tenant_scores[top_tenant], source: "tenant"}

    RETURN {intent: top_global, confidence: global_scores[top_global], source: "global"}
```

### Priority Prediction

Priority prediction uses both text features and contextual signals:

```
PSEUDOCODE: Priority Prediction Model

FUNCTION predict_priority(ticket, classification):
    features = concatenate([
        classification.embedding,          // Text semantics
        one_hot(classification.intent),    // Classified intent
        encode_sentiment(ticket.text),     // Negative sentiment → higher priority
        customer_tier_encoding(ticket.requester),  // VIP customers → higher priority
        time_features(ticket.created_at),  // Weekend/holiday tickets may be higher priority
        encode_channel(ticket.channel),    // Phone/chat often more urgent than email
        historical_features(ticket.requester)  // Repeat contacts suggest escalation needed
    ])

    priority_scores = priority_model.forward(features)
    predicted = argmax(priority_scores)  // low, normal, high, urgent

    RETURN {
        priority: predicted,
        confidence: priority_scores[predicted],
        signals: {
            sentiment: "negative" if features.sentiment < -0.5,
            vip: customer_tier >= "enterprise",
            repeat: historical_features.recent_tickets > 2
        }
    }
```

### Agent Skill Matching and Load Balancing

```
PSEUDOCODE: Agent Selection with Load Awareness

FUNCTION get_eligible_agents(tenant_id, classification):
    // Query agents who:
    // 1. Belong to this tenant
    // 2. Are currently online or available
    // 3. Have the required skill for the classified intent
    // 4. Are not at max capacity

    agents = SELECT a.*,
                    COUNT(active_tickets) as current_load,
                    a.skills->>classification.intent as skill_level
             FROM agents a
             LEFT JOIN tickets t ON t.assignee_id = a.id AND t.status IN ('open', 'pending')
             WHERE a.tenant_id = tenant_id
               AND a.status = 'online'
               AND a.skills ? classification.intent
             GROUP BY a.id
             HAVING COUNT(active_tickets) < a.max_concurrent_tickets

    // Sort by composite score (computed in application layer)
    RETURN agents

FUNCTION handle_low_confidence(ticket, classification):
    // When AI confidence is below threshold, use a tiered fallback:

    IF classification.intent_confidence >= 0.8:
        // High confidence: auto-route to best agent
        RETURN route_to_agent(ticket, classification)

    ELSE IF classification.intent_confidence >= 0.6:
        // Medium confidence: route to skill group queue (not specific agent)
        group = get_group_for_intent(classification.intent, ticket.tenant_id)
        RETURN route_to_group(ticket, group)

    ELSE:
        // Low confidence: route to manual triage queue
        RETURN route_to_triage(ticket, ticket.tenant_id)
```

### Feedback Loop and Model Retraining

```
PSEUDOCODE: Routing Feedback Collection

FUNCTION on_ticket_reassignment(ticket_id, old_agent_id, new_agent_id, reason):
    // Agent manually reassigned the ticket → routing was suboptimal
    routing_decision = get_routing_decision(ticket_id)

    feedback = {
        ticket_id: ticket_id,
        original_intent: routing_decision.intent,
        original_agent: old_agent_id,
        corrected_agent: new_agent_id,
        reassignment_reason: reason,  // "wrong_skill", "overloaded", "customer_request"
        time_to_reassign: now() - routing_decision.created_at
    }

    // Store for batch retraining
    append_to_training_data(feedback)

    // Update real-time routing signals
    IF reason == "wrong_skill":
        // The intent classification was wrong
        decrement_confidence_for_pattern(routing_decision.text_hash, routing_decision.intent)

// Retraining runs daily as a batch job:
// 1. Collect all reassignment feedback from past 24 hours
// 2. Fine-tune intent classifier on corrected labels
// 3. A/B test new model against current model on shadow traffic
// 4. Promote if accuracy improves by >1%
```

---

## Deep Dive 2: SLA Management at Scale

### Why This Is Critical

SLA breaches have direct financial consequences (penalty clauses in enterprise contracts) and reputational impact (customer churn). The SLA engine must accurately track time across business hours, timezones, holidays, and paused states---for millions of active timers simultaneously.

### Timer Architecture

Naive approaches (cron job checking all timers every minute) fail at scale because:
- 5M active tickets * 3 timers each = 15M timer checks per minute
- Business hour computation is CPU-intensive (timezone conversions, holiday lookups)
- Timer checks must be idempotent (safe to retry on failure)

The solution is a **timer wheel** combined with **event-driven updates**:

```
PSEUDOCODE: Distributed Timer Wheel

STRUCTURE TimerWheel:
    // Partitioned by tenant_id hash for distribution across worker nodes
    buckets: map[unix_timestamp_second → list[TimerReference]]
    bucket_resolution: 10 seconds  // Group timers into 10-second buckets

FUNCTION schedule_timer(timer):
    // Compute when this timer should next be checked
    next_check = compute_next_check_time(timer)
    bucket_key = floor(next_check / bucket_resolution) * bucket_resolution
    buckets[bucket_key].append(TimerReference(timer.id, timer.tenant_id))

FUNCTION compute_next_check_time(timer):
    IF timer.status == "paused":
        RETURN INFINITY  // Do not check paused timers

    // For breach detection: check at target_at
    // For warning: check at target_at - warning_threshold
    // For accuracy: also check periodically during business hours
    warning_time = timer.target_at - timer.policy.warning_threshold_seconds

    next_checks = [timer.target_at]
    IF warning_time > now():
        next_checks.append(warning_time)

    RETURN MIN(next_checks)

FUNCTION tick(current_time):
    // Called by timer worker every 10 seconds
    bucket_key = floor(current_time / bucket_resolution) * bucket_resolution
    timers_to_check = buckets.remove(bucket_key)

    FOR timer_ref IN timers_to_check:
        timer = load_timer(timer_ref.id)
        IF timer IS NULL OR timer.status != "active":
            CONTINUE

        calendar = load_business_calendar(timer.policy.business_calendar_id)
        elapsed = compute_elapsed_business_time(timer.created_at, current_time, calendar)
        remaining = timer.remaining_business_seconds - elapsed

        IF remaining <= 0:
            // BREACH
            timer.status = "breached"
            timer.breached_at = current_time
            emit_event(SLABreached, timer)
            persist_timer(timer)

        ELSE IF remaining <= timer.policy.warning_threshold:
            // NEAR BREACH - send warning
            emit_event(SLAWarning, timer, remaining_seconds=remaining)
            // Re-schedule for breach check
            schedule_timer(timer)

        ELSE:
            // Still within SLA - re-schedule
            schedule_timer(timer)
```

### Clock Skew and Distributed Timer Consistency

When timer workers run across multiple nodes, clock skew can cause timers to fire early or late:

```
PSEUDOCODE: Clock Skew Mitigation

// Each timer worker syncs with a centralized time service
FUNCTION get_authoritative_time():
    // Use NTP-synchronized time source
    // Fallback: consensus-based time across worker nodes
    RETURN time_service.now()  // Max drift: 50ms

// Timer checks use authoritative time, not local clock
FUNCTION tick_with_authoritative_time():
    current_time = get_authoritative_time()
    // ... rest of tick logic uses current_time

// For critical breach decisions, double-check:
FUNCTION confirm_breach(timer):
    // Re-read timer state from durable storage (not cache)
    fresh_timer = read_from_db(timer.id)

    IF fresh_timer.status != "active":
        RETURN  // Already handled by another worker (idempotent)

    // Re-compute with authoritative time
    authoritative_now = get_authoritative_time()
    elapsed = compute_elapsed_business_time(
        fresh_timer.created_at, authoritative_now,
        load_business_calendar(fresh_timer.policy.business_calendar_id)
    )

    IF elapsed >= fresh_timer.remaining_business_seconds:
        // Confirmed breach
        fresh_timer.status = "breached"
        fresh_timer.breached_at = authoritative_now
        persist_timer(fresh_timer)  // Optimistic lock to prevent double-breach
        emit_event(SLABreached, fresh_timer)
```

### Escalation Chains

```
PSEUDOCODE: SLA Escalation Logic

STRUCTURE EscalationPolicy:
    levels: list[EscalationLevel]

STRUCTURE EscalationLevel:
    trigger: "breach" | "warning" | "time_after_breach"
    delay_minutes: int  // Minutes after trigger to escalate
    actions: list[EscalationAction]

STRUCTURE EscalationAction:
    type: "reassign" | "notify" | "elevate_priority" | "add_cc"
    target: string  // Agent ID, group ID, or email

FUNCTION handle_sla_breach(timer, ticket):
    policy = get_escalation_policy(timer.policy_id)

    FOR level IN policy.levels:
        IF level.trigger == "breach" AND level.delay_minutes == 0:
            // Immediate escalation on breach
            execute_escalation_actions(level.actions, ticket)

        ELSE IF level.trigger == "time_after_breach":
            // Schedule delayed escalation
            schedule_delayed_escalation(
                ticket.id,
                level.actions,
                delay = level.delay_minutes
            )

FUNCTION execute_escalation_actions(actions, ticket):
    FOR action IN actions:
        SWITCH action.type:
            CASE "reassign":
                reassign_ticket(ticket.id, action.target)
            CASE "notify":
                send_escalation_notification(action.target, ticket)
            CASE "elevate_priority":
                update_ticket_priority(ticket.id, next_priority(ticket.priority))
            CASE "add_cc":
                add_ticket_collaborator(ticket.id, action.target)
```

---

## Deep Dive 3: Live Chat Connection Management

### Why This Is Critical

Live chat requires sub-200ms message delivery to feel real-time. With 500K concurrent chat sessions and 2.5M WebSocket connections, the WebSocket Gateway must handle massive connection state while ensuring message delivery reliability.

### WebSocket Gateway Architecture

```
PSEUDOCODE: WebSocket Gateway

STRUCTURE ConnectionRegistry:
    // Maps user/agent ID to their WebSocket connection(s)
    // Stored in distributed cache for cross-node routing
    connections: map[user_id → list[ConnectionInfo]]

STRUCTURE ConnectionInfo:
    connection_id: string
    gateway_node_id: string  // Which gateway node holds the socket
    user_type: "agent" | "customer"
    tenant_id: uuid
    connected_at: timestamp
    last_heartbeat: timestamp

FUNCTION on_connect(websocket, auth_token):
    // Authenticate and extract identity
    identity = verify_token(auth_token)
    IF identity IS NULL:
        websocket.close(4001, "Unauthorized")
        RETURN

    conn_info = ConnectionInfo(
        connection_id = generate_id(),
        gateway_node_id = self.node_id,
        user_type = identity.type,
        tenant_id = identity.tenant_id,
        connected_at = now(),
        last_heartbeat = now()
    )

    // Register in distributed connection registry
    registry.add(identity.user_id, conn_info)

    // Subscribe to user's message channel
    pubsub.subscribe(channel="user:" + identity.user_id, handler=websocket.send)

    // If agent: update presence status
    IF identity.type == "agent":
        update_agent_presence(identity.user_id, "online")

FUNCTION on_disconnect(user_id, connection_id):
    registry.remove(user_id, connection_id)

    // If agent has no remaining connections, set to offline
    remaining = registry.get_connections(user_id)
    IF remaining IS EMPTY AND user_type == "agent":
        update_agent_presence(user_id, "offline")
        // Reassign active chats to other agents
        reassign_agent_chats(user_id)

FUNCTION deliver_message(target_user_id, message):
    connections = registry.get_connections(target_user_id)

    IF connections IS EMPTY:
        // User is offline; store for later delivery
        store_offline_message(target_user_id, message)
        RETURN

    FOR conn IN connections:
        IF conn.gateway_node_id == self.node_id:
            // Local delivery
            local_websocket = get_local_socket(conn.connection_id)
            local_websocket.send(serialize(message))
        ELSE:
            // Cross-node delivery via pub/sub
            pubsub.publish(
                channel = "user:" + target_user_id,
                message = serialize(message)
            )
```

### Session Persistence and Reconnection

```
PSEUDOCODE: Chat Session Recovery

FUNCTION on_reconnect(websocket, auth_token, last_message_id):
    identity = verify_token(auth_token)

    // Re-establish connection
    on_connect(websocket, auth_token)

    // Replay missed messages since last_message_id
    IF last_message_id IS NOT NULL:
        active_conversations = get_active_conversations(identity.user_id)
        FOR conv IN active_conversations:
            missed = SELECT * FROM messages
                     WHERE conversation_id = conv.id
                       AND id > last_message_id
                     ORDER BY created_at ASC

            FOR msg IN missed:
                websocket.send(serialize(msg))

    // Restore typing indicators for active conversations
    FOR conv IN active_conversations:
        active_typers = get_typing_state(conv.id)
        IF active_typers:
            websocket.send({type: "typing.active", typers: active_typers})
```

### Typing Indicators and Presence

```
PSEUDOCODE: Ephemeral State (Not Persisted)

FUNCTION on_typing_start(user_id, conversation_id):
    // Store in cache with short TTL (5 seconds)
    cache.set(
        key = "typing:" + conversation_id + ":" + user_id,
        value = {user_id, started_at: now()},
        ttl = 5  // Auto-expires if no renewal
    )

    // Broadcast to other participants (not persisted)
    participants = get_conversation_participants(conversation_id)
    FOR participant IN participants:
        IF participant.id != user_id:
            deliver_ephemeral(participant.id, {
                type: "typing.start",
                conversation_id: conversation_id,
                user_id: user_id
            })

// Typing indicators are fire-and-forget:
// - Not persisted to database
// - Not retried on delivery failure
// - Auto-expire via cache TTL
// - Client renews every 3 seconds while typing
```

---

## Deep Dive 4: Knowledge Base Search and Deflection

### Why This Is Critical

Knowledge base deflection directly reduces ticket volume. A 10% deflection rate on 15M daily tickets means 1.5M tickets avoided---equivalent to thousands of agent-hours saved. The key is relevance: showing the right article at the right time.

### Search Architecture

```
PSEUDOCODE: Hybrid Search Pipeline

FUNCTION search_knowledge_base(query, tenant_id, options):
    // Parallel search: keyword + semantic
    keyword_future = async search_keyword(query, tenant_id, options)
    semantic_future = async search_semantic(query, tenant_id, options)

    keyword_results = await keyword_future
    semantic_results = await semantic_future

    // Merge with Reciprocal Rank Fusion
    merged = reciprocal_rank_fusion(
        rankings = [keyword_results, semantic_results],
        k = 60  // RRF parameter
    )

    // Apply permission filter (some articles may be internal-only)
    filtered = filter_by_access(merged, options.user_type)

    // Re-rank by engagement signals
    reranked = apply_engagement_boost(filtered, tenant_id)

    RETURN reranked[:options.limit]


FUNCTION reciprocal_rank_fusion(rankings, k):
    scores = {}
    FOR ranking IN rankings:
        FOR i, doc IN enumerate(ranking):
            IF doc.id NOT IN scores:
                scores[doc.id] = {doc: doc, score: 0}
            scores[doc.id].score += 1.0 / (k + i + 1)

    RETURN sorted(scores.values(), by=score, descending=True)


FUNCTION apply_engagement_boost(articles, tenant_id):
    FOR article IN articles:
        // Boost by click-through rate from similar queries
        ctr = get_article_ctr(article.id, tenant_id)
        article.score *= (1 + ctr * 0.5)

        // Boost by helpful vote ratio
        IF article.helpful_count + article.not_helpful_count > 10:
            helpful_ratio = article.helpful_count / (article.helpful_count + article.not_helpful_count)
            article.score *= (0.5 + helpful_ratio)

        // Penalty for stale articles
        days_since_update = (now() - article.updated_at).days
        IF days_since_update > 180:
            article.score *= 0.7  // 30% penalty for articles not updated in 6 months

    RETURN sorted(articles, by=score, descending=True)
```

### Deflection Measurement

```
PSEUDOCODE: Deflection Tracking

FUNCTION track_deflection_journey(session_id, tenant_id):
    // Track the customer journey from search to outcome
    journey = {
        session_id: session_id,
        tenant_id: tenant_id,
        searches: [],
        articles_viewed: [],
        outcome: null  // "deflected" or "ticket_created"
    }

    // On each search:
    ON search_performed(query, results):
        journey.searches.append({query, result_ids: results.map(r => r.id), timestamp: now()})

    // On article view:
    ON article_viewed(article_id, time_on_page):
        journey.articles_viewed.append({article_id, time_on_page, timestamp: now()})

    // On outcome:
    ON ticket_created(ticket_id):
        journey.outcome = "ticket_created"
        journey.ticket_id = ticket_id
        persist_journey(journey)

    ON session_ended_without_ticket():
        IF journey.articles_viewed.length > 0:
            journey.outcome = "deflected"
        ELSE:
            journey.outcome = "abandoned"
        persist_journey(journey)

    // Analytics aggregation:
    // deflection_rate = deflected_sessions / (deflected_sessions + ticket_created_sessions)
    // Most effective articles = articles with highest deflection rate
    // Gap analysis = queries where outcome is always "ticket_created"
```

---

## Bottleneck Analysis

| Bottleneck | Impact | Solution |
|-----------|--------|----------|
| **SLA timer computation under load** | 15M active timers with business hour calculations are CPU-intensive; timer checks can lag, causing late breach detection | Timer wheel with 10-second resolution; partition timers across worker nodes by tenant; cache business calendar computations; prioritize soon-to-breach timers |
| **WebSocket connection limits per gateway node** | Each gateway node can handle ~100K connections; beyond that, connection handling degrades | Horizontal scaling of WebSocket Gateway nodes; sticky routing by user hash; connection draining during deployments |
| **Hot tenant (noisy neighbor)** | One tenant with a product outage generates 100x normal volume, monopolizing shared resources | Per-tenant rate limiting at API Gateway; per-tenant query cost budgets at database; dedicated compute pools for largest tenants; tenant-aware autoscaling |
| **Chat message ordering** | Messages from customer and agent may arrive at Chat Service out of order due to network timing | Server-assigned monotonic sequence numbers per conversation; client reorders by sequence; conflict resolution for simultaneous sends |
| **Search index freshness** | New articles or recently updated articles not appearing in search results | Near-real-time indexing via CDC; article publish event triggers immediate re-index; search results include "last indexed" timestamp for transparency |
| **AI model cold start** | First ticket after model reload or scaling event has high latency (model loading into GPU memory) | Keep models warm with periodic health-check predictions; pre-load models during deployment; use CPU fallback model for cold-start period |
| **Automation rule evaluation fan-out** | A single ticket event may trigger evaluation of hundreds of automation rules per tenant | Rule evaluation engine with short-circuit optimization (stop at first match); compile rules into a decision tree per tenant; cache compiled rules |
| **Webhook delivery backlog** | A tenant's webhook endpoint is slow or down, causing queue backlog | Per-tenant webhook delivery queues with exponential backoff; circuit breaker per endpoint; dead letter queue for persistent failures; webhook delivery SLA separate from core SLA |
| **Cross-shard queries for reporting** | Analytics queries (e.g., "all tickets this month") span all tenant shards | Dedicated analytics replica with cross-shard materialized views; pre-aggregated daily rollups; report generation is async with email delivery |
