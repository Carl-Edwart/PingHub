import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '@/constants/theme';
import { Button } from '@/components/common/Button';

interface SetCounterProps {
  currentSet: number;
  player1Sets: number;
  player2Sets: number;
  totalSets?: number;
  onSetChange?: (setNumber: number) => void;
  style?: ViewStyle;
}

export const SetCounter: React.FC<SetCounterProps> = ({
  currentSet,
  player1Sets,
  player2Sets,
  totalSets = 5,
  onSetChange,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.setInfo}>
        <Text style={styles.label}>Set Atual</Text>
        <Text style={styles.currentSet}>{currentSet}</Text>
      </View>

      <View style={styles.setsWon}>
        <View style={styles.setsWonItem}>
          <Text style={styles.setsWonLabel}>P1</Text>
          <Text style={styles.setsWonValue}>{player1Sets}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.setsWonItem}>
          <Text style={styles.setsWonLabel}>P2</Text>
          <Text style={styles.setsWonValue}>{player2Sets}</Text>
        </View>
      </View>

      <Text style={styles.info}>de {totalSets}</Text>

      <Button
        size="small"
        variant="primary"
        onPress={() => onSetChange?.(currentSet + 1)}
      >
        Próximo Set
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  setInfo: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  label: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  currentSet: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.accent,
  },
  setsWon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  setsWonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  setsWonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  setsWonValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    minWidth: 30,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },
  info: {
    fontSize: 12,
    textAlign: 'center',
    color: COLORS.textMuted,
  },
});
