import { ResearcherSearchResult } from '../types';
import { isValidOrcidId, normalizeOrcidId } from '../../orcidService';

/**
 * Fetch with retry on network failure
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit & { signal?: AbortSignal },
  retries = 2
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  throw new Error('fetch failed after retries');
}

/**
 * Build a smart ORCID query from the user's raw input.
 *
 * ORCID expanded-search supports Lucene syntax:
 *   given-names, family-name, credit-name, other-names, email,
 *   current-institution-name, past-institution-name, affiliation-name,
 *   keyword, work-titles, biography
 *
 * Strategy:
 * - If looks like "First Last" → try (given-names:First AND family-name:Last)
 *   AND fall back to a plain text search
 * - Otherwise pass the raw query as a multi-field OR search
 */
function buildOrcidQuery(query: string): string {
  const parts = query.trim().split(/\s+/);

  // Looks like a personal name (2-4 tokens, no special chars)
  const looksLikeName =
    parts.length >= 2 &&
    parts.length <= 4 &&
    parts.every((p) => /^[a-zA-ZÀ-ÖØ-öø-ÿ'\-\.]+$/.test(p));

  if (looksLikeName) {
    const given = parts.slice(0, -1).join(' ');
    const family = parts[parts.length - 1];
    // Structured query has highest precision for exact names
    return `(given-names:${encodeURIComponent(given)} AND family-name:${encodeURIComponent(family)}) OR (credit-name:${encodeURIComponent(query)})`;
  }

  // Generic keyword — search across all text fields
  const escaped = encodeURIComponent(query);
  return `(given-names:${escaped} OR family-name:${escaped} OR credit-name:${escaped} OR other-names:${escaped} OR affiliation-name:${escaped} OR keyword:${escaped} OR work-titles:${escaped})`;
}

/**
 * Searches the official ORCID Public Registry for researchers.
 * Handles: exact ORCID IDs, full names, partial names, institution names, keywords.
 */
export async function searchOrcidResearchers(
  query: string,
  limit = 10
): Promise<ResearcherSearchResult[]> {
  const cleanQ = query.trim().replace(/^@/, '');
  if (!cleanQ) return [];

  // 1. Exact ORCID ID direct lookup
  if (isValidOrcidId(cleanQ)) {
    const exactOrcid = normalizeOrcidId(cleanQ);
    try {
      const res = await fetchWithRetry(
        `https://pub.orcid.org/v3.0/${exactOrcid}/record`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'BooffIn/1.0 (scholar-search; dev@booffin.science)',
          },
          signal: AbortSignal.timeout(7000),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const givenNames = data['person']?.['name']?.['given-names']?.['value'] || '';
        const familyName = data['person']?.['name']?.['family-name']?.['value'] || '';
        const fullName = `${givenNames} ${familyName}`.trim() || 'Verified Researcher';

        const institutions = (
          data['activities-summary']?.['employments']?.['affiliation-group'] || []
        )
          .map(
            (g: any) =>
              g?.['summaries']?.[0]?.['employment-summary']?.['organization']?.['name']
          )
          .filter(Boolean);

        const worksCount = data['activities-summary']?.['works']?.['group']?.length || 0;
        const bio =
          data['person']?.['biography']?.['content'] ||
          data['person']?.['keywords']?.['keyword']?.map((k: any) => k.content).join(', ') ||
          '';

        return [
          {
            id: `orcid_${exactOrcid}`,
            fullName,
            handle: fullName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20) || 'scholar',
            academicTitle: 'ORCID Verified Researcher',
            institution: institutions[0] || 'Academic Institution',
            bio,
            orcidId: exactOrcid,
            orcidVerified: true,
            followersCount: 0,
            followingCount: 0,
            isRegisteredUser: false,
            worksCount,
          },
        ];
      }
    } catch {}
    // Fall through to text search if direct lookup fails
  }

  // 2. Smart expanded-search in ORCID Registry
  try {
    const orcidQuery = buildOrcidQuery(cleanQ);
    const searchUrl = `https://pub.orcid.org/v3.0/expanded-search/?q=${orcidQuery}&rows=${limit}&start=0`;

    const res = await fetchWithRetry(searchUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'BooffIn/1.0 (scholar-search; dev@booffin.science)',
      },
      signal: AbortSignal.timeout(7000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const results = data['expanded-result'] || [];

    const researchers: ResearcherSearchResult[] = [];
    for (const item of results) {
      const orcidId = item['orcid-id'];
      if (!orcidId) continue;

      const givenNames = item['given-names'] || '';
      const familyNames = item['family-names'] || '';
      const fullName = `${givenNames} ${familyNames}`.trim() || 'Researcher';
      const institution =
        item['institution-name']?.[0] ||
        item['current-institution-affiliation-name']?.[0] ||
        '';
      const creditName = item['credit-name'] || '';

      researchers.push({
        id: `orcid_${orcidId}`,
        fullName: fullName || creditName || 'Researcher',
        handle:
          (fullName || creditName).toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20) ||
          'scholar',
        academicTitle: 'ORCID Scholar',
        institution,
        orcidId,
        orcidVerified: true,
        followersCount: 0,
        followingCount: 0,
        isRegisteredUser: false,
      });
    }

    return researchers;
  } catch {
    return [];
  }
}
