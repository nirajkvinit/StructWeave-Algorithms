# Interview Guide

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Tips |
|------|-------|-------|------|
| **0-5 min** | Clarify | Ask questions, scope the problem | Don't assume single vs multi-agent |
| **5-15 min** | High-Level | Core components, orchestration pattern | Draw the architecture diagram |
| **15-30 min** | Deep Dive | Handoffs OR shared memory OR agent selection | Pick one and go deep |
| **30-40 min** | Scale & Trade-offs | Bottlenecks, failure scenarios | Show distributed systems knowledge |
| **40-45 min** | Wrap Up | Summary, extensions, handle follow-ups | Be concise, prioritize |

---

## Meta-Commentary

### What Makes This System Unique/Challenging

1. **Distributed State Across Agents**
   - Unlike traditional microservices, agents maintain reasoning context
   - State is not just data - it's semantic understanding
   - Consistency is harder because context has meaning

2. **Handoff Reliability**
   - Most failures happen during handoffs, not within agents
   - Context loss is not recoverable without re-execution
   - "Reliability lives and dies in the handoffs"

3. **Emergent Behavior**
   - Multiple agents can produce unexpected interactions
   - Hard to test all agent combinations
   - Debugging requires understanding agent reasoning

4. **Cost Unpredictability**
   - Token usage varies with task complexity
   - Multi-agent chains multiply costs
   - Hard to estimate before execution

### Where to Spend Most Time

1. **If the interviewer emphasizes reliability:** Focus on handoff mechanism
2. **If the interviewer emphasizes scale:** Focus on agent pool management and state partitioning
3. **If the interviewer emphasizes cost:** Focus on cost-aware routing and budget management
4. **If the interviewer is from an AI company:** Focus on memory patterns and context management

---

## Clarifying Questions to Ask

### Essential Questions

| Question | Why It Matters |
|----------|----------------|
| How many agents per workflow? | 2-3 vs 10+ changes architecture dramatically |
| Real-time or batch processing? | Affects latency requirements, queuing |
| Single-tenant or multi-tenant? | Isolation, resource allocation |
| What's the consistency requirement? | Strong vs eventual changes complexity |
| Is there a budget constraint? | Cost optimization becomes critical |

### Good Follow-Up Questions

| Question | Signal You're Sending |
|----------|----------------------|
| Are agents stateless or stateful between tasks? | Understanding of agent lifecycle |
| Can agents call other agents directly or only through orchestrator? | Architecture pattern choice |
| Is human-in-the-loop required? | Production readiness thinking |
| What's the failure budget? | SRE mindset |

---

## Key Trade-offs Discussion

### Trade-off 1: Hierarchical vs Peer-to-Peer Orchestration

| Aspect | Hierarchical (Supervisor-Worker) | Peer-to-Peer (Group Chat) |
|--------|----------------------------------|---------------------------|
| **Control** | Centralized, predictable | Decentralized, emergent |
| **Bottleneck** | Supervisor can be overloaded | No single bottleneck |
| **Quality** | Supervisor validates all outputs | Peers may miss errors |
| **Latency** | Extra hop through supervisor | Direct communication |
| **Debugging** | Clear responsibility chain | Harder to trace issues |
| **Best for** | Well-defined workflows | Open-ended collaboration |

**Recommendation:** Start with hierarchical for production systems; use peer-to-peer for ideation/brainstorming workflows.

### Trade-off 2: Centralized vs Distributed Memory

| Aspect | Centralized Shared Memory | Distributed (Local + Shared) |
|--------|---------------------------|------------------------------|
| **Consistency** | Strong, single source of truth | Eventual, requires sync |
| **Latency** | Higher (remote access) | Lower (local reads) |
| **Scale** | Limited by single store | Scales with agents |
| **Complexity** | Simple | Conflict resolution needed |
| **Failure** | SPOF risk | Partial degradation |
| **Best for** | Small teams, simple workflows | Large teams, high throughput |

**Recommendation:** Start centralized, shard by team as you scale.

### Trade-off 3: Synchronous vs Asynchronous Handoffs

| Aspect | Synchronous | Asynchronous |
|--------|-------------|--------------|
| **Latency** | Blocking, sequential | Non-blocking, can parallelize |
| **Reliability** | Immediate failure detection | Delayed failure detection |
| **Complexity** | Simpler | Queue management needed |
| **Resource** | Holds resources during wait | Better utilization |
| **Best for** | Critical handoffs | Most handoffs |

**Recommendation:** Async by default, sync for critical path or when immediate feedback needed.

### Trade-off 4: Stateful vs Stateless Agents

| Aspect | Stateful Agents | Stateless Agents |
|--------|-----------------|------------------|
| **Context** | Maintain between tasks | Rebuilt each time |
| **Cold start** | None (warm) | Context loading |
| **Scaling** | Harder (affinity needed) | Easy (any agent) |
| **Failure recovery** | Lose in-memory state | No state to lose |
| **Cost** | Memory overhead | Token overhead (context) |
| **Best for** | Long conversations | Independent tasks |

**Recommendation:** Stateless with externalized state for most cases; consider stateful for session-based interactions.

---

## Trade-off Summary Table

| Decision | Option A | Option B | Recommendation |
|----------|----------|----------|----------------|
| Orchestration pattern | Hierarchical | Peer-to-Peer | Hierarchical for control |
| Memory topology | Centralized | Distributed | Distributed + logical centralization |
| Handoff model | Synchronous | Asynchronous | Async with critical path exceptions |
| Agent lifecycle | Stateful | Stateless | Stateless + external state |
| Context transfer | Full context | Summarized | Hybrid (summary + references) |
| Failure handling | Retry in place | Reassign to new agent | Reassign with checkpoint |

---

## Trap Questions and How to Handle

### Trap 1: "Why not just use one powerful agent?"

**What Interviewer Wants:** Understand when complexity is justified.

**Best Answer:**
> "A single agent works for simple tasks, but breaks down because:
> 1. **Context limits**: Token windows can't hold all needed context
> 2. **Specialization**: Different tasks need different tools/prompts
> 3. **Parallelization**: Single agent is sequential; multiple agents can work concurrently
> 4. **Cost**: Smaller specialized models are cheaper than one giant model
>
> That said, start simple. Use multi-agent only when single-agent demonstrably fails."

### Trap 2: "How do you prevent agents from conflicting?"

**What Interviewer Wants:** Distributed systems understanding.

**Best Answer:**
> "Conflicts happen at multiple levels:
> 1. **Memory conflicts**: Use CRDTs or last-writer-wins with merge logic
> 2. **Decision conflicts**: Supervisor agent resolves, or voting for peer systems
> 3. **Resource conflicts**: Capability-based access control prevents overlapping actions
>
> The key is making conflict detection cheap and resolution explicit in the protocol."

### Trap 3: "What if an agent goes rogue?"

**What Interviewer Wants:** Security and safety thinking.

**Best Answer:**
> "Defense in depth:
> 1. **Capability limits**: Agents only have permissions for their role
> 2. **Guardrails**: All outputs pass through safety checks
> 3. **Budget limits**: Runaway agents hit cost/resource limits
> 4. **Circuit breakers**: Anomalous behavior triggers isolation
> 5. **Human oversight**: Critical actions require approval
>
> The broader point: don't trust any single component. Validate at every boundary."

### Trap 4: "How do you debug a 10-agent workflow?"

**What Interviewer Wants:** Operational maturity.

**Best Answer:**
> "Three layers:
> 1. **Distributed tracing**: Single trace ID across all agents, visualize as timeline
> 2. **Structured logging**: Every handoff, decision, and action is logged with context
> 3. **Replay capability**: Checkpoints let me re-run from any point
>
> The key insight: most bugs are handoff issues, so I instrument handoffs heavily."

### Trap 5: "100x the current scale - how?"

**What Interviewer Wants:** Forward-thinking architecture, not just "add servers."

**Best Answer:**
> "100x requires architectural changes:
> 1. **Partition the orchestrator**: Shard by tenant or workflow type
> 2. **Regional deployment**: Multi-region with workflow affinity
> 3. **Agent pooling evolution**: Specialized pools per capability domain
> 4. **Memory tiering**: Hot/warm/cold with intelligent caching
> 5. **Async everywhere**: Even more aggressive queuing and batching
>
> Also: challenge the 100x requirement. What's the actual growth driver? That informs where to invest."

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | Better Approach |
|---------|----------------|-----------------|
| **Ignoring handoff complexity** | Handoffs fail more than agent execution | Design handoffs as first-class citizens |
| **No context limits** | Token windows explode | Implement summarization and windowing |
| **Synchronous everything** | Blocks resources, poor utilization | Async by default |
| **Single orchestrator** | Bottleneck at scale | Stateless orchestrators, partitioned |
| **Trust all agents** | Security hole | Capability-based access, validate all |
| **No cost tracking** | Budget surprises | Token accounting from day 1 |
| **Overengineering day 1** | Complexity without need | Start simple, evolve |
| **Underestimating state** | Data loss, inconsistency | Explicit state management strategy |

---

## Questions Candidates Should Ask

### To Scope the Problem

- "What's the expected number of agents per workflow?"
- "Are workflows short-lived (minutes) or long-running (hours/days)?"
- "Is this multi-tenant? How isolated do tenants need to be?"
- "What's the latency requirement for end-to-end workflows?"

### To Show Depth

- "Do agents need to maintain state between tasks, or is each task independent?"
- "How critical is context preservation during handoffs?"
- "Is there a cost ceiling per workflow?"
- "What's the failure tolerance - can we lose a few tasks, or is everything critical?"

### To Show Production Thinking

- "How do we handle partial failures - does the whole workflow fail?"
- "What observability already exists? Are we building tracing from scratch?"
- "Are there compliance requirements (GDPR, HIPAA) that affect data handling?"

---

## Quick Reference Card

### Core Architecture (Draw This First)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│ Orchestrator│────▶│ Agent Pool  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                   │
                           ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐
                    │Task Manager │     │Shared Memory│
                    └─────────────┘     └─────────────┘
```

### Five Orchestration Patterns

1. **Hierarchical**: Supervisor → Workers (control, quality)
2. **Sequential**: A → B → C (deterministic, staged)
3. **Parallel**: Fan-out → Fan-in (throughput)
4. **Group Chat**: Round-robin speaking (ideation)
5. **Swarm**: Voting/consensus (robust decisions)

### Three Critical Flows

1. **Task Execution**: Submit → Match → Assign → Execute → Complete
2. **Handoff**: Checkpoint → Serialize → Route → Validate → Resume
3. **Memory Access**: Query → Cache → Read → Validate → Return

### Key Metrics to Know

| Metric | Target | Why |
|--------|--------|-----|
| Handoff success rate | > 99.5% | Core reliability |
| End-to-end latency P95 | < 30s (5-agent) | User experience |
| Context preservation | > 95% semantic | Quality |
| Cost per task | Tracked | Budget control |

### Protocols to Mention

- **MCP**: Agent-to-tool (Anthropic, 97M+ downloads)
- **A2A**: Agent-to-agent (Google/Linux Foundation)

---

## Sample Answer Skeleton

### Opening (2 min)

> "Let me clarify a few things first... [ask 2-3 questions]
>
> Given that, I'll design a multi-agent orchestration platform that handles [scope]. My approach will focus on reliable handoffs since that's where most multi-agent systems fail."

### High-Level Design (10 min)

> "The core components are:
> 1. **Orchestrator**: Stateless, manages workflow execution
> 2. **Agent Registry**: Tracks agents, capabilities, health
> 3. **Task Manager**: Handles task lifecycle
> 4. **Shared Memory**: Enables agent collaboration
> 5. **Message Queue**: Async communication backbone
>
> [Draw diagram]
>
> For orchestration pattern, I'd start with **hierarchical** for control and quality..."

### Deep Dive (15 min)

> "The most critical component is the **handoff mechanism**. Here's how it works:
> 1. Source agent prepares structured context (not free-text)
> 2. Checkpoint is saved before handoff
> 3. Context is written to shared memory
> 4. Message routed to target agent
> 5. Target validates and acknowledges
>
> Failure modes include: [list 3], and we handle them by: [explain]"

### Scale & Reliability (10 min)

> "For 100x scale:
> - Stateless orchestrators partition by tenant
> - Agent pools scale horizontally
> - Memory shards by team
>
> For reliability:
> - Circuit breakers per agent
> - Checkpoints every step
> - Multi-region for DR
>
> Key trade-off: I chose eventual consistency for memory because strong consistency adds unacceptable latency..."

### Wrap-Up (3 min)

> "To summarize: hierarchical orchestration for control, structured handoffs for reliability, distributed memory for scale. The key insight is that multi-agent systems fail at handoffs, so that's where I invested the most design effort.
>
> Extensions could include: [1-2 ideas if asked]"
