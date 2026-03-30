import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants/theme';

interface ScoreBoardProps {
  player1Name: string;
  player2Name: string;
  player1Score: number;
  player2Score: number;
  serving?: 1 | 2;
  style?: ViewStyle;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  player1Name,
  player2Name,
  player1Score,
  player2Score,
  serving,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Player 1 */}
      <View
        style={[
          styles.playerContainer,
          serving === 1 && styles.servingPlayer,
        ]}
      >
        <Text style={styles.playerName}>{player1Name}</Text>
        <Text style={styles.score}>{player1Score}</Text>
        {serving === 1 && <Text style={styles.servingIndicator}>SAQUE</Text>}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Player 2 */}
      <View
        style={[
          styles.playerContainer,
          serving === 2 && styles.servingPlayer,
        ]}
      >
        <Text style={styles.playerName}>{player2Name}</Text>
        <Text style={styles.score}>{player2Score}</Text>
        {serving === 2 && <Text style={styles.servingIndicator}>SAQUE</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  playerContainer: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  servingPlayer: {
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.accentMuted,
    paddingHorizontal: SPACING.md,
  },
  playerName: {
    fontSize: TYPOGRAPHY.h2.fontSize,
    fontWeight: '600',
    color: COLORS.accent,
    textAlign: 'center',
  },
  score: {
    fontSize: TYPOGRAPHY.display.fontSize,
    fontWeight: '700',
    color: COLORS.surface,
    lineHeight: TYPOGRAPHY.display.lineHeight,
  },
  servingIndicator: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    fontWeight: '600',
    color: COLORS.primary,
  },
  divider: {
    width: 1,
    height: 140,
    backgroundColor: COLORS.accentMuted,
  },
});
