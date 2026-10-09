/**
 * Feature Flags Configuration for BoffIn
 *
 * Use this central configuration to safely gate features.
 * When a feature is disabled, its UI buttons, modal mounts, and background listeners
 * are completely deactivated, preventing unauthorized access or accidental exposure.
 */

export const FEATURE_FLAGS = {
  /**
   * P2P Voice and Video Calling feature.
   * Set to `false` to completely hide call buttons, disable incoming call listeners,
   * and prevent all calling interactions until the official future release.
   */
  ENABLE_VOICE_VIDEO_CALLS: false,
} as const;
