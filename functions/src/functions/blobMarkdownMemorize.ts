import { CosmosClient, type Container } from '@azure/cosmos';
import { app, InvocationContext } from '@azure/functions';
import OpenAI from 'openai';

type MemorizeWord = {
  word: string;
  meaning: string;
  example: string;
};

type MemorizeGrammar = {
  pattern: string;
  explanation: string;
  example: string;
};

type MemorizeExtractionResult = {
  importantWords: MemorizeWord[];
  grammarPatterns: MemorizeGrammar[];
};

type MemorizeDocument = {
  id: string;
  meetingId: string;
  sourceBlobName: string;
  importantWords: MemorizeWord[];
  grammarPatterns: MemorizeGrammar[];
  createdAt: string;
  updatedAt: string;
};

const cosmosConnectionString = process.env.COSMOS_DB_CONNECTION_STRING ?? '';
const cosmosDatabaseName = process.env.COSMOS_DB_DATABASE_NAME ?? 'db';
const memorizeContainerName =
  process.env.COSMOS_MEMORIZE_CONTAINER ?? 'memorize';
const markdownContainerName =
  process.env.BLOB_MARKDOWN_CONTAINER ?? 'container';

const azureOpenAIEndpoint = process.env.AZURE_OPENAI_ENDPOINT ?? '';
const azureOpenAIApiKey = process.env.AZURE_OPENAI_API_KEY ?? '';
const azureOpenAIDeployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? '';
const azureOpenAIApiVersion =
  process.env.AZURE_OPENAI_API_VERSION ?? '2024-10-21';

let cosmosContainerCache: Promise<Container> | null = null;
let openAIClientCache: OpenAI | null = null;

const normalizeAzureEndpoint = (rawEndpoint: string) =>
  rawEndpoint
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/openai\/v1$/i, '')
    .replace(/\/openai$/i, '');

const getCosmosContainer = async (): Promise<Container> => {
  if (cosmosContainerCache) {
    return cosmosContainerCache;
  }
  cosmosContainerCache = (async () => {
    const client = new CosmosClient(cosmosConnectionString);
    const { database } = await client.databases.createIfNotExists({
      id: cosmosDatabaseName,
    });
    const { container } = await database.containers.createIfNotExists({
      id: memorizeContainerName,
      partitionKey: { paths: ['/meetingId'] },
    });
    return container;
  })();
  return cosmosContainerCache;
};

const getOpenAIClient = (): OpenAI => {
  if (openAIClientCache) {
    return openAIClientCache;
  }

  const endpoint = normalizeAzureEndpoint(azureOpenAIEndpoint);
  const isV1Endpoint = /\/openai\/v1$/i.test(azureOpenAIEndpoint.trim());
  const baseURL = isV1Endpoint
    ? `${azureOpenAIEndpoint.trim().replace(/\/+$/, '')}/`
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

const toStringContent = (blob: unknown): string => {
  if (typeof blob === 'string') {
    return blob;
  }
  if (blob instanceof Uint8Array) {
    return Buffer.from(blob).toString('utf-8');
  }
  if (blob instanceof ArrayBuffer) {
    return Buffer.from(blob).toString('utf-8');
  }
  return '';
};

const toMeetingId = (blobName: string): string => {
  const last = blobName.split('/').pop() ?? blobName;
  return last.replace(/\.[^/.]+$/, '').trim() || 'unknown-meeting';
};

const toExtractionResult = (value: unknown): MemorizeExtractionResult => {
  if (!value || typeof value !== 'object') {
    return { importantWords: [], grammarPatterns: [] };
  }
  const candidate = value as {
    importantWords?: unknown;
    grammarPatterns?: unknown;
  };
  const importantWords = Array.isArray(candidate.importantWords)
    ? candidate.importantWords
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const x = item as Record<string, unknown>;
          const word = typeof x.word === 'string' ? x.word.trim() : '';
          const meaning = typeof x.meaning === 'string' ? x.meaning.trim() : '';
          const example = typeof x.example === 'string' ? x.example.trim() : '';
          if (!word || !meaning || !example) return null;
          return { word, meaning, example };
        })
        .filter((item): item is MemorizeWord => item !== null)
    : [];
  const grammarPatterns = Array.isArray(candidate.grammarPatterns)
    ? candidate.grammarPatterns
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const x = item as Record<string, unknown>;
          const pattern = typeof x.pattern === 'string' ? x.pattern.trim() : '';
          const explanation =
            typeof x.explanation === 'string' ? x.explanation.trim() : '';
          const example = typeof x.example === 'string' ? x.example.trim() : '';
          if (!pattern || !explanation || !example) return null;
          return { pattern, explanation, example };
        })
        .filter((item): item is MemorizeGrammar => item !== null)
    : [];
  return { importantWords, grammarPatterns };
};

const extractMemorizeData = async (
  markdown: string,
): Promise<MemorizeExtractionResult> => {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: azureOpenAIDeployment,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You extract key vocabulary and grammar from a meeting markdown. Return JSON with keys: importantWords (array of {word, meaning, example}) and grammarPatterns (array of {pattern, explanation, example}). Write meaning and explanation in Japanese. Keep outputs concise for memorization.',
      },
      {
        role: 'user',
        content: markdown,
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? '';
  if (!content.trim()) {
    return { importantWords: [], grammarPatterns: [] };
  }
  try {
    return toExtractionResult(JSON.parse(content) as unknown);
  } catch {
    return { importantWords: [], grammarPatterns: [] };
  }
};

export async function blobMarkdownMemorize(
  blob: unknown,
  context: InvocationContext,
): Promise<void> {
  const blobName =
    (typeof context.triggerMetadata?.name === 'string'
      ? context.triggerMetadata?.name
      : '') ||
    (typeof context.triggerMetadata?.blobTrigger === 'string'
      ? context.triggerMetadata?.blobTrigger
      : '') ||
    'unknown.md';

  context.log(`Blob trigger fired. blob=${blobName}`);

  const normalizedBlobName = blobName.toLowerCase();
  if (
    !normalizedBlobName.endsWith('.md') &&
    !normalizedBlobName.endsWith('.markdown')
  ) {
    context.log(
      `Skip blob because extension is not markdown. blob=${blobName}`,
    );
    return;
  }

  if (!cosmosConnectionString) {
    context.warn('COSMOS_DB_CONNECTION_STRING is missing.');
    return;
  }
  if (!azureOpenAIEndpoint || !azureOpenAIApiKey || !azureOpenAIDeployment) {
    context.warn(
      'Azure OpenAI settings are missing. Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT.',
    );
    return;
  }

  const markdown = toStringContent(blob).trim();
  if (!markdown) {
    context.warn(`Skip blob because content is empty. blob=${blobName}`);
    return;
  }

  try {
    const container = await getCosmosContainer();
    const extracted = await extractMemorizeData(markdown);
    const meetingId = toMeetingId(blobName);
    const now = new Date().toISOString();
    const document: MemorizeDocument = {
      id: meetingId,
      meetingId,
      sourceBlobName: blobName,
      importantWords: extracted.importantWords,
      grammarPatterns: extracted.grammarPatterns,
      createdAt: now,
      updatedAt: now,
    };
    await container.items.upsert(document);
    context.log(`memorize document upserted. meetingId=${meetingId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.error(
      `Failed to process markdown blob. blob=${blobName}. ${message}`,
    );
  }
}

app.storageBlob('blobMarkdownMemorize', {
  path: `${markdownContainerName}/{name}`,
  connection: 'BLOB_STORAGE_CONNECTION_STRING',
  handler: blobMarkdownMemorize,
});
