export interface UserProfile {
  id: string;
  handle: string;
  fullName: string;
  avatarUrl?: string;
  academicTitle: string; // e.g. "Neuroscientist", "PhD Candidate", "Professor of Physics"
  institution: string; // e.g. "MIT", "Stanford University", "Max Planck"
  bio: string;
  location?: string;
  country?: string;
  researchInterests?: string[];
  orcidId?: string; // e.g. "0000-0002-1825-0097"
  orcidVerified: boolean;
  websiteUrl?: string;
  followingCount: number;
  followersCount: number;
  postsCount: number;
  savedCount: number;
  joinedDate: string;
  isFollowing?: boolean;
}
