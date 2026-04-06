import React from 'react';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import RegrasListScreen from '@/screens/regras/RegrasListScreen';
import RegrasDetalheScreen from '@/screens/regras/RegrasDetalheScreen';
import { COLORS } from '@/constants/theme';

type RegrasStackParamList = {
  RegrasList: undefined;
  RegrasDetalhe: { ruleId: string };
};

const Stack = createNativeStackNavigator<RegrasStackParamList>();

export default function RegrasStack() {
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
        name="RegrasList"
        component={RegrasListScreen}
        options={{
          title: 'Regras',
        }}
      />

      <Stack.Screen
        name="RegrasDetalhe"
        component={RegrasDetalheScreen}
        options={{
          title: 'Detalhes',
        }}
      />
    </Stack.Navigator>
  );
}
