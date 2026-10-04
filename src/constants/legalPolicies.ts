export interface PolicySection {
  title: string;
  content: string[];
}

export interface LegalDocument {
  id: string;
  title: string;
  effectiveDate: string;
  version: string;
  controller: string;
  supportEmail: string;
  legalEmail: string;
  privacyEmail: string;
  summary: string;
  sections: PolicySection[];
}

export const LEGAL_CONTACTS = {
  admin: 'admin@letsbooffin.com',
  support: 'support@letsbooffin.com',
  privacy: 'privacy@letsbooffin.com',
  legal: 'legal@letsbooffin.com',
  security: 'security@letsbooffin.com',
};

export const TERMS_OF_SERVICE: LegalDocument = {
  id: 'terms',
  title: 'BooffIn Terms of Service',
  effectiveDate: 'October 2026',
  version: '2.0',
  controller: 'BooffIn Technologies',
  supportEmail: LEGAL_CONTACTS.support,
  legalEmail: LEGAL_CONTACTS.legal,
  privacyEmail: LEGAL_CONTACTS.privacy,
  summary:
    'These Terms of Service govern your access to and use of BooffIn, a scholarly discussion and preprint networking platform for researchers, students, and institutions.',
  sections: [
    {
      title: '1. About BooffIn',
      content: [
        'BooffIn is a research-focused social, discovery, and collaboration platform for researchers, students, universities, independent scientists, and research-oriented innovators. BooffIn combines researcher profiles, scholarly paper discovery, social posts and discussions, HYPE ratings, topic discovery, direct networking, and structured collaboration proposals.',
        'BooffIn may connect to scholarly sources such as OpenAlex, Crossref, PubMed, and ORCID. BooffIn may display bibliographic metadata, abstracts, and links to source locations. Eligible open-licensed papers may be made available through BooffIn’s reader workflow. BooffIn is not a journal, publisher, university, peer-review body, research-ethics committee, medical provider, regulator, or scientific certification authority.',
      ],
    },
    {
      title: '2. Acceptance of Terms',
      content: [
        'By creating an account, linking ORCID, or using BooffIn, you agree to these Terms and the policies linked from them. If you use BooffIn on behalf of an organization or institution, you represent and warrant that you have authority to bind that entity.',
      ],
    },
    {
      title: '3. Eligibility',
      content: [
        'You must meet the minimum age required by applicable law in your jurisdiction (at least 18 years of age where required). You must provide accurate registration details and must never impersonate another researcher, university, lab, or publisher.',
      ],
    },
    {
      title: '4. Accounts and Security',
      content: [
        'You are responsible for maintaining the confidentiality of your login credentials and device security. You must not share credentials, operate deceptive account farms, evade suspensions, automate abusive activity, or access another person’s account without authorization.',
      ],
    },
    {
      title: '5. Researcher Identity, ORCID, and Verification',
      content: [
        'BooffIn supports ORCID OAuth2 linking, institutional-email verification, and other academic verification signals. Verification helps establish the scope of a specific claim; it does not guarantee employment, authorship, scientific competence, research quality, or institutional endorsement. Users must not falsely claim affiliations, qualifications, authorship, grants, or academic awards.',
      ],
    },
    {
      title: '6. User Content and Research Posts',
      content: [
        'Users may create research summaries (TL;DRs), preprint reviews, methodological discussions, comments, citations, bookmarks, and collaboration proposals. You retain ownership of lawful intellectual-property rights in your original content. You represent that you have all rights and permissions required to publish submitted materials. Do not upload confidential, embargoed, proprietary, or restricted research without authorization.',
      ],
    },
    {
      title: '7. License to BooffIn',
      content: [
        'You grant BooffIn a non-exclusive, worldwide, royalty-free license to host, store, display, format, distribute within the Service, index, secure, and create previews of your submitted content solely for operating the platform. This does not transfer ownership of your intellectual property.',
      ],
    },
    {
      title: '8. Scholarly Literature, Open Access, and Reader Cache',
      content: [
        'BooffIn respects copyright and does not treat Open Access as synonymous with blanket redistribution. For on-demand reading workflows, BooffIn targets specific CC BY-licensed versions and retrieves temporary copies that automatically expire and delete after inactivity.',
      ],
    },
    {
      title: '9. HYPE Ratings and Recommendation Integrity',
      content: [
        'HYPE is a community evaluation signal based on Impact, Clarity, and Visuals. HYPE scores, trending indicators, and verification badges are not formal journal peer review or scientific certifications. Users must not manipulate ratings, views, or metrics with bots or coordinated campaigns.',
      ],
    },
    {
      title: '10. Scientific Content Disclaimer',
      content: [
        'Scientific literature and commentary on BooffIn may be preliminary, disputed, corrected, or retracted. BooffIn does not guarantee reproducibility, clinical suitability, or research outcomes. BooffIn does not replace professional medical, clinical, legal, or research-ethics counsel.',
      ],
    },
    {
      title: '11. Enforcement and Contact',
      content: [
        'BooffIn reserves the right to label, restrict, or remove content and suspend accounts that violate these terms. Inquiries may be directed to admin@letsbooffin.com or support@letsbooffin.com.',
      ],
    },
  ],
};

export const PRIVACY_POLICY: LegalDocument = {
  id: 'privacy',
  title: 'BooffIn Privacy Policy',
  effectiveDate: 'October 2026',
  version: '2.0',
  controller: 'BooffIn Technologies',
  supportEmail: LEGAL_CONTACTS.support,
  legalEmail: LEGAL_CONTACTS.legal,
  privacyEmail: LEGAL_CONTACTS.privacy,
  summary:
    'This Privacy Policy explains how BooffIn collects, protects, uses, and processes personal and academic data across our website, mobile application, and researcher tools.',
  sections: [
    {
      title: '1. Scope and Commitment',
      content: [
        'This Privacy Policy applies to personal data processed through BooffIn websites (letsbooffin.com), mobile apps, researcher profiles, scholarly discovery services, and communications. We are committed to data minimization, transparency, and academic privacy.',
      ],
    },
    {
      title: '2. Information We Process',
      content: [
        'Account & Identity Data: Name, username, email address, password hash (managed securely via Supabase Auth), profile avatar, and biographical summaries.',
        'Academic & Professional Data: Affiliated institution, department, research interests, ORCID iD, imported publication metadata, and verified badges.',
        'Platform Activity: Research summaries, comments, bookmarks, reading lists, HYPE evaluations (Impact, Clarity, Visuals), and collaboration proposals.',
        'Technical & Security Data: Device type, browser user agent, IP address (for fraud and abuse prevention), and session security tokens.',
      ],
    },
    {
      title: '3. Scholarly Data and ORCID Integration',
      content: [
        'When you connect your ORCID record via OAuth2, BooffIn retrieves authorized publication metadata to populate your research portfolio. We do not store your ORCID login credentials.',
      ],
    },
    {
      title: '4. How We Use Your Information',
      content: [
        'To operate, maintain, and provide researcher profiles, paper feeds, topic discovery, and community interactions.',
        'To calculate community HYPE rankings and deliver personalized academic recommendations without selling personal data to advertisers.',
        'To protect system security, prevent bot manipulation, enforce community guidelines, and comply with applicable laws.',
      ],
    },
    {
      title: '5. Zero Selling of Personal Data',
      content: [
        'BooffIn NEVER sells, rents, or trades your personal information, reading history, or research topics to third-party data brokers or marketing aggregators.',
      ],
    },
    {
      title: '6. Data Storage, Security, and Row Level Security',
      content: [
        'Your data is encrypted in transit (TLS 1.3/HTTPS) and at rest. Database access is strictly governed by PostgreSQL Row Level Security (RLS) policies, ensuring users only access authorized records.',
      ],
    },
    {
      title: '7. Your Rights and Account Deletion',
      content: [
        'You have the right to access, correct, export, or delete your personal account at any time via Settings -> Account -> Delete Account or by emailing privacy@letsbooffin.com.',
        'Upon account deletion, all personal profile data is permanently removed, subject only to legitimate legal or security retention requirements.',
      ],
    },
    {
      title: '8. Privacy Contacts and Governance',
      content: [
        'For inquiries regarding data protection, GDPR, CCPA, or India Digital Personal Data Protection Act compliance, contact privacy@letsbooffin.com or admin@letsbooffin.com.',
      ],
    },
  ],
};

export const COMMUNITY_GUIDELINES: LegalDocument = {
  id: 'guidelines',
  title: 'BooffIn Academic Community Guidelines',
  effectiveDate: 'October 2026',
  version: '2.0',
  controller: 'BooffIn Technologies',
  supportEmail: LEGAL_CONTACTS.support,
  legalEmail: LEGAL_CONTACTS.legal,
  privacyEmail: LEGAL_CONTACTS.privacy,
  summary:
    'BooffIn is dedicated to professional, constructive, and evidence-based scientific discourse. These guidelines outline expectations for academic integrity and conduct.',
  sections: [
    {
      title: '1. Respectful Scientific Debate',
      content: [
        'Critique methodologies, evidence, statistics, and conclusions rigorously and respectfully. Personal attacks, harassment, defamation, and scholarly intimidation are strictly prohibited.',
      ],
    },
    {
      title: '2. Scientific Integrity & Prohibited Misconduct',
      content: [
        'No data fabrication, statistical falsification, or deceptive image manipulation.',
        'No plagiarism or claiming uncredited authorship of another researcher’s work.',
        'No citation manipulation, fake DOIs, or coordinated metric boosting.',
      ],
    },
    {
      title: '3. Preprints and Peer Review Clarity',
      content: [
        'Discussions on BooffIn represent open academic commentary. Summaries and peer discussions must not be misrepresented as formal journal editorial certifications.',
      ],
    },
    {
      title: '4. Reporting & Moderation',
      content: [
        'Suspected violations, impersonation, or harassment can be reported directly in-app or via support@letsbooffin.com. Appeals are reviewed by our moderation team.',
      ],
    },
  ],
};
