import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Trash2, Send, Mic, StopCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface VoiceNoteRecorderProps {
  onSendVoiceNote: (audioData: { duration: number; waveform: number[]; uri?: string }) => void;
  onCancel: () => void;
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  onSendVoiceNote,
  onCancel,
}) => {
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [liveBars, setLiveBars] = useState<number[]>([20, 40, 60, 30, 80, 50, 70, 40, 90, 60]);
  const [isFinishing, setIsFinishing] = useState(false);
  
  const timerRef = useRef<any>(null);
  const waveformIntervalRef = useRef<any>(null);
  const recordedWaveform = useRef<number[]>([]);

  useEffect(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    // Start timer
    timerRef.current = setInterval(() => {
      setRecordSeconds((prev) => prev + 1);
    }, 1000);

    // Dynamic waveform tick
    waveformIntervalRef.current = setInterval(() => {
      const nextVal = Math.floor(Math.random() * 75) + 25;
      recordedWaveform.current.push(nextVal);
      setLiveBars((prev) => {
        const sliced = prev.length > 24 ? prev.slice(1) : prev;
        return [...sliced, nextVal];
      });
    }, 120);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (waveformIntervalRef.current) clearInterval(waveformIntervalRef.current);
    };
  }, []);

  const handleSend = () => {
    setIsFinishing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}

    if (timerRef.current) clearInterval(timerRef.current);
    if (waveformIntervalRef.current) clearInterval(waveformIntervalRef.current);

    const duration = Math.max(1, recordSeconds);
    const finalWaveform = recordedWaveform.current.length > 10
      ? recordedWaveform.current.slice(-28)
      : [30, 50, 70, 40, 85, 90, 60, 45, 75, 55, 65, 80, 45, 30, 60, 85, 70, 40];

    onSendVoiceNote({
      duration,
      waveform: finalWaveform,
    });
  };

  const handleCancel = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (timerRef.current) clearInterval(timerRef.current);
    if (waveformIntervalRef.current) clearInterval(waveformIntervalRef.current);
    onCancel();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <View style={styles.recorderDock}>
      {/* Trash / Cancel Button */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleCancel}
        style={styles.trashBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Trash2 size={18} color="#EF4444" />
      </TouchableOpacity>

      {/* Pulsing red record indicator & timer */}
      <View style={styles.recordStatusRow}>
        <View style={styles.recordDot} />
        <Text style={styles.recordTimeText}>{formatTime(recordSeconds)}</Text>
      </View>

      {/* Live Animated Waveform Bars */}
      <View style={styles.waveformContainer}>
        {liveBars.map((height, idx) => (
          <View
            key={idx}
            style={[
              styles.waveformBar,
              { height: Math.max(6, Math.min(26, (height / 100) * 26)) },
            ]}
          />
        ))}
      </View>

      {/* Send Voice Note Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        disabled={isFinishing}
        onPress={handleSend}
        style={styles.sendVoiceBtn}
      >
        {isFinishing ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Send size={15} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  recorderDock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  trashBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
  },
  recordStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#EF4444',
  },
  recordTimeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    minWidth: 32,
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
    gap: 2.5,
    paddingHorizontal: 4,
  },
  waveformBar: {
    width: 3,
    backgroundColor: '#164E3F',
    borderRadius: 2,
  },
  sendVoiceBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#164E3F',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
