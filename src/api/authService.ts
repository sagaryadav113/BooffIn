import { supabase } from './client';
import { UserProfile } from '../types';

const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

function createAuthRedirectUrl(path: string): string {
  try {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      return `${window.location.origin}${cleanPath}`;
    }
    const Linking = require('expo-linking');
    return Linking.createURL(path);
  } catch {
    return `https://booffin.app/${path}`;
  }
}

async function openAuthSession(url: string, redirectUrl: string): Promise<any> {
  try {
    const WebBrowser = require('expo-web-browser');
    return await WebBrowser.openAuthSessionAsync(url, redirectUrl);
  } catch {
    return { type: 'cancel' };
  }
}

export interface AuthResponse {
  user: UserProfile | null;
  error: string | null;
}

export interface SignUpParams {
  email: string;
  password: string;
  fullName?: string;
  handle?: string;
  academicTitle?: string;
  institution?: string;
}

/**
 * Checks if the configured Supabase client is connected to a live production instance
 */
export function isLiveSupabaseConfigured(): boolean {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    !url.includes('dummy') &&
    !url.includes('booffin-project.supabase.co') &&
    anonKey &&
    !anonKey.includes('dummy_anon_key')
  );
}

/**
 * Maps raw public.profiles database record to frontend UserProfile model
 */
export function mapProfileRecord(raw: any, fallbackEmail?: string): UserProfile {
  return {
    id: raw.id,
    handle: raw.username || raw.handle || (fallbackEmail ? fallbackEmail.split('@')[0] : 'researcher'),
    fullName: raw.full_name || 'Researcher',
    avatarUrl: raw.avatar_url || undefined,
    academicTitle: raw.academic_title || 'Academic Researcher',
    institution: raw.institution || 'Independent Research',
    bio: raw.bio || '',
    location: raw.location || undefined,
    country: raw.country || undefined,
    orcidId: raw.orcid_id || undefined,
    orcidVerified: Boolean(raw.orcid_verified),
    websiteUrl: raw.website_url || undefined,
    researchInterests: Array.isArray(raw.research_interests) ? raw.research_interests : [],
    followersCount: raw.followers_count || 0,
    followingCount: raw.following_count || 0,
    postsCount: raw.posts_count || 0,
    savedCount: raw.saved_count || 0,
    joinedDate: raw.created_at
      ? new Date(raw.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : 'Recently joined',
  };
}

/**
 * Fetch profile for a given user UUID from Supabase public.profiles
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) return null;
    return mapProfileRecord(data);
  } catch {
    return null;
  }
}

/**
 * Fetch profile for a given unique handle/username (case-insensitive)
 */
export async function fetchUserProfileByUsername(username: string): Promise<UserProfile | null> {
  try {
    const normalized = normalizeHandle(username);
    if (!normalized) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', normalized)
      .maybeSingle();

    if (error || !data) return null;
    return mapProfileRecord(data);
  } catch {
    return null;
  }
}

const LOCAL_SESSION_KEY = 'booffin_active_user_session';
let memoryLocalSession: UserProfile | null = null;

export function getStoredLocalSession(): UserProfile | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(LOCAL_SESSION_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch {}
  return memoryLocalSession;
}

export function setStoredLocalSession(profile: UserProfile | null): void {
  memoryLocalSession = profile;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (profile) {
        window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(profile));
      } else {
        window.localStorage.removeItem(LOCAL_SESSION_KEY);
      }
    }
  } catch {}
}

/**
 * Retrieves the currently active session and restored user profile from Supabase Auth
 */
export async function getInitialAuthSession(): Promise<UserProfile | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) return null;

    const profile = await fetchUserProfile(session.user.id);
    if (profile) {
      setStoredLocalSession(profile);
      return profile;
    }

    // If profile table row is not yet provisioned, construct profile from metadata
    const metadata = session.user.user_metadata || {};
    const fallbackProfile: UserProfile = {
      id: session.user.id,
      handle: (metadata.handle || metadata.username || session.user.email?.split('@')[0] || 'researcher').toLowerCase(),
      fullName: metadata.full_name || metadata.name || 'Researcher',
      academicTitle: metadata.academic_title || 'Research Enthusiast',
      institution: metadata.institution || 'Independent',
      bio: '',
      orcidVerified: Boolean(metadata.orcid_id),
      orcidId: metadata.orcid_id,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      savedCount: 0,
      joinedDate: 'Recently',
      researchInterests: [],
    };
    setStoredLocalSession(fallbackProfile);
    return fallbackProfile;
  } catch {
    return null;
  }
}

export const getCurrentUser = getInitialAuthSession;

/**
 * Sign In with Email & Password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      return { user: null, error: 'Email and password are required.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (data.user) {
      let profile = await fetchUserProfile(data.user.id);
      if (!profile) {
        profile = {
          id: data.user.id,
          handle: cleanEmail.split('@')[0],
          fullName: data.user.user_metadata?.full_name || 'Researcher',
          academicTitle: 'Researcher',
          institution: 'Independent',
          bio: '',
          orcidVerified: false,
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          savedCount: 0,
          joinedDate: 'Recently',
          researchInterests: [],
        };
      }
      setStoredLocalSession(profile);
      return { user: profile, error: null };
    }

    return { user: null, error: 'No user data returned from authentication.' };
  } catch (err: any) {
    return {
      user: null,
      error: err.message || 'An unexpected error occurred during sign in.',
    };
  }
}

/**
 * Sign Up with Email & Password (Identity creation step)
 */
export async function signUpWithEmail(
  params: SignUpParams
): Promise<AuthResponse> {
  try {
    const cleanEmail = params.email.trim().toLowerCase();
    const fallbackHandle = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || 'researcher';
    const cleanHandle = (params.handle || fallbackHandle).trim().replace(/^@/, '').toLowerCase();
    const cleanFullName = (params.fullName || 'Researcher').trim();

    if (!cleanEmail || !params.password) {
      return { user: null, error: 'Email and password are required.' };
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: params.password,
      options: {
        data: {
          full_name: cleanFullName,
          username: cleanHandle,
          handle: cleanHandle,
          academic_title: params.academicTitle || 'Research Enthusiast',
          institution: params.institution || 'Independent',
        },
      },
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (data.user) {
      let profile = await fetchUserProfile(data.user.id);
      if (!profile) {
        profile = {
          id: data.user.id,
          handle: cleanHandle,
          fullName: cleanFullName,
          academicTitle: params.academicTitle || 'Research Enthusiast',
          institution: params.institution || 'Independent',
          bio: '',
          orcidVerified: false,
          followingCount: 0,
          followersCount: 0,
          postsCount: 0,
          savedCount: 0,
          joinedDate: 'Just now',
          researchInterests: [],
        };

        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            username: cleanHandle,
            full_name: cleanFullName,
            academic_title: profile.academicTitle,
            institution: profile.institution,
          });
        } catch {}
      }

      setStoredLocalSession(profile);
      return { user: profile, error: null };
    }

    return { user: null, error: 'Account created. Please check your email for confirmation if required.' };
  } catch (err: any) {
    return {
      user: null,
      error: err.message || 'An unexpected error occurred during account creation.',
    };
  }
}

export const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'booffin',
  'boffin',
  'support',
  'help',
  'moderator',
  'mod',
  'staff',
  'security',
  'system',
  'root',
  'api',
  'auth',
  'explore',
  'feed',
  'profile',
  'search',
  'settings',
  'paper',
  'papers',
  'post',
  'posts',
  'topic',
  'topics',
  'notifications',
  'login',
  'signup',
  'welcome',
  'terms',
  'privacy',
  'about',
  'contact',
  'careers',
  'app',
  'dev',
  'developer',
  'staging',
  'production',
  'status',
  'bot',
]);

/**
 * Normalizes username by trimming, removing leading @ symbols, and lowercasing
 */
export function normalizeHandle(handle: string): string {
  if (!handle) return '';
  return handle.trim().replace(/^@+/, '').toLowerCase();
}

export interface UsernameValidationResult {
  isValid: boolean;
  normalized: string;
  error: string | null;
}

/**
 * Validates handle format, length, and reserved list
 */
export function validateUsername(handle: string): UsernameValidationResult {
  const normalized = normalizeHandle(handle);
  if (!normalized) {
    return { isValid: false, normalized: '', error: 'Please enter a handle.' };
  }
  if (normalized.length < 3) {
    return { isValid: false, normalized, error: 'Handle must be at least 3 characters.' };
  }
  if (normalized.length > 30) {
    return { isValid: false, normalized, error: 'Handle cannot exceed 30 characters.' };
  }
  if (!/^[a-z0-9_]+$/.test(normalized)) {
    return {
      isValid: false,
      normalized,
      error: 'Handle can only contain letters, numbers, and underscores.',
    };
  }
  if (RESERVED_USERNAMES.has(normalized)) {
    return {
      isValid: false,
      normalized,
      error: 'This handle is reserved by BooffIn.',
    };
  }
  return { isValid: true, normalized, error: null };
}

export interface UsernameAvailabilityResult {
  isAvailable: boolean;
  normalized: string;
  error: string | null;
}

/**
 * Checks if a username is available in Supabase (with client-side preflight and RPC)
 */
export async function checkUsernameAvailability(
  handle: string,
  forUserId?: string
): Promise<UsernameAvailabilityResult> {
  const validation = validateUsername(handle);
  if (!validation.isValid) {
    return { isAvailable: false, normalized: validation.normalized, error: validation.error };
  }

  const normalized = validation.normalized;

  try {
    // 1. Try secure RPC function
    const { data, error } = await supabase.rpc('check_username_available', {
      requested_username: normalized,
      for_user_id: forUserId || null,
    });

    if (!error && data && typeof data === 'object') {
      const isAvailable = Boolean((data as any).available);
      return {
        isAvailable,
        normalized,
        error: isAvailable ? null : ((data as any).message || 'Handle is not available.'),
      };
    }

    // 2. Direct query fallback
    let query = supabase
      .from('profiles')
      .select('id')
      .eq('username', normalized);

    if (forUserId) {
      query = query.neq('id', forUserId);
    }

    const { data: existing, error: queryError } = await query.maybeSingle();

    if (queryError) {
      return { isAvailable: false, normalized, error: 'Could not check availability. Please try again.' };
    }

    if (existing) {
      return {
        isAvailable: false,
        normalized,
        error: 'This handle is already taken by another researcher.',
      };
    }

    return { isAvailable: true, normalized, error: null };
  } catch {
    return { isAvailable: false, normalized, error: 'Network error checking handle availability.' };
  }
}

/**
 * Persists updated researcher onboarding/profile information directly to Supabase
 */
export async function persistUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<{ success: boolean; error: string | null }> {
  try {
    const dbPayload: any = {};
    if (updates.fullName !== undefined) dbPayload.full_name = updates.fullName.trim();
    if (updates.handle !== undefined) {
      const val = validateUsername(updates.handle);
      if (!val.isValid) {
        return { success: false, error: val.error };
      }
      dbPayload.username = val.normalized;
    }
    if (updates.academicTitle !== undefined) dbPayload.academic_title = updates.academicTitle.trim();
    if (updates.institution !== undefined) dbPayload.institution = updates.institution.trim();
    if (updates.bio !== undefined) dbPayload.bio = updates.bio.trim();
    if (updates.orcidId !== undefined) {
      dbPayload.orcid_id = updates.orcidId.trim() || null;
      dbPayload.orcid_verified = Boolean(updates.orcidId.trim());
    }
    if (updates.researchInterests !== undefined) dbPayload.research_interests = updates.researchInterests;
    if (updates.avatarUrl !== undefined) dbPayload.avatar_url = updates.avatarUrl;
    if (updates.websiteUrl !== undefined) dbPayload.website_url = updates.websiteUrl;
    if (updates.location !== undefined) dbPayload.location = updates.location;

    const { error } = await supabase
      .from('profiles')
      .update(dbPayload)
      .eq('id', userId);

    if (error) {
      console.warn('persistUserProfile warning:', error.message);
      if (error.code === '23505' || error.message.includes('unique') || error.message.includes('profiles_username')) {
        return { success: false, error: 'This handle is already taken by another researcher.' };
      }
      if (error.message.includes('chk_username_not_reserved')) {
        return { success: false, error: 'This handle is reserved by BooffIn.' };
      }
      if (error.message.includes('chk_username_format')) {
        return { success: false, error: 'Handle must be 3-30 characters using lowercase letters, numbers, and underscores.' };
      }
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update researcher profile.' };
  }
}

/**
 * Validates if an existing user has already completed onboarding
 */
export function isProfileComplete(user: UserProfile | null): boolean {
  if (!user) return false;
  const hasInterests = Array.isArray(user.researchInterests) && user.researchInterests.length > 0;
  const hasValidName = Boolean(
    user.fullName &&
    user.fullName.trim().length > 0 &&
    user.fullName.trim().toLowerCase() !== 'researcher'
  );
  return hasInterests && hasValidName;
}

/**
 * Sign In with Google OAuth
 */
export async function signInWithGoogle(): Promise<AuthResponse> {
  try {
    const redirectUrl = createAuthRedirectUrl('auth/callback');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account consent',
        },
      },
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (typeof window !== 'undefined' && data?.url) {
      window.location.href = data.url;
      return { user: null, error: null };
    }

    if (data?.url && !isWeb) {
      const res = await openAuthSession(data.url, redirectUrl);
      if (res.type === 'success' && res.url) {
        const urlObj = new URL(res.url);
        const accessToken = urlObj.searchParams.get('access_token') || urlObj.hash.match(/access_token=([^&]*)/)?.[1];
        const refreshToken = urlObj.searchParams.get('refresh_token') || urlObj.hash.match(/refresh_token=([^&]*)/)?.[1];
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          const session = await getInitialAuthSession();
          if (session) {
            setStoredLocalSession(session);
            return { user: session, error: null };
          }
        }
      }
      return { user: null, error: 'Google sign-in was cancelled.' };
    }

    return { user: null, error: 'Could not obtain Google authentication URL.' };
  } catch (err: any) {
    return {
      user: null,
      error: err.message || 'Google authentication failed.',
    };
  }
}

/**
 * Sign In with ORCID / Academic OAuth
 */
export async function signInWithORCID(): Promise<AuthResponse> {
  try {
    const redirectUrl = createAuthRedirectUrl('auth/callback');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'orcid' as any,
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (typeof window !== 'undefined' && data?.url) {
      window.location.href = data.url;
      return { user: null, error: null };
    }

    if (data?.url && !isWeb) {
      const res = await openAuthSession(data.url, redirectUrl);
      if (res.type === 'success' && res.url) {
        const urlObj = new URL(res.url);
        const accessToken = urlObj.searchParams.get('access_token') || urlObj.hash.match(/access_token=([^&]*)/)?.[1];
        const refreshToken = urlObj.searchParams.get('refresh_token') || urlObj.hash.match(/refresh_token=([^&]*)/)?.[1];
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          const session = await getInitialAuthSession();
          if (session) {
            setStoredLocalSession(session);
            return { user: session, error: null };
          }
        }
      }
      return { user: null, error: 'ORCID authentication was cancelled.' };
    }

    return { user: null, error: 'Could not obtain ORCID authentication URL.' };
  } catch (err: any) {
    return {
      user: null,
      error: err.message || 'ORCID Authentication failed.',
    };
  }
}

/**
 * Request Password Reset Email
 */
export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Please provide a valid email address.' };
    }

    const redirectUrl = createAuthRedirectUrl('auth/reset-password');
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to send password reset link.',
    };
  }
}

/**
 * Sign Out & Clear Active Session
 */
export async function signOutUser(): Promise<void> {
  try {
    setStoredLocalSession(null);
    await supabase.auth.signOut();
  } catch {
    setStoredLocalSession(null);
  }
}
