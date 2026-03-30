import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants/theme';

interface ScoreBoardProps {
  player1Name: string;
  player2Name: string;
  player1Score: number;
  player2Score: number;
  style?: ViewStyle;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  player1Name,
  player2Name,
  player1Score,
  player2Score,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Player 1 */}
      <View style={styles.playerContainer}>
        <Text style={styles.playerName}>{player1Name}</Text>
        <Text style={styles.score}>{player1Score}</Text>
      </View>

      {/* VS Divider */}
      <View style={styles.divider}>
        <Text style={styles.vs}>VS</Text>
      </View>

      {/* Player 2 */}
      <View style={styles.playerContainer}>
        <Text style={styles.playerName}>{player2Name}</Text>
        <Text style={styles.score}>{player2Score}</Text>
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
  divider: {
    width: 1,
    height: 120,
    backgroundColor: COLORS.accentMuted,
  },
  vs: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
    alignSelf: 'center',
    top: -8,
  },
});
