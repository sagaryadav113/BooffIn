import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Play, Pause } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface VoiceNotePlayerProps {
  audioUrl?: string | null;
  duration?: number;
  waveform?: number[];
  isMe?: boolean;
}

const DEFAULT_WAVEFORM = [
  30, 45, 60, 25, 75, 90, 40, 65, 80, 50,
  35, 70, 85, 95, 60, 45, 80, 65, 40, 55,
  70, 85, 50, 30, 60, 75, 40, 20
];

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  audioUrl,
  duration = 18,
  waveform = DEFAULT_WAVEFORM,
  isMe = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<any>(null);

  const totalDuration = duration > 0 ? duration : 18;

  // Initialize Web Audio playback if available
  useEffect(() => {
    if (Platform.OS === 'web' && audioUrl && typeof Audio !== 'undefined') {
      try {
        const audio = new Audio(audioUrl);
        audio.preload = 'metadata';
        audioRef.current = audio;

        audio.onended = () => {
          setIsPlaying(false);
          setCurrentTime(0);
          if (timerRef.current) clearInterval(timerRef.current);
        };

        audio.ontimeupdate = () => {
          setCurrentTime(audio.currentTime);
        };

        audio.onerror = (e) => {
          console.warn('Audio playback load warning:', e);
        };
      } catch (err) {
        console.warn('Audio element initialization error:', err);
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [audioUrl]);

  const togglePlayPause = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (timerRef.current) clearInterval(timerRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      if (audioRef.current && audioUrl) {
        audioRef.current.playbackRate = playbackSpeed;
        audioRef.current.play().catch((err) => {
          console.warn('Browser audio play failed, running simulated fallback:', err);
          startSimulatedPlay();
        });
      } else {
        startSimulatedPlay();
      }
    }
  };

  const startSimulatedPlay = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const intervalMs = 100 / playbackSpeed;
    timerRef.current = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 0.1;
        if (next >= totalDuration) {
          clearInterval(timerRef.current);
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
    }, intervalMs);
  };

  const handleScrub = (idx: number) => {
    const barsCount = bars.length;
    const targetTime = (idx / barsCount) * totalDuration;
    setCurrentTime(targetTime);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const toggleSpeed = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const nextSpeed: 1 | 1.5 | 2 = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) : 0;
  const bars = waveform && waveform.length > 0 ? waveform : DEFAULT_WAVEFORM;

  return (
    <View style={styles.container}>
      {/* Play / Pause Circular Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={togglePlayPause}
        style={[
          styles.playBtn,
          isMe ? styles.playBtnMy : styles.playBtnOther,
        ]}
      >
        {isPlaying ? (
          <Pause size={16} color={isMe ? '#164E3F' : '#FFFFFF'} />
        ) : (
          <Play size={16} color={isMe ? '#164E3F' : '#FFFFFF'} style={{ marginLeft: 2 }} />
        )}
      </TouchableOpacity>

      {/* Waveform Visualization */}
      <View style={styles.waveformWrap}>
        <View style={styles.barsContainer}>
          {bars.map((barHeight, idx) => {
            const barProgress = idx / bars.length;
            const isPlayed = barProgress <= progressPercent;
            const barPx = Math.max(6, Math.min(28, (barHeight / 100) * 28));

            return (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.7}
                onPress={() => handleScrub(idx)}
                style={styles.barTouchWrapper}
              >
                <View
                  style={[
                    styles.waveformBar,
                    { height: barPx },
                    isMe
                      ? isPlayed
                        ? styles.barMyPlayed
                        : styles.barMyUnplayed
                      : isPlayed
                      ? styles.barOtherPlayed
                      : styles.barOtherUnplayed,
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Time and Speed Indicators */}
        <View style={styles.timeRow}>
          <Text style={[styles.timeText, isMe ? styles.timeTextMy : styles.timeTextOther]}>
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </Text>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={toggleSpeed}
            style={[styles.speedBadge, isMe ? styles.speedBadgeMy : styles.speedBadgeOther]}
          >
            <Text style={[styles.speedText, isMe ? styles.speedTextMy : styles.speedTextOther]}>
              {playbackSpeed}x
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 220,
    maxWidth: 290,
    gap: 10,
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnMy: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  playBtnOther: {
    backgroundColor: '#164E3F',
  },
  waveformWrap: {
    flex: 1,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 30,
    gap: 2,
  },
  barTouchWrapper: {
    flex: 1,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformBar: {
    width: 3,
    borderRadius: 2,
  },
  barMyPlayed: {
    backgroundColor: '#34D399',
  },
  barMyUnplayed: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  barOtherPlayed: {
    backgroundColor: '#164E3F',
  },
  barOtherUnplayed: {
    backgroundColor: '#CBD5E1',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  timeTextMy: {
    color: '#D1FAE5',
  },
  timeTextOther: {
    color: '#64748B',
  },
  speedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  speedBadgeMy: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  speedBadgeOther: {
    backgroundColor: '#E2E8F0',
  },
  speedText: {
    fontSize: 10,
    fontWeight: '700',
  },
  speedTextMy: {
    color: '#FFFFFF',
  },
  speedTextOther: {
    color: '#0F172A',
  },
});
