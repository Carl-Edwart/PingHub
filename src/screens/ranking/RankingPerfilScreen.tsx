import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Avatar, Badge, Button, Card, Loader } from '@/components';
import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { AthleteRepository } from '@/database/repositories/athleteRepository';
import { RankingRepository } from '@/database/repositories/rankingRepository';
import { useRankingStore } from '@/store/useRankingStore';
import { RankingEntry } from '@/types/ranking';
import { Athlete } from '@/types/athlete';

type Props = NativeStackScreenProps<any, 'RankingPerfil'>;

export default function RankingPerfilScreen({ route, navigation }: Props) {
  const { athleteId } = route.params as { athleteId: string };
  const { getAthleteRanking } = useRankingStore();
  const [ranking, setRanking] = useState<RankingEntry | null>(null);
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          setLoading(true);
          const [rankingData, athleteData] = await Promise.all([
            RankingRepository.getByAthleteId(athleteId),
            AthleteRepository.getById(athleteId),
          ]);
          setRanking(rankingData);
          setAthlete(athleteData);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }, [athleteId])
  );

  if (loading || !ranking || !athlete) {
    return <Loader />;
  }

  const winRate = ranking.wins + ranking.losses > 0
    ? ((ranking.wins / (ranking.wins + ranking.losses)) * 100).toFixed(1)
    : 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header with Avatar */}
      <View style={styles.header}>
        <Avatar source={athlete.photoUri} size="large" />
        <Text style={styles.name}>{athlete.name}</Text>
        <View style={styles.badgesContainer}>
          <Badge
            label={athlete.level}
            variant="accent"
            size="small"
          />
          <Badge
            label={athlete.playStyle}
            variant="default"
            size="small"
          />
        </View>
      </View>

      {/* Position & ELO */}
      <Card style={styles.card}>
        <View style={styles.positionRow}>
          <View style={styles.positionItem}>
            <MaterialCommunityIcons
              name="medal"
              size={24}
              color={COLORS.accent}
            />
            <Text style={styles.label}>Posição</Text>
            <Text style={styles.value}>#{ranking.position}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.positionItem}>
            <MaterialCommunityIcons
              name="chess-queen"
              size={24}
              color={COLORS.accent}
            />
            <Text style={styles.label}>ELO</Text>
            <Text style={styles.value}>{ranking.elo}</Text>
          </View>
        </View>
      </Card>

      {/* Win/Loss Stats */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Estatísticas</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons
              name="trophy"
              size={24}
              color={COLORS.success}
            />
            <Text style={styles.statLabel}>Vitórias</Text>
            <Text style={[styles.statValue, { color: COLORS.success }]}>
              {ranking.wins}
            </Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons
              name="close-circle"
              size={24}
              color={COLORS.danger}
            />
            <Text style={styles.statLabel}>Derrotas</Text>
            <Text style={[styles.statValue, { color: COLORS.danger }]}>
              {ranking.losses}
            </Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons
              name="percent"
              size={24}
              color={COLORS.accent}
            />
            <Text style={styles.statLabel}>Taxa Vitória</Text>
            <Text style={[styles.statValue, { color: COLORS.accent }]}>
              {winRate}%
            </Text>
          </View>
        </View>
      </Card>

      {/* Tournaments */}
      {ranking.tournamentsWon ? (
        <Card style={styles.card}>
          <View style={styles.tournamentRow}>
            <View style={styles.tournamentItem}>
              <MaterialCommunityIcons
                name="tournament"
                size={28}
                color={COLORS.accent}
              />
              <Text style={styles.label}>Torneios Vencidos</Text>
              <Text style={styles.value}>{ranking.tournamentsWon}</Text>
            </View>
          </View>
        </Card>
      ) : null}

      {/* Last Updated */}
      <Card style={styles.card}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="clock"
            size={18}
            color={COLORS.textMuted}
          />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Última Atualização</Text>
            <Text style={styles.infoValue}>
              {new Date(ranking.lastUpdated).toLocaleDateString('pt-BR')}
            </Text>
          </View>
        </View>
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <Button
          variant="secondary"
          size="medium"
          onPress={() => navigation.goBack()}
        >
          ← Voltar
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingVertical: SPACING.lg },
  header: { alignItems: 'center', paddingHorizontal: SPACING.lg, gap: SPACING.md },
  name: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  badgesContainer: { flexDirection: 'row', gap: SPACING.md },
  card: { marginHorizontal: SPACING.lg, marginVertical: SPACING.md },
  cardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, textTransform: 'uppercase', marginBottom: SPACING.md },
  positionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  divider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.md },
  positionItem: { flex: 1, alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.md },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase' },
  value: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  statsGrid: { flexDirection: 'row', gap: SPACING.md },
  statItem: { flex: 1, alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.md },
  statLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  statValue: { fontSize: 18, fontWeight: '700' },
  tournamentRow: { flexDirection: 'row' },
  tournamentItem: { flex: 1, alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  infoContent: { flex: 1, gap: SPACING.xs },
  infoLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  infoValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  actionContainer: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xl, gap: SPACING.md },
});
