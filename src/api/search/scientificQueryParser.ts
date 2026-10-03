/**
 * Scientific Query Parser & Intent Analyzer
 *
 * Extracts high-entropy scientific terms, handles medical/biological synonyms,
 * and formats targeted queries for EuropePMC, Semantic Scholar, OpenAlex, and arXiv.
 */

// Common academic stop words that do not add high scientific entropy
const SCIENTIFIC_STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any',
  'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between',
  'both', 'but', 'by', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each',
  'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here',
  'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it',
  'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now',
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out',
  'over', 'own', 'same', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their',
  'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those',
  'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what',
  'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you',
  'your', 'yours', 'yourself', 'yourselves',
  // Generic paper words
  'paper', 'study', 'research', 'review', 'analysis', 'journal', 'article', 'investigation',
  'effects', 'effect', 'role', 'novel', 'new', 'using', 'based', 'approach'
]);

export interface ParsedScientificQuery {
  rawQuery: string;
  cleanedQuery: string;
  keywords: string[];
  exactPhrases: string[];
  isMultiKeyword: boolean;
  europePmcQuery: string;
  semanticScholarQuery: string;
  openAlexQuery: string;
  arxivQuery: string;
}

export function parseScientificQuery(rawQuery: string): ParsedScientificQuery {
  const clean = rawQuery.trim();
  if (!clean) {
    return {
      rawQuery: '',
      cleanedQuery: '',
      keywords: [],
      exactPhrases: [],
      isMultiKeyword: false,
      europePmcQuery: '',
      semanticScholarQuery: '',
      openAlexQuery: '',
      arxivQuery: '',
    };
  }

  // 1. Extract quoted exact phrases: e.g. "cell death"
  const exactPhrases: string[] = [];
  const phraseRegex = /"([^"]+)"/g;
  let match: RegExpExecArray | null;
  let queryWithoutQuotes = clean;

  while ((match = phraseRegex.exec(clean)) !== null) {
    if (match[1]?.trim()) {
      exactPhrases.push(match[1].trim());
    }
  }
  queryWithoutQuotes = queryWithoutQuotes.replace(phraseRegex, ' ');

  // 2. Tokenize and filter stop words
  const rawTokens = queryWithoutQuotes
    .toLowerCase()
    .replace(/[^\w\s\-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);

  const keywords = Array.from(
    new Set(
      rawTokens.filter((token) => !SCIENTIFIC_STOP_WORDS.has(token) && token.length > 2)
    )
  );

  // If all words were filtered out (e.g. searching "in on"), fall back to raw tokens
  const effectiveKeywords = keywords.length > 0 ? keywords : rawTokens;
  const isMultiKeyword = effectiveKeywords.length > 1 || exactPhrases.length > 0;

  // 3. Build optimized query strings for specific engines

  // EuropePMC: Supports TITLE/ABSTRACT boolean operators + wildcard prefixes
  let europePmcQuery = clean;
  if (isMultiKeyword && effectiveKeywords.length > 1) {
    const termClauses = effectiveKeywords.map((k) => {
      // Strip common trailing 's' or 'es' or 'ing' to form a robust root stem
      const rootStem = k.replace(/('s|s|es|ing|ed)$/, '');
      if (rootStem.length >= 3 && rootStem !== k) {
        return `(TITLE:"${k}" OR ABSTRACT:"${k}" OR TITLE:"${rootStem}*" OR ABSTRACT:"${rootStem}*")`;
      }
      return `(TITLE:"${k}" OR ABSTRACT:"${k}")`;
    });
    europePmcQuery = termClauses.join(' AND ');
  }

  // Semantic Scholar: Performs best with space-separated high-entropy terms
  const semanticScholarQuery = [
    ...exactPhrases.map((p) => `"${p}"`),
    ...effectiveKeywords,
  ].join(' ');

  // OpenAlex: Works search query
  const openAlexQuery = clean;

  // arXiv: all: search with boolean AND
  const arxivQuery = effectiveKeywords.length > 0 ? effectiveKeywords.join(' AND ') : clean;

  return {
    rawQuery: clean,
    cleanedQuery: effectiveKeywords.join(' '),
    keywords: effectiveKeywords,
    exactPhrases,
    isMultiKeyword,
    europePmcQuery,
    semanticScholarQuery,
    openAlexQuery,
    arxivQuery,
  };
}
