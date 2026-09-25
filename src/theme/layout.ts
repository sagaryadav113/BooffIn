/**
 * BooffIn Design System - Layout Dimension Constants
 * Defines touch target minimums, responsive content widths, and standard component heights.
 */
export const layout = {
  headerHeight: 56,
  tabBarHeight: 64,
  maxContentWidth: 640,
  maxReadingWidth: 580,
  touchTargetMin: 44,
  avatarSizes: {
    xs: 24,
    sm: 32,
    md: 44,
    lg: 56,
    xl: 84,
  },
  buttonHeights: {
    sm: 36,
    md: 44,
    lg: 50,
  },
  inputHeights: {
    sm: 40,
    md: 48,
    lg: 54,
  },
  iconSizes: {
    micro: 14,
    inline: 16,
    action: 20,
    nav: 22,
    large: 26,
    hero: 32,
  },
};

export type Layout = typeof layout;
