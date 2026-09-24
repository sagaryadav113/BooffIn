import { MetadataProvider, ParsedReferenceInput, NormalizedPaperMetadata } from '../types';
import { Author } from '../../../types';
import { detectPublisherFromUrl } from '../inputParser';

export class OpenAlexProvider implements MetadataProvider {
  name = 'OpenAlex';

  supports(input: ParsedReferenceInput): boolean {
    return Boolean(input.doi || input.pmid);
  }

  async resolve(input: ParsedReferenceInput): Promise<NormalizedPaperMetadata | null> {
    try {
      let identifier = '';
      if (input.doi) {
        identifier = `https://doi.org/${encodeURIComponent(input.doi)}`;
      } else if (input.pmid) {
        identifier = `pmid:${input.pmid}`;
      } else {
        return null;
      }

      const url = `https://api.openalex.org/works/${identifier}`;
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
      const data = await res.json();

      if (!data || (!data.title && !data.display_name)) return null;

      const title = data.display_name || data.title;
      const authors: Author[] = (data.authorships || []).map((a: any) => ({
        name: a.author?.display_name || 'Unknown Researcher',
        affiliation: a.institutions?.[0]?.display_name,
        orcid: a.author?.orcid ? a.author.orcid.replace('https://orcid.org/', '') : undefined,
      }));

      // Extract cleaned abstract
      let abstract = '';
      if (typeof data.abstract === 'string') {
        abstract = data.abstract.replace(/<[^>]*>/g, '').trim();
      } else if (data.abstract_inverted_index) {
        // Reconstruct inverted index abstract
        const words: [number, string][] = [];
        for (const [word, positions] of Object.entries(data.abstract_inverted_index)) {
          for (const pos of positions as number[]) {
            words.push([pos, word]);
          }
        }
        words.sort((a, b) => a[0] - b[0]);
        abstract = words.map((w) => w[1]).join(' ').trim();
      }

      const detected = detectPublisherFromUrl(
        data.doi || input.canonicalUrl || '',
        data.doi ? data.doi.replace('https://doi.org/', '') : input.doi
      );

      const journal =
        data.primary_location?.source?.display_name ||
        detected.journal ||
        'Academic Publication';

      const publisher =
        data.primary_location?.source?.host_organization_name ||
        detected.publisher ||
        'Publisher';

      const topics = (data.concepts || [])
        .slice(0, 5)
        .map((c: any) => c.display_name)
        .filter(Boolean);

      const publicationYear = data.publication_year || new Date().getFullYear();
      const canonicalUrl = data.doi || input.canonicalUrl || (input.doi ? `https://doi.org/${input.doi}` : '');

      return {
        doi: input.doi || (data.doi ? data.doi.replace('https://doi.org/', '').toLowerCase() : undefined),
        title,
        abstract: abstract || undefined,
        authors: authors.length > 0 ? authors : [{ name: 'Anonymous Researcher' }],
        journal,
        publisher,
        publicationYear,
        publicationDate: data.publication_date,
        canonicalUrl,
        openAccessUrl: data.open_access?.oa_url || undefined,
        isOpenAccess: Boolean(data.open_access?.is_oa),
        openAccessStatus: data.open_access?.oa_status || (data.open_access?.is_oa ? 'gold' : 'closed'),
        citationCount: data.cited_by_count || 0,
        topics: topics.length > 0 ? topics : ['General Science'],
        providerName: this.name,
      };
    } catch {
      return null;
    }
  }
}
