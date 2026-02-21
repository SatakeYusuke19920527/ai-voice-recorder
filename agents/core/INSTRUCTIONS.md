# INSTRUCTIONS.md

## High-Level Development Instructions

### 1. Separation of Pipelines
- `New Talk` path keeps existing Azure/Cosmos behavior unless requested otherwise.
- `New Talk w/ OpenAI` path uses OpenAI API and Neon storage.
- Do not silently merge these pipelines.

### 2. API Design
- Return clear status codes.
- Distinguish auth errors, quota/rate limits, and generic failures.
- Keep responses small and stable.

### 3. UI/UX
- Maintain concise, readable interface text.
- Prefer consistent visual language across dashboard pages.
- Ensure mobile navigation and sidebar labels do not break layout.

### 4. Data Safety
- Never drop or mutate existing data structures without migration intent.
- Use idempotent initialization for new tables.
- Keep user-scoped queries (`userId`) enforced.

### 5. Change Discipline
- Make focused changes per request.
- Run build checks after structural updates.
- Document newly introduced assumptions.
