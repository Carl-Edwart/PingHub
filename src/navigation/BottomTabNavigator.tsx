import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@/constants/theme';
import PartidaStack from './PartidaStack';
import TorneioStack from './TorneioStack';
import RankingStack from './RankingStack';
import AtletasStack from './AtletasStack';
import EstudoStack from './EstudoStack';
import RegrasStack from './RegrasStack';
import MesaStack from './MesaStack';

const Tab = createBottomTabNavigator();

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface TabIconProps {
  color: string;
  size: number;
  name: IconName;
}

const TabIcon = ({ color, size, name }: TabIconProps) => (
  <MaterialCommunityIcons name={name} color={color} size={size} />
);

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="PartidaTab"
        component={PartidaStack}
        options={{
          title: 'Partida',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="table-tennis" color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name="TorneioTab"
        component={TorneioStack}
        options={{
          title: 'Torneio',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="tournament" color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name="RankingTab"
        component={RankingStack}
        options={{
          title: 'Ranking',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="medal" color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name="AtletasTab"
        component={AtletasStack}
        options={{
          title: 'Atletas',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="account-multiple" color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name="EstudoTab"
        component={EstudoStack}
        options={{
          title: 'Estudo',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="book-open" color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name="RegrasTab"
        component={RegrasStack}
        options={{
          title: 'Regras',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="gavel" color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name="MesaTab"
        component={MesaStack}
        options={{
          title: 'Mesa',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="playlist-check" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
