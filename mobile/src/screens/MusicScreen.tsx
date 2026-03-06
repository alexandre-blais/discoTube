// ============================================================
// DiscoTube Mobile – Music Screen
// Music reactive mode, sensitivity, audio visualizer
// ============================================================

import React, {useCallback, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Slider from '@react-native-community/slider';
import {COLORS, MUSIC_MODES} from '../constants/theme';
import {useStore} from '../store/store';
import api from '../services/api';

function AudioBar({label, value, color}: {label: string; value: number; color: string}) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: value * 100,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [value, widthAnim]);

  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            {
              backgroundColor: color,
              width: widthAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <Text style={styles.barValue}>{Math.round(value * 100)}%</Text>
    </View>
  );
}

export default function MusicScreen() {
  const {state, dispatch} = useStore();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll audio state faster when music mode is active
  useEffect(() => {
    if (state.musicMode !== 'off') {
      pollRef.current = setInterval(async () => {
        const result = await api.getMusicState();
        if (result && (result as any).audio) {
          dispatch({
            type: 'SET_STATE',
            payload: {audio: (result as any).audio},
          });
        }
      }, 250);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [state.musicMode, dispatch]);

  const setMusicMode = useCallback(
    (mode: string) => {
      dispatch({type: 'SET_STATE', payload: {musicMode: mode}});
      api.setMusicMode(mode);
    },
    [dispatch],
  );

  const setSensitivity = useCallback(
    (value: number) => {
      const sens = value / 100;
      dispatch({type: 'SET_STATE', payload: {musicSensitivity: sens}});
      api.setMusicSensitivity(sens);
    },
    [dispatch],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Music Mode Selection */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Music Reactive Mode</Text>
        <View style={styles.modeGrid}>
          {MUSIC_MODES.map(mode => {
            const isActive = state.musicMode === mode.id;
            return (
              <TouchableOpacity
                key={mode.id}
                style={[styles.modeBtn, isActive && styles.modeBtnActive]}
                onPress={() => setMusicMode(mode.id)}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.modeLabel,
                    isActive && styles.modeLabelActive,
                  ]}>
                  {mode.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Sensitivity */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sensitivity</Text>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderIcon}>Low</Text>
          <Slider
            style={styles.slider}
            minimumValue={10}
            maximumValue={300}
            step={5}
            value={Math.round(state.musicSensitivity * 100)}
            onSlidingComplete={setSensitivity}
            minimumTrackTintColor={COLORS.accent}
            maximumTrackTintColor={COLORS.sliderTrack}
            thumbTintColor={COLORS.accent}
          />
          <Text style={styles.sliderIcon}>High</Text>
        </View>
        <Text style={styles.sliderValue}>
          {state.musicSensitivity.toFixed(1)}x
        </Text>
      </View>

      {/* Audio Visualizer */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Audio Visualizer</Text>
        <AudioBar label="Bass" value={state.audio.bass} color="#ff0080" />
        <AudioBar label="Mid" value={state.audio.mid} color="#a855f7" />
        <AudioBar label="High" value={state.audio.high} color="#00d4ff" />

        {/* Beat Indicator */}
        <View
          style={[
            styles.beatIndicator,
            state.audio.beat && styles.beatActive,
          ]}>
          <Text
            style={[
              styles.beatText,
              state.audio.beat && styles.beatTextActive,
            ]}>
            🥁 BEAT
          </Text>
        </View>

        {/* EQ Bars */}
        {state.audio.eq && state.audio.eq.length > 0 && (
          <View style={styles.eqContainer}>
            {state.audio.eq.map((val, i) => (
              <View key={i} style={styles.eqBarWrap}>
                <View
                  style={[styles.eqBar, {height: `${Math.max(2, val * 100)}%`}]}
                />
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.bg},
  content: {padding: 16, paddingBottom: 32},
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  modeGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  modeBtn: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    minWidth: '45%',
    flexGrow: 1,
    alignItems: 'center',
  },
  modeBtnActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent + '20',
  },
  modeLabel: {color: COLORS.textSecondary, fontSize: 14},
  modeLabelActive: {color: COLORS.accent, fontWeight: '700'},
  sliderRow: {flexDirection: 'row', alignItems: 'center'},
  slider: {flex: 1, marginHorizontal: 8},
  sliderIcon: {color: COLORS.textMuted, fontSize: 12},
  sliderValue: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  barRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 10},
  barLabel: {color: COLORS.textSecondary, width: 40, fontSize: 12},
  barTrack: {
    flex: 1,
    height: 12,
    backgroundColor: COLORS.bg,
    borderRadius: 6,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  barFill: {height: '100%', borderRadius: 6},
  barValue: {color: COLORS.textMuted, width: 40, fontSize: 11, textAlign: 'right'},
  beatIndicator: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  beatActive: {
    backgroundColor: COLORS.accent + '40',
    borderColor: COLORS.accent,
  },
  beatText: {color: COLORS.textMuted, fontSize: 14, fontWeight: '700'},
  beatTextActive: {color: COLORS.accent},
  eqContainer: {
    flexDirection: 'row',
    height: 80,
    marginTop: 16,
    alignItems: 'flex-end',
    gap: 2,
  },
  eqBarWrap: {flex: 1, height: '100%', justifyContent: 'flex-end'},
  eqBar: {
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    width: '100%',
  },
});
