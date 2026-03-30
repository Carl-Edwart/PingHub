import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '@/constants/theme';
import { Avatar } from '@/components/common/Avatar';
import { EloTag } from './EloTag';

interface RankingRowProps {
  rank: number;
  name: string;
  avatar?: string;
  eloValue: number;
  eloChange?: number;
  wins: number;
  losses: number;
  onPress?: () => void;
  style?: ViewStyle;
}

export const RankingRow: React.FC<RankingRowProps> = ({
  rank,
  name,
  avatar,
  eloValue,
  eloChange,
  wins,
  losses,
  onPress,
  style,
}) => {
  const getTrendFromChange = () => {
    if (!eloChange) return 'stable';
    if (eloChange > 0) return 'up';
    return 'down';
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.container,
        style,
      ]}
    >
      {/* Rank Position */}
      <View style={styles.rankContainer}>
        <Text style={styles.rank}>#{rank}</Text>
      </View>

      {/* Player Info */}
      <View style={styles.playerInfo}>
        <Avatar name={name} source={avatar} size="small" />
        <Text style={styles.name}>{name}</Text>
      </View>

      {/* ELO */}
      <EloTag
        value={eloValue}
        trend={getTrendFromChange()}
        change={eloChange}
      />

      {/* Record */}
      <View style={styles.record}>
        <Text style={styles.recordText}>
          {wins}W-{losses}L
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rank: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
  },
  playerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  record: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.sm,
  },
  recordText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
});
