import { MetadataProvider, ParsedReferenceInput, NormalizedPaperMetadata } from '../types';
import { Author } from '../../../types';

export class ArXivProvider implements MetadataProvider {
  name = 'arXiv';

  supports(input: ParsedReferenceInput): boolean {
    return Boolean(input.arxivId || input.type === 'arxiv_url' || input.type === 'arxiv_id');
  }

  async resolve(input: ParsedReferenceInput): Promise<NormalizedPaperMetadata | null> {
    const arxivId = input.arxivId;
    if (!arxivId) return null;

    try {
      const url = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(arxivId)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500);

      const res = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) return null;
      const xml = await res.text();

      // Simple robust regex parsing of arXiv Atom XML response
      const titleMatch = xml.match(/<title>([\s\S]*?)<\/title>/gi);
      if (!titleMatch || titleMatch.length < 2) return null; // First title is feed title, second is entry title

      const title = titleMatch[1]
        .replace(/<title>/i, '')
        .replace(/<\/title>/i, '')
        .replace(/\s+/g, ' ')
        .trim();

      const summaryMatch = xml.match(/<summary>([\s\S]*?)<\/summary>/i);
      const abstract = summaryMatch
        ? summaryMatch[1].replace(/\s+/g, ' ').trim()
        : undefined;

      const publishedMatch = xml.match(/<published>([\s\S]*?)<\/published>/i);
      const publishedDate = publishedMatch ? publishedMatch[1].trim() : undefined;
      const publicationYear = publishedDate ? new Date(publishedDate).getFullYear() : new Date().getFullYear();

      // Extract authors
      const authorMatches = xml.matchAll(/<author>\s*<name>(.*?)<\/name>/gi);
      const authors: Author[] = [];
      for (const match of authorMatches) {
        if (match[1]) {
          authors.push({ name: match[1].trim() });
        }
      }

      // Extract category / topics
      const categoryMatches = xml.matchAll(/<category\s+term="([^"]+)"/gi);
      const topics: string[] = [];
      for (const match of categoryMatches) {
        if (match[1] && !topics.includes(match[1])) {
          topics.push(match[1]);
        }
      }

      // Check for DOI if published
      const doiMatch = xml.match(/<arxiv:doi>([\s\S]*?)<\/arxiv:doi>/i);
      const doi = doiMatch ? doiMatch[1].trim().toLowerCase() : undefined;

      const canonicalUrl = `https://arxiv.org/abs/${arxivId}`;
      const openAccessPdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;

      return {
        doi,
        title,
        abstract,
        authors: authors.length > 0 ? authors : [{ name: 'arXiv Submitter' }],
        journal: 'arXiv Preprint',
        publisher: 'Cornell University',
        publicationYear,
        publicationDate: publishedDate,
        canonicalUrl,
        openAccessUrl: openAccessPdfUrl,
        isOpenAccess: true,
        openAccessStatus: 'preprint',
        citationCount: 0,
        topics: topics.length > 0 ? topics : ['Preprint', 'arXiv'],
        providerName: this.name,
      };
    } catch {
      return null;
    }
  }
}
