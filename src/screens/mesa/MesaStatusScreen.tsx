import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/theme';

type Props = NativeStackScreenProps<any, 'MesaStatus'>;

export default function MesaStatusScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Status das Mesas</Text>
      <Text style={styles.subtitle}>Nenhuma mesa em uso</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
  },
});

