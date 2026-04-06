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

import { Badge, Button, Card, Loader } from '@/components';
import { BORDER_RADIUS, COLORS, SPACING } from '@/constants/theme';
import { MatchCard } from '@/components/torneio';
import { TournamentRepository } from '@/database/repositories/tournamentRepository';
import { useTorneioStore } from '@/store/useTorneioStore';
import { Tournament, Bracket, BracketType, TournamentStatus } from '@/types/tournament';

type Props = NativeStackScreenProps<any, 'TorneioChave'>;

export default function TorneioChaveScreen({ route, navigation }: Props) {
  const { tournamentId } = route.params as { tournamentId: string };
  const { currentTournament, updateMatchResult } = useTorneioStore();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);

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

  const handleFinishMatch = (matchId: string) => {
    // Simular vitória do primeiro jogador
    if (tournament && tournament.bracketType === BracketType.SINGLE_ELIMINATION && tournament.bracket) {
      const bracket = tournament.bracket as Bracket;
      const match = bracket.rounds
        .flatMap((r) => r.matches)
        .find((m) => m.id === matchId);

      if (match && match.player1) {
        updateMatchResult(matchId, match.player1, '21-18');
        alert('Resultado registrado! ' + match.player1.name + ' venceu!');
        setSelectedMatch(null);
      }
    }
  };

  const handleCompleteRound = async () => {
    if (tournament) {
      await TournamentRepository.updateStatus(tournament.id, TournamentStatus.COMPLETED);
      navigation.navigate('TorneioResultado', { tournamentId: tournament.id });
    }
  };

  if (loading || !tournament) return <Loader />;

  const allMatches = tournament.bracketType === BracketType.SINGLE_ELIMINATION
    ? (tournament.bracket as Bracket)?.rounds.flatMap((r) => r.matches) || []
    : [];

  const pendingMatches = allMatches.filter((m) => m.status === 'pending').length;
  const finishedMatches = allMatches.filter((m) => m.status === 'finished').length;
  const totalMatches = allMatches.length;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Progress */}
      <View style={styles.progressContainer}>
        <View style={styles.progressItem}>
          <Text style={styles.progressLabel}>Concluídas</Text>
          <Text style={styles.progressValue}>{finishedMatches}/{totalMatches}</Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(finishedMatches / totalMatches) * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* Matches */}
      <View style={styles.matchesContainer}>
        <Text style={styles.matchesTitle}>Matches - {tournament.name}</Text>
        {allMatches.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nenhum match gerado ainda</Text>
          </Card>
        ) : (
          <>
            {allMatches.map((match) => {
              const displayStatus: 'pending' | 'finished' | 'playing' = 
                match.status === 'pending' ? 'pending' : 
                match.status === 'finished' ? 'finished' : 
                'playing';
              const isSelected = selectedMatch === match.id;
              return (
                <MatchCard
                  key={match.id}
                  player1Name={match.player1.name}
                  player2Name={match.player2.name}
                  player1Avatar={undefined}
                  player2Avatar={undefined}
                  status={displayStatus}
                  onPress={() => {
                    if (match.status === 'pending') {
                      setSelectedMatch(isSelected ? null : match.id);
                    }
                  }}
                  style={isSelected ? [styles.matchCard, styles.matchCardSelected] as any : styles.matchCard}
                />
              );
            })}
          </>
        )}
      </View>

      {/* Match Actions */}
      {selectedMatch && (
        <View style={styles.actionPanel}>
          <Text style={styles.actionTitle}>Resultado da Partida</Text>
          <Button
            size="medium"
            variant="secondary"
            onPress={() => handleFinishMatch(selectedMatch)}
            style={{ marginBottom: SPACING.md }}
          >
            Registrar Resultado
          </Button>
          <Button
            size="medium"
            variant="secondary"
            onPress={() => setSelectedMatch(null)}
          >
            Cancelar
          </Button>
        </View>
      )}

      {/* Finish Tournament */}
      {pendingMatches === 0 && finishedMatches > 0 && (
        <View style={styles.completeContainer}>
          <Badge label="✓ Torneio Pronto para Finalizar" variant="success" />
          <Button
            size="medium"
            onPress={handleCompleteRound}
            style={{ marginTop: SPACING.md }}
          >
            Finalizar e Gerar Resultado
          </Button>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingVertical: SPACING.lg },
  progressContainer: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  progressItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  progressLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  progressValue: { fontSize: 16, fontWeight: '700', color: COLORS.accent },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: COLORS.success },
  matchesContainer: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  matchesTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, textTransform: 'uppercase', marginBottom: SPACING.md },
  matchCard: { marginBottom: SPACING.md },
  matchCardSelected: { backgroundColor: COLORS.accent },
  emptyCard: { alignItems: 'center', paddingVertical: SPACING.lg },
  emptyText: { fontSize: 14, fontWeight: '500', color: COLORS.textMuted },
  actionPanel: {
    marginHorizontal: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  actionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  completeContainer: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
});
