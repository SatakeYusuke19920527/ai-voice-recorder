import { CosmosClient, type Container } from '@azure/cosmos';
import { app, InvocationContext } from '@azure/functions';
import OpenAI from 'openai';

type RecordingDocument = {
  id?: string;
  transcript?: string;
  summary?: string;
  [key: string]: unknown;
};

const cosmosConnectionString = process.env.COSMOS_DB_CONNECTION_STRING ?? '';
const cosmosDatabaseName = process.env.COSMOS_DB_DATABASE_NAME ?? 'db';
const cosmosContainerName = process.env.COSMOS_DB_CONTAINER_NAME ?? 'recording';

const azureOpenAIEndpoint = process.env.AZURE_OPENAI_ENDPOINT ?? '';
const azureOpenAIApiKey = process.env.AZURE_OPENAI_API_KEY ?? '';
const azureOpenAIDeployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? '';
const azureOpenAIApiVersion =
  process.env.AZURE_OPENAI_API_VERSION ?? '2024-10-21';

let cosmosContainerCache: Container | null = null;
let openAIClientCache: OpenAI | null = null;

const getCosmosContainer = (): Container => {
  if (cosmosContainerCache) {
    return cosmosContainerCache;
  }
  const client = new CosmosClient(cosmosConnectionString);
  cosmosContainerCache = client
    .database(cosmosDatabaseName)
    .container(cosmosContainerName);
  return cosmosContainerCache;
};

const getOpenAIClient = (): OpenAI => {
  if (openAIClientCache) {
    return openAIClientCache;
  }
  const endpoint = azureOpenAIEndpoint.replace(/\/$/, '');
  const isV1Endpoint = /\/openai\/v1$/i.test(endpoint);
  const baseURL = isV1Endpoint
    ? `${endpoint}/`
    : `${endpoint}/openai/deployments/${azureOpenAIDeployment}`;

  openAIClientCache = new OpenAI({
    apiKey: azureOpenAIApiKey,
    baseURL,
    ...(isV1Endpoint
      ? {}
      : { defaultQuery: { 'api-version': azureOpenAIApiVersion } }),
    defaultHeaders: { 'api-key': azureOpenAIApiKey },
  });
  return openAIClientCache;
};

const stripSystemFields = (document: RecordingDocument): RecordingDocument => {
  const clean: RecordingDocument = {};
  for (const [key, value] of Object.entries(document)) {
    if (!key.startsWith('_')) {
      clean[key] = value;
    }
  }
  return clean;
};

const createSummary = async (transcript: string): Promise<string> => {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: azureOpenAIDeployment,
    messages: [
      {
        role: 'system',
        content:
          'You summarize Japanese speech transcripts in concise Japanese. Output only the summary text.',
      },
      {
        role: 'user',
        content: `以下の文字起こしを3行以内で要約してください。\n\n${transcript}`,
      },
    ],
  });
  return response.choices[0]?.message?.content?.trim() ?? '';
};

export async function cosmosChangeLogger(
  documents: RecordingDocument[],
  context: InvocationContext,
): Promise<void> {
  context.log(`Cosmos DB trigger fired. documents: ${documents.length}`);

  if (!azureOpenAIEndpoint || !azureOpenAIApiKey || !azureOpenAIDeployment) {
    context.warn(
      'Azure OpenAI settings are missing. Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT.',
    );
    return;
  }

  const container = getCosmosContainer();

  for (const document of documents) {
    const id = typeof document.id === 'string' ? document.id : '';
    const transcript =
      typeof document.transcript === 'string' ? document.transcript.trim() : '';
    const currentSummary =
      typeof document.summary === 'string' ? document.summary.trim() : '';

    if (!id) {
      context.warn('Skip document because id is missing.');
      continue;
    }
    if (!transcript) {
      context.log(`Skip id=${id} because transcript is empty.`);
      continue;
    }
    if (currentSummary) {
      context.log(`Skip id=${id} because summary already exists.`);
      continue;
    }

    try {
      const summary = await createSummary(transcript);
      if (!summary) {
        context.warn(`Summary is empty. id=${id}`);
        continue;
      }

      const updated = stripSystemFields(document);
      updated.summary = summary;

      await container.items.upsert(updated);
      context.log(`Summary updated. id=${id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      context.error(`Failed to summarize id=${id}. ${message}`);
    }
  }
}

app.cosmosDB('cosmosChangeLogger', {
  connection: 'COSMOS_DB_CONNECTION_STRING',
  databaseName: cosmosDatabaseName,
  containerName: cosmosContainerName,
  createLeaseContainerIfNotExists: true,
  handler: cosmosChangeLogger,
});
