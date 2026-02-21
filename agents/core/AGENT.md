# AGENTS.md

## Purpose
This repository uses multiple AI agents for product iteration, backend integration, and UI enhancement.
Use this file as the top-level coordination guide.

## Project Scope
- Product: AI Voice Recorder
- Frontend: Next.js app in `frontend/`
- Backend functions: Azure Functions in `functions/`
- Storage:
  - Cosmos DB (existing recording pipeline)
  - Neon PostgreSQL (OpenAI recording pipeline)

## Agent Roles
- Product/UI Agent
  - Works on dashboard UX, recording flow UI, and navigation
  - Must preserve responsive behavior for mobile and desktop
- Frontend API Agent
  - Works on Next.js route handlers under `frontend/src/app/api`
  - Keeps Azure and OpenAI pipelines separated when required
- Data Agent
  - Maintains schema consistency for Cosmos and Neon
  - Avoids breaking existing user data paths
- Functions Agent
  - Works on Azure Functions under `functions/src/functions`
  - Keeps trigger behavior and environment variables explicit

## Collaboration Rules
- Do not remove existing working paths unless explicitly requested.
- Prefer additive changes and clear migration paths.
- Keep API behavior explicit and storage destination unambiguous.
- For any new env var, document in `TOOLING.md`.

## Quality Bar
- Build must pass in `frontend` after meaningful changes.
- Error messages must be actionable for users and developers.
- Keep code comments minimal and purposeful.
