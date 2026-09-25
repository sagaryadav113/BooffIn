export interface UserProfile {
  id: string;
  handle: string;
  fullName: string;
  avatarUrl?: string;
  academicTitle: string; // e.g. "Neuroscientist", "PhD Candidate", "Professor of Physics"
  institution: string; // e.g. "MIT", "Stanford University", "Max Planck"
  department?: string; // e.g. "Department of Brain and Cognitive Sciences"
  labGroup?: string; // e.g. "Neural Plasticity & Optogenetics Lab"
  primaryField?: string; // e.g. "Neuroscience"
  secondaryFields?: string[]; // e.g. ["Molecular Biology", "Bioimaging"]
  degreeProgram?: string; // e.g. "PhD in Cognitive Neuroscience"
  graduationYear?: number;
  bio: string;
  location?: string;
  country?: string;
  researchInterests?: string[];
  orcidId?: string; // e.g. "0000-0002-1825-0097"
  orcidVerified: boolean;
  websiteUrl?: string;
  googleScholarUrl?: string;
  researchgateUrl?: string;
  linkedinUrl?: string;
  scopusId?: string;
  followingCount: number;
  followersCount: number;
  postsCount: number;
  savedCount: number;
  joinedDate: string;
  isFollowing?: boolean;
}
