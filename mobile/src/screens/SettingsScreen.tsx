// ============================================================
// DiscoTube Mobile – Settings / Connect Screen
// Enter Pico W IP address, view device info
// ============================================================

import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {COLORS} from '../constants/theme';
import {useStore} from '../store/store';
import api from '../services/api';

export default function SettingsScreen() {
  const {state, connectToHost} = useStore();
  const [ip, setIp] = useState(state.hostIp || '');
  const [connecting, setConnecting] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  const handleConnect = useCallback(async () => {
    const trimmed = ip.trim();
    if (!trimmed) {
      Alert.alert('Enter IP', 'Please enter the Pico W IP address.');
      return;
    }
    setConnecting(true);
    const ok = await connectToHost(trimmed);
    setConnecting(false);
    if (ok) {
      Alert.alert('Connected!', `Successfully connected to ${trimmed}`);
    } else {
      Alert.alert(
        'Connection Failed',
        `Could not reach DiscoTube at ${trimmed}.\n\nMake sure:\n• The Pico W is powered on\n• Your phone is on the same WiFi network\n• The IP address is correct`,
      );
    }
  }, [ip, connectToHost]);

  const fetchDeviceInfo = useCallback(async () => {
    const result = await api.getDeviceInfo();
    if (result) {
      setDeviceInfo(result);
    }
  }, []);

  return (
    <View style={styles.container}>
      {/* Connection */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Connect to DiscoTube</Text>
        <Text style={styles.hint}>
          Enter the IP address shown when the Pico W boots up.{'\n'}
          Your phone must be on the same WiFi network.
        </Text>
        <View style={styles.connectRow}>
          <TextInput
            style={styles.ipInput}
            placeholder="192.168.1.xxx"
            placeholderTextColor={COLORS.textMuted}
            value={ip}
            onChangeText={setIp}
            keyboardType="numeric"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.connectBtn, connecting && styles.connectBtnDisabled]}
            onPress={handleConnect}
            disabled={connecting}
            activeOpacity={0.7}>
            {connecting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.connectBtnText}>Connect</Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              {backgroundColor: state.connected ? COLORS.success : COLORS.danger},
            ]}
          />
          <Text style={styles.statusText}>
            {state.connected
              ? `Connected to ${state.hostIp}`
              : 'Not connected'}
          </Text>
        </View>
      </View>

      {/* Device Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Device Info</Text>
        <TouchableOpacity
          style={styles.infoBtn}
          onPress={fetchDeviceInfo}
          activeOpacity={0.7}>
          <Text style={styles.infoBtnText}>🔍 Query Device</Text>
        </TouchableOpacity>
        {deviceInfo && (
          <View style={styles.infoBox}>
            {Object.entries(deviceInfo.device || deviceInfo).map(([key, val]) => (
              <View key={key} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{key}</Text>
                <Text style={styles.infoValue}>{String(val)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* About */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>About</Text>
        <Text style={styles.aboutText}>
          DiscoTube Mobile{'\n'}
          WS2811 LED Cylinder Controller{'\n'}
          100 pixels · 24V · 10m spiral{'\n\n'}
          Built with React Native
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.bg, padding: 16},
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
    marginBottom: 8,
  },
  hint: {color: COLORS.textMuted, fontSize: 12, marginBottom: 12, lineHeight: 18},
  connectRow: {flexDirection: 'row', gap: 10, marginBottom: 12},
  ipInput: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    fontFamily: 'monospace',
  },
  connectBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  connectBtnDisabled: {opacity: 0.6},
  connectBtnText: {color: '#fff', fontWeight: '700', fontSize: 14},
  statusRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  statusDot: {width: 10, height: 10, borderRadius: 5},
  statusText: {color: COLORS.textSecondary, fontSize: 13},
  infoBtn: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 12,
  },
  infoBtnText: {color: COLORS.text, fontSize: 14},
  infoBox: {
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoLabel: {color: COLORS.textMuted, fontSize: 12},
  infoValue: {color: COLORS.text, fontSize: 12, fontWeight: '600'},
  aboutText: {color: COLORS.textSecondary, fontSize: 13, lineHeight: 20},
});
