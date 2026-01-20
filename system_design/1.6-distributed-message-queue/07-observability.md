# Observability

[← Back to Index](./00-index.md)

---

## Metrics Framework

### RED Metrics (Request-focused)

```
┌─────────────────────────────────────────────────────────────────┐
│                    RED METRICS                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  RATE (requests per second)                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • rabbitmq_global_messages_received_total              │   │
│  │    (Messages published per second)                       │   │
│  │                                                          │   │
│  │  • rabbitmq_global_messages_delivered_total             │   │
│  │    (Messages delivered to consumers per second)          │   │
│  │                                                          │   │
│  │  • rabbitmq_global_messages_acknowledged_total          │   │
│  │    (Messages acknowledged per second)                    │   │
│  │                                                          │   │
│  │  • rabbitmq_global_messages_redelivered_total           │   │
│  │    (Redeliveries per second - indicates failures)       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ERRORS (error rate)                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • rabbitmq_global_messages_dead_lettered_total         │   │
│  │    (Dead-lettered messages - processing failures)        │   │
│  │                                                          │   │
│  │  • rabbitmq_global_messages_unroutable_returned_total   │   │
│  │    (Unroutable messages - routing failures)              │   │
│  │                                                          │   │
│  │  • rabbitmq_auth_failures_total                         │   │
│  │    (Authentication failures)                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  DURATION (latency)                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Application-level (instrument in code):                │   │
│  │  • publish_latency_seconds                              │   │
│  │    (Time from publish call to confirm)                  │   │
│  │                                                          │   │
│  │  • consume_latency_seconds                              │   │
│  │    (Time from delivery to ACK)                          │   │
│  │                                                          │   │
│  │  • message_age_seconds                                  │   │
│  │    (Time message spent in queue)                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### USE Metrics (Resource-focused)

```
┌─────────────────────────────────────────────────────────────────┐
│                    USE METRICS                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  UTILIZATION                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Memory:                                                 │   │
│  │  • rabbitmq_resident_memory_limit_bytes                 │   │
│  │  • rabbitmq_process_resident_memory_bytes               │   │
│  │  • memory_utilization = memory_used / memory_limit      │   │
│  │                                                          │   │
│  │  Disk:                                                   │   │
│  │  • rabbitmq_disk_space_available_bytes                  │   │
│  │  • rabbitmq_disk_space_available_limit_bytes            │   │
│  │                                                          │   │
│  │  File Descriptors:                                       │   │
│  │  • rabbitmq_process_open_fds                            │   │
│  │  • rabbitmq_process_max_fds                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  SATURATION                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Queues:                                                 │   │
│  │  • rabbitmq_queue_messages_ready                        │   │
│  │    (Messages waiting for consumers - queue backlog)     │   │
│  │                                                          │   │
│  │  • rabbitmq_queue_messages_unacknowledged               │   │
│  │    (Delivered but not ACKed - consumer backlog)         │   │
│  │                                                          │   │
│  │  Connections:                                            │   │
│  │  • rabbitmq_connections_total                           │   │
│  │  • rabbitmq_channels_total                              │   │
│  │                                                          │   │
│  │  Flow Control:                                           │   │
│  │  • rabbitmq_global_publishers_blocked                   │   │
│  │    (Producers blocked due to memory/disk pressure)      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ERRORS                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • rabbitmq_alarms_memory_used_watermark                │   │
│  │    (Memory alarm active)                                 │   │
│  │                                                          │   │
│  │  • rabbitmq_alarms_disk_free                            │   │
│  │    (Disk alarm active)                                   │   │
│  │                                                          │   │
│  │  • rabbitmq_cluster_partition_detected                  │   │
│  │    (Network partition in cluster)                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Queue-Specific Metrics

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUEUE METRICS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Per-Queue Metrics (labeled by queue name):                     │
│                                                                  │
│  Message Counts:                                                 │
│  • rabbitmq_queue_messages                                      │
│    Total messages in queue (ready + unacked)                    │
│                                                                  │
│  • rabbitmq_queue_messages_ready                                │
│    Messages available for delivery                              │
│                                                                  │
│  • rabbitmq_queue_messages_unacknowledged                       │
│    Messages delivered, awaiting ACK                             │
│                                                                  │
│  Consumer Metrics:                                               │
│  • rabbitmq_queue_consumers                                     │
│    Active consumers on this queue                               │
│                                                                  │
│  • rabbitmq_queue_consumer_utilisation                          │
│    % of time consumers are able to receive messages             │
│    (< 100% means consumers are fully utilized)                  │
│                                                                  │
│  Resource Usage:                                                 │
│  • rabbitmq_queue_memory                                        │
│    Memory used by queue process (bytes)                         │
│                                                                  │
│  Throughput:                                                     │
│  • rabbitmq_queue_messages_published_total                      │
│  • rabbitmq_queue_messages_delivered_total                      │
│  • rabbitmq_queue_messages_acknowledged_total                   │
│                                                                  │
│  State:                                                          │
│  • rabbitmq_queue_state                                         │
│    (running, flow, idle, crashed)                               │
│                                                                  │
│  Quorum Queue Specific:                                          │
│  • rabbitmq_queue_leader                                        │
│    (1 if this node is leader for the queue)                     │
│  • rabbitmq_queue_members                                       │
│    (Number of replicas for quorum queue)                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Logging

### Log Levels and Categories

```
┌─────────────────────────────────────────────────────────────────┐
│                    LOGGING CONFIGURATION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Log Levels: debug < info < notice < warning < error < critical │
│                                                                  │
│  Categories (rabbitmq.conf):                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  # General                                               │   │
│  │  log.default.level = info                               │   │
│  │                                                          │   │
│  │  # Connection lifecycle                                  │   │
│  │  log.connection.level = info                            │   │
│  │                                                          │   │
│  │  # Channel operations                                    │   │
│  │  log.channel.level = warning                            │   │
│  │                                                          │   │
│  │  # Queue operations                                      │   │
│  │  log.queue.level = info                                 │   │
│  │                                                          │   │
│  │  # Mirroring/replication                                │   │
│  │  log.mirroring.level = info                             │   │
│  │                                                          │   │
│  │  # Federation                                            │   │
│  │  log.federation.level = warning                         │   │
│  │                                                          │   │
│  │  # Raft (quorum queues)                                 │   │
│  │  log.ra.level = warning                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Output Configuration:                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  # File output with rotation                            │   │
│  │  log.file = /var/log/rabbitmq/rabbit.log               │   │
│  │  log.file.level = info                                  │   │
│  │  log.file.rotation.date = $D0                          │   │
│  │  log.file.rotation.size = 10485760                     │   │
│  │  log.file.rotation.count = 5                           │   │
│  │                                                          │   │
│  │  # Console output (for containers)                      │   │
│  │  log.console = true                                     │   │
│  │  log.console.level = info                               │   │
│  │                                                          │   │
│  │  # JSON format (for log aggregation)                    │   │
│  │  log.console.formatter = json                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Log Events to Monitor

| Event | Log Level | Action |
|-------|-----------|--------|
| Connection created | info | Track for audit |
| Connection closed (error) | warning | Investigate if frequent |
| Authentication failed | warning | Security alert |
| Queue declared | info | Track for drift |
| Memory alarm on | warning | Scale or investigate |
| Disk alarm on | warning | Add disk capacity |
| Cluster partition | error | Immediate investigation |
| Leader election | info | Monitor frequency |

### Structured Logging Example

```
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "level": "info",
  "msg": "accepting AMQP connection",
  "connection": "10.0.1.50:52341 -> 10.0.2.10:5672",
  "vhost": "/orders",
  "user": "order-service",
  "protocol": "amqp",
  "auth_mechanism": "PLAIN",
  "node": "rabbit@node1"
}
```

---

## Distributed Tracing

### OpenTelemetry Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                    DISTRIBUTED TRACING                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Message Flow with Trace Context:                               │
│                                                                  │
│  Producer Service          RabbitMQ         Consumer Service    │
│       │                       │                   │              │
│       │ ──publish()───────────►                   │              │
│       │   headers:            │                   │              │
│       │   traceparent:        │                   │              │
│       │   00-abc123-def456-01 │                   │              │
│       │                       │ ──deliver()──────►│              │
│       │                       │   (with headers)  │              │
│       │                       │                   │              │
│                                                                  │
│  Trace Propagation (application-level):                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  // Producer                                             │   │
│  │  span = tracer.start_span("publish_order")              │   │
│  │  headers = {                                             │   │
│  │      "traceparent": span.context.to_traceparent(),      │   │
│  │      "tracestate": span.context.to_tracestate()         │   │
│  │  }                                                       │   │
│  │  channel.publish(exchange, routing_key, body, headers)  │   │
│  │  span.end()                                              │   │
│  │                                                          │   │
│  │  // Consumer                                             │   │
│  │  parent_ctx = extract_context(message.headers)          │   │
│  │  span = tracer.start_span("process_order", parent=ctx)  │   │
│  │  process_message(message)                                │   │
│  │  channel.ack(message.delivery_tag)                      │   │
│  │  span.end()                                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Span Attributes:                                                │
│  • messaging.system = "rabbitmq"                                │
│  • messaging.destination = queue_name                           │
│  • messaging.destination_kind = "queue"                         │
│  • messaging.rabbitmq.routing_key                               │
│  • messaging.message_id                                         │
│  • messaging.conversation_id (correlation_id)                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Alerting

### Critical Alerts (Page Immediately)

```
┌─────────────────────────────────────────────────────────────────┐
│                    CRITICAL ALERTS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Cluster Partition Detected                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Alert: rabbitmq_cluster_partition_detected == 1         │   │
│  │  Severity: Critical                                      │   │
│  │  Action: Investigate network, may need manual resolution │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  2. Memory Alarm Active                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Alert: rabbitmq_alarms_memory_used_watermark == 1      │   │
│  │  Severity: Critical                                      │   │
│  │  Action: Publishers blocked, investigate memory usage    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  3. Disk Alarm Active                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Alert: rabbitmq_alarms_disk_free == 1                  │   │
│  │  Severity: Critical                                      │   │
│  │  Action: Publishers blocked, add disk or purge queues   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  4. No Consumers on Critical Queue                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Alert: rabbitmq_queue_consumers{queue="orders"} == 0   │   │
│  │  Duration: > 5 minutes                                   │   │
│  │  Severity: Critical                                      │   │
│  │  Action: Consumer service down, restart or investigate  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  5. Quorum Queue Lost Majority                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Alert: rabbitmq_queue_members < quorum_size            │   │
│  │  Severity: Critical                                      │   │
│  │  Action: Queue unavailable, recover nodes               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Warning Alerts (Investigate During Business Hours)

```
┌─────────────────────────────────────────────────────────────────┐
│                    WARNING ALERTS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. High Queue Depth                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Alert: rabbitmq_queue_messages_ready > 100000          │   │
│  │  Duration: > 10 minutes                                  │   │
│  │  Action: Scale consumers, investigate slow consumers    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  2. Memory Usage High                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Alert: memory_used / memory_limit > 0.7                │   │
│  │  Severity: Warning                                       │   │
│  │  Action: Approaching alarm threshold, optimize or scale │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  3. High Unacked Message Count                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Alert: rabbitmq_queue_messages_unacknowledged > 10000  │   │
│  │  Duration: > 5 minutes                                   │   │
│  │  Action: Consumers slow or stuck, investigate           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  4. Dead Letter Queue Growing                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Alert: rate(dlq_messages_total[5m]) > 10               │   │
│  │  Severity: Warning                                       │   │
│  │  Action: Consumer errors, investigate failures          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  5. High Redelivery Rate                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Alert: redelivered / delivered > 0.1 (10%)             │   │
│  │  Severity: Warning                                       │   │
│  │  Action: Consumer failures, investigate errors          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  6. Connection Count High                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Alert: rabbitmq_connections > 5000                     │   │
│  │  Severity: Warning                                       │   │
│  │  Action: Connection leak or scaling issue               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Dashboards

### Overview Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLUSTER OVERVIEW DASHBOARD                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │  Cluster Health │ │ Publish Rate    │ │ Consume Rate    │   │
│  │  ██████████ OK  │ │ 45,230 msg/s    │ │ 44,890 msg/s    │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
│                                                                  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │  Connections    │ │ Channels        │ │ Queues          │   │
│  │ 2,451 / 10,000  │ │ 8,234 / 50,000  │ │ 156 active      │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
│                                                                  │
│  Message Rates (last 1 hour)                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 50K ┤                    ╭─╮                            │   │
│  │     │    ╭──────────────╯  ╰────────────────────        │   │
│  │ 40K ┤───╯                                               │   │
│  │     │                                                    │   │
│  │ 30K ┤                                                   │   │
│  │     └────────────────────────────────────────────────── │   │
│  │     09:00    09:15    09:30    09:45    10:00          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Node Status:                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Node 1 │ ██████████ │ Memory: 45% │ Disk: 30% │ OK    │   │
│  │  Node 2 │ ██████████ │ Memory: 42% │ Disk: 28% │ OK    │   │
│  │  Node 3 │ ██████████ │ Memory: 48% │ Disk: 32% │ OK    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Queue Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUEUE DETAIL DASHBOARD                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Queue: orders.process                                          │
│                                                                  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │  Ready          │ │  Unacked        │ │  Consumers      │   │
│  │     12,450      │ │     2,340       │ │       8         │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
│                                                                  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │  Publish Rate   │ │  Deliver Rate   │ │  Ack Rate       │   │
│  │  1,234 msg/s    │ │  1,220 msg/s    │ │  1,218 msg/s    │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
│                                                                  │
│  Queue Depth Over Time:                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 20K ┤    ╭╮                                             │   │
│  │     │   ╭╯╰╮                                            │   │
│  │ 15K ┤──╯   ╰─────────────────────────────────────       │   │
│  │     │                                                    │   │
│  │ 10K ┤                                                   │   │
│  │     └────────────────────────────────────────────────── │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Consumer Utilization: 87%                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ████████████████████████████████████░░░░░░░░ 87%        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Queue Properties:                                               │
│  • Type: quorum                                                 │
│  • Durable: yes                                                 │
│  • Leader: node2                                                │
│  • Replicas: node1, node2, node3                               │
│  • Memory: 128 MB                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Monitoring Tools

### Built-in Management UI

| Feature | Description |
|---------|-------------|
| Overview | Cluster health, rates, node status |
| Connections | Active connections, client info |
| Channels | Channel list, flow control status |
| Exchanges | Exchange list, bindings, rates |
| Queues | Queue details, depth, consumers |
| Admin | Users, vhosts, policies, limits |

### Prometheus Integration

```
# Enable prometheus plugin
rabbitmq-plugins enable rabbitmq_prometheus

# Metrics endpoint
# http://localhost:15692/metrics

# Example scrape config (prometheus.yml)
scrape_configs:
  - job_name: 'rabbitmq'
    static_configs:
      - targets: ['rabbitmq-1:15692', 'rabbitmq-2:15692', 'rabbitmq-3:15692']
    metrics_path: /metrics
```

### Grafana Dashboards

| Dashboard | Use Case |
|-----------|----------|
| RabbitMQ Overview | Cluster health, aggregate metrics |
| RabbitMQ Queues | Per-queue deep dive |
| RabbitMQ Raft | Quorum queue health |
| RabbitMQ Erlang | VM metrics, process counts |

---

## Runbooks

### High Queue Depth

```
┌─────────────────────────────────────────────────────────────────┐
│  RUNBOOK: High Queue Depth                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Symptoms:                                                       │
│  • rabbitmq_queue_messages_ready > threshold                    │
│  • Consumer lag increasing                                      │
│                                                                  │
│  Diagnosis:                                                      │
│  1. Check consumer count: Is it zero or low?                    │
│     → Consumers may have crashed or scaled down                │
│                                                                  │
│  2. Check consumer utilization: Is it 100%?                     │
│     → Consumers are at capacity, need more                     │
│                                                                  │
│  3. Check unacked count: Is it high?                            │
│     → Consumers slow or stuck on messages                      │
│                                                                  │
│  4. Check publish rate: Is it spiking?                          │
│     → Unexpected traffic burst                                  │
│                                                                  │
│  Actions:                                                        │
│  • Scale up consumers                                           │
│  • Increase prefetch if consumers underutilized                │
│  • Check consumer logs for errors                               │
│  • Consider temporary rate limiting on publishers              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Memory Alarm

```
┌─────────────────────────────────────────────────────────────────┐
│  RUNBOOK: Memory Alarm                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Symptoms:                                                       │
│  • Publishers blocked                                           │
│  • Memory alarm active                                          │
│                                                                  │
│  Diagnosis:                                                      │
│  1. Which queues are using most memory?                         │
│     rabbitmqctl list_queues name memory --sort memory          │
│                                                                  │
│  2. Are queues backing up (high message count)?                 │
│     → Consumers not keeping up                                  │
│                                                                  │
│  3. Are there many connections/channels?                        │
│     → Connection leak or scaling issue                         │
│                                                                  │
│  Actions:                                                        │
│  Immediate:                                                      │
│  • Purge non-critical queues (if acceptable)                   │
│  • Kill idle connections                                        │
│  • Temporarily reject publishes at application level           │
│                                                                  │
│  Short-term:                                                     │
│  • Scale consumers                                              │
│  • Convert to lazy queues                                       │
│                                                                  │
│  Long-term:                                                      │
│  • Add memory to nodes                                          │
│  • Add nodes to cluster                                         │
│  • Implement queue length limits                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
