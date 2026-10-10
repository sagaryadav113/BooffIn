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

  // If on mobile (APK or mobile screen width) or on Admin Portal, render directly without public desktop shell
  if (!isDesktop || pathname.includes('/admin') || pathname === '/admin') {
    return <>{children}</>;
  }

  const isStandalonePage =
    pathname.includes('(auth)') ||
    pathname.includes('/login') ||
    pathname.includes('/signup') ||
    pathname.includes('/welcome') ||
    pathname.includes('/onboarding') ||
    pathname.includes('/email') ||
    pathname.includes('/forgot-password') ||
    pathname.includes('/privacy') ||
    pathname.includes('/policy') ||
    pathname.includes('/terms') ||
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname === '/policy';

  // If on Auth/Welcome/Login/Signup/Legal page, render children directly without global in-app header
  if (isStandalonePage) {
    return <>{children}</>;
  }

  const isWorkspacePage = pathname.includes('workspace') || pathname === '/workspace';

  // Determine appropriate right sidebar based on active pathname
  const renderRightSidebar = () => {
    if (isWorkspacePage) {
      return null;
    }
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

      {/* 2. Main Content Body */}
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
            maxWidth: isWorkspacePage ? '100%' : 1440,
            justifyContent: 'space-between',
            paddingLeft: isWorkspacePage ? 16 : 28,
            paddingRight: isWorkspacePage ? 16 : 28,
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
              maxWidth: isWorkspacePage ? 'none' : 700,
              minWidth: isWorkspacePage ? 0 : 540,
              margin: isWorkspacePage ? '0 0 0 16px' : '0 24px',
              backgroundColor: '#FFFFFF',
              minHeight: 'calc(100vh - 68px)',
              overflow: 'hidden',
            }}
          >
            {children}
          </main>

          {/* Right Contextual Sidebar */}
          {renderRightSidebar()}
        </div>
      </div>

      {/* 3. Floating Bottom-Right LinkedIn-Style Messaging Popup (hidden on workspace) */}
      {!isWorkspacePage && <DesktopMessagesDock />}
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
