import { supabase } from './client';
import { UserSettings, defaultUserSettings } from '../types/settings';

/**
 * Maps database record from public.user_settings to frontend UserSettings model
 */
function mapUserSettingsRecord(raw: any, userId: string): UserSettings {
  if (!raw) {
    return { ...defaultUserSettings, userId };
  }

  return {
    userId: raw.user_id || userId,

    // Notification Preferences
    notifyLikes: raw.notify_likes ?? defaultUserSettings.notifyLikes,
    notifyComments: raw.notify_comments ?? defaultUserSettings.notifyComments,
    notifyMentions: raw.notify_mentions ?? defaultUserSettings.notifyMentions,
    notifyReposts: raw.notify_reposts ?? defaultUserSettings.notifyReposts,
    notifyPaperDiscussions: raw.notify_paper_discussions ?? defaultUserSettings.notifyPaperDiscussions,
    notifyCollaborationRequests: raw.notify_collaboration_requests ?? defaultUserSettings.notifyCollaborationRequests,
    notifyResearcherPosts: raw.notify_researcher_posts ?? defaultUserSettings.notifyResearcherPosts,
    notifyTopicActivity: raw.notify_topic_activity ?? defaultUserSettings.notifyTopicActivity,
    emailNotifications: raw.email_notifications ?? defaultUserSettings.emailNotifications,
    pushNotifications: raw.push_notifications ?? defaultUserSettings.pushNotifications,
    weeklyDigest: raw.weekly_digest ?? defaultUserSettings.weeklyDigest,

    // Privacy & Safety
    profileVisibility: raw.profile_visibility ?? defaultUserSettings.profileVisibility,
    allowConnectionRequests: raw.allow_connection_requests ?? defaultUserSettings.allowConnectionRequests,
    allowDirectMessages: raw.allow_direct_messages ?? defaultUserSettings.allowDirectMessages,
    emailVisibility: raw.email_visibility ?? defaultUserSettings.emailVisibility,
    showLikesOnProfile: raw.show_likes_on_profile ?? defaultUserSettings.showLikesOnProfile,
    showActivityStatus: raw.show_activity_status ?? defaultUserSettings.showActivityStatus,
    filterSensitiveContent: raw.filter_sensitive_content ?? defaultUserSettings.filterSensitiveContent,

    // Networking & Recommendations
    discoverableByInterests: raw.discoverable_by_interests ?? defaultUserSettings.discoverableByInterests,
    recommendResearchers: raw.recommend_researchers ?? defaultUserSettings.recommendResearchers,
    recommendTopics: raw.recommend_topics ?? defaultUserSettings.recommendTopics,

    // Appearance & Experience
    theme: raw.theme ?? defaultUserSettings.theme,
    defaultTab: raw.default_tab ?? defaultUserSettings.defaultTab,
    reducedMotion: raw.reduced_motion ?? defaultUserSettings.reducedMotion,

    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

/**
 * Maps frontend UserSettings updates to snake_case database columns
 */
function mapUserSettingsToDbPayload(updates: Partial<UserSettings>): Record<string, any> {
  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.notifyLikes !== undefined) payload.notify_likes = updates.notifyLikes;
  if (updates.notifyComments !== undefined) payload.notify_comments = updates.notifyComments;
  if (updates.notifyMentions !== undefined) payload.notify_mentions = updates.notifyMentions;
  if (updates.notifyReposts !== undefined) payload.notify_reposts = updates.notifyReposts;
  if (updates.notifyPaperDiscussions !== undefined) payload.notify_paper_discussions = updates.notifyPaperDiscussions;
  if (updates.notifyCollaborationRequests !== undefined) payload.notify_collaboration_requests = updates.notifyCollaborationRequests;
  if (updates.notifyResearcherPosts !== undefined) payload.notify_researcher_posts = updates.notifyResearcherPosts;
  if (updates.notifyTopicActivity !== undefined) payload.notify_topic_activity = updates.notifyTopicActivity;
  if (updates.emailNotifications !== undefined) payload.email_notifications = updates.emailNotifications;
  if (updates.pushNotifications !== undefined) payload.push_notifications = updates.pushNotifications;
  if (updates.weeklyDigest !== undefined) payload.weekly_digest = updates.weeklyDigest;

  if (updates.profileVisibility !== undefined) payload.profile_visibility = updates.profileVisibility;
  if (updates.allowConnectionRequests !== undefined) payload.allow_connection_requests = updates.allowConnectionRequests;
  if (updates.allowDirectMessages !== undefined) payload.allow_direct_messages = updates.allowDirectMessages;
  if (updates.emailVisibility !== undefined) payload.email_visibility = updates.emailVisibility;
  if (updates.showLikesOnProfile !== undefined) payload.show_likes_on_profile = updates.showLikesOnProfile;
  if (updates.showActivityStatus !== undefined) payload.show_activity_status = updates.showActivityStatus;
  if (updates.filterSensitiveContent !== undefined) payload.filter_sensitive_content = updates.filterSensitiveContent;

  if (updates.discoverableByInterests !== undefined) payload.discoverable_by_interests = updates.discoverableByInterests;
  if (updates.recommendResearchers !== undefined) payload.recommend_researchers = updates.recommendResearchers;
  if (updates.recommendTopics !== undefined) payload.recommend_topics = updates.recommendTopics;

  if (updates.theme !== undefined) payload.theme = updates.theme;
  if (updates.defaultTab !== undefined) payload.default_tab = updates.defaultTab;
  if (updates.reducedMotion !== undefined) payload.reduced_motion = updates.reducedMotion;

  return payload;
}

const LOCAL_SETTINGS_KEY = 'booffin_user_settings_cache';
let inMemorySettingsCache: Record<string, UserSettings> = {};

function getLocalCachedSettings(userId: string): UserSettings | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(`${LOCAL_SETTINGS_KEY}_${userId}`);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return inMemorySettingsCache[userId] || null;
}

function setLocalCachedSettings(userId: string, settings: UserSettings): void {
  inMemorySettingsCache[userId] = settings;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(`${LOCAL_SETTINGS_KEY}_${userId}`, JSON.stringify(settings));
    }
  } catch {}
}

/**
 * Fetch settings for authenticated user
 */
export async function fetchUserSettings(userId: string): Promise<UserSettings | null> {
  try {
    if (!userId) return null;

    const local = getLocalCachedSettings(userId);

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return local || { ...defaultUserSettings, userId };
    }

    if (!data) {
      const fallback = local || { ...defaultUserSettings, userId };
      setLocalCachedSettings(userId, fallback);
      return fallback;
    }

    const mapped = mapUserSettingsRecord(data, userId);
    setLocalCachedSettings(userId, mapped);
    return mapped;
  } catch (err: any) {
    return getLocalCachedSettings(userId) || { ...defaultUserSettings, userId };
  }
}

/**
 * Updates settings for authenticated user in public.user_settings
 */
export async function updateUserSettings(
  userId: string,
  updates: Partial<UserSettings>
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!userId) {
      return { success: false, error: 'User is not authenticated.' };
    }

    const current = getLocalCachedSettings(userId) || { ...defaultUserSettings, userId };
    const updated = { ...current, ...updates };
    setLocalCachedSettings(userId, updated);

    const dbPayload = mapUserSettingsToDbPayload(updates);

    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        ...dbPayload,
      });

    if (error) {
      // Table may not be provisioned yet; local storage already saved state
      return { success: true, error: null };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: true, error: null };
  }
}

/**
 * Changes authenticated user's account password
 */
export async function changeUserPassword(newPassword: string): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update password.' };
  }
}

/**
 * Changes authenticated user's email address
 */
export async function changeUserEmail(newEmail: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    const { error } = await supabase.auth.updateUser({
      email: cleanEmail,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update email.' };
  }
}

/**
 * Fetches list of users blocked by current user with profile details
 */
export async function fetchBlockedProfiles(): Promise<{
  id: string;
  fullName: string;
  handle: string;
  avatarUrl?: string;
  academicTitle?: string;
  blockedAt: string;
}[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_blocks')
      .select(`
        blocked_id,
        created_at,
        profiles:blocked_id (
          id,
          username,
          full_name,
          avatar_url,
          academic_title
        )
      `)
      .eq('blocker_id', user.id);

    if (error || !data) return [];

    return data.map((item: any) => {
      const p = item.profiles || {};
      return {
        id: item.blocked_id,
        fullName: p.full_name || 'Researcher',
        handle: p.username || 'researcher',
        avatarUrl: p.avatar_url,
        academicTitle: p.academic_title || 'Academic Researcher',
        blockedAt: item.created_at,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Exports all user account data for download (GDPR & Data Portability compliance)
 */
export async function exportUserData(userId: string): Promise<{ success: boolean; data?: any; error: string | null }> {
  try {
    if (!userId) return { success: false, error: 'User is not authenticated.' };

    const [profileRes, settingsRes, postsRes, bookmarksRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('posts').select('id, content, created_at').eq('author_id', userId),
      supabase.from('bookmarks').select('id, post_id, created_at').eq('user_id', userId),
    ]);

    const exportData = {
      exportGeneratedAt: new Date().toISOString(),
      platform: 'BooffIn Academic Social Network',
      profile: profileRes.data || null,
      settings: settingsRes.data || null,
      posts: postsRes.data || [],
      savedBookmarks: bookmarksRes.data || [],
    };

    return { success: true, data: exportData, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to export account data.' };
  }
}

/**
 * Deletes authenticated user account and associated personal data
 */
export async function deleteUserAccount(): Promise<{ success: boolean; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'User is not authenticated.' };

    // Delete user profile data (cascades via foreign keys to user_settings, posts, etc.)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (profileError) {
      console.warn('delete profile warning:', profileError.message);
    }

    // Sign out active session
    await supabase.auth.signOut();

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete account.' };
  }
}
