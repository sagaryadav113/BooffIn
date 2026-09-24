import { MetadataProvider, ParsedReferenceInput, NormalizedPaperMetadata } from '../types';
import { Author } from '../../../types';
import { detectPublisherFromUrl } from '../inputParser';

export class CrossrefProvider implements MetadataProvider {
  name = 'Crossref';

  supports(input: ParsedReferenceInput): boolean {
    return Boolean(input.doi);
  }

  async resolve(input: ParsedReferenceInput): Promise<NormalizedPaperMetadata | null> {
    if (!input.doi) return null;

    try {
      const url = `https://api.crossref.org/works/${encodeURIComponent(input.doi)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500);

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'BooffIn-Academic-Discovery/1.0 (mailto:academic@booffin.science)',
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) return null;
      const json = await res.json();
      const message = json?.message;

      if (!message || !message.title) return null;

      const title = Array.isArray(message.title) ? message.title[0] : message.title;
      if (!title) return null;

      const authors: Author[] = (message.author || []).map((a: any) => ({
        name: `${a.given ? a.given + ' ' : ''}${a.family || ''}`.trim() || a.name || 'Author',
        affiliation: a.affiliation?.[0]?.name,
        orcid: a.ORCID ? a.ORCID.replace('http://orcid.org/', '').replace('https://orcid.org/', '') : undefined,
      }));

      // Clean abstract from JATS XML markup
      let abstract = '';
      if (typeof message.abstract === 'string') {
        abstract = message.abstract
          .replace(/<jats:title>[^<]*<\/jats:title>/gi, '')
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      }

      const detected = detectPublisherFromUrl(input.canonicalUrl || message.URL || '', input.doi);
      const containerTitle = Array.isArray(message['container-title'])
        ? message['container-title'][0]
        : message['container-title'];

      const journal = containerTitle || detected.journal || message.publisher || 'Academic Journal';
      const publisher = message.publisher || detected.publisher;

      const publicationYear =
        message.issued?.['date-parts']?.[0]?.[0] ||
        message.published?.['date-parts']?.[0]?.[0] ||
        new Date().getFullYear();

      const publicationDate = message.issued?.['date-parts']?.[0]
        ? message.issued['date-parts'][0].join('-')
        : undefined;

      const topics = Array.isArray(message.subject)
        ? message.subject.slice(0, 5)
        : ['Scientific Research'];

      return {
        doi: input.doi.toLowerCase(),
        title,
        abstract: abstract || undefined,
        authors: authors.length > 0 ? authors : [{ name: 'Anonymous Researcher' }],
        journal,
        publisher,
        publicationYear,
        publicationDate,
        canonicalUrl: message.URL || input.canonicalUrl || `https://doi.org/${input.doi}`,
        isOpenAccess: false, // Crossref doesn't reliably index OA status without license parsing
        citationCount: message['is-referenced-by-count'] || 0,
        topics: topics.length > 0 ? topics : ['General Science'],
        providerName: this.name,
      };
    } catch {
      return null;
    }
  }
}
