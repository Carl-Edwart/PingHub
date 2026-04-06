import React from 'react';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import RankingListScreen from '@/screens/ranking/RankingListScreen';
import RankingPerfilScreen from '@/screens/ranking/RankingPerfilScreen';
import { COLORS } from '@/constants/theme';

export type RankingParamList = {
  RankingList: undefined;
  RankingPerfil: { athleteId: string };
};

const Stack = createNativeStackNavigator<RankingParamList>();

export default function RankingStack() {
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
        name="RankingList"
        component={RankingListScreen}
        options={{
          title: 'Ranking Geral',
        }}
      />

      <Stack.Screen
        name="RankingPerfil"
        component={RankingPerfilScreen}
        options={{
          title: 'Perfil do Atleta',
        }}
      />
    </Stack.Navigator>
  );
}
