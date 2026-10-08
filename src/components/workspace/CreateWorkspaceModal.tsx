import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Users, Lock, Shield, Sparkles, X, DollarSign, Check } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { WorkspaceType, WorkspaceSubscriptionTier } from '../../types/workspace';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

interface CreateWorkspaceModalProps {
  visible: boolean;
  onClose: () => void;
}

const COMMUNITY_TIERS: Array<{
  tier: WorkspaceSubscriptionTier;
  price: number;
  label: string;
  desc: string;
}> = [
  { tier: 'free', price: 0, label: 'Free Open Access', desc: 'Anyone can join and participate freely' },
  { tier: 'tier_49', price: 49, label: '₹49 / month', desc: 'Accessible lab journal club & preprint reviews' },
  { tier: 'tier_119', price: 119, label: '₹119 / month', desc: 'Active research domain & live paper discussions' },
  { tier: 'tier_219', price: 219, label: '₹219 / month', desc: 'Specialized symposium & podcast community' },
  { tier: 'tier_599', price: 599, label: '₹599 / month', desc: 'Premium masterclass & grant collaboration hub' },
];

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  visible,
  onClose,
}) => {
  const [type, setType] = useState<WorkspaceType>('community');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTier, setSelectedTier] = useState<WorkspaceSubscriptionTier>('free');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const createCommunity = useWorkspaceStore((s) => s.createCommunity);
  const createInnerCircle = useWorkspaceStore((s) => s.createInnerCircle);

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorText('Workspace name is required');
      return;
    }

    setIsSubmitting(true);
    setErrorText(null);

    try {
      if (type === 'community') {
        const res = await createCommunity({
          name: trimmedName,
          description: description.trim() || undefined,
          subscription_tier: selectedTier,
          is_private: isPrivate,
        });

        if (res.error || !res.workspace) {
          setErrorText(res.error || 'Failed to create community');
          setIsSubmitting(false);
          return;
        }

        onClose();
        router.push(`/workspace/${res.workspace.id}` as any);
      } else if (type === 'inner_circle') {
        const res = await createInnerCircle({
          name: trimmedName,
          description: description.trim() || undefined,
          e2ee_enabled: true,
        });

        if (res.error || !res.workspace) {
          setErrorText(res.error || 'Failed to create inner circle');
          setIsSubmitting(false);
          return;
        }

        onClose();
        router.push(`/workspace/${res.workspace.id}` as any);
      }
    } catch (err: any) {
      setErrorText(err.message || 'An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Sparkles size={20} color="#064E3B" />
              <Text style={styles.title}>Create BooffIn Workspace</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Step 1: Type Selection */}
            <Text style={styles.sectionLabel}>Select Workspace Architecture</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setType('community')}
                style={[styles.typeOption, type === 'community' && styles.typeOptionActive]}
              >
                <View style={styles.typeOptionHeader}>
                  <Users size={18} color={type === 'community' ? '#064E3B' : '#64748B'} />
                  <Text style={[styles.typeOptionTitle, type === 'community' && styles.typeOptionTitleActive]}>
                    Community
                  </Text>
                </View>
                <Text style={styles.typeOptionDesc}>
                  Public or paid community with 5 tabs: Papers, Discussions, Podcasts, Live Sessions & Settings.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setType('inner_circle')}
                style={[styles.typeOption, type === 'inner_circle' && styles.typeOptionActive]}
              >
                <View style={styles.typeOptionHeader}>
                  <Lock size={18} color={type === 'inner_circle' ? '#064E3B' : '#64748B'} />
                  <Text style={[styles.typeOptionTitle, type === 'inner_circle' && styles.typeOptionTitleActive]}>
                    Inner Circle Pod
                  </Text>
                </View>
                <Text style={styles.typeOptionDesc}>
                  Private research pod capped at 25 members with E2EE, Calendar, Roles, and Saved Vault.
                </Text>
              </TouchableOpacity>
            </View>

            {/* Name & Description */}
            <Text style={styles.inputLabel}>Workspace Name *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={type === 'community' ? 'e.g. Synthetic Biology Hub' : 'e.g. Stanford CRISPR Lab Pod'}
              placeholderTextColor="#94A3B8"
              style={styles.textInput}
            />

            <Text style={styles.inputLabel}>Description / Research Focus</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What research problems or goals does this workspace focus on?"
              placeholderTextColor="#94A3B8"
              multiline
              style={[styles.textInput, { height: 60 }]}
            />

            {/* If Community: Subscription Tier Selection */}
            {type === 'community' && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.sectionLabel}>Access Model & Subscription Tier</Text>
                <View style={styles.revenueSplitBanner}>
                  <DollarSign size={16} color="#064E3B" />
                  <Text style={styles.revenueSplitText}>
                    Creator Revenue Ledger: 90% goes directly to you / 10% platform operations.
                  </Text>
                </View>

                {COMMUNITY_TIERS.map((tierItem) => (
                  <TouchableOpacity
                    key={tierItem.tier}
                    activeOpacity={0.8}
                    onPress={() => setSelectedTier(tierItem.tier)}
                    style={[styles.tierRow, selectedTier === tierItem.tier && styles.tierRowActive]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.tierPriceLabel}>{tierItem.label}</Text>
                      </View>
                      <Text style={styles.tierDescText}>{tierItem.desc}</Text>
                    </View>
                    {selectedTier === tierItem.tier && (
                      <View style={styles.tierSelectedCheck}>
                        <Check size={14} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* If Inner Circle: Pod Limit Info */}
            {type === 'inner_circle' && (
              <View style={styles.innerCircleInfoBox}>
                <Shield size={20} color="#064E3B" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.innerCircleInfoTitle}>25-Member Pod Guardrail</Text>
                  <Text style={styles.innerCircleInfoDesc}>
                    Strictly limited to 25 members to encourage deep trust and confidential collaboration.
                  </Text>
                </View>
              </View>
            )}

            {errorText && (
              <Text style={styles.errorBannerText}>{errorText}</Text>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isSubmitting}
              onPress={handleCreate}
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>
                  Launch {type === 'community' ? 'Community' : 'Inner Circle'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  typeOption: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
  },
  typeOptionActive: {
    borderColor: '#064E3B',
    backgroundColor: '#ECFDF5',
  },
  typeOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  typeOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  typeOptionTitleActive: {
    color: '#064E3B',
  },
  typeOptionDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  revenueSplitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 10,
  },
  revenueSplitText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#064E3B',
    flex: 1,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  tierRowActive: {
    borderColor: '#064E3B',
    backgroundColor: '#F0FDF4',
  },
  tierPriceLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  tierDescText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  tierSelectedCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircleInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  innerCircleInfoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#064E3B',
  },
  innerCircleInfoDesc: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    lineHeight: 16,
  },
  errorBannerText: {
    fontSize: 12,
    color: '#DC2626',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  submitBtn: {
    backgroundColor: '#064E3B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
