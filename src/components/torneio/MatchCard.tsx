import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '@/constants/theme';
import { Card } from '@/components/common/Card';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';

interface TournamentMatchCardProps {
  player1Name: string;
  player1Avatar?: string;
  player2Name: string;
  player2Avatar?: string;
  score1?: number;
  score2?: number;
  status: 'pending' | 'playing' | 'finished';
  round?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'playing':
      return 'accent';
    case 'finished':
      return 'success';
    default:
      return 'default';
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

export const MatchCard: React.FC<TournamentMatchCardProps> = ({
  player1Name,
  player1Avatar,
  player2Name,
  player2Avatar,
  score1,
  score2,
  status,
  round,
  onPress,
  style,
}) => {
  return (
    <Card onPress={onPress} style={[styles.card, style]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {round && <Text style={styles.round}>{round}</Text>}
          <Badge label={getStatusLabel(status)} variant={getStatusVariant(status)} />
        </View>

        {/* Players */}
        <View style={styles.playersContainer}>
          {/* Player 1 */}
          <View style={styles.playerContainer}>
            <Avatar name={player1Name} source={player1Avatar} size="medium" />
            <Text style={styles.playerName}>{player1Name}</Text>
            {score1 !== undefined && (
              <Text style={styles.score}>{score1}</Text>
            )}
          </View>

          {/* VS */}
          <Text style={styles.vs}>VS</Text>

          {/* Player 2 */}
          <View style={styles.playerContainer}>
            <Avatar name={player2Name} source={player2Avatar} size="medium" />
            <Text style={styles.playerName}>{player2Name}</Text>
            {score2 !== undefined && (
              <Text style={styles.score}>{score2}</Text>
            )}
          </View>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
  },
  container: {
    gap: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  round: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  playersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: SPACING.md,
  },
  playerContainer: {
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  score: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.accent,
  },
  vs: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginHorizontal: SPACING.md,
  },
});
