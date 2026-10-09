import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { ShieldCheck, ShieldAlert, Copy, Check, QrCode, Lock, X } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Avatar } from '../core/Avatar';
import { generateSafetyNumber, isPeerVerified, setPeerVerified } from '../../utils/e2eeCrypto';

interface E2EESafetyNumberModalProps {
  visible: boolean;
  onClose: () => void;
  currentUserId: string;
  peerUser: {
    id: string;
    fullName: string;
    handle?: string;
    avatarUrl?: string | null;
  };
}

export const E2EESafetyNumberModal: React.FC<E2EESafetyNumberModalProps> = ({
  visible,
  onClose,
  currentUserId,
  peerUser,
}) => {
  const [safetyNumber, setSafetyNumber] = useState<string>('00000 00000 00000 00000 00000 00000');
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (visible && currentUserId && peerUser?.id) {
      generateSafetyNumber(currentUserId, peerUser.id).then((sn) => {
        setSafetyNumber(sn);
      });
      isPeerVerified(peerUser.id).then((v) => {
        setIsVerified(v);
      });
    }
  }, [visible, currentUserId, peerUser?.id]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(safetyNumber);
    setCopied(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleVerified = async () => {
    const nextState = !isVerified;
    setIsVerified(nextState);
    await setPeerVerified(peerUser.id, nextState);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.shieldBadge}>
                <Lock size={16} color="#164E3F" />
              </View>
              <Text style={styles.headerTitle}>End-to-End Encryption</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Peer Info */}
          <View style={styles.peerCard}>
            <Avatar uri={peerUser.avatarUrl || undefined} name={peerUser.fullName} size="md" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.peerName}>{peerUser.fullName}</Text>
              <Text style={styles.peerHandle}>{peerUser.handle ? `@${peerUser.handle}` : 'Researcher'}</Text>
            </View>
            <View style={[styles.statusTag, isVerified ? styles.statusTagVerified : styles.statusTagUnverified]}>
              {isVerified ? (
                <>
                  <ShieldCheck size={14} color="#164E3F" />
                  <Text style={styles.statusTextVerified}>Verified</Text>
                </>
              ) : (
                <>
                  <ShieldAlert size={14} color="#D97706" />
                  <Text style={styles.statusTextUnverified}>Unverified</Text>
                </>
              )}
            </View>
          </View>

          {/* Description */}
          <Text style={styles.description}>
            All messages, manuscripts, and attachments in this discussion are secured with zero-knowledge end-to-end encryption.
            To verify encryption integrity, compare this safety number with the one on your collaborator's device.
          </Text>

          {/* Safety Number Display */}
          <View style={styles.numberBox}>
            <Text style={styles.numberTitle}>SAFETY NUMBER (30-DIGIT FINGERPRINT)</Text>
            <Text style={styles.numberText}>{safetyNumber}</Text>

            <TouchableOpacity activeOpacity={0.7} onPress={handleCopy} style={styles.copyBtn}>
              {copied ? (
                <>
                  <Check size={16} color="#164E3F" />
                  <Text style={styles.copyBtnTextCopied}>Copied to Clipboard</Text>
                </>
              ) : (
                <>
                  <Copy size={16} color="#164E3F" />
                  <Text style={styles.copyBtnText}>Copy Safety Number</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Verification Toggle */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleToggleVerified}
            style={[styles.verifyActionBtn, isVerified ? styles.verifyActionBtnActive : styles.verifyActionBtnInactive]}
          >
            <ShieldCheck size={18} color={isVerified ? '#FFFFFF' : '#164E3F'} />
            <Text style={[styles.verifyActionText, isVerified && styles.verifyActionTextActive]}>
              {isVerified ? 'Marked as Cryptographically Verified' : 'Mark as Verified Identity'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shieldBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  peerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  peerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  peerHandle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  statusTagVerified: {
    backgroundColor: '#ECFDF5',
  },
  statusTagUnverified: {
    backgroundColor: '#FEF3C7',
  },
  statusTextVerified: {
    fontSize: 12,
    fontWeight: '700',
    color: '#164E3F',
  },
  statusTextUnverified: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  description: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 16,
  },
  numberBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    marginBottom: 16,
  },
  numberTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#164E3F',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  numberText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#064E3B',
    letterSpacing: 2,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 14,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 6,
  },
  copyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#164E3F',
  },
  copyBtnTextCopied: {
    fontSize: 13,
    fontWeight: '700',
    color: '#164E3F',
  },
  verifyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  verifyActionBtnActive: {
    backgroundColor: '#164E3F',
  },
  verifyActionBtnInactive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  verifyActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#164E3F',
  },
  verifyActionTextActive: {
    color: '#FFFFFF',
  },
});
