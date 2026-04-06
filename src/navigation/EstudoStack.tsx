import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import EstudoBibliotecaScreen from '@/screens/estudo/EstudoBibliotecaScreen';
import EstudoConteudoScreen from '@/screens/estudo/EstudoConteudoScreen';
import { COLORS } from '@/constants/theme';

type EstudoStackParamList = {
  EstudoBiblioteca: undefined;
  EstudoConteudo: { contentId: string };
};

const Stack = createNativeStackNavigator<EstudoStackParamList>();

export default function EstudoStack() {
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
        name="EstudoBiblioteca"
        component={EstudoBibliotecaScreen}
        options={{
          title: 'Biblioteca de Técnicas',
        }}
      />

      <Stack.Screen
        name="EstudoConteudo"
        component={EstudoConteudoScreen}
        options={{
          title: 'Aprender Técnica',
        }}
      />
    </Stack.Navigator>
  );
}
