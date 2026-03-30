import React from 'react';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import AtletasListScreen from '@/screens/atletas/AtletasListScreen';
import AtletaFormScreen from '@/screens/atletas/AtletaFormScreen';
import AtletaPerfilScreen from '@/screens/atletas/AtletaPerfilScreen';
import { COLORS } from '@/constants/theme';

type AtletasStackParamList = {
  AtletasList: undefined;
  AtletaForm: { atletaId?: string } | undefined;
  AtletaPerfil: { atletaId: string };
};

const Stack = createNativeStackNavigator<AtletasStackParamList>();

export default function AtletasStack() {
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
        name="AtletasList"
        component={AtletasListScreen}
        options={{
          title: 'Atletas',
        }}
      />

      <Stack.Screen
        name="AtletaForm"
        component={AtletaFormScreen}
        options={{
          title: 'Novo Atleta',
        }}
      />

      <Stack.Screen
        name="AtletaPerfil"
        component={AtletaPerfilScreen}
        options={{
          title: 'Perfil do Atleta',
        }}
      />
    </Stack.Navigator>
  );
}
