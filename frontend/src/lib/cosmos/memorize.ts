import { getContainer } from './client';
import type {
  MemorizeDocument,
  MemorizeGrammar,
  MemorizeWord,
} from '@/types/types';

const MEMORIZE_CONTAINER = process.env.COSMOS_MEMORIZE_CONTAINER ?? 'memorize';

type RawMemorizeDocument = Partial<MemorizeDocument> & {
  importantWords?: unknown;
  grammarPatterns?: unknown;
};

const toWords = (value: unknown): MemorizeWord[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const x = item as Record<string, unknown>;
      const word = typeof x.word === 'string' ? x.word.trim() : '';
      const meaning = typeof x.meaning === 'string' ? x.meaning.trim() : '';
      const example = typeof x.example === 'string' ? x.example.trim() : '';
      if (!word || !meaning || !example) return null;
      return { word, meaning, example };
    })
    .filter((item): item is MemorizeWord => item !== null);
};

const toGrammar = (value: unknown): MemorizeGrammar[] => {
  if (!Array.isArray(value)) return [];
  return value
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
    .filter((item): item is MemorizeGrammar => item !== null);
};

const normalizeMemorizeDocument = (
  doc: RawMemorizeDocument,
): MemorizeDocument | null => {
  if (
    typeof doc.id !== 'string' ||
    typeof doc.meetingId !== 'string' ||
    typeof doc.sourceBlobName !== 'string'
  ) {
    return null;
  }
  return {
    id: doc.id,
    meetingId: doc.meetingId,
    sourceBlobName: doc.sourceBlobName,
    importantWords: toWords(doc.importantWords),
    grammarPatterns: toGrammar(doc.grammarPatterns),
    createdAt:
      typeof doc.createdAt === 'string' ? doc.createdAt : new Date().toISOString(),
    updatedAt:
      typeof doc.updatedAt === 'string' ? doc.updatedAt : new Date().toISOString(),
  };
};

export const listMemorizeDocuments = async (
  limit = 30,
): Promise<MemorizeDocument[]> => {
  const container = await getContainer(MEMORIZE_CONTAINER, '/meetingId');
  const { resources } = await container.items
    .query<RawMemorizeDocument>({
      query: `
        SELECT TOP @limit *
        FROM c
        ORDER BY c.updatedAt DESC
      `,
      parameters: [{ name: '@limit', value: limit }],
    })
    .fetchAll();

  return resources
    .map(normalizeMemorizeDocument)
    .filter((item): item is MemorizeDocument => item !== null);
};
