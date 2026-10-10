export type WorkspaceType = 'dm' | 'community' | 'inner_circle';

export type WorkspaceMemberRole = 'owner' | 'admin' | 'moderator' | 'member';

export type WorkspaceSubscriptionTier = 'free' | 'tier_49' | 'tier_119' | 'tier_219' | 'tier_599';

export interface DoiMetadata {
  doi: string;
  title: string;
  authors?: Array<{ name: string; orcid?: string }>;
  publicationYear?: number;
  journal?: string;
  url?: string;
  abstract?: string;
  citationCount?: number;
}

export interface WorkspaceSenderProfile {
  id: string;
  fullName: string;
  handle: string;
  avatarUrl?: string | null;
  academicTitle?: string | null;
  institution?: string | null;
  orcidVerified?: boolean;
}

export interface Workspace {
  id: string;
  type: WorkspaceType;
  name: string;
  description: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  owner_id: string;
  creator_id?: string | null;
  is_private: boolean;
  max_members: number | null;
  subscription_tier: WorkspaceSubscriptionTier;
  subscription_price_inr: number;
  canonical_dm_key: string | null;
  dm_participant_a?: string | null;
  dm_participant_b?: string | null;
  e2ee_enabled: boolean;
  e2ee_public_keys: Record<string, string> | null;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;

  // Enriched / View state properties
  members_count?: number;
  unread_count?: number;
  last_message?: WorkspaceMessage | null;
  other_user?: WorkspaceSenderProfile | null;
  my_role?: WorkspaceMemberRole;
  my_membership_status?: 'active' | 'invited' | 'pending_payment';
  is_pinned?: boolean;
  is_archived?: boolean;
  is_muted?: boolean;
  muted_until?: string | null;
  is_blocked?: boolean;
  block_reason?: string | null;
  other_last_read_at?: string | null;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceMemberRole;
  status: 'active' | 'invited' | 'pending_payment';
  is_muted: boolean;
  last_read_at: string;
  unread_count: number;
  joined_at: string;
  profile?: WorkspaceSenderProfile;
}

export type WorkspaceMessageType =
  | 'text'
  | 'paper_doi'
  | 'podcast'
  | 'event'
  | 'role_opportunity'
  | 'saved_item'
  | 'e2ee_cipher'
  | 'image'
  | 'poll'
  | 'audio'
  | 'voice_note'
  | 'post'
  | 'profile'
  | 'workspace_invite'
  | 'call_log'
  | 'document';

export interface WorkspacePollOption {
  id: string;
  text: string;
  votes: string[]; // user IDs who voted
}

export interface WorkspacePollData {
  question: string;
  options: WorkspacePollOption[];
  totalVotes: number;
}

export interface WorkspaceAudioMetadata {
  duration: number; // in seconds
  waveform?: number[];
  url?: string;
  uri?: string;
}

export interface WorkspacePostMetadata {
  id: string;
  title: string;
  author_name: string;
  author_avatar?: string | null;
  snippet?: string;
  upvotes?: number;
  tags?: string[];
}

export interface WorkspaceProfileMetadata {
  id: string;
  fullName: string;
  handle: string;
  avatarUrl?: string | null;
  academicTitle?: string | null;
  institution?: string | null;
  orcidVerified?: boolean;
}

export interface WorkspaceInviteMetadata {
  id: string;
  name: string;
  type: 'inner_circle' | 'community';
  avatarUrl?: string | null;
  description?: string | null;
  members_count?: number;
}

export interface WorkspaceDocumentMetadata {
  name: string;
  sizeBytes: number;
  fileUrl: string;
  mimeType: string;
  pageCount?: number;
}

export interface WorkspaceCallMetadata {
  call_id: string;
  call_type: 'audio' | 'video';
  duration_seconds: number;
  status: 'completed' | 'missed' | 'declined';
}

export type WorkspaceReactionsMap = Record<string, string[]>; // emoji -> array of user_ids

export interface WorkspaceMessage {
  id: string;
  workspace_id: string;
  sender_id: string;
  content: string;
  message_type: WorkspaceMessageType;
  doi_metadata: DoiMetadata | null;
  poll_data?: WorkspacePollData | null;
  audio_metadata?: WorkspaceAudioMetadata | null;
  post_metadata?: WorkspacePostMetadata | null;
  profile_metadata?: WorkspaceProfileMetadata | null;
  workspace_invite_metadata?: WorkspaceInviteMetadata | null;
  document_metadata?: WorkspaceDocumentMetadata | null;
  call_metadata?: WorkspaceCallMetadata | null;
  attachments?: any;
  reactions?: WorkspaceReactionsMap | null;
  is_edited?: boolean;
  is_deleted?: boolean;
  e2ee_ciphertext: string | null;
  e2ee_nonce: string | null;
  media_urls: string[] | null;
  is_pinned: boolean;
  reply_to_id: string | null;
  reply_to_message?: {
    id: string;
    sender_name: string;
    content: string;
    message_type?: string;
  } | null;
  created_at: string;
  updated_at: string;
  sender?: WorkspaceSenderProfile;
}

export interface WorkspaceBlock {
  id: string;
  workspace_id: string;
  user_id: string;
  blocked_by: string;
  reason: string;
  created_at: string;
  blocked_user?: WorkspaceSenderProfile;
  moderator?: WorkspaceSenderProfile;
}

export interface WorkspaceEvent {
  id: string;
  workspace_id: string;
  creator_id: string;
  title: string;
  description: string | null;
  event_type: 'live_session' | 'reading_group' | 'lab_meeting' | 'milestone';
  start_time: string;
  end_time: string | null;
  meeting_link: string | null;
  created_at: string;
  creator?: WorkspaceSenderProfile;
}

export interface WorkspaceRoleOpportunity {
  id: string;
  workspace_id: string;
  creator_id: string;
  title: string;
  role_type: 'co_author' | 'research_assistant' | 'reviewer' | 'grant_partner' | 'postdoc';
  description: string;
  compensation: string | null;
  is_open: boolean;
  created_at: string;
  creator?: WorkspaceSenderProfile;
}

export interface WorkspaceSavedItem {
  id: string;
  workspace_id: string;
  user_id: string;
  item_type: 'message' | 'doi_paper' | 'opportunity' | 'event';
  item_id: string;
  note: string | null;
  created_at: string;
}

export interface WorkspaceSummaryStats {
  totalDMs: number;
  totalCommunities: number;
  totalInnerCircles: number;
  unreadTotal: number;
}
