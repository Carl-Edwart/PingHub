import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '@/constants/theme';
import { Card } from './Card';
import { Avatar } from './Avatar';
import { Badge } from './Badge';

interface MatchCardProps {
  player1Name: string;
  player1Avatar?: string;
  player1Score?: number;
  player2Name: string;
  player2Avatar?: string;
  player2Score?: number;
  status?: 'scheduled' | 'playing' | 'finished';
  date?: string;
  time?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'playing':
      return 'accent';
    case 'finished':
      return 'success';
    default:
      return 'default';
  }
};

const getStatusLabel = (status?: string) => {
  switch (status) {
    case 'playing':
      return 'Em andamento';
    case 'finished':
      return 'Finalizado';
    default:
      return 'Agendado';
  }
};

export const MatchCard: React.FC<MatchCardProps> = ({
  player1Name,
  player1Avatar,
  player1Score,
  player2Name,
  player2Avatar,
  player2Score,
  status = 'scheduled',
  date,
  time,
  onPress,
  style,
}) => {
  return (
    <Card onPress={onPress} style={[styles.card, style]}>
      <View style={styles.container}>
        {/* Status Badge */}
        <Badge label={getStatusLabel(status)} variant={getStatusColor(status)} />

        {/* Match Info */}
        <View style={styles.matchContainer}>
          {/* Player 1 */}
          <View style={styles.playerContainer}>
            <Avatar name={player1Name} source={player1Avatar} size="medium" />
            <Text style={styles.playerName}>{player1Name}</Text>
            {player1Score !== undefined && (
              <Text style={styles.score}>{player1Score}</Text>
            )}
          </View>

          {/* VS */}
          <Text style={styles.vs}>VS</Text>

          {/* Player 2 */}
          <View style={styles.playerContainer}>
            <Avatar name={player2Name} source={player2Avatar} size="medium" />
            <Text style={styles.playerName}>{player2Name}</Text>
            {player2Score !== undefined && (
              <Text style={styles.score}>{player2Score}</Text>
            )}
          </View>
        </View>

        {/* Date/Time */}
        {(date || time) && (
          <View style={styles.dateTimeContainer}>
            {date && <Text style={styles.dateTime}>{date}</Text>}
            {time && <Text style={styles.dateTime}>{time}</Text>}
          </View>
        )}
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
  matchContainer: {
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
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.accent,
  },
  vs: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginHorizontal: SPACING.md,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
  },
  dateTime: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});
