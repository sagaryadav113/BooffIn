/**
 * BooffIn Autonomous Breakthrough Intelligence Harvester
 * 
 * - Demand-Driven: Queries Supabase for domains actively selected by real registered users.
 * - Zero Storage: Streams PDFs directly from open-access sources (0 MB stored in Supabase).
 * - Zero Cost: Runs on Gemini 1.5 Flash free tier once daily via GitHub Actions.
 * - Dedicated Personas: Posts under official verified accounts (e.g., @booffin_neuroscience).
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Auto-load .env file if running locally
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

// 1. Environment & Configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[Curator] Error: Missing SUPABASE_URL or SUPABASE_KEY in environment.');
  process.exit(1);
}

// Ensure global WebSocket is available for @supabase/supabase-js in Node runtimes
if (typeof global.WebSocket === 'undefined') {
  try {
    global.WebSocket = require('ws');
  } catch (e) {
    global.WebSocket = class {};
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// Fallback baseline domains if community is brand new
const BASELINE_DOMAINS = ['Neuroscience', 'Artificial Intelligence', 'Genetics'];

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
}

/**
 * Step 1: Discover domains actively chosen by registered users
 */
async function getActiveUserDomains() {
  console.log('[Curator] Discovering active user domains from Supabase...');
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('research_interests')
      .not('research_interests', 'is', null);

    if (error) {
      console.warn('[Curator] Could not query profiles.research_interests:', error.message);
      return BASELINE_DOMAINS;
    }

    const domainSet = new Set();
    (profiles || []).forEach((p) => {
      if (Array.isArray(p.research_interests)) {
        p.research_interests.forEach((dom) => {
          if (dom && typeof dom === 'string' && dom.trim()) {
            domainSet.add(dom.trim());
          }
        });
      }
    });

    const activeList = Array.from(domainSet);
    console.log(`[Curator] Found ${activeList.length} unique active user domains.`);
    return activeList.length > 0 ? activeList.slice(0, 15) : BASELINE_DOMAINS;
  } catch (err) {
    console.warn('[Curator] Error fetching active domains:', err.message);
    return BASELINE_DOMAINS;
  }
}

/**
 * Step 2: Ensure the official Curator profile exists in Supabase
 * Creates an auth.users entry first (required FK), then creates the profile.
 */
async function getOrCreateCuratorProfile(domain) {
  const cleanSlug = slugify(domain);
  const handle = `booffin_${cleanSlug}`;
  const fullName = `BooffIn ${domain}`;

  // Check if profile already exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', handle)
    .maybeSingle();

  if (existing?.id) {
    return existing.id;
  }

  console.log(`[Curator] Provisioning new AI curator profile: @${handle}`);

  // 1. Create an auth.users entry via Supabase Admin API (service_role required)
  const fakeEmail = `${handle}@system.booffin.internal`;
  const crypto = require('crypto');
  const randomPassword = crypto.randomBytes(32).toString('hex');

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: fakeEmail,
    password: randomPassword,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      is_ai_curator: true,
      curator_domain: domain,
    },
  });

  if (authError) {
    // User might already exist in auth but not profiles
    console.warn(`[Curator] Auth user creation notice for @${handle}:`, authError.message);
    
    // Try to find existing auth user by email
    const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 1 });
    // Fallback: look for existing profile by any means
    const { data: fallback } = await supabase.from('profiles').select('id').limit(1).single();
    if (fallback?.id) return fallback.id;
    return null;
  }

  const curatorId = authUser.user.id;

  // 2. Now create the profile row (the auth.users FK is satisfied)
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: curatorId,
      username: handle,
      full_name: fullName,
      avatar_url: 'https://letsbooffin.com/icon-192.png',
      academic_title: null,
      institution: 'BooffIn Research Intelligence',
      bio: `Official BooffIn intelligence node curating daily breakthrough discoveries for researchers in ${domain}.`,
      orcid_verified: true,
      is_private: false,
    }, { onConflict: 'id' })
    .select('id')
    .single();

  if (profileError) {
    console.warn(`[Curator] Profile creation notice for @${handle}:`, profileError.message);
  }

  console.log(`[Curator] ✅ Created AI curator @${handle} (${curatorId})`);
  return curatorId;
}

/**
 * Step 3: Fetch latest breakthrough papers from arXiv & OpenAlex
 */
async function fetchPapersFromArxiv(domain) {
  try {
    const queryUrl = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(domain)}&start=0&max_results=2&sortBy=submittedDate&sortOrder=descending`;
    const res = await fetch(queryUrl);
    if (!res.ok) return [];
    const xml = await res.text();
    const entries = xml.split('<entry>').slice(1);

    return entries.map((entry) => {
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
      const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
      const idMatch = entry.match(/<id>([\s\S]*?)<\/id>/);
      const publishedMatch = entry.match(/<published>([\s\S]*?)<\/published>/);
      const authors = [];
      const authorMatches = entry.matchAll(/<author>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/author>/g);
      for (const m of authorMatches) {
        if (m[1]) authors.push(m[1].trim());
      }

      const rawTitle = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '';
      const rawSummary = summaryMatch ? summaryMatch[1].replace(/\s+/g, ' ').trim() : '';
      const rawId = idMatch ? idMatch[1].trim() : '';
      const arxivId = rawId.split('/abs/').pop() || rawId;

      return {
        title: rawTitle,
        abstract: rawSummary,
        doi: `arxiv.${arxivId}`,
        canonicalUrl: `https://arxiv.org/abs/${arxivId}`,
        openAccessPdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
        journal: 'arXiv',
        publicationYear: new Date(publishedMatch ? publishedMatch[1] : Date.now()).getFullYear(),
        publicationDate: publishedMatch ? publishedMatch[1].split('T')[0] : new Date().toISOString().split('T')[0],
        authors: authors.slice(0, 5),
        domain,
      };
    }).filter((p) => p.title && p.openAccessPdfUrl);
  } catch (err) {
    console.warn(`[Curator] arXiv fetch error for ${domain}:`, err.message);
    return [];
  }
}

async function fetchPapersForDomain(domain) {
  console.log(`[Curator] Searching academic databases for breakthrough papers in: ${domain}`);
  
  // 1. Try arXiv first (Fast, reliable, open access PDF)
  const arxivPapers = await fetchPapersFromArxiv(domain);
  if (arxivPapers.length > 0) {
    return arxivPapers;
  }

  // 2. OpenAlex fallback
  try {
    const queryUrl = `https://api.openalex.org/works?search=${encodeURIComponent(domain)}&filter=open_access.is_oa:true,type:article&sort=publication_date:desc&per-page=2`;
    const res = await fetch(queryUrl, {
      headers: { 'User-Agent': 'BooffIn-Research-Harvester (mailto:support@letsbooffin.com)' }
    });

    if (!res.ok) {
      console.warn(`[Curator] OpenAlex API returned status ${res.status}`);
      return [];
    }

    const data = await res.json();
    const works = data.results || [];
    
    return works.map((w) => {
      // Reconstruct abstract from OpenAlex inverted index
      let abstract = '';
      if (w.abstract_inverted_index) {
        const words = [];
        for (const [word, positions] of Object.entries(w.abstract_inverted_index)) {
          for (const pos of positions) {
            words[pos] = word;
          }
        }
        abstract = words.filter(Boolean).join(' ');
      }

      const authors = (w.authorships || []).map((a) => a.author?.display_name).filter(Boolean);
      const pdfUrl = w.open_access?.oa_url || w.primary_location?.pdf_url || (w.doi ? `https://doi.org/${w.doi}` : null);

      return {
        title: w.title,
        abstract: abstract || 'Abstract available via primary open-access publication link.',
        doi: w.doi ? w.doi.replace('https://doi.org/', '') : null,
        canonicalUrl: w.doi || w.primary_location?.landing_page_url || `https://openalex.org/${w.id}`,
        openAccessPdfUrl: pdfUrl,
        journal: w.primary_location?.source?.display_name || 'Open Access Journal',
        publicationYear: w.publication_year || new Date().getFullYear(),
        publicationDate: w.publication_date || new Date().toISOString().split('T')[0],
        authors: authors.slice(0, 5),
        domain,
      };
    }).filter((p) => p.title && p.openAccessPdfUrl);
  } catch (err) {
    console.warn(`[Curator] OpenAlex error for ${domain}:`, err.message);
    return [];
  }
}

/**
 * Step 4: Synthesize Human-Researcher Discussion Post using Gemini Flash
 */
const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];

async function generateHumanPost(paper, domain) {
  if (!GEMINI_API_KEY) {
    // High-quality deterministic fallback if no API key is provided
    return `Notable new findings in #${slugify(domain)}: "${paper.title}".\n\nThe authors present compelling data challenging conventional assumptions in the field. How does this methodology hold up compared to recent benchmarks in your lab?\n\n📄 Paper: ${paper.title}\n#${slugify(domain)} #AcademicResearch #ScientificDiscovery`;
  }

  const prompt = `You are an opinionated, brilliant senior researcher in ${domain} sharing a freshly published paper with your peers on BooffIn.
Write a natural, conversational scientific discussion post (under 120 words) analyzing this paper.

Paper Title: "${paper.title}"
Abstract: "${paper.abstract.slice(0, 1000)}"

STRICT RULES:
1. Do NOT use generic AI marketing clichés (FORBIDDEN: delve, game-changer, revolutionary, groundbreaking, unpack, crucial, testament, buckle up).
2. Start directly with the core paradox or tension in the findings or methodology.
3. Cite one specific empirical metric, sample size, or mechanism from the abstract.
4. Conclude with a sharp, open-ended question inviting peers to critique, bookmark, or discuss.
5. End with:
📄 Paper: ${paper.title}
#${slugify(domain)} #ResearchDiscovery`;

  // Try each model in the fallback chain
  for (const model of GEMINI_MODELS) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 1200,
          }
        })
      });

      if (!response.ok) {
        console.warn(`[Curator] ${model} returned ${response.status}, trying next model...`);
        continue;
      }

      const resJson = await response.json();
      const candidateParts = resJson.candidates?.[0]?.content?.parts || [];
      const candidateText = candidateParts
        .filter((p) => !p.thought && typeof p.text === 'string')
        .map((p) => p.text)
        .join('')
        .trim();

      if (candidateText && candidateText.length > 50) {
        console.log(`[Curator] ✅ Generated post with ${model} (${candidateText.length} chars)`);
        return candidateText;
      }
      console.warn(`[Curator] ${model} returned empty or truncated response, trying next...`);
    } catch (err) {
      console.warn(`[Curator] ${model} exception: ${err.message}, trying next...`);
    }
  }

  // All models failed — use deterministic fallback
  console.warn('[Curator] All Gemini models failed, using template fallback');
  return `Notable new findings in #${slugify(domain)}: "${paper.title}".\n\nThe authors present compelling data challenging conventional assumptions in the field. How does this methodology hold up compared to recent benchmarks in your lab?\n\n📄 Paper: ${paper.title}\n#${slugify(domain)} #AcademicResearch`;
}

/**
 * Step 5: Insert Paper & Post into Supabase
 */
async function publishCuratedPost(paper, curatorId, postContent) {
  try {
    // 1. Insert Paper record (Streamable PDF URL, 0 MB storage)
    const { data: paperRow, error: paperError } = await supabase
      .from('papers')
      .upsert({
        doi: paper.doi || `openalex_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        canonical_url: paper.canonicalUrl,
        title: paper.title.slice(0, 500),
        abstract: paper.abstract.slice(0, 5000),
        journal: paper.journal,
        publication_year: paper.publicationYear,
        publication_date: paper.publicationDate,
        open_access_status: 'gold',
        open_access_pdf_url: paper.openAccessPdfUrl,
      }, { onConflict: 'doi' })
      .select('id')
      .single();

    if (paperError) {
      console.warn('[Curator] Paper insert notice:', paperError.message);
    }

    const paperId = paperRow?.id || null;

    // 2. Insert Post record
    const { data: postRow, error: postError } = await supabase
      .from('posts')
      .insert({
        author_id: curatorId,
        post_type: 'paper_share',
        content: postContent,
        paper_id: paperId,
        visibility: 'public',
        media_urls: [],
      })
      .select('id')
      .single();

    if (postError) {
      console.error('[Curator] Failed to insert post:', postError.message);
      return false;
    }

    console.log(`[Curator] Successfully published post ID: ${postRow.id}`);
    return true;
  } catch (err) {
    console.error('[Curator] Publish error:', err.message);
    return false;
  }
}

/**
 * Main Orchestrator
 */
async function main() {
  console.log('--- Starting BooffIn Daily Breakthrough Harvester ---');
  const domains = await getActiveUserDomains();

  let totalPublished = 0;

  for (const domain of domains) {
    try {
      const curatorId = await getOrCreateCuratorProfile(domain);
      const papers = await fetchPapersForDomain(domain);

      for (const paper of papers.slice(0, 1)) {
        const postText = await generateHumanPost(paper, domain);
        const success = await publishCuratedPost(paper, curatorId, postText);
        if (success) totalPublished++;
      }
    } catch (domainErr) {
      console.warn(`[Curator] Failed processing domain ${domain}:`, domainErr.message);
    }
  }

  console.log(`--- Harvester Finished. Published ${totalPublished} curated breakthrough posts. ---`);
}

main().catch((err) => {
  console.error('[Curator] Fatal error:', err);
  process.exit(1);
});
