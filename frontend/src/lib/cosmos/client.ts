import { CosmosClient, type Container } from '@azure/cosmos';

const COSMOS_CONNECTION_STRING = process.env.COSMOS_CONNECTION_STRING?.trim();
const COSMOS_ENDPOINT = process.env.COSMOS_ENDPOINT?.trim();
const COSMOS_KEY = process.env.COSMOS_KEY?.trim();
const COSMOS_DATABASE = process.env.COSMOS_DATABASE ?? 'db';

let cachedClient: CosmosClient | null = null;
const containerCache = new Map<string, Promise<Container>>();

const getClient = () => {
  if (cachedClient) return cachedClient;
  if (COSMOS_CONNECTION_STRING) {
    cachedClient = new CosmosClient(COSMOS_CONNECTION_STRING);
    return cachedClient;
  }
  if (COSMOS_ENDPOINT && COSMOS_KEY) {
    cachedClient = new CosmosClient({
      endpoint: COSMOS_ENDPOINT,
      key: COSMOS_KEY,
    });
    return cachedClient;
  }
  throw new Error(
    'CosmosDB config missing. Set COSMOS_CONNECTION_STRING or COSMOS_ENDPOINT + COSMOS_KEY.',
  );
};

export const getContainer = async (
  containerId: string,
  partitionKeyPath = '/id',
): Promise<Container> => {
  const cacheKey = `${COSMOS_DATABASE}:${containerId}:${partitionKeyPath}`;
  const cached = containerCache.get(cacheKey);
  if (cached) return cached;
  const init = (async () => {
    const client = getClient();
    const { database } = await client.databases.createIfNotExists({
      id: COSMOS_DATABASE,
    });
    const { container } = await database.containers.createIfNotExists({
      id: containerId,
      partitionKey: { paths: [partitionKeyPath] },
    });
    return container;
  })();
  containerCache.set(cacheKey, init);
  return init;
};
