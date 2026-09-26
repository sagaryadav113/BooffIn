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
  setStoredLocalSession,
  persistUserProfile,
  SignUpParams,
} from '../api/authService';
import { followUser, unfollowUser, toggleFollowUserRpc, fetchUserFollowingIds } from '../api/socialService';
import { useSearchStore } from './useSearchStore';
import { supabase } from '../api/client';

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
  followLoadingIds: Set<string>;
  isInitialized: boolean;

  // Actions
  initializeAuth: () => Promise<void>;
  loadFollowingIds: (userId: string) => Promise<void>;
  isFollowingUser: (userId: string) => boolean;
  signIn: (email: string, pass: string) => Promise<boolean>;
  signUp: (params: SignUpParams) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  signInWithORCID: () => Promise<boolean>;
  signInWithDemoUser: (user: UserProfile) => void;
  resetPassword: (email: string) => Promise<{ success: boolean; error: string | null }>;
  signOut: () => Promise<void>;
  clearError: () => void;
  updateProfile: (updated: Partial<UserProfile>) => Promise<{ success: boolean; error: string | null }>;
  toggleFollowUser: (userId: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: emptyUserProfile,
  authStatus: 'unauthenticated',
  isAuthenticated: false,
  isLoading: false,
  authError: null,
  users: [],
  followingIds: new Set<string>(),
  followLoadingIds: new Set<string>(),
  isInitialized: false,

  loadFollowingIds: async (userId: string) => {
    if (!userId) {
      set({ followingIds: new Set<string>() });
      return;
    }
    try {
      const ids = await fetchUserFollowingIds(userId);
      set({ followingIds: new Set<string>(ids) });
    } catch {
      // ignore
    }
  },

  isFollowingUser: (userId: string) => {
    return get().followingIds.has(userId);
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
        if (session?.user) {
          let profile = await fetchUserProfile(session.user.id);
          if (!profile) {
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
            };

            try {
              await supabase.from('profiles').upsert({
                id: session.user.id,
                username: profile.handle,
                full_name: fullName,
                avatar_url: avatarUrl,
                academic_title: profile.academicTitle,
                institution: profile.institution,
              });
            } catch {}
          }
          setStoredLocalSession(profile);
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
            followLoadingIds: new Set<string>(),
          });
        }
      });
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
      return true;
    }
    // Browser is actively navigating to ORCID OAuth consent page; keep loading active
    return false;
  },

  signInWithDemoUser: (demoUser: UserProfile) => {
    setStoredLocalSession(demoUser);
    set({
      user: demoUser,
      authStatus: 'authenticated',
      isAuthenticated: true,
      isLoading: false,
      authError: null,
    });
  },

  resetPassword: async (email) => {
    set({ isLoading: true, authError: null });
    const res = await sendPasswordResetEmail(email);
    set({ isLoading: false, authError: res.error });
    return res;
  },

  signOut: async () => {
    set({ isLoading: true });
    await signOutUser();
    setStoredLocalSession(null);
    set({
      user: emptyUserProfile,
      authStatus: 'unauthenticated',
      isAuthenticated: false,
      isLoading: false,
      authError: null,
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
    const currentUserId = get().user.id;
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
    const isNowFollowing = !wasFollowing;
    const followingDelta = isNowFollowing ? 1 : -1;

    // 1. Optimistic update
    const nextFollowingSet = new Set(currentFollowingSet);
    if (isNowFollowing) {
      nextFollowingSet.add(userId);
    } else {
      nextFollowingSet.delete(userId);
    }

    const nextLoadingSet = new Set(get().followLoadingIds);
    nextLoadingSet.add(userId);

    set((state) => ({
      followingIds: nextFollowingSet,
      followLoadingIds: nextLoadingSet,
      users: state.users.map((u) => {
        if (u.id === userId) {
          return {
            ...u,
            isFollowing: isNowFollowing,
            followersCount: isNowFollowing
              ? u.followersCount + 1
              : Math.max(0, u.followersCount - 1),
          };
        }
        return u;
      }),
      user: {
        ...state.user,
        followingCount: Math.max(0, state.user.followingCount + followingDelta),
      },
    }));

    // Also sync search results in useSearchStore immediately
    useSearchStore.getState().updateResearcherFollowState(userId, isNowFollowing);

    // 2. Real API mutation via atomic RPC
    try {
      const res = await toggleFollowUserRpc(userId, currentUserId);

      // Remove loading lock
      const doneLoadingSet = new Set(get().followLoadingIds);
      doneLoadingSet.delete(userId);

      if (!res.success) {
        console.warn('[useAuthStore] toggleFollowUser failed, rolling back:', res.error);
        // Rollback state
        set((state) => ({
          followingIds: currentFollowingSet,
          followLoadingIds: doneLoadingSet,
          users: state.users.map((u) => {
            if (u.id === userId) {
              return {
                ...u,
                isFollowing: wasFollowing,
                followersCount: wasFollowing
                  ? u.followersCount + 1
                  : Math.max(0, u.followersCount - 1),
              };
            }
            return u;
          }),
          user: {
            ...state.user,
            followingCount: Math.max(0, state.user.followingCount - followingDelta),
          },
          authError: res.error,
        }));
        useSearchStore.getState().updateResearcherFollowState(userId, wasFollowing);
        return false;
      }

      // If server returned exact counts, sync them
      if (res.callerFollowingCount !== undefined) {
        set((state) => ({
          followLoadingIds: doneLoadingSet,
          user: {
            ...state.user,
            followingCount: res.callerFollowingCount!,
          },
        }));
      } else {
        set({ followLoadingIds: doneLoadingSet });
      }

      return true;
    } catch (err: any) {
      const doneLoadingSet = new Set(get().followLoadingIds);
      doneLoadingSet.delete(userId);

      // Rollback on unexpected exception
      set((state) => ({
        followingIds: currentFollowingSet,
        followLoadingIds: doneLoadingSet,
        users: state.users.map((u) => {
          if (u.id === userId) {
            return {
              ...u,
              isFollowing: wasFollowing,
              followersCount: wasFollowing
                ? u.followersCount + 1
                : Math.max(0, u.followersCount - 1),
            };
          }
          return u;
        }),
        user: {
          ...state.user,
          followingCount: Math.max(0, state.user.followingCount - followingDelta),
        },
        authError: err?.message || 'Failed to toggle follow.',
      }));
      useSearchStore.getState().updateResearcherFollowState(userId, wasFollowing);
      return false;
    }
  },
}));
