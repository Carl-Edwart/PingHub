import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import EstudoBibliotecaScreen from '@/screens/estudo/EstudoBibliotecaScreen';
import EstudoConteudoScreen from '@/screens/estudo/EstudoConteudoScreen';
import { COLORS } from '@/constants/theme';

const Stack = createNativeStackNavigator();

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
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="EstudoBiblioteca"
        component={EstudoBibliotecaScreen}
        options={{
          title: 'Biblioteca',
        }}
      />

      <Stack.Screen
        name="EstudoConteudo"
        component={EstudoConteudoScreen}
        options={{
          title: 'Conteúdo',
        }}
      />
    </Stack.Navigator>
  );
}
