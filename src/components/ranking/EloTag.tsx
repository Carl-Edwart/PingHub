import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '@/constants/theme';

interface EloTagProps {
  value: number;
  trend?: 'up' | 'down' | 'stable';
  change?: number;
  style?: ViewStyle;
}

const getTrendStyles = (trend?: string) => {
  switch (trend) {
    case 'up':
      return { color: COLORS.success, symbol: '↑' };
    case 'down':
      return { color: COLORS.danger, symbol: '↓' };
    default:
      return { color: COLORS.textMuted, symbol: '=' };
  }
};

export const EloTag: React.FC<EloTagProps> = ({
  value,
  trend,
  change,
  style,
}) => {
  const { color, symbol } = getTrendStyles(trend);

  return (
    <View
      style={[
        styles.container,
        { borderColor: color },
        style,
      ]}
    >
      <Text style={[styles.value, { color: COLORS.primary }]}>{value}</Text>
      <Text style={[styles.trend, { color }]}>{symbol}</Text>
      {change !== undefined && (
        <Text style={[styles.change, { color }]}>{change > 0 ? '+' : ''}{change}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    backgroundColor: COLORS.surface,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
  },
  trend: {
    fontSize: 12,
    fontWeight: '700',
  },
  change: {
    fontSize: 11,
    fontWeight: '600',
  },
});
