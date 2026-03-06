// ============================================================
// DiscoTube Mobile – App Entry
// React Native app for controlling WS2811 LED cylinder
// Works on both Android and iOS
// ============================================================

import React from 'react';
import {StatusBar} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {StoreProvider} from './src/store/store';
import AppNavigator from './src/navigation/AppNavigator';

function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <StoreProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0d0d1a" />
        <AppNavigator />
      </StoreProvider>
    </GestureHandlerRootView>
  );
}

export default App;
