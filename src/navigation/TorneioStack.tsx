import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TorneioListScreen from '@/screens/torneio/TorneioListScreen';
import TorneioCreateScreen from '@/screens/torneio/TorneioCreateScreen';
import TorneioChaveScreen from '@/screens/torneio/TorneioChaveScreen';
import TorneioResultadoScreen from '@/screens/torneio/TorneioResultadoScreen';
import { COLORS } from '@/constants/theme';

const Stack = createNativeStackNavigator();

export default function TorneioStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.surface,
        },
        headerTintColor: COLORS.primary,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="TorneioList"
        component={TorneioListScreen}
        options={{
          title: 'Torneios',
        }}
      />

      <Stack.Screen
        name="TorneioCreate"
        component={TorneioCreateScreen}
        options={{
          title: 'Novo Torneio',
        }}
      />

      <Stack.Screen
        name="TorneioChave"
        component={TorneioChaveScreen}
        options={{
          title: 'Chave do Torneio',
        }}
      />

      <Stack.Screen
        name="TorneioResultado"
        component={TorneioResultadoScreen}
        options={{
          title: 'Resultado',
        }}
      />
    </Stack.Navigator>
  );
}
