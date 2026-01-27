# Interview Guide

## Interview Pacing (45-Minute Format)

| Time | Phase | Focus | Deliverables |
|------|-------|-------|--------------|
| 0-5 min | **Clarify** | Scope, use case, constraints | Requirements list |
| 5-15 min | **High-Level** | Architecture, components | System diagram |
| 15-30 min | **Deep Dive** | 1-2 critical components | Algorithm details |
| 30-40 min | **Scale & Trade-offs** | Bottlenecks, failures | Mitigation strategies |
| 40-45 min | **Wrap Up** | Summary, improvements | Key decisions recap |

---

## Phase 1: Clarification (0-5 minutes)

### Must-Ask Questions

| Question | Why It Matters | Impact on Design |
|----------|---------------|------------------|
| "What's the primary use case?" | Research vs. coding vs. customer service | Tool selection, latency targets |
| "Single agent or multi-agent?" | Coordination complexity | Orchestration pattern |
| "What scale are we targeting?" | 100 vs. 10,000 concurrent agents | Infrastructure choices |
| "Real-time or batch?" | Latency requirements | Streaming, caching strategies |
| "What tools need to be supported?" | Web search, code execution, APIs | Sandboxing, permissions |
| "Durability requirements?" | Can we lose progress on failure? | Checkpointing frequency |

### Sample Clarification Dialog

```
YOU: "Before I dive in, let me understand the requirements. What's the
     primary use case for this agent platform?"

INTERVIEWER: "We want to build a coding assistant that can research
             documentation, write code, and run tests."

YOU: "Got it. A few follow-up questions:
     1. Are we supporting multi-file changes, or single files?
     2. Should the agent be able to execute arbitrary code?
     3. What's the expected session duration - minutes or hours?
     4. Do we need to support multiple agents collaborating?"

INTERVIEWER: "Multi-file, yes code execution with sandboxing,
             sessions can be 30+ minutes, single agent for now."

YOU: "Perfect. So I'll focus on:
     - Durable execution (long sessions need checkpointing)
     - Sandboxed code execution (security-critical)
     - Rich tool integration (file system, code runner, web search)
     - Single-agent with potential for multi-agent later

     Let me start with the high-level architecture..."
```

---

## Phase 2: High-Level Design (5-15 minutes)

### Architecture to Draw

```
DRAW THIS ON THE WHITEBOARD:
─────────────────────────────────────────────────────────

     ┌─────────────────────────────────────────────┐
     │                  Clients                    │
     │        (SDK, REST API, WebSocket)          │
     └──────────────────────┬──────────────────────┘
                            │
     ┌──────────────────────▼──────────────────────┐
     │              API Gateway                    │
     │    (Auth, Rate Limiting, Routing)          │
     └──────────────────────┬──────────────────────┘
                            │
     ┌──────────────────────▼──────────────────────┐
     │          Orchestration Layer               │
     │  ┌─────────────┐  ┌─────────────────────┐  │
     │  │ Workflow    │  │ Checkpoint Service  │  │
     │  │ Engine      │  │ (State Persistence) │  │
     │  └─────────────┘  └─────────────────────┘  │
     │  ┌─────────────┐  ┌─────────────────────┐  │
     │  │ Guardrails  │  │ Agent Registry      │  │
     │  └─────────────┘  └─────────────────────┘  │
     └──────────────────────┬──────────────────────┘
                            │
     ┌──────────────────────▼──────────────────────┐
     │           Agent Runtime Layer               │
     │  ┌────────────────────────────────────────┐ │
     │  │            ReAct Loop                  │ │
     │  │   Think → Act → Observe → Repeat       │ │
     │  └────────────────────────────────────────┘ │
     └────────┬─────────────┬──────────────┬───────┘
              │             │              │
     ┌────────▼───┐  ┌──────▼──────┐  ┌───▼────────┐
     │  Memory    │  │   Tools     │  │ LLM Router │
     │  (STM+LTM) │  │ (via MCP)   │  │            │
     └────────────┘  └─────────────┘  └────────────┘
              │             │              │
     ┌────────▼───┐  ┌──────▼──────┐  ┌───▼────────┐
     │ Vector DB  │  │  Sandboxes  │  │ LLM APIs   │
     └────────────┘  └─────────────┘  └────────────┘
```

### 2-Minute Explanation Script

```
"Here's the high-level architecture:

1. CLIENTS connect via SDK or REST API. We support both
   synchronous requests and WebSocket for streaming.

2. API GATEWAY handles authentication, rate limiting, and
   routes requests to the orchestration layer.

3. ORCHESTRATION LAYER is the brain:
   - Workflow Engine executes the agent graph
   - Checkpoint Service persists state for durability
   - Guardrails validate inputs/outputs for safety
   - Agent Registry stores agent configurations

4. AGENT RUNTIME executes the actual ReAct loop:
   - Think: LLM reasons about the task
   - Act: Calls tools to gather information or take action
   - Observe: Processes tool results
   - Repeat: Until task is complete

5. Three critical dependencies:
   - MEMORY: Short-term (context window) + Long-term (vector DB)
   - TOOLS: Integrated via MCP protocol, sandboxed for security
   - LLM ROUTER: Multi-provider for reliability, cost optimization

Key design decisions:
- Stateless runtime workers (easier scaling)
- Graph-based workflow (supports all patterns)
- Event-sourced checkpoints (enables time-travel debugging)"
```

### Key Components to Mention

| Component | One-Line Description |
|-----------|---------------------|
| Workflow Engine | Executes agent as a state graph |
| Checkpoint Service | Persists state every turn for durability |
| ReAct Loop | Think → Act → Observe cycle |
| Memory Service | STM (context) + LTM (vector retrieval) |
| MCP Registry | Dynamic tool discovery and execution |
| Guardrail Engine | Input/output safety validation |
| LLM Router | Multi-provider with failover |

---

## Phase 3: Deep Dive (15-30 minutes)

Choose 1-2 topics based on interviewer interest or system requirements.

### Deep Dive Option A: Checkpointing & Durability

**Why This Matters:**
"Without checkpointing, a 30-minute coding session crashes and the user loses all progress. This is the difference between a demo and a product."

**Key Points to Cover:**

```
1. CHECKPOINT STRUCTURE
   - Snapshot of conversation state
   - Current position in workflow graph
   - Pending tool calls
   - Memory context

2. CHECKPOINT FREQUENCY
   - Every turn (maximum durability)
   - On state change (efficient)
   - Trade-off: write overhead vs. data loss

3. STORAGE BACKEND
   - Postgres for durability + ACID
   - Write-ahead log for fast writes
   - Periodic snapshots for quick recovery

4. RECOVERY PROTOCOL
   a. Load latest checkpoint
   b. Validate integrity (hash check)
   c. Replay pending operations
   d. Resume execution

5. TIME-TRAVEL DEBUGGING
   - Can replay from any checkpoint
   - Useful for debugging agent behavior
   - Fork from historical state
```

**Pseudocode to Write:**

```
CHECKPOINT WRITE:
  1. Serialize current state
  2. Compute integrity hash
  3. Append to WAL (fast)
  4. Async replicate to durable storage
  5. Update latest checkpoint pointer

RECOVERY:
  1. Find latest valid checkpoint
  2. Deserialize state
  3. For each pending operation:
     - If completed externally → fetch result
     - If incomplete → re-execute (idempotent)
  4. Resume from recovered state
```

### Deep Dive Option B: Memory Architecture

**Why This Matters:**
"Memory is what separates a chatbot from an agent. Without memory, the agent forgets everything between turns and can't build on prior work."

**Key Points to Cover:**

```
1. SHORT-TERM MEMORY (Context Window)
   - Limited by token budget (8K-128K)
   - Contains recent conversation
   - Managed with summarization when full

2. LONG-TERM MEMORY (Vector DB)
   - Episodic: Past interactions
   - Semantic: Facts and knowledge
   - Procedural: Learned action patterns

3. MEMORY RETRIEVAL
   - Embed current query
   - Search vector DB for relevant memories
   - Rerank by relevance + recency
   - Inject into context

4. MEMORY CONSOLIDATION
   - Background process
   - Move important STM → LTM
   - Summarize verbose entries
   - Deduplicate similar memories

5. TOKEN BUDGETING
   - System prompt: 1,000 tokens
   - Tool definitions: 2,000 tokens
   - Retrieved memories: 2,000 tokens
   - Conversation: remaining budget
```

**Draw This:**

```
TOKEN BUDGET ALLOCATION (8K context):
─────────────────────────────────────────────────────────

Total: 8,000 tokens

┌─────────────────────────────────────────────────┐
│ System Prompt       │ 1,000 (fixed)             │
├─────────────────────────────────────────────────┤
│ Tool Definitions    │ 2,000 (dynamic by task)   │
├─────────────────────────────────────────────────┤
│ Retrieved Memories  │ 2,000 (top-k relevant)    │
├─────────────────────────────────────────────────┤
│ Conversation        │ 2,000 (summarize if over) │
├─────────────────────────────────────────────────┤
│ Output Buffer       │ 1,000 (reserved)          │
└─────────────────────────────────────────────────┘
```

### Deep Dive Option C: Tool Integration & Safety

**Why This Matters:**
"Tools give agents superpowers, but also attack surface. A malicious tool result could hijack the agent, exfiltrate data, or cause damage."

**Key Points to Cover:**

```
1. MCP PROTOCOL
   - Industry standard (Anthropic, OpenAI, Google)
   - Tools self-describe with JSON schema
   - Runtime discovery and capability negotiation

2. PERMISSION MODEL
   - Per-tool permissions (file:read, network:external)
   - User consent for sensitive operations
   - Audit logging for all tool calls

3. SANDBOXED EXECUTION
   - Container isolation (gVisor)
   - Resource limits (CPU, memory, time)
   - Network restrictions (allowlist only)
   - No host filesystem access

4. INDIRECT INJECTION PREVENTION
   - Tool output can contain malicious instructions
   - Defense: Treat tool output as untrusted data
   - Don't let tool output modify system instructions

5. TOOL SELECTION
   - Embed task, match to tool descriptions
   - Filter by user permissions
   - Rank by historical success rate
```

---

## Phase 4: Scale & Trade-offs (30-40 minutes)

### Common Bottlenecks

| Bottleneck | Symptom | Mitigation |
|------------|---------|------------|
| LLM Rate Limits | 429 errors | Multi-provider, caching |
| Checkpoint Writes | High latency | Async WAL, batching |
| Memory Retrieval | Slow context assembly | Caching, pre-fetching |
| Tool Execution | Agent blocked waiting | Parallel execution |
| State Size | Large checkpoints | Delta checkpoints, compression |

### Trade-off Discussions

**Trade-off 1: Checkpoint Frequency**

```
Every Turn:
  + Maximum durability (zero data loss)
  + Simple recovery
  - High write overhead
  - Increased latency

On State Change:
  + Lower write volume
  + Efficient storage
  - May lose some progress
  - More complex recovery
```

**Trade-off 2: Memory Strategy**

```
Full Context (Long Window):
  + Simple implementation
  + Complete history available
  - Expensive ($$$ tokens)
  - Attention degradation
  - No persistence

Tiered Memory (STM + LTM):
  + Unlimited history
  + Cost-effective
  + Persistent across sessions
  - Retrieval latency
  - May miss relevant context
```

**Trade-off 3: Single vs. Multi-Agent**

```
Single Agent:
  + Simple coordination
  + Lower latency
  + Easier debugging
  - Limited parallelism
  - Harder for complex tasks

Multi-Agent:
  + Parallel execution
  + Specialized expertise
  + Better for complex tasks
  - Coordination overhead
  - State synchronization
  - Harder to debug
```

### Failure Scenarios

| Scenario | Impact | Response |
|----------|--------|----------|
| LLM provider down | Agents can't reason | Failover to backup provider |
| Tool timeout | Agent blocked | Return error, let agent retry or replan |
| Checkpoint write fails | Potential data loss | Block until successful, alert |
| Memory service down | No context retrieval | Degrade gracefully, warn user |
| Pod crash mid-turn | Partial progress lost | Recover from last checkpoint |

---

## Phase 5: Wrap Up (40-45 minutes)

### Summary Checklist

"To summarize the key design decisions:

1. **Architecture**: Graph-based orchestration with stateless workers
2. **Durability**: Checkpoint every turn to Postgres with WAL
3. **Memory**: 3-tier (STM + Episodic + Semantic) with consolidation
4. **Tools**: MCP protocol with sandboxed execution
5. **Safety**: Multi-layer guardrails (input, output, tool)
6. **Scaling**: Horizontal for compute, sharded for storage
7. **Reliability**: Multi-provider LLM, circuit breakers, graceful degradation"

### Questions to Expect

| Question | Strong Answer |
|----------|--------------|
| "What would you do differently at 100x scale?" | "Shard by tenant, regional deployment, dedicated LLM capacity" |
| "How would you debug a misbehaving agent?" | "Trace replay from checkpoint, LangSmith for observability" |
| "What's the hardest part of this system?" | "Memory consolidation - balancing completeness vs. cost" |
| "How would you handle multi-tenant?" | "Strict isolation via RLS, separate encryption keys" |

---

## Trap Questions & Strong Answers

### Trap 1: "Why not just use a longer context window?"

❌ **Weak Answer:** "We should use the longest context available."

✅ **Strong Answer:**
"Long context windows help but don't solve everything:
1. **Cost**: 128K tokens × $10/M = $1.28 per request. At scale, unsustainable.
2. **Attention degradation**: The 'lost in the middle' problem - LLMs struggle with info in the middle of long contexts.
3. **No persistence**: Context resets every session. Users expect continuity.
4. **No organization**: Everything is flat text. Episodic vs. semantic memory serves different purposes.

We use long context for working memory, but need separate long-term storage with intelligent retrieval."

### Trap 2: "How do you prevent infinite loops?"

❌ **Weak Answer:** "Set a max iteration limit."

✅ **Strong Answer:**
"Multiple layers of protection:
1. **Max iterations**: Hard limit (e.g., 25 turns) - final safety net
2. **Repetition detection**: If same thought/action pattern repeats 3 times, break
3. **Token budget**: Total tokens per session capped (e.g., 100K)
4. **Progress tracking**: If no state change in 5 turns, force reflection
5. **Human-in-loop checkpoints**: For long-running tasks, pause for confirmation

The key insight: don't just limit iterations, detect when the agent isn't making progress."

### Trap 3: "What if the LLM hallucinates a tool call?"

❌ **Weak Answer:** "The tool will fail and return an error."

✅ **Strong Answer:**
"Several defense layers:
1. **Schema validation**: Tool inputs must match JSON schema - malformed calls rejected immediately
2. **Registry check**: Unknown tool names fail fast with clear error
3. **Permission verification**: Even valid tools need permission for this user/context
4. **Error feedback**: Error message goes back to LLM so it can self-correct
5. **Retry budget**: Max 3 tool call failures before escalating

MCP actually helps here - the protocol includes capability negotiation, so the LLM knows exactly which tools exist and their schemas."

### Trap 4: "How do you handle prompt injection?"

❌ **Weak Answer:** "We filter bad keywords."

✅ **Strong Answer:**
"Defense in depth with multiple layers:
1. **Input sanitization**: Remove control characters, normalize Unicode
2. **Pattern detection**: Regex for known injection patterns ('ignore previous', 'you are now')
3. **ML classifier**: Fine-tuned model for injection detection
4. **LLM guard**: For suspicious inputs, NeMo Guardrails does semantic analysis
5. **Output verification**: Check that responses don't contain instruction-like content
6. **Tool output isolation**: Never let tool output become instructions

The hardest case is indirect injection via tool output - we treat all external data as untrusted and never inject it into system prompts."

### Trap 5: "Why not just use OpenAI Assistants?"

❌ **Weak Answer:** "It's simpler, we should just use that."

✅ **Strong Answer:**
"OpenAI Assistants is great for prototyping, but for production:
1. **Vendor lock-in**: Single provider means single point of failure
2. **Limited customization**: Can't tune retrieval, caching, or routing
3. **Black box**: No visibility into token usage, reasoning steps
4. **Compliance**: Some enterprises can't send data to third parties
5. **Cost optimization**: Can't route simple tasks to cheaper models

For an MVP, Assistants makes sense. For production at scale, you need control over the orchestration layer."

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | What to Do Instead |
|---------|---------------|---------------------|
| Stateless agents | Agents need to remember context | Implement checkpoint persistence |
| Ignoring token limits | Context overflow breaks agents | Token budgeting, summarization |
| Synchronous tools only | Unnecessary latency | Parallel tool execution |
| No guardrails | Security/safety risks | Multi-layer input/output rails |
| Single LLM provider | Single point of failure | Multi-provider with failover |
| Monolithic agent | Doesn't scale for complex tasks | Hierarchical (planner + workers) |
| Over-engineering memory | Premature optimization | Start simple, add tiers as needed |

---

## Quick Reference Card

### Key Numbers

| Metric | Typical Value |
|--------|---------------|
| Turn latency (p50) | 2-3 seconds |
| Turn latency (p99) | 10 seconds |
| Checkpoint size | 50 KB |
| Memory retrieval | 100 ms |
| Token budget | 8K-128K |
| Concurrent agents | 10K per node |

### Key Algorithms

| Algorithm | Purpose |
|-----------|---------|
| ReAct | Think → Act → Observe loop |
| Tree-of-Thought | Explore multiple reasoning paths |
| Reflexion | Self-critique and learning |
| Memory Consolidation | STM → LTM migration |
| Hierarchical Planning | Task decomposition |

### Key Technologies

| Category | Options |
|----------|---------|
| Framework | LangGraph, CrewAI, AutoGen |
| Memory | LangMem, MemGPT, Mem0 |
| Tools | MCP, Function Calling |
| Guardrails | NeMo Guardrails, Guardrails AI |
| Observability | LangSmith, Langfuse |

### Interview Success Formula

```
1. CLARIFY first (don't assume)
2. DRAW the architecture (visual thinking)
3. EXPLAIN trade-offs (show depth)
4. DISCUSS failures (show maturity)
5. SUMMARIZE decisions (show organization)
```
