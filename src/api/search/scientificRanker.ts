import { Paper } from '../../types';
import { ParsedScientificQuery } from './scientificQueryParser';

/**
 * Calibrated Multi-Factor Scientific Relevance Ranking Algorithm
 *
 * Mathematically evaluates and re-ranks candidate papers retrieved from federated academic sources
 * (OpenAlex, EuropePMC, Semantic Scholar, arXiv).
 *
 * Scoring Signals:
 * 1. Primary Entity / Concept Match (Title, Abstract, Topics)
 * 2. Target Relationship / Context Match (Title, Abstract, Topics)
 * 3. Co-occurrence & Syntactic Proximity (Entity + Target combined in Title)
 * 4. Keyword Coverage & Exact Phrase Density
 * 5. Topic / Ontology Alignment (Using OpenAlex concepts in paper.topics)
 * 6. Calibrated Log-Scaled Citation Authority (gentle prior, avoids drowning precision matches)
 * 7. Recency / Freshness Multiplier
 * 8. Open Access Full-Text Bonus
 * 9. Negative Irrelevance Penalty (Drastically demotes papers missing primary entity)
 */

export interface ScoredPaper extends Paper {
  _relevanceScore?: number;
  _matchBreakdown?: {
    entityTitleMatch: boolean;
    entityAbstractMatch: boolean;
    relationshipMatch: boolean;
    cooccurrenceBonus: boolean;
    topicAlignment: number;
    citationScore: number;
    recencyScore: number;
  };
}

/**
 * Helper to check if a text contains a word or root stem (e.g. 'gene' matches 'genes', 'genetic')
 */
function textContainsTerm(text: string, term: string): boolean {
  if (!text || !term) return false;
  const lowerText = text.toLowerCase();
  const lowerTerm = term.toLowerCase().trim();
  if (lowerTerm.length === 0) return false;

  // Exact substring match
  if (lowerText.includes(lowerTerm)) return true;

  // Root stem matching for plurals and common suffixes (e.g., 'genes' -> 'gene', 'mutations' -> 'mutat')
  const rootStem = lowerTerm.replace(/('s|s|es|ing|ed)$/, '');
  if (rootStem.length >= 3 && lowerText.includes(rootStem)) return true;

  return false;
}

export function rankScientificPapers(
  papers: Paper[],
  parsedQuery: ParsedScientificQuery
): Paper[] {
  if (!papers || papers.length === 0) return [];
  if (!parsedQuery.keywords || parsedQuery.keywords.length === 0) {
    return deduplicatePapers(papers);
  }

  const { keywords, exactPhrases = [], rawQuery, intent } = parsedQuery;
  const lowerRawQuery = rawQuery.toLowerCase();
  const currentYear = new Date().getFullYear();
  const totalKeywords = Math.max(keywords.length, 1);

  const primaryEntityTerms: string[] = intent?.expandedTerms?.length
    ? intent.expandedTerms.map((t) => t.toLowerCase())
    : [];

  const targetRelationshipTerms: string[] = intent?.targetTerms?.length
    ? intent.targetTerms.map((t) => t.toLowerCase())
    : [];

  const hasSpecificIntent = primaryEntityTerms.length > 0;

  // 1. Deduplicate initial pool by DOI and normalized title
  const uniquePapers = deduplicatePapers(papers);

  // 2. Compute composite relevance score for each paper
  const scoredPapers: ScoredPaper[] = uniquePapers.map((paper) => {
    let score = 0;

    const titleLower = (paper.title || '').toLowerCase();
    const abstractLower = (paper.abstract || '').toLowerCase();
    const journalLower = (paper.journal || '').toLowerCase();
    const topicsLower = (paper.topics || []).map((t) => t.toLowerCase());

    // ── Signal 1: Primary Scientific Entity Match (Weight: 35.0 Title / 15.0 Abstract) ──
    let hasEntityInTitle = false;
    let hasEntityInAbstract = false;
    let hasEntityInTopics = false;

    if (hasSpecificIntent) {
      hasEntityInTitle = primaryEntityTerms.some((term) => textContainsTerm(titleLower, term));
      hasEntityInAbstract = primaryEntityTerms.some((term) => textContainsTerm(abstractLower, term));
      hasEntityInTopics = primaryEntityTerms.some((term) =>
        topicsLower.some((topic) => textContainsTerm(topic, term))
      );

      if (hasEntityInTitle) {
        score += 35;
      } else if (hasEntityInAbstract) {
        score += 15;
      }

      if (hasEntityInTopics) {
        score += 10;
      }

      // Negative Irrelevance Penalty: If the query focuses on a specific entity (e.g. "autism")
      // and this paper NEVER mentions the entity or its synonyms in title, abstract, or topics,
      // it is an off-topic contaminant (e.g. a breast cancer paper mentioning 'involved in genes').
      if (!hasEntityInTitle && !hasEntityInAbstract && !hasEntityInTopics) {
        score -= 40;
      }
    }

    // ── Signal 2: Target Relationship / Context Match (Weight: 25.0 Title / 10.0 Abstract) ──
    let hasTargetInTitle = false;
    let hasTargetInAbstract = false;
    let hasTargetInTopics = false;

    if (targetRelationshipTerms.length > 0) {
      hasTargetInTitle = targetRelationshipTerms.some((term) => textContainsTerm(titleLower, term));
      hasTargetInAbstract = targetRelationshipTerms.some((term) => textContainsTerm(abstractLower, term));
      hasTargetInTopics = targetRelationshipTerms.some((term) =>
        topicsLower.some((topic) => textContainsTerm(topic, term))
      );

      if (hasTargetInTitle) {
        score += 25;
      } else if (hasTargetInAbstract) {
        score += 10;
      }

      if (hasTargetInTopics) {
        score += 8;
      }
    }

    // ── Signal 3: Co-Occurrence & Semantic Proximity Bonus (Weight: 25.0 Title / 10.0 Abstract) ──
    // When both the primary entity AND target relationship are present together in the title,
    // the paper directly addresses the user's research question (e.g. "Genetics of autism").
    const cooccurrenceInTitle = hasEntityInTitle && hasTargetInTitle;
    const cooccurrenceInAbstract = hasEntityInAbstract && hasTargetInAbstract;

    if (cooccurrenceInTitle) {
      score += 25;
    } else if (cooccurrenceInAbstract) {
      score += 10;
    }

    // ── Signal 4: Keyword Coverage Density (Weight: 20.0 Title / 10.0 Abstract) ──
    let titleKeywordMatches = 0;
    let abstractKeywordMatches = 0;

    keywords.forEach((k) => {
      if (textContainsTerm(titleLower, k)) titleKeywordMatches++;
      if (textContainsTerm(abstractLower, k)) abstractKeywordMatches++;
    });

    const titleCoverageRatio = titleKeywordMatches / totalKeywords;
    const abstractCoverageRatio = abstractKeywordMatches / totalKeywords;

    score += titleCoverageRatio * 20;
    score += abstractCoverageRatio * 10;

    // Full query string match in title (e.g. "synaptic plasticity")
    if (lowerRawQuery.length > 4 && titleLower.includes(lowerRawQuery)) {
      score += 15;
    }

    // Quoted exact phrases match
    exactPhrases.forEach((phrase) => {
      const pLower = phrase.toLowerCase();
      if (titleLower.includes(pLower)) score += 12;
      else if (abstractLower.includes(pLower)) score += 6;
    });

    // ── Signal 5: Concept / Topic Alignment (Weight: 10.0 Max) ──
    let topicScore = 0;
    topicsLower.forEach((topic) => {
      keywords.forEach((k) => {
        if (textContainsTerm(topic, k)) topicScore += 2.5;
      });
      if (journalLower.includes(topic)) topicScore += 1;
    });
    score += Math.min(10, topicScore);

    // ── Signal 6: Calibrated Citation Authority (Weight: 8.0 Max) ──
    // Log-scaled gentle prior. Ensures seminal papers rank slightly higher without
    // allowing unrelated high-citation papers to dominate specific newer works.
    const citations = paper.citationCount || 0;
    let citationScore = 0;
    if (citations > 0) {
      citationScore = Math.min(8.0, Math.log10(citations + 1) * 2.2);
      score += citationScore;
    }

    // ── Signal 7: Recency & Scientific Freshness (Weight: 5.0 Max) ──
    const pubYear =
      paper.publicationYear ||
      (paper.publicationDate ? parseInt(paper.publicationDate.slice(0, 4), 10) : 0);
    let recencyScore = 0;
    if (pubYear > 0) {
      if (pubYear >= currentYear - 1) {
        recencyScore = 5.0; // 2025-2026 cutting-edge
      } else if (pubYear >= currentYear - 3) {
        recencyScore = 3.5; // 2023-2024 recent
      } else if (pubYear >= currentYear - 6) {
        recencyScore = 2.0; // 2020-2022 established
      } else if (pubYear >= currentYear - 10) {
        recencyScore = 1.0; // 2016-2019
      }
      score += recencyScore;
    }

    // ── Signal 8: Open Access Bonus (Weight: 2.0 Max) ──
    if (paper.isOpenAccess || paper.openAccessUrl) {
      score += 2.0;
    }

    return {
      ...paper,
      _relevanceScore: Number(score.toFixed(2)),
      _matchBreakdown: {
        entityTitleMatch: hasEntityInTitle,
        entityAbstractMatch: hasEntityInAbstract,
        relationshipMatch: hasTargetInTitle || hasTargetInAbstract,
        cooccurrenceBonus: cooccurrenceInTitle || cooccurrenceInAbstract,
        topicAlignment: Number(topicScore.toFixed(1)),
        citationScore: Number(citationScore.toFixed(2)),
        recencyScore,
      },
    };
  });

  // 3. Sort descending by calibrated composite score
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
