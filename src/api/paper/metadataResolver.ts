import { Paper } from '../../types';
import { supabase } from '../client';
import { isSupabaseConfigured } from '../socialService';
import {
  MetadataProvider,
  NormalizedPaperMetadata,
  ParsedReferenceInput,
  ResolvePaperResult,
} from './types';
import { parseReferenceInput } from './inputParser';
import { OpenAlexProvider } from './providers/openAlexProvider';
import { CrossrefProvider } from './providers/crossrefProvider';
import { ArXivProvider } from './providers/arxivProvider';
import { PubMedProvider } from './providers/pubmedProvider';
import { resolvePaperFigures } from './figureResolver';

export class CompositePaperResolver {
  private providers: MetadataProvider[];

  constructor(providers?: MetadataProvider[]) {
    this.providers = providers || [
      new ArXivProvider(),
      new PubMedProvider(),
      new OpenAlexProvider(),
      new CrossrefProvider(),
    ];
  }

  /**
   * Register a new metadata provider (pluggable architecture)
   */
  public registerProvider(provider: MetadataProvider, priorityIndex = 0): void {
    this.providers.splice(priorityIndex, 0, provider);
  }

  /**
   * Check if a paper already exists in Supabase
   */
  public async findExistingPaper(
    doi?: string,
    canonicalUrl?: string
  ): Promise<Paper | null> {
    const cleanDoi = doi ? doi.toLowerCase().trim() : null;
    const cleanUrl = canonicalUrl ? canonicalUrl.trim() : null;

    if (!cleanDoi && !cleanUrl) return null;

    // Check Supabase DB
    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('papers').select(`
          id,
          doi,
          canonical_url,
          title,
          abstract,
          journal,
          publisher,
          publication_date,
          publication_year,
          open_access_status,
          open_access_pdf_url,
          citation_count,
          discussion_count,
          likes_count,
          saves_count,
          paper_authors (
            author_name,
            author_order,
            affiliation,
            external_author_id
          ),
          paper_topics (
            topic:topics!topic_id ( name )
          )
        `);

        if (cleanDoi) {
          query = query.eq('doi', cleanDoi);
        } else if (cleanUrl) {
          query = query.eq('canonical_url', cleanUrl);
        }

        const { data, error } = await query.maybeSingle();
        if (!error && data) {
          const authors = Array.isArray(data.paper_authors)
            ? data.paper_authors.map((a: any) => ({
                name: a.author_name,
                affiliation: a.affiliation || undefined,
                orcid: a.external_author_id || undefined,
              }))
            : [];

          const topics = Array.isArray(data.paper_topics)
            ? data.paper_topics.map((pt: any) => pt.topic?.name).filter(Boolean)
            : [];

          return {
            id: data.id,
            doi: data.doi || undefined,
            title: data.title,
            abstract: data.abstract || '',
            authors: authors.length > 0 ? authors : [{ name: 'Research Team' }],
            journal: data.journal,
            publisher: data.publisher || undefined,
            publicationYear: data.publication_year || new Date().getFullYear(),
            publicationDate: data.publication_date || undefined,
            canonicalUrl: data.canonical_url,
            openAccessUrl: data.open_access_pdf_url || undefined,
            isOpenAccess: data.open_access_status !== 'closed',
            topics: topics.length > 0 ? topics : ['Science'],
            citationCount: data.citation_count || 0,
            discussionCount: data.discussion_count || 0,
            likesCount: data.likes_count || 0,
            savesCount: data.saves_count || 0,
            isSaved: false,
            isLiked: false,
          };
        }
      } catch (err) {
        console.warn('[CompositePaperResolver] Database lookup error:', err);
      }
    }

    return null;
  }

  /**
   * Resolves paper metadata with waterfall provider execution and duplicate detection
   */
  public async resolve(rawInput: string): Promise<ResolvePaperResult> {
    if (!rawInput || !rawInput.trim()) {
      return {
        paper: null,
        isDuplicate: false,
        error: 'Please enter a valid DOI, publisher link, or preprint URL.',
        errorReason: 'invalid_input',
      };
    }

    // 1. Parse and classify input
    const parsedInput: ParsedReferenceInput = parseReferenceInput(rawInput);

    // 2. Check for existing duplicate paper in database / local store
    const existingPaper = await this.findExistingPaper(
      parsedInput.doi,
      parsedInput.canonicalUrl
    );

    if (existingPaper) {
      return {
        paper: existingPaper,
        isDuplicate: true,
        duplicatePaperId: existingPaper.id,
        providerName: 'BooffIn Repository (Cached)',
        error: null,
      };
    }

    // 3. Execute waterfall provider pipeline
    let normalized: NormalizedPaperMetadata | null = null;
    let successfulProvider = '';

    for (const provider of this.providers) {
      if (provider.supports(parsedInput)) {
        try {
          const result = await provider.resolve(parsedInput);
          if (result && result.title && result.title.trim().length > 3) {
            normalized = result;
            successfulProvider = provider.name;
            break;
          }
        } catch (providerError) {
          console.warn(`[CompositePaperResolver] Provider ${provider.name} error:`, providerError);
        }
      }
    }

    // 4. Return resolved paper entity or structured failure
    if (!normalized) {
      return {
        paper: null,
        isDuplicate: false,
        error: `Could not retrieve bibliographic metadata for "${rawInput}". You can confirm and enter details manually.`,
        errorReason: 'not_found',
      };
    }

    // 3.5. If normalized metadata has DOI but lacks a direct OA PDF, auto-resolve via Europe PMC / OpenAlex
    if (normalized.doi && !normalized.openAccessUrl) {
      try {
        const oaPdf = await fetchDirectOpenAccessPdf(normalized.doi);
        if (oaPdf) {
          normalized.openAccessUrl = oaPdf;
          normalized.isOpenAccess = true;
          normalized.openAccessStatus = 'gold';
        }
      } catch {}
    }

    let figures: Paper['figures'] = undefined;
    try {
      const resolvedFigs = await resolvePaperFigures({
        doi: normalized.doi || parsedInput.doi,
        pmid: parsedInput.pmid,
        pmcid: parsedInput.pmcid,
        arxivId: parsedInput.arxivId,
        canonicalUrl: normalized.canonicalUrl || parsedInput.canonicalUrl,
        title: normalized.title,
        journal: normalized.journal,
      });
      if (resolvedFigs && resolvedFigs.length > 0) {
        figures = resolvedFigs;
      }
    } catch (figErr) {
      console.warn('[CompositePaperResolver] Figure extraction non-blocking error:', figErr);
    }

    const newPaper: Paper = {
      id: `paper_${Date.now()}`,
      doi: normalized.doi,
      title: normalized.title,
      abstract: normalized.abstract || 'Abstract available on canonical publisher website.',
      authors: normalized.authors,
      journal: normalized.journal,
      publisher: normalized.publisher,
      publicationYear: normalized.publicationYear,
      publicationDate: normalized.publicationDate,
      canonicalUrl: normalized.canonicalUrl,
      openAccessUrl: normalized.openAccessUrl,
      isOpenAccess: normalized.isOpenAccess,
      topics: normalized.topics,
      figures,
      citationCount: normalized.citationCount,
      discussionCount: 1,
      likesCount: 0,
      savesCount: 0,
      isSaved: false,
      isLiked: false,
    };

    return {
      paper: newPaper,
      isDuplicate: false,
      providerName: successfulProvider,
      error: null,
    };
  }

  /**
   * Constructs a validated Paper entity from manual user confirmation (fallback)
   */
  public createManualReference(params: {
    title: string;
    authorsString: string;
    journal: string;
    canonicalUrl: string;
    doi?: string;
    abstract?: string;
    publicationYear?: number;
    topics?: string[];
  }): Paper {
    const authors = params.authorsString
      .split(/[,;\n]/)
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ name }));

    return {
      id: `paper_manual_${Date.now()}`,
      doi: params.doi ? params.doi.toLowerCase().trim() : undefined,
      title: params.title.trim(),
      abstract: params.abstract?.trim() || 'Referenced via external academic link.',
      authors: authors.length > 0 ? authors : [{ name: 'Referenced Researcher' }],
      journal: params.journal.trim() || 'Academic Reference',
      publicationYear: params.publicationYear || new Date().getFullYear(),
      canonicalUrl: params.canonicalUrl.trim(),
      isOpenAccess: false,
      topics: params.topics && params.topics.length > 0 ? params.topics : ['Academic Reference'],
      citationCount: 0,
      discussionCount: 1,
      likesCount: 0,
      savesCount: 0,
      isSaved: false,
      isLiked: false,
    };
  }
}

// Global default instance
export const defaultPaperResolver = new CompositePaperResolver();

/**
 * Fast direct Open Access PDF resolver querying Europe PMC & OpenAlex
 */
export async function fetchDirectOpenAccessPdf(doi: string): Promise<string | null> {
  if (!doi) return null;
  const cleanDoi = doi.replace(/^https?:\/\/doi\.org\//i, '').trim();

  // 1. Try Europe PMC (covers vast majority of life sciences, biochemistry, computational biology, medicine)
  try {
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=doi:${encodeURIComponent(cleanDoi)}&format=json&resultType=core`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'BooffIn-Academic-Discovery/1.0 (mailto:academic@booffin.science)',
        Accept: 'application/json',
      },
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      const item = data?.resultList?.result?.[0];
      if (item) {
        const directPdf = item.fullTextUrlList?.fullTextUrl?.find((u: any) => u.documentStyle === 'pdf')?.url;
        if (directPdf) return directPdf;
        if (item.pmcid) {
          return `https://europepmc.org/backend/ptpmcrender.fcgi?accid=${item.pmcid}&blobtype=pdf`;
        }
      }
    }
  } catch {}

  // 2. Try OpenAlex
  try {
    const url = `https://api.openalex.org/works/https://doi.org/${encodeURIComponent(cleanDoi)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'BooffIn-Academic-Discovery/1.0 (mailto:academic@booffin.science)',
        Accept: 'application/json',
      },
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      const pdf =
        data.best_oa_location?.pdf_url ||
        data.primary_location?.pdf_url ||
        data.locations?.find((loc: any) => loc.pdf_url)?.pdf_url;
      if (pdf) return pdf;
    }
  } catch {}

  return null;
}
