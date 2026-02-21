# MEMORY_SCHEMA.md

## Purpose
Define persistent memory fields for agent execution context.

## Schema (Conceptual)
- `project_name`: string
- `active_pipelines`: string[]  // e.g. azure-cosmos, openai-neon
- `env_dependencies`: string[]
- `known_constraints`: string[]
- `recent_decisions`: { date: string; decision: string; reason: string }[]
- `open_issues`: { id: string; status: string; note: string }[]
