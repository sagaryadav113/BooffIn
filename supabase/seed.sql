-- ============================================================================
-- BooffIn Seed Data
-- Reproducible scientific catalog: topics, canonical papers, authors, posts
-- ============================================================================

-- 1. SEED TOPICS
INSERT INTO public.topics (id, name, slug, description, icon_name, category, followers_count, posts_count)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Neuroscience', 'neuroscience', 'Neural circuits, synaptic plasticity, cognitive architecture, and brain dynamics.', 'Brain', 'Life Sciences', 14200, 3120),
  ('a0000000-0000-0000-0000-000000000002', 'Genetics & Genomics', 'genetics-genomics', 'CRISPR base editing, spatial transcriptomics, and synthetic biology.', 'Dna', 'Life Sciences', 18900, 4520),
  ('a0000000-0000-0000-0000-000000000003', 'AI in Science', 'ai-in-science', 'Foundation models, protein structure prediction, and autonomous discovery agents.', 'Cpu', 'Computer Science & AI', 34200, 9810),
  ('a0000000-0000-0000-0000-000000000004', 'Cancer Biology', 'cancer-biology', 'Oncogenesis, tumor microenvironments, CAR-T immunotherapy, and targeted therapies.', 'Activity', 'Life Sciences', 11500, 2300),
  ('a0000000-0000-0000-0000-000000000005', 'Immunology', 'immunology', 'Adaptive immunity, immune exhaustion, cytokine storms, and mRNA therapeutics.', 'Shield', 'Life Sciences', 9800, 1940),
  ('a0000000-0000-0000-0000-000000000006', 'Quantum Computing', 'quantum-computing', 'Superconducting qubits, quantum error correction, and quantum supremacy algorithms.', 'Binary', 'Physics & Math', 15700, 3890),
  ('a0000000-0000-0000-0000-000000000007', 'Astrophysics', 'astrophysics', 'Exoplanet atmospheres, James Webb spectroscopy, gravitational waves, and cosmology.', 'Sparkles', 'Physics & Math', 22100, 5100),
  ('a0000000-0000-0000-0000-000000000008', 'Bioinformatics', 'bioinformatics', 'High-throughput sequencing analysis, proteomics pipelines, and molecular modeling.', 'Terminal', 'Computer Science & AI', 12300, 2870)
ON CONFLICT (slug) DO NOTHING;

-- 2. SEED PAPERS
INSERT INTO public.papers (
  id,
  doi,
  canonical_url,
  title,
  abstract,
  journal,
  publisher,
  publication_year,
  publication_date,
  open_access_status,
  open_access_pdf_url,
  metadata_source,
  citation_count,
  discussion_count,
  likes_count,
  saves_count
)
VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    '10.1038/s41586-024-07100-3',
    'https://doi.org/10.1038/s41586-024-07100-3',
    'De novo design of allosteric protein switches using deep learning',
    'Computational design of dynamic, multi-state proteins capable of allosteric conformation changes remains a major frontier in molecular bioengineering. Here, we present a generalized generative framework utilizing equivariant diffusion to construct programmable macromolecular switches responsive to micromolar ligand binding.',
    'Nature',
    'Springer Nature',
    2024,
    '2024-03-14',
    'gold',
    'https://www.nature.com/articles/s41586-024-07100-3.pdf',
    'crossref',
    48,
    34,
    312,
    184
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    '10.1126/science.adj9214',
    'https://doi.org/10.1126/science.adj9214',
    'Whole-brain cellular resolution connectome of Drosophila melanogaster',
    'Mapping complete synaptic wiring diagrams of complex central nervous systems is essential for decoding how neural architectures execute sensory processing, memory consolidation, and behavioral motor control. We present the full 139,255-neuron and 54.5-million-synapse connectome of an adult female fruit fly.',
    'Science',
    'AAAS',
    2024,
    '2024-04-18',
    'gold',
    'https://www.science.org/doi/10.1126/science.adj9214',
    'crossref',
    112,
    89,
    642,
    490
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    '10.1016/j.cell.2024.02.019',
    'https://doi.org/10.1016/j.cell.2024.02.019',
    'Single-cell spatial transcriptomics reveals subclonal clonal architecture in glioblastoma recurrence',
    'Intra-tumoral heterogeneity and therapeutic pressure drive lethal recurrence in glioblastoma. Using sub-micrometer spatial transcriptomics combined with longitudinal patient-derived organoids, we uncover a quiescent mesenchymal stem-like niche responsible for radio-resistance.',
    'Cell',
    'Cell Press / Elsevier',
    2024,
    '2024-02-28',
    'hybrid',
    'https://www.cell.com/cell/fulltext/S0092-8674(24)00120-X',
    'crossref',
    29,
    18,
    189,
    95
  ),
  (
    'b0000000-0000-0000-0000-000000000004',
    '10.1101/2024.05.10.593501',
    'https://doi.org/10.1101/2024.05.10.593501',
    'Self-supervised representation learning for atomic-scale crystal property prediction',
    'Discovering novel inorganic crystalline materials for solid-state batteries and photovoltaic conversion is constrained by expensive density functional theory calculations. We introduce CrystalBERT, a pre-trained geometric graph transformer that achieves state-of-the-art formation energy predictions across the Materials Project catalog.',
    'bioRxiv',
    'Cold Spring Harbor Laboratory',
    2024,
    '2024-05-10',
    'preprint',
    'https://www.biorxiv.org/content/10.1101/2024.05.10.593501v1.full.pdf',
    'biorxiv',
    8,
    22,
    97,
    64
  )
ON CONFLICT (id) DO NOTHING;

-- 3. SEED PAPER AUTHORS
INSERT INTO public.paper_authors (paper_id, author_name, author_order, external_author_id, affiliation)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Elena Rostova', 1, '0000-0002-1825-0097', 'Broad Institute of MIT and Harvard'),
  ('b0000000-0000-0000-0000-000000000001', 'David Baker', 2, '0000-0001-7896-1234', 'Institute for Protein Design, UW'),
  ('b0000000-0000-0000-0000-000000000002', 'Marcus Thorne', 1, '0000-0003-9182-4412', 'Max Planck Institute for Brain Research'),
  ('b0000000-0000-0000-0000-000000000002', 'Sven Dorkenwald', 2, '0000-0002-4512-8901', 'Princeton Neuroscience Institute'),
  ('b0000000-0000-0000-0000-000000000003', 'Sarah Lin', 1, '0000-0001-6643-9821', 'Stanford School of Medicine'),
  ('b0000000-0000-0000-0000-000000000004', 'Alex Chen', 1, '0000-0002-3341-7810', 'Oxford Department of Computer Science')
ON CONFLICT (paper_id, author_order) DO NOTHING;

-- 4. SEED PAPER TOPICS
INSERT INTO public.paper_topics (paper_id, topic_id)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003'), -- AI in Science
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002'), -- Genetics & Genomics
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001'), -- Neuroscience
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004'), -- Cancer Biology
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003')  -- AI in Science
ON CONFLICT (paper_id, topic_id) DO NOTHING;
