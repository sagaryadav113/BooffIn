import { Platform } from 'react-native';
import { supabase, appStorage } from './client';
import { UserProfile } from '../types';

const isWeb = Platform.OS === 'web';

function createAuthRedirectUrl(path: string): string {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location && window.location.origin) {
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      return `${window.location.origin}${cleanPath}`;
    }
    const Linking = require('expo-linking');
    return Linking.createURL(path);
  } catch {
    return `booffin://${path}`;
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
export function mapProfileRecord(raw: any, fallbackEmail?: string, isFollowing?: boolean): UserProfile {
  return {
    id: raw.id,
    handle: raw.username || raw.handle || (fallbackEmail ? fallbackEmail.split('@')[0] : 'researcher'),
    fullName: raw.full_name || 'Researcher',
    avatarUrl: raw.avatar_url || undefined,
    bannerUrl: raw.banner_url || undefined,
    hasCustomAvatar: Boolean(raw.has_custom_avatar),
    hasCustomBanner: Boolean(raw.has_custom_banner),
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
    isFollowing: isFollowing !== undefined ? isFollowing : (raw.is_following ?? undefined),
    department: raw.department || undefined,
    labGroup: raw.lab_group || undefined,
    primaryField: raw.primary_field || undefined,
    secondaryFields: Array.isArray(raw.secondary_fields) ? raw.secondary_fields : [],
    degreeProgram: raw.degree_program || undefined,
    graduationYear: raw.graduation_year || undefined,
    googleScholarUrl: raw.google_scholar_url || undefined,
    researchgateUrl: raw.researchgate_url || undefined,
    linkedinUrl: raw.linkedin_url || undefined,
    scopusId: raw.scopus_id || undefined,
    isPrivateRestricted: Boolean(raw.is_private_restricted),
    isBlocked: Boolean(raw.is_blocked),
    visibilityLevel: raw.visibility_level || 'public',
  };
}

/**
 * Fetch profile for a given user UUID from Supabase, enforcing database privacy boundary
 */
export async function fetchUserProfile(userId: string, viewerId?: string): Promise<UserProfile | null> {
  try {
    // 1. Database-enforced profile privacy boundary via get_user_profile RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_profile', {
      p_user_id: userId,
    });

    if (!rpcError && rpcData && typeof rpcData === 'object' && (rpcData as any).id) {
      return mapProfileRecord(rpcData, undefined, (rpcData as any).is_following);
    }

    if (rpcError) {
      console.warn('[authService] get_user_profile RPC error:', rpcError.message);
    }

    // Fail safe: NEVER fall back to unrestricted table select('*')
    return null;
  } catch (err) {
    console.warn('[authService] fetchUserProfile error:', err);
    return null;
  }
}

/**
 * Fetch profile for a given unique handle/username, enforcing database privacy boundary
 */
export async function fetchUserProfileByUsername(username: string, viewerId?: string): Promise<UserProfile | null> {
  try {
    const normalized = normalizeHandle(username);
    if (!normalized) return null;

    // 1. Database-enforced profile privacy boundary via get_user_profile RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_profile', {
      p_username: normalized,
    });

    if (!rpcError && rpcData && typeof rpcData === 'object' && (rpcData as any).id) {
      return mapProfileRecord(rpcData, undefined, (rpcData as any).is_following);
    }

    if (rpcError) {
      console.warn('[authService] get_user_profile by username RPC error:', rpcError.message);
    }

    // Fail safe: NEVER fall back to unrestricted table select('*')
    return null;
  } catch (err) {
    console.warn('[authService] fetchUserProfileByUsername error:', err);
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
  try {
    if (profile) {
      appStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(profile)).catch(() => {});
    } else {
      appStorage.removeItem(LOCAL_SESSION_KEY).catch(() => {});
    }
  } catch {}
}

/**
 * Retrieves the currently active session and restored user profile from Supabase Auth
 */
export async function getInitialAuthSession(): Promise<UserProfile | null> {
  try {
    // If memory local session is empty, check appStorage
    if (!memoryLocalSession) {
      try {
        const storedStr = await appStorage.getItem(LOCAL_SESSION_KEY);
        if (storedStr) {
          memoryLocalSession = JSON.parse(storedStr);
        }
      } catch {}
    }

    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) {
      return null;
    }

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
    return memoryLocalSession;
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

    const pwdVal = validatePassword(params.password);
    if (!pwdVal.isValid) {
      return { user: null, error: pwdVal.error };
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

export interface PasswordValidationResult {
  isValid: boolean;
  error: string | null;
}

/**
 * Validates password using modern professional social media standards (like Instagram):
 * - Minimum 6 characters (up to 128)
 * - Must contain letters and numbers (combination of letters & digits)
 * - No spaces allowed
 * - Does not require complex special characters
 */
export function validatePassword(password: string): PasswordValidationResult {
  if (!password) {
    return { isValid: false, error: 'Password is required.' };
  }
  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters long.' };
  }
  if (password.length > 128) {
    return { isValid: false, error: 'Password cannot exceed 128 characters.' };
  }
  if (/\s/.test(password)) {
    return { isValid: false, error: 'Password cannot contain spaces.' };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number.' };
  }
  return { isValid: true, error: null };
}

export interface UsernameValidationResult {
  isValid: boolean;
  normalized: string;
  error: string | null;
}

/**
 * Validates username using professional social media standards (like Instagram):
 * - Length: between 3 and 16 characters (16-character limit)
 * - No spaces allowed anywhere in username
 * - Allowed characters: lowercase letters, numbers, underscores (_), and periods (.)
 * - Cannot start or end with a period or underscore
 * - Cannot have consecutive periods or underscores (e.g. '..' or '__')
 * - Protected against reserved system usernames
 */
export function validateUsername(handle: string): UsernameValidationResult {
  if (!handle || handle.trim() === '') {
    return { isValid: false, normalized: '', error: 'Please enter a username.' };
  }
  if (/\s/.test(handle)) {
    return {
      isValid: false,
      normalized: handle.trim().toLowerCase().replace(/\s+/g, ''),
      error: 'Username cannot contain spaces.',
    };
  }
  const normalized = normalizeHandle(handle);
  if (normalized.length < 3) {
    return { isValid: false, normalized, error: 'Username must be at least 3 characters.' };
  }
  if (normalized.length > 16) {
    return { isValid: false, normalized, error: 'Username cannot exceed 16 characters.' };
  }
  if (!/^[a-z0-9_.]+$/.test(normalized)) {
    return {
      isValid: false,
      normalized,
      error: 'Username can only contain letters, numbers, underscores, and periods.',
    };
  }
  if (/^[._]/.test(normalized)) {
    return {
      isValid: false,
      normalized,
      error: 'Username cannot start with a period or underscore.',
    };
  }
  if (/[._]$/.test(normalized)) {
    return {
      isValid: false,
      normalized,
      error: 'Username cannot end with a period or underscore.',
    };
  }
  if (/\.\./.test(normalized) || /__/.test(normalized) || /\._|\_\./.test(normalized)) {
    return {
      isValid: false,
      normalized,
      error: 'Username cannot contain consecutive symbols.',
    };
  }
  if (RESERVED_USERNAMES.has(normalized)) {
    return {
      isValid: false,
      normalized,
      error: 'This username is reserved by BooffIn.',
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
    }
    if (updates.orcidVerified !== undefined) {
      dbPayload.orcid_verified = Boolean(updates.orcidVerified);
    }
    if (updates.researchInterests !== undefined) dbPayload.research_interests = updates.researchInterests;
    if (updates.avatarUrl !== undefined) dbPayload.avatar_url = updates.avatarUrl;
    if (updates.bannerUrl !== undefined) dbPayload.banner_url = updates.bannerUrl;
    if (updates.hasCustomAvatar !== undefined) dbPayload.has_custom_avatar = updates.hasCustomAvatar;
    if (updates.hasCustomBanner !== undefined) dbPayload.has_custom_banner = updates.hasCustomBanner;
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

function extractOAuthParams(rawUrl: string) {
  const codeMatch = rawUrl.match(/[?&]code=([^&#]+)/);
  const tokenMatch = rawUrl.match(/[#?&]access_token=([^&#]+)/);
  const refreshMatch = rawUrl.match(/[#?&]refresh_token=([^&#]+)/);
  const errorMatch = rawUrl.match(/[#?&](?:error_description|error)=([^&#]+)/);

  return {
    code: codeMatch ? decodeURIComponent(codeMatch[1]) : null,
    accessToken: tokenMatch ? decodeURIComponent(tokenMatch[1]) : null,
    refreshToken: refreshMatch ? decodeURIComponent(refreshMatch[1]) : null,
    errorDesc: errorMatch ? decodeURIComponent(errorMatch[1]) : null,
  };
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

    if (isWeb && data?.url) {
      if (typeof window !== 'undefined') {
        window.location.href = data.url;
      }
      return { user: null, error: null };
    }

    if (data?.url && !isWeb) {
      const res = await openAuthSession(data.url, redirectUrl);
      if (res.type === 'success' && res.url) {
        const { code, accessToken, refreshToken, errorDesc } = extractOAuthParams(res.url);

        if (errorDesc) {
          return { user: null, error: errorDesc };
        }

        if (code) {
          const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.warn('[authService] exchangeCodeForSession info:', exchangeError.message);
          }
          if (exchangeData?.session?.user) {
            const profile = (await fetchUserProfile(exchangeData.session.user.id)) || (await getInitialAuthSession());
            if (profile) {
              setStoredLocalSession(profile);
              return { user: profile, error: null };
            }
          }
        } else if (accessToken && refreshToken) {
          const { data: setSessionData, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setSessionData?.session?.user) {
            const profile = (await fetchUserProfile(setSessionData.session.user.id)) || (await getInitialAuthSession());
            if (profile) {
              setStoredLocalSession(profile);
              return { user: profile, error: null };
            }
          }
        }
      }

      // Check if session is already active (exchanged directly or by onAuthStateChange listener)
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: { session: activeSession } } = await supabase.auth.getSession();
        if (activeSession?.user) {
          const session = await getInitialAuthSession();
          if (session) {
            setStoredLocalSession(session);
            return { user: session, error: null };
          }
        }
        await new Promise((r) => setTimeout(r, 200));
      }

      if (res.type === 'cancel' || res.type === 'dismiss') {
        return { user: null, error: 'Google sign-in was cancelled.' };
      }

      return { user: null, error: 'Could not complete Google authentication.' };
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

    if (isWeb && data?.url) {
      if (typeof window !== 'undefined') {
        window.location.href = data.url;
      }
      return { user: null, error: null };
    }

    if (data?.url && !isWeb) {
      const res = await openAuthSession(data.url, redirectUrl);
      if (res.type === 'success' && res.url) {
        const { code, accessToken, refreshToken, errorDesc } = extractOAuthParams(res.url);

        if (errorDesc) {
          return { user: null, error: errorDesc };
        }

        if (code) {
          const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.warn('[authService] exchangeCodeForSession ORCID info:', exchangeError.message);
          }
          if (exchangeData?.session?.user) {
            const profile = (await fetchUserProfile(exchangeData.session.user.id)) || (await getInitialAuthSession());
            if (profile) {
              setStoredLocalSession(profile);
              return { user: profile, error: null };
            }
          }
        } else if (accessToken && refreshToken) {
          const { data: setSessionData } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setSessionData?.session?.user) {
            const profile = (await fetchUserProfile(setSessionData.session.user.id)) || (await getInitialAuthSession());
            if (profile) {
              setStoredLocalSession(profile);
              return { user: profile, error: null };
            }
          }
        }
      }

      // Check if session is already active
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: { session: activeSession } } = await supabase.auth.getSession();
        if (activeSession?.user) {
          const session = await getInitialAuthSession();
          if (session) {
            setStoredLocalSession(session);
            return { user: session, error: null };
          }
        }
        await new Promise((r) => setTimeout(r, 200));
      }

      if (res.type === 'cancel' || res.type === 'dismiss') {
        return { user: null, error: 'ORCID authentication was cancelled.' };
      }

      return { user: null, error: 'Could not complete ORCID authentication.' };
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

/**
 * Verifies user's password and safely disconnects their ORCID account
 */
export async function verifyPasswordAndDisconnectOrcid(
  userId: string,
  password: string,
  userEmail?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!password || !password.trim()) {
      return { success: false, error: 'Please enter your password to confirm disconnecting ORCID.' };
    }

    // 1. Resolve active user email
    let resolvedEmail = userEmail?.trim().toLowerCase();
    if (!resolvedEmail) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        resolvedEmail = authData.user?.email?.toLowerCase();
      } catch {}
    }

    // 2. If email is available, verify password with Supabase
    if (resolvedEmail) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password: password.trim(),
      });

      if (signInError) {
        return {
          success: false,
          error: 'Incorrect password. Please verify your password and try again.',
        };
      }
    }

    // 3. Clear ORCID credentials on profiles database table
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        orcid_id: null,
        orcid_verified: false,
      })
      .eq('id', userId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // 4. Remove cached publications for this user
    try {
      await supabase.from('scholar_publications').delete().eq('user_id', userId);
    } catch {}

    // 5. Update stored local session
    const session = getStoredLocalSession();
    if (session && session.id === userId) {
      setStoredLocalSession({
        ...session,
        orcidId: undefined,
        orcidVerified: false,
      });
    }

    return { success: true, error: null };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Could not verify password and disconnect ORCID.',
    };
  }
}
/**
 * Checks if an ORCID iD is already verified and claimed by another BooffIn account.
 */
export async function checkOrcidAvailability(
  orcidId: string,
  currentUserId?: string
): Promise<{ available: boolean; claimedBy?: string; error?: string | null }> {
  try {
    const cleanOrcid = orcidId.trim();
    if (!cleanOrcid) {
      return { available: false, error: 'Invalid ORCID iD provided.' };
    }

    let query = supabase
      .from('profiles')
      .select('id, full_name, username, orcid_id, orcid_verified')
      .eq('orcid_id', cleanOrcid)
      .eq('orcid_verified', true);

    if (currentUserId) {
      query = query.neq('id', currentUserId);
    }

    const { data: existingProfiles, error } = await query;

    if (error) {
      console.warn('Error checking ORCID uniqueness:', error.message);
      return { available: true, error: null };
    }

    if (existingProfiles && existingProfiles.length > 0) {
      const claimedUser = existingProfiles[0];
      const nameOrHandle = claimedUser.full_name || claimedUser.username || 'another researcher';
      return {
        available: false,
        claimedBy: nameOrHandle,
        error: `This ORCID iD is already verified and linked to another BooffIn account (${nameOrHandle}). Each ORCID iD can only be associated with a single verified author account.`,
      };
    }

    return { available: true, error: null };
  } catch (err: any) {
    return { available: true, error: null };
  }
}

/**
 * Verifies user's BooffIn account password and securely links + verifies their ORCID author badge.
 * Enforces strict anti-impersonation:
 * 1. Checks that the ORCID iD is not already claimed on another account.
 * 2. Authenticates the account owner's password with Supabase Auth.
 * 3. Updates the database and local session only on successful verification.
 */
export async function verifyPasswordAndLinkOrcid(
  userId: string,
  orcidId: string,
  password?: string,
  userEmail?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const cleanOrcid = orcidId.trim();
    if (!cleanOrcid) {
      return {
        success: false,
        error: 'Invalid ORCID iD provided.',
      };
    }

    // 1. Strict Uniqueness Check: Ensure no other user has claimed this ORCID iD
    const availability = await checkOrcidAvailability(cleanOrcid, userId);
    if (!availability.available) {
      return {
        success: false,
        error:
          availability.error ||
          'This ORCID iD is already verified and linked to another BooffIn account. Only the authentic author can hold this badge.',
      };
    }

    // 2. If password provided, verify against Supabase Auth to confirm account ownership
    if (password && password.trim()) {
      let resolvedEmail = userEmail?.trim().toLowerCase();
      if (!resolvedEmail) {
        try {
          const { data: authData } = await supabase.auth.getUser();
          resolvedEmail = authData.user?.email?.toLowerCase();
        } catch {}
      }

      if (resolvedEmail) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: resolvedEmail,
          password: password.trim(),
        });

        if (signInError) {
          return {
            success: false,
            error: 'Incorrect account password. Please enter your valid BooffIn password to confirm.',
          };
        }
      }
    }

    // 3. Update ORCID credentials on profiles database table
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        orcid_id: cleanOrcid,
        orcid_verified: true,
      })
      .eq('id', userId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // 4. Update stored local session
    const session = getStoredLocalSession();
    if (session && session.id === userId) {
      setStoredLocalSession({
        ...session,
        orcidId: cleanOrcid,
        orcidVerified: true,
      });
    }

    return { success: true, error: null };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Could not verify credentials and link ORCID.',
    };
  }
}
