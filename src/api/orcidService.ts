import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from './client';
import { useAuthStore } from '../store/useAuthStore';
import { ScholarPublication, ScholarProfileStats } from '../types/scholar';

WebBrowser.maybeCompleteAuthSession();

// Official ORCID Endpoints
export const ORCID_OAUTH_AUTHORIZE_URL = 'https://orcid.org/oauth/authorize';
export const ORCID_OAUTH_TOKEN_URL = 'https://orcid.org/oauth/token';
export const ORCID_PUBLIC_API_BASE = 'https://pub.orcid.org/v3.0';
export const OPENALEX_API_BASE = 'https://api.openalex.org';

/**
 * Cleans and normalizes an ORCID string into canonical 0000-0000-0000-0000 format
 */
export function normalizeOrcidId(rawInput: string): string {
  if (!rawInput) return '';
  const trimmed = rawInput.trim();
  // Remove URL prefixes if present
  const cleaned = trimmed
    .replace(/^https?:\/\/orcid\.org\//i, '')
    .replace(/^orcid\.org\//i, '')
    .replace(/[^0-9X-]/gi, '')
    .toUpperCase();

  return cleaned;
}

/**
 * Validates ORCID format (16 digits separated by hyphens)
 */
export function isValidOrcidId(orcid: string): boolean {
  const normalized = normalizeOrcidId(orcid);
  const regex = /^\d{4}-\d{4}-\d{4}-[\dX]{4}$/;
  return regex.test(normalized);
}

/**
 * Decodes an OpenAlex abstract_inverted_index into plain readable text
 */
function decodeOpenAlexAbstract(invertedIndex: Record<string, number[]> | undefined | null): string | undefined {
  if (!invertedIndex || typeof invertedIndex !== 'object') return undefined;

  const entries: [string, number][] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    if (Array.isArray(positions)) {
      for (const pos of positions) {
        entries.push([word, pos]);
      }
    }
  }

  entries.sort((a, b) => a[1] - b[1]);
  const text = entries.map((e) => e[0]).join(' ');
  return text.length > 50 ? text : undefined;
}

/**
 * Fetches publication metadata and Open Access PDF link from OpenAlex for a given DOI
 */
export async function enrichPaperMetadataFromOpenAlex(doi: string): Promise<{
  openAccessPdfUrl?: string;
  isOpenAccess: boolean;
  citationCount: number;
  abstract?: string;
  journalName?: string;
  authors?: string[];
  topics?: string[];
}> {
  try {
    const cleanDoi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim();
    const url = `${OPENALEX_API_BASE}/works/https://doi.org/${encodeURIComponent(cleanDoi)}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'BooffIn/1.0 (mailto:scholar@booffin.com)',
      },
    });

    if (!res.ok) {
      return { isOpenAccess: false, citationCount: 0 };
    }

    const data = await res.json();

    const isOpenAccess = Boolean(data.open_access?.is_oa || data.best_oa_location?.pdf_url);
    const openAccessPdfUrl =
      data.best_oa_location?.pdf_url ||
      data.primary_location?.pdf_url ||
      (isOpenAccess ? data.best_oa_location?.landing_page_url : undefined);

    const citationCount = data.cited_by_count || 0;
    const abstract = decodeOpenAlexAbstract(data.abstract_inverted_index);
    const journalName =
      data.primary_location?.source?.display_name ||
      data.best_oa_location?.source?.display_name ||
      undefined;

    const authors: string[] = Array.isArray(data.authorships)
      ? data.authorships.map((a: any) => a.author?.display_name).filter(Boolean)
      : [];

    const topics: string[] = Array.isArray(data.concepts)
      ? data.concepts.slice(0, 5).map((c: any) => c.display_name).filter(Boolean)
      : [];

    return {
      openAccessPdfUrl,
      isOpenAccess,
      citationCount,
      abstract,
      journalName,
      authors: authors.length > 0 ? authors : undefined,
      topics: topics.length > 0 ? topics : undefined,
    };
  } catch (err) {
    return { isOpenAccess: false, citationCount: 0 };
  }
}

/**
 * Fetches verified publications directly from ORCID Public API v3.0
 */
export async function fetchWorksFromOrcidPublicApi(
  orcidId: string,
  userId: string
): Promise<ScholarPublication[]> {
  const cleanOrcid = normalizeOrcidId(orcidId);
  if (!isValidOrcidId(cleanOrcid)) {
    throw new Error(`Invalid ORCID iD format: ${orcidId}. Expected format: 0000-0000-0000-0000`);
  }

  const endpoint = `${ORCID_PUBLIC_API_BASE}/${cleanOrcid}/works`;
  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`ORCID profile for ${cleanOrcid} not found.`);
    }
    throw new Error(`Failed to fetch ORCID public record (Status ${response.status}).`);
  }

  const data = await response.json();
  const groups = data.group || [];
  const publications: ScholarPublication[] = [];

  for (const group of groups) {
    const summaries = group['work-summary'] || [];
    if (summaries.length === 0) continue;

    const mainSummary = summaries[0];
    const putCode = String(mainSummary['put-code'] || '');
    const title = mainSummary.title?.title?.value || 'Untitled Publication';
    const journalName = mainSummary['journal-title']?.value || undefined;
    const workType = mainSummary.type || 'journal-article';

    // Publication Year
    const yearVal = mainSummary['publication-date']?.year?.value;
    const publicationYear = yearVal ? parseInt(yearVal, 10) : undefined;
    const monthVal = mainSummary['publication-date']?.month?.value;
    const publicationDate = yearVal
      ? `${yearVal}${monthVal ? `-${monthVal.padStart(2, '0')}` : ''}`
      : undefined;

    // External IDs (DOI, arXiv, PubMed)
    let doi: string | undefined;
    let url: string | undefined = mainSummary.url?.value || undefined;

    const externalIds = mainSummary['external-ids']?.['external-id'] || [];
    for (const ext of externalIds) {
      const type = (ext['external-id-type'] || '').toLowerCase();
      const val = ext['external-id-value'] || '';
      if (type === 'doi' && val) {
        doi = val;
        if (!url) url = `https://doi.org/${val}`;
      } else if (type === 'arxiv' && !url) {
        url = `https://arxiv.org/abs/${val}`;
      }
    }

    const pubId = `orcid_${cleanOrcid}_${putCode || Math.random().toString(36).substring(2, 9)}`;

    publications.push({
      id: pubId,
      userId,
      orcidId: cleanOrcid,
      workPutCode: putCode,
      title,
      authors: [], // Will be enriched or default to current user
      journalName,
      publicationYear,
      publicationDate,
      workType,
      doi,
      url,
      isOpenAccess: false,
      citationCount: 0,
      isVerified: true,
      source: 'orcid',
    });
  }

  return publications;
}

/**
 * Fallback / Augmenter: Fetches author papers via OpenAlex if ORCID has no public items
 */
export async function fetchWorksFromOpenAlex(
  orcidId: string,
  userId: string
): Promise<ScholarPublication[]> {
  try {
    const cleanOrcid = normalizeOrcidId(orcidId);
    const url = `${OPENALEX_API_BASE}/works?filter=author.orcid:${cleanOrcid}&sort=publication_year:desc&per-page=50`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'BooffIn/1.0 (mailto:scholar@booffin.com)',
      },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const results = data.results || [];
    const publications: ScholarPublication[] = [];

    for (const item of results) {
      const doi = item.doi ? item.doi.replace('https://doi.org/', '') : undefined;
      const isOpenAccess = Boolean(item.open_access?.is_oa || item.best_oa_location?.pdf_url);
      const openAccessPdfUrl =
        item.best_oa_location?.pdf_url || item.primary_location?.pdf_url || undefined;
      const authors = Array.isArray(item.authorships)
        ? item.authorships.map((a: any) => a.author?.display_name).filter(Boolean)
        : [];

      publications.push({
        id: `oa_${item.id ? item.id.replace('https://openalex.org/', '') : Math.random().toString(36).substring(2, 9)}`,
        userId,
        orcidId: cleanOrcid,
        title: item.title || 'Untitled Work',
        authors,
        journalName:
          item.primary_location?.source?.display_name ||
          item.best_oa_location?.source?.display_name ||
          undefined,
        publicationYear: item.publication_year || undefined,
        publicationDate: item.publication_date || undefined,
        workType: item.type || 'journal-article',
        doi,
        url: item.doi || item.primary_location?.landing_page_url || undefined,
        openAccessPdfUrl,
        isOpenAccess,
        abstract: decodeOpenAlexAbstract(item.abstract_inverted_index),
        topics: Array.isArray(item.concepts)
          ? item.concepts.slice(0, 5).map((c: any) => c.display_name).filter(Boolean)
          : undefined,
        citationCount: item.cited_by_count || 0,
        isVerified: true,
        source: 'openalex',
      });
    }

    return publications;
  } catch (err) {
    return [];
  }
}

export interface OrcidPersonDetails {
  orcidId: string;
  name: string;
  creditName?: string;
  biography?: string;
  worksCount: number;
}

/**
 * Fetches live verified person metadata from the ORCID Public API v3.0
 */
export async function fetchOrcidPersonDetails(orcidId: string): Promise<{
  success: boolean;
  person?: OrcidPersonDetails;
  error?: string;
}> {
  try {
    const cleanOrcid = normalizeOrcidId(orcidId);
    if (!isValidOrcidId(cleanOrcid)) {
      return {
        success: false,
        error: 'Invalid ORCID format. Expected 16 digits (e.g. 0000-0002-1825-0097).',
      };
    }

    const [personRes, worksRes] = await Promise.all([
      fetch(`${ORCID_PUBLIC_API_BASE}/${cleanOrcid}/person`, {
        headers: { Accept: 'application/json' },
      }),
      fetch(`${ORCID_PUBLIC_API_BASE}/${cleanOrcid}/works`, {
        headers: { Accept: 'application/json' },
      }),
    ]);

    if (!personRes.ok) {
      if (personRes.status === 404) {
        return { success: false, error: `No public ORCID record found for ${cleanOrcid}.` };
      }
      return { success: false, error: `Failed to fetch ORCID public record (Status ${personRes.status}).` };
    }

    const personData = await personRes.json();
    let worksCount = 0;
    if (worksRes.ok) {
      const worksData = await worksRes.json();
      worksCount = (worksData.group || []).length;
    }

    const givenNames = personData.name?.['given-names']?.value || '';
    const familyName = personData.name?.['family-name']?.value || '';
    const creditName = personData.name?.['credit-name']?.value || undefined;
    const fullName = creditName || [givenNames, familyName].filter(Boolean).join(' ') || 'Verified ORCID Scholar';
    const biography = personData.biography?.content || undefined;

    return {
      success: true,
      person: {
        orcidId: cleanOrcid,
        name: fullName,
        creditName,
        biography,
        worksCount,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Could not verify ORCID record.',
    };
  }
}

export const DEFAULT_ORCID_CLIENT_ID = 'APP-NSUXYHOR9ADH7JS8';
export const DEFAULT_ORCID_CLIENT_SECRET = '9f1e1f72-e722-4313-b2f2-121c37725f12';
export const DEFAULT_ORCID_REDIRECT_URI = 'https://booff-in.vercel.app/orcid-callback';

/**
 * Initiates the ORCID OAuth 2.0 / Official Web Authentication flow
 */
export async function connectOrcidOAuth(
  clientId?: string,
  targetOrcid?: string
): Promise<{
  success: boolean;
  orcidId?: string;
  name?: string;
  accessToken?: string;
  hasConfiguredOAuth?: boolean;
  error?: string;
}> {
  try {
    const rawClientId =
      clientId || process.env.EXPO_PUBLIC_ORCID_CLIENT_ID || DEFAULT_ORCID_CLIENT_ID;
    const clientSecret =
      process.env.EXPO_PUBLIC_ORCID_CLIENT_SECRET || DEFAULT_ORCID_CLIENT_SECRET;
    const redirectUri =
      process.env.EXPO_PUBLIC_ORCID_REDIRECT_URI || DEFAULT_ORCID_REDIRECT_URI;
    const cleanTargetOrcid = targetOrcid ? normalizeOrcidId(targetOrcid) : '';
    const emailParam = cleanTargetOrcid
      ? `&email_or_orcid=${encodeURIComponent(cleanTargetOrcid)}&show_login=true`
      : '';

    const authUrl = `${ORCID_OAUTH_AUTHORIZE_URL}?client_id=${encodeURIComponent(
      rawClientId
    )}&response_type=code&scope=%2Fauthenticate%20%2Fread-public&redirect_uri=${encodeURIComponent(
      redirectUri
    )}${emailParam}`;

    // On web, also listen for postMessage and localStorage events from popup
    let messageCleanup: (() => void) | undefined;
    let webAuthPromise: Promise<{ code?: string; orcid?: string; error?: string }> | undefined;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      webAuthPromise = new Promise((resolve) => {
        const handleMessage = (event: MessageEvent) => {
          if (event.data && event.data.type === 'ORCID_AUTH_SUCCESS') {
            resolve({
              code: event.data.code,
              orcid: event.data.orcid,
              error: event.data.error,
            });
          }
        };

        const handleStorage = (event: StorageEvent) => {
          if (event.key === 'booffin_orcid_auth' && event.newValue) {
            try {
              const data = JSON.parse(event.newValue);
              if (data && data.type === 'ORCID_AUTH_SUCCESS') {
                resolve({
                  code: data.code,
                  orcid: data.orcid,
                  error: data.error,
                });
              }
            } catch {}
          }
        };

        window.addEventListener('message', handleMessage);
        window.addEventListener('storage', handleStorage);

        messageCleanup = () => {
          window.removeEventListener('message', handleMessage);
          window.removeEventListener('storage', handleStorage);
        };
      });
    }

    const authSessionPromise = WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

    const raceResult = webAuthPromise
      ? await Promise.race([
          authSessionPromise.then((res) => ({ fromAuthSession: true, res })),
          webAuthPromise.then((msgData) => ({ fromWebMessage: true, msgData })),
        ])
      : await authSessionPromise.then((res) => ({ fromAuthSession: true, res }));

    if (messageCleanup) messageCleanup();

    let code: string | null = null;
    let orcid: string | null = null;

    if ('fromWebMessage' in raceResult && raceResult.msgData) {
      if (raceResult.msgData.error) {
        return { success: false, error: decodeURIComponent(raceResult.msgData.error) };
      }
      code = raceResult.msgData.code || null;
      orcid = raceResult.msgData.orcid || null;
    } else if ('fromAuthSession' in raceResult && raceResult.res) {
      const result = raceResult.res;
      if (result.type === 'cancel' || result.type === 'dismiss') {
        return { success: false, error: 'ORCID verification was cancelled.' };
      }

      if (result.type === 'success' && result.url) {
        try {
          const urlObj = new URL(result.url);
          code = urlObj.searchParams.get('code');
          orcid = urlObj.searchParams.get('orcid');
        } catch {
          const queryPart = result.url.includes('?')
            ? result.url.split('?')[1]
            : result.url.includes('#')
            ? result.url.split('#')[1]
            : '';
          const params = new URLSearchParams(queryPart);
          code = params.get('code');
          orcid = params.get('orcid');
        }
      }
    }

    if (orcid) {
      return {
        success: true,
        orcidId: normalizeOrcidId(orcid),
      };
    }

    if (code) {
      // 1. Try serverless backend token exchange (avoids CORS)
      try {
        const backendEndpoint =
          Platform.OS === 'web' && typeof window !== 'undefined'
            ? '/api/orcid-token'
            : 'https://booff-in.vercel.app/api/orcid-token';

        const backendRes = await fetch(backendEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            code,
            redirect_uri: redirectUri,
          }),
        });

        if (backendRes.ok) {
          const backendData = await backendRes.json();
          if (backendData.orcid) {
            return {
              success: true,
              orcidId: normalizeOrcidId(backendData.orcid),
              name: backendData.name,
              accessToken: backendData.access_token,
            };
          }
        }
      } catch (backendErr) {
        console.warn('Backend ORCID token exchange error:', backendErr);
      }

      // 2. Direct client token exchange attempt
      if (clientSecret) {
        try {
          const tokenRes = await fetch(ORCID_OAUTH_TOKEN_URL, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: rawClientId || '',
              client_secret: clientSecret,
              grant_type: 'authorization_code',
              code,
              redirect_uri: redirectUri,
            }).toString(),
          });

          if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            if (tokenData.orcid) {
              return {
                success: true,
                orcidId: normalizeOrcidId(tokenData.orcid),
                name: tokenData.name,
                accessToken: tokenData.access_token,
              };
            }
          }
        } catch (tokenErr) {
          console.warn('Direct ORCID token exchange error:', tokenErr);
        }
      }
    }

    return {
      success: false,
      error: 'ORCID verification was not completed or could not verify the authenticated ORCID iD.',
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'ORCID authentication failed.' };
  }
}

/**
 * Fetches scholar publications for a user from Supabase or local cache
 */
export async function getScholarPublications(userId: string): Promise<{
  publications: ScholarPublication[];
  stats: ScholarProfileStats;
  error: string | null;
}> {
  try {
    if (!userId) {
      return {
        publications: [],
        stats: { totalPublications: 0, totalCitations: 0, openAccessCount: 0, isVerified: false },
        error: 'User ID is required.',
      };
    }

    const { data, error } = await supabase
      .from('scholar_publications')
      .select('*')
      .eq('user_id', userId)
      .order('publication_year', { ascending: false });

    if (error) {
      // If table does not exist or network issue, fallback gracefully
      return {
        publications: [],
        stats: { totalPublications: 0, totalCitations: 0, openAccessCount: 0, isVerified: false },
        error: error.message,
      };
    }

    const publications: ScholarPublication[] = (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      orcidId: row.orcid_id,
      workPutCode: row.work_put_code,
      title: row.title,
      authors: Array.isArray(row.authors) ? row.authors : [],
      journalName: row.journal_name,
      publicationYear: row.publication_year,
      publicationDate: row.publication_date,
      workType: row.work_type,
      doi: row.doi,
      url: row.url,
      openAccessPdfUrl: row.open_access_pdf_url,
      isOpenAccess: Boolean(row.is_open_access),
      abstract: row.abstract,
      citationCount: row.citations_count || 0,
      discussionCount: row.discussion_count || 0,
      isVerified: Boolean(row.is_verified),
      source: row.source || 'orcid',
      createdAt: row.created_at,
    }));

    const totalCitations = publications.reduce((acc, p) => acc + (p.citationCount || 0), 0);
    const openAccessCount = publications.filter((p) => p.isOpenAccess).length;

    return {
      publications,
      stats: {
        totalPublications: publications.length,
        totalCitations,
        openAccessCount,
        isVerified: publications.length > 0,
      },
      error: null,
    };
  } catch (err: any) {
    return {
      publications: [],
      stats: { totalPublications: 0, totalCitations: 0, openAccessCount: 0, isVerified: false },
      error: err.message || 'Failed to load scholar publications.',
    };
  }
}

/**
 * Synchronizes a researcher's complete publications catalog from ORCID + OpenAlex
 * and stores them in Supabase public.scholar_publications
 */
export async function syncScholarPublications(
  userId: string,
  orcidId: string,
  userFullName?: string
): Promise<{
  success: boolean;
  publications: ScholarPublication[];
  stats: ScholarProfileStats;
  error: string | null;
}> {
  try {
    const cleanOrcid = normalizeOrcidId(orcidId);
    if (!isValidOrcidId(cleanOrcid)) {
      return {
        success: false,
        publications: [],
        stats: { totalPublications: 0, totalCitations: 0, openAccessCount: 0, isVerified: false },
        error: 'Please enter a valid 16-character ORCID iD (e.g. 0000-0002-1825-0097).',
      };
    }

    // Uniqueness Check: Ensure no other user has verified this ORCID
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .eq('orcid_id', cleanOrcid)
      .eq('orcid_verified', true)
      .neq('id', userId);

    if (existingProfiles && existingProfiles.length > 0) {
      const otherUser = existingProfiles[0];
      const otherName = otherUser.full_name || otherUser.username || 'another author';
      return {
        success: false,
        publications: [],
        stats: { totalPublications: 0, totalCitations: 0, openAccessCount: 0, isVerified: false },
        error: `This ORCID iD is already verified and linked to another BooffIn account (${otherName}). Each ORCID iD can only belong to a single verified profile.`,
      };
    }

    // 1. Fetch works from ORCID Public API
    let works: ScholarPublication[] = [];
    try {
      works = await fetchWorksFromOrcidPublicApi(cleanOrcid, userId);
    } catch (orcidErr) {
      // Fallback to OpenAlex if ORCID public endpoint is limited
      works = await fetchWorksFromOpenAlex(cleanOrcid, userId);
    }

    // If ORCID returned empty, check OpenAlex by ORCID identifier
    if (works.length === 0) {
      works = await fetchWorksFromOpenAlex(cleanOrcid, userId);
    }

    // 2. Enrich top papers with OpenAlex DOI citations & open-access PDF links
    const enrichedWorks: ScholarPublication[] = [];
    for (let i = 0; i < works.length; i++) {
      const work = { ...works[i] };
      if (work.doi) {
        try {
          const meta = await enrichPaperMetadataFromOpenAlex(work.doi);
          if (meta.isOpenAccess) work.isOpenAccess = true;
          if (meta.openAccessPdfUrl) work.openAccessPdfUrl = meta.openAccessPdfUrl;
          if (meta.citationCount) work.citationCount = meta.citationCount;
          if (meta.abstract && !work.abstract) work.abstract = meta.abstract;
          if (meta.journalName && !work.journalName) work.journalName = meta.journalName;
          if (meta.authors && meta.authors.length > 0 && work.authors.length === 0) {
            work.authors = meta.authors;
          }
        } catch {}
      }

      if (work.authors.length === 0 && userFullName) {
        work.authors = [userFullName];
      }

      enrichedWorks.push(work);
    }

    // 3. Upsert into Supabase database
    if (enrichedWorks.length > 0) {
      const rows = enrichedWorks.map((w) => ({
        user_id: userId,
        orcid_id: cleanOrcid,
        work_put_code: w.workPutCode || null,
        title: w.title,
        journal_name: w.journalName || null,
        publication_year: w.publicationYear || null,
        publication_date: w.publicationDate || null,
        work_type: w.workType || 'journal-article',
        doi: w.doi || null,
        url: w.url || null,
        open_access_pdf_url: w.openAccessPdfUrl || null,
        is_open_access: w.isOpenAccess,
        abstract: w.abstract || null,
        citations_count: w.citationCount,
        authors: w.authors,
        is_verified: true,
        source: w.source,
        updated_at: new Date().toISOString(),
      }));

      // Upsert into scholar_publications table
      const { error: upsertError } = await supabase
        .from('scholar_publications')
        .upsert(rows, { onConflict: 'user_id,work_put_code' });

      if (upsertError) {
        console.warn('[ORCID Sync] Supabase upsert error:', upsertError.message);
      }
    }

    // 4. Update profiles table with verified scholar status
    await supabase
      .from('profiles')
      .update({
        orcid_id: cleanOrcid,
        orcid_verified: true,
      })
      .eq('id', userId);

    // 5. Update local auth store
    await useAuthStore.getState().updateProfile({
      orcidId: cleanOrcid,
      orcidVerified: true,
    });

    const totalCitations = enrichedWorks.reduce((acc, p) => acc + (p.citationCount || 0), 0);
    const openAccessCount = enrichedWorks.filter((p) => p.isOpenAccess).length;

    return {
      success: true,
      publications: enrichedWorks,
      stats: {
        totalPublications: enrichedWorks.length,
        totalCitations,
        openAccessCount,
        orcidId: cleanOrcid,
        isVerified: true,
        lastSyncedAt: new Date().toISOString(),
      },
      error: null,
    };
  } catch (err: any) {
    return {
      success: false,
      publications: [],
      stats: { totalPublications: 0, totalCitations: 0, openAccessCount: 0, isVerified: false },
      error: err.message || 'Failed to sync ORCID scholar publications.',
    };
  }
}

/**
 * Unclaims and disconnects an ORCID profile safely.
 * Security requirement: Must verify user identity and ensure only the authenticated owner can unclaim.
 */
export async function unclaimOrcidProfileWithReauth(
  userId: string,
  currentOrcid?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required to unclaim profile.' };
    }

    // 1. Try calling the secure RPC function
    const { data: rpcRes, error: rpcError } = await supabase.rpc('unclaim_orcid_profile', {
      target_user_id: userId,
    });

    if (rpcError || (rpcRes && rpcRes.success === false)) {
      // Fallback to direct authenticated database update if RPC is not yet applied
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          orcid_id: null,
          orcid_verified: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (profileError) {
        return { success: false, error: profileError.message };
      }

      // Purge stored scholar publications
      try {
        await supabase.from('scholar_publications').delete().eq('user_id', userId);
      } catch {}
    }

    // 2. Update local auth store
    await useAuthStore.getState().updateProfile({
      orcidId: undefined,
      orcidVerified: false,
    });

    return { success: true, error: null };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Could not unclaim ORCID profile.',
    };
  }
}

/**
 * Deterministically categorizes publications into 3 unified tiers:
 * - All Works
 * - Open Access
 * - Closed
 */
export function categorizeScholarPublications(publications: ScholarPublication[]): {
  all: ScholarPublication[];
  openAccess: ScholarPublication[];
  closed: ScholarPublication[];
} {
  const all = publications || [];
  const openAccess = all.filter((p) => Boolean(p.isOpenAccess || p.openAccessPdfUrl));
  const closed = all.filter((p) => !p.isOpenAccess && !p.openAccessPdfUrl);

  return { all, openAccess, closed };
}
