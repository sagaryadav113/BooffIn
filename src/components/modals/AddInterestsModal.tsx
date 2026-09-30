import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { X, Check, Sparkles, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { useAuthStore } from '../../store/useAuthStore';

export interface AddInterestsModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: (interests: string[]) => void;
}

const AVAILABLE_DOMAINS = [
  'Neuroscience',
  'AI in Science',
  'Biotech',
  'Quantum Computing',
  'Immunology',
  'Genetics & Genomics',
  'Astrophysics',
  'Oncology',
  'Materials Science',
  'Computational Biology',
  'Nanotechnology',
  'Ecology & Evolution',
  'Bioengineering',
  'Cell Biology',
];

export const AddInterestsModal: React.FC<AddInterestsModalProps> = ({
  visible,
  onClose,
  onSaved,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const refreshCurrentUserProfile = useAuthStore((s) => s.refreshCurrentUserProfile);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const initialInterests = React.useMemo(() => {
    const list = [
      ...(currentUser?.researchInterests || []),
      ...(currentUser?.secondaryFields || []),
    ];
    if (currentUser?.primaryField && !list.includes(currentUser.primaryField)) {
      list.unshift(currentUser.primaryField);
    }
    return Array.from(new Set(list));
  }, [currentUser]);

  const [selectedInterests, setSelectedInterests] = useState<string[]>(initialInterests);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setSelectedInterests(initialInterests);
    }
  }, [visible, initialInterests]);

  const handleToggle = (domain: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    setSelectedInterests((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]
    );
  };

  const handleSave = async () => {
    if (!currentUser?.id) {
      onSaved?.(selectedInterests);
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    try {
      await updateProfile({
        researchInterests: selectedInterests,
        secondaryFields: selectedInterests.slice(1, 4),
        primaryField: selectedInterests[0] || currentUser.primaryField || 'Neuroscience',
      });
      await refreshCurrentUserProfile();
      onSaved?.(selectedInterests);
    } catch (e) {
      console.warn('[AddInterestsModal] Failed to update interests:', e);
    } finally {
      setIsSaving(false);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleGroup}>
              <View style={styles.sparkleIcon}>
                <Sparkles size={16} color="#1B4D3E" />
              </View>
              <Text style={styles.titleText}>Customize Hyped Domains</Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.closeBtn}
            >
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitleText}>
            Select the scientific fields you want to track. Your Explore feed and top navigation tabs will prioritize these domains.
          </Text>

          {/* Chips Grid */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.chipsContainer}
            showsVerticalScrollIndicator={false}
          >
            {AVAILABLE_DOMAINS.map((domain) => {
              const isSelected = selectedInterests.includes(domain);
              return (
                <TouchableOpacity
                  key={domain}
                  activeOpacity={0.8}
                  onPress={() => handleToggle(domain)}
                  style={[
                    styles.chip,
                    isSelected && styles.chipSelected,
                  ]}
                >
                  {isSelected ? (
                    <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
                  ) : (
                    <Plus size={14} color="#64748B" />
                  )}
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelected,
                    ]}
                  >
                    {domain}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Bottom Save Action */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.cancelButton}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              style={styles.saveButton}
              activeOpacity={0.85}
            >
              <Text style={styles.saveText}>
                {isSaving ? 'Saving...' : `Save ${selectedInterests.length} Domains`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sparkleIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EAF3EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    ...typography.bodyBold,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitleText: {
    ...typography.caption,
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  scrollArea: {
    maxHeight: 280,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
  },
  chipSelected: {
    backgroundColor: '#1B4D3E',
    borderColor: '#1B4D3E',
  },
  chipText: {
    ...typography.captionMedium,
    fontSize: 12,
    color: '#334155',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  cancelText: {
    ...typography.captionBold,
    color: '#475569',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#1B4D3E',
    paddingVertical: 11,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    ...typography.captionBold,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
