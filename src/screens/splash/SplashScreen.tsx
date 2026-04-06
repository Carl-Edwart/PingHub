import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS, SPACING } from '@/constants/theme';

export default function SplashScreen() {
  useEffect(() => {
    const timer = setTimeout(() => {
      // Navigation will be handled by navigation state management
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <MaterialCommunityIcons
          name="table-tennis"
          size={80}
          color={COLORS.accent}
        />
        <Text style={styles.title}>PingHub</Text>
        <Text style={styles.subtitle}>Gestão de Tênis de Mesa</Text>
      </View>
      <View style={styles.loader}>
        <MaterialCommunityIcons
          name="loading"
          size={32}
          color={COLORS.accent}
        />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: COLORS.accent,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.surface,
  },
  loader: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.surface,
  },
});
