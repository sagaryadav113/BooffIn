import React from 'react';
import { View, StyleSheet, Platform, ScrollView } from 'react-native';
import { usePathname } from 'expo-router';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { DesktopHeader } from './DesktopHeader';
import { DesktopLeftSidebar } from './DesktopLeftSidebar';
import { DesktopRightSidebar } from './DesktopRightSidebar';
import { DesktopExploreRightSidebar } from './DesktopExploreRightSidebar';
import { DesktopProfileRightSidebar } from './DesktopProfileRightSidebar';
import { DesktopSettingsRightSidebar } from './DesktopSettingsRightSidebar';
import { DesktopMessagesDock } from './DesktopMessagesDock';
import { useAuthStore } from '../../store/useAuthStore';
import { colors } from '../../theme';

interface DesktopLayoutShellProps {
  children: React.ReactNode;
}

export const DesktopLayoutShell: React.FC<DesktopLayoutShellProps> = ({ children }) => {
  const { isDesktop } = useResponsiveLayout();
  const pathname = usePathname();
  const currentUser = useAuthStore((s) => s.user);

  // If on mobile (APK or mobile screen width), render directly without desktop shell
  if (!isDesktop) {
    return <>{children}</>;
  }

  const isAuthPage =
    pathname.includes('(auth)') ||
    pathname.includes('/login') ||
    pathname.includes('/signup') ||
    pathname.includes('/welcome') ||
    pathname.includes('/onboarding') ||
    pathname.includes('/email') ||
    pathname.includes('/forgot-password');

  // If on Auth/Welcome/Login/Signup page, render a clean full-screen plain white layout
  if (isAuthPage) {
    return (
      <View style={[styles.desktopRoot, { backgroundColor: '#FFFFFF' }]}>
        <DesktopHeader />
        <main
          style={{
            flex: 1,
            width: '100%',
            backgroundColor: '#FFFFFF',
            minHeight: 'calc(100vh - 68px)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </main>
      </View>
    );
  }

  // Determine appropriate right sidebar based on active pathname
  const renderRightSidebar = () => {
    if (pathname.includes('explore')) {
      return <DesktopExploreRightSidebar />;
    }
    if (pathname.includes('profile')) {
      return <DesktopProfileRightSidebar user={currentUser} />;
    }
    if (pathname.includes('settings')) {
      return <DesktopSettingsRightSidebar />;
    }
    // Default to Home Feed Right Sidebar
    return <DesktopRightSidebar />;
  };

  return (
    <View style={styles.desktopRoot}>
      {/* 1. Global Top Header */}
      <DesktopHeader />

      {/* 2. Main 3-Column Content Body */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
          flex: 1,
          backgroundColor: '#FFFFFF',
          minHeight: 'calc(100vh - 68px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            width: '100%',
            maxWidth: 1440,
            justifyContent: 'space-between',
            paddingLeft: 28,
            paddingRight: 28,
            boxSizing: 'border-box',
          }}
        >
          {/* Left Navigation Sidebar */}
          <DesktopLeftSidebar />

          {/* Center Main Screen Content */}
          <main
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              maxWidth: 700,
              minWidth: 540,
              margin: '0 24px',
              backgroundColor: '#FFFFFF',
              minHeight: 'calc(100vh - 68px)',
            }}
          >
            {children}
          </main>

          {/* Right Contextual Sidebar */}
          {renderRightSidebar()}
        </div>
      </div>

      {/* 3. Floating Bottom-Right LinkedIn-Style Messaging Popup */}
      <DesktopMessagesDock />
    </View>
  );
};

const styles = StyleSheet.create({
  desktopRoot: {
    flex: 1,
    width: '100%',
    minHeight: '100vh' as any,
    backgroundColor: '#FFFFFF',
  },
});
