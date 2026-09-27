/**
 * BOFFIN FULL RESEARCH TAXONOMY (OECD Frascati + BoffIn Extended Ontology)
 * 6 Families → 42 FORD Fields → 210 Disciplines → 1,050 Specialized Subfields
 * + Cross-Domain / Interdisciplinary Layer
 */

export interface TaxonomyItem {
  id: string;
  name: string;
  type: 'family' | 'field' | 'discipline' | 'subfield' | 'interdisciplinary';
  familyName: string;
  fieldName?: string;
  disciplineName?: string;
  hierarchy: string; // e.g. "Computer and information sciences › Artificial intelligence"
}

export interface ResearchFamily {
  id: string;
  name: string;
  shortName: string;
  fields: ResearchField[];
}

export interface ResearchField {
  id: string;
  name: string;
  familyId: string;
  familyName: string;
  disciplines: ResearchDiscipline[];
}

export interface ResearchDiscipline {
  id: string;
  name: string;
  fieldId: string;
  fieldName: string;
  familyName: string;
  subfields: string[];
}

export interface InterdisciplinaryGroup {
  name: string;
  topics: string[];
}

/**
 * 10 representative fields across popular domains for quick initial discovery on onboarding
 */
export const POPULAR_DISCIPLINES: string[] = [
  'Artificial Intelligence',
  'Neuroscience',
  'Molecular & Cell Biology',
  'Genetics & Genomics',
  'Biomedical Engineering',
  'Quantum Physics',
  'Clinical Medicine',
  'Data Science',
  'Economics & Finance',
  'Psychology & Cognitive Science',
];

export const RESEARCH_TAXONOMY_FAMILIES: ResearchFamily[] = [
  // =========================================================================
  // 1. NATURAL SCIENCES
  // =========================================================================
  {
    id: '1',
    name: 'Natural sciences',
    shortName: 'Natural Sciences',
    fields: [
      {
        id: '1.1',
        name: 'Mathematics',
        familyId: '1',
        familyName: 'Natural sciences',
        disciplines: [
          {
            id: '1.1-1',
            name: 'Pure mathematics',
            fieldId: '1.1',
            fieldName: 'Mathematics',
            familyName: 'Natural sciences',
            subfields: ['Algebra', 'Number theory', 'Geometry and topology', 'Mathematical analysis', 'Logic and foundations'],
          },
          {
            id: '1.1-2',
            name: 'Applied mathematics',
            fieldId: '1.1',
            fieldName: 'Mathematics',
            familyName: 'Natural sciences',
            subfields: ['Differential equations', 'Optimization', 'Operations research', 'Applied dynamical systems', 'Mathematical methods in science'],
          },
          {
            id: '1.1-3',
            name: 'Probability and statistics',
            fieldId: '1.1',
            fieldName: 'Mathematics',
            familyName: 'Natural sciences',
            subfields: ['Statistical inference', 'Bayesian statistics', 'Stochastic processes', 'Multivariate statistics', 'Experimental design'],
          },
          {
            id: '1.1-4',
            name: 'Computational mathematics',
            fieldId: '1.1',
            fieldName: 'Mathematics',
            familyName: 'Natural sciences',
            subfields: ['Numerical analysis', 'Scientific computing', 'Numerical linear algebra', 'Computational optimization', 'High-performance numerical methods'],
          },
          {
            id: '1.1-5',
            name: 'Mathematical modelling',
            fieldId: '1.1',
            fieldName: 'Mathematics',
            familyName: 'Natural sciences',
            subfields: ['Dynamical systems modelling', 'Mechanistic modelling', 'Stochastic modelling', 'Multiscale modelling', 'Inverse modelling'],
          },
        ],
      },
      {
        id: '1.2',
        name: 'Computer and information sciences',
        familyId: '1',
        familyName: 'Natural sciences',
        disciplines: [
          {
            id: '1.2-1',
            name: 'Computer science',
            fieldId: '1.2',
            fieldName: 'Computer and information sciences',
            familyName: 'Natural sciences',
            subfields: ['Algorithms and data structures', 'Programming languages', 'Distributed systems', 'Databases', 'Computer architecture'],
          },
          {
            id: '1.2-2',
            name: 'Artificial intelligence',
            fieldId: '1.2',
            fieldName: 'Computer and information sciences',
            familyName: 'Natural sciences',
            subfields: ['Machine learning', 'Deep learning', 'Reinforcement learning', 'Generative models', 'Knowledge representation'],
          },
          {
            id: '1.2-3',
            name: 'Data science',
            fieldId: '1.2',
            fieldName: 'Computer and information sciences',
            familyName: 'Natural sciences',
            subfields: ['Data mining', 'Statistical learning', 'Data engineering', 'Data visualization', 'Scientific data analysis'],
          },
          {
            id: '1.2-4',
            name: 'Information science',
            fieldId: '1.2',
            fieldName: 'Computer and information sciences',
            familyName: 'Natural sciences',
            subfields: ['Information retrieval', 'Information theory', 'Knowledge management', 'Information systems', 'Digital information organization'],
          },
          {
            id: '1.2-5',
            name: 'Computational science',
            fieldId: '1.2',
            fieldName: 'Computer and information sciences',
            familyName: 'Natural sciences',
            subfields: ['Scientific computing', 'Simulation', 'High-performance computing', 'Numerical experiments', 'Computational workflows'],
          },
        ],
      },
      {
        id: '1.3',
        name: 'Physical sciences',
        familyId: '1',
        familyName: 'Natural sciences',
        disciplines: [
          {
            id: '1.3-1',
            name: 'Physics',
            fieldId: '1.3',
            fieldName: 'Physical sciences',
            familyName: 'Natural sciences',
            subfields: ['Classical mechanics', 'Electromagnetism', 'Thermodynamics', 'Statistical physics', 'Relativity'],
          },
          {
            id: '1.3-2',
            name: 'Astronomy and astrophysics',
            fieldId: '1.3',
            fieldName: 'Physical sciences',
            familyName: 'Natural sciences',
            subfields: ['Stellar astrophysics', 'Galactic astronomy', 'Extragalactic astronomy', 'Cosmology', 'Exoplanet science'],
          },
          {
            id: '1.3-3',
            name: 'Condensed-matter physics',
            fieldId: '1.3',
            fieldName: 'Physical sciences',
            familyName: 'Natural sciences',
            subfields: ['Quantum materials', 'Soft matter', 'Semiconductors', 'Magnetism', 'Superconductivity'],
          },
          {
            id: '1.3-4',
            name: 'Nuclear and particle physics',
            fieldId: '1.3',
            fieldName: 'Physical sciences',
            familyName: 'Natural sciences',
            subfields: ['Nuclear structure', 'Nuclear reactions', 'Particle phenomenology', 'Detector physics', 'Neutrino physics'],
          },
          {
            id: '1.3-5',
            name: 'Quantum science',
            fieldId: '1.3',
            fieldName: 'Physical sciences',
            familyName: 'Natural sciences',
            subfields: ['Quantum information', 'Quantum computing', 'Quantum optics', 'Quantum sensing', 'Quantum materials'],
          },
        ],
      },
      {
        id: '1.4',
        name: 'Chemical sciences',
        familyId: '1',
        familyName: 'Natural sciences',
        disciplines: [
          {
            id: '1.4-1',
            name: 'Organic chemistry',
            fieldId: '1.4',
            fieldName: 'Chemical sciences',
            familyName: 'Natural sciences',
            subfields: ['Synthetic organic chemistry', 'Natural products chemistry', 'Organic reaction mechanisms', 'Stereochemistry', 'Heterocyclic chemistry'],
          },
          {
            id: '1.4-2',
            name: 'Inorganic chemistry',
            fieldId: '1.4',
            fieldName: 'Chemical sciences',
            familyName: 'Natural sciences',
            subfields: ['Coordination chemistry', 'Organometallic chemistry', 'Bioinorganic chemistry', 'Solid-state chemistry', 'Inorganic materials'],
          },
          {
            id: '1.4-3',
            name: 'Physical and theoretical chemistry',
            fieldId: '1.4',
            fieldName: 'Chemical sciences',
            familyName: 'Natural sciences',
            subfields: ['Chemical thermodynamics', 'Chemical kinetics', 'Quantum chemistry', 'Molecular spectroscopy', 'Computational chemistry'],
          },
          {
            id: '1.4-4',
            name: 'Analytical chemistry',
            fieldId: '1.4',
            fieldName: 'Chemical sciences',
            familyName: 'Natural sciences',
            subfields: ['Chromatography', 'Mass spectrometry', 'Spectroscopy', 'Electroanalysis', 'Chemical sensing'],
          },
          {
            id: '1.4-5',
            name: 'Chemical biology and biochemistry',
            fieldId: '1.4',
            fieldName: 'Chemical sciences',
            familyName: 'Natural sciences',
            subfields: ['Enzymology', 'Protein biochemistry', 'Chemical genetics', 'Bioorthogonal chemistry', 'Molecular biochemistry'],
          },
        ],
      },
      {
        id: '1.5',
        name: 'Earth and related environmental sciences',
        familyId: '1',
        familyName: 'Natural sciences',
        disciplines: [
          {
            id: '1.5-1',
            name: 'Geology',
            fieldId: '1.5',
            fieldName: 'Earth and related environmental sciences',
            familyName: 'Natural sciences',
            subfields: ['Sedimentology', 'Stratigraphy', 'Structural geology', 'Petrology', 'Paleontology'],
          },
          {
            id: '1.5-2',
            name: 'Geophysics',
            fieldId: '1.5',
            fieldName: 'Earth and related environmental sciences',
            familyName: 'Natural sciences',
            subfields: ['Seismology', 'Geomagnetism', 'Geodesy', 'Geophysical imaging', 'Tectonophysics'],
          },
          {
            id: '1.5-3',
            name: 'Geochemistry',
            fieldId: '1.5',
            fieldName: 'Earth and related environmental sciences',
            familyName: 'Natural sciences',
            subfields: ['Isotope geochemistry', 'Organic geochemistry', 'Aqueous geochemistry', 'Biogeochemistry', 'Geochemical modelling'],
          },
          {
            id: '1.5-4',
            name: 'Atmospheric and climate science',
            fieldId: '1.5',
            fieldName: 'Earth and related environmental sciences',
            familyName: 'Natural sciences',
            subfields: ['Meteorology', 'Climatology', 'Atmospheric chemistry', 'Climate dynamics', 'Climate modelling'],
          },
          {
            id: '1.5-5',
            name: 'Ocean and hydrological sciences',
            fieldId: '1.5',
            fieldName: 'Earth and related environmental sciences',
            familyName: 'Natural sciences',
            subfields: ['Oceanography', 'Hydrology', 'Limnology', 'Marine geophysics', 'Water-cycle science'],
          },
        ],
      },
      {
        id: '1.6',
        name: 'Biological sciences',
        familyId: '1',
        familyName: 'Natural sciences',
        disciplines: [
          {
            id: '1.6-1',
            name: 'Molecular and cell biology',
            fieldId: '1.6',
            fieldName: 'Biological sciences',
            familyName: 'Natural sciences',
            subfields: ['Molecular biology', 'Cell signaling', 'Organelle biology', 'Membrane biology', 'Cell cycle and death'],
          },
          {
            id: '1.6-2',
            name: 'Genetics and genomics',
            fieldId: '1.6',
            fieldName: 'Biological sciences',
            familyName: 'Natural sciences',
            subfields: ['Molecular genetics', 'Human genetics', 'Population genetics', 'Functional genomics', 'Comparative genomics'],
          },
          {
            id: '1.6-3',
            name: 'Microbiology and immunology',
            fieldId: '1.6',
            fieldName: 'Biological sciences',
            familyName: 'Natural sciences',
            subfields: ['Bacteriology', 'Virology', 'Mycology and parasitology', 'Microbial ecology', 'Immunology'],
          },
          {
            id: '1.6-4',
            name: 'Neuroscience and physiology',
            fieldId: '1.6',
            fieldName: 'Biological sciences',
            familyName: 'Natural sciences',
            subfields: ['Cellular neuroscience', 'Systems neuroscience', 'Cognitive neuroscience', 'Neurophysiology', 'Molecular physiology'],
          },
          {
            id: '1.6-5',
            name: 'Ecology, evolution and biodiversity',
            fieldId: '1.6',
            fieldName: 'Biological sciences',
            familyName: 'Natural sciences',
            subfields: ['Ecology', 'Evolutionary biology', 'Conservation biology', 'Biodiversity science', 'Evolutionary ecology'],
          },
        ],
      },
      {
        id: '1.7',
        name: 'Other natural sciences',
        familyId: '1',
        familyName: 'Natural sciences',
        disciplines: [
          {
            id: '1.7-1',
            name: 'Nanoscience',
            fieldId: '1.7',
            fieldName: 'Other natural sciences',
            familyName: 'Natural sciences',
            subfields: ['Nanomaterials', 'Nanocharacterization', 'Nanophotonics', 'Nanobiotechnology', 'Nanoscale fabrication'],
          },
          {
            id: '1.7-2',
            name: 'Complex systems science',
            fieldId: '1.7',
            fieldName: 'Other natural sciences',
            familyName: 'Natural sciences',
            subfields: ['Complex networks', 'Emergence', 'Self-organization', 'Collective behavior', 'Nonlinear complex systems'],
          },
          {
            id: '1.7-3',
            name: 'Systems science',
            fieldId: '1.7',
            fieldName: 'Other natural sciences',
            familyName: 'Natural sciences',
            subfields: ['Systems theory', 'Systems dynamics', 'Systems modelling', 'Systems analysis', 'Systems-of-systems science'],
          },
          {
            id: '1.7-4',
            name: 'Quantitative natural sciences',
            fieldId: '1.7',
            fieldName: 'Other natural sciences',
            familyName: 'Natural sciences',
            subfields: ['Quantitative biology', 'Quantitative physics', 'Quantitative chemistry', 'Scientific statistics', 'Data-driven natural science'],
          },
          {
            id: '1.7-5',
            name: 'Emerging interdisciplinary natural sciences',
            fieldId: '1.7',
            fieldName: 'Other natural sciences',
            familyName: 'Natural sciences',
            subfields: ['Cross-scale science', 'Planetary health science', 'Synthetic ecosystems', 'Science of science', 'New interdisciplinary methods'],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // 2. ENGINEERING AND TECHNOLOGY
  // =========================================================================
  {
    id: '2',
    name: 'Engineering and technology',
    shortName: 'Engineering & Tech',
    fields: [
      {
        id: '2.1',
        name: 'Civil engineering',
        familyId: '2',
        familyName: 'Engineering and technology',
        disciplines: [
          {
            id: '2.1-1',
            name: 'Structural engineering',
            fieldId: '2.1',
            fieldName: 'Civil engineering',
            familyName: 'Engineering and technology',
            subfields: ['Structural analysis', 'Earthquake engineering', 'Steel structures', 'Concrete structures', 'Structural health monitoring'],
          },
          {
            id: '2.1-2',
            name: 'Geotechnical engineering',
            fieldId: '2.1',
            fieldName: 'Civil engineering',
            familyName: 'Engineering and technology',
            subfields: ['Soil mechanics', 'Rock mechanics', 'Foundation engineering', 'Geotechnical earthquake engineering', 'Geosynthetics'],
          },
          {
            id: '2.1-3',
            name: 'Transportation engineering',
            fieldId: '2.1',
            fieldName: 'Civil engineering',
            familyName: 'Engineering and technology',
            subfields: ['Traffic engineering', 'Transport planning', 'Highway engineering', 'Rail engineering', 'Intelligent transportation systems'],
          },
          {
            id: '2.1-4',
            name: 'Water resources engineering',
            fieldId: '2.1',
            fieldName: 'Civil engineering',
            familyName: 'Engineering and technology',
            subfields: ['Hydraulic engineering', 'Hydrology engineering', 'Flood modelling', 'Water systems', 'Coastal and river engineering'],
          },
          {
            id: '2.1-5',
            name: 'Construction and infrastructure engineering',
            fieldId: '2.1',
            fieldName: 'Civil engineering',
            familyName: 'Engineering and technology',
            subfields: ['Construction management', 'Infrastructure asset management', 'Building engineering', 'Construction automation', 'Sustainable construction'],
          },
        ],
      },
      {
        id: '2.2',
        name: 'Electrical engineering, electronic engineering, information engineering',
        familyId: '2',
        familyName: 'Engineering and technology',
        disciplines: [
          {
            id: '2.2-1',
            name: 'Electrical engineering',
            fieldId: '2.2',
            fieldName: 'Electrical engineering, electronic engineering, information engineering',
            familyName: 'Engineering and technology',
            subfields: ['Power systems', 'Power electronics', 'Electrical machines', 'High-voltage engineering', 'Smart grids'],
          },
          {
            id: '2.2-2',
            name: 'Electronic engineering',
            fieldId: '2.2',
            fieldName: 'Electrical engineering, electronic engineering, information engineering',
            familyName: 'Engineering and technology',
            subfields: ['Analog electronics', 'Digital electronics', 'Embedded electronics', 'RF electronics', 'Electronic instrumentation'],
          },
          {
            id: '2.2-3',
            name: 'Information and communication engineering',
            fieldId: '2.2',
            fieldName: 'Electrical engineering, electronic engineering, information engineering',
            familyName: 'Engineering and technology',
            subfields: ['Telecommunications', 'Wireless communications', 'Optical communications', 'Network engineering', 'Information systems engineering'],
          },
          {
            id: '2.2-4',
            name: 'Signal and control engineering',
            fieldId: '2.2',
            fieldName: 'Electrical engineering, electronic engineering, information engineering',
            familyName: 'Engineering and technology',
            subfields: ['Signal processing', 'Control theory', 'Robust control', 'Estimation and filtering', 'Autonomous control'],
          },
          {
            id: '2.2-5',
            name: 'Microelectronics and semiconductor engineering',
            fieldId: '2.2',
            fieldName: 'Electrical engineering, electronic engineering, information engineering',
            familyName: 'Engineering and technology',
            subfields: ['Integrated circuits', 'VLSI design', 'Semiconductor devices', 'MEMS', 'Chip fabrication'],
          },
        ],
      },
      {
        id: '2.3',
        name: 'Mechanical engineering',
        familyId: '2',
        familyName: 'Engineering and technology',
        disciplines: [
          {
            id: '2.3-1',
            name: 'Mechanical engineering',
            fieldId: '2.3',
            fieldName: 'Mechanical engineering',
            familyName: 'Engineering and technology',
            subfields: ['Machine design', 'Thermal engineering', 'Fluid mechanics', 'Solid mechanics', 'Computational mechanics'],
          },
          {
            id: '2.3-2',
            name: 'Mechatronics',
            fieldId: '2.3',
            fieldName: 'Mechanical engineering',
            familyName: 'Engineering and technology',
            subfields: ['Sensors and actuators', 'Embedded control', 'Industrial automation', 'Robotic mechanisms', 'Cyber-physical systems'],
          },
          {
            id: '2.3-3',
            name: 'Robotics',
            fieldId: '2.3',
            fieldName: 'Mechanical engineering',
            familyName: 'Engineering and technology',
            subfields: ['Robot perception', 'Motion planning', 'Manipulation', 'Autonomous robots', 'Human-robot interaction'],
          },
          {
            id: '2.3-4',
            name: 'Manufacturing engineering',
            fieldId: '2.3',
            fieldName: 'Mechanical engineering',
            familyName: 'Engineering and technology',
            subfields: ['Manufacturing processes', 'Additive manufacturing', 'CNC and machining', 'Digital manufacturing', 'Manufacturing automation'],
          },
          {
            id: '2.3-5',
            name: 'Aerospace and automotive engineering',
            fieldId: '2.3',
            fieldName: 'Mechanical engineering',
            familyName: 'Engineering and technology',
            subfields: ['Aircraft engineering', 'Spacecraft systems', 'Propulsion', 'Vehicle dynamics', 'Autonomous vehicles'],
          },
        ],
      },
      {
        id: '2.4',
        name: 'Chemical engineering',
        familyId: '2',
        familyName: 'Engineering and technology',
        disciplines: [
          {
            id: '2.4-1',
            name: 'Chemical process engineering',
            fieldId: '2.4',
            fieldName: 'Chemical engineering',
            familyName: 'Engineering and technology',
            subfields: ['Process design', 'Process simulation', 'Separation processes', 'Process intensification', 'Process safety'],
          },
          {
            id: '2.4-2',
            name: 'Reaction engineering',
            fieldId: '2.4',
            fieldName: 'Chemical engineering',
            familyName: 'Engineering and technology',
            subfields: ['Reaction kinetics', 'Catalysis', 'Reactor design', 'Multiphase reactions', 'Microreactors'],
          },
          {
            id: '2.4-3',
            name: 'Biochemical engineering',
            fieldId: '2.4',
            fieldName: 'Chemical engineering',
            familyName: 'Engineering and technology',
            subfields: ['Bioreactor engineering', 'Fermentation', 'Downstream processing', 'Bioprocess modelling', 'Cell culture engineering'],
          },
          {
            id: '2.4-4',
            name: 'Pharmaceutical engineering',
            fieldId: '2.4',
            fieldName: 'Chemical engineering',
            familyName: 'Engineering and technology',
            subfields: ['Drug manufacturing', 'Formulation engineering', 'Process validation', 'Continuous pharmaceutical manufacturing', 'Pharmaceutical process control'],
          },
          {
            id: '2.4-5',
            name: 'Process systems engineering',
            fieldId: '2.4',
            fieldName: 'Chemical engineering',
            familyName: 'Engineering and technology',
            subfields: ['Process optimization', 'Process control', 'Process integration', 'Process informatics', 'Digital process twins'],
          },
        ],
      },
      {
        id: '2.5',
        name: 'Materials engineering',
        familyId: '2',
        familyName: 'Engineering and technology',
        disciplines: [
          {
            id: '2.5-1',
            name: 'Materials science',
            fieldId: '2.5',
            fieldName: 'Materials engineering',
            familyName: 'Engineering and technology',
            subfields: ['Materials characterization', 'Materials thermodynamics', 'Materials processing', 'Materials failure', 'Materials modelling'],
          },
          {
            id: '2.5-2',
            name: 'Metallurgical engineering',
            fieldId: '2.5',
            fieldName: 'Materials engineering',
            familyName: 'Engineering and technology',
            subfields: ['Physical metallurgy', 'Extractive metallurgy', 'Alloy design', 'Corrosion', 'Metal processing'],
          },
          {
            id: '2.5-3',
            name: 'Polymer and composite engineering',
            fieldId: '2.5',
            fieldName: 'Materials engineering',
            familyName: 'Engineering and technology',
            subfields: ['Polymer processing', 'Composite design', 'Fiber composites', 'Polymer nanocomposites', 'Biopolymers'],
          },
          {
            id: '2.5-4',
            name: 'Ceramic and glass engineering',
            fieldId: '2.5',
            fieldName: 'Materials engineering',
            familyName: 'Engineering and technology',
            subfields: ['Ceramic processing', 'Glass science', 'Refractory materials', 'Functional ceramics', 'Bio-ceramics'],
          },
          {
            id: '2.5-5',
            name: 'Electronic and functional materials engineering',
            fieldId: '2.5',
            fieldName: 'Materials engineering',
            familyName: 'Engineering and technology',
            subfields: ['Semiconductor materials', 'Magnetic materials', 'Optoelectronic materials', 'Energy materials', 'Electronic packaging'],
          },
        ],
      },
      {
        id: '2.6',
        name: 'Medical engineering',
        familyId: '2',
        familyName: 'Engineering and technology',
        disciplines: [
          {
            id: '2.6-1',
            name: 'Biomedical engineering',
            fieldId: '2.6',
            fieldName: 'Medical engineering',
            familyName: 'Engineering and technology',
            subfields: ['Biomedical instrumentation', 'Biomechanics', 'Biomaterials', 'Biomedical signal processing', 'Medical systems'],
          },
          {
            id: '2.6-2',
            name: 'Medical device engineering',
            fieldId: '2.6',
            fieldName: 'Medical engineering',
            familyName: 'Engineering and technology',
            subfields: ['Implantable devices', 'Diagnostic devices', 'Surgical devices', 'Wearable devices', 'Device safety'],
          },
          {
            id: '2.6-3',
            name: 'Neural engineering',
            fieldId: '2.6',
            fieldName: 'Medical engineering',
            familyName: 'Engineering and technology',
            subfields: ['Neural interfaces', 'Neural signal processing', 'Neuromodulation', 'Neuroprosthetics', 'Brain-computer interfaces'],
          },
          {
            id: '2.6-4',
            name: 'Tissue and regenerative engineering',
            fieldId: '2.6',
            fieldName: 'Medical engineering',
            familyName: 'Engineering and technology',
            subfields: ['Tissue scaffolds', 'Cell-based regeneration', 'Organoid engineering', 'Regenerative biomaterials', 'Bioprinting'],
          },
          {
            id: '2.6-5',
            name: 'Medical imaging and bioinstrumentation',
            fieldId: '2.6',
            fieldName: 'Medical engineering',
            familyName: 'Engineering and technology',
            subfields: ['MRI engineering', 'CT engineering', 'Ultrasound', 'Optical imaging', 'Biosensors'],
          },
        ],
      },
      {
        id: '2.7',
        name: 'Environmental engineering',
        familyId: '2',
        familyName: 'Engineering and technology',
        disciplines: [
          {
            id: '2.7-1',
            name: 'Environmental systems engineering',
            fieldId: '2.7',
            fieldName: 'Environmental engineering',
            familyName: 'Engineering and technology',
            subfields: ['Environmental modelling', 'Sustainability systems', 'Resource systems', 'Environmental monitoring', 'Environmental risk engineering'],
          },
          {
            id: '2.7-2',
            name: 'Water and wastewater engineering',
            fieldId: '2.7',
            fieldName: 'Environmental engineering',
            familyName: 'Engineering and technology',
            subfields: ['Water purification', 'Membrane systems', 'Wastewater treatment', 'Desalination', 'Water reuse'],
          },
          {
            id: '2.7-3',
            name: 'Air pollution engineering',
            fieldId: '2.7',
            fieldName: 'Environmental engineering',
            familyName: 'Engineering and technology',
            subfields: ['Emission control', 'Air-quality monitoring', 'Atmospheric transport', 'Aerosol engineering', 'Indoor air quality'],
          },
          {
            id: '2.7-4',
            name: 'Waste and resource engineering',
            fieldId: '2.7',
            fieldName: 'Environmental engineering',
            familyName: 'Engineering and technology',
            subfields: ['Solid waste', 'Hazardous waste', 'Recycling systems', 'Resource recovery', 'Circular engineering'],
          },
          {
            id: '2.7-5',
            name: 'Remediation and sustainability engineering',
            fieldId: '2.7',
            fieldName: 'Environmental engineering',
            familyName: 'Engineering and technology',
            subfields: ['Soil remediation', 'Groundwater remediation', 'Carbon management', 'Sustainable infrastructure', 'Life-cycle engineering'],
          },
        ],
      },
      {
        id: '2.8',
        name: 'Environmental biotechnology',
        familyId: '2',
        familyName: 'Engineering and technology',
        disciplines: [
          {
            id: '2.8-1',
            name: 'Environmental microbiotechnology',
            fieldId: '2.8',
            fieldName: 'Environmental biotechnology',
            familyName: 'Engineering and technology',
            subfields: ['Environmental microbial processes', 'Microbial consortia', 'Biological monitoring', 'Microbial bioremediation', 'Environmental metagenomics'],
          },
          {
            id: '2.8-2',
            name: 'Bioremediation engineering',
            fieldId: '2.8',
            fieldName: 'Environmental biotechnology',
            familyName: 'Engineering and technology',
            subfields: ['Hydrocarbon bioremediation', 'Heavy-metal bioremediation', 'Phytoremediation', 'Biostimulation', 'Bioaugmentation'],
          },
          {
            id: '2.8-3',
            name: 'Waste biotechnology',
            fieldId: '2.8',
            fieldName: 'Environmental biotechnology',
            familyName: 'Engineering and technology',
            subfields: ['Anaerobic digestion', 'Composting biotechnology', 'Biogas systems', 'Waste fermentation', 'Waste valorization'],
          },
          {
            id: '2.8-4',
            name: 'Environmental biosensing',
            fieldId: '2.8',
            fieldName: 'Environmental biotechnology',
            familyName: 'Engineering and technology',
            subfields: ['Biosensors', 'Microbial sensors', 'Environmental DNA', 'Remote biosensing', 'Real-time monitoring'],
          },
          {
            id: '2.8-5',
            name: 'Environmental bioprocessing',
            fieldId: '2.8',
            fieldName: 'Environmental biotechnology',
            familyName: 'Engineering and technology',
            subfields: ['Biological wastewater processes', 'Algal biotechnology', 'Enzyme remediation', 'Biological resource recovery', 'Environmental bioreactors'],
          },
        ],
      },
      {
        id: '2.9',
        name: 'Industrial biotechnology',
        familyId: '2',
        familyName: 'Engineering and technology',
        disciplines: [
          {
            id: '2.9-1',
            name: 'Industrial microbiology',
            fieldId: '2.9',
            fieldName: 'Industrial biotechnology',
            familyName: 'Engineering and technology',
            subfields: ['Industrial bacteria', 'Industrial fungi', 'Microbial fermentation', 'Microbial bioproducts', 'Microbial strain engineering'],
          },
          {
            id: '2.9-2',
            name: 'Bioprocess engineering',
            fieldId: '2.9',
            fieldName: 'Industrial biotechnology',
            familyName: 'Engineering and technology',
            subfields: ['Upstream processing', 'Bioreactor design', 'Downstream processing', 'Process scale-up', 'Bioprocess control'],
          },
          {
            id: '2.9-3',
            name: 'Metabolic engineering',
            fieldId: '2.9',
            fieldName: 'Industrial biotechnology',
            familyName: 'Engineering and technology',
            subfields: ['Pathway engineering', 'Flux optimization', 'Microbial cell factories', 'Genome-scale metabolic models', 'Synthetic metabolism'],
          },
          {
            id: '2.9-4',
            name: 'Biocatalysis and enzyme engineering',
            fieldId: '2.9',
            fieldName: 'Industrial biotechnology',
            familyName: 'Engineering and technology',
            subfields: ['Enzyme discovery', 'Directed evolution', 'Enzyme immobilization', 'Biocatalytic synthesis', 'Protein engineering'],
          },
          {
            id: '2.9-5',
            name: 'Biomanufacturing',
            fieldId: '2.9',
            fieldName: 'Industrial biotechnology',
            familyName: 'Engineering and technology',
            subfields: ['Precision fermentation', 'Cell factories', 'Biological production platforms', 'Continuous biomanufacturing', 'Bioprocess analytics'],
          },
        ],
      },
      {
        id: '2.10',
        name: 'Nano-technology',
        familyId: '2',
        familyName: 'Engineering and technology',
        disciplines: [
          {
            id: '2.10-1',
            name: 'Nanomaterials engineering',
            fieldId: '2.10',
            fieldName: 'Nano-technology',
            familyName: 'Engineering and technology',
            subfields: ['Nanoparticles', 'Nanocomposites', '2D materials', 'Nanoporous materials', 'Functional nanostructures'],
          },
          {
            id: '2.10-2',
            name: 'Nanoelectronics',
            fieldId: '2.10',
            fieldName: 'Nano-technology',
            familyName: 'Engineering and technology',
            subfields: ['Nanoscale transistors', 'Quantum devices', 'Nanoelectronic sensors', 'Nanowire electronics', 'Neuromorphic nanoelectronics'],
          },
          {
            id: '2.10-3',
            name: 'Nanobiotechnology',
            fieldId: '2.10',
            fieldName: 'Nano-technology',
            familyName: 'Engineering and technology',
            subfields: ['Nanobiosensors', 'Nano-bio interfaces', 'Nanocarriers', 'Molecular nanodevices', 'Nanotoxicology'],
          },
          {
            id: '2.10-4',
            name: 'Nanomedicine',
            fieldId: '2.10',
            fieldName: 'Nano-technology',
            familyName: 'Engineering and technology',
            subfields: ['Nanodrug delivery', 'Nanodiagnostics', 'Theranostics', 'Nanovaccines', 'Targeted nanotherapy'],
          },
          {
            id: '2.10-5',
            name: 'Nanofabrication and nanodevices',
            fieldId: '2.10',
            fieldName: 'Nano-technology',
            familyName: 'Engineering and technology',
            subfields: ['Lithography', 'Nanoassembly', 'Nanoelectromechanical systems', 'Nanodevice integration', 'Nanoscale metrology'],
          },
        ],
      },
      {
        id: '2.11',
        name: 'Other engineering and technologies',
        familyId: '2',
        familyName: 'Engineering and technology',
        disciplines: [
          {
            id: '2.11-1',
            name: 'Systems engineering',
            fieldId: '2.11',
            fieldName: 'Other engineering and technologies',
            familyName: 'Engineering and technology',
            subfields: ['Requirements engineering', 'System architecture', 'Systems integration', 'Systems verification', 'Systems optimization'],
          },
          {
            id: '2.11-2',
            name: 'Industrial engineering',
            fieldId: '2.11',
            fieldName: 'Other engineering and technologies',
            familyName: 'Engineering and technology',
            subfields: ['Operations research', 'Production systems', 'Quality engineering', 'Supply-chain engineering', 'Human factors'],
          },
          {
            id: '2.11-3',
            name: 'Energy engineering',
            fieldId: '2.11',
            fieldName: 'Other engineering and technologies',
            familyName: 'Engineering and technology',
            subfields: ['Renewable energy systems', 'Energy storage', 'Power conversion', 'Energy efficiency', 'Hydrogen systems'],
          },
          {
            id: '2.11-4',
            name: 'Safety and reliability engineering',
            fieldId: '2.11',
            fieldName: 'Other engineering and technologies',
            familyName: 'Engineering and technology',
            subfields: ['Reliability analysis', 'Risk assessment', 'Fault-tolerant systems', 'Functional safety', 'Safety management'],
          },
          {
            id: '2.11-5',
            name: 'Engineering informatics',
            fieldId: '2.11',
            fieldName: 'Other engineering and technologies',
            familyName: 'Engineering and technology',
            subfields: ['Digital twins', 'Engineering data science', 'Simulation workflows', 'Engineering AI', 'Knowledge-based engineering'],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // 3. MEDICAL AND HEALTH SCIENCES
  // =========================================================================
  {
    id: '3',
    name: 'Medical and health sciences',
    shortName: 'Medical & Health',
    fields: [
      {
        id: '3.1',
        name: 'Basic medicine',
        familyId: '3',
        familyName: 'Medical and health sciences',
        disciplines: [
          {
            id: '3.1-1',
            name: 'Anatomy and histology',
            fieldId: '3.1',
            fieldName: 'Basic medicine',
            familyName: 'Medical and health sciences',
            subfields: ['Gross anatomy', 'Neuroanatomy', 'Histology', 'Comparative anatomy', 'Developmental anatomy'],
          },
          {
            id: '3.1-2',
            name: 'Physiology',
            fieldId: '3.1',
            fieldName: 'Basic medicine',
            familyName: 'Medical and health sciences',
            subfields: ['Cell physiology', 'Organ physiology', 'Integrative physiology', 'Exercise physiology', 'Comparative physiology'],
          },
          {
            id: '3.1-3',
            name: 'Biochemistry and molecular medicine',
            fieldId: '3.1',
            fieldName: 'Basic medicine',
            familyName: 'Medical and health sciences',
            subfields: ['Molecular metabolism', 'Protein biochemistry', 'Molecular diagnostics', 'Disease biochemistry', 'Molecular therapeutics'],
          },
          {
            id: '3.1-4',
            name: 'Pathology and disease biology',
            fieldId: '3.1',
            fieldName: 'Basic medicine',
            familyName: 'Medical and health sciences',
            subfields: ['Molecular pathology', 'Cellular pathology', 'Disease mechanisms', 'Histopathology', 'Translational pathology'],
          },
          {
            id: '3.1-5',
            name: 'Pharmacology and toxicology',
            fieldId: '3.1',
            fieldName: 'Basic medicine',
            familyName: 'Medical and health sciences',
            subfields: ['Pharmacodynamics', 'Pharmacokinetics', 'Drug safety', 'Molecular pharmacology', 'Toxicological mechanisms'],
          },
        ],
      },
      {
        id: '3.2',
        name: 'Clinical medicine',
        familyId: '3',
        familyName: 'Medical and health sciences',
        disciplines: [
          {
            id: '3.2-1',
            name: 'Internal medicine',
            fieldId: '3.2',
            fieldName: 'Clinical medicine',
            familyName: 'Medical and health sciences',
            subfields: ['Cardiology', 'Endocrinology', 'Gastroenterology', 'Nephrology', 'Pulmonology'],
          },
          {
            id: '3.2-2',
            name: 'Surgery',
            fieldId: '3.2',
            fieldName: 'Clinical medicine',
            familyName: 'Medical and health sciences',
            subfields: ['General surgery', 'Orthopedic surgery', 'Cardiothoracic surgery', 'Vascular surgery', 'Minimally invasive surgery'],
          },
          {
            id: '3.2-3',
            name: 'Neurology and neurosurgery',
            fieldId: '3.2',
            fieldName: 'Clinical medicine',
            familyName: 'Medical and health sciences',
            subfields: ['Stroke', 'Epilepsy', 'Neurodegeneration', 'Neuroimmunology', 'Neurosurgical disorders'],
          },
          {
            id: '3.2-4',
            name: 'Oncology',
            fieldId: '3.2',
            fieldName: 'Clinical medicine',
            familyName: 'Medical and health sciences',
            subfields: ['Medical oncology', 'Radiation oncology', 'Surgical oncology', 'Cancer biology', 'Precision oncology'],
          },
          {
            id: '3.2-5',
            name: 'Pediatrics, obstetrics and gynecology',
            fieldId: '3.2',
            fieldName: 'Clinical medicine',
            familyName: 'Medical and health sciences',
            subfields: ['Pediatrics', 'Neonatology', 'Maternal medicine', 'Reproductive medicine', 'Gynecologic oncology'],
          },
        ],
      },
      {
        id: '3.3',
        name: 'Health sciences',
        familyId: '3',
        familyName: 'Medical and health sciences',
        disciplines: [
          {
            id: '3.3-1',
            name: 'Public health',
            fieldId: '3.3',
            fieldName: 'Health sciences',
            familyName: 'Medical and health sciences',
            subfields: ['Population health', 'Health promotion', 'Disease prevention', 'Public health surveillance', 'Health systems'],
          },
          {
            id: '3.3-2',
            name: 'Epidemiology',
            fieldId: '3.3',
            fieldName: 'Health sciences',
            familyName: 'Medical and health sciences',
            subfields: ['Infectious epidemiology', 'Chronic disease epidemiology', 'Genetic epidemiology', 'Molecular epidemiology', 'Causal epidemiology'],
          },
          {
            id: '3.3-3',
            name: 'Nutrition and dietetics',
            fieldId: '3.3',
            fieldName: 'Health sciences',
            familyName: 'Medical and health sciences',
            subfields: ['Clinical nutrition', 'Nutritional biochemistry', 'Nutrigenomics', 'Public nutrition', 'Metabolic nutrition'],
          },
          {
            id: '3.3-4',
            name: 'Health services and informatics',
            fieldId: '3.3',
            fieldName: 'Health sciences',
            familyName: 'Medical and health sciences',
            subfields: ['Health informatics', 'Clinical informatics', 'Health services research', 'Healthcare analytics', 'Digital health'],
          },
          {
            id: '3.3-5',
            name: 'Occupational and environmental health',
            fieldId: '3.3',
            fieldName: 'Health sciences',
            familyName: 'Medical and health sciences',
            subfields: ['Occupational medicine', 'Environmental exposure science', 'Risk assessment', 'Environmental epidemiology', 'Workplace health'],
          },
        ],
      },
      {
        id: '3.4',
        name: 'Medical biotechnology',
        familyId: '3',
        familyName: 'Medical and health sciences',
        disciplines: [
          {
            id: '3.4-1',
            name: 'Medical genomics',
            fieldId: '3.4',
            fieldName: 'Medical biotechnology',
            familyName: 'Medical and health sciences',
            subfields: ['Clinical genomics', 'Cancer genomics', 'Rare-disease genomics', 'Pharmacogenomics', 'Genomic diagnostics'],
          },
          {
            id: '3.4-2',
            name: 'Gene and cell therapy',
            fieldId: '3.4',
            fieldName: 'Medical biotechnology',
            familyName: 'Medical and health sciences',
            subfields: ['Gene replacement', 'Genome editing', 'Cell therapy', 'CAR-T and engineered cells', 'RNA therapeutics'],
          },
          {
            id: '3.4-3',
            name: 'Regenerative medicine',
            fieldId: '3.4',
            fieldName: 'Medical biotechnology',
            familyName: 'Medical and health sciences',
            subfields: ['Stem-cell therapy', 'Tissue regeneration', 'Organoid medicine', 'Regenerative biomaterials', 'Cell reprogramming'],
          },
          {
            id: '3.4-4',
            name: 'Biopharmaceuticals',
            fieldId: '3.4',
            fieldName: 'Medical biotechnology',
            familyName: 'Medical and health sciences',
            subfields: ['Therapeutic proteins', 'Monoclonal antibodies', 'Vaccines', 'RNA medicines', 'Biologics manufacturing'],
          },
          {
            id: '3.4-5',
            name: 'Molecular diagnostics',
            fieldId: '3.4',
            fieldName: 'Medical biotechnology',
            familyName: 'Medical and health sciences',
            subfields: ['PCR diagnostics', 'Sequencing diagnostics', 'Biomarker discovery', 'Liquid biopsy', 'Companion diagnostics'],
          },
        ],
      },
      {
        id: '3.5',
        name: 'Other medical science',
        familyId: '3',
        familyName: 'Medical and health sciences',
        disciplines: [
          {
            id: '3.5-1',
            name: 'Translational medicine',
            fieldId: '3.5',
            fieldName: 'Other medical science',
            familyName: 'Medical and health sciences',
            subfields: ['Bench-to-bedside research', 'Translational biomarkers', 'Preclinical models', 'Clinical translation', 'Implementation pathways'],
          },
          {
            id: '3.5-2',
            name: 'Rehabilitation science',
            fieldId: '3.5',
            fieldName: 'Other medical science',
            familyName: 'Medical and health sciences',
            subfields: ['Neurorehabilitation', 'Physical rehabilitation', 'Occupational rehabilitation', 'Assistive technologies', 'Rehabilitation robotics'],
          },
          {
            id: '3.5-3',
            name: 'Aging and gerontology',
            fieldId: '3.5',
            fieldName: 'Other medical science',
            familyName: 'Medical and health sciences',
            subfields: ['Cellular aging', 'Senescence', 'Longevity biology', 'Geroscience', 'Age-related disease'],
          },
          {
            id: '3.5-4',
            name: 'Clinical research science',
            fieldId: '3.5',
            fieldName: 'Other medical science',
            familyName: 'Medical and health sciences',
            subfields: ['Clinical trials', 'Clinical epidemiology', 'Evidence synthesis', 'Real-world evidence', 'Clinical research informatics'],
          },
          {
            id: '3.5-5',
            name: 'Medical ethics and clinical methodology',
            fieldId: '3.5',
            fieldName: 'Other medical science',
            familyName: 'Medical and health sciences',
            subfields: ['Bioethics', 'Research ethics', 'Clinical ethics', 'Patient-centered research', 'Clinical methodology'],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // 4. AGRICULTURAL AND VETERINARY SCIENCES
  // =========================================================================
  {
    id: '4',
    name: 'Agricultural and veterinary sciences',
    shortName: 'Agriculture & Vet',
    fields: [
      {
        id: '4.1',
        name: 'Agriculture, forestry, and fisheries',
        familyId: '4',
        familyName: 'Agricultural and veterinary sciences',
        disciplines: [
          {
            id: '4.1-1',
            name: 'Agronomy and crop science',
            fieldId: '4.1',
            fieldName: 'Agriculture, forestry, and fisheries',
            familyName: 'Agricultural and veterinary sciences',
            subfields: ['Crop physiology', 'Crop production', 'Crop management', 'Crop stress biology', 'Crop modelling'],
          },
          {
            id: '4.1-2',
            name: 'Horticulture and plant production',
            fieldId: '4.1',
            fieldName: 'Agriculture, forestry, and fisheries',
            familyName: 'Agricultural and veterinary sciences',
            subfields: ['Fruit science', 'Vegetable science', 'Ornamental plants', 'Protected cultivation', 'Postharvest horticulture'],
          },
          {
            id: '4.1-3',
            name: 'Forestry and forest science',
            fieldId: '4.1',
            fieldName: 'Agriculture, forestry, and fisheries',
            familyName: 'Agricultural and veterinary sciences',
            subfields: ['Forest ecology', 'Forest management', 'Forest genetics', 'Silviculture', 'Forest conservation'],
          },
          {
            id: '4.1-4',
            name: 'Fisheries science',
            fieldId: '4.1',
            fieldName: 'Agriculture, forestry, and fisheries',
            familyName: 'Agricultural and veterinary sciences',
            subfields: ['Fish population biology', 'Fisheries ecology', 'Fisheries management', 'Stock assessment', 'Fishery oceanography'],
          },
          {
            id: '4.1-5',
            name: 'Aquaculture and aquatic production',
            fieldId: '4.1',
            fieldName: 'Agriculture, forestry, and fisheries',
            familyName: 'Agricultural and veterinary sciences',
            subfields: ['Aquaculture systems', 'Fish nutrition', 'Aquatic animal health', 'Hatchery science', 'Sustainable aquaculture'],
          },
        ],
      },
      {
        id: '4.2',
        name: 'Animal and dairy science',
        familyId: '4',
        familyName: 'Agricultural and veterinary sciences',
        disciplines: [
          {
            id: '4.2-1',
            name: 'Animal science',
            fieldId: '4.2',
            fieldName: 'Animal and dairy science',
            familyName: 'Agricultural and veterinary sciences',
            subfields: ['Animal production', 'Animal behavior', 'Animal physiology', 'Animal genetics', 'Animal welfare'],
          },
          {
            id: '4.2-2',
            name: 'Animal genetics and breeding',
            fieldId: '4.2',
            fieldName: 'Animal and dairy science',
            familyName: 'Agricultural and veterinary sciences',
            subfields: ['Quantitative breeding', 'Genomic selection', 'Reproductive genetics', 'Breed improvement', 'Conservation genetics'],
          },
          {
            id: '4.2-3',
            name: 'Animal nutrition',
            fieldId: '4.2',
            fieldName: 'Animal and dairy science',
            familyName: 'Agricultural and veterinary sciences',
            subfields: ['Ruminant nutrition', 'Monogastric nutrition', 'Feed science', 'Nutritional physiology', 'Precision nutrition'],
          },
          {
            id: '4.2-4',
            name: 'Dairy science',
            fieldId: '4.2',
            fieldName: 'Animal and dairy science',
            familyName: 'Agricultural and veterinary sciences',
            subfields: ['Lactation biology', 'Dairy nutrition', 'Milk chemistry', 'Dairy microbiology', 'Dairy production systems'],
          },
          {
            id: '4.2-5',
            name: 'Livestock physiology and production',
            fieldId: '4.2',
            fieldName: 'Animal and dairy science',
            familyName: 'Agricultural and veterinary sciences',
            subfields: ['Growth biology', 'Reproductive physiology', 'Livestock systems', 'Precision livestock', 'Climate-resilient livestock'],
          },
        ],
      },
      {
        id: '4.3',
        name: 'Veterinary science',
        familyId: '4',
        familyName: 'Agricultural and veterinary sciences',
        disciplines: [
          {
            id: '4.3-1',
            name: 'Veterinary medicine',
            fieldId: '4.3',
            fieldName: 'Veterinary science',
            familyName: 'Agricultural and veterinary sciences',
            subfields: ['Small-animal medicine', 'Large-animal medicine', 'Exotic animal medicine', 'Veterinary emergency medicine', 'Preventive veterinary medicine'],
          },
          {
            id: '4.3-2',
            name: 'Veterinary pathology',
            fieldId: '4.3',
            fieldName: 'Veterinary science',
            familyName: 'Agricultural and veterinary sciences',
            subfields: ['Diagnostic pathology', 'Veterinary oncology', 'Necropsy pathology', 'Comparative pathology', 'Molecular veterinary pathology'],
          },
          {
            id: '4.3-3',
            name: 'Veterinary microbiology',
            fieldId: '4.3',
            fieldName: 'Veterinary science',
            familyName: 'Agricultural and veterinary sciences',
            subfields: ['Veterinary bacteriology', 'Veterinary virology', 'Veterinary mycology', 'Veterinary parasitology', 'Veterinary microbiome'],
          },
          {
            id: '4.3-4',
            name: 'Veterinary pharmacology',
            fieldId: '4.3',
            fieldName: 'Veterinary science',
            familyName: 'Agricultural and veterinary sciences',
            subfields: ['Veterinary pharmacokinetics', 'Veterinary therapeutics', 'Antimicrobial pharmacology', 'Veterinary toxicology', 'Drug residues'],
          },
          {
            id: '4.3-5',
            name: 'Veterinary epidemiology',
            fieldId: '4.3',
            fieldName: 'Veterinary science',
            familyName: 'Agricultural and veterinary sciences',
            subfields: ['Animal disease surveillance', 'One Health epidemiology', 'Outbreak modelling', 'Veterinary population health', 'Zoonotic disease epidemiology'],
          },
        ],
      },
      {
        id: '4.4',
        name: 'Agricultural biotechnology',
        familyId: '4',
        familyName: 'Agricultural and veterinary sciences',
        disciplines: [
          {
            id: '4.4-1',
            name: 'Plant biotechnology',
            fieldId: '4.4',
            fieldName: 'Agricultural biotechnology',
            familyName: 'Agricultural and veterinary sciences',
            subfields: ['Plant tissue culture', 'Plant transformation', 'Plant genome editing', 'Plant molecular farming', 'Plant synthetic biology'],
          },
          {
            id: '4.4-2',
            name: 'Crop genomics and breeding',
            fieldId: '4.4',
            fieldName: 'Agricultural biotechnology',
            familyName: 'Agricultural and veterinary sciences',
            subfields: ['Marker-assisted breeding', 'Genomic selection', 'Crop pangenomics', 'Trait genetics', 'Genome-wide association'],
          },
          {
            id: '4.4-3',
            name: 'Animal biotechnology',
            fieldId: '4.4',
            fieldName: 'Agricultural biotechnology',
            familyName: 'Agricultural and veterinary sciences',
            subfields: ['Animal transgenesis', 'Animal genome editing', 'Reproductive biotechnology', 'Stem-cell animal models', 'Biopharming'],
          },
          {
            id: '4.4-4',
            name: 'Agricultural microbiotechnology',
            fieldId: '4.4',
            fieldName: 'Agricultural biotechnology',
            familyName: 'Agricultural and veterinary sciences',
            subfields: ['Biofertilizers', 'Biopesticides', 'Plant-growth-promoting microbes', 'Agricultural microbiomes', 'Microbial soil health'],
          },
          {
            id: '4.4-5',
            name: 'Agro-bioinformatics',
            fieldId: '4.4',
            fieldName: 'Agricultural biotechnology',
            familyName: 'Agricultural and veterinary sciences',
            subfields: ['Crop databases', 'Agricultural genomics', 'Phenotype data science', 'Crop modelling', 'Agricultural knowledge graphs'],
          },
        ],
      },
      {
        id: '4.5',
        name: 'Other agricultural sciences',
        familyId: '4',
        familyName: 'Agricultural and veterinary sciences',
        disciplines: [
          {
            id: '4.5-1',
            name: 'Food and agricultural systems',
            fieldId: '4.5',
            fieldName: 'Other agricultural sciences',
            familyName: 'Agricultural and veterinary sciences',
            subfields: ['Food systems', 'Food security', 'Agricultural supply chains', 'Agri-food sustainability', 'Food policy'],
          },
          {
            id: '4.5-2',
            name: 'Agricultural economics interfaces',
            fieldId: '4.5',
            fieldName: 'Other agricultural sciences',
            familyName: 'Agricultural and veterinary sciences',
            subfields: ['Farm economics', 'Agricultural markets', 'Resource economics', 'Rural development', 'Food economics'],
          },
          {
            id: '4.5-3',
            name: 'Rural resource science',
            fieldId: '4.5',
            fieldName: 'Other agricultural sciences',
            familyName: 'Agricultural and veterinary sciences',
            subfields: ['Rural land systems', 'Natural-resource management', 'Rural livelihoods', 'Watershed management', 'Land-use science'],
          },
          {
            id: '4.5-4',
            name: 'Postharvest science',
            fieldId: '4.5',
            fieldName: 'Other agricultural sciences',
            familyName: 'Agricultural and veterinary sciences',
            subfields: ['Storage biology', 'Food preservation', 'Postharvest physiology', 'Supply-chain quality', 'Postharvest biotechnology'],
          },
          {
            id: '4.5-5',
            name: 'Agricultural sustainability science',
            fieldId: '4.5',
            fieldName: 'Other agricultural sciences',
            familyName: 'Agricultural and veterinary sciences',
            subfields: ['Climate-smart agriculture', 'Regenerative agriculture', 'Agroecology', 'Sustainable intensification', 'Agricultural life-cycle assessment'],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // 5. SOCIAL SCIENCES
  // =========================================================================
  {
    id: '5',
    name: 'Social sciences',
    shortName: 'Social Sciences',
    fields: [
      {
        id: '5.1',
        name: 'Psychology and cognitive sciences',
        familyId: '5',
        familyName: 'Social sciences',
        disciplines: [
          {
            id: '5.1-1',
            name: 'Cognitive psychology',
            fieldId: '5.1',
            fieldName: 'Psychology and cognitive sciences',
            familyName: 'Social sciences',
            subfields: ['Attention', 'Memory', 'Perception', 'Learning', 'Decision-making'],
          },
          {
            id: '5.1-2',
            name: 'Clinical and health psychology',
            fieldId: '5.1',
            fieldName: 'Psychology and cognitive sciences',
            familyName: 'Social sciences',
            subfields: ['Clinical assessment', 'Psychotherapy science', 'Health behavior', 'Behavioral medicine', 'Clinical cognitive science'],
          },
          {
            id: '5.1-3',
            name: 'Developmental psychology',
            fieldId: '5.1',
            fieldName: 'Psychology and cognitive sciences',
            familyName: 'Social sciences',
            subfields: ['Infant development', 'Child cognition', 'Adolescent development', 'Lifespan development', 'Developmental psychopathology'],
          },
          {
            id: '5.1-4',
            name: 'Social and behavioral psychology',
            fieldId: '5.1',
            fieldName: 'Psychology and cognitive sciences',
            familyName: 'Social sciences',
            subfields: ['Social cognition', 'Interpersonal behavior', 'Group processes', 'Behavioral interventions', 'Attitudes and persuasion'],
          },
          {
            id: '5.1-5',
            name: 'Cognitive and computational neuroscience',
            fieldId: '5.1',
            fieldName: 'Psychology and cognitive sciences',
            familyName: 'Social sciences',
            subfields: ['Neural computation', 'Cognitive brain networks', 'Neural coding', 'Computational psychiatry', 'Decision neuroscience'],
          },
        ],
      },
      {
        id: '5.2',
        name: 'Economics and business',
        familyId: '5',
        familyName: 'Social sciences',
        disciplines: [
          {
            id: '5.2-1',
            name: 'Economics',
            fieldId: '5.2',
            fieldName: 'Economics and business',
            familyName: 'Social sciences',
            subfields: ['Microeconomics', 'Macroeconomics', 'Labor economics', 'Development economics', 'Environmental economics'],
          },
          {
            id: '5.2-2',
            name: 'Econometrics and quantitative economics',
            fieldId: '5.2',
            fieldName: 'Economics and business',
            familyName: 'Social sciences',
            subfields: ['Causal econometrics', 'Time-series econometrics', 'Panel data', 'Experimental economics', 'Machine-learning econometrics'],
          },
          {
            id: '5.2-3',
            name: 'Finance and accounting',
            fieldId: '5.2',
            fieldName: 'Economics and business',
            familyName: 'Social sciences',
            subfields: ['Corporate finance', 'Asset pricing', 'Financial risk', 'Financial accounting', 'Management accounting'],
          },
          {
            id: '5.2-4',
            name: 'Management and organization',
            fieldId: '5.2',
            fieldName: 'Economics and business',
            familyName: 'Social sciences',
            subfields: ['Organizational behavior', 'Strategy', 'Operations management', 'Innovation management', 'Human resource management'],
          },
          {
            id: '5.2-5',
            name: 'Marketing and entrepreneurship',
            fieldId: '5.2',
            fieldName: 'Economics and business',
            familyName: 'Social sciences',
            subfields: ['Consumer behavior', 'Market analytics', 'Digital marketing', 'Entrepreneurship', 'Innovation and startups'],
          },
        ],
      },
      {
        id: '5.3',
        name: 'Education',
        familyId: '5',
        familyName: 'Social sciences',
        disciplines: [
          {
            id: '5.3-1',
            name: 'Educational psychology',
            fieldId: '5.3',
            fieldName: 'Education',
            familyName: 'Social sciences',
            subfields: ['Learning and cognition', 'Motivation', 'Assessment', 'Developmental learning', 'Educational interventions'],
          },
          {
            id: '5.3-2',
            name: 'Learning sciences',
            fieldId: '5.3',
            fieldName: 'Education',
            familyName: 'Social sciences',
            subfields: ['Learning analytics', 'Memory and learning', 'Instructional design', 'Cognitive tutoring', 'Collaborative learning'],
          },
          {
            id: '5.3-3',
            name: 'Pedagogy and curriculum',
            fieldId: '5.3',
            fieldName: 'Education',
            familyName: 'Social sciences',
            subfields: ['Curriculum design', 'Teaching methods', 'Teacher education', 'Assessment design', 'Inclusive pedagogy'],
          },
          {
            id: '5.3-4',
            name: 'Educational technology',
            fieldId: '5.3',
            fieldName: 'Education',
            familyName: 'Social sciences',
            subfields: ['Learning platforms', 'Adaptive learning', 'Educational AI', 'Digital assessment', 'Virtual learning environments'],
          },
          {
            id: '5.3-5',
            name: 'Education policy and administration',
            fieldId: '5.3',
            fieldName: 'Education',
            familyName: 'Social sciences',
            subfields: ['Education governance', 'Education economics', 'Higher-education policy', 'School leadership', 'Education systems'],
          },
        ],
      },
      {
        id: '5.4',
        name: 'Sociology',
        familyId: '5',
        familyName: 'Social sciences',
        disciplines: [
          {
            id: '5.4-1',
            name: 'Sociology',
            fieldId: '5.4',
            fieldName: 'Sociology',
            familyName: 'Social sciences',
            subfields: ['Social institutions', 'Social stratification', 'Culture and identity', 'Family sociology', 'Work and occupations'],
          },
          {
            id: '5.4-2',
            name: 'Social network science',
            fieldId: '5.4',
            fieldName: 'Sociology',
            familyName: 'Social sciences',
            subfields: ['Network analysis', 'Diffusion processes', 'Community detection', 'Social influence', 'Online networks'],
          },
          {
            id: '5.4-3',
            name: 'Demography',
            fieldId: '5.4',
            fieldName: 'Sociology',
            familyName: 'Social sciences',
            subfields: ['Fertility', 'Mortality', 'Migration', 'Population ageing', 'Population projections'],
          },
          {
            id: '5.4-4',
            name: 'Medical sociology',
            fieldId: '5.4',
            fieldName: 'Sociology',
            familyName: 'Social sciences',
            subfields: ['Health inequalities', 'Illness behavior', 'Healthcare institutions', 'Social determinants', 'Medicalization'],
          },
          {
            id: '5.4-5',
            name: 'Computational sociology',
            fieldId: '5.4',
            fieldName: 'Sociology',
            familyName: 'Social sciences',
            subfields: ['Agent-based sociology', 'Social simulation', 'Digital trace analysis', 'Computational text analysis', 'Large-scale social networks'],
          },
        ],
      },
      {
        id: '5.5',
        name: 'Law',
        familyId: '5',
        familyName: 'Social sciences',
        disciplines: [
          {
            id: '5.5-1',
            name: 'Public and constitutional law',
            fieldId: '5.5',
            fieldName: 'Law',
            familyName: 'Social sciences',
            subfields: ['Constitutional systems', 'Administrative law', 'Human rights', 'Public institutions', 'Regulatory law'],
          },
          {
            id: '5.5-2',
            name: 'Private and commercial law',
            fieldId: '5.5',
            fieldName: 'Law',
            familyName: 'Social sciences',
            subfields: ['Contract law', 'Corporate law', 'Property law', 'Commercial transactions', 'Consumer law'],
          },
          {
            id: '5.5-3',
            name: 'Criminal and procedural law',
            fieldId: '5.5',
            fieldName: 'Law',
            familyName: 'Social sciences',
            subfields: ['Criminal justice', 'Criminal procedure', 'Evidence law', 'Forensic law', 'Cybercrime law'],
          },
          {
            id: '5.5-4',
            name: 'International and comparative law',
            fieldId: '5.5',
            fieldName: 'Law',
            familyName: 'Social sciences',
            subfields: ['International public law', 'International trade law', 'Comparative legal systems', 'Humanitarian law', 'Transnational law'],
          },
          {
            id: '5.5-5',
            name: 'Technology, IP and bio-law',
            fieldId: '5.5',
            fieldName: 'Law',
            familyName: 'Social sciences',
            subfields: ['Patent law', 'Copyright and software law', 'Biotechnology law', 'Genetic privacy', 'AI and data law'],
          },
        ],
      },
      {
        id: '5.6',
        name: 'Political science',
        familyId: '5',
        familyName: 'Social sciences',
        disciplines: [
          {
            id: '5.6-1',
            name: 'Political theory',
            fieldId: '5.6',
            fieldName: 'Political science',
            familyName: 'Social sciences',
            subfields: ['Political philosophy', 'Democratic theory', 'Justice theory', 'Political institutions', 'Ideologies and political thought'],
          },
          {
            id: '5.6-2',
            name: 'Comparative politics',
            fieldId: '5.6',
            fieldName: 'Political science',
            familyName: 'Social sciences',
            subfields: ['Comparative institutions', 'Comparative political economy', 'Elections and parties', 'State capacity', 'Regime studies'],
          },
          {
            id: '5.6-3',
            name: 'International relations',
            fieldId: '5.6',
            fieldName: 'Political science',
            familyName: 'Social sciences',
            subfields: ['International security', 'International political economy', 'Diplomatic studies', 'Global governance', 'Conflict studies'],
          },
          {
            id: '5.6-4',
            name: 'Public policy and governance',
            fieldId: '5.6',
            fieldName: 'Political science',
            familyName: 'Social sciences',
            subfields: ['Policy analysis', 'Policy implementation', 'Regulation', 'Public administration', 'Governance systems'],
          },
          {
            id: '5.6-5',
            name: 'Political behavior and institutions',
            fieldId: '5.6',
            fieldName: 'Political science',
            familyName: 'Social sciences',
            subfields: ['Political participation', 'Public opinion', 'Voting behavior', 'Legislative behavior', 'Institutional behavior'],
          },
        ],
      },
      {
        id: '5.7',
        name: 'Social and economic geography',
        familyId: '5',
        familyName: 'Social sciences',
        disciplines: [
          {
            id: '5.7-1',
            name: 'Human geography',
            fieldId: '5.7',
            fieldName: 'Social and economic geography',
            familyName: 'Social sciences',
            subfields: ['Cultural geography', 'Population geography', 'Health geography', 'Urban geography', 'Migration geography'],
          },
          {
            id: '5.7-2',
            name: 'Economic geography',
            fieldId: '5.7',
            fieldName: 'Social and economic geography',
            familyName: 'Social sciences',
            subfields: ['Regional economies', 'Location theory', 'Industrial geography', 'Innovation geography', 'Global production networks'],
          },
          {
            id: '5.7-3',
            name: 'Urban and regional geography',
            fieldId: '5.7',
            fieldName: 'Social and economic geography',
            familyName: 'Social sciences',
            subfields: ['Urban systems', 'Regional planning', 'Cities and infrastructure', 'Spatial inequality', 'Urban sustainability'],
          },
          {
            id: '5.7-4',
            name: 'GIS and geospatial social science',
            fieldId: '5.7',
            fieldName: 'Social and economic geography',
            familyName: 'Social sciences',
            subfields: ['Spatial analysis', 'Geographic information systems', 'Remote sensing', 'Spatial statistics', 'Geospatial modelling'],
          },
          {
            id: '5.7-5',
            name: 'Population and migration geography',
            fieldId: '5.7',
            fieldName: 'Social and economic geography',
            familyName: 'Social sciences',
            subfields: ['Migration systems', 'Refugee geography', 'Population distribution', 'Mobility studies', 'Migration networks'],
          },
        ],
      },
      {
        id: '5.8',
        name: 'Media and communications',
        familyId: '5',
        familyName: 'Social sciences',
        disciplines: [
          {
            id: '5.8-1',
            name: 'Journalism',
            fieldId: '5.8',
            fieldName: 'Media and communications',
            familyName: 'Social sciences',
            subfields: ['Investigative journalism', 'Science journalism', 'Data journalism', 'Digital journalism', 'Journalism ethics'],
          },
          {
            id: '5.8-2',
            name: 'Media studies',
            fieldId: '5.8',
            fieldName: 'Media and communications',
            familyName: 'Social sciences',
            subfields: ['Media industries', 'Audience studies', 'Media effects', 'Platform studies', 'Media history'],
          },
          {
            id: '5.8-3',
            name: 'Digital communication',
            fieldId: '5.8',
            fieldName: 'Media and communications',
            familyName: 'Social sciences',
            subfields: ['Social media research', 'Online communities', 'Digital rhetoric', 'Platform communication', 'Computational communication'],
          },
          {
            id: '5.8-4',
            name: 'Science communication',
            fieldId: '5.8',
            fieldName: 'Media and communications',
            familyName: 'Social sciences',
            subfields: ['Public understanding of science', 'Risk communication', 'Research communication', 'Misinformation studies', 'Science media'],
          },
          {
            id: '5.8-5',
            name: 'Information and communication studies',
            fieldId: '5.8',
            fieldName: 'Media and communications',
            familyName: 'Social sciences',
            subfields: ['Information behavior', 'Communication theory', 'Information literacy', 'Knowledge communication', 'Digital information ecosystems'],
          },
        ],
      },
      {
        id: '5.9',
        name: 'Other social sciences',
        familyId: '5',
        familyName: 'Social sciences',
        disciplines: [
          {
            id: '5.9-1',
            name: 'Anthropology',
            fieldId: '5.9',
            fieldName: 'Other social sciences',
            familyName: 'Social sciences',
            subfields: ['Cultural anthropology', 'Biological anthropology', 'Medical anthropology', 'Linguistic anthropology', 'Archaeological anthropology'],
          },
          {
            id: '5.9-2',
            name: 'Social statistics',
            fieldId: '5.9',
            fieldName: 'Other social sciences',
            familyName: 'Social sciences',
            subfields: ['Survey methodology', 'Sampling', 'Social measurement', 'Latent-variable methods', 'Small-area estimation'],
          },
          {
            id: '5.9-3',
            name: 'Human factors',
            fieldId: '5.9',
            fieldName: 'Other social sciences',
            familyName: 'Social sciences',
            subfields: ['Ergonomics', 'Human-computer interaction', 'Cognitive ergonomics', 'Safety human factors', 'User research'],
          },
          {
            id: '5.9-4',
            name: 'Policy studies',
            fieldId: '5.9',
            fieldName: 'Other social sciences',
            familyName: 'Social sciences',
            subfields: ['Policy evaluation', 'Policy design', 'Comparative policy', 'Evidence-based policy', 'Policy implementation'],
          },
          {
            id: '5.9-5',
            name: 'Area and interdisciplinary social studies',
            fieldId: '5.9',
            fieldName: 'Other social sciences',
            familyName: 'Social sciences',
            subfields: ['Regional studies', 'Global studies', 'Development studies', 'Migration studies', 'Science and technology studies'],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // 6. HUMANITIES AND THE ARTS
  // =========================================================================
  {
    id: '6',
    name: 'Humanities and the arts',
    shortName: 'Humanities & Arts',
    fields: [
      {
        id: '6.1',
        name: 'History and archaeology',
        familyId: '6',
        familyName: 'Humanities and the arts',
        disciplines: [
          {
            id: '6.1-1',
            name: 'History',
            fieldId: '6.1',
            fieldName: 'History and archaeology',
            familyName: 'Humanities and the arts',
            subfields: ['Ancient history', 'Medieval history', 'Modern history', 'Contemporary history', 'Global history'],
          },
          {
            id: '6.1-2',
            name: 'Archaeology',
            fieldId: '6.1',
            fieldName: 'History and archaeology',
            familyName: 'Humanities and the arts',
            subfields: ['Prehistoric archaeology', 'Classical archaeology', 'Historical archaeology', 'Underwater archaeology', 'Landscape archaeology'],
          },
          {
            id: '6.1-3',
            name: 'Bioarchaeology',
            fieldId: '6.1',
            fieldName: 'History and archaeology',
            familyName: 'Humanities and the arts',
            subfields: ['Human osteology', 'Archaeogenetics', 'Paleopathology', 'Isotopic archaeology', 'Bioanthropology'],
          },
          {
            id: '6.1-4',
            name: 'Heritage science',
            fieldId: '6.1',
            fieldName: 'History and archaeology',
            familyName: 'Humanities and the arts',
            subfields: ['Conservation science', 'Heritage materials', 'Digital heritage', 'Cultural heritage management', 'Archaeometry'],
          },
          {
            id: '6.1-5',
            name: 'Historical and digital studies',
            fieldId: '6.1',
            fieldName: 'History and archaeology',
            familyName: 'Humanities and the arts',
            subfields: ['Digital history', 'Historical GIS', 'Historical data science', 'Archival studies', 'Computational history'],
          },
        ],
      },
      {
        id: '6.2',
        name: 'Languages and literature',
        familyId: '6',
        familyName: 'Humanities and the arts',
        disciplines: [
          {
            id: '6.2-1',
            name: 'Linguistics',
            fieldId: '6.2',
            fieldName: 'Languages and literature',
            familyName: 'Humanities and the arts',
            subfields: ['Syntax', 'Semantics', 'Phonetics and phonology', 'Sociolinguistics', 'Historical linguistics'],
          },
          {
            id: '6.2-2',
            name: 'Literary studies',
            fieldId: '6.2',
            fieldName: 'Languages and literature',
            familyName: 'Humanities and the arts',
            subfields: ['Literary theory', 'Comparative literature', 'Genre studies', 'Narratology', 'Digital literary studies'],
          },
          {
            id: '6.2-3',
            name: 'Computational linguistics',
            fieldId: '6.2',
            fieldName: 'Languages and literature',
            familyName: 'Humanities and the arts',
            subfields: ['Natural language processing', 'Corpus linguistics', 'Machine translation', 'Information extraction', 'Language modelling'],
          },
          {
            id: '6.2-4',
            name: 'Psycholinguistics',
            fieldId: '6.2',
            fieldName: 'Languages and literature',
            familyName: 'Humanities and the arts',
            subfields: ['Language comprehension', 'Language production', 'Bilingualism', 'Language acquisition', 'Neurolinguistics'],
          },
          {
            id: '6.2-5',
            name: 'Translation and language studies',
            fieldId: '6.2',
            fieldName: 'Languages and literature',
            familyName: 'Humanities and the arts',
            subfields: ['Translation theory', 'Interpreting studies', 'Terminology', 'Localization', 'Language policy'],
          },
        ],
      },
      {
        id: '6.3',
        name: 'Philosophy, ethics and religion',
        familyId: '6',
        familyName: 'Humanities and the arts',
        disciplines: [
          {
            id: '6.3-1',
            name: 'Philosophy',
            fieldId: '6.3',
            fieldName: 'Philosophy, ethics and religion',
            familyName: 'Humanities and the arts',
            subfields: ['Metaphysics', 'Epistemology', 'Philosophy of mind', 'Logic', 'Philosophy of language'],
          },
          {
            id: '6.3-2',
            name: 'Ethics and bioethics',
            fieldId: '6.3',
            fieldName: 'Philosophy, ethics and religion',
            familyName: 'Humanities and the arts',
            subfields: ['Medical ethics', 'Research ethics', 'Neuroethics', 'Environmental ethics', 'AI ethics'],
          },
          {
            id: '6.3-3',
            name: 'Philosophy of science and technology',
            fieldId: '6.3',
            fieldName: 'Philosophy, ethics and religion',
            familyName: 'Humanities and the arts',
            subfields: ['Scientific explanation', 'Philosophy of biology', 'Philosophy of physics', 'Technology philosophy', 'Philosophy of AI'],
          },
          {
            id: '6.3-4',
            name: 'Religious studies',
            fieldId: '6.3',
            fieldName: 'Philosophy, ethics and religion',
            familyName: 'Humanities and the arts',
            subfields: ['Comparative religion', 'Religion and society', 'Religious history', 'Religion and science', 'Religion and ethics'],
          },
          {
            id: '6.3-5',
            name: 'Theology and comparative religion',
            fieldId: '6.3',
            fieldName: 'Philosophy, ethics and religion',
            familyName: 'Humanities and the arts',
            subfields: ['Systematic theology', 'Comparative theology', 'Religious ethics', 'Scriptural studies', 'Interfaith studies'],
          },
        ],
      },
      {
        id: '6.4',
        name: 'Arts',
        familyId: '6',
        familyName: 'Humanities and the arts',
        disciplines: [
          {
            id: '6.4-1',
            name: 'Visual arts',
            fieldId: '6.4',
            fieldName: 'Arts',
            familyName: 'Humanities and the arts',
            subfields: ['Painting', 'Sculpture', 'Photography', 'Printmaking', 'Digital visual art'],
          },
          {
            id: '6.4-2',
            name: 'Music',
            fieldId: '6.4',
            fieldName: 'Arts',
            familyName: 'Humanities and the arts',
            subfields: ['Music theory', 'Musicology', 'Ethnomusicology', 'Music technology', 'Music cognition'],
          },
          {
            id: '6.4-3',
            name: 'Performing arts',
            fieldId: '6.4',
            fieldName: 'Arts',
            familyName: 'Humanities and the arts',
            subfields: ['Dance', 'Theatre performance', 'Performance studies', 'Choreography', 'Stage technology'],
          },
          {
            id: '6.4-4',
            name: 'Film and media arts',
            fieldId: '6.4',
            fieldName: 'Arts',
            familyName: 'Humanities and the arts',
            subfields: ['Film studies', 'Cinematography', 'Animation', 'Media production', 'Interactive media'],
          },
          {
            id: '6.4-5',
            name: 'Design and digital arts',
            fieldId: '6.4',
            fieldName: 'Arts',
            familyName: 'Humanities and the arts',
            subfields: ['Industrial design', 'Graphic design', 'Interaction design', 'Computational design', 'Creative technology'],
          },
        ],
      },
      {
        id: '6.5',
        name: 'Other humanities',
        familyId: '6',
        familyName: 'Humanities and the arts',
        disciplines: [
          {
            id: '6.5-1',
            name: 'Cultural studies',
            fieldId: '6.5',
            fieldName: 'Other humanities',
            familyName: 'Humanities and the arts',
            subfields: ['Cultural theory', 'Popular culture', 'Identity studies', 'Global culture', 'Material culture'],
          },
          {
            id: '6.5-2',
            name: 'Classics',
            fieldId: '6.5',
            fieldName: 'Other humanities',
            familyName: 'Humanities and the arts',
            subfields: ['Classical languages', 'Greek studies', 'Roman studies', 'Classical archaeology', 'Classical reception'],
          },
          {
            id: '6.5-3',
            name: 'Area studies',
            fieldId: '6.5',
            fieldName: 'Other humanities',
            familyName: 'Humanities and the arts',
            subfields: ['Regional studies', 'Cross-cultural studies', 'Transnational studies', 'Diaspora studies', 'Comparative area research'],
          },
          {
            id: '6.5-4',
            name: 'Library and information humanities',
            fieldId: '6.5',
            fieldName: 'Other humanities',
            familyName: 'Humanities and the arts',
            subfields: ['Digital libraries', 'Archives', 'Knowledge organization', 'Scholarly communication', 'Information heritage'],
          },
          {
            id: '6.5-5',
            name: 'Digital humanities',
            fieldId: '6.5',
            fieldName: 'Other humanities',
            familyName: 'Humanities and the arts',
            subfields: ['Text mining', 'Digital archives', 'Computational cultural analysis', 'Cultural data science', 'Digital scholarship'],
          },
        ],
      },
    ],
  },
];

/**
 * Interdisciplinary & Cross-Domain Clusters (Layer 7)
 */
export const INTERDISCIPLINARY_GROUPS: InterdisciplinaryGroup[] = [
  {
    name: 'Biology + Computer Science',
    topics: ['Bioinformatics', 'Computational biology', 'Computational genomics', 'Computational proteomics', 'Computational neuroscience', 'AI for biology', 'Biological knowledge graphs', 'Scientific machine learning'],
  },
  {
    name: 'Neuroscience + Computer Science + Mathematics',
    topics: ['Computational neuroscience', 'Neural coding', 'Brain modelling', 'Connectomics', 'Neural data science', 'Computational psychiatry'],
  },
  {
    name: 'Neuroscience + Engineering',
    topics: ['Neuroengineering', 'Brain-computer interfaces', 'Neuroprosthetics', 'Neural implants', 'Neuromodulation', 'Neural signal processing'],
  },
  {
    name: 'Neuroscience + Psychology',
    topics: ['Cognitive neuroscience', 'Neuropsychology', 'Affective neuroscience', 'Social neuroscience', 'Decision neuroscience', 'Consciousness science'],
  },
  {
    name: 'Neuroscience + Immunology',
    topics: ['Neuroimmunology', 'Neuroinflammation', 'Microglia biology', 'Brain-immune signalling'],
  },
  {
    name: 'Neuroscience + Endocrinology',
    topics: ['Neuroendocrinology', 'Hormone-brain interactions', 'Neuroendocrine development', 'Metabolic neuroscience'],
  },
  {
    name: 'Biology + Chemistry',
    topics: ['Chemical biology', 'Biochemistry', 'Molecular pharmacology', 'Chemical genetics', 'Bioorthogonal chemistry'],
  },
  {
    name: 'Chemistry + Biology + Medicine',
    topics: ['Medicinal chemistry', 'Drug discovery', 'Pharmaceutical chemistry', 'Molecular diagnostics'],
  },
  {
    name: 'Biology + Physics + Mathematics',
    topics: ['Biophysics', 'Molecular biophysics', 'Systems biophysics', 'Mechanobiology', 'Single-molecule biology'],
  },
  {
    name: 'Genomics + Multi-Omics',
    topics: ['Multi-omics', 'Integrative omics', 'Systems medicine', 'Network medicine', 'Multi-modal biology'],
  },
  {
    name: 'Biology + Engineering',
    topics: ['Synthetic biology', 'Metabolic engineering', 'Cellular engineering', 'Bioprocess engineering', 'Biomanufacturing'],
  },
  {
    name: 'Biology + Materials + Engineering',
    topics: ['Tissue engineering', 'Biomaterials', 'Organ-on-chip', 'Regenerative engineering', 'Drug delivery'],
  },
  {
    name: 'Genomics + Medicine + Computing',
    topics: ['Precision medicine', 'Medical genomics', 'Pharmacogenomics', 'Clinical genomics', 'Genomic medicine'],
  },
  {
    name: 'AI + Chemistry + Structural Biology',
    topics: ['AI drug discovery', 'Protein design', 'Molecular generation', 'Reaction prediction', 'Retrosynthesis'],
  },
  {
    name: 'Medicine + Engineering + Computing',
    topics: ['Medical AI', 'Digital health', 'Medical imaging AI', 'Clinical decision support', 'Digital biomarkers'],
  },
  {
    name: 'Environment + Biology + Chemistry',
    topics: ['Environmental biotechnology', 'Bioremediation', 'Environmental genomics', 'Ecotoxicology', 'Biogeochemistry'],
  },
  {
    name: 'Agriculture + Biology + Engineering + AI',
    topics: ['Precision agriculture', 'Agricultural AI', 'Crop phenotyping', 'Agroinformatics', 'Smart farming'],
  },
  {
    name: 'Neuroscience + Philosophy + Law',
    topics: ['Neuroethics', 'Neurotechnology ethics', 'Cognitive liberty', 'Neural data governance'],
  },
  {
    name: 'Science + Society',
    topics: ['Science and technology studies', 'Science policy', 'Research ethics', 'Responsible innovation', 'Research integrity'],
  },
  {
    name: 'Social Science + Data Science',
    topics: ['Computational social science', 'Network science', 'Behavioral data science', 'Digital sociology', 'Social simulation'],
  },
];

/**
 * Pre-flattened global search list with over 1,300 indexed items (Fields, Disciplines, Subfields, and Interdisciplinary nodes)
 */
function buildFlattenedTaxonomy(): TaxonomyItem[] {
  const items: TaxonomyItem[] = [];
  const seen = new Set<string>();

  const addUnique = (item: TaxonomyItem) => {
    const key = `${item.name.toLowerCase()}||${item.hierarchy.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      items.push(item);
    }
  };

  // 1. Traverse all families, fields, disciplines, subfields
  for (const family of RESEARCH_TAXONOMY_FAMILIES) {
    for (const field of family.fields) {
      addUnique({
        id: `field_${field.id}`,
        name: field.name,
        type: 'field',
        familyName: family.name,
        fieldName: field.name,
        hierarchy: family.name,
      });

      for (const disc of field.disciplines) {
        addUnique({
          id: `disc_${disc.id}`,
          name: disc.name,
          type: 'discipline',
          familyName: family.name,
          fieldName: field.name,
          disciplineName: disc.name,
          hierarchy: `${field.name} › ${disc.name}`,
        });

        for (const subfield of disc.subfields) {
          addUnique({
            id: `sub_${disc.id}_${subfield.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            name: subfield,
            type: 'subfield',
            familyName: family.name,
            fieldName: field.name,
            disciplineName: disc.name,
            hierarchy: `${field.name} › ${disc.name}`,
          });
        }
      }
    }
  }

  // 2. Add Interdisciplinary clusters
  for (const group of INTERDISCIPLINARY_GROUPS) {
    for (const topic of group.topics) {
      addUnique({
        id: `inter_${group.name}_${topic.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        name: topic,
        type: 'interdisciplinary',
        familyName: 'Interdisciplinary',
        hierarchy: `Cross-Domain: ${group.name}`,
      });
    }
  }

  return items;
}

export const ALL_TAXONOMY_ITEMS: TaxonomyItem[] = buildFlattenedTaxonomy();

/**
 * Fast search utility for finding taxonomy items matching a query string
 */
export function searchResearchTaxonomy(query: string, limit = 40): TaxonomyItem[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return [];

  const exactMatches: TaxonomyItem[] = [];
  const prefixMatches: TaxonomyItem[] = [];
  const wordStartMatches: TaxonomyItem[] = [];
  const substringMatches: TaxonomyItem[] = [];

  for (const item of ALL_TAXONOMY_ITEMS) {
    const lowerName = item.name.toLowerCase();
    const lowerHier = item.hierarchy.toLowerCase();

    if (lowerName === clean) {
      exactMatches.push(item);
    } else if (lowerName.startsWith(clean)) {
      prefixMatches.push(item);
    } else if (lowerName.includes(` ${clean}`) || lowerName.includes(`-${clean}`)) {
      wordStartMatches.push(item);
    } else if (lowerName.includes(clean) || lowerHier.includes(clean)) {
      substringMatches.push(item);
    }

    if (
      exactMatches.length + prefixMatches.length + wordStartMatches.length + substringMatches.length >=
      limit * 2
    ) {
      break;
    }
  }

  const results = [
    ...exactMatches,
    ...prefixMatches,
    ...wordStartMatches,
    ...substringMatches,
  ];

  // Return unique by item name
  const seenNames = new Set<string>();
  const uniqueResults: TaxonomyItem[] = [];

  for (const r of results) {
    if (!seenNames.has(r.name.toLowerCase())) {
      seenNames.add(r.name.toLowerCase());
      uniqueResults.push(r);
      if (uniqueResults.length >= limit) break;
    }
  }

  return uniqueResults;
}
