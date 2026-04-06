import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '@/screens/splash/SplashScreen';
import BottomTabNavigator from './BottomTabNavigator';
import { useDatabase } from '@/hooks/useDatabase';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isReady } = useDatabase();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {!isReady ? (
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
        />
      ) : (
        <Stack.Screen
          name="Main"
          component={BottomTabNavigator}
        />
      )}
    </Stack.Navigator>
  );
}
