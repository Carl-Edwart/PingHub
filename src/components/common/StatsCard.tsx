import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '@/constants/theme';

interface StatItemProps {
  label: string;
  value: string | number;
  variant?: 'default' | 'highlight';
}

interface StatsCardProps {
  title: string;
  stats: StatItemProps[];
  style?: ViewStyle;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  stats,
  style,
}) => {
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: COLORS.surface,
          borderRadius: BORDER_RADIUS.lg,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: SPACING.md,
        },
        style,
      ]}
    >
      <Text style={styles.title}>{title}</Text>

      <View style={styles.statsGrid}>
        {stats.map((stat, idx) => (
          <View
            key={idx}
            style={[
              styles.statItem,
              stat.variant === 'highlight' && styles.statItemHighlight,
            ]}
          >
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text
              style={[
                styles.statValue,
                stat.variant === 'highlight' && styles.statValueHighlight,
              ]}
            >
              {stat.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  statItem: {
    flex: 1,
    minWidth: 100,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statItemHighlight: {
    backgroundColor: COLORS.accent,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statValueHighlight: {
    color: COLORS.primary,
  },
});
