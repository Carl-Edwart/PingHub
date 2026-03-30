import React from 'react';
import { View, Text, StyleSheet, ScrollView, ViewStyle } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '@/constants/theme';
import { Card } from '@/components/common/Card';

interface BracketMatch {
  id: string;
  player1: string;
  player2: string;
  score1?: number;
  score2?: number;
  status: 'pending' | 'playing' | 'finished';
  round: number;
}

interface BracketViewProps {
  matches: BracketMatch[];
  onMatchPress?: (matchId: string) => void;
  style?: ViewStyle;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'playing':
      return COLORS.accent;
    case 'finished':
      return COLORS.success;
    default:
      return COLORS.border;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'playing':
      return 'Em andamento';
    case 'finished':
      return 'Finalizado';
    default:
      return 'Aguardando';
  }
};

export const BracketView: React.FC<BracketViewProps> = ({
  matches,
  onMatchPress,
  style,
}) => {
  const groupedByRound = matches.reduce(
    (acc, match) => {
      if (!acc[match.round]) acc[match.round] = [];
      acc[match.round].push(match);
      return acc;
    },
    {} as Record<number, BracketMatch[]>
  );

  const rounds = Object.keys(groupedByRound)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.container, style]}
    >
      <View style={styles.bracketsContainer}>
        {rounds.map(round => (
          <View key={round} style={styles.roundContainer}>
            <Text style={styles.roundLabel}>Rodada {round}</Text>

            <View style={styles.matchesContainer}>
              {groupedByRound[round].map(match => (
                <Card
                  key={match.id}
                  onPress={() => onMatchPress?.(match.id)}
                  style={[
                    styles.matchCard,
                    {
                      borderLeftWidth: 4,
                      borderLeftColor: getStatusColor(match.status),
                    },
                  ]}
                >
                  <View style={styles.matchContent}>
                    <Text style={styles.playerName}>{match.player1}</Text>
                    {match.score1 !== undefined && (
                      <Text style={styles.score}>{match.score1}</Text>
                    )}
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.matchContent}>
                    <Text style={styles.playerName}>{match.player2}</Text>
                    {match.score2 !== undefined && (
                      <Text style={styles.score}>{match.score2}</Text>
                    )}
                  </View>
                </Card>
              ))}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bracketsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: SPACING.lg,
  },
  roundContainer: {
    gap: SPACING.md,
  },
  roundLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  matchesContainer: {
    gap: SPACING.md,
  },
  matchCard: {
    minWidth: 140,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  matchContent: {
    gap: SPACING.xs,
  },
  playerName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  score: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accent,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
});
