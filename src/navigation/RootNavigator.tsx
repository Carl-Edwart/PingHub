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
        animationEnabled: false,
      }}
    >
      {!isReady ? (
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{ animationEnabled: false }}
        />
      ) : (
        <Stack.Screen
          name="Main"
          component={BottomTabNavigator}
          options={{ animationEnabled: false }}
        />
      )}
    </Stack.Navigator>
  );
}
