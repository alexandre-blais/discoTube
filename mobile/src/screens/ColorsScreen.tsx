// ============================================================
// DiscoTube Mobile – Colors Screen
// Color wheel, presets, brightness, and color temperature
// ============================================================

import React, {useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import Slider from '@react-native-community/slider';
import {COLORS, COLOR_PRESETS} from '../constants/theme';
import {useStore} from '../store/store';
import api from '../services/api';

export default function ColorsScreen() {
  const {state, dispatch} = useStore();
  const {color, brightness, colorTemp} = state;

  const hexColor =
    '#' +
    [color.r, color.g, color.b]
      .map(c => c.toString(16).padStart(2, '0'))
      .join('');

  const setColor = useCallback(
    (r: number, g: number, b: number) => {
      dispatch({type: 'SET_STATE', payload: {color: {r, g, b}}});
      api.setColor(r, g, b);
    },
    [dispatch],
  );

  const setBrightness = useCallback(
    (value: number) => {
      dispatch({type: 'SET_STATE', payload: {brightness: value}});
      api.setBrightness(value);
    },
    [dispatch],
  );

  const setColorTemp = useCallback(
    (value: number) => {
      dispatch({type: 'SET_STATE', payload: {colorTemp: value}});
      api.setColorTemp(value);
    },
    [dispatch],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Current Color Preview */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Color</Text>
        <View style={[styles.colorPreview, {backgroundColor: hexColor}]}>
          <Text style={styles.hexText}>{hexColor.toUpperCase()}</Text>
        </View>
        <View style={styles.rgbRow}>
          <View style={styles.rgbInput}>
            <Text style={styles.rgbLabel}>R</Text>
            <TextInput
              style={[styles.rgbField, {borderColor: '#ff4444'}]}
              keyboardType="numeric"
              value={String(color.r)}
              onChangeText={t => {
                const v = Math.min(255, Math.max(0, parseInt(t) || 0));
                setColor(v, color.g, color.b);
              }}
              maxLength={3}
            />
          </View>
          <View style={styles.rgbInput}>
            <Text style={styles.rgbLabel}>G</Text>
            <TextInput
              style={[styles.rgbField, {borderColor: '#44ff44'}]}
              keyboardType="numeric"
              value={String(color.g)}
              onChangeText={t => {
                const v = Math.min(255, Math.max(0, parseInt(t) || 0));
                setColor(color.r, v, color.b);
              }}
              maxLength={3}
            />
          </View>
          <View style={styles.rgbInput}>
            <Text style={styles.rgbLabel}>B</Text>
            <TextInput
              style={[styles.rgbField, {borderColor: '#4444ff'}]}
              keyboardType="numeric"
              value={String(color.b)}
              onChangeText={t => {
                const v = Math.min(255, Math.max(0, parseInt(t) || 0));
                setColor(color.r, color.g, v);
              }}
              maxLength={3}
            />
          </View>
        </View>
      </View>

      {/* Color Presets */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Colors</Text>
        <View style={styles.presetGrid}>
          {Object.entries(COLOR_PRESETS).map(([name, [r, g, b]]) => (
            <TouchableOpacity
              key={name}
              style={[
                styles.presetSwatch,
                {backgroundColor: `rgb(${r},${g},${b})`},
                color.r === r && color.g === g && color.b === b && styles.presetActive,
              ]}
              onPress={() => setColor(r, g, b)}
              activeOpacity={0.7}>
              <Text style={styles.presetLabel}>{name.replace(/_/g, ' ')}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Brightness */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Brightness</Text>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderIcon}>🌑</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={100}
            step={1}
            value={brightness}
            onSlidingComplete={setBrightness}
            minimumTrackTintColor={COLORS.primary}
            maximumTrackTintColor={COLORS.sliderTrack}
            thumbTintColor={COLORS.sliderThumb}
          />
          <Text style={styles.sliderIcon}>☀️</Text>
        </View>
        <Text style={styles.sliderValue}>{brightness}%</Text>
      </View>

      {/* Color Temperature */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Color Temperature</Text>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderIcon}>🕯️</Text>
          <Slider
            style={styles.slider}
            minimumValue={2000}
            maximumValue={9000}
            step={100}
            value={colorTemp}
            onSlidingComplete={setColorTemp}
            minimumTrackTintColor="#ffaa44"
            maximumTrackTintColor="#88bbff"
            thumbTintColor={COLORS.sliderThumb}
          />
          <Text style={styles.sliderIcon}>❄️</Text>
        </View>
        <Text style={styles.sliderValue}>{colorTemp}K</Text>
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
  colorPreview: {
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  hexText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    textShadowColor: '#000',
    textShadowRadius: 6,
    textShadowOffset: {width: 0, height: 1},
  },
  rgbRow: {flexDirection: 'row', justifyContent: 'space-between', gap: 12},
  rgbInput: {flex: 1, alignItems: 'center'},
  rgbLabel: {color: COLORS.textSecondary, fontSize: 12, marginBottom: 4},
  rgbField: {
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    textAlign: 'center',
    width: '100%',
  },
  presetGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  presetSwatch: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 3,
  },
  presetActive: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  presetLabel: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '600',
    textShadowColor: '#000',
    textShadowRadius: 3,
    textShadowOffset: {width: 0, height: 1},
    textAlign: 'center',
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
});
