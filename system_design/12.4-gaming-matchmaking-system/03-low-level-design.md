# Low-Level Design — Gaming Matchmaking System

## 1. Data Models

### 1.1 Player Skill Profile

```
PlayerSkillProfile {
    player_id:          UUID                    // Unique player identifier
    display_name:       String                  // Player's visible name
    account_age_days:   Integer                 // Days since account creation
    total_matches:      Integer                 // Lifetime match count (all modes)

    // Per-mode skill ratings
    mode_ratings: Map<GameMode, SkillRating> {
        GameMode → {
            mu:                 Float64         // Mean skill estimate (default: 1500)
            sigma:              Float64         // Skill uncertainty (default: 350)
            ordinal:            Float64         // Display rating = mu - 3×sigma
            matches_played:     Integer         // Matches in this mode
            last_match_time:    Timestamp       // For inactivity decay
            placement_complete: Boolean         // True after calibration series
            season_id:          String          // Current season identifier
            peak_ordinal:       Float64         // Highest rating achieved this season
            win_streak:         Integer         // Current consecutive wins
            loss_streak:        Integer         // Current consecutive losses
        }
    }

    // Behavioral signals
    behavior_score:     Float64                 // 0-100, affects queue priority
    abandon_rate:       Float64                 // Recent match abandon percentage
    report_count:       Integer                 // Reports received (rolling 30-day)

    // Anti-smurf metadata
    hardware_id:        String (hashed)         // Hardware fingerprint hash
    smurf_flag:         Enum {NONE, SUSPECTED, CONFIRMED, ACCELERATED}
    calibration_speed:  Float64                 // Rate of MMR convergence adjustment

    // Regional data
    home_region:        String                  // Primary play region
    latency_profile:    Map<Region, Percentile> // p50 ping to each server region
}
```

### 1.2 Match Ticket

```
MatchTicket {
    ticket_id:          UUID                    // Unique ticket identifier
    created_at:         Timestamp               // Queue entry time (for age-based expansion)
    status:             Enum {QUEUED, SEARCHING, MATCHED, EXPIRED, CANCELLED}

    // Player(s) information
    party_id:           UUID?                   // Null for solo, set for parties
    player_ids:         List<UUID>              // 1 for solo, 2-5 for party
    party_size:         Integer                 // Number of players in this ticket

    // Skill summary (pre-computed at queue entry)
    effective_skill: {
        mu:             Float64                 // Weighted party average
        sigma:          Float64                 // Combined uncertainty
        ordinal:        Float64                 // Display-ready value
        min_mu:         Float64                 // Lowest individual μ in party
        max_mu:         Float64                 // Highest individual μ in party
        spread:         Float64                 // max_mu - min_mu
    }

    // Search parameters
    game_mode:          GameMode                // Ranked, Casual, etc.
    region:             String                  // Primary search region
    eligible_regions:   List<String>            // Regions with acceptable ping
    role_preferences:   Map<UUID, List<Role>>   // Per-player role preferences

    // Dynamic matching window
    current_window: {
        skill_tolerance:  Float64               // Current acceptable skill delta
        latency_cap_ms:   Integer               // Current max acceptable ping
        search_regions:   List<String>          // Regions currently being searched
        quality_floor:    Float64               // Minimum acceptable match quality
    }

    // Match result (populated when matched)
    match_id:           UUID?                   // Set when match is formed
    assigned_server:    ServerEndpoint?         // Set when server is allocated
}
```

### 1.3 Match Record

```
MatchRecord {
    match_id:           UUID                    // Unique match identifier
    game_mode:          GameMode
    region:             String                  // Server region
    server_id:          String                  // Game server instance ID

    // Timing
    created_at:         Timestamp               // Match formation time
    started_at:         Timestamp               // Game start time
    ended_at:           Timestamp               // Game end time
    duration_seconds:   Integer

    // Teams
    teams: List<Team> {
        team_id:        Integer                 // 0 or 1 (for 2-team games)
        players: List<MatchPlayer> {
            player_id:      UUID
            pre_match_mu:   Float64             // Rating before this match
            pre_match_sigma: Float64
            post_match_mu:  Float64             // Rating after this match
            post_match_sigma: Float64
            party_id:       UUID?
            role:           Role?
            performance: {
                kills:      Integer
                deaths:     Integer
                assists:    Integer
                damage:     Integer
                objectives: Integer
                // Mode-specific performance fields
                custom_stats: Map<String, Float64>
            }
            disconnected:   Boolean
            abandon:        Boolean
        }
    }

    // Outcome
    winning_team:       Integer                 // Team ID of winner (-1 for draw)

    // Quality metadata
    quality_score:      Float64                 // Pre-match quality prediction
    actual_competitiveness: Float64             // Post-match closeness metric
    avg_queue_time_sec: Float64                 // Average queue time of all players
    skill_variance:     Float64                 // Team skill delta at match start
}
```

### 1.4 Queue Pool

```
QueuePool {
    pool_id:            String                  // "NA-East:Ranked:Gold" format
    region:             String
    game_mode:          GameMode
    rank_tier:          RankTier?               // Optional tier subdivision

    // Pool state
    tickets:            SortedSet<MatchTicket>  // Sorted by effective_skill.ordinal
    ticket_count:       Integer
    avg_wait_time_sec:  Float64                 // Rolling average for estimates

    // Configuration
    match_size:         Integer                 // Players per match (e.g., 10 for 5v5)
    team_size:          Integer                 // Players per team (e.g., 5)
    min_quality:        Float64                 // Base quality threshold
    expansion_config:   ExpansionConfig         // Time-based window expansion rules

    // Overflow
    overflow_pools:     List<String>            // Adjacent pool IDs for overflow
    overflow_threshold_sec: Integer             // Time before overflow kicks in
}
```

---

## 2. API Design

### 2.1 Queue Management

```
POST /v1/matchmaking/queue/enter
Headers: Authorization: Bearer <session_token>
Body: {
    game_mode:          "ranked_5v5"
    party_id:           "uuid-party-123"        // Optional
    role_preferences:   ["damage", "support"]   // Optional
    preferred_region:   "na-east"               // Optional, auto-detected if omitted
}
Response 200: {
    ticket_id:          "uuid-ticket-456"
    estimated_wait_sec: 25
    pool_population:    12450
    status:             "QUEUED"
}
Response 409: {
    error:              "ALREADY_IN_QUEUE"
    existing_ticket:    "uuid-ticket-existing"
}
Response 422: {
    error:              "PARTY_RANK_SPREAD_EXCEEDED"
    detail:             "Party skill spread 750 exceeds maximum 600"
}
```

```
DELETE /v1/matchmaking/queue/cancel
Headers: Authorization: Bearer <session_token>
Body: {
    ticket_id:          "uuid-ticket-456"
}
Response 200: {
    status:             "CANCELLED"
    queue_duration_sec: 12
}
Response 404: {
    error:              "TICKET_NOT_FOUND"
}
```

```
GET /v1/matchmaking/queue/status
Headers: Authorization: Bearer <session_token>
Response 200: {
    ticket_id:          "uuid-ticket-456"
    status:             "SEARCHING"
    queue_duration_sec: 18
    estimated_remaining_sec: 12
    current_window: {
        skill_tolerance:  150
        search_regions:   ["na-east"]
    }
}
```

### 2.2 Match Lifecycle

```
WebSocket /v1/matchmaking/events
→ Server pushes:

// Queue status updates (every 5 seconds)
{
    type:               "QUEUE_UPDATE"
    ticket_id:          "uuid-ticket-456"
    queue_duration_sec: 23
    estimated_remaining: 8
    pool_population:    12380
}

// Match found
{
    type:               "MATCH_FOUND"
    match_id:           "uuid-match-789"
    game_mode:          "ranked_5v5"
    server: {
        host:           "game-server-na-east-042.example.net"
        port:           7777
        auth_token:     "match-specific-token"
        region:         "na-east"
    }
    team_assignment:    0
    teammates: [
        { display_name: "Player2", role: "support" },
        { display_name: "Player3", role: "damage" },
        // ... (no skill info exposed to prevent toxicity)
    ]
    accept_timeout_sec: 10
}

// Match accept/decline (if confirmation required)
← Client sends:
{
    type:               "MATCH_RESPONSE"
    match_id:           "uuid-match-789"
    accept:             true
}
```

### 2.3 Post-Match Rating

```
// Internal API — called by Game Session Manager
POST /v1/internal/rating/update
Body: {
    match_id:           "uuid-match-789"
    game_mode:          "ranked_5v5"
    winning_team:       0
    teams: [
        {
            team_id: 0,
            players: [
                {
                    player_id: "uuid-player-1",
                    performance: { kills: 22, deaths: 8, assists: 5, damage: 4200 }
                },
                // ... remaining players
            ]
        },
        {
            team_id: 1,
            players: [ /* ... */ ]
        }
    ]
    match_duration_sec: 1520
    metadata: {
        surrendered:    false,
        disconnects:    ["uuid-player-who-dc"]
    }
}
Response 200: {
    rating_updates: [
        {
            player_id:      "uuid-player-1"
            old_mu:         1680.2
            new_mu:         1694.8
            old_sigma:      42.1
            new_sigma:      40.3
            old_ordinal:    1553.9
            new_ordinal:    1573.9
            rank_change:    null        // Or "PROMOTED" / "DEMOTED"
        },
        // ... all players
    ]
}
```

### 2.4 Player Rating Query

```
GET /v1/players/{player_id}/ratings
Headers: Authorization: Bearer <session_token>
Response 200: {
    player_id:          "uuid-player-1"
    ratings: {
        "ranked_5v5": {
            ordinal:            1573.9
            rank:               "Platinum II"
            rank_progress:      0.73        // 73% toward next rank
            matches_played:     142
            win_rate:           0.521
            peak_ordinal:       1612.4
            season:             "S12"
            placement_complete: true
        },
        "casual_5v5": {
            ordinal:            1450.2
            matches_played:     89
            // No rank for casual modes
        }
    }
}
```

---

## 3. Core Algorithms

### 3.1 TrueSkill 2 Rating Update

The rating engine maintains two parameters per player per mode: μ (mean skill) and σ (uncertainty). Higher σ means less confidence in the rating.

```
FUNCTION UpdateRatings(match):
    // Step 1: Build factor graph for the match
    teams = match.teams
    FOR EACH team IN teams:
        FOR EACH player IN team.players:
            // Prior factor: current skill belief
            prior = GaussianDistribution(player.mu, player.sigma)

            // Performance factor: skill + noise
            performance_variance = BETA²    // Game-specific noise parameter
            performance = GaussianDistribution(prior.mu, sqrt(prior.sigma² + performance_variance))

    // Step 2: Team performance = sum of individual performances
    FOR EACH team IN teams:
        team_performance = SumOfGaussians(team.player_performances)

    // Step 3: Outcome factor based on match result
    // Winner's team performance > Loser's team performance
    outcome_margin = team_performances[winner] - team_performances[loser]
    // Apply truncated Gaussian update based on observed outcome

    // Step 4: Run belief propagation (5-30 iterations)
    REPEAT UNTIL convergence OR max_iterations:
        FOR EACH factor IN factor_graph:
            factor.UpdateMessages()

    // Step 5: Extract updated beliefs
    FOR EACH player IN all_players:
        new_belief = player_factor.GetMarginal()
        player.mu = new_belief.mu
        player.sigma = new_belief.sigma

    // Step 6: Apply performance bonus (TrueSkill 2 extension)
    FOR EACH player IN all_players:
        perf_score = NormalizePerformance(player.performance, match.mode)
        // Individual performance adjusts μ by up to ±5%
        perf_adjustment = perf_score × PERFORMANCE_WEIGHT × player.sigma
        player.mu += perf_adjustment

    // Step 7: Apply sigma floor (prevent over-confidence)
    FOR EACH player IN all_players:
        player.sigma = MAX(player.sigma, SIGMA_FLOOR)    // Typically 25.0

    // Step 8: Smurf acceleration
    FOR EACH player IN all_players:
        IF player.smurf_flag == ACCELERATED:
            // Double the rating change for suspected smurfs
            delta_mu = player.mu - player.pre_match_mu
            player.mu += delta_mu × SMURF_ACCELERATION_FACTOR

    RETURN updated_ratings

CONSTANTS:
    BETA = 125.0                        // Performance variance (game-specific)
    SIGMA_FLOOR = 25.0                  // Minimum uncertainty
    PERFORMANCE_WEIGHT = 0.05           // Individual performance influence
    SMURF_ACCELERATION_FACTOR = 1.0     // Extra multiplier for smurf convergence
    DEFAULT_MU = 1500.0
    DEFAULT_SIGMA = 350.0
```

### 3.2 Expanding-Window Search Algorithm

```
FUNCTION ExpandWindow(ticket, elapsed_seconds, config):
    // Base parameters (from pool configuration)
    base_skill = config.base_skill_tolerance       // e.g., 50
    base_latency = config.base_latency_cap         // e.g., 40ms
    base_quality = config.base_quality_floor        // e.g., 0.70

    // Expansion rate (configurable per mode)
    skill_rate = config.skill_expansion_per_second  // e.g., 3.0 rating points/sec
    latency_rate = config.latency_expansion_per_sec // e.g., 1.5 ms/sec
    quality_decay = config.quality_decay_per_second  // e.g., 0.003/sec

    // Calculate current window
    skill_tolerance = base_skill + (skill_rate × elapsed_seconds)
    skill_tolerance = MIN(skill_tolerance, config.max_skill_tolerance)  // Cap at 500

    latency_cap = base_latency + (latency_rate × elapsed_seconds)
    latency_cap = MIN(latency_cap, config.max_latency_cap)  // Cap at 150ms

    quality_floor = base_quality - (quality_decay × elapsed_seconds)
    quality_floor = MAX(quality_floor, config.min_quality_floor)  // Floor at 0.40

    // Region expansion (step function)
    IF elapsed_seconds < 60:
        search_regions = [ticket.region]
    ELSE IF elapsed_seconds < 90:
        search_regions = [ticket.region] + GetAdjacentRegions(ticket.region)
    ELSE:
        search_regions = ticket.eligible_regions  // All regions with acceptable ping

    RETURN SearchWindow {
        skill_tolerance: skill_tolerance,
        latency_cap: latency_cap,
        quality_floor: quality_floor,
        search_regions: search_regions
    }
```

### 3.3 Match Formation Algorithm

```
FUNCTION FormMatches(pool):
    // Step 1: Snapshot the pool (atomic read)
    tickets = pool.GetSortedTickets()   // Sorted by ordinal rating
    formed_matches = []
    consumed_tickets = Set()

    // Step 2: For each ticket, find the best match
    FOR EACH ticket_a IN tickets:
        IF ticket_a.id IN consumed_tickets:
            CONTINUE

        window_a = ExpandWindow(ticket_a, ticket_a.Age(), pool.config)
        best_match = NULL
        best_quality = 0.0

        // Step 3: Search within skill window (binary search on sorted set)
        candidates = tickets.Range(
            ticket_a.effective_skill.ordinal - window_a.skill_tolerance,
            ticket_a.effective_skill.ordinal + window_a.skill_tolerance
        )

        // Step 4: Try to form a full match (e.g., 10 players for 5v5)
        candidate_group = [ticket_a]
        remaining_slots = pool.match_size - ticket_a.party_size

        FOR EACH ticket_b IN candidates:
            IF ticket_b.id IN consumed_tickets:
                CONTINUE
            IF ticket_b.id == ticket_a.id:
                CONTINUE
            IF ticket_b.party_size > remaining_slots:
                CONTINUE

            // Check latency compatibility
            window_b = ExpandWindow(ticket_b, ticket_b.Age(), pool.config)
            IF NOT LatencyCompatible(ticket_a, ticket_b, window_a, window_b):
                CONTINUE

            // Check rematch avoidance
            IF RecentlyPlayed(ticket_a.player_ids, ticket_b.player_ids):
                CONTINUE

            candidate_group.APPEND(ticket_b)
            remaining_slots -= ticket_b.party_size

            IF remaining_slots == 0:
                BREAK

        // Step 5: If we have a full match, score it
        IF remaining_slots == 0:
            teams = AssignTeams(candidate_group, pool.team_size)
            quality = ScoreMatch(teams, pool)

            // Use the most restrictive quality floor among all tickets
            min_quality_floor = MIN(window.quality_floor FOR window IN all_windows)

            IF quality >= min_quality_floor:
                IF quality > best_quality:
                    best_match = Match(teams, quality)
                    best_quality = quality

        // Step 6: Commit the best match found
        IF best_match != NULL:
            formed_matches.APPEND(best_match)
            FOR EACH ticket IN best_match.tickets:
                consumed_tickets.ADD(ticket.id)

    // Step 7: Atomically dequeue all consumed tickets
    pool.AtomicRemove(consumed_tickets)

    RETURN formed_matches
```

### 3.4 Team Assignment Algorithm

```
FUNCTION AssignTeams(tickets, team_size):
    // Goal: minimize skill difference between teams while respecting party integrity
    all_players = FlattenTickets(tickets)  // Expand parties into individuals
    num_teams = LEN(all_players) / team_size

    // Step 1: Sort by effective skill
    sorted = SORT(all_players, BY skill DESC)

    // Step 2: Snake draft for initial assignment
    // Distributes players alternately: best→Team0, 2nd→Team1, 3rd→Team1, 4th→Team0, ...
    teams = [[] FOR _ IN RANGE(num_teams)]
    direction = 1
    team_idx = 0
    FOR EACH player IN sorted:
        teams[team_idx].APPEND(player)
        team_idx += direction
        IF team_idx >= num_teams OR team_idx < 0:
            direction *= -1
            team_idx += direction

    // Step 3: Party constraint enforcement
    // Ensure all party members are on the same team
    FOR EACH party IN GetParties(tickets):
        // Find which team has the most party members
        target_team = TeamWithMostMembers(teams, party)
        // Move all party members to target team (swap with same-skill opponents)
        FOR EACH member IN party.members:
            IF member NOT IN teams[target_team]:
                swap_candidate = FindBestSwap(teams, target_team, member)
                SwapPlayers(teams, member, swap_candidate)

    // Step 4: Verify balance
    skill_delta = ABS(AvgSkill(teams[0]) - AvgSkill(teams[1]))
    IF skill_delta > ACCEPTABLE_DELTA:
        // Run local search swaps to improve balance
        teams = LocalSearchOptimize(teams, max_iterations=100)

    RETURN teams

FUNCTION FindBestSwap(teams, target_team, player_to_add):
    // Find player on target_team whose removal minimally impacts balance
    // and whose skill is closest to player_to_add
    best_swap = NULL
    best_delta = INFINITY
    FOR EACH candidate IN teams[target_team]:
        IF candidate.party_id != NULL:
            CONTINUE   // Don't break other parties
        delta = ABS(candidate.skill - player_to_add.skill)
        IF delta < best_delta:
            best_swap = candidate
            best_delta = delta
    RETURN best_swap
```

### 3.5 Party Skill Aggregation

```
FUNCTION CalculatePartySkill(party_members):
    // Weighted average that skews toward the highest-skilled player
    // This accounts for the coordination advantage of parties

    skills = [member.mode_rating.mu FOR member IN party_members]
    avg_skill = MEAN(skills)
    max_skill = MAX(skills)
    min_skill = MIN(skills)
    spread = max_skill - min_skill

    // Base: weighted blend of average and maximum
    // Parties with wide skill spreads get pulled more toward the top
    alpha = 0.70    // Weight on average
    beta = 0.30     // Weight on maximum
    base_skill = alpha × avg_skill + beta × max_skill

    // Party synergy bonus: coordinated teams are stronger than their average
    // Bonus scales with party size (duo < trio < 5-stack)
    synergy_bonus = (LEN(party_members) - 1) × SYNERGY_PER_PLAYER
    // Reduce bonus if skill spread is large (coordination harder with mixed skills)
    spread_penalty = MIN(spread / MAX_SPREAD, 1.0) × synergy_bonus × 0.5
    adjusted_bonus = synergy_bonus - spread_penalty

    effective_mu = base_skill + adjusted_bonus

    // Combined uncertainty: lower because party performance is more predictable
    combined_sigma = SQRT(SUM(m.sigma² FOR m IN party_members)) / LEN(party_members)
    // But increase uncertainty for high-spread parties
    spread_uncertainty = spread × SPREAD_SIGMA_FACTOR
    effective_sigma = combined_sigma + spread_uncertainty

    RETURN EffectiveSkill {
        mu: effective_mu,
        sigma: effective_sigma,
        ordinal: effective_mu - 3 × effective_sigma,
        min_mu: min_skill,
        max_mu: max_skill,
        spread: spread
    }

CONSTANTS:
    SYNERGY_PER_PLAYER = 15.0       // Rating bonus per additional party member
    MAX_SPREAD = 600.0              // Max allowed party skill spread
    SPREAD_SIGMA_FACTOR = 0.05      // Uncertainty increase per rating point of spread
```

---

## 4. Queue Data Structure

### 4.1 In-Memory Queue Design

The queue uses a sorted set (by ordinal rating) for efficient range queries during match formation:

```
QueueStore:
    // Primary index: sorted by skill for range queries
    skill_sorted_set: SortedSet<ticket_id, score=ordinal_rating>

    // Secondary index: sorted by queue age for starvation detection
    age_sorted_set: SortedSet<ticket_id, score=entry_timestamp>

    // Ticket detail storage
    ticket_map: HashMap<ticket_id, MatchTicket>

    // Player-to-ticket lookup (for cancellation and dedup)
    player_index: HashMap<player_id, ticket_id>

    // Party-to-ticket lookup
    party_index: HashMap<party_id, ticket_id>

Operations:
    Enqueue(ticket):
        // Atomic multi-key insert
        ATOMIC {
            skill_sorted_set.ADD(ticket.id, ticket.effective_skill.ordinal)
            age_sorted_set.ADD(ticket.id, ticket.created_at)
            ticket_map.SET(ticket.id, ticket)
            FOR EACH pid IN ticket.player_ids:
                IF player_index.EXISTS(pid):
                    RETURN ERROR("ALREADY_IN_QUEUE")
                player_index.SET(pid, ticket.id)
        }

    Dequeue(ticket_ids):
        // Atomic multi-key removal (prevents double-matching)
        ATOMIC {
            FOR EACH tid IN ticket_ids:
                ticket = ticket_map.GET(tid)
                IF ticket == NULL OR ticket.status != QUEUED:
                    RETURN ERROR("TICKET_UNAVAILABLE")
                skill_sorted_set.REMOVE(tid)
                age_sorted_set.REMOVE(tid)
                FOR EACH pid IN ticket.player_ids:
                    player_index.REMOVE(pid)
                ticket_map.REMOVE(tid)
        }

    SkillRange(min_ordinal, max_ordinal):
        // O(log n + k) where k = results
        RETURN skill_sorted_set.RANGE_BY_SCORE(min_ordinal, max_ordinal)

    GetStarved(max_age_seconds):
        // Find tickets older than threshold
        cutoff = NOW() - max_age_seconds
        RETURN age_sorted_set.RANGE_BY_SCORE(0, cutoff)
```

---

## 5. Server Selection Algorithm

```
FUNCTION SelectServer(matched_players, available_servers):
    // Goal: minimize aggregate latency while ensuring no player has extreme ping

    best_server = NULL
    best_score = -INFINITY

    FOR EACH server IN available_servers:
        IF server.available_slots < 1:
            CONTINUE
        IF server.health_status != HEALTHY:
            CONTINUE

        // Get each player's expected ping to this server
        pings = []
        FOR EACH player IN matched_players:
            ping = player.latency_profile[server.region]
            IF ping == NULL OR ping > MAX_ACCEPTABLE_PING:
                GOTO next_server  // Skip if any player has unacceptable ping
            pings.APPEND(ping)

        // Score this server
        avg_ping = MEAN(pings)
        max_ping = MAX(pings)
        ping_variance = VARIANCE(pings)

        // Weighted score (lower is better for ping metrics, invert for scoring)
        score = -1 × (
            0.4 × avg_ping +           // Prefer low average ping
            0.3 × max_ping +           // Penalize high worst-case
            0.2 × ping_variance +      // Prefer fair ping distribution
            0.1 × server.load_pct × 100 // Prefer less loaded servers
        )

        IF score > best_score:
            best_score = score
            best_server = server

        next_server:

    IF best_server == NULL:
        RETURN ERROR("NO_SUITABLE_SERVER")

    // Reserve slot atomically
    success = best_server.AtomicReserve()
    IF NOT success:
        // Retry with next best server
        available_servers.REMOVE(best_server)
        RETURN SelectServer(matched_players, available_servers)

    RETURN best_server

CONSTANTS:
    MAX_ACCEPTABLE_PING = 150           // ms, hard cap
```

---

## 6. Inactivity Decay

```
FUNCTION ApplyDecay(player, mode, current_time):
    last_played = player.mode_ratings[mode].last_match_time
    days_inactive = (current_time - last_played) / SECONDS_PER_DAY

    IF days_inactive < DECAY_GRACE_PERIOD:
        RETURN  // No decay during grace period

    // Increase uncertainty (sigma) proportionally to inactivity
    // This doesn't change the mean skill—just reduces confidence
    decay_days = days_inactive - DECAY_GRACE_PERIOD
    sigma_increase = decay_days × DECAY_RATE_PER_DAY
    player.mode_ratings[mode].sigma = MIN(
        player.mode_ratings[mode].sigma + sigma_increase,
        MAX_SIGMA  // Cap at new-player uncertainty
    )

CONSTANTS:
    DECAY_GRACE_PERIOD = 14             // days before decay starts
    DECAY_RATE_PER_DAY = 2.5            // sigma increase per day of inactivity
    MAX_SIGMA = 350.0                   // Same as new player default
```

---

## 7. Seasonal Rating Reset

```
FUNCTION SeasonalReset(player, mode, new_season_id):
    current = player.mode_ratings[mode]

    // Soft reset: pull toward population mean, increase uncertainty
    reset_mu = RESET_WEIGHT × POPULATION_MEAN + (1 - RESET_WEIGHT) × current.mu
    reset_sigma = current.sigma × SIGMA_MULTIPLIER
    reset_sigma = MIN(reset_sigma, MAX_RESET_SIGMA)

    player.mode_ratings[mode] = {
        mu: reset_mu,
        sigma: reset_sigma,
        ordinal: reset_mu - 3 × reset_sigma,
        matches_played: 0,          // Reset for new season
        placement_complete: FALSE,
        season_id: new_season_id,
        peak_ordinal: 0.0,
        win_streak: 0,
        loss_streak: 0
    }

CONSTANTS:
    POPULATION_MEAN = 1500.0
    RESET_WEIGHT = 0.25             // Pull 25% toward mean
    SIGMA_MULTIPLIER = 1.5          // Increase uncertainty by 50%
    MAX_RESET_SIGMA = 200.0         // Don't reset fully to new-player uncertainty
```
