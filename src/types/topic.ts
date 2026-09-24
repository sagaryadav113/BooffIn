export interface Topic {
  id: string;
  slug: string;
  name: string;
  description?: string;
  iconName: string; // Lucide icon identifier (e.g. 'brain', 'dna', 'activity', 'cpu')
  category: string;
  followersCount: number;
  postsCount: number;
  isFollowing?: boolean;
}
