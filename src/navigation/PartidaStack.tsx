import React from 'react';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import PartidaConfigScreen from '@/screens/partida/PartidaConfigScreen';
import PartidaPlayScreen from '@/screens/partida/PartidaPlayScreen';
import PartidaResultadoScreen from '@/screens/partida/PartidaResultadoScreen';
import { COLORS } from '@/constants/theme';

export type PartidaParamList = {
  PartidaConfig: undefined;
  PartidaPlay: undefined;
  PartidaResultado: undefined;
};

const Stack = createNativeStackNavigator<PartidaParamList>();

export default function PartidaStack() {
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
        name="PartidaConfig"
        component={PartidaConfigScreen}
        options={{
          title: 'Nova Partida',
        }}
      />

      <Stack.Screen
        name="PartidaPlay"
        component={PartidaPlayScreen}
        options={{
          title: 'Placar',
          headerBackVisible: false,
        }}
      />

      <Stack.Screen
        name="PartidaResultado"
        component={PartidaResultadoScreen}
        options={{
          title: 'Resultado',
          headerBackVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}
