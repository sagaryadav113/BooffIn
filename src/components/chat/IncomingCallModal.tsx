import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Phone, PhoneOff, Video, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Avatar } from '../core/Avatar';
import { IncomingCallPayload } from '../../services/webrtcSignalingService';

interface IncomingCallModalProps {
  incomingCall: IncomingCallPayload | null;
  onAccept: (call: IncomingCallPayload) => void;
  onDecline: (call: IncomingCallPayload) => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  incomingCall,
  onAccept,
  onDecline,
}) => {
  useEffect(() => {
    if (incomingCall) {
      const interval = setInterval(() => {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {}
      }, 1400);

      return () => clearInterval(interval);
    }
  }, [incomingCall]);

  if (!incomingCall) return null;

  const isVideo = incomingCall.callType === 'video';

  return (
    <Modal
      visible={Boolean(incomingCall)}
      transparent={false}
      animationType="slide"
      onRequestClose={() => onDecline(incomingCall)}
    >
      <View style={styles.container}>
        {/* Top Header Badge */}
        <View style={styles.topBadgeRow}>
          <View style={styles.e2eeBadge}>
            <Sparkles size={13} color="#34D399" />
            <Text style={styles.e2eeText}>Private Encrypted P2P Call</Text>
          </View>
        </View>

        {/* Center Caller Profile */}
        <View style={styles.centerWrap}>
          <View style={styles.avatarRingWrap}>
            <View style={styles.pulseRing} />
            <Avatar
              uri={incomingCall.callerAvatar || undefined}
              name={incomingCall.callerName || 'Researcher'}
              size="xl"
            />
          </View>

          <Text style={styles.callerName} numberOfLines={1}>
            {incomingCall.callerName || 'Researcher'}
          </Text>

          <Text style={styles.callerTitle} numberOfLines={1}>
            {incomingCall.callerTitle || 'Academic Collaborator'}
          </Text>

          <Text style={styles.callTypeLabel}>
            {isVideo ? '📹 Incoming HD Video Call...' : '📞 Incoming Voice Call...'}
          </Text>
        </View>

        {/* Bottom Accept / Decline Actions */}
        <View style={styles.actionsRow}>
          {/* Decline Button (Red) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onDecline(incomingCall)}
            style={styles.declineBtn}
          >
            <View style={styles.declineIconCircle}>
              <PhoneOff size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.actionLabel}>Decline</Text>
          </TouchableOpacity>

          {/* Accept Button (Green) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onAccept(incomingCall)}
            style={styles.acceptBtn}
          >
            <View style={styles.acceptIconCircle}>
              {isVideo ? (
                <Video size={28} color="#FFFFFF" />
              ) : (
                <Phone size={28} color="#FFFFFF" />
              )}
            </View>
            <Text style={styles.actionLabel}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06281E',
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'ios' ? 70 : 50,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  topBadgeRow: {
    alignItems: 'center',
  },
  e2eeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  e2eeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  centerWrap: {
    alignItems: 'center',
    width: '100%',
  },
  avatarRingWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  pulseRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: 'rgba(52, 211, 153, 0.4)',
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
  },
  callerName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  callerTitle: {
    fontSize: 14,
    color: '#A7F3D0',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  callTypeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#34D399',
    letterSpacing: 0.3,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  declineBtn: {
    alignItems: 'center',
    gap: 8,
  },
  declineIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  acceptBtn: {
    alignItems: 'center',
    gap: 8,
  },
  acceptIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F1F5F9',
  },
});
