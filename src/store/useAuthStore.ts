import { create } from 'zustand';
import { UserProfile } from '../types';
import { currentUser, mockUsers } from '../data/mockData';
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
  SignUpParams,
} from '../api/authService';
import { followUser, unfollowUser } from '../api/socialService';
import { supabase } from '../api/client';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: UserProfile;
  authStatus: AuthStatus;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  users: UserProfile[];
  isInitialized: boolean;

  // Actions
  initializeAuth: () => Promise<void>;
  signIn: (email: string, pass: string) => Promise<boolean>;
  signUp: (params: SignUpParams) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  signInWithORCID: () => Promise<boolean>;
  signInWithDemoUser: (user: UserProfile) => void;
  resetPassword: (email: string) => Promise<{ success: boolean; error: string | null }>;
  signOut: () => Promise<void>;
  clearError: () => void;
  updateProfile: (updated: Partial<UserProfile>) => void;
  toggleFollowUser: (userId: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: currentUser,
  authStatus: 'unauthenticated',
  isAuthenticated: false,
  isLoading: false,
  authError: null,
  users: mockUsers,
  isInitialized: false,

  initializeAuth: async () => {
    if (get().isInitialized) return;
    set({ isLoading: true, authStatus: 'loading' });

    try {
      // 1. Check existing session
      const user = await getInitialAuthSession();
      if (user) {
        set({
          user,
          authStatus: 'authenticated',
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
        });
      } else {
        set({
          user: currentUser,
          authStatus: 'unauthenticated',
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
        });
      }

      // 2. Set up listener for real-time auth state changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          const activeUser = profile || {
            ...currentUser,
            id: session.user.id,
            handle: session.user.email?.split('@')[0] || 'researcher',
          };
          setStoredLocalSession(activeUser);
          set({
            user: activeUser,
            authStatus: 'authenticated',
            isAuthenticated: true,
            isLoading: false,
          });
        } else if (event === 'SIGNED_OUT') {
          setStoredLocalSession(null);
          set({
            user: currentUser,
            authStatus: 'unauthenticated',
            isAuthenticated: false,
            isLoading: false,
          });
        }
      });
    } catch {
      set({
        user: currentUser,
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
    if (error || !user) {
      set({
        isLoading: false,
        authStatus: 'unauthenticated',
        isAuthenticated: false,
        authError: error || 'Google sign-in failed.',
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

  signInWithORCID: async () => {
    set({ isLoading: true, authStatus: 'loading', authError: null });
    const { user, error } = await authServiceSignInWithORCID();
    if (error || !user) {
      set({
        isLoading: false,
        authStatus: 'unauthenticated',
        isAuthenticated: false,
        authError: error || 'ORCID authentication failed.',
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
      user: currentUser,
      authStatus: 'unauthenticated',
      isAuthenticated: false,
      isLoading: false,
      authError: null,
    });
  },

  clearError: () => set({ authError: null }),

  updateProfile: (updated) =>
    set((state) => {
      const updatedUser = { ...state.user, ...updated };
      setStoredLocalSession(updatedUser);
      return {
        user: updatedUser,
        users: state.users.map((u) => (u.id === state.user.id ? updatedUser : u)),
      };
    }),

  toggleFollowUser: async (userId: string) => {
    const currentUserId = get().user.id;
    if (!currentUserId || currentUserId === userId) {
      console.warn('[useAuthStore] Cannot follow self or unauthenticated');
      return false;
    }

    const target = get().users.find((u) => u.id === userId);
    const wasFollowing = Boolean(target?.isFollowing);
    const isNowFollowing = !wasFollowing;
    const followingDelta = isNowFollowing ? 1 : -1;

    // 1. Optimistic update
    set((state) => ({
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

    // 2. Real API mutation
    const res = isNowFollowing
      ? await followUser(userId, currentUserId)
      : await unfollowUser(userId, currentUserId);

    // 3. Rollback if error
    if (!res.success) {
      console.warn('[useAuthStore] toggleFollowUser failed, rolling back:', res.error);
      set((state) => ({
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
      }));
      return false;
    }

    return true;
  },
}));
