# STORAGE.md

## Storage Matrix
- Cosmos DB:
  - User metadata (current app path)
  - Azure recording history
- Neon PostgreSQL:
  - OpenAI recording history (`openai_recordings`)

## Query Discipline
- All history queries are user-scoped.
- Keep list/detail APIs consistent in filtering and sorting.
