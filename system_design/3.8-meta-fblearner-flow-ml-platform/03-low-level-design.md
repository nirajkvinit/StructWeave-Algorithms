# Low-Level Design

## Data Models

### Workflow Definition

```
Workflow {
    workflow_id:          UUID                    // Unique identifier
    name:                 String                  // Human-readable name
    version:              SemVer                  // Semantic version
    owner_team:           String                  // Owning team ID
    input_schema:         TypeSchema              // Typed input parameters
    output_schema:        TypeSchema              // Typed outputs
    operators:            List<OperatorDef>       // Operator definitions
    created_at:           Timestamp
    updated_at:           Timestamp
    metadata:             Map<String, Any>        // Custom metadata
}

TypeSchema {
    fields:               List<TypeField>
    required_fields:      Set<String>
    validators:           List<Validator>
}

TypeField {
    name:                 String
    type:                 MLType                  // Custom ML type
    description:          String
    default_value:        Any (optional)
    ui_hints:             UIHints (optional)      // For auto UI generation
}
```

### Operator Definition

```
OperatorDef {
    operator_id:          UUID
    name:                 String
    operator_type:        String                  // e.g., "TrainOperator"
    inputs:               List<OperatorInput>
    outputs:              List<OperatorOutput>
    parameters:           Map<String, Any>
    resource_requirements: ResourceSpec
    code_package:         CodeReference
    timeout:              Duration
    retry_policy:         RetryPolicy
}

OperatorInput {
    name:                 String
    type:                 MLType
    source:               InputSource             // Future reference or literal
}

OperatorOutput {
    name:                 String
    type:                 MLType
    storage_hint:         StorageHint             // Memory, disk, distributed
}

ResourceSpec {
    cpu_cores:            Integer                 // Number of CPU cores
    memory_gb:            Float                   // Memory in GB
    gpu_count:            Integer                 // Number of GPUs
    gpu_type:             GPUType (optional)      // e.g., H100, A100
    storage_gb:           Float                   // Local storage
    network_bandwidth:    String (optional)       // e.g., "high", "standard"
}
```

### DAG Model

```
CompiledDAG {
    dag_id:               UUID
    workflow_id:          UUID
    nodes:                List<DAGNode>
    edges:                List<DAGEdge>
    entry_nodes:          Set<UUID>               // Nodes with no dependencies
    exit_nodes:           Set<UUID>               // Nodes with no dependents
    total_operators:      Integer
    estimated_duration:   Duration
}

DAGNode {
    node_id:              UUID
    operator_id:          UUID
    status:               NodeStatus              // PENDING, READY, RUNNING, COMPLETED, FAILED
    dependencies:         Set<UUID>               // Upstream node IDs
    dependents:           Set<UUID>               // Downstream node IDs
    level:                Integer                 // Topological level for parallelization
}

DAGEdge {
    edge_id:              UUID
    source_node:          UUID
    target_node:          UUID
    channel:              ChannelRef              // Typed data channel
    data_size_estimate:   Long (bytes)
}
```

### Execution State

```
WorkflowExecution {
    execution_id:         UUID
    workflow_id:          UUID
    dag_id:               UUID
    status:               ExecutionStatus         // PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
    started_at:           Timestamp
    completed_at:         Timestamp (optional)
    submitted_by:         UserID
    input_values:         Map<String, Any>
    node_states:          Map<UUID, NodeExecution>
    artifacts:            Map<String, ArtifactRef>
    metrics:              Map<String, Metric>
    error:                ErrorInfo (optional)
}

NodeExecution {
    node_id:              UUID
    status:               NodeStatus
    worker_id:            String (optional)
    started_at:           Timestamp (optional)
    completed_at:         Timestamp (optional)
    allocated_resources:  ResourceAllocation
    output_artifacts:     List<ArtifactRef>
    logs_location:        URI
    retry_count:          Integer
    error:                ErrorInfo (optional)
}
```

### Custom ML Types

```
// Base ML Type
MLType {
    type_name:            String                  // e.g., "Dataset", "Model", "FeatureSet"
    parameters:           Map<String, Any>        // Type parameters
    schema:               DataSchema (optional)   // For structured types
}

// Specific Types
DatasetType extends MLType {
    format:               String                  // e.g., "parquet", "tfrecord"
    schema:               ColumnSchema            // Column definitions
    partitioning:         PartitionSpec (optional)
    estimated_rows:       Long (optional)
}

ModelType extends MLType {
    framework:            String                  // e.g., "pytorch", "caffe2"
    architecture:         String                  // e.g., "transformer", "gbdt"
    input_schema:         TensorSpec
    output_schema:        TensorSpec
    exportable_formats:   List<String>           // e.g., ["onnx", "caffe2"]
}

FeatureSetType extends MLType {
    features:             List<FeatureDef>
    entity_key:           String                  // Primary key for feature lookup
    timestamp_key:        String (optional)       // For point-in-time correctness
}

FeatureDef {
    name:                 String
    dtype:                DataType
    dimensions:           List<Integer>
    default_value:        Any (optional)
    statistics:           FeatureStats (optional)
}
```

---

## Entity Relationship Diagram

```mermaid
erDiagram
    WORKFLOW ||--o{ WORKFLOW_VERSION : has
    WORKFLOW_VERSION ||--o{ OPERATOR_DEF : contains
    WORKFLOW_VERSION ||--|| TYPE_SCHEMA : defines_input
    WORKFLOW_VERSION ||--|| TYPE_SCHEMA : defines_output

    OPERATOR_DEF ||--|| RESOURCE_SPEC : requires
    OPERATOR_DEF ||--o{ OPERATOR_INPUT : has
    OPERATOR_DEF ||--o{ OPERATOR_OUTPUT : has
    OPERATOR_INPUT ||--|| ML_TYPE : typed_as
    OPERATOR_OUTPUT ||--|| ML_TYPE : typed_as

    WORKFLOW_EXECUTION ||--|| WORKFLOW_VERSION : executes
    WORKFLOW_EXECUTION ||--|| COMPILED_DAG : runs
    WORKFLOW_EXECUTION ||--o{ NODE_EXECUTION : contains

    COMPILED_DAG ||--o{ DAG_NODE : contains
    COMPILED_DAG ||--o{ DAG_EDGE : contains

    DAG_NODE ||--|| OPERATOR_DEF : represents
    DAG_EDGE ||--|| DAG_NODE : from
    DAG_EDGE ||--|| DAG_NODE : to
    DAG_EDGE ||--|| TYPED_CHANNEL : carries

    NODE_EXECUTION ||--|| DAG_NODE : executes
    NODE_EXECUTION ||--o{ ARTIFACT : produces
    NODE_EXECUTION ||--|| RESOURCE_ALLOCATION : uses

    ARTIFACT ||--|| ML_TYPE : typed_as

    WORKFLOW {
        uuid workflow_id PK
        string name
        string owner_team
        timestamp created_at
    }

    WORKFLOW_VERSION {
        uuid version_id PK
        uuid workflow_id FK
        string version
        json input_schema
        json output_schema
    }

    OPERATOR_DEF {
        uuid operator_id PK
        uuid version_id FK
        string name
        string operator_type
        json parameters
    }

    WORKFLOW_EXECUTION {
        uuid execution_id PK
        uuid version_id FK
        string status
        timestamp started_at
        timestamp completed_at
    }
```

---

## API Design

### Workflow Management API

```
// Submit a new workflow definition
POST /api/v1/workflows
Request:
{
    "name": "recommendation_training",
    "version": "1.0.0",
    "owner_team": "news_feed_ml",
    "input_schema": {
        "fields": [
            {"name": "training_date", "type": "Date", "required": true},
            {"name": "feature_set", "type": "FeatureSet", "required": true},
            {"name": "hyperparams", "type": "HyperparameterSet", "required": false}
        ]
    },
    "operators": [...]
}
Response:
{
    "workflow_id": "wf-abc123",
    "version_id": "v-def456",
    "status": "REGISTERED",
    "ui_launch_url": "/launch/wf-abc123"
}

// Get workflow definition
GET /api/v1/workflows/{workflow_id}
GET /api/v1/workflows/{workflow_id}/versions/{version}

// List workflows
GET /api/v1/workflows?team={team}&status={status}&page={page}
```

### Execution API

```
// Launch workflow execution
POST /api/v1/executions
Request:
{
    "workflow_id": "wf-abc123",
    "version": "1.0.0",
    "inputs": {
        "training_date": "2026-01-24",
        "feature_set": {"feature_store_ref": "fs://news_feed/user_features/v2"},
        "hyperparams": {"learning_rate": 0.001, "batch_size": 256}
    },
    "priority": "NORMAL",
    "idempotency_key": "train-2026-01-24-attempt-1"
}
Response:
{
    "execution_id": "exec-xyz789",
    "dag_id": "dag-111222",
    "status": "PENDING",
    "estimated_completion": "2026-01-24T18:00:00Z"
}

// Get execution status
GET /api/v1/executions/{execution_id}
Response:
{
    "execution_id": "exec-xyz789",
    "status": "RUNNING",
    "progress": {
        "total_operators": 8,
        "completed": 3,
        "running": 2,
        "pending": 3
    },
    "nodes": [
        {"node_id": "n1", "operator": "LoadData", "status": "COMPLETED"},
        {"node_id": "n2", "operator": "Split", "status": "COMPLETED"},
        {"node_id": "n3", "operator": "Train", "status": "RUNNING"},
        ...
    ]
}

// Cancel execution
POST /api/v1/executions/{execution_id}/cancel

// Resume failed execution
POST /api/v1/executions/{execution_id}/resume
Request:
{
    "from_node": "n3",          // Resume from specific node
    "override_inputs": {...}    // Optional input overrides
}
```

### Artifact API

```
// Get artifact metadata
GET /api/v1/artifacts/{artifact_id}
Response:
{
    "artifact_id": "art-aaa111",
    "type": "Model",
    "framework": "pytorch",
    "size_bytes": 524288000,
    "storage_uri": "artifact://models/rec_model_v1",
    "metadata": {
        "accuracy": 0.923,
        "created_from_execution": "exec-xyz789"
    }
}

// Download artifact
GET /api/v1/artifacts/{artifact_id}/download

// List artifacts by execution
GET /api/v1/executions/{execution_id}/artifacts
```

### Type Registry API

```
// Register custom type
POST /api/v1/types
Request:
{
    "type_name": "RecommendationModel",
    "extends": "Model",
    "schema": {
        "input_features": ["user_id", "context_embedding"],
        "output_type": "ranked_items"
    },
    "ui_renderer": "model_visualizer_v2"
}

// Get type definition
GET /api/v1/types/{type_name}

// Get UI schema for type (for auto UI generation)
GET /api/v1/types/{type_name}/ui-schema
Response:
{
    "type_name": "FeatureSet",
    "ui_component": "FeatureSelector",
    "autocomplete_source": "/api/v1/feature-store/features",
    "validation_rules": [
        {"rule": "exists_in_feature_store", "error": "Feature set not found"}
    ]
}
```

---

## Core Algorithms

### DAG Compilation from Futures

```
ALGORITHM CompileDAGFromFutures(workflow_definition)
    INPUT: workflow_definition with operator calls
    OUTPUT: CompiledDAG

    futures_map = {}                    // Map operator_id -> Future
    dependency_graph = new DirectedGraph()

    // Stage 1: Parse workflow and create futures
    FOR each operator_call IN workflow_definition.operators:
        future = new Future(operator_call.operator_id)
        futures_map[operator_call.operator_id] = future
        dependency_graph.add_node(operator_call.operator_id)

        // Track dependencies from input sources
        FOR each input IN operator_call.inputs:
            IF input.source.is_future_reference():
                source_operator_id = input.source.get_operator_id()
                dependency_graph.add_edge(source_operator_id, operator_call.operator_id)

    // Stage 2: Validate DAG (no cycles)
    IF dependency_graph.has_cycle():
        RAISE CyclicDependencyError("Workflow contains circular dependencies")

    // Stage 3: Compute topological levels for parallel execution
    levels = compute_topological_levels(dependency_graph)

    // Stage 4: Build compiled DAG
    dag = new CompiledDAG()
    dag.workflow_id = workflow_definition.workflow_id

    FOR each node_id IN dependency_graph.nodes():
        dag_node = new DAGNode()
        dag_node.node_id = generate_uuid()
        dag_node.operator_id = node_id
        dag_node.level = levels[node_id]
        dag_node.dependencies = dependency_graph.get_predecessors(node_id)
        dag_node.dependents = dependency_graph.get_successors(node_id)
        dag.nodes.add(dag_node)

    FOR each edge IN dependency_graph.edges():
        dag_edge = new DAGEdge()
        dag_edge.source_node = edge.source
        dag_edge.target_node = edge.target
        dag_edge.channel = create_typed_channel(edge)
        dag.edges.add(dag_edge)

    dag.entry_nodes = dependency_graph.get_roots()
    dag.exit_nodes = dependency_graph.get_leaves()

    RETURN dag

FUNCTION compute_topological_levels(graph)
    levels = {}
    in_degree = compute_in_degrees(graph)
    queue = []

    // Initialize with root nodes (in_degree = 0)
    FOR each node IN graph.nodes():
        IF in_degree[node] == 0:
            queue.enqueue(node)
            levels[node] = 0

    // BFS to compute levels
    WHILE queue is not empty:
        current = queue.dequeue()

        FOR each successor IN graph.get_successors(current):
            in_degree[successor] -= 1
            levels[successor] = max(levels.get(successor, 0), levels[current] + 1)

            IF in_degree[successor] == 0:
                queue.enqueue(successor)

    RETURN levels

Time Complexity: O(V + E) where V = operators, E = dependencies
Space Complexity: O(V + E)
```

### Parallel Execution Scheduler

```
ALGORITHM ScheduleDAGExecution(compiled_dag, resource_pool)
    INPUT: compiled_dag, resource_pool
    OUTPUT: execution_result

    execution_state = new ExecutionState(compiled_dag)
    ready_queue = new PriorityQueue()    // Priority by level, then resource availability

    // Initialize with entry nodes
    FOR each node_id IN compiled_dag.entry_nodes:
        ready_queue.enqueue(node_id, priority=0)
        execution_state.set_status(node_id, READY)

    // Main execution loop
    WHILE execution_state.has_pending_nodes():
        // Launch all ready operators that have resources
        WHILE ready_queue.not_empty():
            node_id = ready_queue.peek()
            node = compiled_dag.get_node(node_id)
            operator = get_operator(node.operator_id)

            IF resource_pool.can_allocate(operator.resource_requirements):
                ready_queue.dequeue()
                allocation = resource_pool.allocate(operator.resource_requirements)

                // Launch operator asynchronously
                launch_operator_async(node_id, operator, allocation,
                    on_complete = (result) => handle_completion(node_id, result),
                    on_failure = (error) => handle_failure(node_id, error)
                )
                execution_state.set_status(node_id, RUNNING)
            ELSE:
                BREAK    // Wait for resources to free up

        // Wait for any operator to complete
        completed_event = wait_for_completion_event()
        process_completion_event(completed_event, execution_state, ready_queue, compiled_dag)

    RETURN execution_state.get_final_result()

FUNCTION handle_completion(node_id, result)
    execution_state.set_status(node_id, COMPLETED)
    execution_state.store_outputs(node_id, result.artifacts)
    resource_pool.release(node_id)

    // Check if any downstream nodes are now ready
    FOR each dependent_id IN compiled_dag.get_dependents(node_id):
        IF all_dependencies_completed(dependent_id):
            ready_queue.enqueue(dependent_id, priority=compiled_dag.get_level(dependent_id))
            execution_state.set_status(dependent_id, READY)

FUNCTION handle_failure(node_id, error)
    operator = get_operator_for_node(node_id)

    IF execution_state.get_retry_count(node_id) < operator.retry_policy.max_retries:
        // Retry with backoff
        execution_state.increment_retry_count(node_id)
        backoff = compute_exponential_backoff(execution_state.get_retry_count(node_id))
        schedule_retry(node_id, backoff)
    ELSE:
        execution_state.set_status(node_id, FAILED)
        execution_state.set_error(node_id, error)
        // Optionally cancel downstream nodes
        IF operator.retry_policy.fail_fast:
            cancel_downstream_nodes(node_id)

Time Complexity: O(V * log V + E) for scheduling
Space Complexity: O(V) for state tracking
```

### Fairness-Aware Resource Allocation

```
ALGORITHM FairnessAwareAllocation(request, team_id, resource_pool)
    INPUT: resource_request, team_id, resource_pool
    OUTPUT: allocation or QUEUE

    team_quota = get_team_quota(team_id)
    team_usage = get_current_team_usage(team_id)

    // Check if team is within quota
    usage_fraction = team_usage / team_quota

    IF usage_fraction > FAIRNESS_THRESHOLD:
        // Team is over-using, check if others are waiting
        IF other_teams_waiting_below_quota():
            RETURN QUEUE with lower_priority

    // Check resource availability
    available = resource_pool.get_available()

    IF request.gpu_count > 0:
        // GPU allocation logic
        gpu_allocation = allocate_gpus(request.gpu_count, request.gpu_type)
        IF gpu_allocation == NULL:
            RETURN QUEUE with reason="GPU_UNAVAILABLE"

    IF request.cpu_cores > available.cpu_cores:
        RETURN QUEUE with reason="CPU_UNAVAILABLE"

    IF request.memory_gb > available.memory_gb:
        RETURN QUEUE with reason="MEMORY_UNAVAILABLE"

    // Allocate resources
    allocation = new ResourceAllocation()
    allocation.cpu_cores = request.cpu_cores
    allocation.memory_gb = request.memory_gb
    allocation.gpus = gpu_allocation
    allocation.worker_id = select_worker(allocation)

    resource_pool.reserve(allocation)
    update_team_usage(team_id, allocation)

    RETURN allocation

FUNCTION allocate_gpus(count, gpu_type)
    // Prefer co-located GPUs for multi-GPU training
    IF count > 1:
        // Find a node with 'count' GPUs available
        node = find_node_with_gpus(count, gpu_type)
        IF node != NULL:
            RETURN node.allocate_gpus(count)

    // Fall back to distributed allocation
    allocated = []
    FOR i FROM 1 TO count:
        gpu = find_any_available_gpu(gpu_type)
        IF gpu == NULL:
            release_all(allocated)
            RETURN NULL
        allocated.add(gpu)

    RETURN allocated

Time Complexity: O(T + G) where T = teams, G = GPU pool size
Space Complexity: O(1)
```

### Auto UI Schema Generation

```
ALGORITHM GenerateUISchema(workflow_input_schema, type_registry)
    INPUT: workflow_input_schema, type_registry
    OUTPUT: ui_schema for form generation

    ui_schema = new UISchema()

    FOR each field IN workflow_input_schema.fields:
        ui_field = new UIField()
        ui_field.name = field.name
        ui_field.label = humanize(field.name)
        ui_field.description = field.description
        ui_field.required = field.name IN workflow_input_schema.required_fields

        // Get type definition from registry
        type_def = type_registry.get(field.type)

        // Map ML type to UI component
        SWITCH type_def.type_name:
            CASE "Dataset":
                ui_field.component = "DatasetSelector"
                ui_field.autocomplete_source = "/api/datasets"
                ui_field.preview_enabled = true

            CASE "FeatureSet":
                ui_field.component = "FeatureSetSelector"
                ui_field.autocomplete_source = "/api/feature-store/feature-sets"
                ui_field.multi_select = true

            CASE "Model":
                ui_field.component = "ModelSelector"
                ui_field.filters = {"framework": type_def.framework}

            CASE "HyperparameterSet":
                ui_field.component = "HyperparameterEditor"
                ui_field.schema = generate_hyperparam_schema(type_def)

            CASE "Date":
                ui_field.component = "DatePicker"
                ui_field.default = today()

            CASE "Integer", "Float":
                ui_field.component = "NumberInput"
                ui_field.min = type_def.min_value
                ui_field.max = type_def.max_value

            CASE "Enum":
                ui_field.component = "Select"
                ui_field.options = type_def.enum_values

            DEFAULT:
                ui_field.component = "TextInput"

        // Apply custom UI hints if present
        IF field.ui_hints != NULL:
            ui_field.merge(field.ui_hints)

        // Add validation rules
        ui_field.validators = generate_validators(type_def, field)

        ui_schema.fields.add(ui_field)

    // Add form-level configuration
    ui_schema.submit_url = "/api/v1/executions"
    ui_schema.method = "POST"
    ui_schema.success_redirect = "/executions/{execution_id}"

    RETURN ui_schema

FUNCTION generate_validators(type_def, field)
    validators = []

    IF field.required:
        validators.add(RequiredValidator())

    IF type_def.has_pattern():
        validators.add(PatternValidator(type_def.pattern))

    IF type_def.has_range():
        validators.add(RangeValidator(type_def.min, type_def.max))

    // Type-specific validators
    IF type_def.type_name == "FeatureSet":
        validators.add(FeatureStoreExistsValidator())

    IF type_def.type_name == "Dataset":
        validators.add(DatasetAccessValidator())

    RETURN validators

Time Complexity: O(F * V) where F = fields, V = validators per field
Space Complexity: O(F)
```

---

## Data Channel Types

### Channel Type Definitions

```
ChannelType {
    MEMORY          // In-memory transfer (same machine)
    LOCAL_DISK      // Local disk serialization
    DISTRIBUTED     // Distributed storage (for large data)
    STREAMING       // Streaming data transfer
}

TypedChannel {
    channel_id:       UUID
    source_operator:  UUID
    target_operator:  UUID
    data_type:        MLType
    channel_type:     ChannelType
    serialization:    SerializationFormat    // e.g., pickle, arrow, parquet
    compression:      CompressionType        // e.g., none, lz4, zstd
    estimated_size:   Long (bytes)
}
```

### Channel Selection Algorithm

```
ALGORITHM SelectChannelType(source_operator, target_operator, data_type, estimated_size)
    // Check if operators are co-located
    IF same_worker(source_operator, target_operator):
        IF estimated_size < MEMORY_THRESHOLD:    // e.g., 1GB
            RETURN MEMORY
        ELSE:
            RETURN LOCAL_DISK

    // Operators on different machines
    IF estimated_size < NETWORK_THRESHOLD:       // e.g., 100MB
        RETURN DISTRIBUTED with serialization=ARROW

    // Large data transfer
    IF data_type.is_streamable():
        RETURN STREAMING

    RETURN DISTRIBUTED with serialization=PARQUET, compression=ZSTD
```

---

## Indexing Strategy

### Workflow Database Indexes

```sql
-- Primary access patterns
CREATE INDEX idx_workflow_team ON workflows(owner_team, created_at DESC);
CREATE INDEX idx_workflow_name ON workflows(name, version);

-- Execution queries
CREATE INDEX idx_execution_workflow ON executions(workflow_id, started_at DESC);
CREATE INDEX idx_execution_status ON executions(status, started_at DESC);
CREATE INDEX idx_execution_team ON executions(team_id, started_at DESC);

-- Node execution queries
CREATE INDEX idx_node_execution ON node_executions(execution_id, status);
CREATE INDEX idx_node_worker ON node_executions(worker_id, status);

-- Artifact queries
CREATE INDEX idx_artifact_execution ON artifacts(execution_id, type);
CREATE INDEX idx_artifact_type ON artifacts(type, created_at DESC);
```

### Partitioning Strategy

```
Table: executions
Partition Key: started_at (monthly partitions)
Rationale: Time-based queries, old data archival

Table: node_executions
Partition Key: execution_id
Rationale: All nodes for an execution queried together

Table: artifacts
Partition Key: created_at (monthly) + type
Rationale: Type-specific queries, retention policies differ
```
