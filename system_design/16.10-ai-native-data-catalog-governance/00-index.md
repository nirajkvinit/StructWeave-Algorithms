# 16.10 Design an AI-Native Data Catalog & Governance Platform

## Overview

An AI-native data catalog and governance platform is the metadata intelligence layer that sits above an organization's entire data estate — databases, warehouses, lakehouses, BI tools, ML pipelines, and streaming systems — and provides a unified graph of metadata relationships that enables discovery, classification, lineage tracking, policy enforcement, and natural language querying. Unlike traditional catalogs that serve as passive registries requiring manual curation, an AI-native catalog uses machine learning for automatic PII classification, NLP for natural language data querying, graph traversal for impact analysis, and active metadata pipelines that respond to changes in real time. The platform becomes the "context layer" that allows both humans and AI agents to understand what data exists, where it came from, who owns it, whether it is trustworthy, and what policies govern its use — making it the governance backbone for data mesh architectures, regulatory compliance, and AI-readiness.

## Key Characteristics

| Characteristic | Description |
|----------------|-------------|
| **Read-heavy for discovery** | Search, browse, and lineage traversal dominate; metadata queries outnumber writes 100:1 |
| **Write-moderate for ingestion** | Metadata crawlers and push-based connectors continuously ingest schema changes, lineage events, and quality signals |
| **Latency-sensitive for search** | Data engineers expect sub-second search results and instant lineage graph rendering |
| **Graph-centric** | The core data model is a metadata graph — entities (tables, columns, pipelines, dashboards) connected by typed relationships (lineage, ownership, dependency) |
| **ML-augmented** | Auto-classification, anomaly detection, and NL-to-SQL require inference pipelines integrated into the metadata flow |
| **Event-driven** | Active metadata reacts to schema changes, quality violations, and access patterns in real time via event streaming |
| **Multi-tenant** | Enterprise deployments serve hundreds of domains with isolated access controls and shared governance policies |

## Complexity Rating: **High**

The platform must unify metadata from 50-100+ heterogeneous data sources with different schemas, APIs, and change notification mechanisms. The metadata graph must support column-level lineage across SQL transformations (requiring SQL parsing and AST analysis), ML-based PII classification with configurable confidence thresholds, tag-based policy enforcement with inheritance semantics, and natural language querying that combines catalog metadata with LLM-powered SQL generation. The organizational challenge of driving adoption across domain teams adds complexity beyond the purely technical.

## Quick Links

| # | Section | Description |
|---|---------|-------------|
| 01 | [Requirements & Estimations](./01-requirements-and-estimations.md) | Functional/non-functional requirements, capacity planning, SLOs |
| 02 | [High-Level Design](./02-high-level-design.md) | Architecture diagrams, data flow, key decisions |
| 03 | [Low-Level Design](./03-low-level-design.md) | Data model, API design, core algorithms (pseudocode) |
| 04 | [Deep Dive & Bottlenecks](./04-deep-dive-and-bottlenecks.md) | Column-level lineage, auto-classification, search ranking |
| 05 | [Scalability & Reliability](./05-scalability-and-reliability.md) | Scaling strategies, replication, fault tolerance |
| 06 | [Security & Compliance](./06-security-and-compliance.md) | Tag-based access control, PII governance, compliance |
| 07 | [Observability](./07-observability.md) | Catalog-specific metrics, connector health, adoption tracking |
| 08 | [Interview Guide](./08-interview-guide.md) | 45-min pacing, trap questions, trade-off frameworks |
| 09 | [Insights](./09-insights.md) | Key architectural insights and non-obvious lessons |

## Technology Landscape

| Category | Representative Systems | Approach |
|----------|----------------------|----------|
| Commercial AI-Native | Atlan, Alation, Collibra | Active metadata, ML classification, enterprise governance |
| Open-Source Unified | OpenMetadata | Simplified stack (RDBMS + search), 100+ connectors, built-in quality |
| Open-Source Graph-Based | DataHub (LinkedIn) | Event-driven metadata graph, Kafka-based streaming, GraphQL API |
| Open-Source Discovery | Amundsen (Lyft) | Search-focused, Neo4j graph backend, lightweight |
| Cloud-Integrated | Unity Catalog, Dataplex | Tight lakehouse/warehouse integration, ABAC policies |
| Data Quality Overlay | Great Expectations, Soda, Anomalo | Quality scoring, anomaly detection, contract validation |

## Key Concepts

| Concept | Definition |
|---------|-----------|
| **Active Metadata** | Metadata that triggers automated actions (alerts, policy enforcement, lineage updates) rather than sitting passively in a registry |
| **Column-Level Lineage** | Tracking data flow at the individual column level through SQL transformations, ETL jobs, and BI reports |
| **Auto-Classification** | ML-driven detection and tagging of sensitive data (PII, PHI, PCI) using NER, regex patterns, and sampling |
| **Data Quality Score** | Composite metric combining freshness, completeness, uniqueness, validity, and consistency dimensions |
| **Tag-Based Policy** | Governance rules (masking, filtering, access) that attach to metadata tags rather than individual assets |
| **Natural Language Querying** | LLM-powered interface that converts business questions to SQL using catalog metadata as context |
| **Metadata Graph** | A knowledge graph where entities are data assets and edges are relationships (lineage, ownership, dependency) |
