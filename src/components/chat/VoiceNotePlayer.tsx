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
  30, 45, 65, 25, 75, 90, 40, 70, 85, 55,
  40, 75, 90, 60, 45, 80, 65, 50, 70, 35,
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
        audio.preload = 'auto';
        audioRef.current = audio;

        audio.onended = () => {
          setIsPlaying(false);
          setCurrentTime(0);
          if (timerRef.current) clearInterval(timerRef.current);
        };

        audio.ontimeupdate = () => {
          if (audio.currentTime !== undefined && !isNaN(audio.currentTime)) {
            setCurrentTime(audio.currentTime);
          }
        };

        audio.onerror = (e) => {
          console.warn('Audio playback load note:', e);
        };
      } catch (err) {
        console.warn('Audio element initialization error:', err);
      }
    }

    return () => {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch {}
        audioRef.current = null;
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [audioUrl]);

  const togglePlayPause = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (isPlaying) {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch {}
      }
      if (timerRef.current) clearInterval(timerRef.current);
      setIsPlaying(false);
    } else {
      if (!audioUrl) {
        setIsPlaying(true);
        startSimulatedPlay();
        return;
      }

      // Re-initialize audio if needed
      if (!audioRef.current && Platform.OS === 'web' && typeof Audio !== 'undefined') {
        try {
          const audio = new Audio(audioUrl);
          audio.preload = 'auto';
          audio.onended = () => {
            setIsPlaying(false);
            setCurrentTime(0);
            if (timerRef.current) clearInterval(timerRef.current);
          };
          audio.ontimeupdate = () => {
            if (audio.currentTime !== undefined && !isNaN(audio.currentTime)) {
              setCurrentTime(audio.currentTime);
            }
          };
          audioRef.current = audio;
        } catch {}
      }

      if (audioRef.current) {
        try {
          audioRef.current.playbackRate = playbackSpeed;
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (err) {
          console.warn('Browser audio play failed, falling back to animated player:', err);
          setIsPlaying(true);
          startSimulatedPlay();
        }
      } else {
        setIsPlaying(true);
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
      try {
        audioRef.current.currentTime = targetTime;
      } catch {}
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
      try {
        audioRef.current.playbackRate = nextSpeed;
      } catch {}
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
    width: '100%',
    minWidth: 180,
    maxWidth: 290,
    gap: 10,
    overflow: 'hidden',
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
    minWidth: 0,
    overflow: 'hidden',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 30,
    gap: 1.5,
    width: '100%',
    overflow: 'hidden',
  },
  barTouchWrapper: {
    flex: 1,
    minWidth: 0,
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
