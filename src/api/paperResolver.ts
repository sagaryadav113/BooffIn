import { Paper } from '../types';
import { defaultPaperResolver, CompositePaperResolver } from './paper/metadataResolver';
import { parseReferenceInput, cleanDoi, detectPublisherFromUrl } from './paper/inputParser';
import { ResolvePaperResult, NormalizedPaperMetadata, MetadataProvider } from './paper/types';

export {
  defaultPaperResolver,
  CompositePaperResolver,
  parseReferenceInput,
  cleanDoi,
  detectPublisherFromUrl,
};
export type { ResolvePaperResult, NormalizedPaperMetadata, MetadataProvider };

/**
 * Standard helper to resolve paper from query, DOI, or URL
 */
export async function resolvePaper(queryOrDoi: string): Promise<Paper | null> {
  const result = await defaultPaperResolver.resolve(queryOrDoi);
  return result.paper;
}

/**
 * Full resolver returning duplicate detection status and provider details
 */
export async function resolvePaperWithDetails(queryOrDoi: string): Promise<ResolvePaperResult> {
  return await defaultPaperResolver.resolve(queryOrDoi);
}

/**
 * Creates a verified manual paper reference entity
 */
export function createManualPaperReference(params: {
  title: string;
  authorsString: string;
  journal: string;
  canonicalUrl: string;
  doi?: string;
  abstract?: string;
  publicationYear?: number;
  topics?: string[];
}): Paper {
  return defaultPaperResolver.createManualReference(params);
}
