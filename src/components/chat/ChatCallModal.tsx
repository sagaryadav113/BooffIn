import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  RefreshCw,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Avatar } from '../core/Avatar';
import { WorkspaceSenderProfile } from '../../types/workspace';

interface ChatCallModalProps {
  visible: boolean;
  callType: 'audio' | 'video';
  partner: WorkspaceSenderProfile | null;
  onEndCall: (durationSeconds: number) => void;
}

export const ChatCallModal: React.FC<ChatCallModalProps> = ({
  visible,
  callType,
  partner,
  onEndCall,
}) => {
  const [callState, setCallState] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const durationTimerRef = useRef<any>(null);
  const ringTimerRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      setCallState('ringing');
      setCallDuration(0);
      setIsMuted(false);
      setIsVideoOff(false);

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {}

      // Simulate connection after 3 seconds of ringing
      ringTimerRef.current = setTimeout(() => {
        setCallState('connected');
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch {}

        durationTimerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      }, 3200);
    } else {
      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    }

    return () => {
      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [visible]);

  const handleHangup = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}

    if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);

    const finalDuration = callDuration;
    setCallState('ended');
    setTimeout(() => {
      onEndCall(finalDuration);
    }, 400);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={handleHangup}
    >
      <View style={styles.fullscreenContainer}>
        {/* Top Info */}
        <View style={styles.topInfo}>
          <View style={styles.e2eeBadge}>
            <Sparkles size={12} color="#10B981" />
            <Text style={styles.e2eeText}>End-to-End Encrypted Call</Text>
          </View>

          <Text style={styles.partnerName} numberOfLines={1}>
            {partner?.fullName || 'Researcher'}
          </Text>

          <Text style={styles.statusText}>
            {callState === 'ringing'
              ? 'Ringing...'
              : callState === 'connected'
              ? formatDuration(callDuration)
              : 'Call Ended'}
          </Text>
        </View>

        {/* Center Visuals */}
        <View style={styles.centerVisual}>
          <View style={styles.avatarRingsWrapper}>
            {callState === 'ringing' && <View style={styles.pulseRing} />}
            <Avatar
              uri={partner?.avatarUrl || undefined}
              name={partner?.fullName || 'Researcher'}
              size="xl"
            />
          </View>

          {callType === 'video' && (
            <View style={styles.videoPreviewBox}>
              <Text style={styles.videoPreviewText}>
                {isVideoOff ? '📹 Camera is off' : '📹 HD Video Stream Active'}
              </Text>
            </View>
          )}

          <Text style={styles.academicSubtitle}>
            {partner?.academicTitle || 'Academic Researcher'}
            {partner?.institution ? ` · ${partner.institution}` : ''}
          </Text>
        </View>

        {/* Bottom Call Controls */}
        <View style={styles.controlsBar}>
          {/* Mute Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setIsMuted(!isMuted)}
            style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          >
            {isMuted ? (
              <MicOff size={22} color="#EF4444" />
            ) : (
              <Mic size={22} color="#FFFFFF" />
            )}
            <Text style={styles.controlBtnLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>

          {/* Video Toggle Button */}
          {callType === 'video' && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsVideoOff(!isVideoOff)}
              style={[styles.controlBtn, isVideoOff && styles.controlBtnActive]}
            >
              {isVideoOff ? (
                <VideoOff size={22} color="#EF4444" />
              ) : (
                <Video size={22} color="#FFFFFF" />
              )}
              <Text style={styles.controlBtnLabel}>{isVideoOff ? 'Start Video' : 'Stop Video'}</Text>
            </TouchableOpacity>
          )}

          {/* End Call Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleHangup}
            style={styles.hangupBtn}
          >
            <PhoneOff size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  topInfo: {
    alignItems: 'center',
    gap: 6,
  },
  e2eeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    marginBottom: 8,
  },
  e2eeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  partnerName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  statusText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600',
  },
  centerVisual: {
    alignItems: 'center',
    gap: 16,
  },
  avatarRingsWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#10B981',
    opacity: 0.5,
  },
  videoPreviewBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  videoPreviewText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  academicSubtitle: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 260,
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    width: '100%',
    paddingBottom: 20,
  },
  controlBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  controlBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  controlBtnLabel: {
    display: 'none',
  },
  hangupBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});
