/**
 * Scientific Query Parser & Intent Analyzer
 *
 * Stage 1 & 2 of the BOOFFIN Intelligent Scholarly Search Engine:
 * 1. Query Validation & Normalization
 * 2. Scientific Intent Recognition & Controlled Synonym Expansion
 *
 * Extracts scientific entities, maps clinical/biological synonyms,
 * identifies research relationships (e.g., genetic etiology, therapy, mechanism),
 * and formats targeted queries for OpenAlex, EuropePMC, Semantic Scholar, and arXiv.
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
  // Generic paper words with low discriminative power
  'paper', 'study', 'research', 'review', 'analysis', 'journal', 'article', 'investigation',
  'novel', 'new', 'using', 'based', 'approach', 'recent', 'overview', 'advances'
]);

/**
 * Curated Scientific Concept Taxonomy
 * Maps biomedical/technical terms to canonical entities and legitimate synonyms.
 * Controlled to prevent adjacent-domain contamination (e.g. Autism != Alzheimer's).
 */
export interface ScientificConceptDefinition {
  canonical: string;
  synonyms: string[];
  domain:
    | 'neuroscience'
    | 'genetics'
    | 'immunology'
    | 'oncology'
    | 'computational'
    | 'hematology'
    | 'cell_biology'
    | 'general';
}

const SCIENTIFIC_ENTITIES: Record<string, ScientificConceptDefinition> = {
  // Neuroscience & Psychiatry
  'autism': {
    canonical: 'Autism spectrum disorder',
    synonyms: ['autism', 'autism spectrum disorder', 'ASD', 'autistic disorder'],
    domain: 'neuroscience',
  },
  'asd': {
    canonical: 'Autism spectrum disorder',
    synonyms: ['autism', 'autism spectrum disorder', 'ASD'],
    domain: 'neuroscience',
  },
  'alzheimer': {
    canonical: 'Alzheimer\'s disease',
    synonyms: ['Alzheimer\'s disease', 'Alzheimer disease', 'Alzheimers', 'AD'],
    domain: 'neuroscience',
  },
  'alzheimers': {
    canonical: 'Alzheimer\'s disease',
    synonyms: ['Alzheimer\'s disease', 'Alzheimer disease', 'Alzheimers', 'AD'],
    domain: 'neuroscience',
  },
  'parkinson': {
    canonical: 'Parkinson\'s disease',
    synonyms: ['Parkinson\'s disease', 'Parkinson disease', 'Parkinsons', 'PD'],
    domain: 'neuroscience',
  },
  'parkinsons': {
    canonical: 'Parkinson\'s disease',
    synonyms: ['Parkinson\'s disease', 'Parkinson disease', 'Parkinsons', 'PD'],
    domain: 'neuroscience',
  },
  'microglia': {
    canonical: 'Microglia',
    synonyms: ['microglia', 'microglial cells', 'microglial activation', 'microgliosis'],
    domain: 'neuroscience',
  },
  'bdnf': {
    canonical: 'Brain-derived neurotrophic factor',
    synonyms: ['BDNF', 'brain-derived neurotrophic factor'],
    domain: 'neuroscience',
  },
  'synaptic plasticity': {
    canonical: 'Synaptic plasticity',
    synonyms: ['synaptic plasticity', 'synaptic strength', 'long-term potentiation', 'LTP', 'activity-dependent plasticity'],
    domain: 'neuroscience',
  },
  'blood brain barrier': {
    canonical: 'Blood-brain barrier',
    synonyms: ['blood-brain barrier', 'blood brain barrier', 'BBB'],
    domain: 'neuroscience',
  },
  'bbb': {
    canonical: 'Blood-brain barrier',
    synonyms: ['blood-brain barrier', 'BBB'],
    domain: 'neuroscience',
  },
  'neuroinflammation': {
    canonical: 'Neuroinflammation',
    synonyms: ['neuroinflammation', 'neuroinflammatory', 'brain inflammation'],
    domain: 'neuroscience',
  },
  'huntington': {
    canonical: 'Huntington\'s disease',
    synonyms: ['Huntington\'s disease', 'Huntington disease', 'HD', 'huntingtin'],
    domain: 'neuroscience',
  },
  'als': {
    canonical: 'Amyotrophic lateral sclerosis',
    synonyms: ['amyotrophic lateral sclerosis', 'ALS', 'motor neuron disease'],
    domain: 'neuroscience',
  },
  'schizophrenia': {
    canonical: 'Schizophrenia',
    synonyms: ['schizophrenia', 'schizophrenic', 'psychosis'],
    domain: 'neuroscience',
  },

  // Genetics & Molecular Biology
  'crispr': {
    canonical: 'CRISPR-Cas gene editing',
    synonyms: ['CRISPR', 'CRISPR-Cas', 'CRISPR-Cas9', 'Cas9', 'gene editing', 'genome editing'],
    domain: 'genetics',
  },
  'rna sequencing': {
    canonical: 'RNA sequencing',
    synonyms: ['RNA-seq', 'RNA sequencing', 'transcriptome sequencing', 'transcriptomics'],
    domain: 'genetics',
  },
  'rna seq': {
    canonical: 'RNA sequencing',
    synonyms: ['RNA-seq', 'RNA sequencing', 'transcriptomics'],
    domain: 'genetics',
  },
  'scrna seq': {
    canonical: 'Single-cell RNA sequencing',
    synonyms: ['scRNA-seq', 'single-cell RNA-seq', 'single-cell transcriptomics'],
    domain: 'genetics',
  },
  'single cell rna': {
    canonical: 'Single-cell RNA sequencing',
    synonyms: ['single-cell RNA sequencing', 'scRNA-seq', 'single-cell transcriptomics'],
    domain: 'genetics',
  },
  'gwas': {
    canonical: 'Genome-wide association study',
    synonyms: ['GWAS', 'genome-wide association', 'genome wide association study'],
    domain: 'genetics',
  },
  'epigenetics': {
    canonical: 'Epigenetics',
    synonyms: ['epigenetics', 'DNA methylation', 'histone modification', 'chromatin accessibility'],
    domain: 'genetics',
  },
  'gene therapy': {
    canonical: 'Gene therapy',
    synonyms: ['gene therapy', 'gene delivery', 'AAV vector', 'viral vector gene therapy'],
    domain: 'genetics',
  },
  'p53': {
    canonical: 'TP53 tumor suppressor',
    synonyms: ['p53', 'TP53', 'tumor protein p53'],
    domain: 'genetics',
  },
  'mrna': {
    canonical: 'Messenger RNA',
    synonyms: ['mRNA', 'messenger RNA', 'mRNA-based'],
    domain: 'genetics',
  },

  // Oncology
  'glioblastoma': {
    canonical: 'Glioblastoma',
    synonyms: ['glioblastoma', 'GBM', 'glioblastoma multiforme', 'astrocytoma'],
    domain: 'oncology',
  },
  'melanoma': {
    canonical: 'Melanoma',
    synonyms: ['melanoma', 'malignant melanoma'],
    domain: 'oncology',
  },
  'breast cancer': {
    canonical: 'Breast cancer',
    synonyms: ['breast cancer', 'mammary carcinoma', 'TNBC'],
    domain: 'oncology',
  },
  'leukemia': {
    canonical: 'Leukemia',
    synonyms: ['leukemia', 'leukaemia', 'AML', 'CML', 'ALL'],
    domain: 'oncology',
  },
  'metastasis': {
    canonical: 'Metastasis',
    synonyms: ['metastasis', 'metastatic', 'dissemination'],
    domain: 'oncology',
  },

  // Immunology & Infectious Disease
  'immunotherapy': {
    canonical: 'Immunotherapy',
    synonyms: ['immunotherapy', 'immune checkpoint', 'checkpoint inhibitor', 'PD-1', 'PD-L1'],
    domain: 'immunology',
  },
  'car t': {
    canonical: 'CAR-T cell therapy',
    synonyms: ['CAR-T', 'chimeric antigen receptor', 'CAR-T cells'],
    domain: 'immunology',
  },
  'car-t': {
    canonical: 'CAR-T cell therapy',
    synonyms: ['CAR-T', 'chimeric antigen receptor', 'CAR-T cells'],
    domain: 'immunology',
  },
  'covid': {
    canonical: 'COVID-19',
    synonyms: ['COVID-19', 'SARS-CoV-2', 'coronavirus'],
    domain: 'immunology',
  },

  // AI & Computational Biology
  'ai drug discovery': {
    canonical: 'AI-driven drug discovery',
    synonyms: ['AI drug discovery', 'machine learning drug discovery', 'computational drug design', 'virtual screening'],
    domain: 'computational',
  },
  'alphafold': {
    canonical: 'AlphaFold protein prediction',
    synonyms: ['AlphaFold', 'protein structure prediction', 'ESMFold'],
    domain: 'computational',
  },

  // Hematology & Rare Diseases
  'sickle cell': {
    canonical: 'Sickle cell disease',
    synonyms: ['sickle cell disease', 'sickle cell anemia', 'SCD', 'sickle cell'],
    domain: 'hematology',
  },
  'cystic fibrosis': {
    canonical: 'Cystic fibrosis',
    synonyms: ['cystic fibrosis', 'CF', 'CFTR'],
    domain: 'general',
  },
};

/**
 * Scientific Relationship / Research Intent Patterns
 * Detects whether the user is asking about genetics, mechanisms, treatments, or biomarkers.
 */
interface RelationshipPattern {
  name: string;
  regex: RegExp;
  intentLabel: string;
  targetTerms: string[];
}

const RELATIONSHIP_PATTERNS: RelationshipPattern[] = [
  {
    name: 'genetics',
    regex: /\b(genes?(\s+involved\s+in|\s+in|\s+associated\s+with)?|genetic(s)?|mutations?|risk\s+variants?|variants?|susceptibility|genome|genomic|alleles?)\b/i,
    intentLabel: 'Identify genes, genetic variants & genomic etiology',
    targetTerms: ['gene', 'genes', 'genetic', 'genetics', 'variant', 'variants', 'mutation', 'mutations', 'susceptibility', 'risk alleles'],
  },
  {
    name: 'therapy',
    regex: /\b(treatment(s)?(\s+for)?|therapy|therapeutic(s)?|cure(s)?(\s+for)?|drugs?(\s+for)?|inhibitors?|small\s+molecules?|clinical\s+trials?)\b/i,
    intentLabel: 'Therapeutic interventions, drugs & treatments',
    targetTerms: ['treatment', 'therapy', 'therapeutic', 'drug', 'inhibitor', 'pharmacology', 'efficacy', 'clinical trial'],
  },
  {
    name: 'mechanism',
    regex: /\b(mechanism(s)?(\s+of)?|pathway(s)?(\s+of)?|molecular\s+basis|signaling|cascade|activation\s+of|how\s+does)\b/i,
    intentLabel: 'Molecular pathways, biological mechanisms & signaling',
    targetTerms: ['mechanism', 'pathway', 'signaling', 'molecular mechanism', 'cascade', 'activation', 'pathogenesis'],
  },
  {
    name: 'biomarker',
    regex: /\b(biomarker(s)?(\s+for)?|markers?(\s+of)?|diagnostic(s)?|prognostic|detection\s+of|early\s+detection)\b/i,
    intentLabel: 'Diagnostic & prognostic biomarkers',
    targetTerms: ['biomarker', 'biomarkers', 'diagnostic marker', 'prognostic', 'detection', 'signature', 'serum levels'],
  },
  {
    name: 'delivery',
    regex: /\b(delivery(\s+to|\s+across)?|crossing|transcytosis|targeting|carrier|nanoparticles?)\b/i,
    intentLabel: 'Targeted delivery & biodistribution',
    targetTerms: ['delivery', 'transcytosis', 'nanoparticles', 'targeting', 'permeability', 'uptake', 'carrier'],
  },
];

export interface ScientificIntent {
  primaryEntity: string;
  relationshipIntent: string;
  expandedTerms: string[];
  targetTerms: string[];
  coreConcepts: string[];
  searchMode: 'hybrid' | 'targeted' | 'broad';
}

export interface ParsedScientificQuery {
  rawQuery: string;
  cleanedQuery: string;
  keywords: string[];
  exactPhrases: string[];
  isMultiKeyword: boolean;
  intent: ScientificIntent;
  europePmcQuery: string;
  semanticScholarQuery: string;
  openAlexQuery: string;
  openAlexTitleAbstractQuery: string;
  arxivQuery: string;
}

/**
 * Normalizes user scientific query and extracts scientific intent, entities, and legitimate synonyms.
 */
export function parseScientificQuery(rawQuery: string): ParsedScientificQuery {
  const clean = (rawQuery || '').trim();
  if (!clean) {
    return {
      rawQuery: '',
      cleanedQuery: '',
      keywords: [],
      exactPhrases: [],
      isMultiKeyword: false,
      intent: {
        primaryEntity: '',
        relationshipIntent: 'General scholarly inquiry',
        expandedTerms: [],
        targetTerms: [],
        coreConcepts: [],
        searchMode: 'broad',
      },
      europePmcQuery: '',
      semanticScholarQuery: '',
      openAlexQuery: '',
      openAlexTitleAbstractQuery: '',
      arxivQuery: '',
    };
  }

  // 1. Extract quoted exact phrases: e.g. "synaptic plasticity"
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
    .replace(/[^\w\s\-\.]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);

  const keywords = Array.from(
    new Set(
      rawTokens.filter((token) => !SCIENTIFIC_STOP_WORDS.has(token) && token.length > 2)
    )
  );

  const effectiveKeywords = keywords.length > 0 ? keywords : rawTokens;
  const isMultiKeyword = effectiveKeywords.length > 1 || exactPhrases.length > 0;
  const lowerClean = clean.toLowerCase();

  // 3. Query Understanding: Detect Scientific Entity & Intent
  let primaryEntity = '';
  let expandedTerms: string[] = [];
  let relationshipIntent = 'General scientific inquiry';
  let targetTerms: string[] = [];
  const coreConcepts: string[] = [];

  // Match entities from curated ontology (longest key match first)
  const sortedEntityKeys = Object.keys(SCIENTIFIC_ENTITIES).sort((a, b) => b.length - a.length);
  for (const entityKey of sortedEntityKeys) {
    const wordBoundaryRegex = new RegExp(`\\b${entityKey.replace(/-/g, '[-\\s]')}\\b`, 'i');
    if (wordBoundaryRegex.test(lowerClean)) {
      const def = SCIENTIFIC_ENTITIES[entityKey];
      primaryEntity = def.canonical;
      expandedTerms = Array.from(new Set([...expandedTerms, ...def.synonyms]));
      coreConcepts.push(def.canonical);
      break;
    }
  }

  // Match relationship / intent
  for (const rel of RELATIONSHIP_PATTERNS) {
    if (rel.regex.test(lowerClean)) {
      relationshipIntent = rel.intentLabel;
      targetTerms = Array.from(new Set([...targetTerms, ...rel.targetTerms]));
      break;
    }
  }

  // Fallbacks if no curated ontology match
  if (!primaryEntity && effectiveKeywords.length > 0) {
    // Take the most specific / longest keyword as the primary entity candidate
    const sortedByLength = [...effectiveKeywords].sort((a, b) => b.length - a.length);
    primaryEntity = sortedByLength[0];
    expandedTerms = [sortedByLength[0]];
    coreConcepts.push(sortedByLength[0]);
  }

  if (targetTerms.length === 0 && effectiveKeywords.length > 1) {
    // Remaining keywords serve as target context terms
    targetTerms = effectiveKeywords.filter((k) => k !== primaryEntity.toLowerCase());
  }

  const intent: ScientificIntent = {
    primaryEntity: primaryEntity || clean,
    relationshipIntent,
    expandedTerms: expandedTerms.length > 0 ? expandedTerms : [clean],
    targetTerms: targetTerms.length > 0 ? targetTerms : [],
    coreConcepts,
    searchMode: targetTerms.length > 0 ? 'targeted' : 'hybrid',
  };

  // 4. Construct OpenAlex targeted title & abstract query
  // Ensures candidate retrieval filters to title/abstract rather than whole-corpus body text
  let openAlexTitleAbstractQuery = clean;
  if (expandedTerms.length > 0 && targetTerms.length > 0) {
    // E.g.: ("autism" OR "autism spectrum disorder" OR "ASD") AND ("gene" OR "genes" OR "genetic")
    const entityClause = expandedTerms.slice(0, 3).map((t) => (t.includes(' ') ? `"${t}"` : t)).join(' OR ');
    const targetClause = targetTerms.slice(0, 4).map((t) => (t.includes(' ') ? `"${t}"` : t)).join(' OR ');
    openAlexTitleAbstractQuery = `(${entityClause}) AND (${targetClause})`;
  } else if (effectiveKeywords.length > 1) {
    openAlexTitleAbstractQuery = effectiveKeywords.join(' AND ');
  }

  // OpenAlex standard / semantic query fallback
  const openAlexQuery = primaryEntity && targetTerms.length > 0
    ? `${primaryEntity} ${targetTerms.slice(0, 3).join(' ')}`
    : clean;

  // 5. EuropePMC query: Boolean title/abstract clauses with stem wildcards
  let europePmcQuery = clean;
  if (isMultiKeyword && effectiveKeywords.length > 1) {
    const termClauses = effectiveKeywords.map((k) => {
      const rootStem = k.replace(/('s|s|es|ing|ed)$/, '');
      if (rootStem.length >= 3 && rootStem !== k) {
        return `(TITLE:"${k}" OR ABSTRACT:"${k}" OR TITLE:"${rootStem}*" OR ABSTRACT:"${rootStem}*")`;
      }
      return `(TITLE:"${k}" OR ABSTRACT:"${k}")`;
    });
    europePmcQuery = termClauses.join(' AND ');
  }

  // 6. Semantic Scholar query: high-entropy space-separated terms
  const semanticScholarQuery = [
    ...exactPhrases.map((p) => `"${p}"`),
    primaryEntity || '',
    ...targetTerms.slice(0, 3),
  ].filter(Boolean).join(' ');

  // 7. arXiv query: all: fields with boolean AND
  const arxivQuery = effectiveKeywords.length > 0 ? effectiveKeywords.join(' AND ') : clean;

  return {
    rawQuery: clean,
    cleanedQuery: effectiveKeywords.join(' '),
    keywords: effectiveKeywords,
    exactPhrases,
    isMultiKeyword,
    intent,
    europePmcQuery,
    semanticScholarQuery,
    openAlexQuery,
    openAlexTitleAbstractQuery,
    arxivQuery,
  };
}

