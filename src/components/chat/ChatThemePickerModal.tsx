import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Platform,
} from 'react-native';
import {
  X,
  Check,
  Palette,
  Sparkles,
  Layers,
  Image as ImageIcon,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { CHAT_THEME_LIST, CHAT_THEMES } from '../../config/chatThemes';
import { ChatThemeConfig, ChatThemeId } from '../../types/chatTheme';
import { useChatThemeStore } from '../../store/useChatThemeStore';

interface ChatThemePickerModalProps {
  visible: boolean;
  onClose: () => void;
  workspaceId: string;
  chatName?: string;
}

export const ChatThemePickerModal: React.FC<ChatThemePickerModalProps> = ({
  visible,
  onClose,
  workspaceId,
  chatName = 'this chat',
}) => {
  const currentThemeId = useChatThemeStore(
    (s) => s.themes[workspaceId] || 'default'
  );
  const setChatTheme = useChatThemeStore((s) => s.setChatTheme);
  const [selectedThemeId, setSelectedThemeId] = useState<ChatThemeId>(currentThemeId);

  useEffect(() => {
    if (visible) {
      setSelectedThemeId(currentThemeId);
    }
  }, [visible, currentThemeId]);

  const activeThemeConfig: ChatThemeConfig =
    CHAT_THEMES[selectedThemeId] || CHAT_THEMES.default;

  const handleSelectTheme = (themeId: ChatThemeId) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSelectedThemeId(themeId);
  };

  const handleApplyTheme = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    await setChatTheme(workspaceId, selectedThemeId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerIconCircle}>
                <Palette size={20} color="#064E3B" strokeWidth={2.2} />
              </View>
              <View>
                <Text style={styles.modalTitle}>Chat Theme</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  Customize wallpaper & bubble colors for {chatName}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityLabel="Close Theme Picker"
            >
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Live Preview Box */}
          <View style={styles.livePreviewContainer}>
            <ImageBackground
              source={activeThemeConfig.backgroundImage}
              style={[styles.livePreviewBg, { backgroundColor: activeThemeConfig.backgroundColor }]}
              imageStyle={{ resizeMode: 'cover', borderRadius: 14 }}
            >
              <View
                style={[
                  styles.previewOverlay,
                  {
                    backgroundColor:
                      activeThemeConfig.id === 'dark'
                        ? 'rgba(15, 23, 42, 0.4)'
                        : 'rgba(255, 255, 255, 0.1)',
                  },
                ]}
              >
                {/* Simulated other user message */}
                <View
                  style={[
                    styles.previewBubble,
                    styles.previewBubbleOther,
                    {
                      backgroundColor: activeThemeConfig.otherBubbleColor,
                      borderColor:
                        activeThemeConfig.id === 'dark' ? '#334155' : '#E2E8F0',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.previewBubbleText,
                      { color: activeThemeConfig.otherBubbleTextColor },
                    ]}
                  >
                    Hey! Check out this new preprint on neuroscience 🔬
                  </Text>
                  <Text
                    style={[
                      styles.previewTime,
                      { color: activeThemeConfig.timestampOtherColor },
                    ]}
                  >
                    10:14 AM
                  </Text>
                </View>

                {/* Simulated my message */}
                <View
                  style={[
                    styles.previewBubble,
                    styles.previewBubbleMe,
                    { backgroundColor: activeThemeConfig.myBubbleColor },
                  ]}
                >
                  <Text
                    style={[
                      styles.previewBubbleText,
                      { color: activeThemeConfig.myBubbleTextColor },
                    ]}
                  >
                    Looks promising! Let's replicate their methodology 🚀
                  </Text>
                  <Text
                    style={[
                      styles.previewTime,
                      { color: activeThemeConfig.timestampMyColor },
                    ]}
                  >
                    10:15 AM
                  </Text>
                </View>
              </View>
            </ImageBackground>
          </View>

          {/* Theme Selector Horizontal List */}
          <Text style={styles.sectionLabel}>CHOOSE WALLPAPER & PALETTE</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.themeScrollContent}
          >
            {CHAT_THEME_LIST.map((theme) => {
              const isSelected = selectedThemeId === theme.id;
              return (
                <TouchableOpacity
                  key={theme.id}
                  activeOpacity={0.8}
                  onPress={() => handleSelectTheme(theme.id)}
                  style={[
                    styles.themeCard,
                    isSelected && styles.themeCardActive,
                  ]}
                >
                  <View style={styles.themeThumbnailWrapper}>
                    {theme.backgroundImage ? (
                      <ImageBackground
                        source={theme.backgroundImage}
                        style={styles.themeThumbnailImg}
                        imageStyle={{ resizeMode: 'cover', borderRadius: 10 }}
                      >
                        {isSelected && (
                          <View style={styles.selectedCheckOverlay}>
                            <Check size={16} color="#FFFFFF" strokeWidth={3} />
                          </View>
                        )}
                      </ImageBackground>
                    ) : (
                      <View
                        style={[
                          styles.themeThumbnailSolid,
                          { backgroundColor: theme.previewColor },
                        ]}
                      >
                        {isSelected && (
                          <View style={styles.selectedCheckOverlay}>
                            <Check size={16} color="#FFFFFF" strokeWidth={3} />
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.themeCardName,
                      isSelected && styles.themeCardNameActive,
                    ]}
                    numberOfLines={1}
                  >
                    {theme.name.replace(/ \(Default\)/, '')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Action Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleApplyTheme}
            style={[
              styles.applyBtn,
              { backgroundColor: activeThemeConfig.accentColor || '#164E3F' },
            ]}
          >
            <Sparkles size={18} color="#FFFFFF" />
            <Text style={styles.applyBtnText}>Apply Theme to this Chat</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    maxWidth: 260,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  livePreviewContainer: {
    width: '100%',
    height: 170,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  livePreviewBg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    gap: 10,
  },
  previewBubble: {
    maxWidth: '82%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  previewBubbleOther: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderBottomLeftRadius: 3,
  },
  previewBubbleMe: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 3,
  },
  previewBubbleText: {
    fontSize: 12.5,
    fontWeight: '500',
    lineHeight: 16,
  },
  previewTime: {
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 3,
    alignSelf: 'flex-end',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  themeScrollContent: {
    paddingBottom: 16,
    gap: 12,
  },
  themeCard: {
    alignItems: 'center',
    width: 86,
    borderRadius: 14,
    padding: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeCardActive: {
    borderColor: '#064E3B',
    backgroundColor: '#F0FDF4',
  },
  themeThumbnailWrapper: {
    width: 74,
    height: 110, // 9:16 aspect ratio thumbnail
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 6,
  },
  themeThumbnailImg: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeThumbnailSolid: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheckOverlay: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  themeCardName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  themeCardNameActive: {
    color: '#064E3B',
    fontWeight: '700',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
