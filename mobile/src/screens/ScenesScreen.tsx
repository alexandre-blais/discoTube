// ============================================================
// DiscoTube Mobile – Scenes Screen
// Quick scenes, saved presets, timer, zone control
// ============================================================

import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import {COLORS, QUICK_SCENES} from '../constants/theme';
import {useStore} from '../store/store';
import api from '../services/api';

export default function ScenesScreen() {
  const {state, dispatch, syncState} = useStore();
  const [sceneName, setSceneName] = useState('');
  const [timerValue, setTimerValue] = useState(0);

  const applyQuickScene = useCallback(
    async (name: string) => {
      const scene = QUICK_SCENES[name];
      if (!scene) return;

      dispatch({
        type: 'SET_STATE',
        payload: {
          effect: scene.effect,
          speed: scene.speed,
          brightness: scene.brightness,
          color: {r: scene.color[0], g: scene.color[1], b: scene.color[2]},
        },
      });

      // Fire all API calls
      await Promise.all([
        api.setEffect(scene.effect),
        api.setSpeed(scene.speed),
        api.setBrightness(scene.brightness),
        api.setColor(scene.color[0], scene.color[1], scene.color[2]),
      ]);
    },
    [dispatch],
  );

  const saveScene = useCallback(async () => {
    const name = sceneName.trim();
    if (!name) {
      Alert.alert('Enter a name', 'Please enter a name for your scene.');
      return;
    }
    await api.savePreset(name);
    setSceneName('');
    Alert.alert('Saved!', `Scene "${name}" saved successfully.`);
    syncState();
  }, [sceneName, syncState]);

  const setTimer = useCallback(
    (minutes: number) => {
      setTimerValue(minutes);
      dispatch({type: 'SET_STATE', payload: {timer: minutes}});
      api.setTimer(minutes);
    },
    [dispatch],
  );

  const setZoneColor = useCallback(
    (zone: number, hex: string) => {
      const r = parseInt(hex.substr(1, 2), 16);
      const g = parseInt(hex.substr(3, 2), 16);
      const b = parseInt(hex.substr(5, 2), 16);
      api.setZoneColor(zone, r, g, b);
    },
    [],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Quick Scenes */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Scenes</Text>
        <View style={styles.sceneGrid}>
          {Object.entries(QUICK_SCENES).map(([name, scene]) => (
            <TouchableOpacity
              key={name}
              style={styles.sceneBtn}
              onPress={() => applyQuickScene(name)}
              activeOpacity={0.7}>
              <Text style={styles.sceneIcon}>{scene.icon}</Text>
              <Text style={styles.sceneLabel}>{name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Save Scene */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Save Current Scene</Text>
        <View style={styles.saveRow}>
          <TextInput
            style={styles.saveInput}
            placeholder="Scene name..."
            placeholderTextColor={COLORS.textMuted}
            value={sceneName}
            onChangeText={setSceneName}
          />
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={saveScene}
            activeOpacity={0.7}>
            <Text style={styles.saveBtnText}>💾 Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Zones */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Strip Zones</Text>
        <Text style={styles.hint}>
          WS2811 strip spirals continuously up the tube (100 pixels)
        </Text>
        <View style={styles.zoneRow}>
          <View style={styles.zoneItem}>
            <Text style={styles.zoneLabel}>🌀 Bottom Half</Text>
            <Text style={styles.zoneDetail}>Pixels 0–49</Text>
            <TouchableOpacity
              style={[styles.zoneColor, {backgroundColor: '#ff0080'}]}
              onPress={() => setZoneColor(0, '#ff0080')}
            />
          </View>
          <View style={styles.zoneItem}>
            <Text style={styles.zoneLabel}>🌀 Top Half</Text>
            <Text style={styles.zoneDetail}>Pixels 50–99</Text>
            <TouchableOpacity
              style={[styles.zoneColor, {backgroundColor: '#0080ff'}]}
              onPress={() => setZoneColor(1, '#0080ff')}
            />
          </View>
        </View>
      </View>

      {/* Timer */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Auto-Off Timer</Text>
        <View style={styles.timerRow}>
          {[15, 30, 60, 120].map(min => (
            <TouchableOpacity
              key={min}
              style={[
                styles.timerBtn,
                timerValue === min && styles.timerBtnActive,
              ]}
              onPress={() => setTimer(min)}
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.timerBtnText,
                  timerValue === min && styles.timerBtnTextActive,
                ]}>
                {min < 60 ? `${min}m` : `${min / 60}h`}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.timerBtn, styles.timerBtnCancel]}
            onPress={() => setTimer(0)}
            activeOpacity={0.7}>
            <Text style={styles.timerBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        {state.timer > 0 && (
          <Text style={styles.timerStatus}>
            ⏱️ Auto-off in ~{state.timer} min
          </Text>
        )}
      </View>

      {/* Device Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Connection</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status</Text>
          <Text
            style={[
              styles.infoValue,
              {color: state.connected ? COLORS.success : COLORS.danger},
            ]}>
            {state.connected ? '● Connected' : '● Disconnected'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Host</Text>
          <Text style={styles.infoValue}>{state.hostIp || '—'}</Text>
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
  hint: {color: COLORS.textMuted, fontSize: 12, marginBottom: 12},
  sceneGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  sceneBtn: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    minWidth: '45%',
    flexGrow: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sceneIcon: {fontSize: 28, marginBottom: 4},
  sceneLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  saveRow: {flexDirection: 'row', gap: 10},
  saveInput: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  saveBtnText: {color: '#fff', fontWeight: '700', fontSize: 14},
  zoneRow: {flexDirection: 'row', gap: 12},
  zoneItem: {flex: 1, alignItems: 'center'},
  zoneLabel: {color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 4},
  zoneDetail: {color: COLORS.textMuted, fontSize: 11, marginBottom: 8},
  zoneColor: {width: 44, height: 44, borderRadius: 22},
  timerRow: {flexDirection: 'row', gap: 8, flexWrap: 'wrap'},
  timerBtn: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  timerBtnActive: {borderColor: COLORS.primary, backgroundColor: COLORS.primary + '20'},
  timerBtnCancel: {borderColor: COLORS.danger + '50'},
  timerBtnText: {color: COLORS.textSecondary, fontSize: 13, fontWeight: '600'},
  timerBtnTextActive: {color: COLORS.primary},
  timerStatus: {
    color: COLORS.warning,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {color: COLORS.textMuted, fontSize: 13},
  infoValue: {color: COLORS.text, fontSize: 13, fontWeight: '600'},
});
