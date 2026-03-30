import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { useDatabase } from '@/hooks/useDatabase';
import RootNavigator from '@/navigation/RootNavigator';
import { COLORS } from '@/constants/theme';

export default function App() {
  const { isReady, initializeDatabase } = useDatabase();

  useEffect(() => {
    initializeDatabase();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer
        theme={{
          dark: false,
          colors: {
            primary: COLORS.primary,
            background: COLORS.background,
            card: COLORS.surface,
            text: COLORS.text,
            border: COLORS.border,
            notification: COLORS.danger,
          },
          fonts: {
            regular: {
              fontFamily: 'System',
              fontWeight: '400',
            },
            medium: {
              fontFamily: 'System',
              fontWeight: '500',
            },
            bold: {
              fontFamily: 'System',
              fontWeight: '700',
            },
            heavy: {
              fontFamily: 'System',
              fontWeight: '900',
            },
          },
        }}
      >
        {isReady ? <RootNavigator /> : null}
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
