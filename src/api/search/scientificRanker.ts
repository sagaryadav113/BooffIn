import { Paper } from '../../types';
import { ParsedScientificQuery } from './scientificQueryParser';

/**
 * Multi-Factor Scientific Relevance Ranking Algorithm (BM25 + Citation Authority + Title Density)
 *
 * Mathematically evaluates candidate papers returned from live academic federations
 * to rank the most seminal, contextually relevant, and authoritative research at the top.
 */

export interface ScoredPaper extends Paper {
  _relevanceScore?: number;
}

export function rankScientificPapers(
  papers: Paper[],
  parsedQuery: ParsedScientificQuery
): Paper[] {
  if (!papers || papers.length === 0) return [];
  if (!parsedQuery.keywords || parsedQuery.keywords.length === 0) {
    return deduplicatePapers(papers);
  }

  const { keywords, exactPhrases, rawQuery } = parsedQuery;
  const lowerRawQuery = rawQuery.toLowerCase();
  const currentYear = new Date().getFullYear();
  const totalKeywords = Math.max(keywords.length, 1);

  // 1. Deduplicate initial pool by DOI and normalized title
  const uniquePapers = deduplicatePapers(papers);

  // 2. Compute composite relevance score for each paper
  const scoredPapers: ScoredPaper[] = uniquePapers.map((paper) => {
    let score = 0;

    const titleLower = (paper.title || '').toLowerCase();
    const abstractLower = (paper.abstract || '').toLowerCase();
    const journalLower = (paper.journal || '').toLowerCase();

    // Helper to check if text contains keyword or its root stem
    const matchesKeyword = (text: string, k: string) => {
      if (text.includes(k)) return true;
      const rootStem = k.replace(/('s|s|es|ing|ed)$/, '');
      if (rootStem.length >= 3 && text.includes(rootStem)) return true;
      return false;
    };

    // ── A. Title Match Weight (Weight: 45.0 Max) ──
    let titleKeywordMatches = 0;
    keywords.forEach((k) => {
      if (matchesKeyword(titleLower, k)) {
        titleKeywordMatches++;
      }
    });

    const titleCoverageRatio = titleKeywordMatches / totalKeywords;
    score += titleCoverageRatio * 45;

    // Direct multi-keyword full phrase in title (e.g. "apoptosis in Parkinson's disease")
    if (lowerRawQuery.length > 3 && (titleLower.includes(lowerRawQuery) || lowerRawQuery.split(/\s+/).every((w) => titleLower.includes(w)))) {
      score += 25;
    }

    // Exact quoted phrases in title
    exactPhrases.forEach((phrase) => {
      if (titleLower.includes(phrase.toLowerCase())) {
        score += 15;
      }
    });

    // ── B. Abstract Match Weight (Weight: 25.0 Max) ──
    let abstractKeywordMatches = 0;
    keywords.forEach((k) => {
      if (matchesKeyword(abstractLower, k)) {
        abstractKeywordMatches++;
      }
    });

    const abstractCoverageRatio = abstractKeywordMatches / totalKeywords;
    score += abstractCoverageRatio * 25;

    // Exact quoted phrases in abstract
    exactPhrases.forEach((phrase) => {
      if (abstractLower.includes(phrase.toLowerCase())) {
        score += 10;
      }
    });

    // ── C. Citation Authority Score (Weight: 20.0 Max) ──
    // Logarithmic scaling prevents high-citation papers from drowning out hyper-relevant specific papers
    const citations = paper.citationCount || 0;
    if (citations > 0) {
      const citationScore = Math.min(20, Math.log10(citations + 1) * 6.0);
      score += citationScore;
    }

    // ── D. Recency / Freshness Multiplier (Weight: 5.0 Max) ──
    const pubYear = paper.publicationYear || (paper.publicationDate ? parseInt(paper.publicationDate.slice(0, 4), 10) : 0);
    if (pubYear > 0) {
      if (pubYear >= currentYear - 1) {
        score += 5; // Cutting-edge (2025-2026)
      } else if (pubYear >= currentYear - 3) {
        score += 3.5; // Recent (2023-2024)
      } else if (pubYear >= currentYear - 6) {
        score += 2; // Established (2020-2022)
      }
    }

    // ── E. Open Access Full-Text Availability Bonus ──
    if (paper.isOpenAccess || paper.openAccessUrl) {
      score += 3;
    }

    // ── F. Topic / Journal Alignment ──
    keywords.forEach((k) => {
      if (journalLower.includes(k)) {
        score += 2;
      }
    });

    return {
      ...paper,
      _relevanceScore: Number(score.toFixed(2)),
    };
  });

  // 3. Sort descending by computed relevance score
  scoredPapers.sort((a, b) => (b._relevanceScore || 0) - (a._relevanceScore || 0));

  return scoredPapers;
}

/**
 * Deduplicates papers across heterogeneous academic providers
 */
export function deduplicatePapers(papers: Paper[]): Paper[] {
  const seenDois = new Set<string>();
  const seenTitles = new Set<string>();
  const out: Paper[] = [];

  for (const paper of papers) {
    const doiKey = paper.doi?.toLowerCase().trim() ?? '';
    const titleKey = paper.title
      ? paper.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 65)
      : '';

    if (doiKey && seenDois.has(doiKey)) continue;
    if (titleKey && seenTitles.has(titleKey)) continue;

    if (doiKey) seenDois.add(doiKey);
    if (titleKey) seenTitles.add(titleKey);
    out.push(paper);
  }
  return out;
}
