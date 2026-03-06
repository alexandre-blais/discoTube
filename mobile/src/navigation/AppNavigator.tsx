// ============================================================
// DiscoTube Mobile – Navigation
// Bottom tab navigator (same layout as chronoCrew)
// ============================================================

import React from 'react';
import {TouchableOpacity, View, Text, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import ColorsScreen from '../screens/ColorsScreen';
import EffectsScreen from '../screens/EffectsScreen';
import MusicScreen from '../screens/MusicScreen';
import ScenesScreen from '../screens/ScenesScreen';
import SettingsScreen from '../screens/SettingsScreen';

import {COLORS} from '../constants/theme';
import {useStore} from '../store/store';
import api from '../services/api';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Colors: '🎨',
  Effects: '✨',
  Music: '🎵',
  Scenes: '💾',
  Settings: '⚙️',
};

function PowerHeader() {
  const {state} = useStore();

  const togglePower = async () => {
    await api.togglePower();
  };

  return (
    <View style={headerStyles.container}>
      <View style={headerStyles.left}>
        <Text style={headerStyles.title}>🎵 DiscoTube</Text>
        <View
          style={[
            headerStyles.statusDot,
            {
              backgroundColor: state.connected
                ? COLORS.success
                : COLORS.danger,
            },
          ]}
        />
      </View>
      <TouchableOpacity
        style={[
          headerStyles.powerBtn,
          state.power && headerStyles.powerBtnOn,
        ]}
        onPress={togglePower}
        activeOpacity={0.7}>
        <Text style={headerStyles.powerText}>⏻</Text>
      </TouchableOpacity>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  left: {flexDirection: 'row', alignItems: 'center', gap: 8},
  title: {color: COLORS.text, fontSize: 20, fontWeight: '800'},
  statusDot: {width: 8, height: 8, borderRadius: 4},
  powerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
  },
  powerBtnOn: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success + '20',
  },
  powerText: {fontSize: 20, color: COLORS.text},
});

export default function AppNavigator() {
  return (
    <SafeAreaProvider>
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: COLORS.primary,
            background: COLORS.bg,
            card: COLORS.bg,
            text: COLORS.text,
            border: COLORS.cardBorder,
            notification: COLORS.accent,
          },
          fonts: {
            regular: {fontFamily: 'System', fontWeight: '400'},
            medium: {fontFamily: 'System', fontWeight: '500'},
            bold: {fontFamily: 'System', fontWeight: '700'},
            heavy: {fontFamily: 'System', fontWeight: '900'},
          },
        }}>
        <Tab.Navigator
          screenOptions={({route}) => ({
            header: () => <PowerHeader />,
            tabBarIcon: ({focused}) => (
              <Text style={{fontSize: 20, opacity: focused ? 1 : 0.5}}>
                {TAB_ICONS[route.name] || '💡'}
              </Text>
            ),
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: COLORS.tabInactive,
            tabBarStyle: {
              backgroundColor: COLORS.bg,
              borderTopColor: COLORS.cardBorder,
              paddingBottom: 4,
              height: 56,
            },
            tabBarLabelStyle: {fontSize: 11, fontWeight: '600'},
          })}>
          <Tab.Screen name="Colors" component={ColorsScreen} />
          <Tab.Screen name="Effects" component={EffectsScreen} />
          <Tab.Screen name="Music" component={MusicScreen} />
          <Tab.Screen name="Scenes" component={ScenesScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
