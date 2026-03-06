// ============================================================
// DiscoTube Mobile – Effects Screen
// Effect selection grid + speed control
// ============================================================

import React, {useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Slider from '@react-native-community/slider';
import {COLORS, EFFECTS_LIST, EFFECT_ICONS} from '../constants/theme';
import {useStore} from '../store/store';
import api from '../services/api';

export default function EffectsScreen() {
  const {state, dispatch} = useStore();

  const setEffect = useCallback(
    (name: string) => {
      dispatch({type: 'SET_STATE', payload: {effect: name}});
      api.setEffect(name);
    },
    [dispatch],
  );

  const setSpeed = useCallback(
    (value: number) => {
      dispatch({type: 'SET_STATE', payload: {speed: value}});
      api.setSpeed(value);
    },
    [dispatch],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Speed Control */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Effect Speed</Text>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderIcon}>🐢</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={100}
            step={1}
            value={state.speed}
            onSlidingComplete={setSpeed}
            minimumTrackTintColor={COLORS.primary}
            maximumTrackTintColor={COLORS.sliderTrack}
            thumbTintColor={COLORS.sliderThumb}
          />
          <Text style={styles.sliderIcon}>🐇</Text>
        </View>
        <Text style={styles.sliderValue}>{state.speed}%</Text>
      </View>

      {/* Effects Grid */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Effects</Text>
        <View style={styles.effectsGrid}>
          {EFFECTS_LIST.map(name => {
            const isActive = state.effect === name;
            return (
              <TouchableOpacity
                key={name}
                style={[styles.effectBtn, isActive && styles.effectBtnActive]}
                onPress={() => setEffect(name)}
                activeOpacity={0.7}>
                <Text style={styles.effectIcon}>
                  {EFFECT_ICONS[name] || '💡'}
                </Text>
                <Text
                  style={[
                    styles.effectLabel,
                    isActive && styles.effectLabelActive,
                  ]}
                  numberOfLines={1}>
                  {name.replace(/_/g, ' ')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
  sliderRow: {flexDirection: 'row', alignItems: 'center'},
  slider: {flex: 1, marginHorizontal: 8},
  sliderIcon: {fontSize: 18},
  sliderValue: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  effectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  effectBtn: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  effectBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryDark + '30',
  },
  effectIcon: {fontSize: 24, marginBottom: 4},
  effectLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  effectLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
