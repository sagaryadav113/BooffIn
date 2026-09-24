import { useCallback } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';
import { Alert } from 'react-native';

export function useRequireAuth() {
  const { isAuthenticated, user, authStatus } = useAuthStore();

  const requireAuth = useCallback(
    (actionCallback?: () => void, promptMessage?: string): boolean => {
      if (!isAuthenticated || !user) {
        Alert.alert(
          'Sign In Required',
          promptMessage || 'Please sign in to your BooffIn researcher account to perform this action.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sign In',
              onPress: () => router.push('/(auth)/login' as any),
            },
          ]
        );
        return false;
      }

      if (actionCallback) {
        actionCallback();
      }
      return true;
    },
    [isAuthenticated, user]
  );

  return {
    isAuthenticated,
    user,
    authStatus,
    requireAuth,
  };
}
