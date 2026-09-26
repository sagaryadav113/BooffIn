export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PostTypeEnum = 'discussion' | 'research_share' | 'question' | 'insight';
export type VisibilityEnum = 'public' | 'followers' | 'unlisted';
export type OpenAccessStatusEnum = 'gold' | 'green' | 'bronze' | 'hybrid' | 'closed' | 'preprint';
export type NotificationTypeEnum =
  | 'follow'
  | 'like'
  | 'comment'
  | 'reply'
  | 'repost'
  | 'paper_discussion'
  | 'researcher_post'
  | 'topic_activity'
  | 'mention'
  | 'paper_share'
  | 'topic_update'
  | 'trending'
  | 'publisher_update'
  | 'system';
export type EntityTypeEnum = 'post' | 'comment' | 'paper' | 'profile' | 'topic';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          full_name: string;
          avatar_url: string | null;
          academic_title: string | null;
          institution: string | null;
          bio: string | null;
          location: string | null;
          country: string | null;
          orcid_id: string | null;
          orcid_verified: boolean;
          website_url: string | null;
          research_interests: string[];
          followers_count: number;
          following_count: number;
          posts_count: number;
          saved_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          full_name: string;
          avatar_url?: string | null;
          academic_title?: string | null;
          institution?: string | null;
          bio?: string | null;
          location?: string | null;
          country?: string | null;
          orcid_id?: string | null;
          orcid_verified?: boolean;
          website_url?: string | null;
          research_interests?: string[];
          followers_count?: number;
          following_count?: number;
          posts_count?: number;
          saved_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          full_name?: string;
          avatar_url?: string | null;
          academic_title?: string | null;
          institution?: string | null;
          bio?: string | null;
          location?: string | null;
          country?: string | null;
          orcid_id?: string | null;
          orcid_verified?: boolean;
          website_url?: string | null;
          research_interests?: string[];
          followers_count?: number;
          following_count?: number;
          posts_count?: number;
          saved_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      papers: {
        Row: {
          id: string;
          doi: string | null;
          canonical_url: string;
          title: string;
          abstract: string | null;
          journal: string;
          publisher: string | null;
          publication_date: string | null;
          publication_year: number | null;
          open_access_status: OpenAccessStatusEnum;
          open_access_pdf_url: string | null;
          metadata_source: string;
          citation_count: number;
          discussion_count: number;
          likes_count: number;
          saves_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          doi?: string | null;
          canonical_url: string;
          title: string;
          abstract?: string | null;
          journal: string;
          publisher?: string | null;
          publication_date?: string | null;
          publication_year?: number | null;
          open_access_status?: OpenAccessStatusEnum;
          open_access_pdf_url?: string | null;
          metadata_source?: string;
          citation_count?: number;
          discussion_count?: number;
          likes_count?: number;
          saves_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          doi?: string | null;
          canonical_url?: string;
          title?: string;
          abstract?: string | null;
          journal?: string;
          publisher?: string | null;
          publication_date?: string | null;
          publication_year?: number | null;
          open_access_status?: OpenAccessStatusEnum;
          open_access_pdf_url?: string | null;
          metadata_source?: string;
          citation_count?: number;
          discussion_count?: number;
          likes_count?: number;
          saves_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      paper_authors: {
        Row: {
          id: string;
          paper_id: string;
          author_name: string;
          author_order: number;
          external_author_id: string | null;
          affiliation: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          paper_id: string;
          author_name: string;
          author_order: number;
          external_author_id?: string | null;
          affiliation?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          paper_id?: string;
          author_name?: string;
          author_order?: number;
          external_author_id?: string | null;
          affiliation?: string | null;
          created_at?: string;
        };
      };
      topics: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          icon_name: string;
          category: string;
          followers_count: number;
          posts_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          icon_name?: string;
          category?: string;
          followers_count?: number;
          posts_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          icon_name?: string;
          category?: string;
          followers_count?: number;
          posts_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          author_id: string;
          post_type: PostTypeEnum;
          content: string;
          paper_id: string | null;
          visibility: VisibilityEnum;
          media_urls: string[];
          likes_count: number;
          comments_count: number;
          reposts_count: number;
          saves_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          post_type: PostTypeEnum;
          content: string;
          paper_id?: string | null;
          visibility?: VisibilityEnum;
          media_urls?: string[];
          likes_count?: number;
          comments_count?: number;
          reposts_count?: number;
          saves_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          post_type?: PostTypeEnum;
          content?: string;
          paper_id?: string | null;
          visibility?: VisibilityEnum;
          media_urls?: string[];
          likes_count?: number;
          comments_count?: number;
          reposts_count?: number;
          saves_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          parent_id: string | null;
          path: string | null;
          content: string;
          likes_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          author_id: string;
          parent_id?: string | null;
          path?: string | null;
          content: string;
          likes_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          author_id?: string;
          parent_id?: string | null;
          path?: string | null;
          content?: string;
          likes_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      likes: {
        Row: {
          user_id: string;
          post_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          post_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          post_id?: string;
          created_at?: string;
        };
      };
      reposts: {
        Row: {
          user_id: string;
          post_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          post_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          post_id?: string;
          created_at?: string;
        };
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
      };
      paper_topics: {
        Row: {
          paper_id: string;
          topic_id: string;
          created_at: string;
        };
        Insert: {
          paper_id: string;
          topic_id: string;
          created_at?: string;
        };
        Update: {
          paper_id?: string;
          topic_id?: string;
          created_at?: string;
        };
      };
      post_topics: {
        Row: {
          post_id: string;
          topic_id: string;
          created_at: string;
        };
        Insert: {
          post_id: string;
          topic_id: string;
          created_at?: string;
        };
        Update: {
          post_id?: string;
          topic_id?: string;
          created_at?: string;
        };
      };
      bookmarks: {
        Row: {
          id: string;
          user_id: string;
          post_id: string | null;
          paper_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id?: string | null;
          paper_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_id?: string | null;
          paper_id?: string | null;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          actor_id: string | null;
          notification_type: NotificationTypeEnum;
          entity_type: EntityTypeEnum;
          entity_id: string;
          message_snippet: string | null;
          metadata?: Json;
          read_status: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          actor_id?: string | null;
          notification_type: NotificationTypeEnum;
          entity_type: EntityTypeEnum;
          entity_id: string;
          message_snippet?: string | null;
          metadata?: Json;
          read_status?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          actor_id?: string | null;
          notification_type?: NotificationTypeEnum;
          entity_type?: EntityTypeEnum;
          entity_id?: string;
          message_snippet?: string | null;
          metadata?: Json;
          read_status?: boolean;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_username_available: {
        Args: {
          requested_username: string;
          for_user_id?: string | null;
        };
        Returns: {
          available: boolean;
          normalized: string;
          reason: string | null;
          message: string;
        };
      };
      is_reserved_username: {
        Args: {
          un: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      post_type_enum: PostTypeEnum;
      visibility_enum: VisibilityEnum;
      open_access_status_enum: OpenAccessStatusEnum;
      notification_type_enum: NotificationTypeEnum;
      entity_type_enum: EntityTypeEnum;
    };
  };
}
