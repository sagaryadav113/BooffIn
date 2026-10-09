import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ShieldCheck, Lock, ChevronRight } from 'lucide-react-native';

interface E2EEStatusBannerProps {
  onPressVerify?: () => void;
  isPod?: boolean;
}

export const E2EEStatusBanner: React.FC<E2EEStatusBannerProps> = ({ onPressVerify, isPod = false }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPressVerify}
      disabled={!onPressVerify}
      style={styles.bannerContainer}
    >
      <View style={styles.iconCircle}>
        <Lock size={12} color="#164E3F" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.bannerText}>
          {isPod
            ? '🔒 Pod Vault Encrypted · Messages & research manuscripts are protected with zero-knowledge keys.'
            : '🔒 End-to-End Encrypted · Messages & shared research files are cryptographically protected.'}
        </Text>
      </View>
      {onPressVerify && (
        <View style={styles.verifyLink}>
          <Text style={styles.verifyText}>Verify</Text>
          <ChevronRight size={12} color="#164E3F" />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
    gap: 8,
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '500',
    lineHeight: 15,
  },
  verifyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#164E3F',
  },
});
