import { supabase } from './client';
import { UserProfile } from '../types';
import { currentUser, mockUsers } from '../data/mockData';

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
  fullName: string;
  handle: string;
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
    bio: raw.bio || 'Exploring scientific literature and methodology.',
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
    if (!isLiveSupabaseConfigured()) {
      return mockUsers.find((u) => u.id === userId) || currentUser;
    }

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
 * Retrieves the currently active session and restored user profile
 */
export async function getInitialAuthSession(): Promise<UserProfile | null> {
  try {
    if (isLiveSupabaseConfigured()) {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) return null;

      const profile = await fetchUserProfile(session.user.id);
      if (profile) {
        setStoredLocalSession(profile);
        return profile;
      }

      // If user exists in auth but profile table row is missing, construct profile from metadata
      const fallbackProfile: UserProfile = {
        ...currentUser,
        id: session.user.id,
        handle: (session.user.user_metadata?.handle || session.user.email?.split('@')[0] || 'researcher').toLowerCase(),
        fullName: session.user.user_metadata?.full_name || 'Researcher',
        academicTitle: session.user.user_metadata?.academic_title || 'Research Enthusiast',
        institution: session.user.user_metadata?.institution || 'Independent',
      };
      setStoredLocalSession(fallbackProfile);
      return fallbackProfile;
    }

    return getStoredLocalSession();
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

    // 1. Live Supabase Auth
    if (isLiveSupabaseConfigured()) {
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
            ...currentUser,
            id: data.user.id,
            handle: cleanEmail.split('@')[0],
          };
        }
        return { user: profile, error: null };
      }
    }

    // 2. Mock Fallback (Match by email or handle)
    const matchedUser = mockUsers.find(
      (u) =>
        u.handle.toLowerCase() === cleanEmail.split('@')[0] ||
        `${u.handle}@university.edu`.toLowerCase() === cleanEmail ||
        cleanEmail.includes(u.handle.toLowerCase())
    );

    if (matchedUser) {
      setStoredLocalSession(matchedUser);
      return { user: matchedUser, error: null };
    }

    const dynamicUser: UserProfile = {
      ...currentUser,
      id: `usr_${Date.now()}`,
      handle: cleanEmail.split('@')[0] || 'researcher',
      fullName: cleanEmail.split('@')[0].toUpperCase(),
    };

    setStoredLocalSession(dynamicUser);
    return { user: dynamicUser, error: null };
  } catch (err: any) {
    return {
      user: null,
      error: err.message || 'An unexpected error occurred during sign in.',
    };
  }
}

/**
 * Sign Up with Email, Password & Academic Metadata
 */
export async function signUpWithEmail(
  params: SignUpParams
): Promise<AuthResponse> {
  try {
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanHandle = params.handle.trim().replace(/^@/, '').toLowerCase();

    if (!cleanEmail || !params.password) {
      return { user: null, error: 'Email and password are required.' };
    }
    if (!cleanHandle) {
      return { user: null, error: 'Username handle is required.' };
    }
    if (!params.fullName.trim()) {
      return { user: null, error: 'Full name is required.' };
    }

    if (isLiveSupabaseConfigured()) {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: params.password,
        options: {
          data: {
            full_name: params.fullName.trim(),
            username: cleanHandle,
            handle: cleanHandle,
            academic_title: params.academicTitle,
            institution: params.institution,
          },
        },
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        const newProfile: UserProfile = {
          id: data.user.id,
          handle: cleanHandle,
          fullName: params.fullName.trim(),
          academicTitle: params.academicTitle || 'Student & Research Enthusiast',
          institution: params.institution || 'Independent Researcher',
          bio: 'Exploring literature, asking questions, and discussing peer-reviewed science.',
          orcidVerified: false,
          followingCount: 0,
          followersCount: 0,
          postsCount: 0,
          savedCount: 0,
          joinedDate: 'Just now',
        };

        // Explicit profile table upsert as safety fallback
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            username: cleanHandle,
            full_name: params.fullName.trim(),
            academic_title: params.academicTitle || 'Research Enthusiast',
            institution: params.institution || 'Independent',
          });
        } catch {}

        setStoredLocalSession(newProfile);
        return { user: newProfile, error: null };
      }
    }

    // Mock Fallback
    const mockNewUser: UserProfile = {
      id: `usr_${Date.now()}`,
      handle: cleanHandle || 'newresearcher',
      fullName: params.fullName.trim() || 'New Researcher',
      academicTitle: params.academicTitle || 'Research Enthusiast',
      institution: params.institution || 'Independent',
      bio: 'Exploring literature and discussing peer-reviewed science on BooffIn.',
      orcidVerified: false,
      followingCount: 0,
      followersCount: 0,
      postsCount: 0,
      savedCount: 0,
      joinedDate: 'Just now',
    };

    setStoredLocalSession(mockNewUser);
    return { user: mockNewUser, error: null };
  } catch (err: any) {
    return {
      user: null,
      error: err.message || 'An unexpected error occurred during account creation.',
    };
  }
}

/**
 * Sign In with Google OAuth
 */
export async function signInWithGoogle(): Promise<AuthResponse> {
  try {
    if (isLiveSupabaseConfigured()) {
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
    }

    return {
      user: null,
      error: 'Google Sign-In requires Supabase credentials (EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY). Please set these in your environment, or use "Create Account with Email".',
    };
  } catch (err: any) {
    return {
      user: null,
      error: err.message || 'Google authentication was cancelled or failed.',
    };
  }
}

/**
 * Sign In with ORCID / Academic OAuth
 */
export async function signInWithORCID(): Promise<AuthResponse> {
  try {
    if (isLiveSupabaseConfigured()) {
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
    }

    return {
      user: null,
      error: 'ORCID Sign-In requires live Supabase credentials (EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY). Please set these in your environment, or use "Create Account with Email".',
    };
  } catch (err: any) {
    return {
      user: null,
      error: err.message || 'ORCID Authentication cancelled or unavailable.',
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

    if (isLiveSupabaseConfigured()) {
      const redirectUrl = createAuthRedirectUrl('auth/reset-password');
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        return { success: false, error: error.message };
      }
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
    if (isLiveSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
  } catch {
    setStoredLocalSession(null);
  }
}
