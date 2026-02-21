# DATA_POLICY.md

## Data Handling Policy
- User-scoped reads/writes must always include `userId` constraints.
- Avoid schema-breaking changes without migration plan.
- For new storage tables, use idempotent creation logic where possible.
