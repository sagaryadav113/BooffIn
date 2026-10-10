import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Trash2, Send, Mic } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export interface VoiceNoteAudioResult {
  duration: number;
  waveform: number[];
  uri?: string;
  blob?: Blob;
  mimeType?: string;
}

interface VoiceNoteRecorderProps {
  onSendVoiceNote: (audioData: VoiceNoteAudioResult) => void;
  onCancel: () => void;
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  onSendVoiceNote,
  onCancel,
}) => {
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [liveBars, setLiveBars] = useState<number[]>([20, 35, 50, 30, 60, 45, 70, 35, 80, 50]);
  const [isFinishing, setIsFinishing] = useState(false);
  const [hasPermissionError, setHasPermissionError] = useState(false);

  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordedWaveform = useRef<number[]>([]);
  const animationFrameRef = useRef<any>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    startTimeRef.current = Date.now();

    // 1. Timer for UI seconds count
    timerRef.current = setInterval(() => {
      setRecordSeconds((prev) => prev + 1);
    }, 1000);

    // 2. Hardware Microphone Stream & Real Waveform Analysis
    const startHardwareRecording = async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });

          mediaStreamRef.current = stream;

          // Set up Web Audio Analyser for live voice amplitude
          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
              const audioCtx = new AudioCtx();
              audioContextRef.current = audioCtx;
              const source = audioCtx.createMediaStreamSource(stream);
              const analyser = audioCtx.createAnalyser();
              analyser.fftSize = 64;
              source.connect(analyser);

              const dataArray = new Uint8Array(analyser.frequencyBinCount);
              const sampleInterval = setInterval(() => {
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                  sum += dataArray[i];
                }
                const avg = sum / dataArray.length;
                const normalized = Math.max(15, Math.min(100, Math.round((avg / 128) * 100)));
                recordedWaveform.current.push(normalized);
                setLiveBars((prev) => {
                  const sliced = prev.length > 22 ? prev.slice(1) : prev;
                  return [...sliced, normalized];
                });
              }, 120);

              animationFrameRef.current = sampleInterval;
            }
          } catch (audioCtxErr) {
            console.warn('AudioContext visualization setup note:', audioCtxErr);
          }

          // Set up MediaRecorder for physical audio capture
          let mimeType = 'audio/webm;codecs=opus';
          if (typeof MediaRecorder !== 'undefined') {
            if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
              if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4';
              } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
                mimeType = 'audio/ogg';
              } else {
                mimeType = '';
              }
            }

            const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => {
              if (e.data && e.data.size > 0) {
                audioChunksRef.current.push(e.data);
              }
            };

            recorder.start(100); // 100ms timeslice
          }
        }
      } catch (err: any) {
        console.warn('Microphone recording error:', err);
        setHasPermissionError(true);
      }
    };

    startHardwareRecording();

    return () => {
      cleanupHardware();
    };
  }, []);

  const cleanupHardware = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) clearInterval(animationFrameRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
  };

  const handleSend = async () => {
    setIsFinishing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}

    const totalSeconds = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    const finalWaveform = recordedWaveform.current.length >= 8
      ? recordedWaveform.current.slice(-28)
      : [30, 50, 75, 40, 85, 95, 60, 45, 80, 55, 65, 85, 45, 35, 65, 90, 75, 45];

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => {
        const mime = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });

        if (typeof FileReader !== 'undefined') {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = (reader.result as string) || (typeof URL !== 'undefined' ? URL.createObjectURL(audioBlob) : undefined);
            cleanupHardware();
            onSendVoiceNote({
              duration: totalSeconds,
              waveform: finalWaveform,
              blob: audioBlob,
              uri: dataUrl,
              mimeType: mime,
            });
          };
          reader.onerror = () => {
            const objectUrl = typeof URL !== 'undefined' ? URL.createObjectURL(audioBlob) : undefined;
            cleanupHardware();
            onSendVoiceNote({
              duration: totalSeconds,
              waveform: finalWaveform,
              blob: audioBlob,
              uri: objectUrl,
              mimeType: mime,
            });
          };
          reader.readAsDataURL(audioBlob);
        } else {
          const objectUrl = typeof URL !== 'undefined' ? URL.createObjectURL(audioBlob) : undefined;
          cleanupHardware();
          onSendVoiceNote({
            duration: totalSeconds,
            waveform: finalWaveform,
            blob: audioBlob,
            uri: objectUrl,
            mimeType: mime,
          });
        }
      };

      try {
        if (typeof recorder.requestData === 'function') {
          recorder.requestData();
        }
      } catch {}

      recorder.stop();
    } else {
      cleanupHardware();
      onSendVoiceNote({
        duration: totalSeconds,
        waveform: finalWaveform,
      });
    }
  };

  const handleCancel = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    cleanupHardware();
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

      {/* Live Animated Voice Waveform Bars */}
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
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  recordTimeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 30,
    backgroundColor: '#F1F5F9',
    borderRadius: 15,
    paddingHorizontal: 12,
  },
  waveformBar: {
    width: 3,
    backgroundColor: '#164E3F',
    borderRadius: 2,
  },
  sendVoiceBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#164E3F',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
