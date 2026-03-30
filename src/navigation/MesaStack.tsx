import React from 'react';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import MesaStatusScreen from '@/screens/mesa/MesaStatusScreen';
import MesaFilaScreen from '@/screens/mesa/MesaFilaScreen';
import { COLORS } from '@/constants/theme';

type MesaStackParamList = {
  MesaStatus: undefined;
  MesaFila: undefined;
};

const Stack = createNativeStackNavigator<MesaStackParamList>();

export default function MesaStack() {
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
          color: COLORS.primary,
        },
        headerShadowVisible: true,
      }}
    >
      <Stack.Screen
        name="MesaStatus"
        component={MesaStatusScreen}
        options={{
          title: 'Status das Mesas',
        }}
      />

      <Stack.Screen
        name="MesaFila"
        component={MesaFilaScreen}
        options={{
          title: 'Fila de Espera',
        }}
      />
    </Stack.Navigator>
  );
}
