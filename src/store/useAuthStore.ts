import { Alert } from 'react-native';
import { create } from 'zustand';
import { UserProfile } from '../types';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle as authServiceSignInWithGoogle,
  signInWithORCID as authServiceSignInWithORCID,
  signOutUser,
  sendPasswordResetEmail,
  getInitialAuthSession,
  fetchUserProfile,
  getStoredLocalSession,
  setStoredLocalSession,
  persistUserProfile,
  SignUpParams,
  extractOAuthParams,
  sendEmailOtp,
  verifyEmailOtp,
} from '../api/authService';
import {
  toggleFollowUserRpc,
  fetchUserFollowingIds,
  fetchOutgoingFollowRequestIds,
  fetchUserFollowerIds,
  removeFollower,
} from '../api/socialService';
import { checkCanFollow, recordFollowAction } from '../api/socialRateLimit';
import { useSearchStore } from './useSearchStore';
import { supabase, appStorage } from '../api/client';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export const emptyUserProfile: UserProfile = {
  id: '',
  handle: '',
  fullName: '',
  avatarUrl: undefined,
  academicTitle: '',
  institution: '',
  bio: '',
  orcidVerified: false,
  followingCount: 0,
  followersCount: 0,
  postsCount: 0,
  savedCount: 0,
  joinedDate: '',
};

interface AuthState {
  user: UserProfile;
  authStatus: AuthStatus;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  users: UserProfile[];
  followingIds: Set<string>;
  requestedUserIds: Set<string>;
  followerIds: Set<string>;
  followLoadingIds: Set<string>;
  isInitialized: boolean;

  // Actions
  initializeAuth: () => Promise<void>;
  loadFollowingIds: (userId: string) => Promise<void>;
  isFollowingUser: (userId: string) => boolean;
  isRequestedUser: (userId: string) => boolean;
  isFollowerUser: (userId: string) => boolean;
  removeFollowerUser: (followerUserId: string) => Promise<boolean>;
  signIn: (email: string, pass: string) => Promise<boolean>;
  signUp: (params: SignUpParams) => Promise<boolean>;
  sendOtp: (email: string) => Promise<{ success: boolean; error: string | null }>;
  verifyOtp: (email: string, token: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  signInWithORCID: () => Promise<boolean>;
  resetPassword: (email: string) => Promise<{ success: boolean; error: string | null }>;
  signOut: () => Promise<void>;
  clearError: () => void;
  updateProfile: (updated: Partial<UserProfile>) => Promise<{ success: boolean; error: string | null }>;
  toggleFollowUser: (userId: string) => Promise<boolean>;
  refreshCurrentUserProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: emptyUserProfile,
  authStatus: 'unauthenticated',
  isAuthenticated: false,
  isLoading: false,
  authError: null,
  users: [],
  followingIds: new Set<string>(),
  requestedUserIds: new Set<string>(),
  followerIds: new Set<string>(),
  followLoadingIds: new Set<string>(),
  isInitialized: false,

  refreshCurrentUserProfile: async () => {
    const currentId = get().user?.id;
    if (!currentId) return;
    try {
      const profile = await fetchUserProfile(currentId);
      if (profile) {
        set({ user: profile });
      }
      await get().loadFollowingIds(currentId);
    } catch {
      // ignore
    }
  },

  loadFollowingIds: async (userId: string) => {
    if (!userId) {
      set({
        followingIds: new Set<string>(),
        requestedUserIds: new Set<string>(),
        followerIds: new Set<string>(),
      });
      return;
    }

    // 1. Immediately read persistent follow requests from local storage so UI doesn't reset or flicker on reload!
    try {
      const cachedReqs = await appStorage.getItem(`booffin_outgoing_follow_requests_${userId}`);
      if (cachedReqs) {
        const parsed = JSON.parse(cachedReqs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          set((s) => ({
            requestedUserIds: new Set([...Array.from(s.requestedUserIds), ...parsed]),
          }));
        }
      }
    } catch {}

    try {
      const ids = await fetchUserFollowingIds(userId);
      const reqIds = await fetchOutgoingFollowRequestIds(userId);
      const fIds = await fetchUserFollowerIds(userId);
      set({
        followingIds: new Set<string>(ids),
        requestedUserIds: new Set<string>(reqIds),
        followerIds: new Set<string>(fIds),
      });
    } catch {
      // ignore
    }
  },

  isFollowingUser: (userId: string) => {
    return get().followingIds.has(userId);
  },

  isRequestedUser: (userId: string) => {
    return get().requestedUserIds.has(userId);
  },

  isFollowerUser: (userId: string) => {
    return get().followerIds.has(userId);
  },

  removeFollowerUser: async (followerUserId: string) => {
    const currentUserId = get().user?.id;
    if (!currentUserId || !followerUserId) return false;

    // Optimistically remove from followerIds and decrement user followersCount
    const nextFollowers = new Set(get().followerIds);
    nextFollowers.delete(followerUserId);
    set((state) => ({
      followerIds: nextFollowers,
      user: {
        ...state.user,
        followersCount: Math.max(0, (state.user.followersCount || 1) - 1),
      },
    }));

    const res = await removeFollower(followerUserId, currentUserId);
    if (!res.success) {
      console.warn('[useAuthStore] removeFollower failed:', res.error);
    }
    return res.success;
  },

  initializeAuth: async () => {
    if (get().isInitialized) return;
    set({ isLoading: true, authStatus: 'loading' });

    try {
      // 1. Check existing session
      const user = await getInitialAuthSession();
      if (user?.id) {
        set({
          user,
          authStatus: 'authenticated',
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
        });
        get().loadFollowingIds(user.id);
        import('../utils/e2eeCrypto').then(({ getOrCreateUserKeyPair }) => {
          getOrCreateUserKeyPair(user.id).catch(() => {});
        });
      } else {
        set({
          user: emptyUserProfile,
          authStatus: 'unauthenticated',
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
          followingIds: new Set<string>(),
        });
      }

      // 2. Set up listener for real-time auth state changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'TOKEN_REFRESHED' && get().isAuthenticated && get().user?.id === session?.user?.id) {
          // Token refreshed silently in background; avoid disruptive re-fetch
          return;
        }

        if (session?.user) {
          const currentLoadedUser = get().user;
          let profile = currentLoadedUser?.id === session.user.id && currentLoadedUser.handle && currentLoadedUser.handle !== 'researcher'
            ? currentLoadedUser
            : await fetchUserProfile(session.user.id);

          if (!profile) {
            const stored = getStoredLocalSession();
            if (stored && stored.id === session.user.id && stored.handle && stored.handle !== 'researcher') {
              profile = stored;
            }
          }

          if (!profile) {
            // Read-only memory fallback for freshly signed-up users - NEVER upsert or overwrite DB here!
            const metadata = session.user.user_metadata || {};
            const fullName = metadata.full_name || metadata.name || session.user.email?.split('@')[0] || 'Researcher';
            const rawHandle = metadata.user_name || metadata.preferred_username || session.user.email?.split('@')[0] || 'researcher';
            const cleanHandle = rawHandle.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
            const avatarUrl = metadata.avatar_url || metadata.picture;

            profile = {
              id: session.user.id,
              handle: cleanHandle || 'researcher',
              fullName,
              avatarUrl,
              academicTitle: metadata.academic_title || 'Researcher',
              institution: metadata.institution || 'Independent Researcher',
              bio: '',
              orcidVerified: Boolean(metadata.orcid_id),
              orcidId: metadata.orcid_id,
              followersCount: 0,
              followingCount: 0,
              postsCount: 0,
              savedCount: 0,
              joinedDate: 'Just now',
              researchInterests: [],
            };
          } else {
            setStoredLocalSession(profile);
          }
          set({
            user: profile,
            authStatus: 'authenticated',
            isAuthenticated: true,
            isLoading: false,
          });
          get().loadFollowingIds(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setStoredLocalSession(null);
          set({
            user: emptyUserProfile,
            authStatus: 'unauthenticated',
            isAuthenticated: false,
            isLoading: false,
            followingIds: new Set<string>(),
            requestedUserIds: new Set<string>(),
            followerIds: new Set<string>(),
            followLoadingIds: new Set<string>(),
          });
        }
      });

      // 3. Desktop Electron OAuth listener (captures Google / ORCID popup callback)
      if (typeof window !== 'undefined' && (window as any).booffinDesktop?.onOAuthCallback) {
        (window as any).booffinDesktop.onOAuthCallback(async (rawUrl: string) => {
          try {
            const { code, accessToken, refreshToken } = extractOAuthParams(rawUrl);
            if (code) {
              await supabase.auth.exchangeCodeForSession(code);
            } else if (accessToken && refreshToken) {
              await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            }
            await get().refreshCurrentUserProfile();
          } catch (e) {
            console.warn('[useAuthStore] Desktop OAuth processing error:', e);
          }
        });
      }
    } catch {
      set({
        user: emptyUserProfile,
        authStatus: 'unauthenticated',
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  signIn: async (email, pass) => {
    set({ isLoading: true, authStatus: 'loading', authError: null });
    const { user, error } = await signInWithEmail(email, pass);
    if (error || !user) {
      set({
        isLoading: false,
        authStatus: 'unauthenticated',
        isAuthenticated: false,
        authError: error || 'Sign in failed.',
      });
      return false;
    }
    set({
      user,
      authStatus: 'authenticated',
      isAuthenticated: true,
      isLoading: false,
      authError: null,
    });
    import('../utils/e2eeCrypto').then(({ getOrCreateUserKeyPair }) => {
      getOrCreateUserKeyPair(user.id).catch(() => {});
    });
    return true;
  },

  signUp: async (params) => {
    set({ isLoading: true, authStatus: 'loading', authError: null });
    const { user, error } = await signUpWithEmail(params);
    if (error || !user) {
      set({
        isLoading: false,
        authStatus: 'unauthenticated',
        isAuthenticated: false,
        authError: error || 'Sign up failed.',
      });
      return false;
    }
    set((state) => ({
      user,
      authStatus: 'authenticated',
      isAuthenticated: true,
      isLoading: false,
      authError: null,
      users: [user, ...state.users.filter((u) => u.id !== user.id)],
    }));
    import('../utils/e2eeCrypto').then(({ getOrCreateUserKeyPair }) => {
      getOrCreateUserKeyPair(user.id).catch(() => {});
    });
    return true;
  },

  sendOtp: async (email: string) => {
    set({ isLoading: true, authError: null });
    const result = await sendEmailOtp(email);
    set({
      isLoading: false,
      authError: result.error,
    });
    return result;
  },

  verifyOtp: async (email: string, token: string) => {
    set({ isLoading: true, authStatus: 'loading', authError: null });
    const { user, error } = await verifyEmailOtp(email, token);
    if (error || !user) {
      set({
        isLoading: false,
        authStatus: 'unauthenticated',
        isAuthenticated: false,
        authError: error || 'Verification failed.',
      });
      return false;
    }
    set((state) => ({
      user,
      authStatus: 'authenticated',
      isAuthenticated: true,
      isLoading: false,
      authError: null,
      users: [user, ...state.users.filter((u) => u.id !== user.id)],
    }));
    get().loadFollowingIds(user.id);
    import('../utils/e2eeCrypto').then(({ getOrCreateUserKeyPair }) => {
      getOrCreateUserKeyPair(user.id).catch(() => {});
    });
    return true;
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, authStatus: 'loading', authError: null });
    const { user, error } = await authServiceSignInWithGoogle();
    if (error) {
      set({
        isLoading: false,
        authStatus: 'unauthenticated',
        isAuthenticated: false,
        authError: error,
      });
      return false;
    }
    if (user) {
      set({
        user,
        authStatus: 'authenticated',
        isAuthenticated: true,
        isLoading: false,
        authError: null,
      });
      get().loadFollowingIds(user.id);
      import('../utils/e2eeCrypto').then(({ getOrCreateUserKeyPair }) => {
        getOrCreateUserKeyPair(user.id).catch(() => {});
      });
      return true;
    }
    // Browser is actively navigating to Google OAuth consent page; keep loading active
    return false;
  },

  signInWithORCID: async () => {
    set({ isLoading: true, authStatus: 'loading', authError: null });
    const { user, error } = await authServiceSignInWithORCID();
    if (error) {
      set({
        isLoading: false,
        authStatus: 'unauthenticated',
        isAuthenticated: false,
        authError: error,
      });
      return false;
    }
    if (user) {
      set({
        user,
        authStatus: 'authenticated',
        isAuthenticated: true,
        isLoading: false,
        authError: null,
      });
      get().loadFollowingIds(user.id);
      import('../utils/e2eeCrypto').then(({ getOrCreateUserKeyPair }) => {
        getOrCreateUserKeyPair(user.id).catch(() => {});
      });
      return true;
    }
    // Browser is actively navigating to ORCID OAuth consent page; keep loading active
    return false;
  },

  resetPassword: async (email) => {
    set({ isLoading: true, authError: null });
    const res = await sendPasswordResetEmail(email);
    set({ isLoading: false, authError: res.error });
    return res;
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      const { useWorkspaceStore } = await import('./useWorkspaceStore');
      useWorkspaceStore.getState().resetWorkspaceSession();
    } catch {}
    await signOutUser();
    setStoredLocalSession(null);
    set({
      user: emptyUserProfile,
      authStatus: 'unauthenticated',
      isAuthenticated: false,
      isLoading: false,
      authError: null,
      followingIds: new Set<string>(),
      requestedUserIds: new Set<string>(),
      followerIds: new Set<string>(),
      followLoadingIds: new Set<string>(),
    });
  },

  clearError: () => set({ authError: null }),

  updateProfile: async (updated) => {
    const previousUser = get().user;
    const currentUserId = previousUser?.id;
    const updatedUser = { ...previousUser, ...updated };

    // 1. Optimistic update
    setStoredLocalSession(updatedUser);
    set((state) => ({
      user: updatedUser,
      users: state.users.map((u) => (u.id === state.user.id ? updatedUser : u)),
    }));

    if (currentUserId) {
      const res = await persistUserProfile(currentUserId, updated);
      if (!res.success) {
        console.warn('Profile sync failed:', res.error);
        // Rollback state if persist failed
        setStoredLocalSession(previousUser);
        set((state) => ({
          user: previousUser,
          users: state.users.map((u) => (u.id === state.user.id ? previousUser : u)),
          authError: res.error,
        }));
        return res;
      }
      return { success: true, error: null };
    }
    return { success: true, error: null };
  },

  toggleFollowUser: async (userId: string) => {
    let currentUserId = get().user.id;
    if (!currentUserId || currentUserId === 'unknown') {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          currentUserId = session.user.id;
        }
      } catch {}
    }

    if (!currentUserId || !userId || currentUserId === userId) {
      console.warn('[useAuthStore] Cannot follow self or unauthenticated');
      return false;
    }

    // Concurrency protection: prevent double-clicks from creating duplicate requests
    if (get().followLoadingIds.has(userId)) {
      return false;
    }

    const currentFollowingSet = new Set(get().followingIds);
    const wasFollowing = currentFollowingSet.has(userId);

    // Rate limit check before attempting to follow or send follow request
    if (!wasFollowing) {
      const limitCheck = await checkCanFollow({
        userId: currentUserId,
        currentFollowingCount: get().user?.followingCount ?? currentFollowingSet.size,
        userJoinedDate: get().user?.joinedDate,
        userCreatedAt: (get().user as any)?.createdAt,
      });

      if (!limitCheck.allowed) {
        Alert.alert('Action Restricted', limitCheck.reason || 'Follow limit reached.');
        set({ authError: limitCheck.reason });
        return false;
      }
    }

    const nextLoadingSet = new Set(get().followLoadingIds);
    nextLoadingSet.add(userId);
    set({ followLoadingIds: nextLoadingSet });

    try {
      const res = await toggleFollowUserRpc(userId, currentUserId);

      const doneLoadingSet = new Set(get().followLoadingIds);
      doneLoadingSet.delete(userId);

      if (!res.success) {
        console.warn('[useAuthStore] toggleFollowUser failed:', res.error);
        set({ followLoadingIds: doneLoadingSet, authError: res.error });
        return false;
      }

      if (res.isFollowing || res.isRequested) {
        recordFollowAction(currentUserId).catch(() => {});
      }

      const nextFollowingSet = new Set(get().followingIds);
      const nextRequestedSet = new Set(get().requestedUserIds);

      if (res.isFollowing) {
        nextFollowingSet.add(userId);
        nextRequestedSet.delete(userId);
      } else if (res.isRequested) {
        nextRequestedSet.add(userId);
        nextFollowingSet.delete(userId);
      } else {
        nextFollowingSet.delete(userId);
        nextRequestedSet.delete(userId);
      }

      const followingDelta = res.isFollowing && !wasFollowing ? 1 : !res.isFollowing && wasFollowing ? -1 : 0;

      set((state) => ({
        followingIds: nextFollowingSet,
        requestedUserIds: nextRequestedSet,
        followLoadingIds: doneLoadingSet,
        users: state.users.map((u) => {
          if (u.id === userId) {
            return {
              ...u,
              isFollowing: res.isFollowing,
              isRequested: Boolean(res.isRequested),
              followersCount: res.isFollowing && !wasFollowing
                ? u.followersCount + 1
                : !res.isFollowing && wasFollowing
                ? Math.max(0, u.followersCount - 1)
                : u.followersCount,
            };
          }
          return u;
        }),
        user: {
          ...state.user,
          followingCount: res.callerFollowingCount !== undefined
            ? res.callerFollowingCount
            : Math.max(0, state.user.followingCount + followingDelta),
        },
      }));

      useSearchStore.getState().updateResearcherFollowState(userId, res.isFollowing);
      return true;
    } catch (err: any) {
      const doneLoadingSet = new Set(get().followLoadingIds);
      doneLoadingSet.delete(userId);
      set({ followLoadingIds: doneLoadingSet, authError: err?.message || 'Failed to toggle follow.' });
      return false;
    }
  },
}));
