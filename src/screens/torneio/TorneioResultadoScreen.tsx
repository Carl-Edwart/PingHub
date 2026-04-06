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
import { TournamentRepository } from '@/database/repositories/tournamentRepository';
import { useTorneioStore } from '@/store/useTorneioStore';
import { useRankingStore } from '@/store/useRankingStore';
import { Tournament, Bracket, TournamentStatus } from '@/types/tournament';

type Props = NativeStackScreenProps<any, 'TorneioResultado'>;

const MEDAL_COLORS = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
} as const;

const MEDAL_ICONS = {
  1: 'medal',
  2: 'medal',
  3: 'medal',
} as const;

export default function TorneioResultadoScreen({ route, navigation }: Props) {
  const { tournamentId } = route.params as { tournamentId: string };
  const { currentTournament } = useTorneioStore();
  const { updateElo } = useRankingStore();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const loadTournament = async () => {
        try {
          setLoading(true);
          const data = await TournamentRepository.getById(tournamentId);
          setTournament(data);
        } finally {
          setLoading(false);
        }
      };
      loadTournament();
    }, [tournamentId])
  );

  const handleSaveResults = async () => {
    if (!tournament) return;

    try {
      setSaving(true);

      // Calcular ELO bonus para top 3
      const standings = getStandings();
      standings.slice(0, 3).forEach((entry, index) => {
        const bonus = index === 0 ? 50 : index === 1 ? 30 : 10;
        const newElo = entry.position * 100 + bonus;
        if (entry.athleteId) {
          updateElo(entry.athleteId, newElo, bonus);
        }
      });

      // Salvar torneio como completado
      await TournamentRepository.updateStatus(tournament.id, TournamentStatus.COMPLETED);

      alert('Resultados salvos com sucesso!');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving results:', error);
      alert('Erro ao salvar resultados');
    } finally {
      setSaving(false);
    }
  };

  const getStandings = () => {
    if (!tournament || !tournament.bracket) return [];

    const bracket = tournament.bracket as Bracket;
    const finalists = bracket.rounds[bracket.rounds.length - 1]?.matches || [];

    return tournament.participants
      .map((p) => ({
        ...p,
        athleteId: p.athleteId,
        position: finalists.some((m) => m.player1.name === p.name) ? 1 : 2,
      }))
      .sort((a, b) => a.position - b.position);
  };

  if (loading || !tournament) return <Loader />;

  const standings = getStandings();
  const topThree = standings.slice(0, 3);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Podium */}
      <View style={styles.podiumContainer}>
        <Text style={styles.title}>Resultados Finais</Text>
        <View style={styles.podium}>
          {/* 2nd Place */}
          {topThree[1] && (
            <View style={styles.podiumItem}>
              <Card style={[styles.medalistCard, styles.silver]}>
                <MaterialCommunityIcons
                  name="medal"
                  size={32}
                  color={MEDAL_COLORS[2]}
                />
                <Text style={styles.positionBadge}>2º</Text>
              </Card>
              <Avatar source={undefined} name={topThree[1].name} size="large" />
              <Text style={styles.medalistName} numberOfLines={1}>
                {topThree[1].name}
              </Text>
            </View>
          )}

          {/* 1st Place */}
          {topThree[0] && (
            <View style={styles.podiumItem}>
              <Card style={[styles.medalistCard, styles.gold]}>
                <MaterialCommunityIcons
                  name="medal"
                  size={40}
                  color={MEDAL_COLORS[1]}
                />
                <Text style={styles.positionBadge}>1º</Text>
              </Card>
              <Avatar source={undefined} name={topThree[0].name} size="large" />
              <Text style={styles.medalistName} numberOfLines={1}>
                {topThree[0].name}
              </Text>
            </View>
          )}

          {/* 3rd Place */}
          {topThree[2] && (
            <View style={styles.podiumItem}>
              <Card style={[styles.medalistCard, styles.bronze]}>
                <MaterialCommunityIcons
                  name="medal"
                  size={32}
                  color={MEDAL_COLORS[3]}
                />
                <Text style={styles.positionBadge}>3º</Text>
              </Card>
              <Avatar source={undefined} name={topThree[2].name} size="large" />
              <Text style={styles.medalistName} numberOfLines={1}>
                {topThree[2].name}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Standings */}
      <View style={styles.standingsContainer}>
        <Text style={styles.standingsTitle}>Classificação Final</Text>
        {standings.map((entry, index) => {
          const eloBonus = index === 0 ? 50 : index === 1 ? 30 : index === 2 ? 10 : 0;
          return (
            <Card key={entry.athleteId} style={styles.standingCard}>
              <View style={styles.standingContent}>
                <View style={styles.positionBadgeContainer}>
                  <Text style={styles.positionNumber}>{index + 1}º</Text>
                </View>
                <View style={styles.standingInfo}>
                  <Text style={styles.standingName}>{entry.name}</Text>
                  {eloBonus > 0 && (
                    <Badge label={`+${eloBonus} ELO`} variant="success" size="small" />
                  )}
                </View>
              </View>
            </Card>
          );
        })}
      </View>

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <Card>
          <View style={styles.summaryRow}>
            <MaterialCommunityIcons
              name="tournament"
              size={20}
              color={COLORS.accent}
            />
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Torneio</Text>
              <Text style={styles.summaryValue}>{tournament.name}</Text>
            </View>
          </View>
          <View style={[styles.summaryRow, { marginTop: SPACING.md }]}>
            <MaterialCommunityIcons
              name="account-multiple"
              size={20}
              color={COLORS.accent}
            />
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Participantes</Text>
              <Text style={styles.summaryValue}>{tournament.participants.length}</Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Actions */}
      <View style={styles.actionContainer}>
        <Button
          size="medium"
          variant="secondary"
          onPress={() => navigation.goBack()}
          disabled={saving}
        >
          ← Voltar
        </Button>
        <Button
          size="medium"
          onPress={handleSaveResults}
          disabled={saving}
        >
          {saving ? 'Salvando...' : 'Salvar Resultados'}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingVertical: SPACING.lg },
  podiumContainer: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.lg, textAlign: 'center' },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  podiumItem: { alignItems: 'center', gap: SPACING.sm },
  medalistCard: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gold: { backgroundColor: COLORS.accent },
  silver: { backgroundColor: COLORS.textMuted },
  bronze: { backgroundColor: COLORS.danger },
  positionBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.background,
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 12,
    borderRadius: 12,
    width: 24,
    height: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  medalistName: { fontSize: 12, fontWeight: '600', color: COLORS.text, maxWidth: 80 },
  standingsContainer: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  standingsTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, textTransform: 'uppercase', marginBottom: SPACING.md },
  standingCard: { marginBottom: SPACING.md },
  standingContent: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  positionBadgeContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionNumber: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  standingInfo: { flex: 1, gap: SPACING.xs },
  standingName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  summaryContainer: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  summaryContent: { flex: 1, gap: SPACING.xs },
  summaryLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  summaryValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  actionContainer: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xl, gap: SPACING.md, flexDirection: 'row' },
});
