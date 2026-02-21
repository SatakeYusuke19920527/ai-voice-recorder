# TOOLING.md

## Runtime/Framework
- Node.js + Next.js (frontend)
- Azure Functions (functions)

## Storage
- Cosmos DB
  - Used by existing Azure recording path
- Neon PostgreSQL
  - Used by OpenAI recording path
  - Connection via `DATABASE_URL`

## AI/Transcription Providers
- Azure Speech (existing path)
- OpenAI Audio Transcriptions (OpenAI path)

## Key Environment Variables

### Frontend
- Auth
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
- Cosmos
  - `COSMOS_CONNECTION_STRING`
  - `COSMOS_DATABASE`
  - `COSMOS_CONTAINER`
- Azure Speech
  - `AZURE_SPEECH_KEY`
  - `AZURE_SPEECH_REGION`
  - `AZURE_SPEECH_LANGUAGE`
- OpenAI (for New Talk w/ OpenAI)
  - `OPENAI_API_KEY`
  - `OPENAI_TRANSCRIBE_MODEL`
  - `OPENAI_TRANSCRIBE_LANGUAGE`
- Neon PostgreSQL
  - `DATABASE_URL`

### Functions
- Cosmos trigger
  - `COSMOS_DB_CONNECTION_STRING`
  - `COSMOS_DB_DATABASE_NAME`
  - `COSMOS_DB_CONTAINER_NAME`
- Azure OpenAI (summarization)
  - `AZURE_OPENAI_ENDPOINT`
  - `AZURE_OPENAI_API_KEY`
  - `AZURE_OPENAI_DEPLOYMENT`
  - `AZURE_OPENAI_API_VERSION`
- AzureWebJobs
  - `AzureWebJobsStorage`

## Operational Checks
- Frontend build:
  - `cd frontend && npm run build`
- Functions build:
  - `cd functions && npm run build`
